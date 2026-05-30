<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { user } from '$lib/client';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import PlayerSelector from '$lib/components/playerSelector.svelte';
	import MatchCard from '$lib/components/pvp/MatchCard.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import {
		getPvpMatchId,
		getPvpRoom,
		getPvpRoomMessages,
		invitePvpRoomPlayer,
		joinPvpRoom,
		kickPvpRoomMember,
		leavePvpRoom,
		sendPvpRoomMessage,
		startPvpRoomMatch,
		type PvpRoom,
		type PvpRoomMessage
	} from '$lib/client/pvp';
	import {
		setPvpRealtimeAuth,
		subscribeToPvpRoom
	} from '$lib/client/pvpRealtime';
	import { resolvePvpRankBadge } from '$lib/utils/pvpRank';
	import { onDestroy } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { _ } from 'svelte-i18n';
	import {
		ArrowLeft,
		Copy,
		Crown,
		Loader2,
		LogIn,
		Send,
		Swords,
		UserMinus,
		Users
	} from 'lucide-svelte';

	const MESSAGE_FETCH_LIMIT = 100;
	const REALTIME_COALESCE_MS = 200;

	let room: PvpRoom | null = null;
	let messages: PvpRoomMessage[] = [];
	let selectedInvitePlayer: any = null;
	let chatDraft = '';
	let startLevelId = '';
	let startTimeLimitMinutes = 15;
	let completionRuleType: 'count' | 'percentage' = 'count';
	let completionRuleValue = 1;
	let loading = false;
	let messagesLoading = false;
	let actionLoading = '';
	let initializedFor = '';
	let cleanupRealtime: (() => Promise<void>) | null = null;
	let scheduledRefresh: ReturnType<typeof setTimeout> | null = null;

	$: roomId = $page.params.id;
	$: inviteToken = $page.url.searchParams.get('token');
	$: currentUid = $user.data?.uid;
	$: isHost = room?.viewerRole === 'host';
	$: isMember = room?.viewerRole === 'host' || room?.viewerRole === 'member';
	$: activeMatchId = getPvpMatchId(room?.activeMatch);
	$: memberCount = room?.activeMemberCount ?? room?.memberCount ?? room?.members?.length ?? 0;
	$: startDisabled = Boolean(actionLoading)
		|| !isHost
		|| !startLevelId.trim()
		|| memberCount < 2;

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

			cleanupRealtime = subscribeToPvpRoom(id, () => {
				scheduleRefresh();
			});
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
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : $_('pvp.rooms.chat_send_failed')
			);
		} finally {
			actionLoading = '';
		}
	}

	async function startMatch() {
		const id = roomId;

		if (!id) {
			return;
		}

		actionLoading = 'start-match';

		try {
			const match = await startPvpRoomMatch(await $user.token(), id, {
				levelId: startLevelId.trim(),
				timeLimitMinutes: startTimeLimitMinutes,
				completionRuleType,
				completionRuleValue
			});

			goto(`/versus/matches/${getPvpMatchId(match)}`);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : $_('pvp.rooms.start_failed')
			);
		} finally {
			actionLoading = '';
		}
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
  <title>{room?.name ?? $_('pvp.rooms.room')} | GDDP</title>
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
          <a href={`/versus/matches/${activeMatchId}`}>{$_('pvp.enter_match')}</a>
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
        <Card.Root>
          <Card.Header>
            <Card.Title>{$_('pvp.rooms.members')}</Card.Title>
            <Card.Description>{memberCount} {$_('pvp.rooms.players')}</Card.Description>
          </Card.Header>
          <Card.Content class="member-list">
            {#each room.members ?? [] as member}
              <div class="member-row">
                <div class="member-identity">
                  {#if member.player?.uid}
                    <PlayerLink
                      player={member.player}
                      rankBadge={resolvePvpRankBadge(member.player)}
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
                  {#if member.uid === currentUid}
                    <Badge variant="secondary">{$_('pvp.you')}</Badge>
                  {/if}
                </div>
                {#if isHost && member.uid !== currentUid}
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={Boolean(actionLoading)}
                    on:click={() => kickMember(member.uid)}
                  >
                    {#if actionLoading === `kick-${member.uid}`}
                      <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                    {:else}
                      <UserMinus class="mr-2 h-4 w-4" />
                    {/if}
                    {$_('pvp.rooms.kick')}
                  </Button>
                {/if}
              </div>
            {/each}
          </Card.Content>
        </Card.Root>

        {#if isMember}
          <Card.Root>
            <Card.Header>
              <Card.Title>{$_('pvp.rooms.chat')}</Card.Title>
            </Card.Header>
            <Card.Content class="chat-panel">
              <div class="message-list">
                {#if messagesLoading && messages.length === 0}
                  <div class="empty-state">{$_('general.loading')}</div>
                {:else if messages.length === 0}
                  <div class="empty-state">{$_('pvp.rooms.no_messages')}</div>
                {:else}
                  {#each messages as message}
                    <div class:system-message={message.type === 'system'} class="message-row">
                      <strong>{messageSender(message)}</strong>
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
        {/if}
      </section>

      <aside class="room-side">
        {#if isHost}
          <Card.Root>
            <Card.Header>
              <Card.Title>{$_('pvp.rooms.start_match')}</Card.Title>
            </Card.Header>
            <Card.Content class="start-form">
              <Input
                bind:value={startLevelId}
                inputmode="numeric"
                placeholder={$_('pvp.rooms.level_id')}
              />
              <Input
                bind:value={startTimeLimitMinutes}
                min="1"
                max="120"
                type="number"
                placeholder={$_('pvp.rooms.time_limit')}
              />
              <div class="completion-toggle">
                <button
                  type="button"
                  class:active={completionRuleType === 'count'}
                  on:click={() => (completionRuleType = 'count')}
                >
                  {$_('pvp.rooms.rule_count')}
                </button>
                <button
                  type="button"
                  class:active={completionRuleType === 'percentage'}
                  on:click={() => (completionRuleType = 'percentage')}
                >
                  {$_('pvp.rooms.rule_percentage')}
                </button>
              </div>
              <Input
                bind:value={completionRuleValue}
                min="1"
                max={completionRuleType === 'percentage' ? 100 : memberCount}
                type="number"
              />
              <Button disabled={startDisabled} on:click={startMatch}>
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

        <Card.Root>
          <Card.Header>
            <Card.Title>{$_('pvp.rooms.history')}</Card.Title>
          </Card.Header>
          <Card.Content class="history-list">
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
          </Card.Content>
        </Card.Root>
      </aside>
    </div>
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
  grid-template-columns: minmax(0, 1fr) 360px;
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
:global(.history-list) {
  display: grid;
  gap: 14px;
}

.room-section {
  margin-bottom: 20px;
}

.member-row {
  min-height: 44px;
  border-bottom: 1px solid hsl(var(--border));
  padding-bottom: 10px;
}

.member-row:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.member-identity {
  min-width: 0;
  flex-wrap: wrap;
}

.message-list {
  max-height: 420px;
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
  :global(.auth-content) {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
