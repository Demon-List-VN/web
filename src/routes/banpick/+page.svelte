<script lang="ts">
	import PlayerHoverCard from '$lib/components/playerLink.svelte';
	import type { PageData } from './$types';
	import Button from '$lib/components/ui/button/button.svelte';
	import { fade, scale, fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import * as Avatar from '$lib/components/ui/avatar';
	import { isActive } from '$lib/client/isSupporterActive';

	export let data: PageData;

	let banned = Array(data.levels.length).fill(false);
	let order = Array(data.levels.length).fill(0);
	let phase = 0;
	let levels: any[] = [null, null, null];
	let logs: any[] = Array(data.levels.length).fill(null);
	let pickedBy: any[] = [null, null, null];
	let turn = 0;
	let coinFlipped = false;
	let isCoinFlipping = false;
	let isBannerFailedToLoad = [false, false];

	function ban(index: number) {
		banned[index] = true;
		logs[index] = data.players[turn];
		phase++;

		toast.info(`${data.players[turn].name} banned ${data.levels[index].name}`);

		turn = 1 - turn;
	}

	function pick(index: number) {
		order[index] = phase - 2;
		levels[phase - 3] = data.levels[index];

		if (phase == 5) {
			logs[index] = {
				name: 'Tiebreaker'
			};
		} else {
			logs[index] = data.players[turn];
		}
		pickedBy[phase - 3] = data.players[turn];

		toast.info(
			`${data.players[turn].name} picked ${data.levels[index].name} as the ${formatOrder(phase - 2)} level!`
		);

		turn = 1 - turn;
		phase++;
	}

	function formatOrder(x: number) {
		if (x == 1) {
			return '1st';
		}

		if (x == 2) {
			return '2nd';
		}

		if (x == 3) {
			return 'Tiebreaker';
		}
	}

	onMount(() => {
		const originalOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		return () => {
			document.body.style.overflow = originalOverflow;
		};
	});
</script>

{#if isActive(data.players[0].supporterUntil) && !isBannerFailedToLoad[0]}
	<img
		on:error={() => {
			isBannerFailedToLoad[0] = true;
			isBannerFailedToLoad = isBannerFailedToLoad;
		}}
		class="bgGradient absolute z-0 mt-[-505x] h-[100vh] w-[850px] object-cover"
		src={`https://cdn.gdvn.net/banners/${data.players[0].uid}${
			data.players[0].isBannerGif ? '.gif' : '.jpg'
		}?version=${data.players[0].bannerVersion}`}
		alt="banner"
	/>
{/if}
{#if isActive(data.players[1].supporterUntil) && !isBannerFailedToLoad[1]}
	<img
		on:error={() => {
			isBannerFailedToLoad[1] = true;
			isBannerFailedToLoad = isBannerFailedToLoad;
		}}
		class="bgGradient1 absolute right-0 z-0 mt-[-55px] h-[100vh] w-[850px] object-cover"
		src={`https://cdn.gdvn.net/banners/${data.players[1].uid}${
			data.players[1].isBannerGif ? '.gif' : '.jpg'
		}?version=${data.players[1].bannerVersion}`}
		alt="banner"
	/>
{/if}

<div
	class="relative z-[1px] flex flex-col items-center gap-[30px] pl-[20px] pr-[20px]"
	in:fade={{ duration: 600, easing: quintOut }}
>
	<div
		class="mt-[50px] flex justify-center gap-[50px]"
		in:fly={{ y: -30, duration: 800, delay: 200, easing: quintOut }}
	>
		<div class="flex items-center gap-[10px]">
			<Avatar.Root class="h-8 w-8">
				<Avatar.Image
					class="object-cover"
					src={`https://cdn.gdvn.net/avatars/${data.players[0].uid}${
						isActive(data.players[0].supporterUntil) && data.players[0].isAvatarGif
							? '.gif'
							: '.jpg'
					}?version=${data.players[0].avatarVersion}`}
					alt=""
				/>
				<Avatar.Fallback class="text-sm">{data.players[0].name[0]}</Avatar.Fallback>
			</Avatar.Root>
			<PlayerHoverCard player={data.players[0]} showTitle={true} />
		</div>
		<span class="animate-pulse font-bold">VS</span>
		<div class="flex items-center gap-[10px]">
			<PlayerHoverCard player={data.players[1]} showTitle={true} />
			<Avatar.Root class="h-8 w-8">
				<Avatar.Image
					class="object-cover"
					src={`https://cdn.gdvn.net/avatars/${data.players[1].uid}${
						isActive(data.players[1].supporterUntil) && data.players[1].isAvatarGif
							? '.gif'
							: '.jpg'
					}?version=${data.players[1].avatarVersion}`}
					alt=""
				/>
				<Avatar.Fallback class="text-sm">{data.players[1].name[1]}</Avatar.Fallback>
			</Avatar.Root>
		</div>
	</div>
	<div class="flex gap-[10px]" in:fly={{ y: -20, duration: 600, delay: 400, easing: quintOut }}>
		{#each levels as level, index}
			<div
				class="flex w-[200px] flex-col items-center gap-[10px] rounded-md border-[1px] p-[10px] text-center transition-all duration-300"
				style="
                    backdrop-filter: blur(10px);
                "
			>
				<div class="font-bold">{formatOrder(index + 1)} level</div>
				<div class="">
					{#if !level}
						<div class="text-bold h-[90px] animate-pulse opacity-50">?</div>
					{:else}
						<div class="text-bold" in:scale={{ duration: 400, easing: quintOut }}>
							<b>{level.name}</b><br />
							<span class="text-sm opacity-50">by {level.author}</span><br />
							<span class="text-sm">{level.difficulty}</span><br />
							{#if index != 2}
								<span class="text-sm">Picked by {pickedBy[index].name}</span>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>
	{#if coinFlipped}
		<div
			class="flex flex-col items-center gap-[10px]"
			in:fly={{ y: 20, duration: 600, delay: 600, easing: quintOut }}
		>
			{#each data.levels as level, index}
				<div
					class="flex w-[500px] items-center rounded-md border-[1px] p-[10px] transition-all duration-300"
					style={`
                ${banned[index] ? 'opacity: 50%;' : ''}
                backdrop-filter: blur(10px);
            `}
					in:fly={{ x: -50, duration: 400, delay: 100 * index, easing: quintOut }}
				>
					<div class="text-bold">
						<b>{level.name}</b> <span class="text-sm opacity-50">by {level.author}</span><br />
						<span class="text-sm">{level.difficulty}</span>
					</div>
					{#if banned[index]}
						<Button variant="destructive" class="ml-auto transition-all duration-200" disabled
							>Banned by {logs[index].name}</Button
						>
					{:else if order[index]}
						<Button class="ml-auto transition-all duration-200" disabled
							>{logs[index].name == 'Tiebreaker'
								? 'Tiebreaker'
								: `Picked by ${logs[index].name}`}</Button
						>
					{:else if phase < 3}
						<Button
							variant="destructive"
							class="ml-auto transition-all duration-200"
							on:click={() => ban(index)}>Ban</Button
						>
					{:else}
						<Button class="ml-auto transition-all duration-200" on:click={() => pick(index)}
							>Pick</Button
						>
					{/if}
				</div>
			{/each}
		</div>
	{:else}
		<div class="flex flex-col items-center gap-4" in:fade={{ duration: 600, easing: quintOut }}>
			<div class="mb-4 text-center">
				<h2 class="mb-2 text-xl font-bold">Flip a coin to decide who goes first</h2>
				<p class="text-sm opacity-70">Winner bans first</p>
			</div>
			<div
				class="coin-container"
				style={`
                @keyframes flip {
                    0% {
                        transform: rotateY(0);
                    }
                    100% {
                        transform: rotateY(calc(720deg + 180deg));
                    }
                }`}
			>
				<div
					class="coin"
					class:flipping={isCoinFlipping}
					on:animationend={() => {
						coinFlipped = true;
						toast.info(`${data.players[turn].name} goes first!`);
					}}
				>
					<div class="side front text-black">{data.players[0].name}</div>
					<div class="side back text-black">{data.players[1].name}</div>
				</div>
			</div>
			<Button
				on:click={() => {
					turn = Math.round(Math.random());
					isCoinFlipping = true;
				}}
			>
				Flip coin
			</Button>
		</div>
		{#if turn == 0}
			<style>
				@keyframes flip {
					0% {
						transform: rotateY(0);
					}
					100% {
						transform: rotateY(calc(900deg + 180deg));
					}
				}
			</style>
		{:else}
			<style>
				@keyframes flip {
					0% {
						transform: rotateY(0);
					}
					100% {
						transform: rotateY(calc(900deg));
					}
				}
			</style>
		{/if}
	{/if}
</div>

<div class="pb-[1000px]" />

<style lang="scss">
	.bgGradient {
		mask-image: linear-gradient(90deg, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0) 75%);
	}

	.bgGradient1 {
		mask-image: linear-gradient(-90deg, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0) 75%);
	}

	.coin-container {
		perspective: 1000px;
		height: 120px;
		width: 120px;
	}

	.coin {
		width: 100%;
		height: 100%;
		position: relative;
		transform-style: preserve-3d;
		transition: transform 0.1s;

		&.flipping {
			animation: flip 2s forwards;
		}
	}

	.side {
		position: absolute;
		width: 100%;
		height: 100%;
		border-radius: 50%;
		display: flex;
		justify-content: center;
		align-items: center;
		font-weight: bold;
		backface-visibility: hidden;
	}

	.front {
		background: linear-gradient(45deg, #f3f3f3, #ddd);
		border: 3px solid #ccc;
	}

	.back {
		background: linear-gradient(45deg, #e6e6e6, #ccc);
		border: 3px solid #bbb;
		transform: rotateY(180deg);
	}
</style>
