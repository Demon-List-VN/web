<script lang="ts">
	import {
		CalendarDays,
		Check,
		ChevronDown,
		ChevronUp,
		Layers3,
		MessageCircle,
		PencilLine,
		Search,
		Send,
		Settings2,
		Shield,
		Sparkles,
		Star,
		Swords,
		Trophy,
		X,
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
	import { toast } from 'svelte-sonner';

	const MAX_VISIBLE_FRIENDS = 12;
	const MAX_SHORTCUTS = 6;
	type ShortcutId =
		| 'find-friends'
		| 'messages'
		| 'create-post'
		| 'home'
		| 'pvp'
		| 'lists'
		| 'submit-record'
		| 'events'
		| 'tournaments'
		| 'battlepass'
		| 'clan'
		| 'supporter';
	type ShortcutDefinition = {
		id: ShortcutId;
		icon: any;
		color: string;
		label: [string, string];
	};
	const DEFAULT_SHORTCUTS: ShortcutId[] = [
		'find-friends',
		'messages',
		'create-post',
		'home',
		'pvp'
	];
	const SHORTCUTS: ShortcutDefinition[] = [
		{ id: 'find-friends', icon: UserPlus, color: 'blue', label: ['Find friends', 'Tìm bạn bè'] },
		{ id: 'messages', icon: MessageCircle, color: 'violet', label: ['Messages', 'Tin nhắn'] },
		{ id: 'create-post', icon: PencilLine, color: 'green', label: ['Create a post', 'Tạo bài viết'] },
		{ id: 'home', icon: Users, color: 'amber', label: ['Home feed', 'Bảng tin'] },
		{ id: 'pvp', icon: Swords, color: 'red', label: ['Play PvP', 'Chơi PvP'] },
		{ id: 'lists', icon: Layers3, color: 'cyan', label: ['Explore lists', 'Khám phá danh sách'] },
		{ id: 'submit-record', icon: Send, color: 'indigo', label: ['Submit record', 'Gửi kỷ lục'] },
		{ id: 'events', icon: CalendarDays, color: 'orange', label: ['Events', 'Sự kiện'] },
		{ id: 'tournaments', icon: Trophy, color: 'yellow', label: ['Tournaments', 'Giải đấu'] },
		{ id: 'battlepass', icon: Sparkles, color: 'pink', label: ['GDListHub Pass', 'GDListHub Pass'] },
		{ id: 'clan', icon: Shield, color: 'teal', label: ['My clan', 'Bang hội của tôi'] },
		{ id: 'supporter', icon: Star, color: 'gold', label: ['Premium', 'Premium'] }
	];
	const SHORTCUT_BY_ID = new Map(SHORTCUTS.map((shortcut) => [shortcut.id, shortcut]));

	let shortcutIds: ShortcutId[] = [...DEFAULT_SHORTCUTS];
	let draftShortcutIds: ShortcutId[] = [];
	let shortcutEditorOpen = false;
	let savingShortcuts = false;
	let loadedShortcutUid = '';

	$: visibleShortcuts = shortcutIds
		.map((shortcutId) => SHORTCUT_BY_ID.get(shortcutId))
		.filter((shortcut): shortcut is ShortcutDefinition => Boolean(shortcut));
	$: availableShortcuts = SHORTCUTS.filter(
		(shortcut) => !draftShortcutIds.includes(shortcut.id)
	);
	$: if ($user.data?.uid && loadedShortcutUid !== String($user.data.uid)) {
		loadedShortcutUid = String($user.data.uid);
		shortcutIds = normalizeShortcutIds($user.data?.overviewData?.homeShortcuts);
		draftShortcutIds = [...shortcutIds];
		shortcutEditorOpen = false;
	}

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
		return `https://cdn.gdlisthub.dev/avatars/${player.uid}${
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

	function normalizeShortcutIds(value: unknown): ShortcutId[] {
		if (!Array.isArray(value)) {
			return [...DEFAULT_SHORTCUTS];
		}

		const normalized = [...new Set(value)]
			.filter((shortcutId): shortcutId is ShortcutId =>
				typeof shortcutId === 'string' && SHORTCUT_BY_ID.has(shortcutId as ShortcutId)
			)
			.slice(0, MAX_SHORTCUTS);

		return normalized.length ? normalized : [...DEFAULT_SHORTCUTS];
	}

	function shortcutHref(shortcutId: ShortcutId) {
		const hrefs: Record<ShortcutId, string> = {
			'find-friends': '/social?tab=friends',
			messages: '/social?tab=conversations',
			'create-post': '/community/create',
			home: '/',
			pvp: '/versus',
			lists: '/lists',
			'submit-record': '/submit/record',
			events: '/events',
			tournaments: '/tournaments',
			battlepass: '/battlepass',
			clan: $user.data?.clan ? `/clan/${$user.data.clan}` : '/clans',
			supporter: '/supporter'
		};

		return hrefs[shortcutId];
	}

	function openShortcutEditor() {
		draftShortcutIds = [...shortcutIds];
		shortcutEditorOpen = true;
	}

	function moveShortcut(index: number, direction: -1 | 1) {
		const targetIndex = index + direction;

		if (targetIndex < 0 || targetIndex >= draftShortcutIds.length) {
			return;
		}

		const next = [...draftShortcutIds];
		[next[index], next[targetIndex]] = [next[targetIndex], next[index]];
		draftShortcutIds = next;
	}

	function removeShortcut(shortcutId: ShortcutId) {
		if (draftShortcutIds.length <= 1) {
			return;
		}

		draftShortcutIds = draftShortcutIds.filter((id) => id !== shortcutId);
	}

	function addShortcut(shortcutId: ShortcutId) {
		if (draftShortcutIds.length >= MAX_SHORTCUTS) {
			return;
		}

		draftShortcutIds = [...draftShortcutIds, shortcutId];
	}

	async function saveShortcuts() {
		if (savingShortcuts || !draftShortcutIds.length) {
			return;
		}

		savingShortcuts = true;

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/social/shortcut-settings`,
				{
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${await $user.token()}`
					},
					body: JSON.stringify({ shortcutIds: draftShortcutIds })
				}
			);

			if (!response.ok) {
				throw new Error('Failed to save shortcuts');
			}

			shortcutIds = [...draftShortcutIds];
			shortcutEditorOpen = false;
			toast.success(text('Shortcuts saved', 'Đã lưu lối tắt'));
			void $user.refresh();
		} catch {
			toast.error(text('Could not save shortcuts', 'Không thể lưu lối tắt'));
		} finally {
			savingShortcuts = false;
		}
	}
</script>

<aside class="social-right-rail" aria-label={text('Social shortcuts and contacts', 'Lối tắt xã hội và bạn bè')}>
  {#if $user.loggedIn && $user.data}
    <div class="self-player-card">
      <PlayerCard player={$user.data} active={true} />
    </div>

    <section class="rail-section shortcuts-section">
      <div class="shortcut-heading">
        <h2>{text('Your shortcuts', 'Lối tắt của bạn')}</h2>
        {#if !shortcutEditorOpen}
          <button
            type="button"
            on:click={openShortcutEditor}
            aria-label={text('Customize shortcuts', 'Tùy chỉnh lối tắt')}
            title={text('Customize shortcuts', 'Tùy chỉnh lối tắt')}
          >
            <Settings2 size={16} />
          </button>
        {/if}
      </div>

      {#if shortcutEditorOpen}
        <div class="shortcut-editor">
          <p>{text(`Choose and order up to ${MAX_SHORTCUTS} shortcuts.`, `Chọn và sắp xếp tối đa ${MAX_SHORTCUTS} lối tắt.`)}</p>
          <div class="selected-shortcuts">
            {#each draftShortcutIds as shortcutId, index (shortcutId)}
              {@const shortcut = SHORTCUT_BY_ID.get(shortcutId)}
              {#if shortcut}
                <div class="shortcut-edit-row">
                  <span class={`shortcut-icon ${shortcut.color}`}><svelte:component this={shortcut.icon} size={16} /></span>
                  <strong>{text(shortcut.label[0], shortcut.label[1])}</strong>
                  <div>
                    <button type="button" disabled={index === 0} on:click={() => moveShortcut(index, -1)} aria-label={text('Move up', 'Di chuyển lên')}><ChevronUp size={15} /></button>
                    <button type="button" disabled={index === draftShortcutIds.length - 1} on:click={() => moveShortcut(index, 1)} aria-label={text('Move down', 'Di chuyển xuống')}><ChevronDown size={15} /></button>
                    <button type="button" disabled={draftShortcutIds.length === 1} on:click={() => removeShortcut(shortcutId)} aria-label={text('Remove shortcut', 'Xóa lối tắt')}><X size={15} /></button>
                  </div>
                </div>
              {/if}
            {/each}
          </div>

          {#if availableShortcuts.length && draftShortcutIds.length < MAX_SHORTCUTS}
            <div class="available-shortcuts">
              <span>{text('Add shortcut', 'Thêm lối tắt')}</span>
              <div>
                {#each availableShortcuts as shortcut (shortcut.id)}
                  <button type="button" on:click={() => addShortcut(shortcut.id)}>
                    <svelte:component this={shortcut.icon} size={14} />
                    {text(shortcut.label[0], shortcut.label[1])}
                  </button>
                {/each}
              </div>
            </div>
          {/if}

          <div class="shortcut-editor-actions">
            <button type="button" class="cancel" disabled={savingShortcuts} on:click={() => (shortcutEditorOpen = false)}>
              {text('Cancel', 'Hủy')}
            </button>
            <button type="button" class="save" disabled={savingShortcuts} on:click={saveShortcuts}>
              <Check size={15} />
              {savingShortcuts ? text('Saving…', 'Đang lưu…') : text('Save', 'Lưu')}
            </button>
          </div>
        </div>
      {:else}
        <nav class="shortcut-list" aria-label={text('Social shortcuts', 'Lối tắt xã hội')}>
          {#each visibleShortcuts as shortcut (shortcut.id)}
            <a href={shortcutHref(shortcut.id)}>
              <span class={`shortcut-icon ${shortcut.color}`}><svelte:component this={shortcut.icon} size={17} /></span>
              <span>{text(shortcut.label[0], shortcut.label[1])}</span>
              {#if shortcut.id === 'messages' && unreadMessageCount > 0}
                <span class="unread-badge">{unreadMessageCount > 99 ? '99+' : unreadMessageCount}</span>
              {/if}
            </a>
          {/each}
        </nav>
      {/if}
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
      <h2>{text('Connect with GDListHub', 'Kết nối với GDListHub')}</h2>
      <p>{text('Sign in to see friends, messages, and community shortcuts.', 'Đăng nhập để xem bạn bè, tin nhắn và lối tắt cộng đồng.')}</p>
      <div class="guest-links">
        <a href="/">{text('Open home feed', 'Mở bảng tin')}</a>
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

.shortcut-heading {
  display: flex;
  min-height: 32px;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 4px 8px;

  > button {
    display: grid;
    width: 32px;
    height: 32px;
    place-items: center;
    border: 0;
    border-radius: 50%;
    color: hsl(var(--muted-foreground));
    background: transparent;
    cursor: pointer;

    &:hover { color: hsl(var(--foreground)); background: hsl(var(--accent) / 0.75); }
  }
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
.shortcut-icon.cyan { color: hsl(188 80% 39%); background: hsl(188 80% 45% / 0.12); }
.shortcut-icon.indigo { color: hsl(232 78% 61%); background: hsl(232 78% 61% / 0.12); }
.shortcut-icon.orange { color: hsl(24 91% 51%); background: hsl(24 91% 51% / 0.12); }
.shortcut-icon.yellow { color: hsl(43 90% 43%); background: hsl(43 90% 52% / 0.13); }
.shortcut-icon.pink { color: hsl(326 78% 56%); background: hsl(326 78% 56% / 0.12); }
.shortcut-icon.teal { color: hsl(168 70% 38%); background: hsl(168 70% 43% / 0.12); }
.shortcut-icon.gold { color: hsl(38 88% 44%); background: hsl(38 88% 50% / 0.13); }

.shortcut-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 6px;
  padding: 10px;
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  background: hsl(var(--card) / 0.72);

  > p {
    margin: 0;
    color: hsl(var(--muted-foreground));
    font-size: 10px;
    line-height: 1.45;
  }
}

.selected-shortcuts {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.shortcut-edit-row {
  display: flex;
  min-width: 0;
  min-height: 38px;
  align-items: center;
  gap: 8px;
  padding: 4px 5px;
  border-radius: 9px;
  background: hsl(var(--background) / 0.7);

  > strong {
    min-width: 0;
    flex: 1;
    overflow: hidden;
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  > div { display: flex; gap: 1px; }

  button {
    display: grid;
    width: 26px;
    height: 26px;
    place-items: center;
    border: 0;
    border-radius: 7px;
    color: hsl(var(--muted-foreground));
    background: transparent;
    cursor: pointer;

    &:hover:not(:disabled) { color: hsl(var(--foreground)); background: hsl(var(--accent)); }
    &:disabled { opacity: 0.28; cursor: default; }
  }
}

.available-shortcuts {
  display: flex;
  flex-direction: column;
  gap: 6px;

  > span {
    color: hsl(var(--muted-foreground));
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  > div { display: flex; gap: 5px; flex-wrap: wrap; }

  button {
    display: inline-flex;
    min-height: 29px;
    align-items: center;
    gap: 5px;
    padding: 0 8px;
    border: 1px solid hsl(var(--border));
    border-radius: 8px;
    color: hsl(var(--foreground));
    background: hsl(var(--background));
    font-size: 9px;
    font-weight: 700;
    cursor: pointer;

    &:hover { border-color: hsl(205 90% 48% / 0.55); }
  }
}

.shortcut-editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  padding-top: 2px;

  button {
    display: inline-flex;
    min-height: 32px;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 0 11px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 800;
    cursor: pointer;

    &:disabled { opacity: 0.55; cursor: wait; }
  }

  .cancel { border: 1px solid hsl(var(--border)); color: hsl(var(--foreground)); background: transparent; }
  .save { border: 1px solid hsl(205 90% 44%); color: white; background: hsl(205 90% 44%); }
}

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
