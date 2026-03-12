<script lang="ts">
	import * as sdk from '$lib/client/sdk';
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { get } from 'svelte/store';
	import { _ } from 'svelte-i18n';
	import Quest from './quest.svelte';

	export let event: any;
	let data: any[] = [];

	async function fetchData() {
		const res = await (
			await sdk.fetch(`/events/${event.id}/quest`)
		).json();

		return res;
	}

	function rarityColor(r: number) {
		switch (r) {
			case 1:
				return '#3b82f6';
			case 2:
				return '#a855f7';
			case 3:
				return '#ec4899';
			case 4:
				return '#dc2626';
			default:
				return '#9ca3af';
		}
	}

	function rarityName(r: number) {
		switch (r) {
			case 1:
				return get(_)('inventory.rarity_names.uncommon');
			case 2:
				return get(_)('inventory.rarity_names.rare');
			case 3:
				return get(_)('inventory.rarity_names.epic');
			case 4:
				return get(_)('inventory.rarity_names.legendary');
			default:
				return get(_)('inventory.rarity_names.common');
		}
	}

	onMount(async () => {
		data = await fetchData();
	});
</script>

<div class="mx-auto flex flex-col gap-[10px] lg:w-[1000px]">
	{#each data as quest}
		<Quest {quest} />
	{/each}
</div>
