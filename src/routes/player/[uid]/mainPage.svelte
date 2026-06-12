<script lang="ts">
	import type { PageData } from './$types';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Tabs from '$lib/components/ui/tabs';
	import Ads from '$lib/components/ads.svelte';
	import AvatarFrame from '$lib/components/AvatarFrame.svelte';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import PlayerLevelBadge from '$lib/components/PlayerLevelBadge.svelte';
	import { isActive } from '$lib/client/isSupporterActive';
	import { _ } from 'svelte-i18n';
	import OverviewTab from './tabs/OverviewTab/index.svelte';
	import ProfileHero from './components/ProfileHero.svelte';
	import RecordsTab from './components/RecordsTab.svelte';
	import ActivityTab from './components/ActivityTab.svelte';
	import CollectionTab from './components/CollectionTab.svelte';
	import {
		bannerImageUrl,
		getEquippedFrame,
		getEquippedTheme,
		getProfileThemeVariables
	} from '$lib/client/cosmetics';

	export let data: PageData;

	let isBannerFailedToLoad = false;
	let bannerUid = '';

	$: player = data.player;
	$: if (player?.uid !== bannerUid) {
		bannerUid = player?.uid || '';
		isBannerFailedToLoad = false;
	}
	$: equippedFrame = getEquippedFrame(player);
	$: equippedTheme = getEquippedTheme(player);
	$: hasBannerImage = Boolean(equippedTheme) && !isBannerFailedToLoad;
	$: profileThemeStyle = getProfileThemeVariables(equippedTheme);
	$: avatarSrc = `https://cdn.gdvn.net/avatars/${player.uid}${
		isActive(player.supporterUntil) && player.isAvatarGif ? '.gif' : '.jpg'
	}?version=${player.avatarVersion ?? 0}`;
</script>

<svelte:head>
  <title>{data.player.name} - {$_('head.site_name')}</title>
  <meta
    property="og:title"
    content={`${data.player.name} - ${$_('head.site_name')}`}
  />
  <meta
    property="og:description"
    content={data.selectedList
    ? `${data.selectedList.title}: ${
        Math.round(data.selectedList.score * 10) / 10
    } #${data.selectedList.rank}\n${
        $_('head.labels.records')
    }: ${data.selectedList.completedCount}\n${
        $_('head.labels.contest_rating')
    }: ${data.player.elo}`
    : `${
        $_('head.labels.classic_rating')
    }: ${data.player.rating} #${data.player.overallRank}\n${
        $_('head.labels.featured_list_points')
    }: ${data.player.totalFLpt} #${data.player.flrank}\n${
        $_('head.labels.contest_rating')
    }: ${data.player.elo}`}
  />
  <meta
    property="og:image"
    content={`https://cdn.gdvn.net/avatars/${data.player.uid}${
        isActive(data.player.supporterUntil) && data.player.isAvatarGif
            ? '.gif'
            : '.jpg'
    }?version=${data.player.avatarVersion}`}
  />
</svelte:head>

{#if data.player.isBanned}
  <div class="relative z-50 flex h-[50px] items-center justify-center bg-red-600">
    {$_('player.banned_notice')}
  </div>
{:else if data.player.isHidden}
  <div class="relative z-50 flex h-[50px] items-center justify-center bg-yellow-600">
    {$_('player.hidden_notice')}
  </div>
{/if}

<div
  class="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8"
  style={profileThemeStyle}
>
  <section
    class="profile-banner relative mb-6 min-h-[180px] overflow-hidden rounded-lg border bg-card sm:aspect-[6/1] sm:min-h-0"
  >
    {#if hasBannerImage && equippedTheme}
      <img
        class="absolute inset-0 h-full w-full object-cover"
        src={bannerImageUrl(equippedTheme)}
        alt=""
        on:error={() => {
            isBannerFailedToLoad = true;
        }}
      />
    {/if}

    <div
      class={`absolute inset-x-0 bottom-0 flex items-end gap-4 px-5 pb-5 pt-16 sm:px-7 sm:pb-6 ${
          hasBannerImage
              ? 'bg-gradient-to-t from-black/70 via-black/25 to-transparent text-white'
              : 'text-card-foreground'
      }`}
    >
      <span class="profile-banner-avatar-frame">
        <AvatarFrame frame={equippedFrame}>
          <Avatar.Root class="profile-banner-avatar">
            <Avatar.Image class="object-cover" src={avatarSrc} alt={player.name} />
            <Avatar.Fallback class="text-3xl font-bold">
              {player.name?.trim()?.[0]?.toUpperCase() ?? '?'}
            </Avatar.Fallback>
          </Avatar.Root>
        </AvatarFrame>
        <PlayerLevelBadge {player} size="lg" />
      </span>

      <div class="min-w-0 pb-1 text-xl font-bold sm:text-2xl">
        <PlayerLink {player} large />
      </div>
    </div>
  </section>

  <div class="grid min-w-0 gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
    <aside
      class="min-w-0 lg:sticky lg:top-[72px] lg:max-h-[calc(100vh-88px)] lg:overflow-y-auto lg:pr-1"
    >
      <ProfileHero bind:data />
    </aside>

    <main class="min-w-0">
      {#if !isActive(data.player.supporterUntil)}
        <div class="pb-4">
          <Ads dataAdFormat="auto" />
        </div>
      {/if}

      <Tabs.Root value="overview">
        <div class="flex min-w-0 flex-col gap-4">
          <div class="w-full overflow-x-auto pb-1">
            <Tabs.List class="flex h-fit w-max min-w-max flex-nowrap">
              <Tabs.Trigger value="overview">{
                $_('player.tabs.overview')
              }</Tabs.Trigger>
              <Tabs.Trigger value="records">{
                $_('player.tabs.records')
              }</Tabs.Trigger>
              <Tabs.Trigger value="activity">{
                $_('player.tabs.activity')
              }</Tabs.Trigger>
              <Tabs.Trigger value="collection">{
                $_('player.tabs.collection')
              }</Tabs.Trigger>
            </Tabs.List>
          </div>

          <Tabs.Content value="overview" class="min-w-0 w-full">
            <OverviewTab {data} />
          </Tabs.Content>

          <Tabs.Content value="records" class="min-w-0 w-full">
            <RecordsTab bind:data />
          </Tabs.Content>

          <Tabs.Content value="activity" class="min-w-0 w-full">
            <ActivityTab userID={data.player.uid} />
          </Tabs.Content>

          <Tabs.Content value="collection" class="min-w-0 w-full">
            <CollectionTab userID={data.player.uid} {data} />
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </main>
  </div>
</div>

<style>
  .profile-banner-avatar-frame {
    position: relative;
    display: inline-flex;
    flex: none;
  }

  :global(.profile-banner-avatar) {
    width: 96px;
    height: 96px;
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.28);
  }

  @media (min-width: 640px) {
    :global(.profile-banner-avatar) {
      width: 112px;
      height: 112px;
    }
  }
</style>
