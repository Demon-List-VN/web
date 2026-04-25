<script lang="ts" context="module">
	export type ListSelectorOption = {
		id: number;
		title: string;
		identifier?: string | null;
		subtitle?: string | null;
		disabled?: boolean;
	};
</script>

<script lang="ts">
	import { browser } from '$app/environment';
	import * as Popover from '$lib/components/ui/popover';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { cn } from '$lib/utils';
	import { Check, ChevronsUpDown, Search } from 'lucide-svelte';
	import { createEventDispatcher, onDestroy } from 'svelte';

	export let options: ListSelectorOption[] = [];
	export let selectedId: number | null = null;
	export let searchUrl: string | null = null;
	export let searchParam = 'search';
	export let searchLimit = 20;
	export let searchType = 'prefix';
	export let minSearchLength = 1;
	export let debounceMs = 250;
	export let placeholder = 'Select list';
	export let searchPlaceholder = 'Search lists...';
	export let emptyLabel = 'No lists found';
	export let loadingLabel = 'Loading...';
	export let allowClear = false;
	export let clearLabel = 'Clear selection';
	export let disabled = false;
	export let id: string | undefined = undefined;
	export let triggerClass = '';
	export let contentClass = '';

	const dispatch = createEventDispatcher<{ select: ListSelectorOption | null }>();

	let open = false;
	let query = '';
	let searchResults: ListSelectorOption[] = [];
	let selectedOptionCache: ListSelectorOption | null = null;
	let isSearching = false;
	let searchRequestId = 0;
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;
	let searchAbortController: AbortController | null = null;
	let lastSearchKey = '';

	$: trimmedQuery = query.trim();
	$: normalizedQuery = trimmedQuery.toLowerCase();
	$: selectedOption =
		getMergedOptions(options, searchResults, selectedOptionCache ? [selectedOptionCache] : []).find(
			(option) => option.id === selectedId
		) ?? null;
	$: filteredOptions = searchUrl
		? searchResults
		: normalizedQuery
			? options.filter((option) => matchesQuery(option, normalizedQuery))
			: options;
	$: searchKey = `${searchUrl ?? ''}:${trimmedQuery}`;
	$: if (browser && open && searchUrl && searchKey !== lastSearchKey) {
		lastSearchKey = searchKey;
		scheduleSearch(trimmedQuery);
	}
	$: if (browser && !open && (query || searchResults.length || isSearching)) {
		clearSearchState();
	}

	onDestroy(() => {
		clearPendingSearch();
	});

	function getMergedOptions(...optionGroups: ListSelectorOption[][]) {
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

	function matchesQuery(option: ListSelectorOption, value: string) {
		return [option.title, option.identifier, option.subtitle, String(option.id)]
			.filter(Boolean)
			.some((entry) => String(entry).toLowerCase().includes(value));
	}

	function scheduleSearch(value: string) {
		const requestId = ++searchRequestId;

		clearPendingSearch();

		if (value.length < minSearchLength) {
			searchResults = [];
			isSearching = false;
			return;
		}

		isSearching = true;
		searchTimeout = setTimeout(() => {
			void searchOptions(value, requestId);
		}, debounceMs);
	}

	function clearPendingSearch() {
		if (searchTimeout) {
			clearTimeout(searchTimeout);
			searchTimeout = null;
		}

		if (searchAbortController) {
			searchAbortController.abort();
			searchAbortController = null;
		}
	}

	function clearSearchState() {
		searchRequestId += 1;
		clearPendingSearch();
		query = '';
		searchResults = [];
		isSearching = false;
		lastSearchKey = '';
	}

	function handleListWheel(event: WheelEvent) {
		const element = event.currentTarget as HTMLElement;
		const canScroll = element.scrollHeight > element.clientHeight;
		const scrollingDown = event.deltaY > 0;
		const atTop = element.scrollTop <= 0;
		const atBottom = Math.ceil(element.scrollTop + element.clientHeight) >= element.scrollHeight;

		event.stopPropagation();

		if (!canScroll || (scrollingDown && atBottom) || (!scrollingDown && atTop)) {
			event.preventDefault();
		}
	}

	async function searchOptions(value: string, requestId: number) {
		if (!searchUrl) {
			return;
		}

		const controller = new AbortController();
		searchAbortController = controller;

		try {
			const requestUrl = new URL(searchUrl, window.location.origin);
			requestUrl.searchParams.set(searchParam, value);
			requestUrl.searchParams.set('limit', String(searchLimit));

			if (searchType) {
				requestUrl.searchParams.set('searchType', searchType);
			}

			const response = await fetch(requestUrl, { signal: controller.signal });

			if (!response.ok) {
				throw new Error(response.statusText);
			}

			const payload = await response.json();

			if (requestId !== searchRequestId) {
				return;
			}

			searchResults = normalizeSearchPayload(payload);
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				return;
			}

			if (requestId === searchRequestId) {
				searchResults = [];
			}
		} finally {
			if (requestId === searchRequestId) {
				isSearching = false;
				searchAbortController = null;
			}
		}
	}

	function normalizeSearchPayload(payload: unknown) {
		const entries = Array.isArray(payload)
			? payload
			: payload &&
				  typeof payload === 'object' &&
				  Array.isArray((payload as { data?: unknown }).data)
				? (payload as { data: unknown[] }).data
				: [];

		return getMergedOptions(
			entries
				.map((entry) => toListSelectorOption(entry))
				.filter((entry): entry is ListSelectorOption => Boolean(entry))
		);
	}

	function toListSelectorOption(value: unknown): ListSelectorOption | null {
		if (!value || typeof value !== 'object') {
			return null;
		}

		const entry = value as Record<string, unknown>;
		const id = Number(entry.id);
		const title = typeof entry.title === 'string' ? entry.title.trim() : '';

		if (!Number.isFinite(id) || !title) {
			return null;
		}

		const identifier =
			typeof entry.identifier === 'string'
				? entry.identifier
				: typeof entry.slug === 'string'
					? entry.slug
					: null;
		const subtitle =
			typeof entry.subtitle === 'string'
				? entry.subtitle
				: entry.isOfficial
					? 'Official'
					: entry.isVerified
						? 'Verified'
						: null;

		return {
			id,
			title,
			identifier,
			subtitle,
			disabled: entry.disabled === true
		};
	}

	function selectOption(option: ListSelectorOption) {
		if (option.disabled) {
			return;
		}

		selectedId = option.id;
		selectedOptionCache = option;
		query = '';
		open = false;
		dispatch('select', option);
	}

	function clearSelection() {
		selectedId = null;
		selectedOptionCache = null;
		query = '';
		open = false;
		dispatch('select', null);
	}
