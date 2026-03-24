<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { getTitle } from '$lib/client';
	import { getExpLevel } from '$lib/client/getExpLevel';
	import { isActive } from '$lib/client/isSupporterActive';
	import { _ } from 'svelte-i18n';

	export let data: any;

	$: player = data.player;
	$: isSupporter = isActive(player.supporterUntil);
	$: exp = player.exp + player.extraExp;
	$: expLevel = getExpLevel(exp);

	$: stats = [
		{
			label: $_('player_card.rating'),
			value: player.rating,
			rank: player.overallRank,
			title: getTitle('dl', player),
			type: 'dl'
		},
		{
			label: $_('player_card.plat_rating'),
			value: player.plRating,
			rank: player.plrank,
			title: null,
			type: 'pl'
		},
		{
			label: $_('player_card.challenge_rating'),
			value: player.clRating,
			rank: player.clrank,
			title: getTitle('cl', player),
			type: 'cl'
		},
		{
			label: $_('player_card.featured'),
			value: player.totalFLpt,
			rank: player.flrank,
			title: null,
			type: 'fl'
		},
		{
			label: $_('player_card.contest'),
			value: player.matchCount < 5 ? `${player.elo}?` : player.elo,
			rank: null,
			title: getTitle('elo', player),
			type: 'elo'
		}
	];

	function getBgTint() {
		if (isSupporter && player.bgColor) {
			return `background-color: ${player.bgColor}20`;
		}
		return '';
	}
</script>

<div class="stats-bar mx-auto max-w-[1200px] px-4 py-4 sm:px-6 lg:px-8" style={getBgTint()}>
	<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:flex lg:items-center lg:justify-center lg:gap-1">
		{#each stats as stat}
			<div class="stat-item flex flex-col items-center gap-1 rounded-lg bg-muted/50 px-4 py-3">
				<span class="text-xs text-muted-foreground">{stat.label}</span>
				{#if stat.title}
					<Tooltip.Root>
						<Tooltip.Trigger>
							<span
								class="text-xl font-bold"
								style={stat.title.color ? `color: ${stat.title.color}` : ''}
							>
								{stat.value}
							</span>
						</Tooltip.Trigger>
						<Tooltip.Content>{stat.title.fullTitle}</Tooltip.Content>
					</Tooltip.Root>
				{:else}
					<span class="text-xl font-bold">{stat.value}</span>
				{/if}
				{#if stat.rank}
					<span class="text-xs font-semibold text-muted-foreground">#{stat.rank}</span>
				{/if}
			</div>
		{/each}

		<!-- Level / XP -->
		<div class="stat-item col-span-2 flex flex-col items-center gap-1 rounded-lg bg-muted/50 px-4 py-3 sm:col-span-3 lg:col-span-1">
			<span class="text-xs text-muted-foreground">{$_('player.level')}</span>
			<span class="text-xl font-bold">{expLevel.level}</span>
			<Tooltip.Root>
				<Tooltip.Trigger class="w-full">
					<div class="exp-bar">
						<div class="exp-fill" style={`width: ${expLevel.progress}%`} />
					</div>
				</Tooltip.Trigger>
				<Tooltip.Content>
					<p>{exp}/{expLevel.upperBound} ({expLevel.progress}%)</p>
					<p class="text-xs text-muted-foreground">{expLevel.upperBound - exp} {$_('player.exp_to_next')}</p>
				</Tooltip.Content>
			</Tooltip.Root>
		</div>
	</div>
</div>

<style lang="scss">
	.stats-bar {
		border-bottom: 1px solid hsl(var(--border));
	}

	.stat-item {
		min-width: 0;
		flex: 1;
	}

	.exp-bar {
		width: 100%;
		max-width: 120px;
		height: 4px;
		border-radius: 2px;
		background-color: hsl(var(--muted));
		overflow: hidden;
	}

	.exp-fill {
		height: 100%;
		border-radius: 2px;
		background-color: hsl(var(--foreground));
		transition: width 0.3s ease;
	}

	@media screen and (min-width: 1024px) {
		.stat-item {
			min-width: 120px;
		}
	}
</style>
