<script lang="ts">
	import { Label } from '$lib/components/ui/label/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import * as Select from '$lib/components/ui/select';
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';

	export let uid: string;
	let year: number = new Date().getFullYear();
	let data: number[] = Array(366).fill(0);
	let splitByMonth = true;

	function daysInMonth(year: number, month: number) {
		return new Date(year, month, 0).getDate();
	}

	function monthOffset(year: number, month: number) {
		const x = new Date(year, month, 1).getDay();
		return (x - 1 + 7) % 7;
	}

	function dayOfYear(year: number, month: number, date: number) {
		const x = new Date(year, 0, 1).getTime();
		const y = new Date(year, month, date).getTime();

		return Math.floor((y - x) / 86400000);
	}

	function getColor(x: number) {
		if (data[x] == 0) {
			return 'rgba(128, 128, 128, 0.2)';
		}

		let opacity = data[x] / 2500;
		opacity = Math.max(opacity, 0.2);
		opacity = Math.min(opacity, 1);

		return `rgba(0, 255, 0, ${opacity})`;
	}

	function fetchData() {
		fetch(`${import.meta.env.VITE_API_URL}/players/${uid}/heatmap/${year}`)
			.then((res) => res.json())
			.then((res: any) => {
				data = res.days;
			});
	}

	onMount(fetchData);
</script>

<div class="wrapper">
	<div class="flex">
		<div class="flex items-center space-x-2">
			<Label for="split">{$_("heatmap.split_by_month")}</Label>
			<Switch bind:checked={splitByMonth} id="split" />
		</div>
		<div class="ml-auto">
			<Select.Root
				selected={{
					label: String(new Date().getFullYear()),
					value: new Date().getFullYear()
				}}
				onSelectedChange={(e) => {
					// @ts-expect-error
					year = e.value;
					fetchData();
				}}
			>
				<Select.Trigger class="w-[90px]">
					<Select.Value placeholder="Theme" />
				</Select.Trigger>
				<Select.Content>
					{#each { length: new Date().getFullYear() - 2024 + 1 } as _, index}
						<Select.Item value={new Date().getFullYear() - index}>
							{new Date().getFullYear() - index}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
	</div>
	<div class="heatmapWrapper">
		{#key data}
			{#if splitByMonth}
				{#each { length: 12 } as _, month}
					<div class="month">
						{#each { length: monthOffset(year, month) } as _}
							<div class="emptyCell" />
						{/each}
						{#each { length: daysInMonth(year, month + 1) } as _, date}
							<Tooltip.Root>
								<Tooltip.Trigger>
									<div
										class="cell"
										style={`background-color: ${getColor(dayOfYear(year, month, date + 1))}`}
									/>
								</Tooltip.Trigger>
								<Tooltip.Content>
									<p>
										{new Date(year, month, date + 1).toLocaleDateString('vi-VN')}
										({data[dayOfYear(year, month, date + 1)]} attempts)
									</p>
								</Tooltip.Content>
							</Tooltip.Root>
						{/each}
					</div>
				{/each}
			{/if}
			{#if !splitByMonth}
				<div class="month">
					{#each { length: monthOffset(year, 0) } as _}
						<div class="emptyCell" />
					{/each}
					{#each { length: 12 } as _, month}
						{#each { length: daysInMonth(year, month + 1) } as _, date}
							<Tooltip.Root>
								<Tooltip.Trigger>
									<div
										class="cell"
										style={`background-color: ${getColor(dayOfYear(year, month, date + 1))}`}
									/>
								</Tooltip.Trigger>
								<Tooltip.Content>
									<p>
										{new Date(year, month, date + 1).toLocaleDateString('vi-VN')}
										({data[dayOfYear(year, month, date + 1)]} attempts)
									</p>
								</Tooltip.Content>
							</Tooltip.Root>
						{/each}
					{/each}
				</div>
			{/if}
		{/key}
	</div>
</div>

<style lang="scss">
	.wrapper {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.heatmapWrapper {
		display: flex;
		flex-wrap: wrap;
		gap: 11px;
	}
	.month {
		display: flex;
		flex-wrap: wrap;
		flex-direction: column;
		height: calc(13px * 7);
		width: fit-content;
		gap: 1px;
	}

	.cell {
		height: 12px;
		width: 12px;
		border-radius: 3px;
	}

	.emptyCell {
		height: 12px;
		width: 12px;
		border-radius: 5px;
	}
</style>
