<script lang="ts">
	import { onMount } from 'svelte';
	import { Loader2 } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';
	import { tournamentFetch } from '$lib/client/tournament';
	import MatchOverlayScore from '$lib/components/tournament/MatchOverlayScore.svelte';
	import { getTournamentMatchOverlaySides } from '$lib/utils/tournamentMatchOverlay';
	import PvpMatchPage from '../../../../../versus/matches/[id]/+page.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	const POLL_INTERVAL_MS = 3000;
	const PVP_OVERLAY_TOP_OFFSET = 150;

	let tournament: any = null;
	let bracket: any = null;
	let match: any = null;
	let loading = true;
	let refreshing = false;
	let errorMessage = '';
	let pollTimer: ReturnType<typeof setInterval> | null = null;

	$: games = Array.isArray(match?.games) ? [...match.games].sort(compareGames) : [];
	$: latestGame = games[0] ?? null;
	$: latestPvpMatchId = match?.currentPvpMatchId ?? latestGame?.pvpMatchId ?? null;
	$: orderedPlayerUids = match
		? getTournamentMatchOverlaySides(match)
			.map((side) => side.uid)
			.filter((uid): uid is string => Boolean(uid))
		: [];
	$: placeholderPvpMatch = createPlaceholderPvpMatch(tournament, match);

	function compareGames(a: any, b: any) {
		const gameIndexDifference = Number(b.gameIndex ?? 0) - Number(a.gameIndex ?? 0);

		return gameIndexDifference
			|| Number(b.pvpMatchId ?? 0) - Number(a.pvpMatchId ?? 0);
	}

	function findMatch(nextBracket: any) {
		const nodes = [
			...(nextBracket?.rounds ?? []).flatMap((round: any) => round.matches ?? []),
			...(nextBracket?.thirdPlaceMatch ? [nextBracket.thirdPlaceMatch] : [])
		];

		return nodes.find((node: any) =>
			String(node.id) === String(data.tournamentMatchId)
		) ?? null;
	}

	function createPlaceholderPvpMatch(sourceTournament: any, sourceMatch: any) {
		if (!sourceMatch || !sourceTournament) {
			return null;
		}

		const orderedSides = getTournamentMatchOverlaySides(sourceMatch);

		return {
			status: 'idle',
			mode: sourceTournament.pvpFormat?.mode ?? 'classic',
			ranked: false,
			level: null,
			tournamentMatchId: sourceMatch.id,
			viewerRole: 'spectator',
			participants: orderedSides.map((side, index) =>
				placeholderParticipant(side.uid, side.player, index + 1)
			)
		};
	}

	function placeholderParticipant(uid: unknown, player: any, slot: number) {
		return {
			uid: uid ? String(uid) : `pending-slot-${slot}`,
			name: player?.name ?? $_('tournament.bracket.pending_player'),
			player: player ?? null,
			progress: 0,
			deathCount: Array(100)
				.fill(0),
			timeReachedMs: 0
		};
	}

	async function refresh(options: { initial?: boolean; } = {}) {
		if (refreshing) {
			return;
		}

		refreshing = true;

		try {
			const [nextTournament, nextBracket] = await Promise.all([
				tournament ?? tournamentFetch(`/${data.tournamentId}`),
				tournamentFetch(`/${data.tournamentId}/bracket`)
			]);
			const nextMatch = findMatch(nextBracket);

			if (!nextMatch) {
				throw new Error($_('tournament.matches.overlay_not_found'));
			}

			tournament = nextTournament;
			bracket = nextBracket;
			match = nextMatch;
			errorMessage = '';
		} catch (error) {
			if (options.initial || !match) {
				errorMessage = error instanceof Error
					? error.message
					: $_('tournament.matches.overlay_load_failed');
			}
		} finally {
			loading = false;
			refreshing = false;
		}
	}

	onMount(() => {
		void refresh({ initial: true });
		pollTimer = setInterval(() => void refresh(), POLL_INTERVAL_MS);

		return () => {
			if (pollTimer) {
				clearInterval(pollTimer);
			}
		};
	});
</script>

<svelte:head>
  <title>{tournament?.name ?? $_('tournament.title')} · {$_('tournament.bracket.open_overlay')}</title>
</svelte:head>

<main class="tournament-match-overlay">
  {#if match && tournament}
    <MatchOverlayScore
      {tournament}
      {match}
      totalRounds={bracket?.rounds?.length ?? 0}
      gameIndex={latestGame ? Number(latestGame.gameIndex ?? 0) : null}
    />
  {/if}

  {#if latestPvpMatchId}
    <PvpMatchPage
      matchIdOverride={latestPvpMatchId}
      forceOverlay
      forceSpectator
      overlayTopOffset={PVP_OVERLAY_TOP_OFFSET}
      participantOrderUids={orderedPlayerUids}
    />
  {:else if placeholderPvpMatch}
    <PvpMatchPage
      matchIdOverride=""
      placeholderMatch={placeholderPvpMatch}
      forceOverlay
      forceSpectator
      overlayTopOffset={PVP_OVERLAY_TOP_OFFSET}
      participantOrderUids={orderedPlayerUids}
    />
  {:else}
    <section class="waiting-state">
      {#if loading}
        <Loader2 class="h-6 w-6 animate-spin" />
        <strong>{$_('tournament.loading')}</strong>
      {:else if errorMessage}
        <strong>{$_('tournament.matches.overlay_load_failed')}</strong>
        <p>{errorMessage}</p>
      {/if}
    </section>
  {/if}
</main>

<style>
.tournament-match-overlay {
  width: 100vw;
  min-height: 100vh;
  background: transparent;
}

.waiting-state {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 120px 20px 40px;
  color: hsl(var(--foreground));
  text-align: center;
}

.waiting-state strong {
  font-size: 18px;
}

.waiting-state p {
  max-width: 460px;
  color: hsl(var(--muted-foreground));
  font-size: 14px;
}

</style>
