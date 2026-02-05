<script lang="ts">
	import Title from '$lib/components/Title.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import Plus from 'lucide-svelte/icons/plus';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import Edit from 'lucide-svelte/icons/pencil';
	import { MAP_PACK_DIFFICULTY_OPTIONS } from '$lib/battlepass/constants';

	// State
	let generalMapPacks: any[] = [];

	// Dialog states
	let showGeneralMapPackDialog = false;
	let showMapPackLevelDialog = false;

	// Form states
	let generalMapPackForm = {
		id: null as number | null,
		name: '',
		description: '',
		difficulty: 'harder' as any,
		xp: 200
	};

	let mapPackLevelForm = {
		mapPackId: null as number | null,
		levelID: '',
		order: 0
	};

	// Fetch functions
	async function fetchGeneralMapPacks() {
		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/mappacks`);
			if (res.ok) generalMapPacks = await res.json();
		} catch (e) {
			console.error('Failed to fetch general map packs:', e);
		}
	}

	// General Map Pack CRUD
	async function saveGeneralMapPack() {
		const isNew = !generalMapPackForm.id;
		const url = isNew
			? `${import.meta.env.VITE_API_URL}/mappacks`
			: `${import.meta.env.VITE_API_URL}/mappacks/${generalMapPackForm.id}`;

		toast.promise(
			fetch(url, {
				method: isNew ? 'POST' : 'PATCH',
				body: JSON.stringify({
					name: generalMapPackForm.name,
					description: generalMapPackForm.description,
					difficulty: generalMapPackForm.difficulty,
					xp: generalMapPackForm.xp
				}),
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				}
			}),
			{
				success: () => {
					showGeneralMapPackDialog = false;
					fetchGeneralMapPacks();
					return isNew ? 'Map pack created!' : 'Map pack updated!';
				},
				loading: 'Saving...',
				error: 'Failed to save map pack'
			}
		);
	}

	async function deleteGeneralMapPack(id: number) {
		if (!confirm('Delete this map pack?')) return;

		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/mappacks/${id}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${await $user.token()}` }
			}),
			{
				success: () => {
					fetchGeneralMapPacks();
					return 'Map pack deleted!';
				},
				loading: 'Deleting...',
				error: 'Failed to delete'
			}
		);
	}

	// Map Pack Level
	async function addMapPackLevel() {
		if (!mapPackLevelForm.mapPackId) return;

		toast.promise(
			fetch(
				`${import.meta.env.VITE_API_URL}/mappacks/${mapPackLevelForm.mapPackId}/level`,
				{
					method: 'POST',
					body: JSON.stringify({
						levelID: Number(mapPackLevelForm.levelID),
						order: mapPackLevelForm.order
					}),
					headers: {
						Authorization: `Bearer ${await $user.token()}`,
						'Content-Type': 'application/json'
					}
				}
			),
			{
				success: () => {
					showMapPackLevelDialog = false;
					fetchGeneralMapPacks();
					return 'Level added!';
				},
				loading: 'Adding...',
				error: 'Failed to add level'
			}
		);
	}

	async function deleteMapPackLevel(mapPackId: number, levelId: number) {
		if (!confirm('Remove this level?')) return;

		toast.promise(
			fetch(
				`${import.meta.env.VITE_API_URL}/mappacks/${mapPackId}/level/${levelId}`,
				{
					method: 'DELETE',
					headers: { Authorization: `Bearer ${await $user.token()}` }
				}
			),
			{
				success: () => {
					fetchGeneralMapPacks();
					return 'Level removed!';
				},
				loading: 'Removing...',
				error: 'Failed to remove'
			}
		);
	}

	// Reset form functions
	function openNewGeneralMapPack() {
		generalMapPackForm = { id: null, name: '', description: '', difficulty: 'harder', xp: 200 };
		showGeneralMapPackDialog = true;
	}

	function openEditGeneralMapPack(pack: any) {
		generalMapPackForm = {
			id: pack.id,
			name: pack.name,
			description: pack.description,
			difficulty: pack.difficulty,
			xp: pack.xp
		};
		showGeneralMapPackDialog = true;
	}

	function openAddMapPackLevel(packId: number) {
		mapPackLevelForm = { mapPackId: packId, levelID: '', order: 0 };
		showMapPackLevelDialog = true;
	}

	onMount(() => {
		fetchGeneralMapPacks();
	});
</script>

<svelte:head>
	<title>Map Pack Manager - Admin</title>
