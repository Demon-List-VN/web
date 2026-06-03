<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { getTitle, user } from '$lib/client';
	import { getExpLevel } from '$lib/client/getExpLevel';
	import ListSelector, {
		type ListSelectorOption
	} from '$lib/components/listSelector.svelte';
	import {
		normalizeCustomListRankBadges,
		resolveCustomListRankBadge
	} from '$lib/utils/customListRank';
	import { getPlayerRankedListScoreLabel } from '$lib/types/playerRankedList';
	import { _ } from 'svelte-i18n';

	export let data: any;

	$: player = data.player;
	$: listSummaries = data.listSummaries || [];
	$: selectedList = data.selectedList;
	$: requestedListIdentifier = $page.url.searchParams.get('list');
	$: exp = player.exp + player.extraExp;
	$: expLevel = getExpLevel(exp);
	$: rankedListOptions = listSummaries.map(toRankedListOption);
	$: listSelectorOptions = mergeListOptions(listSuggestions, rankedListOptions);
	$: selectedSuggestionOption = requestedListIdentifier
		? listSelectorOptions.find((option) =>
			matchesListIdentifier(option, requestedListIdentifier)
		) ?? (
			selectedOptionCache && matchesListIdentifier(
				selectedOptionCache,
				requestedListIdentifier
			)
				? selectedOptionCache
				: null
		)
		: null;
	$: selectedListSelectorId = selectedList?.id ?? selectedSuggestionOption?.id ?? null;
	$: selectedListBadge = selectedList
		? resolveCustomListRankBadge(
			selectedList,
			normalizeCustomListRankBadges(selectedList.rankBadges)
		)
		: null;
	$: scoreLabel = getPlayerRankedListScoreLabel(selectedList);
	$: contestTitle = getTitle('elo', player);
	$: listSuggestionLoadReady = browser && $user.checked;
	$: if (listSuggestionLoadReady) {
		const nextKey = $user.loggedIn
			? `user:${$user.data?.uid ?? 'unknown'}`
			: 'anonymous';

		if (nextKey !== listSuggestionLoadKey) {
			listSuggestionLoadKey = nextKey;
			void loadListSuggestions(nextKey);
		}
	}

	let listSuggestions: ListSelectorOption[] = [];
	let listSuggestionsLoading = true;
	let listSuggestionLoadKey = '';
	let selectedOptionCache: ListSelectorOption | null = null;

	function formatScore(value: number | null | undefined) {
		if (typeof value !== 'number' || !Number.isFinite(value)) {
			return '0';
		}

		return String(Math.round(value));
	}

	function toRankedListOption(list: any): ListSelectorOption {
		return {
			id: Number(list.id),
			title: list.title,
			identifier: list.identifier ?? list.slug ?? String(list.id),
			subtitle: list.isOfficial
				? $_('list_selector.official')
				: list.isVerified
				? $_('list_selector.verified')
				: null
		};
	}

	function toListSelectorOption(value: unknown, subtitle: string): ListSelectorOption | null {
		if (!value || typeof value !== 'object') {
			return null;
		}

		const entry = value as Record<string, unknown>;
		const id = Number(entry.id);
		const title = typeof entry.title === 'string' ? entry.title.trim() : '';

		if (!Number.isFinite(id) || !title) {
			return null;
		}

		const identifier = typeof entry.identifier === 'string'
			? entry.identifier
			: typeof entry.slug === 'string'
			? entry.slug
			: String(id);

		return {
			id,
			title,
			identifier,
			subtitle
		};
	}

	function normalizeListPayload(payload: unknown, subtitle: string) {
		const entries = Array.isArray(payload)
			? payload
			: payload
				&& typeof payload === 'object'
				&& Array.isArray((payload as { data?: unknown; }).data)
			? (payload as { data: unknown[]; }).data
			: [];

		return entries
			.map((entry) => toListSelectorOption(entry, subtitle))
			.filter((entry): entry is ListSelectorOption => Boolean(entry));
	}

	function mergeListOptions(...optionGroups: ListSelectorOption[][]) {
		const optionsById = new Map<number, ListSelectorOption>();

		for (const optionGroup of optionGroups) {
			for (const option of optionGroup) {
				if (!optionsById.has(option.id)) {
					optionsById.set(option.id, option);
				}
			}
		}

		return [...optionsById.values()];
	}

	function matchesListIdentifier(option: ListSelectorOption, identifier: string) {
		return option.identifier === identifier || String(option.id) === identifier;
	}

	async function fetchListOptions(url: string, subtitle: string, token?: string | null) {
		const headers: Record<string, string> = {};

		if (token) {
			headers.Authorization = `Bearer ${token}`;
		}

		const response = await fetch(url, { headers });

		if (!response.ok) {
			throw new Error(response.statusText);
		}

		return normalizeListPayload(await response.json(), subtitle);
	}

	async function loadListSuggestions(loadKey: string) {
		listSuggestionsLoading = true;

		try {
			const token = $user.loggedIn ? await $user.token() : null;
			const starredPromise = token
				? fetchListOptions(
					`${import.meta.env.VITE_API_URL}/lists/starred`,
					$_('list_selector.starred'),
					token
				)
				: Promise.resolve([] as ListSelectorOption[]);
			const officialPromise = fetchListOptions(
				`${import.meta.env.VITE_API_URL}/lists?kind=official&limit=20`,
				$_('list_selector.official')
			);
			const [starredResult, officialResult] = await Promise.allSettled([
				starredPromise,
				officialPromise
			]);

			if (loadKey !== listSuggestionLoadKey) {
				return;
			}

			const starredOptions = starredResult.status === 'fulfilled'
				? starredResult.value
				: [];
			const officialOptions = officialResult.status === 'fulfilled'
				? officialResult.value
				: [];

			listSuggestions = mergeListOptions(starredOptions, officialOptions);
		} finally {
			if (loadKey === listSuggestionLoadKey) {
				listSuggestionsLoading = false;
			}
		}
	}

	async function handleListChange(option: ListSelectorOption | null) {
		const identifier = option?.identifier ?? (option ? String(option.id) : null);
		const nextUrl = new URL($page.url.href);
		selectedOptionCache = option;

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
		if (player.bgColor) {
			return `background-color: ${player.bgColor}20`;
		}

		return '';
	}
