<script lang="ts">
	import type { Level } from './type';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { toast } from 'svelte-sonner';
	import { user } from '$lib/client';
	import { Copy } from 'svelte-radix';
	import { isActive } from '$lib/client/isSupporterActive';
	import { onMount } from 'svelte';
	import Chart from 'chart.js/auto';
	import { _ } from 'svelte-i18n';

	interface SubmitData {
		levelID: number | null;
		progress: number | null;
		videoLink: string;
		raw: string;
	}

	export let level: Level | null;
	export let index: number;
	export let event: any;
	export let showDeathCount: boolean = true;
	export let type: 'basic' | 'raid';

	$: totalProgress = (level as any)?.totalProgress || 0;
	$: totalHP = level?.point || 0;
	$: hpRemaining = Math.max(0, totalHP - totalProgress);
	$: hpPercentage = totalHP > 0 ? (hpRemaining / totalHP) * 100 : 100;
	$: isBeaten = !isEventEnded() && level && type === 'raid' && hpRemaining <= 0;

	const submitData: SubmitData = {
		levelID: level ? level.id : 0,
		progress: null,
		videoLink: '',
		raw: ''
	};

	let deathCount: number[] = [];
	let smallChart: any = null;
	let dialogChart: any = null;
	let chartDialogOpen = false;

	function isEventEnded() {
		return new Date(event.end) < new Date();
	}

	function indexToRoman(num: number): string {
		const romanNumerals = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
		const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
		let result = '';
		for (let i = 0; i < values.length; i++) {
			while (num >= values[i]) {
				num -= values[i];
				result += romanNumerals[i];
			}
		}
		return result;
	}

	async function submit() {
		if (level === null) {
			return;
		}

		if (!submitData.progress || !submitData.videoLink) {
			toast.error($_('toast.submission_submit.fill_required'));
			return;
		}

		if (level.needRaw && !submitData.raw) {
			toast.error($_('toast.submission_submit.fill_required'));
			return;
		}

		if (!(0 < submitData.progress && submitData.progress <= 100)) {
			toast.error($_('toast.submission_submit.invalid_progress'));
			return;
		}

		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/events/${event.id}/submit`, {
				method: 'POST',
				body: JSON.stringify(submitData),
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				}
			}),
			{
				success: () => {
					window.location.reload();
					return $_('toast.submission_submit.success');
				},
				error: $_('toast.submission_submit.error'),
				loading: $_('toast.submission_submit.loading')
			}
		);
	}

	async function cancel() {
		if (level === null) {
			return;
		}

		if (!confirm($_('toast.submission_submit.cancel_confirm'))) {
			return;
		}

		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/events/${event.id}/submission/${level.id}`, {
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${await $user.token()}`
				}
			}),
			{
				success: () => {
					window.location.reload();
					return $_('toast.submission_cancel.success');
				},
				error: $_('toast.submission_cancel.error'),
				loading: $_('toast.submission_cancel.loading')
			}
		);
	}

	function copyID() {
		if (!level) {
			return;
		}

		navigator.clipboard
			.writeText(level.levelID.toString())
			.then(() => toast.success($_('toast.clipboard')))
			.catch(() => toast.error($_('toast.player_edit.error')));
	}

	async function getDeathCount() {
		if (!level) return;

		try {
			const res = await (
				await fetch(`${import.meta.env.VITE_API_URL}/levels/${level.levelID}/deathCount`)
			).json();

			if (res && res.count) {
				deathCount = res.count;
			}
		} catch (error) {
			console.error('Failed to fetch death count:', error);
			deathCount = Array(100).fill(0);
		}
	}

	function genPercent() {
		const res = Array(100);
		for (let i = 0; i < 100; i++) {
			res[i] = `${i + 1}%`;
		}
		return res;
	}

	function createChart(node: any, showFull: boolean = false) {
		const chartRef = showFull ? dialogChart : smallChart;

		if (chartRef != null) {
			chartRef.destroy();
		}

		const newChart = new Chart(node, {
			type: 'bar',
			data: {
				labels: genPercent(),
				datasets: [
					{
						label: $_('record_detail.tabs.death_count'),
						data: deathCount,
						borderWidth: 1,
						backgroundColor: 'rgba(75, 192, 192, 0.6)',
						borderColor: 'rgba(75, 192, 192, 1)'
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				scales: {
					x: {
						display: showFull,
						title: showFull
							? {
									display: true,
									text: $_('record_detail.tabs.progress')
								}
							: undefined
					},
					y: {
						display: showFull,
						beginAtZero: true,
						ticks: {
							precision: 0
						},
						title: showFull
							? {
									display: true,
									text: $_('contest.deaths')
								}
							: undefined
					}
				},
				plugins: {
					tooltip: {
						callbacks: {
							label: function (context) {
								return `${$_('contest.deaths')}: ${context.parsed.y}`;
							}
						}
					},
					legend: {
						display: true
					},
					title: {
						display: showFull,
						text: showFull
							? `${$_('record_detail.tabs.death_count')} - ${level ? level.name : '???'}`
							: ''
					}
				}
			}
		});

		if (showFull) {
			dialogChart = newChart;
		} else {
			smallChart = newChart;
		}
	}

	onMount(async () => {
		if (level) {
			await getDeathCount();
		}
	});
</script>

<Card.Root class="flex flex-col p-2 transition-opacity duration-300 {isBeaten ? 'opacity-50' : ''}">
	<div class="flex flex-col gap-4">
		<!-- Level Info Row -->
		<div class="flex flex-col gap-4 md:flex-row md:gap-6">
			<!-- Left side: Level Info -->
			<div class="flex flex-col items-center md:flex-row">
				<div class="flex w-full items-center">
					<a href={`https://www.youtube.com/watch?v=${level ? level.videoID : ''}`} target="_blank">
						<img
							src={`https://img.youtube.com/vi/${level ? level.videoID : ''}/0.jpg`}
							alt="level"
							class="h-[100px] w-[177px] rounded-xl object-cover {isBeaten ? 'grayscale' : ''}"
						/>
					</a>
					<Card.Content class="mt-[22.5px] flex flex-col justify-center">
						<div class="flex items-center gap-[10px]">
							<div class="flex items-center gap-[5px]">
								<h2 class="text-xl font-bold">
									{indexToRoman(index + 1)}. {level ? level.name : '???'}
								</h2>
								{#if event.type == 'basic'}
									<span
										class="inline h-fit rounded-sm bg-[var(--textColor)] pl-[5px] pr-[5px] text-[12px] font-semibold text-[var(--textColorInverted)]"
										>{level ? level.point : '???'}pt</span
									>
								{/if}

								{#if event.type == 'raid'}
									<span
										class="inline h-fit rounded-sm bg-[var(--textColor)] pl-[5px] pr-[5px] text-[12px] font-semibold text-[var(--textColorInverted)]"
										>{level ? level.minEventProgress : '???'}% min</span
									>
								{/if}
								{#if level && level.needRaw}
									<span
										class="inline rounded-sm bg-[var(--textColor)] pl-[5px] pr-[5px] text-[12px] font-semibold text-[var(--textColorInverted)]"
										>{$_('contest.raw_required')}</span
									>
								{/if}
							</div>
						</div>
						<div class="flex flex-col">
							by {level ? level.creator : '???'}
							<button class="flex items-center gap-[5px]" on:click={copyID}>
								ID: {level ? level.levelID : '???'}
								{#if level}
									<Copy size={15} />
								{/if}
							</button>
						</div>
					</Card.Content>
				</div>
			</div>

			{#if deathCount.length > 0 && showDeathCount}
				<div class="flex w-full min-w-0 md:ml-auto md:flex-1 lg:max-w-[300px]">
					<button
						class="h-[150px] w-full cursor-pointer lg:h-[115px]"
						on:click={() => (chartDialogOpen = true)}
						type="button"
					>
						<canvas use:createChart />
					</button>
				</div>
			{/if}
		</div>

		<!-- HP Bar Row (Raid only) -->
		{#if type === 'raid'}
			<div class="flex w-full flex-col gap-2 px-2">
				<div class="flex items-center justify-between text-sm text-white">
					<span class="font-semibold">HP</span>
					<span class="text-xs">
						{hpRemaining.toFixed(2)} / {totalHP}
						<span class="opacity-80">({hpPercentage.toFixed(1)}%)</span>
					</span>
				</div>
				<div class="relative h-8 w-full overflow-hidden rounded-full bg-gray-300 dark:bg-gray-700">
					<div
						class="h-full transition-all duration-300"
						style="width: {hpPercentage}%; background: linear-gradient(90deg, 
							{hpPercentage > 50 ? '#10b981' : hpPercentage > 25 ? '#f59e0b' : '#ef4444'} 0%, 
							{hpPercentage > 50 ? '#059669' : hpPercentage > 25 ? '#d97706' : '#dc2626'} 100%)"
					/>
					<div
						class="absolute inset-0 flex items-center justify-center text-xs font-bold text-white"
					>
						{hpPercentage.toFixed(1)}%
					</div>
				</div>
			</div>
		{/if}
	</div>
</Card.Root>

<Dialog.Root bind:open={chartDialogOpen}>
	<Dialog.Content class="max-w-4xl">
		<div class="h-[500px] w-full">
			<canvas use:createChart={true} />
		</div>
	</Dialog.Content>
</Dialog.Root>
