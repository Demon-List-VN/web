<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { user } from '$lib/client';
	import { isActive } from '$lib/client/isSupporterActive';
	import { ArrowRight, Clock, Star, Trophy, Lock, Zap } from 'lucide-svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';

	export let events: any[] | null = null;

	function getCountdown(end: string | null, start: string) {
		if (!end) return $_('events.permanent');

		const now = new Date();
		if (new Date(start) > now) {
			return `${$_('events.starts_at')} ${new Date(start).toLocaleString('vi-vn')}`;
		}

		const seconds = (new Date(end).getTime() - now.getTime()) / 1000;
		if (seconds < 0) return $_('events.ended');

		const days = Math.floor(seconds / 86400);
		const hours = Math.floor((seconds - days * 86400) / 3600);
		const minutes = Math.floor((seconds - days * 86400 - hours * 3600) / 60);

		return `${days}d ${hours}h ${minutes}m`;
	}

	function getEventThumbnail(item: any) {
		return item?.imgUrl || `https://cdn.gdvn.net/event-banner/${item?.id}.webp`;
	}

	$: isSupporter = $user.loggedIn && isActive($user.data?.supporterUntil);
</script>

{#if events === null}
	<section class="eventsStrip">
		<div class="stripHeader">
			<div class="flex items-center gap-2">
				<Trophy class="h-5 w-5 text-orange-500" />
				<h4>{$_('homepage.events.title')}</h4>
			</div>
		</div>
		<div class="stripScroll">
			{#each { length: 4 } as _}
				<div class="eventCard">
					<Skeleton class="eventCardImage" />
					<div class="eventCardBody">
						<Skeleton class="h-4 w-3/4" />
						<Skeleton class="h-3 w-1/2 mt-2" />
					</div>
				</div>
			{/each}
		</div>
	</section>
{:else if events.length > 0}
	<section class="eventsStrip">
		<div class="stripHeader">
			<div class="flex items-center gap-2">
				<Trophy class="h-5 w-5 text-orange-500" />
				<h4>{$_('homepage.events.title')}</h4>
			</div>
			<a href="/events" class="viewAllBtn">
				{$_('homepage.events.view_all')}
				<ArrowRight class="ml-1 h-4 w-4" />
			</a>
		</div>
		<div class="stripScroll">
			{#each events as event}
				<a href={`/event/${event.id}`} class="eventCard">
					<div class="eventCardImage" style={`background-image: url('${getEventThumbnail(event)}')`}>
						<div class="eventBadges">
							{#if event.isContest}
								<span class="badge contestBadge">
									<Trophy class="h-3 w-3" />
									{$_('homepage.events.contest')}
								</span>
							{/if}
							{#if event.isRanked}
								<span class="badge rankedBadge">
									<Zap class="h-3 w-3" />
									{$_('homepage.events.ranked')}
								</span>
							{/if}
							{#if event.isSupporterOnly}
								<span class="badge supporterBadge">
									{#if !isSupporter}
										<Lock class="h-3 w-3" />
									{:else}
										<Star class="h-3 w-3" />
									{/if}
									{$_('homepage.events.supporter_only')}
								</span>
							{/if}
						</div>
					</div>
					<div class="eventCardBody">
						<h5 class="eventTitle">{event.title}</h5>
						<div class="eventMeta">
							<div class="eventCountdown">
								<Clock class="h-3.5 w-3.5" />
								<span>{getCountdown(event.end, event.start)}</span>
							</div>
							{#if event.exp}
								<div class="eventExp">
									<Zap class="h-3.5 w-3.5" />
									<span>{event.exp} EXP</span>
								</div>
							{/if}
						</div>
					</div>
				</a>
			{/each}
		</div>
	</section>
{/if}

<style lang="scss">
	.eventsStrip {
		padding: 0 50px;
	}

	.stripHeader {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16px;
		flex-wrap: wrap;
		gap: 8px;

		h4 {
			font-weight: 600;
			font-size: 18px;
			margin: 0;
		}
	}

	.viewAllBtn {
		display: inline-flex;
		align-items: center;
		font-size: 14px;
		font-weight: 500;
		color: hsl(var(--muted-foreground));
		transition: color 0.2s;
		&:hover { color: hsl(var(--foreground)); }
	}

	.stripScroll {
		display: flex;
		gap: 14px;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		-webkit-overflow-scrolling: touch;
		padding-bottom: 8px;

		&::-webkit-scrollbar {
			height: 4px;
		}
		&::-webkit-scrollbar-track {
			background: transparent;
		}
		&::-webkit-scrollbar-thumb {
			background: hsl(var(--muted-foreground) / 0.3);
			border-radius: 4px;
		}
	}

	.eventCard {
		flex: 0 0 380px;
		scroll-snap-align: start;
		border-radius: 12px;
		border: 1px solid hsl(var(--border));
		overflow: hidden;
		background: hsl(var(--card));
		transition: all 0.2s;
		text-decoration: none;
		color: inherit;

		&:hover {
			border-color: hsl(var(--border) / 0.8);
			transform: translateY(-2px);
			box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
		}
	}

	.eventCardImage {
		aspect-ratio: 4 / 1;
		width: 100%;
		background-size: cover;
		background-position: center;
		position: relative;
	}

	.eventBadges {
		position: absolute;
		bottom: 8px;
		left: 8px;
		display: flex;
		gap: 4px;
		flex-wrap: wrap;
	}

	.badge {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		padding: 2px 8px;
		border-radius: 8px;
		font-size: 10px;
		font-weight: 600;
		backdrop-filter: blur(8px);
		text-shadow: none;
	}

	.contestBadge {
		background: rgba(245, 158, 11, 0.85);
		color: white;
	}

	.rankedBadge {
		background: rgba(139, 92, 246, 0.85);
		color: white;
	}

	.supporterBadge {
		background: rgba(236, 72, 153, 0.85);
		color: white;
	}

	.eventCardBody {
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.eventTitle {
		font-weight: 600;
		font-size: 14px;
		margin: 0;
		line-height: 1.3;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.eventMeta {
		display: flex;
		align-items: center;
		gap: 12px;
		font-size: 12px;
		color: hsl(var(--muted-foreground));
	}

	.eventCountdown,
	.eventExp {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	@media screen and (max-width: 768px) {
		.eventsStrip {
			padding: 0 16px;
		}
		.eventCard {
			flex: 0 0 320px;
		}
	}
</style>
