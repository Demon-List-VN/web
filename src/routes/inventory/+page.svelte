<script lang="ts">
	import { user } from '$lib/client';
	import Loading from '$lib/components/animation/loading.svelte';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import CaseDialog from '$lib/components/caseDialog.svelte';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { _ } from 'svelte-i18n';
	import { get } from 'svelte/store';

	type Item = {
		userID: string;
		itemId: number;
		created_at: string;
		inventoryId: number;
		name: string;
		type: string | null;
		redirect: string | null;
		productId: number | null;
		description: string | null;
		rarity: number;
		stackable?: boolean;
		quantity?: number;
		inventoryQuantity: number;
	};

	let items: Item[] = [];
	let loading = false;
	let error: string | null = null;

	async function fetchInventory() {
		loading = true;
		error = null;

		try {
			const res = await (
				await fetch(`${import.meta.env.VITE_API_URL}/inventory`, {
					method: 'GET',
					headers: {
						Authorization: 'Bearer ' + (await $user.token())
					}
				})
			).json();

			items = Array.isArray(res) ? res : [];
		} catch (e) {
			console.error(e);
			error = get(_)('inventory.failed_load');
		} finally {
			loading = false;
		}
	}

	async function fetchItem(itemId: number, inventoryId: number) {
		const inventoryItem = await (
			await fetch(`${import.meta.env.VITE_API_URL}/inventory/${inventoryId}`, {
				method: 'GET',
				headers: {
					Authorization: 'Bearer ' + (await $user.token())
				}
			})
		).json();

		if (inventoryItem.type == 'case') {
			const item = await (
				await fetch(`${import.meta.env.VITE_API_URL}/item/${itemId}`, {
					method: 'GET',
					headers: {
						Authorization: 'Bearer ' + (await $user.token())
					}
				})
			).json();

			inventoryItem.caseItems = item.caseItems;
		}

		return inventoryItem;
	}

	let selectedItems: Record<
		number,
		{
			loading: boolean;
			data: any | null;
			error: string | null;
		}
	> = {};

	function hasExpire(it: any) {
		return !!(it?.expireAt || selectedItems[it.inventoryId]?.data?.expireAt);
	}

	async function loadItem(itemId: number, inventoryId: number) {
		selectedItems = {
			...selectedItems,
			[inventoryId]: { loading: true, data: null, error: null }
		};

		try {
			const data = await fetchItem(itemId, inventoryId);
			selectedItems = {
				...selectedItems,
				[inventoryId]: { loading: false, data, error: null }
			};
		} catch (e) {
			console.error(e);
			selectedItems = {
				...selectedItems,
				[inventoryId]: { loading: false, data: null, error: get(_)('inventory.failed_load_item') }
			};
		}
	}

	onMount(async () => {
		await fetchInventory();
	});

	async function closeAllAndReload() {
		try {
			const closeBtns = document.querySelectorAll('.absolute.right-4.top-4');
			closeBtns.forEach((b) => {
				if (b instanceof HTMLElement) b.click();
			});

			await new Promise((r) => setTimeout(r, 150));

			await fetchInventory();
		} catch (e) {
			console.error('Failed to close dialogs or reload inventory', e);
		}
	}

	function rarityClass(r: number) {
		switch (r) {
			case 1:
				return 'border-blue-500';
			case 2:
				return 'border-purple-500';
			case 3:
				return 'border-pink-500';
			case 4:
				return 'border-red-600';
			default:
				return 'border-gray-400';
		}
	}

	function rarityName(r: number) {
		switch (r) {
			case 1:
				return get(_)('inventory.rarity_names.uncommon');
			case 2:
				return get(_)('inventory.rarity_names.rare');
			case 3:
				return get(_)('inventory.rarity_names.epic');
			case 4:
				return get(_)('inventory.rarity_names.legendary');
			default:
				return get(_)('inventory.rarity_names.common');
		}
	}

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

	async function use(inventoryId: number, redirect: string) {
		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/inventory/${inventoryId}/consume`, {
				method: 'DELETE',
				headers: {
					Authorization: 'Bearer ' + (await $user.token())
				}
			}),
			{
				success: () => {
					goto(redirect);
					return get(_)('inventory.redirect_success');
				},
				loading: get(_)('inventory.redirecting'),
				error: get(_)('inventory.redirect_error')
			}
		);
	}
</script>

<svelte:head>
	<title>{$_('inventory.page_title')}</title>
</svelte:head>

<div class="px-[10px] pt-[20px] xl:px-[100px]">
	<h1 class="mb-4 text-2xl font-semibold">{$_('inventory.title')}</h1>

	{#if loading}
		<div class="text-sm text-gray-500">
			<Loading inverted />
		</div>
	{:else if error}
		<div class="text-sm text-red-500">{error}</div>
	{:else if items.length === 0}
		<div class="text-sm text-gray-500">{$_('inventory.empty')}</div>
	{:else}
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
			{#each items as item (item.inventoryId)}
				<Dialog.Root>
					<Dialog.Trigger>
						<button
							on:click={() => loadItem(item.itemId, item.inventoryId)}
							class={`relative w-full transform rounded-md border-b-4 bg-white/5 p-0 transition-transform hover:scale-105 ${rarityClass(item.rarity)} cursor-pointer overflow-hidden text-left`}
							title={item.name}
							aria-label={`Open ${item.name}`}
						>
							<div class="item-thumb flex h-36 w-full items-center justify-center rounded-sm">
								<img
									src={`https://cdn.gdvn.net/items/${item.itemId}.webp`}
									alt={item.name}
									class="h-full w-full object-contain py-1"
								/>
							</div>

							{#if hasExpire(item)}
								<div
									class="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-1"
									aria-hidden="true"
								>
									<!-- Clock icon -->
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-4 w-4 text-white"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
									>
										<circle
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											stroke-width="2"
											fill="none"
										/>
										<path
											d="M12 6v6l4 2"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
											fill="none"
										/>
									</svg>
								</div>
							{/if}
							{#if item.inventoryQuantity > 1}
								<div
									class="absolute bottom-2 right-2 z-10 rounded-full bg-black/80 px-2 py-1 text-xs font-bold text-white"
								>
									x{item.inventoryQuantity}
								</div>
							{/if}
							<div class="p-2">
								<div class="truncate text-sm font-medium text-white">{item.name}</div>
							</div>
						</button>
					</Dialog.Trigger>

					<Dialog.Content>
						{#if selectedItems[item.inventoryId]?.loading}
							<div class="py-6">
								<Loading inverted />
							</div>
						{:else if selectedItems[item.inventoryId]?.error}
							<div class="py-4 text-sm text-red-400">{selectedItems[item.inventoryId].error}</div>
						{:else if selectedItems[item.inventoryId]?.data}
							<div class="flex items-start gap-4">
								<div
									class={`relative h-40 w-40 flex-shrink-0 overflow-hidden rounded-md border-b-4 ${rarityClass(selectedItems[item.inventoryId].data.rarity ?? item.rarity)} bg-neutral-800 p-2`}
								>
									<img
										src={`https://cdn.gdvn.net/items/${item.itemId}.webp`}
										alt={selectedItems[item.inventoryId].data.name ?? item.name}
										class="h-full w-full object-cover"
									/>
									{#if item.inventoryQuantity > 1}
										<div
											class="absolute bottom-2 right-2 z-10 rounded-full bg-black/80 px-2 py-1 text-xs font-bold text-white"
										>
											x{item.inventoryQuantity}
										</div>
									{/if}
								</div>
								<div class="h-full flex-1">
									<div class="flex h-full flex-1 flex-col">
										<div>
											<Dialog.Header>
												<Dialog.Title
													>{selectedItems[item.inventoryId].data.name ?? item.name}</Dialog.Title
												>
												<Dialog.Description
													>{selectedItems[item.inventoryId].data.description ??
														item.description ??
														'No description available.'}</Dialog.Description
												>
											</Dialog.Header>
											<div class="mt-3 text-sm text-gray-300">
												{$_('inventory.rarity')}:
												<span
													class="font-semibold"
													style="color: {rarityColor(
														selectedItems[item.inventoryId].data.rarity ?? item.rarity
													)}"
													>{rarityName(
														selectedItems[item.inventoryId].data.rarity ?? item.rarity
													)}</span
												>
											</div>
											{#if selectedItems[item.inventoryId].data.expireAt}
												<div class="text-sm text-gray-300">
													{$_('inventory.expire_at')}: {new Date(
														selectedItems[item.inventoryId].data.expireAt
													).toLocaleString('vi-vn')}
												</div>
											{/if}
										</div>
										<div class="mt-auto">
											{#if selectedItems[item.inventoryId].data.type == 'case'}
												<AlertDialog.Root>
													<AlertDialog.Trigger>
														<Button variant="secondary">{$_('inventory.open_case')}</Button>
													</AlertDialog.Trigger>
													<AlertDialog.Content>
														<CaseDialog
															{item}
															inventoryItemId={item.inventoryId}
															caseItems={selectedItems[item.inventoryId].data.caseItems}
															on:close={closeAllAndReload}
														/>
													</AlertDialog.Content>
												</AlertDialog.Root>
											{:else if selectedItems[item.inventoryId].data.useRedirect}
												<Button
													variant="secondary"
													on:click={() =>
														use(item.inventoryId, selectedItems[item.inventoryId].data.useRedirect)}
													>{$_('inventory.use')}</Button
												>
											{/if}
										</div>
									</div>
								</div>
							</div>
							{#if item.type == 'case'}
								<b class="text-center">{$_('inventory.possible_items')}</b>
								{#if selectedItems[item.inventoryId].data.caseItems && selectedItems[item.inventoryId].data.caseItems.length > 0}
									<div class="mt-2 grid grid-cols-3 gap-2">
										{#each selectedItems[item.inventoryId].data.caseItems as c (c.id)}
											<div
												class={`flex flex-col items-center rounded-md border-b-4 bg-neutral-900 p-2 text-center ${rarityClass(c.items.rarity ?? item.rarity)}`}
											>
												<img
													src={`https://cdn.gdvn.net/items/${c.items.id}.webp`}
													alt={c.items.name}
													class="mb-1 h-16 w-16 object-contain"
												/>
												<div class="text-xs font-medium">{c.items.name}</div>
												<div class="text-xs text-gray-400">
													{$_('inventory.rate')}: {(c.rate ?? 0) * 100}%
												</div>
											</div>
										{/each}
									</div>
								{:else}
									<div
										class={`h-40 w-40 flex-shrink-0 overflow-hidden rounded-md border-b-4 ${rarityClass(item.rarity)} mt-2 bg-neutral-800 p-2`}
									>
										<img
											src={`https://cdn.gdvn.net/items/${item.itemId}.webp`}
											alt={item.name}
											class="h-full w-full object-cover"
										/>
									</div>
								{/if}
							{/if}
						{/if}
					</Dialog.Content>
				</Dialog.Root>
			{/each}
		</div>
	{/if}
</div>

<style>
	.item-thumb {
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(0, 0, 0, 0.02));
	}
</style>
