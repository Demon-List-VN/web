<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';
	import LevelCard from '$lib/components/levelCard.svelte';
	import { toLevelCardProps } from '$lib/components/levelCardProps';

	interface Level {
		id: number;
		name: string;
		creator: string;
		videoID: string;
		minProgress: number;
		flTop: number | null;
		dlTop: number | null;
		flPt: number | null;
		rating: number;
		created_at: string;
		isPlatformer: boolean;
		insaneTier: number | null;
		accepted: boolean;
		isNonList: boolean;
	}

	const LEVEL_LIMIT = 50;
	let list: string | null = null;
	let isOpening = false;
	let hasOpened = false;
	let levels: Level[] = [];
	let displayEntries: PollEntry[] = [];
	let scrollPosition = 0;
	let wonLevel: Level | null = null;
	let minProgress = 0;
	let selectedList = { value: 'all', label: 'All Levels' };

	interface PollEntry {
		level: Level;
		minProgress: number;
	}

	const listOptions = [
		{ value: 'all', label: 'All Levels' },
		{ value: 'dl', label: 'Demon List' },
		{ value: 'fl', label: 'Featured List' },
		{ value: 'pl', label: 'Platformer List' }
	];

	function getRarity(level: Level): string {
		const top = list === 'fl' ? level.flTop : level.dlTop;

		if (!top) return 'blue';
		if (top <= 3) return 'gold';
		if (top <= 10) return 'red';
		if (top <= 25) return 'pink';
		if (top <= 50) return 'purple';
		return 'blue';
	}

	function getRarityColor(rarity: string): string {
		switch (rarity) {
			case 'gold':
				return '#ffd700';
			case 'red':
				return '#eb4b4b';
			case 'pink':
				return '#d32ce6';
			case 'purple':
				return '#8847ff';
			case 'blue':
				return '#4b69ff';
			default:
				return '#4b69ff';
		}
	}

	async function getLevels() {
		const url = new URL('/levels/random', import.meta.env.VITE_API_URL);

		if (list !== 'all') {
			url.searchParams.set('list', list || '');
		}

		url.searchParams.set('limit', String(LEVEL_LIMIT));

		return await (await fetch(url)).json();
	}

	async function openCase() {
		if (isOpening) return;

		isOpening = true;
		hasOpened = false;
		wonLevel = null;

		const fetchedLevels = await getLevels();

		const pollEntries: PollEntry[] = fetchedLevels.map((level: any) => ({
			level,
			minProgress: Math.floor(Math.random() * 91) + 10
		}));

		displayEntries = [...pollEntries, ...pollEntries];
		levels = displayEntries.map((e) => e.level);

		const itemWidth = 450;
		const gap = 10;
		const initialScrollPos = 3 * (itemWidth + gap) + itemWidth / 2;
		scrollPosition = initialScrollPos;

		await new Promise((resolve) => setTimeout(resolve, 100));

		const winningEntryIndex = Math.floor(Math.random() * pollEntries.length);
		const winningEntry = pollEntries[winningEntryIndex];
		const winningDisplayIndex = pollEntries.length + winningEntryIndex;

		wonLevel = winningEntry.level;
		minProgress = winningEntry.minProgress;

		const targetPosition = winningDisplayIndex * (itemWidth + gap) + itemWidth / 2;
		const finalPosition = targetPosition + Math.random() * itemWidth - itemWidth / 2;

		await new Promise<void>((resolve) => {
			const startTime = Date.now();
			const duration = 7000;
			const startPos = initialScrollPos;

			function animate() {
				const elapsed = Date.now() - startTime;
				const progress = Math.min(elapsed / duration, 1);
				const easeProgress = 1 - Math.pow(1 - progress, 5);

				scrollPosition = startPos + (finalPosition - startPos) * easeProgress;

				if (progress < 1) {
					requestAnimationFrame(animate);
				} else {
					scrollPosition = finalPosition;
					resolve();
				}
			}

			requestAnimationFrame(animate);
		});

		hasOpened = true;
		isOpening = false;
	}

	function handleListChange(value: any) {
		list = value?.value === 'all' ? null : value?.value;
		selectedList = value;
	}
</script>

