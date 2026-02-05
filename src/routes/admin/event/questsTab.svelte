<script lang="ts">
	import { user } from '$lib/client';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import AddQuestDialog from './quests/AddQuestDialog.svelte';
	import EditConditionDialog from './quests/EditConditionDialog.svelte';
	import SelectItemDialog from './quests/SelectItemDialog.svelte';
	import { Trash2, Plus, Settings, Gift } from 'lucide-svelte';

	export let event: any;

	let quests: any[] = [];
	let loading = true;

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

	async function fetchQuests() {
		if (!event.id) return;

		loading = true;
		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/events/${event.id}/quest`, {
				method: 'GET',
				headers: {
					Authorization: 'Bearer ' + (await $user.token())
				}
			});
			quests = await res.json();
		} catch (e) {
			console.error(e);
			toast.error('Failed to fetch quests');
		} finally {
			loading = false;
		}
	}

	async function deleteQuest(questId: number) {
		if (!confirm('Are you sure you want to delete this quest?')) return;

		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/events/${event.id}/quest/${questId}`, {
				method: 'DELETE',
				headers: {
					Authorization: 'Bearer ' + (await $user.token())
				}
			}),
			{
				success: () => {
					fetchQuests();
					return 'Quest deleted!';
				},
				loading: 'Deleting...',
				error: 'Failed to delete quest'
			}
		);
	}

	async function removeReward(questId: number, rewardId: number) {
		if (!confirm('Remove this reward from the quest?')) return;

		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/events/${event.id}/quest/${questId}/reward/${rewardId}`, {
				method: 'DELETE',
				headers: {
					Authorization: 'Bearer ' + (await $user.token())
				}
			}),
			{
				success: () => {
					fetchQuests();
					return 'Reward removed!';
				},
				loading: 'Removing...',
				error: 'Failed to remove reward'
			}
		);
	}

	function formatCondition(condition: any[]) {
		if (!condition || !condition.length) return 'No condition';
		
		return condition.map(c => {
			if (c.type === 'min' && c.attribute === 'total_point') {
				return `Min ${c.value} points`;
			}
			return JSON.stringify(c);
		}).join(', ');
	}

	onMount(() => {
		if (event.id) {
			fetchQuests();
		}
	});

	$: if (event.id) {
		fetchQuests();
	}
</script>

<div class="flex flex-col gap-4 py-4">
	<div class="flex items-center justify-between">
		<h3 class="text-lg font-semibold">Event Quests</h3>
		<AddQuestDialog {event} onSuccess={fetchQuests} />
	</div>

	{#if loading}
		<p>Loading quests...</p>
	{:else if quests.length === 0}
		<p class="text-muted-foreground">No quests found for this event.</p>
	{:else}
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head class="w-[80px]">ID</Table.Head>
					<Table.Head>Title</Table.Head>
					<Table.Head>Condition</Table.Head>
					<Table.Head>Rewards</Table.Head>
					<Table.Head class="w-[200px]">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each quests as quest}
					<Table.Row>
						<Table.Cell>{quest.id}</Table.Cell>
						<Table.Cell>{quest.title || 'Untitled'}</Table.Cell>
						<Table.Cell>
							<div class="flex items-center gap-2">
								<span>{formatCondition(quest.condition)}</span>
								<EditConditionDialog {event} {quest} onSuccess={fetchQuests} />
							</div>
						</Table.Cell>
						<Table.Cell>
							<div class="flex flex-wrap items-center gap-2">
								{#each quest.rewards || [] as reward}
									<div class="group relative">
										<div
											class="flex h-[50px] w-[50px] items-center justify-center overflow-hidden rounded-md bg-neutral-800"
											style="border-bottom: 3px solid {rarityColor(reward.rarity)};"
											title={reward.name}
										>
											<img
												class="max-h-full max-w-full object-contain p-1"
												src={`https://cdn.gdvn.net/items/${reward.id}.webp`}
												alt={reward.name}
											/>
										</div>
										<button
											class="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex"
											on:click={() => removeReward(quest.id, reward.id)}
										>
											×
										</button>
									</div>
								{/each}
								<SelectItemDialog {event} {quest} onSuccess={fetchQuests} />
							</div>
						</Table.Cell>
						<Table.Cell>
							<div class="flex gap-2">
								<Button variant="destructive" size="sm" on:click={() => deleteQuest(quest.id)}>
									<Trash2 class="h-4 w-4" />
								</Button>
							</div>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	{/if}
</div>
