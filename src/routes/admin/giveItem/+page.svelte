<script lang="ts">
	import Title from '$lib/components/Title.svelte';
	import PlayerSelector from '$lib/components/playerSelector.svelte';
	import { user } from '$lib/client';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { toast } from 'svelte-sonner';
	import Search from 'lucide-svelte/icons/search';
	import X from 'lucide-svelte/icons/x';

	type Item = {
		id: number;
		name: string;
		description: string | null;
		rarity: number;
		stackable: boolean;
	};

	let selectedPlayer: { uid: string; name: string; } | null = null;
	let selectedItem: Item | null = null;
	let itemQuery = '';
	let itemResults: Item[] = [];
	let quantity = 1;
	let expireAt = '';
	let searching = false;
	let granting = false;
	let searchTimeout: ReturnType<typeof setTimeout>;

	const rarityNames = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];

	async function searchItems() {
		if (!itemQuery.trim()) {
			itemResults = [];

			return;
		}

		searching = true;

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/item/search?q=${encodeURIComponent(itemQuery.trim())}`,
				{
					headers: {
						Authorization: `Bearer ${await $user.token()}`
					}
				}
			);

			if (!response.ok) {
				throw new Error('Failed to search items');
			}

			itemResults = await response.json();
		} catch (error) {
			console.error(error);
			itemResults = [];
			toast.error('Failed to search items');
		} finally {
			searching = false;
		}
	}

	function scheduleItemSearch() {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(searchItems, 300);
	}

	function selectItem(item: Item) {
		selectedItem = item;
		itemQuery = item.name;
		itemResults = [];
		quantity = 1;
	}

	function clearItem() {
		selectedItem = null;
		itemQuery = '';
		itemResults = [];
	}

	async function grantItem() {
		if (!selectedPlayer) {
			toast.error('Select a player');

			return;
		}

		if (!selectedItem) {
			toast.error('Select an item');

			return;
		}

		const grantQuantity = Number(quantity);

		if (!Number.isInteger(grantQuantity) || grantQuantity <= 0) {
			toast.error('Quantity must be a positive integer');

			return;
		}

		granting = true;

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/inventory/manage/grant`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${await $user.token()}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						playerUid: selectedPlayer.uid,
						itemId: selectedItem.id,
						quantity: grantQuantity,
						expireAt: expireAt
							? new Date(expireAt)
								.toISOString()
							: null
					})
				}
			);

			if (!response.ok) {
				const error = await response.json()
					.catch(() => null);
				throw new Error(error?.message ?? 'Failed to give item');
			}

			toast.success(
				`Gave ${selectedItem.name} x${grantQuantity} to ${selectedPlayer.name}`
			);
			clearItem();
			quantity = 1;
			expireAt = '';
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to give item');
		} finally {
			granting = false;
		}
	}
</script>

<svelte:head>
  <title>Give Item - Manager</title>
</svelte:head>

<Title value="Give Item" />

<div class="mx-auto grid max-w-2xl gap-6 px-4 py-6">
  <div class="rounded-lg border bg-card p-6">
    <p class="mb-6 text-sm text-muted-foreground">
      Add an item directly to a player's inventory. Stackable items are added to
      their existing quantity.
    </p>

    <div class="grid gap-5">
      <div class="grid gap-2">
        <Label>Player</Label>
        <PlayerSelector bind:value={selectedPlayer} disabled={granting} />
      </div>

      <div class="relative grid gap-2">
        <Label for="item-search">Item</Label>
        <div class="relative">
          <Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="item-search"
            class="pl-9 pr-10"
            placeholder="Search by item name or ID"
            bind:value={itemQuery}
            disabled={granting}
            on:input={() => {
              selectedItem = null;
              scheduleItemSearch();
            }}
          />
          {#if itemQuery}
            <button
              type="button"
              class="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
              aria-label="Clear item"
              on:click={clearItem}
            >
              <X class="h-4 w-4" />
            </button>
          {/if}
        </div>

        {#if searching}
          <p class="text-sm text-muted-foreground">Searching...</p>
        {:else if itemResults.length > 0}
          <div class="absolute top-full z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
            {#each itemResults as item (item.id)}
              <button
                type="button"
                class="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left hover:bg-accent"
                on:click={() => selectItem(item)}
              >
                <img
                  class="h-10 w-10 rounded object-contain"
                  src={`https://cdn.gdvn.net/items/${item.id}.webp`}
                  alt=""
                />
                <span class="min-w-0">
                  <span class="block truncate font-medium">{item.name}</span>
                  <span class="block text-xs text-muted-foreground">
                    #{item.id} · {rarityNames[item.rarity] ?? 'Common'}
                    {item.stackable ? ' · Stackable' : ''}
                  </span>
                </span>
              </button>
            {/each}
          </div>
        {/if}
      </div>

      {#if selectedItem}
        <div class="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
          <img
            class="h-14 w-14 rounded object-contain"
            src={`https://cdn.gdvn.net/items/${selectedItem.id}.webp`}
            alt=""
          />
          <div>
            <p class="font-medium">{selectedItem.name}</p>
            <p class="text-sm text-muted-foreground">
              Item #{selectedItem.id} · {selectedItem.stackable ? 'Stackable' : 'Not stackable'}
            </p>
          </div>
        </div>
      {/if}

      <div class="grid gap-2 sm:grid-cols-2 sm:gap-4">
        <div class="grid gap-2">
          <Label for="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            min="1"
            max="10000"
            step="1"
            bind:value={quantity}
            disabled={granting}
          />
          {#if selectedItem?.stackable === false}
            <p class="text-xs text-muted-foreground">
              Each copy will be added as a separate inventory item.
            </p>
          {/if}
        </div>
        <div class="grid gap-2">
          <Label for="expire-at">Expires at (optional)</Label>
          <Input
            id="expire-at"
            type="datetime-local"
            bind:value={expireAt}
            disabled={granting}
          />
        </div>
      </div>

      <Button
        on:click={grantItem}
        disabled={granting || !selectedPlayer || !selectedItem}
      >
        {granting ? 'Giving item...' : 'Give item'}
      </Button>
    </div>
  </div>
</div>
