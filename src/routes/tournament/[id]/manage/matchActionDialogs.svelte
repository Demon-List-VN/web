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
	let overrideWinner = '';
	let submitting = false;

	export function openStart(node: any) {
		startNode = node;
		startLevelId = null;
	}

	export function openOverride(node: any) {
		overrideNode = node;
		overrideWinner = node.winnerUid ?? node.player1Uid;
	}

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
				body: JSON.stringify({ winnerUid: overrideWinner })
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
      <Dialog.Title>{$_('tournament.matches.finalize')}</Dialog.Title>
    </Dialog.Header>
    {#if overrideNode}
      <div class="flex flex-col gap-[10px]">
        <p class="text-sm text-muted-foreground">{$_('tournament.bracket.choose_winner')}</p>
        <label class="flex items-center gap-[8px]">
          <input type="radio" bind:group={overrideWinner} value={overrideNode.player1Uid} />
          <PlayerLink player={overrideNode.player1} showAvatar avatarSize={20} />
        </label>
        <label class="flex items-center gap-[8px]">
          <input type="radio" bind:group={overrideWinner} value={overrideNode.player2Uid} />
          <PlayerLink player={overrideNode.player2} showAvatar avatarSize={20} />
        </label>
      </div>
    {/if}
    <Dialog.Footer>
      <Button on:click={submitOverride} disabled={submitting || !overrideWinner}>
        {$_('tournament.bracket.confirm')}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
