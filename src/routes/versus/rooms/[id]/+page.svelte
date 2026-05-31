<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { user } from '$lib/client';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import PlayerSelector from '$lib/components/playerSelector.svelte';
	import MatchCard from '$lib/components/pvp/MatchCard.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Card from '$lib/components/ui/card';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Tabs from '$lib/components/ui/tabs';
	import {
		endPvpRoom,
		endPvpRoomMatch,
		getPvpMatchId,
		getPvpRoom,
		getPvpRoomMessages,
		invitePvpRoomPlayer,
		joinPvpRoom,
		kickPvpRoomMember,
		leavePvpRoom,
		sendPvpRoomMessage,
		setPvpRoomReady,
		startPvpRoomMatch,
		transferPvpRoomHost,
		updatePvpRoom,
		type PvpRoom,
		type PvpLevel,
		type PvpRoomMessage
	} from '$lib/client/pvp';
	import {
		broadcastPvpRoomEnded,
		setPvpRealtimeAuth,
		subscribeToPvpRoom,
		type PvpRealtimeEvent
	} from '$lib/client/pvpRealtime';
	import { resolvePvpRankBadge } from '$lib/utils/pvpRank';
	import { onDestroy, onMount, tick } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { _ } from 'svelte-i18n';
	import {
		ArrowLeft,
		CheckCircle2,
		Copy,
		Crown,
		Loader2,
		LogIn,
		MoreHorizontal,
		Save,
		Send,
		Swords,
		UserMinus,
		UserCog,
		Users
	} from 'lucide-svelte';

	const MESSAGE_FETCH_LIMIT = 100;
	const REALTIME_COALESCE_MS = 200;
	const ROOM_MATCH_CONFIG_STORAGE_KEY = 'pvp.room.matchConfig.v1';

	type CompletionRuleType = 'count' | 'percentage';
	type ScoringMode = 'progress' | 'score';
	type StoredRoomMatchConfig = {
		startTimeLimitMinutes?: number | string;
		startTimeLimitSeconds?: number | string;
		completionRuleType?: CompletionRuleType | string;
		completionRuleValue?: number | string;
		scoringMode?: ScoringMode | string;
		targetScoreEnabled?: boolean;
		targetScore?: number | string;
	};

	let room: PvpRoom | null = null;
	let messages: PvpRoomMessage[] = [];
	let selectedInvitePlayer: any = null;
	let chatDraft = '';
	let activeRoomTab = 'chat';
	let endRoomDialogOpen = false;
	let forceStartDialogOpen = false;
	let editRoomName = '';
	let editRoomVisibility: 'public' | 'private' = 'public';
	let syncedEditRoomKey = '';
	let chatScrollEl: HTMLDivElement | null = null;
	let lastMessageScrollKey = '';
	let selectedLevelId = '';
	let syncedSelectedLevelId = '';
	let selectedLevel: PvpLevel | null = null;
	let selectedLevelLoading = false;
	let selectedLevelLoadKey = '';
	let selectedLevelError = '';
	let startTimeLimitMinutes = 15;
	let startTimeLimitSeconds = 0;
	let completionRuleType: CompletionRuleType = 'count';
	let completionRuleValue = 1;
	let scoringMode: ScoringMode = 'progress';
	let targetScoreEnabled = false;
	let targetScore = 1000;
	let loading = false;
	let messagesLoading = false;
	let actionLoading = '';
	let initializedFor = '';
	let redirectingToLobby = false;
	let cleanupRealtime: (() => Promise<void>) | null = null;
	let scheduledRefresh: ReturnType<typeof setTimeout> | null = null;

	$: roomId = $page.params.id;
	$: inviteToken = $page.url.searchParams.get('token');
	$: currentUid = $user.data?.uid;
	$: isHost = room?.viewerRole === 'host';
	$: isMember = room?.viewerRole === 'host' || room?.viewerRole === 'member';
	$: activeMatchId = getPvpMatchId(room?.activeMatch);
	$: memberCount = room?.activeMemberCount ?? room?.memberCount ?? room?.members?.length ?? 0;
	$: activeMembers = (room?.members ?? []).filter((member) => member.status !== 'left' && member.status !== 'kicked');
	$: currentMember = activeMembers.find((member) => member.uid === currentUid) ?? room?.viewerMembership ?? null;
	$: currentMemberReady = roomMemberReady(currentMember);
	$: readyRequiredMembers = activeMembers.filter((member) => member.role !== 'host');
	$: readyMembersCount = readyRequiredMembers.filter(roomMemberReady).length;
	$: unreadyMembers = activeMembers.filter((member) =>
		member.role !== 'host' && !roomMemberReady(member)
	);
	$: allMembersReady = unreadyMembers.length === 0;
	$: roomEditKey = room
		? `${room.id ?? ''}:${room.name ?? ''}:${room.visibility ?? ''}`
		: '';
	$: sharedLevelId = getRoomSelectedLevelId(room);
	$: selectedLevelVideoId = getYouTubeVideoId(
		selectedLevel?.videoID
		?? selectedLevel?.videoId
		?? selectedLevel?.video
		?? selectedLevel?.videoUrl
	);
	$: selectedLevelIsPlatformer = Boolean(selectedLevel?.isPlatformer);
	$: startDisabled = Boolean(actionLoading)
		|| !isHost
		|| Boolean(activeMatchId)
		|| !sharedLevelId
		|| memberCount < 2
		|| (scoringMode === 'score' && selectedLevelIsPlatformer);
	$: if (selectedLevelIsPlatformer && scoringMode === 'score') {
		scoringMode = 'progress';
	}
	$: if (roomEditKey && roomEditKey !== syncedEditRoomKey && activeRoomTab !== 'edit') {
		syncEditRoomDetails();
	}
	$: if (isMember && activeRoomTab === 'chat') {
		scrollChatForLatestMessage();
	}
	$: if (sharedLevelId !== syncedSelectedLevelId && actionLoading !== 'save-level') {
		selectedLevelId = sharedLevelId;
		syncedSelectedLevelId = sharedLevelId;
	}
	$: loadSelectedLevelForRoom(sharedLevelId);

	$: if (
		$user.checked
		&& $user.loggedIn
		&& roomId
		&& initializedFor !== `${currentUid}:${roomId}:${inviteToken || ''}`
	) {
		initializeRoom();
	}

	$: if ($user.checked && !$user.loggedIn) {
		room = null;
		messages = [];
		initializedFor = '';
	}

	onMount(() => {
		loadSavedMatchConfig();
	});

	onDestroy(() => {
		cleanupRealtime?.();

		if (scheduledRefresh) {
			clearTimeout(scheduledRefresh);
		}
	});

	async function initializeRoom() {
		const id = roomId;

		if (!id) {
			return;
		}

		initializedFor = `${currentUid}:${roomId}:${inviteToken || ''}`;
		cleanupRealtime?.();

		try {
			const token = await $user.token();
			setPvpRealtimeAuth(token);
			await loadRoom();

			if (isMember) {
				await loadMessages();
			}

			cleanupRealtime = subscribeToPvpRoom(id, handleRoomRealtimeEvent);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : $_('pvp.rooms.load_failed')
			);
		}
	}

	function scheduleRefresh() {
		if (scheduledRefresh) {
			clearTimeout(scheduledRefresh);
		}

		scheduledRefresh = setTimeout(async () => {
			scheduledRefresh = null;
			await loadRoom();

			if (isMember) {
				await loadMessages({ incremental: true });
			}
		}, REALTIME_COALESCE_MS);
	}

	function handleRoomRealtimeEvent(event: PvpRealtimeEvent) {
		if (shouldRedirectToLobbyForRoomEvent(event)) {
			redirectToLobby();

			return;
		}

		scheduleRefresh();
	}

	function shouldRedirectToLobbyForRoomEvent(event: PvpRealtimeEvent) {
		const row = realtimeRow(event);

		if (event.scope === 'roomBroadcast') {
			const payload = event.payload?.payload ?? event.payload ?? {};

			return String(payload.roomId ?? '') === String(roomId ?? '');
		}

		if (event.scope === 'room') {
			return String(row?.id ?? '') === String(roomId ?? '')
				&& row?.status === 'closed';
		}

		if (event.scope === 'roomMember') {
			return row?.uid === currentUid
				&& String(row?.roomId ?? row?.room_id ?? '') === String(roomId ?? '')
				&& (row?.status === 'left' || row?.status === 'kicked');
		}

		return false;
	}

	function realtimeRow(event: PvpRealtimeEvent) {
		return event.payload?.new ?? event.payload?.old ?? {};
	}

	function redirectToLobby() {
		if (redirectingToLobby) {
			return;
		}

		redirectingToLobby = true;
		endRoomDialogOpen = false;
		forceStartDialogOpen = false;
		goto('/versus/play');
	}

	async function loadRoom() {
		if (!$user.loggedIn || !roomId) {
			return;
		}

		loading = true;

		try {
			room = await getPvpRoom(await $user.token(), roomId, { token: inviteToken });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : $_('pvp.rooms.load_failed')
			);
		} finally {
			loading = false;
		}
	}

	async function loadMessages(options: { incremental?: boolean; } = {}) {
		if (!$user.loggedIn || !roomId || !isMember) {
			return;
		}

		messagesLoading = true;

		try {
			const nextMessages = await getPvpRoomMessages(await $user.token(), roomId, {
				afterId: options.incremental ? latestMessageId() : null,
				limit: MESSAGE_FETCH_LIMIT
			});

			messages = options.incremental
				? mergeMessages(messages, nextMessages)
				: nextMessages;
			await scrollChatToBottom();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : $_('pvp.rooms.chat_load_failed')
			);
		} finally {
			messagesLoading = false;
		}
	}

	async function joinRoom() {
		const id = roomId;

		if (!id) {
			return;
		}

		actionLoading = 'join-room';

		try {
			room = await joinPvpRoom(await $user.token(), id, inviteToken);
			await loadMessages();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : $_('pvp.rooms.join_failed')
			);
		} finally {
			actionLoading = '';
		}
	}

	async function leaveRoom() {
		const id = roomId;

		if (!id) {
			return;
		}

		actionLoading = 'leave-room';

		try {
			const result = await leavePvpRoom(await $user.token(), id);

			if (result.closed) {
				goto('/versus/play');

				return;
			}

			await loadRoom();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : $_('pvp.rooms.leave_failed')
			);
		} finally {
			actionLoading = '';
		}
	}

	async function endRoom() {
		const id = roomId;

		if (!id) {
			return;
		}

		actionLoading = 'end-room';

		try {
			await endPvpRoom(await $user.token(), id);

			try {
				await broadcastPvpRoomEnded(id, { endedByUid: currentUid });
			} catch (error) {
				console.warn('Failed to broadcast ended PvP room', error);
			}

			endRoomDialogOpen = false;
			redirectToLobby();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : $_('pvp.rooms.end_failed')
			);
		} finally {
			actionLoading = '';
		}
	}

	async function endActiveMatch() {
		const id = roomId;

		if (!id || !activeMatchId) {
			return;
		}

		actionLoading = 'end-match';

		try {
			room = await endPvpRoomMatch(await $user.token(), id);
			toast.success('Match ended');
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : $_('pvp.rooms.end_failed')
			);
		} finally {
			actionLoading = '';
		}
	}

	function syncEditRoomDetails() {
		if (!room) {
			return;
		}

		editRoomName = room?.name ?? '';
		editRoomVisibility = room?.visibility === 'private' ? 'private' : 'public';
		syncedEditRoomKey = roomEditKey;
	}

	async function saveRoomDetails() {
		const id = roomId;
		const name = editRoomName.trim();

		if (!id) {
			return;
		}

		if (!name) {
			toast.error($_('pvp.rooms.name_required'));

			return;
		}

		actionLoading = 'save-room';

		try {
			room = await updatePvpRoom(await $user.token(), id, {
				name,
				visibility: editRoomVisibility
			});
			syncEditRoomDetails();
			toast.success($_('pvp.rooms.details_saved'));
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : $_('pvp.rooms.update_failed')
			);
		} finally {
			actionLoading = '';
		}
	}

	async function saveSelectedLevel() {
		const id = roomId;
		const levelId = selectedLevelId.trim();

		if (!id) {
			return;
		}

		if (!levelId) {
			toast.error($_('pvp.rooms.level_required'));

			return;
		}

		actionLoading = 'save-level';

		try {
			room = await updatePvpRoom(await $user.token(), id, {
				selectedLevelId: levelId
			});
			syncedSelectedLevelId = getRoomSelectedLevelId(room);
			selectedLevelId = syncedSelectedLevelId;
			toast.success($_('pvp.rooms.level_saved'));
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : $_('pvp.rooms.level_save_failed')
			);
		} finally {
			actionLoading = '';
		}
	}

	async function loadSelectedLevelForRoom(levelId: string) {
		if (!browser) {
			return;
		}

		const id = levelId.trim();

		if (!id) {
			selectedLevel = null;
			selectedLevelLoading = false;
			selectedLevelError = '';
			selectedLevelLoadKey = '';

			return;
		}

		if (selectedLevelLoadKey === id) {
			return;
		}

		selectedLevelLoadKey = id;
		selectedLevel = null;
		selectedLevelError = '';
		selectedLevelLoading = true;

		try {
			const level = await fetchSelectedLevel(id);

			if (selectedLevelLoadKey !== id) {
				return;
			}

			selectedLevel = level;
			selectedLevelError = level ? '' : $_('pvp.level_pending');
		} catch (error) {
			if (selectedLevelLoadKey !== id) {
				return;
			}

			selectedLevelError = error instanceof Error
				? error.message
				: $_('pvp.level_pending');
			selectedLevel = null;
		} finally {
			if (selectedLevelLoadKey === id) {
				selectedLevelLoading = false;
			}
		}
	}

	async function fetchSelectedLevel(levelId: string) {
		const stored = await fetch(`${import.meta.env.VITE_API_URL}/levels/${levelId}`);

		if (stored.ok) {
			return stored.json() as Promise<PvpLevel>;
		}

		const crawled = await fetch(`${import.meta.env.VITE_API_URL}/levels/${levelId}?fromGD=1`);

		if (crawled.ok) {
			return crawled.json() as Promise<PvpLevel>;
		}

		return null;
	}

	async function copyLevelId() {
		if (!sharedLevelId) {
			return;
		}

		await navigator.clipboard.writeText(sharedLevelId);
		toast.success($_('pvp.rooms.level_id_copied'));
	}

	async function invitePlayer() {
		const id = roomId;

		if (!id) {
			return;
		}

		if (!selectedInvitePlayer?.uid) {
			toast.error($_('pvp.toast.select_player'));

			return;
		}

		actionLoading = 'invite-player';

		try {
			await invitePvpRoomPlayer(await $user.token(), id, selectedInvitePlayer.uid);
			selectedInvitePlayer = null;
			await loadRoom();
			toast.success($_('pvp.rooms.invite_sent'));
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : $_('pvp.rooms.invite_failed')
			);
		} finally {
			actionLoading = '';
		}
	}

	async function setReady(ready: boolean) {
		const id = roomId;

		if (!id) {
			return;
		}

		actionLoading = 'ready';

		try {
			room = await setPvpRoomReady(await $user.token(), id, ready);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : $_('pvp.rooms.ready_failed')
			);
		} finally {
			actionLoading = '';
		}
	}

	async function kickMember(uid: string | undefined) {
		const id = roomId;

		if (!id) {
			return;
		}

		if (!uid) {
			return;
		}

		actionLoading = `kick-${uid}`;

		try {
			room = await kickPvpRoomMember(await $user.token(), id, uid);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : $_('pvp.rooms.kick_failed')
			);
		} finally {
			actionLoading = '';
		}
	}

	async function transferHost(uid: string | undefined) {
		const id = roomId;

		if (!id || !uid) {
			return;
		}

		actionLoading = `transfer-${uid}`;

		try {
			room = await transferPvpRoomHost(await $user.token(), id, uid);
			toast.success($_('pvp.rooms.host_transferred'));
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : $_('pvp.rooms.transfer_failed')
			);
		} finally {
			actionLoading = '';
		}
	}

	async function sendMessage() {
		const id = roomId;

		if (!id) {
			return;
		}

		const content = chatDraft.trim();

		if (!content) {
			return;
		}

		actionLoading = 'send-message';

		try {
			const message = await sendPvpRoomMessage(await $user.token(), id, content);
			messages = mergeMessages(messages, [message]);
			chatDraft = '';
			await scrollChatToBottom('smooth');
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : $_('pvp.rooms.chat_send_failed')
			);
		} finally {
			actionLoading = '';
		}
	}

	function requestStartMatch() {
		if (startDisabled) {
			return;
		}

		if (!allMembersReady) {
			forceStartDialogOpen = true;

			return;
		}

		startMatch(false);
	}

	function setCompletionRule(nextType: CompletionRuleType) {
		completionRuleType = nextType;
		completionRuleValue = nextType === 'percentage'
			? 100
			: 1;
	}

	async function startMatch(forceStart = false) {
		const id = roomId;

		if (!id) {
			return;
		}

		actionLoading = 'start-match';

		try {
			completionRuleValue = normalizedCompletionRuleValue();
			targetScore = normalizedTargetScore();

			const match = await startPvpRoomMatch(await $user.token(), id, {
				levelId: sharedLevelId,
				timeLimitSeconds: totalStartTimeLimitSeconds(),
				completionRuleType,
				completionRuleValue,
				scoringMode,
				targetScore: scoringMode === 'score' && targetScoreEnabled ? normalizedTargetScore() : null,
				forceStart
			});

			saveMatchConfig();
			forceStartDialogOpen = false;
			goto(`/versus/matches/${getPvpMatchId(match)}`);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : $_('pvp.rooms.start_failed')
			);
		} finally {
			actionLoading = '';
		}
	}

	function loadSavedMatchConfig() {
		if (!browser) {
			return;
		}

		try {
			const raw = localStorage.getItem(ROOM_MATCH_CONFIG_STORAGE_KEY);

			if (!raw) {
				return;
			}

			const config = JSON.parse(raw) as StoredRoomMatchConfig | null;

			if (!config || typeof config !== 'object') {
				return;
			}

			startTimeLimitMinutes = normalizedInteger(
				config.startTimeLimitMinutes,
				0,
				120,
				startTimeLimitMinutes
			);
			startTimeLimitSeconds = normalizedInteger(
				config.startTimeLimitSeconds,
				0,
				59,
				startTimeLimitSeconds
			);
			completionRuleType = config.completionRuleType === 'percentage'
				? 'percentage'
				: 'count';
			completionRuleValue = normalizedCompletionRuleValue(
				completionRuleType,
				config.completionRuleValue,
				false
			);
			scoringMode = config.scoringMode === 'score' ? 'score' : 'progress';
			targetScoreEnabled = Boolean(config.targetScoreEnabled);
			targetScore = normalizedTargetScore(config.targetScore);
		} catch {
			return;
		}
	}

	function saveMatchConfig() {
		if (!browser) {
			return;
		}

		try {
			const config: StoredRoomMatchConfig = {
				startTimeLimitMinutes: normalizedInteger(startTimeLimitMinutes, 0, 120, 15),
				startTimeLimitSeconds: normalizedInteger(startTimeLimitSeconds, 0, 59, 0),
				completionRuleType,
				completionRuleValue: normalizedCompletionRuleValue(),
				scoringMode,
				targetScoreEnabled,
				targetScore: normalizedTargetScore()
			};

			localStorage.setItem(ROOM_MATCH_CONFIG_STORAGE_KEY, JSON.stringify(config));
		} catch {
			return;
		}
	}

	function totalStartTimeLimitSeconds() {
		const minutes = Number(startTimeLimitMinutes);
		const seconds = Number(startTimeLimitSeconds);

		return Math.max(
			1,
			(Math.max(0, Number.isFinite(minutes) ? Math.floor(minutes) : 0) * 60)
				+ Math.max(0, Number.isFinite(seconds) ? Math.floor(seconds) : 0)
		);
	}

	function normalizedCompletionRuleValue(
		type: CompletionRuleType = completionRuleType,
		value: unknown = completionRuleValue,
		clampToMembers = true
	) {
		const numberValue = Number(value);
		const fallback = type === 'percentage' ? 100 : 1;
		const rounded = Number.isFinite(numberValue) ? Math.floor(numberValue) : fallback;
		const upperBound = type === 'percentage'
			? 100
			: clampToMembers
			? Math.max(1, memberCount)
			: Number.POSITIVE_INFINITY;

		return Math.max(1, Math.min(upperBound, rounded));
	}

	function normalizedInteger(value: unknown, min: number, max: number, fallback: number) {
		const numberValue = Number(value);

		if (!Number.isFinite(numberValue)) {
			return fallback;
		}

		return Math.max(min, Math.min(max, Math.floor(numberValue)));
	}

	function normalizedTargetScore(value: unknown = targetScore) {
		const numberValue = Number(value);

		return Math.max(
			1,
			Math.min(100000, Number.isFinite(numberValue) ? Math.floor(numberValue) : 1000)
		);
	}

	function getRoomSelectedLevelId(value: PvpRoom | null | undefined) {
		const raw = value?.selectedLevelId
			?? value?.selected_level_id
			?? value?.levelId
			?? value?.level_id
			?? (value?.metadata as Record<string, unknown> | null | undefined)?.selectedLevelId
			?? (value?.metadata as Record<string, unknown> | null | undefined)?.levelId
			?? '';

		return raw === undefined || raw === null ? '' : String(raw);
	}

	function getYouTubeVideoId(value: unknown) {
		const raw = String(value ?? '')
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

	function selectedLevelName() {
		return selectedLevel?.name || (sharedLevelId ? `#${sharedLevelId}` : '');
	}

	function selectedLevelCreator() {
		return selectedLevel?.creator || selectedLevel?.author || '';
	}

	function handleChatKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter' || event.shiftKey) {
			return;
		}

		event.preventDefault();
		sendMessage();
	}

	async function scrollChatForLatestMessage() {
		const latestKey = `${messageId(messages[messages.length - 1]) ?? messages.length}`;

		if (latestKey === lastMessageScrollKey) {
			return;
		}

		lastMessageScrollKey = latestKey;
		await scrollChatToBottom(messages.length > 1 ? 'smooth' : 'auto');
	}

	async function scrollChatToBottom(behavior: ScrollBehavior = 'auto') {
		await tick();
		chatScrollEl?.scrollTo({
			top: chatScrollEl.scrollHeight,
			behavior
		});
	}

	async function copyInviteLink() {
		const value = room?.inviteUrl
			? `${window.location.origin}${room.inviteUrl}`
			: window.location.href;

		await navigator.clipboard.writeText(value);
		toast.success($_('pvp.rooms.invite_link_copied'));
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

	function messageId(message: PvpRoomMessage) {
		return message.id === undefined || message.id === null
			? null
			: String(message.id);
	}

	function mergeMessages(current: PvpRoomMessage[], incoming: PvpRoomMessage[]) {
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

		return merged.sort((a, b) => Number(a.id ?? 0) - Number(b.id ?? 0));
	}

	function memberName(member: NonNullable<PvpRoom['members']>[number]) {
		return member.player?.name ?? member.players?.name ?? member.uid ?? $_('pvp.rooms.player');
	}

	function memberPlayer(member: PvpRoom['viewerMembership'] | NonNullable<PvpRoom['members']>[number] | null | undefined) {
		return member?.player ?? member?.players ?? null;
	}

	function roomMemberReady(member: PvpRoom['viewerMembership'] | NonNullable<PvpRoom['members']>[number] | null | undefined) {
		return Boolean(member?.ready ?? member?.isReady ?? member?.is_ready ?? member?.readyAt ?? member?.ready_at);
	}

	function messagePlayer(message: PvpRoomMessage) {
		return message.sender ?? message.player ?? null;
	}

	function messageSender(message: PvpRoomMessage) {
		if (message.type === 'system') {
			return $_('pvp.system_sender');
		}

		return message.sender?.name ?? message.player?.name ?? $_('pvp.rooms.player');
	}

	async function signIn() {
		await import('$lib/client/supabase').then(({ default: supabase }) =>
			supabase.auth.signInWithOAuth({
				provider: 'google',
				options: {
					queryParams: {
						access_type: 'offline',
						prompt: 'consent'
					},
					redirectTo: window.location.origin
				}
			})
		);
	}
</script>

<svelte:head>
  <title>{room?.name ?? $_('pvp.rooms.room')} - Geometry Dash Việt Nam</title>
</svelte:head>

<main class="room-page">
  <a class="back-link" href="/versus/play">
    <ArrowLeft class="h-4 w-4" />
    {$_('pvp.tabs.rooms')}
  </a>

  {#if !$user.checked}
    <Card.Root>
      <Card.Content class="state-content">
        <Loader2 class="h-5 w-5 animate-spin" />
        <span>{$_('general.loading')}</span>
      </Card.Content>
    </Card.Root>
  {:else if !$user.loggedIn}
    <Card.Root>
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
  {:else if loading && !room}
    <Card.Root>
      <Card.Content class="state-content">
        <Loader2 class="h-5 w-5 animate-spin" />
        <span>{$_('general.loading')}</span>
      </Card.Content>
    </Card.Root>
  {:else if room}
    <section class="room-topbar">
      <div>
        <div class="eyebrow">
          <Users class="h-4 w-4" />
          {room.visibility === 'private' ? $_('pvp.rooms.private') : $_('pvp.rooms.public')}
        </div>
        <h1>{room.name}</h1>
      </div>
      <div class="room-top-actions">
        {#if isHost && room.inviteUrl}
          <Button variant="outline" on:click={copyInviteLink}>
            <Copy class="mr-2 h-4 w-4" />
            {$_('pvp.rooms.copy_invite_link')}
          </Button>
          <Button
            variant="destructive"
            disabled={Boolean(actionLoading)}
            on:click={() => (endRoomDialogOpen = true)}
          >
            {$_('pvp.rooms.end_room')}
          </Button>
        {/if}
        {#if isMember && !isHost}
          <Button
            variant={currentMemberReady ? 'outline' : 'default'}
            disabled={Boolean(actionLoading)}
            on:click={() => setReady(!currentMemberReady)}
          >
            {#if actionLoading === 'ready'}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            {:else}
              <CheckCircle2 class="mr-2 h-4 w-4" />
            {/if}
            {currentMemberReady ? $_('pvp.rooms.unready') : $_('pvp.rooms.ready')}
          </Button>
        {/if}
        {#if isMember}
          <Button variant="outline" disabled={Boolean(actionLoading)} on:click={leaveRoom}>
            {$_('pvp.rooms.leave')}
          </Button>
        {:else}
          <Button disabled={Boolean(actionLoading)} on:click={joinRoom}>
            {#if actionLoading === 'join-room'}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            {/if}
            {$_('pvp.rooms.join')}
          </Button>
        {/if}
      </div>
    </section>

    {#if room.activeMatch && activeMatchId}
      <section class="room-section">
        <div class="section-heading">
          <h2>{$_('pvp.rooms.active_match')}</h2>
          <div class="section-actions">
            {#if isHost}
              <Button
                size="sm"
                variant="outline"
                disabled={Boolean(actionLoading)}
                on:click={endActiveMatch}
              >
                {#if actionLoading === 'end-match'}
                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                {/if}
                End match
              </Button>
            {/if}
            <a href={`/versus/matches/${activeMatchId}`}>{$_('pvp.enter_match')}</a>
          </div>
        </div>
        <MatchCard
          match={room.activeMatch}
          {currentUid}
          href={`/versus/matches/${activeMatchId}`}
        />
      </section>
    {/if}

    <div class="room-layout">
      <section class="room-main">
        {#if isMember}
          <Tabs.Root bind:value={activeRoomTab}>
            <Tabs.List class="room-tabs-list" aria-label={$_('pvp.rooms.room_tabs')}>
              <Tabs.Trigger value="chat">{$_('pvp.rooms.chat')}</Tabs.Trigger>
              <Tabs.Trigger value="history">{$_('pvp.rooms.history')}</Tabs.Trigger>
              {#if isHost}
                <Tabs.Trigger value="edit">{$_('pvp.rooms.edit_details')}</Tabs.Trigger>
              {/if}
            </Tabs.List>
            <Tabs.Content value="chat" class="room-tab-content">
              <Card.Root class="chat-tab-card">
                <Card.Content class="chat-panel room-chat-panel">
                  <div class="message-list" bind:this={chatScrollEl}>
                    {#if messagesLoading && messages.length === 0}
                      <div class="empty-state">{$_('general.loading')}</div>
                    {:else if messages.length === 0}
                      <div class="empty-state">{$_('pvp.rooms.no_messages')}</div>
                    {:else}
                      {#each messages as message}
                        {@const sender = messagePlayer(message)}
                        <div class:system-message={message.type === 'system'} class="message-row">
                          {#if message.type === 'system' || !sender}
                            <strong>{messageSender(message)}</strong>
                          {:else}
                            <PlayerLink
                              player={sender}
                              rankBadge={resolvePvpRankBadge(sender)}
                              showAvatar
                              truncate={24}
                            />
                          {/if}
                          <span>{message.content}</span>
                        </div>
                      {/each}
                    {/if}
                  </div>
                  <div class="chat-compose">
                    <Textarea
                      bind:value={chatDraft}
                      rows={2}
                      maxlength={500}
                      placeholder={$_('pvp.rooms.chat_placeholder')}
                      on:keydown={handleChatKeydown}
                    />
                    <Button disabled={Boolean(actionLoading) || !chatDraft.trim()} on:click={sendMessage}>
                      {#if actionLoading === 'send-message'}
                        <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                      {:else}
                        <Send class="mr-2 h-4 w-4" />
                      {/if}
                      {$_('pvp.send')}
                    </Button>
                  </div>
                </Card.Content>
              </Card.Root>
            </Tabs.Content>
            <Tabs.Content value="history" class="room-tab-content">
              <div class="history-list">
                {#if (room.history ?? []).length === 0}
                  <div class="empty-state">{$_('pvp.rooms.no_history')}</div>
                {:else}
                  {#each room.history ?? [] as match}
                    <MatchCard
                      {match}
                      {currentUid}
                      href={`/versus/matches/${getPvpMatchId(match)}`}
                    />
                  {/each}
                  {/if}
                </div>
            </Tabs.Content>
            {#if isHost}
              <Tabs.Content value="edit" class="room-tab-content">
                <div class="edit-tab-panel">
                  <div class="field-group">
                    <Label for="room-edit-name">{$_('pvp.rooms.name_placeholder')}</Label>
                    <Input id="room-edit-name" bind:value={editRoomName} maxlength={64} />
                  </div>
                  <div class="field-group">
                    <Label>{$_('pvp.rooms.edit_details')}</Label>
                    <div class="completion-toggle">
                      <button
                        type="button"
                        class:active={editRoomVisibility === 'public'}
                        on:click={() => (editRoomVisibility = 'public')}
                      >
                        {$_('pvp.rooms.public')}
                      </button>
                      <button
                        type="button"
                        class:active={editRoomVisibility === 'private'}
                        on:click={() => (editRoomVisibility = 'private')}
                      >
                        {$_('pvp.rooms.private')}
                      </button>
                    </div>
                  </div>
                  <div class="edit-actions">
                    <Button variant="outline" on:click={syncEditRoomDetails}>
                      {$_('general.cancel')}
                    </Button>
                    <Button
                      disabled={Boolean(actionLoading) || !editRoomName.trim()}
                      on:click={saveRoomDetails}
                    >
                      {#if actionLoading === 'save-room'}
                        <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                      {:else}
                        <Save class="mr-2 h-4 w-4" />
                      {/if}
                      {$_('general.save')}
                    </Button>
                  </div>
                </div>
              </Tabs.Content>
            {/if}
          </Tabs.Root>
        {/if}
      </section>

      <aside class="room-side">
        <Card.Root>
          <Card.Header>
            <Card.Title>{$_('pvp.rooms.members')}</Card.Title>
            <Card.Description>
              {memberCount} {$_('pvp.rooms.players')} - {readyMembersCount}/{readyRequiredMembers.length}
              {$_('pvp.rooms.ready')}
            </Card.Description>
          </Card.Header>
          <Card.Content class="member-list">
            {#each activeMembers as member}
              {@const player = memberPlayer(member)}
              <div class:ready-member={roomMemberReady(member)} class="member-row">
                <div class="member-identity">
                  {#if player?.uid && player?.name}
                    <PlayerLink
                      {player}
                      rankBadge={resolvePvpRankBadge(player)}
                      showAvatar
                      truncate={24}
                    />
                  {:else}
                    <strong>{memberName(member)}</strong>
                  {/if}
                  {#if member.role === 'host'}
                    <Badge>
                      <Crown class="mr-1 h-3.5 w-3.5" />
                      {$_('pvp.rooms.host')}
                    </Badge>
                  {/if}
                  {#if roomMemberReady(member)}
                    <Badge variant="secondary">
                      <CheckCircle2 class="mr-1 h-3.5 w-3.5" />
                      {$_('pvp.rooms.ready')}
                    </Badge>
                  {:else}
                    <Badge variant="outline">{$_('pvp.rooms.not_ready')}</Badge>
                  {/if}
                  {#if member.uid === currentUid}
                    <Badge variant="secondary">{$_('pvp.you')}</Badge>
                  {/if}
                </div>
                {#if isHost && member.uid !== currentUid}
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild let:builder>
                      <Button
                        builders={[builder]}
                        size="icon"
                        variant="ghost"
                        disabled={Boolean(actionLoading)}
                        aria-label={$_('pvp.rooms.player_actions')}
                      >
                        {#if actionLoading === `kick-${member.uid}` || actionLoading === `transfer-${member.uid}`}
                          <Loader2 class="h-4 w-4 animate-spin" />
                        {:else}
                          <MoreHorizontal class="h-4 w-4" />
                        {/if}
                      </Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="end">
                      <DropdownMenu.Item on:click={() => transferHost(member.uid)}>
                        <UserCog class="mr-2 h-4 w-4" />
                        {$_('pvp.rooms.transfer_host')}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item on:click={() => kickMember(member.uid)}>
                        <UserMinus class="mr-2 h-4 w-4" />
                        {$_('pvp.rooms.kick')}
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                {/if}
              </div>
            {/each}
          </Card.Content>
        </Card.Root>

        {#if isMember}
          <Card.Root>
            <Card.Header>
              <Card.Title>{$_('pvp.rooms.level_selection')}</Card.Title>
              <Card.Description>
                {sharedLevelId
                  ? selectedLevelName()
                  : $_('pvp.rooms.no_level_selected')}
              </Card.Description>
            </Card.Header>
            <Card.Content class="level-selection-card">
              {#if sharedLevelId}
                <div class="selected-level-preview">
                  {#if selectedLevelLoading}
                    <div class="selected-level-loading">
                      <Loader2 class="h-4 w-4 animate-spin" />
                      <span>{$_('general.loading')}</span>
                    </div>
                  {:else}
                    <div class="selected-level-summary">
                      <div>
                        <a class="selected-level-name" href={`/level/${sharedLevelId}`}>
                          {selectedLevelName()}
                        </a>
                        {#if selectedLevelCreator()}
                          <span>{$_('head.labels.by')} {selectedLevelCreator()}</span>
                        {:else if selectedLevelError}
                          <span>{selectedLevelError}</span>
                        {/if}
                      </div>
                      <div class="selected-level-id-row">
                        <strong>#{sharedLevelId}</strong>
                        <Button variant="outline" on:click={copyLevelId}>
                          <Copy class="mr-2 h-4 w-4" />
                          {$_('pvp.rooms.copy_level_id')}
                        </Button>
                      </div>
                    </div>
                    {#if selectedLevelVideoId}
                      <div class="selected-level-video">
                        <iframe
                          src={`https://www.youtube.com/embed/${selectedLevelVideoId}`}
                          title={selectedLevelName()}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowfullscreen
                        ></iframe>
                      </div>
                    {/if}
                  {/if}
                </div>
              {/if}
              {#if isHost}
                <div class="field-group">
                  <Label for="room-selected-level">{$_('pvp.rooms.level_id')}</Label>
                  <Input
                    id="room-selected-level"
                    bind:value={selectedLevelId}
                    inputmode="numeric"
                    placeholder="123456"
                  />
                </div>
                <div class="level-actions">
                  <Button
                    disabled={Boolean(actionLoading) || !selectedLevelId.trim()}
                    on:click={saveSelectedLevel}
                  >
                    {#if actionLoading === 'save-level'}
                      <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                    {:else}
                      <CheckCircle2 class="mr-2 h-4 w-4" />
                    {/if}
                    {$_('general.select')}
                  </Button>
                </div>
              {:else if !sharedLevelId}
                <div class="empty-state">{$_('pvp.rooms.no_level_selected')}</div>
              {/if}
            </Card.Content>
          </Card.Root>
        {/if}

        {#if isHost}
          <Card.Root>
            <Card.Header>
              <Card.Title>{$_('pvp.rooms.match_config')}</Card.Title>
              <Card.Description>
                {allMembersReady
                  ? $_('pvp.rooms.all_ready')
                  : $_('pvp.rooms.unready_count', { values: { count: unreadyMembers.length } })}
              </Card.Description>
            </Card.Header>
            <Card.Content class="start-form">
              <div class="field-group">
                <Label>{$_('pvp.rooms.match_length')}</Label>
                <div class="time-grid">
                  <div class="input-with-unit">
                    <Input
                      bind:value={startTimeLimitMinutes}
                      min="0"
                      max="120"
                      type="number"
                      aria-label={$_('pvp.rooms.minutes')}
                    />
                    <span>{$_('pvp.rooms.min_unit')}</span>
                  </div>
                  <div class="input-with-unit">
                    <Input
                      bind:value={startTimeLimitSeconds}
                      min="0"
                      max="59"
                      type="number"
                      aria-label={$_('pvp.rooms.seconds')}
                    />
                    <span>{$_('pvp.rooms.sec_unit')}</span>
                  </div>
                </div>
              </div>
              <div class="field-group">
                <Label>{$_('pvp.rooms.completion_rule')}</Label>
                <div class="completion-toggle">
                  <button
                    type="button"
                    class:active={completionRuleType === 'count'}
                    on:click={() => setCompletionRule('count')}
                  >
                    {$_('pvp.rooms.rule_count')}
                  </button>
                  <button
                    type="button"
                    class:active={completionRuleType === 'percentage'}
                    on:click={() => setCompletionRule('percentage')}
                  >
                    {$_('pvp.rooms.rule_percentage')}
                  </button>
                </div>
              </div>
              <div class="field-group">
                <Label for="room-completion-value">{$_('pvp.rooms.completion_value')}</Label>
                <div class="input-with-unit">
                  <Input
                    id="room-completion-value"
                    bind:value={completionRuleValue}
                    min="1"
                    max={completionRuleType === 'percentage' ? 100 : memberCount}
                    type="number"
                  />
                  <span>{completionRuleType === 'percentage' ? '%' : $_('pvp.rooms.players')}</span>
                </div>
              </div>
              <div class="field-group">
                <Label>Scoring mode</Label>
                <div class="completion-toggle">
                  <button
                    type="button"
                    class:active={scoringMode === 'progress'}
                    on:click={() => (scoringMode = 'progress')}
                  >
                    Progress
                  </button>
                  <button
                    type="button"
                    class:active={scoringMode === 'score'}
                    disabled={selectedLevelIsPlatformer}
                    on:click={() => (scoringMode = 'score')}
                  >
                    Score
                  </button>
                </div>
                {#if selectedLevelIsPlatformer}
                  <small class="field-hint">Score mode is only supported on classic levels.</small>
                {/if}
              </div>
              {#if scoringMode === 'score'}
                <div class="field-group">
                  <Label>Target score</Label>
                  <div class="completion-toggle">
                    <button
                      type="button"
                      class:active={!targetScoreEnabled}
                      on:click={() => (targetScoreEnabled = false)}
                    >
                      Unlimited
                    </button>
                    <button
                      type="button"
                      class:active={targetScoreEnabled}
                      on:click={() => (targetScoreEnabled = true)}
                    >
                      Target
                    </button>
                  </div>
                  {#if targetScoreEnabled}
                    <Input
                      bind:value={targetScore}
                      min="1"
                      max="100000"
                      type="number"
                      aria-label="Target score"
                    />
                  {/if}
                </div>
              {/if}

              <Button disabled={startDisabled} on:click={requestStartMatch}>
                {#if actionLoading === 'start-match'}
                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                {:else}
                  <Swords class="mr-2 h-4 w-4" />
                {/if}
                {$_('pvp.rooms.start_match')}
              </Button>
            </Card.Content>
          </Card.Root>

          <Card.Root>
            <Card.Header>
              <Card.Title>{$_('pvp.rooms.invite_player')}</Card.Title>
            </Card.Header>
            <Card.Content class="invite-form">
              <PlayerSelector
                bind:value={selectedInvitePlayer}
                placeholder={$_('pvp.search_player')}
              />
              <Button
                disabled={Boolean(actionLoading) || !selectedInvitePlayer}
                on:click={invitePlayer}
              >
                {#if actionLoading === 'invite-player'}
                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                {:else}
                  <Send class="mr-2 h-4 w-4" />
                {/if}
                {$_('pvp.rooms.invite')}
              </Button>
            </Card.Content>
          </Card.Root>
        {/if}
      </aside>
    </div>

    <AlertDialog.Root bind:open={forceStartDialogOpen}>
      <AlertDialog.Content>
        <AlertDialog.Header>
          <AlertDialog.Title>{$_('pvp.rooms.force_start_title')}</AlertDialog.Title>
          <AlertDialog.Description>
            {$_('pvp.rooms.force_start_description', { values: { count: unreadyMembers.length } })}
          </AlertDialog.Description>
          <div class="unready-member-list" role="list" aria-label={$_('pvp.rooms.unready_players')}>
            {#each unreadyMembers as member}
              {@const player = memberPlayer(member)}
              <div class="unready-member-row" role="listitem">
                {#if player?.uid && player?.name}
                  <PlayerLink
                    {player}
                    rankBadge={resolvePvpRankBadge(player)}
                    showAvatar
                    truncate={24}
                  />
                {:else}
                  <strong>{memberName(member)}</strong>
                {/if}
              </div>
            {/each}
          </div>
        </AlertDialog.Header>
        <AlertDialog.Footer>
          <AlertDialog.Cancel>{$_('general.cancel')}</AlertDialog.Cancel>
          <AlertDialog.Action on:click={() => startMatch(true)}>
            {$_('pvp.rooms.force_start')}
          </AlertDialog.Action>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog.Root>

    <AlertDialog.Root bind:open={endRoomDialogOpen}>
      <AlertDialog.Content>
        <AlertDialog.Header>
          <AlertDialog.Title>{$_('pvp.rooms.end_room')}</AlertDialog.Title>
          <AlertDialog.Description>
            {$_('pvp.rooms.end_room_description')}
          </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
          <AlertDialog.Cancel>{$_('general.cancel')}</AlertDialog.Cancel>
          <AlertDialog.Action on:click={endRoom}>
            {$_('pvp.rooms.end_room')}
          </AlertDialog.Action>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog.Root>
  {/if}
</main>

<style>
.room-page {
  width: min(1120px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 36px 0 64px;
}

.back-link,
.room-topbar,
.room-top-actions,
.section-heading,
.section-actions,
.member-row,
.member-identity,
.chat-compose,
.completion-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-link {
  width: fit-content;
  margin-bottom: 18px;
  color: hsl(var(--muted-foreground));
  font-weight: 700;
  text-decoration: none;
}

.room-topbar,
.section-heading,
.member-row {
  justify-content: space-between;
}

.room-topbar {
  margin-bottom: 24px;
}

h1 {
  margin: 4px 0 0;
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 800;
  letter-spacing: 0;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: hsl(var(--muted-foreground));
  font-size: 13px;
  font-weight: 750;
  text-transform: uppercase;
}

.room-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.22fr) minmax(0, 0.78fr);
  gap: 18px;
  align-items: start;
}

.room-main,
.room-side,
:global(.member-list),
:global(.chat-panel),
.message-list,
:global(.start-form),
:global(.invite-form),
:global(.level-selection-card),
.history-list,
.edit-tab-panel,
.field-group {
  display: grid;
  gap: 14px;
}

.room-main {
  position: sticky;
  top: 18px;
  align-self: start;
}

.field-group {
  gap: 7px;
}

.field-group :global(label) {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
  font-weight: 750;
  text-transform: uppercase;
}

.time-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.input-with-unit {
  position: relative;
}

.input-with-unit :global(input) {
  padding-right: 92px;
}

.input-with-unit span {
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  color: hsl(var(--muted-foreground));
  font-size: 12px;
  font-weight: 750;
  pointer-events: none;
}

.room-section {
  margin-bottom: 20px;
}

.member-row {
  min-height: 44px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--card));
  padding: 10px;
}

.member-row.ready-member {
  border-color: hsl(142 70% 45% / 0.75);
  box-shadow: 0 0 0 1px hsl(142 70% 45% / 0.12);
}

.unready-member-list {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.unready-member-row {
  display: flex;
  align-items: center;
  min-height: 40px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--muted) / 0.28);
  padding: 8px 10px;
}

.member-identity {
  min-width: 0;
  flex-wrap: wrap;
}

:global(.room-tabs-list) {
  justify-content: flex-start;
  gap: 6px;
  height: auto;
  border: 0;
  border-radius: 0;
  background: transparent;
  padding: 0;
}

:global(.room-tabs-list [data-state='active']) {
  box-shadow: none;
}

:global(.room-tab-content) {
  margin-top: 0;
  padding-top: 14px;
}

:global(.chat-tab-card) {
  overflow: hidden;
}

:global(.room-chat-panel.room-chat-panel) {
  grid-template-rows: auto auto;
  height: fit-content;
  max-height: min(72vh, 680px);
  padding-top: 16px;
}

.level-actions,
.selected-level-loading,
.selected-level-id-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.selected-level-preview,
.selected-level-summary {
  display: grid;
  gap: 12px;
}

.selected-level-preview {
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--muted) / 0.24);
  padding: 12px;
}

.selected-level-summary {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
}

.selected-level-summary > div:first-child {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.selected-level-name {
  overflow: hidden;
  color: hsl(var(--foreground));
  font-size: 1rem;
  font-weight: 800;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selected-level-name:hover {
  text-decoration: underline;
}

.selected-level-summary span {
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}

.selected-level-id-row {
  justify-content: flex-end;
}

.selected-level-id-row strong {
  font-size: 1.2rem;
}

.selected-level-video {
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--muted) / 0.35);
}

.selected-level-video iframe {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.message-list {
  min-height: 0;
  max-height: min(54vh, 520px);
  overflow: auto;
}

.message-row {
  display: grid;
  gap: 3px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  padding: 10px 12px;
}

.message-row strong {
  font-size: 12px;
}

.message-row span,
.empty-state {
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}

.message-row.system-message {
  background: hsl(var(--muted) / 0.35);
}

.chat-compose {
  align-items: stretch;
}

.chat-compose :global(textarea) {
  min-height: 48px;
}

.completion-toggle {
  justify-content: flex-start;
  gap: 4px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--muted) / 0.28);
  padding: 3px;
}

.completion-toggle button {
  flex: 1;
  min-height: 30px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  padding: 0 10px;
  font-size: 13px;
  font-weight: 650;
}

.completion-toggle button.active {
  background: hsl(var(--background));
  box-shadow: 0 0 0 1px hsl(var(--border));
}

.completion-toggle button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.field-hint {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}

.section-heading h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 750;
}

.section-heading a {
  color: hsl(var(--primary));
  font-weight: 700;
  text-decoration: none;
}

:global(.state-content),
:global(.auth-content) {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 180px;
}

:global(.auth-content) {
  justify-content: space-between;
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

@media (max-width: 920px) {
  .room-layout {
    grid-template-columns: 1fr;
  }

  .room-main {
    position: static;
  }

  :global(.room-chat-panel.room-chat-panel) {
    max-height: min(72vh, 680px);
  }
}

@media (max-width: 640px) {
  .room-page {
    width: min(100vw - 20px, 1120px);
    padding-top: 24px;
  }

  .room-topbar,
  .room-top-actions,
  .section-heading,
  .member-row,
  .chat-compose,
  .time-grid,
  :global(.auth-content) {
    align-items: stretch;
    flex-direction: column;
  }

  .time-grid {
    grid-template-columns: 1fr;
  }

  .edit-actions {
    justify-content: stretch;
    flex-direction: column;
  }

  .level-actions,
  .selected-level-summary,
  .selected-level-id-row {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
