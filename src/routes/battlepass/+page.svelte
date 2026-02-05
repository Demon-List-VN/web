<script lang="ts">
	import type { PageData } from './$types';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { _ } from 'svelte-i18n';
	import Star from 'lucide-svelte/icons/star';
	import Gift from 'lucide-svelte/icons/gift';
	import Target from 'lucide-svelte/icons/target';
	import Map from 'lucide-svelte/icons/map';
	import Sun from 'lucide-svelte/icons/sun';
	import PremiumPurchaseDialog from './PremiumPurchaseDialog.svelte';
	import RewardsTab from './RewardsTab.svelte';
	import DailyTab from './DailyTab.svelte';
	import LevelsTab from './LevelsTab.svelte';
	import MapPacksTab from './MapPacksTab.svelte';
	import MissionsTab from './MissionsTab.svelte';
	import BattlepassTopBanner from './BattlepassTopBanner.svelte';

	export let data: PageData;

	let purchaseDialogOpen = false;

	// Primary color from season (default to purple if not set)
	$: primaryColor = data.season?.primaryColor || '#8b5cf6';
</script>

<svelte:head>
	<title>{$_('battlepass.title')} - Demon List VN</title>
</svelte:head>

{#if !data.season}
	<div class="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
		<div class="text-6xl">🎮</div>
		<h2 class="text-2xl font-bold">{$_('battlepass.no_active_season')}</h2>
		<p class="text-muted-foreground">{$_('battlepass.check_back_later')}</p>
	</div>
{:else}
	<BattlepassTopBanner
		season={data.season}
		{primaryColor}
		bind:purchaseDialogOpen
	/>

	<!-- Main Content Tabs -->
	<div class="mx-auto max-w-6xl px-4 py-8">
		<Tabs.Root value="rewards" class="flex flex-col items-center">
			<Tabs.List class="mb-6 grid w-full max-w-2xl grid-cols-4">
				<Tabs.Trigger value="rewards" class="flex items-center gap-2">
					<Gift class="h-4 w-4" />
					<span class="hidden sm:inline">{$_('battlepass.tabs.rewards')}</span>
				</Tabs.Trigger>
				<Tabs.Trigger value="daily" class="flex items-center gap-2">
					<Sun class="h-4 w-4" />
					<span class="hidden sm:inline">{$_('battlepass.tabs.daily')}</span>
				</Tabs.Trigger>
				<Tabs.Trigger value="levels" class="flex items-center gap-2">
					<Star class="h-4 w-4" />
					<span class="hidden sm:inline">{$_('battlepass.tabs.levels')}</span>
				</Tabs.Trigger>
				<Tabs.Trigger value="mappacks" class="flex items-center gap-2">
					<Map class="h-4 w-4" />
					<span class="hidden sm:inline">{$_('battlepass.tabs.mappacks')}</span>
				</Tabs.Trigger>
				<!-- <Tabs.Trigger value="missions" class="flex items-center gap-2">
					<Target class="h-4 w-4" />
					<span class="hidden sm:inline">{$_('battlepass.tabs.missions')}</span>
				</Tabs.Trigger> -->
			</Tabs.List>

			<!-- Rewards Tab -->
			<Tabs.Content value="rewards" class="w-full">
				<RewardsTab />
			</Tabs.Content>

			<!-- Daily/Weekly Tab -->
			<Tabs.Content value="daily" class="w-full">
				<DailyTab {primaryColor} />
			</Tabs.Content>

			<!-- Levels Tab -->
			<Tabs.Content value="levels" class="w-full">
				<LevelsTab {primaryColor} />
			</Tabs.Content>

			<!-- Map Packs Tab -->
			<Tabs.Content value="mappacks" class="w-full">
				<MapPacksTab {primaryColor} />
			</Tabs.Content>

			<!-- Missions Tab (Planned) -->
			<!-- <Tabs.Content value="missions" class="w-full">
				<MissionsTab {primaryColor} seasonId={data.season?.id} />
			</Tabs.Content> -->
		</Tabs.Root>
	</div>

	<!-- Premium Purchase Dialog -->
	<PremiumPurchaseDialog bind:open={purchaseDialogOpen} seasonTitle={data.season?.title || ''} seasonId={data.season?.id} />
{/if}

<style lang="scss">
	/* Hero styles moved to BattlepassTopBanner component */
</style>
