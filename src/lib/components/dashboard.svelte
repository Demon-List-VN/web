<script lang="ts">
	import * as sdk from '$lib/client/sdk';
	import { onMount } from 'svelte';
	import { user } from '$lib/client';
	import { browser } from '$app/environment';
	import PlayerCard from '$lib/components/playerCard.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import Gear from 'svelte-radix/Gear.svelte';
	import ChevronDown from 'svelte-radix/ChevronDown.svelte';
	import { _ } from 'svelte-i18n';
	import RecordDetail from '$lib/components/recordDetail.svelte';
	import DashboardSettings from '$lib/components/widgets/dashboardSettings.svelte';
	import DashboardSearch from '$lib/components/widgets/dashboardSearch.svelte';
	import DashboardWeather from '$lib/components/widgets/dashboardWeather.svelte';
	import DashboardSubmissions from '$lib/components/widgets/dashboardSubmissions.svelte';
	import DashboardEvents from '$lib/components/widgets/dashboardEvents.svelte';
	import { isActive } from '$lib/client/isSupporterActive';

	export let events: any[];

	const DEFAULT_BG_URL =
		'https://i0.wp.com/picjumbo.com/wp-content/uploads/modern-gradient-background-free-photo.jpg?w=2210&quality=70';

	// Check if user is a supporter
	$: isSupporter = $user.loggedIn && isActive($user.data?.supporterUntil);

	const selectedSubmission: any = null;
	let recordDetailOpen = false;

	let dashboardBg: string = '';
	let overlayType: 'none' | 'dark' | 'blur' | 'both' = 'none';
	let settingsOpen = false;
	let submissions: any[] = [];
	let loadingSubmissions = true;
	let currentTime = new Date();

	// Web search settings
	let searchEnabled = true;
	let searchEngine: keyof typeof SEARCH_ENGINES = 'google';
	let searchPosition: 'top' | 'center' | 'bottom' = 'center';
	let shortcutsVisible = true;
	let shortcuts: Array<{ name: string; url: string; icon: string }> = [];
	let searchOpenInNewTab = false;

	// Bottom left widgets settings
	let bottomLeftWidgets: Array<'profile' | 'submissions'> = ['submissions', 'profile'];

	// Dashboard settings storage keys
	const DASHBOARD_BG_KEY = 'dashboard.backgroundUrl';
	const DASHBOARD_OVERLAY_KEY = 'dashboard.overlayType';
	const DASHBOARD_SEARCH_ENABLED_KEY = 'dashboard.searchEnabled';
	const DASHBOARD_SEARCH_ENGINE_KEY = 'dashboard.searchEngine';
	const DASHBOARD_SEARCH_POSITION_KEY = 'dashboard.searchPosition';
	const DASHBOARD_SHORTCUTS_VISIBLE_KEY = 'dashboard.shortcutsVisible';
	const DASHBOARD_SHORTCUTS_KEY = 'dashboard.shortcuts';
	const DASHBOARD_BOTTOM_LEFT_WIDGETS_KEY = 'dashboard.bottomLeftWidgets';

	// Search engines configuration
	const SEARCH_ENGINES = {
		google: { name: 'Google', url: 'https://www.google.com/search?q=' },
		bing: { name: 'Bing', url: 'https://www.bing.com/search?q=' },
		duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
		yahoo: { name: 'Yahoo', url: 'https://search.yahoo.com/search?p=' },
		yandex: { name: 'Yandex', url: 'https://yandex.com/search/?text=' },
		ecosisa: { name: 'Ecosia', url: 'https://www.ecosia.org/search?q=' }
	};

	// Default shortcuts
	const DEFAULT_SHORTCUTS = [
		{
			name: 'YouTube',
			url: 'https://youtube.com',
			icon: 'https://www.google.com/s2/favicons?domain=youtube.com&sz=64'
		},
		{
			name: 'GitHub',
			url: 'https://github.com',
			icon: 'https://www.google.com/s2/favicons?domain=github.com&sz=64'
		},
		{
			name: 'Twitter',
			url: 'https://twitter.com',
			icon: 'https://www.google.com/s2/favicons?domain=twitter.com&sz=64'
		},
		{
			name: 'Discord',
			url: 'https://discord.com',
			icon: 'https://www.google.com/s2/favicons?domain=discord.com&sz=64'
		}
	];

	function loadDashboardSettings() {
		if (browser) {
			// Initialize dashboard background
			if (localStorage.getItem(DASHBOARD_BG_KEY) === null) {
				localStorage.setItem(DASHBOARD_BG_KEY, '');
			}
			dashboardBg = localStorage.getItem(DASHBOARD_BG_KEY) || DEFAULT_BG_URL;

			// Initialize overlay type
			if (localStorage.getItem(DASHBOARD_OVERLAY_KEY) === null) {
				localStorage.setItem(DASHBOARD_OVERLAY_KEY, 'none');
			}
			overlayType = (localStorage.getItem(DASHBOARD_OVERLAY_KEY) as typeof overlayType) || 'none';

			// Initialize search enabled
			if (localStorage.getItem(DASHBOARD_SEARCH_ENABLED_KEY) === null) {
				localStorage.setItem(DASHBOARD_SEARCH_ENABLED_KEY, 'true');
			}
			const savedSearchEnabled = localStorage.getItem(DASHBOARD_SEARCH_ENABLED_KEY);
			searchEnabled = savedSearchEnabled === 'true';

			// Initialize search engine
			if (localStorage.getItem(DASHBOARD_SEARCH_ENGINE_KEY) === null) {
				localStorage.setItem(DASHBOARD_SEARCH_ENGINE_KEY, 'google');
			}
			searchEngine =
				(localStorage.getItem(DASHBOARD_SEARCH_ENGINE_KEY) as keyof typeof SEARCH_ENGINES) ||
				'google';

			// Initialize search position
			if (localStorage.getItem(DASHBOARD_SEARCH_POSITION_KEY) === null) {
				localStorage.setItem(DASHBOARD_SEARCH_POSITION_KEY, 'center');
			}
			searchPosition =
				(localStorage.getItem(DASHBOARD_SEARCH_POSITION_KEY) as typeof searchPosition) || 'center';

			// Initialize search open in new tab (default to false -> open in current tab)
			if (localStorage.getItem('dashboard.searchOpenInNewTab') === null) {
				localStorage.setItem('dashboard.searchOpenInNewTab', 'false');
			}
			searchOpenInNewTab = localStorage.getItem('dashboard.searchOpenInNewTab') === 'true';

			// Initialize shortcuts visible
			if (localStorage.getItem(DASHBOARD_SHORTCUTS_VISIBLE_KEY) === null) {
				localStorage.setItem(DASHBOARD_SHORTCUTS_VISIBLE_KEY, 'true');
			}
			const savedShortcutsVisible = localStorage.getItem(DASHBOARD_SHORTCUTS_VISIBLE_KEY);
			shortcutsVisible = savedShortcutsVisible === 'true';

			// Initialize shortcuts
			if (localStorage.getItem(DASHBOARD_SHORTCUTS_KEY) === null) {
				localStorage.setItem(DASHBOARD_SHORTCUTS_KEY, JSON.stringify(DEFAULT_SHORTCUTS));
			}
			const savedShortcuts = localStorage.getItem(DASHBOARD_SHORTCUTS_KEY);
			if (savedShortcuts) {
				try {
					shortcuts = JSON.parse(savedShortcuts);
				} catch {
					shortcuts = [...DEFAULT_SHORTCUTS];
				}
			} else {
				shortcuts = [...DEFAULT_SHORTCUTS];
			}

			// Load bottom left widgets settings
			const savedBottomLeftWidgets = localStorage.getItem(DASHBOARD_BOTTOM_LEFT_WIDGETS_KEY);
			if (savedBottomLeftWidgets) {
				try {
					bottomLeftWidgets = JSON.parse(savedBottomLeftWidgets);
				} catch {
					bottomLeftWidgets = ['submissions', 'profile'];
				}
			} else {
				bottomLeftWidgets = ['submissions', 'profile'];
			}
		}
	}

	async function fetchSubmissions() {
		if (!$user.loggedIn || !$user.data) return;

		try {
			const res = await fetch(
				sdk.url(`/players/${$user.data.uid}/submissions?end=10`)
			);
			if (res.ok) {
				submissions = await res.json();
			}
		} catch (e) {
			console.error('Failed to fetch submissions:', e);
		} finally {
			loadingSubmissions = false;
		}
	}

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

	function scrollToContent() {
		window.scrollTo({
			top: window.innerHeight,
			behavior: 'smooth'
		});
	}

	onMount(() => {
		loadDashboardSettings();

		// Update every second for live clock
		const interval = setInterval(() => {
			currentTime = new Date();
		}, 1000);

		return () => clearInterval(interval);
	});

	$: if ($user.loggedIn && $user.checked) {
		fetchSubmissions();
	}
