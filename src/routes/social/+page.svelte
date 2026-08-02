<script lang="ts">
	import { page } from '$app/stores';
	import { locale } from 'svelte-i18n';
	import { LockKeyhole } from 'lucide-svelte';
	import { user } from '$lib/client';
	import SocialButton from '$lib/components/SocialButton.svelte';

	$: requestedTab = $page.url.searchParams.get('tab') === 'conversations'
		? 'conversations'
		: $page.url.searchParams.get('tab') === 'friends'
		? 'friends'
		: 'conversations';
	$: messageTargetUid = $page.url.searchParams.get('uid') || '';

	function text(english: string, vietnamese: string) {
		return $locale === 'vi' ? vietnamese : english;
	}
</script>

<svelte:head>
  <title>{text('Social · GDVN', 'Xã hội · GDVN')}</title>
  <meta
    name="description"
    content={text('Find friends, chat, invite players to PvP, and manage your GDVN social presence.', 'Tìm bạn bè, trò chuyện, mời người chơi PvP và quản lý trạng thái xã hội GDVN.')}
  />
</svelte:head>

<main class="social-page">
  {#if !$user.checked}
    <div class="social-page-skeleton" aria-label={text('Loading social', 'Đang tải trang xã hội')}>
      <span class="skeleton-heading"></span>
      <span class="skeleton-panel"></span>
    </div>
  {:else if $user.loggedIn}
    <SocialButton
      pageMode={true}
      initialTab={requestedTab}
      {messageTargetUid}
    />
  {:else}
    <section class="sign-in-state">
      <span><LockKeyhole size={24} /></span>
      <h2>{text('Sign in to connect', 'Đăng nhập để kết nối')}</h2>
      <p>{text('Use the sign-in button in the top bar to access friends and messages.', 'Dùng nút đăng nhập trên thanh trên cùng để truy cập bạn bè và tin nhắn.')}</p>
      <a href="/community">{text('Browse the community', 'Xem cộng đồng')}</a>
    </section>
  {/if}
</main>

<style lang="scss">
.social-page {
  width: 100%;
  min-height: calc(100vh - 56px);
  margin: 0;
  padding: 0;
}

.sign-in-state h2,
.sign-in-state p {
  margin: 0;
}

.social-page-skeleton {
  display: flex;
  min-height: calc(100vh - 92px);
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  background: hsl(var(--card));
}

.skeleton-heading,
.skeleton-panel {
  display: block;
  background:
    linear-gradient(100deg, transparent 20%, hsl(var(--background) / 0.64) 42%, transparent 64%),
    hsl(var(--muted));
  background-size: 220% 100%;
  animation: social-shimmer 1.35s linear infinite;
}

.skeleton-heading {
  width: 34%;
  height: 32px;
  border-radius: 8px;
}

.skeleton-panel {
  min-height: 460px;
  border-radius: 12px;
}

.sign-in-state {
  display: flex;
  min-height: 360px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 32px;
  background: hsl(var(--card));
  text-align: center;
}

.sign-in-state > span {
  display: grid;
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  place-items: center;
  border-radius: 50%;
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
}

.sign-in-state h2 {
  font-size: 18px;
}

.sign-in-state p {
  max-width: 430px;
  margin-top: 8px;
  color: hsl(var(--muted-foreground));
  font-size: 13px;
  line-height: 1.55;
}

.sign-in-state a {
  margin-top: 16px;
  color: hsl(205 90% 48%);
  font-size: 13px;
  font-weight: 750;
  text-decoration: none;
}

@keyframes social-shimmer {
  from { background-position: 130% 0; }
  to { background-position: -90% 0; }
}

@media (max-width: 640px) {
  .social-page {
    width: 100%;
    padding: 0;
  }

}

@media (prefers-reduced-motion: reduce) {
  .skeleton-heading,
  .skeleton-panel {
    animation: none;
  }
}
</style>
