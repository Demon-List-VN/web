<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { user } from '$lib/client';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import * as Dialog from '$lib/components/ui/dialog';
	import { locale } from 'svelte-i18n';
	import {
		getOverwatchRecordStatus,
		submitOverwatchAppeal,
		submitOverwatchEvidence,
		type OverwatchRecordStatus
	} from '$lib/client/overwatch';

	export let recordId: number;

	let status: OverwatchRecordStatus | null = null;
	let open = false;
	let loading = true;
	let submitting = false;
	let videoUrl = '';
	let appealReason = '';
	let appealVideoUrl = '';

	function text(en: string, vi: string) {
		return $locale === 'vi' ? vi : en;
	}

	let labels: Record<string, string>;

	$: labels = {
		QUEUED: text('Queued', 'Trong hàng đợi'),
		IN_REVIEW: text('In review', 'Đang review'),
		ADDITIONAL_REVIEW: text('Additional review', 'Review bổ sung'),
		ADDITIONAL_INFORMATION_NEEDED: text('Evidence needed', 'Cần thêm bằng chứng'),
		APPEAL_IN_REVIEW: text('Appeal in review', 'Đang review appeal'),
		ACCEPTED: text('Accepted', 'Đã chấp nhận'),
		REJECTED: text('Rejected', 'Đã từ chối'),
		REJECTED_INSUFFICIENT_EVIDENCE: text('Insufficient evidence', 'Không đủ bằng chứng'),
		REJECTED_FINAL: text('Rejected — final', 'Từ chối — cuối cùng')
	};

	function formatDeadline(value: string | null) {
		return value ? new Date(value)
			.toLocaleString() : '—';
	}

	async function load() {
		if (!$user.loggedIn) {
			return;
		}

		try {
			status = await getOverwatchRecordStatus(await $user.token(), recordId);
		} catch {
			status = null;
		} finally {
			loading = false;
		}
	}

	async function sendEvidence() {
		if (!videoUrl.trim()) {
			return;
		}

		submitting = true;

		try {
			await submitOverwatchEvidence(await $user.token(), recordId, videoUrl.trim());
			toast.success('New evidence submitted.');
			videoUrl = '';
			await load();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to submit evidence');
		} finally {
			submitting = false;
		}
	}

	async function sendAppeal() {
		if (!appealReason.trim()) {
			return;
		}

		submitting = true;

		try {
			await submitOverwatchAppeal(
				await $user.token(),
				recordId,
				appealReason.trim(),
				appealVideoUrl.trim()
			);
			toast.success('Appeal submitted.');
			appealReason = '';
			appealVideoUrl = '';
			await load();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to submit appeal');
		} finally {
			submitting = false;
		}
	}

	onMount(load);
</script>

{#if loading}
  <span class="text-xs text-muted-foreground">…</span>
{:else if status}
  <Dialog.Root bind:open>
    <Dialog.Trigger>
      <button type="button" on:click|stopPropagation>
        <Badge variant={status.status === 'ACCEPTED' ? 'default' : status.status.includes('REJECTED') ? 'destructive' : 'outline'}>
          {labels[status.status] ?? status.status}
        </Badge>
      </button>
    </Dialog.Trigger>
    <Dialog.Content class="sm:max-w-lg">
      <Dialog.Header><Dialog.Title>{text('Overwatch status', 'Trạng thái Overwatch')}</Dialog.Title><Dialog.Description>{text('The active review never exposes votes or reviewer identities.', 'Quá trình review không tiết lộ vote hoặc danh tính reviewer.')}</Dialog.Description></Dialog.Header>
      <div class="status-grid">
        <p><span>Status</span><strong>{labels[status.status] ?? status.status}</strong></p>
        {#if status.queuePosition}<p><span>Queue position</span><strong>#{status.queuePosition}</strong></p>{/if}
        {#if status.recordsAhead !== null}<p><span>Records ahead</span><strong>{status.recordsAhead}</strong></p>{/if}
        {#if status.estimatedDays}<p><span>Estimated start</span><strong>{status.estimatedDays.min}–{status.estimatedDays.max} days</strong></p>{/if}
      </div>

      {#if status.canSubmitEvidence}
        <div class="action-form">
          <Label for={`evidence-${recordId}`}>{text('New evidence video URL', 'URL video bằng chứng mới')}</Label>
          <Input id={`evidence-${recordId}`} type="url" bind:value={videoUrl} placeholder="https://youtu.be/…" />
          <p>Deadline: {formatDeadline(status.evidenceDeadline)}</p>
          <Button disabled={submitting || !videoUrl.trim()} on:click={sendEvidence}>{text('Submit evidence', 'Gửi bằng chứng')}</Button>
        </div>
      {/if}

      {#if status.canAppeal}
        <div class="action-form">
          <Label for={`appeal-reason-${recordId}`}>{text('Appeal reason', 'Lý do appeal')}</Label>
          <Textarea id={`appeal-reason-${recordId}`} bind:value={appealReason} />
          <Label for={`appeal-video-${recordId}`}>New video URL (optional)</Label>
          <Input id={`appeal-video-${recordId}`} type="url" bind:value={appealVideoUrl} />
          <p>Deadline: {formatDeadline(status.appealDeadline)}</p>
          <Button disabled={submitting || !appealReason.trim()} on:click={sendAppeal}>{text('Submit appeal', 'Gửi appeal')}</Button>
        </div>
      {/if}
    </Dialog.Content>
  </Dialog.Root>
{/if}

<style>
  .status-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.status-grid p{display:grid;border-radius:9px;background:hsl(var(--muted)/.55);padding:11px}.status-grid span,.action-form p{font-size:.76rem;color:hsl(var(--muted-foreground))}.action-form{display:grid;gap:8px;margin-top:16px;border-top:1px solid hsl(var(--border));padding-top:16px}@media(max-width:480px){.status-grid{grid-template-columns:1fr}}
</style>
