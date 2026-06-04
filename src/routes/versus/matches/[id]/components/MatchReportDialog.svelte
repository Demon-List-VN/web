<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { user } from '$lib/client';
	import {
		reportPvpMatch,
		type PvpMatchReport,
		type PvpMatchReportTargetType,
		type PvpMatchReportReason
	} from '$lib/client/pvp';
	import { Loader2, ShieldAlert } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';
	import { toast } from 'svelte-sonner';

	export let open = false;
	export let matchId: number | string | null | undefined = null;
	export let reportedPlayer = false;
	export let reportedLevel = false;
	export let remainingMs = 0;
	export let deadlineKnown = true;
	export let onSubmitted: (report: PvpMatchReport) => void = () => {};

	type ReportReasonOption = {
		value: PvpMatchReportReason;
		label: string;
	};

	const playerReasons: ReportReasonOption[] = [
		{ value: 'cheating', label: 'pvp.report.reasons.cheating' },
		{
			value: 'abusive_communication',
			label: 'pvp.report.reasons.abusive_communication'
		},
		{ value: 'other', label: 'pvp.report.reasons.other' }
	];
	const levelReasons: ReportReasonOption[] = [
		{ value: 'too_easy', label: 'pvp.report.reasons.too_easy' },
		{ value: 'too_difficult', label: 'pvp.report.reasons.too_difficult' },
		{ value: 'level_deleted', label: 'pvp.report.reasons.level_deleted' },
		{ value: 'secret_way', label: 'pvp.report.reasons.secret_way' },
		{ value: 'unenjoyable', label: 'pvp.report.reasons.unenjoyable' },
		{ value: 'other', label: 'pvp.report.reasons.other' }
	];

	let targetType: PvpMatchReportTargetType = 'player';
	let reason: PvpMatchReportReason = 'cheating';
	let description = '';
	let submitting = false;
	let wasOpen = false;

	$: if (open && !wasOpen) {
		targetType = !reportedPlayer ? 'player' : 'level';
		reason = targetType === 'player' ? 'cheating' : 'too_easy';
		description = '';
	}

	$: wasOpen = open;
	$: reasonOptions = targetType === 'player' ? playerReasons : levelReasons;
	$: if (!reasonOptions.some((option) => option.value === reason)) {
		reason = reasonOptions[0]?.value ?? 'other';
	}
	$: descriptionRequired = reason === 'other';
	$: submitDisabled = submitting
		|| !matchId
		|| (deadlineKnown && remainingMs <= 0)
		|| (targetType === 'player' && reportedPlayer)
		|| (targetType === 'level' && reportedLevel)
		|| (descriptionRequired && !description.trim());

	async function submitReport() {
		if (!matchId || submitting) {
			return;
		}

		const trimmedDescription = description.trim();

		if (descriptionRequired && !trimmedDescription) {
			toast.error($_('pvp.report.details_required'));

			return;
		}

		submitting = true;

		try {
			const report = await reportPvpMatch(
				await $user.token(),
				matchId,
				targetType,
				reason,
				trimmedDescription || null
			);
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
        {#if deadlineKnown}
          {
            $_('pvp.report.description', {
              values: { time: formatDuration(remainingMs) }
            })
          }
        {:else}
          {$_('pvp.report.description_active')}
        {/if}
      </Dialog.Description>
    </Dialog.Header>

    <div class="report-form">
      <span class="report-label">
        {$_('pvp.report.target')}
      </span>
      <div class="report-reasons">
        <RadioGroup.Root bind:value={targetType}>
          <label
            class="report-reason"
            class:disabled={reportedPlayer}
            for="pvp-report-target-player"
          >
            <RadioGroup.Item
              id="pvp-report-target-player"
              value="player"
              disabled={reportedPlayer}
            />
            <span>{$_('pvp.report.targets.player')}</span>
            {#if reportedPlayer}
              <small>{$_('pvp.report.already_submitted')}</small>
            {/if}
          </label>
          <label
            class="report-reason"
            class:disabled={reportedLevel}
            for="pvp-report-target-level"
          >
            <RadioGroup.Item
              id="pvp-report-target-level"
              value="level"
              disabled={reportedLevel}
            />
            <span>{$_('pvp.report.targets.level')}</span>
            {#if reportedLevel}
              <small>{$_('pvp.report.already_submitted')}</small>
            {/if}
          </label>
        </RadioGroup.Root>
      </div>

      <span class="report-label">
        {$_('pvp.report.reason')}
      </span>
      <div class="report-reasons">
        <RadioGroup.Root bind:value={reason}>
          {#each reasonOptions as option (`${targetType}:${option.value}`)}
            <label
              class="report-reason"
              for={`pvp-report-${targetType}-${option.value}`}
            >
              <RadioGroup.Item
                id={`pvp-report-${targetType}-${option.value}`}
                value={option.value}
              />
              <span>{$_(option.label)}</span>
            </label>
          {/each}
        </RadioGroup.Root>
      </div>

      <div class="report-details">
        <label class="report-label" for="pvp-report-details">
          {$_('pvp.report.details')}
        </label>
        <Textarea
          id="pvp-report-details"
          bind:value={description}
          rows={3}
          placeholder={$_('pvp.report.details_placeholder')}
          required={descriptionRequired}
        />
      </div>

      <p>{$_('pvp.report.limit_hint')}</p>
    </div>

    <Dialog.Footer>
      <Button variant="outline" on:click={() => (open = false)}>
        {$_('general.close')}
      </Button>
      <Button
        variant="destructive"
        disabled={submitDisabled}
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
  gap: 12px;
}

.report-label {
  font-size: 13px;
  font-weight: 600;
}

.report-reasons,
.report-details {
  display: grid;
  gap: 8px;
}

.report-reasons :global([role="radiogroup"]) {
  display: grid;
  gap: 8px;
}

.report-reason {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
}

.report-reason:hover {
  background: hsl(var(--muted) / 0.55);
}

.report-reason.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.report-reason small {
  margin-left: auto;
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}

.report-form p {
  margin: 0;
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}
</style>
