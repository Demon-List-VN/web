<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import Ads from '$lib/components/ads.svelte';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import PlayerSelector from '$lib/components/playerSelector.svelte';
	import MatchCard from '$lib/components/pvp/MatchCard.svelte';
	import { user } from '$lib/client';
	import supabase from '$lib/client/supabase';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import * as Alert from '$lib/components/ui/alert';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Tabs from '$lib/components/ui/tabs';
	import Chart from 'chart.js/auto';
	import {
		acceptPvpInvite,
		acceptPvpMatch,
		cancelPvpMatchmaking,
		checkPvpMatchmaking,
		declinePvpInvite,
		getPvpInviteExpiresMs,
		getPvpInvite,
		getPvpMatchAcceptanceExpiresMs,
		getPvpInviteId,
		getPvpMatchedMatchId,
		getPvpMatchId,
		getPvpMatch,
		getPvpMatches,
		getPvpLeaderboard,
		getPvpWeeklyRace,
		getPvpMatchStartMs,
		getPvpParticipantRatingAfter,
		getPvpParticipantRatingBefore,
		getPvpParticipantRatingDiff,
		getPvpMe,
		getPvpStatus,
		getPvpSelfParticipant,
		hasPvpParticipantAccepted,
		isActivePvpMatch,
		isPvpMatchConfirmedByBoth,
		isPvpMatchRanked,
		sendPvpInvite,
		startPvpMatchmaking,
		startPvpRating,
		type PvpInvite,
		type PvpLeaderboardPlayer,
		type PvpMatch,
		type PvpMatchmakingRequest,
		type PvpMe,
		type PvpWeeklyRace
	} from '$lib/client/pvp';
	import {
		setPvpRealtimeAuth,
		subscribeToPvpMatchActivity,
		subscribeToPvpMatchRows,
		subscribeToPvpLobby,
		type PvpRealtimeEvent
	} from '$lib/client/pvpRealtime';
	import { playPvpBell } from '$lib/client/pvpSound';
	import { onDestroy, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { _, locale } from 'svelte-i18n';
	import {
		ArrowRight,
		BellRing,
		CalendarDays,
		Clock,
		Loader2,
		LogIn,
		RefreshCw,
		Send,
		ShieldCheck,
		Swords,
		Trophy,
		UserCheck,
		Users,
		X
	} from 'lucide-svelte';

	const PVP_GEODE_ALERT_DISMISSED_KEY = 'gdvn:pvp-geode-alert-dismissed';
	const PVP_ANONYMOUS_MODE_KEY = 'gdvn:pvp-anonymous-mode';
	const PVP_HIDE_OPPONENT_INFO_KEY = 'gdvn:pvp-hide-opponent-info';
	const PVP_LAST_AUTO_REDIRECTED_MATCH_KEY = 'gdvn:pvp-last-auto-redirected-match-id';
	const REALTIME_COALESCE_MS = 200;
	const ELO_GRAPH_FILTERS = [
		{ key: '25', limit: 25 },
		{ key: '100', limit: 100 },
		{ key: 'all', limit: null }
	] as const;
	const STARTING_RATING_OPTIONS = [
		{ rating: 800 as const, key: 'beginner' },
		{ rating: 1500 as const, key: 'intermediate' },
		{ rating: 2500 as const, key: 'expert' }
	];

	let selectedPlayer: any = null;
	let anonymousMode = false;
	let hideOpponentInfo = false;
	let anonymousModeReady = false;
	let lobby: PvpMe = {
		activeMatch: null,
		matchmaking: null,
		incomingInvites: [],
		outgoingInvites: []
	};
	let matches: PvpMatch[] = [];
	let leaderboard: PvpLeaderboardPlayer[] = [];
	let weeklyRace: PvpWeeklyRace = {
		week: null,
		currentWeek: null,
		previousWeek: null,
		leaderboard: [],
		previousLeaderboard: []
	};
	let activePvpTab = 'lobby';
	let eloGraphFilter: (typeof ELO_GRAPH_FILTERS)[number]['key'] = '25';
	let loading = false;
	let leaderboardLoading = true;
	let leaderboardError = '';
	let weeklyRaceLoading = true;
	let weeklyRaceError = '';
	let actionLoading = '';
	let initializedForUid = '';
	let cleanupRealtime: (() => Promise<void>) | null = null;
	let cleanupActiveMatchRealtime: (() => Promise<void>) | null = null;
	let cleanupPendingConfirmRealtime: (() => Promise<void>) | null = null;
	let activeMatchRealtimeKey = '';
	let pendingConfirmRealtimeKey = '';
	let scheduledRealtimeTasks = new Map<string, ReturnType<typeof setTimeout>>();
	let now = Date.now();
	let ticker: ReturnType<typeof setInterval> | null = null;
	let routedMatchId: number | string | null = null;
	let announcedMatchIds = new Set<string>();
	let endedMatchBellIds = new Set<string>();
	let matchDialogOpen = false;
	let ratingDialogOpen = false;
	let showGeodeAlert = true;
	let lobbyReady = false;
	let pendingDialogTimeout: ReturnType<typeof setTimeout> | null = null;
	let pendingExpirationCheckMatchId: string | null = null;
	let keydownHandler: ((e: KeyboardEvent) => void) | null = null;
	let matchmakingCheckTimer: ReturnType<typeof setInterval> | null = null;

	$: currentUid = $user.data?.uid;
	$: activeMatch =
		lobby.activeMatch && isActivePvpMatch(lobby.activeMatch) ? lobby.activeMatch : null;
	$: pendingMatch = activeMatch && getPvpStatus(activeMatch) === 'pending' ? activeMatch : null;
	$: pendingMatchId = getPvpMatchId(pendingMatch);
	$: pendingSelfAccepted = hasPvpParticipantAccepted(
		getPvpSelfParticipant(pendingMatch, currentUid)
	);
	$: queueStatus = getPvpStatus(lobby.matchmaking, 'idle');
	$: isSearching = queueStatus === 'searching';
	$: pvpRating = lobby.rating?.pvpRating ?? lobby.pvpRating ?? null;
	$: pvpRatedMatchCount = lobby.rating?.pvpRatedMatchCount ?? lobby.pvpRatedMatchCount ?? 0;
	$: pvpRatingInitialized = Boolean(
		lobby.rating?.pvpRatingInitialized ?? lobby.pvpRatingInitialized ?? pvpRating !== null
	);
	$: selectedEloFilter =
		ELO_GRAPH_FILTERS.find((filter) => filter.key === eloGraphFilter) ?? ELO_GRAPH_FILTERS[0];
	$: eloGraphPoints = getEloGraphPoints(matches, currentUid, selectedEloFilter.limit);
	$: eloGraphChartData = getEloGraphChartData(eloGraphPoints);
	$: eloGraphStart = eloGraphPoints[0]?.rating ?? pvpRating ?? null;
	$: eloGraphEnd = eloGraphPoints[eloGraphPoints.length - 1]?.rating ?? pvpRating ?? null;
	$: eloGraphDelta =
		eloGraphStart !== null && eloGraphEnd !== null ? Math.round(eloGraphEnd - eloGraphStart) : null;
	$: eloGraphMatchCount = Math.max(0, eloGraphPoints.length - 1);
	$: leaderboardMatchesNeeded = Math.max(0, 50 - Number(pvpRatedMatchCount || 0));
	$: hasRecentLeaderboardMatch = hasRecentRatedPvpMatch(matches);
	$: showLeaderboardMatchCountNotice = pvpRatedMatchCount >= 5 && pvpRatedMatchCount < 50;
	$: showLeaderboardActivityNotice = pvpRatedMatchCount >= 50 && !hasRecentLeaderboardMatch;
	$: currentSearchRange =
		lobby.matchmaking?.currentSearchRange ?? lobby.matchmaking?.current_search_range ?? null;
	$: queueStartedAt =
		lobby.matchmaking?.searchStartedAt ??
		lobby.matchmaking?.search_started_at ??
		lobby.matchmaking?.created_at;
	$: queueElapsedMs = getElapsedMs(queueStartedAt, now);
	$: showSlowSearchAlert = isSearching && queueElapsedMs >= 90 * 1000;
	$: weeklyRaceEndsAt = getWeeklyRaceWeekEndMs(weeklyRace.week);
	$: weeklyRaceRange = formatWeeklyRaceRange(weeklyRace.week);
	$: weeklyRaceResetCountdown = remainingLongLabel(weeklyRaceEndsAt, now);
	$: previousWeeklyRaceRange = formatWeeklyRaceRange(weeklyRace.previousWeek);
	$: incomingPending = lobby.incomingInvites.filter((invite) => getPvpStatus(invite) === 'pending');
	$: outgoingVisible = lobby.outgoingInvites.filter((invite) => getPvpStatus(invite) === 'pending');
	$: checkingLobby = $user.checked && $user.loggedIn && !lobbyReady;
	$: shouldForceStartingRating =
		$user.checked && $user.loggedIn && lobbyReady && !pvpRatingInitialized;
	$: controlsDisabled = Boolean(
		checkingLobby || !pvpRatingInitialized || activeMatch || isSearching || actionLoading
	);
	$: updateActiveMatchRealtime($user.loggedIn, getLobbyRealtimeMatchIds());
	$: updatePendingConfirmRealtime($user.loggedIn, pendingMatchId);
	$: updateMatchmakingCheckPolling($user.loggedIn, isSearching);
	$: autoRedirectToActiveMatch(activeMatch);

	$: if ($user.checked && $user.loggedIn && currentUid && initializedForUid !== currentUid) {
		initializeRealtime(currentUid);
	}

	$: if ($user.checked && !$user.loggedIn) {
		lobby = {
			activeMatch: null,
			matchmaking: null,
			incomingInvites: [],
			outgoingInvites: []
		};
		matches = [];
		initializedForUid = '';
		lobbyReady = false;
		routedMatchId = null;
	}

	onMount(() => {
		showGeodeAlert = localStorage.getItem(PVP_GEODE_ALERT_DISMISSED_KEY) !== 'true';
		anonymousMode = localStorage.getItem(PVP_ANONYMOUS_MODE_KEY) === 'true';
		hideOpponentInfo = localStorage.getItem(PVP_HIDE_OPPONENT_INFO_KEY) === 'true';
		anonymousModeReady = true;

		ticker = setInterval(() => {
			now = Date.now();
		}, 1000);

		keydownHandler = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && (pendingMatch || shouldForceStartingRating)) {
				e.preventDefault();
				e.stopPropagation();
			}
		};

		window.addEventListener('keydown', keydownHandler);
		refreshLeaderboard();
		refreshWeeklyRace();
	});

	$: if (anonymousModeReady) {
		localStorage.setItem(PVP_ANONYMOUS_MODE_KEY, String(anonymousMode));
		localStorage.setItem(PVP_HIDE_OPPONENT_INFO_KEY, String(hideOpponentInfo));
	}

	onDestroy(() => {
		if (ticker) clearInterval(ticker);
		cleanupRealtime?.();
		cleanupActiveMatchRealtime?.();
		cleanupPendingConfirmRealtime?.();
		clearScheduledRealtimeTasks();
		clearMatchmakingCheckPolling();
		if (keydownHandler) window.removeEventListener('keydown', keydownHandler);
		if (pendingDialogTimeout) clearTimeout(pendingDialogTimeout);
	});

	async function initializeRealtime(uid: string) {
		initializedForUid = uid;
		lobbyReady = false;
		cleanupRealtime?.();

		try {
			const token = await $user.token();
			setPvpRealtimeAuth(token);
			await Promise.all([refreshLobby(), refreshMatchHistory()]);
			lobbyReady = true;

			cleanupRealtime = subscribeToPvpLobby(uid, handleLobbyRealtimeEvent);
		} catch (error) {
			lobbyReady = true;
			toast.error(error instanceof Error ? error.message : $_('pvp.toast.load_failed'));
		}
	}

	async function refreshLobby() {
		if (!$user.loggedIn) return;

		loading = true;
		try {
			const previousActiveMatch = lobby.activeMatch;
			const nextLobby = await getPvpMe(await $user.token());
			handleLobbyMatchSounds(previousActiveMatch, nextLobby.activeMatch);
			lobby = nextLobby;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('pvp.toast.load_failed'));
		} finally {
			loading = false;
		}
	}

	async function refreshMatchHistory() {
		if (!$user.loggedIn) return;

		try {
			matches = await getPvpMatches(await $user.token());
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('pvp.toast.load_failed'));
		}
	}

	async function refreshLeaderboard() {
		leaderboardLoading = true;
		leaderboardError = '';

		try {
			leaderboard = await getPvpLeaderboard(50);
		} catch (error) {
			leaderboard = [];
			leaderboardError = error instanceof Error ? error.message : $_('pvp.toast.leaderboard_failed');
		} finally {
			leaderboardLoading = false;
		}
	}

	async function refreshWeeklyRace() {
		weeklyRaceLoading = true;
		weeklyRaceError = '';

		try {
			weeklyRace = await getPvpWeeklyRace('current', 50);
		} catch (error) {
			weeklyRace = {
				week: null,
				currentWeek: null,
				previousWeek: null,
				leaderboard: [],
				previousLeaderboard: []
			};
			weeklyRaceError =
				error instanceof Error ? error.message : $_('pvp.toast.weekly_race_failed');
		} finally {
			weeklyRaceLoading = false;
		}
	}

	function scheduleRealtimeTask(key: string, task: () => Promise<void>) {
		const existing = scheduledRealtimeTasks.get(key);
		if (existing) clearTimeout(existing);

		const timeout = setTimeout(async () => {
			scheduledRealtimeTasks.delete(key);
			try {
				await task();
			} catch (error) {
				toast.error(error instanceof Error ? error.message : $_('pvp.toast.load_failed'));
			}
		}, REALTIME_COALESCE_MS);

		scheduledRealtimeTasks.set(key, timeout);
	}

	function clearScheduledRealtimeTasks() {
		for (const timeout of scheduledRealtimeTasks.values()) {
			clearTimeout(timeout);
		}
		scheduledRealtimeTasks.clear();
	}

	function realtimeRow(event: PvpRealtimeEvent) {
		return event.payload?.new ?? event.payload?.old ?? {};
	}

	function handleLobbyRealtimeEvent(event: PvpRealtimeEvent) {
		const row = realtimeRow(event);

		if (event.scope === 'matchmaking') {
			applyMatchmaking(row);
			const matchId = row?.matchId ?? row?.match?.id ?? row?.match?.matchId;
			if (matchId) scheduleFetchMatch(matchId);
			return;
		}

		if (event.scope === 'incomingInvite' || event.scope === 'outgoingInvite') {
			const inviteId = row?.id ?? row?.inviteId;
			if (inviteId) scheduleFetchInvite(inviteId, event.scope);
			return;
		}

		if (event.scope === 'participant' || event.scope === 'result') {
			if (row?.matchId) scheduleFetchMatch(row.matchId);
			return;
		}

		if (event.scope === 'match') {
			const matchId = row?.id ?? row?.matchId;
			if (matchId) scheduleFetchMatch(matchId);
		}
	}

	function handlePendingConfirmRealtimeEvent(event: PvpRealtimeEvent) {
		const row = realtimeRow(event);
		const matchId = row?.id ?? row?.matchId;
		if (!matchId) return;

		if (getPvpStatus(row, '') === 'in_progress') {
			matchDialogOpen = false;
			redirectToMatchId(matchId);
			return;
		}

		scheduleFetchMatch(matchId);
	}

	function scheduleFetchMatch(matchId: number | string) {
		scheduleRealtimeTask(`match:${matchId}`, async () => {
			const nextMatch = await getPvpMatch(await $user.token(), matchId);
			applyMatch(nextMatch);
		});
	}

	function scheduleFetchInvite(
		inviteId: number | string,
		scope: 'incomingInvite' | 'outgoingInvite'
	) {
		scheduleRealtimeTask(`invite:${inviteId}`, async () => {
			const invite = await getPvpInvite(await $user.token(), inviteId);
			applyInvite(invite, scope);
		});
	}

	function applyMatchmaking(nextMatchmaking: PvpMatchmakingRequest | null | undefined) {
		const status = getPvpStatus(nextMatchmaking, 'idle');
		const matchmaking = ['searching', 'matched'].includes(status)
			? (nextMatchmaking ?? null)
			: null;
		lobby = { ...lobby, matchmaking };
	}

	function applyMatch(nextMatch: PvpMatch | null | undefined) {
		if (!nextMatch) return;

		const matchId = getPvpMatchId(nextMatch);
		if (!matchId) return;

		const previousActiveMatch = lobby.activeMatch;
		const currentActiveId = getPvpMatchId(lobby.activeMatch);
		const nextActiveMatch =
			isActivePvpMatch(nextMatch) || String(currentActiveId) === String(matchId)
				? isActivePvpMatch(nextMatch)
					? nextMatch
					: null
				: lobby.activeMatch;

		lobby = {
			...lobby,
			activeMatch: nextActiveMatch,
			matchmaking:
				String(lobby.matchmaking?.matchId) === String(matchId)
					? {
							...lobby.matchmaking,
							match: isActivePvpMatch(nextMatch) ? nextMatch : null
						}
					: lobby.matchmaking,
			incomingInvites: updateInviteMatches(lobby.incomingInvites, nextMatch),
			outgoingInvites: updateInviteMatches(lobby.outgoingInvites, nextMatch)
		};
		handleLobbyMatchSounds(previousActiveMatch, lobby.activeMatch);
		if (nextActiveMatch && isPvpMatchConfirmedByBoth(nextActiveMatch)) {
			matchDialogOpen = false;
			autoRedirectToActiveMatch(nextActiveMatch);
		}
		if (getPvpStatus(nextMatch, '') === 'completed' && isPvpMatchRanked(nextMatch)) {
			upsertMatchHistory(nextMatch);
			void refreshWeeklyRace();
		}
	}

	function upsertMatchHistory(nextMatch: PvpMatch) {
		const matchId = getPvpMatchId(nextMatch);
		if (!matchId) return;

		const existingIndex = matches.findIndex(
			(match) => String(getPvpMatchId(match)) === String(matchId)
		);
		const nextMatches =
			existingIndex >= 0
				? matches.map((match, index) => (index === existingIndex ? nextMatch : match))
				: [nextMatch, ...matches];

		matches = sortMatches(nextMatches);
	}

	function sortMatches(items: PvpMatch[]) {
		return [...items].sort((a, b) => getMatchSortMs(b) - getMatchSortMs(a));
	}

	function getMatchSortMs(match: PvpMatch) {
		const fallbackMs = new Date(
			match.endedAt ?? match.endAt ?? match.endsAt ?? match.created_at ?? 0
		).getTime();

		return getPvpMatchStartMs(match) ?? (Number.isFinite(fallbackMs) ? fallbackMs : 0);
	}

	function getRatedMatchActivityMs(match: PvpMatch) {
		const ms = new Date(
			match.ratingAppliedAt ??
				match.rating_applied_at ??
				match.endedAt ??
				match.endAt ??
				match.endsAt ??
				match.created_at ??
				0
		).getTime();

		return Number.isFinite(ms) ? ms : 0;
	}

	function hasRecentRatedPvpMatch(sourceMatches: PvpMatch[]) {
		const activeSince = Date.now() - 7 * 24 * 60 * 60 * 1000;

		return sourceMatches.some(
			(match) =>
				getPvpStatus(match, '') === 'completed' &&
				isPvpMatchRanked(match) &&
				getRatedMatchActivityMs(match) >= activeSince
		);
	}

	function updateInviteMatches(invites: PvpInvite[], nextMatch: PvpMatch) {
		const matchId = getPvpMatchId(nextMatch);
		if (!matchId) return invites;

		return invites
			.map((invite) =>
				String(invite.matchId) === String(matchId)
					? { ...invite, match: isActivePvpMatch(nextMatch) ? nextMatch : null }
					: invite
			)
			.filter(
				(invite) => !(getPvpStatus(invite) === 'accepted' && invite.matchId && !invite.match)
			);
	}

	function applyInvite(
		invite: PvpInvite | null,
		fallbackScope: 'incomingInvite' | 'outgoingInvite'
	) {
		if (!invite) return;

		const direction =
			invite.inviteeUid === currentUid
				? 'incomingInvite'
				: invite.inviterUid === currentUid
					? 'outgoingInvite'
					: fallbackScope;
		lobby =
			direction === 'incomingInvite'
				? { ...lobby, incomingInvites: upsertInvite(lobby.incomingInvites, invite) }
				: { ...lobby, outgoingInvites: upsertInvite(lobby.outgoingInvites, invite) };

		if (invite.match) {
			applyMatch(invite.match);
		}
	}

	function upsertInvite(invites: PvpInvite[], invite: PvpInvite) {
		const inviteId = getPvpInviteId(invite);
		if (!inviteId) return invites;

		const shouldHideAcceptedFinished =
			getPvpStatus(invite) === 'accepted' && invite.matchId && !invite.match;
		if (shouldHideAcceptedFinished) {
			return invites.filter((item) => String(getPvpInviteId(item)) !== String(inviteId));
		}

		const next = invites.filter((item) => String(getPvpInviteId(item)) !== String(inviteId));
		return [invite, ...next].slice(0, 20);
	}

	function removeInvite(inviteId: number | string) {
		const matchesId = (invite: PvpInvite) => String(getPvpInviteId(invite)) === String(inviteId);
		lobby = {
			...lobby,
			incomingInvites: lobby.incomingInvites.filter((invite) => !matchesId(invite)),
			outgoingInvites: lobby.outgoingInvites.filter((invite) => !matchesId(invite))
		};
	}

	function getLobbyRealtimeMatchIds() {
		return [
			getPvpMatchId(lobby.activeMatch),
			getPvpMatchedMatchId(lobby.matchmaking),
			...lobby.incomingInvites.map((invite) => invite.matchId),
			...lobby.outgoingInvites.map((invite) => invite.matchId)
		].filter(Boolean) as Array<number | string>;
	}

	function updateActiveMatchRealtime(loggedIn: boolean, matchIds: Array<number | string>) {
		const key = loggedIn ? [...new Set(matchIds.map(String))].sort().join(',') : '';
		if (key === activeMatchRealtimeKey) return;

		cleanupActiveMatchRealtime?.();
		cleanupActiveMatchRealtime = null;
		activeMatchRealtimeKey = key;

		if (!loggedIn || !key) return;

		cleanupActiveMatchRealtime = subscribeToPvpMatchActivity(
			matchIds,
			handleLobbyRealtimeEvent,
			`pvp-lobby-active-matches-${currentUid}`
		);
	}

	function updatePendingConfirmRealtime(
		loggedIn: boolean,
		matchId: number | string | null
	) {
		const key = loggedIn && currentUid && matchId ? String(matchId) : '';
		if (key === pendingConfirmRealtimeKey) return;

		cleanupPendingConfirmRealtime?.();
		cleanupPendingConfirmRealtime = null;
		pendingConfirmRealtimeKey = key;

		if (!key) return;

		cleanupPendingConfirmRealtime = subscribeToPvpMatchRows(
			[matchId],
			handlePendingConfirmRealtimeEvent,
			`pvp-pending-confirm-${currentUid}`
		);
	}

	function updateMatchmakingCheckPolling(loggedIn: boolean, searching: boolean) {
		if (!browser) return;

		if (!loggedIn || !searching) {
			clearMatchmakingCheckPolling();
			return;
		}

		if (matchmakingCheckTimer) return;

		matchmakingCheckTimer = setInterval(checkMatchmaking, 15_000);
	}

	function clearMatchmakingCheckPolling() {
		if (!matchmakingCheckTimer) return;
		clearInterval(matchmakingCheckTimer);
		matchmakingCheckTimer = null;
	}

	function applyMatchmakingResponse(response: PvpMatchmakingRequest | PvpMe) {
		if ('activeMatch' in response || 'incomingInvites' in response) {
			const nextLobby = response as PvpMe;
			handleLobbyMatchSounds(lobby.activeMatch, nextLobby.activeMatch);
			lobby = nextLobby;
			return;
		}

		const matchmaking = response as PvpMatchmakingRequest;
		applyMatchmaking(matchmaking);
		if (matchmaking.match) {
			applyMatch(matchmaking.match);
		}
	}

	async function checkMatchmaking() {
		if (!$user.loggedIn || !isSearching) return;

		try {
			const response = await checkPvpMatchmaking(await $user.token());
			applyMatchmakingResponse(response);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : $_('pvp.toast.matchmaking_check_failed');
			if (!message.includes('No active matchmaking request')) {
				toast.error(message);
			}
		}
	}

	function handleLobbyMatchSounds(
		previousMatch: PvpMe['activeMatch'],
		nextMatch: PvpMe['activeMatch']
	) {
		const nextId = getPvpMatchId(nextMatch);
		const nextStatus = getPvpStatus(nextMatch, '');

		if (nextId && nextStatus === 'pending' && !announcedMatchIds.has(String(nextId))) {
			announcedMatchIds.add(String(nextId));
			playPvpBell();
		}

		const previousId = getPvpMatchId(previousMatch);
		const previousStatus = getPvpStatus(previousMatch, '');
		const previousWasInProgress = previousStatus === 'in_progress';
		const nextStillActive = Boolean(nextMatch && isActivePvpMatch(nextMatch));

		// Play end bell only if the previous match was actually in-progress (not just pending acceptance)
		if (
			previousId &&
			previousWasInProgress &&
			!nextStillActive &&
			!endedMatchBellIds.has(String(previousId))
		) {
			endedMatchBellIds.add(String(previousId));
			playPvpBell();
		}
	}

	function autoRedirectToActiveMatch(match: PvpMatch | null) {
		const matchId = getPvpMatchId(match);
		if (
			!browser ||
			!currentUid ||
			!matchId ||
			!match ||
			!isActivePvpMatch(match) ||
			!isPvpMatchConfirmedByBoth(match)
		)
			return;

		redirectToMatchId(matchId);
	}

	function redirectToMatchId(matchId: number | string | null) {
		if (!browser || !currentUid || !matchId) return;

		const matchKey = String(matchId);
		const redirectKey = `confirmed:${matchKey}`;
		if (routedMatchId !== null && String(routedMatchId) === matchKey) return;

		if (localStorage.getItem(PVP_LAST_AUTO_REDIRECTED_MATCH_KEY) === redirectKey) return;

		localStorage.setItem(PVP_LAST_AUTO_REDIRECTED_MATCH_KEY, redirectKey);
		routedMatchId = matchId;
		goto(`/pvp/matches/${matchId}`);
	}

	// Control dialog open state and auto-close when acceptance expires
	$: if (pendingMatch) {
		if (!matchDialogOpen) matchDialogOpen = true;
		const expires = getPvpMatchAcceptanceExpiresMs(pendingMatch);
		if (expires) {
			if (pendingDialogTimeout) clearTimeout(pendingDialogTimeout);
			const matchId = pendingMatchId;
			const delay = Math.max(0, expires - Date.now());
			pendingDialogTimeout = setTimeout(() => {
				if (matchId) void handlePendingMatchExpired(matchId);
				pendingDialogTimeout = null;
			}, delay);
		}
	} else {
		matchDialogOpen = false;
		if (pendingDialogTimeout) {
			clearTimeout(pendingDialogTimeout);
			pendingDialogTimeout = null;
		}
	}

	async function handlePendingMatchExpired(matchId: number | string) {
		if (!$user.loggedIn) return;

		const matchKey = String(matchId);
		if (pendingExpirationCheckMatchId === matchKey) return;
		pendingExpirationCheckMatchId = matchKey;

		const wasMatchmakingMatch = String(getPvpMatchedMatchId(lobby.matchmaking)) === matchKey;

		try {
			const token = await $user.token();
			const latestMatch = await getPvpMatch(token, matchId);
			applyMatch(latestMatch);

			if (isPvpMatchConfirmedByBoth(latestMatch)) {
				autoRedirectToActiveMatch(latestMatch);
				return;
			}

			matchDialogOpen = false;

			if (wasMatchmakingMatch) {
				lobby = {
					...lobby,
					activeMatch:
						String(getPvpMatchId(lobby.activeMatch)) === matchKey ? null : lobby.activeMatch,
					matchmaking:
						String(getPvpMatchedMatchId(lobby.matchmaking)) === matchKey ? null : lobby.matchmaking
				};

				const response = await startPvpMatchmaking(token, anonymousMode);
				applyMatchmakingResponse(response);
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('pvp.toast.load_failed'));
			await refreshLobby();
		} finally {
			if (pendingExpirationCheckMatchId === matchKey) {
				pendingExpirationCheckMatchId = null;
			}
		}
	}

	$: if (shouldForceStartingRating && !ratingDialogOpen) {
		ratingDialogOpen = true;
	}

	$: if (!shouldForceStartingRating && ratingDialogOpen) {
		ratingDialogOpen = false;
	}

	function navigateToMatch(matchId: number | string | null) {
		if (!matchId || (routedMatchId !== null && String(routedMatchId) === String(matchId))) return;
		routedMatchId = matchId;
		goto(`/pvp/matches/${matchId}`);
	}

	async function signIn() {
		await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				queryParams: {
					access_type: 'offline',
					prompt: 'consent'
				},
				redirectTo: window.location.origin
			}
		});
	}

	async function chooseStartingRating(startingRating: 800 | 1500 | 2500) {
		actionLoading = `start-rating-${startingRating}`;
		try {
			const rating = await startPvpRating(await $user.token(), startingRating);
			lobby = {
				...lobby,
				rating,
				pvpRating: rating.pvpRating ?? null,
				pvpRatedMatchCount: rating.pvpRatedMatchCount ?? 0,
				pvpRatingInitialized: true
			};
			toast.success($_('pvp.toast.starting_rating_saved'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('pvp.toast.starting_rating_failed'));
		} finally {
			actionLoading = '';
		}
	}

	async function startQueue() {
		if (!pvpRatingInitialized) {
			toast.error($_('pvp.toast.select_starting_rating'));
			return;
		}

		actionLoading = 'matchmaking';
		try {
			const response = await startPvpMatchmaking(await $user.token(), anonymousMode);
			applyMatchmakingResponse(response);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('pvp.toast.matchmaking_failed'));
		} finally {
			actionLoading = '';
		}
	}

	async function cancelQueue() {
		actionLoading = 'cancel-matchmaking';
		try {
			const response = await cancelPvpMatchmaking(await $user.token());
			applyMatchmaking(response);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('pvp.toast.cancel_failed'));
		} finally {
			actionLoading = '';
		}
	}

	async function invitePlayer() {
		if (!pvpRatingInitialized) {
			toast.error($_('pvp.toast.select_starting_rating'));
			return;
		}

		if (!selectedPlayer?.uid) {
			toast.error($_('pvp.toast.select_player'));
			return;
		}

		if (selectedPlayer.uid === currentUid) {
			toast.error($_('pvp.toast.self_invite'));
			return;
		}

		actionLoading = 'invite';
		try {
			const invite = await sendPvpInvite(await $user.token(), {
				inviteeUid: selectedPlayer.uid,
				anonymous: anonymousMode
			});
			selectedPlayer = null;
			applyInvite(invite, 'outgoingInvite');
			toast.success($_('pvp.toast.invite_sent'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('pvp.toast.invite_failed'));
		} finally {
			actionLoading = '';
		}
	}

	async function acceptInvite(invite: PvpInvite) {
		const inviteId = getPvpInviteId(invite);
		if (!inviteId) return;
		if (!pvpRatingInitialized) {
			toast.error($_('pvp.toast.select_starting_rating'));
			return;
		}

		actionLoading = `accept-${inviteId}`;
		try {
			const response = await acceptPvpInvite(await $user.token(), inviteId, anonymousMode);
			removeInvite(inviteId);
			applyMatch(response as PvpMatch);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('pvp.toast.accept_failed'));
		} finally {
			actionLoading = '';
		}
	}

	async function acceptPendingMatch() {
		if (!pendingMatchId) return;

		actionLoading = `accept-match-${pendingMatchId}`;
		try {
			const response = await acceptPvpMatch(await $user.token(), pendingMatchId);
			applyMatch(response);
			if (isPvpMatchConfirmedByBoth(response)) {
				matchDialogOpen = false;
				autoRedirectToActiveMatch(response);
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('pvp.toast.accept_match_failed'));
		} finally {
			actionLoading = '';
		}
	}

	async function declineInvite(invite: PvpInvite) {
		const inviteId = getPvpInviteId(invite);
		if (!inviteId) return;

		actionLoading = `decline-${inviteId}`;
		try {
			const invite = await declinePvpInvite(await $user.token(), inviteId);
			applyInvite(invite, 'incomingInvite');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('pvp.toast.decline_failed'));
		} finally {
			actionLoading = '';
		}
	}

	function statusLabel(value: unknown) {
		const status = String(value || 'pending');
		return $_(`pvp.status.${status}`);
	}

	function inviteName(invite: PvpInvite, direction: 'incoming' | 'outgoing') {
		if (inviteAnonymous(invite, direction)) return $_('pvp.anonymous_player');

		const player =
			direction === 'incoming'
				? (invite.inviter ?? invite.fromPlayer)
				: (invite.invitee ?? invite.toPlayer);

		return (
			player?.name || player?.uid || (direction === 'incoming' ? invite.from : invite.to) || '--'
		);
	}

	function inviteAnonymous(invite: PvpInvite, direction: 'incoming' | 'outgoing') {
		return direction === 'incoming'
			? Boolean(invite.inviterAnonymous)
			: Boolean(invite.inviteeAnonymous);
	}

	function remainingLabel(targetMs: number | null, currentNow: number) {
		if (!targetMs) return '--:--';

		const totalSeconds = Math.max(0, Math.floor((targetMs - currentNow) / 1000));
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;

		return `${minutes}:${String(seconds).padStart(2, '0')}`;
	}

	function remainingLongLabel(targetMs: number | null, currentNow: number) {
		if (!targetMs) return '--';

		const totalMinutes = Math.max(0, Math.floor((targetMs - currentNow) / 60_000));
		const days = Math.floor(totalMinutes / (24 * 60));
		const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
		const minutes = totalMinutes % 60;

		if (days > 0) return `${days}d ${hours}h`;
		if (hours > 0) return `${hours}h ${minutes}m`;
		return `${minutes}m`;
	}

	function getWeeklyRaceWeekEndMs(week: PvpWeeklyRace['week']) {
		const value = week?.weekEndAt ?? week?.week_end_at;
		if (!value) return null;

		const ms = new Date(value).getTime();
		return Number.isFinite(ms) ? ms : null;
	}

	function formatWeeklyRaceRange(week: PvpWeeklyRace['week']) {
		const start = week?.weekStartAt ?? week?.week_start_at;
		const end = week?.weekEndAt ?? week?.week_end_at;
		if (!start || !end) return '--';

		return `${formatWeeklyRaceDate(start)} - ${formatWeeklyRaceDate(
			new Date(new Date(end).getTime() - 1).toISOString()
		)}`;
	}

	function formatWeeklyRaceDate(value: string) {
		const date = new Date(value);
		if (!Number.isFinite(date.getTime())) return '--';

		return new Intl.DateTimeFormat($locale || 'en', {
			month: 'short',
			day: 'numeric',
			timeZone: 'Asia/Ho_Chi_Minh'
		}).format(date);
	}

	function weeklyRacePlayer(row: PvpWeeklyRace['leaderboard'][number]) {
		return row.player ?? row.players ?? { uid: row.uid, name: row.uid };
	}

	function elapsedLabel(startValue: unknown, currentNow: number) {
		const totalSeconds = Math.max(0, Math.floor(getElapsedMs(startValue, currentNow) / 1000));
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;

		return `${minutes}:${String(seconds).padStart(2, '0')}`;
	}

	function getElapsedMs(startValue: unknown, currentNow: number) {
		if (!startValue) return 0;

		const startMs = new Date(String(startValue)).getTime();
		if (!Number.isFinite(startMs)) return 0;

		return Math.max(0, currentNow - startMs);
	}

	function dismissGeodeAlert() {
		showGeodeAlert = false;
		localStorage.setItem(PVP_GEODE_ALERT_DISMISSED_KEY, 'true');
	}

	type EloGraphPoint = {
		index: number;
		rating: number;
		diff: number | null;
	};

	type EloGraphChartData = {
		labels: string[];
		ratings: number[];
		diffs: Array<number | null>;
		min: number;
		max: number;
	};

	function getEloGraphPoints(
		sourceMatches: PvpMatch[],
		uid: string | null | undefined,
		limit: number | null
	): EloGraphPoint[] {
		if (!uid) return [];

		const ratedMatches = sortMatches(sourceMatches)
			.filter((match) => getPvpStatus(match, '') === 'completed' && isPvpMatchRanked(match))
			.reverse()
			.map((match) => getPvpSelfParticipant(match, uid))
			.filter(Boolean)
			.map((participant) => ({
				before: getPvpParticipantRatingBefore(participant),
				after: getPvpParticipantRatingAfter(participant),
				diff: getPvpParticipantRatingDiff(participant)
			}))
			.filter((point) => point.after !== null);

		const visibleMatches = limit ? ratedMatches.slice(-limit) : ratedMatches;
		if (visibleMatches.length === 0) return [];

		const firstBefore = visibleMatches[0].before;
		const rawRatings = [
			firstBefore ?? visibleMatches[0].after,
			...visibleMatches.map((point) => point.after)
		].filter((rating): rating is number => rating !== null);

		return rawRatings.map((rating, index) => {
			const diff = index === 0 ? null : (visibleMatches[index - 1]?.diff ?? null);
			return {
				index,
				rating,
				diff
			};
		});
	}

	function getRatingBounds(ratings: number[]) {
		const minRating = Math.min(...ratings);
		const maxRating = Math.max(...ratings);
		const padding = Math.max(20, Math.round((maxRating - minRating) * 0.15));

		return {
			min: Math.floor(minRating - padding),
			max: Math.ceil(maxRating + padding)
		};
	}

	function getEloGraphChartData(points: EloGraphPoint[]): EloGraphChartData {
		const ratings = points.map((point) => Math.round(point.rating));
		const bounds = ratings.length ? getRatingBounds(ratings) : { min: 0, max: 0 };

		return {
			labels: points.map((point) =>
				point.index === 0 ? $_('pvp.elo_graph.start') : String(point.index)
			),
			ratings,
			diffs: points.map((point) => (point.diff === null ? null : Math.round(point.diff))),
			min: bounds.min,
			max: bounds.max
		};
	}

	function eloDeltaLabel(value: number | null) {
		if (value === null) return '--';
		return `${value > 0 ? '+' : ''}${value}`;
	}

	function chartColor(cssVariable: string, fallback: string) {
		if (!browser) return fallback;
		const value = getComputedStyle(document.documentElement).getPropertyValue(cssVariable).trim();
		return value ? `hsl(${value})` : fallback;
	}

	function chartAlphaColor(cssVariable: string, alpha: number, fallback: string) {
		if (!browser) return fallback;
		const value = getComputedStyle(document.documentElement).getPropertyValue(cssVariable).trim();
		return value ? `hsl(${value} / ${alpha})` : fallback;
	}

	function createEloChart(node: HTMLCanvasElement, data: EloGraphChartData) {
		let chart: Chart<'line', number[], string> | null = buildEloChart(node, data);

		return {
			update(nextData: EloGraphChartData) {
				if (!chart) {
					chart = buildEloChart(node, nextData);
					return;
				}

				chart.data.labels = nextData.labels;
				chart.data.datasets[0].data = nextData.ratings;
				chart.data.datasets[0].pointRadius = getEloPointRadii(nextData.ratings);
				chart.options.scales!.y!.min = nextData.min;
				chart.options.scales!.y!.max = nextData.max;
				chart.options.plugins!.tooltip!.callbacks!.label = getEloTooltipLabel(nextData);
				chart.update();
			},
			destroy() {
				chart?.destroy();
				chart = null;
			}
		};
	}

	function buildEloChart(node: HTMLCanvasElement, data: EloGraphChartData) {
		return new Chart(node, {
			type: 'line',
			data: {
				labels: data.labels,
				datasets: [
					{
						label: $_('pvp.pvp_rating'),
						data: data.ratings,
						borderColor: chartColor('--primary', '#2563eb'),
						backgroundColor: chartAlphaColor('--primary', 0.12, 'rgba(37, 99, 235, 0.12)'),
						borderWidth: 2,
						fill: true,
						tension: 0,
						pointBackgroundColor: chartColor('--background', '#ffffff'),
						pointBorderColor: chartColor('--primary', '#2563eb'),
						pointBorderWidth: 2,
						pointRadius: getEloPointRadii(data.ratings),
						pointHoverRadius: 6
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				animation: false,
				interaction: {
					mode: 'index',
					intersect: false
				},
				scales: {
					x: {
						grid: {
							display: false
						},
						ticks: {
							color: chartColor('--muted-foreground', '#71717a'),
							maxRotation: 0,
							autoSkip: true,
							maxTicksLimit: 6
						}
					},
					y: {
						min: data.min,
						max: data.max,
						border: {
							display: false
						},
						grid: {
							color: chartAlphaColor('--border', 0.85, 'rgba(161, 161, 170, 0.4)')
						},
						ticks: {
							color: chartColor('--muted-foreground', '#71717a'),
							precision: 0
						}
					}
				},
				plugins: {
					legend: {
						display: false
					},
					tooltip: {
						callbacks: {
							title: (context) => {
								const index = context[0]?.dataIndex ?? 0;
								return index === 0 ? $_('pvp.elo_graph.start') : `${$_('pvp.match')} ${index}`;
							},
							label: getEloTooltipLabel(data)
						}
					}
				}
			}
		});
	}

	function getEloPointRadii(ratings: number[]) {
		return ratings.map((_, index) => (index === ratings.length - 1 ? 4 : 3));
	}

	function getEloTooltipLabel(data: EloGraphChartData) {
		return (context: { dataIndex: number; parsed: { y: number } }) => {
			const diff = data.diffs[context.dataIndex];
			const rating = context.parsed.y;

			if (diff === null || diff === undefined) return `${$_('pvp.pvp_rating')}: ${rating}`;
			return [`${$_('pvp.pvp_rating')}: ${rating}`, eloDeltaLabel(diff)];
		};
	}
</script>

<svelte:head>
	<title>{$_('pvp.lobby_title')} - {$_('head.site_name')}</title>
</svelte:head>

<main class="arena-page">
	{#if showGeodeAlert}
		<Alert.Root
			class="relative mb-3 border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/40"
		>
			<Alert.Title class="pr-8">{$_('pvp.geode_alert.title')}</Alert.Title>
			<Alert.Description class="pr-8">
				{$_('pvp.geode_alert.description')}
				<a
					href="https://github.com/NamPE286/DemonListVN-geode-mod/releases"
					target="_blank"
					rel="noopener noreferrer"
					class="ml-1 font-semibold underline"
				>
					{$_('pvp.geode_alert.release_page')}
				</a>
			</Alert.Description>
			<button
				type="button"
				class="pvp-alert-dismiss"
				on:click={dismissGeodeAlert}
				aria-label={$_('pvp.geode_alert.dismiss')}
			>
				<X class="h-4 w-4" />
			</button>
		</Alert.Root>
	{/if}

	{#if activeMatch}
		<div class="pvp-top-alert">
			<div class="pvp-top-alert-inner">
				<strong>{$_('pvp.active_match')}</strong>
				<a class="inline-link" href={`/pvp/matches/${getPvpMatchId(activeMatch)}`}
					>{$_('pvp.enter_match')}</a
				>
			</div>
		</div>
	{/if}

	<section class="arena-topbar">
		<div>
			<div class="eyebrow">
				<Swords class="h-4 w-4" />
				<span>{$_('pvp.arena')}</span>
			</div>
			<h1>{$_('pvp.lobby_title')}</h1>
		</div>
		<a class="topbar-link" href="/pvp/matches">
			{$_('pvp.matches_title')}
			<ArrowRight class="h-4 w-4" />
		</a>
	</section>

	<div class="pvp-ad-slot">
		<Ads dataAdFormat="auto" />
	</div>

	<Tabs.Root bind:value={activePvpTab}>
		<Tabs.List class="pvp-tab-list py-[20px]" aria-label={$_('pvp.tabs.label')}>
			<Tabs.Trigger value="lobby" class="pvp-tab-trigger">
				<Swords class="h-4 w-4" />
				{$_('pvp.tabs.lobby')}
			</Tabs.Trigger>
			<Tabs.Trigger value="weekly-race" class="pvp-tab-trigger">
				<CalendarDays class="h-4 w-4" />
				{$_('pvp.tabs.weekly_race')}
			</Tabs.Trigger>
			<Tabs.Trigger value="leaderboard" class="pvp-tab-trigger">
				<Trophy class="h-4 w-4" />
				{$_('pvp.tabs.leaderboard')}
			</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="weekly-race">
			<section class="leaderboard-section">
				<Card.Root>
					<Card.Header>
						<div class="section-heading inside">
							<div>
								<Card.Title class="leaderboard-title">
									<CalendarDays class="h-5 w-5" />
									{$_('pvp.weekly_race.title')}
								</Card.Title>
								<Card.Description>{$_('pvp.weekly_race.description')}</Card.Description>
							</div>
							<Button
								variant="ghost"
								size="icon"
								disabled={weeklyRaceLoading}
								on:click={refreshWeeklyRace}
								aria-label={$_('pvp.refresh')}
							>
								<RefreshCw class={`h-4 w-4 ${weeklyRaceLoading ? 'animate-spin' : ''}`} />
							</Button>
						</div>
					</Card.Header>
					<Card.Content>
						<div class="weekly-race-meta">
							<div>
								<span>{$_('pvp.weekly_race.current_week')}</span>
								<strong>{weeklyRaceRange}</strong>
							</div>
							<div>
								<span>{$_('pvp.weekly_race.reset_in')}</span>
								<strong>{weeklyRaceResetCountdown}</strong>
							</div>
						</div>

						{#if weeklyRaceLoading}
							<div class="leaderboard-skeleton" aria-label={$_('general.loading')}>
								<div></div>
								<div></div>
								<div></div>
							</div>
						{:else if weeklyRaceError}
							<div class="empty-state">{weeklyRaceError}</div>
						{:else if weeklyRace.leaderboard.length === 0}
							<div class="empty-state">{$_('pvp.weekly_race.empty')}</div>
						{:else}
							<div class="leaderboard-table" role="table" aria-label={$_('pvp.weekly_race.title')}>
								<div class="leaderboard-row weekly-race-row leaderboard-head" role="row">
									<span role="columnheader">{$_('pvp.leaderboard.rank')}</span>
									<span role="columnheader">{$_('pvp.leaderboard.player')}</span>
									<span role="columnheader">{$_('pvp.weekly_race.points')}</span>
									<span role="columnheader">{$_('pvp.weekly_race.wins')}</span>
								</div>
								{#each weeklyRace.leaderboard as row}
									{@const player = weeklyRacePlayer(row)}
									<div class="leaderboard-row weekly-race-row" role="row">
										<span class="leaderboard-rank" role="cell">#{row.rank}</span>
										<span class="leaderboard-player" role="cell">
											<PlayerLink {player} showAvatar truncate={28} />
										</span>
										<span class="leaderboard-rating" role="cell">{row.points}</span>
										<span role="cell">{row.wins}</span>
									</div>
								{/each}
							</div>
						{/if}

						{#if !weeklyRaceLoading && weeklyRace.previousWeek}
							<div class="weekly-race-history">
								<div class="section-heading inside">
									<div>
										<strong>{$_('pvp.weekly_race.history_title')}</strong>
										<span>{previousWeeklyRaceRange}</span>
									</div>
								</div>
								{#if weeklyRace.previousLeaderboard.length === 0}
									<div class="empty-state compact">{$_('pvp.weekly_race.history_empty')}</div>
								{:else}
									<div class="weekly-race-history-list">
										{#each weeklyRace.previousLeaderboard.slice(0, 3) as row}
											{@const player = weeklyRacePlayer(row)}
											<div>
												<span class="leaderboard-rank">#{row.rank}</span>
												<PlayerLink {player} showAvatar truncate={24} />
												<strong>{row.points}</strong>
											</div>
										{/each}
									</div>
								{/if}
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</section>
		</Tabs.Content>

		<Tabs.Content value="leaderboard">
			<section class="leaderboard-section">
				<Card.Root>
					<Card.Header>
						<div class="section-heading inside">
							<div>
								<Card.Title class="leaderboard-title">
									<Trophy class="h-5 w-5" />
									{$_('pvp.leaderboard.title')}
								</Card.Title>
								<Card.Description>{$_('pvp.leaderboard.description')}</Card.Description>
							</div>
							<Button
								variant="ghost"
								size="icon"
								disabled={leaderboardLoading}
								on:click={refreshLeaderboard}
								aria-label={$_('pvp.refresh')}
							>
								<RefreshCw class={`h-4 w-4 ${leaderboardLoading ? 'animate-spin' : ''}`} />
							</Button>
						</div>
					</Card.Header>
					<Card.Content>
						{#if leaderboardLoading}
							<div class="leaderboard-skeleton" aria-label={$_('general.loading')}>
								<div></div>
								<div></div>
								<div></div>
							</div>
						{:else if leaderboardError}
							<div class="empty-state">{leaderboardError}</div>
						{:else if leaderboard.length === 0}
							<div class="empty-state">{$_('pvp.leaderboard.empty')}</div>
						{:else}
							<div class="leaderboard-table" role="table" aria-label={$_('pvp.leaderboard.title')}>
								<div class="leaderboard-row leaderboard-head" role="row">
									<span role="columnheader">{$_('pvp.leaderboard.rank')}</span>
									<span role="columnheader">{$_('pvp.leaderboard.player')}</span>
									<span role="columnheader">{$_('pvp.leaderboard.rating')}</span>
									<span role="columnheader">{$_('pvp.leaderboard.matches')}</span>
								</div>
								{#each leaderboard as player}
									<div class="leaderboard-row" role="row">
										<span class="leaderboard-rank" role="cell">#{player.rank}</span>
										<span class="leaderboard-player" role="cell">
											<PlayerLink {player} showAvatar truncate={28} />
										</span>
										<span class="leaderboard-rating" role="cell">{player.pvpRating}</span>
										<span role="cell">{player.pvpRatedMatchCount}</span>
									</div>
								{/each}
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</section>
		</Tabs.Content>

		<Tabs.Content value="lobby">

	<Dialog.Root
		bind:open={matchDialogOpen}
		on:openChange={(e) => {
			if (e?.detail === false && pendingMatch) {
				matchDialogOpen = true;
			}
		}}
	>
		<Dialog.Content class="sm:max-w-[440px]">
			<Dialog.Header>
				<div class="match-found-icon">
					<BellRing class="h-5 w-5" />
				</div>
				<Dialog.Title>{$_('pvp.match_found_title')}</Dialog.Title>
				<Dialog.Description>
					{$_('pvp.match_found_hint')}
				</Dialog.Description>
			</Dialog.Header>

			<div class="match-found-body">
				<div class="match-found-row">
					<span>{$_('pvp.match_type')}</span>
					<strong>{$_('pvp.ranked')}</strong>
				</div>
				<div class="match-found-row">
					<span>{$_('pvp.acceptance_timer')}</span>
					<strong>{remainingLabel(getPvpMatchAcceptanceExpiresMs(pendingMatch), now)}</strong>
				</div>
			</div>

			<Dialog.Footer>
				{#if pendingSelfAccepted}
					<Button disabled class="w-full">
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						{$_('pvp.waiting_for_acceptance')}
					</Button>
				{:else}
					<Button class="w-full" disabled={Boolean(actionLoading)} on:click={acceptPendingMatch}>
						{#if actionLoading === `accept-match-${pendingMatchId}`}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						{:else}
							<UserCheck class="mr-2 h-4 w-4" />
						{/if}
						{$_('pvp.accept_match')}
					</Button>
				{/if}
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>

	<Dialog.Root
		bind:open={ratingDialogOpen}
		on:openChange={(e) => {
			if (e?.detail === false && shouldForceStartingRating) {
				ratingDialogOpen = true;
			}
		}}
	>
		<Dialog.Content showClose={false} class="sm:max-w-[520px]">
			<Dialog.Header>
				<div class="match-found-icon">
					<ShieldCheck class="h-5 w-5" />
				</div>
				<Dialog.Title>{$_('pvp.pvp_rating')}</Dialog.Title>
				<Dialog.Description>
					{$_('pvp.starting_rating_hint')}
				</Dialog.Description>
			</Dialog.Header>

			<div class="starting-rating-grid">
				{#each STARTING_RATING_OPTIONS as option}
					<Button
						variant="outline"
						disabled={Boolean(actionLoading || checkingLobby)}
						on:click={() => chooseStartingRating(option.rating)}
					>
						{#if actionLoading === `start-rating-${option.rating}`}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						{/if}
						<span>{$_(`pvp.starting_rating.${option.key}`)}</span>
						<strong>{option.rating}</strong>
					</Button>
				{/each}
			</div>
		</Dialog.Content>
	</Dialog.Root>

	{#if !$user.checked}
		<Card.Root class="state-panel">
			<Card.Content class="state-content">
				<Loader2 class="h-5 w-5 animate-spin" />
				<span>{$_('general.loading')}</span>
			</Card.Content>
		</Card.Root>
	{:else if !$user.loggedIn}
		<Card.Root class="state-panel">
			<Card.Content class="auth-content">
				<div>
					<h2>{$_('pvp.sign_in_title')}</h2>
					<p>{$_('pvp.sign_in_hint')}</p>
				</div>
				<Button on:click={signIn}>
					<LogIn class="mr-2 h-4 w-4" />
					{$_('nav.sign_in')}
				</Button>
			</Card.Content>
		</Card.Root>
	{:else}
		{#if activeMatch}
			<section class="active-section">
				<div class="section-heading">
					<h2>{$_('pvp.active_match')}</h2>
					<a href={`/pvp/matches/${getPvpMatchId(activeMatch)}`}>{$_('pvp.enter_match')}</a>
				</div>
				<MatchCard
					match={activeMatch}
					{currentUid}
					{now}
					{hideOpponentInfo}
					href={`/pvp/matches/${getPvpMatchId(activeMatch)}`}
				/>
			</section>
		{/if}

		{#if pvpRatingInitialized}
			<section class="rating-start-section">
				<Card.Root>
					<Card.Header>
						<Card.Title>{$_('pvp.pvp_rating')}</Card.Title>
						<Card.Description>
							{$_('pvp.pvp_rating_summary', {
								values: {
									rating: pvpRating,
									count: pvpRatedMatchCount
								}
							})}
						</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="rating-summary">
							<ShieldCheck class="h-5 w-5" />
							<strong>{pvpRating}</strong>
							<span>
								{pvpRatedMatchCount < 5
									? $_('pvp.provisional_matches_left', {
											values: {
												count: Math.max(0, 5 - Number(pvpRatedMatchCount || 0))
											}
										})
									: $_('pvp.rating_established')}
							</span>
						</div>
						<div class="elo-graph-panel">
							<div class="elo-graph-toolbar">
								<div>
									<strong>{$_('pvp.elo_graph.title')}</strong>
									<span>
										{$_('pvp.elo_graph.summary', {
											values: {
												count: eloGraphMatchCount,
												delta: eloDeltaLabel(eloGraphDelta)
											}
										})}
									</span>
								</div>
								<Tabs.Root bind:value={eloGraphFilter}>
									<Tabs.List class="elo-filter-group" aria-label={$_('pvp.elo_graph.filter')}>
										{#each ELO_GRAPH_FILTERS as filter}
											<Tabs.Trigger value={filter.key} class="elo-filter-trigger">
												{$_(`pvp.elo_graph.filters.${filter.key}`)}
											</Tabs.Trigger>
										{/each}
									</Tabs.List>
								</Tabs.Root>
							</div>
							{#if showLeaderboardMatchCountNotice}
								<div class="leaderboard-requirement-notice">
									{$_('pvp.leaderboard.need_more_matches', {
										values: { count: leaderboardMatchesNeeded }
									})}
								</div>
							{:else if showLeaderboardActivityNotice}
								<div class="leaderboard-requirement-notice">
									{$_('pvp.leaderboard.need_recent_match')}
								</div>
							{/if}
							{#if eloGraphPoints.length > 1}
								<div class="elo-chart-wrapper">
									<canvas
										use:createEloChart={eloGraphChartData}
										aria-label={$_('pvp.elo_graph.title')}
									/>
								</div>
							{:else}
								<div class="elo-graph-empty">{$_('pvp.elo_graph.empty')}</div>
							{/if}
						</div>
					</Card.Content>
				</Card.Root>
			</section>
		{/if}

		<section class="control-grid">
			<Card.Root>
				<Card.Header>
					<Card.Title>{$_('pvp.options')}</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="anonymous-row">
						<div>
							<strong>{$_('pvp.anonymous_mode')}</strong>
							<span>{$_('pvp.anonymous_mode_hint')}</span>
						</div>
						<Switch
							id="pvp-anonymous-mode"
							bind:checked={anonymousMode}
							disabled={Boolean(actionLoading || activeMatch || isSearching)}
							aria-label={$_('pvp.anonymous_mode')}
						/>
					</div>
					<div class="anonymous-row">
						<div>
							<strong>{$_('pvp.hide_opponent_info')}</strong>
							<span>{$_('pvp.hide_opponent_info_hint')}</span>
						</div>
						<Switch
							id="pvp-hide-opponent-info"
							bind:checked={hideOpponentInfo}
							aria-label={$_('pvp.hide_opponent_info')}
						/>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>{$_('pvp.matchmaking')}</Card.Title>
					<Card.Description>
						{activeMatch
							? $_('pvp.active_match')
							: isSearching
								? $_('pvp.searching_state')
								: $_('pvp.queue_state_idle')}
					</Card.Description>
				</Card.Header>
				<Card.Content class="action-panel">
					{#if checkingLobby}
						<div class="matchmaking-skeleton" aria-label={$_('general.loading')}>
							<div></div>
							<div></div>
							<div></div>
						</div>
					{:else if activeMatch}
						<Button on:click={() => navigateToMatch(getPvpMatchId(activeMatch))}>
							<Swords class="mr-2 h-4 w-4" />
							{$_('pvp.rejoin_ongoing_match')}
						</Button>
					{:else if isSearching}
						<div class="queue-status">
							<Badge>{statusLabel(queueStatus)}</Badge>
							<span>
								<Clock class="h-4 w-4" />
								{elapsedLabel(queueStartedAt, now)}
							</span>
							{#if currentSearchRange !== null}
								<span>
									{$_('pvp.search_range', {
										values: { range: currentSearchRange }
									})}
								</span>
							{/if}
						</div>
						{#if showSlowSearchAlert}
							<div class="queue-hint">
								{$_('pvp.search_slow_hint')}
							</div>
						{/if}
						<Button variant="outline" disabled={Boolean(actionLoading)} on:click={cancelQueue}>
							{#if actionLoading === 'cancel-matchmaking'}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							{/if}
							{$_('pvp.cancel_search')}
						</Button>
					{:else}
						<Button disabled={controlsDisabled} on:click={startQueue}>
							{#if actionLoading === 'matchmaking'}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							{:else}
								<Users class="mr-2 h-4 w-4" />
							{/if}
							{$_('pvp.start_matchmaking')}
						</Button>
					{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>{$_('pvp.invite_player')}</Card.Title>
					<Card.Description>{$_('pvp.invite_state')}</Card.Description>
				</Card.Header>
				<Card.Content class="invite-form">
					<PlayerSelector
						bind:value={selectedPlayer}
						disabled={controlsDisabled}
						placeholder={$_('pvp.search_player')}
					/>
					<Button disabled={controlsDisabled || !selectedPlayer} on:click={invitePlayer}>
						{#if actionLoading === 'invite'}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						{:else}
							<Send class="mr-2 h-4 w-4" />
						{/if}
						{$_('pvp.send_invite')}
					</Button>
				</Card.Content>
			</Card.Root>
		</section>

		<section class="invite-grid">
			<Card.Root>
				<Card.Header>
					<Card.Title>{$_('pvp.incoming_invites')}</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if incomingPending.length === 0}
						<div class="empty-state">{$_('pvp.no_incoming_invites')}</div>
					{:else}
						<div class="invite-list">
							{#each incomingPending as invite}
								<div class="invite-row">
									<div>
										<strong>{inviteName(invite, 'incoming')}</strong>
										<span>{$_('pvp.unranked')}</span>
									</div>
									<div class="invite-actions">
										<span class="timer">{remainingLabel(getPvpInviteExpiresMs(invite), now)}</span>
										<Button
											size="sm"
											disabled={Boolean(actionLoading || !pvpRatingInitialized)}
											on:click={() => acceptInvite(invite)}
										>
											{#if actionLoading === `accept-${getPvpInviteId(invite)}`}
												<Loader2 class="mr-2 h-4 w-4 animate-spin" />
											{:else}
												<UserCheck class="mr-2 h-4 w-4" />
											{/if}
											{$_('general.accept')}
										</Button>
										<Button
											size="sm"
											variant="outline"
											disabled={Boolean(actionLoading)}
											on:click={() => declineInvite(invite)}
										>
											{$_('general.reject')}
										</Button>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<div class="section-heading inside">
						<Card.Title>{$_('pvp.outgoing_invites')}</Card.Title>
						<Button
							variant="ghost"
							size="icon"
							disabled={loading}
							on:click={refreshLobby}
							aria-label={$_('pvp.refresh')}
						>
							<RefreshCw class={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
						</Button>
					</div>
				</Card.Header>
				<Card.Content>
					{#if outgoingVisible.length === 0}
						<div class="empty-state">{$_('pvp.no_outgoing_invites')}</div>
					{:else}
						<div class="invite-list">
							{#each outgoingVisible as invite}
								<div class="invite-row">
									<div>
										<strong>{inviteName(invite, 'outgoing')}</strong>
										<span>{$_('pvp.unranked')}</span>
									</div>
									<div class="invite-actions">
										<Badge variant={getPvpStatus(invite) === 'pending' ? 'default' : 'secondary'}>
											{statusLabel(getPvpStatus(invite))}
										</Badge>
										{#if getPvpStatus(invite) === 'pending'}
											<span class="timer">{remainingLabel(getPvpInviteExpiresMs(invite), now)}</span
											>
										{/if}
										{#if getPvpMatchedMatchId(invite)}
											<a class="inline-link" href={`/pvp/matches/${getPvpMatchedMatchId(invite)}`}>
												{$_('pvp.view_match')}
											</a>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</section>
	{/if}
		</Tabs.Content>
	</Tabs.Root>
</main>

<style>
	.arena-page {
		width: min(1120px, calc(100vw - 32px));
		margin: 0 auto;
		padding: 36px 0 64px;
	}

	.arena-topbar,
	:global(.auth-content),
	.section-heading,
	.queue-status,
	.invite-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}

	.arena-topbar {
		margin-bottom: 24px;
	}

	h1 {
		margin: 4px 0 0;
		font-size: clamp(2rem, 4vw, 3.25rem);
		font-weight: 800;
		letter-spacing: 0;
	}

	.eyebrow,
	.topbar-link,
	.inline-link,
	.queue-status span {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}

	.eyebrow {
		color: hsl(var(--muted-foreground));
		font-size: 14px;
		font-weight: 700;
		text-transform: uppercase;
	}

	.match-found-icon {
		display: inline-flex;
		width: 40px;
		height: 40px;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		background: hsl(var(--primary) / 0.12);
		color: hsl(var(--primary));
	}

	.match-found-body {
		display: grid;
		gap: 10px;
		margin: 18px 0;
	}

	.match-found-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 14px;
		border-radius: 8px;
		background: hsl(var(--muted) / 0.55);
		padding: 10px 12px;
		font-size: 14px;
	}

	.match-found-row span {
		color: hsl(var(--muted-foreground));
	}

	.topbar-link,
	.inline-link,
	.section-heading a {
		border-radius: 6px;
		color: hsl(var(--primary));
		font-weight: 700;
		text-decoration: none;
	}

	.topbar-link:hover,
	.inline-link:hover,
	.section-heading a:hover {
		text-decoration: underline;
	}

	:global(.state-panel),
	.active-section,
	.rating-start-section,
	.leaderboard-section,
	.pvp-ad-slot {
		margin-bottom: 20px;
	}

	.pvp-ad-slot {
		min-height: 90px;
	}

	:global(.state-content) {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		min-height: 160px;
	}

	:global(.pvp-tab-list) {
		display: inline-flex;
		width: auto;
		height: auto;
		margin-bottom: 20px;
		gap: 4px;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		background: hsl(var(--muted) / 0.28);
		padding: 4px;
	}

	:global(.pvp-tab-trigger) {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 36px;
		padding-inline: 14px;
	}

	:global(.auth-content) h2 {
		margin: 0 0 6px;
		font-size: 1.35rem;
		font-weight: 750;
	}

	:global(.auth-content) p {
		margin: 0;
		color: hsl(var(--muted-foreground));
	}

	.control-grid {
		display: grid;
		grid-template-columns: 1.2fr 1fr 1fr;
		gap: 16px;
		align-items: stretch;
	}

	.invite-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
		margin-top: 16px;
	}

	.starting-rating-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
	}

	.starting-rating-grid :global(button) {
		display: flex;
		min-height: 78px;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.starting-rating-grid strong {
		font-size: 1.2rem;
	}

	.rating-summary {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
		color: hsl(var(--muted-foreground));
	}

	.rating-summary strong {
		color: hsl(var(--foreground));
		font-size: 1.4rem;
	}

	:global(.leaderboard-title) {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}

	.leaderboard-table {
		display: grid;
		overflow: hidden;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
	}

	.leaderboard-row {
		display: grid;
		grid-template-columns: 80px minmax(0, 1fr) 110px 120px;
		align-items: center;
		gap: 12px;
		min-height: 50px;
		border-top: 1px solid hsl(var(--border));
		padding: 10px 14px;
	}

	.leaderboard-row:first-child {
		border-top: 0;
	}

	.leaderboard-head {
		min-height: 38px;
		background: hsl(var(--muted) / 0.35);
		color: hsl(var(--muted-foreground));
		font-size: 12px;
		font-weight: 750;
		text-transform: uppercase;
	}

	.leaderboard-rank {
		color: hsl(var(--muted-foreground));
		font-weight: 750;
	}

	.leaderboard-player {
		min-width: 0;
	}

	.leaderboard-rating {
		color: hsl(var(--foreground));
		font-size: 1rem;
		font-weight: 750;
	}

	.weekly-race-meta {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
		margin-bottom: 16px;
	}

	.weekly-race-meta > div {
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		padding: 12px 14px;
	}

	.weekly-race-meta span,
	.weekly-race-history span {
		display: block;
		color: hsl(var(--muted-foreground));
		font-size: 13px;
	}

	.weekly-race-meta strong {
		display: block;
		margin-top: 4px;
		font-size: 1rem;
	}

	.weekly-race-history {
		display: grid;
		gap: 12px;
		margin-top: 18px;
		border-top: 1px solid hsl(var(--border));
		padding-top: 16px;
	}

	.weekly-race-history-list {
		display: grid;
		gap: 8px;
	}

	.weekly-race-history-list > div {
		display: grid;
		grid-template-columns: 56px minmax(0, 1fr) 56px;
		align-items: center;
		gap: 10px;
		min-height: 42px;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		padding: 8px 10px;
	}

	.weekly-race-history-list strong {
		text-align: right;
	}

	.leaderboard-skeleton {
		display: grid;
		gap: 10px;
	}

	.leaderboard-skeleton div {
		height: 50px;
		border-radius: 8px;
		background: linear-gradient(
			90deg,
			hsl(var(--muted) / 0.45),
			hsl(var(--muted) / 0.22),
			hsl(var(--muted) / 0.45)
		);
		background-size: 200% 100%;
		animation: pvp-skeleton 1.2s ease-in-out infinite;
	}

	.leaderboard-requirement-notice {
		border: 1px solid hsl(var(--primary) / 0.25);
		border-radius: 8px;
		background: hsl(var(--primary) / 0.08);
		padding: 10px 12px;
		color: hsl(var(--foreground));
		font-size: 13px;
		font-weight: 650;
		line-height: 1.4;
	}

	.elo-graph-panel {
		display: grid;
		gap: 12px;
		margin-top: 18px;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		padding: 14px;
	}

	.elo-graph-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 14px;
	}

	.elo-graph-toolbar strong,
	.elo-graph-toolbar span {
		display: block;
	}

	.elo-graph-toolbar strong {
		font-size: 14px;
	}

	.elo-graph-toolbar span {
		margin-top: 3px;
		color: hsl(var(--muted-foreground));
		font-size: 13px;
	}

	:global(.elo-filter-group) {
		display: inline-grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		height: auto;
		min-width: 220px;
		overflow: hidden;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		background: hsl(var(--muted) / 0.28);
		padding: 3px;
	}

	:global(.elo-filter-trigger) {
		min-height: 32px;
		padding-inline: 10px;
	}

	.elo-chart-wrapper {
		width: 100%;
		height: 190px;
		min-height: 190px;
	}

	.elo-graph-empty {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 150px;
		border: 1px dashed hsl(var(--border));
		border-radius: 8px;
		color: hsl(var(--muted-foreground));
		font-size: 13px;
		text-align: center;
	}

	.anonymous-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 14px;
		margin-top: 12px;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		padding: 12px;
	}

	.anonymous-row strong,
	.anonymous-row span {
		display: block;
	}

	.anonymous-row strong {
		font-size: 14px;
	}

	.anonymous-row span {
		margin-top: 3px;
		color: hsl(var(--muted-foreground));
		font-size: 13px;
		line-height: 1.35;
	}

	:global(.action-panel),
	:global(.invite-form) {
		display: grid;
		gap: 12px;
	}

	.queue-status {
		min-height: 40px;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		padding: 10px 12px;
	}

	.queue-hint {
		border: 1px solid hsl(var(--primary) / 0.28);
		border-radius: 8px;
		background: hsl(var(--primary) / 0.08);
		padding: 10px 12px;
		color: hsl(var(--foreground));
		font-size: 13px;
		line-height: 1.45;
	}

	.matchmaking-skeleton {
		display: grid;
		gap: 10px;
	}

	.matchmaking-skeleton div {
		height: 40px;
		border-radius: 8px;
		background: linear-gradient(
			90deg,
			hsl(var(--muted) / 0.45),
			hsl(var(--muted) / 0.22),
			hsl(var(--muted) / 0.45)
		);
		background-size: 200% 100%;
		animation: pvp-skeleton 1.2s ease-in-out infinite;
	}

	.matchmaking-skeleton div:nth-child(2) {
		width: 78%;
	}

	.matchmaking-skeleton div:nth-child(3) {
		width: 56%;
	}

	@keyframes pvp-skeleton {
		from {
			background-position: 200% 0;
		}

		to {
			background-position: -200% 0;
		}
	}

	.invite-list {
		display: grid;
		gap: 10px;
	}

	.invite-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		padding: 12px;
	}

	.invite-row strong,
	.invite-row span {
		display: block;
	}

	.invite-row span,
	.timer,
	.empty-state {
		color: hsl(var(--muted-foreground));
		font-size: 13px;
	}

	.empty-state {
		display: flex;
		align-items: center;
		min-height: 72px;
	}

	.section-heading {
		margin-bottom: 12px;
	}

	.section-heading.inside {
		margin: 0;
	}

	.section-heading h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 750;
	}

	@media (max-width: 980px) {
		.control-grid,
		.invite-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.arena-page {
			width: min(100vw - 20px, 1120px);
			padding-top: 24px;
		}

		.arena-topbar,
		:global(.auth-content),
		.invite-row,
		.invite-actions {
			align-items: stretch;
			flex-direction: column;
		}

		.starting-rating-grid {
			grid-template-columns: 1fr;
		}

		.elo-graph-toolbar {
			align-items: stretch;
			flex-direction: column;
		}

		:global(.elo-filter-group) {
			width: 100%;
			min-width: 0;
		}

		.weekly-race-meta {
			grid-template-columns: 1fr;
		}

		.leaderboard-row {
			grid-template-columns: 54px minmax(0, 1fr) 76px;
		}

		.leaderboard-row > :nth-child(4) {
			display: none;
		}
	}

	.pvp-top-alert {
		margin-bottom: 12px;
		padding: 12px;
		border-radius: 8px;
		background: hsl(var(--muted) / 0.08);
		border: 1px solid hsl(var(--border));
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.pvp-top-alert-inner {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.pvp-alert-dismiss {
		position: absolute;
		top: 12px;
		right: 12px;
		display: inline-flex;
		width: 32px;
		height: 32px;
		flex: 0 0 auto;
		align-items: center;
		justify-content: center;
		border: 0;
		border-radius: 6px;
		background: transparent;
		color: hsl(var(--muted-foreground));
		cursor: pointer;
	}

	.pvp-alert-dismiss:hover {
		background: hsl(var(--primary) / 0.12);
		color: hsl(var(--foreground));
	}

	@media (max-width: 640px) {
		.pvp-top-alert {
			align-items: flex-start;
			gap: 10px;
		}

		.pvp-top-alert-inner {
			align-items: flex-start;
			flex-direction: column;
			gap: 4px;
		}
	}
</style>
