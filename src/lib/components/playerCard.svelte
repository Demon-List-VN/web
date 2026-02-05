<script lang="ts">
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { getTitle } from '$lib/client';
	import { badgeVariants } from '$lib/components/ui/badge';
	import { getExpLevel } from '$lib/client/getExpLevel';
	import { isActive } from '$lib/client/isSupporterActive';
	import { _ } from 'svelte-i18n';

	export let player: any;

	let exp = player.exp + player.extraExp;
	let isBannerFailedToLoad = false;
</script>

<div
	class="relative z-0 rounded-md border-[1px] p-[15px]"
	style={isActive(player.supporterUntil)
		? `background-color: ${player.bgColor}; border-color: ${player.borderColor}; ${player.bgColor ? 'color: white' : ''}`
		: ''}
>
	{#if isActive(player.supporterUntil) && !isBannerFailedToLoad}
		<img
			on:error={() => {
				isBannerFailedToLoad = true;
			}}
			class="bgGradient absolute top-[50px] z-[-1] ml-[-15px] h-[80px] w-full rounded object-cover"
			src={`https://cdn.gdvn.net/banners/${player.uid}${player.isBannerGif ? '.gif' : '.jpg'}`}
			alt=""
		/>
	{/if}
	<div class="hoverName">
		<Avatar.Root>
			<Avatar.Image
				class="object-cover"
				src={`https://cdn.gdvn.net/avatars/${player.uid}${
					isActive(player.supporterUntil) && player.isAvatarGif ? '.gif' : '.jpg'
				}`}
				alt=""
			/>
			<Avatar.Fallback>{player.name[0]}</Avatar.Fallback>
		</Avatar.Root>
		{#if player.clan && isActive(player.clans.boostedUntil)}
			<a
				href={`/clan/${player.clan}`}
				class={badgeVariants({ variant: 'secondary' })}
				style={`background-color: ${player.clans.tagBgColor}; color: ${player.clans.tagTextColor};`}
				>{player.clans.tag}</a
			>
		{/if}
		<h4 class="font-semibold">
			<span class={isActive(player.supporterUntil) ? 'text-yellow-500' : ''}>
				{#if player.clan && !isActive(player.clans.boostedUntil)}
					<a href={`/clan/${player.clan}`}>[{player.clans.tag}]</a>
				{/if}
				<a href={`/player/${player.uid}`}>{player.name}</a>
			</span>
		</h4>
	</div>
	<div class="content">
		<div class="rating">
			<div class="flex justify-center">
				<div class="leftCol">
					<b>Lv.{getExpLevel(exp).level}</b>
				</div>
			</div>
			<div class="progressBar">
				<div class="progress" style={`width: ${getExpLevel(exp).progress}%`}>
					<b>{getExpLevel(exp).progress}%</b>
				</div>
			</div>
		</div>
		<div class="rating">
			<Tooltip.Root>
				<Tooltip.Trigger>
					<div class="leftCol">
						<div
							class="title text-white"
							style={`background-color: ${getTitle('dl', player)?.color}`}
						>
							{player.rating}
						</div>
					</div>
				</Tooltip.Trigger>
				<Tooltip.Content>{getTitle('dl', player)?.fullTitle}</Tooltip.Content>
			</Tooltip.Root>
			<div class="rankWrapper">
				{$_('player_card.rating')}
				<div class="rank">
					#{player.overallRank}
				</div>
			</div>
		</div>
		<div class="rating">
			<Tooltip.Root>
				<Tooltip.Trigger>
					<div class="leftCol">
						<div
							class="title text-white"
							style={`background-color: ${getTitle('pl', player)?.color}`}
						>
							{player.plRating}
						</div>
					</div>
				</Tooltip.Trigger>
				<Tooltip.Content>{getTitle('pl', player)?.fullTitle}</Tooltip.Content>
			</Tooltip.Root>
			<div class="rankWrapper">
				{$_('player_card.plat_rating')}
				<div class="rank">
					#{player.plrank}
				</div>
			</div>
		</div>
		<div class="rating">
			<div class="leftCol">
				<div class="title">{player.totalFLpt}</div>
			</div>
			<div class="rankWrapper">
				{$_('player_card.featured')}
				<div class="rank">
					#{player.flrank}
				</div>
			</div>
		</div>
		<div class="rating">
			<Tooltip.Root>
				<Tooltip.Trigger>
					<div class="leftCol">
						<div class="title" style={`background-color: ${getTitle('elo', player)?.color}`}>
							{#if player.matchCount < 5}
								<span class="opacity-50">{`${player.elo}?`}</span>
							{:else}
								{player.elo}
							{/if}
						</div>
					</div>
				</Tooltip.Trigger>
				<Tooltip.Content>{getTitle('elo', player)?.fullTitle}</Tooltip.Content>
			</Tooltip.Root>
			<div class="rankWrapper">{$_('player_card.contest')}</div>
		</div>
	</div>
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
