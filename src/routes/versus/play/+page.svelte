<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Ads from '$lib/components/ads.svelte';
	import PlayerSelector from '$lib/components/playerSelector.svelte';
	import MatchCard from '$lib/components/pvp/MatchCard.svelte';
	import ClanWeeklyRaceTab from './ClanWeeklyRaceTab.svelte';
	import PvpDialogs from './PvpDialogs.svelte';
	import PvpLeaderboardTab from './PvpLeaderboardTab.svelte';
	import WeeklyRaceTab from './WeeklyRaceTab.svelte';
	import { user } from '$lib/client';
	import supabase from '$lib/client/supabase';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import * as Alert from '$lib/components/ui/alert';
	import * as Card from '$lib/components/ui/card';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import * as Tabs from '$lib/components/ui/tabs';
	import Chart from 'chart.js/auto';
	import {
		acceptPvpInvite,
		acceptPvpMatch,
		cancelPvpMatchmaking,
		checkPvpMatchmaking,
		acceptPvpRoomInvite,
		declinePvpInvite,
		declinePvpRoomInvite,
		createPvpRoom,
		getPvpClanWeeklyRace,
		getPvpInviteExpiresMs,
		getPvpInvite,
		getPvpMatchAcceptanceExpiresMs,
		getPvpMatchEndMs,
		getPvpInviteId,
		getPvpMatchedMatchId,
		getPvpRoomsOverview,
		getPvpMode,
		getPvpMatchId,
		getPvpMatch,
		getPvpMatches,
		getPvpLeaderboardPage,
		getPvpRequiredSubmissionLevel,
		getPvpRequiredSubmissionLevelId,
		getPvpWeeklyRace,
		getPvpMatchStartMs,
		getPvpParticipantRatingAfter,
		getPvpParticipantRatingBefore,
		getPvpParticipantRatingDiff,
		getPvpResultReason,
		getPvpMe,
		getPvpStatus,
		getPvpSelfParticipant,
		getPvpWinnerUid,
		getPvpVisibleRatingLabel,
		hasPvpParticipantAccepted,
		isActivePvpMatch,
		isPvpMatchConfirmedByBoth,
		isPvpMatchRanked,
		isPvpRatingStable,
		leavePvpRoom,
		sendPvpInvite,
		startPvpMatchmaking,
		type PvpClan,
		type PvpInvite,
		type PvpClanWeeklyRace,
		type PvpLeaderboardPlayer,
		type PvpMatch,
		type PvpMatchmakingRequest,
		type PvpMe,
		type PvpMode,
		type PvpRoom,
		type PvpRoomInvite,
		type PvpRoomsOverview,
		type PvpWeeklyRace,
		PVP_UNCERTAIN_RATING_DEVIATION,
		PVP_DEFAULT_RATING_DEVIATION
	} from '$lib/client/pvp';
	import {
		setPvpRealtimeAuth,
		subscribeToPvpMatchActivity,
		subscribeToPvpMatchRows,
		subscribeToPvpLobby,
		type PvpRealtimeEvent
	} from '$lib/client/pvpRealtime';
	import { playPvpBell } from '$lib/client/pvpSound';
	import {
		getPvpNextRankProgress,
		getPvpRankCondition,
		PVP_RANKS,
		resolvePvpRank,
		type PvpRankDefinition
	} from '$lib/utils/pvpRank';
	import { onDestroy, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { _ } from 'svelte-i18n';
	import {
		CalendarDays,
		BookOpen,
		ChevronRight,
		Clock,
		Eye,
		EyeOff,
		History,
		Loader2,
		LogIn,
		Plus,
		RefreshCw,
		Send,
		ShieldAlert,
		Swords,
		Trophy,
		UserCheck,
		Users,
		X
	} from 'lucide-svelte';

	const PVP_GEODE_ALERT_DISMISSED_KEY = 'gdvn:pvp-geode-alert-dismissed';
	const PVP_ANONYMOUS_MODE_KEY = 'gdvn:pvp-anonymous-mode';
	const PVP_SELECTED_MODE_KEY = 'gdvn:pvp-selected-mode';
	const PVP_HIDE_OPPONENT_INFO_KEY = 'gdvn:pvp-hide-opponent-info';
	const PVP_LAST_AUTO_REDIRECTED_MATCH_KEY =
		'gdvn:pvp-last-auto-redirected-match-id';
	const REALTIME_COALESCE_MS = 200;
	const PVP_STANDINGS_PAGE_SIZE = 50;
	const PVP_MODES: PvpMode[] = ['classic', 'platformer'];
	const siteUrl = (import.meta.env.VITE_SITE_URL || 'https://gdvn.net').replace(
		/\/$/,
		''
	);
	const playUrl = `${siteUrl}/versus/play`;
	const ELO_GRAPH_FILTERS = [
		{ key: '25', limit: 25 },
		{ key: '100', limit: 100 },
		{ key: 'all', limit: null }
	] as const;
	let selectedPlayer: any = null;
	let selectedMode: PvpMode = 'classic';
	let historyMode: PvpMode = 'classic';
	let leaderboardMode: PvpMode = 'classic';
	let anonymousMode = false;
	let hideOpponentInfo = false;
	let anonymousModeReady = false;
	let lobby: PvpMe = {
		activeMatch: null,
		matchmaking: null,
		requiredSubmission: null,
		incomingInvites: [],
		outgoingInvites: []
	};
	let matches: PvpMatch[] = [];
	let leaderboard: PvpLeaderboardPlayer[] = [];
	let leaderboardPage = 1;
	let leaderboardTotal = 0;
	let weeklyRace: PvpWeeklyRace = {
		week: null,
		currentWeek: null,
		previousWeek: null,
		leaderboard: [],
		previousLeaderboard: [],
		currentPlayer: null
	};
	let weeklyRacePage = 1;
	let weeklyRaceTotal = 0;
	let clanRace: PvpClanWeeklyRace = {
		week: null,
		currentWeek: null,
		previousWeek: null,
		leaderboard: [],
		previousLeaderboard: [],
		currentClan: null
	};
	let clanRacePage = 1;
	let clanRaceTotal = 0;
	let roomsOverview: PvpRoomsOverview = {
		publicRooms: [],
		joinedRooms: [],
		invites: []
	};
	let activePvpTab = 'lobby';
	let eloGraphFilter: (typeof ELO_GRAPH_FILTERS)[number]['key'] = '25';
	let summaryOpen = false;
	let loading = false;
	let matchHistoryLoading = false;
	let leaderboardLoading = true;
	let leaderboardError = '';
	let weeklyRaceLoading = true;
	let weeklyRaceError = '';
	let clanRaceLoading = true;
	let clanRaceError = '';
	let roomsLoading = false;
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
	let showGeodeAlert = true;
	let currentUserClan: PvpClan | null = null;
	let lobbyReady = false;
	let pendingDialogTimeout: ReturnType<typeof setTimeout> | null = null;
	let pendingExpirationCheckMatchId: string | null = null;
	let acceptingPendingMatchId: string | null = null;
	let locallyAcceptedPendingMatchIds = new Set<string>();
	let keydownHandler: ((e: KeyboardEvent) => void) | null = null;
	let matchmakingCheckTimer: ReturnType<typeof setInterval> | null = null;
	let loadedLeaderboardKey = '';
	let handledRequeueUrl = '';

	$: currentUid = $user.data?.uid;
	$: activeMatch = lobby.activeMatch && isActivePvpMatch(lobby.activeMatch)
		? lobby.activeMatch
		: null;
	$: historyMatches = getHistoryMatches(activeMatch, matches);
	$: visibleHistoryMatches = historyMatches.filter((match) =>
		getPvpMode(match) === historyMode
	);
	$: ongoingHistoryMatches = visibleHistoryMatches.filter((match) =>
		isActivePvpMatch(match)
	);
	$: pastHistoryMatches = visibleHistoryMatches.filter((match) =>
		!isActivePvpMatch(match)
	);
	$: pendingMatch = activeMatch
		&& getPvpStatus(activeMatch) === 'pending'
		&& !isPvpMatchConfirmedByBoth(activeMatch)
		? activeMatch
		: null;
	$: pendingMatchId = getPvpMatchId(pendingMatch);
	$: pendingMatchKey = pendingMatchId ? String(pendingMatchId) : '';
	$: pendingSelfAccepted =
		hasPvpParticipantAccepted(getPvpSelfParticipant(pendingMatch, currentUid))
		|| (pendingMatchKey
			? locallyAcceptedPendingMatchIds.has(pendingMatchKey)
			: false);
	$: queueStatus = getPvpStatus(lobby.matchmaking, 'idle');
	$: isSearching = queueStatus === 'searching';
	$: selectedRatingState = getSelectedRatingState(lobby, selectedMode);
	$: pvpRating = selectedRatingState?.pvpRating ?? null;
	$: pvpRatedMatchCount = selectedRatingState?.pvpRatedMatchCount ?? 0;
	$: pvpRatingDeviation = getFiniteNumber(
		selectedRatingState?.pvpRatingDeviation
	);
	$: pvpRatingLabel = getPvpVisibleRatingLabel(
		pvpRating,
		pvpRatingDeviation,
		{ unstableLabel: '?' }
	) ?? '--';
	$: pvpRatingInitialized = Boolean(
		selectedRatingState?.pvpRatingInitialized ?? pvpRating !== null
	);
	$: selectedEloFilter =
		ELO_GRAPH_FILTERS.find((filter) => filter.key === eloGraphFilter)
		?? ELO_GRAPH_FILTERS[0];
	$: eloGraphPoints = getEloGraphPoints(
		matches.filter((match) => getPvpMode(match) === selectedMode),
		currentUid,
		selectedEloFilter.limit
	);
	$: eloGraphChartData = getEloGraphChartData(eloGraphPoints);
	$: eloGraphStart = eloGraphPoints[0]?.rating ?? pvpRating ?? null;
	$: eloGraphEnd = eloGraphPoints[eloGraphPoints.length - 1]?.rating ?? pvpRating
		?? null;
	$: eloGraphDelta = eloGraphStart !== null && eloGraphEnd !== null
		? Math.round(eloGraphEnd - eloGraphStart)
		: null;
	$: eloGraphMatchCount = Math.max(0, eloGraphPoints.length - 1);
	$: eloGraphDisabled = pvpRating !== null
		&& !isPvpRatingStable(pvpRatingDeviation);
	$: ratingUnlockProgress = getRatingUnlockProgress(pvpRatingDeviation);
	$: pvpRank = resolvePvpRank(pvpRating, pvpRatingDeviation);
	$: pvpRankProgress = getPvpNextRankProgress(pvpRating, pvpRatingDeviation);
	$: showRatingUnlockProgress = pvpRating !== null
		&& pvpRatingDeviation !== null
		&& !isPvpRatingStable(pvpRatingDeviation);
	$: pvpWinLossStats = getPvpWinLossStats(
		matches.filter((match) => getPvpMode(match) === selectedMode),
		currentUid
	);
	$: currentWeeklyRacePoints = getCurrentWeeklyRacePoints(
		weeklyRace,
		currentUid,
		matches.filter((match) => getPvpMode(match) === selectedMode)
	);
	$: hasRecentLeaderboardMatch = hasRecentRatedPvpMatch(
		matches.filter((match) => getPvpMode(match) === selectedMode),
		7
	);
	$: showLeaderboardStabilityNotice = pvpRatingInitialized
		&& !isPvpRatingStable(pvpRatingDeviation);
	$: showLeaderboardActivityNotice = pvpRatingInitialized
		&& isPvpRatingStable(pvpRatingDeviation)
		&& !hasRecentLeaderboardMatch;
	$: currentSearchRange = lobby.matchmaking?.currentSearchRange
		?? lobby.matchmaking?.current_search_range ?? null;
	$: queueStartedAt = lobby.matchmaking?.searchStartedAt
		?? lobby.matchmaking?.search_started_at
		?? lobby.matchmaking?.created_at;
	$: queueElapsedMs = getElapsedMs(queueStartedAt, now);
	$: showSlowSearchAlert = isSearching && queueElapsedMs >= 90 * 1000;
	$: requiredSubmission = lobby.requiredSubmission ?? null;
	$: requiredSubmissionLevel = getPvpRequiredSubmissionLevel(requiredSubmission);
	$: requiredSubmissionLevelId = getPvpRequiredSubmissionLevelId(requiredSubmission);
	$: requiredSubmissionUrl = requiredSubmissionLevelId
		? `/submit/record?levelId=${requiredSubmissionLevelId}&pvpRequirement=${
			requiredSubmission?.id ?? ''
		}`
		: '/submit/record';
	$: requiredSubmissionLevelUrl = requiredSubmissionLevelId
		? `/level/${requiredSubmissionLevelId}`
		: null;
	$: requiredSubmissionLevelLabel =
		requiredSubmissionLevel?.name || `#${requiredSubmissionLevelId ?? ''}`;
	$: activeJoinedRooms = roomsOverview.joinedRooms.filter(isActiveRoom);
	$: activePublicRooms = roomsOverview.publicRooms.filter(isActiveRoom);
	$: currentRoom = activeJoinedRooms[0] ?? null;
	$: currentRoomId = getRoomId(currentRoom);
	$: incomingPending = lobby.incomingInvites.filter(
		(invite) =>
			getPvpStatus(invite) === 'pending'
				&& getPvpMode(invite) === selectedMode
	);
	$: outgoingVisible = lobby.outgoingInvites.filter(
		(invite) =>
			getPvpStatus(invite) === 'pending'
				&& getPvpMode(invite) === selectedMode
	);
	$: checkingLobby = $user.checked && $user.loggedIn && !lobbyReady;
	$: controlsDisabled = Boolean(
		checkingLobby || activeMatch || isSearching || actionLoading
	);
	$: matchmakingDisabled = controlsDisabled || Boolean(requiredSubmission);
	$: rankedQueueDisabled = matchmakingDisabled || Boolean(currentRoom);
	$: updateActiveMatchRealtime($user.loggedIn, getLobbyRealtimeMatchIds());
	$: updatePendingConfirmRealtime($user.loggedIn, pendingMatchId);
	$: updateMatchmakingCheckPolling($user.loggedIn, isSearching && !requiredSubmission);
	$: autoRedirectToActiveMatch(activeMatch);

	$: if (
		$user.checked && $user.loggedIn && currentUid
		&& initializedForUid !== currentUid
	) {
		initializeRealtime(currentUid);
	}

	$: if ($user.checked && !$user.loggedIn) {
		lobby = {
			activeMatch: null,
			matchmaking: null,
			requiredSubmission: null,
			incomingInvites: [],
			outgoingInvites: []
		};
		matches = [];
		roomsOverview = {
			publicRooms: [],
			joinedRooms: [],
			invites: []
		};
		initializedForUid = '';
		lobbyReady = false;
		matchHistoryLoading = false;
		routedMatchId = null;
	}

	onMount(() => {
		showGeodeAlert =
			localStorage.getItem(PVP_GEODE_ALERT_DISMISSED_KEY) !== 'true';
		anonymousMode = localStorage.getItem(PVP_ANONYMOUS_MODE_KEY) === 'true';
		selectedMode = localStorage.getItem(PVP_SELECTED_MODE_KEY) === 'platformer'
			? 'platformer'
			: 'classic';
		hideOpponentInfo =
			localStorage.getItem(PVP_HIDE_OPPONENT_INFO_KEY) === 'true';
		anonymousModeReady = true;

		ticker = setInterval(() => {
			now = Date.now();
		}, 1000);

		keydownHandler = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && pendingMatch) {
				e.preventDefault();
				e.stopPropagation();
			}
		};

		window.addEventListener('keydown', keydownHandler);
		refreshLeaderboard();
		refreshWeeklyRace();
		refreshClanRace();
	});

	$: currentUserClan = $user.data?.clan && $user.data?.clans
		? ({
			...($user.data.clans as Record<string, unknown>),
			id: $user.data.clan
		} as PvpClan)
		: null;

	$: if (anonymousModeReady) {
		localStorage.setItem(PVP_ANONYMOUS_MODE_KEY, String(anonymousMode));
		localStorage.setItem(PVP_SELECTED_MODE_KEY, selectedMode);
		localStorage.setItem(PVP_HIDE_OPPONENT_INFO_KEY, String(hideOpponentInfo));
	}

	$: if (
		browser
		&& anonymousModeReady
		&& lobbyReady
		&& $user.checked
		&& $user.loggedIn
		&& $page.url.searchParams.get('requeue') === '1'
		&& handledRequeueUrl !== $page.url.href
	) {
		handledRequeueUrl = $page.url.href;
		startRequeueFromUrl();
	}

	$: leaderboardRequestKey = `${leaderboardMode}:${leaderboardPage}`;
	$: if (browser && loadedLeaderboardKey !== leaderboardRequestKey) {
		refreshLeaderboard(leaderboardMode, leaderboardPage);
	}

	onDestroy(() => {
		if (ticker) {
			clearInterval(ticker);
		}

		cleanupRealtime?.();
		cleanupActiveMatchRealtime?.();
		cleanupPendingConfirmRealtime?.();
		clearScheduledRealtimeTasks();
		clearMatchmakingCheckPolling();

		if (keydownHandler) {
			window.removeEventListener('keydown', keydownHandler);
		}

		if (pendingDialogTimeout) {
			clearTimeout(pendingDialogTimeout);
		}
	});

	async function initializeRealtime(uid: string) {
		initializedForUid = uid;
		lobbyReady = false;
		cleanupRealtime?.();

		try {
			const token = await $user.token();
			setPvpRealtimeAuth(token);
			await Promise.all([
				refreshLobby(),
				refreshMatchHistory(),
				refreshRooms(),
				refreshWeeklyRace(),
				refreshClanRace()
			]);
			lobbyReady = true;

			cleanupRealtime = subscribeToPvpLobby(uid, handleLobbyRealtimeEvent);
		} catch (error) {
			lobbyReady = true;
			toast.error(
				error instanceof Error ? error.message : $_('pvp.toast.load_failed')
			);
		}
	}

	async function refreshLobby() {
		if (!$user.loggedIn) {
			return;
		}

		loading = true;

		try {
			const previousActiveMatch = lobby.activeMatch;
			const nextLobby = await getPvpMe(await $user.token());
			handleLobbyMatchSounds(previousActiveMatch, nextLobby.activeMatch);
			lobby = nextLobby;
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : $_('pvp.toast.load_failed')
			);
		} finally {
			loading = false;
		}
	}

	async function refreshMatchHistory() {
		if (!$user.loggedIn) {
			return;
		}

		matchHistoryLoading = true;

		try {
			matches = await getPvpMatches(await $user.token());
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : $_('pvp.toast.load_failed')
			);
		} finally {
			matchHistoryLoading = false;
		}
	}

	async function refreshRooms() {
		if (!$user.loggedIn) {
			return;
		}

		roomsLoading = true;

		try {
			roomsOverview = await getPvpRoomsOverview(await $user.token());
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : $_('pvp.rooms.load_failed')
			);
		} finally {
			roomsLoading = false;
		}
	}

	async function refreshLeaderboard(
		mode: PvpMode = leaderboardMode,
		page = leaderboardPage
	) {
		const requestKey = `${mode}:${page}`;

		if (mode === leaderboardMode && page === leaderboardPage) {
			loadedLeaderboardKey = requestKey;
		}

		leaderboardLoading = true;
		leaderboardError = '';

		try {
			const nextLeaderboard = await getPvpLeaderboardPage(
				page,
				PVP_STANDINGS_PAGE_SIZE,
				mode
			);

			if (mode !== leaderboardMode || page !== leaderboardPage) {
				return;
			}

			leaderboard = nextLeaderboard.data;
			leaderboardTotal = nextLeaderboard.total;
		} catch (error) {
			if (mode !== leaderboardMode || page !== leaderboardPage) {
				return;
			}

			leaderboard = [];
			leaderboardTotal = 0;
			leaderboardError = error instanceof Error
				? error.message
				: $_('pvp.toast.leaderboard_failed');
		} finally {
			if (mode === leaderboardMode && page === leaderboardPage) {
				leaderboardLoading = false;
			}
		}
	}

	async function refreshWeeklyRace(page = weeklyRacePage) {
		weeklyRaceLoading = true;
		weeklyRaceError = '';

		try {
			const nextWeeklyRace = await getPvpWeeklyRace(
				'current',
				PVP_STANDINGS_PAGE_SIZE,
				currentUid,
				page
			);

			if (page !== weeklyRacePage) {
				return;
			}

			weeklyRace = nextWeeklyRace;
			weeklyRaceTotal = nextWeeklyRace.pagination?.total
				?? nextWeeklyRace.leaderboard.length;
		} catch (error) {
			if (page !== weeklyRacePage) {
				return;
			}

			weeklyRace = {
				week: null,
				currentWeek: null,
				previousWeek: null,
				leaderboard: [],
				previousLeaderboard: [],
				currentPlayer: null
			};
			weeklyRaceTotal = 0;
			weeklyRaceError = error instanceof Error
				? error.message
				: $_('pvp.toast.weekly_race_failed');
		} finally {
			if (page === weeklyRacePage) {
				weeklyRaceLoading = false;
			}
		}
	}

	async function refreshClanRace(page = clanRacePage) {
		clanRaceLoading = true;
		clanRaceError = '';

		try {
			const nextClanRace = await getPvpClanWeeklyRace(
				'current',
				PVP_STANDINGS_PAGE_SIZE,
				$user.data?.clan ?? null,
				page
			);

			if (page !== clanRacePage) {
				return;
			}

			clanRace = nextClanRace;
			clanRaceTotal = nextClanRace.pagination?.total
				?? nextClanRace.leaderboard.length;
		} catch (error) {
			if (page !== clanRacePage) {
				return;
			}

			clanRace = {
				week: null,
				currentWeek: null,
				previousWeek: null,
				leaderboard: [],
				previousLeaderboard: [],
				currentClan: null
			};
			clanRaceTotal = 0;
			clanRaceError = error instanceof Error
				? error.message
				: $_('pvp.toast.clan_race_failed');
		} finally {
			if (page === clanRacePage) {
				clanRaceLoading = false;
			}
		}
	}

	function setWeeklyRacePage(page: number) {
		if (page === weeklyRacePage) {
			return;
		}

		weeklyRacePage = page;
		void refreshWeeklyRace(page);
	}

	function setClanRacePage(page: number) {
		if (page === clanRacePage) {
			return;
		}

		clanRacePage = page;
		void refreshClanRace(page);
	}

	function scheduleRealtimeTask(key: string, task: () => Promise<void>) {
		const existing = scheduledRealtimeTasks.get(key);

		if (existing) {
			clearTimeout(existing);
		}

		const timeout = setTimeout(async () => {
			scheduledRealtimeTasks.delete(key);

			try {
				await task();
			} catch (error) {
				toast.error(
					error instanceof Error
						? error.message
						: $_('pvp.toast.load_failed')
				);
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

	function getSelectedRatingState(currentLobby: PvpMe, mode: PvpMode) {
		if (mode === 'platformer') {
			return (
				currentLobby.ratings?.platformer
				?? currentLobby.platformerRating ?? {
					mode,
					pvpRating: currentLobby.pvpPlatformerRating ?? null,
					pvpRatedMatchCount: currentLobby.pvpPlatformerRatedMatchCount
						?? 0,
					pvpRatingInitialized:
						currentLobby.pvpPlatformerRatingInitialized ?? false
				}
			);
		}

		return (
			currentLobby.ratings?.classic
			?? currentLobby.rating ?? {
				mode,
				pvpRating: currentLobby.pvpRating ?? null,
				pvpRatedMatchCount: currentLobby.pvpRatedMatchCount ?? 0,
				pvpRatingInitialized: currentLobby.pvpRatingInitialized ?? false
			}
		);
	}

	function realtimeRow(event: PvpRealtimeEvent) {
		return event.payload?.new ?? event.payload?.old ?? {};
	}

	function handleLobbyRealtimeEvent(event: PvpRealtimeEvent) {
		const row = realtimeRow(event);

		if (event.scope === 'matchmaking') {
			applyMatchmaking(row);
			const matchId = row?.matchId ?? row?.match?.id ?? row?.match?.matchId;

			if (matchId) {
				scheduleFetchMatch(matchId);
			}

			return;
		}

		if (event.scope === 'incomingInvite' || event.scope === 'outgoingInvite') {
			const inviteId = row?.id ?? row?.inviteId;

			if (inviteId) {
				scheduleFetchInvite(inviteId, event.scope);
			}

			return;
		}

		if (['room', 'roomMember', 'roomInvite', 'roomMessage'].includes(event.scope)) {
			scheduleRealtimeTask('rooms', refreshRooms);

			return;
		}

		if (event.scope === 'participant' || event.scope === 'result') {
			if (row?.matchId) {
				scheduleFetchMatch(row.matchId);
			}

			return;
		}

		if (event.scope === 'match') {
			const matchId = row?.id ?? row?.matchId;

			if (matchId) {
				scheduleFetchMatch(matchId);
			}
		}
	}

	function handlePendingConfirmRealtimeEvent(event: PvpRealtimeEvent) {
		const row = realtimeRow(event);
		const matchId = row?.id ?? row?.matchId;

		if (!matchId) {
			return;
		}

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

	function applyMatchmaking(
		nextMatchmaking: PvpMatchmakingRequest | null | undefined
	) {
		const status = getPvpStatus(nextMatchmaking, 'idle');
		const matchmaking = ['searching', 'matched'].includes(status)
			? (nextMatchmaking ?? null)
			: null;
		const queuedRating = Number(
			nextMatchmaking?.pvpRating ?? nextMatchmaking?.pvp_rating ?? NaN
		);

		if (!Number.isFinite(queuedRating)) {
			lobby = { ...lobby, matchmaking };

			return;
		}

		const mode = getPvpMode(nextMatchmaking);
		const rating = {
			mode,
			pvpRating: Math.round(queuedRating),
			pvpRatedMatchCount:
				getSelectedRatingState(lobby, mode)?.pvpRatedMatchCount
					?? (mode === 'platformer'
						? (lobby.pvpPlatformerRatedMatchCount ?? 0)
						: (lobby.pvpRatedMatchCount ?? 0)),
			pvpStartingRating:
				getSelectedRatingState(lobby, mode)?.pvpStartingRating ?? 1500,
			pvpRatingInitialized: true
		};
		const ratings = {
			...(lobby.ratings ?? {}),
			[mode]: {
				...(lobby.ratings?.[mode] ?? {}),
				...rating
			}
		};

		lobby = {
			...lobby,
			matchmaking,
			ratings,
			rating: mode === 'classic' ? ratings.classic : lobby.rating,
			platformerRating: mode === 'platformer'
				? ratings.platformer
				: lobby.platformerRating,
			pvpRating: mode === 'classic' ? rating.pvpRating : lobby.pvpRating,
			pvpRatedMatchCount: mode === 'classic'
				? rating.pvpRatedMatchCount
				: lobby.pvpRatedMatchCount,
			pvpRatingInitialized: mode === 'classic'
				? true
				: lobby.pvpRatingInitialized,
			pvpPlatformerRating: mode === 'platformer'
				? rating.pvpRating
				: lobby.pvpPlatformerRating,
			pvpPlatformerRatedMatchCount: mode === 'platformer'
				? rating.pvpRatedMatchCount
				: lobby.pvpPlatformerRatedMatchCount,
			pvpPlatformerRatingInitialized: mode === 'platformer'
				? true
				: lobby.pvpPlatformerRatingInitialized
		};
	}

	function applyMatch(nextMatch: PvpMatch | null | undefined) {
		if (!nextMatch) {
			return;
		}

		const matchId = getPvpMatchId(nextMatch);

		if (!matchId) {
			return;
		}

		const previousActiveMatch = lobby.activeMatch;
		const currentActiveId = getPvpMatchId(lobby.activeMatch);
		const nextActiveMatch = isActivePvpMatch(nextMatch)
			|| String(currentActiveId) === String(matchId)
			? isActivePvpMatch(nextMatch)
				? nextMatch
				: null
			: lobby.activeMatch;

		lobby = {
			...lobby,
			activeMatch: nextActiveMatch,
			matchmaking: String(lobby.matchmaking?.matchId) === String(matchId)
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

		if (
			getPvpStatus(nextMatch, '') === 'completed'
			&& isPvpMatchRanked(nextMatch)
		) {
			upsertMatchHistory(nextMatch);
			void refreshWeeklyRace();
			void refreshClanRace();
		}
	}

	function upsertMatchHistory(nextMatch: PvpMatch) {
		const matchId = getPvpMatchId(nextMatch);

		if (!matchId) {
			return;
		}

		const existingIndex = matches.findIndex(
			(match) => String(getPvpMatchId(match)) === String(matchId)
		);
		const nextMatches = existingIndex >= 0
			? matches.map((
				match,
				index
			) => (index === existingIndex ? nextMatch : match))
			: [nextMatch, ...matches];

		matches = sortMatches(nextMatches);
	}

	function sortMatches(items: PvpMatch[]) {
		return [...items].sort((a, b) => getMatchSortMs(b) - getMatchSortMs(a));
	}

	function getHistoryMatches(active: PvpMatch | null, history: PvpMatch[]) {
		const byId = new Map<string, PvpMatch>();

		for (const match of [active, ...history]) {
			const matchId = getPvpMatchId(match);

			if (!matchId || !match) {
				continue;
			}

			byId.set(String(matchId), match);
		}

		return sortMatches([...byId.values()]);
	}

	function getMatchSortMs(match: PvpMatch) {
		const fallbackMs = new Date(
			match.endedAt ?? match.endAt ?? match.endsAt ?? match.created_at ?? 0
		)
			.getTime();

		return getPvpMatchStartMs(match)
			?? (Number.isFinite(fallbackMs) ? fallbackMs : 0);
	}

	function getRatedMatchActivityMs(match: PvpMatch) {
		const ms = new Date(
			match.ratingAppliedAt
			?? match.rating_applied_at
			?? match.endedAt
			?? match.endAt
			?? match.endsAt
			?? match.created_at
			?? 0
		)
			.getTime();

		return Number.isFinite(ms) ? ms : 0;
	}

	function hasRecentRatedPvpMatch(sourceMatches: PvpMatch[], days: number) {
		const activeSince = Date.now() - days * 24 * 60 * 60 * 1000;

		return sourceMatches.some(
			(match) =>
				getPvpStatus(match, '') === 'completed'
					&& isPvpMatchRanked(match)
					&& getRatedMatchActivityMs(match) >= activeSince
		);
	}

	function getPvpWinLossStats(
		sourceMatches: PvpMatch[],
		uid: string | null | undefined
	) {
		if (!uid) {
			return { wins: 0, losses: 0 };
		}

		return sourceMatches.reduce<{ wins: number; losses: number; }>(
			(stats, match) => {
				if (
					getPvpStatus(match, '') !== 'completed'
					|| !isPvpMatchRanked(match)
				) {
					return stats;
				}

				const winnerUid = getPvpWinnerUid(match);

				if (!winnerUid) {
					return stats;
				}

				if (String(winnerUid) === String(uid)) {
					stats.wins += 1;
				} else if (getPvpSelfParticipant(match, uid)) {
					stats.losses += 1;
				}

				return stats;
			},
			{ wins: 0, losses: 0 }
		);
	}

	function getRatingUnlockProgress(ratingDeviation: number | null | undefined) {
		if (!Number.isFinite(Number(ratingDeviation))) {
			return 0;
		}

		const span = PVP_DEFAULT_RATING_DEVIATION
			- PVP_UNCERTAIN_RATING_DEVIATION;
		const progress = (
			PVP_DEFAULT_RATING_DEVIATION - Number(ratingDeviation)
		) / span;

		return Math.round(Math.max(0, Math.min(1, progress)) * 100);
	}

	function rankConditionLabel(rank: PvpRankDefinition) {
		const condition = getPvpRankCondition(rank);

		return $_(`pvp.rules.conditions.${condition.key}`, {
			values: condition.values
		});
	}

	function updateInviteMatches(invites: PvpInvite[], nextMatch: PvpMatch) {
		const matchId = getPvpMatchId(nextMatch);

		if (!matchId) {
			return invites;
		}

		return invites
			.map((invite) =>
				String(invite.matchId) === String(matchId)
					? {
						...invite,
						match: isActivePvpMatch(nextMatch) ? nextMatch : null
					}
					: invite
			)
			.filter(
				(invite) =>
					!(getPvpStatus(invite) === 'accepted' && invite.matchId
						&& !invite.match)
			);
	}

	function applyInvite(
		invite: PvpInvite | null,
		fallbackScope: 'incomingInvite' | 'outgoingInvite'
	) {
		if (!invite) {
			return;
		}

		const direction = invite.inviteeUid === currentUid
			? 'incomingInvite'
			: invite.inviterUid === currentUid
			? 'outgoingInvite'
			: fallbackScope;
		lobby = direction === 'incomingInvite'
			? {
				...lobby,
				incomingInvites: upsertInvite(lobby.incomingInvites, invite)
			}
			: {
				...lobby,
				outgoingInvites: upsertInvite(lobby.outgoingInvites, invite)
			};

		if (invite.match) {
			applyMatch(invite.match);
		}
	}

	function upsertInvite(invites: PvpInvite[], invite: PvpInvite) {
		const inviteId = getPvpInviteId(invite);

		if (!inviteId) {
			return invites;
		}

		const shouldHideAcceptedFinished = getPvpStatus(invite) === 'accepted'
			&& invite.matchId && !invite.match;

		if (shouldHideAcceptedFinished) {
			return invites.filter((item) =>
				String(getPvpInviteId(item)) !== String(inviteId)
			);
		}

		const next = invites.filter((item) =>
			String(getPvpInviteId(item)) !== String(inviteId)
		);

		return [invite, ...next].slice(0, 20);
	}

	function removeInvite(inviteId: number | string) {
		const matchesId = (invite: PvpInvite) =>
			String(getPvpInviteId(invite)) === String(inviteId);
		lobby = {
			...lobby,
			incomingInvites: lobby.incomingInvites.filter((invite) =>
				!matchesId(invite)
			),
			outgoingInvites: lobby.outgoingInvites.filter((invite) =>
				!matchesId(invite)
			)
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

	function updateActiveMatchRealtime(
		loggedIn: boolean,
		matchIds: Array<number | string>
	) {
		const key = loggedIn
			? [...new Set(matchIds.map(String))].sort()
				.join(',')
			: '';

		if (key === activeMatchRealtimeKey) {
			return;
		}

		cleanupActiveMatchRealtime?.();
		cleanupActiveMatchRealtime = null;
		activeMatchRealtimeKey = key;

		if (!loggedIn || !key) {
			return;
		}

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

		if (key === pendingConfirmRealtimeKey) {
			return;
		}

		cleanupPendingConfirmRealtime?.();
		cleanupPendingConfirmRealtime = null;
		pendingConfirmRealtimeKey = key;

		if (!key) {
			return;
		}

		cleanupPendingConfirmRealtime = subscribeToPvpMatchRows(
			[matchId],
			handlePendingConfirmRealtimeEvent,
			`pvp-pending-confirm-${currentUid}`
		);
	}

	function updateMatchmakingCheckPolling(loggedIn: boolean, searching: boolean) {
		if (!browser) {
			return;
		}

		if (!loggedIn || !searching) {
			clearMatchmakingCheckPolling();

			return;
		}

		if (matchmakingCheckTimer) {
			return;
		}

		matchmakingCheckTimer = setInterval(checkMatchmaking, 15_000);
	}

	function clearMatchmakingCheckPolling() {
		if (!matchmakingCheckTimer) {
			return;
		}

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
		if (!$user.loggedIn || !isSearching) {
			return;
		}

		try {
			const response = await checkPvpMatchmaking(await $user.token());
			applyMatchmakingResponse(response);
		} catch (error) {
			const message = error instanceof Error
				? error.message
				: $_('pvp.toast.matchmaking_check_failed');

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

		if (
			nextId && nextStatus === 'pending'
			&& !announcedMatchIds.has(String(nextId))
		) {
			announcedMatchIds.add(String(nextId));
			playPvpBell();
		}

		const previousId = getPvpMatchId(previousMatch);
		const previousStatus = getPvpStatus(previousMatch, '');
		const previousWasInProgress = previousStatus === 'in_progress';
		const nextStillActive = Boolean(nextMatch && isActivePvpMatch(nextMatch));

		// Play end bell only if the previous match was actually in-progress (not just pending acceptance)
		if (
			previousId
			&& previousWasInProgress
			&& !nextStillActive
			&& !endedMatchBellIds.has(String(previousId))
		) {
			endedMatchBellIds.add(String(previousId));
			playPvpBell();
		}
	}

	function autoRedirectToActiveMatch(match: PvpMatch | null) {
		const matchId = getPvpMatchId(match);

		if (
			!browser
			|| !currentUid
			|| !matchId
			|| !match
			|| !isActivePvpMatch(match)
			|| !isPvpMatchConfirmedByBoth(match)
		) {
			return;
		}

		redirectToMatchId(matchId);
	}

	function redirectToMatchId(matchId: number | string | null) {
		if (!browser || !currentUid || !matchId) {
			return;
		}

		const matchKey = String(matchId);
		const redirectKey = `confirmed:${matchKey}`;

		if (routedMatchId !== null && String(routedMatchId) === matchKey) {
			return;
		}

		if (
			localStorage.getItem(PVP_LAST_AUTO_REDIRECTED_MATCH_KEY) === redirectKey
		) {
			return;
		}

		localStorage.setItem(PVP_LAST_AUTO_REDIRECTED_MATCH_KEY, redirectKey);
		routedMatchId = matchId;
		goto(`/versus/matches/${matchId}`);
	}

	// Control dialog open state and auto-close when acceptance expires
	$: if (pendingMatch) {
		if (!matchDialogOpen) {
			matchDialogOpen = true;
		}

		const expires = getPvpMatchAcceptanceExpiresMs(pendingMatch);

		if (expires) {
			if (pendingDialogTimeout) {
				clearTimeout(pendingDialogTimeout);
			}

			const matchId = pendingMatchId;
			const delay = Math.max(0, expires - Date.now());
			pendingDialogTimeout = setTimeout(() => {
				if (matchId) {
					void handlePendingMatchExpired(matchId);
				}

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
		if (!$user.loggedIn) {
			return;
		}

		const matchKey = String(matchId);

		if (pendingExpirationCheckMatchId === matchKey) {
			return;
		}

		pendingExpirationCheckMatchId = matchKey;

		const wasMatchmakingMatch =
			String(getPvpMatchedMatchId(lobby.matchmaking)) === matchKey;

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
						String(getPvpMatchId(lobby.activeMatch)) === matchKey
							? null
							: lobby.activeMatch,
					matchmaking:
						String(getPvpMatchedMatchId(lobby.matchmaking)) === matchKey
							? null
							: lobby.matchmaking
				};

				const response = await startPvpMatchmaking(
					token,
					anonymousMode,
					getPvpMode(latestMatch)
				);
				applyMatchmakingResponse(response);
			}
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : $_('pvp.toast.load_failed')
			);
			await refreshLobby();
		} finally {
			if (pendingExpirationCheckMatchId === matchKey) {
				pendingExpirationCheckMatchId = null;
			}
		}
	}

	function navigateToMatch(matchId: number | string | null) {
		if (
			!matchId
			|| (routedMatchId !== null && String(routedMatchId) === String(matchId))
		) {
			return;
		}

		routedMatchId = matchId;
		goto(`/versus/matches/${matchId}`);
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

	async function startRequeueFromUrl() {
		const mode = $page.url.searchParams.get('mode');
		const anonymous = $page.url.searchParams.get('anonymous');

		if (mode === 'classic' || mode === 'platformer') {
			selectedMode = mode;
		}

		if (anonymous === '1' || anonymous === '0') {
			anonymousMode = anonymous === '1';
		}

		activePvpTab = 'lobby';
		await goto('/versus/play', {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});

		if (isSearching || getPvpMatchedMatchId(lobby.matchmaking)) {
			return;
		}

		await startQueue();
	}

	async function startQueue() {
		if (currentRoom) {
			toast.error($_('pvp.rooms.queue_blocked'));

			return;
		}

		actionLoading = 'matchmaking';

		try {
			const response = await startPvpMatchmaking(
				await $user.token(),
				anonymousMode,
				selectedMode
			);
			applyMatchmakingResponse(response);
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: $_('pvp.toast.matchmaking_failed')
			);
		} finally {
			actionLoading = '';
		}
	}

	async function leaveRoomAndStartQueue() {
		const roomId = currentRoomId;

		if (!roomId) {
			await startQueue();

			return;
		}

		actionLoading = 'leave-room-matchmaking';

		try {
			await leavePvpRoom(await $user.token(), roomId);
			await refreshRooms();
			actionLoading = '';
			await startQueue();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : $_('pvp.rooms.leave_failed')
			);
			actionLoading = '';
		}
	}

	async function cancelQueue() {
		actionLoading = 'cancel-matchmaking';

		try {
			const response = await cancelPvpMatchmaking(await $user.token());
			applyMatchmaking(response);
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: $_('pvp.toast.cancel_failed')
			);
		} finally {
			actionLoading = '';
		}
	}

	async function invitePlayer() {
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
				anonymous: anonymousMode,
				mode: selectedMode
			});
			selectedPlayer = null;
			applyInvite(invite, 'outgoingInvite');
			toast.success($_('pvp.toast.invite_sent'));
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: $_('pvp.toast.invite_failed')
			);
		} finally {
			actionLoading = '';
		}
	}

	function getRoomId(room: PvpRoom | PvpRoomInvite | null | undefined) {
		const value = (room as PvpRoom | undefined)?.id
			?? (room as PvpRoomInvite | undefined)?.roomId
			?? null;

		return value === undefined || value === null ? null : value;
	}

	function getRoomTitle(room: PvpRoom | null | undefined) {
		return room?.name || $_('pvp.rooms.untitled');
	}

	function isActiveRoom(room: PvpRoom | null | undefined) {
		return Number(room?.activeMemberCount ?? room?.memberCount ?? 0) >= 1;
	}

	function defaultRoomName() {
		const playerName = $user.data?.name || $_('pvp.rooms.player');

		return $_('pvp.rooms.default_name', { values: { name: playerName } });
	}

	async function createRoom() {
		if (currentRoomId) {
			goto(`/versus/rooms/${currentRoomId}`);

			return;
		}

		actionLoading = 'create-room';

		try {
			const room = await createPvpRoom(await $user.token(), {
				name: defaultRoomName(),
				visibility: 'public'
			});
			await refreshRooms();
			goto(`/versus/rooms/${room.id}`);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : $_('pvp.rooms.create_failed')
			);
		} finally {
			actionLoading = '';
		}
	}

	function viewRoom(room: PvpRoom) {
		const roomId = getRoomId(room);

		if (!roomId) {
			return;
		}

		goto(`/versus/rooms/${roomId}`);
	}

	async function acceptRoomInvite(invite: PvpRoomInvite) {
		const inviteId = invite.id;

		if (!inviteId) {
			return;
		}

		const inviteRoomId = getRoomId(invite);

		if (currentRoomId && (!inviteRoomId || String(currentRoomId) !== String(inviteRoomId))) {
			toast.error($_('pvp.rooms.one_room_only'));

			return;
		}

		actionLoading = `accept-room-${inviteId}`;

		try {
			const room = await acceptPvpRoomInvite(await $user.token(), inviteId);
			await refreshRooms();
			goto(`/versus/rooms/${room.id}`);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : $_('pvp.rooms.accept_failed')
			);
		} finally {
			actionLoading = '';
		}
	}

	async function declineRoomInvite(invite: PvpRoomInvite) {
		const inviteId = invite.id;

		if (!inviteId) {
			return;
		}

		actionLoading = `decline-room-${inviteId}`;

		try {
			await declinePvpRoomInvite(await $user.token(), inviteId);
			await refreshRooms();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : $_('pvp.rooms.decline_failed')
			);
		} finally {
			actionLoading = '';
		}
	}

	function handleRoomCardKeydown(
		event: KeyboardEvent | CustomEvent<KeyboardEvent>,
		room: PvpRoom
	) {
		const keyboardEvent = 'key' in event ? event : event.detail;

		if (keyboardEvent.key !== 'Enter' && keyboardEvent.key !== ' ') {
			return;
		}

		keyboardEvent.preventDefault();
		viewRoom(room);
	}

	async function acceptInvite(invite: PvpInvite) {
		const inviteId = getPvpInviteId(invite);

		if (!inviteId) {
			return;
		}

		actionLoading = `accept-${inviteId}`;

		try {
			const response = await acceptPvpInvite(
				await $user.token(),
				inviteId,
				anonymousMode
			);
			removeInvite(inviteId);
			applyMatch(response as PvpMatch);
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: $_('pvp.toast.accept_failed')
			);
		} finally {
			actionLoading = '';
		}
	}

	async function acceptPendingMatch() {
		if (!pendingMatchId || actionLoading || pendingSelfAccepted) {
			return;
		}

		const matchId = pendingMatchId;
		const matchKey = String(matchId);

		if (acceptingPendingMatchId === matchKey) {
			return;
		}

		acceptingPendingMatchId = matchKey;
		actionLoading = `accept-match-${matchId}`;

		try {
			const response = await acceptPvpMatch(await $user.token(), matchId);
			locallyAcceptedPendingMatchIds = new Set(locallyAcceptedPendingMatchIds)
				.add(matchKey);
			applyMatch(response);

			if (isPvpMatchConfirmedByBoth(response)) {
				matchDialogOpen = false;
				autoRedirectToActiveMatch(response);
			}
		} catch (error) {
			locallyAcceptedPendingMatchIds = new Set(
				[...locallyAcceptedPendingMatchIds].filter((id) => id !== matchKey)
			);

			if (
				error instanceof Error
				&& error.message.toLowerCase()
					.includes('already in a match')
			) {
				await refreshLobby();

				if (isPvpMatchConfirmedByBoth(lobby.activeMatch)) {
					matchDialogOpen = false;
					autoRedirectToActiveMatch(lobby.activeMatch);
				}

				return;
			}

			toast.error(
				error instanceof Error
					? error.message
					: $_('pvp.toast.accept_match_failed')
			);
		} finally {
			if (actionLoading === `accept-match-${matchId}`) {
				actionLoading = '';
			}

			if (acceptingPendingMatchId === matchKey) {
				acceptingPendingMatchId = null;
			}
		}
	}

	async function declineInvite(invite: PvpInvite) {
		const inviteId = getPvpInviteId(invite);

		if (!inviteId) {
			return;
		}

		actionLoading = `decline-${inviteId}`;

		try {
			const invite = await declinePvpInvite(await $user.token(), inviteId);
			applyInvite(invite, 'incomingInvite');
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: $_('pvp.toast.decline_failed')
			);
		} finally {
			actionLoading = '';
		}
	}

	function statusLabel(value: unknown) {
		const status = String(value || 'pending');

		return $_(`pvp.status.${status}`);
	}

	function selectMode(mode: PvpMode) {
		if (actionLoading || activeMatch || isSearching) {
			return;
		}

		selectedMode = mode;
	}

	function inviteName(invite: PvpInvite, direction: 'incoming' | 'outgoing') {
		if (inviteAnonymous(invite, direction)) {
			return $_(
				'pvp.anonymous_player'
			);
		}

		const player = direction === 'incoming'
			? (invite.inviter ?? invite.fromPlayer)
			: (invite.invitee ?? invite.toPlayer);

		return (
			player?.name || player?.uid
			|| (direction === 'incoming' ? invite.from : invite.to) || '--'
		);
	}

	function inviteAnonymous(
		invite: PvpInvite,
		direction: 'incoming' | 'outgoing'
	) {
		return direction === 'incoming'
			? Boolean(invite.inviterAnonymous)
			: Boolean(invite.inviteeAnonymous);
	}

	function remainingLabel(targetMs: number | null, currentNow: number) {
		if (!targetMs) {
			return '--:--';
		}

		const totalSeconds = Math.max(
			0,
			Math.floor((targetMs - currentNow) / 1000)
		);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;

		return `${minutes}:${String(seconds)
			.padStart(2, '0')}`;
	}

	function getFiniteNumber(value: unknown) {
		const numberValue = Number(value);

		return Number.isFinite(numberValue) ? numberValue : null;
	}

	function elapsedLabel(startValue: unknown, currentNow: number) {
		const totalSeconds = Math.max(
			0,
			Math.floor(getElapsedMs(startValue, currentNow) / 1000)
		);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;

		return `${minutes}:${String(seconds)
			.padStart(2, '0')}`;
	}

	function getElapsedMs(startValue: unknown, currentNow: number) {
		if (!startValue) {
			return 0;
		}

		const startMs = new Date(String(startValue))
			.getTime();

		if (!Number.isFinite(startMs)) {
			return 0;
		}

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
		if (!uid) {
			return [];
		}

		const ratedMatches = sortMatches(sourceMatches)
			.filter((match) =>
				getPvpStatus(match, '') === 'completed' && isPvpMatchRanked(match)
			)
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

		if (visibleMatches.length === 0) {
			return [];
		}

		const firstBefore = visibleMatches[0].before;
		const rawRatings = [
			firstBefore ?? visibleMatches[0].after,
			...visibleMatches.map((point) => point.after)
		].filter((rating): rating is number => rating !== null);

		return rawRatings.map((rating, index) => {
			const diff = index === 0
				? null
				: (visibleMatches[index - 1]?.diff ?? null);

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

	function getCurrentWeeklyRacePoints(
		race: PvpWeeklyRace,
		uid: string | null | undefined,
		sourceMatches: PvpMatch[]
	) {
		if (!uid) {
			return 0;
		}

		const row = race.leaderboard.find((entry) => {
			const player = entry.player ?? entry.players;

			return entry.uid === uid || player?.uid === uid || player?.id === uid;
		});

		if (row) {
			return Number(row.points ?? 0);
		}

		if (race.currentPlayer) {
			return Number(race.currentPlayer.points ?? 0);
		}

		const week = race.currentWeek ?? race.week;
		const weekStartMs = week?.weekStartAt ?? week?.week_start_at;
		const weekEndMs = week?.weekEndAt ?? week?.week_end_at;
		const startMs = weekStartMs ? new Date(weekStartMs)
			.getTime() : null;
		const endMs = weekEndMs ? new Date(weekEndMs)
			.getTime() : null;

		if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
			return 0;
		}

		const scoringReasons = new Set([
			'completion',
			'progress',
			'time_reached',
			'resignation',
			'forfeit'
		]);

		return sourceMatches.filter((match) => {
			const endedMs = getPvpMatchEndMs(match);
			const reason = getPvpResultReason(match) ?? '';

			return (
				getPvpStatus(match, '') === 'completed'
				&& isPvpMatchRanked(match)
				&& getPvpWinnerUid(match) === uid
				&& endedMs !== null
				&& endedMs >= startMs!
				&& endedMs < endMs!
				&& scoringReasons.has(reason)
			);
		}).length;
	}

	function getEloGraphChartData(points: EloGraphPoint[]): EloGraphChartData {
		const ratings = points.map((point) => Math.round(point.rating));
		const bounds = ratings.length
			? getRatingBounds(ratings)
			: { min: 0, max: 0 };

		return {
			labels: points.map((point) =>
				point.index === 0 ? $_('pvp.elo_graph.start') : String(point.index)
			),
			ratings,
			diffs: points.map((
				point
			) => (point.diff === null ? null : Math.round(point.diff))),
			min: bounds.min,
			max: bounds.max
		};
	}

	function eloDeltaLabel(value: number | null) {
		if (value === null) {
			return '--';
		}

		return `${value > 0 ? '+' : ''}${value}`;
	}

	function chartColor(cssVariable: string, fallback: string) {
		if (!browser) {
			return fallback;
		}

		const value = getComputedStyle(document.documentElement)
			.getPropertyValue(
				cssVariable
			)
			.trim();

		return value ? `hsl(${value})` : fallback;
	}

	function chartAlphaColor(cssVariable: string, alpha: number, fallback: string) {
		if (!browser) {
			return fallback;
		}

		const value = getComputedStyle(document.documentElement)
			.getPropertyValue(
				cssVariable
			)
			.trim();

		return value ? `hsl(${value} / ${alpha})` : fallback;
	}

	function createEloChart(node: HTMLCanvasElement, data: EloGraphChartData) {
		let chart: Chart<'line', number[], string> | null = buildEloChart(
			node,
			data
		);

		return {
			update(nextData: EloGraphChartData) {
				if (!chart) {
					chart = buildEloChart(node, nextData);

					return;
				}

				chart.data.labels = nextData.labels;
				chart.data.datasets[0].data = nextData.ratings;
				chart.data.datasets[0].pointRadius = getEloPointRadii(
					nextData.ratings
				);
				chart.options.scales!.y!.min = nextData.min;
				chart.options.scales!.y!.max = nextData.max;
				chart.options.plugins!.tooltip!.callbacks!.label =
					getEloTooltipLabel(nextData);
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
						backgroundColor: chartAlphaColor(
							'--primary',
							0.12,
							'rgba(37, 99, 235, 0.12)'
						),
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
							color: chartAlphaColor(
								'--border',
								0.85,
								'rgba(161, 161, 170, 0.4)'
							)
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

								return index === 0
									? $_('pvp.elo_graph.start')
									: `${$_('pvp.match')} ${index}`;
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
		return (context: { dataIndex: number; parsed: { y: number; }; }) => {
			const diff = data.diffs[context.dataIndex];
			const rating = context.parsed.y;

			if (diff === null || diff === undefined) {
				return `${$_('pvp.pvp_rating')}: ${rating}`;
			}

			return [`${$_('pvp.pvp_rating')}: ${rating}`, eloDeltaLabel(diff)];
		};
	}
</script>

<svelte:head>
  <title>{$_('pvp.lobby_title')} - {$_('head.site_name')}</title>
  <meta name="description" content={$_('pvp.play_meta_description')} />
  <link rel="canonical" href={playUrl} />
</svelte:head>

<main class="arena-page">
  {#if showGeodeAlert}
    <Alert.Root
      class="relative mb-3 border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/40"
    >
      <Alert.Title class="pr-8">{$_('pvp.geode_alert.title')}</Alert.Title>
      <Alert.Description class="pr-8">
        {$_('pvp.geode_alert.description')}
        <a href="/geode-mods" class="ml-1 font-semibold underline">
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
        <a
          class="inline-link"
          href={`/versus/matches/${getPvpMatchId(activeMatch)}`}
        >{$_('pvp.enter_match')}</a>
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
  </section>

  <div class="pvp-ad-slot">
    <Ads dataAdFormat="auto" />
  </div>

  <Tabs.Root bind:value={activePvpTab}>
    <Tabs.List class="py-[22px]" aria-label={$_('pvp.tabs.label')}>
      <button
        type="button"
        class="pvp-main-tab"
        class:active={activePvpTab !== 'rooms'}
        on:click={() => (activePvpTab = 'lobby')}
      >
        <Swords class="h-4 w-4" />
        {$_('pvp.tabs.matchmaking')}
      </button>
      <button
        type="button"
        class="pvp-main-tab"
        class:active={activePvpTab === 'rooms'}
        on:click={() => (activePvpTab = 'rooms')}
      >
        <Users class="h-4 w-4" />
        {$_('pvp.tabs.custom_room')}
      </button>
    </Tabs.List>

    {#if activePvpTab !== 'rooms'}
      <Tabs.List class="py-[22px]" aria-label={$_('pvp.tabs.matchmaking')}>
        <Tabs.Trigger value="lobby" class="pvp-tab-trigger">
          <Swords class="h-4 w-4" />
          {$_('pvp.tabs.lobby')}
        </Tabs.Trigger>
        <Tabs.Trigger value="history" class="pvp-tab-trigger">
          <History class="h-4 w-4" />
          {$_('pvp.tabs.history')}
        </Tabs.Trigger>
        <Tabs.Trigger value="weekly-race" class="pvp-tab-trigger">
          <CalendarDays class="h-4 w-4" />
          {$_('pvp.tabs.weekly_race')}
        </Tabs.Trigger>
        <Tabs.Trigger value="clan-race" class="pvp-tab-trigger">
          <Users class="h-4 w-4" />
          {$_('pvp.tabs.clan_race')}
        </Tabs.Trigger>
        <Tabs.Trigger value="leaderboard" class="pvp-tab-trigger">
          <Trophy class="h-4 w-4" />
          {$_('pvp.tabs.leaderboard')}
        </Tabs.Trigger>
        <Tabs.Trigger value="rules" class="pvp-tab-trigger">
          <BookOpen class="h-4 w-4" />
          {$_('pvp.tabs.rules')}
        </Tabs.Trigger>
      </Tabs.List>
    {/if}

    <Tabs.Content value="weekly-race">
      <WeeklyRaceTab
        {weeklyRace}
        currentUid={currentUid ?? null}
        currentPlayer={$user.data ?? null}
        loading={weeklyRaceLoading}
        error={weeklyRaceError}
        page={weeklyRacePage}
        total={weeklyRaceTotal}
        pageSize={PVP_STANDINGS_PAGE_SIZE}
        {now}
        onRefresh={refreshWeeklyRace}
        onPageChange={setWeeklyRacePage}
      />
    </Tabs.Content>

    <Tabs.Content value="clan-race">
      <ClanWeeklyRaceTab
        {clanRace}
        currentClan={currentUserClan}
        loading={clanRaceLoading}
        error={clanRaceError}
        page={clanRacePage}
        total={clanRaceTotal}
        pageSize={PVP_STANDINGS_PAGE_SIZE}
        {now}
        onRefresh={refreshClanRace}
        onPageChange={setClanRacePage}
      />
    </Tabs.Content>

    <Tabs.Content value="history">
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
        <section class="history-toolbar">
          <div>
            <h2>{$_('pvp.matches_title')}</h2>
          </div>
          <div class="history-actions">
            <Tabs.Root bind:value={historyMode}>
              <Tabs.List
                class="mode-filter-list"
                aria-label={$_('pvp.mode_label')}
              >
                {#each PVP_MODES as mode}
                  <Tabs.Trigger value={mode} class="mode-filter-trigger">
                    {$_(`pvp.mode.${mode}`)}
                  </Tabs.Trigger>
                {/each}
              </Tabs.List>
            </Tabs.Root>
            <Button
              variant="outline"
              aria-pressed={hideOpponentInfo}
              on:click={() => (hideOpponentInfo = !hideOpponentInfo)}
            >
              {#if hideOpponentInfo}
                <Eye class="mr-2 h-4 w-4" />
                {$_('pvp.show_opponent_info')}
              {:else}
                <EyeOff class="mr-2 h-4 w-4" />
                {$_('pvp.hide_opponent_info')}
              {/if}
            </Button>
            <Button
              variant="outline"
              disabled={matchHistoryLoading}
              on:click={refreshMatchHistory}
            >
              <RefreshCw
                class={`mr-2 h-4 w-4 ${matchHistoryLoading ? 'animate-spin' : ''}`}
              />
              {$_('pvp.refresh')}
            </Button>
          </div>
        </section>

        <section class="match-section">
          <div class="match-section-title">
            <Swords class="h-5 w-5" />
            <h2>{$_('pvp.ongoing_matches')}</h2>
          </div>
          {#if ongoingHistoryMatches.length === 0}
            <div class="empty-state">{$_('pvp.no_ongoing_matches')}</div>
          {:else}
            <div class="match-grid">
              {#each ongoingHistoryMatches as match}
                <MatchCard
                  {match}
                  {currentUid}
                  {now}
                  {hideOpponentInfo}
                  hideLevelUntilConfirmed
                  href={`/versus/matches/${getPvpMatchId(match)}`}
                />
              {/each}
            </div>
          {/if}
        </section>

        <section class="match-section">
          <div class="match-section-title">
            <h2>{$_('pvp.past_matches')}</h2>
          </div>
          {#if pastHistoryMatches.length === 0}
            <div class="empty-state">{$_('pvp.no_past_matches')}</div>
          {:else}
            <div class="match-grid">
              {#each pastHistoryMatches as match}
                <MatchCard
                  {match}
                  {currentUid}
                  {now}
                  {hideOpponentInfo}
                  hideLevelUntilConfirmed
                  href={`/versus/matches/${getPvpMatchId(match)}`}
                />
              {/each}
            </div>
          {/if}
        </section>
      {/if}
    </Tabs.Content>

    <Tabs.Content value="leaderboard">
      <PvpLeaderboardTab
        {leaderboard}
        mode={leaderboardMode}
        loading={leaderboardLoading}
        error={leaderboardError}
        page={leaderboardPage}
        total={leaderboardTotal}
        pageSize={PVP_STANDINGS_PAGE_SIZE}
        onModeChange={(mode) => {
            leaderboardMode = mode;
            leaderboardPage = 1;
        }}
        onRefresh={refreshLeaderboard}
        onPageChange={(page) => {
            leaderboardPage = page;
        }}
      />
    </Tabs.Content>

    <Tabs.Content value="rules">
      <section class="rules-section">
        <Card.Root>
          <Card.Header>
            <Card.Title class="rules-title">
              <BookOpen class="h-5 w-5" />
              {$_('pvp.rules.title')}
            </Card.Title>
            <Card.Description>{$_('pvp.rules.description')}</Card.Description>
          </Card.Header>
          <Card.Content>
            <div class="rules-note">{$_('pvp.rules.unlock_note')}</div>
            <div
              class="rank-rules-table"
              role="table"
              aria-label={$_('pvp.rules.title')}
            >
              <div class="rank-rules-row rank-rules-head" role="row">
                <span role="columnheader">{$_('pvp.rules.rank')}</span>
                <span role="columnheader">{$_('pvp.rules.condition')}</span>
              </div>
              {#each PVP_RANKS as rank}
                <div class="rank-rules-row" role="row">
                  <span role="cell">
                    <span class="pvp-rank-preview" style={rank.badgeStyle}>
                      {rank.label}
                    </span>
                  </span>
                  <span role="cell">{rankConditionLabel(rank)}</span>
                </div>
              {/each}
            </div>
          </Card.Content>
        </Card.Root>
      </section>
    </Tabs.Content>

    <Tabs.Content value="rooms">
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
        <section class="rooms-toolbar">
          <div>
            <h2>{$_('pvp.rooms.title')}</h2>
          </div>
          <Button variant="outline" disabled={roomsLoading} on:click={refreshRooms}>
            <RefreshCw class={`mr-2 h-4 w-4 ${roomsLoading ? 'animate-spin' : ''}`} />
            {$_('pvp.refresh')}
          </Button>
        </section>

        <section class="room-create-panel">
          <Button disabled={Boolean(actionLoading)} on:click={createRoom}>
            {#if actionLoading === 'create-room'}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            {:else}
              <Plus class="mr-2 h-4 w-4" />
            {/if}
            {$_('pvp.rooms.create')}
          </Button>
        </section>

        <section class="room-section">
          <div class="match-section-title">
            <h2>{$_('pvp.rooms.joined')}</h2>
          </div>
          {#if activeJoinedRooms.length === 0}
            <div class="empty-state">{$_('pvp.rooms.no_joined')}</div>
          {:else}
            <div class="room-grid">
              {#each activeJoinedRooms as room}
                {@const activeRoomMatchId = getPvpMatchId(room.activeMatch)}
                <Card.Root
                  class="room-card current-room-card clickable-room-card"
                  role="button"
                  tabindex="0"
                  on:click={() => viewRoom(room)}
                  on:keydown={(event) => handleRoomCardKeydown(event, room)}
                >
                  <Card.Header>
                    <Card.Title>{getRoomTitle(room)}</Card.Title>
                    <Card.Description>
                      {room.activeMemberCount ?? room.memberCount ?? 0}
                      {$_('pvp.rooms.players')}
                    </Card.Description>
                  </Card.Header>
                  <Card.Content class="room-card-content">
                    <div class="room-card-badges">
                      <Badge variant="outline">
                        {room.visibility === 'private'
                          ? $_('pvp.rooms.private')
                          : $_('pvp.rooms.public')}
                      </Badge>
                      {#if room.viewerRole === 'host'}
                        <Badge>{$_('pvp.rooms.host')}</Badge>
                      {/if}
                      {#if activeRoomMatchId}
                        <Badge variant="secondary">{$_('pvp.rooms.active_match')}</Badge>
                      {/if}
                    </div>
                    {#if activeRoomMatchId}
                      <div class="room-card-actions">
                        <Button
                          href={`/versus/matches/${activeRoomMatchId}`}
                          on:click={(event) => event.stopPropagation()}
                        >
                          {$_('pvp.enter_match')}
                        </Button>
                      </div>
                    {/if}
                  </Card.Content>
                </Card.Root>
              {/each}
            </div>
          {/if}
        </section>

        <section class="room-section">
          <div class="match-section-title">
            <h2>{$_('pvp.rooms.invites')}</h2>
          </div>
          {#if roomsOverview.invites.length === 0}
            <div class="empty-state">{$_('pvp.rooms.no_invites')}</div>
          {:else}
            <div class="invite-list">
              {#each roomsOverview.invites as invite}
                <div class="invite-row">
                  <div>
                    <strong>{getRoomTitle(invite.room)}</strong>
                    <span>{invite.inviter?.name ?? $_('pvp.rooms.host')}</span>
                  </div>
                  <div class="invite-actions">
                    <span class="timer">{remainingLabel(getPvpInviteExpiresMs(invite), now)}</span>
                    <Button
                      size="sm"
                      disabled={Boolean(actionLoading)}
                      on:click={() => acceptRoomInvite(invite)}
                    >
                      {#if actionLoading === `accept-room-${invite.id}`}
                        <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                      {/if}
                      {$_('pvp.accept')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={Boolean(actionLoading)}
                      on:click={() => declineRoomInvite(invite)}
                    >
                      {$_('pvp.decline')}
                    </Button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </section>

        <section class="room-section">
          <div class="match-section-title">
            <h2>{$_('pvp.rooms.public_rooms')}</h2>
          </div>
          {#if activePublicRooms.length === 0}
            <div class="empty-state">{$_('pvp.rooms.no_public')}</div>
          {:else}
            <div class="room-grid">
              {#each activePublicRooms as room}
                {@const alreadyJoined = activeJoinedRooms.some((joined) =>
                    String(joined.id) === String(room.id)
                )}
                <Card.Root
                  class="room-card clickable-room-card"
                  role="button"
                  tabindex="0"
                  on:click={() => viewRoom(room)}
                  on:keydown={(event) => handleRoomCardKeydown(event, room)}
                >
                  <Card.Header>
                    <Card.Title>{getRoomTitle(room)}</Card.Title>
                    <Card.Description>
                      {room.activeMemberCount ?? room.memberCount ?? 0}
                      {$_('pvp.rooms.players')}
                    </Card.Description>
                  </Card.Header>
                  <Card.Content class="room-card-content">
                    <div class="room-card-badges">
                      <Badge variant="outline">{$_('pvp.rooms.public')}</Badge>
                      {#if room.activeMatch}
                        <Badge variant="secondary">{$_('pvp.rooms.active_match')}</Badge>
                      {/if}
                    </div>
                    {#if alreadyJoined}
                      <div class="room-card-actions">
                        <span>{$_('pvp.rooms.current_room')}</span>
                      </div>
                    {/if}
                  </Card.Content>
                </Card.Root>
              {/each}
            </div>
          {/if}
        </section>
      {/if}
    </Tabs.Content>

    <Tabs.Content value="lobby">
      <PvpDialogs
        bind:matchDialogOpen
        {pendingMatch}
        {pendingMatchId}
        {pendingSelfAccepted}
        {actionLoading}
        {now}
        onAcceptPendingMatch={acceptPendingMatch}
      />

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
              <a href={`/versus/matches/${getPvpMatchId(activeMatch)}`}>{
                $_('pvp.enter_match')
              }</a>
            </div>
            <MatchCard
              match={activeMatch}
              {currentUid}
              {now}
              {hideOpponentInfo}
              href={`/versus/matches/${getPvpMatchId(activeMatch)}`}
            />
          </section>
        {/if}

        <section class="rating-start-section">
          <Collapsible.Root bind:open={summaryOpen}>
            <Card.Root
              class={`summary-card ${summaryOpen ? 'is-open' : 'is-collapsed'}`}
              on:click={() => {
                  if (!summaryOpen) {
 summaryOpen = true;
}
              }}
            >
              <Card.Header>
                <Button
                  type="button"
                  variant="ghost"
                  class="summary-trigger !h-auto !w-full !justify-between !p-0 !text-left hover:!bg-transparent hover:!text-current focus-visible:!ring-0 focus-visible:!ring-offset-0"
                  aria-expanded={summaryOpen}
                  aria-controls="pvp-summary-panel"
                  on:click={(event) => {
                      event.stopPropagation();
                      summaryOpen = !summaryOpen;
                  }}
                >
                  <div class="summary-trigger-main">
                    <Card.Title>{$_('pvp.summary')}</Card.Title>
                  </div>
                  <span
                    class="summary-indicator"
                    aria-hidden="true"
                    class:isOpen={summaryOpen}
                  >
                    <ChevronRight class="h-4 w-4" />
                  </span>
                </Button>
              </Card.Header>
              <Card.Content>
                <div class="summary-stats">
                  <div style={pvpRank?.summaryStyle ?? ''}>
                    <span>{$_('pvp.current_elo')}</span>
                    <strong class="summary-rating-value">
                      {#if pvpRank}
                        <span
                          class="summary-rating-rank-badge"
                          style={pvpRank.badgeStyle}
                        >
                          {pvpRank.label}
                        </span>
                      {/if}
                      <span>{pvpRatingLabel}</span>
                    </strong>
                    {#if showRatingUnlockProgress}
                      <div class="rating-unlock-progress">
                        <div class="rating-unlock-progress-track">
                          <span style={`width: ${ratingUnlockProgress}%`}></span>
                        </div>
                        <small>
                          {
                            $_('pvp.rating_unlock_progress', {
                                values: {
                                    progress: ratingUnlockProgress
                                }
                            })
                          }
                        </small>
                      </div>
                    {:else if pvpRankProgress}
                      <div class="rating-unlock-progress">
                        <div class="rating-unlock-progress-track">
                          <span
                            style={`width: ${pvpRankProgress.progress}%; ${pvpRankProgress.currentRank.progressStyle}`}
                          ></span>
                        </div>
                        <small>
                          {#if pvpRankProgress.nextRank}
                            {
                              $_('pvp.rank_progress_next', {
                                  values: {
                                      progress: pvpRankProgress.progress,
                                      rank: pvpRankProgress.nextRank.label
                                  }
                              })
                            }
                          {:else}
                            {$_('pvp.rank_progress_max')}
                          {/if}
                        </small>
                      </div>
                    {/if}
                  </div>
                  <div>
                    <span>{$_('pvp.result.win')} / {
                        $_('pvp.result.loss')
                      }</span>
                    <strong>{pvpWinLossStats.wins} / {
                        pvpWinLossStats.losses
                      }</strong>
                  </div>
                  <div>
                    <span>{$_('pvp.weekly_race_points')}</span>
                    <strong>{currentWeeklyRacePoints}</strong>
                  </div>
                </div>
                <Collapsible.Content id="pvp-summary-panel">
                  <div class="elo-graph-panel">
                    <div class="elo-graph-toolbar">
                      <div>
                        <strong>{$_('pvp.elo_graph.title')}</strong>
                        <span>
                          {
                            $_('pvp.elo_graph.summary', {
                                values: {
                                    count: eloGraphMatchCount,
                                    delta: eloDeltaLabel(eloGraphDelta)
                                }
                            })
                          }
                        </span>
                      </div>
                      <Tabs.Root bind:value={eloGraphFilter}>
                        <Tabs.List
                          aria-label={$_('pvp.elo_graph.filter')}
                        >
                          {#each ELO_GRAPH_FILTERS as filter}
                            <Tabs.Trigger
                              value={filter.key}
                              class="elo-filter-trigger"
                            >
                              {$_(`pvp.elo_graph.filters.${filter.key}`)}
                            </Tabs.Trigger>
                          {/each}
                        </Tabs.List>
                      </Tabs.Root>
                    </div>
                    {#if eloGraphDisabled}
                      <div class="elo-graph-empty">
                        {$_('pvp.elo_graph.need_stable_rating')}
                      </div>
                    {:else if eloGraphPoints.length > 1}
                      <div class="elo-chart-wrapper">
                        <canvas
                          use:createEloChart={eloGraphChartData}
                          aria-label={$_('pvp.elo_graph.title')}
                        />
                      </div>
                    {:else}
                      <div class="elo-graph-empty">
                        {$_('pvp.elo_graph.empty')}
                      </div>
                    {/if}
                  </div>
                </Collapsible.Content>
              </Card.Content>
            </Card.Root>
          </Collapsible.Root>
        </section>

        {#if requiredSubmission && !activeMatch}
          <Alert.Root class="pvp-required-submission-alert">
            <ShieldAlert class="h-4 w-4" />
            <Alert.Title>{$_('pvp.required_submission.title')}</Alert.Title>
            <Alert.Description>
              <div class="required-submission-content">
                <span>
                  {
                    $_('pvp.required_submission.description', {
                        values: {
                            level: ''
                        }
                    })
                  }
                  {#if requiredSubmissionLevelUrl}
                    <a href={requiredSubmissionLevelUrl} class="required-level-link">
                      {requiredSubmissionLevelLabel}
                    </a>
                  {:else}
                    {requiredSubmissionLevelLabel}
                  {/if}
                </span>
                <Button href={requiredSubmissionUrl} size="sm">
                  {$_('pvp.required_submission.submit')}
                </Button>
              </div>
            </Alert.Description>
          </Alert.Root>
        {/if}

        <section class="control-grid">
          <Card.Root>
            <Card.Header>
              <Card.Title>{$_('pvp.options')}</Card.Title>
            </Card.Header>
            <Card.Content>
              <div class="anonymous-row">
                <div>
                  <strong>{$_('pvp.mode_label')}</strong>
                </div>
                <div
                  class="mode-toggle-group"
                  aria-label={$_('pvp.mode_label')}
                >
                  <button
                    type="button"
                    class:active={selectedMode === 'classic'}
                    disabled={Boolean(actionLoading || activeMatch || isSearching)}
                    on:click={() => selectMode('classic')}
                  >
                    {$_('pvp.mode.classic')}
                  </button>
                  <button
                    type="button"
                    class:active={selectedMode === 'platformer'}
                    disabled={Boolean(actionLoading || activeMatch || isSearching)}
                    on:click={() => selectMode('platformer')}
                  >
                    {$_('pvp.mode.platformer')}
                  </button>
                </div>
              </div>
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
                {
                  activeMatch
                  ? $_('pvp.active_match')
                  : isSearching
                  ? $_('pvp.searching_state')
                  : $_('pvp.queue_state_idle')
                }
              </Card.Description>
            </Card.Header>
            <Card.Content class="action-panel">
              {#if checkingLobby}
                <div
                  class="matchmaking-skeleton"
                  aria-label={$_('general.loading')}
                >
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
              {:else if activeMatch}
                <Button
                  on:click={() => navigateToMatch(getPvpMatchId(activeMatch))}
                >
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
                      {
                        $_('pvp.search_range', {
                            values: { range: currentSearchRange }
                        })
                      }
                    </span>
                  {/if}
                </div>
                {#if showSlowSearchAlert}
                  <div class="queue-hint">
                    {$_('pvp.search_slow_hint')}
                  </div>
                {/if}
                <Button
                  variant="outline"
                  disabled={Boolean(actionLoading)}
                  on:click={cancelQueue}
                >
                  {#if actionLoading === 'cancel-matchmaking'}
                    <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                  {/if}
                  {$_('pvp.cancel_search')}
                </Button>
              {:else}
                <Button disabled={rankedQueueDisabled} on:click={startQueue}>
                  {#if actionLoading === 'matchmaking'}
                    <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                  {:else}
                    <Users class="mr-2 h-4 w-4" />
                  {/if}
                  {$_('pvp.start_matchmaking')}
                </Button>
                {#if currentRoom}
                  <Button
                    variant="outline"
                    disabled={Boolean(actionLoading)}
                    on:click={leaveRoomAndStartQueue}
                  >
                    {#if actionLoading === 'leave-room-matchmaking'}
                      <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                    {/if}
                    {$_('pvp.rooms.leave_and_start_matchmaking')}
                  </Button>
                  <div class="queue-hint">{$_('pvp.rooms.queue_blocked')}</div>
                {/if}
              {/if}
              {#if selectedMode === 'platformer'}
                <div class="platformer-pool-link" style="margin-top: 8px">
                  <Button
                    href="/lists/159"
                    variant="outline"
                    size="sm"
                    class="w-full"
                  >
                    {$_('pvp.view_platformer_pool')}
                  </Button>
                </div>
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
              <Button
                disabled={controlsDisabled || !selectedPlayer}
                on:click={invitePlayer}
              >
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
                        <span class="timer">{
                          remainingLabel(getPvpInviteExpiresMs(invite), now)
                        }</span>
                        <Button
                          size="sm"
                          disabled={Boolean(actionLoading)}
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
                  <RefreshCw
                    class={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                  />
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
                        <Badge
                          variant={getPvpStatus(invite) === 'pending' ? 'default' : 'secondary'}
                        >
                          {statusLabel(getPvpStatus(invite))}
                        </Badge>
                        {#if getPvpStatus(invite) === 'pending'}
                          <span class="timer">{
                            remainingLabel(getPvpInviteExpiresMs(invite), now)
                          }</span>
                        {/if}
                        {#if getPvpMatchedMatchId(invite)}
                          <a
                            class="inline-link"
                            href={`/versus/matches/${getPvpMatchedMatchId(invite)}`}
                          >
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
.history-toolbar,
.rooms-toolbar,
.history-actions,
.match-section-title,
.section-heading,
.queue-status,
.invite-actions,
.room-card-actions,
.room-card-badges {
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

.inline-link,
.section-heading a {
  border-radius: 6px;
  color: hsl(var(--primary));
  font-weight: 700;
  text-decoration: none;
}

.inline-link:hover,
.section-heading a:hover {
  text-decoration: underline;
}

:global(.state-panel),
.active-section,
.rating-start-section {
  margin-bottom: 20px;
}

.pvp-ad-slot {
  margin-bottom: 0;
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
  padding-block: 20px !important;
  padding-inline: 4px;
}

:global(.pvp-main-tab-list),
:global(.pvp-sub-tab-list) {
  display: inline-flex;
  width: auto;
  height: auto;
  margin-bottom: 12px;
  gap: 4px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--muted) / 0.28);
  padding-block: 3px !important;
  padding-inline: 4px;
}

:global(.pvp-sub-tab-list) {
  margin-bottom: 20px;
}

.pvp-main-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 36px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  padding-inline: 14px;
  color: hsl(var(--muted-foreground));
  font-size: 14px;
  font-weight: 500;
}

.pvp-main-tab.active {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  box-shadow: 0 1px 2px hsl(var(--foreground) / 0.08);
}

:global(.pvp-tab-trigger) {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding-inline: 14px;
}

:global(.mode-filter-list) {
  display: inline-grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  width: auto;
  height: auto;
  min-width: 220px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--muted) / 0.28);
  padding: 3px;
}

:global(.mode-filter-trigger) {
  min-height: 32px;
  padding-inline: 12px;
}

.rules-section {
  margin-bottom: 20px;
}

:global(.rules-title) {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.rules-note {
  margin-bottom: 14px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--muted) / 0.28);
  padding: 12px 14px;
  color: hsl(var(--muted-foreground));
  font-size: 13px;
  line-height: 1.45;
}

.rank-rules-table {
  display: grid;
  overflow: hidden;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.rank-rules-row {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  min-height: 48px;
  border-top: 1px solid hsl(var(--border));
  padding: 10px 14px;
}

.rank-rules-row:first-child {
  border-top: 0;
}

.rank-rules-head {
  min-height: 38px;
  background: hsl(var(--muted) / 0.35);
  color: hsl(var(--muted-foreground));
  font-size: 12px;
  font-weight: 750;
  text-transform: uppercase;
}

.pvp-rank-preview {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  min-height: 22px;
  border-radius: 5px;
  padding-inline: 8px;
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
}

.history-toolbar {
  margin-bottom: 20px;
}

.history-toolbar h2,
.rooms-toolbar h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 750;
}

.history-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.match-section {
  margin-top: 24px;
}

.match-section-title {
  justify-content: flex-start;
  margin-bottom: 12px;
}

.match-section-title h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 750;
}

.match-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.rooms-toolbar,
.room-create-panel,
.room-section {
  margin-bottom: 20px;
}

.room-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

:global(.room-card) {
  overflow: hidden;
}

:global(.clickable-room-card) {
  cursor: pointer;
  transition:
    border-color 120ms ease,
    box-shadow 120ms ease,
    transform 120ms ease;
}

:global(.clickable-room-card:hover),
:global(.clickable-room-card:focus-visible) {
  border-color: hsl(var(--primary) / 0.42);
  box-shadow: 0 8px 18px hsl(var(--foreground) / 0.08);
  outline: none;
  transform: translateY(-1px);
}

:global(.current-room-card) {
  grid-column: 1 / -1;
}

:global(.room-card-content) {
  display: grid;
  gap: 14px;
}

.room-card-badges,
.room-card-actions {
  flex-wrap: wrap;
  justify-content: flex-start;
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

:global(.summary-card.is-collapsed) {
  cursor: pointer;
}

:global(.summary-trigger) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: auto;
  padding: 0;
  text-align: left;
}

.summary-trigger-main {
  display: grid;
  gap: 6px;
}

.summary-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: hsl(var(--muted-foreground));
  transition: transform 150ms ease;
}

.summary-indicator.isOpen {
  transform: rotate(90deg);
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.summary-stats > div {
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  padding: 12px 14px;
}

.summary-stats span,
.summary-stats strong {
  display: block;
}

.summary-stats span {
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}

.summary-stats strong {
  margin-top: 4px;
  color: hsl(var(--foreground));
  font-size: 1.4rem;
  line-height: 1;
}

.summary-stats .summary-rating-value {
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-rating-value span {
  color: inherit;
}

.summary-rating-rank-badge {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  min-height: 20px;
  border-radius: 5px;
  padding-inline: 7px;
  font-size: 11px !important;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
}

.rating-unlock-progress {
  display: grid;
  gap: 6px;
  margin-top: 10px;
}

.rating-unlock-progress-track {
  overflow: hidden;
  height: 6px;
  border-radius: 999px;
  background: hsl(var(--muted));
}

.rating-unlock-progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: hsl(var(--primary));
}

.rating-unlock-progress small {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
  line-height: 1.35;
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

.mode-toggle-group {
  display: inline-grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  min-width: 190px;
  overflow: hidden;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--muted) / 0.35);
  padding: 3px;
}

.mode-toggle-group button {
  min-height: 32px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  padding: 0 10px;
  color: hsl(var(--muted-foreground));
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.mode-toggle-group button.active {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  box-shadow: 0 1px 2px hsl(var(--foreground) / 0.08);
}

.mode-toggle-group button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
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

:global(.pvp-required-submission-alert) {
  margin-bottom: 16px;
}

.required-submission-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.required-submission-content span {
  line-height: 1.45;
}

.required-level-link {
  color: hsl(var(--primary));
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
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
  .invite-grid,
  .match-grid,
  .room-grid {
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
  .history-toolbar,
  .rooms-toolbar,
  .history-actions,
  .invite-row,
  .invite-actions,
  .room-card-actions,
  .room-card-badges {
    align-items: stretch;
    flex-direction: column;
  }

  .elo-graph-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .summary-stats {
    grid-template-columns: 1fr;
  }

  :global(.elo-filter-group) {
    width: 100%;
    min-width: 0;
  }

  :global(.mode-filter-list) {
    width: 100%;
    min-width: 0;
  }

  :global(.pvp-tab-list) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
  }

  .rank-rules-row {
    grid-template-columns: 86px minmax(0, 1fr);
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
