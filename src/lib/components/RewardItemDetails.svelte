<script lang="ts">
	import { get } from 'svelte/store';
	import { _ } from 'svelte-i18n';

	export let itemData: any;
	export let quantity: number = 1;

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
</script>

<div class="flex items-start gap-3">
	<img
		class="h-16 w-16 object-contain"
		src={`https://cdn.demonlistvn.com/items/${itemData.id}.webp`}
		alt={itemData.name}
	/>
	<div>
		<div class="font-medium">{itemData.name}</div>
		{#if itemData.rarity !== undefined}
			<div class="text-sm text-neutral-400">
				<b>{get(_)('events.quest.rarity_label')}</b>
				<span class="font-bold" style="color: {rarityColor(itemData.rarity)}"
					>{rarityName(itemData.rarity)}</span
				>
			</div>
		{/if}
		{#if itemData.description}
			<div class="text-sm text-neutral-400">
				<b>{get(_)('events.quest.description_label')}:</b>
				{itemData.description}
			</div>
		{/if}
		{#if quantity > 1}
			<div class="text-sm text-neutral-400">
				<b>{get(_)('events.quest.quantity_label')}:</b>
				{quantity}
			</div>
		{/if}
	</div>
</div>
