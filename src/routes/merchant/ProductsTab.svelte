<script lang="ts">
	import { user } from '$lib/client';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import Plus from 'lucide-svelte/icons/plus';
	import Pencil from 'lucide-svelte/icons/pencil';
	import Upload from 'lucide-svelte/icons/upload';

	let products: any[] = [];
	let loading = false;

	let showDialog = false;
	let editingProduct: any = null;

	let form = resetForm();

	function resetForm() {
		return {
			name: '',
			price: 0,
			description: '',
			stock: null as number | null,
			maxQuantity: null as number | null,
			bannerTextColor: '#ffffff',
			redirect: '',
			imgCount: 0,
			featured: false,
			hidden: false
		};
	}

	const vndFormat = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

	async function fetchProducts() {
		loading = true;
		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/merchant/products`, {
				headers: { Authorization: 'Bearer ' + (await $user.token()) }
			});
			products = await res.json();
		} catch {
			toast.error('Failed to fetch products');
		}
		loading = false;
	}

	onMount(fetchProducts);

	function openCreateDialog() {
		editingProduct = null;
		form = resetForm();
		showDialog = true;
	}

	function openEditDialog(product: any) {
		editingProduct = product;
		form = {
			name: product.name || '',
			price: product.price || 0,
			description: product.description || '',
			stock: product.stock,
			maxQuantity: product.maxQuantity,
			bannerTextColor: product.bannerTextColor || '#ffffff',
			redirect: product.redirect || '',
			imgCount: product.imgCount || 0,
			featured: product.featured || false,
			hidden: product.hidden || false
		};
		showDialog = true;
	}

	async function saveProduct() {
		const body: any = {
			name: form.name,
			price: form.price,
			description: form.description || null,
			stock: form.stock,
			maxQuantity: form.maxQuantity,
			bannerTextColor: form.bannerTextColor,
			redirect: form.redirect || null,
			imgCount: form.imgCount,
			featured: form.featured,
			hidden: form.hidden
		};

		try {
			const isEdit = !!editingProduct;
			const url = isEdit
				? `${import.meta.env.VITE_API_URL}/merchant/products/${editingProduct.id}`
				: `${import.meta.env.VITE_API_URL}/merchant/products`;

			const res = await fetch(url, {
				method: isEdit ? 'PATCH' : 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Bearer ' + (await $user.token())
				},
				body: JSON.stringify(body)
			});

			if (!res.ok) throw new Error();
			toast.success(isEdit ? 'Product updated' : 'Product created');
			showDialog = false;
			fetchProducts();
		} catch {
			toast.error('Failed to save product');
		}
	}

	async function toggleField(product: any, field: 'hidden' | 'featured') {
		try {
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/merchant/products/${product.id}`,
				{
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
						Authorization: 'Bearer ' + (await $user.token())
					},
					body: JSON.stringify({ [field]: !product[field] })
				}
			);

			if (!res.ok) throw new Error();
			toast.success(`${field} toggled`);
			fetchProducts();
		} catch {
			toast.error(`Failed to toggle ${field}`);
		}
	}

	let uploadingImage = false;

	async function uploadImage(file: File, path: string) {
		const presignRes = await fetch(
			`${import.meta.env.VITE_API_URL}/storage/presign?path=${encodeURIComponent(path)}`,
			{
				headers: { Authorization: 'Bearer ' + (await $user.token()) }
			}
		);

		if (!presignRes.ok) throw new Error('Failed to get upload URL');
		const presignedUrl = await presignRes.text();

		const uploadRes = await fetch(presignedUrl, {
			method: 'PUT',
			body: file,
			headers: { 'Content-Type': 'image/webp' }
		});

		if (!uploadRes.ok) throw new Error('Failed to upload image');
	}

	async function handleImageUpload(e: Event, type: 'image' | 'banner') {
		if (!editingProduct) return;

		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		if (!file.name.endsWith('.webp') && file.type !== 'image/webp') {
			toast.error('Only .webp images are allowed');
			input.value = '';
			return;
		}

		uploadingImage = true;
		try {
			if (type === 'banner') {
				await uploadImage(file, `products/${editingProduct.id}/banner.webp`);
				toast.success('Banner uploaded');
			} else {
				const index = form.imgCount;
				await uploadImage(file, `products/${editingProduct.id}/${index}.webp`);
				form.imgCount = index + 1;

				await fetch(
					`${import.meta.env.VITE_API_URL}/merchant/products/${editingProduct.id}`,
					{
						method: 'PATCH',
						headers: {
							'Content-Type': 'application/json',
							Authorization: 'Bearer ' + (await $user.token())
						},
						body: JSON.stringify({ imgCount: form.imgCount })
					}
				);

				toast.success('Image uploaded');
			}
		} catch {
			toast.error('Failed to upload image');
		}
		uploadingImage = false;
		input.value = '';
	}
</script>

<div class="toolbar">
	<Button on:click={openCreateDialog}>
		<Plus class="mr-2 h-4 w-4" />
		New Product
	</Button>
</div>