</script>

<div
  class="stats-bar mx-auto max-w-[1200px] px-4 py-4 sm:px-6 lg:px-8"
  style={getBgTint()}
>
  <div class="mb-4 flex flex-wrap items-center justify-center gap-3">
    <span
      class="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
    >List</span>
    <ListSelector
      options={listSelectorOptions}
      selectedId={selectedListSelectorId}
      searchUrl={`${import.meta.env.VITE_API_URL}/lists`}
      placeholder={$_('player.overview.selected_list_placeholder')}
      searchPlaceholder={$_('list_selector.search_placeholder')}
      emptyLabel={listSuggestionsLoading
        ? $_('list_selector.loading')
        : $_('list_selector.no_results')}
      loadingLabel={$_('list_selector.loading')}
      allowClear
      clearLabel={$_('list_selector.clear')}
      triggerClass="w-[260px] max-w-full"
      on:select={(event) => handleListChange(event.detail)}
    />
    {#if selectedListBadge}
      <div
        class="rank-badge"
        style={`background: ${selectedListBadge.color}`}
      >
        {selectedListBadge.label}
      </div>
    {/if}
  </div>

  <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
    {#if selectedList}
      <div class="stat-item flex flex-col items-center gap-1 rounded-lg bg-muted/50 px-4 py-3">
        <span class="text-xs text-muted-foreground">{scoreLabel}</span>
        <span class="text-xl font-bold">{formatScore(selectedList.score)}</span>
        <span class="text-xs font-semibold text-muted-foreground">{
          selectedList.title
        }</span>
      </div>
      <div class="stat-item flex flex-col items-center gap-1 rounded-lg bg-muted/50 px-4 py-3">
        <span class="text-xs text-muted-foreground">Top</span>
        <span class="text-xl font-bold">#{selectedList.rank}</span>
        <span class="text-xs font-semibold text-muted-foreground"
        >Leaderboard</span>
      </div>
      <div class="stat-item flex flex-col items-center gap-1 rounded-lg bg-muted/50 px-4 py-3">
        <span class="text-xs text-muted-foreground">Records</span>
        <span class="text-xl font-bold">{selectedList.completedCount}</span>
        {#if selectedList.lastRefreshedAt}
          <span class="text-xs font-semibold text-muted-foreground">
            {new Date(selectedList.lastRefreshedAt)
.toLocaleDateString('vi-VN')}
          </span>
        {/if}
      </div>
    {:else if requestedListIdentifier}
      <div class="stat-item col-span-2 flex items-center justify-center rounded-lg bg-muted/50 px-4 py-3 text-center text-sm text-muted-foreground sm:col-span-3 lg:col-span-3">
        {$_('player.overview.no_selected_list_rank')}
      </div>
    {:else}
      <div class="stat-item col-span-2 flex items-center justify-center rounded-lg bg-muted/50 px-4 py-3 text-sm text-muted-foreground sm:col-span-3 lg:col-span-3">
        {$_('player.overview.no_ranked_lists')}
      </div>
    {/if}

    <div class="stat-item flex flex-col items-center gap-1 rounded-lg bg-muted/50 px-4 py-3">
      <span class="text-xs text-muted-foreground">{
        $_('player_card.contest')
      }</span>
      <Tooltip.Root>
        <Tooltip.Trigger>
          <span
            class="text-xl font-bold"
            style={contestTitle?.color ? `color: ${contestTitle.color}` : ''}
          >
            {player.matchCount < 5 ? `${player.elo}?` : player.elo}
          </span>
        </Tooltip.Trigger>
        <Tooltip.Content>{contestTitle?.fullTitle}</Tooltip.Content>
      </Tooltip.Root>
    </div>

    <div class="stat-item flex flex-col items-center gap-1 rounded-lg bg-muted/50 px-4 py-3">
      <span class="text-xs text-muted-foreground">{$_('player.level')}</span>
      <span class="text-xl font-bold" style={`color: ${expLevel.color};`}>{
        expLevel.level
      }</span>
      <Tooltip.Root>
        <Tooltip.Trigger class="w-full">
          <div class="exp-bar">
            <div
              class="exp-fill"
              style={`width: ${expLevel.progress}%; background-color: ${expLevel.color};`}
            />
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <p>{exp}/{expLevel.upperBound} ({expLevel.progress}%)</p>
          <p class="text-xs text-muted-foreground">
            {expLevel.upperBound - exp} {$_('player.exp_to_next')}
          </p>
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
