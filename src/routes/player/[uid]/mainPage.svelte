<script lang="ts">
	import type { PageData } from './$types';
	import * as Tabs from '$lib/components/ui/tabs';
	import Ads from '$lib/components/ads.svelte';
	import { isActive } from '$lib/client/isSupporterActive';
	import { _ } from 'svelte-i18n';
	import OverviewTab from './tabs/OverviewTab/index.svelte';
	import ProfileHero from './components/ProfileHero.svelte';
	import StatsBar from './components/StatsBar.svelte';
	import RecordsTab from './components/RecordsTab.svelte';
	import ActivityTab from './components/ActivityTab.svelte';
	import CollectionTab from './components/CollectionTab.svelte';

	export let data: PageData;
</script>

<svelte:head>
	<title>{data.player.name} - Geometry Dash Việt Nam</title>
	<meta property="og:title" content={`${data.player.name} - Geometry Dash Việt Nam`} />
	<meta
		property="og:description"
		content={data.selectedList
			? `${data.selectedList.title}: ${Math.round(data.selectedList.score * 10) / 10} #${data.selectedList.rank}\nRecords: ${data.selectedList.completedCount}\nĐiểm cuộc thi: ${data.player.elo}`
			: `Điểm Classic: ${data.player.rating} #${data.player.overallRank}\nTổng điểm Featured List: ${data.player.totalFLpt} #${data.player.flrank}\nĐiểm cuộc thi: ${data.player.elo}`}
	/>
	<meta
		property="og:image"
		content={`https://cdn.gdvn.net/avatars/${data.player.uid}${
			isActive(data.player.supporterUntil) && data.player.isAvatarGif ? '.gif' : '.jpg'
		}?version=${data.player.avatarVersion}`}
	/>
</svelte:head>

{#if data.player.isBanned}
	<div class="flex h-[50px] items-center justify-center bg-red-600 relative z-50">
		{$_('player.banned_notice')}
	</div>
{:else if data.player.isHidden}
	<div class="flex h-[50px] items-center justify-center bg-yellow-600 relative z-50">
		{$_('player.hidden_notice')}
	</div>
{/if}

<ProfileHero bind:data />

{#if !isActive(data.player.supporterUntil)}
	<div class="mx-auto max-w-[1200px] px-4 py-4">
		<Ads dataAdFormat="auto" />
	</div>
{/if}

<div class="mx-auto max-w-[1200px] px-4 pb-8 sm:px-6 lg:px-8">
	<Tabs.Root value="overview">
		<div class="flex flex-col items-center gap-4 pt-4">
			<Tabs.List class="flex h-fit w-fit flex-wrap">
				<Tabs.Trigger value="overview">{$_('player.tabs.overview')}</Tabs.Trigger>
				<Tabs.Trigger value="records">{$_('player.tabs.records')}</Tabs.Trigger>
				<Tabs.Trigger value="activity">{$_('player.tabs.activity')}</Tabs.Trigger>
				<Tabs.Trigger value="collection">{$_('player.tabs.collection')}</Tabs.Trigger>
			</Tabs.List>

			<Tabs.Content value="overview" class="w-full max-w-[1200px]">
				<OverviewTab {data} />
			</Tabs.Content>

			<Tabs.Content value="records" class="w-full max-w-[1200px]">
				<RecordsTab bind:data />
			</Tabs.Content>

			<Tabs.Content value="activity" class="w-full max-w-[1200px]">
				<ActivityTab userID={data.player.uid} />
			</Tabs.Content>

			<Tabs.Content value="collection" class="w-full max-w-[1200px]">
				<CollectionTab userID={data.player.uid} {data} />
			</Tabs.Content>
		</div>
	</Tabs.Root>
</div>