<Table.Root>
	<Table.Caption>Total: {products.length} products</Table.Caption>
	<Table.Header>
		<Table.Row>
			<Table.Head class="w-[60px]">ID</Table.Head>
			<Table.Head>Name</Table.Head>
			<Table.Head class="text-right">Price</Table.Head>
			<Table.Head class="w-[80px]">Stock</Table.Head>
			<Table.Head class="w-[80px]">Featured</Table.Head>
			<Table.Head class="w-[80px]">Hidden</Table.Head>
			<Table.Head class="w-[60px]">Imgs</Table.Head>
			<Table.Head class="w-[120px]">Actions</Table.Head>
		</Table.Row>
	</Table.Header>
	<Table.Body>
		{#each products as product}
			<Table.Row>
				<Table.Cell class="font-medium">{product.id}</Table.Cell>
				<Table.Cell>{product.name}</Table.Cell>
				<Table.Cell class="text-right">{vndFormat.format(product.price)}</Table.Cell>
				<Table.Cell>{product.stock !== null ? product.stock : '∞'}</Table.Cell>
				<Table.Cell>
					<button class="toggle-btn" on:click={() => toggleField(product, 'featured')}>
						{product.featured ? '★' : '☆'}
					</button>
				</Table.Cell>
				<Table.Cell>
					<button class="toggle-btn" on:click={() => toggleField(product, 'hidden')}>
						{product.hidden ? '🔒' : '👁'}
					</button>
				</Table.Cell>
				<Table.Cell>{product.imgCount || 0}</Table.Cell>
				<Table.Cell>
					<Button size="sm" variant="outline" on:click={() => openEditDialog(product)}>
						<Pencil class="h-4 w-4" />
					</Button>
				</Table.Cell>
			</Table.Row>
		{/each}
	</Table.Body>
</Table.Root>

{#if loading}
	<p class="text-center text-muted-foreground mt-4">Loading...</p>
{/if}

<!-- Product Dialog -->
<Dialog.Root bind:open={showDialog}>
	<Dialog.Content class="max-w-lg max-h-[90vh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>{editingProduct ? 'Edit Product' : 'Create Product'}</Dialog.Title>
		</Dialog.Header>
		<div class="dialog-body">
			<div class="field">
				<Label>Name</Label>
				<Input bind:value={form.name} placeholder="Product name" />
			</div>
			<div class="field">
				<Label>Price (VND)</Label>
				<Input type="number" inputmode="numeric" bind:value={form.price} />
			</div>
			<div class="field">
				<Label>Description</Label>
				<Textarea bind:value={form.description} placeholder="Product description..." />
			</div>
			<div class="row">
				<div class="field flex-1">
					<Label>Stock (empty = unlimited)</Label>
					<Input type="number" inputmode="numeric" bind:value={form.stock} placeholder="∞" />
				</div>
				<div class="field flex-1">
					<Label>Max Quantity</Label>
					<Input type="number" inputmode="numeric" bind:value={form.maxQuantity} />
				</div>
			</div>
			<div class="row">
				<div class="field flex-1">
					<Label>Banner Text Color</Label>
					<Input type="color" bind:value={form.bannerTextColor} />
				</div>
				<div class="field flex-1">
					<Label>Redirect URL</Label>
					<Input bind:value={form.redirect} placeholder="https://..." />
				</div>
			</div>
			<div class="row">
				<div class="field">
					<Label>Featured</Label>
					<Switch bind:checked={form.featured} />
				</div>
				<div class="field">
					<Label>Hidden</Label>
					<Switch bind:checked={form.hidden} />
				</div>
			</div>

			{#if editingProduct}
				<div class="images-section">
					<Label>Product Images ({form.imgCount})</Label>
					<div class="image-grid">
						{#each Array(form.imgCount || 0) as _, i}
							<img
								src={`https://cdn.gdvn.net/products/${editingProduct.id}/${i}.webp?v=${Date.now()}`}
								alt="Product {i}"
								class="thumb"
							/>
						{/each}
					</div>

					<div class="upload-row">
						<label class="upload-btn">
							<Upload class="h-4 w-4" />
							Upload Image (.webp)
							<input
								type="file"
								accept="image/webp,.webp"
								on:change={(e) => handleImageUpload(e, 'image')}
								hidden
								disabled={uploadingImage}
							/>
						</label>
						<label class="upload-btn">
							<Upload class="h-4 w-4" />
							Upload Banner (.webp)
							<input
								type="file"
								accept="image/webp,.webp"
								on:change={(e) => handleImageUpload(e, 'banner')}
								hidden
								disabled={uploadingImage}
							/>
						</label>
					</div>
					{#if uploadingImage}
						<p class="text-sm text-muted-foreground">Uploading...</p>
					{/if}
				</div>
			{/if}
		</div>
		<Dialog.Footer>
			<Button variant="outline" on:click={() => (showDialog = false)}>Cancel</Button>
			<Button on:click={saveProduct} disabled={!form.name || !form.price}>Save</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<style lang="scss">
	.toolbar {
		margin-bottom: 1.5rem;
	}

	.toggle-btn {
		cursor: pointer;
		background: none;
		border: none;
		font-size: 1.1rem;
		padding: 0.25rem;
	}

	.dialog-body {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem 0;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.row {
		display: flex;
		gap: 1rem;
	}

	.images-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		padding-top: 1rem;
	}

	.image-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.thumb {
		width: 80px;
		height: 80px;
		object-fit: cover;
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.upload-row {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.upload-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.875rem;
		transition: background 0.2s;

		&:hover {
			background: rgba(255, 255, 255, 0.05);
		}
	}
</style>
