<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { user } from '$lib/client';
	import Loading from '$lib/components/animation/loading.svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { _ } from 'svelte-i18n';
	import { get } from 'svelte/store';

	export let inventoryItemId: number;
	export let item: any;
	export let caseItems: any[] = [];

	const dispatch = createEventDispatcher();

	let isRolling = false;
	let hasRolled = false;
	let isFetchingResult = false;
	let rollDisplay: any[] = [];
	let rollScroll = 0;
	let rollResult: any = null;

	function shuffleArray<T>(arr: T[]) {
		const a = arr.slice();
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			const tmp = a[i];
			a[i] = a[j];
			a[j] = tmp;
		}
		return a;
	}

	function pickRandom(arr: any[], n: number) {
		const out: any[] = [];
		for (let i = 0; i < n; i++) {
			out.push(arr[Math.floor(Math.random() * arr.length)]);
		}
		return out;
	}

	const rarityColor = (r: number) => {
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
	};

	async function openCase() {
		if (isRolling) return;

		const pollEntries =
			caseItems && caseItems.length > 0
				? caseItems.map((c: any) => ({
						item: { ...c.items },
						rate: c.rate ?? 0
					}))
				: [];
		const nothingEntry = { item: { id: 0, name: get(_ )('inventory.nothing'), type: 'none', rarity: 0 }, rate: 0 };
		const entries = [...pollEntries, nothingEntry];

		const randomizedEntries = shuffleArray(entries);
		const copies = 8;

		rollDisplay = pickRandom(randomizedEntries, 10).map((e: any) => e.item);
		isFetchingResult = true;
		hasRolled = false;
		rollResult = null;

		let res: any = {};

		try {
			res = await (
				await fetch(`${import.meta.env.VITE_API_URL}/inventory/${inventoryItemId}/consume`, {
					method: 'DELETE',
					headers: {
						Authorization: 'Bearer ' + (await $user.token())
					}
				})
			).json();
		} catch (e) {
			console.error(e);
			res = {};
		} finally {
			isFetchingResult = false;
		}

		const resultItem = res && res.items && res.items.id ? res.items : nothingEntry.item;
		const baseSeq: any[] = [];

		baseSeq.push(...pickRandom(randomizedEntries, 30).map((e: any) => e.item));
		baseSeq.push(resultItem);
		baseSeq.push(...pickRandom(randomizedEntries, 4).map((e: any) => e.item));

		let displayEntries: any[] = [];

		for (let i = 0; i < copies; i++) {
			displayEntries.push(...baseSeq);
		}

		rollDisplay = displayEntries;

		const itemWidth = 160;
		const gap = 8;

		const groupIndex = Math.floor(copies / 2);
		const startIndex = groupIndex * baseSeq.length + 4;
		const initialScrollPos = startIndex * (itemWidth + gap) + itemWidth / 2;

		rollScroll = initialScrollPos;
		isRolling = true;

		const winningIndex = 30;
		const baseIndex = groupIndex * baseSeq.length;
		const maxAdvanceGroups = copies - groupIndex - 1;
		const desiredAdvance = Math.min(
			Math.max(3, Math.floor(copies / 2)),
			Math.max(1, maxAdvanceGroups)
		);
		const winningDisplayIndex = baseIndex + desiredAdvance * baseSeq.length + winningIndex;
		const targetPosition = winningDisplayIndex * (itemWidth + gap) + itemWidth / 2;
		const randomOffset = Math.random() * (itemWidth + gap) - (itemWidth + gap) / 2;
		const minFinal = itemWidth / 2;
		const maxFinal = (rollDisplay.length - 1) * (itemWidth + gap) + itemWidth / 2;
		let finalPosition = targetPosition + randomOffset;

		if (finalPosition < minFinal) finalPosition = minFinal;
		if (finalPosition > maxFinal) finalPosition = maxFinal;

		await new Promise<void>((resolve) => {
			const startTime = Date.now();
			const duration = 7000;

			function animate() {
				const elapsed = Date.now() - startTime;
				const progress = Math.min(elapsed / duration, 1);
				const easeProgress = 1 - Math.pow(1 - progress, 5);

				rollScroll = initialScrollPos + (finalPosition - initialScrollPos) * easeProgress;

				if (progress < 1) {
					requestAnimationFrame(animate);
				} else {
					rollScroll = finalPosition;
					resolve();
				}
			}

			requestAnimationFrame(animate);
		});

		rollResult = res;
		hasRolled = true;
		isRolling = false;
	}

	function handleClose() {
		dispatch('close');
	}
