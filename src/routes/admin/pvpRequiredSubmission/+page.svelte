<script lang="ts">
	import Title from '$lib/components/Title.svelte';
	import PlayerSelector from '$lib/components/playerSelector.svelte';
	import { user } from '$lib/client';
	import {
		cancelAdminPvpRequiredSubmission,
		createAdminPvpRequiredSubmission,
		getAdminPvpRequiredSubmissions,
		getPvpRequiredSubmissionLevel,
		getPvpRequiredSubmissionLevelId,
		type PvpRequiredSubmission
	} from '$lib/client/pvp';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { _ } from 'svelte-i18n';
	import { toast } from 'svelte-sonner';
	import { Loader2, ShieldAlert, X } from 'lucide-svelte';

	let selectedPlayer: any = null;
	let levelId = '';
	let note = '';
	let level: any = null;
	let levelError = '';
	let playerAlreadyCompleted = false;
	let activeRequirement: PvpRequiredSubmission | null = null;
	let loadingPlayerState = false;
	let loadingLevel = false;
	let submitting = false;
	let cancelling = false;
	let levelCheckTimer: ReturnType<typeof setTimeout> | null = null;
	let lastLevelRequestKey = '';

	$: selectedUid = selectedPlayer?.uid ?? '';
	$: numericLevelId = Number(levelId);
	$: canSubmit = Boolean(selectedUid)
		&& Number.isInteger(numericLevelId)
		&& numericLevelId > 0
		&& Boolean(level)
		&& !level?.isPlatformer
		&& !playerAlreadyCompleted
		&& !activeRequirement
		&& !submitting
		&& !loadingLevel
		&& !loadingPlayerState;

	function selectedLevelLabel(requirement: PvpRequiredSubmission | null) {
		const requirementLevel = getPvpRequiredSubmissionLevel(requirement);
		const requirementLevelId = getPvpRequiredSubmissionLevelId(requirement);

		return requirementLevel?.name || `#${requirementLevelId ?? ''}`;
	}

	function handlePlayerSelect(event: CustomEvent<any>) {
		selectedPlayer = event.detail;
		void loadPlayerState();
	}

	function handlePlayerClear() {
		selectedPlayer = null;
		activeRequirement = null;
		playerAlreadyCompleted = false;
	}

	function handleLevelInput() {
		if (levelCheckTimer) {
			clearTimeout(levelCheckTimer);
		}

		levelCheckTimer = setTimeout(() => {
			void loadLevelState();
		}, 250);
	}

	async function loadPlayerState() {
		if (!selectedUid) {
			return;
		}

		loadingPlayerState = true;

		try {
			const requirements = await getAdminPvpRequiredSubmissions(
				await $user.token(),
				{ uid: selectedUid, status: 'open' }
			);
			activeRequirement = requirements[0] ?? null;
			await loadCompletionState();
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: $_('admin_pvp_required_submission.toast.load_failed')
			);
		} finally {
			loadingPlayerState = false;
		}
	}

	async function loadLevelState() {
		const requestKey = `${selectedUid}:${levelId}`;
		lastLevelRequestKey = requestKey;
		level = null;
		levelError = '';
		playerAlreadyCompleted = false;

		if (!Number.isInteger(numericLevelId) || numericLevelId <= 0) {
			return;
		}

		loadingLevel = true;

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/levels/${numericLevelId}`
			);

			if (!response.ok) {
				throw new Error($_('admin_pvp_required_submission.errors.level_not_found'));
			}

			const nextLevel = await response.json();

			if (requestKey !== lastLevelRequestKey) {
				return;
			}

			level = nextLevel;

			if (level?.isPlatformer) {
				levelError = $_('admin_pvp_required_submission.errors.platformer');
			}

			await loadCompletionState();
		} catch (error) {
			if (requestKey === lastLevelRequestKey) {
				levelError = error instanceof Error
					? error.message
					: $_('admin_pvp_required_submission.errors.level_not_found');
			}
		} finally {
			if (requestKey === lastLevelRequestKey) {
				loadingLevel = false;
			}
		}
	}

	async function loadCompletionState() {
		playerAlreadyCompleted = false;

		if (!selectedUid || !Number.isInteger(numericLevelId) || numericLevelId <= 0) {
			return;
		}

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/records/${selectedUid}/${numericLevelId}/all`
			);

			if (!response.ok) {
				return;
			}

			const payload = await response.json();
			const accepted = payload?.accepted;
			playerAlreadyCompleted = Boolean(
				accepted?.acceptedManually && Number(accepted?.progress) >= 100
			);
		} catch {
			playerAlreadyCompleted = false;
		}
	}

	async function createRequirement() {
		if (!canSubmit) {
			return;
		}

		submitting = true;

		try {
			activeRequirement = await createAdminPvpRequiredSubmission(
				await $user.token(),
				{
					uid: selectedUid,
					levelId: numericLevelId,
					note: note.trim() || null
				}
			);
			toast.success($_('admin_pvp_required_submission.toast.created'));
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: $_('admin_pvp_required_submission.toast.create_failed')
			);
		} finally {
			submitting = false;
		}
	}

	async function cancelRequirement() {
		if (!activeRequirement?.id || !confirm($_('admin_pvp_required_submission.confirm_cancel'))) {
			return;
		}

		cancelling = true;

		try {
			await cancelAdminPvpRequiredSubmission(await $user.token(), activeRequirement.id);
			activeRequirement = null;
			toast.success($_('admin_pvp_required_submission.toast.cancelled'));
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: $_('admin_pvp_required_submission.toast.cancel_failed')
			);
		} finally {
			cancelling = false;
		}
	}
