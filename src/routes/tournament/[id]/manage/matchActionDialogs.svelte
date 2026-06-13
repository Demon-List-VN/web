<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { toast } from 'svelte-sonner';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import { tournamentFetch } from '$lib/client/tournament';

	export let tournament: any;
	export let onChange: (() => Promise<void> | void) | null = null;

	let startNode: any = null;
	let startLevelId: number | null = null;
	let overrideNode: any = null;
	let overrideScore1: number | string | null = null;
	let overrideScore2: number | string | null = null;
	let overrideWinsNeeded = 1;
	let submitting = false;

	export function openStart(node: any) {
		startNode = node;
		startLevelId = null;
	}

	export function openOverride(node: any) {
		overrideNode = node;
		overrideWinsNeeded = Math.ceil(
			Math.max(Number(tournament.pvpFormat?.levelsPerMatch) || 1, 1) / 2
		);
		overrideScore1 = node.status === 'completed'
			? Number(node.score1 ?? 0)
			: Number(node.score1 ?? 0);
		overrideScore2 = node.status === 'completed'
			? Number(node.score2 ?? 0)
			: Number(node.score2 ?? 0);
	}

	$: normalizedOverrideScore1 = overrideScore1 === null || overrideScore1 === ''
		? null
		: Number(overrideScore1);
	$: normalizedOverrideScore2 = overrideScore2 === null || overrideScore2 === ''
		? null
		: Number(overrideScore2);
	$: overrideScoresEntered = normalizedOverrideScore1 !== null
		&& normalizedOverrideScore2 !== null;
	$: overrideScoreValid = Boolean(
		overrideNode
		&& overrideScoresEntered
		&& Number.isInteger(normalizedOverrideScore1)
		&& Number.isInteger(normalizedOverrideScore2)
		&& Number(normalizedOverrideScore1) >= 0
		&& Number(normalizedOverrideScore2) >= 0
		&& Number(normalizedOverrideScore1) <= overrideWinsNeeded
		&& Number(normalizedOverrideScore2) <= overrideWinsNeeded
		&& !(
			normalizedOverrideScore1 === overrideWinsNeeded
			&& normalizedOverrideScore2 === overrideWinsNeeded
		)
	);

	async function startMatch() {
		submitting = true;

		try {
			await tournamentFetch(`/${tournament.id}/matches/${startNode.id}/start`, {
				method: 'POST',
				body: JSON.stringify({
					levelId: tournament.pvpFormat?.levelSelectionMode === 'manual'
						? startLevelId
						: undefined
				})
			});
			toast.success($_('tournament.bracket.match_started'));
			startNode = null;
			await onChange?.();
		} catch (error: any) {
			toast.error(error.message);
		} finally {
			submitting = false;
		}
	}

	async function submitOverride() {
		submitting = true;

		try {
			await tournamentFetch(`/${tournament.id}/matches/${overrideNode.id}/override`, {
				method: 'POST',
				body: JSON.stringify({
					score1: normalizedOverrideScore1,
					score2: normalizedOverrideScore2
				})
			});
			toast.success($_('tournament.bracket.override_success'));
			overrideNode = null;
			await onChange?.();
		} catch (error: any) {
			toast.error(error.message);
		} finally {
			submitting = false;
		}
	}
</script>

<Dialog.Root
  open={startNode !== null}
  onOpenChange={(open) => {
    if (!open) {
      startNode = null;
    }
  }}
>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>{$_('tournament.bracket.start_match')}</Dialog.Title>
    </Dialog.Header>
    {#if startNode}
      <div class="flex flex-col gap-[12px]">
        <div class="flex items-center gap-[8px] text-sm">
          <PlayerLink player={startNode.player1} showAvatar avatarSize={22} />
          <span class="text-muted-foreground">vs</span>
          <PlayerLink player={startNode.player2} showAvatar avatarSize={22} />
        </div>
        {#if tournament.pvpFormat?.levelSelectionMode === 'manual'}
          <div class="flex flex-col gap-[6px]">
            <Label>{$_('tournament.bracket.level_id')}</Label>
            <Input type="number" min="1" bind:value={startLevelId} />
          </div>
        {:else}
          <p class="text-sm text-muted-foreground">
            {$_('tournament.bracket.automatic_level_notice')}
          </p>
        {/if}
      </div>
    {/if}
    <Dialog.Footer>
      <Button
        on:click={startMatch}
        disabled={submitting || (tournament.pvpFormat?.levelSelectionMode === 'manual' && !startLevelId)}
      >
        {$_('tournament.bracket.start_match')}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root
  open={overrideNode !== null}
  onOpenChange={(open) => {
    if (!open) {
      overrideNode = null;
    }
  }}
>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>{$_('tournament.bracket.edit_result')}</Dialog.Title>
    </Dialog.Header>
    {#if overrideNode}
      <div class="flex flex-col gap-[10px]">
        <div class="grid grid-cols-[1fr_90px] items-center gap-[10px]">
          <div class="flex items-center gap-[8px]">
            <PlayerLink player={overrideNode.player1} showAvatar avatarSize={20} />
          </div>
          <div class="flex flex-col gap-[4px]">
            <Label for="override-score-1">{$_('tournament.bracket.score')}</Label>
            <Input id="override-score-1" type="number" min="0" step="1" bind:value={overrideScore1} />
          </div>
          <div class="flex items-center gap-[8px]">
            <PlayerLink player={overrideNode.player2} showAvatar avatarSize={20} />
          </div>
          <div class="flex flex-col gap-[4px]">
            <Label for="override-score-2">{$_('tournament.bracket.score')}</Label>
            <Input id="override-score-2" type="number" min="0" step="1" bind:value={overrideScore2} />
          </div>
        </div>
        {#if overrideScoresEntered && !overrideScoreValid}
          <p class="text-sm text-destructive">{$_('tournament.bracket.winner_score_error')}</p>
        {/if}
      </div>
    {/if}
    <Dialog.Footer>
      <Button on:click={submitOverride} disabled={submitting || !overrideScoreValid}>
        {$_('tournament.bracket.confirm')}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
