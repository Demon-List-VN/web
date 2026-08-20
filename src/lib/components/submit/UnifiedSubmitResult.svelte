<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { user } from '$lib/client';
	import { locale } from 'svelte-i18n';
	import { CheckCircle2, Loader2, RotateCcw, XCircle } from 'lucide-svelte';
	import { Confetti } from 'svelte-confetti';

	type SubmissionResult = {
		key: string;
		label: string;
		success: boolean;
		error?: string;
	};

	export let loading = false;
	export let results: SubmissionResult[] = [];
	export let onRetry: () => void;
	export let onEdit: () => void;
	export let onReset: () => void;

	function t(vi: string, en: string) {
		return $locale == 'vi' ? vi : en;
	}

	$: successCount = results.filter((result) => result.success).length;
	$: failureCount = results.length - successCount;
</script>

<div class="result-step">
  {#if loading}
    <div class="result-heading"><Loader2 size={42} class="spin" /><h2>{t('Đang gửi bài...', 'Submitting...')}</h2><p>{t('Vui lòng giữ trang này mở.', 'Please keep this page open.')}</p></div>
  {:else}
    {#if successCount > 0 && failureCount === 0}
      <div class="confetti"><Confetti x={[-4, 4]} y={[0, 0.1]} delay={[0, 180]} duration={2600} amount={160} fallDistance="100vh" /></div>
    {/if}
    <div class="result-heading" class:success={failureCount === 0} class:error={successCount === 0}>
      {#if failureCount === 0}<CheckCircle2 size={44} />{:else if successCount === 0}<XCircle size={44} />{:else}<RotateCcw size={44} />{/if}
      <h2>{failureCount === 0 ? t('Đã nộp thành công', 'Submission complete') : successCount === 0 ? t('Không thể gửi bài', 'Submission failed') : t('Đã gửi một phần', 'Partially submitted')}</h2>
      <p>{successCount} {t('thành công', 'succeeded')} · {failureCount} {t('thất bại', 'failed')}</p>
    </div>

    <div class="result-list">
      {#each results as result (result.key)}
        <div class:failed={!result.success}>
          {#if result.success}<CheckCircle2 size={18} />{:else}<XCircle size={18} />{/if}
          <span><strong>{result.label}</strong>{#if result.error}<small>{result.error}</small>{/if}</span>
        </div>
      {/each}
    </div>

    <div class="actions">
      {#if failureCount > 0}<Button on:click={onRetry}>{t('Thử lại mục lỗi', 'Retry failed')}</Button><Button variant="outline" on:click={onEdit}>{t('Sửa thông tin', 'Edit submission')}</Button>{/if}
      {#if failureCount === 0}<Button variant="outline" on:click={onReset}>{t('Nộp thêm', 'Submit another')}</Button><Button href={`/mySubmission/${$user.data?.uid}`}>{t('Xem bài nộp', 'View submissions')}</Button>{/if}
    </div>
  {/if}
</div>

<style lang="scss">
.result-step { display: grid; gap: 18px; }
.result-heading { display: flex; flex-direction: column; align-items: center; gap: 7px; padding: 20px 0 8px; text-align: center; color: hsl(var(--muted-foreground)); }
.result-heading.success { color: hsl(142 70% 38%); } .result-heading.error { color: hsl(var(--destructive)); }
.result-heading h2 { color: hsl(var(--foreground)); font-size: 20px; font-weight: 700; } .result-heading p { font-size: 13px; }
.result-list { display: grid; gap: 8px; }
.result-list > div { display: flex; align-items: flex-start; gap: 10px; padding: 12px; border: 1px solid hsl(142 55% 38% / 0.35); border-radius: 10px; color: hsl(142 65% 36%); background: hsl(142 55% 38% / 0.05); }
.result-list > div.failed { border-color: hsl(var(--destructive) / 0.35); color: hsl(var(--destructive)); background: hsl(var(--destructive) / 0.05); }
.result-list span { display: grid; gap: 3px; color: hsl(var(--foreground)); } .result-list strong { font-size: 13px; } .result-list small { color: hsl(var(--destructive)); font-size: 12px; line-height: 1.4; }
.actions { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; }
.confetti { position: fixed; top: -10px; left: 50%; z-index: 100; pointer-events: none; }
:global(.spin) { animation: spin 0.8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }
</style>
