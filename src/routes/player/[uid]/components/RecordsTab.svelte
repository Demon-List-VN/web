<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import RecordDetail from '$lib/components/recordDetail.svelte';
	import { page } from '$app/stores';
	import { _ } from 'svelte-i18n';

	export let data: any;

	let list: 'dl' | 'pl' | 'cl' | 'fl' = 'dl';
	let recordDetailOpened = false;
	let selectedRecord: any = null;

	const filter = {
		sortBy: 'pt',
		ascending: false
	};

	const listOptions: { value: 'dl' | 'pl' | 'cl' | 'fl'; label: string }[] = [
		{ value: 'dl', label: 'Classic' },
		{ value: 'pl', label: 'Platformer' },
		{ value: 'cl', label: 'Challenge' },
		{ value: 'fl', label: 'Featured' }
	];

	function getTimeString(ms: number) {
		const minutes = Math.floor(ms / 60000);
		const seconds = Math.floor((ms % 60000) / 1000);
		const milliseconds = ms % 1000;
		return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds}`;
	}

	async function applyFilter() {
		const records: any[] = await (
			await fetch(
				`${import.meta.env.VITE_API_URL}/players/${$page.params.uid}/records?sortBy=${filter.sortBy}&ascending=${filter.ascending}&end=500`
			)
		).json();
		data.records = records;
		data = data;
	}
</script>

{#if selectedRecord}
	<RecordDetail
		bind:open={recordDetailOpened}
		bind:uid={selectedRecord.userid}
		bind:levelID={selectedRecord.levelid}
	/>
{/if}

<!-- List Type Selector -->
<div class="mb-4 flex flex-wrap justify-center gap-2">
	{#each listOptions as option}
		<Button
			variant={list === option.value ? 'default' : 'outline'}
			size="sm"
			on:click={() => (list = option.value)}
		>
			{option.label}
		</Button>
	{/each}
</div>

<!-- Filter -->
<div class="filter">
	<div class="filterItem">
		<Label>{$_('general.sort_by')}</Label>
		<Select.Root
			selected={{ label: $_('player.filter.point'), value: 'pt' }}
			onSelectedChange={(e) => {
				// @ts-expect-error
				filter.sortBy = e.value;
			}}
		>
			<Select.Trigger class="w-[180px]">
				<Select.Value placeholder={$_('player.filter.sort_by')} />
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="pt">{$_('player.filter.point')}</Select.Item>
				<Select.Item value="timestamp">{$_('player.filter.date_submitted')}</Select.Item>
			</Select.Content>
		</Select.Root>
	</div>
	<div class="filterItem">
		<Label>{$_('general.ascending')}</Label>
		<Switch bind:checked={filter.ascending} />
	</div>
	<div class="filterItem">
		<Button variant="outline" on:click={applyFilter}>{$_('general.apply')}</Button>
	</div>
</div>

<!-- Records Table -->
{#if data.records[list]}
	<Table.Root>
		<Table.Caption>{$_('player.table.total_record')}: {data.records[list].length}</Table.Caption>
		<Table.Header>
			<Table.Row>
				<Table.Head>{$_('player.table.level')}</Table.Head>
				<Table.Head class="w-[100px] text-center">{$_('player.table.submitted_on')}</Table.Head>
				<Table.Head class="w-[100px] text-center">{$_('player.table.device')}</Table.Head>
				<Table.Head class="w-[80px] text-center">{$_('player.table.point')}</Table.Head>
				{#if list == 'pl'}
					<Table.Head class="w-[80px] text-center">{$_('player.table.time')}</Table.Head>
				{:else}
					<Table.Head class="w-[80px] text-center">{$_('player.table.progress')}</Table.Head>
				{/if}
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each data.records[list] as record}
				<Table.Row
					on:click={(e) => {
						// @ts-expect-error
						if (e.target.nodeName == 'A') return;
						selectedRecord = record;
						recordDetailOpened = true;
					}}
				>
					<Table.Cell class="font-medium">
						<div class="relative flex">
							<img
								class="levelBG absolute ml-[-18px] mt-[-16px] box-border h-[53.5px] w-[350px] max-w-full object-cover"
								src={`https://img.youtube.com/vi/${record.levels.videoID}/0.jpg`}
								alt="bg"
							/>
							<a
								class="levelName z-10"
								href={`/level/${record.levels.id}`}
								data-sveltekit-preload-data="tap"
							>
								{record.levels.name}
							</a>
						</div>
					</Table.Cell>
					<Table.Cell class="text-center">
						{new Date(record.timestamp).toLocaleString('vi-VN')}
					</Table.Cell>
					<Table.Cell class="text-center">
						{record.mobile ? 'Mobile' : 'PC'}
						{#if record.refreshRate}
							<br />({record.refreshRate}fps)
						{/if}
					</Table.Cell>
					<Table.Cell class="text-center">
						{Math.round(record[list + 'Pt'] * 10) / 10}
					</Table.Cell>
					{#if list == 'pl'}
						<Table.Cell class="text-center">{getTimeString(record.progress)}</Table.Cell>
					{:else}
						<Table.Cell class="text-center">{record.progress}%</Table.Cell>
					{/if}
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
{/if}

<style lang="scss">
	.levelBG {
		padding-right: 10px;
		mask-image: linear-gradient(
			90deg,
			rgba(0, 0, 0, 0) 0%,
			rgba(0, 0, 0, 1) 20%,
			rgba(0, 0, 0, 1) 50%,
			rgba(0, 0, 0, 0) 90%,
			rgba(0, 0, 0, 0) 100%
		);
		opacity: 0.5;
		transition: opacity 0.3s;
	}

	.levelBG:hover {
		opacity: 1;
	}

	.levelName {
		text-shadow: 0px 1px 2px var(--textColorInverted);
	}

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
