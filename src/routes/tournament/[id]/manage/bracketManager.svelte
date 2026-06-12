<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import { tournamentFetch } from '$lib/client/tournament';
	import {
		autoFillTournamentSlots,
		changeTournamentSlot
	} from '$lib/utils/tournamentBracket';
	import Bracket from '../bracket.svelte';

	export let tournament: any;
	export let onChange: (() => Promise<void> | void) | null = null;

	let bracket: any = null;
	let participants: any[] = [];
	let slots: Array<string | null> = [];
	let loading = true;
	let saving = false;
	let startNode: any = null;
	let startLevelId: number | null = null;
	let overrideNode: any = null;
	let overrideWinner = '';

	$: preStart = ['draft', 'registration_open', 'registration_closed', 'ready'].includes(
		tournament.status
	);
	$: activeParticipants = participants.filter((participant) => participant.status === 'active');
	$: assignmentValid =
		slots.filter(Boolean).length === activeParticipants.length
		&& new Set(slots.filter(Boolean)).size === activeParticipants.length
		&& activeParticipants.every((participant) => slots.includes(participant.uid));
	$: preview = bracket ? buildPreviewBracket(bracket, slots, activeParticipants) : null;

	async function load() {
		loading = true;

		try {
			[bracket, participants] = await Promise.all([
				tournamentFetch(`/${tournament.id}/bracket`),
				tournamentFetch(`/${tournament.id}/participants`)
			]);
			slots = [...(bracket.firstRoundSlots ?? [])];
		} catch (error: any) {
			toast.error(error.message);
		} finally {
			loading = false;
		}
	}

	function buildPreviewBracket(source: any, nextSlots: Array<string | null>, entries: any[]) {
		if (!preStart) {
			return source;
		}

		const next = structuredClone(source);
		const participantByUid = new Map(entries.map((entry) => [entry.uid, entry]));
		const firstRound = next.rounds[0]?.matches ?? [];

		for (const node of firstRound) {
			const player1Uid = nextSlots[node.position * 2] ?? null;
			const player2Uid = nextSlots[node.position * 2 + 1] ?? null;

			node.player1Uid = player1Uid;
			node.player2Uid = player2Uid;
			node.player1 = player1Uid ? participantByUid.get(player1Uid)?.player ?? null : null;
			node.player2 = player2Uid ? participantByUid.get(player2Uid)?.player ?? null : null;
			node.player1State = player1Uid ? 'player' : 'bye';
			node.player2State = player2Uid ? 'player' : 'bye';
			node.status = player1Uid && player2Uid ? 'pending' : 'completed';
			node.winnerUid = node.status === 'completed' ? player1Uid ?? player2Uid : null;
			node.winner = node.winnerUid
				? participantByUid.get(node.winnerUid)?.player ?? null
				: null;
			node.score1 = 0;
			node.score2 = 0;
		}

		for (let roundIndex = 1; roundIndex < next.rounds.length; roundIndex += 1) {
			const previous = next.rounds[roundIndex - 1].matches;

			for (const node of next.rounds[roundIndex].matches) {
				const left = previous[node.position * 2];
				const right = previous[node.position * 2 + 1];
				const player1Uid = left.status === 'completed' ? left.winnerUid : null;
				const player2Uid = right.status === 'completed' ? right.winnerUid : null;
				const sourcesComplete = left.status === 'completed' && right.status === 'completed';

				node.player1Uid = player1Uid;
				node.player2Uid = player2Uid;
				node.player1 = player1Uid ? participantByUid.get(player1Uid)?.player ?? null : null;
				node.player2 = player2Uid ? participantByUid.get(player2Uid)?.player ?? null : null;
				node.player1State = player1Uid
					? 'player'
					: left.status === 'completed' ? 'bye' : 'pending';
				node.player2State = player2Uid
					? 'player'
					: right.status === 'completed' ? 'bye' : 'pending';
				node.status = sourcesComplete
					? player1Uid && player2Uid ? 'pending' : 'completed'
					: 'waiting';
				node.winnerUid = node.status === 'completed' ? player1Uid ?? player2Uid : null;
				node.winner = node.winnerUid
					? participantByUid.get(node.winnerUid)?.player ?? null
					: null;
				node.score1 = 0;
				node.score2 = 0;
			}
		}

		const semifinals = next.rounds.at(-2)?.matches ?? [];
		const thirdPlace = next.thirdPlaceMatch;

		if (thirdPlace && semifinals.length === 2) {
			const loser = (node: any) => {
				if (node.status !== 'completed' || !node.winnerUid) {
					return null;
				}

				return node.winnerUid === node.player1Uid ? node.player2Uid : node.player1Uid;
			};
			const player1Uid = loser(semifinals[0]);
			const player2Uid = loser(semifinals[1]);
			const sourcesComplete =
				semifinals[0].status === 'completed' && semifinals[1].status === 'completed';

			thirdPlace.player1Uid = player1Uid;
			thirdPlace.player2Uid = player2Uid;
			thirdPlace.player1 = player1Uid
				? participantByUid.get(player1Uid)?.player ?? null
				: null;
			thirdPlace.player2 = player2Uid
				? participantByUid.get(player2Uid)?.player ?? null
				: null;
			thirdPlace.player1State = player1Uid
				? 'player'
				: semifinals[0].status === 'completed' ? 'bye' : 'pending';
			thirdPlace.player2State = player2Uid
				? 'player'
				: semifinals[1].status === 'completed' ? 'bye' : 'pending';
			thirdPlace.status = sourcesComplete
				? player1Uid && player2Uid ? 'pending' : 'completed'
				: 'waiting';
			thirdPlace.winnerUid =
				thirdPlace.status === 'completed' ? player1Uid ?? player2Uid : null;
			thirdPlace.winner = thirdPlace.winnerUid
				? participantByUid.get(thirdPlace.winnerUid)?.player ?? null
				: null;
			thirdPlace.score1 = 0;
			thirdPlace.score2 = 0;
		}

		next.champion = null;

		return next;
	}

	function autoFill() {
		slots = autoFillTournamentSlots(activeParticipants, Number(tournament.maxPlayers));
	}

	function changeSlot(position: number, slot: 1 | 2, uid: string | null) {
		slots = changeTournamentSlot(slots, position * 2 + slot - 1, uid);
	}

	async function saveBracket() {
		saving = true;

		try {
			bracket = await tournamentFetch(`/${tournament.id}/bracket`, {
				method: 'PUT',
				body: JSON.stringify({ slots })
			});
			slots = [...bracket.firstRoundSlots];
			await onChange?.();
			toast.success($_('tournament.bracket.saved'));
		} catch (error: any) {
			toast.error(error.message);
		} finally {
			saving = false;
		}
	}

	function openStart(node: any) {
		startNode = node;
		startLevelId = null;
	}

	async function startMatch() {
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
			await load();
		} catch (error: any) {
			toast.error(error.message);
		}
	}

	function openOverride(node: any) {
		overrideNode = node;
		overrideWinner = node.winnerUid ?? node.player1Uid;
	}

	async function submitOverride() {
		try {
			await tournamentFetch(`/${tournament.id}/matches/${overrideNode.id}/override`, {
				method: 'POST',
				body: JSON.stringify({ winnerUid: overrideWinner })
			});
			toast.success($_('tournament.bracket.override_success'));
			overrideNode = null;
			await load();
		} catch (error: any) {
			toast.error(error.message);
		}
	}

	onMount(load);
