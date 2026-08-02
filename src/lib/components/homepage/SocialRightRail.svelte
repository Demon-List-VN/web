<script lang="ts">
	import {
		MessageCircle,
		PencilLine,
		Search,
		Swords,
		UserPlus,
		UserRound,
		Users
	} from 'lucide-svelte';
	import { locale } from 'svelte-i18n';
	import { user } from '$lib/client';
	import { isActive } from '$lib/client/isSupporterActive';
	import {
		conversationsStore,
		friendsStore,
		socialFriendsLoadState
	} from '$lib/client/socialCache';
	import type { SocialPlayer } from '$lib/client/social';
	import * as Avatar from '$lib/components/ui/avatar';
	import PlayerCard from '$lib/components/playerCard.svelte';

	const MAX_VISIBLE_FRIENDS = 12;

	$: unreadMessageCount = $conversationsStore.reduce(
		(total, conversation) => total + Math.max(0, Number(conversation.unreadCount || 0)),
		0
	);
	$: visibleFriends = [...$friendsStore]
		.sort((left, right) => {
			const leftPlaying = left.socialActivity?.activity?.type === 'pvp_match' ? 1 : 0;
			const rightPlaying = right.socialActivity?.activity?.type === 'pvp_match' ? 1 : 0;

			return rightPlaying - leftPlaying || left.name.localeCompare(right.name);
		})
		.slice(0, MAX_VISIBLE_FRIENDS);

	function text(english: string, vietnamese: string) {
		return $locale === 'vi' ? vietnamese : english;
	}

	function playerAvatar(player: SocialPlayer) {
		return `https://cdn.gdvn.net/avatars/${player.uid}${
			isActive(player.supporterUntil ?? null) && player.isAvatarGif
				? '.gif'
				: '.jpg'
		}?version=${player.avatarVersion || 0}`;
	}

	function activityLabel(player: SocialPlayer) {
		return player.socialActivity?.activity?.type === 'pvp_match'
			? text('In a PvP match', 'Đang đấu PvP')
			: text('Friend', 'Bạn bè');
	}
</script>