</svelte:head>

<Title value="Map Pack Manager" />

<div class="wrapper">
	<div class="flex flex-col gap-4">
		{#each generalMapPacks as pack}
			<Card.Root class="border">
				<Card.Content class="p-4">
					<div class="flex items-start justify-between">
						<div class="flex-1">
							<h4 class="font-bold">{pack.name} (ID: {pack.id})</h4>
							<p class="text-sm text-muted-foreground">{pack.description || '-'}</p>
							<div class="mt-2 flex items-center gap-4 text-sm">
								<span class="capitalize">{pack.difficulty}</span>
								<span class="text-yellow-400">+{pack.xp} XP</span>
							</div>
							{#if pack.mapPackLevels?.length}
								<div class="mt-2 flex flex-wrap gap-2">
									{#each pack.mapPackLevels as level}
										<div class="flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs">
											<a href={`/level/${level.levelID}`}>{level.levels?.name}</a>
											{#if level.levels?.creator}
												<span class="text-muted-foreground">by {level.levels.creator}</span>
											{/if}
											<Button
												variant="ghost"
												size="icon"
												class="h-4 w-4"
												on:click={() => deleteMapPackLevel(pack.id, level.id)}
											>
												<Trash2 class="h-3 w-3" />
											</Button>
										</div>
									{/each}
								</div>
							{/if}
						</div>
						<div class="flex gap-2">
							<Button variant="outline" size="sm" on:click={() => openAddMapPackLevel(pack.id)}>
								<Plus class="mr-1 h-4 w-4" />
								Level
							</Button>
							<Button variant="outline" size="icon" on:click={() => openEditGeneralMapPack(pack)}>
								<Edit class="h-4 w-4" />
							</Button>
							<Button
								variant="destructive"
								size="icon"
								on:click={() => deleteGeneralMapPack(pack.id)}
							>
								<Trash2 class="h-4 w-4" />
							</Button>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		{:else}
			<p class="py-8 text-center text-muted-foreground">No map packs created</p>
		{/each}
	</div>
</div>

<!-- General Map Pack Dialog -->
<Dialog.Root bind:open={showGeneralMapPackDialog}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>{generalMapPackForm.id ? 'Edit Map Pack' : 'Create Map Pack'}</Dialog.Title>
		</Dialog.Header>
		<div class="flex flex-col gap-4">
			<div>
				<Label for="packName">Name</Label>
				<Input id="packName" bind:value={generalMapPackForm.name} placeholder="Harder Pack 1" />
			</div>
			<div>
				<Label for="packDesc">Description</Label>
				<Textarea
					id="packDesc"
					bind:value={generalMapPackForm.description}
					placeholder="A collection of harder levels"
				/>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<Label for="packDifficulty">Difficulty</Label>
					<Select.Root
						onSelectedChange={(v) => (generalMapPackForm.difficulty = v?.value || 'harder')}
					>
						<Select.Trigger>
							<Select.Value placeholder={generalMapPackForm.difficulty} />
						</Select.Trigger>
						<Select.Content>
							{#each MAP_PACK_DIFFICULTY_OPTIONS as opt}
								<Select.Item value={opt.value}>{opt.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div>
					<Label for="packXP">XP</Label>
					<Input id="packXP" type="number" bind:value={generalMapPackForm.xp} />
				</div>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" on:click={() => (showGeneralMapPackDialog = false)}>Cancel</Button>
			<Button on:click={saveGeneralMapPack}>Save</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Map Pack Level Dialog -->
<Dialog.Root bind:open={showMapPackLevelDialog}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Add Level to Map Pack</Dialog.Title>
		</Dialog.Header>
		<div class="flex flex-col gap-4">
			<div>
				<Label for="mpLevelID">Level ID</Label>
				<Input
					id="mpLevelID"
					type="number"
					bind:value={mapPackLevelForm.levelID}
					placeholder="12345678"
				/>
			</div>
			<div>
				<Label for="mpLevelOrder">Order</Label>
				<Input id="mpLevelOrder" type="number" bind:value={mapPackLevelForm.order} min="0" />
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" on:click={() => (showMapPackLevelDialog = false)}>Cancel</Button>
			<Button on:click={addMapPackLevel}>Add</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<style lang="scss">
	.wrapper {
		padding-inline: 75px;
		padding-block: 30px;
	}

	@media screen and (max-width: 768px) {
		.wrapper {
			padding-inline: 15px;
		}
	}
</style>
