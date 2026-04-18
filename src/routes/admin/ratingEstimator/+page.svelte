<script lang="ts">
	import LevelCard from '$lib/components/levelCard.svelte';
	import { toLevelCardProps } from '$lib/components/levelCardProps';
	import Button from '$lib/components/ui/button/button.svelte';
	import supabase from '$lib/client/supabase';
	import { onMount } from 'svelte';
	import { user } from '$lib/client';
	import Title from '$lib/components/Title.svelte';
	import Loading from '$lib/components/animation/loading.svelte';

	let l = -1,
		r = -1;

	let lvStart: any = null,
		lvEnd: any = null;

	let level: any = null;

	function mid() {
		return Math.floor((l + r) / 2);
	}

	async function getLevelCount() {
		const { data, error } = await supabase
			.from('levels')
			.select('id, dlTop')
			.not('dlTop', 'is', null)
			.order('dlTop', { ascending: false })
			.limit(1)
			.single();

		return data?.dlTop;
	}

	async function fetchLevel(top: number) {
		const { data, error } = await supabase
			.from('levels')
			.select('*')
			.eq('dlTop', top)
			.limit(1)
			.single();

		return data;
	}

	async function setEasier() {
		l = mid();
		level = null;
		level = await fetchLevel(mid());

		if (l == r - 1) {
			fetchRatingRange();
		}
	}

	async function setHarder() {
		r = mid();
		level = null;
		level = await fetchLevel(mid());

		if (l == r - 1) {
			fetchRatingRange();
		}
	}

	async function fetchRatingRange() {
		lvStart = await fetchLevel(l);
		lvEnd = await fetchLevel(r);
	}

	onMount(async () => {
		l = 1;
		r = await getLevelCount();
		level = await fetchLevel(mid());
	});
</script>

<Title value="Rating estimator" />

<div class="wrapper">
	{#if l == r - 1}
		{#if lvStart && lvEnd}
			<p>Estimated rating range: {lvEnd.rating} - {lvStart.rating}</p>
			<div class="finWrapper">
				<LevelCard {...toLevelCardProps(lvStart, 'dl')} type="dl" />
				<LevelCard {...toLevelCardProps(lvEnd, 'dl')} type="dl" />
			</div>
		{:else}
			<Loading inverted />
		{/if}
	{:else if level}
		<div class="lvWrapper">
			<LevelCard {...toLevelCardProps(level, 'dl')} type="dl" />
			<div class="btn">
				<Button on:click={setEasier}>Easier</Button>
				<span>or</span>
				<Button on:click={setHarder}>Harder</Button>
			</div>
			<div>Placement range: {r} - {l}</div>
		</div>
	{:else}
		<Loading inverted />
	{/if}
</div>

<style lang="scss">
	.lvWrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
	}

	.finWrapper {
		display: flex;
		gap: 20px;
		margin-top: 20px;
	}

	.wrapper {
		padding: 80px;
	}

	.btn {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 10px;
	}
</style>
