<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import { user } from '$lib/client';
	import supabase from '$lib/client/supabase';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Alert from '$lib/components/ui/alert';
	import * as Card from '$lib/components/ui/card';
	import * as Drawer from '$lib/components/ui/drawer';
	import { isActive as isSupporterActive } from '$lib/client/isSupporterActive';
	import {
		acceptPvpMatch,
		getPvpMatchMessages,
		getPvpLevel,
		getPvpLevelRating,
		getPvpMatchAcceptanceExpiresMs,
		getPvpMatch,
		getPvpMatchEndMs,
		getPvpMatchId,
		getPvpMessageSenderIsAnonymous,
		getPvpOpponent,
		getPvpParticipants,
		getPvpParticipantIsAnonymous,
		getPvpParticipantPlayer,
		getPvpParticipantUid,
		getPvpProgress,
		getPvpResultReason,
		getPvpSelfParticipant,
		getPvpStatus,
		getPvpTimeReachedMs,
		getPvpVisibleParticipantRating,
		getPvpParticipantRatingDiff,
		getPvpWinnerUid,
		getTimeMs,
		hasPvpParticipantAccepted,
		isPvpMatchRanked,
		isActivePvpMatch,
		isPvpMatchConfirmedByBoth,
		resignPvpMatch,
		sendPvpInvite,
		sendPvpMatchMessage,
		type PvpMatch,
		type PvpMatchMessage,
		type PvpParticipant
	} from '$lib/client/pvp';
	import { setPvpRealtimeAuth, subscribeToPvpMatchDetail } from '$lib/client/pvpRealtime';
	import { playPvpBell } from '$lib/client/pvpSound';
	import { onDestroy, onMount, tick } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { _ } from 'svelte-i18n';
	import {
		ArrowLeft,
		Clock,
		ExternalLink,
		Eye,
		EyeOff,
		Flag,
		Gauge,
		Loader2,
		LogIn,
		MessageCircle,
		RefreshCw,
		Trophy,
		Copy,
		Send,
		UserRound,
		Volume2,
		VolumeX,
		X
	} from 'lucide-svelte';

	const PVP_GEODE_ALERT_DISMISSED_KEY = 'gdvn:pvp-geode-alert-dismissed';
	const PVP_HIDE_OPPONENT_INFO_KEY = 'gdvn:pvp-hide-opponent-info';
	const PVP_CHAT_MUTED_KEY = 'gdvn:pvp-chat-muted';
	const POST_MATCH_CHAT_GRACE_MS = 3 * 60 * 1000;
	const REALTIME_COALESCE_MS = 200;
	const MESSAGE_FETCH_LIMIT = 100;

	let match: PvpMatch | null = null;
	let loading = false;
	let initializedFor = '';
	let cleanupRealtime: (() => Promise<void>) | null = null;
	let scheduledRealtimeTasks = new Map<string, ReturnType<typeof setTimeout>>();
	let now = Date.now();
	let ticker: ReturnType<typeof setInterval> | null = null;
	let actionLoading = '';
	let endedBellPlayedFor: string | null = null;
	let showGeodeAlert = true;
	let messages: PvpMatchMessage[] = [];
	let chatDraft = '';
	let chatLoading = false;
	let desktopChatScrollEl: HTMLDivElement | null = null;
	let mobileChatScrollEl: HTMLDivElement | null = null;
	let mobileChatOpen = false;
	let hideOpponentInfo = false;
	let chatMuted = false;
	let preferencesReady = false;

	$: matchId = $page.params.id;
	$: currentUid = $user.data?.uid;
	$: status = getPvpStatus(match);
	$: level = getPvpLevel(match);
	$: levelConfirmed = isPvpMatchConfirmedByBoth(match);
	$: visibleLevel = levelConfirmed ? level : null;
	$: levelVideoId = getYouTubeVideoId(visibleLevel?.videoID);
	$: participants = getPvpParticipants(match);
	$: matchTitle = getMatchTitle(participants, hideOpponentInfo, currentUid);
	$: orderedParticipants = orderParticipants(participants, currentUid);
	$: winnerUid = getPvpWinnerUid(match);
	$: resultReason = getPvpResultReason(match);
	$: ranked = isPvpMatchRanked(match);
	$: levelRating = getPvpLevelRating(match);
	$: resultTitleText = resultTitle(
		match,
		status,
		winnerUid,
		participants,
		hideOpponentInfo,
		currentUid
	);
	$: remainingMs = Math.max(0, (getPvpMatchEndMs(match) ?? now) - now);
	$: endedMs = getTimeMs(match?.endedAt);
	$: postMatchChatRemainingMs = Math.max(
		0,
		(endedMs ? endedMs + POST_MATCH_CHAT_GRACE_MS : now) - now
	);
	$: acceptanceRemainingMs = Math.max(0, (getPvpMatchAcceptanceExpiresMs(match) ?? now) - now);
	$: isActive = isActivePvpMatch(match);
	$: selfParticipant = getPvpSelfParticipant(match, currentUid);
	$: selfAccepted = hasPvpParticipantAccepted(selfParticipant);
	$: rematchOpponent = getPvpOpponent(match, currentUid);
	$: rematchOpponentUid = getPvpParticipantUid(rematchOpponent);
	$: canRematch = Boolean(match && !isActive && selfParticipant && rematchOpponentUid);
	$: canResign =
		['in_progress', 'waiting_result'].includes(status) &&
		remainingMs > 0 &&
		Boolean(selfParticipant);
	$: chatOpenDuringMatch = ['in_progress', 'waiting_result'].includes(status) && remainingMs > 0;
	$: chatOpenAfterMatch = status === 'completed' && postMatchChatRemainingMs > 0;
	$: chatDisabled = !chatOpenDuringMatch && !chatOpenAfterMatch;
	$: chatInputDisabled = chatDisabled || chatMuted;
	$: chatDescription = chatMuted
		? $_('pvp.chat_muted_description')
		: chatDisabled
			? $_('pvp.chat_disabled')
			: chatOpenAfterMatch
				? $_('pvp.post_match_chat_closes', {
						values: { time: formatDuration(postMatchChatRemainingMs) }
					})
				: $_('pvp.chat_during_match');

	$: if (
		$user.checked &&
		$user.loggedIn &&
		matchId &&
		initializedFor !== `${currentUid}:${matchId}`
	) {
		initializeRealtime(matchId);
	}

	onMount(() => {
		showGeodeAlert = localStorage.getItem(PVP_GEODE_ALERT_DISMISSED_KEY) !== 'true';
		hideOpponentInfo = localStorage.getItem(PVP_HIDE_OPPONENT_INFO_KEY) === 'true';
		chatMuted = localStorage.getItem(PVP_CHAT_MUTED_KEY) === 'true';
		preferencesReady = true;

		ticker = setInterval(() => {
			now = Date.now();
		}, 1000);
	});

	$: if (preferencesReady) {
		localStorage.setItem(PVP_HIDE_OPPONENT_INFO_KEY, String(hideOpponentInfo));
		localStorage.setItem(PVP_CHAT_MUTED_KEY, String(chatMuted));
	}

	onDestroy(() => {
		if (ticker) clearInterval(ticker);
		cleanupRealtime?.();
		clearScheduledRealtimeTasks();
	});

	async function initializeRealtime(id: string) {
		initializedFor = `${currentUid}:${id}`;
		cleanupRealtime?.();

		try {
			const token = await $user.token();
			setPvpRealtimeAuth(token);
			await Promise.all([refreshMatch(), refreshMessages()]);

			cleanupRealtime = subscribeToPvpMatchDetail(id, async (event) => {
				if (event.scope === 'message') {
					scheduleRealtimeTask('messages', () => refreshMessages({ incremental: true }));
					return;
				}

				scheduleRealtimeTask('match', refreshMatch);
			});
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('pvp.toast.load_failed'));
		}
	}

	async function refreshMatch() {
		if (!$user.loggedIn || !matchId) return;

		loading = true;
		try {
			const previousMatch = match;
			const nextMatch = await getPvpMatch(await $user.token(), matchId);
			handleMatchSound(previousMatch, nextMatch);
			match = nextMatch;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('pvp.toast.load_failed'));
		} finally {
			loading = false;
		}
	}

	async function refreshMessages(options: { incremental?: boolean } = {}) {
		if (!$user.loggedIn || !matchId) return;

		chatLoading = true;
		try {
			const nextMessages = await getPvpMatchMessages(await $user.token(), matchId, {
				afterId: options.incremental ? latestMessageId() : null,
				limit: options.incremental ? MESSAGE_FETCH_LIMIT : null
			});
			if (options.incremental) {
				messages = mergeMessages(messages, nextMessages);
			} else {
				messages = nextMessages;
			}
			if (nextMessages.length) {
				await scrollChatToBottom();
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to load match chat');
		} finally {
			chatLoading = false;
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

	function messageId(message: PvpMatchMessage) {
		return message.id === undefined || message.id === null ? null : String(message.id);
	}

	function latestMessageId() {
		return messages.reduce<number | null>((latest, message) => {
			const id = Number(message.id);
			if (!Number.isInteger(id)) return latest;
			return latest === null || id > latest ? id : latest;
		}, null);
	}

	function mergeMessages(current: PvpMatchMessage[], incoming: PvpMatchMessage[]) {
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
				if (id) indexById.set(id, merged.length);
				merged.push(message);
			}
		}

		return merged.sort((a, b) => {
			const idA = Number(a.id);
			const idB = Number(b.id);
			if (Number.isInteger(idA) && Number.isInteger(idB)) return idA - idB;

			return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
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

	function handleMatchSound(previousMatch: PvpMatch | null, nextMatch: PvpMatch | null) {
		const id = getPvpMatchId(nextMatch);
		if (!id || endedBellPlayedFor === String(id)) return;

		const previousStatus = getPvpStatus(previousMatch, '');
		if (
			previousMatch &&
			previousStatus === 'in_progress' &&
			nextMatch &&
			!isActivePvpMatch(nextMatch)
		) {
			endedBellPlayedFor = String(id);
			playPvpBell();
		}
	}

	async function acceptMatch() {
		if (!matchId) return;

		actionLoading = 'accept-match';
		try {
			const response = await acceptPvpMatch(await $user.token(), matchId);
			match = response;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('pvp.toast.accept_match_failed'));
		} finally {
			actionLoading = '';
		}
	}

	async function resignMatch() {
		if (!matchId || !canResign || actionLoading) return;
		if (!confirm($_('pvp.resign_confirm'))) return;

		actionLoading = 'resign-match';
		try {
			const response = await resignPvpMatch(await $user.token(), matchId);
			match = response;
			await refreshMessages({ incremental: true });
			toast.success($_('pvp.toast.resign_success'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('pvp.toast.resign_failed'));
		} finally {
			actionLoading = '';
		}
	}

	async function requestRematch() {
		if (!match || actionLoading) return;

		const inviteeUid = String(rematchOpponentUid || '');

		if (!inviteeUid) {
			toast.error($_('pvp.toast.rematch_failed'));
			return;
		}

		actionLoading = 'rematch';
		try {
			await sendPvpInvite(await $user.token(), {
				inviteeUid,
				anonymous: getPvpParticipantIsAnonymous(selfParticipant)
			});
			toast.success($_('pvp.toast.rematch_sent'));
			await goto('/pvp');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('pvp.toast.rematch_failed'));
		} finally {
			actionLoading = '';
		}
	}

	async function sendChatMessage() {
		if (!matchId || chatInputDisabled || actionLoading === 'send-chat') return;

		const content = chatDraft.trim();
		if (!content) return;

		actionLoading = 'send-chat';
		try {
			const message = await sendPvpMatchMessage(await $user.token(), matchId, content);
			chatDraft = '';
			messages = mergeMessages(messages, [message]);
			await scrollChatToBottom();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to send message');
		} finally {
			actionLoading = '';
		}
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

	function statusLabel(value: unknown) {
		const key = String(value || 'pending');
		return $_(`pvp.status.${key}`);
	}

	function resultReasonLabel(value: unknown) {
		const key = String(value || '').trim();
		if (!key) return '';

		const label = $_(`pvp.result_reason.${key}`);
		return label === `pvp.result_reason.${key}` ? key : label;
	}

	function formatDuration(ms: number | null) {
		if (ms === null) return '--:--';

		const totalSeconds = Math.max(0, Math.floor(ms / 1000));
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;

		return `${minutes}:${String(seconds).padStart(2, '0')}`;
	}

	function getYouTubeVideoId(value: unknown) {
		const raw = String(value || '').trim();
		if (!raw) return null;
		if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;

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
		if (!currentMatch) return $_('pvp.match_loading');
		if (currentStatus === 'completed') {
			if (!currentWinnerUid) return $_('pvp.result.draw');
			return $_('pvp.winner_named', {
				values: { name: winnerName(currentWinnerUid, items, hideInfo, viewerUid) }
			});
		}
		if (currentStatus === 'cancelled') return $_('pvp.result.cancelled');
		if (currentStatus === 'disputed') return $_('pvp.result.disputed');
		if (currentStatus === 'pending') return $_('pvp.match_found_title');
		return $_('pvp.timer_active');
	}

	function participantName(
		participant: PvpParticipant | null | undefined,
		hideInfo: boolean = hideOpponentInfo,
		viewerUid: string | null | undefined = currentUid
	) {
		if (participantIsAnonymousToViewer(participant, viewerUid)) return $_('pvp.anonymous_player');
		if (shouldHideParticipantInfo(participant, hideInfo, viewerUid))
			return $_('pvp.hidden_opponent');

		const player = getPvpParticipantPlayer(participant);
		return player?.name || getPvpParticipantUid(participant) || '--';
	}

	function participantIsAnonymousToViewer(
		participant: PvpParticipant | null | undefined,
		viewerUid: string | null | undefined = currentUid
	) {
		const uid = getPvpParticipantUid(participant);
		return Boolean(getPvpParticipantIsAnonymous(participant) && (!uid || uid !== viewerUid));
	}

	function shouldHideParticipantInfo(
		participant: PvpParticipant | null | undefined,
		hideInfo: boolean = hideOpponentInfo,
		viewerUid: string | null | undefined = currentUid
	) {
		const uid = getPvpParticipantUid(participant);
		return Boolean(hideInfo && uid && uid !== viewerUid);
	}

	function shouldMaskParticipant(
		participant: PvpParticipant | null | undefined,
		hideInfo: boolean = hideOpponentInfo,
		viewerUid: string | null | undefined = currentUid
	) {
		return (
			participantIsAnonymousToViewer(participant, viewerUid) ||
			shouldHideParticipantInfo(participant, hideInfo, viewerUid)
		);
	}

	function participantTitleName(
		participant: PvpParticipant | null | undefined,
		hideInfo: boolean = hideOpponentInfo,
		viewerUid: string | null | undefined = currentUid
	) {
		if (!participant) return $_('pvp.waiting_opponent');
		return participantName(participant, hideInfo, viewerUid);
	}

	function getMatchTitle(
		items: PvpParticipant[],
		hideInfo: boolean = hideOpponentInfo,
		viewerUid: string | null | undefined = currentUid
	) {
		if (items.length === 0) return $_('pvp.match_loading');
		return `${participantTitleName(items[0], hideInfo, viewerUid)} vs ${participantTitleName(
			items[1],
			hideInfo,
			viewerUid
		)}`;
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
		return winner ? participantName(winner, hideInfo, viewerUid) : currentWinnerUid || '--';
	}

	function orderParticipants(items: PvpParticipant[], uid: string | null | undefined) {
		if (!uid) return items;
		const selfIndex = items.findIndex((participant) => getPvpParticipantUid(participant) === uid);
		if (selfIndex <= 0) return items;

		return [items[selfIndex], ...items.slice(0, selfIndex), ...items.slice(selfIndex + 1)];
	}

	function participantLabel(
		participant: PvpParticipant,
		viewerUid: string | null | undefined = currentUid
	) {
		return getPvpParticipantUid(participant) === viewerUid ? $_('pvp.you') : $_('pvp.rival');
	}

	function messageSenderName(
		message: PvpMatchMessage,
		hideInfo: boolean = hideOpponentInfo,
		viewerUid: string | null | undefined = currentUid,
		items: PvpParticipant[] = participants,
		senderUid: string | null | undefined = messageSenderUid(message)
	) {
		if (message.type === 'system') return 'Arena';
		if (senderUid === viewerUid) return $_('pvp.you');
		if (
			getPvpMessageSenderIsAnonymous(message) ||
			messageSenderParticipantIsAnonymous(message, items, senderUid)
		) {
			return $_('pvp.anonymous_player');
		}
		if (hideInfo && (!senderUid || senderUid !== viewerUid)) {
			return $_('pvp.hidden_opponent');
		}
		return message.sender?.name || message.player?.name || senderUid || $_('pvp.rival');
	}

	function messageSenderUid(message: PvpMatchMessage) {
		return message.senderUid || message.sender?.uid || message.player?.uid || null;
	}

	function messageSenderParticipantIsAnonymous(
		message: PvpMatchMessage,
		items: PvpParticipant[] = participants,
		senderUid: string | null | undefined = messageSenderUid(message)
	) {
		if (!senderUid) return false;

		const participant = items.find((item) => getPvpParticipantUid(item) === senderUid);
		return getPvpParticipantIsAnonymous(participant);
	}

	function messageTime(message: PvpMatchMessage) {
		const ms = message.created_at ? new Date(message.created_at).getTime() : NaN;
		if (!Number.isFinite(ms)) return '';

		return new Intl.DateTimeFormat(undefined, {
			hour: '2-digit',
			minute: '2-digit'
		}).format(new Date(ms));
	}

	function participantResult(
		participant: PvpParticipant,
		currentStatus: string = status,
		currentWinnerUid: string | null | undefined = winnerUid
	) {
		if (currentStatus !== 'completed') return null;
		if (!currentWinnerUid) return $_('pvp.result.draw');
		return getPvpParticipantUid(participant) === currentWinnerUid ? $_('pvp.winner') : null;
	}

	function participantRatingLabel(participant: PvpParticipant | null | undefined) {
		if (shouldMaskParticipant(participant)) return null;

		const rating = getPvpVisibleParticipantRating(participant);
		return rating === null ? null : Math.round(rating);
	}

	function participantRatingDiffLabel(participant: PvpParticipant | null | undefined) {
		const diff = getPvpParticipantRatingDiff(participant);
		if (diff === null) return null;
		return `${diff > 0 ? '+' : ''}${Math.round(diff)}`;
	}

	function participantAvatarUrl(player: any) {
		if (!player?.uid) return '';

		const extension =
			isSupporterActive(player.supporterUntil) && player.isAvatarGif ? 'gif' : 'jpg';
		return `https://cdn.gdvn.net/avatars/${player.uid}.${extension}?version=${player.avatarVersion}`;
	}

	function participantAvatarFallback(player: any) {
		const name = String(player?.name || '').trim();
		return name ? name[0].toUpperCase() : '?';
	}

	function chatPlaceholder() {
		if (chatMuted) return $_('pvp.chat_muted_placeholder');
		return chatDisabled ? $_('pvp.chat_closed_placeholder') : $_('pvp.chat_placeholder');
	}

	function dismissGeodeAlert() {
		showGeodeAlert = false;
		localStorage.setItem(PVP_GEODE_ALERT_DISMISSED_KEY, 'true');
	}

	async function copyLevelId() {
		const id = String(visibleLevel?.id ?? (levelConfirmed ? match?.levelId : '') ?? '');
		if (!id) return;
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
</script>

<svelte:head>
	<title>{matchTitle} - {$_('head.site_name')}</title>
</svelte:head>

<main class="match-page">
	{#if showGeodeAlert}
		<Alert.Root
			class="relative mb-4 border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/40"
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
				class="alert-dismiss"
				on:click={dismissGeodeAlert}
				aria-label={$_('pvp.geode_alert.dismiss')}
			>
				<X class="h-4 w-4" />
			</button>
		</Alert.Root>
	{/if}

	<section class="match-topbar">
		<div>
			<a class="back-link" href="/pvp">
				<ArrowLeft class="h-4 w-4" />
				{$_('pvp.matches_title')}
			</a>
			<h1>{matchTitle}</h1>
		</div>

		{#if $user.loggedIn}
			<div class="topbar-actions">
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
				{#if canRematch}
					<Button disabled={Boolean(actionLoading) || loading} on:click={requestRematch}>
						{#if actionLoading === 'rematch'}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						{:else}
							<Send class="mr-2 h-4 w-4" />
						{/if}
						{$_('pvp.rematch')}
					</Button>
				{/if}
				{#if canResign}
					<Button
						variant="destructive"
						disabled={Boolean(actionLoading) || loading}
						on:click={resignMatch}
					>
						{#if actionLoading === 'resign-match'}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						{:else}
							<Flag class="mr-2 h-4 w-4" />
						{/if}
						{$_('pvp.resign')}
					</Button>
				{/if}
				<Button variant="outline" disabled={loading} on:click={refreshMatch}>
					<RefreshCw class={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
					{$_('pvp.refresh')}
				</Button>
			</div>
		{/if}
	</section>

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
									<Badge variant={isActive ? 'default' : 'secondary'}>{statusLabel(status)}</Badge>
									{#if levelRating !== null}
										<Badge variant="outline">
											{$_('pvp.level_rating', { values: { rating: levelRating } })}
										</Badge>
									{/if}
								</div>
							</div>
						</Card.Header>
						<Card.Content class="match-progress-content">
							<div class="timer-display">
								{#if status === 'completed'}
									<Trophy class="h-5 w-5" />
								{:else}
									<Clock class="h-5 w-5" />
								{/if}
								<strong>
									{#if status === 'pending'}
										{formatDuration(acceptanceRemainingMs)}
									{:else}
										{isActive ? formatDuration(remainingMs) : statusLabel(status)}
									{/if}
								</strong>
							</div>

							{#if orderedParticipants.length === 0}
								<div class="empty-state">{$_('pvp.waiting_opponent')}</div>
							{:else}
								<div class="side-grid">
									{#each orderedParticipants as participant, index}
										{@const participantPlayer = getPvpParticipantPlayer(participant)}
										{@const participantMasked = shouldMaskParticipant(
											participant,
											hideOpponentInfo,
											currentUid
										)}
										{@const participantDisplayName = participantName(
											participant,
											hideOpponentInfo,
											currentUid
										)}
										{@const participantResultLabel = participantResult(
											participant,
											status,
											winnerUid
										)}
										{@const participantRating = participantRatingLabel(participant)}
										{@const participantRatingDiff = participantRatingDiffLabel(participant)}
										<div
											class:left-side={index === 0}
											class:right-side={index === 1}
											class:winner={winnerUid && getPvpParticipantUid(participant) === winnerUid}
											class="participant-card"
										>
											<div class="participant-topline">
												<Badge
													variant={getPvpParticipantUid(participant) === currentUid
														? 'default'
														: 'outline'}
												>
													{participantLabel(participant, currentUid)}
												</Badge>
												{#if participantResultLabel}
													<Badge variant="secondary">{participantResultLabel}</Badge>
												{/if}
											</div>

											<div class="participant-identity">
												<Avatar.Root class="participant-avatar">
													{#if !participantMasked && participantPlayer?.uid}
														<Avatar.Image
															src={participantAvatarUrl(participantPlayer)}
															alt={participantPlayer.name || participantDisplayName}
														/>
														<Avatar.Fallback>
															{participantAvatarFallback(participantPlayer)}
														</Avatar.Fallback>
													{:else}
														<Avatar.Fallback class="participant-avatar-placeholder">
															<UserRound class="h-5 w-5" />
														</Avatar.Fallback>
													{/if}
												</Avatar.Root>
												<div class="participant-name">
													{#if !participantMasked && participantPlayer?.uid}
														<PlayerLink player={participantPlayer} truncate={26} />
													{:else}
														<strong>{participantDisplayName}</strong>
													{/if}
													{#if participantRating !== null}
														<span class="participant-rating">
															{$_('pvp.pvp_rating_short', { values: { rating: participantRating } })}
															{#if ranked && participantRatingDiff}
																<strong
																	class:positive={Number(getPvpParticipantRatingDiff(participant)) > 0}
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
													<span>{getPvpProgress(participant)}%</span>
													<span>
														<Gauge class="h-3.5 w-3.5" />
														{formatDuration(getPvpTimeReachedMs(participant))}
													</span>
												</div>
												<div class="progress-track">
													<div
														class="progress-bar"
														style={`width: ${Math.min(100, getPvpProgress(participant))}%;`}
													/>
												</div>
											</div>
										</div>
									{/each}
								</div>
							{/if}

							{#if status === 'pending'}
								<div class="acceptance-panel">
									<p>{$_('pvp.match_found_hint')}</p>
									{#if selfAccepted}
										<Button disabled class="w-full">
											<Loader2 class="mr-2 h-4 w-4 animate-spin" />
											{$_('pvp.waiting_for_acceptance')}
										</Button>
									{:else}
										<Button disabled={Boolean(actionLoading)} class="w-full" on:click={acceptMatch}>
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

				<section class="detail-grid">
					<Card.Root>
						<Card.Header>
							<Card.Title>{$_('pvp.challenge_level')}</Card.Title>
						</Card.Header>
						<Card.Content class="level-content">
							{#if visibleLevel}
								<div>
									<h2>{visibleLevel.name || `#${visibleLevel.id || match.levelId}`}</h2>
									<p>
										{#if visibleLevel.creator || visibleLevel.author}
											{$_('head.labels.by')} {visibleLevel.creator || visibleLevel.author}
										{:else}
											{$_('pvp.level_pending')}
										{/if}
									</p>
								</div>
								<div class="level-meta">
									{#if levelRating !== null}
										<Badge variant="secondary">
											{$_('pvp.level_rating', { values: { rating: levelRating } })}
										</Badge>
									{/if}
									{#if visibleLevel.difficulty}
										<Badge variant="outline">{visibleLevel.difficulty}</Badge>
									{/if}
									{#if visibleLevel.id || match.levelId}
										<a class="level-link" href={`/level/${visibleLevel.id || match.levelId}`}>
											{$_('pvp.open_level')}
											<ExternalLink class="h-4 w-4" />
										</a>
										<div class="level-id">
											<span class="id-label">ID: {visibleLevel.id ?? match.levelId}</span>
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
				</section>
			</div>

			<aside class="desktop-chat-panel">
				<Card.Root class="desktop-chat-card">
					<Card.Header>
						<div class="chat-header">
							<div>
								<Card.Title>{$_('pvp.match_chat')}</Card.Title>
								<Card.Description>{chatDescription}</Card.Description>
							</div>
							<div class="chat-actions">
								{#if chatLoading}
									<Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
								{/if}
								<Button variant="outline" size="sm" on:click={() => (chatMuted = !chatMuted)}>
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
					</Card.Header>
					<Card.Content class="chat-content">
						<div class="chat-messages" bind:this={desktopChatScrollEl}>
							{#if chatMuted}
								<div class="empty-state">{$_('pvp.chat_muted_state')}</div>
							{:else if messages.length === 0}
								<div class="empty-state">{$_('pvp.no_messages')}</div>
							{:else}
								{#each messages as message}
									{@const senderUid = messageSenderUid(message)}
									{@const senderName = messageSenderName(
										message,
										hideOpponentInfo,
										currentUid,
										participants,
										senderUid
									)}
									<div
										class:own-message={senderUid === currentUid}
										class:system-message={message.type === 'system'}
										class="chat-message"
									>
										<div class="chat-message-meta">
											<strong>{senderName}</strong>
											<span>{messageTime(message)}</span>
										</div>
										<p>{message.content}</p>
									</div>
								{/each}
							{/if}
						</div>

						<form class="chat-form" on:submit|preventDefault={sendChatMessage}>
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
					</Card.Content>
				</Card.Root>
			</aside>
		</div>

		<Drawer.Root bind:open={mobileChatOpen}>
			<Drawer.Trigger asChild let:builder>
				<Button builders={[builder]} class="mobile-chat-trigger" type="button">
					<MessageCircle class="h-4 w-4" />
					{$_('pvp.match_chat')}
				</Button>
			</Drawer.Trigger>
			<Drawer.Content class="mobile-chat-drawer">
				<Drawer.Header>
					<div class="chat-header">
						<div>
							<Drawer.Title>{$_('pvp.match_chat')}</Drawer.Title>
							<Drawer.Description>{chatDescription}</Drawer.Description>
						</div>
						<div class="chat-actions">
							{#if chatLoading}
								<Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
							{/if}
							<Button variant="outline" size="sm" on:click={() => (chatMuted = !chatMuted)}>
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
				</Drawer.Header>
				<div class="mobile-chat-body">
					<div class="chat-messages" bind:this={mobileChatScrollEl}>
						{#if chatMuted}
							<div class="empty-state">{$_('pvp.chat_muted_state')}</div>
						{:else if messages.length === 0}
							<div class="empty-state">{$_('pvp.no_messages')}</div>
						{:else}
							{#each messages as message}
								{@const senderUid = messageSenderUid(message)}
								{@const senderName = messageSenderName(
									message,
									hideOpponentInfo,
									currentUid,
									participants,
									senderUid
								)}
								<div
									class:own-message={senderUid === currentUid}
									class:system-message={message.type === 'system'}
									class="chat-message"
								>
									<div class="chat-message-meta">
										<strong>{senderName}</strong>
										<span>{messageTime(message)}</span>
									</div>
									<p>{message.content}</p>
								</div>
							{/each}
						{/if}
					</div>

					<form class="chat-form" on:submit|preventDefault={sendChatMessage}>
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
			</Drawer.Content>
		</Drawer.Root>
	{:else}
		<Card.Root>
			<Card.Content class="state-content">{$_('pvp.match_not_found')}</Card.Content>
		</Card.Root>
	{/if}
</main>

<style>
	.match-page {
		width: min(1440px, calc(100vw - 32px));
		margin: 0 auto;
		padding: 36px 0 64px;
	}

	.match-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: 18px;
		align-items: start;
	}

	.match-main-column {
		min-width: 0;
	}

	.match-topbar,
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

	.match-topbar,
	:global(.auth-content) {
		justify-content: space-between;
		gap: 16px;
	}

	.match-topbar {
		margin-bottom: 24px;
	}

	.topbar-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 10px;
	}

	h1 {
		margin: 6px 0 0;
		font-size: clamp(2rem, 4vw, 3.25rem);
		font-weight: 800;
		letter-spacing: 0;
	}

	.back-link,
	.level-link {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		color: hsl(var(--primary));
		font-size: 14px;
		font-weight: 700;
		text-decoration: none;
	}

	.back-link:hover,
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

	.side-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 14px;
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

	.participant-card.winner {
		border-color: hsl(var(--primary));
		background: hsl(var(--primary) / 0.08);
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

	:global(.participant-avatar) {
		width: 44px;
		height: 44px;
		border: 1px solid hsl(var(--border));
	}

	:global(.participant-avatar img) {
		object-fit: cover;
	}

	:global(.participant-avatar-placeholder) {
		background: hsl(var(--muted));
		color: hsl(var(--muted-foreground));
	}

	.participant-name {
		display: grid;
		gap: 3px;
		min-width: 0;
		min-height: 32px;
	}

	.participant-rating {
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

	.mobile-chat-body {
		display: grid;
		flex: 1;
		gap: 12px;
		grid-template-rows: minmax(0, 1fr) auto;
		min-height: 0;
		overflow: hidden;
		padding: 0 16px 16px;
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

		.desktop-chat-panel {
			display: none;
		}

		.side-grid {
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

		.match-topbar,
		:global(.auth-content),
		.match-panel-header,
		.chat-header {
			align-items: stretch;
			flex-direction: column;
		}

		.topbar-actions {
			justify-content: stretch;
		}

		.topbar-actions :global(button) {
			width: 100%;
		}

		.result-line {
			justify-content: flex-start;
		}

		.chat-message {
			max-width: 92%;
		}
	}
</style>
