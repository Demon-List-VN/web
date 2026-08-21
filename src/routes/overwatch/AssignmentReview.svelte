<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { extractYouTubeVideoId } from '$lib/components/submit/submitState';
	import { locale } from 'svelte-i18n';
	import type { OverwatchAssignment, OverwatchVerdict } from '$lib/client/overwatch';

	export let assignment: OverwatchAssignment;
	export let submitting = false;
	export let returning = false;
	export let onVote: (verdict: OverwatchVerdict, reason: string) => void;
	export let onReturn: () => void;

	let verdict: OverwatchVerdict | null = null;
	let reason = '';
	$: videoId = extractYouTubeVideoId(assignment.record.videoUrl || '');
	$: rejectReasonMissing = verdict === 'reject' && !reason.trim();

	function text(en: string, vi: string) {
		return $locale === 'vi' ? vi : en;
	}

	function progressLabel() {
		if (!assignment.record.isPlatformer) {
			return `${assignment.record.progress}%`;
		}

		const milliseconds = Number(assignment.record.progress || 0);
		const minutes = Math.floor(milliseconds / 60000);
		const seconds = Math.floor((milliseconds % 60000) / 1000);

		return `${minutes}:${seconds.toString()
			.padStart(2, '0')}.${milliseconds % 1000}`;
	}
</script>

<section class="review-card">
  <div class="review-heading">
    <div>
      <p class="eyebrow">{text('Blind review', 'Review ẩn danh')}</p>
      <h2>{assignment.record.levelName}</h2>
      <p>Assignment expires {new Date(assignment.expiresAt)
.toLocaleString()}</p>
    </div>
    <div class="badges">
      <Badge>{progressLabel()}</Badge>
      <Badge variant="outline">{assignment.record.mobile ? 'Mobile' : 'PC'}</Badge>
      {#if assignment.record.refreshRate}
        <Badge variant="secondary">{assignment.record.refreshRate} FPS</Badge>
      {/if}
    </div>
  </div>

  {#if videoId}
    <div class="video-frame">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title="Record evidence"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
    </div>
  {:else}
    <a class="video-link" href={assignment.record.videoUrl} target="_blank" rel="noreferrer">
      Open submitted evidence
    </a>
  {/if}

  {#if assignment.record.comment}
    <div class="comment">
      <span>Submitter note</span>
      <p>{assignment.record.comment}</p>
    </div>
  {/if}

  <div class="vote-area">
    <Label>{text('Verdict', 'Quyết định')}</Label>
    <div class="vote-buttons">
      <Button variant={verdict === 'accept' ? 'default' : 'outline'} on:click={() => (verdict = 'accept')}>{text('Accept', 'Chấp nhận')}</Button>
      <Button variant={verdict === 'reject' ? 'destructive' : 'outline'} on:click={() => (verdict = 'reject')}>{text('Reject', 'Từ chối')}</Button>
      <Button variant={verdict === 'unsure' ? 'secondary' : 'outline'} on:click={() => (verdict = 'unsure')}>{text('Unsure', 'Không chắc')}</Button>
    </div>
    <Label for="review-reason">{text('Reason', 'Lý do')} {verdict === 'reject' ? text('(required)', '(bắt buộc)') : text('(optional)', '(không bắt buộc)')}</Label>
    <Textarea id="review-reason" bind:value={reason} placeholder="Explain what you verified or what is unclear" />
    <div class="actions">
      <Button variant="outline" disabled={returning || submitting} on:click={onReturn}>
        {returning ? text('Returning…', 'Đang trả…') : text('Return record', 'Trả record')}
      </Button>
      <Button
        disabled={!verdict || rejectReasonMissing || submitting || returning}
        on:click={() => verdict && onVote(verdict, reason)}
      >{submitting ? text('Submitting…', 'Đang gửi…') : text('Submit verdict', 'Gửi quyết định')}</Button>
    </div>
  </div>
</section>

<style>
  .review-card{display:grid;gap:20px;border:1px solid hsl(var(--border));border-radius:18px;background:hsl(var(--card));padding:24px}.review-heading{display:flex;justify-content:space-between;gap:18px;align-items:start}.eyebrow{font-size:.72rem;text-transform:uppercase;letter-spacing:.12em;font-weight:800;color:hsl(var(--primary))}.review-heading h2{font-size:1.6rem;font-weight:800}.review-heading p:last-child{font-size:.85rem;color:hsl(var(--muted-foreground))}.badges,.vote-buttons,.actions{display:flex;flex-wrap:wrap;gap:9px}.video-frame{aspect-ratio:16/9;overflow:hidden;border-radius:12px;background:#000}.video-frame iframe{width:100%;height:100%;border:0}.video-link{border:1px dashed hsl(var(--border));border-radius:12px;padding:25px;text-align:center;color:hsl(var(--primary))}.comment{border-radius:10px;background:hsl(var(--muted)/.55);padding:14px}.comment span{font-size:.72rem;font-weight:800;text-transform:uppercase;color:hsl(var(--muted-foreground))}.comment p{margin-top:5px;white-space:pre-wrap}.vote-area{display:grid;gap:11px}.actions{justify-content:space-between;margin-top:5px}@media(max-width:650px){.review-card{padding:17px}.review-heading{display:grid}.actions{display:grid}.actions :global(button){width:100%}}
</style>
