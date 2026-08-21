<script lang="ts">
	import { locale } from 'svelte-i18n';
	import { PencilLine } from 'lucide-svelte';
	import { user } from '$lib/client';
	import { isActive } from '$lib/client/isSupporterActive';
	import * as Avatar from '$lib/components/ui/avatar';
	import ClanTag from '$lib/components/clan/ClanTag.svelte';

	export let clan: any = null;

	function text(english: string, vietnamese: string) {
		return $locale === 'vi' ? vietnamese : english;
	}

	function avatarUrl(player: any) {
		return `https://cdn.gdlisthub.dev/avatars/${player.uid}${
			isActive(player.supporterUntil) && player.isAvatarGif ? '.gif' : '.jpg'
		}?version=${player.avatarVersion || 0}`;
	}
</script>

<a
  class="quick-post"
  href={clan ? `/community/create?clanId=${clan.id}` : '/community/create'}
  aria-label={clan
    ? text(`Create a post in ${clan.name}`, `Tạo bài viết trong ${clan.name}`)
    : text('Create a new post', 'Tạo bài viết mới')}
>
  {#if !$user.checked}
    <span class="composer-avatar skeleton" aria-hidden="true"></span>
  {:else if $user.loggedIn && $user.data}
    <Avatar.Root class="composer-avatar">
      <Avatar.Image
        class="object-cover"
        src={avatarUrl($user.data)}
        alt=""
      />
      <Avatar.Fallback>{$user.data.name?.[0] || '?'}</Avatar.Fallback>
    </Avatar.Root>
  {:else}
    <span class="composer-avatar guest-avatar" aria-hidden="true">
      <PencilLine size={19} />
    </span>
  {/if}

  <span class="composer-prompt">
    {#if clan}
      <strong class="clan-prompt">{text('Post to', 'Đăng vào')} <ClanTag {clan} compact /></strong>
    {:else}
      <strong>{text("What's happening?", 'Bạn đang nghĩ gì?')}</strong>
    {/if}
    <small>{clan ? text('Share with your clan', 'Chia sẻ với bang hội') : text('Create a community post', 'Tạo bài viết cộng đồng')}</small>
  </span>
  <span class="post-button">{text('Post', 'Đăng')}</span>
</a>

<style lang="scss">
.quick-post {
  display: flex;
  min-height: 82px;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding: 16px;
  border: 1px solid var(--feed-border, hsl(var(--border)));
  border-radius: 14px;
  background: hsl(var(--card));
  box-shadow: 0 4px 18px hsl(222 40% 2% / 0.035);
  color: hsl(var(--foreground));
  text-decoration: none;
}

:global(.composer-avatar),
.composer-avatar {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  place-items: center;
  border: 1px solid hsl(var(--border));
  border-radius: 50%;
  background: hsl(var(--muted));
}

.guest-avatar {
  border-color: transparent;
  background: hsl(199 89% 48% / 0.12);
  color: hsl(199 89% 48%);
}

.composer-prompt {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;

  strong {
    overflow: hidden;
    font-size: 15px;
    font-weight: 650;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .clan-prompt {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  small {
    color: hsl(var(--muted-foreground));
    font-size: 11px;
  }
}

.post-button {
  display: inline-flex;
  min-width: 72px;
  min-height: 34px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  border: 1px solid #fff;
  border-radius: 999px;
  background: #fff;
  color: #0b0f19;
  font-size: 12px;
  font-weight: 850;
}

.skeleton {
  background:
    linear-gradient(100deg, transparent 20%, hsl(var(--background) / 0.62) 42%, transparent 64%),
    hsl(var(--muted));
  background-size: 220% 100%;
  animation: composer-shimmer 1.35s linear infinite;
}

@keyframes composer-shimmer {
  from { background-position: 130% 0; }
  to { background-position: -90% 0; }
}

@media (max-width: 640px) {
  .quick-post {
    margin: 0 0 8px;
    padding: 14px;
    border-right: 0;
    border-left: 0;
    border-radius: 0;
  }

  .composer-prompt small {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
  }
}
</style>
