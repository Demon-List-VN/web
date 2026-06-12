<script lang="ts">
	import { browser } from '$app/environment';
	import * as Avatar from '$lib/components/ui/avatar';
	import { badgeVariants } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';
	import { user } from '$lib/client';
	import { isActive } from '$lib/client/isSupporterActive';
	import {
		getSocialActivity,
		getSocialStatus,
		sendFriendRequest,
		type SocialActivity,
		type SocialStatus
	} from '$lib/client/social';
	import {
		socialPresenceLabel,
		subscribeToSocialPresence,
		type AggregatedSocialPresence
	} from '$lib/client/socialPresence';
	import PlayerCard from '$lib/components/playerCard.svelte';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import ProfileEditButton from '$lib/components/profileEditButton.svelte';
	import SupporterTierProgress from '$lib/components/SupporterTierProgress.svelte';
	import {
		BadgeCheck,
		Clock,
		Copy,
		Eye,
		MapPin,
		UserCheck,
		UserPlus
	} from 'lucide-svelte';
	import { _, locale } from 'svelte-i18n';
	import { onDestroy } from 'svelte';

	export let data: any;

	let socialStatus: SocialStatus = 'none';
	let socialActivity: SocialActivity | null = null;
	let socialPresence: AggregatedSocialPresence | null = null;
	let socialStatusKey = '';
	let socialActivityKey = '';
	let presenceKey = '';
	let addingFriend = false;
	let cleanupPresence: (() => Promise<unknown>) | null = null;

	$: player = data.player;
	$: isSupporter = isActive(player.supporterUntil);
	$: avatarSrc = `https://cdn.gdvn.net/avatars/${player.uid}${
		isSupporter && player.isAvatarGif ? '.gif' : '.jpg'
	}?version=${player.avatarVersion ?? 0}`;
	$: showFriendButton = browser && $user.loggedIn && player.uid
		&& player.uid !== $user.data?.uid;
	$: showPresenceStatus = browser && player.uid && player.uid !== $user.data?.uid;
	$: friendButtonDisabled = addingFriend
		|| !['none'].includes(socialStatus);
	$: friendButtonLabel = socialStatus === 'friend'
		? 'Friends'
		: socialStatus === 'outgoing_pending'
		? 'Request sent'
		: socialStatus === 'incoming_pending'
		? 'Requested you'
		: socialStatus === 'blocked_by_me'
		? 'Blocked'
		: socialStatus === 'blocked_me'
		? 'Unavailable'
		: 'Add friend';
	$: hasProfileDetails = player.isTrusted
		|| Boolean(player.province);
	$: hasSocialLinks = Boolean(
		player.youtube || player.facebook || player.discord
	);
	$: if (showFriendButton) {
		const nextKey = `${$user.data?.uid}:${player.uid}`;

		if (nextKey !== socialStatusKey) {
			socialStatusKey = nextKey;
			loadSocialStatus();
		}
	} else if (!showFriendButton && socialStatusKey) {
		socialStatusKey = '';
		socialStatus = 'none';
	}
	$: if (browser && player.uid && player.uid !== socialActivityKey) {
		socialActivityKey = player.uid;
		loadSocialActivity();
	}
	$: if (browser && player.uid && player.uid !== presenceKey) {
		presenceKey = player.uid;
		cleanupPresence?.();
		cleanupPresence = subscribeToSocialPresence([player.uid], (value) => {
			socialPresence = value[player.uid] ?? null;
		});
	}
	$: showSpectate = socialStatus === 'friend'
		&& Boolean(socialActivity?.canSpectate)
		&& socialActivity?.presenceVisible !== false
		&& Boolean(socialActivity?.activity?.matchId)
		&& Boolean(socialPresence?.online);
	$: socialLine = socialActivity?.presenceVisible === false
		? text('Offline', 'Ngoại tuyến')
		: socialActivity?.activity?.type === 'pvp_match' && socialPresence?.online
		? `In match · ${socialPresenceLabel(socialPresence, text)}`
		: socialPresenceLabel(socialPresence, text);

	function text(en: string, vi: string) {
		return $locale === 'vi' ? vi : en;
	}

	onDestroy(() => {
		cleanupPresence?.();
	});

	async function loadSocialStatus() {
		try {
			const token = await $user.token();
			socialStatus = await getSocialStatus(token, player.uid);
		} catch {
			socialStatus = 'none';
		}
	}

	async function loadSocialActivity() {
		try {
			socialActivity = await getSocialActivity(
				$user.loggedIn ? await $user.token() : null,
				player.uid
			);
		} catch {
			socialActivity = null;
		}
	}

	async function addFriend() {
		if (!showFriendButton || friendButtonDisabled) {
			return;
		}

		addingFriend = true;

		try {
			await sendFriendRequest(await $user.token(), player.uid);
			socialStatus = 'outgoing_pending';
			toast.success('Friend request sent');
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: 'Failed to send friend request'
			);
		} finally {
			addingFriend = false;
		}
	}
</script>