</script>

<!-- Dashboard Settings Component -->
<DashboardSettings
	bind:open={settingsOpen}
	bind:dashboardBg
	bind:overlayType
	bind:searchEnabled
	bind:searchEngine
	bind:searchPosition
	bind:shortcutsVisible
	bind:shortcuts
	bind:bottomLeftWidgets
	bind:searchOpenInNewTab
/>

<div
	class="dashboard-hero relative mt-[-50px] flex min-h-[100vh] w-full flex-col"
	style={isSupporter && dashboardBg ? `background-image: url('${dashboardBg}')` : ''}
>
	<!-- Customizable Overlay (Supporter Only) -->
	{#if isSupporter && (overlayType === 'dark' || overlayType === 'both')}
		<div class="absolute inset-0 z-[1] bg-black/40"></div>
	{/if}
	{#if isSupporter && (overlayType === 'blur' || overlayType === 'both')}
		<div class="absolute inset-0 z-[1] backdrop-blur-sm"></div>
	{/if}

	<!-- Desktop Layout: Absolute positioned elements -->
	<div>
		<!-- Top Search Bar (Desktop) - Supporter Only -->
		{#if isSupporter && searchEnabled && searchPosition === 'top'}
			<div class="absolute left-1/2 top-[70px] z-20 w-full max-w-xl -translate-x-1/2 px-8">
				<DashboardSearch
					bind:searchEnabled
					bind:searchPosition
					bind:searchEngine
					bind:shortcutsVisible
					bind:shortcuts
					bind:searchOpenInNewTab
				/>
			</div>
		{/if}

		<!-- Center Search Bar (Desktop) - Supporter Only -->
		{#if isSupporter && searchEnabled && searchPosition === 'center'}
			<div
				class="absolute left-1/2 top-1/2 z-20 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 px-8"
			>
				<DashboardSearch
					bind:searchEnabled
					bind:searchPosition
					bind:searchEngine
					bind:shortcutsVisible
					bind:shortcuts
					bind:searchOpenInNewTab
				/>
			</div>
		{/if}

		<!-- Bottom Search Bar (Desktop) - Supporter Only -->
		{#if isSupporter && searchEnabled && searchPosition === 'bottom'}
			<div class="absolute bottom-32 left-1/2 z-20 w-full max-w-xl -translate-x-1/2 px-8">
				<DashboardSearch
					bind:searchEnabled
					bind:searchPosition
					bind:searchEngine
					bind:shortcutsVisible
					bind:shortcuts
					bind:searchOpenInNewTab
				/>
			</div>
		{/if}

		<!-- Top Left: Clock & Date -->
		<div class="absolute left-8 top-[70px] z-20">
			<div class="rounded-xl bg-background/60 p-4 backdrop-blur-md">
				<div class="text-5xl font-bold tracking-tight xl:text-6xl">
					{currentTime.toLocaleTimeString('vi-VN', {
						hour: '2-digit',
						minute: '2-digit',
						second: '2-digit'
					})}
				</div>
				<div class="mt-1 text-base text-muted-foreground">
					{currentTime.toLocaleDateString('vi-VN', {
						weekday: 'long',
						year: 'numeric',
						month: 'long',
						day: 'numeric'
					})}
				</div>
			</div>
		</div>

		<!-- Top Right: Weather + Settings -->
		<div class="absolute right-8 top-[70px] z-20 flex items-start gap-2">
			<div class="shrink-0">
				<DashboardWeather />
			</div>
			<button
				class="rounded-full bg-background/60 p-3 backdrop-blur-md transition-all hover:bg-background/80"
				on:click={() => (settingsOpen = true)}
			>
				<Gear class="h-5 w-5" />
			</button>
		</div>

		<!-- Left Side: Player Profile + Pending Submissions (Customizable) -->
		<div class="absolute bottom-24 left-8 z-20 hidden flex-col gap-4 xl:flex">
			{#each bottomLeftWidgets as widget}
				{#if widget === 'submissions' && $user.loggedIn}
					<div class="w-[350px] xl:w-[380px]">
						<DashboardSubmissions bind:submissions bind:loading={loadingSubmissions} />
					</div>
				{:else if widget === 'profile'}
					<div class="w-[350px] xl:w-[380px]">
						{#if $user.loggedIn && $user.data}
							<PlayerCard player={$user.data} />
						{:else if $user.checked}
							<Card.Root class="bg-background/60 backdrop-blur-md">
								<Card.Content class="flex flex-col items-center gap-4 py-6 text-center">
									<p class="text-muted-foreground">
										{$_('dashboard.login_prompt') || 'Sign in to view your profile'}
									</p>
									<Button variant="outline" href="/discord">
										{$_('dashboard.login') || 'Sign In'}
									</Button>
								</Card.Content>
							</Card.Root>
						{:else}
							<Card.Root class="bg-background/60 backdrop-blur-md">
								<Card.Content class="space-y-3 py-4">
									<Skeleton class="h-12 w-12 rounded-full" />
									<Skeleton class="h-4 w-32" />
									<Skeleton class="h-20 w-full" />
								</Card.Content>
							</Card.Root>
						{/if}
					</div>
				{/if}
			{/each}
		</div>

		<!-- Bottom Right: Event Carousel -->
		<div class="absolute bottom-24 right-8 z-20 w-[380px] xl:w-[420px] hidden xl:block">
			<DashboardEvents bind:events bind:currentTime />
		</div>

		<!-- Scroll Down Indicator (Desktop) -->
		<button
			class="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 animate-bounce flex-col items-center gap-1 text-foreground/80 transition-colors hover:text-foreground"
			on:click={scrollToContent}
		>
			<span class="rounded-full bg-background/60 px-4 py-1 text-sm font-medium backdrop-blur-md"
				>{$_('dashboard.scroll_down') || 'Scroll down for more'}</span
			>
			<ChevronDown class="h-6 w-6" />
		</button>
	</div>
</div>

{#if selectedSubmission && $user.data}
	<RecordDetail
		uid={$user.data.uid}
		levelID={selectedSubmission.levelid}
		bind:open={recordDetailOpen}
	/>
{/if}

<style lang="scss">
	.dashboard-hero {
		background-size: cover;
		background-position: center;
		// Use scroll on mobile for better performance
		background-attachment: scroll;

		@media (min-width: 1024px) {
			background-attachment: fixed;
		}
	}

	@keyframes bounce {
		0%,
		100% {
			transform: translateX(-50%) translateY(0);
		}
		50% {
			transform: translateX(-50%) translateY(-10px);
		}
	}

	.animate-bounce {
		animation: bounce 2s infinite;
	}

	// Extra small breakpoint for very small phones
	@media (max-width: 350px) {
		:global(.dashboard-hero) {
			padding-left: 0.5rem !important;
			padding-right: 0.5rem !important;
		}
	}
</style>
