<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import Ads from '$lib/components/ads.svelte';
	import SupporterUpsell from '$lib/components/SupporterUpsell.svelte';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import BanPickPanel from './components/BanPickPanel.svelte';
	import MatchReportDialog from './components/MatchReportDialog.svelte';
	import MatchTopbar from './components/MatchTopbar.svelte';
	import PvpXpToast from '$lib/components/pvp/PvpXpToast.svelte';
	import { user } from '$lib/client';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Alert from '$lib/components/ui/alert';
	import * as Card from '$lib/components/ui/card';
	import * as Drawer from '$lib/components/ui/drawer';
	import { Switch } from '$lib/components/ui/switch';
	import * as Tabs from '$lib/components/ui/tabs';
	import {
		abortPvpMatchAsManager,
		acceptPvpMatch,
		banPvpMatchLevel,
		castPvpPowerupSkill,
		endPvpRoomMatch,
		getPvpBanPick,
		getPvpMatchMessages,
		getPvpLevel,
		getPvpLevelRating,
		getPvpBanPickAbortRequestExpiresMs,
		getPvpLevelChangeRequestExpiresMs,
		getPvpMatchAcceptanceExpiresMs,
		getPvpMatch,
		getSpectatablePvpMatch,
		getPvpMatchEndMs,
		getPvpMatchId,
		getPvpMatchPausedAtMs,
		getPvpMode,
		getPvpMatchStartMs,
		getPvpMessageSenderIsAnonymous,
		getPvpParticipants,
		getPvpDeathCountArray,
		getPvpMatchRoomId,
		getPvpMatchRoomName,
		getPvpParticipantIsAnonymous,
		getPvpParticipantDisplayName,
		getPvpParticipantPlayer,
		getPvpParticipantUid,
		getPvpParticipantsSortedByProgress,
		getPvpPowerupState,
		getPvpProgress,
		getPvpResultReason,
		getPvpSelfParticipant,
		getPvpStatus,
		getPvpTimeReachedMs,
		getPvpVisibleParticipantRatingLabel,
		getPvpParticipantRatingDiff,
		getPvpWinnerUid,
		getTimeMs,
		formatPvpProgressValue,
		hasPvpParticipantAccepted,
		isPvpMatchRanked,
		isPvpMatchPaused,
		isPvpCustomRoomMatch,
		isActivePvpMatch,
		isPvpMatchConfirmedByBoth,
		requestPvpBanPickAbort,
		requestPvpMatchLevelChange,
		resignPvpMatch,
		sendPvpMatchMessage,
		setPvpPowerupManaAsManager,
		setTournamentPvpMatchPaused,
		type PvpBanPickAction,
		type PvpMatch,
		type PvpMatchMessage,
		type PvpPowerupSkill,
		type PvpPowerupState,
		type PvpMatchReport,
		type PvpMode,
		type PvpPlayMode,
		type PvpRoomScoringMode,
		type PvpParticipant,
		type PvpXpAward
	} from '$lib/client/pvp';
	import {
		setPvpRealtimeAuth,
		subscribeToPvpMatchDetail
	} from '$lib/client/pvpRealtime';
	import { playPvpBell } from '$lib/client/pvpSound';
	import {
		bannerImageUrl,
		getEquippedTheme,
		getThemeStyle
	} from '$lib/client/cosmetics';
	import { resolvePvpRankBadge } from '$lib/utils/pvpRank';
	import Chart from 'chart.js/auto';
	import { onDestroy, onMount, tick } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { _ } from 'svelte-i18n';
	import { mode, setMode } from 'mode-watcher';
	import {
		Clock,
		ExternalLink,
		Gauge,
		Loader2,
		MessageCircle,
		Moon,
		MousePointerClick,
		Pause,
		RotateCcw,
		Trophy,
		Copy,
		EyeOff,
		Send,
		Shield,
		Sun,
		Target,
		UserRound,
		Volume2,
		VolumeX,
		X,
		Zap
	} from 'lucide-svelte';

	const PVP_GEODE_ALERT_DISMISSED_KEY = 'gdvn:pvp-geode-alert-dismissed';
	const PVP_HIDE_OPPONENT_INFO_KEY = 'gdvn:pvp-hide-opponent-info';
	const PVP_CHAT_MUTED_KEY = 'gdvn:pvp-chat-muted';
	const PVP_XP_TOAST_SHOWN_KEY_PREFIX = 'gdvn:pvp-xp-toast-shown:';
	const POST_MATCH_CHAT_GRACE_MS = 3 * 60 * 1000;
	const REALTIME_COALESCE_MS = 200;
	const MESSAGE_FETCH_LIMIT = 100;
	const BAN_PICK_DEADLINE_SUBMIT_GRACE_MS = 1000;
	const MATCH_END_SPECIAL_GENERIC_COUNTS = { win: 7, lose: 7 };
	const MATCH_END_SPECIAL_SUPPORTER_COUNTS = { win: 5, lose: 5 };
	const MATCH_END_SPECIAL_GENERIC_WEIGHTS = {
		none_vs_none: 70,
		none_vs_supporter: 50,
		supporter_vs_none: 50,
		both_are_supporters: 40
	};
	const PROGRESS_GRAPH_COLORS = [
		'#2563eb',
		'#dc2626',
		'#16a34a',
		'#9333ea',
		'#ea580c',
		'#0891b2',
		'#ca8a04',
		'#db2777'
	];
	const OVERLAY_PLAYER_COLORS = ['#38bdf8', '#f97316'];
	const siteUrl = (import.meta.env.VITE_SITE_URL || 'https://gdvn.net').replace(
		/\/$/,
		''
	);

	type MatchEndSpecialResult = 'win' | 'lose';
	type MatchEndSpecialScenario =
		| 'none_vs_none'
		| 'none_vs_supporter'
		| 'supporter_vs_none'
		| 'both_are_supporters';
	type MatchEndSpecialPool = 'generic' | 'supporter_contextual';
	type MatchEndSpecialAction =
		| 'ACTION_REQUEUE'
		| 'REDIRECT_TO_DONATE'
		| 'REDIRECT_TO_UPGRADE';

	type ProgressGraphPoint = {
		x: number;
		y: number;
		timeMs?: number;
		isModeSegment?: boolean;
		modeLabel?: string;
		modeTimeRange?: string;
	};

	type ProgressGraphModeEvent = {
		uid: string;
		playMode: PvpPlayMode;
		x: number;
		timeMs: number;
	};

	type ProgressGraphPowerupSkill = Extract<
		PvpPowerupSkill,
		'flashbang' | 'invisible' | 'double_click'
	>;

	type ProgressGraphPowerupEffectEvent = {
		uid: string;
		skill: ProgressGraphPowerupSkill;
		x: number;
		endX: number;
		timeMs: number;
		durationMs: number;
	};

	type ProgressGraphPauseStateEvent = {
		uid: string;
		paused: boolean;
		x: number;
		timeMs: number;
		elapsedMs: number | null;
	};

	type ProgressGraphSegmentKind = 'play_mode' | 'pause_state' | 'powerup_effect';

	type ProgressGraphModeSegment = {
		uid: string;
		label: string;
		kind: ProgressGraphSegmentKind;
		playMode?: PvpPlayMode;
		skill?: ProgressGraphPowerupSkill;
		modeLabel: string;
		color: string;
		startX: number;
		endX: number;
		y: number;
	};

	type ProgressGraphSeries = {
		uid?: string | null;
		label: string;
		color: string;
		points: ProgressGraphPoint[];
	};

	type ProgressGraphData = {
		series: ProgressGraphSeries[];
		modeSegments: ProgressGraphModeSegment[];
		hasPoints: boolean;
		minX: number;
		maxX: number;
		minY: number;
		maxY: number;
		mode: PvpMode;
		scoringMode: PvpRoomScoringMode | string;
		targetScore: number | string | null;
		startingHp: number | string | null;
		colorMode: OverlayColorMode;
	};

	type OverlayColorMode = 'light' | 'dark';

	type DeathCountChartData = {
		labels: string[];
		datasets: Array<{
			label: string;
			data: number[];
			rawData: number[];
			backgroundColor: string;
			borderColor: string;
		}>;
		maxY: number;
		showRate: boolean;
		colorMode: OverlayColorMode;
	};

	type PowerupSkillConfig = NonNullable<PvpPowerupState['skills']>[number];

	let match: PvpMatch | null = null;
	let loading = false;
	let initializedFor = '';
	let cleanupRealtime: (() => Promise<void>) | null = null;
	let scheduledRealtimeTasks = new Map<string, ReturnType<typeof setTimeout>>();
	let messageRefreshInFlight = false;
	let now = Date.now();
	let ticker: ReturnType<typeof setInterval> | null = null;
	let actionLoading = '';
	let acceptingMatchId: string | null = null;
	let locallyAcceptedMatchIds = new Set<string>();
	let endedBellPlayedFor: string | null = null;
	let showGeodeAlert = true;
	let messages: PvpMatchMessage[] = [];
	let visibleMessages: PvpMatchMessage[] = [];
	let chatDraft = '';
	let chatLoading = false;
	let desktopChatScrollEl: HTMLDivElement | null = null;
	let mobileChatScrollEl: HTMLDivElement | null = null;
	let mobileChatOpen = false;
	let hideOpponentInfo = false;
	let chatMuted = false;
	let preferencesReady = false;
	let desktopActivityTab = 'chat';
	let mobileActivityTab = 'chat';
	let compareGlobalDeathCount = true;
	let deathCountShowRate = false;
	let comparePlayerGlobalDeathCount = false;
	let globalDeathCount: number[] = Array(100)
		.fill(0);
	let globalDeathCountLoading = false;
	let loadedGlobalDeathCountLevelId: number | null = null;
	let playerGlobalDeathCounts: Record<string, number[]> = {};
	let playerGlobalDeathCountLoading = false;
	let loadedPlayerGlobalDeathCountKey = '';
	let banPickDeadlineTimeout: ReturnType<typeof setTimeout> | null = null;
	let banPickDeadlineKey = '';
	let mutualRequestExpiryTimeout: ReturnType<typeof setTimeout> | null = null;
	let mutualRequestExpiryKey = '';
	let selectedBanLevelIds: number[] = [];
	let selectedBanTurnKey = '';
	let reportDialogOpen = false;
	let locallyReportedPlayerMatchIds = new Set<string>();
	let locallyReportedLevelMatchIds = new Set<string>();
	let pendingXpToastMatch: PvpMatch | null = null;
	let powerupState: PvpPowerupState | null = null;
	let powerupLoading = false;
	let powerupCastLoading = '';
	let loadedPowerupStateFor = '';
	let powerupStateError = '';
	let managerManaLoadingUid = '';
	let overlayColorMode: OverlayColorMode = 'dark';

	$: matchId = $page.params.id;
	$: overlayMode = $page.url.searchParams.has('overlay');
	$: overlayColorMode = $mode === 'light' ? 'light' : 'dark';
	$: isSpectateRoute = $page.url.searchParams.get('spectate') === '1';
	$: isSpectator = !$user.loggedIn
		|| isSpectateRoute
		|| match?.viewerRole === 'spectator'
		|| match?.viewerRole === 'tournament_staff';
	$: matchUrl = `${siteUrl}/versus/matches/${matchId}`;
	$: currentUid = $user.data?.uid;
	$: status = getPvpStatus(match);
	$: matchPausedAtMs = getPvpMatchPausedAtMs(match);
	$: isMatchPaused = isPvpMatchPaused(match);
	$: matchClockNow = isMatchPaused ? matchPausedAtMs ?? now : now;
	$: matchMode = getPvpMode(match);
	$: scoringMode = match?.scoringMode ?? match?.scoring_mode ?? 'progress';
	$: targetScore = match?.targetScore ?? match?.target_score ?? null;
	$: startingHp = match?.startingHp ?? match?.starting_hp ?? null;
	$: level = getPvpLevel(match);
	$: banPick = getPvpBanPick(match);
	$: banPickActions = Array.isArray(banPick?.actions) ? banPick.actions : [];
	$: banPickCurrentUid = banPick?.currentUid ?? banPick?.current_uid ?? null;
	$: banPickTurnIndex = Number(banPick?.turnIndex ?? 0);
	$: banPickRequiredCount = Number(
		banPick?.requiredCount ?? [3, 2, 1, 1][banPickTurnIndex] ?? 0
	);
	$: banPickTurnStartsMs = getTimeMs(banPick?.turnStartsAt);
	$: banPickTurnEndsMs = getTimeMs(banPick?.turnEndsAt);
	$: banPickWaitingToStart = Boolean(
		banPickTurnStartsMs && banPickTurnStartsMs > matchClockNow
	);
	$: banPickRemainingMs = Math.max(
		0,
		((banPickWaitingToStart ? banPickTurnStartsMs : banPickTurnEndsMs)
			?? matchClockNow) - matchClockNow
	);
	$: banPickCurrentTurnActions = banPickActions.filter(
		(action) => Number(action.turnIndex) === banPickTurnIndex
	);
	$: banPickTurnSubmitted = banPickCurrentTurnActions.length > 0;
	$: isBanPick = status === 'ban_pick';
	$: banPickIsViewerTurn = sameUid(banPickCurrentUid, currentUid);
	$: banPickTurnOpen = banPickIsViewerTurn
		&& !isMatchPaused
		&& !banPickWaitingToStart
		&& banPickRemainingMs > 0
		&& !banPickTurnSubmitted;
	$: playerInfoConfirmed = isPvpMatchConfirmedByBoth(match);
	$: levelConfirmed = playerInfoConfirmed;
	$: visibleLevel = levelConfirmed && !isBanPick ? level : null;
	$: levelVideoId = getYouTubeVideoId(visibleLevel?.videoID);
	$: participants = getPvpParticipants(match);
	$: isRoomMatch = isPvpCustomRoomMatch(match);
	$: roomId = getPvpMatchRoomId(match);
	$: roomName = getPvpMatchRoomName(match);
	$: roomHostUid = match?.room?.hostUid ?? match?.room?.host_uid ?? null;
	$: effectiveHideOpponentInfo = overlayMode || isRoomMatch
		? false
		: hideOpponentInfo;
	$: matchTitle = isRoomMatch
		? `${roomName || $_('pvp.rooms.custom_room')} match`
		: getMatchTitle(participants, effectiveHideOpponentInfo, currentUid);
	$: matchBackHref = isRoomMatch && roomId ? `/versus/rooms/${roomId}` : '/versus/play';
	$: matchBackLabel = isRoomMatch ? $_('pvp.rooms.room') : $_('pvp.lobby_title');
	$: orderedParticipants = isRoomMatch || participants.length > 2
		? getPvpParticipantsSortedByProgress(participants, matchMode)
		: orderParticipants(participants, currentUid);
	$: winnerUid = getPvpWinnerUid(match);
	$: resultReason = getPvpResultReason(match);
	$: ranked = isPvpMatchRanked(match);
	$: levelRating = getPvpLevelRating(match);
	$: resultTitleText = resultTitle(
		match,
		status,
		winnerUid,
		participants,
		effectiveHideOpponentInfo,
		currentUid
	);
	$: remainingMs = Math.max(
		0,
		(getPvpMatchEndMs(match) ?? matchClockNow) - matchClockNow
	);
	$: reportEndMs = getPvpMatchEndMs(match);
	$: endedMs = getTimeMs(match?.endedAt);
	$: postMatchChatRemainingMs = Math.max(
		0,
		(endedMs ? endedMs + POST_MATCH_CHAT_GRACE_MS : now) - now
	);
	$: reportDeadlineMs = endedMs
		? endedMs + POST_MATCH_CHAT_GRACE_MS
		: reportEndMs
		? reportEndMs + POST_MATCH_CHAT_GRACE_MS
		: null;
	$: reportWindowRemainingMs = Math.max(
		0,
		(reportDeadlineMs ?? (matchClockNow + POST_MATCH_CHAT_GRACE_MS)) - matchClockNow
	);
	$: acceptanceRemainingMs = Math.max(
		0,
		(getPvpMatchAcceptanceExpiresMs(match) ?? now) - now
	);
	$: isActive = isActivePvpMatch(match);
	$: selfParticipant = getPvpSelfParticipant(match, currentUid);
	$: visibleMessages = getVisibleMessages(
		messages,
		match,
		status,
		currentUid,
		winnerUid,
		participants,
		now
	);
	$: selfAccepted = hasPvpParticipantAccepted(selfParticipant)
		|| (matchId ? locallyAcceptedMatchIds.has(String(matchId)) : false);
	$: isPowerupMatch = normalizedScoringMode(scoringMode) === 'powerup';
	$: isManagerViewer = Boolean($user.data?.isAdmin || $user.data?.isManager);
	$: powerupTargets = orderedParticipants.filter((participant) => {
		const uid = getPvpParticipantUid(participant);

		return Boolean(uid && uid !== currentUid);
	});
	$: canUsePowerups = isPowerupMatch
		&& isActive
		&& !isMatchPaused
		&& Boolean(selfParticipant)
		&& !isSpectator;
	$: canManagePowerupMana = isPowerupMatch
		&& isActive
		&& !isMatchPaused
		&& isManagerViewer;
	$: powerupMana = Math.max(0, Math.floor(Number(powerupState?.mana) || 0));
	$: powerupMaxMana = Math.max(
		1,
		Math.floor(Number(powerupState?.maxMana) || 100)
	);
	$: powerupStateKey = (canUsePowerups || canManagePowerupMana)
		&& currentUid
		&& matchId
		? `${currentUid}:${matchId}`
		: '';
	$: canRequeue = Boolean(
		match && !isRoomMatch && !isActive && selfParticipant && !isSpectator
	);
	$: viewerPlayerReport = getPvpViewerReport(match, 'player');
	$: viewerLevelReport = getPvpViewerReport(match, 'level');
	$: hasReportedPlayer = Boolean(
		viewerPlayerReport
		|| match?.reportedByViewer
		|| match?.reported_by_viewer
		|| match?.reportedPlayerByViewer
		|| match?.reported_player_by_viewer
		|| (matchId && locallyReportedPlayerMatchIds.has(String(matchId)))
	);
	$: hasReportedLevel = Boolean(
		viewerLevelReport
		|| match?.reportedLevelByViewer
		|| match?.reported_level_by_viewer
		|| (matchId && locallyReportedLevelMatchIds.has(String(matchId)))
	);
	$: hasReportedMatch = hasReportedPlayer && hasReportedLevel;
	$: activeReportableMatch = ['ban_pick', 'in_progress', 'waiting_result']
		.includes(status);
	$: reportWindowOpen = Boolean(
		match
		&& (
			activeReportableMatch
			|| (['completed', 'cancelled', 'disputed'].includes(status) && endedMs)
		)
		&& reportWindowRemainingMs > 0
	);
	$: canReportMatch = reportWindowOpen
		&& Boolean(selfParticipant)
		&& !isSpectator
		&& !hasReportedMatch;
	$: canResign = ['in_progress', 'waiting_result'].includes(status)
		&& !isMatchPaused
		&& !isRoomMatch
		&& remainingMs > 0
		&& Boolean(selfParticipant);
	$: levelChangeRequestedByUid = getPvpLevelChangeRequestedByUid(match);
	$: levelChangeRequestExpiresMs = getPvpLevelChangeRequestExpiresMs(match);
	$: levelChangeRequestRemainingMs = Math.max(
		0,
		(levelChangeRequestExpiresMs ?? matchClockNow) - matchClockNow
	);
	$: levelChangeRequestActive = Boolean(levelChangeRequestedByUid)
		&& levelChangeRequestRemainingMs > 0;
	$: levelChangeUsed = Boolean(match?.levelChangedAt ?? match?.level_changed_at);
	$: canRequestLevelChange = ['in_progress', 'waiting_result'].includes(status)
		&& !isMatchPaused
		&& !isRoomMatch
		&& matchMode !== 'platformer'
		&& remainingMs > 0
		&& Boolean(selfParticipant)
		&& !levelChangeUsed;
	$: banPickAbortRequestedByUid = getPvpBanPickAbortRequestedByUid(match);
	$: banPickAbortRequestExpiresMs = getPvpBanPickAbortRequestExpiresMs(match);
	$: banPickAbortRequestRemainingMs = Math.max(
		0,
		(banPickAbortRequestExpiresMs ?? matchClockNow) - matchClockNow
	);
	$: banPickAbortRequestActive = Boolean(banPickAbortRequestedByUid)
		&& banPickAbortRequestRemainingMs > 0;
	$: banPickAbortRequestedBySelf = Boolean(currentUid)
		&& String(banPickAbortRequestedByUid || '') === String(currentUid);
	$: canRequestBanPickAbort = isBanPick
		&& !isMatchPaused
		&& !isRoomMatch
		&& Boolean(selfParticipant);
	$: canAbortRoomMatch = isRoomMatch
		&& ['in_progress', 'waiting_result'].includes(status)
		&& !isSpectator
		&& sameUid(roomHostUid, currentUid);
	$: canAbortAsManager = isManagerViewer
		&& ['ban_pick', 'in_progress', 'waiting_result'].includes(status);
	$: canControlTournamentMatch = Boolean(
		match?.viewerCanControlTournamentMatch
		?? match?.viewer_can_control_tournament_match
	) && ['ban_pick', 'in_progress', 'waiting_result'].includes(status);
	$: chatOpenDuringMatch = ['in_progress', 'waiting_result'].includes(status)
		&& remainingMs > 0;
	$: chatOpenDuringBanPick = isBanPick;
	$: chatOpenAfterMatch = status === 'completed' && postMatchChatRemainingMs > 0;
	$: chatDisabled = !chatOpenDuringBanPick && !chatOpenDuringMatch
		&& !chatOpenAfterMatch;
	$: chatInputDisabled = chatDisabled || chatMuted || isSpectator;
	$: chatDescription = chatMuted
		? $_('pvp.chat_muted_description')
		: isSpectator
		? 'Spectating in read-only mode.'
		: chatDisabled
		? $_('pvp.chat_disabled')
		: chatOpenAfterMatch
		? $_('pvp.post_match_chat_closes', {
			values: { time: formatDuration(postMatchChatRemainingMs) }
		})
		: chatOpenDuringBanPick
		? $_('pvp.chat_during_ban_pick')
		: $_('pvp.chat_during_match');
	$: progressGraphData = getProgressGraphData(
		messages,
		orderedParticipants,
		matchMode,
		match,
		now,
		status,
		overlayMode,
		overlayColorMode
	);
	$: playerProgressByUid = getMessagePlayerProgress(messages);
	$: deathCountLevelId = getDeathCountLevelId(match);
	$: deathCountParticipantUids = getDeathCountParticipantUids(
		orderedParticipants
	);
	$: playerGlobalDeathCountLoadKey = deathCountLevelId
		&& deathCountParticipantUids.length > 0
		? `${deathCountLevelId}:${deathCountParticipantUids.join(',')}`
		: '';
	$: playerGlobalDeathCountsReady = Boolean(
		playerGlobalDeathCountLoadKey
		&& loadedPlayerGlobalDeathCountKey === playerGlobalDeathCountLoadKey
	);
	$: deathCountChartData = getDeathCountChartData(
		orderedParticipants,
		overlayMode ? false : compareGlobalDeathCount,
		globalDeathCount,
		effectiveHideOpponentInfo,
		currentUid,
		deathCountShowRate,
		comparePlayerGlobalDeathCount,
		playerGlobalDeathCounts,
		playerGlobalDeathCountsReady,
		overlayMode,
		overlayColorMode
	);
	$: if (
		!overlayMode
		&& compareGlobalDeathCount
		&& deathCountLevelId
		&& loadedGlobalDeathCountLevelId !== deathCountLevelId
		&& !globalDeathCountLoading
	) {
		loadGlobalDeathCount(deathCountLevelId);
	}
	$: if (
		comparePlayerGlobalDeathCount
		&& deathCountLevelId
		&& playerGlobalDeathCountLoadKey
		&& loadedPlayerGlobalDeathCountKey !== playerGlobalDeathCountLoadKey
		&& !playerGlobalDeathCountLoading
	) {
		loadPlayerGlobalDeathCounts(
			deathCountLevelId,
			deathCountParticipantUids,
			playerGlobalDeathCountLoadKey
		);
	}
	$: updateBanPickDeadlineCheck(
		isBanPick && !isMatchPaused,
		banPick?.turnEndsAt,
		selectedBanLevelIds.length,
		banPickCurrentUid,
		currentUid,
		banPickTurnSubmitted
	);
	$: resetBanPickSelection(`${matchId}:${banPickTurnIndex}:${banPickCurrentUid}`);
	$: updateMutualRequestExpiryCheck(
		matchId,
		!isMatchPaused && levelChangeRequestActive ? levelChangeRequestExpiresMs : null,
		!isMatchPaused && banPickAbortRequestActive ? banPickAbortRequestExpiresMs : null
	);
	$: syncPowerupState(powerupStateKey);

	$: if (
		$user.checked
		&& matchId
		&& initializedFor !== `${currentUid || 'public'}:${matchId}`
	) {
		initializeRealtime(matchId);
	}

	onMount(() => {
		showGeodeAlert =
			localStorage.getItem(PVP_GEODE_ALERT_DISMISSED_KEY) !== 'true';
		hideOpponentInfo =
			localStorage.getItem(PVP_HIDE_OPPONENT_INFO_KEY) === 'true';
		chatMuted = localStorage.getItem(PVP_CHAT_MUTED_KEY) === 'true';
		preferencesReady = true;

		ticker = setInterval(() => {
			now = Date.now();

			if (isSpectator && ['in_progress', 'waiting_result'].includes(status)) {
				void refreshMessages({ incremental: true, silent: true });
			}
		}, 1000);

		window.addEventListener('focus', showPendingPvpXpToast);
		document.addEventListener('visibilitychange', showPendingPvpXpToast);
	});

	$: if (preferencesReady) {
		localStorage.setItem(PVP_HIDE_OPPONENT_INFO_KEY, String(hideOpponentInfo));
		localStorage.setItem(PVP_CHAT_MUTED_KEY, String(chatMuted));
	}

	onDestroy(() => {
		if (ticker) {
			clearInterval(ticker);
		}

		if (banPickDeadlineTimeout) {
			clearTimeout(banPickDeadlineTimeout);
		}

		if (mutualRequestExpiryTimeout) {
			clearTimeout(mutualRequestExpiryTimeout);
		}

		cleanupRealtime?.();
		clearScheduledRealtimeTasks();

		if (browser) {
			window.removeEventListener('focus', showPendingPvpXpToast);
			document.removeEventListener('visibilitychange', showPendingPvpXpToast);
		}
	});

	async function initializeRealtime(id: string) {
		initializedFor = `${currentUid || 'public'}:${id}`;
		cleanupRealtime?.();

		try {
			const token = await $user.token();
			setPvpRealtimeAuth(token);
			await Promise.all([
				refreshMatch(),
				refreshMessages(),
				powerupStateKey
					? refreshPowerupState({ key: powerupStateKey, silent: true })
					: Promise.resolve()
			]);

			cleanupRealtime = subscribeToPvpMatchDetail(id, async (event) => {
				if (event.scope === 'message') {
					scheduleRealtimeTask(
						'messages',
						() => refreshMessages({
							incremental: true,
							silent: isSpectator
						})
					);

					scheduleRealtimeTask('match', refreshMatch);
					schedulePowerupRefresh();

					return;
				}

				scheduleRealtimeTask('match', refreshMatch);
				schedulePowerupRefresh();
			});
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : $_('pvp.toast.load_failed')
			);
		}
	}

	async function refreshMatch() {
		if (!matchId) {
			return;
		}

		loading = true;

		try {
			const nextMatch = isSpectateRoute
				? await getSpectatablePvpMatch(await $user.token(), matchId)
				: await getPvpMatch(await $user.token(), matchId);
			setMatch(nextMatch);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : $_('pvp.toast.load_failed')
			);
		} finally {
			loading = false;
		}
	}

	async function refreshMessages(
		options: { incremental?: boolean; silent?: boolean; } = {}
	) {
		if (!matchId || messageRefreshInFlight) {
			return;
		}

		messageRefreshInFlight = true;

		if (!options.silent) {
			chatLoading = true;
		}

		try {
			const nextMessages = await getPvpMatchMessages(
				await $user.token(),
				matchId,
				{
					afterId: options.incremental ? latestMessageId() : null,
					limit: options.incremental ? MESSAGE_FETCH_LIMIT : null,
					telemetryOnly: isSpectator
				}
			);

			if (options.incremental) {
				messages = mergeMessages(messages, nextMessages);
			} else {
				messages = nextMessages;
			}

			if (nextMessages.some((message) =>
				!['progress_run', 'progress_run_sample', 'progress_run_end', 'pause_state'].includes(
					messageMetadataKind(message)
				)
			)) {
				await scrollChatToBottom();
			}
		} catch (error) {
			if (!options.silent) {
				toast.error(
					error instanceof Error ? error.message : 'Failed to load match chat'
				);
			}
		} finally {
			messageRefreshInFlight = false;

			if (!options.silent) {
				chatLoading = false;
			}
		}
	}

	function syncPowerupState(key: string) {
		if (!key) {
			if (loadedPowerupStateFor || powerupState || powerupStateError) {
				loadedPowerupStateFor = '';
				powerupState = null;
				powerupStateError = '';
			}

			return;
		}

		if (!powerupLoading && loadedPowerupStateFor !== key) {
			void refreshPowerupState({ key });
		}
	}

	function schedulePowerupRefresh() {
		if (!powerupStateKey) {
			return;
		}

		scheduleRealtimeTask(
			'powerups',
			() => refreshPowerupState({ key: powerupStateKey, silent: true })
		);
	}

	async function refreshPowerupState(
		options: { key?: string; silent?: boolean; } = {}
	) {
		const key = options.key || powerupStateKey;

		if (
			!$user.loggedIn
			|| !matchId
			|| !key
			|| (isSpectator && !canManagePowerupMana)
		) {
			return;
		}

		const requestMatchId = matchId;
		loadedPowerupStateFor = key;

		if (!options.silent) {
			powerupLoading = true;
		}

		try {
			const nextState = await getPvpPowerupState(
				await $user.token(),
				requestMatchId
			);

			if (powerupStateKey === key) {
				powerupState = nextState;
				powerupStateError = '';
			}
		} catch (error) {
			if (powerupStateKey === key) {
				powerupStateError = error instanceof Error
					? error.message
					: $_('pvp.powerups.state_failed');
			}

			if (!options.silent) {
				toast.error(
					error instanceof Error
						? error.message
						: $_('pvp.powerups.state_failed')
				);
			}
		} finally {
			if (!options.silent) {
				powerupLoading = false;
			}
		}
	}

	async function castPowerupSkill(
		skill: PvpPowerupSkill,
		targetUid?: string | null,
		randomTarget = false
	) {
		if (!matchId || !canUsePowerups || powerupCastLoading) {
			return;
		}

		const actionKey = powerupActionKey(skill, targetUid, randomTarget);
		powerupCastLoading = actionKey;

		try {
			const result = await castPvpPowerupSkill(
				await $user.token(),
				matchId,
				{
					skill,
					...(targetUid ? { targetUid } : {}),
					...(randomTarget ? { randomTarget: true } : {})
				}
			);

			powerupState = result.state;
			loadedPowerupStateFor = powerupStateKey;
			await refreshMessages({ incremental: true });
			toast.success(
				result.blocked
					? $_('pvp.powerups.toast_blocked')
					: $_('pvp.powerups.toast_cast', {
						values: { skill: powerupSkillName(skill) }
					})
			);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : $_('pvp.powerups.toast_failed')
			);
			await refreshPowerupState({ key: powerupStateKey, silent: true });
		} finally {
			if (powerupCastLoading === actionKey) {
				powerupCastLoading = '';
			}
		}
	}

	async function setManagerMana(event: SubmitEvent, uid: string) {
		event.preventDefault();

		if (!matchId || !canManagePowerupMana || managerManaLoadingUid) {
			return;
		}

		const form = event.currentTarget as HTMLFormElement;
		const mana = Number(
			new FormData(form)
				.get('mana')
		);

		if (!Number.isInteger(mana) || mana < 0 || mana > 100) {
			toast.error($_('pvp.powerups.manager_mana_invalid'));

			return;
		}

		managerManaLoadingUid = uid;

		try {
			await setPvpPowerupManaAsManager(
				await $user.token(),
				matchId,
				uid,
				mana
			);
			await refreshPowerupState({ key: powerupStateKey, silent: true });
			toast.success($_('pvp.powerups.manager_mana_set'));
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: $_('pvp.powerups.manager_mana_failed')
			);
		} finally {
			managerManaLoadingUid = '';
		}
	}

	async function loadGlobalDeathCount(levelId: number) {
		globalDeathCountLoading = true;

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/levels/${levelId}/deathCount`
			);

			if (!response.ok) {
				throw new Error(await response.text() || 'Failed to load global death count');
			}

			const data = await response.json();
			globalDeathCount = normalizeDeathCountArray(data?.count);
			loadedGlobalDeathCountLevelId = levelId;
		} catch (error) {
			loadedGlobalDeathCountLevelId = levelId;
			globalDeathCount = Array(100)
				.fill(0);
			toast.error(
				error instanceof Error
					? error.message
					: $_('pvp.death_count.global_load_failed')
			);
		} finally {
			globalDeathCountLoading = false;
		}
	}

	async function loadPlayerGlobalDeathCounts(
		levelId: number,
		uids: string[],
		loadKey: string
	) {
		playerGlobalDeathCountLoading = true;

		try {
			const entries = await Promise.all(
				uids.map(async (uid) => {
					const response = await fetch(
						`${import.meta.env.VITE_API_URL}/deathCount/${
							encodeURIComponent(uid)
						}/${levelId}`
					);

					if (!response.ok) {
						throw new Error(
							await response.text() || 'Failed to load player global death count'
						);
					}

					const data = await response.json();

					return [uid, normalizeDeathCountArray(data?.count)] as const;
				})
			);

			playerGlobalDeathCounts = {
				...playerGlobalDeathCounts,
				...Object.fromEntries(entries)
			};
			loadedPlayerGlobalDeathCountKey = loadKey;
		} catch (error) {
			playerGlobalDeathCounts = {
				...playerGlobalDeathCounts,
				...Object.fromEntries(
					uids.map((uid) => [uid, Array(100)
						.fill(0)])
				)
			};
			loadedPlayerGlobalDeathCountKey = loadKey;
			toast.error(
				error instanceof Error
					? error.message
					: $_('pvp.death_count.player_global_load_failed')
			);
		} finally {
			playerGlobalDeathCountLoading = false;
		}
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

	function updateBanPickDeadlineCheck(
		active: boolean,
		turnEndsAt: string | null | undefined,
		selectedCount: number,
		currentTurnUid: string | null | undefined,
		viewerUid: string | null | undefined,
		turnSubmitted: boolean
	) {
		const endsMs = getTimeMs(turnEndsAt);
		const shouldSubmit = active && sameUid(currentTurnUid, viewerUid)
			&& !turnSubmitted;
		const key = active && endsMs
			? `${matchId}:${turnEndsAt}:${
				shouldSubmit ? 'submit' : 'refresh'
			}:${selectedCount}`
			: '';

		if (key === banPickDeadlineKey) {
			return;
		}

		if (banPickDeadlineTimeout) {
			clearTimeout(banPickDeadlineTimeout);
			banPickDeadlineTimeout = null;
		}

		banPickDeadlineKey = key;

		if (!key) {
			return;
		}

		const targetMs = (endsMs ?? Date.now())
			+ (shouldSubmit
				? BAN_PICK_DEADLINE_SUBMIT_GRACE_MS
				: REALTIME_COALESCE_MS + 250);
		const delay = Math.max(0, targetMs - Date.now());
		banPickDeadlineTimeout = setTimeout(() => {
			banPickDeadlineTimeout = null;

			if (isBanPick && banPickIsViewerTurn && !banPickTurnSubmitted) {
				void submitBanSelection({ fromTimer: true });
			} else {
				void refreshMatch();
			}
		}, delay);
	}

	function resetBanPickSelection(key: string) {
		if (key === selectedBanTurnKey) {
			return;
		}

		selectedBanTurnKey = key;
		selectedBanLevelIds = [];
	}

	function updateMutualRequestExpiryCheck(
		id: string | null | undefined,
		levelChangeExpiresMs: number | null,
		banPickAbortExpiresMs: number | null
	) {
		const expiresMs = [levelChangeExpiresMs, banPickAbortExpiresMs]
			.filter((value): value is number =>
				Number.isFinite(Number(value)) && Number(value) > now
			)
			.sort((left, right) => left - right)[0];
		const key = id && expiresMs ? `${id}:${expiresMs}` : '';

		if (key === mutualRequestExpiryKey) {
			return;
		}

		if (mutualRequestExpiryTimeout) {
			clearTimeout(mutualRequestExpiryTimeout);
			mutualRequestExpiryTimeout = null;
		}

		mutualRequestExpiryKey = key;

		if (!key || !expiresMs) {
			return;
		}

		mutualRequestExpiryTimeout = setTimeout(
			() => {
				mutualRequestExpiryTimeout = null;
				void refreshMatch();
			},
			Math.max(0, expiresMs - Date.now() + REALTIME_COALESCE_MS + 250)
		);
	}

	function messageId(message: PvpMatchMessage) {
		return message.id === undefined || message.id === null
			? null
			: String(message.id);
	}

	function latestMessageId() {
		return messages.reduce<number | null>((latest, message) => {
			const id = Number(message.id);

			if (!Number.isInteger(id)) {
				return latest;
			}

			return latest === null || id > latest ? id : latest;
		}, null);
	}

	function mergeMessages(
		current: PvpMatchMessage[],
		incoming: PvpMatchMessage[]
	) {
		const merged = [...current];
		const indexById = new Map(
			merged
				.map((message, index) => [messageId(message), index] as const)
				.filter(([id]) => Boolean(id))
		);

		for (const message of incoming) {
			const id = messageId(message);
			const existingIndex = id ? indexById.get(id) : undefined;

			if (existingIndex !== undefined) {
				merged[existingIndex] = message;
			} else {
				if (id) {
					indexById.set(id, merged.length);
				}

				merged.push(message);
			}
		}

		return merged.sort((a, b) => {
			const idA = Number(a.id);
			const idB = Number(b.id);

			if (Number.isInteger(idA) && Number.isInteger(idB)) {
				return idA - idB;
			}

			return new Date(a.created_at || 0)
				.getTime()
				- new Date(b.created_at || 0)
					.getTime();
		});
	}

	async function scrollChatToBottom() {
		await tick();

		for (const element of [desktopChatScrollEl, mobileChatScrollEl]) {
			if (element) {
				element.scrollTop = element.scrollHeight;
			}
		}
	}

	function setMatch(nextMatch: PvpMatch | null) {
		const previousMatch = match;

		handleMatchSound(previousMatch, nextMatch);
		match = nextMatch;
		showPvpXpToastIfNeeded(previousMatch, nextMatch);
	}

	function handleMatchSound(
		previousMatch: PvpMatch | null,
		nextMatch: PvpMatch | null
	) {
		const id = getPvpMatchId(nextMatch);

		if (!id || endedBellPlayedFor === String(id)) {
			return;
		}

		const previousStatus = getPvpStatus(previousMatch, '');

		if (
			previousMatch
			&& previousStatus === 'in_progress'
			&& nextMatch
			&& !isActivePvpMatch(nextMatch)
		) {
			endedBellPlayedFor = String(id);
			playPvpBell();
		}
	}

	function showPvpXpToastIfNeeded(
		previousMatch: PvpMatch | null,
		nextMatch: PvpMatch | null
	) {
		if (
			!browser || !previousMatch || !nextMatch || isSpectateRoute
			|| nextMatch?.viewerRole === 'spectator'
			|| nextMatch?.viewerRole === 'tournament_staff'
		) {
			return;
		}

		if (
			getPvpStatus(previousMatch, '') === 'completed'
			|| getPvpStatus(nextMatch, '') !== 'completed'
		) {
			return;
		}

		queueOrShowPvpXpToast(nextMatch);
	}

	function queueOrShowPvpXpToast(currentMatch: PvpMatch) {
		const award = getViewerXpAward(currentMatch);
		const diff = Number(award?.diff);
		const newXp = Number(award?.newXp);

		if (!award || !Number.isFinite(diff) || diff <= 0 || !Number.isFinite(newXp)) {
			return;
		}

		const toastKey = getPvpXpToastKey(currentMatch, award);

		if (!toastKey || pvpXpToastWasShown(toastKey)) {
			if (pendingXpToastMatch === currentMatch) {
				pendingXpToastMatch = null;
			}

			return;
		}

		if (!canShowPvpXpToastNow()) {
			pendingXpToastMatch = currentMatch;

			return;
		}

		showPvpXpToast(award, toastKey);
		pendingXpToastMatch = null;
	}

	function showPvpXpToast(award: PvpXpAward, toastKey: string) {
		markPvpXpToastShown(toastKey);
		syncUserXpFromAward(award);
		toast.custom(PvpXpToast, {
			componentProps: { award },
			duration: Number.POSITIVE_INFINITY,
			position: 'top-center',
			unstyled: true
		});
	}

	function showPendingPvpXpToast() {
		if (!pendingXpToastMatch || !canShowPvpXpToastNow()) {
			return;
		}

		queueOrShowPvpXpToast(pendingXpToastMatch);
	}

	function canShowPvpXpToastNow() {
		return browser
			&& document.visibilityState === 'visible'
			&& document.hasFocus();
	}

	function getViewerXpAward(currentMatch: PvpMatch | null | undefined) {
		return currentMatch?.viewerXpAward ?? currentMatch?.viewer_xp_award ?? null;
	}

	function getPvpXpToastKey(
		currentMatch: PvpMatch | null | undefined,
		award: PvpXpAward
	) {
		if (award.id !== undefined && award.id !== null && award.id !== '') {
			return `log:${award.id}`;
		}

		const sourceId = award.sourceId
			?? (award.source_id as string | number | undefined)
			?? getPvpMatchId(currentMatch);

		if (sourceId === undefined || sourceId === null || sourceId === '') {
			return '';
		}

		return `match:${sourceId}:${award.diff ?? ''}`;
	}

	function pvpXpToastWasShown(key: string) {
		try {
			return localStorage.getItem(`${PVP_XP_TOAST_SHOWN_KEY_PREFIX}${key}`)
				=== 'true';
		} catch {
			return false;
		}
	}

	function markPvpXpToastShown(key: string) {
		try {
			localStorage.setItem(`${PVP_XP_TOAST_SHOWN_KEY_PREFIX}${key}`, 'true');
		} catch {
			return;
		}
	}

	function syncUserXpFromAward(award: PvpXpAward) {
		const newXp = Number(award.newXp);

		if (!Number.isFinite(newXp)) {
			return;
		}

		user.update((current) => ({
			...current,
			data: current.data
				? {
					...current.data,
					exp: Math.max(0, Math.trunc(newXp)),
					extraExp: 0
				}
				: current.data
		}));
	}

	async function acceptMatch() {
		if (!matchId || actionLoading || selfAccepted || isSpectator) {
			return;
		}

		const currentMatchId = matchId;
		const matchKey = String(currentMatchId);

		if (acceptingMatchId === matchKey) {
			return;
		}

		acceptingMatchId = matchKey;
		actionLoading = 'accept-match';

		try {
			const response = await acceptPvpMatch(
				await $user.token(),
				currentMatchId
			);
			locallyAcceptedMatchIds = new Set(locallyAcceptedMatchIds)
				.add(
					matchKey
				);
			setMatch(response);
		} catch (error) {
			locallyAcceptedMatchIds = new Set(
				[...locallyAcceptedMatchIds].filter((id) => id !== matchKey)
			);

			if (
				error instanceof Error
				&& error.message.toLowerCase()
					.includes('already in a match')
			) {
				await refreshMatch();

				return;
			}

			toast.error(
				error instanceof Error
					? error.message
					: $_('pvp.toast.accept_match_failed')
			);
		} finally {
			if (actionLoading === 'accept-match') {
				actionLoading = '';
			}

			if (acceptingMatchId === matchKey) {
				acceptingMatchId = null;
			}
		}
	}

	function toggleBanSelection(levelId: number | null) {
		if (
			!levelId || !banPickTurnOpen || getBanPickActionForLevel(levelId)
		) {
			return;
		}

		if (selectedBanLevelIds.includes(levelId)) {
			selectedBanLevelIds = selectedBanLevelIds.filter((id) =>
				id !== levelId
			);

			return;
		}

		if (selectedBanLevelIds.length >= banPickRequiredCount) {
			return;
		}

		selectedBanLevelIds = [...selectedBanLevelIds, levelId];
	}

	async function submitBanSelection(options: { fromTimer?: boolean; } = {}) {
		if (
			!matchId || actionLoading || !banPickIsViewerTurn
			|| banPickTurnSubmitted
			|| isSpectator
		) {
			return;
		}

		if (
			!options.fromTimer
			&& selectedBanLevelIds.length !== banPickRequiredCount
		) {
			return;
		}

		actionLoading = 'ban-pick-submit';

		try {
			const response = await banPvpMatchLevel(
				await $user.token(),
				matchId,
				selectedBanLevelIds
			);
			setMatch(response);
			selectedBanLevelIds = [];
			await refreshMessages({ incremental: true });
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: $_('pvp.toast.ban_pick_failed')
			);
			await refreshMatch();
		} finally {
			actionLoading = '';
		}
	}

	async function resignMatch() {
		if (!matchId || !canResign || actionLoading || isSpectator) {
			return;
		}

		if (!confirm($_('pvp.resign_confirm'))) {
			return;
		}

		actionLoading = 'resign-match';

		try {
			const response = await resignPvpMatch(await $user.token(), matchId);
			setMatch(response);
			await refreshMessages({ incremental: true });
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: $_('pvp.toast.resign_failed')
			);
		} finally {
			actionLoading = '';
		}
	}

	async function requestLevelChange() {
		if (!matchId || !canRequestLevelChange || actionLoading || isSpectator) {
			return;
		}

		actionLoading = 'level-change';

		try {
			const response = await requestPvpMatchLevelChange(
				await $user.token(),
				matchId
			);
			setMatch(response);
			await refreshMessages({ incremental: true });
			toast.success(
				response.levelChangedAt || response.level_changed_at
					? $_('pvp.toast.level_change_success')
					: $_('pvp.toast.level_change_requested')
			);
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: $_('pvp.toast.level_change_failed')
			);
		} finally {
			actionLoading = '';
		}
	}

	async function requestBanPickAbort() {
		if (
			!matchId || !canRequestBanPickAbort || actionLoading
			|| banPickAbortRequestedBySelf
			|| isSpectator
		) {
			return;
		}

		if (
			!confirm(
				$_(
					banPickAbortRequestedByUid
						? 'pvp.ban_pick_abort_agree_confirm'
						: 'pvp.ban_pick_abort_request_confirm'
				)
			)
		) {
			return;
		}

		actionLoading = 'ban-pick-abort';

		try {
			const response = await requestPvpBanPickAbort(
				await $user.token(),
				matchId
			);
			setMatch(response);
			await refreshMessages({ incremental: true });

			if (response.status !== 'cancelled') {
				toast.success($_('pvp.toast.ban_pick_abort_requested'));
			}
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: $_('pvp.toast.ban_pick_abort_failed')
			);
		} finally {
			actionLoading = '';
		}
	}

	async function abortRoomMatch() {
		if (!roomId || !canAbortRoomMatch || actionLoading || isSpectator) {
			return;
		}

		if (!confirm($_('pvp.abort_room_match_confirm'))) {
			return;
		}

		actionLoading = 'abort-room-match';

		try {
			await endPvpRoomMatch(await $user.token(), roomId);
			await refreshMatch();
			await refreshMessages({ incremental: true });
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: $_('pvp.toast.room_match_abort_failed')
			);
		} finally {
			actionLoading = '';
		}
	}

	async function abortMatchAsManager() {
		if (!matchId || !canAbortAsManager || actionLoading) {
			return;
		}

		if (!confirm($_('pvp.manager_abort_match_confirm'))) {
			return;
		}

		actionLoading = 'manager-abort-match';

		try {
			const response = await abortPvpMatchAsManager(await $user.token(), matchId);
			setMatch(response);
			await refreshMessages({ incremental: true });
			toast.success($_('pvp.toast.manager_match_abort_success'));
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: $_('pvp.toast.manager_match_abort_failed')
			);
		} finally {
			actionLoading = '';
		}
	}

	async function setMatchPaused(paused: boolean) {
		if (!matchId || !canControlTournamentMatch || actionLoading) {
			return;
		}

		actionLoading = paused ? 'pause-match' : 'unpause-match';

		try {
			const response = await setTournamentPvpMatchPaused(
				await $user.token(),
				matchId,
				paused
			);
			setMatch(response);
			toast.success(
				$_(paused ? 'pvp.toast.match_pause_success' : 'pvp.toast.match_unpause_success')
			);
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: $_('pvp.toast.match_pause_failed')
			);
		} finally {
			actionLoading = '';
		}
	}

	async function requeue() {
		if (!match || actionLoading || isSpectator) {
			return;
		}

		actionLoading = 'requeue';

		try {
			const revealAfterMatchEnd = Boolean(
				selfParticipant?.anonymousRevealAfterMatchEnd
				?? selfParticipant?.anonymous_reveal_after_match_end
			);
			const anonymous = getPvpParticipantIsAnonymous(selfParticipant)
				|| revealAfterMatchEnd;
			const params = new URLSearchParams({
				requeue: '1',
				mode: matchMode,
				anonymous: anonymous ? '1' : '0',
				reveal: revealAfterMatchEnd ? '1' : '0'
			});
			await goto(`/versus/play?${params.toString()}`);
		} finally {
			actionLoading = '';
		}
	}

	function handleReportSubmitted(report: PvpMatchReport) {
		if (!matchId) {
			return;
		}

		const targetType = getPvpReportTargetType(report);

		if (targetType === 'level') {
			locallyReportedLevelMatchIds = new Set(locallyReportedLevelMatchIds)
				.add(String(matchId));
		} else {
			locallyReportedPlayerMatchIds = new Set(locallyReportedPlayerMatchIds)
				.add(String(matchId));
		}

		if (match) {
			const nextMatch = {
				...match,
				viewerReports: mergePvpViewerReports(match.viewerReports ?? match.viewer_reports ?? [], report)
			};

			if (targetType === 'level') {
				setMatch({
					...nextMatch,
					viewerLevelReport: report,
					reportedLevelByViewer: true
				});
			} else {
				setMatch({
					...nextMatch,
					viewerReport: report,
					viewerPlayerReport: report,
					reportedByViewer: true,
					reportedPlayerByViewer: true
				});
			}
		}
	}

	async function sendChatMessage() {
		if (!matchId || chatInputDisabled || actionLoading === 'send-chat' || isSpectator) {
			return;
		}

		const content = chatDraft.trim();

		if (!content) {
			return;
		}

		actionLoading = 'send-chat';

		try {
			const message = await sendPvpMatchMessage(
				await $user.token(),
				matchId,
				content
			);
			chatDraft = '';
			messages = mergeMessages(messages, [message]);
			await scrollChatToBottom();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'Failed to send message'
			);
		} finally {
			actionLoading = '';
		}
	}

	function statusLabel(value: unknown) {
		const key = String(value || 'pending');

		return $_(`pvp.status.${key}`);
	}

	function resultReasonLabel(value: unknown) {
		const key = String(value || '')
			.trim();

		if (!key) {
			return '';
		}

		const label = $_(`pvp.result_reason.${key}`);

		return label === `pvp.result_reason.${key}` ? key : label;
	}

	function hideBrokenImage(event: Event) {
		const target = event.currentTarget as HTMLImageElement | null;

		if (target) {
			target.style.display = 'none';
		}
	}

	function formatDuration(ms: number | null) {
		if (ms === null) {
			return '--:--';
		}

		const totalSeconds = Math.max(0, Math.floor(ms / 1000));
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;

		return `${minutes}:${String(seconds)
			.padStart(2, '0')}`;
	}

	function getYouTubeVideoId(value: unknown) {
		const raw = String(value || '')
			.trim();

		if (!raw) {
			return null;
		}

		if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) {
			return raw;
		}

		const match = raw.match(
			/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/
		);

		return match?.[1] ?? null;
	}

	function resultTitle(
		currentMatch: PvpMatch | null = match,
		currentStatus: string = status,
		currentWinnerUid: string | null | undefined = winnerUid,
		items: PvpParticipant[] = participants,
		hideInfo: boolean = hideOpponentInfo,
		viewerUid: string | null | undefined = currentUid
	) {
		if (!currentMatch) {
			return $_('pvp.match_loading');
		}

		if (currentStatus === 'completed') {
			if (!currentWinnerUid) {
				return $_('pvp.result.draw');
			}

			return $_('pvp.winner_named', {
				values: {
					name: winnerName(currentWinnerUid, items, hideInfo, viewerUid)
				}
			});
		}

		if (currentStatus === 'cancelled') {
			return $_('pvp.result.cancelled');
		}

		if (currentStatus === 'disputed') {
			return $_('pvp.result.disputed');
		}

		if (currentStatus === 'pending') {
			return $_('pvp.match_found_title');
		}

		if (currentStatus === 'ban_pick') {
			return $_('pvp.ban_pick.title');
		}

		return $_('pvp.timer_active');
	}

	function participantName(
		participant: PvpParticipant | null | undefined,
		hideInfo: boolean = hideOpponentInfo,
		viewerUid: string | null | undefined = currentUid,
		infoConfirmed: boolean = playerInfoConfirmed
	) {
		if (participant && !infoConfirmed) {
			return $_('pvp.hidden_player');
		}

		if (participantIsAnonymous(participant)) {
			return $_(
				'pvp.anonymous_player'
			);
		}

		if (shouldHideParticipantInfo(participant, hideInfo, viewerUid)) {
			return $_('pvp.hidden_opponent');
		}

		const player = getPvpParticipantPlayer(participant);

		return player?.name || (participant
			? getPvpParticipantDisplayName(participant, $_('pvp.rooms.player'))
			: null);
	}

	function participantIsAnonymous(
		participant: PvpParticipant | null | undefined
	) {
		return getPvpParticipantIsAnonymous(participant);
	}

	function shouldHideParticipantInfo(
		participant: PvpParticipant | null | undefined,
		hideInfo: boolean = hideOpponentInfo,
		viewerUid: string | null | undefined = currentUid,
		infoConfirmed: boolean = playerInfoConfirmed
	) {
		const uid = getPvpParticipantUid(participant);

		if (isRoomMatch) {
			return false;
		}

		if (participant && !infoConfirmed) {
			return true;
		}

		return Boolean(hideInfo && uid && uid !== viewerUid);
	}

	function shouldMaskParticipant(
		participant: PvpParticipant | null | undefined,
		hideInfo: boolean = hideOpponentInfo,
		viewerUid: string | null | undefined = currentUid,
		infoConfirmed: boolean = playerInfoConfirmed
	) {
		return (
			Boolean(participant && !infoConfirmed)
			|| participantIsAnonymous(participant)
			|| shouldHideParticipantInfo(
				participant,
				hideInfo,
				viewerUid,
				infoConfirmed
			)
		);
	}

	function participantTitleName(
		participant: PvpParticipant | null | undefined,
		hideInfo: boolean = hideOpponentInfo,
		viewerUid: string | null | undefined = currentUid
	) {
		if (!participant) {
			return $_('pvp.waiting_opponent');
		}

		return participantName(participant, hideInfo, viewerUid);
	}

	function getMatchTitle(
		items: PvpParticipant[],
		hideInfo: boolean = hideOpponentInfo,
		viewerUid: string | null | undefined = currentUid
	) {
		if (items.length === 0) {
			return $_('pvp.match_loading');
		}

		return `${participantTitleName(items[0], hideInfo, viewerUid)} vs ${
			participantTitleName(
				items[1],
				hideInfo,
				viewerUid
			)
		}`;
	}

	function winnerName(
		currentWinnerUid: string | null | undefined = winnerUid,
		items: PvpParticipant[] = participants,
		hideInfo: boolean = hideOpponentInfo,
		viewerUid: string | null | undefined = currentUid
	) {
		const winner = items.find(
			(participant) => getPvpParticipantUid(participant) === currentWinnerUid
		);

		return winner
			? participantName(winner, hideInfo, viewerUid)
			: currentWinnerUid || '--';
	}

	function orderParticipants(
		items: PvpParticipant[],
		uid: string | null | undefined
	) {
		if (!uid) {
			return items;
		}

		const selfIndex = items.findIndex((participant) =>
			getPvpParticipantUid(participant) === uid
		);

		if (selfIndex <= 0) {
			return items;
		}

		return [
			items[selfIndex],
			...items.slice(0, selfIndex),
			...items.slice(selfIndex + 1)
		];
	}

	function participantLabel(
		participant: PvpParticipant,
		viewerUid: string | null | undefined = currentUid
	) {
		if (isRoomMatch && getPvpParticipantUid(participant) !== viewerUid) {
			return $_('pvp.rooms.player');
		}

		return getPvpParticipantUid(participant) === viewerUid
			? $_('pvp.you')
			: $_('pvp.rival');
	}

	function participantPracticeModeActive(
		participant: PvpParticipant | null | undefined,
		sourceMessages: PvpMatchMessage[] = messages
	) {
		const participantMode = participant?.playMode ?? participant?.play_mode;

		if (participantMode === 'practice') {
			return true;
		}

		const uid = getPvpParticipantUid(participant);

		if (!uid) {
			return false;
		}

		const latestPlayModeEvent = messagesAfterLatestLevelChange(sourceMessages)
			.map((message) => playModeMessageEvent(message))
			.filter((
				entry
			): entry is NonNullable<ReturnType<typeof playModeMessageEvent>> =>
				Boolean(entry)
			)
			.filter((entry) => String(entry.uid) === String(uid))
			.sort((a, b) => b.timeMs - a.timeMs)[0];

		return latestPlayModeEvent?.playMode === 'practice';
	}

	function participantPaused(
		participant: PvpParticipant | null | undefined,
		sourceMessages: PvpMatchMessage[] = messages
	) {
		const uid = getPvpParticipantUid(participant);

		if (!uid) {
			return false;
		}

		let paused = false;

		for (const message of messagesAfterLatestLevelChange(sourceMessages)) {
			const pauseEvent = pauseStateMessageEvent(message);

			if (pauseEvent && String(pauseEvent.uid) === String(uid)) {
				paused = pauseEvent.paused;
				continue;
			}

			const progressEvent = progressMessageEvent(message);

			if (
				progressEvent
				&& String(progressEvent.uid) === String(uid)
			) {
				paused = false;
			}
		}

		return paused;
	}

	function messageMetadata(message: PvpMatchMessage): Record<string, unknown> {
		const metadata = message.metadata;

		return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
			? metadata
			: {};
	}

	function metadataText(metadata: Record<string, unknown>, key: string) {
		const value = metadata[key];

		return value === undefined || value === null ? '' : String(value)
			.trim();
	}

	function metadataNumber(metadata: Record<string, unknown>, key: string) {
		const value = Number(metadata[key]);

		return Number.isFinite(value) ? value : null;
	}

	function messageMetadataKind(message: PvpMatchMessage) {
		return metadataText(messageMetadata(message), 'kind');
	}

	function messageRevealAtMs(message: PvpMatchMessage) {
		const revealAt = metadataText(messageMetadata(message), 'revealAt');

		if (!revealAt) {
			return null;
		}

		const ms = new Date(revealAt)
			.getTime();

		return Number.isFinite(ms) ? ms : null;
	}

	function messageIsRevealed(message: PvpMatchMessage, nowMs = now) {
		const revealAtMs = messageRevealAtMs(message);

		return revealAtMs === null || revealAtMs <= nowMs;
	}

	function getVisibleMessages(
		sourceMessages: PvpMatchMessage[],
		currentMatch: PvpMatch | null | undefined,
		currentStatus: string,
		viewerUid: string | null | undefined,
		currentWinnerUid: string | null | undefined,
		items: PvpParticipant[],
		nowMs = now
	) {
		const revealed = sourceMessages.filter((message) => {
			const kind = messageMetadataKind(message);

			return messageIsRevealed(message, nowMs)
				&& !['progress_run', 'progress_run_sample', 'progress_run_end', 'pause_state'].includes(kind);
		});
		const specialMessage = getMatchEndSpecialMessage(
			currentMatch,
			currentStatus,
			viewerUid,
			currentWinnerUid,
			items,
			nowMs
		);

		return specialMessage ? [...revealed, specialMessage] : revealed;
	}

	function getMatchEndSpecialMessage(
		currentMatch: PvpMatch | null | undefined,
		currentStatus: string,
		viewerUid: string | null | undefined,
		currentWinnerUid: string | null | undefined,
		items: PvpParticipant[],
		nowMs = now
	): PvpMatchMessage | null {
		const id = getPvpMatchId(currentMatch) ?? matchId;

		if (
			!id || currentStatus !== 'completed' || !viewerUid || !currentWinnerUid
		) {
			return null;
		}

		const matchParticipants = getMatchEndSpecialParticipants(
			currentMatch,
			items
		);
		const viewerParticipant = matchParticipants.find((item) =>
			sameUid(getPvpParticipantUid(item), viewerUid)
		);
		const opponent = matchParticipants.find((item) =>
			!sameUid(getPvpParticipantUid(item), viewerUid)
		);

		if (!viewerParticipant || !opponent) {
			return null;
		}

		const result: MatchEndSpecialResult = sameUid(viewerUid, currentWinnerUid)
			? 'win'
			: 'lose';
		const viewerIsSupporter = participantIsActiveSupporter(
			viewerParticipant,
			nowMs
		);
		const opponentIsSupporter = participantIsActiveSupporter(opponent, nowMs);
		const scenario = getMatchEndSpecialScenario(
			viewerIsSupporter,
			opponentIsSupporter
		);
		const pool = getMatchEndSpecialPool(id, scenario);
		const action = getMatchEndSpecialAction(pool, scenario);
		const variantCount = pool === 'generic'
			? MATCH_END_SPECIAL_GENERIC_COUNTS[result]
			: MATCH_END_SPECIAL_SUPPORTER_COUNTS[result];
		const variantIndex = seededIndex(`${id}:match-end-special:item`, variantCount);
		const createdAt = currentMatch?.endedAt
			?? currentMatch?.endsAt
			?? currentMatch?.endAt
			?? currentMatch?.startedAt
			?? currentMatch?.created_at
			?? new Date()
				.toISOString();

		return {
			id: `match-end-special:${id}`,
			matchId: id,
			type: 'system',
			created_at: createdAt,
			metadata: {
				kind: 'match_end_special',
				viewerUid,
				pool,
				scenario,
				result,
				variantIndex,
				action
			}
		};
	}

	function getMatchEndSpecialParticipants(
		currentMatch: PvpMatch | null | undefined,
		items: PvpParticipant[]
	): PvpParticipant[] {
		if (items.length > 0) {
			return items;
		}

		const results = currentMatch?.results;

		return Array.isArray(results) ? results : [];
	}

	function participantIsActiveSupporter(
		participant: PvpParticipant | null | undefined,
		nowMs = now
	) {
		const player = getPvpParticipantPlayer(participant);
		const supporterUntil = String(
			player?.supporterUntil
			?? player?.supporter_until
			?? ''
		)
			.trim();

		if (!supporterUntil) {
			return false;
		}

		const expiresMs = new Date(supporterUntil)
			.getTime();

		return Number.isFinite(expiresMs) && expiresMs > nowMs;
	}

	function getMatchEndSpecialScenario(
		viewerIsSupporter: boolean,
		opponentIsSupporter: boolean
	): MatchEndSpecialScenario {
		if (viewerIsSupporter && opponentIsSupporter) {
			return 'both_are_supporters';
		}

		if (viewerIsSupporter) {
			return 'supporter_vs_none';
		}

		if (opponentIsSupporter) {
			return 'none_vs_supporter';
		}

		return 'none_vs_none';
	}

	function getMatchEndSpecialPool(
		id: string | number,
		scenario: MatchEndSpecialScenario
	): MatchEndSpecialPool {
		const genericWeight = MATCH_END_SPECIAL_GENERIC_WEIGHTS[scenario];
		const roll = seededIndex(`${id}:match-end-special:pool`, 100);

		return roll < genericWeight ? 'generic' : 'supporter_contextual';
	}

	function getMatchEndSpecialAction(
		pool: MatchEndSpecialPool,
		scenario: MatchEndSpecialScenario
	): MatchEndSpecialAction {
		if (pool === 'generic') {
			return 'ACTION_REQUEUE';
		}

		return scenario === 'none_vs_none' || scenario === 'none_vs_supporter'
			? 'REDIRECT_TO_DONATE'
			: 'REDIRECT_TO_UPGRADE';
	}

	function seededIndex(seed: string, count: number) {
		const normalizedCount = Math.max(1, Math.floor(count));

		return stableHash(seed) % normalizedCount;
	}

	function stableHash(value: string) {
		let hash = 2166136261;

		for (let index = 0; index < value.length; index += 1) {
			hash ^= value.charCodeAt(index);
			hash = Math.imul(hash, 16777619);
		}

		return hash >>> 0;
	}

	function systemMessageActionLabel(message: PvpMatchMessage) {
		if (message.type !== 'system') {
			return '';
		}

		const metadata = messageMetadata(message);
		const kind = messageMetadataKind(message);

		if (kind === 'match_end_special') {
			const action = metadataText(metadata, 'action');

			if (action === 'REDIRECT_TO_DONATE') {
				return $_('pvp.match_end_special.cta.donate');
			}

			if (action === 'REDIRECT_TO_UPGRADE') {
				return $_('pvp.match_end_special.cta.upgrade');
			}

			if (action === 'ACTION_REQUEUE' && canRequeue) {
				return $_('pvp.match_end_special.cta.requeue');
			}

			return '';
		}

		const requesterUid = metadataText(metadata, 'requesterUid');

		if (
			!requesterUid || String(requesterUid) === String(currentUid || '')
		) {
			return '';
		}

		if (
			kind === 'level_change_requested'
			&& canRequestLevelChange
			&& String(levelChangeRequestedByUid || '') === requesterUid
		) {
			return levelChangeRequestActive
				? `${$_('pvp.agree_level_change')} (${
					formatDuration(levelChangeRequestRemainingMs)
				})`
				: $_('pvp.request_expired');
		}

		if (
			kind === 'ban_pick_abort_requested'
			&& canRequestBanPickAbort
			&& String(banPickAbortRequestedByUid || '') === requesterUid
		) {
			return banPickAbortRequestActive
				? `${$_('pvp.agree_ban_pick_abort')} (${
					formatDuration(banPickAbortRequestRemainingMs)
				})`
				: $_('pvp.request_expired');
		}

		return '';
	}

	function systemMessageActionDisabled(message: PvpMatchMessage) {
		if (actionLoading) {
			return true;
		}

		const kind = messageMetadataKind(message);

		if (kind === 'match_end_special') {
			const action = metadataText(messageMetadata(message), 'action');

			return action === 'ACTION_REQUEUE' && !canRequeue;
		}

		if (kind === 'level_change_requested') {
			return !levelChangeRequestActive;
		}

		if (kind === 'ban_pick_abort_requested') {
			return !banPickAbortRequestActive;
		}

		return false;
	}

	function handleSystemMessageAction(message: PvpMatchMessage) {
		const kind = messageMetadataKind(message);

		if (kind === 'level_change_requested') {
			void requestLevelChange();

			return;
		}

		if (kind === 'ban_pick_abort_requested') {
			void requestBanPickAbort();
		}

		if (kind === 'match_end_special') {
			const action = metadataText(messageMetadata(message), 'action');

			if (action === 'ACTION_REQUEUE') {
				void requeue();

				return;
			}

			if (action === 'REDIRECT_TO_DONATE' || action === 'REDIRECT_TO_UPGRADE') {
				void goto('/supporter');
			}
		}
	}

	function normalizedScoringMode(value: unknown): PvpRoomScoringMode {
		return value === 'score' || value === 'hp' || value === 'powerup'
			? value
			: 'progress';
	}

	function isScoreLikeScoringMode(value: PvpRoomScoringMode | string) {
		return value === 'score' || value === 'powerup';
	}

	function powerupSkills() {
		return powerupState?.skills ?? [];
	}

	function powerupSkillName(skill: unknown) {
		const value = String(skill || '')
			.trim()
			.toLowerCase();

		if (
			value === 'flashbang'
			|| value === 'invisible'
			|| value === 'shield'
			|| value === 'pause'
			|| value === 'double_click'
			|| value === 'force_reset'
		) {
			return $_(`pvp.powerups.skills.${value}.name`);
		}

		return value || $_('pvp.powerups.skill');
	}

	function powerupSkillDescription(skill: unknown) {
		const value = String(skill || '')
			.trim()
			.toLowerCase();

		if (
			value === 'flashbang'
			|| value === 'invisible'
			|| value === 'shield'
			|| value === 'pause'
			|| value === 'double_click'
			|| value === 'force_reset'
		) {
			return $_(`pvp.powerups.skills.${value}.description`);
		}

		return '';
	}

	function powerupDurationLabel(durationMs: unknown) {
		const seconds = Number(durationMs) / 1000;

		return Number.isFinite(seconds) && seconds > 0
			? $_('pvp.powerups.duration', {
				values: { duration: compactNumber(seconds) }
			})
			: '';
	}

	function powerupTargetName(participant: PvpParticipant) {
		return participantName(
			participant,
			effectiveHideOpponentInfo,
			currentUid
		) || $_('pvp.rival');
	}

	function participantPowerupMana(participant: PvpParticipant) {
		const uid = getPvpParticipantUid(participant);
		const state = powerupState?.playerMana?.find((item) => item.uid === uid);
		const maxMana = Math.max(1, Math.floor(Number(state?.maxMana) || 100));
		const mana = Math.max(
			0,
			Math.min(maxMana, Math.floor(Number(state?.mana) || 0))
		);

		return {
			mana,
			maxMana,
			percent: Math.max(0, Math.min(100, (mana / maxMana) * 100))
		};
	}

	function powerupActionKey(
		skill: PvpPowerupSkill | string,
		targetUid?: string | null,
		randomTarget = false
	) {
		return `${skill}:${randomTarget ? 'random' : targetUid || 'self'}`;
	}

	function powerupSkillCost(skill: PowerupSkillConfig) {
		const cost = Math.floor(Number(skill.cost));

		return Number.isFinite(cost) && cost > 0 ? cost : 0;
	}

	function isShieldPowerupSkill(skill: PowerupSkillConfig) {
		return skill.skill === 'shield';
	}

	function isPowerupSkillHarmful(skill: PowerupSkillConfig) {
		return !isShieldPowerupSkill(skill) && skill.harmful === true;
	}

	function canCastPowerup(skill: PowerupSkillConfig) {
		const cost = powerupSkillCost(skill);

		if (
			!canUsePowerups
			|| powerupCastLoading
			|| powerupMana < cost
		) {
			return false;
		}

		if (isShieldPowerupSkill(skill)) {
			return !powerupState?.shieldActive;
		}

		return !isPowerupSkillHarmful(skill) || powerupTargets.length > 0;
	}

	function progressMessageEvent(
		message: PvpMatchMessage,
		mode: PvpMode = matchMode,
		currentScoringMode: PvpRoomScoringMode | string = scoringMode
	) {
		const kind = messageMetadataKind(message);

		if (
			message.type !== 'system'
			|| !['progress', 'death'].includes(kind)
		) {
			return null;
		}

		const metadata = messageMetadata(message);
		const messageScoringMode = normalizedScoringMode(metadataText(metadata, 'scoringMode'));
		const uid = metadataText(metadata, 'uid');
		const progress = metadataNumber(metadata, 'progress');
		const timeMs = getTimeMs(message.created_at);

		if (!uid || progress === null || !timeMs) {
			return null;
		}

		if (
			(isScoreLikeScoringMode(currentScoringMode) || currentScoringMode === 'hp')
			&& messageScoringMode !== currentScoringMode
		) {
			return null;
		}

		return {
			uid,
			kind,
			progress: mode === 'platformer'
				? Math.max(0, Math.floor(progress))
				: isScoreLikeScoringMode(currentScoringMode) || currentScoringMode === 'hp'
				? Math.max(0, progress)
				: Math.max(0, Math.min(100, progress)),
			timeMs
		};
	}

	function getMessagePlayerProgress(sourceMessages: PvpMatchMessage[]) {
		const progressByUid = new Map<string, number>();

		for (const message of messagesAfterLatestLevelChange(sourceMessages)) {
			const event = progressMessageEvent(message);

			if (!event) {
				continue;
			}

			if (event.kind === 'death') {
				progressByUid.set(event.uid, event.progress);
				continue;
			}

			progressByUid.set(
				event.uid,
				Math.max(progressByUid.get(event.uid) ?? 0, event.progress)
			);
		}

		return progressByUid;
	}

	function playModeMessageEvent(message: PvpMatchMessage): {
		uid: string;
		playMode: PvpPlayMode;
		timeMs: number;
		elapsedMs: number | null;
	} | null {
		if (
			message.type !== 'system' || messageMetadataKind(message) !== 'play_mode'
		) {
			return null;
		}

		const metadata = messageMetadata(message);
		const uid = metadataText(metadata, 'uid');
		const playMode: PvpPlayMode | null = metadataText(metadata, 'playMode') === 'practice'
			? 'practice'
			: metadataText(metadata, 'playMode') === 'normal'
			? 'normal'
			: null;
		const timeMs = getTimeMs(message.created_at);

		if (!uid || !playMode || !timeMs) {
			return null;
		}

		return {
			uid,
			playMode,
			timeMs,
			elapsedMs: metadataNumber(metadata, 'elapsedMs')
		};
	}

	function pauseStateMessageEvent(message: PvpMatchMessage): {
		uid: string;
		paused: boolean;
		progress: number;
		timeMs: number;
		elapsedMs: number | null;
	} | null {
		if (
			message.type !== 'system' || messageMetadataKind(message) !== 'pause_state'
		) {
			return null;
		}

		const metadata = messageMetadata(message);
		const uid = metadataText(metadata, 'uid');
		const progress = metadataNumber(metadata, 'progress');
		const paused = metadata.paused === true || metadataText(metadata, 'paused') === 'true';
		const timeMs = metadataNumber(metadata, 'sampledAtMs')
			?? getTimeMs(metadataText(metadata, 'sampledAt'))
			?? getTimeMs(message.created_at);

		if (!uid || progress === null || !timeMs) {
			return null;
		}

		return {
			uid,
			paused,
			progress: Math.max(0, Math.min(100, progress)),
			timeMs,
			elapsedMs: metadataNumber(metadata, 'elapsedMs')
		};
	}

	function powerupEffectMessageEvent(message: PvpMatchMessage): {
		uid: string;
		skill: ProgressGraphPowerupSkill;
		timeMs: number;
		durationMs: number;
	} | null {
		if (
			message.type !== 'system'
			|| messageMetadataKind(message) !== 'powerup_skill'
		) {
			return null;
		}

		const metadata = messageMetadata(message);
		const skillText = metadataText(metadata, 'skill');
		const skill: ProgressGraphPowerupSkill | null = skillText === 'flashbang'
			? 'flashbang'
			: skillText === 'invisible'
			? 'invisible'
			: skillText === 'double_click'
			? 'double_click'
			: null;
		const uid = metadataText(metadata, 'targetUid');
		const durationMs = metadataNumber(metadata, 'durationMs');
		const timeMs = getTimeMs(message.created_at);

		if (!uid || !skill || !timeMs || !durationMs || durationMs <= 0) {
			return null;
		}

		return {
			uid,
			skill,
			timeMs,
			durationMs
		};
	}

	function isLevelChangedMessage(message: PvpMatchMessage) {
		return message.type === 'system'
			&& messageMetadataKind(message) === 'level_changed';
	}

	function messagesAfterLatestLevelChange(sourceMessages: PvpMatchMessage[]) {
		const latestLevelChangeIndex = sourceMessages.reduce(
			(
				latest,
				message,
				index
			) => (isLevelChangedMessage(message) ? index : latest),
			-1
		);

		return latestLevelChangeIndex >= 0
			? sourceMessages.slice(latestLevelChangeIndex + 1)
			: sourceMessages;
	}

	function getProgressGraphData(
		sourceMessages: PvpMatchMessage[],
		items: PvpParticipant[] = orderedParticipants,
		mode: PvpMode = matchMode,
		sourceMatch: PvpMatch | null = match,
		nowMs = now,
		matchStatus = status,
		useNeutralPlayerColors = false,
		colorMode: OverlayColorMode = overlayColorMode
	): ProgressGraphData {
		const currentScoringMode = normalizedScoringMode(
			sourceMatch?.scoringMode ?? sourceMatch?.scoring_mode ?? scoringMode
		);
		const currentTargetScore = sourceMatch?.targetScore ?? sourceMatch?.target_score ?? targetScore;
		const currentStartingHp = sourceMatch?.startingHp ?? sourceMatch?.starting_hp ?? startingHp;
		const progressMessages = messagesAfterLatestLevelChange(sourceMessages);
		const series = items
			.map((participant, index) => {
				const participantUid = getPvpParticipantUid(participant)
					? String(getPvpParticipantUid(participant))
					: null;

				return {
					uid: participantUid,
					label: participantName(participant, effectiveHideOpponentInfo, currentUid) ?? '',
					color: progressGraphPlayerColor(
						participantUid,
						index,
						useNeutralPlayerColors
					),
					points: [] as ProgressGraphPoint[]
				};
			});

		const parsed = progressMessages
			.map((message) => progressMessageEvent(message, mode, currentScoringMode))
			.filter((
				entry
			): entry is NonNullable<ReturnType<typeof progressMessageEvent>> =>
				Boolean(entry)
			)
			.sort((a, b) => a.timeMs - b.timeMs);
		const rawPowerupEffectEvents = currentScoringMode === 'powerup'
			? progressMessages
				.map((message) => powerupEffectMessageEvent(message))
				.filter((
					entry
				): entry is NonNullable<
					ReturnType<typeof powerupEffectMessageEvent>
				> => Boolean(entry))
			: [];
		const rawPauseStateEvents = progressMessages
			.map((message) => pauseStateMessageEvent(message))
			.filter((
				entry
			): entry is NonNullable<ReturnType<typeof pauseStateMessageEvent>> =>
				Boolean(entry)
			);

		const origin = getPvpMatchStartMs(sourceMatch)
			?? parsed.reduce<number | null>(
				(earliest, entry) =>
					earliest === null || entry.timeMs < earliest
						? entry.timeMs
						: earliest,
				null
			)
			?? rawPowerupEffectEvents.reduce<number | null>(
				(earliest, entry) =>
					earliest === null || entry.timeMs < earliest
						? entry.timeMs
						: earliest,
				null
			)
			?? rawPauseStateEvents.reduce<number | null>(
				(earliest, entry) =>
					earliest === null || entry.timeMs < earliest
						? entry.timeMs
						: earliest,
				null
			)
			?? 0;
		const matchEndMs = getProgressGraphEndMs(sourceMatch, matchStatus, nowMs);
		const liveEndMs = ['in_progress', 'waiting_result'].includes(matchStatus)
			? nowMs
			: matchEndMs;
		const modeEvents = progressMessages
			.map((message) => playModeMessageEvent(message))
			.filter((
				entry
			): entry is NonNullable<ReturnType<typeof playModeMessageEvent>> =>
				Boolean(entry)
			)
			.map((entry) => ({
				uid: entry.uid,
				playMode: entry.playMode,
				timeMs: entry.timeMs,
				x: Math.max(
					0,
					Math.round(
						Number.isFinite(Number(entry.elapsedMs))
							? Number(entry.elapsedMs) / 1000
							: (entry.timeMs - origin) / 1000
					)
				)
			}))
			.sort((a, b) => a.x - b.x || a.timeMs - b.timeMs);
		const powerupEffectEvents: ProgressGraphPowerupEffectEvent[] =
			rawPowerupEffectEvents
				.map((entry) => {
					const x = Math.max(
						0,
						(entry.timeMs - origin) / 1000
					);
					const durationSeconds = Math.max(0, entry.durationMs / 1000);

					return {
						...entry,
						x,
						endX: x + durationSeconds
					};
				})
				.sort((a, b) => a.x - b.x || a.timeMs - b.timeMs);
		const pauseStateEvents: ProgressGraphPauseStateEvent[] = [
			...rawPauseStateEvents.map((entry) => ({
				uid: entry.uid,
				paused: entry.paused,
				timeMs: entry.timeMs,
				elapsedMs: entry.elapsedMs,
				x: Math.max(
					0,
					Number.isFinite(Number(entry.elapsedMs))
						? Number(entry.elapsedMs) / 1000
						: (entry.timeMs - origin) / 1000
				)
			})),
			...parsed
				.map((entry) => ({
					uid: entry.uid,
					paused: false,
					timeMs: entry.timeMs,
					elapsedMs: null,
					x: Math.max(0, (entry.timeMs - origin) / 1000)
				}))
		]
			.sort((a, b) => a.x - b.x || a.timeMs - b.timeMs);

		for (const entry of parsed) {
			const target = series.find((item) => item.uid === entry.uid);

			if (!target) {
				continue;
			}

			const point = {
				x: Math.max(0, (entry.timeMs - origin) / 1000),
				y: entry.progress,
				timeMs: entry.timeMs
			};

			target.points.push(point);
		}

		const maxX = Math.max(
			60,
			Math.round(Math.max(0, (liveEndMs ?? origin) - origin) / 1000),
			...modeEvents.map((event) => event.x),
			...pauseStateEvents.map((event) => event.x),
			...powerupEffectEvents.map((event) => event.endX),
			...series.flatMap((item) => item.points.map((point) => point.x))
		);
		const maxProgress = Math.max(
			0,
			...series.flatMap((item) => item.points.map((point) => point.y))
		);
		const maxY = mode === 'platformer'
			? Math.max(1, maxProgress)
			: isScoreLikeScoringMode(currentScoringMode)
			? Math.max(1, Number(currentTargetScore) || 0, maxProgress)
			: currentScoringMode === 'hp'
			? Math.max(1, Number(currentStartingHp) || 0, maxProgress)
			: 100;
		const modeLaneGap = maxY * 0.06;
		const modeLanes = series.map((_, index) => -modeLaneGap * (index + 1));
		const powerupLanes = series.map(
			(_, index) => -modeLaneGap * (series.length * 2 + index + 1)
		);
		const pauseLanes = series.map(
			(_, index) => -modeLaneGap * (series.length + index + 1)
		);
		const modeTimelineAvailable = [
			'in_progress',
			'waiting_result',
			'completed',
			'cancelled',
			'disputed'
		].includes(matchStatus)
			|| modeEvents.length > 0
			|| pauseStateEvents.length > 0
			|| powerupEffectEvents.length > 0
			|| parsed.length > 0;
		const modeSegments = modeTimelineAvailable
			? [
				...getProgressGraphModeSegments(
					series,
					modeEvents,
					maxX,
					modeLanes
				),
				...getProgressGraphPauseSegments(
					series,
					pauseStateEvents,
					maxX,
					pauseLanes
				),
				...getProgressGraphPowerupEffectSegments(
					series,
					powerupEffectEvents,
					maxX,
					powerupLanes
				)
			]
			: [];
		const minY = modeSegments.length > 0
			? Math.min(...modeSegments.map((segment) => segment.y)) - modeLaneGap * 0.75
			: 0;

		return {
			series,
			modeSegments,
			hasPoints: series.some((item) => item.points.length > 0)
				|| modeSegments.length > 0,
			minX: 0,
			maxX,
			minY,
			maxY,
			mode,
			scoringMode: currentScoringMode,
			targetScore: currentTargetScore,
			startingHp: currentStartingHp,
			colorMode
		};
	}

	function getProgressGraphEndMs(
		sourceMatch: PvpMatch | null,
		matchStatus: string,
		nowMs: number
	) {
		if (['in_progress', 'waiting_result'].includes(matchStatus)) {
			return nowMs;
		}

		if (!['pending', 'ban_pick'].includes(matchStatus)) {
			return getTimeMs(
				sourceMatch?.endedAt
				?? sourceMatch?.ratingAppliedAt
				?? sourceMatch?.rating_applied_at
				?? sourceMatch?.completedAt
				?? sourceMatch?.endAt
			)
				?? null;
		}

		return getPvpMatchEndMs(sourceMatch) ?? nowMs;
	}

	function getProgressGraphModeSegments(
		series: Array<ProgressGraphSeries & { uid: string | null; }>,
		modeEvents: ProgressGraphModeEvent[],
		maxX: number,
		lanes: number[]
	): ProgressGraphModeSegment[] {
		return series.flatMap((item, index) => {
			if (!item.uid || !item.label) {
				return [];
			}

			const events = modeEvents.filter((event) => event.uid === item.uid);
			const segments: ProgressGraphModeSegment[] = [];
			let currentMode: PvpPlayMode = 'normal';
			let currentStart = 0;

			for (const event of events) {
				if (event.x < currentStart) {
					continue;
				}

				if (event.playMode === currentMode) {
					continue;
				}

				if (event.x > currentStart) {
					segments.push(
						createProgressGraphModeSegment(
							item.uid,
							item.label,
							currentMode,
							currentStart,
							event.x,
							lanes[index] ?? lanes[0]
						)
					);
				}

				currentMode = event.playMode;
				currentStart = event.x;
			}

			if (maxX > currentStart) {
				segments.push(
					createProgressGraphModeSegment(
						item.uid,
						item.label,
						currentMode,
						currentStart,
						maxX,
						lanes[index] ?? lanes[0]
					)
				);
			}

			return segments;
		});
	}

	function getProgressGraphPowerupEffectSegments(
		series: Array<ProgressGraphSeries & { uid: string | null; }>,
		events: ProgressGraphPowerupEffectEvent[],
		maxX: number,
		lanes: number[]
	): ProgressGraphModeSegment[] {
		return series.flatMap((item, index) => {
			if (!item.uid || !item.label) {
				return [];
			}

			return events
				.filter((event) => event.uid === item.uid && event.endX > event.x)
				.map((event) => createProgressGraphPowerupEffectSegment(
					item.uid!,
					item.label,
					event.skill,
					event.x,
					Math.min(maxX, event.endX),
					lanes[index] ?? lanes[0]
				));
		});
	}

	function getProgressGraphPauseSegments(
		series: Array<ProgressGraphSeries & { uid: string | null; }>,
		events: ProgressGraphPauseStateEvent[],
		maxX: number,
		lanes: number[]
	): ProgressGraphModeSegment[] {
		return series.flatMap((item, index) => {
			if (!item.uid || !item.label) {
				return [];
			}

			const playerEvents = events.filter((event) => event.uid === item.uid);
			const segments: ProgressGraphModeSegment[] = [];
			let pausedAt: number | null = null;

			for (const event of playerEvents) {
				if (event.paused) {
					pausedAt ??= event.x;
					continue;
				}

				if (pausedAt !== null && event.x > pausedAt) {
					segments.push(
						createProgressGraphPauseSegment(
							item.uid,
							item.label,
							pausedAt,
							event.x,
							lanes[index] ?? lanes[0]
						)
					);
				}

				pausedAt = null;
			}

			if (pausedAt !== null && maxX > pausedAt) {
				segments.push(
					createProgressGraphPauseSegment(
						item.uid,
						item.label,
						pausedAt,
						maxX,
						lanes[index] ?? lanes[0]
					)
				);
			}

			return segments;
		});
	}

	function createProgressGraphModeSegment(
		uid: string,
		label: string,
		playMode: PvpPlayMode,
		startX: number,
		endX: number,
		y: number
	): ProgressGraphModeSegment {
		return {
			uid,
			label,
			kind: 'play_mode',
			playMode,
			modeLabel: playModeLabel(playMode),
			color: playMode === 'practice'
				? chartColor('--warning', '#f59e0b')
				: chartColor('--muted-foreground', '#64748b'),
			startX,
			endX,
			y
		};
	}

	function createProgressGraphPowerupEffectSegment(
		uid: string,
		label: string,
		skill: ProgressGraphPowerupSkill,
		startX: number,
		endX: number,
		y: number
	): ProgressGraphModeSegment {
		return {
			uid,
			label,
			kind: 'powerup_effect',
			skill,
			modeLabel: powerupEffectLabel(skill),
			color: skill === 'flashbang'
				? chartColor('--warning', '#eab308')
				: chartColor('--info', '#0ea5e9'),
			startX,
			endX,
			y
		};
	}

	function createProgressGraphPauseSegment(
		uid: string,
		label: string,
		startX: number,
		endX: number,
		y: number
	): ProgressGraphModeSegment {
		return {
			uid,
			label,
			kind: 'pause_state',
			modeLabel: $_('pvp.progress_graph.paused'),
			color: chartColor('--muted-foreground', '#64748b'),
			startX,
			endX,
			y
		};
	}

	function playModeLabel(playMode: PvpPlayMode) {
		return playMode === 'practice'
			? $_('pvp.progress_graph.practice_mode')
			: $_('pvp.progress_graph.normal_mode');
	}

	function powerupEffectLabel(skill: ProgressGraphPowerupSkill) {
		return skill === 'flashbang'
			? $_('pvp.progress_graph.flashbanged')
			: skill === 'double_click'
			? $_('pvp.progress_graph.double_click')
			: $_('pvp.progress_graph.invisible');
	}

	function powerupSystemMessageSkill(skill: unknown) {
		const value = String(skill || '')
			.trim()
			.toLowerCase();

		return (
			value === 'flashbang'
			|| value === 'invisible'
			|| value === 'pause'
			|| value === 'double_click'
			|| value === 'force_reset'
		)
			? value
			: 'flashbang';
	}

	function participantProgressBarWidth(
		participant: PvpParticipant,
		messageProgressByUid = playerProgressByUid
	) {
		const progress = participantDisplayProgress(participant, messageProgressByUid);

		if (matchMode === 'platformer') {
			const maxProgress = Math.max(
				1,
				...orderedParticipants.map((item) =>
					participantDisplayProgress(item, messageProgressByUid)
				)
			);

			return Math.max(0, Math.min(100, (progress / maxProgress) * 100));
		}

		return Math.max(0, Math.min(100, progress));
	}

	function participantDisplayProgress(
		participant: PvpParticipant,
		messageProgressByUid = playerProgressByUid
	) {
		const uid = getPvpParticipantUid(participant);
		const messageProgress = uid ? messageProgressByUid.get(String(uid)) : undefined;
		const resultProgress = getPvpProgress(participant);

		if (messageProgress === undefined) {
			return resultProgress;
		}

		return matchMode === 'classic'
			&& normalizedScoringMode(scoringMode) === 'progress'
			? Math.max(resultProgress, messageProgress)
			: messageProgress;
	}

	function messageSenderName(
		message: PvpMatchMessage,
		hideInfo: boolean = hideOpponentInfo,
		viewerUid: string | null | undefined = currentUid,
		items: PvpParticipant[] = participants,
		senderUid: string | null | undefined = messageSenderUid(message)
	) {
		if (message.type === 'system') {
			return $_('pvp.system_sender');
		}

		if (senderUid === viewerUid) {
			return $_('pvp.you');
		}

		if (!playerInfoConfirmed) {
			return $_('pvp.hidden_player');
		}

		if (
			getPvpMessageSenderIsAnonymous(message)
			|| messageSenderParticipantIsAnonymous(message, items, senderUid)
		) {
			return $_('pvp.anonymous_player');
		}

		if (hideInfo && (!senderUid || senderUid !== viewerUid)) {
			return $_('pvp.hidden_opponent');
		}

		return message.sender?.name || message.player?.name || senderUid
			|| $_('pvp.rival');
	}

	function messageSenderUid(message: PvpMatchMessage) {
		return message.senderUid || message.sender?.uid || message.player?.uid
			|| null;
	}

	function compactNumber(value: number) {
		return Number.isInteger(value)
			? String(value)
			: value.toFixed(2)
				.replace(/\.?0+$/, '');
	}

	function systemParticipantName(uid: unknown) {
		const value = String(uid || '')
			.trim();

		if (!value) {
			return $_('pvp.rival');
		}

		const participant = participants.find(
			(item) => String(getPvpParticipantUid(item) || '') === value
		);

		return participant
			? (participantName(participant, hideOpponentInfo, currentUid) ?? '')
			: $_('pvp.rival');
	}

	function systemChatGraceMinutes(metadata: Record<string, unknown>) {
		return compactNumber(
			metadataNumber(metadata, 'chatGraceMinutes')
			?? POST_MATCH_CHAT_GRACE_MS / 60000
		);
	}

	function sameUid(a: unknown, b: unknown) {
		return Boolean(a && b && String(a) === String(b));
	}

	function getPvpReportTargetType(report: PvpMatchReport | null | undefined) {
		return (report?.targetType ?? report?.target_type ?? 'player') === 'level'
			? 'level'
			: 'player';
	}

	function getPvpViewerReport(
		currentMatch: PvpMatch | null | undefined,
		targetType: 'player' | 'level'
	) {
		if (targetType === 'player') {
			return currentMatch?.viewerPlayerReport
				?? currentMatch?.viewer_player_report
				?? currentMatch?.viewerReport
				?? currentMatch?.viewer_report
				?? null;
		}

		return currentMatch?.viewerLevelReport
			?? currentMatch?.viewer_level_report
			?? (currentMatch?.viewerReports ?? currentMatch?.viewer_reports ?? [])
				.find((report) => getPvpReportTargetType(report) === 'level')
			?? null;
	}

	function mergePvpViewerReports(
		reports: PvpMatchReport[],
		nextReport: PvpMatchReport
	) {
		const targetType = getPvpReportTargetType(nextReport);
		const filteredReports = reports.filter((report) =>
			getPvpReportTargetType(report) !== targetType
		);

		return [...filteredReports, nextReport];
	}

	function getBanPickActionForLevel(levelId: number | null | undefined) {
		if (!levelId) {
			return null;
		}

		return (
			banPickActions.find((action: PvpBanPickAction) =>
				Number(action.levelId) === levelId
			) ?? null
		);
	}

	function banPickTurnPlayerName() {
		const participant = participants.find(
			(item) =>
				String(getPvpParticipantUid(item) || '')
					=== String(banPickCurrentUid || '')
		);

		return participant
			? (participantName(participant, hideOpponentInfo, currentUid) ?? '')
			: $_('pvp.rival');
	}

	function banPickActionPlayerName(action: PvpBanPickAction) {
		const uid = String(action.uid || '');
		const participant = participants.find(
			(item) => String(getPvpParticipantUid(item) || '') === uid
		);

		return participant
			? (participantName(participant, hideOpponentInfo, currentUid) ?? '')
			: $_('pvp.rival');
	}

	function escapeRegExp(value: string) {
		return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

	function hiddenOpponentRedactionValues(
		items: PvpParticipant[] = participants,
		hideInfo: boolean = hideOpponentInfo,
		viewerUid: string | null | undefined = currentUid,
		infoConfirmed: boolean = playerInfoConfirmed
	) {
		if (infoConfirmed && !hideInfo) {
			return [];
		}

		const values = new Set<string>();
		const addValue = (value: unknown) => {
			const text = String(value || '')
				.trim();

			if (text) {
				values.add(text);
			}
		};

		for (const participant of items) {
			if (
				!shouldHideParticipantInfo(
					participant,
					hideInfo,
					viewerUid,
					infoConfirmed
				)
			) {
				continue;
			}

			const player = getPvpParticipantPlayer(participant);
			addValue(getPvpParticipantUid(participant));
			addValue(participant.userId);
			addValue(participant.playerId);
			addValue(player?.uid);
			addValue(player?.id);
			addValue(player?.name);
		}

		return [...values].sort((left, right) => right.length - left.length);
	}

	function redactHiddenOpponentInfo(content: string) {
		const replacement = playerInfoConfirmed
			? $_('pvp.hidden_opponent')
			: $_('pvp.hidden_player');

		return hiddenOpponentRedactionValues()
			.reduce((text, value) => {
				const pattern = new RegExp(
					`(^|[^\\p{L}\\p{N}_])(${
						escapeRegExp(value)
					})(?=$|[^\\p{L}\\p{N}_])`,
					'gu'
				);

				return text.replace(pattern, `$1${replacement}`);
			}, content);
	}

	function systemMessageContent(message: PvpMatchMessage) {
		if (message.type !== 'system') {
			return String(message.content || '');
		}

		const metadata = messageMetadata(message);
		const kind = messageMetadataKind(message);
		const minutes = systemChatGraceMinutes(metadata);
		let content = '';

		if (kind === 'death') {
			const progress = metadataNumber(metadata, 'progress');

			if (progress !== null) {
				content = $_('pvp.system_message.death', {
					values: {
						player: systemParticipantName(metadataText(metadata, 'uid')),
						progress: compactNumber(progress)
					}
				});
			}
		}

		if (kind === 'progress') {
			const progress = metadataNumber(metadata, 'progress');

			if (progress !== null) {
				const mode = metadataText(metadata, 'mode') === 'platformer'
					? 'platformer'
					: matchMode;
				const currentScoringMode = normalizedScoringMode(metadataText(metadata, 'scoringMode'));
				const currentTargetScore = metadataNumber(metadata, 'targetScore') ?? targetScore;
				const currentStartingHp = metadataNumber(metadata, 'startingHp') ?? startingHp;
				const formattedProgress = formatPvpProgressValue(
					progress,
					mode,
					currentScoringMode,
					currentTargetScore,
					currentStartingHp
				);
				content = $_(
					mode === 'platformer'
						? 'pvp.system_message.progress_platformer'
						: isScoreLikeScoringMode(currentScoringMode)
						? 'pvp.system_message.progress_score'
						: currentScoringMode === 'hp'
						? 'pvp.system_message.progress_hp'
						: 'pvp.system_message.progress',
					{
						values: {
							player: systemParticipantName(
								metadataText(metadata, 'uid')
							),
							progress: compactNumber(progress),
							score: formattedProgress
						}
					}
				);
			}
		}

		if (kind === 'play_mode') {
			const playMode = metadataText(metadata, 'playMode') === 'practice'
				? 'practice'
				: 'normal';
			content = $_('pvp.system_message.play_mode', {
				values: {
					player: systemParticipantName(metadataText(metadata, 'uid')),
					mode: playModeLabel(playMode)
				}
			});
		}

		if (kind === 'powerup_skill') {
			const skill = powerupSystemMessageSkill(metadataText(metadata, 'skill'));
			content = $_(`pvp.system_message.powerup_skill_${skill}`, {
				values: {
					caster: systemParticipantName(metadataText(metadata, 'casterUid')),
					target: systemParticipantName(metadataText(metadata, 'targetUid'))
				}
			});
		}

		if (kind === 'powerup_blocked') {
			const skill = powerupSystemMessageSkill(metadataText(metadata, 'skill'));
			content = $_(`pvp.system_message.powerup_blocked_${skill}`, {
				values: {
					caster: systemParticipantName(metadataText(metadata, 'casterUid')),
					target: systemParticipantName(metadataText(metadata, 'targetUid'))
				}
			});
		}

		if (kind === 'powerup_shield') {
			content = $_('pvp.system_message.powerup_shield', {
				values: {
					player: systemParticipantName(metadataText(metadata, 'casterUid'))
				}
			});
		}

		if (kind === 'powerup_mana_set') {
			content = $_('pvp.system_message.powerup_mana_set', {
				values: {
					player: systemParticipantName(metadataText(metadata, 'targetUid')),
					mana: compactNumber(metadataNumber(metadata, 'mana') ?? 0)
				}
			});
		}

		if (kind === 'match_end') {
			const winnerUid = metadataText(metadata, 'winnerUid');
			content = winnerUid
				? $_('pvp.system_message.match_end_win', {
					values: { winner: systemParticipantName(winnerUid), minutes }
				})
				: $_('pvp.system_message.match_end_draw', { values: { minutes } });
		}

		if (kind === 'match_cancelled') {
			const reason = metadataText(metadata, 'reason');

			if (reason === 'platformer_hard_timeout') {
				content = $_('pvp.system_message.match_cancelled_platformer_hard_timeout', {
					values: { minutes }
				});
			} else if (reason === 'manager_abort') {
				content = $_('pvp.system_message.match_cancelled_manager_abort', {
					values: { minutes }
				});
			} else {
				content = $_('pvp.system_message.match_cancelled', { values: { minutes } });
			}
		}

		if (kind === 'resignation') {
			const winnerUid = metadataText(metadata, 'winnerUid');
			const resigning = systemParticipantName(
				metadataText(metadata, 'resigningUid')
			);
			content = winnerUid
				? $_('pvp.system_message.resignation_win', {
					values: {
						resigning,
						winner: systemParticipantName(winnerUid),
						minutes
					}
				})
				: $_('pvp.system_message.resignation_end', {
					values: { resigning, minutes }
				});
		}

		if (kind === 'level_change_requested') {
			content = $_('pvp.system_message.level_change_requested', {
				values: {
					requester: systemParticipantName(
						metadataText(metadata, 'requesterUid')
					)
				}
			});

			if (levelChangeRequestActive) {
				content += ` ${
					$_('pvp.request_expires_in', {
						values: {
							time: formatDuration(levelChangeRequestRemainingMs)
						}
					})
				}`;
			}
		}

		if (kind === 'level_changed') {
			content = $_('pvp.system_message.level_changed', {
				values: {
					accepter: systemParticipantName(
						metadataText(metadata, 'accepterUid')
					),
					requester: systemParticipantName(
						metadataText(metadata, 'requesterUid')
					),
					levelId: metadataText(metadata, 'nextLevelId') || '--'
				}
			});
		}

		if (kind === 'ban_pick_abort_requested') {
			content = $_('pvp.system_message.ban_pick_abort_requested', {
				values: {
					requester: systemParticipantName(
						metadataText(metadata, 'requesterUid')
					)
				}
			});

			if (banPickAbortRequestActive) {
				content += ` ${
					$_('pvp.request_expires_in', {
						values: {
							time: formatDuration(banPickAbortRequestRemainingMs)
						}
					})
				}`;
			}
		}

		if (kind === 'ban_pick_aborted') {
			content = $_('pvp.system_message.ban_pick_aborted', {
				values: {
					accepter: systemParticipantName(
						metadataText(metadata, 'accepterUid')
					),
					requester: systemParticipantName(
						metadataText(metadata, 'requesterUid')
					)
				}
			});
		}

		if (kind === 'ban_pick_started') {
			content = $_('pvp.system_message.ban_pick_started', {
				values: {
					player: systemParticipantName(
						metadataText(metadata, 'firstUid')
					)
				}
			});
		}

		if (kind === 'ban_pick_ban') {
			const player = systemParticipantName(metadataText(metadata, 'uid'));
			const levelId = metadataText(metadata, 'levelId') || '--';
			content = metadata.auto === true
				? $_('pvp.system_message.ban_pick_auto_ban', {
					values: { player, levelId }
				})
				: $_('pvp.system_message.ban_pick_ban', {
					values: { player, levelId }
				});
		}

		if (kind === 'ban_pick_completed') {
			content = $_('pvp.system_message.ban_pick_completed', {
				values: { levelId: metadataText(metadata, 'levelId') || '--' }
			});
		}

		if (kind === 'match_end_special') {
			const pool = metadataText(metadata, 'pool') === 'supporter_contextual'
				? 'supporter_contextual'
				: 'generic';
			const result = metadataText(metadata, 'result') === 'lose'
				? 'lose'
				: 'win';
			const variantIndex = Math.max(
				0,
				Math.floor(metadataNumber(metadata, 'variantIndex') ?? 0)
			);

			if (pool === 'supporter_contextual') {
				const scenario = getValidMatchEndSpecialScenario(
					metadataText(metadata, 'scenario')
				);
				content = $_(
					`pvp.match_end_special.supporter_contextual.${scenario}.${result}.${variantIndex}`
				);
			} else {
				content = $_(
					`pvp.match_end_special.generic.${result}.${variantIndex}`
				);
			}
		}

		return redactHiddenOpponentInfo(
			content || String(message.content || '')
			|| $_('pvp.system_message.unknown')
		);
	}

	function getValidMatchEndSpecialScenario(
		value: string
	): MatchEndSpecialScenario {
		return value === 'none_vs_supporter'
			|| value === 'supporter_vs_none'
			|| value === 'both_are_supporters'
			? value
			: 'none_vs_none';
	}

	function messageSenderParticipantIsAnonymous(
		message: PvpMatchMessage,
		items: PvpParticipant[] = participants,
		senderUid: string | null | undefined = messageSenderUid(message)
	) {
		if (!senderUid) {
			return false;
		}

		const participant = items.find((item) =>
			getPvpParticipantUid(item) === senderUid
		);

		return getPvpParticipantIsAnonymous(participant);
	}

	function messageTime(message: PvpMatchMessage) {
		const ms = message.created_at
			? new Date(message.created_at)
				.getTime()
			: NaN;

		if (!Number.isFinite(ms)) {
			return '';
		}

		return new Intl.DateTimeFormat(undefined, {
			hour: '2-digit',
			minute: '2-digit'
		})
			.format(new Date(ms));
	}

	function participantResult(
		participant: PvpParticipant,
		currentStatus: string = status,
		currentWinnerUid: string | null | undefined = winnerUid
	) {
		if (currentStatus !== 'completed') {
			return null;
		}

		if (!currentWinnerUid) {
			return $_('pvp.result.draw');
		}

		return getPvpParticipantUid(participant) === currentWinnerUid
			? $_('pvp.winner')
			: null;
	}

	function participantRatingLabel(
		participant: PvpParticipant | null | undefined
	) {
		if (shouldMaskParticipant(participant)) {
			return null;
		}

		return getPvpVisibleParticipantRatingLabel(participant, {
			unstableLabel: '?'
		});
	}

	function participantRatingDiffLabel(
		participant: PvpParticipant | null | undefined
	) {
		const diff = getPvpParticipantRatingDiff(participant);

		if (diff === null) {
			return null;
		}

		return `${diff > 0 ? '+' : ''}${Math.round(diff)}`;
	}

	function chatPlaceholder() {
		if (chatMuted) {
			return $_('pvp.chat_muted_placeholder');
		}

		return chatDisabled
			? $_('pvp.chat_closed_placeholder')
			: $_('pvp.chat_placeholder');
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

	function progressGraphPlayerColor(
		uid: string | null,
		index = 0,
		useNeutralPlayerColors = false
	) {
		if (useNeutralPlayerColors) {
			return OVERLAY_PLAYER_COLORS[index % OVERLAY_PLAYER_COLORS.length];
		}

		let hash = 0;

		for (const character of uid || '') {
			hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
		}

		return PROGRESS_GRAPH_COLORS[
			(hash >>> 0) % PROGRESS_GRAPH_COLORS.length
		];
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

	function progressGraphYAxisLabel(data: ProgressGraphData) {
		if (data.mode === 'platformer') {
			return $_('pvp.progress_graph.checkpoints_axis');
		}

		return isScoreLikeScoringMode(data.scoringMode)
			? $_('pvp.progress_graph.score_axis')
			: data.scoringMode === 'hp'
			? $_('pvp.progress_graph.hp_axis')
			: $_('pvp.progress_graph.progress_axis');
	}

	function progressGraphTickLabel(value: string | number, data: ProgressGraphData) {
		if (Number(value) < 0) {
			return '';
		}

		if (data.mode === 'platformer' || isScoreLikeScoringMode(data.scoringMode)) {
			return String(value);
		}

		if (data.scoringMode === 'hp') {
			return `${value} HP`;
		}

		return `${value}%`;
	}

	function createProgressChart(node: HTMLCanvasElement, data: ProgressGraphData) {
		let chart: Chart<'line', ProgressGraphPoint[], unknown> | null =
			buildProgressChart(node, data);
		let chartColorMode = data.colorMode;

		return {
			update(nextData: ProgressGraphData) {
				if (!chart) {
					chart = buildProgressChart(node, nextData);
					chartColorMode = nextData.colorMode;

					return;
				}

				if (chartColorMode !== nextData.colorMode) {
					chart.destroy();
					chart = buildProgressChart(node, nextData);
					chartColorMode = nextData.colorMode;

					return;
				}

				const hiddenPlayerUids = new Set(
					chart.data.datasets
						.filter((dataset: any) =>
							!dataset.isModeSegment
								&& dataset.hidden
								&& dataset.playerUid
						)
						.map((dataset: any) => dataset.playerUid)
				);
				chart.data.datasets = getProgressChartDatasets(nextData);

				for (const dataset of chart.data.datasets as any[]) {
					dataset.hidden = Boolean(
						dataset.playerUid && hiddenPlayerUids.has(dataset.playerUid)
					);
				}

				chart.options.scales!.x!.min = nextData.minX;
				chart.options.scales!.x!.max = nextData.maxX;
				chart.options.scales!.y!.min = nextData.minY;
				chart.options.scales!.y!.max = nextData.maxY;
				chart.options.scales!.y!.title!.text = progressGraphYAxisLabel(nextData);
				chart.options.scales!.y!.ticks!.callback = (value) =>
					progressGraphTickLabel(value, nextData);
				chart.options.plugins!.tooltip!.callbacks!.label =
					getProgressTooltipLabel(nextData);
				chart.options.plugins!.tooltip!.callbacks!.afterBody =
					getProgressTooltipEffects(nextData);
				chart.update();
			},
			destroy() {
				chart?.destroy();
				chart = null;
			}
		};
	}

	function buildProgressChart(node: HTMLCanvasElement, data: ProgressGraphData) {
		return new Chart(node, {
			type: 'line',
			data: {
				datasets: getProgressChartDatasets(data)
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				animation: false,
				interaction: {
					mode: 'index',
					axis: 'x',
					intersect: false
				},
				scales: {
					x: {
						type: 'linear',
						min: data.minX,
						max: data.maxX,
						title: {
							display: true,
							text: $_('pvp.progress_graph.time_axis'),
							color: chartColor('--muted-foreground', '#71717a')
						},
						grid: {
							display: false
						},
						ticks: {
							color: chartColor('--muted-foreground', '#71717a'),
							callback: (value) =>
								formatDuration(Number(value) * 1000),
							maxTicksLimit: 6
						}
					},
					y: {
						min: data.minY,
						max: data.maxY,
						title: {
							display: true,
							text: progressGraphYAxisLabel(data),
							color: chartColor('--muted-foreground', '#71717a')
						},
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
							callback: (
								value
							) => progressGraphTickLabel(value, data),
							precision: 0
						}
					}
				},
				plugins: {
					legend: {
						onClick: (_event, legendItem, legend) => {
							const chart = legend.chart;
							const dataset = chart.data.datasets[
								legendItem.datasetIndex ?? -1
							] as any;
							const playerUid = dataset?.playerUid;

							if (!playerUid) {
								return;
							}

							const hidden = !dataset.hidden;

							for (const item of chart.data.datasets as any[]) {
								if (item.playerUid === playerUid) {
									item.hidden = hidden;
								}
							}

							chart.update();
						},
						labels: {
							color: chartColor('--foreground', '#18181b'),
							usePointStyle: true,
							boxWidth: 8,
							boxHeight: 8,
							filter: (legendItem, chartData) =>
								!((chartData.datasets[legendItem.datasetIndex ?? -1] as any)
									?.isModeSegment)
						}
					},
					tooltip: {
						filter: (context) =>
							!(context.dataset as any).isModeSegment,
						itemSort: (left, right) =>
							Number(right.parsed.y) - Number(left.parsed.y),
						callbacks: {
							title: (context) =>
								formatDuration(
									Number(context[0]?.parsed.x ?? 0) * 1000
								),
							label: getProgressTooltipLabel(data),
							afterBody: getProgressTooltipEffects(data)
						}
					}
				}
			}
		});
	}

	function getProgressChartDatasets(data: ProgressGraphData) {
		const timeline = [
			0,
			...data.series.flatMap((item) => item.points.map((point) => point.x)),
			...data.modeSegments.flatMap((segment) => [
				segment.startX,
				segment.endX
			]),
			data.maxX
		]
			.filter((value, index, values) =>
				Number.isFinite(value) && values.indexOf(value) === index
			)
			.sort((left, right) => left - right);
		const progressDatasets = data.series.map((item) => ({
			label: item.label,
			playerUid: item.uid,
			data: progressGraphTimelinePoints(
				item.points,
				timeline
			),
			borderColor: item.color,
			backgroundColor: item.color,
			borderWidth: 2,
			fill: false,
			stepped: 'after' as const,
			tension: 0,
			pointBackgroundColor: chartColor('--background', '#ffffff'),
			pointBorderColor: item.color,
			pointBorderWidth: 2,
			pointRadius: 0,
			pointHoverRadius: 6
		}));
		const modeDatasets = data.modeSegments.map((segment) => ({
			label: segment.label,
			data: progressGraphModeTimelinePoints(segment, timeline),
			borderColor: segment.color,
			backgroundColor: segment.color,
			borderWidth: 8,
			borderCapStyle: 'butt' as const,
			fill: false,
			tension: 0,
			pointRadius: 0,
			pointHoverRadius: 5,
			pointHitRadius: 10,
			playerUid: segment.uid,
			isModeSegment: true
		}));

		return [...progressDatasets, ...modeDatasets];
	}

	function progressGraphTimelinePoints(
		points: ProgressGraphPoint[],
		timeline: number[]
	) {
		const sorted = [...points].sort((left, right) => left.x - right.x);
		let pointIndex = 0;
		let currentValue = 0;

		return timeline.map((x) => {
			while (pointIndex < sorted.length && sorted[pointIndex].x <= x) {
				currentValue = sorted[pointIndex].y;
				pointIndex += 1;
			}

			return { x, y: currentValue };
		});
	}

	function progressGraphModeTimelinePoints(
		segment: ProgressGraphModeSegment,
		timeline: number[]
	) {
		return timeline.map((x) => ({
			...modeSegmentPoint(segment, x),
			y: x >= segment.startX && x <= segment.endX
				? segment.y
				: Number.NaN
		}));
	}

	function modeSegmentPoint(
		segment: ProgressGraphModeSegment,
		x: number
	): ProgressGraphPoint {
		return {
			x,
			y: segment.y,
			isModeSegment: true,
			modeLabel: segment.modeLabel,
			modeTimeRange: `${formatDuration(segment.startX * 1000)} - ${
				formatDuration(segment.endX * 1000)
			}`
		};
	}

	function getProgressTooltipLabel(data: ProgressGraphData) {
		return (
			context: {
				dataset: { label?: string; isModeSegment?: boolean; };
				parsed: { y: number; };
				raw?: unknown;
			}
		) => {
			const raw = context.raw as ProgressGraphPoint | undefined;

			if (raw?.isModeSegment) {
				return `${context.dataset.label}: ${raw.modeLabel ?? ''} ${
					raw.modeTimeRange ? `(${raw.modeTimeRange})` : ''
				}`;
			}

			return `${context.dataset.label}: ${
				formatPvpProgressValue(
					context.parsed.y,
					data.mode,
					data.scoringMode,
					data.targetScore,
					data.startingHp
				)
			}`;
		};
	}

	function getProgressTooltipEffects(data: ProgressGraphData) {
		return (context: Array<{
			chart: { data: { datasets: unknown[]; }; };
			datasetIndex: number;
			parsed: { x: number; };
		}>) => {
			const x = Number(context[0]?.parsed.x);

			if (!Number.isFinite(x)) {
				return [];
			}

			const visiblePlayers = context
				.map((item) => (
					item.chart.data.datasets[item.datasetIndex] as {
						label?: string;
						playerUid?: string | null;
					}
				))
				.filter((dataset): dataset is {
					label?: string;
					playerUid: string;
				} => Boolean(dataset?.playerUid));
			const visiblePlayerUids = new Set(
				visiblePlayers.map((player) => player.playerUid)
			);
			const effectsByPlayer = new Map<string, {
				label: string;
				effects: Set<string>;
			}>();

			for (const segment of data.modeSegments) {
				if (
					segment.kind !== 'powerup_effect'
					|| !visiblePlayerUids.has(segment.uid)
					|| x < segment.startX
					|| x > segment.endX
				) {
					continue;
				}

				const entry = effectsByPlayer.get(segment.uid) ?? {
					label: segment.label,
					effects: new Set<string>()
				};
				entry.effects.add(segment.modeLabel);
				effectsByPlayer.set(segment.uid, entry);
			}

			if (!effectsByPlayer.size) {
				return [];
			}

			return [
				'',
				$_('pvp.progress_graph.active_effects'),
				...visiblePlayers
					.map((player) => effectsByPlayer.get(player.playerUid))
					.filter((entry): entry is {
						label: string;
						effects: Set<string>;
					} => Boolean(entry))
					.map((entry) =>
						`${entry.label}: ${
							Array.from(entry.effects)
								.join(', ')
						}`
					)
			];
		};
	}

	function getDeathCountChartData(
		items: PvpParticipant[] = orderedParticipants,
		includeGlobal = compareGlobalDeathCount,
		levelDeathCount = globalDeathCount,
		maskOpponentInfo = hideOpponentInfo,
		viewerUid = currentUid,
		showRate = deathCountShowRate,
		usePlayerGlobalDeathCount = comparePlayerGlobalDeathCount,
		playerDeathCounts = playerGlobalDeathCounts,
		playerDeathCountsReady = playerGlobalDeathCountsReady,
		useNeutralPlayerColors = false,
		colorMode: OverlayColorMode = overlayColorMode
	): DeathCountChartData {
		const labels = Array.from({ length: 100 }, (_, index) => `${index}%`);
		const series = items.slice(0, 2)
			.map((participant, index) => {
				const color = useNeutralPlayerColors
					? OVERLAY_PLAYER_COLORS[index % OVERLAY_PLAYER_COLORS.length]
					: index === 0
					? chartColor('--primary', '#2563eb')
					: chartColor('--destructive', '#dc2626');
				const uid = getPvpParticipantUid(participant);
				const deathCounts = usePlayerGlobalDeathCount
					? playerDeathCountsReady && uid
						? playerDeathCounts[String(uid)] ?? Array(100)
							.fill(0)
						: Array(100)
							.fill(0)
					: getPvpDeathCountArray(participant);

				return {
					label: participantName(participant, maskOpponentInfo, viewerUid)
						?? '',
					data: getPvpDeathCountChartValues(deathCounts, showRate),
					rawData: deathCounts,
					backgroundColor: color,
					borderColor: color
				};
			});

		if (includeGlobal) {
			const color = chartColor('--pvp-global-death-count', '#2563eb');

			series.push({
				label: $_('pvp.death_count.global_level'),
				data: getPvpDeathCountChartValues(levelDeathCount, showRate),
				rawData: levelDeathCount,
				backgroundColor: chartAlphaColor(
					'--pvp-global-death-count',
					0.38,
					'rgba(37, 99, 235, 0.38)'
				),
				borderColor: color
			});
		}

		const maxY = Math.max(1, ...series.flatMap((item) => item.data));

		return {
			labels,
			datasets: series,
			maxY,
			showRate,
			colorMode
		};
	}

	function getPvpDeathCountChartValues(deathCounts: number[], showRate: boolean) {
		if (!showRate) {
			return deathCounts;
		}

		const totalDeaths = deathCounts.reduce((total, count) => total + count, 0);

		if (totalDeaths <= 0) {
			return deathCounts.map(() => 0);
		}

		return deathCounts.map((count) =>
			Number(((count / totalDeaths) * 100)
				.toFixed(2))
		);
	}

	function createDeathCountChart(
		node: HTMLCanvasElement,
		data: DeathCountChartData
	) {
		let chart: Chart<'bar', number[], string> | null = buildDeathCountChart(
			node,
			data
		);
		let chartColorMode = data.colorMode;

		return {
			update(nextData: DeathCountChartData) {
				if (!chart) {
					chart = buildDeathCountChart(node, nextData);
					chartColorMode = nextData.colorMode;

					return;
				}

				if (chartColorMode !== nextData.colorMode) {
					chart.destroy();
					chart = buildDeathCountChart(node, nextData);
					chartColorMode = nextData.colorMode;

					return;
				}

				chart.data.labels = nextData.labels;
				chart.data.datasets = getDeathCountChartDatasets(nextData);
				chart.options.scales!.y!.max = nextData.maxY;
				chart.options.scales!.y!.title!.text =
					getDeathCountYAxisLabel(nextData);
				chart.options.scales!.y!.ticks!.callback =
					getDeathCountYAxisTick(nextData);
				chart.options.plugins!.tooltip!.callbacks!.label =
					getDeathCountTooltipLabel(nextData);
				chart.update();
			},
			destroy() {
				chart?.destroy();
				chart = null;
			}
		};
	}

	function buildDeathCountChart(
		node: HTMLCanvasElement,
		data: DeathCountChartData
	) {
		return new Chart(node, {
			type: 'bar',
			data: {
				labels: data.labels,
				datasets: getDeathCountChartDatasets(data)
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
						title: {
							display: true,
							text: $_('pvp.death_count.percent_axis'),
							color: chartColor('--muted-foreground', '#71717a')
						},
						grid: {
							display: false
						},
						ticks: {
							color: chartColor('--muted-foreground', '#71717a'),
							maxRotation: 0,
							autoSkip: true,
							maxTicksLimit: 10
						}
					},
					y: {
						min: 0,
						max: data.maxY,
						title: {
							display: true,
							text: getDeathCountYAxisLabel(data),
							color: chartColor('--muted-foreground', '#71717a')
						},
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
							precision: data.showRate ? 2 : 0,
							callback: getDeathCountYAxisTick(data)
						}
					}
				},
				plugins: {
					legend: {
						labels: {
							color: chartColor('--foreground', '#18181b'),
							usePointStyle: true,
							boxWidth: 8,
							boxHeight: 8
						}
					},
					tooltip: {
						callbacks: {
							label: getDeathCountTooltipLabel(data)
						}
					}
				}
			}
		});
	}

	function getDeathCountChartDatasets(data: DeathCountChartData) {
		return data.datasets.map((item) => ({
			label: item.label,
			data: item.data,
			backgroundColor: item.backgroundColor,
			borderColor: item.borderColor,
			borderWidth: 1,
			borderRadius: 3,
			barPercentage: 0.9,
			categoryPercentage: 0.85
		}));
	}

	function getDeathCountYAxisLabel(data: DeathCountChartData) {
		return data.showRate
			? $_('pvp.death_count.rate_axis')
			: $_('pvp.death_count.deaths_axis');
	}

	function getDeathCountYAxisTick(data: DeathCountChartData) {
		return (value: string | number) =>
			data.showRate
				? `${Number(value)
					.toFixed(0)}%`
				: `${value}`;
	}

	function getDeathCountTooltipLabel(data: DeathCountChartData) {
		return (
			context: { dataset: { label?: string; }; datasetIndex: number; dataIndex: number; parsed: { y: number; }; }
		) => {
			const rawCount = data.datasets[context.datasetIndex]?.rawData[
				context.dataIndex
			] ?? 0;

			if (data.showRate) {
				return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}% (${
					rawCount
				} ${$_('pvp.death_count.count_label')})`;
			}

			return `${context.dataset.label}: ${rawCount} ${
				$_('pvp.death_count.count_label')
			}`;
		};
	}

	function getDeathCountParticipantUids(items: PvpParticipant[]) {
		return Array.from(
			new Set(
				items
					.slice(0, 2)
					.map((participant) => getPvpParticipantUid(participant))
					.filter((uid): uid is string => Boolean(uid))
					.map((uid) => String(uid))
			)
		);
	}

	function getDisplayedParticipantDeathCount(participant: PvpParticipant) {
		const uid = getPvpParticipantUid(participant);
		const deathCounts = comparePlayerGlobalDeathCount
			? playerGlobalDeathCountsReady && uid
				? playerGlobalDeathCounts[String(uid)] ?? Array(100)
					.fill(0)
				: Array(100)
					.fill(0)
			: getPvpDeathCountArray(participant);

		return deathCounts.reduce((total, count) => total + count, 0);
	}

	function getDeathCountLevelId(currentMatch: PvpMatch | null = match) {
		const id = Number(currentMatch?.levelId ?? visibleLevel?.id);

		return Number.isFinite(id) && id > 0 ? id : null;
	}

	function normalizeDeathCountArray(value: unknown) {
		return Array.from({ length: 100 }, (_, index) => {
			const count = Number(Array.isArray(value) ? value[index] : 0);

			return Number.isFinite(count) && count > 0 ? count : 0;
		});
	}

	function dismissGeodeAlert() {
		showGeodeAlert = false;
		localStorage.setItem(PVP_GEODE_ALERT_DISMISSED_KEY, 'true');
	}

	async function copyLevelId() {
		const id = String(
			visibleLevel?.id ?? (levelConfirmed ? match?.levelId : '') ?? ''
		);

		if (!id) {
			return;
		}

		try {
			await navigator.clipboard.writeText(id);
			toast.success($_('clipboard'));
		} catch (err) {
			try {
				const ta = document.createElement('textarea');
				ta.value = id;
				document.body.appendChild(ta);
				ta.select();
				document.execCommand('copy');
				document.body.removeChild(ta);
				toast.success($_('clipboard'));
			} catch (err2) {
				toast.error('Copy failed');
			}
		}
	}

	function getPvpLevelChangeRequestedByUid(
		currentMatch: PvpMatch | null | undefined
	) {
		return (
			currentMatch?.levelChangeRequestedByUid
			?? currentMatch?.level_change_requested_by_uid ?? null
		);
	}

	function getPvpBanPickAbortRequestedByUid(
		currentMatch: PvpMatch | null | undefined
	) {
		return (
			currentMatch?.banPickAbortRequestedByUid
			?? currentMatch?.ban_pick_abort_requested_by_uid
			?? null
		);
	}

	function toggleOverlayColorMode() {
		const nextMode: OverlayColorMode = overlayColorMode === 'dark'
			? 'light'
			: 'dark';

		setMode(nextMode);
		document.documentElement.setAttribute('data-theme', nextMode);
		localStorage.setItem('theme', nextMode);
	}