<div class="profile-sidebar">
  <section class="identity-card">
    <Avatar.Root class="profile-avatar">
      <Avatar.Image class="object-cover" src={avatarSrc} alt={player.name} />
      <Avatar.Fallback class="text-4xl font-bold">
        {player.name?.trim()?.[0]?.toUpperCase() ?? '?'}
      </Avatar.Fallback>
    </Avatar.Root>
    <div class="profile-player-link">
      <PlayerLink {player} large />
    </div>
  </section>

  <PlayerCard
    player={data.player}
    listSummaries={data.listSummaries || []}
    hideHeader
  />

  {#if isSupporter}
    <SupporterTierProgress supporterUntil={player.supporterUntil} compact />
  {:else}
    <SupporterTierProgress preview compact nonSupporter />
  {/if}

  <section class="sidebar-section">
    <div class="section-heading">
      <span>{text('Player actions', 'Thao tác')}</span>
      {#if $user.loggedIn && player.uid == $user.data.uid && !$user.data.isBanned}
        <ProfileEditButton bind:data={data.player} />
      {/if}
    </div>

    <button
      class="uid-button"
      type="button"
      on:click={() => {
          navigator.clipboard.writeText(player.uid);
          toast.success($_('player.copy_uid'));
      }}
    >
      <span class="min-w-0">
        <span class="detail-label">UID</span>
        <span class="detail-value truncate">{player.uid}</span>
      </span>
      <Copy class="h-4 w-4 flex-none" />
    </button>

    {#if showFriendButton}
      <Button
        variant="outline"
        class="friend-action w-full justify-start"
        disabled={friendButtonDisabled}
        on:click={addFriend}
      >
        {#if socialStatus === 'friend'}
          <UserCheck class="h-4 w-4" />
        {:else if socialStatus === 'outgoing_pending' || socialStatus === 'incoming_pending'}
          <Clock class="h-4 w-4" />
        {:else}
          <UserPlus class="h-4 w-4" />
        {/if}
        {friendButtonLabel}
      </Button>
    {/if}

    {#if showPresenceStatus}
      <div class="presence-row">
        <span
          class:online={Boolean(socialPresence?.online)
            && socialActivity?.presenceVisible !== false}
          class="presence-dot"
        />
        <span>{socialLine}</span>
      </div>
    {/if}

    {#if showSpectate}
      <a
        class={`${badgeVariants({ variant: 'outline' })} friend-action w-full justify-start`}
        href={`/versus/matches/${socialActivity?.activity?.matchId}?spectate=1`}
      >
        <Eye class="h-4 w-4" />
        {text('Spectate', 'Xem trận')}
      </a>
    {/if}
  </section>

  {#if hasProfileDetails}
    <section class="sidebar-section">
      <h2 class="section-heading">
        {text('Player info', 'Thông tin người chơi')}
      </h2>

      {#if player.isTrusted}
        <div class="detail-row">
          <BadgeCheck class="h-5 w-5 flex-none text-blue-500" />
          <span>{text('Trusted player', 'Người chơi đáng tin cậy')}</span>
        </div>
      {/if}

      {#if player.province}
        <div class="detail-row items-start">
          <MapPin class="mt-0.5 h-4 w-4 flex-none" />
          <span>
            {#if player.city}
              {player.province}, {player.city}
            {:else}
              {player.province}
            {/if}
          </span>
        </div>
      {/if}
    </section>
  {/if}

  {#if hasSocialLinks}
    <section class="sidebar-section">
      <h2 class="section-heading">
        {text('Social media', 'Mạng xã hội')}
      </h2>

      {#if player.youtube}
        <a
          href={player.youtube}
          target="_blank"
          rel="noopener noreferrer"
          class="social-row"
        >
          <img src="/youtube.svg" alt="" class="h-5 w-5 flex-none" />
          <span>YouTube</span>
        </a>
      {/if}

      {#if player.facebook}
        <a
          href={player.facebook}
          target="_blank"
          rel="noopener noreferrer"
          class="social-row"
        >
          <img src="/facebook.svg" alt="" class="h-5 w-5 flex-none" />
          <span>Facebook</span>
        </a>
      {/if}

      {#if player.discord}
        <button
          type="button"
          class="social-row w-full"
          on:click={() => {
              navigator.clipboard.writeText(player.discord);
              toast($_('player.copy_discord'));
          }}
        >
          <img src="/discord.svg" alt="" class="h-5 w-5 flex-none" />
          <span class="min-w-0 flex-1 text-left">
            <span class="block">Discord</span>
            <span class="block truncate text-xs text-muted-foreground">
              {player.discord}
            </span>
          </span>
          <Copy class="h-4 w-4 flex-none text-muted-foreground" />
        </button>
      {/if}
    </section>
  {/if}
</div>

<style lang="scss">
.profile-sidebar {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.identity-card {
  display: grid;
  justify-items: center;
  gap: 16px;
  min-width: 0;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  padding: 24px 16px 18px;
  background: hsl(var(--card));
  color: hsl(var(--card-foreground));
}

:global(.profile-avatar) {
  width: 136px;
  height: 136px;
}

.profile-player-link {
  display: flex;
  max-width: 100%;
  justify-content: center;
  text-align: center;
}

.sidebar-section {
  display: grid;
  gap: 10px;
  min-width: 0;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  padding: 12px;
  background: hsl(var(--card));
  color: hsl(var(--card-foreground));
}

.section-heading {
  display: flex;
  min-height: 28px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
}

.uid-button,
.social-row {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
  border-radius: 6px;
  padding: 8px;
  text-align: left;
  transition:
    background-color 150ms ease,
    color 150ms ease;
}

.uid-button {
  justify-content: space-between;
  border: 1px solid hsl(var(--border));
}

.uid-button:hover,
.social-row:hover {
  background: hsl(var(--muted));
}

.detail-label,
.detail-value {
  display: block;
}

.detail-label {
  color: hsl(var(--muted-foreground));
  font-size: 11px;
  line-height: 1.2;
}

.detail-value {
  margin-top: 2px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
}

.detail-row,
.presence-row {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}

.presence-dot {
  width: 8px;
  height: 8px;
  flex: none;
  border-radius: 9999px;
  background: hsl(var(--muted-foreground));
}

.presence-dot.online {
  background: rgb(34 197 94);
}

:global(.friend-action) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
</style>
