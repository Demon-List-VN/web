<script lang="ts">
	import { browser } from '$app/environment';
	import { onDestroy, tick } from 'svelte';
	import { get } from 'svelte/store';
	import {
		Ban,
		Clock,
		ChevronLeft,
		Eye,
		EyeOff,
		Inbox,
		Loader2,
		MessageCircle,
		RefreshCw,
		Search,
		Send,
		Swords,
		UserCheck,
		UserPlus,
		UserRound,
		Users
	} from 'lucide-svelte';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { user } from '$lib/client';
	import { isActive } from '$lib/client/isSupporterActive';
	import { sendPvpInvite } from '$lib/client/pvp';
	import {
		blockSocialPlayer,
		createSocialConversation,
		getSocialPresenceSettings,
		searchSocialPlayers,
		sendFriendRequest,
		sendSocialMessage,
		updateSocialPresenceSettings,
		type SocialConversation,
		type SocialMessage,
		type SocialPlayer,
		type SocialStatus
	} from '$lib/client/social';
	import {
		appendCachedMessages,
		conversationsStore,
		ensureConversationMessages,
		friendsStore,
		getConversationMessageStore,
		hydrateConversationMessages,
		hydrateSocialCache,
		markCachedConversationRead,
		refreshSocialConversations,
		refreshSocialFriends,
		removeConversationsWithPlayerFromCache,
		removeFriendFromCache,
		replaceCachedMessage,
		resetSocialCacheState,
		setSocialCacheUser,
		socialConversationsLoadState,
		socialFriendsLoadState,
		syncCachedConversationNewMessages,
		updateCachedMessage,
		updateCachedConversationWithMessage,
		upsertCachedConversation
	} from '$lib/client/socialCache';
	import {
		socialPresenceVisible,
		subscribeToSocialPresence,
		type AggregatedSocialPresence
	} from '$lib/client/socialPresence';
	import { locale } from 'svelte-i18n';
	import { toast } from 'svelte-sonner';

	export let pageMode = false;
	export let initialTab = 'friends';
	export let messageTargetUid = '';

	let activeTab = 'friends';
	let friends: SocialPlayer[] = [];
	let conversations: SocialConversation[] = [];
	let selectedConversation: SocialConversation | null = null;
	let messages: SocialMessage[] = [];
	let friendQuery = '';
	let messageQuery = '';
	let friendResults: SocialPlayer[] = [];
	let messageResults: SocialPlayer[] = [];
	let messageDraft = '';
	let loadingFriends = false;
	let loadingConversations = false;
	let loadingMessages = false;
	let actionLoading = '';
	let friendSearchTimer: ReturnType<typeof setTimeout> | null = null;
	let messageSearchTimer: ReturnType<typeof setTimeout> | null = null;
	let pendingConversationFocusId: string | null = null;
	let initializedSocialUid = '';
	let visibleOnline = true;
	let presenceByUid: Record<string, AggregatedSocialPresence> = {};
	let presenceWatchKey = '';
	let cleanupPresence: (() => Promise<unknown>) | null = null;
	let activeMessageUnsubscribe: (() => void) | null = null;
	let readMarkTimer: ReturnType<typeof setTimeout> | null = null;
	let lastMarkedReadKey = '';
	let messageListElement: HTMLDivElement | null = null;
	let lastScrolledMessageKey = '';
	let handledMessageTargetUid = '';

	const unsubscribeFriends = friendsStore.subscribe((value) => {
		friends = value;
	});
	const unsubscribeConversations = conversationsStore.subscribe((value) => {
		conversations = value;

		if (pendingConversationFocusId) {
			const focused = value.find(
				(conversation) =>
					String(conversation.id) === pendingConversationFocusId
			);

			if (focused) {
				selectedConversation = focused;
			}

			pendingConversationFocusId = null;
		}

		if (
			selectedConversation
			&& !String(selectedConversation.id)
				.startsWith('pending-')
			&& !value.some((conversation) =>
				String(conversation.id) === String(selectedConversation?.id)
			)
		) {
			clearSelectedConversation();
		}
	});

	$: activeConversations = conversations.filter(
		(conversation) => conversation.conversationStatus === 'active'
	);
	$: pendingConversations = conversations.filter(
		(conversation) => conversation.conversationStatus !== 'active'
	);
	$: unreadMessageCount = conversations.reduce(
		(total, conversation) =>
			total + Math.max(0, Number(conversation.unreadCount || 0)),
		0
	);
	$: if (pageMode) {
		loadingFriends = ['idle', 'loading'].includes($socialFriendsLoadState);
		loadingConversations = ['idle', 'loading'].includes($socialConversationsLoadState);
	}
	$: watchSocialPresence(pageMode
		? [
			...friends.map((friend) => friend.uid),
			...friendResults.map((player) => player.uid),
			...messageResults.map((player) => player.uid)
		]
		: []);
	$: if (browser && $user.checked && !pageMode) {
		const uid = $user.loggedIn ? ($user.data?.uid ?? '') : '';

		if (uid !== initializedSocialUid) {
			initializedSocialUid = uid;

			if (uid) {
				initializeSocialCache(uid);
			} else {
				resetSocialCacheState();
				clearSelectedConversation();
			}
		}
	}
	$: if (pageMode && ['friends', 'conversations'].includes(initialTab)) {
		activeTab = initialTab;
	}
	$: if (!messageTargetUid) {
		handledMessageTargetUid = '';
	}
	$: if (
		pageMode
		&& messageTargetUid
		&& messageTargetUid !== handledMessageTargetUid
		&& $user.loggedIn
	) {
		const targetPlayer = friends.find((player) => player.uid === messageTargetUid);

		if (targetPlayer) {
			handledMessageTargetUid = messageTargetUid;
			void startMessage(targetPlayer);
		}
	}

	function text(en: string, vi: string) {
		return $locale === 'vi' ? vi : en;
	}

	function playerAvatar(player: SocialPlayer) {
		return `https://cdn.gdlisthub.dev/avatars/${player.uid}${
			isActive(player.supporterUntil ?? null) && player.isAvatarGif
				? '.gif'
				: '.jpg'
		}?version=${player.avatarVersion || 0}`;
	}

	function statusLabel(status?: SocialStatus | string) {
		switch (status) {
			case 'friend':
				return text('Friend', 'Bạn bè');
			case 'outgoing_pending':
				return text('Request sent', 'Đã gửi lời mời');
			case 'incoming_pending':
				return text('Requested you', 'Đã mời bạn');
			case 'blocked_by_me':
				return text('Blocked', 'Đã chặn');
			case 'blocked_me':
				return text('Unavailable', 'Không khả dụng');
			case 'self':
				return text('You', 'Bạn');
			default:
				return '';
		}
	}

	function playerPresence(player: SocialPlayer) {
		return presenceByUid[player.uid] ?? null;
	}

	function isPlayerOnline(player: SocialPlayer | null | undefined) {
		return Boolean(
			player
			&& player.socialActivity?.presenceVisible !== false
			&& playerPresence(player)?.online
		);
	}

	function playerActivityLabel(player: SocialPlayer) {
		if (
			player.socialActivity?.presenceVisible !== false
			&& player.socialActivity?.activity?.type === 'pvp_match'
			&& playerPresence(player)?.online
		) {
			return text('In match', 'Đang trong trận');
		}

		return statusLabel(player.socialStatus);
	}

	function canSpectate(player: SocialPlayer) {
		return player.socialStatus === 'friend'
			&& Boolean(player.socialActivity?.canSpectate)
			&& player.socialActivity?.presenceVisible !== false
			&& Boolean(player.socialActivity?.activity?.matchId)
			&& Boolean(playerPresence(player)?.online);
	}

	function spectateUrl(player: SocialPlayer) {
		return `/versus/matches/${player.socialActivity?.activity?.matchId}?spectate=1`;
	}

	function watchSocialPresence(players: string[]) {
		const nextKey = [...new Set(players.filter(Boolean))]
			.sort()
			.join(',');

		if (nextKey === presenceWatchKey) {
			return;
		}

		presenceWatchKey = nextKey;
		cleanupPresence?.();
		cleanupPresence = null;
		presenceByUid = {};

		if (!nextKey) {
			return;
		}

		cleanupPresence = subscribeToSocialPresence(nextKey.split(','), (value) => {
			presenceByUid = value;
		});
	}

	function formatMessageTime(value?: string | null) {
		const date = value ? new Date(value) : new Date();

		if (!Number.isFinite(date.getTime())) {
			return '';
		}

		return date.toLocaleTimeString('en-GB', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});
	}

	function createLocalMessageId() {
		return `local-${Date.now()}-${Math.random()
			.toString(36)
			.slice(2)}`;
	}

	function isServerMessage(message: SocialMessage | null | undefined) {
		return (
			Boolean(message)
			&& message?.status !== 'pending'
			&& message?.status !== 'failed'
			&& !String(message?.id)
				.startsWith('local-')
		);
	}

	function latestServerMessage(items: SocialMessage[]) {
		return [...items].reverse()
			.find(isServerMessage) || null;
	}

	async function scrollMessagesToBottom() {
		if (!browser) {
			return;
		}

		await tick();
		requestAnimationFrame(() => {
			if (!messageListElement) {
				return;
			}

			messageListElement.scrollTop = messageListElement.scrollHeight;
		});
	}

	function maybeScrollMessagesToBottom(
		conversationId: number | string,
		value: SocialMessage[],
		force = false
	) {
		const latest = value[value.length - 1];
		const key = `${conversationId}:${latest?.id ?? 'empty'}:${value.length}`;

		if (!force && key === lastScrolledMessageKey) {
			return;
		}

		lastScrolledMessageKey = key;
		void scrollMessagesToBottom();
	}

	function canAddFriend(player: SocialPlayer) {
		return ![
			'self',
			'friend',
			'outgoing_pending',
			'blocked_by_me',
			'blocked_me'
		].includes(
			String(player.socialStatus || 'none')
		);
	}

	async function token() {
		return $user.token();
	}

	async function initializeSocialCache(uid: string) {
		setSocialCacheUser(uid);
		loadingFriends = true;
		loadingConversations = true;

		try {
			await hydrateSocialCache(uid);
		} catch (error) {
			console.warn('Failed to hydrate social cache', error);
		} finally {
			loadingFriends = get(friendsStore).length === 0;
			loadingConversations = get(conversationsStore).length === 0;
		}

		try {
			const tokenValue = await token();
			const settings = await getSocialPresenceSettings(tokenValue);
			visibleOnline = settings.socialPresenceVisible !== false;
			socialPresenceVisible.set(visibleOnline);
			const [, refreshedConversations] = await Promise.all([
				refreshSocialFriends(uid, tokenValue),
				refreshSocialConversations(uid, tokenValue)
			]);
			await syncCachedConversationNewMessages(
				uid,
				tokenValue,
				refreshedConversations
			);
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: text(
						'Failed to refresh social cache',
						'Không làm mới được dữ liệu xã hội'
					)
			);
		} finally {
			loadingFriends = false;
			loadingConversations = false;
		}
	}

	async function togglePresenceVisible() {
		if (actionLoading || !$user.loggedIn) {
			return;
		}

		const nextVisible = !visibleOnline;
		actionLoading = 'presence-visible';

		try {
			const settings = await updateSocialPresenceSettings(
				await token(),
				nextVisible
			);
			visibleOnline = settings.socialPresenceVisible !== false;
			socialPresenceVisible.set(visibleOnline);
			user.update((current) => ({
				...current,
				data: {
					...current.data,
					socialPresenceVisible: visibleOnline
				}
			}));
			toast.success(
				visibleOnline
					? text('You are visible online', 'Bạn đang hiện online')
					: text('You are invisible', 'Bạn đang ẩn')
			);
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: text('Failed to update visibility', 'Không cập nhật được trạng thái')
			);
		} finally {
			actionLoading = '';
		}
	}

	async function refreshAll() {
		if (!$user.loggedIn || !$user.data?.uid) {
			return;
		}

		const tokenValue = await token();
		await Promise.all([
			refreshSocialFriends($user.data.uid, tokenValue),
			refreshSocialConversations($user.data.uid, tokenValue)
		]);
	}

	function scheduleFriendSearch() {
		if (friendSearchTimer) {
			clearTimeout(friendSearchTimer);
		}

		friendSearchTimer = setTimeout(searchFriends, 250);
	}

	function scheduleMessageSearch() {
		if (messageSearchTimer) {
			clearTimeout(messageSearchTimer);
		}

		messageSearchTimer = setTimeout(searchMessagePlayers, 250);
	}

	async function searchFriends() {
		const query = friendQuery.trim();

		if (query.length < 2) {
			friendResults = [];

			return;
		}

		try {
			friendResults = await searchSocialPlayers(await token(), query);
		} catch {
			friendResults = [];
		}
	}

	async function searchMessagePlayers() {
		const query = messageQuery.trim();

		if (query.length < 2) {
			messageResults = [];

			return;
		}

		try {
			messageResults = await searchSocialPlayers(await token(), query);
		} catch {
			messageResults = [];
		}
	}

	function updatePlayerStatus(uid: string, status: SocialStatus) {
		const update = (player: SocialPlayer) =>
			player.uid === uid ? { ...player, socialStatus: status } : player;
		friendResults = friendResults.map(update);
		messageResults = messageResults.map(update);
		friends = friends.map(update);
	}

	async function addFriend(player: SocialPlayer) {
		if (!canAddFriend(player) || actionLoading) {
			return;
		}

		actionLoading = `friend-${player.uid}`;

		try {
			await sendFriendRequest(await token(), player.uid);
			updatePlayerStatus(player.uid, 'outgoing_pending');
			toast.success(text('Friend request sent', 'Đã gửi lời mời kết bạn'));
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: text('Failed to send request', 'Không gửi được lời mời')
			);
		} finally {
			actionLoading = '';
		}
	}

	async function invitePlayer(player: SocialPlayer) {
		if (actionLoading || player.uid === $user.data?.uid) {
			return;
		}

		actionLoading = `invite-${player.uid}`;

		try {
			await sendPvpInvite(await token(), { inviteeUid: player.uid });
			toast.success(text('1v1 invite sent', 'Đã gửi lời mời 1v1'));
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: text('Failed to invite', 'Không gửi được lời mời')
			);
		} finally {
			actionLoading = '';
		}
	}

	function inviteSelectedConversationPlayer() {
		const player = selectedConversation?.otherPlayer;

		if (player) {
			void invitePlayer(player);
		}
	}

	async function startMessage(player: SocialPlayer, event?: Event) {
		event?.preventDefault();
		event?.stopPropagation();

		if (actionLoading || player.uid === $user.data?.uid) {
			return;
		}

		activeTab = 'conversations';
		messageQuery = '';
		messageResults = [];
		const cachedConversation = conversations.find((conversation) => {
			if (conversation.otherPlayer?.uid === player.uid) {
				return true;
			}

			return conversation.participants?.some((participant) =>
				participant.uid === player.uid
			);
		});

		if (cachedConversation) {
			await selectConversation(cachedConversation);

			return;
		}

		actionLoading = `message-${player.uid}`;
		selectedConversation = {
			id: `pending-${player.uid}`,
			otherPlayer: player,
			conversationStatus: player.socialStatus === 'friend'
				? 'active'
				: 'pending_outgoing'
		};
		messages = [];
		loadingMessages = true;

		try {
			const conversation = await createSocialConversation(
				await token(),
				player.uid
			);
			selectedConversation = conversation;
			pendingConversationFocusId = String(conversation.id);
			await upsertCachedConversation($user.data.uid, conversation);
			await selectConversation(selectedConversation || conversation);
		} catch (error) {
			clearSelectedConversation();
			toast.error(
				error instanceof Error
					? error.message
					: text('Failed to open message', 'Không mở được tin nhắn')
			);
		} finally {
			actionLoading = '';
		}
	}

	async function blockPlayer(player: SocialPlayer) {
		if (actionLoading || player.uid === $user.data?.uid) {
			return;
		}

		if (
			!window.confirm(text(`Block ${player.name}?`, `Chặn ${player.name}?`))
		) {
			return;
		}

		actionLoading = `block-${player.uid}`;

		try {
			await blockSocialPlayer(await token(), player.uid);
			updatePlayerStatus(player.uid, 'blocked_by_me');
			await removeFriendFromCache($user.data.uid, player.uid);
			await removeConversationsWithPlayerFromCache(
				$user.data.uid,
				player.uid
			);

			if (selectedConversation?.otherPlayer?.uid === player.uid) {
				clearSelectedConversation();
			}

			toast.success(text('Player blocked', 'Đã chặn người chơi'));
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: text('Failed to block', 'Không chặn được')
			);
		} finally {
			actionLoading = '';
		}
	}

	async function selectConversation(conversation: SocialConversation) {
		selectedConversation = conversation;
		watchConversationMessages(conversation.id);

		try {
			const cached = await hydrateConversationMessages(
				$user.data.uid,
				conversation.id
			);
			loadingMessages = !cached.cached;

			if (cached.complete) {
				return;
			}

			await ensureConversationMessages(
				$user.data.uid,
				await token(),
				conversation.id
			);
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: text('Failed to load messages', 'Không tải được tin nhắn')
			);
		} finally {
			loadingMessages = false;
		}
	}

	function conversationWithMessage(
		conversation: SocialConversation,
		message: SocialMessage
	) {
		const uid = $user.data?.uid;
		const shouldPromote = conversation.pendingForUid === uid
			&& message.status !== 'pending'
			&& message.status !== 'failed';

		return {
			...conversation,
			latestMessage: message,
			lastMessageAt: message.createdAt,
			unreadCount: message.senderUid === uid ? 0 : conversation.unreadCount,
			conversationStatus: shouldPromote
				? 'active'
				: conversation.conversationStatus,
			pendingForUid: shouldPromote ? null : conversation.pendingForUid
		};
	}

	async function sendPendingMessage(
		localMessage: SocialMessage,
		conversationSnapshot: SocialConversation | null = selectedConversation
	) {
		const uid = $user.data?.uid;

		if (!uid) {
			return;
		}

		try {
			const sentMessage = {
				...(await sendSocialMessage(
					await token(),
					localMessage.conversationId,
					localMessage.content
				)),
				status: 'sent' as const
			};
			await replaceCachedMessage(
				uid,
				localMessage.conversationId,
				localMessage.id,
				sentMessage
			);

			const currentConversation = String(selectedConversation?.id)
				=== String(localMessage.conversationId)
				? selectedConversation
				: conversations.find(
					(conversation) =>
						String(conversation.id)
							=== String(localMessage.conversationId)
				) || conversationSnapshot;
			const nextConversation = currentConversation
				? conversationWithMessage(currentConversation, sentMessage)
				: null;

			await updateCachedConversationWithMessage(
				uid,
				localMessage.conversationId,
				sentMessage,
				nextConversation
			);

			if (
				nextConversation
				&& String(selectedConversation?.id)
				=== String(localMessage.conversationId)
			) {
				selectedConversation = nextConversation;
			}
		} catch (error) {
			const message = error instanceof Error
				? error.message
				: text('Failed to send message', 'Không gửi được tin nhắn');
			await updateCachedMessage(
				uid,
				localMessage.conversationId,
				localMessage.id,
				{
					status: 'failed',
					error: message
				}
			);
			toast.error(message);
		}
	}

	async function sendMessage() {
		if (
			!selectedConversation
			|| !messageDraft.trim()
			|| actionLoading
			|| String(selectedConversation.id)
				.startsWith('pending-')
		) {
			return;
		}

		const uid = $user.data?.uid;

		if (!uid) {
			return;
		}

		const conversation = selectedConversation;
		const content = messageDraft.trim();
		const optimisticMessage: SocialMessage = {
			id: createLocalMessageId(),
			conversationId: conversation.id,
			senderUid: uid,
			content,
			createdAt: new Date()
				.toISOString(),
			status: 'pending'
		};
		messageDraft = '';

		await appendCachedMessages(uid, conversation.id, [optimisticMessage]);
		maybeScrollMessagesToBottom(conversation.id, [
			...messages,
			optimisticMessage
		], true);
		const nextConversation = conversationWithMessage(
			conversation,
			optimisticMessage
		);
		await updateCachedConversationWithMessage(
			uid,
			conversation.id,
			optimisticMessage,
			nextConversation
		);
		selectedConversation = nextConversation;
		void sendPendingMessage(optimisticMessage, nextConversation);
	}

	async function retryMessage(message: SocialMessage) {
		const uid = $user.data?.uid;

		if (!uid || message.status === 'pending') {
			return;
		}

		const pendingMessage = {
			...message,
			status: 'pending' as const,
			error: undefined
		};
		await updateCachedMessage(
			uid,
			message.conversationId,
			message.id,
			pendingMessage
		);
		void sendPendingMessage(pendingMessage, selectedConversation);
	}

	function watchConversationMessages(conversationId: number | string) {
		activeMessageUnsubscribe?.();
		activeMessageUnsubscribe = getConversationMessageStore(conversationId)
			.subscribe((value) => {
				messages = value;

				if (String(selectedConversation?.id) === String(conversationId)) {
					scheduleMarkConversationRead(conversationId, value);
					maybeScrollMessagesToBottom(conversationId, value);
				}
			});
	}

	function scheduleMarkConversationRead(
		conversationId: number | string,
		value: SocialMessage[] = messages
	) {
		const uid = $user.data?.uid;
		const latest = latestServerMessage(value);

		if (!uid || !latest?.id) {
			return;
		}

		const key = `${uid}:${conversationId}:${latest.id}`;

		if (lastMarkedReadKey === key) {
			return;
		}

		if (readMarkTimer) {
			clearTimeout(readMarkTimer);
		}

		readMarkTimer = setTimeout(async () => {
			try {
				await markCachedConversationRead(
					uid,
					await token(),
					conversationId,
					latest.id
				);
				lastMarkedReadKey = key;
			} catch (error) {
				console.warn('Failed to mark conversation read', error);
			}
		}, 250);
	}

	function clearSelectedConversation() {
		selectedConversation = null;
		messages = [];
		loadingMessages = false;
		lastScrolledMessageKey = '';
		activeMessageUnsubscribe?.();
		activeMessageUnsubscribe = null;

		if (readMarkTimer) {
			clearTimeout(readMarkTimer);
			readMarkTimer = null;
		}
	}

	onDestroy(() => {
		if (friendSearchTimer) {
			clearTimeout(friendSearchTimer);
		}

		if (messageSearchTimer) {
			clearTimeout(messageSearchTimer);
		}

		if (readMarkTimer) {
			clearTimeout(readMarkTimer);
		}

		activeMessageUnsubscribe?.();
		cleanupPresence?.();
		unsubscribeFriends();
		unsubscribeConversations();
	});
