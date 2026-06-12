<script lang="ts">
	import Title from '$lib/components/Title.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Avatar from '$lib/components/ui/avatar';
	import AvatarFrame from '$lib/components/AvatarFrame.svelte';
	import {
		bannerImageUrl,
		frameImageUrl,
		getThemeStyle,
		type Cosmetic,
		type CosmeticType
	} from '$lib/client/cosmetics';
	import { upload } from '$lib/client/storage';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import Plus from 'lucide-svelte/icons/plus';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import Edit from 'lucide-svelte/icons/pencil';

	type CosmeticRow = Cosmetic & {
		items: {
			id: number;
			name: string;
			description: string | null;
			rarity: number;
		};
	};

	const RARITY_OPTIONS = [
		{ value: 0, label: 'Common' },
		{ value: 1, label: 'Uncommon' },
		{ value: 2, label: 'Rare' },
		{ value: 3, label: 'Epic' },
		{ value: 4, label: 'Legendary' }
	];

	let cosmetics: CosmeticRow[] = [];
	let loading = false;
	let showDialog = false;
	let saving = false;

	let form = {
		itemId: null as number | null,
		type: 'avatarFrame' as CosmeticType,
		name: '',
		description: '',
		rarity: 0,
		avatarWidth: 0.8,
		bgColor: '#1f2937',
		borderColor: '#8b5cf6'
	};

	let imageFile: File | null = null;
	let imagePreviewUrl: string | null = null;
	let fileInput: HTMLInputElement;

	$: isEditing = form.itemId !== null;
	$: typeSelectItem = {
		value: form.type,
		label: form.type === 'avatarFrame' ? 'Avatar frame' : 'Profile theme'
	};
	$: raritySelectItem = {
		value: form.rarity,
		label: RARITY_OPTIONS[form.rarity]?.label ?? 'Common'
	};
	$: previewCosmetic = {
		itemId: form.itemId ?? 0,
		type: form.type,
		avatarWidth: form.avatarWidth,
		bgColor: form.bgColor,
		borderColor: form.borderColor,
		imageVersion: 0
	} as Cosmetic;

	async function fetchCosmetics() {
		loading = true;

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/cosmetics`
			);

			if (!response.ok) {
				throw new Error('Failed to load cosmetics');
			}

			cosmetics = await response.json();
		} catch (e) {
			console.error(e);
			toast.error('Failed to load cosmetics');
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		form = {
			itemId: null,
			type: 'avatarFrame',
			name: '',
			description: '',
			rarity: 0,
			avatarWidth: 0.8,
			bgColor: '#1f2937',
			borderColor: '#8b5cf6'
		};
		clearImage();
	}

	function clearImage() {
		if (imagePreviewUrl) {
			URL.revokeObjectURL(imagePreviewUrl);
		}

		imageFile = null;
		imagePreviewUrl = null;

		if (fileInput) {
			fileInput.value = '';
		}
	}

	function openCreateDialog() {
		resetForm();
		showDialog = true;
	}

	function openEditDialog(cosmetic: CosmeticRow) {
		form = {
			itemId: cosmetic.itemId,
			type: cosmetic.type,
			name: cosmetic.items?.name ?? '',
			description: cosmetic.items?.description ?? '',
			rarity: cosmetic.items?.rarity ?? 0,
			avatarWidth: cosmetic.avatarWidth ?? 0.8,
			bgColor: cosmetic.bgColor ?? '#1f2937',
			borderColor: cosmetic.borderColor ?? '#8b5cf6'
		};
		clearImage();
		showDialog = true;
	}

	function onImageChange(event: Event) {
		const file = (event.currentTarget as HTMLInputElement).files?.[0] ?? null;

		if (imagePreviewUrl) {
			URL.revokeObjectURL(imagePreviewUrl);
			imagePreviewUrl = null;
		}

		imageFile = file;

		if (file) {
			imagePreviewUrl = URL.createObjectURL(file);
		}
	}

	function onTypeChange(selected: { value: unknown; } | undefined) {
		if (!selected || isEditing) {
			return;
		}

		form.type = selected.value as CosmeticType;
		clearImage();
	}

	function imagePath(itemId: number) {
		return form.type === 'avatarFrame'
			? `cosmetics/frames/${itemId}.webp`
			: `cosmetics/banners/${itemId}.webp`;
	}

	async function uploadImages(itemId: number, token: string) {
		if (!imageFile) {
			return;
		}

		await upload(imagePath(itemId), imageFile, token);
		await upload(`items/${itemId}.webp`, imageFile, token);
	}

	async function save() {
		if (!form.name.trim()) {
			toast.error('Name is required');

			return;
		}

		if (!isEditing && !imageFile) {
			toast.error('An image is required');

			return;
		}

		saving = true;

		const request = (async () => {
			const token = (await $user.token())!;
			const body: Record<string, unknown> = {
				name: form.name,
				description: form.description || null,
				rarity: form.rarity
			};

			if (form.type === 'avatarFrame') {
				body.avatarWidth = Number(form.avatarWidth);
			} else {
				body.bgColor = form.bgColor;
				body.borderColor = form.borderColor;
			}

			let response: Response;

			if (isEditing) {
				if (imageFile) {
					body.bumpImageVersion = true;
				}

				response = await fetch(
					`${import.meta.env.VITE_API_URL}/cosmetics/${form.itemId}`,
					{
						method: 'PUT',
						headers: {
							Authorization: `Bearer ${token}`,
							'Content-Type': 'application/json'
						},
						body: JSON.stringify(body)
					}
				);
			} else {
				body.type = form.type;
				response = await fetch(
					`${import.meta.env.VITE_API_URL}/cosmetics`,
					{
						method: 'POST',
						headers: {
							Authorization: `Bearer ${token}`,
							'Content-Type': 'application/json'
						},
						body: JSON.stringify(body)
					}
				);
			}

			if (!response.ok) {
				const error = await response.json()
					.catch(() => null);
				throw new Error(error?.message ?? 'Failed to save cosmetic');
			}

			const saved = await response.json();
			await uploadImages(saved.itemId ?? form.itemId, token);
		})();

		toast.promise(request, {
			loading: 'Saving cosmetic...',
			success: () => {
				showDialog = false;
				resetForm();
				void fetchCosmetics();

				return 'Cosmetic saved';
			},
			error: (e) => (e instanceof Error ? e.message : 'Failed to save cosmetic')
		});

		try {
			await request;
		} catch {
		// handled by toast
		} finally {
			saving = false;
		}
	}

	async function remove(cosmetic: CosmeticRow) {
		if (!confirm(`Delete "${cosmetic.items?.name}" (#${cosmetic.itemId})?`)) {
			return;
		}

		const request = (async () => {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/cosmetics/${cosmetic.itemId}`,
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
				throw new Error(error?.message ?? 'Failed to delete cosmetic');
			}
		})();

		toast.promise(request, {
			loading: 'Deleting cosmetic...',
			success: () => {
				void fetchCosmetics();

				return 'Cosmetic deleted';
			},
			error: (e) =>
				(e instanceof Error ? e.message : 'Failed to delete cosmetic')
		});
	}

	onMount(fetchCosmetics);
</script>

<svelte:head>
  <title>Cosmetics - Admin</title>
</svelte:head>

<Title value="Cosmetics" />

<div class="px-[10px] pt-[10px] xl:px-[100px]">
  <div class="mb-4 flex items-center justify-between">
    <p class="text-sm text-muted-foreground">
      Avatar frames and profile themes that players can collect and equip.
    </p>
    <Button on:click={openCreateDialog}>
      <Plus class="mr-1 h-4 w-4" />New cosmetic
    </Button>
  </div>

  {#if loading}
    <p class="text-sm text-muted-foreground">Loading...</p>
  {:else if cosmetics.length === 0}
    <p class="text-sm text-muted-foreground">No cosmetics yet.</p>
  {:else}
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>Image</Table.Head>
          <Table.Head>ID</Table.Head>
          <Table.Head>Name</Table.Head>
          <Table.Head>Type</Table.Head>
          <Table.Head>Rarity</Table.Head>
          <Table.Head>Config</Table.Head>
          <Table.Head>Version</Table.Head>
          <Table.Head class="text-right">Actions</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each cosmetics as cosmetic (cosmetic.itemId)}
          <Table.Row>
            <Table.Cell>
              <img
                class="h-12 w-12 rounded object-contain"
                src={cosmetic.type === 'avatarFrame'
                    ? frameImageUrl(cosmetic)
                    : bannerImageUrl(cosmetic)}
                alt=""
              />
            </Table.Cell>
            <Table.Cell>{cosmetic.itemId}</Table.Cell>
            <Table.Cell>{cosmetic.items?.name}</Table.Cell>
            <Table.Cell>{
              cosmetic.type === 'avatarFrame' ? 'Avatar frame' : 'Profile theme'
            }</Table.Cell>
            <Table.Cell>{
              RARITY_OPTIONS[cosmetic.items?.rarity ?? 0]?.label
            }</Table.Cell>
            <Table.Cell>
              {#if cosmetic.type === 'avatarFrame'}
                Avatar width: {cosmetic.avatarWidth}
              {:else}
                <span class="flex items-center gap-2">
                  <span
                    class="inline-block h-4 w-4 rounded border"
                    title={`Background ${cosmetic.bgColor}`}
                    style={`background-color: ${cosmetic.bgColor};`}
                  />
                  <span
                    class="inline-block h-4 w-4 rounded border"
                    title={`Border ${cosmetic.borderColor}`}
                    style={`background-color: ${cosmetic.borderColor};`}
                  />
                </span>
              {/if}
            </Table.Cell>
            <Table.Cell>{cosmetic.imageVersion}</Table.Cell>
            <Table.Cell class="text-right">
              <Button
                variant="ghost"
                size="icon"
                on:click={() => openEditDialog(cosmetic)}
              >
                <Edit class="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                on:click={() => remove(cosmetic)}
              >
                <Trash2 class="h-4 w-4 text-red-500" />
              </Button>
            </Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  {/if}
</div>

<Dialog.Root bind:open={showDialog}>
  <Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
    <Dialog.Header>
      <Dialog.Title>{
        isEditing ? `Edit cosmetic #${form.itemId}` : 'New cosmetic'
      }</Dialog.Title>
    </Dialog.Header>
    <div class="grid gap-4">
      <div class="grid gap-2">
        <Label>Type</Label>
        <Select.Root
          selected={typeSelectItem}
          onSelectedChange={onTypeChange}
          disabled={isEditing}
        >
          <Select.Trigger>
            <Select.Value placeholder="Type" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="avatarFrame">Avatar frame</Select.Item>
            <Select.Item value="profileTheme">Profile theme</Select.Item>
          </Select.Content>
        </Select.Root>
      </div>
      <div class="grid gap-2">
        <Label for="cosmetic-name">Name</Label>
        <Input id="cosmetic-name" bind:value={form.name} />
      </div>
      <div class="grid gap-2">
        <Label for="cosmetic-description">Description</Label>
        <Textarea id="cosmetic-description" bind:value={form.description} />
      </div>
      <div class="grid gap-2">
        <Label>Rarity</Label>
        <Select.Root
          selected={raritySelectItem}
          onSelectedChange={(selected) => {
              if (selected) {
                  form.rarity = Number(selected.value);
              }
          }}
        >
          <Select.Trigger>
            <Select.Value placeholder="Rarity" />
          </Select.Trigger>
          <Select.Content>
            {#each RARITY_OPTIONS as option (option.value)}
              <Select.Item value={option.value}>{option.label}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>

      {#if form.type === 'avatarFrame'}
        <div class="grid gap-2">
          <Label for="cosmetic-avatar-width">
            Avatar size inside frame (0-1)
          </Label>
          <Input
            id="cosmetic-avatar-width"
            type="number"
            min="0.1"
            max="1"
            step="0.01"
            bind:value={form.avatarWidth}
          />
        </div>
        <div class="grid gap-2">
          <Label for="cosmetic-image">Frame image (webp)</Label>
          <input
            id="cosmetic-image"
            type="file"
            accept=".webp"
            bind:this={fileInput}
            on:change={onImageChange}
          />
        </div>
        <div class="flex items-center gap-3">
          <span class="text-sm text-muted-foreground">Preview:</span>
          <AvatarFrame
            frame={previewCosmetic}
            srcOverride={imagePreviewUrl
                ?? (isEditing ? frameImageUrl(previewCosmetic) : null)}
          >
            <Avatar.Root class="h-16 w-16">
              <Avatar.Fallback>GD</Avatar.Fallback>
            </Avatar.Root>
          </AvatarFrame>
        </div>
      {:else}
        <div class="flex items-center gap-4">
          <div class="grid gap-2">
            <Label for="cosmetic-bg-color">Background</Label>
            <Input
              id="cosmetic-bg-color"
              type="color"
              bind:value={form.bgColor}
            />
          </div>
          <div class="grid gap-2">
            <Label for="cosmetic-border-color">Border</Label>
            <Input
              id="cosmetic-border-color"
              type="color"
              bind:value={form.borderColor}
            />
          </div>
        </div>
        <div class="grid gap-2">
          <Label for="cosmetic-image">Banner image (webp)</Label>
          <input
            id="cosmetic-image"
            type="file"
            accept=".webp"
            bind:this={fileInput}
            on:change={onImageChange}
          />
        </div>
        <div
          class="overflow-hidden rounded-md border"
          style={getThemeStyle(previewCosmetic)}
        >
          {#if imagePreviewUrl || isEditing}
            <img
              class="h-[64px] w-full object-cover"
              src={imagePreviewUrl ?? bannerImageUrl(previewCosmetic)}
              alt=""
            />
          {/if}
          <div class="p-3 text-sm">Theme preview</div>
        </div>
      {/if}
    </div>
    <Dialog.Footer>
      <Button variant="outline" on:click={() => (showDialog = false)}>
        Cancel
      </Button>
      <Button disabled={saving} on:click={save}>
        {isEditing ? 'Save changes' : 'Create'}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
