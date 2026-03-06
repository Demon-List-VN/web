<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import MagnifyingGlass from 'svelte-radix/MagnifyingGlass.svelte';
	import { _ } from 'svelte-i18n';

	export let searchEnabled = true;
	export let searchPosition: 'top' | 'center' | 'bottom' = 'center';
	export let searchEngine: 'google' | 'bing' | 'duckduckgo' | 'yahoo' | 'yandex' | 'ecosisa' = 'google';
	export let shortcutsVisible = true;
	export let shortcuts: Array<{ name: string; url: string; icon: string }> = [];
	export let searchOpenInNewTab = false;

	const SEARCH_ENGINES = {
		google: { name: 'Google', url: 'https://www.google.com/search?q=' },
		bing: { name: 'Bing', url: 'https://www.bing.com/search?q=' },
		duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
		yahoo: { name: 'Yahoo', url: 'https://search.yahoo.com/search?p=' },
		yandex: { name: 'Yandex', url: 'https://yandex.com/search/?text=' },
		ecosisa: { name: 'Ecosia', url: 'https://www.ecosia.org/search?q=' }
	};

	let searchQuery = '';
	// Whether to open search results in a new tab. Default: false (open in current tab)
	let openInNewTab = false;

	function handleSearch(e: Event) {
		e.preventDefault();
		if (searchQuery.trim()) {
			const engineUrl = SEARCH_ENGINES[searchEngine].url;
			const url = engineUrl + encodeURIComponent(searchQuery.trim());
			if (openInNewTab) {
				window.open(url, '_blank');
			} else {
				// navigate in the same tab
				window.location.href = url;
			}
			searchQuery = '';
		}
	}

	function loadSettingsFromStorage() {
		if (!browser) return;
		const key = localStorage.getItem('dashboard.searchOpenInNewTab');
		openInNewTab = key === 'true';
	}

	let storageHandler: (e: StorageEvent) => void;
	let customHandler: () => void;

	// If parent binds prop, reflect that.
	$: if (typeof searchOpenInNewTab === 'boolean') {
		openInNewTab = searchOpenInNewTab;
	}

	onMount(() => {
		loadSettingsFromStorage();

		storageHandler = (e: StorageEvent) => {
			if (!e.key) return;
			if (e.key === 'dashboard.searchOpenInNewTab') {
				loadSettingsFromStorage();
			}
		};
		window.addEventListener('storage', storageHandler);

		customHandler = () => loadSettingsFromStorage();
		window.addEventListener('dashboard.search.updated', customHandler as EventListener);
	});

	onDestroy(() => {
		if (storageHandler) window.removeEventListener('storage', storageHandler);
		if (customHandler) window.removeEventListener('dashboard.search.updated', customHandler as EventListener);
	});
</script>

{#if searchEnabled}
	<form on:submit={handleSearch} class="flex w-full flex-col items-center gap-3 sm:gap-4" data-search-position={searchPosition}>
		<div class="relative w-full max-w-md sm:max-w-xl">
			<div class="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 sm:left-4">
				<MagnifyingGlass class="h-4 w-4 text-foreground/70 sm:h-5 sm:w-5" />
			</div>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder={$_('dashboard.search.placeholder') ||
					`Search with ${SEARCH_ENGINES[searchEngine].name}...`}
				class="w-full rounded-full border border-border/50 bg-background/60 py-2.5 pl-10 pr-4 text-sm backdrop-blur-md transition-all placeholder:text-muted-foreground focus:border-primary focus:bg-background/80 focus:outline-none focus:ring-2 focus:ring-primary/20 sm:py-3 sm:pl-12 sm:pr-6 sm:text-base"
			/>
		</div>
		{#if shortcutsVisible && shortcuts.length > 0}
			<div class="flex flex-wrap justify-center gap-3 sm:gap-4">
				{#each shortcuts as shortcut}
					<a
						href={shortcut.url}
						target={openInNewTab ? '_blank' : undefined}
						rel="noopener noreferrer"
						class="flex flex-col items-center gap-1 rounded-lg bg-background/60 p-2 backdrop-blur-md transition-all hover:scale-105 hover:bg-background/80 sm:gap-1.5 sm:rounded-xl sm:p-3"
					>
						{#if shortcut.icon}
							<img
								src={shortcut.icon}
								alt={shortcut.name}
								class="h-8 w-8 rounded-lg sm:h-10 sm:w-10"
							/>
						{:else}
							<div
								class="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-sm font-bold sm:h-10 sm:w-10 sm:text-base"
							>
								{shortcut.name.charAt(0).toUpperCase()}
							</div>
						{/if}
						<span class="max-w-[60px] truncate text-[10px] text-muted-foreground sm:max-w-[80px] sm:text-xs"
							>{shortcut.name}</span
						>
					</a>
				{/each}
			</div>
		{/if}
	</form>
{/if}
