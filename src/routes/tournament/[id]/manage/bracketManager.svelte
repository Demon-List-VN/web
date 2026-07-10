<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { tournamentFetch } from '$lib/client/tournament';
	import {
		autoFillTournamentSlots,
		changeTournamentSlot,
		seedTournamentSlotsByOrder
	} from '$lib/utils/tournamentBracket';
	import Bracket from '../bracket.svelte';
	import MatchActionDialogs from './matchActionDialogs.svelte';

	export let tournament: any;
	export let isManager = false;
	export let onChange: (() => Promise<void> | void) | null = null;

	let bracket: any = null;
	let participants: any[] = [];
	let slots: Array<string | null> = [];
	let loading = true;
	let saving = false;
	let importing = false;
	let contestTournamentId = '';
	let stagedLeaderboardEntries: any[] = [];
	let importedUids: string[] = [];
	let saveConfirmOpen = false;
	let matchActions: any;
	let bracketMode: 'setup' | 'matches' = [
		'draft',
		'registration_open',
		'registration_closed',
		'ready'
	].includes(tournament.status)
		? 'setup'
		: 'matches';

	$: preStart = ['draft', 'registration_open', 'registration_closed', 'ready'].includes(
		tournament.status
	);
	$: activeParticipants = participants.filter((participant) => participant.status === 'active');
	$: bracketParticipants = (() => {
		const entries = new Map<string, any>();

		for (const participant of participants) {
			if (participant.status === 'active' || participant.status === 'invited') {
				entries.set(participant.uid, participant);
			}
		}

		for (const entry of stagedLeaderboardEntries) {
			entries.set(entry.uid, { ...entries.get(entry.uid), ...entry });
		}

		return [...entries.values()];
	})();
	$: assignedUids = slots.filter((uid): uid is string => Boolean(uid));
	$: bracketParticipantUids = new Set(bracketParticipants.map((participant) => participant.uid));
	$: importedUidsToApply = importedUids.filter((uid) => slots.includes(uid));
	$: assignmentValid =
		assignedUids.length >= 2
		&& new Set(assignedUids).size === assignedUids.length
		&& assignedUids.every((uid) => bracketParticipantUids.has(uid))
		&& activeParticipants.every((participant) => assignedUids.includes(participant.uid));
	$: preview = bracket ? buildPreviewBracket(bracket, slots, bracketParticipants) : null;
	$: displayedBracket = bracketMode === 'setup' ? preview : bracket;

	async function load() {
		loading = true;

		try {
			[bracket, participants] = await Promise.all([
				tournamentFetch(`/${tournament.id}/bracket`),
				tournamentFetch(`/${tournament.id}/participants`)
			]);
			slots = [...(bracket.firstRoundSlots ?? [])];
			stagedLeaderboardEntries = [];
			importedUids = [];
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

	async function importContestLeaderboard() {
		const sourceId = Number(contestTournamentId);

		if (!Number.isInteger(sourceId) || sourceId <= 0) {
			toast.error($_('tournament.bracket.import_invalid_id'));

			return;
		}

		importing = true;

		try {
			const board = await tournamentFetch(`/${sourceId}/leaderboard`);
			const rankedEntries = (board?.entries ?? [])
				.filter((entry: any) => entry?.uid)
				.filter((entry: any, index: number, entries: any[]) =>
					entries.findIndex((candidate) => candidate.uid === entry.uid) === index);
			const existingByUid = new Map(
				participants.map((participant) => [participant.uid, participant])
			);
			const requiredActiveUids = new Set(
				activeParticipants.map((participant) => participant.uid)
			);
			const newPlayerLimit = Math.max(
				0,
				Number(tournament.maxPlayers) - activeParticipants.length
			);
			const selected: any[] = [];
			let selectedNewPlayers = 0;

			for (const entry of rankedEntries) {
				const isActive = requiredActiveUids.has(entry.uid);

				if (!isActive && selectedNewPlayers >= newPlayerLimit) {
					continue;
				}

				selected.push(entry);

				if (!isActive) {
					selectedNewPlayers += 1;
				}
			}

			const selectedUids = new Set(selected.map((entry) => entry.uid));

			for (const participant of activeParticipants) {
				if (!selectedUids.has(participant.uid)) {
					selected.push({
						uid: participant.uid,
						player: participant.player,
						rank: null
					});
				}
			}

			if (!selected.length) {
				throw new Error($_('tournament.bracket.import_empty'));
			}

			stagedLeaderboardEntries = selected.map((entry, index) => ({
				...(existingByUid.get(entry.uid) ?? {}),
				uid: entry.uid,
				player: entry.player ?? existingByUid.get(entry.uid)?.player ?? null,
				status: existingByUid.get(entry.uid)?.status ?? 'staged',
				contestSeed: Number(entry.rank) || index + 1
			}));
			importedUids = selected
				.filter((entry) => existingByUid.get(entry.uid)?.status !== 'active')
				.map((entry) => entry.uid);
			slots = seedTournamentSlotsByOrder(
				selected.map((entry) => entry.uid),
				Number(tournament.maxPlayers)
			);
			toast.success($_('tournament.bracket.import_staged', {
				values: { count: importedUids.length }
			}));
		} catch (error: any) {
			toast.error(error.message);
		} finally {
			importing = false;
		}
	}

	function changeSlot(position: number, slot: 1 | 2, uid: string | null) {
		slots = changeTournamentSlot(slots, position * 2 + slot - 1, uid);
	}

	function requestSaveBracket() {
		if (importedUidsToApply.length) {
			saveConfirmOpen = true;

			return;
		}

		saveBracket('invite');
	}

	async function saveBracket(importMode: 'invite' | 'force_add' = 'invite') {
		saveConfirmOpen = false;
		saving = true;

		try {
			bracket = await tournamentFetch(`/${tournament.id}/bracket`, {
				method: 'PUT',
				body: JSON.stringify({
					slots,
					importedUids: importedUidsToApply,
					importMode
				})
			});
			await load();
			await onChange?.();
			toast.success($_('tournament.bracket.saved'));
		} catch (error: any) {
			toast.error(error.message);
		} finally {
			saving = false;
		}
	}

	async function reloadMatches() {
		await load();
		await onChange?.();
	}

	onMount(load);
</script>

{#if loading}
  <p class="text-center text-muted-foreground">{$_('tournament.loading')}</p>
{:else if displayedBracket}
  <div class="mb-[16px] flex flex-wrap gap-[8px]">
    {#if preStart}
      <Button
        size="sm"
        variant={bracketMode === 'setup' ? 'default' : 'outline'}
        on:click={() => (bracketMode = 'setup')}
      >
        {$_('tournament.bracket.setup_mode')}
      </Button>
    {/if}
    <Button
      size="sm"
      variant={bracketMode === 'matches' ? 'default' : 'outline'}
      on:click={() => (bracketMode = 'matches')}
    >
      {$_('tournament.bracket.match_mode')}
    </Button>
  </div>

  {#if preStart && bracketMode === 'setup'}
    <div class="mb-[16px] flex flex-col gap-[12px] rounded-[10px] border border-[hsl(var(--border))] bg-card/40 p-[12px]">
      <div class="flex flex-col gap-[8px] sm:flex-row sm:items-center">
        <Input
          class="sm:max-w-[240px]"
          type="number"
          min="1"
          bind:value={contestTournamentId}
          placeholder={$_('tournament.bracket.import_contest_id')}
        />
        <Button size="sm" variant="outline" on:click={importContestLeaderboard} disabled={importing}>
          {importing
            ? $_('tournament.bracket.importing')
            : $_('tournament.bracket.import_leaderboard')}
        </Button>
        <p class="text-sm text-muted-foreground">
          {isManager
            ? $_('tournament.bracket.import_manager_notice')
            : $_('tournament.bracket.import_owner_notice')}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-[8px]">
        <Button size="sm" variant="outline" on:click={autoFill}>
          {$_('tournament.bracket.auto_fill')}
        </Button>
        <Button size="sm" on:click={requestSaveBracket} disabled={saving || !assignmentValid}>
          {$_('tournament.bracket.save')}
        </Button>
        <p class="text-sm text-muted-foreground">
          {assignmentValid
            ? $_('tournament.bracket.assignment_ready')
            : $_('tournament.bracket.assignment_incomplete')}
        </p>
      </div>
    </div>
  {/if}

  <Bracket
    rounds={displayedBracket.rounds}
    thirdPlaceMatch={displayedBracket.thirdPlaceMatch}
    champion={displayedBracket.champion}
    editable={preStart && bracketMode === 'setup'}
    participants={bracketParticipants}
    showActions={bracketMode === 'matches' && (tournament.status === 'ongoing' || tournament.status === 'finished')}
    onSlotChange={changeSlot}
    onStart={(node) => matchActions.openStart(node)}
    onOverride={(node) => matchActions.openOverride(node)}
  />
{/if}

<Dialog.Root bind:open={saveConfirmOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>{$_('tournament.bracket.import_save_title')}</Dialog.Title>
      <Dialog.Description>
        {isManager
          ? $_('tournament.bracket.import_manager_confirm', {
              values: { count: importedUidsToApply.length }
            })
          : $_('tournament.bracket.import_owner_confirm', {
              values: { count: importedUidsToApply.length }
            })}
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Button variant="outline" on:click={() => (saveConfirmOpen = false)} disabled={saving}>
        {$_('tournament.bracket.cancel')}
      </Button>
      {#if isManager}
        <Button variant="outline" on:click={() => saveBracket('force_add')} disabled={saving}>
          {$_('tournament.bracket.save_force_add')}
        </Button>
      {/if}
      <Button on:click={() => saveBracket('invite')} disabled={saving}>
        {$_('tournament.bracket.save_invite_all')}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<MatchActionDialogs bind:this={matchActions} {tournament} onChange={reloadMatches} />
