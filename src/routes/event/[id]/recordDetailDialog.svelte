<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import Button from '$lib/components/ui/button/button.svelte';
	import { user } from '$lib/client';
	import { _ } from 'svelte-i18n';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Switch from '$lib/components/ui/switch';
	import Chart from 'chart.js/auto';
	import { onMount } from 'svelte';
	import Loading from '$lib/components/animation/loading.svelte';

	export let record: any;
	export let index: number;
	export let levels: any[];
	export let getPoint: (record: any, index: number) => number;
	export let onUpdate: (record: any) => void;
	export let type: 'basic' | 'raid';

	let updateData: any = null;
	let levelDeathCount: number[] = [];
	let playerDeathCount: number[] = [];
	let chart: any = null;
	let isLoadingDeathCount = false;
	let showRate = true;
	let currentTab = 'detail';

	function handleTriggerClick() {
		updateData = structuredClone(record);
		delete updateData.eventLevels;

		updateData.accepted = {
			disabled: false,
			label: (() => {
				if (updateData.accepted === null) {
					return 'Undecided';
				}

				return updateData.accepted ? 'Accepted' : 'Rejected';
			})(),
			value: updateData.accepted
		};

		updateData.createdAt = new Date(updateData.createdAt).toISOString().slice(0, 16);
	}

	function convertToRate(arr: number[]) {
		const sum = arr.reduce((acc, val) => acc + val, 0);
		return arr.map((val) => (sum === 0 ? 0 : (val / sum) * 100));
	}

	async function getLevelDeathCount(levelID: number) {
		const res = await (
			await fetch(`${import.meta.env.VITE_API_URL}/levels/${levelID}/deathCount`)
		).json();

		return res;
	}

	async function getPlayerDeathCount(levelID: number, userID: string) {
		const res = await (
			await fetch(`${import.meta.env.VITE_API_URL}/deathCount/${userID}/${levelID}`)
		).json();

		return res;
	}

	async function loadDeathCountData() {
		if (!record || !levels[index]) return;

		isLoadingDeathCount = true;
		try {
			const levelID = levels[index].levelID;
			const userID = record.userID;

			const [levelData, playerData] = await Promise.all([
				getLevelDeathCount(levelID),
				getPlayerDeathCount(levelID, userID)
			]);

			levelDeathCount = levelData.count || Array(100).fill(0);
			playerDeathCount = playerData.count || Array(100).fill(0);
		} catch (error) {
			console.error('Failed to load death count data:', error);
			levelDeathCount = Array(100).fill(0);
			playerDeathCount = Array(100).fill(0);
		} finally {
			isLoadingDeathCount = false;
		}
	}

	function genPercent() {
		const res = Array(100);
		for (let i = 0; i < 100; i++) {
			res[i] = `${i + 1}%`;
		}
		return res;
	}

	function createChart(node: any) {
		if (chart != null) {
			chart.destroy();
		}

		const chartData = showRate
			? {
					levelData: convertToRate(levelDeathCount),
					playerData: convertToRate(playerDeathCount),
					yLabel: $_('contest.death_count.percentage_label')
				}
			: {
					levelData: levelDeathCount,
					playerData: playerDeathCount,
					yLabel: $_('contest.death_count.count_label')
				};

		chart = new Chart(node, {
			type: 'bar',
			data: {
				labels: genPercent(),
				datasets: [
					{
						label: $_('contest.death_count.level'),
						data: chartData.levelData,
						backgroundColor: 'rgba(75, 192, 192, 0.6)',
						borderColor: 'rgba(75, 192, 192, 1)',
						borderWidth: 1
					},
					{
						label: $_('contest.death_count.player'),
						data: chartData.playerData,
						backgroundColor: 'rgba(255, 99, 132, 0.6)',
						borderColor: 'rgba(255, 99, 132, 1)',
						borderWidth: 1
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				scales: {
					y: {
						beginAtZero: true,
						ticks: {
							precision: 0
						},
						title: {
							display: true,
							text: chartData.yLabel
						}
					}
				},
				plugins: {
					tooltip: {
						callbacks: {
							label: function (context) {
								const datasetIndex = context.datasetIndex;
								const dataIndex = context.dataIndex;
								const count =
									datasetIndex === 0 ? levelDeathCount[dataIndex] : playerDeathCount[dataIndex];

								if (showRate) {
									const rate = context.parsed.y.toFixed(2);
									return `${context.dataset.label}: ${rate}% (${count} ${$_('contest.death_count.deaths')})`;
								} else {
									return `${context.dataset.label}: ${count} ${$_('contest.death_count.deaths')}`;
								}
							}
						}
					},
					legend: {
						display: true,
						position: 'top'
					}
				}
			}
		});
	}

	function handleTabChange(value: string | undefined) {
		if (value) {
			currentTab = value;
		}
		if (value === 'deathcount' && levelDeathCount.length === 0) {
			loadDeathCountData();
		}
	}
	$: (showRate,
	() => {
		if (chart) {
			const canvas = chart.canvas;
			createChart(canvas);
		}
	})();
</script>

<Dialog.Root>
	<Dialog.Trigger on:click={handleTriggerClick}>
		{#if type == 'raid'}
			{Math.round(record.progress * 100) / 100}
		{:else if record && record.accepted === false}
			<s>
				{getPoint(record, index)}<br />
				<span class="text-[11px] opacity-50">
					{record ? `${Math.round(record.progress * 100) / 100}%` : ''}
				</span>
			</s>
		{:else if record && record.accepted === null}
			{getPoint(record, index)}*<br />
			<span class="text-[11px] opacity-50">
				{record ? `${Math.round(record.progress * 100) / 100}%` : ''}
			</span>
		{:else}
			{getPoint(record, index)}<br />
			<span class="text-[11px] opacity-50">
				{record ? `${Math.round(record.progress * 100) / 100}%` : ''}
			</span>
		{/if}
	</Dialog.Trigger>
	<Dialog.Content class={currentTab === 'deathcount' ? 'max-h-[90vh] md:max-w-[80vw]' : ''}>
		<Dialog.Header>
			<Dialog.Title>{$_('contest.leaderboard.record_detail')}</Dialog.Title>
		</Dialog.Header>
		<Tabs.Root value="detail" class="w-full" onValueChange={handleTabChange}>
			<Tabs.List>
				<Tabs.Trigger value="detail">{$_('record_detail.tabs.detail')}</Tabs.Trigger>
				<Tabs.Trigger value="deathcount">{$_('record_detail.tabs.death_count')}</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="detail">
				<div class="flex flex-col gap-0">
					<section>
						<span class="font-bold">{$_('contest.leaderboard.submitted_at')}: </span>
						{new Date(record.createdAt).toLocaleString('vi-vn')}
					</section>
					<section>
						<span class="font-bold">{$_('contest.leaderboard.video_link')}: </span><a
							href={record.videoLink}
							class="text-[#95bdf7]"
							target="_blank">Link</a
						>
					</section>
					<section>
						<span class="font-bold">{$_('contest.leaderboard.raw')}: </span>
						{#if record.raw}
							<a href={record.raw} class="text-[#95bdf7]" target="_blank">Link</a>
						{:else}
							{$_('contest.leaderboard.not_provided')}
						{/if}
					</section>
					{#if record.accepted === null}
						<section class="mt-[10px] text-[13px] opacity-50">
							{$_('contest.leaderboard.unverified_notice')}
						</section>
					{:else if record.accepted === false}
						<section>
							<span class="font-bold">{$_('contest.leaderboard.reject_reason')}: </span>
							{record.rejectReason}
						</section>
						<section class="mt-[10px] text-[13px] opacity-50">
							{$_('contest.leaderboard.rejected_notice')}
						</section>
					{/if}

					{#if $user.loggedIn && $user.data.isAdmin && updateData}
						<div class="grid gap-4 py-4">
							<div class="grid grid-cols-4 items-center gap-4">
								<Label for="name" class="text-right">{$_('contest.leaderboard.submitted_at')}</Label
								>
								<Input
									type="datetime-local"
									bind:value={updateData.createdAt}
									class="col-span-3"
								/>
							</div>
							<div class="grid grid-cols-4 items-center gap-4">
								<Label for="name" class="text-right">Progress</Label>
								<Input type="number" bind:value={updateData.progress} class="col-span-3" />
							</div>
							<div class="grid grid-cols-4 items-center gap-4">
								<Label for="name" class="text-right">{$_('contest.leaderboard.video_link')}</Label>
								<Input bind:value={updateData.videoLink} class="col-span-3" />
							</div>
							<div class="grid grid-cols-4 items-center gap-4">
								<Label for="name" placeholder="Leave blank if not rejected" class="text-right"
									>{$_('contest.leaderboard.reject_reason')}</Label
								>
								<Input bind:value={updateData.rejectReason} class="col-span-3" />
							</div>
							{#if levels[index] && levels[index].needRaw}
								<div class="grid grid-cols-4 items-center gap-4">
									<Label for="name" class="text-right">{$_('contest.leaderboard.raw')}</Label>
									<Input bind:value={updateData.raw} class="col-span-3" />
								</div>
							{/if}
							<div class="grid grid-cols-4 items-center gap-4">
								<Label for="name" class="text-right">Accept state</Label>
								<Select.Root bind:selected={updateData.accepted}>
									<Select.Trigger class="col-span-3">
										<Select.Value placeholder="Select a platform" />
									</Select.Trigger>
									<Select.Content>
										<Select.Group>
											<Select.Item value={null}>Undecided</Select.Item>
											<Select.Item value={true}>Accepted</Select.Item>
											<Select.Item value={false}>Rejected</Select.Item>
										</Select.Group>
									</Select.Content>
									<Select.Input name="platform" value={true} />
								</Select.Root>
							</div>
							<Button on:click={() => onUpdate(updateData)}>Update</Button>
						</div>
					{/if}
				</div>
			</Tabs.Content>
			<Tabs.Content value="deathcount">
				<div class="flex flex-col gap-4 py-4">
					{#if isLoadingDeathCount}
						<div class="flex h-[250px] items-center justify-center">
							<Loading inverted />
						</div>
					{:else if levelDeathCount.length > 0 || playerDeathCount.length > 0}
						<div class="h-[400px] w-full">
							<canvas use:createChart />
						</div>
						<div class="mb-2 flex items-center justify-center gap-4">
							<Label for="chart-toggle" class="cursor-pointer text-sm">
								{$_('contest.death_count.count') || 'Count'}
							</Label>
							<div class="flex items-center gap-2">
								<Switch.Root id="chart-toggle" bind:checked={showRate} />
							</div>
							<Label for="chart-toggle" class="cursor-pointer text-sm">
								{$_('contest.death_count.rate') || 'Rate'}
							</Label>
						</div>
						<div class="grid grid-cols-2 gap-4 text-sm">
							<div>
								<div class="font-semibold text-[rgba(75,192,192,1)]">
									{$_('contest.death_count.level_death_count')}
								</div>
								<div class="opacity-70">
									{$_('contest.death_count.total')}: {levelDeathCount.reduce((a, b) => a + b, 0)}
								</div>
							</div>
							<div>
								<div class="font-semibold text-[rgba(255,99,132,1)]">
									{$_('contest.death_count.player_death_count')}
								</div>
								<div class="opacity-70">
									{$_('contest.death_count.total')}: {playerDeathCount.reduce((a, b) => a + b, 0)}
								</div>
							</div>
						</div>
					{:else}
						<div class="flex h-[400px] items-center justify-center opacity-50">
							{$_('contest.death_count.no_data')}
						</div>
					{/if}
				</div>
			</Tabs.Content>
		</Tabs.Root>
	</Dialog.Content>
</Dialog.Root>
