<script lang="ts">
	import { user } from '$lib/client';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { toast } from 'svelte-sonner';
	import { Plus, Search, X } from 'lucide-svelte';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';

	export let event: any;
	export let quest: any;
	export let onSuccess: () => void;

	let open = false;
	let searchQuery = '';
	let searchResults: any[] = [];
	let selectedItem: any = null;
	let expireAfter: number | null = null;
	let loading = false;
	let searchTimeout: any;

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

	function rarityName(r: number) {
		switch (r) {
			case 1:
				return 'Uncommon';
			case 2:
				return 'Rare';
			case 3:
				return 'Epic';
			case 4:
				return 'Legendary';
			default:
				return 'Common';
		}
	}

	async function searchItems() {
		if (!searchQuery.trim()) {
			searchResults = [];
			return;
		}

		loading = true;
		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/item/search?q=${encodeURIComponent(searchQuery)}`, {
				method: 'GET',
				headers: {
					Authorization: 'Bearer ' + (await $user.token())
				}
			});
			searchResults = await res.json();
		} catch (e) {
			console.error(e);
			searchResults = [];
		} finally {
			loading = false;
		}
	}

	function handleSearchInput() {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			searchItems();
		}, 300);
	}

	function selectItem(item: any) {
		selectedItem = item;
		// Auto-set expireAfter to 7 days (604800000ms) for clan boost or supporter items
		const itemName = (item.name || '').toLowerCase();
		if (itemName.includes('clan') || itemName.includes('supporter')) {
			expireAfter = 604800000;
		} else {
			expireAfter = null;
		}
	}

	function clearSelection() {
		selectedItem = null;
	}

	async function addReward() {
		if (!selectedItem) {
			toast.error('Please select an item');
			return;
		}

		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/events/${event.id}/quest/${quest.id}/reward`, {
				method: 'POST',
				headers: {
					Authorization: 'Bearer ' + (await $user.token()),
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					rewardId: selectedItem.id,
					expireAfter: expireAfter || null
				})
			}),
			{
				success: () => {
					open = false;
					selectedItem = null;
					expireAfter = null;
					searchQuery = '';
					searchResults = [];
					onSuccess();
					return 'Reward added!';
				},
				loading: 'Adding reward...',
				error: 'Failed to add reward'
			}
		);
	}

	function resetDialog() {
		selectedItem = null;
		expireAfter = null;
		searchQuery = '';
		searchResults = [];
	}

	$: if (!open) {
		resetDialog();
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger class={buttonVariants({ variant: 'outline', size: 'sm' })}>
		<Plus class="h-4 w-4" />
	</Dialog.Trigger>
	<Dialog.Content class="sm:max-w-[500px]">
		<Dialog.Header>
			<Dialog.Title>Add Reward to Quest</Dialog.Title>
			<Dialog.Description>
				Search and select an item to add as reward for quest: {quest.title || 'Untitled'}
			</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			{#if selectedItem}
				<div class="flex items-center gap-3 rounded-lg border p-3">
					<div
						class="flex h-[60px] w-[60px] items-center justify-center overflow-hidden rounded-md bg-neutral-800"
						style="border-bottom: 3px solid {rarityColor(selectedItem.rarity)};"
					>
						<img
							class="max-h-full max-w-full object-contain p-1"
							src={`https://cdn.gdvn.net/items/${selectedItem.id}.webp`}
							alt={selectedItem.name}
						/>
					</div>
					<div class="flex-1">
						<div class="font-medium">{selectedItem.name}</div>
						<div class="text-sm" style="color: {rarityColor(selectedItem.rarity)}">
							{rarityName(selectedItem.rarity)}
						</div>
					</div>
					<Button variant="ghost" size="sm" on:click={clearSelection}>
						<X class="h-4 w-4" />
					</Button>
				</div>
				<div class="grid grid-cols-4 items-center gap-4">
					<Label for="expireAfter" class="text-right">Expire After</Label>
					<Input
						id="expireAfter"
						type="number"
						placeholder="Days (optional)"
						bind:value={expireAfter}
						class="col-span-3"
					/>
				</div>
				<p class="text-xs text-muted-foreground">
					Leave empty for permanent reward. Enter number of days until the reward expires.
				</p>
			{:else}
				<div class="relative">
					<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search items by name or ID..."
						bind:value={searchQuery}
						on:input={handleSearchInput}
						class="pl-9"
					/>
				</div>
				{#if loading}
					<p class="text-center text-sm text-muted-foreground">Searching...</p>
				{:else if searchResults.length > 0}
					<ScrollArea class="h-[300px] rounded-md border">
						<div class="p-2">
							{#each searchResults as item}
								<button
									class="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-accent"
									on:click={() => selectItem(item)}
								>
									<div
										class="flex h-[50px] w-[50px] items-center justify-center overflow-hidden rounded-md bg-neutral-800"
										style="border-bottom: 3px solid {rarityColor(item.rarity)};"
									>
										<img
											class="max-h-full max-w-full object-contain p-1"
											src={`https://cdn.gdvn.net/items/${item.id}.webp`}
											alt={item.name}
										/>
									</div>
									<div>
										<div class="font-medium">{item.name}</div>
										<div class="text-xs text-muted-foreground">
											ID: {item.id} • <span style="color: {rarityColor(item.rarity)}">{rarityName(item.rarity)}</span>
										</div>
									</div>
								</button>
							{/each}
						</div>
					</ScrollArea>
				{:else if searchQuery}
					<p class="text-center text-sm text-muted-foreground">No items found</p>
				{:else}
					<p class="text-center text-sm text-muted-foreground">Start typing to search for items</p>
				{/if}
			{/if}
		</div>
		<Dialog.Footer>
			<Button variant="outline" on:click={() => (open = false)}>Cancel</Button>
			<Button on:click={addReward} disabled={!selectedItem}>Add Reward</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
