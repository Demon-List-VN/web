<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Carousel from '$lib/components/ui/carousel/index.js';
	import Autoplay from 'embla-carousel-autoplay';
	import Clock from 'svelte-radix/Clock.svelte';
	import { _ } from 'svelte-i18n';

	export let events: any[] = [];
	export let currentTime = new Date();

	function getEventInterval(event: any) {
		if (!event.end) {
			return $_('events.permanent') || 'Permanent';
		}

		const eventStart = new Date(event.start);
		if (eventStart > currentTime) {
			return `${$_('events.starts_at') || 'Starts'} ${eventStart.toLocaleDateString('vi-VN')}`;
		}

		const second = (new Date(event.end).getTime() - currentTime.getTime()) / 1000;

		if (second < 0) {
			return $_('events.ended') || 'Ended';
		}

		const day = Math.floor(second / 86400);
		const hour = Math.floor((second - day * 86400) / 3600);
		const minute = Math.floor((second - day * 86400 - hour * 3600) / 60);

		return `${day}d ${hour}h ${minute}m`;
	}
</script>

<Card.Root class="w-full bg-background/60 backdrop-blur-md sm:w-auto">
	<Card.Header class="px-3 pb-2 pt-3 sm:px-6 sm:pt-6">
		<Card.Title class="flex items-center justify-between text-sm sm:text-base">
			<span>{$_('dashboard.events') || 'Events'}</span>
			<a
				href="/events"
				class="text-xs text-muted-foreground hover:text-foreground sm:text-sm"
			>
				{$_('dashboard.view_all') || 'View All'} →
			</a>
		</Card.Title>
	</Card.Header>
	<Card.Content class="px-3 pb-3 sm:px-6 sm:pb-6">
		{#if events && events.length > 0}
			<Carousel.Root
				class="w-full"
				plugins={[
					Autoplay({
						delay: 5000
					})
				]}
			>
				<Carousel.Content>
					{#each events as event}
						<Carousel.Item>
							<a href={`/event/${event.id}`} class="block">
								<div class="event-card relative overflow-hidden rounded-lg">
									<img
										src={event.imgUrl ||
											`https://cdn.gdvn.net/event-banner/${event.id}.webp`}
										alt={event.title}
										class="aspect-[16/9] w-full object-cover"
									/>
									<div
										class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"
									></div>
									<div class="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
										<div class="mb-1 flex flex-wrap items-center gap-1">
											<div
												class="flex items-center gap-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] text-white backdrop-blur-sm sm:px-2 sm:text-xs"
											>
												<Clock class="h-2.5 w-2.5 sm:h-3 sm:w-3" />
												{getEventInterval(event)}
											</div>
											{#if event.isRanked}
												<div
													class="rounded-full bg-yellow-500/80 px-1.5 py-0.5 text-[10px] text-white sm:px-2 sm:text-xs"
												>
													{$_('events.ranked') || 'Ranked'}
												</div>
											{/if}
										</div>
										<h3 class="line-clamp-1 text-xs font-semibold text-white sm:text-sm">
											{event.title}
										</h3>
									</div>
								</div>
							</a>
						</Carousel.Item>
					{/each}
				</Carousel.Content>
				<div class="mt-2 flex justify-center gap-2">
					<Carousel.Previous
						class="static h-6 w-6 translate-x-0 translate-y-0 sm:h-7 sm:w-7"
					/>
					<Carousel.Next class="static h-6 w-6 translate-x-0 translate-y-0 sm:h-7 sm:w-7" />
				</div>
			</Carousel.Root>
		{:else}
			<div class="flex aspect-[16/9] items-center justify-center rounded-lg bg-muted">
				<p class="text-xs text-muted-foreground sm:text-sm">
					{$_('dashboard.no_events') || 'No active events'}
				</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>

<style lang="scss">
	.event-card {
		transition: transform 0.2s ease;

		&:hover {
			transform: scale(1.02);
		}
	}

	.line-clamp-1 {
		display: -webkit-box;
		-webkit-line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
