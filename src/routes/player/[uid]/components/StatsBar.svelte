<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import * as Select from '$lib/components/ui/select';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { getTitle } from '$lib/client';
	import { getExpLevel } from '$lib/client/getExpLevel';
	import { isActive } from '$lib/client/isSupporterActive';
	import { normalizeCustomListRankBadges, resolveCustomListRankBadge } from '$lib/utils/customListRank';
	import { getPlayerRankedListScoreLabel } from '$lib/types/playerRankedList';
	import { _ } from 'svelte-i18n';

	export let data: any;

	$: player = data.player;
	$: listSummaries = data.listSummaries || [];
	$: selectedList = data.selectedList;
	$: isSupporter = isActive(player.supporterUntil);
	$: exp = player.exp + player.extraExp;
	$: expLevel = getExpLevel(exp);
	$: selectedListOption = selectedList
		? { label: selectedList.title, value: selectedList.identifier }
		: undefined;
	$: selectedListBadge = selectedList
		? resolveCustomListRankBadge(
				selectedList,
				normalizeCustomListRankBadges(selectedList.rankBadges)
			)
		: null;
	$: scoreLabel = getPlayerRankedListScoreLabel(selectedList);
	$: contestTitle = getTitle('elo', player);

	function formatScore(value: number | null | undefined) {
		if (typeof value !== 'number' || !Number.isFinite(value)) {
			return '0';
		}

		return String(Math.round(value));
	}

	async function handleListChange(option: { value?: string } | undefined) {
		const identifier = option?.value;
		const nextUrl = new URL($page.url.href);

		if (identifier) {
			nextUrl.searchParams.set('list', identifier);
		} else {
			nextUrl.searchParams.delete('list');
		}

		await goto(`${nextUrl.pathname}${nextUrl.search}`, {
			keepFocus: true,
			noScroll: true,
			replaceState: true
		});
	}

	function getBgTint() {
		if (isSupporter && player.bgColor) {
			return `background-color: ${player.bgColor}20`;
		}
		return '';
	}
</script>

<div class="stats-bar mx-auto max-w-[1200px] px-4 py-4 sm:px-6 lg:px-8" style={getBgTint()}>
	{#if listSummaries.length}
		<div class="mb-4 flex flex-wrap items-center justify-center gap-3">
			<span class="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">List</span>
			<Select.Root selected={selectedListOption} onSelectedChange={handleListChange}>
				<Select.Trigger class="w-[260px] max-w-full">
					<Select.Value placeholder="Select a ranked list" />
				</Select.Trigger>
				<Select.Content>
					{#each listSummaries as listSummary}
						<Select.Item value={listSummary.identifier}>{listSummary.title}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
			{#if selectedListBadge}
				<div class="rank-badge" style={`background: ${selectedListBadge.color}`}>
					{selectedListBadge.label}
				</div>
			{/if}
		</div>
	{/if}

	<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
		{#if selectedList}
			<div class="stat-item flex flex-col items-center gap-1 rounded-lg bg-muted/50 px-4 py-3">
				<span class="text-xs text-muted-foreground">{scoreLabel}</span>
				<span class="text-xl font-bold">{formatScore(selectedList.score)}</span>
				<span class="text-xs font-semibold text-muted-foreground">{selectedList.title}</span>
			</div>
			<div class="stat-item flex flex-col items-center gap-1 rounded-lg bg-muted/50 px-4 py-3">
				<span class="text-xs text-muted-foreground">Top</span>
				<span class="text-xl font-bold">#{selectedList.rank}</span>
				<span class="text-xs font-semibold text-muted-foreground">Leaderboard</span>
			</div>
			<div class="stat-item flex flex-col items-center gap-1 rounded-lg bg-muted/50 px-4 py-3">
				<span class="text-xs text-muted-foreground">Records</span>
				<span class="text-xl font-bold">{selectedList.completedCount}</span>
				{#if selectedList.lastRefreshedAt}
					<span class="text-xs font-semibold text-muted-foreground">
						{new Date(selectedList.lastRefreshedAt).toLocaleDateString('vi-VN')}
					</span>
				{/if}
			</div>
		{:else}
			<div class="stat-item col-span-2 flex items-center justify-center rounded-lg bg-muted/50 px-4 py-3 text-sm text-muted-foreground sm:col-span-3 lg:col-span-3">
				No official or verified list ranking yet.
			</div>
		{/if}

		<div class="stat-item flex flex-col items-center gap-1 rounded-lg bg-muted/50 px-4 py-3">
			<span class="text-xs text-muted-foreground">{$_('player_card.contest')}</span>
			<Tooltip.Root>
				<Tooltip.Trigger>
					<span class="text-xl font-bold" style={contestTitle?.color ? `color: ${contestTitle.color}` : ''}>
						{player.matchCount < 5 ? `${player.elo}?` : player.elo}
					</span>
				</Tooltip.Trigger>
				<Tooltip.Content>{contestTitle?.fullTitle}</Tooltip.Content>
			</Tooltip.Root>
		</div>

		<div class="stat-item flex flex-col items-center gap-1 rounded-lg bg-muted/50 px-4 py-3">
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
	}

	.rank-badge {
		color: white;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.08em;
		padding: 4px 8px;
		border-radius: 999px;
		text-transform: uppercase;
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
			min-width: 0;
		}
	}
</style>
