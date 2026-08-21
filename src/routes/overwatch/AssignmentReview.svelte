<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { extractYouTubeVideoId } from '$lib/components/submit/submitState';
	import { locale } from 'svelte-i18n';
	import { Check, Clock3, ExternalLink, HelpCircle, RotateCcw, X } from 'lucide-svelte';
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

	function formatDate(value: string) {
		return new Intl.DateTimeFormat($locale === 'vi' ? 'vi-VN' : 'en-US', {
			dateStyle: 'medium',
			timeStyle: 'short'
		})
			.format(new Date(value));
	}

	function progressLabel() {
		if (!assignment.record.isPlatformer) {
			return `${assignment.record.progress}%`;
		}

		const milliseconds = Number(assignment.record.progress || 0);
		const minutes = Math.floor(milliseconds / 60000);
		const seconds = Math.floor((milliseconds % 60000) / 1000);

		return `${minutes}:${seconds.toString()
			.padStart(2, '0')}.${(milliseconds % 1000).toString()
			.padStart(3, '0')}`;
	}
</script>

<section class="review-panel">
  <div class="panel-bar">
    <div>
      <span class="section-label">{text('CURRENT ASSIGNMENT', 'NHIỆM VỤ HIỆN TẠI')}</span>
      <h1>{assignment.record.levelName}</h1>
    </div>
    <div class="expiry"><Clock3 /><span>{text('Expires', 'Hết hạn')}<strong>{formatDate(assignment.expiresAt)}</strong></span></div>
  </div>

  <div class="record-meta" aria-label={text('Record details', 'Thông tin bản ghi')}>
    <div><span>{text('Progress', 'Tiến độ')}</span><strong>{progressLabel()}</strong></div>
    <div><span>{text('Device', 'Thiết bị')}</span><strong>{assignment.record.mobile ? text('Mobile', 'Di động') : text('Computer', 'Máy tính')}</strong></div>
    {#if assignment.record.refreshRate}
      <div><span>{text('Frame rate', 'Tốc độ khung hình')}</span><strong>{assignment.record.refreshRate} FPS</strong></div>
    {/if}
    <div><span>{text('Review mode', 'Chế độ')}</span><strong>{text('Anonymous', 'Ẩn danh')}</strong></div>
  </div>

  <div class="evidence-section">
    <div class="section-heading">
      <h2>{text('Video evidence', 'Video bằng chứng')}</h2>
      <a href={assignment.record.videoUrl} target="_blank" rel="noreferrer">
        {text('Open on YouTube', 'Mở trên YouTube')}<ExternalLink />
      </a>
    </div>
    {#if videoId}
      <div class="video-frame">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          title={text('Record video evidence', 'Video bằng chứng của bản ghi')}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      </div>
    {:else}
      <a class="video-link" href={assignment.record.videoUrl} target="_blank" rel="noreferrer">
        <ExternalLink />
        {text('Open the submitted video', 'Mở video đã gửi')}
      </a>
    {/if}
  </div>

  {#if assignment.record.comment}
    <div class="comment">
      <span>{text('Submitter note', 'Ghi chú của người gửi')}</span>
      <p>{assignment.record.comment}</p>
    </div>
  {/if}

  <div class="decision-section">
    <div class="section-heading decision-heading">
      <div>
        <h2>{text('Your decision', 'Quyết định của bạn')}</h2>
        <p>{text('Review the evidence independently before choosing.', 'Hãy tự đánh giá bằng chứng trước khi lựa chọn.')}</p>
      </div>
      {#if verdict}<span class="selected-label">{text('Selected', 'Đã chọn')}</span>{/if}
    </div>

    <div class="vote-buttons">
      <button type="button" class:active={verdict === 'accept'} class="accept" on:click={() => (verdict = 'accept')}>
        <Check /><span><strong>{text('Accept', 'Chấp nhận')}</strong><small>{text('Evidence is valid', 'Bằng chứng hợp lệ')}</small></span>
      </button>
      <button type="button" class:active={verdict === 'reject'} class="reject" on:click={() => (verdict = 'reject')}>
        <X /><span><strong>{text('Reject', 'Từ chối')}</strong><small>{text('Record is invalid', 'Bản ghi không hợp lệ')}</small></span>
      </button>
      <button type="button" class:active={verdict === 'unsure'} class="unsure" on:click={() => (verdict = 'unsure')}>
        <HelpCircle /><span><strong>{text('Unsure', 'Không chắc')}</strong><small>{text('Evidence is insufficient', 'Chưa đủ bằng chứng')}</small></span>
      </button>
    </div>

    <label for="review-reason">
      <span>{text('Review note', 'Ghi chú kiểm duyệt')}</span>
      <small>{verdict === 'reject' ? text('Required when rejecting', 'Bắt buộc khi từ chối') : text('Optional', 'Không bắt buộc')}</small>
    </label>
    <Textarea
      id="review-reason"
      bind:value={reason}
      placeholder={text('Describe what you verified or what remains unclear…', 'Mô tả điều bạn đã xác minh hoặc điểm còn chưa rõ…')}
      rows={4}
    />
    {#if rejectReasonMissing}
      <p class="validation-message">{text('Add a specific reason before rejecting this record.', 'Hãy nêu lý do cụ thể trước khi từ chối bản ghi này.')}</p>
    {/if}

    <div class="actions">
      <Button variant="outline" disabled={returning || submitting} on:click={onReturn}>
        <RotateCcw class="action-icon" />
        {returning ? text('Returning…', 'Đang trả…') : text('Return to queue', 'Trả về hàng chờ')}
      </Button>
      <Button
        disabled={!verdict || rejectReasonMissing || submitting || returning}
        on:click={() => verdict && onVote(verdict, reason)}
      >{submitting ? text('Submitting…', 'Đang gửi…') : text('Submit decision', 'Gửi quyết định')}</Button>
    </div>
  </div>
</section>

<style>
  .review-panel{border:1px solid hsl(var(--border));border-radius:10px;background:hsl(var(--card));overflow:hidden}.panel-bar{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:18px 20px;border-bottom:1px solid hsl(var(--border))}.section-label{display:block;margin-bottom:3px;color:hsl(var(--muted-foreground));font-size:.65rem;font-weight:750;letter-spacing:.08em}.panel-bar h1{font-size:1.15rem;font-weight:720;line-height:1.25}.expiry{display:flex;align-items:center;gap:8px;color:hsl(var(--muted-foreground))}.expiry :global(svg){width:17px;height:17px}.expiry span{display:grid;font-size:.68rem;line-height:1.3}.expiry strong{color:hsl(var(--foreground));font-size:.75rem;font-weight:600;white-space:nowrap}
  .record-meta{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-bottom:1px solid hsl(var(--border));background:hsl(var(--muted)/.2)}.record-meta>div{display:grid;gap:2px;padding:12px 20px;border-right:1px solid hsl(var(--border))}.record-meta>div:last-child{border-right:0}.record-meta span{font-size:.68rem;color:hsl(var(--muted-foreground))}.record-meta strong{font-size:.8rem;font-weight:650}
  .evidence-section,.decision-section{padding:20px}.evidence-section{border-bottom:1px solid hsl(var(--border))}.section-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:12px}.section-heading h2{font-size:.86rem;font-weight:700}.section-heading>a{display:inline-flex;align-items:center;gap:5px;color:hsl(var(--muted-foreground));font-size:.72rem}.section-heading>a:hover{color:hsl(var(--foreground));text-decoration:underline}.section-heading>a :global(svg){width:13px;height:13px}.video-frame{aspect-ratio:16/9;overflow:hidden;border-radius:7px;background:#000}.video-frame iframe{width:100%;height:100%;border:0}.video-link{min-height:220px;display:flex;align-items:center;justify-content:center;gap:8px;border:1px dashed hsl(var(--border));border-radius:7px;color:hsl(var(--muted-foreground));font-size:.83rem}.video-link :global(svg){width:17px}
  .comment{margin:0 20px 20px;border-left:2px solid hsl(var(--border));padding:4px 0 4px 13px}.comment span{font-size:.68rem;font-weight:700;color:hsl(var(--muted-foreground))}.comment p{margin-top:4px;white-space:pre-wrap;font-size:.82rem;line-height:1.5}.decision-heading p{margin-top:2px;color:hsl(var(--muted-foreground));font-size:.75rem}.selected-label{border-radius:999px;background:hsl(var(--muted));padding:4px 8px;font-size:.67rem;font-weight:700;color:hsl(var(--muted-foreground))}
  .vote-buttons{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-bottom:18px}.vote-buttons button{display:flex;align-items:center;gap:10px;min-height:62px;border:1px solid hsl(var(--border));border-radius:7px;padding:10px 12px;background:transparent;color:hsl(var(--foreground));text-align:left;transition:border-color .15s,background .15s}.vote-buttons button:hover{background:hsl(var(--muted)/.45)}.vote-buttons button:focus-visible{outline:2px solid hsl(var(--ring));outline-offset:2px}.vote-buttons button :global(svg){width:18px;height:18px;flex:0 0 18px;color:hsl(var(--muted-foreground))}.vote-buttons button span{display:grid}.vote-buttons strong{font-size:.79rem}.vote-buttons small{color:hsl(var(--muted-foreground));font-size:.66rem}.vote-buttons .accept.active{border-color:#22a06b;background:rgb(34 160 107/.08)}.vote-buttons .accept.active :global(svg){color:#22a06b}.vote-buttons .reject.active{border-color:#e5484d;background:rgb(229 72 77/.08)}.vote-buttons .reject.active :global(svg){color:#e5484d}.vote-buttons .unsure.active{border-color:#d99a22;background:rgb(217 154 34/.08)}.vote-buttons .unsure.active :global(svg){color:#d99a22}
  label{display:flex;justify-content:space-between;gap:12px;margin-bottom:7px;font-size:.76rem;font-weight:650}label small{color:hsl(var(--muted-foreground));font-size:.68rem;font-weight:500}.decision-section :global(textarea){min-height:96px;resize:vertical;border-radius:7px;font-size:.8rem}.validation-message{margin-top:6px;color:hsl(var(--destructive));font-size:.7rem}.actions{display:flex;justify-content:space-between;gap:10px;margin-top:14px;padding-top:14px;border-top:1px solid hsl(var(--border))}:global(.action-icon){width:15px;height:15px;margin-right:7px}
  @media(max-width:680px){.panel-bar{align-items:flex-start;flex-direction:column}.record-meta{grid-template-columns:1fr 1fr}.record-meta>div:nth-child(2){border-right:0}.record-meta>div:nth-child(-n+2){border-bottom:1px solid hsl(var(--border))}.vote-buttons{grid-template-columns:1fr}.actions{display:grid}.actions :global(button){width:100%}}
</style>
