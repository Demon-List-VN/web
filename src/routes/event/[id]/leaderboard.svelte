<script lang="ts">
	import * as Table from '$lib/components/ui/table/index.js';
	import Download from 'svelte-radix/Download.svelte';
	import { onMount } from 'svelte';
	import PlayerHoverCard from '$lib/components/playerLink.svelte';
	import type { Level } from './type';
	import Button from '$lib/components/ui/button/button.svelte';
	import { user } from '$lib/client';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { toast } from 'svelte-sonner';
	import { Reload } from 'svelte-radix';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { ExclamationTriangle } from 'svelte-radix';
	import { flip } from 'svelte/animate';
	import { cn } from '$lib/utils.js';
	import { _ } from 'svelte-i18n';
	import RecordDetailDialog from './recordDetailDialog.svelte';
	import * as Switch from '$lib/components/ui/switch/index.js';
	import Label from '$lib/components/ui/label/label.svelte';

	export let levels: (Level | null)[];
	export let event: any;

	let leaderboard: any[] = [];
	let leaderboard1: any[] = [];
	let refreshing = false;
	let revealMode = false;
	let previousScores: Map<string, number> = new Map();
	let showPercentage = false;

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

	function getPenalty(records: any[], divide: number) {
		let res: number = 0;

		for (const i of records) {
			if (i == null || i == 'revealed' || i.accepted === false) {
				continue;
			}

			res += new Date(i.created_at).getTime() - new Date(event.start).getTime();
		}

		return Math.round(res / divide);
	}

	function getPenaltyTooltip(records: any[]) {
		const ms = getPenalty(records, 1);

		const minutes = Math.floor(ms / 60000);
		const seconds = Math.floor((ms % 60000) / 1000);
		const milliseconds = ms % 1000;

		return `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''} ${milliseconds} millisecond${milliseconds !== 1 ? 's' : ''}`;
	}

	function getPoint(record: any, index: number, checkAcp = false) {
		if (record === null || record == 'revealed' || (record.accepted === false && checkAcp)) {
			return 0;
		}

		if (!levels[index]) {
			return 0;
		}

		if(event.type == 'raid') {
			return record.progress;
		}

		const res = (record.progress / 100) * levels[index].point;

		return Math.round(res * 100) / 100;
	}

	function getTotalPoint(records: any[]) {
		let res = 0;

		for (let i = 0; i < records.length; i++) {
			res += getPoint(records[i], i, true);
		}

		return Math.round(res * 100) / 100;
	}

	function getTotalLevelPoints() {
		let res = 0;
		
		for (let i = 0; i < levels.length; i++) {
			if (levels[i]) {
				res += levels[i]!.point;
			}
		}
		
		return res;
	}

	function getContributionPercentage(records: any[]) {
		const totalPoint = getTotalPoint(records);
		const totalLevelPoints = getTotalLevelPoints();
		
		if (totalLevelPoints === 0) {
			return 0;
		}
		
		const percentage = (totalPoint / totalLevelPoints) * 100;
		return Math.round(percentage * 100) / 100;
	}

	function getScoreDiff(uid: string, currentScore: number) {
		const previousScore = previousScores.get(uid);
		if (previousScore === undefined) {
			return 0;
		}
		return Math.round((currentScore - previousScore) * 100) / 100;
	}

	async function refresh(noti = false) {
		const upd = async () => {
			refreshing = true;
			
			// Store previous scores before refresh for raid events
			if (event.type == 'raid' && leaderboard.length > 0) {
				previousScores = new Map();
				for (const player of leaderboard) {
					previousScores.set(player.uid, getTotalPoint(player.eventRecords));
				}
			}
			
			leaderboard = await (
				await fetch(`${import.meta.env.VITE_API_URL}/events/${event.id}/leaderboard`, {
					method: 'GET',
					headers: {
						Authorization: $user.loggedIn ? 'Bearer ' + (await $user.token()) : ''
					}
				})
			).json();

			if ($user.loggedIn && $user.data.isAdmin) {
				leaderboard1 = await (
					await fetch(`${import.meta.env.VITE_API_URL}/events/${event.id}/leaderboard`)
				).json();
			}

			refreshing = false;
			revealMode = false;
		};

		if (noti) {
			toast.promise(upd, {
				success: $_('contest.leaderboard.refresh.success'),
				error: $_('contest.leaderboard.refresh.error'),
				loading: $_('contest.leaderboard.refresh.loading')
			});
		} else {
			await upd();
		}
	}

	async function updateRecord(updateData: any) {
		updateData.accepted = updateData.accepted.value;

		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/events/submission`, {
				method: 'PATCH',
				body: JSON.stringify(updateData),
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				}
			}),
			{
				success: 'Updated!',
				error: 'Failed to update',
				loading: 'Updating...'
			}
		);
	}

	function exportToCSV() {
		function escapeCSV(str: any) {
			if (str === null || str === undefined) return '';
			str = String(str);
			if (str.includes('"') || str.includes(',') || str.includes('\n')) {
				return '"' + str.replace(/"/g, '""') + '"';
			}
			return str;
		}

		let csvContent = 'Rank,Player,UserID,Total,Penalty';

		for (let i = 0; i < levels.length; i++) {
			const levelName = levels[i] ? escapeCSV(levels[i]!.name) : '???';
			csvContent += `,${levelName}`;
		}
		csvContent += '\n';

		leaderboard.forEach((player, rank) => {
			const playerName = escapeCSV(
				(player.clan ? `[${player.clans.tag}] ` : '') + player.name || 'Unknown'
			);
			const userID = escapeCSV(player.uid || 'Unknown');

			csvContent += `${rank + 1},${playerName},${userID},${getTotalPoint(player.eventRecords)},${getPenalty(player.eventRecords, 60000)}`;

			player.eventRecords.forEach((record: any, index: any) => {
				const point = getPoint(record, index, true);
				csvContent += `,${point}`;
			});

			csvContent += '\n';
		});

		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.setAttribute('href', url);
		link.setAttribute('download', `event_${event.id}_leaderboard.csv`);

		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}

	function reveal(uid: string, levelIndex: number, rank: number) {
		let res;

		for (const i of leaderboard1) {
			if (i.uid == uid) {
				res = i;
				break;
			}
		}

		if (!res.eventRecords[levelIndex]) {
			leaderboard[rank].eventRecords[levelIndex] = 'revealed';
		} else {
			leaderboard[rank].eventRecords[levelIndex] = res.eventRecords[levelIndex];
		}

		leaderboard.sort((a, b) => {
			const x = a.eventRecords.reduce((sum: any, record: any, index: any) => {
				return (
					sum +
					(record && (record.accepted === null || record.accepted === true)
						? levels[index]!.point * record.progress
						: 0)
				);
			}, 0);

			const y = b.eventRecords.reduce((sum: any, record: any, index: any) => {
				return (
					sum +
					(record && (record.accepted === null || record.accepted === true)
						? levels[index]!.point * record.progress
						: 0)
				);
			}, 0);

			if (x == y && x != 0) {
				return getPenalty(a.eventRecords, 1) - getPenalty(b.eventRecords, 1);
			}

			return y - x;
		});
	}

	async function calculate() {
		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/events/${event.id}/calc`, {
				method: 'PATCH',
				headers: {
					Authorization: 'Bearer ' + (await $user.token())
				}
			}),
			{
				success: () => {
					window.location.reload();

					return 'Calculated!';
				},
				loading: 'Calculating...',
				error: 'Failed to calculate'
			}
		);
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

	onMount(async () => {
		await refresh();
	});
