<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select';
	import { Switch } from '$lib/components/ui/switch';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label/index.js';
	import { toast } from 'svelte-sonner';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import Loading from '$lib/components/animation/loading.svelte';
	import PlayerHoverCard from '$lib/components/playerLink.svelte';
	import type { PageData } from './$types';
	import Ads from '$lib/components/ads.svelte';
	import { _ } from 'svelte-i18n';

	export let data: PageData;
	let players: any[] = [];

	const defaultValue: any = {
		province: null,
		city: null,
		sortBy: null,
		ascending: false
	};

	let filter = structuredClone(defaultValue);
	let state = 0;
	let pointProp: string = 'rating';

	function reset() {
		filter = structuredClone(defaultValue);
		state = 0;
	}

	async function apply() {
		state = 1;
		const x: any = structuredClone(filter);

		try {
			x.province = x.province.value;
			x.city = x.city ? x.city.value : '';
			x.sortBy = x.sortBy.value;
		} catch {
			toast.error('Invalid query.');
			state = 0;
			return;
		}

		try {
			pointProp = x.sortBy;

			const query = new URLSearchParams(x);
			const res = await (
				await fetch(`${import.meta.env.VITE_API_URL}/players?${query.toString()}`)
			).json();

			players = res;
			state = 2;
		} catch {
			toast.error('An error occured.');
		}
	}
</script>

<svelte:head>
	<title>Người chơi - Geometry Dash Việt Nam</title>
</svelte:head>

<div class="wrapper">
	<Card.Root class="mb-[50px] ml-auto mr-auto max-w-[1000px]">
		<Card.Header>
			<Card.Title>{$_('players.title', { default: 'Filter' })}</Card.Title>
		</Card.Header>
		<Card.Content>
			<h4>{$_('players.filter.location')}</h4>
			<div class="selectWrapper">
				<Select.Root bind:selected={filter.province}>
					<Select.Trigger>
						<Select.Value placeholder={$_('players.filter.province')} />
					</Select.Trigger>
					<Select.Content>
						<ScrollArea class="h-[300px]">
							{#each data.provinces.list as province}
								<Select.Item value={province.name} on:click={() => (filter.city = null)}
									>{province.name}</Select.Item
								>
							{/each}
						</ScrollArea>
					</Select.Content>
				</Select.Root>
				<Select.Root disabled={filter.province == null} bind:selected={filter.city}>
					<Select.Trigger>
						<Select.Value placeholder={$_('players.filter.city')} />
					</Select.Trigger>
					<Select.Content>
						<ScrollArea class="h-[300px]">
							{#each data.provinces.map[filter.province.value].wards as ward}
								<Select.Item value={ward}>{ward}</Select.Item>
							{/each}
						</ScrollArea>
					</Select.Content>
				</Select.Root>
			</div>
			<h4 class="mt-[10px]">{$_('players.filter.options')}</h4>
			<div class="selectWrapper">
				<Select.Root bind:selected={filter.sortBy}>
					<Select.Trigger>
						<Select.Value placeholder={$_('players.filter.sort_by')} />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="rating">{$_('players.filter.rating')}</Select.Item>
						<Select.Item value="totalFLpt">{$_('players.filter.featured_list_point')}</Select.Item>
					</Select.Content>
				</Select.Root>
				<div class="flex items-center space-x-2">
					<Switch id="airplane-mode" bind:checked={filter.ascending} />
					<Label for="airplane-mode">{$_('players.filter.sort_ascending')}</Label>
				</div>
			</div>
		</Card.Content>
		<Card.Footer>
			<Button variant="outline" class="ml-auto" on:click={reset}
				>{$_('players.filter.reset')}</Button
			>
			<Button type="submit" class="ml-[10px] transition-all" on:click={apply}>Apply</Button>
		</Card.Footer>
	</Card.Root>
	<Ads />
	{#if state == 1}
		<Loading inverted />
	{:else if state == 2}
		<Table.Root>
			<Table.Caption>{$_('players.table.total_player')}: {players.length}</Table.Caption>
			<Table.Header>
				<Table.Row>
					<Table.Head class="w-[75px] text-center">{$_('players.table.no')}</Table.Head>
					<Table.Head>{$_('players.table.player')}</Table.Head>
					<Table.Head class="w-[100px] text-center">
						{pointProp == 'rating' ? $_('players.table.rating') : $_('players.table.total_point')}
					</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each players as player, index}
					<Table.Row>
						<Table.Cell class="text-center font-medium">
							#{index + 1}
						</Table.Cell>
						<Table.Cell class="font-medium">
							<PlayerHoverCard {player} />
						</Table.Cell>
						<Table.Cell class="text-center">
							{#if pointProp == 'rating'}
								{player.rating}
							{:else if pointProp == 'totalFLpt'}
								{player.totalFLpt}
							{/if}
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	{/if}
</div>

<style lang="scss">
	h4 {
		font-weight: 600;
		margin-bottom: 10px;
	}

	.wrapper {
		padding-top: 50px;
		padding-inline: 100px;
	}

	.selectWrapper {
		display: grid;
		grid-template-columns: calc(50% - 10px) calc(50% - 10px);
		gap: 20px;
	}

	@media screen and (max-width: 900px) {
		.wrapper {
			padding-inline: 20px;
		}
	}

	@media screen and (max-width: 600px) {
		.selectWrapper {
			grid-template-columns: 100%;
			gap: 10px;
		}
	}
</style>
