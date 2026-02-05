<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs';

	import BigTitle from '$lib/components/bigTitle.svelte';
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Ads from '$lib/components/ads.svelte';

	let curTab = $page.url.pathname.split('/').at(-1) == 'leaderboard' ? 'leaderboard' : 'levels';

	function update() {
		curTab = $page.url.pathname.split('/').at(-1) == 'leaderboard' ? 'leaderboard' : 'levels';
	}

	$: ($page.url, update());
</script>

{#if $page.params.list == 'dl'}
	<BigTitle value={$_('list.classic.title')} description={$_('list.classic.description')} />
{:else if $page.params.list == 'pl'}
	<BigTitle value={$_('list.platformer.title')} description={$_('list.platformer.description')} />
{:else if $page.params.list == 'cl'}
	<BigTitle value={$_('list.challenge.title')} description={$_('list.challenge.description')} />
{:else if $page.params.list == 'fl'}
	<BigTitle value={$_('list.featured.title')} description={$_('list.featured.description')} />
{/if}

<Tabs.Root bind:value={curTab} class="tabs">
	<div class="tabsWrapper">
		<Tabs.List>
			<Tabs.Trigger
				value="levels"
				on:click={() => {
					goto(`/list/${$page.params.list}`);
				}}>{$_('list.tabs.levels')}</Tabs.Trigger
			>
			<Tabs.Trigger
				value="leaderboard"
				on:click={() => {
					goto(`/list/${$page.params.list}/leaderboard`);
				}}>{$_('list.tabs.leaderboard')}</Tabs.Trigger
			>
		</Tabs.List>
	</div>
</Tabs.Root>

<Ads dataAdFormat="auto" unit="leaderboard" />

<slot />

<style lang="scss">
	.tabsWrapper {
		display: flex;
		justify-content: center;
		gap: 10px;
		margin-bottom: 25px;
	}
</style>