</script>

<div style="min-width:420px;">
	{#if isFetchingResult}
		<div class="py-6 text-center">
			<Loading inverted />
		</div>
	{:else if isRolling}
		<div class="case-container-small">
			<div class="case-window-small">
				<div class="selector-line-small"></div>
				<div
					class="items-container-small"
					style="transform: translateX({-rollScroll}px); transition: none;"
				>
					{#each rollDisplay as d}
						<div class="case-item-small" style="border-color: {rarityColor(d?.rarity ?? 0)}">
							{#if d && d.id && d.id !== 0}
								<img
									src={`https://cdn.gdvn.net/items/${d.id}.webp`}
									alt={d.name}
									class="case-img"
								/>
								<div class="case-name">{d.name}</div>
								{:else}
								<div class="case-empty">{$_('inventory.nothing')}</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</div>
	{:else if !isRolling && !hasRolled}
			<div class="p-4 text-center">
				{$_('inventory.open_one_prefix')} <span class='font-bold' style="color: {rarityColor(item.rarity)}">{item.name}</span>{$_('inventory.open_one_suffix')}

				<div class='flex gap-[10px] w-full mt-[10px]'>
					<AlertDialog.Cancel class='w-full'>{$_('general.cancel')}</AlertDialog.Cancel>
					<Button class='w-full' on:click={openCase}>{$_('inventory.open_button')}</Button>
				</div>
			</div>
	{:else}
		<div class="p-4">
			{#if rollResult && rollResult.items}
				<div class="result-viewport">
					<div
						class="result-thumb"
						style="border-color: {rarityColor(rollResult.items.rarity ?? 0)}"
					>
						<img
							src={`https://cdn.gdvn.net/items/${rollResult.items.id}.webp`}
							alt={rollResult.items.name}
							class="h-full w-full object-cover p-[10px]"
						/>
					</div>
					<div class="mt-3 text-center">
						<div class="text-lg font-semibold">
							{rollResult.items.name}
						</div>
						<div class="text-sm text-gray-300">{$_('inventory.received_from_case')}</div>
					</div>
				</div>
			{:else}
				<div class="text-center">
					<div class="text-2xl font-semibold">{$_('inventory.nothing')}</div>
					<div class="text-sm text-gray-300">{$_('inventory.better_luck')}</div>
				</div>
			{/if}
			<div class="h-[10px]"></div>
			<AlertDialog.Cancel class="w-full" on:click={handleClose}>{$_('general.close')}</AlertDialog.Cancel>
		</div>
	{/if}
</div>

<style>
	.case-container-small {
		position: relative;
		overflow: hidden;
		height: 180px;
		background: linear-gradient(180deg, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.6));
		border-radius: 8px;
		padding: 12px;
	}

	.case-window-small {
		position: relative;
		height: 100%;
		display: flex;
		align-items: center;
	}

	.selector-line-small {
		position: absolute;
		left: 50%;
		top: 0;
		height: 100%;
		width: 3px;
		background: rgba(255, 215, 0, 0.9);
		transform: translateX(-50%);
		z-index: 10;
		box-shadow: 0 0 12px rgba(255, 215, 0, 0.6);
	}

	.items-container-small {
		display: flex;
		gap: 8px;
		padding-left: 50%;
		will-change: transform;
	}

	.case-item-small {
		min-width: 160px;
		width: 160px;
		height: 140px;
		background: #0b1220;
		border: 2px solid;
		border-radius: 6px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 8px;
		color: #fff;
	}

	.case-img {
		height: 84px;
		width: 84px;
		object-fit: contain;
	}

	.case-name {
		font-size: 12px;
		margin-top: 6px;
		text-align: center;
	}

	.case-empty {
		font-weight: 700;
		color: #9ca3af;
	}

	.result-viewport {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}

	.result-thumb {
		width: 180px;
		height: 180px;
		overflow: hidden;
		border: 3px solid;
		border-radius: 8px;
	}
</style>
