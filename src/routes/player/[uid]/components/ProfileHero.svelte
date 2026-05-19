<script lang="ts">
	import { browser } from '$app/environment';
	import * as Avatar from '$lib/components/ui/avatar';
	import { badgeVariants } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';
	import { user } from '$lib/client';
	import { isActive } from '$lib/client/isSupporterActive';
	import { getSocialStatus, sendFriendRequest, type SocialStatus } from '$lib/client/social';
	import { getSupporterTier, getSupporterTierStyle } from '$lib/client/supporterTier';
	import ProfileEditButton from '$lib/components/profileEditButton.svelte';
	import { BadgeCheck, Clock, MapPin, UserCheck, UserPlus } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';
	import SupporterBadge from './SupporterBadge.svelte';

	export let data: any;

	let isBannerFailedToLoad = false;
	let socialStatus: SocialStatus = 'none';
	let socialStatusKey = '';
	let addingFriend = false;

	$: player = data.player;
	$: isSupporter = isActive(player.supporterUntil);
	$: supporterTier = getSupporterTier(player.supporterUntil);
	$: supporterTierStyle = getSupporterTierStyle(supporterTier);
	$: avatarSrc = `https://cdn.gdvn.net/avatars/${player.uid}${
		isSupporter && player.isAvatarGif ? '.gif' : '.jpg'
	}?version=${player.avatarVersion}`;
	$: bannerSrc = `https://cdn.gdvn.net/banners/${player.uid}${
		player.isBannerGif ? '.gif' : '.jpg'
	}?version=${player.bannerVersion}`;
	$: showFriendButton =
		browser && $user.loggedIn && player.uid && player.uid !== $user.data?.uid;
	$: friendButtonDisabled =
		addingFriend ||
		!['none'].includes(socialStatus);
	$: friendButtonLabel =
		socialStatus === 'friend'
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

	function getBgColor() {
		if (player.bgColor) {
			return `background-color: ${player.bgColor}`;
		}
		return '';
	}

	async function loadSocialStatus() {
		try {
			socialStatus = await getSocialStatus(await $user.token(), player.uid);
		} catch {
			socialStatus = 'none';
		}
	}

	async function addFriend() {
		if (!showFriendButton || friendButtonDisabled) return;

		addingFriend = true;
		try {
			await sendFriendRequest(await $user.token(), player.uid);
			socialStatus = 'outgoing_pending';
			toast.success('Friend request sent');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to send friend request');
		} finally {
			addingFriend = false;
		}
	}
</script>

<div class="hero-container relative overflow-hidden" style={getBgColor()}>
	<!-- Banner -->
	<div class="banner-area relative h-[200px] sm:h-[250px] lg:h-[280px]">
		{#if isSupporter && !isBannerFailedToLoad}
			<img
				on:error={() => {
					isBannerFailedToLoad = true;
				}}
				class="banner-image absolute inset-0 h-full w-full object-cover"
				src={bannerSrc}
				alt=""
			/>
		{/if}
		<div
			class="absolute inset-0"
			style={`background: linear-gradient(to bottom, transparent 0%, transparent 50%, ${player.bgColor || 'hsl(var(--background))'} 100%);`}
		/>
	</div>

	<!-- Profile Info Overlay -->
	<div class="profile-info relative z-10 mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
		<div
			class="flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:gap-6"
			style="margin-top: -72px;"
		>
			<!-- Avatar -->
			<div class="avatar-wrapper flex-shrink-0" class:supporter-ring={isSupporter}>
				<Avatar.Root class="h-36 w-36 border-4 border-background lg:h-44 lg:w-44">
					<Avatar.Image class="object-cover" src={avatarSrc} alt={player.name} />
					<Avatar.Fallback class="text-4xl lg:text-5xl">{player.name[0]}</Avatar.Fallback>
				</Avatar.Root>
			</div>

			<!-- Identity -->
			<div class="flex flex-col items-center gap-2 pb-4 sm:items-start">
				<!-- Name Row -->
				<div class="flex flex-wrap items-center gap-2">
					{#if player.clan && isActive(player.clans.boostedUntil)}
						<a
							href={`/clan/${player.clan}`}
							class={badgeVariants({ variant: 'secondary' })}
							style={`background-color: ${player.clans.tagBgColor}; color: ${player.clans.tagTextColor};`}
						>
							<span class="text-[15px]">{player.clans.tag}</span>
						</a>
					{/if}
					<button
						on:click={() => {
							navigator.clipboard.writeText(player.uid);
							toast.success($_('player.copy_uid'));
						}}
					>
						<h2
							class={`text-2xl font-bold sm:text-3xl ${isSupporter ? 'supporter-tier-text' : ''}`}
							style={supporterTierStyle}
						>
							{#if player.clan && !isActive(player.clans.boostedUntil)}
								[{player.clans.tag}]
							{/if}
							{player.name}
						</h2>
					</button>
					{#if player.isTrusted}
						<BadgeCheck class="h-5 w-5 text-blue-500" />
					{/if}
					<SupporterBadge supporterUntil={player.supporterUntil} uid={player.uid} />
					{#if $user.loggedIn && player.uid == $user.data.uid && !$user.data.isBanned}
						<ProfileEditButton bind:data={data.player} />
					{/if}
					{#if showFriendButton}
						<Button
							size="sm"
							variant="outline"
							class="friend-action"
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
				</div>

				<!-- Location -->
				{#if player.province}
					<div class="flex items-center gap-1.5 text-sm text-muted-foreground">
						<MapPin class="h-4 w-4" />
						{#if player.city}
							{player.province}, {player.city}
						{:else}
							{player.province}
						{/if}
					</div>
				{/if}

				<!-- Social Links -->
				<div class="flex items-center gap-3">
					{#if player.youtube}
						<a
							href={player.youtube}
							target="_blank"
							class="opacity-60 transition-opacity hover:opacity-100"
						>
							<img src="/youtube.svg" alt="YouTube" class="h-5 w-5" />
						</a>
					{/if}
					{#if player.facebook}
						<a
							href={player.facebook}
							target="_blank"
							class="opacity-60 transition-opacity hover:opacity-100"
						>
							<img src="/facebook.svg" alt="Facebook" class="h-5 w-5" />
						</a>
					{/if}
					{#if player.discord}
						<button
							class="text-muted-foreground transition-colors hover:text-foreground"
							on:click={() => {
								navigator.clipboard.writeText(player.discord);
								toast($_('player.copy_discord'));
							}}
						>
							<img
								src="/discord.svg"
								alt="Discord"
								class="h-5 w-5 opacity-60 transition-opacity hover:opacity-100"
							/>
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>

{#if player.bgColor}
	<div
		class="h-[60px] w-full"
		style={`background: linear-gradient(to bottom, ${player.bgColor}, hsl(var(--background)));`}
	/>
{/if}

<style lang="scss">
	.banner-image {
		mask-image: linear-gradient(rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 1) 70%, rgba(0, 0, 0, 0) 100%);
	}

	.supporter-ring {
		:global(.h-36),
		:global(.h-44) {
			border-color: #eab308;
		}
	}

	:global(.friend-action) {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
</style>
