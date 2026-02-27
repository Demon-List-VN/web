<script lang="ts">
	import LevelCard from '$lib/components/levelCard.svelte';
	import ListFilter from '$lib/components/listFilter.svelte';
	import { page } from '$app/stores';
	import type { PageData } from './$types';
	import { onDestroy, onMount, tick } from 'svelte';
	import Ads from '$lib/components/ads.svelte';
	import { user } from '$lib/client';
	import { goto } from '$app/navigation';
	import { getListCache, setListCache } from '$lib/client/listCache';
	import { browser } from '$app/environment';
	import { ChevronUp } from 'lucide-svelte';
	import { fly, slide } from 'svelte/transition';
	import { isActive } from '$lib/client/isSupporterActive';

	export let data: PageData;

	$: currentListType = ($page.params.list as 'dl' | 'pl' | 'fl' | 'cl') || 'dl';

	let prefix = data.levels.slice(0, 4);
	let curPage = 1;
	let loaded = true;
	let unsubscribeUser: (() => void) | null = null;
	let showScrollToTop = false;
	let filters = {
		topStart: null as string | null,
		topEnd: null as string | null,
		ratingMin: null as string | null,
		ratingMax: null as string | null,
		nameSearch: '',
		creatorSearch: '',
		sortBy:
			$page.params.list === 'fl'
				? 'flTop'
				: $page.params.list === 'cl'
					? 'created_at'
					: 'dlTop',
		ascending: $page.params.list !== 'cl',
		tagIds: null as string | null
	};

	function getCacheKey() {
		const filtersKey = JSON.stringify(filters);
		return `${$page.params.list}|${$page.url.searchParams.get('uid') ?? ''}|${filtersKey}`;
	}

	async function fetchData(resetList = false) {
		if (!loaded && !resetList) {
			return;
		}

		if (resetList) {
			curPage = 1;
			data.levels = [];
		} else {
			curPage++;
		}

		loaded = false;

		const query = new URLSearchParams({
			start: String((curPage - 1) * 50),
			end: String(curPage * 50 - 1),
			sortBy:
				$page.params.list === 'cl'
					? 'created_at'
					: `${$page.params.list == 'fl' ? 'fl' : 'dl'}Top`,
			ascending: $page.params.list == 'cl' ? 'false' : 'true',
			uid: $user.loggedIn ? $user.data.uid : ''
		});

		// Add filter parameters
		if (filters.topStart) query.set('topStart', filters.topStart);
		if (filters.topEnd) query.set('topEnd', filters.topEnd);
		if (filters.ratingMin) query.set('ratingMin', filters.ratingMin);
		if (filters.ratingMax) query.set('ratingMax', filters.ratingMax);
		if (filters.nameSearch) query.set('nameSearch', filters.nameSearch);
		if (filters.creatorSearch) query.set('creatorSearch', filters.creatorSearch);
		if (filters.sortBy) query.set('sortBy', filters.sortBy);
		query.set('ascending', String(filters.ascending));
		if (filters.tagIds) query.set('tagIds', filters.tagIds);

		const res = await (
			await fetch(`${import.meta.env.VITE_API_URL}/list/${$page.params.list}?${query.toString()}`)
		).json();

		if (resetList) {
			data.levels = res;
		} else {
			data.levels = data.levels.concat(res);
		}
		loaded = true;
	}

	async function handleFilterChange(event: CustomEvent) {
		filters = event.detail;
		await fetchData(true);
	}

	function redirect() {
		if (!$user.checked) {
			return;
		}

		if ($page.url.searchParams.get('uid')) {
			return;
		}

		if ($user.loggedIn) {
			goto(`/list/${$page.params.list}?uid=${$user.data.uid}`);
		}
	}

	function update() {
		prefix = data.levels.slice(0, 4);
		redirect();
	}

	function getTitle() {
		if ($page.params.list == 'dl') {
			return 'Classic List';
		} else if ($page.params.list == 'pl') {
			return 'Platformer List';
		} else if ($page.params.list == 'cl') {
			return 'Challenge List';
		} else if ($page.params.list == 'fl') {
			return 'Featured List';
		}

		return 'None';
	}

	function scrollToTop() {
		if (browser) {
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	}

	function handleScroll() {
		if (browser) {
			showScrollToTop = window.pageYOffset > 300;

			if (window.innerHeight + window.pageYOffset >= document.body.offsetHeight - 1500) {
				fetchData();
			}
		}
	}

	$: (data, update());

	onMount(() => {
		if (!browser) {
			return;
		}

		const key = getCacheKey();
		const cached = getListCache(key);

		if (cached) {
			data.levels = cached.levels as PageData['levels'];
			curPage = cached.curPage;
		}

		unsubscribeUser = user.subscribe((value) => {
			if (value.loggedIn) {
				redirect();
			}
		});

		window.addEventListener('scroll', handleScroll);
	});

	onDestroy(() => {
		if (!browser) return;

		const key = getCacheKey();
		setListCache(key, {
			levels: data.levels as unknown[],
			curPage
		});

		if (unsubscribeUser) {
			unsubscribeUser();
		}

		window.removeEventListener('scroll', handleScroll);
	});
</script>

<svelte:head>
	<title>{getTitle()} - Geometry Dash Việt Nam</title>
</svelte:head>

<div class="levelsWrapper">
	<ListFilter listType={currentListType} on:filter={handleFilterChange} />
	<div class="levels">
		{#each data.levels as level, index}
			<LevelCard {level} type={$page.params.list || 'dl'} hideTop={$page.params.list === 'cl'} />
		{/each}
	</div>
</div>

{#if showScrollToTop}
	<button
		class="scrollToTop"
		on:click={scrollToTop}
		title="Scroll to top"
		transition:fly={{ y: 20, duration: 300 }}
	>
		<ChevronUp size={24} />
	</button>
{/if}

<style lang="scss">
	.levelsWrapper {
		display: flex;
		align-items: center;
		flex-direction: column;
	}

	.levels {
		display: grid;
		align-items: center;
		gap: 10px;
		grid-template-columns: 500px 500px;
		margin-inline: auto;
		margin-bottom: 20px;
		padding-inline: 10px;
	}

	@media screen and (max-width: 1100px) {
		.levels {
			grid-template-columns: 100%;
		}
	}

	.scrollToTop {
		position: fixed;
		bottom: 24px;
		right: 24px;
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
		transition: all 0.3s ease;
		z-index: 999;
		opacity: 0.9;
	}

	.scrollToTop:hover {
		transform: translateY(-4px);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.6);
		opacity: 1;
	}

	.scrollToTop:active {
		transform: translateY(-2px);
	}
</style>