<aside class="social-right-rail" aria-label={text('Social shortcuts and contacts', 'Lối tắt xã hội và bạn bè')}>
  {#if $user.loggedIn && $user.data}
    <div class="self-player-card">
      <PlayerCard player={$user.data} active={true} />
    </div>

    <section class="rail-section shortcuts-section">
      <h2>{text('Your shortcuts', 'Lối tắt của bạn')}</h2>
      <nav class="shortcut-list" aria-label={text('Social shortcuts', 'Lối tắt xã hội')}>
        <a href="/social?tab=friends">
          <span class="shortcut-icon blue"><UserPlus size={17} /></span>
          <span>{text('Find friends', 'Tìm bạn bè')}</span>
        </a>
        <a href="/social?tab=conversations">
          <span class="shortcut-icon violet"><MessageCircle size={17} /></span>
          <span>{text('Messages', 'Tin nhắn')}</span>
          {#if unreadMessageCount > 0}
            <span class="unread-badge">{unreadMessageCount > 99 ? '99+' : unreadMessageCount}</span>
          {/if}
        </a>
        <a href="/community/create">
          <span class="shortcut-icon green"><PencilLine size={17} /></span>
          <span>{text('Create a post', 'Tạo bài viết')}</span>
        </a>
        <a href="/community">
          <span class="shortcut-icon amber"><Users size={17} /></span>
          <span>{text('Community', 'Cộng đồng')}</span>
        </a>
        <a href="/versus">
          <span class="shortcut-icon red"><Swords size={17} /></span>
          <span>{text('Play PvP', 'Chơi PvP')}</span>
        </a>
      </nav>
    </section>

    <section class="rail-section contacts-section">
      <div class="section-heading">
        <h2>{text('Contacts', 'Bạn bè')}</h2>
        <div class="heading-actions">
          <a
            href="/social?tab=friends"
            aria-label={text('Search players', 'Tìm người chơi')}
            title={text('Search players', 'Tìm người chơi')}
          >
            <Search size={17} />
          </a>
          <a
            href="/social?tab=conversations"
            aria-label={text('Open messages', 'Mở tin nhắn')}
            title={text('Open messages', 'Mở tin nhắn')}
          >
            <MessageCircle size={17} />
          </a>
        </div>
      </div>

      {#if $socialFriendsLoadState === 'idle' || $socialFriendsLoadState === 'loading'}
        <div class="contact-list" aria-label={text('Loading contacts', 'Đang tải bạn bè')}>
          {#each { length: 5 } as _}
            <div class="contact-skeleton" aria-hidden="true">
              <span class="skeleton-avatar"></span>
              <span class="skeleton-copy"></span>
            </div>
          {/each}
        </div>
      {:else if visibleFriends.length === 0}
        <div class="empty-contacts">
          <Users size={22} />
          <p>{text('Your friends will appear here.', 'Bạn bè của bạn sẽ xuất hiện ở đây.')}</p>
          <a href="/social?tab=friends">
            {text('Find players', 'Tìm người chơi')}
          </a>
        </div>
      {:else}
        <div class="contact-list">
          {#each visibleFriends as friend (friend.uid)}
            <div class="contact-row">
              <a
                class="contact-main"
                href={`/social?tab=conversations&uid=${encodeURIComponent(friend.uid)}`}
                aria-label={text(`Message ${friend.name}`, `Nhắn tin cho ${friend.name}`)}
              >
                <span class="contact-avatar-wrap">
                  <Avatar.Root class="rail-avatar contact-avatar">
                    <Avatar.Image
                      class="object-cover"
                      src={playerAvatar(friend)}
                      alt={friend.name}
                    />
                    <Avatar.Fallback>{friend.name?.[0] || '?'}</Avatar.Fallback>
                  </Avatar.Root>
                  <span
                    class:playing={friend.socialActivity?.activity?.type === 'pvp_match'}
                    class="activity-dot"
                  ></span>
                </span>
                <span class="contact-copy">
                  <strong>{friend.name}</strong>
                  <small>{activityLabel(friend)}</small>
                </span>
              </a>
              <a
                class="profile-action"
                href={`/player/${friend.uid}`}
                aria-label={text(`View ${friend.name}'s profile`, `Xem trang của ${friend.name}`)}
                title={text('View profile', 'Xem trang cá nhân')}
              >
                <UserRound size={16} />
              </a>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  {:else}
    <section class="guest-social">
      <span class="guest-icon"><Users size={22} /></span>
      <h2>{text('Connect with GDVN', 'Kết nối với GDVN')}</h2>
      <p>{text('Sign in to see friends, messages, and community shortcuts.', 'Đăng nhập để xem bạn bè, tin nhắn và lối tắt cộng đồng.')}</p>
      <div class="guest-links">
        <a href="/community">{text('Browse community', 'Xem cộng đồng')}</a>
        <a href="/versus">{text('Explore PvP', 'Khám phá PvP')}</a>
      </div>
    </section>
  {/if}
</aside>

<style lang="scss">
.social-right-rail {
  width: 100%;
  max-height: calc(100vh - 92px);
  padding: 2px 4px 20px;
  overflow-y: auto;
  color: hsl(var(--foreground));
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--border)) transparent;
}

.shortcut-list a,
.contact-main,
.profile-action,
.heading-actions a {
  color: inherit;
  text-decoration: none;
}

.shortcut-list a:hover,
.contact-row:hover,
.heading-actions a:hover,
.profile-action:hover {
  background: hsl(var(--accent) / 0.75);
}

:global(.rail-avatar) {
  flex: 0 0 auto;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--muted));
}

.contact-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.contact-copy strong {
  overflow: hidden;
  font-size: 13px;
  font-weight: 720;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.contact-copy small {
  overflow: hidden;
  color: hsl(var(--muted-foreground));
  font-size: 11px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.self-player-card {
  margin: 0 4px 16px;
}

.self-player-card :global(.playerCardRoot) {
  border-radius: 14px;
}

.rail-section {
  padding: 14px 0;
  border-top: 1px solid hsl(var(--border) / 0.85);
}

.rail-section h2,
.guest-social h2 {
  margin: 0;
  color: hsl(var(--muted-foreground));
  font-size: 13px;
  font-weight: 750;
  letter-spacing: 0.01em;
}

.shortcut-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 8px;
}

.shortcut-list a {
  display: flex;
  width: 100%;
  min-height: 42px;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  font-size: 13px;
  font-weight: 650;
  text-align: left;
  cursor: pointer;
}

.shortcut-icon {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  place-items: center;
  border-radius: 9px;
}

.shortcut-icon.blue { color: hsl(205 90% 46%); background: hsl(205 90% 48% / 0.12); }
.shortcut-icon.violet { color: hsl(263 76% 60%); background: hsl(263 76% 60% / 0.12); }
.shortcut-icon.green { color: hsl(151 66% 41%); background: hsl(151 66% 41% / 0.12); }
.shortcut-icon.amber { color: hsl(36 90% 48%); background: hsl(36 90% 48% / 0.12); }
.shortcut-icon.red { color: hsl(2 74% 56%); background: hsl(2 74% 56% / 0.12); }

.unread-badge {
  min-width: 20px;
  margin-left: auto;
  padding: 2px 6px;
  border-radius: 999px;
  background: hsl(205 90% 48%);
  color: white;
  font-size: 10px;
  font-weight: 800;
  text-align: center;
}

.section-heading {
  display: flex;
  min-height: 32px;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 4px 8px;
}

.heading-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.heading-actions a,
.profile-action {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
}

.contact-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.contact-row {
  display: flex;
  min-height: 50px;
  align-items: center;
  padding: 4px;
  border-radius: 10px;
}

.contact-main {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 10px;
  padding: 0 4px;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.contact-avatar-wrap {
  position: relative;
  flex: 0 0 38px;
}

:global(.contact-avatar) {
  width: 38px;
  height: 38px;
}

.activity-dot {
  position: absolute;
  right: -1px;
  bottom: 0;
  width: 10px;
  height: 10px;
  border: 2px solid hsl(var(--background));
  border-radius: 50%;
  background: hsl(var(--muted-foreground) / 0.48);
}

.activity-dot.playing {
  background: hsl(145 68% 43%);
}

.profile-action {
  flex: 0 0 32px;
  color: hsl(var(--muted-foreground));
  opacity: 0;
}

.contact-row:hover .profile-action,
.profile-action:focus-visible {
  opacity: 1;
}

.contact-skeleton {
  display: flex;
  min-height: 50px;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
}

.skeleton-avatar,
.skeleton-copy {
  display: block;
  background:
    linear-gradient(100deg, transparent 20%, hsl(var(--background) / 0.62) 42%, transparent 64%),
    hsl(var(--muted));
  background-size: 220% 100%;
  animation: rail-shimmer 1.35s linear infinite;
}

.skeleton-avatar {
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  border-radius: 50%;
}

.skeleton-copy {
  width: 54%;
  height: 11px;
  border-radius: 999px;
}

.empty-contacts,
.guest-social {
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 24px 18px;
  border: 1px solid hsl(var(--border) / 0.85);
  border-radius: 13px;
  background: hsl(var(--card) / 0.68);
  text-align: center;
}

.empty-contacts {
  color: hsl(var(--muted-foreground));
}

.empty-contacts p,
.guest-social p {
  margin: 8px 0 12px;
  color: hsl(var(--muted-foreground));
  font-size: 12px;
  line-height: 1.5;
}

.empty-contacts a,
.guest-links a {
  border: 0;
  background: transparent;
  color: hsl(205 90% 48%);
  font-size: 12px;
  font-weight: 750;
  text-decoration: none;
  cursor: pointer;
}

.guest-icon {
  display: grid;
  width: 44px;
  height: 44px;
  margin-bottom: 10px;
  place-items: center;
  border-radius: 50%;
  background: hsl(205 90% 48% / 0.12);
  color: hsl(205 90% 48%);
}

.guest-links {
  display: flex;
  align-items: center;
  gap: 14px;
}

@keyframes rail-shimmer {
  from { background-position: 130% 0; }
  to { background-position: -90% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-avatar,
  .skeleton-copy {
    animation: none;
  }
}
</style>
