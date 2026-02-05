<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Avatar from '$lib/components/ui/avatar';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import { Star } from 'svelte-radix';
	import { _ } from 'svelte-i18n';
	import { isActive } from '$lib/client/isSupporterActive';

	export let topBuyers: any[];

	let isBannerFailedToLoad: boolean[] = [];
</script>

{#if topBuyers && topBuyers.length > 0}
	<div class="mt-[50px] w-full max-w-[1000px]">
		<h2 class="mb-4 flex items-center justify-center gap-2 text-center text-2xl font-bold">
			<Star class="h-6 w-6 text-yellow-500" />
			{$_('supporter.top_supporters.title')}
			<Star class="h-6 w-6 text-yellow-500" />
		</h2>
		<div class="grid grid-cols-1 gap-3 md:grid-cols-3">
			{#each topBuyers.slice(0, 3) as buyer, index}
				<Card.Root
					class="relative overflow-hidden"
					style={isActive(buyer.player.supporterUntil)
						? `background-color: ${buyer.player.bgColor}; border-color: ${buyer.player.borderColor}; ${buyer.player.bgColor ? 'color: white' : ''}`
						: ''}
				>
					{#if isActive(buyer.player.supporterUntil) && !isBannerFailedToLoad[index]}
						<img
							on:error={() => {
								isBannerFailedToLoad[index] = true;
							}}
							class="absolute left-0 top-0 z-0 h-full w-full rounded-xl object-cover opacity-20"
							src={`https://cdn.gdvn.net/banners/${buyer.player.uid}${
								buyer.player.isBannerGif ? '.gif' : '.jpg'
							}?version=${buyer.player.bannerVersion}`}
							alt=""
						/>
					{/if}
					<div
						class="absolute bottom-0 left-0 top-0 z-10 w-2 {index === 0
							? 'bg-yellow-500'
							: index === 1
								? 'bg-gray-400'
								: 'bg-amber-600'}"
					></div>
					<Card.Header class="relative z-10 flex flex-row gap-3">
						<Avatar.Root class="h-16 w-16">
							<Avatar.Image
								class="object-cover"
								src={`https://cdn.gdvn.net/avatars/${buyer.player.uid}${
									isActive(buyer.player.supporterUntil) && buyer.player.isAvatarGif
										? '.gif'
										: '.jpg'
								}?version=${buyer.player.avatarVersion}`}
								alt={buyer.player.name}
							/>
							<Avatar.Fallback>{buyer.player.name[0]}</Avatar.Fallback>
						</Avatar.Root>
						<div class="flex flex-1 flex-col justify-center gap-1">
							<div class="flex items-center gap-2">
								<div
									class="text-xl font-bold {index === 0
										? 'text-yellow-500'
										: index === 1
											? 'text-gray-400'
											: 'text-amber-600'}"
								>
									#{index + 1}
								</div>
								<PlayerLink player={buyer.player} />
							</div>
							<div class="text-base font-semibold text-green-600">
								{new Intl.NumberFormat('vi-VN', {
									style: 'currency',
									currency: 'VND'
								}).format(buyer.totalAmount)}
							</div>
						</div>
					</Card.Header>
				</Card.Root>
			{/each}
		</div>
		<div class="mt-4 text-center">
			<a href="/supporter/top" class="text-sm text-muted-foreground hover:underline">
				{$_('supporter.top_supporters.view_leaderboard')}
			</a>
		</div>
	</div>
{/if}
