<script lang="ts">
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { quintOut, cubicOut } from 'svelte/easing';
	import { Confetti } from 'svelte-confetti';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { getTitle, user } from '$lib/client';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { toast } from 'svelte-sonner';
	import * as Card from '$lib/components/ui/card';
	import { isActive } from '$lib/client/isSupporterActive';
	import * as Avatar from '$lib/components/ui/avatar';
	import { badgeVariants } from '$lib/components/ui/badge';
	import { getExpLevel } from '$lib/client/getExpLevel';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import Markdown from '$lib/components/markdown.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { _, locale } from 'svelte-i18n';

	export let data: PageData;

	let isBannerFailedToLoad = false;
	const exp = data.owner ? data.players.exp + data.players.extraExp : 0;
	let editMode = false;
	let previewMode = false;
	let editedContent = data.content || '';

	// Animation state
	let showCard = false;
	let showId = false;
	let showName = false;
	let showState = false;
	let showPlayerRows = false;
	let showFooter = false;
	let showConfetti = false;

	onMount(() => {
		const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (prefersReduced) {
			showCard = showId = showName = showState = showPlayerRows = showFooter = true;
			return;
		}

		setTimeout(() => { showCard = true; }, 100);
		setTimeout(() => { showId = true; }, 900);
		setTimeout(() => { showName = true; }, 1100);
		setTimeout(() => { showState = true; }, 1300);
		setTimeout(() => { showPlayerRows = true; }, 1500);
		setTimeout(() => { if (data.owner) showConfetti = true; }, 1500);
		setTimeout(() => { showFooter = true; }, 2500);
	});

	function togglePreview() {
		previewMode = !previewMode;
	}

	async function saveContent() {
		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/card/${data.id}/content`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ content: editedContent })
			}),
			{
				success: () => {
					editMode = false;
					window.location.reload();
					return 'Content updated!';
				},
				error: 'Failed to update content',
				loading: 'Saving...'
			}
		);
	}

	async function activate() {
		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/card/${data.id}/activate`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${await $user.token()}`
				}
			}),
			{
				success: () => {
					window.location.reload();
					return 'Card activated!';
				},
				error: 'Failed to activate card',
				loading: 'Activating...'
			}
		);
	}

	async function link() {
		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/card/${data.id}/link`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${await $user.token()}`
				}
			}),
			{
				success: () => {
					window.location.reload();
					return 'Linked!';
				},
				error: 'Failed to link',
				loading: 'Linking...'
			}
		);
	}
</script>

<svelte:head>
	<title>{data.name} - Geometry Dash Việt Nam</title>
</svelte:head>

{#if showConfetti && data.owner}
	<div class="confetti-container">
		<Confetti
			x={[-3, 3]}
			y={[0, 0.1]}
			delay={[0, 500]}
			duration={3000}
			amount={80}
			fallDistance="80vh"
		/>
	</div>
{/if}

<div
	class="wrapper relative ml-auto mr-auto flex w-[500px] max-w-full flex-col items-center gap-[10px] pl-[10px] pr-[10px]"
>
	{#if showCard}
		<div class="card-image-wrapper" in:fly={{ y: 60, duration: 500, easing: quintOut }}>
			<img
				class="card-image relative z-10 rounded-xl border border-opacity-50 shadow-md"
				src={data.img}
				alt="card"
			/>
			<div class="holographic-overlay"></div>
			<div class="card-glow"></div>
		</div>
	{/if}

	{#if showId}
		<p class="text-[12px] opacity-50" in:fade={{ duration: 300 }}>ID: {data.id}</p>
	{/if}

	{#if showName && data.name}
		<h3 class="text-xl font-bold" in:fly={{ y: 15, duration: 400, easing: cubicOut }}>
			{data.name}
		</h3>
	{/if}

	{#if showState}
		<div class="relative z-0 w-full" in:fly={{ y: 20, duration: 500, easing: quintOut }}>
			{#if data.activationDate == null}
				<div class="flex flex-col items-center gap-2">
					<div class="whitespace-pre-wrap text-center">
						{$_('card.inactive')}
					</div>
					{#if $user.data?.isManager || $user.data?.isAdmin}
						<Button on:click={activate}>Activate Card</Button>
					{/if}
				</div>
			{:else if data.owner == null}
				<div class="flex justify-center">
					{#if $user.loggedIn}
						<AlertDialog.Root>
							<AlertDialog.Trigger>
								<Button class="w-full">{$_("card.link.button")} {$user.data.name}</Button>
							</AlertDialog.Trigger>
							<AlertDialog.Content>
								<AlertDialog.Header>
									<AlertDialog.Title>{$_("card.link.title")} ({$user.data.name})?</AlertDialog.Title
									>
									<AlertDialog.Description>
										{#if $locale == 'vi'}
											Việc này sẽ liên kết vĩnh viễn và cấp <b
												>{data.supporterIncluded} month{data.supporterIncluded == 1 ? '' : 's'} of Supporter
												Role</b
											>
											cho tài khoản này ({$user.data.name}).
										{:else}
											This will permanently link the card and give <b
												>{data.supporterIncluded} month{data.supporterIncluded == 1 ? '' : 's'} of Supporter
												Role</b
											>
											to this account ({$user.data.name}).
										{/if}
									</AlertDialog.Description>
								</AlertDialog.Header>
								<AlertDialog.Footer>
									<AlertDialog.Cancel>{$_("general.cancel")}</AlertDialog.Cancel>
									<AlertDialog.Action on:click={link}>{$_("general.continue")}</AlertDialog.Action>
								</AlertDialog.Footer>
							</AlertDialog.Content>
						</AlertDialog.Root>
					{:else}
						<Skeleton class="h-[35px] w-[150px]" />
					{/if}
				</div>
			{:else if data.owner}
				<Card.Root
					class="mt-[20px] w-full"
					style={isActive(data.players.supporterUntil)
						? `background-color: ${data.players.bgColor}; border-color: ${data.players.borderColor}; ${data.players.bgColor ? 'color: white' : ''}`
						: ''}
				>
					{#if isActive(data.players.supporterUntil) && !isBannerFailedToLoad}
						<img
							on:error={() => {
								isBannerFailedToLoad = true;
							}}
							class="bgGradient absolute z-0 rounded-xl object-cover"
							src={`https://cdn.gdvn.net/banners/${data.players.uid}${
								data.players.isBannerGif ? '.gif' : '.jpg'
							}`}
							alt=""
						/>
					{/if}
					<Card.Content class="z-1 relative mt-[22.5px] flex flex-col gap-[15px]">
						<div class="flex items-center gap-[10px]">
							<Avatar.Root>
								<Avatar.Image
									class="object-cover"
									src={`https://cdn.gdvn.net/avatars/${data.players.uid}${
										isActive(data.players.supporterUntil) && data.players.isAvatarGif
											? '.gif'
											: '.jpg'
									}`}
									alt=""
								/>
								<Avatar.Fallback>{data.players.name[0]}</Avatar.Fallback>
							</Avatar.Root>
							{#if data.players.clan && isActive(data.players.clans.boostedUntil)}
								<a
									href={`/clan/${data.players.clan}`}
									class={badgeVariants({ variant: 'secondary' })}
									style={`background-color: ${data.players.clans.tagBgColor}; color: ${data.players.clans.tagTextColor};`}
									>{data.players.clans.tag}</a
								>
							{/if}
							<a href={`/player/${data.players.uid}`}>
								<h4 class="font-semibold">
									<span class={isActive(data.players.supporterUntil) ? 'text-yellow-500' : ''}>
										{#if data.players.clan && !isActive(data.players.clans.boostedUntil)}
											<a href={`/clan/${data.players.clan}`}>[{data.players.clans.tag}]</a>
										{/if}{data.players.name}
									</span>
								</h4>
							</a>
						</div>
						<div class="stats-rows {showPlayerRows ? 'rows-visible' : 'rows-hidden'}">
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
												style={`background-color: ${getTitle('dl', data.players)?.color}`}
											>
												{data.players.rating}
											</div>
										</div>
									</Tooltip.Trigger>
									<Tooltip.Content>{getTitle('dl', data.players)?.fullTitle}</Tooltip.Content>
								</Tooltip.Root>
								<div class="rankWrapper">
									{$_('player_card.rating')}
									<div class="rank">
										#{data.players.overallRank}
									</div>
								</div>
							</div>
							<div class="rating">
								<div class="leftCol">
									<div class="title">{data.players.totalFLpt}</div>
								</div>
								<div class="rankWrapper">
									{$_('player_card.featured')}
									<div class="rank">
										#{data.players.flrank}
									</div>
								</div>
							</div>
							<div class="rating">
								<Tooltip.Root>
									<Tooltip.Trigger>
										<div class="leftCol">
											<div
												class="title"
												style={`background-color: ${getTitle('elo', data.players)?.color}`}
											>
												{#if data.players.matchCount < 5}
													<span class="opacity-50">{`${data.players.elo}?`}</span>
												{:else}
													{data.players.elo}
												{/if}
											</div>
										</div>
									</Tooltip.Trigger>
									<Tooltip.Content>{getTitle('elo', data.players)?.fullTitle}</Tooltip.Content>
								</Tooltip.Root>
								<div class="rankWrapper">
									{$_('player_card.contest')}
								</div>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			{/if}
		</div>
	{/if}

	{#if showFooter}
		<div class="w-full" in:fade={{ duration: 400 }}>
			{#if data.owner && $user.data?.uid === data.owner}
				<div class="mt-4 w-full">
					<Button class="w-full" on:click={() => (editMode = true)}>{$_("card.edit")}</Button>
					<Dialog.Root bind:open={editMode}>
						<Dialog.Content class="sm:max-w-[800px]">
							<Dialog.Header>
								<Dialog.Title>Edit Card's Content</Dialog.Title>
								<Dialog.Description>
									Write card's content using markdown. Click save when you're done.
								</Dialog.Description>
							</Dialog.Header>

							{#if previewMode}
								<div class="mt-2 h-[500px] overflow-y-scroll rounded-md border p-3">
									<Markdown content={editedContent} />
								</div>
							{:else}
								<textarea
									bind:value={editedContent}
									class="h-[500px] w-full rounded-md border p-2 font-mono"
									placeholder="Write the card content in markdown..."
								></textarea>
							{/if}

							<Dialog.Footer>
								<div class="flex justify-end gap-2">
									<Button variant="outline" on:click={() => (editMode = false)}>Cancel</Button>
									<Button variant="secondary" on:click={togglePreview}
										>{previewMode ? 'Edit' : 'Preview'}</Button
									>
									<Button on:click={saveContent}>Save</Button>
								</div>
							</Dialog.Footer>
						</Dialog.Content>
					</Dialog.Root>
				</div>
			{/if}
			<Markdown content={data.content} />
		</div>
	{/if}
</div>

<style lang="scss">
	/* ===== Animation: Card Image Wrapper ===== */
	.card-image-wrapper {
		position: relative;
		width: 100%;
	}

	.card-image {
		position: relative;
		z-index: 10;
	}

	/* ===== Animation: Holographic Shimmer ===== */
	.holographic-overlay {
		position: absolute;
		inset: 0;
		border-radius: 0.75rem;
		overflow: hidden;
		pointer-events: none;
		z-index: 15;

		&::after {
			content: '';
			position: absolute;
			inset: -50%;
			background: linear-gradient(
				105deg,
				transparent 40%,
				rgba(255, 255, 255, 0.08) 45%,
				rgba(255, 255, 255, 0.15) 50%,
				rgba(255, 255, 255, 0.08) 55%,
				transparent 60%
			);
			animation: holoShimmer 3s ease-in-out infinite;
			animation-delay: 0.5s;
		}
	}

	@keyframes holoShimmer {
		0% {
			transform: translateX(-100%) rotate(15deg);
		}
		100% {
			transform: translateX(100%) rotate(15deg);
		}
	}

	/* ===== Animation: Glow Pulse ===== */
	.card-glow {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 120%;
		height: 120%;
		background: radial-gradient(ellipse, hsl(var(--ring) / 0.3) 0%, transparent 70%);
		animation: glowPulse 1.2s ease-out forwards;
		z-index: 5;
		pointer-events: none;
	}

	@keyframes glowPulse {
		0% {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.8);
		}
		40% {
			opacity: 1;
			transform: translate(-50%, -50%) scale(1);
		}
		100% {
			opacity: 0;
			transform: translate(-50%, -50%) scale(1.1);
		}
	}

	/* ===== Animation: Player Row Stagger ===== */
	.stats-rows {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.rows-hidden .rating {
		opacity: 0;
		transform: translateX(-10px);
	}

	.rows-visible .rating {
		animation: rowSlideIn 0.4s cubic-bezier(0.33, 1, 0.68, 1) forwards;
	}

	.rows-visible .rating:nth-child(1) { animation-delay: 0ms; }
	.rows-visible .rating:nth-child(2) { animation-delay: 80ms; }
	.rows-visible .rating:nth-child(3) { animation-delay: 160ms; }
	.rows-visible .rating:nth-child(4) { animation-delay: 240ms; }

	@keyframes rowSlideIn {
		from {
			opacity: 0;
			transform: translateX(-10px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	/* ===== Confetti Container ===== */
	:global(.confetti-container) {
		position: fixed;
		top: -50px;
		left: 0;
		height: 100vh;
		width: 100vw;
		display: flex;
		justify-content: center;
		overflow: hidden;
		pointer-events: none;
		z-index: 100;
	}

	/* ===== Reduced Motion ===== */
	@media (prefers-reduced-motion: reduce) {
		.card-glow {
			animation: none !important;
			display: none;
		}

		.holographic-overlay::after {
			animation: none !important;
		}

		.rows-hidden .rating {
			opacity: 1;
			transform: none;
		}

		.rows-visible .rating {
			animation: none !important;
			opacity: 1;
			transform: none;
		}
	}

	/* ===== Existing Styles ===== */
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
	.bgGradient {
		mask-image: linear-gradient(rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 1) 25%, rgba(0, 0, 0, 0) 100%);
		width: calc(100% - 2px);
		height: 100px;
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
		margin-top: 50px;
		display: flex;
		flex-direction: column;
		min-height: 100vh;
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

	img {
		background-color: var(--textColorInverted);
		width: 100%;
		aspect-ratio: 245/155.48;
	}
</style>
