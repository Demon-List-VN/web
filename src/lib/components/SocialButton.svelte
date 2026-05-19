<script lang="ts">
	import { browser } from '$app/environment';
	import { onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import {
		Ban,
		Clock,
		ChevronLeft,
		Inbox,
		Loader2,
		MessageCircle,
		RefreshCw,
		Search,
		Send,
		Swords,
		UserCheck,
		UserPlus,
		Users
	} from 'lucide-svelte';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Popover from '$lib/components/ui/popover';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { user } from '$lib/client';
	import { isActive } from '$lib/client/isSupporterActive';
	import { sendPvpInvite } from '$lib/client/pvp';
	import {
		blockSocialPlayer,
		createSocialConversation,
		searchSocialPlayers,
		sendFriendRequest,
		sendSocialMessage,
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
		refreshSocialConversations,
		refreshSocialFriends,
		removeConversationsWithPlayerFromCache,
		removeFriendFromCache,
		replaceCachedMessage,
		resetSocialCacheState,
		setSocialCacheUser,
		updateCachedMessage,
		updateCachedConversationWithMessage,
		upsertCachedConversation
	} from '$lib/client/socialCache';
	import { locale } from 'svelte-i18n';
	import { toast } from 'svelte-sonner';

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
	let activeMessageUnsubscribe: (() => void) | null = null;

	const unsubscribeFriends = friendsStore.subscribe((value) => {
		friends = value;
	});
	const unsubscribeConversations = conversationsStore.subscribe((value) => {
		conversations = value;

		if (pendingConversationFocusId) {
			const focused = value.find(
				(conversation) => String(conversation.id) === pendingConversationFocusId
			);
			if (focused) {
				selectedConversation = focused;
			}
			pendingConversationFocusId = null;
		}

		if (
			selectedConversation &&
			!String(selectedConversation.id).startsWith('pending-') &&
			!value.some((conversation) => String(conversation.id) === String(selectedConversation?.id))
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
	$: if (browser && $user.checked) {
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

	function text(en: string, vi: string) {
		return $locale === 'vi' ? vi : en;
	}

	function playerAvatar(player: SocialPlayer) {
		return `https://cdn.gdvn.net/avatars/${player.uid}${
			isActive(player.supporterUntil ?? null) && player.isAvatarGif ? '.gif' : '.jpg'
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

	function formatMessageTime(value?: string | null) {
		const date = value ? new Date(value) : new Date();
		if (!Number.isFinite(date.getTime())) return '';

		return date.toLocaleTimeString('en-GB', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});
	}

	function createLocalMessageId() {
		return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
	}

	function canAddFriend(player: SocialPlayer) {
		return !['self', 'friend', 'outgoing_pending', 'blocked_by_me', 'blocked_me'].includes(
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
			await Promise.all([
				refreshSocialFriends(uid, tokenValue),
				refreshSocialConversations(uid, tokenValue)
			]);
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: text('Failed to refresh social cache', 'Không làm mới được dữ liệu xã hội')
			);
		} finally {
			loadingFriends = false;
			loadingConversations = false;
		}
	}

	async function refreshAll() {
		if (!$user.loggedIn || !$user.data?.uid) return;
		await hydrateSocialCache($user.data.uid);
	}

	function scheduleFriendSearch() {
		if (friendSearchTimer) clearTimeout(friendSearchTimer);
		friendSearchTimer = setTimeout(searchFriends, 250);
	}

	function scheduleMessageSearch() {
		if (messageSearchTimer) clearTimeout(messageSearchTimer);
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
		if (!canAddFriend(player) || actionLoading) return;

		actionLoading = `friend-${player.uid}`;
		try {
			await sendFriendRequest(await token(), player.uid);
			updatePlayerStatus(player.uid, 'outgoing_pending');
			toast.success(text('Friend request sent', 'Đã gửi lời mời kết bạn'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : text('Failed to send request', 'Không gửi được lời mời'));
		} finally {
			actionLoading = '';
		}
	}

	async function invitePlayer(player: SocialPlayer) {
		if (actionLoading || player.uid === $user.data?.uid) return;

		actionLoading = `invite-${player.uid}`;
		try {
			await sendPvpInvite(await token(), { inviteeUid: player.uid });
			toast.success(text('1v1 invite sent', 'Đã gửi lời mời 1v1'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : text('Failed to invite', 'Không gửi được lời mời'));
		} finally {
			actionLoading = '';
		}
	}

	async function startMessage(player: SocialPlayer, event?: Event) {
		event?.preventDefault();
		event?.stopPropagation();

		if (actionLoading || player.uid === $user.data?.uid) return;

		activeTab = 'conversations';
		messageQuery = '';
		messageResults = [];
		const cachedConversation = conversations.find((conversation) => {
			if (conversation.otherPlayer?.uid === player.uid) return true;
			return conversation.participants?.some((participant) => participant.uid === player.uid);
		});

		if (cachedConversation) {
			await selectConversation(cachedConversation);
			return;
		}

		actionLoading = `message-${player.uid}`;
		selectedConversation = {
			id: `pending-${player.uid}`,
			otherPlayer: player,
			conversationStatus: player.socialStatus === 'friend' ? 'active' : 'pending_outgoing'
		};
		messages = [];
		loadingMessages = true;

		try {
			const conversation = await createSocialConversation(await token(), player.uid);
			selectedConversation = conversation;
			pendingConversationFocusId = String(conversation.id);
			await upsertCachedConversation($user.data.uid, conversation);
			await selectConversation(selectedConversation || conversation);
		} catch (error) {
			clearSelectedConversation();
			toast.error(error instanceof Error ? error.message : text('Failed to open message', 'Không mở được tin nhắn'));
		} finally {
			actionLoading = '';
		}
	}

	async function blockPlayer(player: SocialPlayer) {
		if (actionLoading || player.uid === $user.data?.uid) return;
		if (!window.confirm(text(`Block ${player.name}?`, `Chặn ${player.name}?`))) return;

		actionLoading = `block-${player.uid}`;
		try {
			await blockSocialPlayer(await token(), player.uid);
			updatePlayerStatus(player.uid, 'blocked_by_me');
			await removeFriendFromCache($user.data.uid, player.uid);
			await removeConversationsWithPlayerFromCache($user.data.uid, player.uid);
			if (selectedConversation?.otherPlayer?.uid === player.uid) {
				clearSelectedConversation();
			}
			toast.success(text('Player blocked', 'Đã chặn người chơi'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : text('Failed to block', 'Không chặn được'));
		} finally {
			actionLoading = '';
		}
	}

	async function selectConversation(conversation: SocialConversation) {
		selectedConversation = conversation;
		watchConversationMessages(conversation.id);

		try {
			const cached = await hydrateConversationMessages($user.data.uid, conversation.id);
			loadingMessages = !cached.cached;
			if (cached.complete) return;
			await ensureConversationMessages($user.data.uid, await token(), conversation.id);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : text('Failed to load messages', 'Không tải được tin nhắn'));
		} finally {
			loadingMessages = false;
		}
	}

	function conversationWithMessage(conversation: SocialConversation, message: SocialMessage) {
		const uid = $user.data?.uid;
		const shouldPromote =
			conversation.pendingForUid === uid &&
			message.status !== 'pending' &&
			message.status !== 'failed';

		return {
			...conversation,
			latestMessage: message,
			lastMessageAt: message.createdAt,
			conversationStatus: shouldPromote ? 'active' : conversation.conversationStatus,
			pendingForUid: shouldPromote ? null : conversation.pendingForUid
		};
	}

	async function sendPendingMessage(
		localMessage: SocialMessage,
		conversationSnapshot: SocialConversation | null = selectedConversation
	) {
		const uid = $user.data?.uid;
		if (!uid) return;

		try {
			const sentMessage = {
				...(await sendSocialMessage(await token(), localMessage.conversationId, localMessage.content)),
				status: 'sent' as const
			};
			await replaceCachedMessage(uid, localMessage.conversationId, localMessage.id, sentMessage);

			const currentConversation =
				String(selectedConversation?.id) === String(localMessage.conversationId)
					? selectedConversation
					: conversations.find(
							(conversation) => String(conversation.id) === String(localMessage.conversationId)
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
			if (nextConversation && String(selectedConversation?.id) === String(localMessage.conversationId)) {
				selectedConversation = nextConversation;
			}
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: text('Failed to send message', 'Không gửi được tin nhắn');
			await updateCachedMessage(uid, localMessage.conversationId, localMessage.id, {
				status: 'failed',
				error: message
			});
			toast.error(message);
		}
	}

	async function sendMessage() {
		if (
			!selectedConversation ||
			!messageDraft.trim() ||
			actionLoading ||
			String(selectedConversation.id).startsWith('pending-')
		) {
			return;
		}

		const uid = $user.data?.uid;
		if (!uid) return;

		const conversation = selectedConversation;
		const content = messageDraft.trim();
		const optimisticMessage: SocialMessage = {
			id: createLocalMessageId(),
			conversationId: conversation.id,
			senderUid: uid,
			content,
			createdAt: new Date().toISOString(),
			status: 'pending'
		};
		messageDraft = '';

		await appendCachedMessages(uid, conversation.id, [optimisticMessage]);
		const nextConversation = conversationWithMessage(conversation, optimisticMessage);
		await updateCachedConversationWithMessage(uid, conversation.id, optimisticMessage, nextConversation);
		selectedConversation = nextConversation;
		void sendPendingMessage(optimisticMessage, nextConversation);
	}

	async function retryMessage(message: SocialMessage) {
		const uid = $user.data?.uid;
		if (!uid || message.status === 'pending') return;

		const pendingMessage = {
			...message,
			status: 'pending' as const,
			error: undefined
		};
		await updateCachedMessage(uid, message.conversationId, message.id, pendingMessage);
		void sendPendingMessage(pendingMessage, selectedConversation);
	}

	function watchConversationMessages(conversationId: number | string) {
		activeMessageUnsubscribe?.();
		activeMessageUnsubscribe = getConversationMessageStore(conversationId).subscribe((value) => {
			messages = value;
		});
	}

	function clearSelectedConversation() {
		selectedConversation = null;
		messages = [];
		loadingMessages = false;
		activeMessageUnsubscribe?.();
		activeMessageUnsubscribe = null;
	}

	onDestroy(() => {
		if (friendSearchTimer) clearTimeout(friendSearchTimer);
		if (messageSearchTimer) clearTimeout(messageSearchTimer);
		activeMessageUnsubscribe?.();
		unsubscribeFriends();
		unsubscribeConversations();
	});
</script>

<Popover.Root>
	<Popover.Trigger asChild let:builder>
		<button
			{...builder}
			use:builder.action
			class="socialTrigger"
			aria-label={text('Social', 'Xã hội')}
			on:click={refreshAll}
		>
			<Users size={18} />
		</button>
	</Popover.Trigger>

	<Popover.Content class="socialCenter px-[10px]" align="end" sideOffset={10}>
		<Tabs.Root bind:value={activeTab} class="socialTabs">
			<div class="socialHeader">
				<div>
					<h4>{text('Social', 'Xã hội')}</h4>
					<p>{text('Friends and messages', 'Bạn bè và tin nhắn')}</p>
				</div>
				<Tabs.List class="socialTabList">
					<Tabs.Trigger value="friends">{text('Friends', 'Bạn bè')}</Tabs.Trigger>
					<Tabs.Trigger value="conversations">{text('Conversations', 'Hội thoại')}</Tabs.Trigger>
				</Tabs.List>
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

				<div class="scrollRegion">
					{#if friendQuery.trim().length >= 2}
						<div class="sectionTitle">{text('Search results', 'Kết quả tìm kiếm')}</div>
						{#if friendResults.length === 0}
							<div class="emptyState compact">
								<Inbox size={18} />
								<span>{text('No players found', 'Không tìm thấy người chơi')}</span>
							</div>
						{:else}
							{#each friendResults as player (player.uid)}
								<div class="playerRow">
									<div class="playerIdentity">
										<Avatar.Root class="h-9 w-9">
											<Avatar.Image class="object-cover" src={playerAvatar(player)} alt={player.name} />
											<Avatar.Fallback>{player.name?.[0] || '?'}</Avatar.Fallback>
										</Avatar.Root>
										<div>
											<a href={`/player/${player.uid}`}>{player.name}</a>
											<span>{statusLabel(player.socialStatus)}</span>
										</div>
									</div>
									<div class="rowActions">
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
											disabled={['self', 'blocked_by_me', 'blocked_me'].includes(String(player.socialStatus)) || Boolean(actionLoading)}
											on:click|preventDefault|stopPropagation={() => startMessage(player)}
											title={text('Message', 'Nhắn tin')}
										>
											<MessageCircle class="h-4 w-4" />
										</button>
										<Button
											size="icon"
											variant="ghost"
											disabled={['self', 'blocked_by_me'].includes(String(player.socialStatus)) || Boolean(actionLoading)}
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
									<Avatar.Root class="h-9 w-9">
										<Avatar.Image class="object-cover" src={playerAvatar(player)} alt={player.name} />
										<Avatar.Fallback>{player.name?.[0] || '?'}</Avatar.Fallback>
									</Avatar.Root>
									<div>
										<a href={`/player/${player.uid}`}>{player.name}</a>
										<span>{text('Friend', 'Bạn bè')}</span>
									</div>
								</div>
								<div class="rowActions">
									<Button size="icon" variant="ghost" on:click={() => invitePlayer(player)} title={text('Invite 1v1', 'Mời 1v1')}>
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
									<Button size="icon" variant="ghost" on:click={() => blockPlayer(player)} title={text('Block', 'Chặn')}>
										<Ban class="h-4 w-4" />
									</Button>
								</div>
							</div>
						{/each}
					{/if}
				</div>
			</Tabs.Content>

			<Tabs.Content value="conversations" class="socialPanel conversationPanel">
				<div class="searchBox">
					<Search size={16} />
					<Input
						bind:value={messageQuery}
						on:input={scheduleMessageSearch}
						placeholder={text('Message a player', 'Nhắn tin người chơi')}
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
								<Avatar.Root class="h-7 w-7">
									<Avatar.Image class="object-cover" src={playerAvatar(player)} alt={player.name} />
									<Avatar.Fallback>{player.name?.[0] || '?'}</Avatar.Fallback>
								</Avatar.Root>
								<span>{player.name}</span>
							</button>
						{/each}
					</div>
				{/if}

				<div class:mobileChatOpen={selectedConversation} class="conversationLayout">
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
										class="conversationItem"
										on:click={() => selectConversation(conversation)}
									>
										<strong>{conversation.otherPlayer?.name || text('Player', 'Người chơi')}</strong>
										<span>{conversation.latestMessage?.content || text('No messages yet', 'Chưa có tin nhắn')}</span>
									</button>
								{/each}
							{/if}

							<div class="sectionTitle">{text('Conversations', 'Hội thoại')}</div>
							{#each activeConversations as conversation (conversation.id)}
								<button
									type="button"
									class:selectedConversation={String(selectedConversation?.id) === String(conversation.id)}
									class="conversationItem"
									on:click={() => selectConversation(conversation)}
								>
									<strong>{conversation.otherPlayer?.name || text('Player', 'Người chơi')}</strong>
									<span>{conversation.latestMessage?.content || text('No messages yet', 'Chưa có tin nhắn')}</span>
								</button>
							{/each}
						{/if}
					</div>

					<div class="messagePane">
						{#if !selectedConversation}
							<div class="emptyState">
								<MessageCircle size={20} />
								<span>{text('Select a conversation', 'Chọn một hội thoại')}</span>
							</div>
						{:else}
							<div class="messageHeader">
								<button
									type="button"
									class="conversationBack"
									on:click={clearSelectedConversation}
									aria-label={text('Back to conversations', 'Quay lại hội thoại')}
								>
									<ChevronLeft size={17} />
								</button>
								<strong>{selectedConversation.otherPlayer?.name || text('Player', 'Người chơi')}</strong>
								{#if selectedConversation.conversationStatus !== 'active'}
									<span>{text('Pending', 'Đang chờ')}</span>
								{/if}
							</div>
							<div class="messageList">
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
								<Button size="icon" disabled={!messageDraft.trim() || Boolean(actionLoading)}>
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
	</Popover.Content>
</Popover.Root>

<style lang="scss">
	.socialTrigger {
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
		transition:
			background-color 0.12s ease,
			color 0.12s ease;

		&:hover {
			background: hsl(var(--accent));
			color: var(--textColor1);
		}
	}

	:global(.socialCenter) {
		width: min(720px, calc(100vw - 24px));
		max-height: min(680px, calc(100vh - 72px));
		padding: 0 10px;
		overflow: hidden;
		border-color: var(--border1);
		background: hsl(var(--popover));
		box-shadow: 0 20px 60px rgb(0 0 0 / 32%);
	}

	.socialTabs,
	.socialPanel {
		min-height: 0;
	}

	.socialHeader {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 14px;
		border-bottom: 1px solid var(--border1);

		h4,
		p {
			margin: 0;
		}

		h4 {
			font-size: 15px;
			font-weight: 700;
		}

		p {
			margin-top: 2px;
			color: var(--textColor2);
			font-size: 12px;
		}
	}

	:global(.socialTabList) {
		width: auto;
	}

	.socialPanel {
		padding: 10px;
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
		max-height: min(530px, calc(100vh - 190px));
		overflow-y: auto;
		padding-right: 2px;
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
		display: grid;
		gap: 8px;
	}

	.messageSearchResults {
		max-height: 118px;
		overflow-y: auto;
		border: 1px solid var(--border1);
		border-radius: 7px;
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
		height: min(500px, calc(100vh - 250px));
		min-height: 340px;
		display: grid;
		grid-template-columns: minmax(180px, 240px) 1fr;
		gap: 10px;
	}

	.conversationList,
	.messagePane {
		min-height: 0;
		border: 1px solid var(--border1);
		border-radius: 7px;
		overflow: hidden;
	}

	.conversationList {
		overflow-y: auto;
		padding: 4px;
	}

	.conversationItem {
		width: 100%;
		display: grid;
		gap: 4px;
		padding: 9px 8px;
		border: 0;
		border-radius: 6px;
		background: transparent;
		color: inherit;
		text-align: left;
		cursor: pointer;

		&:hover,
		&.selectedConversation {
			background: hsl(var(--accent));
		}

		strong {
			font-size: 13px;
		}

		span {
			color: var(--textColor2);
			font-size: 12px;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
	}

	.messagePane {
		display: grid;
		grid-template-rows: auto 1fr auto;
	}

	.messageHeader {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 10px;
		border-bottom: 1px solid var(--border1);
		font-size: 13px;

		span {
			color: var(--textColor2);
			font-size: 12px;
		}
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
		gap: 7px;
		padding: 10px;
	}

	.messageBubble {
		max-width: 82%;
		align-self: flex-start;
		display: grid;
		gap: 4px;
		padding: 8px 10px;
		border: 1px solid transparent;
		border-radius: 7px;
		background: hsl(var(--muted));
		color: var(--textColor);
		font-size: 13px;
		line-height: 1.35;
		overflow-wrap: anywhere;

		&.selfMessage {
			align-self: flex-end;
			background: hsl(var(--primary));
			color: hsl(var(--primary-foreground));
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
		padding: 10px;
		border-top: 1px solid var(--border1);
	}

	@media (max-width: 640px) {
		:global(.socialCenter) {
			width: calc(100vw - 16px);
			max-height: calc(100vh - 64px);
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
			height: min(590px, calc(100vh - 250px));
		}

		.conversationLayout:not(.mobileChatOpen) {
			.messagePane {
				display: none;
			}
		}

		.conversationLayout.mobileChatOpen {
			.conversationList {
				display: none;
			}
		}

		.conversationList,
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
