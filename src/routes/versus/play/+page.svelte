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
	import PvpMissionsTab from './PvpMissionsTab.svelte';
	import WeeklyRaceTab from './WeeklyRaceTab.svelte';
	import { user } from '$lib/client';
	import supabase from '$lib/client/supabase';
	import { showXpAwardToast } from '$lib/client/xpToast';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import * as Alert from '$lib/components/ui/alert';
	import * as Card from '$lib/components/ui/card';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import * as Tabs from '$lib/components/ui/tabs';
	import Chart from 'chart.js/auto';
	import {
		acceptPvpMatch,
		cancelPvpMatchmaking,
		claimPvpMission,
		checkPvpMatchmaking,
		acceptPvpRoomInvite,
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
		getPvpEventRace,
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
		getPvpMissions,
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
		recordPvpMissionVisit,
		sendPvpInvite,
		startPvpMatchmaking,
		type PvpClan,
		type PvpInvite,
		type PvpClanWeeklyRace,
		type PvpLeaderboardPlayer,
		type PvpMatch,
		type PvpMatchmakingRequest,
		type PvpMe,
		type PvpMission,
		type PvpMode,
		type PvpSelectionMode,
		type PvpEvent,
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
		Heart,
		Info,
		Lightbulb,
		Loader2,
		LogIn,
		Plus,
		RefreshCw,
		Send,
		ShieldAlert,
		Swords,
		Target,
		Trophy,
		Users,
		X
	} from 'lucide-svelte';

	const PVP_GEODE_ALERT_DISMISSED_KEY = 'gdvn:pvp-geode-alert-dismissed';
	const PVP_ANONYMOUS_MODE_KEY = 'gdvn:pvp-anonymous-mode';
	const PVP_ANONYMOUS_REVEAL_AFTER_MATCH_END_KEY =
		'gdvn:pvp-anonymous-reveal-after-match-end';
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
	const PVP_SUPPORTER_TIP_CHANCE = 0.1;
	const PVP_TIP_KEYS = [
		'tip_1',
		'tip_2',
		'tip_3',
		'tip_4',
		'tip_5',
		'tip_6',
		'tip_7',
		'tip_8',
		'tip_9',
		'tip_10',
		'tip_11',
		'tip_12'
	] as const;
	type PvpTip =
		| { type: 'normal'; key: (typeof PVP_TIP_KEYS)[number] }
		| { type: 'supporter' };
	type PvpNavGroup = 'play' | 'missions' | 'progress' | 'rankings' | 'info';
	let selectedPlayer: any = null;
	let selectedMode: PvpSelectionMode = 'classic';
	let historyMode: PvpMode = 'classic';
	let leaderboardMode: PvpMode = 'classic';
	let anonymousMode = false;
	let anonymousRevealAfterMatchEnd = false;
	let hideOpponentInfo = false;
	let anonymousModeReady = false;
	let lobby: PvpMe = {
		activeMatch: null,
		matchmaking: null,
		requiredSubmission: null,
		activePvpEvent: null,
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
	let eventRace: PvpWeeklyRace = {
		week: null,
		currentWeek: null,
		previousWeek: null,
		leaderboard: [],
		previousLeaderboard: [],
		currentPlayer: null
	};
	let eventRacePage = 1;
	let eventRaceTotal = 0;
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
	let pvpMissions: PvpMission[] = [];
	let activePvpTab = 'lobby';
	let eloGraphFilter: (typeof ELO_GRAPH_FILTERS)[number]['key'] = '25';
	let summaryOpen = false;
	let loading = false;
	let matchHistoryLoading = false;
	let leaderboardLoading = true;
	let leaderboardError = '';
	let weeklyRaceLoading = true;
	let weeklyRaceError = '';
	let eventRaceLoading = false;
	let eventRaceError = '';
	let clanRaceLoading = true;
	let clanRaceError = '';
	let roomsLoading = false;
	let pvpMissionsLoading = false;
	let pvpMissionsError = '';
	let claimingPvpMissionKey = '';
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
	let eventInfoDialogOpen = false;
	let currentPvpTip: PvpTip | null = null;
	let currentUserClan: PvpClan | null = null;
	let lobbyReady = false;
	let pendingDialogTimeout: ReturnType<typeof setTimeout> | null = null;
	let pendingExpirationCheckMatchId: string | null = null;
	let acceptingPendingMatchId: string | null = null;
	let locallyAcceptedPendingMatchIds = new Set<string>();
	let keydownHandler: ((e: KeyboardEvent) => void) | null = null;
	let matchmakingCheckTimer: ReturnType<typeof setInterval> | null = null;
	let loadedLeaderboardKey = '';
	let loadedEventRaceKey = '';
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
	$: activePvpEvent = lobby.activePvpEvent ?? null;
	$: activePvpEventId = getPvpEventId(activePvpEvent);
	$: activePvpEventBaseMode = getPvpEventBaseMode(activePvpEvent);
	$: selectedBaseMode = selectedMode === 'event'
		? activePvpEventBaseMode
		: selectedMode;
	$: selectedRatingState = getSelectedRatingState(lobby, selectedBaseMode);
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
		matches.filter((match) => getPvpMode(match) === selectedBaseMode),
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
		matches.filter((match) => getPvpMode(match) === selectedBaseMode),
		currentUid
	);
	$: currentWeeklyRacePoints = getCurrentWeeklyRacePoints(
		weeklyRace,
		currentUid,
		matches.filter((match) => getPvpMode(match) === selectedBaseMode)
	);
	$: hasRecentLeaderboardMatch = hasRecentRatedPvpMatch(
		matches.filter((match) => getPvpMode(match) === selectedBaseMode),
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
	$: checkingLobby = $user.checked && $user.loggedIn && !lobbyReady;
	$: controlsDisabled = Boolean(
		checkingLobby || activeMatch || isSearching || actionLoading
	);
	$: matchmakingDisabled = controlsDisabled || Boolean(requiredSubmission);
	$: rankedQueueDisabled = matchmakingDisabled || Boolean(currentRoom);
	$: activePvpGroup = getActivePvpGroup(activePvpTab);
	$: unclaimedPvpMissionCount = pvpMissions.filter((mission) =>
		!mission.claimed && (mission.claimable || mission.completed)
	).length;
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
			activePvpEvent: null,
			incomingInvites: [],
			outgoingInvites: []
		};
		matches = [];
		roomsOverview = {
			publicRooms: [],
			joinedRooms: [],
			invites: []
		};
		pvpMissions = [];
		pvpMissionsError = '';
		pvpMissionsLoading = false;
		claimingPvpMissionKey = '';
		initializedForUid = '';
		lobbyReady = false;
		matchHistoryLoading = false;
		routedMatchId = null;
	}

	onMount(() => {
		showGeodeAlert =
			localStorage.getItem(PVP_GEODE_ALERT_DISMISSED_KEY) !== 'true';
		anonymousMode = localStorage.getItem(PVP_ANONYMOUS_MODE_KEY) === 'true';
		anonymousRevealAfterMatchEnd =
			localStorage.getItem(PVP_ANONYMOUS_REVEAL_AFTER_MATCH_END_KEY) === 'true';
		{
			const savedMode = localStorage.getItem(PVP_SELECTED_MODE_KEY);
			selectedMode = savedMode === 'event' || savedMode === 'platformer'
				? savedMode
				: 'classic';
		}

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
		localStorage.setItem(
			PVP_ANONYMOUS_REVEAL_AFTER_MATCH_END_KEY,
			String(anonymousMode && anonymousRevealAfterMatchEnd)
		);
		localStorage.setItem(PVP_SELECTED_MODE_KEY, selectedMode);
		localStorage.setItem(PVP_HIDE_OPPONENT_INFO_KEY, String(hideOpponentInfo));
	}

	$: if (!anonymousMode && anonymousRevealAfterMatchEnd) {
		anonymousRevealAfterMatchEnd = false;
	}

	$: if (selectedMode === 'event' && lobbyReady && !activePvpEvent) {
		selectedMode = 'classic';
	}

	$: if (activePvpTab === 'event-race' && !activePvpEventId) {
		activePvpTab = 'lobby';
	}

	$: eventRaceRequestKey = activePvpEventId
		? `${activePvpEventId}:${eventRacePage}:${currentUid ?? ''}`
		: '';
	$: if (browser && activePvpEventId && loadedEventRaceKey !== eventRaceRequestKey) {
		loadedEventRaceKey = eventRaceRequestKey;
		void refreshEventRace(eventRacePage, activePvpEventId);
	}
	$: if (!activePvpEventId && loadedEventRaceKey) {
		loadedEventRaceKey = '';
		eventRacePage = 1;
		eventRaceTotal = 0;
		eventRaceLoading = false;
		eventRaceError = '';
		eventRace = {
			week: null,
			currentWeek: null,
			previousWeek: null,
			leaderboard: [],
			previousLeaderboard: [],
			currentPlayer: null
		};
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
				recordMissionLobbyVisit(),
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
			pickPvpTip();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : $_('pvp.toast.load_failed')
			);
		} finally {
			loading = false;
		}
	}

	function pickPvpTip() {
		if (Math.random() < PVP_SUPPORTER_TIP_CHANCE) {
			currentPvpTip = { type: 'supporter' };

			return;
		}

		currentPvpTip = {
			type: 'normal',
			key: PVP_TIP_KEYS[Math.floor(Math.random() * PVP_TIP_KEYS.length)]
		};
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

	async function refreshPvpMissions() {
		if (!$user.loggedIn) {
			pvpMissions = [];

			return;
		}

		pvpMissionsLoading = true;
		pvpMissionsError = '';

		try {
			pvpMissions = await getPvpMissions(await $user.token());
		} catch (error) {
			pvpMissions = [];
			pvpMissionsError = error instanceof Error
				? error.message
				: $_('pvp.missions.load_failed');
		} finally {
			pvpMissionsLoading = false;
		}
	}

	async function recordMissionLobbyVisit() {
		if (!$user.loggedIn) {
			return;
		}

		pvpMissionsLoading = true;
		pvpMissionsError = '';

		try {
			pvpMissions = await recordPvpMissionVisit(await $user.token());
		} catch (error) {
			pvpMissions = [];
			pvpMissionsError = error instanceof Error
				? error.message
				: $_('pvp.missions.load_failed');
		} finally {
			pvpMissionsLoading = false;
		}
	}

	async function handleClaimPvpMission(mission: PvpMission) {
		if (!$user.loggedIn || !mission?.key || claimingPvpMissionKey) {
			return;
		}

		claimingPvpMissionKey = mission.key;

		try {
			const response = await claimPvpMission(await $user.token(), mission.key);
			pvpMissions = response.missions;
			showXpAwardToast(response.xpAward);
			await $user.refresh();
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: $_('pvp.missions.claim_failed')
			);
			await refreshPvpMissions();
		} finally {
			claimingPvpMissionKey = '';
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

	async function refreshEventRace(page = eventRacePage, eventId = activePvpEventId) {
		if (!eventId) {
			return;
		}

		eventRaceLoading = true;
		eventRaceError = '';

		try {
			const nextEventRace = await getPvpEventRace(
				eventId,
				PVP_STANDINGS_PAGE_SIZE,
				currentUid,
				page
			);

			if (page !== eventRacePage || eventId !== activePvpEventId) {
				return;
			}

			eventRace = nextEventRace;
			eventRaceTotal = nextEventRace.pagination?.total
				?? nextEventRace.leaderboard.length;
		} catch (error) {
			if (page !== eventRacePage || eventId !== activePvpEventId) {
				return;
			}

			eventRace = {
				week: null,
				currentWeek: null,
				previousWeek: null,
				leaderboard: [],
				previousLeaderboard: [],
				currentPlayer: null
			};
			eventRaceTotal = 0;
			eventRaceError = error instanceof Error
				? error.message
				: $_('pvp.toast.event_race_failed');
		} finally {
			if (page === eventRacePage && eventId === activePvpEventId) {
				eventRaceLoading = false;
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

	function setEventRacePage(page: number) {
		if (page === eventRacePage) {
			return;
		}

		eventRacePage = page;
		void refreshEventRace(page, activePvpEventId);
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

	function getPvpEventId(event: PvpEvent | null | undefined) {
		const value = event?.id ?? null;
		const id = Number(value);

		return Number.isInteger(id) && id > 0 ? id : null;
	}

	function getPvpEventBaseMode(event: PvpEvent | null | undefined): PvpMode {
		return event?.mode === 'platformer' || event?.baseMode === 'platformer'
			|| event?.base_mode === 'platformer'
			? 'platformer'
			: 'classic';
	}

	function getPvpEventTitle(event: PvpEvent | null | undefined) {
		return event?.title || $_('pvp.event_mode');
	}

	function getPvpEventDescription(event: PvpEvent | null | undefined) {
		const description = typeof event?.description === 'string'
			? event.description.trim()
			: '';

		return description || $_('pvp.event_info.no_description');
	}

	function isPvpEventRanked(event: PvpEvent | null | undefined) {
		return Boolean(event?.ranked ?? event?.isRanked ?? event?.is_ranked ?? true);
	}

	function getPvpEventLevelSelectionMode(event: PvpEvent | null | undefined) {
		const value = event?.levelSelectionMode ?? event?.level_selection_mode;

		return value === 'sbmm' ? 'sbmm' : 'random';
	}

	function getPvpEventScoringMode(event: PvpEvent | null | undefined) {
		const value = event?.scoringMode ?? event?.scoring_mode;

		return value === 'score'
			? 'score'
			: value === 'hp'
			? 'hp'
			: value === 'powerup'
			? 'powerup'
			: 'progress';
	}

	function getPvpEventTimeLimitSeconds(event: PvpEvent | null | undefined) {
		return normalizedInteger(event?.timeLimitSeconds ?? event?.time_limit_seconds, 1, 7200, 900);
	}

	function getPvpEventCompletionRuleType(event: PvpEvent | null | undefined) {
		const value = event?.completionRuleType ?? event?.completion_rule_type;

		return value === 'percentage' ? 'percentage' : 'count';
	}

	function getPvpEventCompletionRuleValue(event: PvpEvent | null | undefined) {
		const value = event?.completionRuleValue ?? event?.completion_rule_value;
		const numberValue = Number(value);
		const fallback = getPvpEventCompletionRuleType(event) === 'percentage' ? 100 : 1;

		if (!Number.isFinite(numberValue)) {
			return fallback;
		}

		return Math.max(1, Math.floor(numberValue));
	}

	function formatPvpEventDuration(totalSeconds: number) {
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;

		if (minutes > 0 && seconds > 0) {
			return $_('pvp.event_info.duration_minutes_seconds', {
				values: { minutes, seconds }
			});
		}

		if (minutes > 0) {
			return $_('pvp.event_info.duration_minutes', {
				values: { minutes }
			});
		}

		return $_('pvp.event_info.duration_seconds', {
			values: { seconds }
		});
	}

	function getPvpEventCompletionLabel(event: PvpEvent | null | undefined) {
		const value = getPvpEventCompletionRuleValue(event);

		if (getPvpEventCompletionRuleType(event) === 'percentage') {
			return $_('pvp.event_info.completion_percentage', {
				values: { percent: value }
			});
		}

		return $_('pvp.event_info.completion_count', {
			values: { count: value }
		});
	}

	function getPvpEventConfigRows(event: PvpEvent | null | undefined) {
		const scoringMode = getPvpEventScoringMode(event);
		const levelSelectionMode = getPvpEventLevelSelectionMode(event);
		const targetScore = Number(event?.targetScore ?? event?.target_score ?? 0);
		const startingHp = normalizedInteger(event?.startingHp ?? event?.starting_hp, 1, 100000, 200);
		const finalizeAliveCount = normalizedInteger(
			event?.finalizeAliveCount ?? event?.finalize_alive_count,
			1,
			100,
			1
		);
		const rows = [
			{
				label: $_('pvp.mode_label'),
				value: $_(`pvp.mode.${getPvpEventBaseMode(event)}`),
				hint: $_('pvp.event_info.mode_hint')
			},
			{
				label: $_('pvp.match_type'),
				value: isPvpEventRanked(event) ? $_('pvp.ranked') : $_('pvp.unranked'),
				hint: isPvpEventRanked(event)
					? $_('pvp.event_info.ranked_hint')
					: $_('pvp.event_info.unranked_hint')
			},
			{
				label: $_('pvp.rooms.level_selection'),
				value: $_(`pvp.event_info.level_selection.${levelSelectionMode}`),
				hint: $_(`pvp.event_info.level_selection_hint.${levelSelectionMode}`)
			},
			{
				label: $_('pvp.rooms.match_length'),
				value: formatPvpEventDuration(getPvpEventTimeLimitSeconds(event)),
				hint: $_('pvp.event_info.match_length_hint')
			},
			{
				label: $_('pvp.rooms.scoring_mode'),
				value: $_(`pvp.rooms.mode_${scoringMode}`),
				hint: $_(`pvp.event_info.scoring_hint.${scoringMode}`)
			}
		];

		if (scoringMode === 'progress') {
			rows.push({
				label: $_('pvp.rooms.completion_rule'),
				value: getPvpEventCompletionLabel(event),
				hint: $_('pvp.event_info.completion_hint')
			});
		} else if (scoringMode === 'score' || scoringMode === 'powerup') {
			rows.push({
				label: $_('pvp.rooms.target_score'),
				value: Number.isFinite(targetScore) && targetScore > 0
					? $_('pvp.event_info.target_score', { values: { score: Math.floor(targetScore) } })
					: $_('pvp.rooms.unlimited'),
				hint: $_('pvp.event_info.target_score_hint')
			});
		} else if (scoringMode === 'hp') {
			rows.push(
				{
					label: $_('pvp.rooms.starting_hp'),
					value: $_('pvp.event_info.hp_value', { values: { hp: startingHp } }),
					hint: $_('pvp.event_info.starting_hp_hint')
				},
				{
					label: $_('pvp.rooms.finalize_alive_count'),
					value: $_('pvp.event_info.alive_count', { values: { count: finalizeAliveCount } }),
					hint: $_('pvp.event_info.finalize_alive_hint')
				}
			);
		}

		return rows;
	}

	function getActivePvpGroup(tab: string): PvpNavGroup {
		if (tab === 'missions') {
			return 'missions';
		}

		if (tab === 'history') {
			return 'progress';
		}

		if (
			tab === 'leaderboard'
			|| tab === 'weekly-race'
			|| tab === 'event-race'
			|| tab === 'clan-race'
		) {
			return 'rankings';
		}

		if (tab === 'rules') {
			return 'info';
		}

		return 'play';
	}

	function selectPvpGroup(group: PvpNavGroup) {
		activePvpTab = group === 'missions'
			? 'missions'
			: group === 'progress'
			? 'history'
			: group === 'rankings'
			? 'leaderboard'
			: group === 'info'
			? 'rules'
			: 'lobby';
	}

	function getPvpEventBannerUrl(event: PvpEvent | null | undefined) {
		return event?.bannerUrl ?? event?.banner_url ?? null;
	}

	function getPvpEventBannerStyle(event: PvpEvent | null | undefined) {
		const url = getPvpEventBannerUrl(event);

		if (!url) {
			return '';
		}

		const escapedUrl = url.replace(/\\/g, '\\\\')
			.replace(/'/g, "\\'");

		return `background-image: url('${escapedUrl}')`;
	}

	function getPvpEventEndsMs(event: PvpEvent | null | undefined) {
		const raw = event?.endsAt ?? event?.ends_at ?? null;
		const ms = raw
			? new Date(String(raw))
				.getTime()
			: NaN;

		return Number.isFinite(ms) ? ms : null;
	}

	function getValueEventId(value: PvpInvite | PvpMatch | PvpMatchmakingRequest | null | undefined) {
		const id = Number(value?.pvpEventId ?? value?.pvp_event_id ?? value?.pvpEvent?.id);

		return Number.isInteger(id) && id > 0 ? id : null;
	}

	function isPvpMissionCountableMatch(match: PvpMatch | null | undefined) {
		return Boolean(
			match
			&& !(match.roomId ?? match.room_id ?? match.room)
			&& (isPvpMatchRanked(match) || getValueEventId(match))
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
			&& isPvpMissionCountableMatch(nextMatch)
		) {
			upsertMatchHistory(nextMatch);
			void refreshPvpMissions();

			if (isPvpMatchRanked(nextMatch)) {
				void refreshWeeklyRace();
			}

			if (activePvpEventId && getValueEventId(nextMatch) === activePvpEventId) {
				void refreshEventRace(eventRacePage, activePvpEventId);
			}

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
					getPvpMode(latestMatch),
					anonymousRevealAfterMatchEnd
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
		const reveal = $page.url.searchParams.get('reveal');

		if (mode === 'classic' || mode === 'platformer' || mode === 'event') {
			selectedMode = mode;
		}

		if (anonymous === '1' || anonymous === '0') {
			anonymousMode = anonymous === '1';
		}

		if (reveal === '1' || reveal === '0') {
			anonymousRevealAfterMatchEnd = reveal === '1';
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

	async function startQueue(mode: PvpSelectionMode = selectedMode) {
		if (currentRoom) {
			toast.error($_('pvp.rooms.queue_blocked'));

			return;
		}

		actionLoading = 'matchmaking';

		try {
			const response = await startPvpMatchmaking(
				await $user.token(),
				anonymousMode,
				mode,
				anonymousRevealAfterMatchEnd
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

	async function startEventQueue() {
		if (!activePvpEvent) {
			return;
		}

		activePvpTab = 'lobby';
		selectedMode = 'event';
		await startQueue('event');
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
				anonymousRevealAfterMatchEnd,
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

	function statusLabel(value: unknown) {
		const status = String(value || 'pending');

		return $_(`pvp.status.${status}`);
	}

	function selectMode(mode: PvpSelectionMode) {
		if (actionLoading || activeMatch || isSearching) {
			return;
		}

		if (mode === 'event' && !activePvpEvent) {
			return;
		}

		selectedMode = mode;
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

	function eventCountdownLabel(targetMs: number | null, currentNow: number) {
		if (!targetMs) {
			return '--';
		}

		const totalMinutes = Math.max(
			0,
			Math.ceil((targetMs - currentNow) / (1000 * 60))
		);
		const days = Math.floor(totalMinutes / (24 * 60));
		const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
		const minutes = totalMinutes % 60;

		if (days > 0) {
			return `${days}d ${hours}h`;
		}

		if (hours > 0) {
			return `${hours}h ${minutes}m`;
		}

		return `${minutes}m`;
	}

	function getFiniteNumber(value: unknown) {
		const numberValue = Number(value);

		return Number.isFinite(numberValue) ? numberValue : null;
	}

	function normalizedInteger(value: unknown, min: number, max: number, fallback: number) {
		const numberValue = Number(value);

		if (!Number.isFinite(numberValue)) {
			return fallback;
		}

		return Math.max(min, Math.min(max, Math.floor(numberValue)));
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
    </div>
  </section>

  <div class="pvp-ad-slot">
    <Ads dataAdFormat="auto" />
  </div>

  {#if activePvpEvent && $user.checked && $user.loggedIn}
    <section
      class="pvp-event-banner"
      class:has-image={Boolean(getPvpEventBannerUrl(activePvpEvent))}
      style={getPvpEventBannerStyle(activePvpEvent)}
    >
      <div class="pvp-event-banner-pill">
        <div class="pvp-event-banner-main">
          <Badge>{$_('pvp.event_mode')}</Badge>
          <div>
            <h2>{getPvpEventTitle(activePvpEvent)}</h2>
            {#if activePvpEvent.description}
              <p>{activePvpEvent.description}</p>
            {/if}
          </div>
        </div>
        <div class="pvp-event-banner-meta">
          <Badge variant="outline">
            {$_(`pvp.mode.${activePvpEventBaseMode}`)}
          </Badge>
          {#if getPvpEventEndsMs(activePvpEvent)}
            <div class="pvp-event-countdown">
              <Clock class="h-4 w-4" />
              <span>{$_('pvp.event_race.ends_in')}</span>
              <strong>{eventCountdownLabel(getPvpEventEndsMs(activePvpEvent), now)}</strong>
            </div>
          {/if}
          <div class="pvp-event-actions">
            <Button
              size="sm"
              class="event-queue-button"
              disabled={controlsDisabled}
              on:click={startEventQueue}
            >
              {#if actionLoading === 'matchmaking' && selectedMode === 'event'}
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              {/if}
              {$_('pvp.event_view_pool')}
            </Button>
            <Button
              size="icon"
              variant="outline"
              class="event-info-button"
              aria-label={$_('pvp.event_info.aria_label')}
              on:click={() => (eventInfoDialogOpen = true)}
            >
              <Info class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>

    <Dialog.Root bind:open={eventInfoDialogOpen}>
      <Dialog.Content class="event-info-dialog">
        <Dialog.Header>
          <div class="event-info-title-row">
            <span class="event-info-icon">
              <Info class="h-5 w-5" />
            </span>
            <div>
              <Dialog.Title>{getPvpEventTitle(activePvpEvent)}</Dialog.Title>
              <Dialog.Description>
                {$_('pvp.event_info.description')}
              </Dialog.Description>
            </div>
          </div>
        </Dialog.Header>

        <div class="event-info-scroll">
          <div class="event-info-body">
            <section class="event-info-about">
              <span>{$_('pvp.event_info.about')}</span>
              <p>{getPvpEventDescription(activePvpEvent)}</p>
            </section>

            <div class="event-info-pills">
              <Badge variant="outline">{$_(`pvp.mode.${activePvpEventBaseMode}`)}</Badge>
              <Badge variant="outline">
                {isPvpEventRanked(activePvpEvent) ? $_('pvp.ranked') : $_('pvp.unranked')}
              </Badge>
              {#if getPvpEventEndsMs(activePvpEvent)}
                <Badge variant="outline">
                  {$_('pvp.event_info.ends_in', {
                    values: {
                      time: eventCountdownLabel(getPvpEventEndsMs(activePvpEvent), now)
                    }
                  })}
                </Badge>
              {/if}
            </div>

            <section class="event-info-config">
              <div class="event-info-section-header">
                <strong>{$_('pvp.rooms.match_config')}</strong>
                <span>{$_('pvp.event_info.config_hint')}</span>
              </div>

              <div class="event-info-grid">
                {#each getPvpEventConfigRows(activePvpEvent) as row}
                  <div class="event-info-row">
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                    <p>{row.hint}</p>
                  </div>
                {/each}
              </div>
            </section>
          </div>
        </div>

        <Dialog.Footer class="event-info-footer">
          <Button variant="outline" on:click={() => (eventInfoDialogOpen = false)}>
            {$_('general.close')}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  {/if}

  <Tabs.Root bind:value={activePvpTab}>
    <nav class="pvp-nav" aria-label={$_('pvp.tabs.label')}>
      <div class="pvp-primary-nav" role="list">
        <button
          type="button"
          class="pvp-nav-group"
          class:active={activePvpGroup === 'play'}
          aria-pressed={activePvpGroup === 'play'}
          on:click={() => selectPvpGroup('play')}
        >
          <Swords class="h-4 w-4" />
          {$_('pvp.tabs.groups.play')}
        </button>
        <button
          type="button"
          class="pvp-nav-group"
          class:active={activePvpGroup === 'missions'}
          aria-pressed={activePvpGroup === 'missions'}
          on:click={() => selectPvpGroup('missions')}
        >
          <Target class="h-4 w-4" />
          {$_('pvp.tabs.missions')}
          {#if unclaimedPvpMissionCount > 0}
            <span class="pvp-nav-indicator">
              {unclaimedPvpMissionCount > 9 ? '9+' : unclaimedPvpMissionCount}
            </span>
          {/if}
        </button>
        <button
          type="button"
          class="pvp-nav-group"
          class:active={activePvpGroup === 'progress'}
          aria-pressed={activePvpGroup === 'progress'}
          on:click={() => selectPvpGroup('progress')}
        >
          <History class="h-4 w-4" />
          {$_('pvp.tabs.groups.progress')}
        </button>
        <button
          type="button"
          class="pvp-nav-group"
          class:active={activePvpGroup === 'rankings'}
          aria-pressed={activePvpGroup === 'rankings'}
          on:click={() => selectPvpGroup('rankings')}
        >
          <Trophy class="h-4 w-4" />
          {$_('pvp.tabs.groups.rankings')}
        </button>
        <button
          type="button"
          class="pvp-nav-group"
          class:active={activePvpGroup === 'info'}
          aria-pressed={activePvpGroup === 'info'}
          on:click={() => selectPvpGroup('info')}
        >
          <BookOpen class="h-4 w-4" />
          {$_('pvp.tabs.groups.info')}
        </button>
      </div>

      {#if activePvpGroup === 'play'}
        <Tabs.List
          class="pvp-secondary-tab-list"
          aria-label={$_('pvp.tabs.groups.play_label')}
        >
          <Tabs.Trigger value="lobby" class="pvp-tab-trigger">
            <Swords class="h-4 w-4" />
            {$_('pvp.tabs.lobby')}
          </Tabs.Trigger>
          <Tabs.Trigger value="rooms" class="pvp-tab-trigger">
            <Users class="h-4 w-4" />
            {$_('pvp.tabs.custom_room')}
          </Tabs.Trigger>
        </Tabs.List>
      {:else if activePvpGroup === 'rankings'}
        <Tabs.List
          class="pvp-secondary-tab-list"
          aria-label={$_('pvp.tabs.groups.rankings_label')}
        >
          <Tabs.Trigger value="leaderboard" class="pvp-tab-trigger">
            <Trophy class="h-4 w-4" />
            {$_('pvp.tabs.leaderboard')}
          </Tabs.Trigger>
          <Tabs.Trigger value="weekly-race" class="pvp-tab-trigger">
            <CalendarDays class="h-4 w-4" />
            {$_('pvp.tabs.weekly_race')}
          </Tabs.Trigger>
          {#if activePvpEvent}
            <Tabs.Trigger value="event-race" class="pvp-tab-trigger">
              <Trophy class="h-4 w-4" />
              {$_('pvp.tabs.event_race')}
            </Tabs.Trigger>
          {/if}
          <Tabs.Trigger value="clan-race" class="pvp-tab-trigger">
            <Users class="h-4 w-4" />
            {$_('pvp.tabs.clan_race')}
          </Tabs.Trigger>
        </Tabs.List>
      {/if}
    </nav>

    <Tabs.Content value="missions">
      <PvpMissionsTab
        missions={pvpMissions}
        loading={pvpMissionsLoading}
        error={pvpMissionsError}
        loggedIn={$user.loggedIn}
        claimingMissionKey={claimingPvpMissionKey}
        onClaim={handleClaimPvpMission}
      />
    </Tabs.Content>

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

    <Tabs.Content value="event-race">
      <WeeklyRaceTab
        weeklyRace={eventRace}
        currentUid={currentUid ?? null}
        currentPlayer={$user.data ?? null}
        loading={eventRaceLoading}
        error={eventRaceError}
        page={eventRacePage}
        total={eventRaceTotal}
        pageSize={PVP_STANDINGS_PAGE_SIZE}
        {now}
        onRefresh={() => refreshEventRace(eventRacePage, activePvpEventId)}
        onPageChange={setEventRacePage}
        title={$_('pvp.event_race.title')}
        description={$_('pvp.event_race.description')}
        tabsLabel={$_('pvp.event_race.tabs_label')}
        rangeLabel={$_('pvp.event_race.current_event')}
        countdownLabel={$_('pvp.event_race.ends_in')}
        emptyLabel={$_('pvp.event_race.empty')}
        tableLabel={$_('pvp.event_race.title')}
        showTutorial={false}
        showHistory={false}
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

        {#if currentPvpTip}
          <Alert.Root
            role="status"
            class={`pvp-tip-alert ${currentPvpTip.type === 'supporter' ? 'is-supporter' : 'is-normal'}`}
          >
            <span class="pvp-tip-icon" aria-hidden="true">
              {#if currentPvpTip.type === 'supporter'}
                <Heart class="h-4 w-4" />
              {:else}
                <Lightbulb class="h-4 w-4" />
              {/if}
            </span>
            <Alert.Description class="pvp-tip-description">
              {#if currentPvpTip.type === 'supporter'}
                <span>{$_('pvp.tips.supporter_prefix')}</span>
                <a href="/supporter" class="pvp-tip-link">
                  {$_('pvp.tips.supporter_link')}
                </a>
              {:else}
                {$_(`pvp.tips.items.${currentPvpTip.key}`)}
              {/if}
            </Alert.Description>
          </Alert.Root>
        {/if}

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
              <div class="anonymous-row mode-toggle-row">
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
                  {#if activePvpEvent}
                    <button
                      type="button"
                      class:active={selectedMode === 'event'}
                      disabled={Boolean(actionLoading || activeMatch || isSearching)}
                      on:click={() => selectMode('event')}
                    >
                      {$_('pvp.mode.event')}
                    </button>
                  {/if}
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
              {#if anonymousMode}
                <div class="anonymous-row nested-option-row">
                  <div>
                    <strong>{$_('pvp.reveal_after_match_end')}</strong>
                    <span>{$_('pvp.reveal_after_match_end_hint')}</span>
                  </div>
                  <Switch
                    id="pvp-anonymous-reveal-after-match-end"
                    bind:checked={anonymousRevealAfterMatchEnd}
                    disabled={Boolean(actionLoading || activeMatch || isSearching)}
                    aria-label={$_('pvp.reveal_after_match_end')}
                  />
                </div>
              {/if}
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
                <Button disabled={rankedQueueDisabled} on:click={() => startQueue()}>
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
              {#if selectedBaseMode === 'platformer' && selectedMode !== 'event'}
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

.pvp-nav {
  display: grid;
  gap: 10px;
  margin-bottom: 20px;
}

.pvp-primary-nav {
  display: inline-grid;
  grid-template-columns: repeat(5, minmax(0, auto));
  width: fit-content;
  gap: 4px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--muted) / 0.28);
  padding: 4px;
}

.pvp-nav-group {
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
  font-weight: 600;
  line-height: 1.1;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease;
}

.pvp-nav-group:hover {
  color: hsl(var(--foreground));
}

.pvp-nav-group.active {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  box-shadow: 0 1px 2px hsl(var(--foreground) / 0.08);
}

.pvp-nav-indicator {
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
  min-width: 18px;
  height: 18px;
  border-radius: 999px;
  padding: 0 5px;
  background: rgb(239 68 68);
  color: white;
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  box-shadow: 0 0 0 2px hsl(var(--background));
}

:global(.pvp-secondary-tab-list) {
  display: inline-flex;
  width: fit-content;
  height: auto;
  gap: 4px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--muted) / 0.18);
  padding: 4px;
}

:global(.pvp-tab-trigger) {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding-inline: 12px;
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

:global(.pvp-tip-alert) {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: -2px 0 16px;
  border-radius: 8px;
  padding-block: 11px;
  line-height: 1.45;
}

:global(.pvp-tip-icon) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 20px;
  width: 20px;
  height: 20px;
}

:global(.pvp-tip-icon svg) {
  display: block;
}

:global(.pvp-tip-alert.is-normal) {
  border-color: hsl(42 90% 54% / 0.75);
  background: hsl(42 92% 55% / 0.1);
}

:global(.pvp-tip-alert.is-supporter) {
  border-color: hsl(333 84% 62% / 0.78);
  background: hsl(333 84% 62% / 0.1);
}

:global(.pvp-tip-alert.is-normal .pvp-tip-icon) {
  color: hsl(42 90% 42%);
}

:global(.pvp-tip-alert.is-supporter .pvp-tip-icon) {
  color: hsl(333 78% 56%);
}

:global(.pvp-tip-description) {
  display: flex;
  align-items: center;
  min-height: 20px;
  color: hsl(var(--foreground));
  line-height: 1.25;
}

:global(.pvp-tip-link) {
  color: inherit;
  font-weight: 700;
  text-decoration-line: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}

:global(.pvp-tip-link:hover) {
  color: hsl(var(--primary));
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

.mode-toggle-row {
  border: 0;
  padding: 0;
}

.nested-option-row {
  margin-left: 18px;
}

.mode-toggle-group {
  display: grid;
  grid-auto-columns: minmax(92px, 1fr);
  grid-auto-flow: column;
  min-width: 190px;
  width: 100%;
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

.pvp-event-banner {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  aspect-ratio: 6 / 1;
  min-height: 118px;
  margin-bottom: 16px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background-color: hsl(var(--muted));
  background-position: center;
  background-size: cover;
  padding: 14px;
  color: hsl(var(--foreground));
}

.pvp-event-banner.has-image {
  min-height: auto;
}

.pvp-event-banner-pill {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: min(100%, 920px);
  border: 1px solid hsl(var(--border) / 0.28);
  border-radius: 8px;
  background: hsl(var(--background) / 0.24);
  backdrop-filter: blur(26px) saturate(175%);
  -webkit-backdrop-filter: blur(26px) saturate(175%);
  padding: 10px 12px;
  box-shadow:
    0 12px 30px hsl(var(--foreground) / 0.1),
    inset 0 1px 0 hsl(var(--background) / 0.32);
}

.pvp-event-banner-main,
.pvp-event-banner-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pvp-event-banner-main {
  min-width: 0;
}

.pvp-event-banner-main h2 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
}

.pvp-event-banner-main p {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  margin: 4px 0 0;
  max-width: 640px;
  color: hsl(var(--muted-foreground));
  line-height: 1.45;
}

.pvp-event-banner-meta {
  flex-shrink: 0;
}

.pvp-event-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.pvp-event-countdown {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 32px;
  border: 1px solid hsl(var(--border));
  border-radius: 999px;
  background: hsl(var(--muted) / 0.55);
  padding: 6px 10px;
}

.pvp-event-countdown span {
  font-size: 13px;
  font-weight: 700;
}

.pvp-event-countdown strong {
  font-size: 15px;
  font-weight: 850;
  white-space: nowrap;
}

.pvp-event-banner :global(.border-input) {
  border-color: hsl(var(--border));
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}

.pvp-event-banner :global(.border-input:hover) {
  background: hsl(var(--muted));
  color: hsl(var(--foreground));
}

.pvp-event-banner :global(.event-queue-button) {
  background: hsl(var(--foreground));
  color: hsl(var(--background));
  box-shadow: 0 8px 18px hsl(var(--foreground) / 0.18);
}

.pvp-event-banner :global(.event-queue-button:hover) {
  background: hsl(var(--foreground) / 0.86);
  color: hsl(var(--background));
}

.pvp-event-banner :global(.event-info-button) {
  width: 32px;
  height: 32px;
  border-color: hsl(var(--border));
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}

.pvp-event-banner :global(.event-info-button:hover) {
  background: hsl(var(--muted));
  color: hsl(var(--foreground));
}

:global(.event-info-dialog) {
  display: flex;
  flex-direction: column;
  max-height: min(760px, calc(100vh - 32px));
  max-width: 680px;
  overflow: hidden;
}

.event-info-title-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.event-info-icon {
  display: inline-flex;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid hsl(var(--primary) / 0.2);
  border-radius: 8px;
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.event-info-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  margin: 18px 0;
  padding-right: 4px;
}

.event-info-body {
  display: grid;
  gap: 16px;
}

.event-info-about {
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--muted) / 0.36);
  padding: 14px;
}

.event-info-about span,
.event-info-section-header span,
.event-info-row span,
.event-info-row p {
  color: hsl(var(--muted-foreground));
}

.event-info-about span {
  display: block;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.event-info-about p {
  margin: 0;
  color: hsl(var(--foreground));
  line-height: 1.55;
}

.event-info-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.event-info-config {
  display: grid;
  gap: 12px;
}

.event-info-section-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.event-info-section-header strong {
  font-size: 1rem;
}

.event-info-section-header span {
  max-width: 320px;
  text-align: right;
  font-size: 13px;
  line-height: 1.35;
}

.event-info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.event-info-row {
  display: grid;
  gap: 5px;
  min-height: 112px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--background));
  padding: 12px;
}

.event-info-row span {
  font-size: 12px;
  font-weight: 750;
}

.event-info-row strong {
  overflow-wrap: anywhere;
  font-size: 15px;
  line-height: 1.25;
}

.event-info-row p {
  margin: 0;
  font-size: 13px;
  line-height: 1.35;
}

:global(.event-info-footer) {
  justify-content: flex-end;
  border-top: 1px solid hsl(var(--border));
  margin-top: 0;
  padding-top: 14px;
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

  .pvp-event-banner-pill,
  .pvp-event-banner-main,
  .pvp-event-banner-meta {
    align-items: flex-start;
    flex-direction: column;
  }

  .pvp-event-banner-pill {
    border-radius: 8px;
  }

  .pvp-event-actions {
    width: 100%;
  }

  .pvp-event-actions :global(.event-queue-button) {
    flex: 1;
  }

  .event-info-title-row,
  .event-info-section-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .event-info-section-header span {
    max-width: none;
    text-align: left;
  }

  .event-info-grid {
    grid-template-columns: 1fr;
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

  .mode-toggle-group {
    width: 100%;
    min-width: 0;
  }

  .pvp-primary-nav {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
  }

  .pvp-nav-group {
    padding-inline: 10px;
  }

  :global(.pvp-secondary-tab-list) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
  }

  :global(.pvp-tab-trigger) {
    width: 100%;
    white-space: normal;
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
