<script lang="ts">
	import type { PageData } from './$types';
	import * as Tabs from '$lib/components/ui/tabs';
	import { user } from '$lib/client';
	import EventBanner from '../eventBanner.svelte';
	import Markdown from '$lib/components/markdown.svelte';
	import LevelTab from './levelTab.svelte';
	import Leaderboard from './leaderboard.svelte';
	import { onMount } from 'svelte';
	import ParticipateButton from './participateButton.svelte';
	import type { Level } from './type';
	import Ads from '$lib/components/ads.svelte';
	import { _ } from 'svelte-i18n';
	import { toast } from 'svelte-sonner';
	import QuestTab from './questTab.svelte';
	import { Button } from '$lib/components/ui/button';

	export let data: PageData;

	let levels: (Level | null)[] = [];

	async function refresh() {
		toast.promise(
			async () => {
				levels = await (
					await fetch(`${import.meta.env.VITE_API_URL}/events/${data.id}/levels`)
				).json();
			},
			{
				success: $_('contest.leaderboard.refresh.success'),
				error: $_('contest.leaderboard.refresh.error'),
				loading: $_('contest.leaderboard.refresh.loading')
			}
		);
	}

	onMount(async () => {
		levels = await (await fetch(`${import.meta.env.VITE_API_URL}/events/${data.id}/levels`)).json();
	});
</script>

<svelte:head>
	<title>{data.title} - Geometry Dash Việt Nam</title>
	<meta property="og:title" content={`${data.title} - Geometry Dash Việt Nam`} />
	<meta property="og:description" content={data.description} />
	<meta
		property="og:image"
		content={data.imgUrl ? data.imgUrl : `https://cdn.gdvn.net/event-banner/${data.id}.webp`}
	/>
</svelte:head>

<EventBanner {data} />
<Ads dataAdFormat="auto" unit="leaderboard" />

{#if !data.hidden || ($user.loggedIn && $user.data.isAdmin)}
	<div class="flex items-center justify-center gap-[10px] mt-[10px]">
		<ParticipateButton {data} />
		{#if $user.loggedIn && $user.data.isAdmin}
			<Button href="/admin/event?id={data.id}" variant="outline">Manage Event</Button>
		{/if}
	</div>
	{#if data.isContest}
		<Tabs.Root value="detail" class="mt-[20px] flex flex-col items-center">
			<Tabs.List>
				<Tabs.Trigger value="detail">{$_('contest.tabs.detail')}</Tabs.Trigger>
				<Tabs.Trigger value="levels">{$_('contest.tabs.levels')}</Tabs.Trigger>
				<Tabs.Trigger value="leaderboard">{$_('contest.tabs.leaderboard')}</Tabs.Trigger>
				<Tabs.Trigger value="quests">{$_('contest.tabs.quests')}</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="detail">
				<div class="markdown">
					{#if data.content}
						<Markdown content={data.content} />
					{/if}
				</div>
			</Tabs.Content>
			<Tabs.Content value="levels" class="mt-[20px] w-full pl-[10px] pr-[10px]">
				<LevelTab {levels} event={data} {refresh} />
			</Tabs.Content>
			<Tabs.Content value="leaderboard" class="mt-[20px] w-full pl-[10px] pr-[10px]">
				{#if levels.length}
					<Leaderboard {levels} event={data} />
				{/if}
			</Tabs.Content>
			<Tabs.Content value="quests" class="mt-[20px] w-full pl-[10px] pr-[10px]">
				<QuestTab event={data} />
			</Tabs.Content>
		</Tabs.Root>
	{:else}
		<div class="markdown">
			{#if data.content}
				<Markdown content={data.content} />
			{/if}
		</div>
	{/if}
{/if}

<style lang="scss">
	.markdown {
		width: 1000px;
		margin-inline: auto;
		max-width: 100%;
		padding-inline: 10px;
	}

	@media screen and (max-width: 1000px) {
		.markdown {
			width: 100%;
		}
	}
</style>
