<script lang="ts">
	import { onMount } from 'svelte';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import LevelCard from '$lib/components/levelCard.svelte';
	import { isActive } from '$lib/client/isSupporterActive';
	import { _ } from 'svelte-i18n';
	
	export let clan: any;

	const filter = {
		dl: {
			from: 0,
			to: 49
		},
		fl: {
			from: 0,
			to: 49
		},
		pl: {
			from: 0,
			to: 49
		}
	};
	const levels: {
		dl: any[];
		fl: any[];
		pl: any[];
	} = {
		dl: [],
		fl: [],
		pl: []
	};
	let list: 'dl' | 'pl' | 'fl' = 'dl';
	let selectedList: 'dl' | 'pl' | 'fl' = 'dl';

	async function fetchLevels() {
		fetch(
			// @ts-expect-error
			`${import.meta.env.VITE_API_URL}/clans/${clan.id}/list/${list}?${new URLSearchParams(filter[list]).toString()}`
		)
			.then((res) => res.json())
			.then((res: any) => {
				levels[list] = levels[list].concat(res);
				filter[list].from += res.length;
				filter[list].to += res.length;
			});
	}

	onMount(async () => {
		if (!isActive(clan.boostedUntil)) {
			return;
		}
        
		await fetchLevels();
	});
</script>

{#if isActive(clan.boostedUntil)}
	<div class="filter">
		<div class="filterItem">
			<Label>List</Label>
			<Select.Root
				selected={{
					label: 'Classic',
					value: 'string'
				}}
				onSelectedChange={(e) => {
					// @ts-expect-error
					selectedList = e?.value;
				}}
			>
				<Select.Trigger class="w-[200px]">
					<Select.Value placeholder="Select item to sort by" />
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="dl" selected>Classic</Select.Item>
					<Select.Item value="pl">Platformer</Select.Item>
					<Select.Item value="fl">Featured</Select.Item>
				</Select.Content>
			</Select.Root>
			<Button
				variant="outline"
				on:click={async () => {
					list = selectedList;

					if (levels[list].length) {
						return;
					}

					await fetchLevels();
				}}>{$_("general.apply")}</Button
			>
		</div>
	</div>
{/if}

<div class="mx-auto grid max-w-[1000px] grid-cols-1 gap-[10px] xl:grid-cols-2">
	{#each levels[list] as level, index}
		<LevelCard {level} type={list} top={index + 1} />
	{/each}
</div>

<style lang="scss">
	.filter {
		display: flex;
		gap: 30px;
		margin-bottom: 10px;
		justify-content: center;
		border-radius: var(--radius);
		border: 1px solid var(--border1);
		padding-top: 10px;
		padding-bottom: 10px;
		width: fit-content;
		padding-inline: 20px;
		margin-inline: auto;

		.filterItem {
			display: flex;
			gap: 10px;
			align-items: center;
		}
	}

	@media screen and (max-width: 1200px) {
		.filter {
			flex-direction: column;
			margin-bottom: 20px;
			gap: 15px;
		}
	}
</style>