</script>

{#if loading}
  <p class="text-center text-muted-foreground">{$_('tournament.loading')}</p>
{:else if preview}
  {#if preStart}
    <div class="mb-[16px] flex flex-wrap items-center gap-[8px] rounded-[8px] border border-[hsl(var(--border))] p-[12px]">
      <Button size="sm" variant="outline" on:click={autoFill}>
        {$_('tournament.bracket.auto_fill')}
      </Button>
      <Button size="sm" on:click={saveBracket} disabled={saving || !assignmentValid}>
        {$_('tournament.bracket.save')}
      </Button>
      <p class="text-sm text-muted-foreground">
        {assignmentValid
          ? $_('tournament.bracket.assignment_ready')
          : $_('tournament.bracket.assignment_incomplete')}
      </p>
    </div>
  {/if}

  <Bracket
    rounds={preview.rounds}
    thirdPlaceMatch={preview.thirdPlaceMatch}
    champion={preview.champion}
    editable={preStart}
    participants={activeParticipants}
    showActions={tournament.status === 'ongoing' || tournament.status === 'finished'}
    onSlotChange={changeSlot}
    onStart={openStart}
    onOverride={openOverride}
  />
{/if}

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
        disabled={tournament.pvpFormat?.levelSelectionMode === 'manual' && !startLevelId}
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
      <Button on:click={submitOverride}>{$_('tournament.bracket.confirm')}</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