</script>

{#if event.freeze}
	<Alert.Root class="sticky top-0 mb-[10px] ml-auto mr-auto w-[1500px] max-w-full text-yellow-400">
		<Alert.Title class="flex items-center gap-[10px]">
			<ExclamationTriangle size={15} />
			{#if new Date(event.freeze) > new Date()}
				{$_('contest.leaderboard.frozen_notice')} {new Date(event.freeze).toLocaleString('vi-vn')}.
			{:else if event.freeze == event.start}
				{$_('contest.leaderboard.hidden_notice')}
			{:else}
				{$_('contest.leaderboard.frozen_since')} {new Date(event.freeze).toLocaleString('vi-vn')}.
			{/if}
		</Alert.Title>
	</Alert.Root>
{/if}
<div class="mb-[10px] flex justify-center gap-[10px]">
	<div class="flex items-center gap-[10px] rounded-md border border-input bg-background px-3">
		<Label for="percentage-switch" class="cursor-pointer text-sm">
			{showPercentage ? $_('contest.leaderboard.display_mode.contribution_percentage') : $_('contest.leaderboard.display_mode.total_points')}
		</Label>
		<Switch.Root id="percentage-switch" bind:checked={showPercentage} />
	</div>
	<a href="#me">
		<Button class="w-[200px]" variant="outline">{$_('contest.leaderboard.jump_to_me')}</Button>
	</a>
	<Button
		on:click={exportToCSV}
		disabled={leaderboard.length === 0}
		class="w-fit"
		variant="outline"
	>
		<Download size={16} />
	</Button>
	<Button class="w-fit" variant="outline" disabled={refreshing} on:click={() => refresh(true)}>
		<Reload size={16} />
	</Button>
	{#if $user.loggedIn && $user.data.isAdmin}
		<Button
			on:click={() => {
				revealMode = !revealMode;
				[leaderboard, leaderboard1] = [leaderboard1, leaderboard];
			}}
			disabled={leaderboard.length === 0}
			class="w-fit"
			variant="outline"
		>
			Switch to {revealMode ? 'Normal' : 'Reveal'} Mode
		</Button>
		<Button variant="outline" disabled={event.isCalculated} on:click={calculate}
			>Calculate rating</Button
		>
	{/if}
</div>
<div class="sticky top-[55px] z-10 bg-[hsl(var(--background))]">
	<Table.Root class="ml-auto mr-auto w-[1500px] max-w-full">
		<Table.Header>
			<Table.Row>
				<Table.Head class="w-[100px]">{$_('contest.leaderboard.rank')}</Table.Head>
				<Table.Head class="min-w-[200px]">{$_('contest.leaderboard.player')}</Table.Head>
				<Table.Head class="w-[75px] text-center">{$_('contest.leaderboard.total')}</Table.Head>
				{#if event.type !== 'basic'}
					<Table.Head class="w-[75px] text-center">{$_('contest.leaderboard.penalty')}</Table.Head>
				{/if}
				{#each levels as level, index}
					<Table.Head class="w-[75px] text-center">
						<Tooltip.Root>
							<Tooltip.Trigger>
								{indexToRoman(index + 1)}
							</Tooltip.Trigger>
							<Tooltip.Content>{level ? level.name : '???'}</Tooltip.Content>
						</Tooltip.Root>
					</Table.Head>
				{/each}
				{#if event.type == 'raid' && previousScores.size > 0}
					<Table.Head class="w-[75px] text-center">Δ</Table.Head>
				{/if}
				{#if event.isCalculated}
					<Table.Head class="w-[75px] text-center">Δ</Table.Head>
				{/if}
			</Table.Row>
		</Table.Header>
	</Table.Root>
</div>

<div class="select-none overflow-y-hidden">
	<Table.Root class="ml-auto mr-auto w-[1500px] max-w-full">
		<Table.Body>
			{#each leaderboard as player, rank (player.uid)}
				<tr
					animate:flip={{}}
					class={cn('border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted')}
				>
					{#if $user.loggedIn && player.uid == $user.data.uid}
						<Table.Cell class="w-[100px] font-medium text-yellow-500">#{rank + 1}</Table.Cell>
					{:else}
						<Table.Cell class="w-[100px] font-medium">#{rank + 1}</Table.Cell>
					{/if}
					<Table.Cell class="min-w-[200px]">
						{#if $user.loggedIn && player.uid == $user.data.uid}
							<div id="me">
								<PlayerHoverCard {player} showTitle={true} titleType="elo" />
							</div>
						{:else}
							<PlayerHoverCard {player} showTitle={true} titleType="elo" />
						{/if}
					</Table.Cell>
					<Table.Cell class="w-[75px] text-center font-bold">
						{#if showPercentage}
							{getContributionPercentage(player.eventRecords)}%
						{:else}
							{getTotalPoint(player.eventRecords)}
						{/if}
					</Table.Cell>
					{#if event.type !== 'basic'}
						<Table.Cell class="w-[75px] text-center">
							<Tooltip.Root>
								<Tooltip.Trigger>
									{getPenalty(player.eventRecords, 60000)}
								</Tooltip.Trigger>
								<Tooltip.Content>{getPenaltyTooltip(player.eventRecords)}</Tooltip.Content>
							</Tooltip.Root>
						</Table.Cell>
					{/if}
					{#each player.eventRecords as record, index}
						{#if !revealMode}
							<Table.Cell class="w-[75px] text-center">
								{#if getPoint(record, index) == 0}
									{#if new Date(event.freeze) > new Date()}
										0
									{:else}
										-
									{/if}
								{:else}
									<RecordDetailDialog
										{record}
										{index}
										{levels}
										{getPoint}
										onUpdate={updateRecord}
										type={event.type}
									/>
								{/if}
							</Table.Cell>
						{:else}
							<Table.Cell
								class="h-[50px] w-[75px] cursor-pointer text-center"
								on:click={() => reveal(player.uid, index, rank)}
							>
								{#if getPoint(record, index)}
									{#if record && record.accepted === false}
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
								{:else if record == 'revealed'}
									0
								{:else}
									-
								{/if}
							</Table.Cell>
						{/if}
					{/each}
					{#if event.type == 'raid' && previousScores.size > 0}
						{@const currentScore = getTotalPoint(player.eventRecords)}
						{@const scoreDiff = getScoreDiff(player.uid, currentScore)}
						<Table.Cell
							class={`w-[75px] text-center ${Math.sign(scoreDiff) > 0 ? 'text-green-600 dark:text-green-400' : scoreDiff < 0 ? 'text-red-600 dark:text-red-400' : ''}`}
						>
							{Math.sign(scoreDiff) > 0 ? '+' : ''}{scoreDiff}
						</Table.Cell>
					{/if}
					{#if event.isCalculated}
						<Table.Cell
							class={`w-[75px] text-center ${Math.sign(player.diff) > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
						>
							{Math.sign(player.diff) > 0 ? '+' : ''}{player.diff}
						</Table.Cell>
					{/if}
				</tr>
			{/each}
		</Table.Body>
	</Table.Root>
</div>