</script>

<Title value={$_('admin_pvp_required_submission.title')} />

{#if $user.data?.isAdmin}
<div class="page">
  <Card.Root>
    <Card.Header>
      <Card.Title>{$_('admin_pvp_required_submission.title')}</Card.Title>
      <Card.Description>
        {$_('admin_pvp_required_submission.description')}
      </Card.Description>
    </Card.Header>
    <Card.Content class="pvp-required-submission-form">
      <div class="field">
        <Label>{$_('admin_pvp_required_submission.player')}</Label>
        <PlayerSelector
          bind:value={selectedPlayer}
          placeholder={$_('admin_pvp_required_submission.player_placeholder')}
          on:select={handlePlayerSelect}
          on:clear={handlePlayerClear}
        />
      </div>

      <div class="field">
        <Label for="pvp-required-level">
          {$_('admin_pvp_required_submission.level_id')}
        </Label>
        <Input
          id="pvp-required-level"
          bind:value={levelId}
          type="number"
          min="1"
          inputmode="numeric"
          placeholder="123456"
          on:input={handleLevelInput}
        />
      </div>

      <div class="field">
        <Label for="pvp-required-note">
          {$_('admin_pvp_required_submission.note')}
        </Label>
        <Textarea
          id="pvp-required-note"
          bind:value={note}
          rows={3}
          placeholder={$_('admin_pvp_required_submission.note_placeholder')}
        />
      </div>

      {#if activeRequirement}
        <div class="status-panel warning">
          <div>
            <ShieldAlert class="h-4 w-4" />
            <strong>{$_('admin_pvp_required_submission.active_requirement')}</strong>
          </div>
          <p>
            {
              $_('admin_pvp_required_submission.active_requirement_body', {
                  values: { level: selectedLevelLabel(activeRequirement) }
              })
            }
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={cancelling}
            on:click={cancelRequirement}
          >
            {#if cancelling}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            {:else}
              <X class="mr-2 h-4 w-4" />
            {/if}
            {$_('admin_pvp_required_submission.cancel')}
          </Button>
        </div>
      {/if}

      {#if loadingLevel || loadingPlayerState}
        <div class="status-panel">
          <Loader2 class="h-4 w-4 animate-spin" />
          {$_('admin_pvp_required_submission.loading')}
        </div>
      {:else if level}
        <div class="level-preview">
          <div>
            <strong>{level.name}</strong>
            <span>{$_('head.labels.by')} {level.creator}</span>
          </div>
          <div class="badges">
            <Badge variant={level.isPlatformer ? 'destructive' : 'outline'}>
              {level.isPlatformer
                ? $_('admin_pvp_required_submission.platformer')
                : $_('admin_pvp_required_submission.classic')}
            </Badge>
            {#if playerAlreadyCompleted}
              <Badge variant="destructive">
                {$_('admin_pvp_required_submission.already_completed')}
              </Badge>
            {/if}
          </div>
        </div>
      {:else if levelError}
        <div class="status-panel error">{levelError}</div>
      {/if}

      <Button disabled={!canSubmit} on:click={createRequirement}>
        {#if submitting}
          <Loader2 class="mr-2 h-4 w-4 animate-spin" />
        {/if}
        {$_('admin_pvp_required_submission.create')}
      </Button>
    </Card.Content>
  </Card.Root>
</div>
{/if}

<style>
.page {
  max-width: 760px;
  margin: 0 auto;
  padding: 32px 20px;
}

:global(.pvp-required-submission-form) {
  display: grid;
  gap: 18px;
}

.field {
  display: grid;
  gap: 8px;
}

.status-panel,
.level-preview {
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  padding: 12px;
}

.status-panel {
  display: grid;
  gap: 10px;
  color: hsl(var(--muted-foreground));
}

.status-panel div,
.level-preview,
.badges {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-panel.warning {
  border-color: hsl(var(--primary) / 0.35);
  background: hsl(var(--primary) / 0.08);
  color: hsl(var(--foreground));
}

.status-panel.error {
  border-color: hsl(var(--destructive) / 0.35);
  color: hsl(var(--destructive));
}

.level-preview {
  justify-content: space-between;
}

.level-preview strong,
.level-preview span {
  display: block;
}

.level-preview span {
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}

@media (max-width: 640px) {
  .level-preview {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
