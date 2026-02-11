<script lang="ts">
	import Ads from '$lib/components/ads.svelte';
	import BigTitle from '$lib/components/bigTitle.svelte';
	import Markdown from '$lib/components/markdown.svelte';
	import { locale } from 'svelte-i18n';
	import type { PageData } from './$types';

	export let data: PageData;

	$: generalRules = data.rules.filter((rule: any) => rule.type === 'general' && rule.lang === $locale);
	$: classicRules = data.rules.filter((rule: any) => rule.type === 'classic' && rule.lang === $locale);
	$: platformerRules = data.rules.filter((rule: any) => rule.type === 'platformer' && rule.lang === $locale);
</script>

<svelte:head>
	<title>Luật - Geometry Dash Việt Nam</title>
</svelte:head>
{#if $locale == 'vi'}
	<BigTitle value="Luật" description="Đọc luật" />
{:else}
	<BigTitle value="Rules" description="Read the rules" />
{/if}
<Ads unit="leaderboard" />
<div class="wrapper">
	{#each generalRules as rule}
		<Markdown content={rule.content} />
	{/each}
	
	{#each classicRules as rule}
		<Markdown content={rule.content} />
	{/each}
	
	{#each platformerRules as rule}
		<Markdown content={rule.content} />
	{/each}
</div>

<style lang="scss">
	.wrapper {
		padding-inline: 100px;
	}

	@media screen and (max-width: 900px) {
		.wrapper {
			padding-inline: 15px;
		}
	}
</style>
