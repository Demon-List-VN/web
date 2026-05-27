<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import { user } from '$lib/client';
	import {
		reportPvpMatch,
		type PvpMatchReport,
		type PvpMatchReportReason
	} from '$lib/client/pvp';
	import { Loader2, ShieldAlert } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';
	import { toast } from 'svelte-sonner';

	export let open = false;
	export let matchId: number | string | null | undefined = null;
	export let remainingMs = 0;
	export let onSubmitted: (report: PvpMatchReport) => void = () => {};

	let reason: PvpMatchReportReason = 'cheating';
	let submitting = false;
	let wasOpen = false;

	$: if (open && !wasOpen) {
		reason = 'cheating';
	}

	$: wasOpen = open;

	async function submitReport() {
		if (!matchId || submitting) {
			return;
		}

		submitting = true;

		try {
			const report = await reportPvpMatch(await $user.token(), matchId, reason);
			onSubmitted(report);
			toast.success($_('pvp.report.success'));
			open = false;
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : $_('pvp.report.failed')
			);
		} finally {
			submitting = false;
		}
	}

	function handleReasonChange(item: { value?: unknown; } | null | undefined) {
		const nextReason = String(item?.value || '');

		if (nextReason === 'cheating' || nextReason === 'abusive_communication') {
			reason = nextReason;
		}
	}

	function formatDuration(ms: number) {
		const totalSeconds = Math.max(0, Math.floor(ms / 1000));
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;

		return `${minutes}:${String(seconds)
			.padStart(2, '0')}`;
	}
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="max-w-md">
    <Dialog.Header>
      <Dialog.Title class="report-title">
        <ShieldAlert class="h-5 w-5" />
        {$_('pvp.report.title')}
      </Dialog.Title>
      <Dialog.Description>
        {
          $_('pvp.report.description', {
            values: { time: formatDuration(remainingMs) }
          })
        }
      </Dialog.Description>
    </Dialog.Header>

    <div class="report-form">
      <label class="report-label" for="pvp-report-reason">
        {$_('pvp.report.reason')}
      </label>
      <Select.Root
        selected={{
          value: reason,
          label: $_(`pvp.report.reasons.${reason}`)
        }}
        onSelectedChange={handleReasonChange}
      >
        <Select.Trigger id="pvp-report-reason">
          <Select.Value placeholder={$_('pvp.report.reasons.cheating')} />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="cheating">
            {$_('pvp.report.reasons.cheating')}
          </Select.Item>
          <Select.Item value="abusive_communication">
            {$_('pvp.report.reasons.abusive_communication')}
          </Select.Item>
        </Select.Content>
      </Select.Root>
      <p>{$_('pvp.report.limit_hint')}</p>
    </div>

    <Dialog.Footer>
      <Button variant="outline" on:click={() => (open = false)}>
        {$_('general.close')}
      </Button>
      <Button
        variant="destructive"
        disabled={submitting || !matchId || remainingMs <= 0}
        on:click={submitReport}
      >
        {#if submitting}
          <Loader2 class="mr-2 h-4 w-4 animate-spin" />
        {/if}
        {$_('pvp.report.submit')}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<style lang="scss">
:global(.report-title) {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.report-form {
  display: grid;
  gap: 8px;
}

.report-label {
  font-size: 13px;
  font-weight: 600;
}

.report-form p {
  margin: 0;
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}
</style>