</script>

<svelte:head>
  <title>{matchTitle} - {$_('head.site_name')}</title>
  <meta name="description" content={$_('pvp.match_meta_description')} />
  <link rel="canonical" href={matchUrl} />
</svelte:head>

<main class={overlayMode ? 'match-page overlay-mode' : 'match-page'}>
  {#if overlayMode}
    {@const nextOverlayColorMode = overlayColorMode === 'dark' ? 'light' : 'dark'}
    <div class="overlay-theme-toggle">
      <Button
        type="button"
        variant="outline"
        size="icon"
        on:click={toggleOverlayColorMode}
        aria-label={$_(`settings.general.theme.${nextOverlayColorMode}`)}
        title={$_(`settings.general.theme.${nextOverlayColorMode}`)}
      >
        {#if nextOverlayColorMode === 'light'}
          <Sun class="h-4 w-4" />
        {:else}
          <Moon class="h-4 w-4" />
        {/if}
      </Button>
    </div>
  {/if}

  {#if showGeodeAlert && !overlayMode}
    <Alert.Root
      class="relative mb-4 border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/40"
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
        class="alert-dismiss"
        on:click={dismissGeodeAlert}
        aria-label={$_('pvp.geode_alert.dismiss')}
      >
        <X class="h-4 w-4" />
      </button>
    </Alert.Root>
  {/if}

  {#if !overlayMode}
    <MatchTopbar
      title={matchTitle}
      backHref={matchBackHref}
      backLabel={matchBackLabel}
      loggedIn={$user.loggedIn}
      {loading}
      {actionLoading}
      {hideOpponentInfo}
      showOpponentInfoToggle={!isRoomMatch}
      {canRequeue}
      canRequestLevelChange={canRequestLevelChange && !levelChangeRequestedByUid}
      canRequestBanPickAbort={canRequestBanPickAbort && !banPickAbortRequestedByUid}
      {canAbortRoomMatch}
      {canAbortAsManager}
      {canControlTournamentMatch}
      matchPaused={isMatchPaused}
      {canResign}
      canReport={canReportMatch}
      reportSubmitted={hasReportedMatch}
      onToggleOpponentInfo={() => (hideOpponentInfo = !hideOpponentInfo)}
      onRequeue={requeue}
      onRequestLevelChange={requestLevelChange}
      onRequestBanPickAbort={requestBanPickAbort}
      onAbortRoomMatch={abortRoomMatch}
      onAbortAsManager={abortMatchAsManager}
      onSetMatchPaused={setMatchPaused}
      onResign={resignMatch}
      onReport={() => (reportDialogOpen = true)}
    />
  {/if}

  <MatchReportDialog
    bind:open={reportDialogOpen}
    {matchId}
    reportedPlayer={hasReportedPlayer}
    reportedLevel={hasReportedLevel}
    remainingMs={reportWindowRemainingMs}
    deadlineKnown={Boolean(reportDeadlineMs)}
    onSubmitted={handleReportSubmitted}
  />

  {#if !overlayMode}
    <div class="pvp-match-ad-slot">
      <SupporterUpsell />
      <Ads dataAdFormat="auto" />
    </div>
  {/if}

  {#if !$user.checked}
    <Card.Root>
      <Card.Content class="state-content">
        <Loader2 class="h-5 w-5 animate-spin" />
        <span>{$_('general.loading')}</span>
      </Card.Content>
    </Card.Root>
  {:else if loading && !match}
    <Card.Root>
      <Card.Content class="state-content">
        <Loader2 class="h-5 w-5 animate-spin" />
        <span>{$_('general.loading')}</span>
      </Card.Content>
    </Card.Root>
  {:else if match}
    <div class="match-layout">
      <div class="match-main-column">
        <div class="summary-grid">
          <Card.Root class="match-progress-panel">
            {#if !overlayMode}
              <Card.Header>
                <div class="match-panel-header">
                  <div>
                    <Card.Title>{resultTitleText}</Card.Title>
                    <Card.Description>
                      {#if resultReason}
                        {resultReasonLabel(resultReason)}
                      {:else}
                        {statusLabel(status)}
                      {/if}
                    </Card.Description>
                  </div>
                  <div class="result-line">
                    <Badge variant={ranked ? 'default' : 'secondary'}>
                      {ranked ? $_('pvp.ranked') : $_('pvp.unranked')}
                    </Badge>
                    <Badge variant={isActive ? 'default' : 'secondary'}>{
                      statusLabel(status)
                    }</Badge>
                    {#if levelRating !== null}
                      <Badge variant="outline">
                        {
                          $_('pvp.level_rating', { values: { rating: levelRating } })
                        }
                      </Badge>
                    {/if}
                  </div>
                </div>
              </Card.Header>
            {/if}
            <Card.Content class="match-progress-content">
              <div class="timer-display">
                {#if status === 'completed'}
                  <Trophy class="h-5 w-5" />
                {:else}
                  <Clock class="h-5 w-5" />
                {/if}
                {#if overlayMode && isMatchPaused}
                  <Pause
                    class="h-5 w-5"
                    aria-label={$_('pvp.match_paused')}
                  />
                {/if}
                <strong>
                  {#if status === 'pending'}
                    {formatDuration(acceptanceRemainingMs)}
                  {:else}
                    {
                      isActive ? formatDuration(remainingMs) : statusLabel(status)
                    }
                  {/if}
                </strong>
              </div>

              {#if orderedParticipants.length === 0}
                <div class="empty-state">{$_('pvp.waiting_opponent')}</div>
              {:else}
                <div class:multi-player-grid={isRoomMatch || orderedParticipants.length > 2} class="side-grid">
                  {#each orderedParticipants as participant, index}
                    {@const participantPlayer = getPvpParticipantPlayer(participant)}
                    {@const participantUid = getPvpParticipantUid(participant) || ''}
                    {@const participantMasked = shouldMaskParticipant(
                        participant,
                        effectiveHideOpponentInfo,
                        currentUid
                    )}
                    {@const participantDisplayName = participantName(
                        participant,
                        effectiveHideOpponentInfo,
                        currentUid
                    )}
                    {@const participantResultLabel = participantResult(
                        participant,
                        status,
                        winnerUid
                    )}
                    {@const participantRating = participantRatingLabel(participant)}
                    {@const participantRatingDiff = participantRatingDiffLabel(participant)}
                    {@const participantMana = participantPowerupMana(participant)}
                    {@const participantTheme = participantMasked
                        ? null
                        : getEquippedTheme(participantPlayer)}
                    {@const participantThemeStyle = getThemeStyle(participantTheme)}
                    <div
                      class:left-side={index === 0}
                      class:right-side={index === 1}
                      class:winner={winnerUid && getPvpParticipantUid(participant) === winnerUid}
                      class:themed={Boolean(participantThemeStyle)}
                      class="participant-card"
                      style={participantThemeStyle}
                    >
                      {#if participantTheme}
                        <img
                          class="participant-banner"
                          src={bannerImageUrl(participantTheme)}
                          alt=""
                          draggable="false"
                          on:error={hideBrokenImage}
                        />
                      {/if}
                      <div class="participant-topline">
                        {#if !overlayMode}
                          <Badge
                            variant={getPvpParticipantUid(participant) === currentUid
                            ? 'default'
                            : 'outline'}
                          >
                            {participantLabel(participant, currentUid)}
                          </Badge>
                        {/if}
                        {#if participantResultLabel}
                          <Badge variant="secondary">{
                            participantResultLabel
                          }</Badge>
                        {/if}
                        {#if participantPaused(participant, messages)}
                          <Badge variant="secondary">
                            {$_('pvp.progress_graph.paused')}
                          </Badge>
                        {/if}
                        {#if participantPracticeModeActive(participant, messages)}
                          <Badge variant="outline">
                            {$_('pvp.progress_graph.practice_mode')}
                          </Badge>
                        {/if}
                      </div>

                      <div class="participant-identity">
                        {#if participantMasked || !participantPlayer?.uid}
                          <span class="participant-avatar-placeholder">
                            <UserRound class="h-5 w-5" />
                          </span>
                        {/if}
                        <div class="participant-name">
                          {#if !participantMasked && participantPlayer?.uid}
                            <PlayerLink
                              player={participantPlayer}
                              rankBadge={resolvePvpRankBadge(participantPlayer, matchMode)}
                              showAvatar
                              avatarSize={40}
                              truncate={26}
                            />
                          {:else}
                            <strong>{participantDisplayName}</strong>
                          {/if}
                          {#if participantRating !== null}
                            <span class="participant-rating">
                              {
                                $_('pvp.pvp_rating_short', {
                                    values: { rating: participantRating }
                                })
                              }
                              {#if ranked && participantRatingDiff}
                                <strong
                                  class:positive={Number(getPvpParticipantRatingDiff(participant))
                                  > 0}
                                >
                                  {participantRatingDiff}
                                </strong>
                              {/if}
                            </span>
                          {/if}
                        </div>
                      </div>

                      <div class="participant-progress">
                        <div class="progress-label">
                          <span>{
                            formatPvpProgressValue(
                              participantDisplayProgress(
                                participant,
                                playerProgressByUid
                              ),
                              matchMode,
                              scoringMode,
                              targetScore,
                              startingHp
                            )
                          }</span>
                          <span>
                            <Gauge class="h-3.5 w-3.5" />
                            {formatDuration(getPvpTimeReachedMs(participant))}
                          </span>
                        </div>
                        {#if matchMode !== 'platformer'}
                          <div class="progress-track">
                            <div
                              class="progress-bar"
                              style={`width: ${participantProgressBarWidth(
                                participant,
                                playerProgressByUid
                              )}%;${overlayMode
                                ? ` background-color: ${overlayColorMode === 'dark' ? '#ffffff' : '#000000'};`
                                : ''}`}
                            />
                          </div>
                        {/if}
                        {#if isPowerupMatch && powerupState}
                          <div class="participant-mana">
                            <div class="participant-mana-label">
                              <span>{$_('pvp.powerups.mana')}</span>
                              <strong>{participantMana.mana}/{participantMana.maxMana}</strong>
                            </div>
                            <div
                              class="powerup-mana-track"
                              aria-label={`${participantDisplayName} ${$_('pvp.powerups.mana')}`}
                            >
                              <div
                                class="powerup-mana-fill"
                                style={`width: ${participantMana.percent}%;`}
                              />
                            </div>
                            {#if canManagePowerupMana}
                              <form
                                class="manager-mana-control"
                                on:submit={(event) => setManagerMana(
                                  event,
                                  participantUid
                                )}
                              >
                                <input
                                  name="mana"
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="1"
                                  value={participantMana.mana}
                                  aria-label={$_('pvp.powerups.manager_mana_label', {
                                    values: { player: participantDisplayName }
                                  })}
                                />
                                <Button
                                  type="submit"
                                  size="sm"
                                  disabled={Boolean(managerManaLoadingUid)}
                                >
                                  {#if managerManaLoadingUid === participantUid}
                                    <Loader2 class="h-3.5 w-3.5 animate-spin" />
                                  {:else}
                                    {$_('pvp.powerups.manager_mana_set_action')}
                                  {/if}
                                </Button>
                              </form>
                            {/if}
                          </div>
                        {/if}
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}

              {#if status === 'pending' && !isSpectator}
                <div class="acceptance-panel">
                  <p>{$_('pvp.match_found_hint')}</p>
                  {#if selfAccepted}
                    <Button disabled class="w-full">
                      <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                      {$_('pvp.waiting_for_acceptance')}
                    </Button>
                  {:else}
                    <Button
                      disabled={Boolean(actionLoading)}
                      class="w-full"
                      on:click={acceptMatch}
                    >
                      {#if actionLoading === 'accept-match'}
                        <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                      {/if}
                      {$_('pvp.accept_match')}
                    </Button>
                  {/if}
                </div>
              {/if}
            </Card.Content>
          </Card.Root>
        </div>

        {#if isBanPick}
          <BanPickPanel
            {banPick}
            {currentUid}
            selectedLevelIds={selectedBanLevelIds}
            remainingMs={banPickRemainingMs}
            waitingToStart={banPickWaitingToStart}
            turnSubmitted={banPickTurnSubmitted}
            requiredCount={banPickRequiredCount}
            confirmLoading={actionLoading === 'ban-pick-submit'}
            {formatDuration}
            turnPlayerName={banPickTurnPlayerName()}
            actionPlayerName={banPickActionPlayerName}
            onToggleBan={toggleBanSelection}
            onConfirmBan={() => submitBanSelection()}
          />
        {/if}

        <section class="detail-grid">
          {#if isPowerupMatch && !overlayMode}
            <Card.Root class="powerup-card">
              <Card.Header class="powerup-header">
                <div>
                  <Card.Title>{$_('pvp.powerups.title')}</Card.Title>
                  <Card.Description>{$_('pvp.powerups.description')}</Card.Description>
                </div>
                {#if powerupLoading}
                  <Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
                {/if}
              </Card.Header>
              <Card.Content class="powerup-content">
                {#if !canUsePowerups}
                  <div class="empty-state">
                    {isSpectator
                      ? $_('pvp.powerups.spectator')
                      : $_('pvp.powerups.active_only')}
                  </div>
                {:else if powerupStateError}
                  <div class="empty-state">{powerupStateError}</div>
                {:else if !powerupState}
                  <div class="empty-state">
                    <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                    {$_('pvp.powerups.loading')}
                  </div>
                {:else}
                  {#if powerupState.shieldActive}
                    <Badge variant="secondary" class="powerup-shield-badge">
                      <Shield class="h-3.5 w-3.5" />
                      {$_('pvp.powerups.shield_active')}
                    </Badge>
                  {/if}

                  <div class="powerup-skill-grid">
                    {#each powerupSkills() as skill}
                      {@const skillCost = powerupSkillCost(skill)}
                      <div class="powerup-skill-card">
                        <div class="powerup-skill-heading">
                          <span class="powerup-skill-icon">
                            {#if skill.skill === 'shield'}
                              <Shield class="h-4 w-4" />
                            {:else if skill.skill === 'invisible'}
                              <EyeOff class="h-4 w-4" />
                            {:else if skill.skill === 'pause'}
                              <Pause class="h-4 w-4" />
                            {:else if skill.skill === 'double_click'}
                              <MousePointerClick class="h-4 w-4" />
                            {:else if skill.skill === 'force_reset'}
                              <RotateCcw class="h-4 w-4" />
                            {:else}
                              <Zap class="h-4 w-4" />
                            {/if}
                          </span>
                          <div>
                            <strong>{powerupSkillName(skill.skill)}</strong>
                            <span>{powerupSkillDescription(skill.skill)}</span>
                          </div>
                        </div>
                        <div class="powerup-skill-meta">
                          <Badge variant="outline">
                            {$_('pvp.powerups.cost', {
                              values: { cost: skill.cost }
                            })}
                          </Badge>
                          {#if powerupDurationLabel(skill.durationMs)}
                            <Badge variant="outline">
                              {powerupDurationLabel(skill.durationMs)}
                            </Badge>
                          {/if}
                        </div>
                        {#if isPowerupSkillHarmful(skill)}
                          {#if powerupTargets.length}
                            <div class="powerup-target-actions">
                              {#each powerupTargets as target}
                                {@const targetUid = getPvpParticipantUid(target)}
                                {@const castKey = powerupActionKey(
                                  skill.skill,
                                  targetUid
                                )}
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={!targetUid || !canCastPowerup(skill)}
                                  on:click={() => castPowerupSkill(
                                    skill.skill,
                                    targetUid
                                  )}
                                >
                                  {#if powerupCastLoading === castKey}
                                    <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                                  {:else}
                                    <Target class="mr-2 h-4 w-4" />
                                  {/if}
                                  {$_('pvp.powerups.cast_on', {
                                    values: { target: powerupTargetName(target) }
                                  })}
                                </Button>
                              {/each}
                              {#if powerupTargets.length > 1}
                                {@const randomKey = powerupActionKey(
                                  skill.skill,
                                  null,
                                  true
                                )}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={!canCastPowerup(skill)}
                                  on:click={() => castPowerupSkill(
                                    skill.skill,
                                    null,
                                    true
                                  )}
                                >
                                  {#if powerupCastLoading === randomKey}
                                    <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                                  {:else}
                                    <Target class="mr-2 h-4 w-4" />
                                  {/if}
                                  {$_('pvp.powerups.random_target')}
                                </Button>
                              {/if}
                            </div>
                          {:else}
                            <div class="powerup-unavailable">
                              {$_('pvp.powerups.no_targets')}
                            </div>
                          {/if}
                        {:else}
                          {@const castKey = powerupActionKey(
                            skill.skill
                          )}
                          <Button
                            type="button"
                            size="sm"
                            disabled={!canCastPowerup(skill)}
                            on:click={() => castPowerupSkill(
                              skill.skill
                            )}
                          >
                            {#if powerupCastLoading === castKey}
                              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                            {:else}
                              <Shield class="mr-2 h-4 w-4" />
                            {/if}
                            {$_('pvp.powerups.cast')}
                          </Button>
                        {/if}
                        {#if powerupMana < skillCost}
                          <small class="powerup-unavailable">
                            {$_('pvp.powerups.not_enough_mana', {
                              values: { cost: skillCost }
                            })}
                          </small>
                        {/if}
                      </div>
                    {/each}
                  </div>
                {/if}
              </Card.Content>
            </Card.Root>
          {/if}

          {#if overlayMode}
            <section class="overlay-level-title">
              {#if visibleLevel}
                <h2>
                  {visibleLevel.name || `#${visibleLevel.id || match.levelId}`}
                </h2>
                <p>
                  {#if visibleLevel.creator || visibleLevel.author}
                    by {
                      visibleLevel.creator || visibleLevel.author
                    }
                  {:else}
                    {$_('pvp.level_pending')}
                  {/if}
                </p>
              {:else}
                <h2>{$_('pvp.level_pending')}</h2>
              {/if}
            </section>
          {:else}
            <Card.Root>
              <Card.Header>
                <Card.Title>{$_('pvp.challenge_level')}</Card.Title>
              </Card.Header>
              <Card.Content class="level-content">
                {#if visibleLevel}
                  <div>
                    <h2>
                      {
                        visibleLevel.name || `#${visibleLevel.id || match.levelId}`
                      }
                    </h2>
                    <p>
                      {#if visibleLevel.creator || visibleLevel.author}
                        {$_('head.labels.by')} {
                          visibleLevel.creator || visibleLevel.author
                        }
                      {:else}
                        {$_('pvp.level_pending')}
                      {/if}
                    </p>
                  </div>
                  <div class="level-meta">
                    {#if levelRating !== null}
                      <Badge variant="secondary">
                        {
                          $_('pvp.level_rating', { values: { rating: levelRating } })
                        }
                      </Badge>
                    {/if}
                    {#if visibleLevel.difficulty}
                      <Badge variant="outline">{visibleLevel.difficulty}</Badge>
                    {/if}
                    {#if visibleLevel.id || match.levelId}
                      <a
                        class="level-link"
                        href={`/level/${visibleLevel.id || match.levelId}`}
                      >
                        {$_('pvp.open_level')}
                        <ExternalLink class="h-4 w-4" />
                      </a>
                      <div class="level-id">
                        <span class="id-label">ID: {
                            visibleLevel.id ?? match.levelId
                          }</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          on:click={copyLevelId}
                          aria-label={$_('pvp.copy_level_id')}
                        >
                          <Copy class="h-4 w-4" />
                        </Button>
                      </div>
                    {/if}
                  </div>
                  {#if levelVideoId}
                    <div class="level-video">
                      <iframe
                        src={`https://www.youtube.com/embed/${levelVideoId}`}
                        title={visibleLevel.name || $_('pvp.challenge_level')}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowfullscreen
                      ></iframe>
                    </div>
                  {/if}
                {:else}
                  <div class="empty-state">{$_('pvp.level_pending')}</div>
                {/if}
              </Card.Content>
            </Card.Root>
          {/if}
        </section>
      </div>

      {#if overlayMode}
        <section class="overlay-graphs-panel">
          <div class="progress-graph-panel">
            {#if progressGraphData.hasPoints}
              <div class="progress-graph-canvas overlay-progress-graph-canvas">
                <canvas
                  use:createProgressChart={progressGraphData}
                  aria-label={$_('pvp.progress_graph.title')}
                />
              </div>
            {:else}
              <div class="empty-state">
                {$_('pvp.progress_graph.empty')}
              </div>
            {/if}
          </div>

          <div class="death-count-panel">
            {#if matchMode === 'platformer'}
              <div class="empty-state">
                {$_('pvp.death_count.platformer_empty')}
              </div>
            {:else}
              <div class="death-count-chart-canvas overlay-death-count-chart-canvas">
                <canvas
                  use:createDeathCountChart={deathCountChartData}
                  aria-label={$_('pvp.death_count.title')}
                />
              </div>
            {/if}
          </div>
        </section>
      {:else}
      <aside class="desktop-chat-panel">
        <Card.Root class="desktop-chat-card">
          <Tabs.Root
            bind:value={desktopActivityTab}
            class="desktop-activity-tabs"
          >
            <Card.Header class="activity-tabs-header">
              <Tabs.List class="activity-tabs-list">
                <Tabs.Trigger value="chat">{$_('pvp.match_chat')}</Tabs.Trigger>
                <Tabs.Trigger value="progress">{
                  $_('pvp.progress_graph.title')
                }</Tabs.Trigger>
                <Tabs.Trigger value="deaths">{
                  $_('pvp.death_count.title')
                }</Tabs.Trigger>
              </Tabs.List>
            </Card.Header>
            <Tabs.Content value="chat" class="desktop-tab-content">
              <div class="chat-header">
                <div>
                  <Card.Title>{$_('pvp.match_chat')}</Card.Title>
                  <Card.Description>{chatDescription}</Card.Description>
                </div>
                <div class="chat-actions">
                  {#if chatLoading}
                    <Loader2
                      class="h-4 w-4 animate-spin text-muted-foreground"
                    />
                  {/if}
                  <Button
                    variant="outline"
                    size="sm"
                    on:click={() => (chatMuted = !chatMuted)}
                  >
                    {#if chatMuted}
                      <Volume2 class="mr-2 h-4 w-4" />
                      {$_('pvp.unmute_chat')}
                    {:else}
                      <VolumeX class="mr-2 h-4 w-4" />
                      {$_('pvp.mute_chat')}
                    {/if}
                  </Button>
                </div>
              </div>
              <div class="chat-content h-[70vh]">
                <div class="chat-messages" bind:this={desktopChatScrollEl}>
                  {#if chatMuted}
                    <div class="empty-state">{$_('pvp.chat_muted_state')}</div>
                  {:else if visibleMessages.length === 0}
                    <div class="empty-state">{$_('pvp.no_messages')}</div>
                  {:else}
                    {#each visibleMessages as message}
                      {@const senderUid = messageSenderUid(message)}
                      {@const senderName = messageSenderName(
                          message,
		effectiveHideOpponentInfo,
		currentUid,
                          participants,
                          senderUid
                      )}
                      {@const systemActionLabel = systemMessageActionLabel(message)}
                      <div
                        class:own-message={senderUid === currentUid}
                        class:system-message={message.type === 'system'}
                        class="chat-message"
                      >
                        <div class="chat-message-meta">
                          <strong>{senderName}</strong>
                          <span>{messageTime(message)}</span>
                        </div>
                        <p>{systemMessageContent(message)}</p>
                        {#if systemActionLabel}
                          <Button
                            class="chat-message-action"
                            size="sm"
                            disabled={systemMessageActionDisabled(message)}
                            on:click={() => handleSystemMessageAction(message)}
                          >
                            {#if actionLoading === 'level-change' || actionLoading === 'ban-pick-abort'}
                              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                            {/if}
                            {systemActionLabel}
                          </Button>
                        {/if}
                      </div>
                    {/each}
                  {/if}
                </div>

                <form
                  class="chat-form"
                  on:submit|preventDefault={sendChatMessage}
                >
                  <Textarea
                    bind:value={chatDraft}
                    rows={2}
                    maxlength={500}
                    disabled={chatInputDisabled || actionLoading === 'send-chat'}
                    placeholder={chatPlaceholder()}
                    on:keydown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            sendChatMessage();
                        }
                    }}
                  />
                  <Button
                    type="submit"
                    disabled={chatInputDisabled
                    || !chatDraft.trim()
                    || actionLoading === 'send-chat'}
                    aria-label={$_('pvp.send_message')}
                  >
                    {#if actionLoading === 'send-chat'}
                      <Loader2 class="h-4 w-4 animate-spin" />
                    {:else}
                      <Send class="h-4 w-4" />
                    {/if}
                  </Button>
                </form>
              </div>
            </Tabs.Content>
            <Tabs.Content
              value="progress"
              class="desktop-tab-content progress-tab-content"
            >
              <div class="progress-graph-panel">
                <div class="progress-graph-header">
                  <div>
                    <Card.Title>{$_('pvp.progress_graph.title')}</Card.Title>
                    <Card.Description>{
                      $_('pvp.progress_graph.description')
                    }</Card.Description>
                  </div>
                </div>
                {#if progressGraphData.hasPoints && desktopActivityTab === 'progress'}
                  <div class="progress-graph-canvas">
                    <canvas
                      use:createProgressChart={progressGraphData}
                      aria-label={$_('pvp.progress_graph.title')}
                    />
                  </div>
                {:else}
                  <div class="empty-state">
                    {$_('pvp.progress_graph.empty')}
                  </div>
                {/if}
              </div>
            </Tabs.Content>
            <Tabs.Content
              value="deaths"
              class="desktop-tab-content deaths-tab-content"
            >
              <div class="death-count-panel">
                <div class="death-count-header">
                  <div>
                    <Card.Title>{$_('pvp.death_count.title')}</Card.Title>
                    <Card.Description>{
                      $_('pvp.death_count.description')
                    }</Card.Description>
                  </div>
                  <div class="death-count-controls">
                    <label
                      class="death-count-toggle"
                      for="desktop-death-count-rate-toggle"
                    >
                      <span>{$_('pvp.death_count.count_mode')}</span>
                      <Switch
                        id="desktop-death-count-rate-toggle"
                        bind:checked={deathCountShowRate}
                        disabled={matchMode !== 'classic'}
                      />
                      <span>{$_('pvp.death_count.rate_mode')}</span>
                    </label>
                    <label
                      class="death-count-toggle"
                      for="desktop-player-global-death-count-toggle"
                    >
                      <Switch
                        id="desktop-player-global-death-count-toggle"
                        bind:checked={comparePlayerGlobalDeathCount}
                        disabled={matchMode !== 'classic'
                        || !deathCountLevelId
                        || playerGlobalDeathCountLoading}
                      />
                      <span>{$_('pvp.death_count.compare_player_global')}</span>
                    </label>
                    <label
                      class="death-count-toggle"
                      for="desktop-global-death-count-toggle"
                    >
                      <Switch
                        id="desktop-global-death-count-toggle"
                        bind:checked={compareGlobalDeathCount}
                        disabled={matchMode !== 'classic'
                        || !deathCountLevelId
                        || globalDeathCountLoading}
                      />
                      <span>{$_('pvp.death_count.compare_global')}</span>
                    </label>
                  </div>
                </div>
                {#if matchMode === 'platformer'}
                  <div class="empty-state">
                    {$_('pvp.death_count.platformer_empty')}
                  </div>
				{:else}
                  <div class="death-count-summary">
                    {#each orderedParticipants as participant}
                      {@const participantPlayer = getPvpParticipantPlayer(participant)}
                      {@const participantMasked = shouldMaskParticipant(
                          participant,
                          effectiveHideOpponentInfo,
                          currentUid
                      )}
                      {@const participantDisplayName = participantName(
                          participant,
                          effectiveHideOpponentInfo,
                          currentUid
                      )}
                      <div class="death-count-card">
                        <div class="participant-identity">
                          {#if participantMasked || !participantPlayer?.uid}
                            <span class="participant-avatar-placeholder">
                              <UserRound class="h-5 w-5" />
                            </span>
                          {/if}
                          <div class="participant-name">
                            {#if !overlayMode}
                              <Badge
                                variant={getPvpParticipantUid(participant) === currentUid
                                ? 'default'
                                : 'outline'}
                              >
                                {participantLabel(participant, currentUid)}
                              </Badge>
                            {/if}
                            {#if participantPaused(participant, messages)}
                              <Badge variant="secondary">
                                {$_('pvp.progress_graph.paused')}
                              </Badge>
                            {/if}
                            {#if participantPracticeModeActive(participant, messages)}
                              <Badge variant="outline">
                                {$_('pvp.progress_graph.practice_mode')}
                              </Badge>
                            {/if}
                            {#if !participantMasked && participantPlayer?.uid}
                              <PlayerLink
                                player={participantPlayer}
                                rankBadge={resolvePvpRankBadge(participantPlayer, matchMode)}
                                showAvatar
                                avatarSize={40}
                                truncate={22}
                              />
                            {:else}
                              <strong>{participantDisplayName}</strong>
                            {/if}
                          </div>
                        </div>
                        <div class="death-count-value">
                          <strong>{getDisplayedParticipantDeathCount(participant)}</strong>
                          <span>{$_('pvp.death_count.count_label')}</span>
                        </div>
                      </div>
                    {/each}
                    {#if compareGlobalDeathCount}
                      <div class="death-count-card global-death-count-card">
                        <div class="participant-identity">
                          <div class="global-death-count-dot"></div>
                          <div class="participant-name">
                            <Badge variant="outline">
                              {$_('pvp.death_count.global')}
                            </Badge>
                            <strong>{$_('pvp.death_count.global_level')}</strong>
                          </div>
                        </div>
                        <div class="death-count-value">
                          <strong>{
                            globalDeathCount.reduce((total, count) => total + count, 0)
                          }</strong>
                          <span>{$_('pvp.death_count.count_label')}</span>
                        </div>
                      </div>
                    {/if}
                  </div>
                  {#if desktopActivityTab === 'deaths'}
                    <div class="death-count-chart-canvas">
                      <canvas
                        use:createDeathCountChart={deathCountChartData}
                        aria-label={$_('pvp.death_count.title')}
                      />
                    </div>
                  {:else}
                    <div class="empty-state">{$_('pvp.death_count.empty')}</div>
                  {/if}
                {/if}
              </div>
            </Tabs.Content>
          </Tabs.Root>
        </Card.Root>
      </aside>
      {/if}
    </div>

    {#if !overlayMode}
    <Drawer.Root bind:open={mobileChatOpen}>
      <Drawer.Trigger asChild let:builder>
        <Button builders={[builder]} class="mobile-chat-trigger" type="button">
          <MessageCircle class="h-4 w-4" />
          {$_('pvp.match_activity')}
        </Button>
      </Drawer.Trigger>
      <Drawer.Content class="mobile-chat-drawer">
        <Tabs.Root bind:value={mobileActivityTab} class="mobile-activity-tabs">
          <Drawer.Header>
            <div class="chat-header">
              <div>
                <Drawer.Title>{$_('pvp.match_activity')}</Drawer.Title>
                <Drawer.Description>
                  {#if mobileActivityTab === 'chat'}
                    {chatDescription}
                  {:else if mobileActivityTab === 'progress'}
                    {$_('pvp.progress_graph.description')}
                  {:else}
                    {$_('pvp.death_count.description')}
                  {/if}
                </Drawer.Description>
              </div>
              {#if mobileActivityTab === 'chat'}
                <div class="chat-actions">
                  {#if chatLoading}
                    <Loader2
                      class="h-4 w-4 animate-spin text-muted-foreground"
                    />
                  {/if}
                  <Button
                    variant="outline"
                    size="sm"
                    on:click={() => (chatMuted = !chatMuted)}
                  >
                    {#if chatMuted}
                      <Volume2 class="mr-2 h-4 w-4" />
                      {$_('pvp.unmute_chat')}
                    {:else}
                      <VolumeX class="mr-2 h-4 w-4" />
                      {$_('pvp.mute_chat')}
                    {/if}
                  </Button>
                </div>
              {/if}
            </div>
            <Tabs.List class="activity-tabs-list mobile-tabs-list">
              <Tabs.Trigger value="chat">{$_('pvp.match_chat')}</Tabs.Trigger>
              <Tabs.Trigger value="progress">{
                $_('pvp.progress_graph.title')
              }</Tabs.Trigger>
              <Tabs.Trigger value="deaths">{
                $_('pvp.death_count.title')
              }</Tabs.Trigger>
            </Tabs.List>
          </Drawer.Header>
          <Tabs.Content value="chat" class="mobile-tab-content">
            <div class="mobile-chat-body">
              <div class="chat-messages" bind:this={mobileChatScrollEl}>
                {#if chatMuted}
                  <div class="empty-state">{$_('pvp.chat_muted_state')}</div>
                {:else if visibleMessages.length === 0}
                  <div class="empty-state">{$_('pvp.no_messages')}</div>
                {:else}
                  {#each visibleMessages as message}
                    {@const senderUid = messageSenderUid(message)}
                    {@const senderName = messageSenderName(
                        message,
                        effectiveHideOpponentInfo,
                        currentUid,
                        participants,
                        senderUid
                    )}
                    {@const systemActionLabel = systemMessageActionLabel(message)}
                    <div
                      class:own-message={senderUid === currentUid}
                      class:system-message={message.type === 'system'}
                      class="chat-message"
                    >
                      <div class="chat-message-meta">
                        <strong>{senderName}</strong>
                        <span>{messageTime(message)}</span>
                      </div>
                      <p>{systemMessageContent(message)}</p>
                      {#if systemActionLabel}
                        <Button
                          class="chat-message-action"
                          size="sm"
                          disabled={systemMessageActionDisabled(message)}
                          on:click={() => handleSystemMessageAction(message)}
                        >
                          {#if actionLoading === 'level-change' || actionLoading === 'ban-pick-abort'}
                            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                          {/if}
                          {systemActionLabel}
                        </Button>
                      {/if}
                    </div>
                  {/each}
                {/if}
              </div>

              <form
                class="chat-form"
                on:submit|preventDefault={sendChatMessage}
              >
                <Textarea
                  bind:value={chatDraft}
                  rows={2}
                  maxlength={500}
                  disabled={chatInputDisabled || actionLoading === 'send-chat'}
                  placeholder={chatPlaceholder()}
                  on:keydown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          sendChatMessage();
                      }
                  }}
                />
                <Button
                  type="submit"
                  disabled={chatInputDisabled || !chatDraft.trim() || actionLoading === 'send-chat'}
                  aria-label={$_('pvp.send_message')}
                >
                  {#if actionLoading === 'send-chat'}
                    <Loader2 class="h-4 w-4 animate-spin" />
                  {:else}
                    <Send class="h-4 w-4" />
                  {/if}
                </Button>
              </form>
            </div>
          </Tabs.Content>
          <Tabs.Content value="progress" class="mobile-tab-content">
            <div class="mobile-activity-body">
              <div class="progress-graph-panel">
                {#if progressGraphData.hasPoints && mobileActivityTab === 'progress'}
                  <div class="progress-graph-canvas mobile-progress-graph-canvas">
                    <canvas
                      use:createProgressChart={progressGraphData}
                      aria-label={$_('pvp.progress_graph.title')}
                    />
                  </div>
                {:else}
                  <div class="empty-state">
                    {$_('pvp.progress_graph.empty')}
                  </div>
                {/if}
              </div>
            </div>
          </Tabs.Content>
          <Tabs.Content value="deaths" class="mobile-tab-content">
            <div class="mobile-activity-body">
              <div class="death-count-panel">
                <div class="death-count-controls mobile-death-count-controls">
                  <label
                    class="death-count-toggle"
                    for="mobile-death-count-rate-toggle"
                  >
                    <span>{$_('pvp.death_count.count_mode')}</span>
                    <Switch
                      id="mobile-death-count-rate-toggle"
                      bind:checked={deathCountShowRate}
                      disabled={matchMode !== 'classic'}
                    />
                    <span>{$_('pvp.death_count.rate_mode')}</span>
                  </label>
                  <label
                    class="death-count-toggle"
                    for="mobile-player-global-death-count-toggle"
                  >
                    <Switch
                      id="mobile-player-global-death-count-toggle"
                      bind:checked={comparePlayerGlobalDeathCount}
                      disabled={matchMode !== 'classic'
                      || !deathCountLevelId
                      || playerGlobalDeathCountLoading}
                    />
                    <span>{$_('pvp.death_count.compare_player_global')}</span>
                  </label>
                  <label
                    class="death-count-toggle"
                    for="mobile-global-death-count-toggle"
                  >
                    <Switch
                      id="mobile-global-death-count-toggle"
                      bind:checked={compareGlobalDeathCount}
                      disabled={matchMode !== 'classic'
                      || !deathCountLevelId
                      || globalDeathCountLoading}
                    />
                    <span>{$_('pvp.death_count.compare_global')}</span>
                  </label>
                </div>
                {#if matchMode === 'platformer'}
                  <div class="empty-state">
                    {$_('pvp.death_count.platformer_empty')}
                  </div>
				{:else}
                  <div class="death-count-summary">
                    {#each orderedParticipants as participant}
                      {@const participantPlayer = getPvpParticipantPlayer(participant)}
                      {@const participantMasked = shouldMaskParticipant(
                          participant,
                          effectiveHideOpponentInfo,
                          currentUid
                      )}
                      {@const participantDisplayName = participantName(
                          participant,
                          effectiveHideOpponentInfo,
                          currentUid
                      )}
                      <div class="death-count-card">
                        <div class="participant-identity">
                          {#if participantMasked || !participantPlayer?.uid}
                            <span class="participant-avatar-placeholder">
                              <UserRound class="h-5 w-5" />
                            </span>
                          {/if}
                          <div class="participant-name">
                            {#if !overlayMode}
                              <Badge
                                variant={getPvpParticipantUid(participant) === currentUid
                                ? 'default'
                                : 'outline'}
                              >
                                {participantLabel(participant, currentUid)}
                              </Badge>
                            {/if}
                            {#if participantPaused(participant, messages)}
                              <Badge variant="secondary">
                                {$_('pvp.progress_graph.paused')}
                              </Badge>
                            {/if}
                            {#if participantPracticeModeActive(participant, messages)}
                              <Badge variant="outline">
                                {$_('pvp.progress_graph.practice_mode')}
                              </Badge>
                            {/if}
                            {#if !participantMasked && participantPlayer?.uid}
                              <PlayerLink
                                player={participantPlayer}
                                rankBadge={resolvePvpRankBadge(participantPlayer, matchMode)}
                                showAvatar
                                avatarSize={40}
                                truncate={22}
                              />
                            {:else}
                              <strong>{participantDisplayName}</strong>
                            {/if}
                          </div>
                        </div>
                        <div class="death-count-value">
                          <strong>{getDisplayedParticipantDeathCount(participant)}</strong>
                          <span>{$_('pvp.death_count.count_label')}</span>
                        </div>
                      </div>
                    {/each}
                    {#if compareGlobalDeathCount}
                      <div class="death-count-card global-death-count-card">
                        <div class="participant-identity">
                          <div class="global-death-count-dot"></div>
                          <div class="participant-name">
                            <Badge variant="outline">
                              {$_('pvp.death_count.global')}
                            </Badge>
                            <strong>{$_('pvp.death_count.global_level')}</strong>
                          </div>
                        </div>
                        <div class="death-count-value">
                          <strong>{
                            globalDeathCount.reduce((total, count) => total + count, 0)
                          }</strong>
                          <span>{$_('pvp.death_count.count_label')}</span>
                        </div>
                      </div>
                    {/if}
                  </div>
                  {#if mobileActivityTab === 'deaths'}
                    <div class="death-count-chart-canvas mobile-death-count-chart-canvas">
                      <canvas
                        use:createDeathCountChart={deathCountChartData}
                        aria-label={$_('pvp.death_count.title')}
                      />
                    </div>
                  {:else}
                    <div class="empty-state">{$_('pvp.death_count.empty')}</div>
                  {/if}
                {/if}
              </div>
            </div>
          </Tabs.Content>
        </Tabs.Root>
      </Drawer.Content>
    </Drawer.Root>
    {/if}
  {:else}
    <Card.Root>
      <Card.Content class="state-content">{
        $_('pvp.match_not_found')
      }</Card.Content>
    </Card.Root>
  {/if}
</main>

<style>
.match-page {
  width: min(1440px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 36px 0 64px;
}

.match-page.overlay-mode {
  width: 100vw;
  max-width: none;
  min-height: min(100vh, 1920px);
  padding: 8px 0 10px;
  background: transparent;
}

.overlay-theme-toggle {
  position: fixed;
  z-index: 50;
  top: 10px;
  right: 10px;
}

.overlay-theme-toggle :global(button) {
  border-color: hsl(var(--border) / 0.8);
  background: hsl(var(--background) / 0.82);
  color: hsl(var(--foreground));
  box-shadow: 0 4px 14px hsl(var(--foreground) / 0.08);
  backdrop-filter: blur(8px);
}

.match-page.overlay-mode :global(.bg-card) {
  background: transparent !important;
  box-shadow: none;
}

.match-page.overlay-mode :global(.text-card-foreground) {
  color: hsl(var(--card-foreground));
}

.match-page.overlay-mode :global(.rounded-xl),
.match-page.overlay-mode .progress-graph-panel,
.match-page.overlay-mode .death-count-panel,
.match-page.overlay-mode .overlay-graphs-panel,
.match-page.overlay-mode .overlay-level-title {
  width: calc(100% - 20px);
  margin-inline: auto;
}

.match-page.overlay-mode :global(.match-progress-panel) {
  width: min(1000px, calc(100% - 20px));
}

.match-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.overlay-mode .match-layout {
  grid-template-columns: 1fr;
  gap: 12px;
}

.match-main-column {
  min-width: 0;
}

:global(.auth-content),
.match-panel-header,
.chat-header,
.chat-actions,
.result-line,
.timer-display,
.level-meta,
.participant-identity,
.participant-name,
.participant-topline,
.progress-label span {
  display: flex;
  align-items: center;
  gap: 8px;
}

:global(.auth-content) {
  justify-content: space-between;
  gap: 16px;
}

.pvp-match-ad-slot {
  margin-bottom: 0;
}

.level-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: hsl(var(--primary));
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}

.level-link:hover {
  text-decoration: underline;
}

.alert-dismiss {
  position: absolute;
  top: 12px;
  right: 12px;
  display: inline-flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
}

.alert-dismiss:hover {
  background: hsl(var(--primary) / 0.12);
}

:global(.state-content) {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 160px;
}

:global(.auth-content) h2 {
  margin: 0 0 6px;
  font-size: 1.35rem;
  font-weight: 750;
}

:global(.auth-content) p,
:global(.level-content) p,
.empty-state,
.progress-label {
  color: hsl(var(--muted-foreground));
}

.summary-grid,
.detail-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.detail-grid {
  margin-top: 16px;
}

.overlay-mode .detail-grid {
  margin-top: 10px;
}

.desktop-chat-panel {
  position: sticky;
  top: 18px;
  min-width: 0;
}

:global(.desktop-chat-card) {
  display: flex;
  height: calc(100vh - 36px);
  min-height: 560px;
  max-height: 860px;
  flex-direction: column;
}

:global(.desktop-activity-tabs) {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
}

:global(.activity-tabs-header) {
  padding-bottom: 12px;
}

:global(.activity-tabs-list) {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

:global(.activity-tabs-list button) {
  width: 100%;
}

:global(.desktop-tab-content) {
  flex: 1;
  min-height: 0;
  margin-top: 0;
  padding: 0 24px 24px;
}

:global(.desktop-tab-content[data-state="active"]) {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

:global(.desktop-chat-card .chat-content) {
  display: grid;
  flex: 1;
  grid-template-rows: minmax(0, 1fr) auto;
  min-height: 0;
}

.match-panel-header {
  justify-content: space-between;
  gap: 16px;
}

.chat-header {
  justify-content: space-between;
  gap: 12px;
}

.chat-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.result-line {
  flex-wrap: wrap;
  justify-content: flex-end;
}

:global(.match-progress-content),
:global(.level-content) {
  display: grid;
  gap: 14px;
}

.overlay-mode :global(.match-progress-content) {
  padding-top: 20px;
}

.side-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.side-grid.multi-player-grid {
  grid-template-columns: 1fr;
}

.timer-display {
  min-height: 54px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  justify-content: center;
}

.timer-display strong {
  font-size: 1.4rem;
}

.overlay-mode .timer-display {
  min-height: 46px;
}

.acceptance-panel {
  display: grid;
  gap: 12px;
  border-radius: 8px;
  background: hsl(var(--muted) / 0.55);
  padding: 14px;
}

.acceptance-panel p {
  margin: 0;
  color: hsl(var(--muted-foreground));
  font-size: 14px;
}

:global(.powerup-header) {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

:global(.powerup-content) {
  display: grid;
  gap: 14px;
}

.powerup-skill-heading,
.powerup-skill-meta,
.powerup-target-actions,
:global(.powerup-shield-badge) {
  display: flex;
  align-items: center;
  gap: 8px;
}

.powerup-mana-track {
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: hsl(var(--muted));
}

.powerup-mana-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #16a34a, #2563eb);
  transition: width 180ms ease;
}

.powerup-skill-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.powerup-skill-card {
  display: grid;
  align-content: start;
  gap: 12px;
  min-width: 0;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--muted) / 0.22);
  padding: 12px;
}

.powerup-skill-heading {
  align-items: flex-start;
  min-width: 0;
}

.powerup-skill-heading div {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.powerup-skill-heading strong {
  line-height: 1.2;
}

.powerup-skill-heading span:not(.powerup-skill-icon) {
  color: hsl(var(--muted-foreground));
  font-size: 13px;
  line-height: 1.35;
}

.powerup-skill-icon {
  display: inline-flex;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 1px solid hsl(var(--border));
  border-radius: 999px;
  background: hsl(var(--background));
  color: hsl(var(--primary));
}

.powerup-skill-meta,
.powerup-target-actions {
  flex-wrap: wrap;
}

.powerup-target-actions :global(button),
.powerup-skill-card > :global(button) {
  min-width: 0;
  max-width: 100%;
}

.powerup-unavailable {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
  font-weight: 650;
  line-height: 1.35;
}

:global(.level-content) h2 {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 750;
}

:global(.level-content) p {
  margin: 4px 0 0;
}

.level-meta {
  flex-wrap: wrap;
}

.level-id {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: 8px;
}

.level-video {
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--muted) / 0.35);
}

.level-video iframe {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
}

.id-label {
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}

.participant-card {
  display: grid;
  gap: 12px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  padding: 14px;
}

.overlay-mode .participant-card {
  gap: 9px;
  padding: 12px;
}

.participant-card.winner {
  border-color: hsl(var(--primary));
  background: hsl(var(--primary) / 0.08);
}

.participant-card.themed {
  position: relative;
  z-index: 0;
  overflow: hidden;
}

/* Overlay ring keeps the winner highlight above the banner image and the
   inline profile theme colors (inset shadows paint below children). */
.participant-card.winner.themed::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 2px solid hsl(var(--primary));
  border-radius: inherit;
  pointer-events: none;
  z-index: 2;
}

.participant-banner {
  position: absolute;
  left: 0;
  top: 0;
  z-index: -1;
  width: 100%;
  height: 64px;
  object-fit: cover;
  object-position: center;
  pointer-events: none;
  opacity: 0.85;
  -webkit-mask-image: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.95),
    rgba(0, 0, 0, 0.55) 55%,
    transparent
  );
  mask-image: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.95),
    rgba(0, 0, 0, 0.55) 55%,
    transparent
  );
}

.participant-card.themed .participant-rating {
  color: rgba(255, 255, 255, 0.75);
}

.participant-card.right-side .progress-bar {
  background: hsl(var(--destructive));
}

.participant-topline {
  justify-content: space-between;
}

.participant-identity {
  min-width: 0;
  gap: 12px;
}

.participant-avatar-placeholder {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid hsl(var(--border));
  border-radius: 999px;
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
  flex: 0 0 auto;
}

.participant-name {
  display: grid;
  gap: 3px;
  min-width: 0;
  min-height: 32px;
}

.participant-name :global(.rank) {
  margin-bottom: 6px;
}

.participant-rating {
  margin-left: 53px;
  color: hsl(var(--muted-foreground));
  font-size: 12px;
  font-weight: 650;
}

.participant-rating strong {
  margin-left: 6px;
  color: hsl(var(--destructive));
}

.participant-rating strong.positive {
  color: hsl(var(--primary));
}

.overlay-level-title {
  display: grid;
  min-height: 86px;
  align-content: center;
  justify-items: center;
  gap: 4px;
  text-align: center;
}

.overlay-level-title h2 {
  max-width: min(100%, 920px);
  margin: 0;
  overflow-wrap: anywhere;
  font-size: 2rem;
  font-weight: 850;
  line-height: 1.08;
}

.overlay-level-title p {
  margin: 0;
  color: hsl(var(--muted-foreground));
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.25;
}

.progress-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
}

.progress-track {
  height: 9px;
  overflow: hidden;
  border-radius: 999px;
  background: hsl(var(--muted));
}

.progress-bar {
  height: 100%;
  border-radius: inherit;
  background: hsl(var(--primary));
  transition: width 180ms ease;
}

.participant-mana {
  display: grid;
  gap: 5px;
  margin-top: 8px;
}

.participant-mana-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: hsl(var(--muted-foreground));
  font-size: 12px;
  font-weight: 700;
}

.participant-mana-label strong {
  color: hsl(var(--foreground));
}

.participant-mana .powerup-mana-track {
  height: 7px;
}

.manager-mana-control {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.manager-mana-control input {
  min-width: 0;
  height: 32px;
  border: 1px solid hsl(var(--input));
  border-radius: 6px;
  background: hsl(var(--background));
  padding: 0 10px;
  color: hsl(var(--foreground));
  font-size: 13px;
}

.progress-graph-panel {
  display: grid;
  gap: 12px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  padding: 14px;
}

.overlay-graphs-panel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  min-height: 0;
}

.overlay-mode .progress-graph-panel,
.overlay-mode .death-count-panel {
  width: 100%;
  margin-inline: 0;
  aspect-ratio: 5 / 2;
  height: auto;
  min-height: 0;
  grid-template-rows: minmax(0, 1fr);
  background: rgb(0 0 0 / 0.24);
  backdrop-filter: blur(2px);
}

:global(.progress-tab-content) .progress-graph-panel {
  flex: 1;
  min-height: 0;
  grid-template-rows: auto minmax(0, 1fr);
  border: 0;
  padding: 0;
}

.progress-graph-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.progress-graph-canvas {
  position: relative;
  height: 500px;
  min-height: 500px;
}

.overlay-progress-graph-canvas {
  height: 100%;
  min-height: 0;
}

:global(.progress-tab-content) .progress-graph-canvas {
  height: 500px;
  min-height: 500px;
}

.progress-graph-canvas canvas {
  display: block;
}

.death-count-panel {
  display: grid;
  gap: 12px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  padding: 14px;
}

:global(.deaths-tab-content) .death-count-panel {
  flex: 1;
  min-height: 0;
  align-content: start;
  border: 0;
  padding: 0;
}

.death-count-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.death-count-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px 14px;
}

.death-count-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.2;
  white-space: nowrap;
}

.mobile-death-count-controls {
  justify-content: flex-start;
  justify-self: stretch;
}

.death-count-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.death-count-card {
  display: grid;
  gap: 14px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--muted) / 0.25);
  padding: 14px;
}

.global-death-count-card {
  background: rgba(37, 99, 235, 0.08);
  border-color: rgba(37, 99, 235, 0.35);
}

.global-death-count-dot {
  width: 36px;
  height: 36px;
  border: 1px solid #2563eb;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.38);
}

.death-count-value {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.death-count-value strong {
  font-size: 2rem;
  font-weight: 800;
  line-height: 1;
}

.death-count-value span {
  color: hsl(var(--muted-foreground));
  font-size: 13px;
  font-weight: 650;
}

.death-count-chart-canvas {
  position: relative;
  height: 420px;
  min-height: 420px;
}

.overlay-death-count-chart-canvas {
  height: 100%;
  min-height: 0;
}

.death-count-chart-canvas canvas {
  display: block;
}

:global(.chat-content) {
  display: grid;
  gap: 12px;
}

.chat-messages {
  display: grid;
  align-content: start;
  gap: 10px;
  height: 320px;
  overflow-y: auto;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--muted) / 0.25);
  padding: 12px;
}

.desktop-chat-panel .chat-messages {
  height: auto;
  min-height: 0;
}

.chat-message {
  max-width: min(78%, 560px);
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--background));
  padding: 9px 11px;
}

.chat-message.own-message {
  justify-self: end;
  border-color: hsl(var(--primary) / 0.35);
  background: hsl(var(--primary) / 0.09);
}

.chat-message.system-message {
  justify-self: center;
  max-width: 92%;
  border-color: hsl(var(--primary) / 0.25);
  background: hsl(var(--primary) / 0.08);
  text-align: center;
}

.chat-message-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}

.chat-message-meta strong {
  color: hsl(var(--foreground));
}

.chat-message p {
  margin: 4px 0 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.45;
}

:global(.chat-message-action) {
  margin-top: 8px;
}

.chat-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: end;
}

.chat-form :global(button) {
  width: 44px;
  height: 44px;
  padding: 0;
}

:global(.mobile-chat-trigger) {
  display: none !important;
}

:global(.mobile-chat-drawer) {
  height: 86vh;
  max-height: 86vh;
}

:global(.mobile-activity-tabs) {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
}

:global(.mobile-tabs-list) {
  margin-top: 14px;
}

:global(.mobile-tab-content) {
  flex: 1;
  min-height: 0;
  margin-top: 0;
}

:global(.mobile-tab-content[data-state="active"]) {
  display: flex;
  min-height: 0;
  flex-direction: column;
}

.mobile-chat-body {
  display: grid;
  flex: 1;
  gap: 12px;
  grid-template-rows: minmax(0, 1fr) auto;
  min-height: 0;
  overflow: hidden;
  padding: 0 16px 16px;
  max-height: 60vh;
  overflow-y: scroll;
}

.mobile-activity-body {
  min-height: 0;
  overflow-y: auto;
  padding: 0 16px 16px;
  max-height: 60vh;
}

.mobile-activity-body .progress-graph-panel,
.mobile-activity-body .death-count-panel {
  min-height: 100%;
}

.mobile-progress-graph-canvas {
  height: 58vh;
  min-height: 360px;
}

.mobile-death-count-chart-canvas {
  height: 52vh;
  min-height: 320px;
}

.empty-state {
  display: flex;
  align-items: center;
  min-height: 72px;
}

@media (max-width: 900px) {
  .match-layout {
    grid-template-columns: 1fr;
  }

  .overlay-mode .match-layout {
    grid-template-columns: 1fr;
  }

  .overlay-graphs-panel {
    min-height: auto;
  }

  .desktop-chat-panel {
    display: none;
  }

  .side-grid {
    grid-template-columns: 1fr;
  }

  .death-count-summary {
    grid-template-columns: 1fr;
  }

  :global(.mobile-chat-trigger) {
    position: fixed;
    right: 16px;
    bottom: max(16px, env(safe-area-inset-bottom));
    z-index: 40;
    display: inline-flex !important;
    gap: 8px;
    box-shadow: 0 12px 28px hsl(var(--foreground) / 0.18);
  }

  .mobile-chat-body .chat-messages {
    height: auto;
    min-height: 0;
  }
}

@media (max-width: 640px) {
  .match-page {
    width: min(100vw - 20px, 1120px);
    padding-top: 24px;
    padding-bottom: 88px;
  }

  :global(.auth-content),
  .match-panel-header,
  .chat-header {
    align-items: stretch;
    flex-direction: column;
  }

  .result-line {
    justify-content: flex-start;
  }

  .chat-message {
    max-width: 92%;
  }
}
</style>
