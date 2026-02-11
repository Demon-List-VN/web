<script lang="ts">
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { getTitle } from '$lib/client';
	import { badgeVariants } from '$lib/components/ui/badge';
	import { getExpLevel } from '$lib/client/getExpLevel';
	import { isActive } from '$lib/client/isSupporterActive';
	import { _ } from 'svelte-i18n';
	import PlayerCard from '$lib/components/playerCard.svelte';

	export let player: any;
	export let showTitle = false;
	export let showAvatar = false;
	export let titleType: string = 'dl';
	export let truncate: number | null = null;

	let exp = player.exp + player.extraExp;
	let isBannerFailedToLoad = false;
	let isPopoverOpen = false;

	function truncateText(str: string) {
		if (!truncate) {
			return str;
		}

		let x = truncate;

		if (showTitle) {
			x -= 2;
		}

		if (player.clan) {
			x -= 4;
		}

		if (str.length <= x) {
			return str;
		}

		return str.substring(0, x) + '...';
	}
</script>

<div class="wrapper">
	{#if showAvatar}
		<Avatar.Root class='h-[30px] w-[30px]'>
			<Avatar.Image
				class="playerAvatar"
				src={`https://cdn.gdvn.net/avatars/${player.uid}${isActive(player.supporterUntil) && player.isAvatarGif ? '.gif' : '.jpg'}?version=${player.avatarVersion}`}
				alt={player.name}
			/>
			<Avatar.Fallback class="playerAvatar">{player.name[0]}</Avatar.Fallback>
		</Avatar.Root>
	{/if}
	<Popover.Root bind:open={isPopoverOpen}>
		{#if showTitle && getTitle(titleType, player)?.title}
			<Tooltip.Root>
				<Tooltip.Trigger>
					<div class="rank" style={`background-color: ${getTitle(titleType, player)?.color}`}>
						<span>{getTitle(titleType, player)?.title}</span>
					</div>
				</Tooltip.Trigger>
				<Tooltip.Content>{getTitle(titleType, player)?.fullTitle}</Tooltip.Content>
			</Tooltip.Root>
		{/if}
		{#if player.clan && isActive(player.clans.boostedUntil)}
			<a
				href={`/clan/${player.clan}`}
				class={badgeVariants({ variant: 'secondary' })}
				style={`background-color: ${player.clans.tagBgColor}; color: ${player.clans.tagTextColor};`}
				>{player.clans.tag}</a
			>
		{/if}
		<Popover.Trigger
			class="rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-black"
		>
			{#if isPopoverOpen}
				<a
					href={`/player/${player.uid}`}
					class="rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-black"
				>
					<div class="flex items-center gap-[5px]">
						<span class={isActive(player.supporterUntil) ? 'text-yellow-500' : ''}>
							{truncateText(
								player.clan && !isActive(player.clans.boostedUntil)
									? `[${player.clans.tag}] ${player.name}`
									: player.name
							)}
						</span>
						{#if player.isTrusted}
							<div class="mb-[2.5px] h-[12px] w-[12px] rounded-full bg-black dark:invert">
								<img class="invert" src="/tick-svgrepo-com.svg" alt="tick" />
							</div>
						{/if}
					</div>
				</a>
			{:else}
				<div class="flex items-center gap-[5px]">
					<span class={isActive(player.supporterUntil) ? 'text-yellow-500' : ''}>
						{truncateText(
							player.clan && !isActive(player.clans.boostedUntil)
								? `[${player.clans.tag}] ${player.name}`
								: player.name
						)}
					</span>
					{#if player.isTrusted}
						<div class="mb-[2.5px] h-[12px] w-[12px] rounded-full bg-black dark:invert">
							<img class="invert" src="/tick-svgrepo-com.svg" alt="tick" />
						</div>
					{/if}
				</div>
			{/if}
		</Popover.Trigger>
		<Popover.Content class="w-80 p-0 border-transparent">
			<PlayerCard {player} />
		</Popover.Content>
	</Popover.Root>
</div>

<style lang="scss">
	.bgGradient {
		margin-top: -50px;
		mask-image: linear-gradient(rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 1) 25%, rgba(0, 0, 0, 0) 100%);
	}
	.progressBar {
		background-color: gray;
		width: 100%;
		border-radius: 10px;
		overflow: hidden;
		scale: 0.7;
		b {
			color: var(--textColorInverted);
			margin-right: 5px;
		}

		.progress {
			background-color: var(--textColor);
			text-align: right;
			border-radius: 10px;
		}
	}

	.wrapper {
		display: flex;
		align-items: center;
		gap: 7px;
	}

	.playerAvatar {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		object-fit: cover;
		flex-shrink: 0;
	}

	.leftCol {
		width: 50px;
		display: flex;
		justify-content: center;
	}

	.hoverName {
		display: flex;
		gap: 10px;
		align-items: center;
		padding-bottom: 10px;
	}

	.content {
		padding-top: 10px;
	}

	.rankWrapper {
		display: flex;
		gap: 5px;

		.rank {
			background-color: var(--textColor);
			color: var(--textColorInverted);
			padding-inline: 6px;
			height: fit-content;
			border-radius: 5px;
			font-weight: 600;
		}
	}

	.rating {
		.title {
			padding: 2px;
			padding-inline: 5px;
			border-radius: 5px;
			font-weight: bold;
			font-size: 12px;
			user-select: none;
			width: fit-content;
		}

		display: flex;
		gap: 10px;
		align-items: center;
		font-size: 13px;
	}

	.rank {
		color: white;
		font-size: 10px;
		width: fit-content;
		padding-inline: 5px;
		border-radius: 5px;
		font-weight: 600;
	}
</style>