</script>

<div class={cn('selectorRoot', triggerClass)}>
	<Popover.Root bind:open>
		<Popover.Trigger asChild let:builder>
			<Button
				builders={[builder]}
				variant="outline"
				class="w-full justify-between overflow-hidden px-3"
				{disabled}
				{id}
			>
				<span class={cn('truncate text-left', !selectedOption && 'text-muted-foreground')}>
					{selectedOption?.title ?? placeholder}
				</span>
				<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
			</Button>
		</Popover.Trigger>
		<Popover.Content
			class={cn('min-w-80 max-w-[calc(100vw-32px)] p-0 sm:min-w-[26rem]', contentClass)}
			align="start"
			side="bottom"
			sameWidth
			strategy="fixed"
			avoidCollisions={false}
		>
			<div class="selectorPopover" on:wheel|preventDefault|stopPropagation>
				<div class="border-b p-2">
					<div class="relative">
						<Search
							class="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
						/>
						<Input bind:value={query} placeholder={searchPlaceholder} class="pl-8" />
					</div>
				</div>
				<div
					class="selectorList max-h-72 overflow-y-auto p-1"
					on:wheel={handleListWheel}
					on:touchmove|stopPropagation
				>
					{#if allowClear}
						<button type="button" class="selectorItem" on:click={clearSelection}>
							<span class="min-w-0 flex-1 truncate text-left">{clearLabel}</span>
						</button>
					{/if}

					{#if isSearching}
						<div class="px-3 py-6 text-center text-sm text-muted-foreground">{loadingLabel}</div>
					{:else if filteredOptions.length}
						{#each filteredOptions as option (option.id)}
							<button
								type="button"
								class="selectorItem"
								class:selected={selectedId === option.id}
								disabled={option.disabled}
								on:click={() => selectOption(option)}
							>
								<span class="selectorCheck">
									{#if selectedId === option.id}
										<Check class="h-4 w-4" />
									{/if}
								</span>
								<span class="min-w-0 flex-1 text-left">
									<span class="block truncate">{option.title}</span>
									{#if option.subtitle || option.identifier}
										<span class="block truncate text-xs text-muted-foreground">
											{option.subtitle ?? option.identifier}
										</span>
									{/if}
								</span>
							</button>
						{/each}
					{:else}
						<div class="px-3 py-6 text-center text-sm text-muted-foreground">{emptyLabel}</div>
					{/if}
				</div>
			</div>
		</Popover.Content>
	</Popover.Root>
</div>

<style lang="scss">
	.selectorRoot {
		display: block;
		width: 100%;
		min-width: 0;
	}

	.selectorItem {
		display: flex;
		width: 100%;
		align-items: center;
		gap: 8px;
		border-radius: 6px;
		padding: 8px;
		font-size: 14px;
		line-height: 1.25;
		transition:
			background-color 0.15s ease,
			color 0.15s ease;
	}

	.selectorItem:hover,
	.selectorItem.selected {
		background-color: hsl(var(--accent));
		color: hsl(var(--accent-foreground));
	}

	.selectorItem:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.selectorList {
		overscroll-behavior: contain;
	}

	.selectorPopover {
		overscroll-behavior: contain;
	}

	.selectorCheck {
		display: flex;
		height: 16px;
		width: 16px;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
	}
</style>
