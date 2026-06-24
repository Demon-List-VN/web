<script lang="ts">
	import Title from '$lib/components/Title.svelte';
	import PlayerSelector from '$lib/components/playerSelector.svelte';
	import { user } from '$lib/client';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { toast } from 'svelte-sonner';
	import Trash2 from 'lucide-svelte/icons/trash-2';

	type InventoryItem = {
		inventoryId: number;
		itemId: number;
		name: string;
		description: string | null;
		rarity: number;
		stackable: boolean;
		inventoryQuantity: number;
		created_at: string;
		expireAt: string | null;
	};

	let selectedPlayer: { uid: string; name: string; } | null = null;
	let loadedPlayerUid: string | null = null;
	let items: InventoryItem[] = [];
	let loading = false;
	let deletingId: number | null = null;

	const rarityNames = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];

	async function loadInventory() {
		if (!selectedPlayer) {
			toast.error('Select a player');

			return;
		}

		loading = true;

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/inventory/manage/player/${
					encodeURIComponent(selectedPlayer.uid)
				}`,
				{
					headers: {
						Authorization: `Bearer ${await $user.token()}`
					}
				}
			);

			if (!response.ok) {
				const error = await response.json()
					.catch(() => null);
				throw new Error(error?.message ?? 'Failed to load inventory');
			}

			items = await response.json();
			loadedPlayerUid = selectedPlayer.uid;
		} catch (error) {
			items = [];
			loadedPlayerUid = null;
			toast.error(
				error instanceof Error ? error.message : 'Failed to load inventory'
			);
		} finally {
			loading = false;
		}
	}

	async function deleteItem(item: InventoryItem) {
		if (
			!confirm(
				`Delete "${item.name}" (#${item.itemId}) from ${
					selectedPlayer?.name ?? 'this player'
				}'s inventory?`
			)
		) {
			return;
		}

		deletingId = item.inventoryId;

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/inventory/manage/${item.inventoryId}`,
				{
					method: 'DELETE',
					headers: {
						Authorization: `Bearer ${await $user.token()}`
					}
				}
			);

			if (!response.ok) {
				const error = await response.json()
					.catch(() => null);
				throw new Error(error?.message ?? 'Failed to delete inventory item');
			}

			items = items.filter(({ inventoryId }) => inventoryId !== item.inventoryId);
			toast.success(`Deleted ${item.name} from inventory`);
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: 'Failed to delete inventory item'
			);
		} finally {
			deletingId = null;
		}
	}

	function formatDate(value: string) {
		return new Date(value)
			.toLocaleString();
	}
</script>

<svelte:head>
  <title>Player Inventory - Manager</title>
</svelte:head>

<Title value="Player Inventory" />

<div class="mx-auto grid max-w-4xl gap-6 px-4 py-6">
  <div class="rounded-lg border bg-card p-6">
    <p class="mb-6 text-sm text-muted-foreground">
      View a player's active inventory and delete individual inventory entries.
    </p>

    <div class="grid gap-2">
      <Label>Player</Label>
      <div class="grid gap-3 sm:grid-cols-[1fr_auto]">
        <PlayerSelector
          bind:value={selectedPlayer}
          disabled={loading || deletingId !== null}
          on:select={loadInventory}
          on:clear={() => {
            items = [];
            loadedPlayerUid = null;
          }}
        />
        <Button
          on:click={loadInventory}
          disabled={!selectedPlayer || loading || deletingId !== null}
        >
          {loading ? 'Loading...' : 'Load inventory'}
        </Button>
      </div>
    </div>
  </div>

  {#if loadedPlayerUid}
    <div class="grid gap-3">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">
          {selectedPlayer?.name ?? 'Player'}'s inventory
        </h2>
        <span class="text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {#if items.length === 0}
        <div class="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          This player has no active inventory items.
        </div>
      {:else}
        {#each items as item (item.inventoryId)}
          <div class="flex gap-4 rounded-lg border bg-card p-4">
            <img
              class="h-14 w-14 shrink-0 rounded object-contain"
              src={`https://cdn.gdvn.net/items/${item.itemId}.webp`}
              alt=""
            />
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-x-2">
                <p class="truncate font-medium">{item.name}</p>
                {#if item.inventoryQuantity > 1}
                  <span class="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                    x{item.inventoryQuantity}
                  </span>
                {/if}
              </div>
              <p class="text-xs text-muted-foreground">
                Item #{item.itemId} · Inventory #{item.inventoryId} · {
                  rarityNames[item.rarity] ?? 'Common'
                } · {item.stackable ? 'Stackable' : 'Not stackable'}
              </p>
              <p class="mt-1 text-xs text-muted-foreground">
                Added {formatDate(item.created_at)}
                {#if item.expireAt}
                  · Expires {formatDate(item.expireAt)}
                {/if}
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              on:click={() => deleteItem(item)}
              disabled={deletingId !== null}
              aria-label={`Delete ${item.name}`}
            >
              <Trash2 class="mr-2 h-4 w-4" />
              {deletingId === item.inventoryId ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</div>
