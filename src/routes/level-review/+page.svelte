<script lang="ts">
	import Title from '$lib/components/Title.svelte';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import { user } from '$lib/client';
	import { upload } from '$lib/client/storage';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { _ } from 'svelte-i18n';
	import { toast } from 'svelte-sonner';
	import {
		CheckCircle2,
		ExternalLink,
		FileUp,
		Loader2,
		MessageSquareText,
		RefreshCw
	} from 'lucide-svelte';

	const MAX_FILE_SIZE = 20 * 1024 * 1024;
	const ALLOWED_EXTENSIONS = new Set([
		'pdf',
		'txt',
		'md',
		'png',
		'jpg',
		'jpeg',
		'webp',
		'zip'
	]);

	let submission: any = null;
	let loading = false;
	let submitting = false;
	let briefReview = '';
	let reviewFile: File | null = null;
	let completed = false;

	$: canReview = $user.loggedIn && ($user.data?.isAdmin || $user.data?.isLevelReviewer);
	$: selectedLevel = submission?.level ?? submission?.levels ?? null;
	$: requestAreas = Array.isArray(submission?.requestAreas)
		? submission.requestAreas
		: [];
	$: videoId = getYouTubeVideoId(submission?.videoLink || '');
	$: canSubmitReview = briefReview.trim().length > 0 && Boolean(reviewFile);
	$: submitterPlayer = submission?.submitter ?? (
		submission?.userId
			? { uid: submission.userId, name: submission.userId }
			: null
	);

	function areaLabel(area: string) {
		const labels: Record<string, string> = {
			gameplay: $_('submit.level_feedback.areas.gameplay.label'),
			deco: $_('submit.level_feedback.areas.deco.label'),
			optimization: $_('submit.level_feedback.areas.optimization.label'),
			balancing: $_('submit.level_feedback.areas.balancing.label'),
			bugs: $_('submit.level_feedback.areas.bugs.label'),
			system: $_('submit.level_feedback.areas.system.label')
		};

		return labels[area] || area;
	}

	function formatLength(seconds: number) {
		const value = Number(seconds);

		if (!Number.isFinite(value)) {
			return '-';
		}

		const minutes = Math.floor(value / 60);
		const remainder = value % 60;

		return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`;
	}

	function getYouTubeVideoId(value: string) {
		return value.trim()
			.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([A-Za-z0-9_-]{11})/)?.[1] ?? null;
	}

	function fileExtension(file: File) {
		return file.name.split('.')
			.pop()
			?.toLowerCase() || '';
	}

	function safeFileName(name: string) {
		return name.trim()
			.replace(/[^A-Za-z0-9._-]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 120) || 'review-file';
	}

	function handleFileChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		reviewFile = input.files?.[0] ?? null;
	}

	function validateFile(file: File | null) {
		if (!file) {
			throw new Error($_('level_review.errors.file_required'));
		}

		if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
			throw new Error($_('level_review.errors.file_too_large'));
		}

		if (!ALLOWED_EXTENSIONS.has(fileExtension(file))) {
			throw new Error($_('level_review.errors.file_type'));
		}
	}

	async function retrieveSubmission() {
		loading = true;
		completed = false;

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/level-feedback-submissions/retrieve`,
				{
					headers: {
						Authorization: `Bearer ${await $user.token()}`
					}
				}
			);
			const payload = await response.json()
				.catch(() => null);

			if (!response.ok) {
				throw new Error(payload?.message || $_('level_review.errors.none_available'));
			}

			submission = payload;
			briefReview = payload?.briefReview || '';
			reviewFile = null;
		} catch (error) {
			submission = null;
			toast.error(error instanceof Error ? error.message : $_('level_review.errors.retrieve_failed'));
		} finally {
			loading = false;
		}
	}

	async function submitReview() {
		if (!submission?.id || submitting) {
			return;
		}

		const reviewText = briefReview.trim();

		if (!reviewText) {
			toast.error($_('level_review.errors.brief_required'));

			return;
		}

		try {
			validateFile(reviewFile);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('level_review.errors.file_required'));

			return;
		}

		submitting = true;

		try {
			const token = (await $user.token())!;
			const file = reviewFile!;
			const path = `level-feedback-reviews/${$user.data.uid}/${submission.id}/${Date.now()}-${
				safeFileName(file.name)
			}`;

			await upload(path, file, token);

			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/level-feedback-submissions/${submission.id}/review`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						briefReview: reviewText,
						reviewFile: {
							path,
							url: `https://cdn.gdvn.net/${path}`,
							name: file.name,
							size: file.size,
							type: file.type || null
						}
					})
				}
			);
			const payload = await response.json()
				.catch(() => null);

			if (!response.ok) {
				throw new Error(payload?.message || $_('level_review.errors.submit_failed'));
			}

			submission = payload;
			completed = true;
			reviewFile = null;
			toast.success($_('level_review.review_submitted'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('level_review.errors.submit_failed'));
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
  <title>{$_('level_review.page_title')} - GDVN</title>
</svelte:head>

<Title value={$_('level_review.title')} />

<div class="review-page">
  {#if !canReview}
    <Card.Root>
      <Card.Header>
        <Card.Title>{$_('level_review.access_title')}</Card.Title>
        <Card.Description>
          {$_('level_review.access_description')}
        </Card.Description>
      </Card.Header>
    </Card.Root>
  {:else}
    <section class="overview">
      <div>
        <p class="eyebrow">{$_('level_review.queue_eyebrow')}</p>
        <h1>{$_('level_review.heading')}</h1>
        <p>
          {$_('level_review.description')}
        </p>
      </div>
      <Button disabled={loading || submitting} on:click={retrieveSubmission}>
        {#if loading}
          <Loader2 class="mr-2 spin" size={16} />
        {:else}
          <RefreshCw class="mr-2" size={16} />
        {/if}
        {$_('level_review.retrieve')}
      </Button>
    </section>

    {#if completed}
      <div class="success-banner">
        <CheckCircle2 size={18} />
        <span>{$_('level_review.completed_banner')}</span>
      </div>
    {/if}

    {#if submission}
      <div class="review-grid">
        <Card.Root>
          <Card.Header>
            <Card.Title>
              {selectedLevel?.name || $_('level_review.level_fallback', { values: { id: submission.levelId } })}
            </Card.Title>
            <Card.Description>
              {$_('level_review.by_creator', {
                values: { creator: selectedLevel?.creator || $_('level_review.unknown') }
              })} · {formatLength(submission.lengthSeconds)}
            </Card.Description>
          </Card.Header>
          <Card.Content class="submission-detail">
            <div class="detail-row">
              <span>{$_('level_review.level_id')}</span>
              <a href={`/level/${submission.levelId}`} target="_blank">
                {submission.levelId}
                <ExternalLink size={13} />
              </a>
            </div>
            <div class="detail-row">
              <span>{$_('level_review.submitted_by')}</span>
              {#if submitterPlayer}
                <PlayerLink player={submitterPlayer} />
              {/if}
            </div>
            <div class="detail-stack">
              <span>{$_('level_review.requested_review')}</span>
              <div class="area-list">
                {#each requestAreas as area}
                  <Badge variant="secondary">{areaLabel(area)}</Badge>
                {/each}
              </div>
            </div>
            {#if submission.submitterNote}
              <div class="detail-stack">
                <span>{$_('level_review.submitter_note')}</span>
                <p>{submission.submitterNote}</p>
              </div>
            {/if}
            {#if videoId}
              <div class="detail-stack">
                <span>{$_('level_review.video_link')}</span>
                <div class="video-embed">
                  <iframe
                    title={$_('level_review.video_embed_title')}
                    src={`https://www.youtube.com/embed/${videoId}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowfullscreen
                  />
                </div>
                <a class="video-link" href={submission.videoLink} target="_blank" rel="noreferrer">
                  {submission.videoLink}
                  <ExternalLink size={13} />
                </a>
              </div>
            {/if}
          </Card.Content>
        </Card.Root>

        <Card.Root>
          <Card.Header>
            <Card.Title>{$_('level_review.write_review')}</Card.Title>
            <Card.Description>
              {$_('level_review.write_review_description')}
            </Card.Description>
          </Card.Header>
          <Card.Content class="review-form">
            <div class="field">
              <Label for="brief-review">{$_('level_review.brief_review')}</Label>
              <Textarea
                id="brief-review"
                bind:value={briefReview}
                rows={7}
                maxlength={4000}
                placeholder={$_('level_review.brief_placeholder')}
                disabled={completed}
              />
            </div>

            <div class="field">
              <Label for="review-file">{$_('level_review.review_file')}</Label>
              <label class="file-input" for="review-file">
                <FileUp size={18} />
                <span>
                  {reviewFile ? reviewFile.name : $_('level_review.review_file_placeholder')}
                </span>
              </label>
              <input
                id="review-file"
                type="file"
                accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp,.zip"
                disabled={completed}
                on:change={handleFileChange}
              />
            </div>
          </Card.Content>
          <Card.Footer class="justify-end">
            <Button disabled={submitting || completed || !canSubmitReview} on:click={submitReview}>
              {#if submitting}
                <Loader2 class="mr-2 spin" size={16} />
              {/if}
              {$_('level_review.submit_review')}
            </Button>
          </Card.Footer>
        </Card.Root>
      </div>
    {:else}
      <Card.Root>
        <Card.Content class="empty-state">
          <MessageSquareText size={28} />
          <p>{$_('level_review.empty')}</p>
        </Card.Content>
      </Card.Root>
    {/if}
  {/if}
</div>

<style lang="scss">
.review-page {
  max-width: 1120px;
  margin: 0 auto;
  padding: 16px;
  display: grid;
  gap: 16px;
}

.overview {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  padding: 18px;

  h1 {
    font-size: 24px;
    font-weight: 700;
    margin: 0;
  }

  p {
    margin: 6px 0 0;
    color: hsl(var(--muted-foreground));
    max-width: 680px;
  }
}

.eyebrow {
  margin: 0 0 4px;
  font-size: 12px;
  font-weight: 700;
  color: hsl(var(--muted-foreground));
  text-transform: uppercase;
}

.review-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 16px;
}

:global(.submission-detail),
:global(.review-form) {
  display: grid;
  gap: 14px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;

  span {
    color: hsl(var(--muted-foreground));
  }

  a {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: hsl(var(--primary));
  }
}

.detail-stack {
  display: grid;
  gap: 8px;

  > span {
    color: hsl(var(--muted-foreground));
  }

  p {
    margin: 0;
    line-height: 1.6;
  }
}

.video-embed {
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--muted) / 0.2);

  iframe {
    width: 100%;
    height: 100%;
    border: 0;
  }
}

.video-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  width: fit-content;
  max-width: 100%;
  overflow-wrap: anywhere;
  color: hsl(var(--primary));
  font-size: 13px;
}

.area-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.field {
  display: grid;
  gap: 8px;
}

.file-input {
  min-height: 56px;
  border: 1px dashed hsl(var(--border));
  border-radius: 8px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  color: hsl(var(--muted-foreground));
}

input[type="file"] {
  display: none;
}

:global(.empty-state) {
  min-height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: hsl(var(--muted-foreground));
}

.success-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid hsl(142 70% 45% / 0.4);
  border-radius: 8px;
  padding: 10px 12px;
  color: hsl(142 70% 45%);
  background: hsl(142 70% 45% / 0.08);
}

:global(.spin) {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 860px) {
  .overview {
    align-items: stretch;
    flex-direction: column;
  }

  .review-grid {
    grid-template-columns: 1fr;
  }
}
</style>