</script>

{#if pageMode}
  <div class="socialPageCenter">
    <Tabs.Root bind:value={activeTab} class="socialTabs">
      <div class="socialHeader">
        <div>
          <h4>{text('Social', 'Xã hội')}</h4>
          <p>{
            visibleOnline
              ? text('Friends and messages', 'Bạn bè và tin nhắn')
              : text('Invisible mode', 'Chế độ ẩn')
          }</p>
        </div>
        <div class="socialHeaderActions">
          <Button
            size="icon"
            variant="ghost"
            disabled={actionLoading === 'presence-visible'}
            on:click={togglePresenceVisible}
            title={visibleOnline
              ? text('Appear offline', 'Ẩn trạng thái')
              : text('Appear online', 'Hiện online')}
          >
            {#if actionLoading === 'presence-visible'}
              <Loader2 class="h-4 w-4 animate-spin" />
            {:else if visibleOnline}
              <Eye class="h-4 w-4" />
            {:else}
              <EyeOff class="h-4 w-4" />
            {/if}
          </Button>
          <Tabs.List class="socialTabList">
            <Tabs.Trigger value="friends">{
              text('Friends', 'Bạn bè')
            }</Tabs.Trigger>
            <Tabs.Trigger value="conversations" class="socialTabTrigger">
              <span>{text('Conversations', 'Hội thoại')}</span>
              {#if unreadMessageCount > 0}
                <span class="tabUnreadBadge">{
                  unreadMessageCount > 99 ? '99+' : unreadMessageCount
                }</span>
              {/if}
            </Tabs.Trigger>
          </Tabs.List>
        </div>
      </div>

      <Tabs.Content value="friends" class="socialPanel">
        <div class="searchBox">
          <Search size={16} />
          <Input
            bind:value={friendQuery}
            on:input={scheduleFriendSearch}
            placeholder={text('Search players', 'Tìm người chơi')}
          />
        </div>

        <div class="scrollRegion pb-[10px]">
          {#if friendQuery.trim().length >= 2}
            <div class="sectionTitle">
              {text('Search results', 'Kết quả tìm kiếm')}
            </div>
            {#if friendResults.length === 0}
              <div class="emptyState compact">
                <Inbox size={18} />
                <span>{
                  text('No players found', 'Không tìm thấy người chơi')
                }</span>
              </div>
            {:else}
              {#each friendResults as player (player.uid)}
                <div class="playerRow">
                  <div class="playerIdentity">
                    <div class="presenceAvatar">
                      <Avatar.Root class="h-9 w-9">
                        <Avatar.Image
                          class="object-cover"
                          src={playerAvatar(player)}
                          alt={player.name}
                        />
                        <Avatar.Fallback>{
                          player.name?.[0] || '?'
                        }</Avatar.Fallback>
                      </Avatar.Root>
                      <span
                        class:online={isPlayerOnline(player)}
                        class="presenceDot"
                      ></span>
                    </div>
                    <div>
                      <a href={`/player/${player.uid}`}>{player.name}</a>
                      <span>{playerActivityLabel(player)}</span>
                    </div>
                  </div>
                  <div class="rowActions">
                    {#if canSpectate(player)}
                      <a
                        class={`${buttonVariants({ variant: 'ghost', size: 'icon' })} messageActionButton`}
                        href={spectateUrl(player)}
                        title={text('Spectate match', 'Xem trận')}
                      >
                        <Eye class="h-4 w-4" />
                      </a>
                    {/if}
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={!canAddFriend(player) || Boolean(actionLoading)}
                      on:click={() => addFriend(player)}
                      title={text('Add friend', 'Thêm bạn')}
                    >
                      {#if actionLoading === `friend-${player.uid}`}
                        <Loader2 class="h-4 w-4 animate-spin" />
                      {:else if player.socialStatus === 'friend'}
                        <UserCheck class="h-4 w-4" />
                      {:else if player.socialStatus === 'outgoing_pending'}
                        <Clock class="h-4 w-4" />
                      {:else}
                        <UserPlus class="h-4 w-4" />
                      {/if}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={player.socialStatus === 'self' || Boolean(actionLoading)}
                      on:click={() => invitePlayer(player)}
                      title={text('Invite 1v1', 'Mời 1v1')}
                    >
                      <Swords class="h-4 w-4" />
                    </Button>
                    <button
                      type="button"
                      class={`${buttonVariants({ variant: 'ghost', size: 'icon' })} messageActionButton`}
                      disabled={['self', 'blocked_by_me', 'blocked_me'].includes(String(player.socialStatus))
                      || Boolean(actionLoading)}
                      on:click|preventDefault|stopPropagation={() => startMessage(player)}
                      title={text('Message', 'Nhắn tin')}
                    >
                      <MessageCircle class="h-4 w-4" />
                    </button>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={['self', 'blocked_by_me'].includes(String(player.socialStatus))
                      || Boolean(actionLoading)}
                      on:click={() => blockPlayer(player)}
                      title={text('Block', 'Chặn')}
                    >
                      <Ban class="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              {/each}
            {/if}
          {/if}

          <div class="sectionTitle">{text('Friends', 'Bạn bè')}</div>
          {#if loadingFriends}
            <div class="emptyState">
              <Loader2 class="h-5 w-5 animate-spin" />
              <span>{text('Loading friends...', 'Đang tải bạn bè...')}</span>
            </div>
          {:else if friends.length === 0}
            <div class="emptyState">
              <Users size={20} />
              <span>{text('No friends yet', 'Chưa có bạn bè')}</span>
            </div>
          {:else}
            {#each friends as player (player.uid)}
              <div class="playerRow">
                <div class="playerIdentity">
                  <div class="presenceAvatar">
                    <Avatar.Root class="h-9 w-9">
                      <Avatar.Image
                        class="object-cover"
                        src={playerAvatar(player)}
                        alt={player.name}
                      />
                      <Avatar.Fallback>{player.name?.[0] || '?'}</Avatar.Fallback>
                    </Avatar.Root>
                    <span
                      class:online={isPlayerOnline(player)}
                      class="presenceDot"
                    ></span>
                  </div>
                  <div>
                    <a href={`/player/${player.uid}`}>{player.name}</a>
                    <span>{playerActivityLabel(player)}</span>
                  </div>
                </div>
                <div class="rowActions">
                  {#if canSpectate(player)}
                    <a
                      class={`${buttonVariants({ variant: 'ghost', size: 'icon' })} messageActionButton`}
                      href={spectateUrl(player)}
                      title={text('Spectate match', 'Xem trận')}
                    >
                      <Eye class="h-4 w-4" />
                    </a>
                  {/if}
                  <Button
                    size="icon"
                    variant="ghost"
                    on:click={() => invitePlayer(player)}
                    title={text('Invite 1v1', 'Mời 1v1')}
                  >
                    <Swords class="h-4 w-4" />
                  </Button>
                  <button
                    type="button"
                    class={`${buttonVariants({ variant: 'ghost', size: 'icon' })} messageActionButton`}
                    on:click|preventDefault|stopPropagation={() => startMessage(player)}
                    title={text('Message', 'Nhắn tin')}
                  >
                    <MessageCircle class="h-4 w-4" />
                  </button>
                  <Button
                    size="icon"
                    variant="ghost"
                    on:click={() => blockPlayer(player)}
                    title={text('Block', 'Chặn')}
                  >
                    <Ban class="h-4 w-4" />
                  </Button>
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </Tabs.Content>

      <Tabs.Content value="conversations" class="socialPanel conversationPanel">
        <div
          class:mobileChatOpen={selectedConversation}
          class="conversationLayout"
        >
          <div class="conversationSidebar">
            <div class="messengerSidebarTitle">
              <strong>{text('Chats', 'Đoạn chat')}</strong>
              <span>{conversations.length}</span>
            </div>
            <div class="searchBox conversationSearch">
              <Search size={16} />
              <Input
                bind:value={messageQuery}
                on:input={scheduleMessageSearch}
                placeholder={text('Search', 'Tìm kiếm')}
              />
            </div>

            {#if messageQuery.trim().length >= 2 && messageResults.length > 0}
              <div class="messageSearchResults">
                {#each messageResults as player (player.uid)}
                  <button
                    class="messageSearchItem"
                    type="button"
                    on:click|preventDefault|stopPropagation={() => startMessage(player)}
                  >
                    <div class="presenceAvatar small">
                      <Avatar.Root class="h-7 w-7">
                        <Avatar.Image
                          class="object-cover"
                          src={playerAvatar(player)}
                          alt={player.name}
                        />
                        <Avatar.Fallback>{player.name?.[0] || '?'}</Avatar.Fallback>
                      </Avatar.Root>
                      <span
                        class:online={isPlayerOnline(player)}
                        class="presenceDot"
                      ></span>
                    </div>
                    <span>{player.name}</span>
                  </button>
                {/each}
              </div>
            {/if}

            <div class="conversationList">
            {#if loadingConversations}
              <div class="emptyState">
                <Loader2 class="h-5 w-5 animate-spin" />
                <span>{text('Loading...', 'Đang tải...')}</span>
              </div>
            {:else if conversations.length === 0}
              <div class="emptyState">
                <MessageCircle size={20} />
                <span>{text('No conversations', 'Chưa có hội thoại')}</span>
              </div>
            {:else}
              {#if pendingConversations.length > 0}
                <div class="sectionTitle">{text('Pending', 'Đang chờ')}</div>
                {#each pendingConversations as conversation (conversation.id)}
                  <button
                    type="button"
                    class:selectedConversation={String(selectedConversation?.id) === String(conversation.id)}
                    class:hasUnread={Number(conversation.unreadCount || 0) > 0}
                    class="conversationItem"
                    on:click={() => selectConversation(conversation)}
                  >
                    <div class="presenceAvatar">
                      <Avatar.Root class="h-11 w-11">
                        {#if conversation.otherPlayer}
                          <Avatar.Image
                            class="object-cover"
                            src={playerAvatar(conversation.otherPlayer)}
                            alt={conversation.otherPlayer.name}
                          />
                        {/if}
                        <Avatar.Fallback>{
                          conversation.otherPlayer?.name?.[0] || '?'
                        }</Avatar.Fallback>
                      </Avatar.Root>
                      <span
                        class:online={isPlayerOnline(conversation.otherPlayer)}
                        class="presenceDot"
                      ></span>
                    </div>
                    <span class="conversationSummary">
                      <strong>{
                        conversation.otherPlayer?.name || text('Player', 'Người chơi')
                      }</strong>
                      <span>{
                        conversation.latestMessage?.content
                        || text('No messages yet', 'Chưa có tin nhắn')
                      }</span>
                    </span>
                    {#if Number(conversation.unreadCount || 0) > 0}
                      <span class="conversationUnread">{
                        Number(conversation.unreadCount) > 99 ? '99+' : conversation.unreadCount
                      }</span>
                    {/if}
                  </button>
                {/each}
              {/if}

              <div class="sectionTitle">
                {text('Conversations', 'Hội thoại')}
              </div>
              {#each activeConversations as conversation (conversation.id)}
                <button
                  type="button"
                  class:selectedConversation={String(selectedConversation?.id) === String(conversation.id)}
                  class:hasUnread={Number(conversation.unreadCount || 0) > 0}
                  class="conversationItem"
                  on:click={() => selectConversation(conversation)}
                >
                  <div class="presenceAvatar">
                  <Avatar.Root class="h-11 w-11">
                      {#if conversation.otherPlayer}
                        <Avatar.Image
                          class="object-cover"
                          src={playerAvatar(conversation.otherPlayer)}
                          alt={conversation.otherPlayer.name}
                        />
                      {/if}
                      <Avatar.Fallback>{
                        conversation.otherPlayer?.name?.[0] || '?'
                      }</Avatar.Fallback>
                    </Avatar.Root>
                    <span
                      class:online={isPlayerOnline(conversation.otherPlayer)}
                      class="presenceDot"
                    ></span>
                  </div>
                  <span class="conversationSummary">
                    <strong>{
                      conversation.otherPlayer?.name || text('Player', 'Người chơi')
                    }</strong>
                    <span>{
                      conversation.latestMessage?.content
                      || text('No messages yet', 'Chưa có tin nhắn')
                    }</span>
                  </span>
                  {#if Number(conversation.unreadCount || 0) > 0}
                    <span class="conversationUnread">{
                      Number(conversation.unreadCount) > 99 ? '99+' : conversation.unreadCount
                    }</span>
                  {/if}
                </button>
              {/each}
            {/if}
            </div>
          </div>

          <div class="messagePane">
            {#if !selectedConversation}
              <div class="emptyState messengerEmpty">
                <span class="messengerEmptyIcon"><MessageCircle size={32} /></span>
                <strong>{text('Your messages', 'Tin nhắn của bạn')}</strong>
                <span>{text('Select a chat or start a new conversation.', 'Chọn một đoạn chat hoặc bắt đầu cuộc trò chuyện mới.')}</span>
              </div>
            {:else}
              <div class="messageHeader">
                <div class="messageHeaderIdentity">
                  <button
                    type="button"
                    class="conversationBack"
                    on:click={clearSelectedConversation}
                    aria-label={text('Back to conversations', 'Quay lại hội thoại')}
                  >
                    <ChevronLeft size={17} />
                  </button>
                  {#if selectedConversation.otherPlayer}
                    <div class="presenceAvatar">
                      <Avatar.Root class="h-10 w-10">
                        <Avatar.Image
                          class="object-cover"
                          src={playerAvatar(selectedConversation.otherPlayer)}
                          alt={selectedConversation.otherPlayer.name}
                        />
                        <Avatar.Fallback>{selectedConversation.otherPlayer.name?.[0] || '?'}</Avatar.Fallback>
                      </Avatar.Root>
                      <span
                        class:online={isPlayerOnline(selectedConversation.otherPlayer)}
                        class="presenceDot"
                      ></span>
                    </div>
                  {/if}
                  <div class="messageHeaderCopy">
                    <strong>{
                      selectedConversation.otherPlayer?.name || text('Player', 'Người chơi')
                    }</strong>
                    <span
                      class:activeNow={selectedConversation.conversationStatus === 'active'
                        && isPlayerOnline(selectedConversation.otherPlayer)}
                      class:pendingStatus={selectedConversation.conversationStatus !== 'active'}
                    >{
                      selectedConversation.conversationStatus !== 'active'
                        ? text('Pending conversation', 'Cuộc trò chuyện đang chờ')
                        : isPlayerOnline(selectedConversation.otherPlayer)
                          ? text('Active now', 'Đang hoạt động')
                          : text('Offline', 'Ngoại tuyến')
                    }</span>
                  </div>
                </div>
                {#if selectedConversation.otherPlayer}
                  <div class="messageHeaderActions">
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={Boolean(actionLoading)}
                      on:click={inviteSelectedConversationPlayer}
                      title={text('Invite 1v1', 'Mời 1v1')}
                    >
                      <Swords class="h-4 w-4" />
                    </Button>
                    <a
                      class={buttonVariants({ variant: 'ghost', size: 'icon' })}
                      href={`/player/${selectedConversation.otherPlayer.uid}`}
                      title={text('View profile', 'Xem trang cá nhân')}
                    >
                      <UserRound class="h-4 w-4" />
                    </a>
                  </div>
                {/if}
              </div>
              <div class="messageList" bind:this={messageListElement}>
                {#if loadingMessages}
                  <div class="emptyState compact">
                    <Loader2 class="h-4 w-4 animate-spin" />
                    <span>{text('Loading...', 'Đang tải...')}</span>
                  </div>
                {:else if messages.length === 0}
                  <div class="emptyState compact">
                    <span>{text('No messages yet', 'Chưa có tin nhắn')}</span>
                  </div>
                {:else}
                  {#each messages as message (message.id)}
                    <div
                      class:selfMessage={message.senderUid === $user.data?.uid}
                      class:pendingMessage={message.status === 'pending'}
                      class:failedMessage={message.status === 'failed'}
                      class="messageBubble"
                    >
                      <span class="messageText">{message.content}</span>
                      <span class="messageMeta">
                        <span>{formatMessageTime(message.createdAt)}</span>
                        {#if message.status === 'pending'}
                          <span>{text('Sending', 'Đang gửi')}</span>
                        {:else if message.status === 'failed'}
                          <button
                            type="button"
                            class="retryMessageButton"
                            on:click={() => retryMessage(message)}
                            title={message.error || text('Retry', 'Gửi lại')}
                          >
                            <RefreshCw size={12} />
                            <span>{text('Retry', 'Gửi lại')}</span>
                          </button>
                        {/if}
                      </span>
                    </div>
                  {/each}
                {/if}
              </div>
              <form
                class="messageComposer"
                on:submit|preventDefault={sendMessage}
              >
                <Input
                  bind:value={messageDraft}
                  placeholder={text('Write a message', 'Viết tin nhắn')}
                  maxlength="1000"
                />
                <Button
                  size="icon"
                  disabled={!messageDraft.trim() || Boolean(actionLoading)}
                >
                  {#if actionLoading === `send-${selectedConversation.id}`}
                    <Loader2 class="h-4 w-4 animate-spin" />
                  {:else}
                    <Send class="h-4 w-4" />
                  {/if}
                </Button>
              </form>
            {/if}
          </div>
        </div>
      </Tabs.Content>
    </Tabs.Root>
  </div>
{:else}
  <a
    class="socialTrigger"
    href="/social"
    aria-label={text('Social', 'Xã hội')}
    title={text('Social', 'Xã hội')}
    on:click={refreshAll}
  >
    <Users size={18} />
    {#if unreadMessageCount > 0}
      <span class="socialBadge">{
        unreadMessageCount > 99 ? '99+' : unreadMessageCount
      }</span>
    {/if}
  </a>
{/if}

<style lang="scss">
.socialTrigger {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--textColor2);
  cursor: pointer;
  text-decoration: none;

  &:hover {
    background: hsl(var(--accent));
    color: var(--textColor1);
  }
}

.socialBadge {
  position: absolute;
  top: -2px;
  right: -3px;
  min-width: 17px;
  height: 17px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border: 2px solid hsl(var(--background));
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
}

.socialPageCenter {
  width: 100%;
  height: calc(100vh - 56px);
  min-height: 0;
  overflow: hidden;
  background: hsl(var(--card));
}

.socialTabs {
  display: flex;
  height: 100%;
  flex-direction: column;
}

.socialPanel {
  min-height: 0;
  flex: 1;
  margin-top: 0;
}

.socialHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border1);

  h4,
  p {
    margin: 0;
  }

  h4 {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.025em;
  }

  p {
    margin-top: 2px;
    color: var(--textColor2);
    font-size: 12px;
  }
}

.socialHeaderActions {
  display: flex;
  align-items: center;
  gap: 8px;
}

:global(.socialTabList) {
  width: auto;
  padding: 3px;
  border-radius: 999px;
  background: hsl(var(--muted) / 0.72);
}

:global(.socialTabTrigger) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tabUnreadBadge {
  min-width: 17px;
  height: 17px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  border-radius: 999px;
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
}

.socialPanel {
  padding: 16px;
}

.searchBox {
  position: relative;
  margin-bottom: 8px;

  :global(svg) {
    position: absolute;
    top: 10px;
    left: 10px;
    color: var(--textColor2);
    z-index: 1;
  }

  :global(input) {
    padding-left: 34px;
  }
}

.scrollRegion {
  max-height: calc(100% - 48px);
  overflow-y: auto;
  padding-right: 2px;
  padding-bottom: 10px;
}

.sectionTitle {
  margin: 10px 4px 6px;
  color: var(--textColor2);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.playerRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px;
  border-radius: 7px;

  &:hover {
    background: hsl(var(--accent));
  }
}

.playerIdentity {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;

  a {
    display: block;
    color: var(--textColor);
    font-size: 13px;
    font-weight: 700;
    text-decoration: none;
  }

  span {
    display: block;
    min-height: 15px;
    color: var(--textColor2);
    font-size: 12px;
  }
}

.presenceAvatar {
  position: relative;
  flex-shrink: 0;

  &.small {
    width: 28px;
    height: 28px;
  }
}

.presenceAvatar .presenceDot {
  position: absolute;
  right: -1px;
  bottom: -1px;
  display: block;
  width: 12px;
  height: 12px;
  min-width: 12px;
  min-height: 12px;
  padding: 0;
  box-sizing: border-box;
  border: 2px solid hsl(var(--card));
  border-radius: 50%;
  background: #747f8d;
  aspect-ratio: 1 / 1;
  color: transparent;
  font-size: 0;
  line-height: 0;

  &.online {
    background: #23a55a;
  }
}

.rowActions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.messageActionButton {
  border: 0;
}

.emptyState {
  min-height: 110px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  color: var(--textColor2);
  font-size: 13px;
  text-align: center;

  &.compact {
    min-height: 54px;
  }
}

.conversationPanel {
  display: block;
  padding: 0;
  overflow: hidden;
}

.conversationSidebar {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  border-right: 1px solid var(--border1);
  background: hsl(var(--card));
}

.messengerSidebarTitle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 16px 10px;

  strong {
    font-size: 22px;
    font-weight: 820;
    letter-spacing: -0.03em;
  }

  span {
    display: grid;
    min-width: 24px;
    height: 24px;
    place-items: center;
    padding: 0 7px;
    border-radius: 999px;
    background: hsl(205 90% 48% / 0.12);
    color: hsl(205 90% 48%);
    font-size: 11px;
    font-weight: 800;
  }
}

.conversationSearch {
  margin: 0 14px 10px;

  :global(input) {
    border-color: transparent;
    border-radius: 999px;
    background: hsl(var(--muted) / 0.72);
  }
}

.messageSearchResults {
  max-height: 150px;
  margin: 0 12px 8px;
  overflow-y: auto;
  border: 1px solid hsl(var(--border) / 0.8);
  border-radius: 12px;
}

.messageSearchItem {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border: 0;
  background: transparent;
  color: var(--textColor);
  text-align: left;
  cursor: pointer;

  &:hover {
    background: hsl(var(--accent));
  }
}

.conversationLayout {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(270px, 320px) minmax(0, 1fr);
}

.conversationList {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 14px;
}

.conversationItem {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 11px;
  min-height: 64px;
  padding: 9px 10px;
  border: 0;
  border-radius: 13px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: hsl(var(--accent));
  }

  &.selectedConversation {
    background: hsl(205 90% 48% / 0.12);
  }

  &.hasUnread {
    strong {
      color: var(--textColor);
      font-weight: 800;
    }
  }

  :global(.avatar-root),
  :global([data-avatar-root]) {
    flex-shrink: 0;
  }
}

.conversationSummary {
  min-width: 0;
  display: grid;
  gap: 4px;
  flex: 1;

  strong {
    font-size: 14px;
    line-height: 1.25;
  }

  span {
    color: var(--textColor2);
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.conversationUnread {
  min-width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  border-radius: 999px;
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  flex-shrink: 0;
}

.messagePane {
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-rows: auto 1fr auto;
  overflow: hidden;
  background: hsl(var(--background) / 0.34);
}

.messageHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 66px;
  padding: 9px 16px;
  border-bottom: 1px solid var(--border1);
  background: hsl(var(--card));
  font-size: 13px;
  box-shadow: 0 2px 10px rgb(0 0 0 / 4%);

  span {
    color: var(--textColor2);
    font-size: 12px;
  }
}

.messageHeaderIdentity,
.messageHeaderActions {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.messageHeaderCopy {
  display: flex;
  min-width: 0;
  flex-direction: column;

  strong {
    overflow: hidden;
    font-size: 14px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    color: var(--textColor2);
    font-size: 11px;

    &.activeNow {
      color: hsl(145 62% 42%);
    }

    &.pendingStatus {
      color: hsl(36 86% 48%);
    }
  }
}

.messengerEmpty {
  padding: 32px;

  strong {
    color: var(--textColor);
    font-size: 18px;
  }

  > span:last-child {
    max-width: 320px;
    line-height: 1.5;
  }
}

.messengerEmptyIcon {
  display: grid;
  width: 68px;
  height: 68px;
  margin-bottom: 6px;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(145deg, hsl(205 96% 56%), hsl(263 82% 61%));
  color: white;
}

.conversationBack {
  display: none;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin: -4px 0 -4px -4px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--textColor2);
  cursor: pointer;

  &:hover {
    background: hsl(var(--accent));
    color: var(--textColor);
  }
}

.messageList {
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px;
}

.messageBubble {
  max-width: min(78%, 560px);
  align-self: flex-start;
  display: grid;
  gap: 4px;
  padding: 9px 12px;
  border: 1px solid transparent;
  border-radius: 18px 18px 18px 5px;
  background: hsl(var(--muted));
  color: var(--textColor);
  font-size: 13px;
  line-height: 1.35;
  overflow-wrap: anywhere;

  &.selfMessage {
    align-self: flex-end;
    border-radius: 18px 18px 5px 18px;
    background: hsl(205 90% 48%);
    color: white;
  }

  &.pendingMessage {
    opacity: 0.58;
  }

  &.failedMessage {
    border-color: #ef4444;
    opacity: 1;
  }
}

.messageText {
  white-space: pre-wrap;
}

.messageMeta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 7px;
  font-size: 11px;
  line-height: 1;
  opacity: 0.72;
}

.retryMessageButton {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}

.messageComposer {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--border1);
  background: hsl(var(--card));

  :global(input) {
    border-color: transparent;
    border-radius: 999px;
    background: hsl(var(--muted) / 0.72);
  }
}

@media (max-width: 640px) {
  .socialPageCenter {
    height: calc(100vh - 56px);
    min-height: 0;
  }

  .socialHeader {
    align-items: stretch;
    flex-direction: column;
    gap: 10px;
  }

  :global(.socialTabList) {
    width: 100%;
  }

  .conversationLayout {
    grid-template-columns: 1fr;
    height: 100%;
  }

  .conversationLayout:not(.mobileChatOpen) {
    .messagePane {
      display: none;
    }
  }

  .conversationLayout.mobileChatOpen {
    .conversationSidebar {
      display: none;
    }
  }

  .conversationSidebar,
  .messagePane {
    height: 100%;
  }

  .conversationBack {
    display: inline-flex;
    flex-shrink: 0;
  }

  .messageHeader {
    justify-content: flex-start;

    strong {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    span {
      margin-left: auto;
      flex-shrink: 0;
    }
  }
}
</style>