<div class="container">
	<div class="controls">
		<Select.Root onSelectedChange={handleListChange} selected={selectedList}>
			<Select.Trigger class="w-[250px]">
				<Select.Value placeholder="Select a list" />
			</Select.Trigger>
			<Select.Content>
				{#each listOptions as option}
					<Select.Item value={option.value}>{option.label}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>

		<Button on:click={openCase} disabled={isOpening}>
			{isOpening ? 'Rolling...' : 'Roll'}
		</Button>
	</div>

	{#if levels.length > 0 && !hasOpened}
		<div class="case-container">
			<div class="case-window">
				<div class="selector-line"></div>
				<div
					class="items-container"
					style="transform: translateX({-scrollPosition}px); transition: none;"
				>
					{#each displayEntries as entry, i}
						{@const rarity = getRarity(entry.level)}
						{#if rarity !== 'gold'}
							<div class="case-item" style="border-color: {getRarityColor(rarity)}">
								<div class="item-glow" style="background: {getRarityColor(rarity)}"></div>
									<LevelCard {...toLevelCardProps(entry.level, list === 'fl' ? 'fl' : 'dl')} type={list === 'fl' ? 'fl' : 'dl'} />
								<div class="item-min-progress" style="color: {getRarityColor(rarity)}; border-color: {getRarityColor(rarity)}">
									{entry.minProgress}%
								</div>
							</div>
						{:else}
							<div class="case-item gold-hidden" style="border-color: {getRarityColor(rarity)}">
								<div class="item-glow" style="background: {getRarityColor(rarity)}"></div>
								<div class="gold-mystery">???</div>
							</div>
						{/if}
					{/each}
				</div>
			</div>
		</div>
	{/if}

	{#if hasOpened && wonLevel}
		<div class="result">
			<h2 class="result-title">You got:</h2>
			<div class="result-content">
				<div class="rarity-border" style="border-color: {getRarityColor(getRarity(wonLevel))}">
					<div class="item-glow" style="background: {getRarityColor(getRarity(wonLevel))}"></div>
					<LevelCard {...toLevelCardProps(wonLevel, list === 'fl' ? 'fl' : 'dl')} type={list === 'fl' ? 'fl' : 'dl'} />
				</div>
				<div class="min-progress-display">
					<p>Minimum Progress: <strong style="color: {getRarityColor(getRarity(wonLevel))}">{minProgress}%</strong></p>
				</div>
			</div>
		</div>
	{/if}
</div>

<style lang="scss">
	.container {
		padding: 20px;
		max-width: 1400px;
		margin: 0 auto;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.controls {
		display: flex;
		gap: 20px;
		justify-content: center;
		margin-bottom: 40px;
		align-items: center;
	}

	.case-container {
		position: relative;
		overflow-x: hidden;
		overflow-y: hidden;
		height: 400px;
		background: linear-gradient(180deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.6) 100%);
		border-radius: 12px;
		margin-bottom: 40px;
	}

	.case-window {
		position: relative;
		width: 100%;
		height: 100%;
		overflow-x: hidden;
		overflow-y: hidden;
		display: flex;
		align-items: center;
	}

	.selector-line {
		position: absolute;
		left: 50%;
		top: 0;
		height: 100%;
		width: 4px;
		background: linear-gradient(
			to bottom,
			transparent 0%,
			#ffd700 20%,
			#ffd700 80%,
			transparent 100%
		);
		transform: translateX(-50%);
		z-index: 10;
		box-shadow:
			0 0 20px #ffd700,
			0 0 40px #ffd700;
	}

	.items-container {
		display: flex;
		gap: 10px;
		padding-left: 50%;
		will-change: transform;
	}

	.case-item {
		min-width: 450px;
		width: 450px;
		border: 3px solid;
		border-radius: 8px;
		position: relative;
		overflow: visible;

		:global(.level) {
			pointer-events: none;
			margin: 0 !important;
			padding: 0 !important;
		}

		:global(.level .levelInfo) {
			margin-bottom: 0 !important;
		}

		:global(.level > div) {
			margin: 0 !important;
			padding-bottom: 0 !important;
		}

		:global(.level > div > div) {
			padding-bottom: 0 !important;
		}
	}

	.item-glow {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 3px;
		opacity: 0.8;
		filter: blur(8px);
		z-index: 1;
	}

	.item-min-progress {
		position: absolute;
		bottom: 10px;
		right: 10px;
		background: rgba(0, 0, 0, 0.8);
		color: #4b69ff;
		padding: 6px 12px;
		border-radius: 6px;
		font-weight: 700;
		font-size: 18px;
		z-index: 2;
		border: 2px solid #4b69ff;
		box-shadow: 0 0 10px rgba(75, 105, 255, 0.5);
	}

	.gold-hidden {
		background: linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(50, 50, 50, 0.9) 100%);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.gold-mystery {
		font-size: 72px;
		font-weight: 900;
		color: #ffd700;
		text-shadow:
			0 0 20px #ffd700,
			0 0 40px #ffd700;
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 0.6;
			transform: scale(1);
		}
		50% {
			opacity: 1;
			transform: scale(1.1);
		}
	}

	.result {
		display: flex;
		flex-direction: column;
		align-items: center;
		animation: fadeIn 0.5s ease-in;
		gap: 20px;
	}

	.result-title {
		font-size: 32px;
		font-weight: 700;
		text-align: center;
	}

	.result-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 20px;
		max-width: 400px;
		width: 100%;
	}

	.rarity-border {
		border: 3px solid;
		border-radius: 8px;
		position: relative;
		width: 100%;
	}

	.min-progress-display {
		font-size: 24px;
		text-align: center;

		strong {
			color: #4b69ff;
			font-weight: 700;
		}
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
