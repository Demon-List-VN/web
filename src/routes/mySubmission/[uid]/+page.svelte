<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';
	import Title from '$lib/components/Title.svelte';
	import { user } from '$lib/client';
	import ExternalLink from 'svelte-radix/ExternalLink.svelte';
	import CrossCircled from 'svelte-radix/CrossCircled.svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import Ads from '$lib/components/ads.svelte';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import { _ } from 'svelte-i18n';
	import { EllipsisIcon, FileText, Gauge, SkipForward } from 'lucide-svelte';

	export let data: PageData;
	let alertOpened = false;
	let lvID: number;
	let recID: number | null = null;
	let feedbackSubmissions: any[] = data.feedbackSubmissions || [];
	let feedbackLoading = false;
	let feedbackLoaded = false;
	let ldmVariantSubmissions: any[] = data.ldmVariantSubmissions || [];
	let ldmVariantLoading = false;
	let ldmVariantLoaded = false;
	let cancellingLdmVariantIds: number[] = [];

	onMount(() => {
		const unsubscribe = user.subscribe((currentUser) => {
			if (
				currentUser.loggedIn
				&& currentUser.data?.uid == $page.params.uid
			) {
				if (!feedbackLoaded) {
					feedbackLoaded = true;
					void loadFeedbackSubmissions();
				}

				if (!ldmVariantLoaded) {
					ldmVariantLoaded = true;
					void loadLdmVariantSubmissions();
				}
			}
		});

		return () => unsubscribe();
	});

	function getTimeString(ms: number) {
		const minutes = Math.floor(ms / 60000);
		const seconds = Math.floor((ms % 60000) / 1000);
		const milliseconds = ms % 1000;

		return `${minutes}:${seconds.toString()
			.padStart(2, '0')}.${milliseconds}`;
	}

	async function deleteRecord() {
		const { uid } = $user.data;
		const token = await $user.token();

		toast.promise(
			fetch(
				`${import.meta.env.VITE_API_URL}/records/${uid}/${lvID}${
					recID ? `?id=${recID}` : ''
				}`,
				{
					method: 'DELETE',
					headers: {
						Authorization: 'Bearer ' + token
					}
				}
			),
			{
				loading: $_('toast.submission_cancel.loading'),
				success: () => {
					data.records = data.records.filter((x) => {
						return recID ? x.id != recID : x.levelid != lvID;
					});

					return $_('toast.submission_cancel.success');
				},
				error: (err) => {
					return $_('toast.submission_cancel.error');
				}
			}
		);
	}

	let boosting: number[] = [];

	function isBoosting(id: number) {
		return boosting.includes(id);
	}

	async function boostSubmission(levelid: number) {
		const { uid } = $user.data;
		const token = await $user.token();

		boosting = [...boosting, levelid];

		try {
			await toast.promise(
				fetch(
					`${import.meta.env.VITE_API_URL}/records/${uid}/${levelid}/boost`,
					{
						method: 'POST',
						headers: {
							Authorization: 'Bearer ' + token
						}
					}
				),
				{
					loading: $_('toast.boost.loading'),
					success: $_('toast.boost.success'),
					error: (err) => $_('toast.boost.error')
				}
			);
		} catch (e) {
		// error handled by toast
		} finally {
			boosting = boosting.filter((x) => x !== levelid);
		}
	}

	async function loadLdmVariantSubmissions() {
		ldmVariantLoading = true;

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/ldm-variant-submissions/my`,
				{
					headers: {
						Authorization: `Bearer ${await $user.token()}`
					}
				}
			);

			if (!response.ok) {
				throw new Error($_('submissions.ldm_load_failed'));
			}

			ldmVariantSubmissions = await response.json();
		} catch {
			toast.error($_('submissions.ldm_load_failed'));
		} finally {
			ldmVariantLoading = false;
		}
	}

	function getLdmLevelName(submission: any, key: 'mainLevel' | 'variantLevel') {
		const idKey = key === 'mainLevel' ? 'mainLevelId' : 'variantLevelId';

		return submission[key]?.name || submission[idKey];
	}

	function isCancellingLdmVariant(id: number) {
		return cancellingLdmVariantIds.includes(id);
	}

	async function cancelLdmVariantSubmission(submission: any) {
		const id = Number(submission.id);

		if (!Number.isInteger(id)) {
			return;
		}

		if (!confirm($_('submissions.ldm_cancel_confirm'))) {
			return;
		}

		cancellingLdmVariantIds = [...cancellingLdmVariantIds, id];

		try {
			await toast.promise(
				fetch(
					`${import.meta.env.VITE_API_URL}/ldm-variant-submissions/${id}`,
					{
						method: 'DELETE',
						headers: {
							Authorization: `Bearer ${await $user.token()}`
						}
					}
				).then(async (response) => {
					if (!response.ok) {
						const payload = await response.json()
							.catch(() => null);

						throw new Error(payload?.message || $_('submissions.ldm_cancel_error'));
					}

					return response;
				}),
				{
					loading: $_('submissions.ldm_cancel_loading'),
					success: () => {
						ldmVariantSubmissions = ldmVariantSubmissions.filter(
							(item) => item.id !== id
						);

						return $_('submissions.ldm_cancel_success');
					},
					error: (error) => error?.message || $_('submissions.ldm_cancel_error')
				}
			);
		} finally {
			cancellingLdmVariantIds = cancellingLdmVariantIds.filter(
				(itemId) => itemId !== id
			);
		}
	}

	async function loadFeedbackSubmissions() {
		feedbackLoading = true;

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/level-feedback-submissions/my`,
				{
					headers: {
						Authorization: `Bearer ${await $user.token()}`
					}
				}
			);

			if (!response.ok) {
				throw new Error($_('submissions.feedback_load_failed'));
			}

			feedbackSubmissions = await response.json();
		} catch {
			toast.error($_('submissions.feedback_load_failed'));
		} finally {
			feedbackLoading = false;
		}
	}

	function feedbackAreaLabel(area: string) {
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

	function feedbackStatusLabel(status: string) {
		const labels: Record<string, string> = {
			pending: $_('submissions.feedback_status.pending'),
			assigned: $_('submissions.feedback_status.assigned'),
			reviewed: $_('submissions.feedback_status.reviewed'),
			cancelled: $_('submissions.feedback_status.cancelled')
		};

		return labels[status] || status;
	}

	function feedbackStatusVariant(status: string) {
		if (status === 'reviewed') {
			return 'default';
		}

		if (status === 'cancelled') {
			return 'destructive';
		}

		return 'outline';
	}

	function formatFeedbackLength(seconds: number) {
		const value = Number(seconds);

		if (!Number.isFinite(value)) {
			return '-';
		}

		const minutes = Math.floor(value / 60);
		const remainder = value % 60;

		return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`;
	}

	function formatSubmissionDate(value: string) {
		return new Date(value)
			.toLocaleString('vi-VN');
	}

	function feedbackReviewerPlayer(submission: any) {
		return submission.reviewer ?? (
			submission.reviewerId
				? { uid: submission.reviewerId, name: submission.reviewerId }
				: null
		);
	}
</script>

<svelte:head>
  <title>{$_('head.titles.my_submissions')} - {$_('head.site_name')}</title>
</svelte:head>

<Ads />

<AlertDialog.Root bind:open={alertOpened}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>{$_('submissions.cancel.title')}</AlertDialog.Title>
      <AlertDialog.Description>{
        $_('submissions.cancel.description')
      }</AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>{$_('general.cancel')}</AlertDialog.Cancel>
      <AlertDialog.Action on:click={deleteRecord}>{
        $_('general.continue')
      }</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

{#if $user.loggedIn && $user.data.uid == $page.params.uid}
  <Title value={$_('submissions.title')} />
  <div class="wrapper">
    <Tabs.Root value="records">
      <Tabs.List>
        <Tabs.Trigger value="records">
          Bản ghi ({data.records.length})
        </Tabs.Trigger>
        {#if data.levelSubmissions && data.levelSubmissions.length > 0}
          <Tabs.Trigger value="levels">
            Level ({data.levelSubmissions.length})
          </Tabs.Trigger>
        {/if}
        <Tabs.Trigger value="ldm">
          {$_('submissions.ldm_tab')} ({ldmVariantSubmissions.length})
        </Tabs.Trigger>
        <Tabs.Trigger value="feedback">
          {$_('submissions.feedback_tab')} ({feedbackSubmissions.length})
        </Tabs.Trigger>
      </Tabs.List>

      <!-- Records Tab -->
      <Tabs.Content value="records">
        <Table.Root>
          <Table.Caption>{$_('submissions.total_record')}: {
              data.records.length
            }</Table.Caption>
          <Table.Header>
            <Table.Row>
              <Table.Head>{$_('submissions.level')}</Table.Head>
              <Table.Head class="w-[120px] text-center">{
                $_('submissions.submitted_on')
              }</Table.Head>
              <Table.Head class="w-[100px] text-center">{
                $_('submissions.device')
              }</Table.Head>
              <Table.Head class="w-[90px] text-center">{
                $_('submissions.progress')
              }</Table.Head>
              <Table.Head class="w-[100px] text-center">{
                $_('submissions.queue_no')
              }</Table.Head>
              <Table.Head class="w-[150px] text-center">{
                $_('submissions.boost')
              }</Table.Head>
              <Table.Head class="w-[100px] text-center">Thao tác</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each data.records as record, index}
              {#if index !== 0 && index % 50 === 0}
                <Table.Row class="hover:bg-transparent">
                  <Table.Cell colspan={7} class="p-0">
                    <Ads />
                  </Table.Cell>
                </Table.Row>
              {/if}
              <Table.Row
                on:click={(e) => {
                    // @ts-expect-error
                    if (e.target.nodeName != 'TD') {
                        return;
                    }

                    goto(`/record/${record.userid}/${record.levels.id}`);
                }}
              >
                <Table.Cell class="font-medium">
                  <a
                    href={`/level/${record.levels.id}`}
                    data-sveltekit-preload-data="tap"
                  >
                    {record.levels.name}
                  </a>
                </Table.Cell>
                <Table.Cell class="text-center">
                  {new Date(record.timestamp)
.toLocaleString('vi-VN')}
                </Table.Cell>
                <Table.Cell class="text-center">
                  <Badge variant="secondary">{
                    record.mobile ? 'Mobile' : 'PC'
                  }</Badge>
                  {#if record.refreshRate}
                    <span class="fps-text">{record.refreshRate}fps</span>
                  {/if}
                </Table.Cell>
                <Table.Cell class="text-center">
                  {
                    record.levels.isPlatformer
                    ? getTimeString(record.progress)
                    : `${record.progress}%`
                  }
                </Table.Cell>
                <Table.Cell class="text-center">
                  {#if record.needMod}
                    <Badge variant="outline">{
                      $_('submissions.forwarded')
                    }</Badge>
                  {:else if record.queueNo}
                    <Badge>{record.queueNo}</Badge>
                  {:else}
                    <span class="muted">-</span>
                  {/if}
                </Table.Cell>
                <Table.Cell class="text-center">
                  <Button
                    size="sm"
                    variant="default"
                    class="boost-btn"
                    disabled={isBoosting(record.levelid)}
                    on:click={(e) => {
                        e.stopPropagation();
                        goto(`/record/${record.userid}/${record.levels.id}?tab=skipAhead`);
                    }}
                  >
                    <SkipForward size={14} />
                  </Button>
                </Table.Cell>
                <Table.Cell>
                  <div class="actions">
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Chi tiết"
                      on:click={(e) => {
                          e.stopPropagation();
                          goto(`/record/${record.userid}/${record.levels.id}`);
                      }}
                    >
                      <EllipsisIcon size={16} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Video"
                      href={record.videoLink}
                      target="_blank"
                    >
                      <ExternalLink size={16} />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      title="Huỷ nộp"
                      on:click={(e) => {
                          e.stopPropagation();
                          lvID = record.levelid;
                          recID = typeof record.id === 'number' ? record.id : null;
                          alertOpened = true;
                      }}
                    >
                      <CrossCircled size={16} />
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
        <Ads />
      </Tabs.Content>

      <!-- Level Submissions Tab -->
      {#if data.levelSubmissions && data.levelSubmissions.length > 0}
        <Tabs.Content value="levels">
          <div class="level-grid">
            {#each data.levelSubmissions as submission}
              <Card.Root>
                <Card.Header>
                  <Card.Title>
                    <a
                      href={`/level/${submission.levels.id}`}
                      data-sveltekit-preload-data="tap"
                    >
                      {submission.levels.name}
                    </a>
                  </Card.Title>
                  <Card.Description>
                    {new Date(submission.created_at)
.toLocaleString('vi-VN')}
                  </Card.Description>
                </Card.Header>
                <Card.Footer class="flex justify-between items-center">
                  <Badge variant="outline">Chờ duyệt</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    href={`https://www.youtube.com/watch?v=${submission.levels.videoID}`}
                    target="_blank"
                  >
                    <ExternalLink size={16} />
                  </Button>
                </Card.Footer>
              </Card.Root>
            {/each}
          </div>
        </Tabs.Content>
      {/if}

      <Tabs.Content value="ldm">
        {#if ldmVariantLoading}
          <div class="feedback-empty">
            <Gauge size={22} />
            <span>{$_('submissions.ldm_loading')}</span>
          </div>
        {:else if ldmVariantSubmissions.length === 0}
          <div class="feedback-empty">
            <Gauge size={22} />
            <span>{$_('submissions.ldm_empty')}</span>
          </div>
        {:else}
          <div class="level-grid">
            {#each ldmVariantSubmissions as submission}
              <Card.Root>
                <Card.Header>
                  <div class="feedback-card-header">
                    <div>
                      <Card.Title>
                        <a
                          href={`/level/${submission.mainLevelId}`}
                          data-sveltekit-preload-data="tap"
                        >
                          {getLdmLevelName(submission, 'mainLevel')}
                        </a>
                      </Card.Title>
                      <Card.Description>
                        {formatSubmissionDate(submission.created_at)}
                      </Card.Description>
                    </div>
                    <Badge variant="outline">
                      {$_('submissions.ldm_status_pending')}
                    </Badge>
                  </div>
                </Card.Header>
                <Card.Content class="feedback-card-body">
                  <div class="ldm-pair">
                    <span>{$_('submissions.ldm_variant')}:</span>
                    <a
                      href={`/level/${submission.variantLevelId}`}
                      data-sveltekit-preload-data="tap"
                    >
                      {getLdmLevelName(submission, 'variantLevel')}
                    </a>
                  </div>
                  {#if submission.comment}
                    <p class="feedback-note">{submission.comment}</p>
                  {/if}
                </Card.Content>
                <Card.Footer class="flex justify-end">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isCancellingLdmVariant(submission.id)}
                    on:click={() => cancelLdmVariantSubmission(submission)}
                  >
                    <CrossCircled size={14} />
                    {$_('general.cancel')}
                  </Button>
                </Card.Footer>
              </Card.Root>
            {/each}
          </div>
        {/if}
      </Tabs.Content>

      <Tabs.Content value="feedback">
        {#if feedbackLoading}
          <div class="feedback-empty">
            <FileText size={22} />
            <span>{$_('submissions.feedback_loading')}</span>
          </div>
        {:else if feedbackSubmissions.length === 0}
          <div class="feedback-empty">
            <FileText size={22} />
            <span>{$_('submissions.feedback_empty')}</span>
          </div>
        {:else}
          <div class="feedback-list">
            {#each feedbackSubmissions as submission}
              <Card.Root>
                <Card.Header>
                  <div class="feedback-card-header">
                    <div>
                      <Card.Title>
                        <a
                          href={`/level/${submission.levelId}`}
                          data-sveltekit-preload-data="tap"
                        >
                          {submission.level?.name || submission.levels?.name || submission.levelId}
                        </a>
                      </Card.Title>
                      <Card.Description>
                        {formatSubmissionDate(submission.created_at)} · {
                          formatFeedbackLength(submission.lengthSeconds)
                        }
                      </Card.Description>
                    </div>
                    <Badge variant={feedbackStatusVariant(submission.status)}>
                      {feedbackStatusLabel(submission.status)}
                    </Badge>
                  </div>
                </Card.Header>
                <Card.Content class="feedback-card-body">
                  <div class="feedback-areas">
                    {#each submission.requestAreas || [] as area}
                      <Badge variant="secondary">{feedbackAreaLabel(area)}</Badge>
                    {/each}
                  </div>
                  {#if submission.submitterNote}
                    <p class="feedback-note">{submission.submitterNote}</p>
                  {/if}
                  {#if submission.briefReview}
                    <div class="review-box">
                      <strong>{$_('submissions.feedback_brief_review')}</strong>
                      <p>{submission.briefReview}</p>
                    </div>
                  {/if}
                </Card.Content>
                <Card.Footer class="flex justify-between items-center">
                  <div class="reviewer-name">
                    {#if feedbackReviewerPlayer(submission)}
                      {$_('submissions.feedback_reviewer')}:
                      <PlayerLink player={feedbackReviewerPlayer(submission)} />
                    {:else}
                      {$_('submissions.feedback_reviewer')}: -
                    {/if}
                  </div>
                  {#if submission.reviewFileUrl}
                    <Button
                      variant="outline"
                      size="sm"
                      on:click={() => window.open(submission.reviewFileUrl, '_blank')}
                    >
                      <ExternalLink size={14} />
                      {$_('submissions.feedback_file_review')}
                    </Button>
                  {/if}
                </Card.Footer>
              </Card.Root>
            {/each}
          </div>
        {/if}
      </Tabs.Content>
    </Tabs.Root>
  </div>
{/if}

<style lang="scss">
.wrapper {
  padding-inline: 50px;
  max-width: 1200px;
  margin-inline: auto;
  padding-block: 16px;
}

.level-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
  padding-block: 16px;
}

.feedback-list {
  display: grid;
  gap: 12px;
  padding-block: 16px;
}

.feedback-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

:global(.feedback-card-body) {
  display: grid;
  gap: 12px;
}

.feedback-areas {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.feedback-note,
.review-box p {
  margin: 0;
  color: hsl(var(--muted-foreground));
  line-height: 1.6;
}

.review-box {
  display: grid;
  gap: 6px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  padding: 12px;
  background: hsl(var(--muted) / 0.12);
}

.reviewer-name {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.ldm-pair {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 13px;

  span {
    color: hsl(var(--muted-foreground));
  }

  a {
    font-weight: 700;
    text-decoration: underline;
  }
}

.feedback-empty {
  min-height: 180px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 10px;
  color: hsl(var(--muted-foreground));
}

.actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

:global(.boost-btn) {
  gap: 4px;
  font-weight: 600;
  background: linear-gradient(135deg, hsl(38 92% 50%), hsl(25 95% 53%));
  border: none;
  color: #fff;
  box-shadow: 0 0 8px hsla(38, 92%, 50%, 0.4);
  transition: box-shadow 0.2s ease, transform 0.15s ease;

  &:hover:not(:disabled) {
    box-shadow: 0 0 16px hsla(38, 92%, 50%, 0.7);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
  }
}

.fps-text {
  font-size: 0.7rem;
  color: hsl(var(--muted-foreground));
  display: block;
}

.muted {
  color: hsl(var(--muted-foreground));
}

@media screen and (max-width: 900px) {
  .wrapper {
    padding-inline: 10px;
  }
}
</style>
