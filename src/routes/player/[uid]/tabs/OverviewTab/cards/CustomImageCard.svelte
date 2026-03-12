<script lang="ts">
	import * as sdk from '$lib/client/sdk';
	import BaseCard from './BaseCard.svelte';
	import type { CardConfig } from './types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { _ } from 'svelte-i18n';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';

	export let data: any;
	export let cardConfigs: CardConfig[];
	export let config: CardConfig;
	export let draggedCard: string | null;
	export let isCustomizing: boolean = false;

	$: isOwner = $user.loggedIn && $user.data?.uid === data.player.uid;
	$: customImageUrl = data.player.overviewData?.[config.id]?.imageUrl || '';

	let isEditing = false;
	let imageUrlInput = '';
	let saving = false;

	function startEditing() {
		imageUrlInput = customImageUrl;
		isEditing = true;
	}

	function cancelEditing() {
		imageUrlInput = '';
		isEditing = false;
	}

	async function handleSaveImageUrl() {
		if (!imageUrlInput.trim()) {
			toast.error($_('player.overview.empty_url') || 'Please enter an image URL');
			return;
		}

		try {
			new URL(imageUrlInput);
		} catch {
			toast.error($_('player.overview.invalid_url') || 'Please enter a valid URL');
			return;
		}

		saving = true;

		try {
			const currentOverviewData = data.player.overviewData || {};
			const updatedOverviewData = {
				...currentOverviewData,
				[config.id]: {
					...(currentOverviewData[config.id] || {}),
					imageUrl: imageUrlInput.trim()
				}
			};

			const response = await sdk.fetch(`/players`, {
				method: 'PUT',
				headers: {
					Authorization: 'Bearer ' + (await $user.token()),
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					uid: data.player.uid,
					overviewData: updatedOverviewData
				})
			});

			if (!response.ok) {
				throw new Error('Save failed');
			}

			if (!data.player.overviewData) {
				data.player.overviewData = {};
			}
			if (!data.player.overviewData[config.id]) {
				data.player.overviewData[config.id] = {};
			}
			data.player.overviewData[config.id].imageUrl = imageUrlInput.trim();
			
			toast.success($_('player.overview.image_saved') || 'Image URL saved successfully!');
			isEditing = false;
		} catch (error) {
			console.error('Save error:', error);
			toast.error($_('player.overview.save_failed') || 'Failed to save image URL');
		} finally {
			saving = false;
		}
	}

	async function handleRemoveImage() {
		saving = true;

		try {
			// Get current overviewData
			const currentOverviewData = data.player.overviewData || {};
			
			// Update the custom image card data to remove the imageUrl
			const updatedOverviewData = {
				...currentOverviewData,
				[config.id]: {
					...(currentOverviewData[config.id] || {}),
					imageUrl: ''
				}
			};

			const response = await sdk.fetch(`/players`, {
				method: 'PUT',
				headers: {
					Authorization: 'Bearer ' + (await $user.token()),
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					uid: data.player.uid,
					overviewData: updatedOverviewData
				})
			});

			if (!response.ok) {
				throw new Error('Delete failed');
			}

			// Update local data
			if (data.player.overviewData?.[config.id]) {
				data.player.overviewData[config.id].imageUrl = '';
			}
			
			toast.success($_('player.overview.image_removed') || 'Image removed successfully!');
		} catch (error) {
			console.error('Delete error:', error);
			toast.error($_('player.overview.remove_failed') || 'Failed to remove image');
		} finally {
			saving = false;
		}
	}
</script>

<BaseCard bind:draggedCard bind:cardConfigs bind:config bind:isCustomizing>
	<div class="custom-image-card">
		{#if customImageUrl}
			<div class="image-container">
				<img src={customImageUrl} alt="Custom player banner" />
				{#if isOwner && !saving}
					<div class="image-overlay">
						<div class="overlay-buttons">
							<Button variant="outline" size="sm" on:click={startEditing}>
								{$_('player.overview.change_image') || 'Change Image'}
							</Button>
							<Button variant="destructive" size="sm" on:click={handleRemoveImage}>
								{$_('player.overview.remove_image') || 'Remove Image'}
							</Button>
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<div class="empty-state">
				{#if isOwner}
					<div class="empty-content">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="48"
							height="48"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
							<circle cx="9" cy="9" r="2" />
							<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
						</svg>
						<p>{$_('player.overview.no_custom_image') || 'No custom image'}</p>
						<Button variant="outline" size="sm" on:click={startEditing} disabled={saving}>
							{$_('player.overview.add_image_url') || 'Add Image URL'}
						</Button>
					</div>
				{:else}
					<div class="empty-content">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="48"
							height="48"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
							<circle cx="9" cy="9" r="2" />
							<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
						</svg>
						<p>{$_('player.overview.no_custom_image') || 'No custom image'}</p>
					</div>
				{/if}
			</div>
		{/if}

		{#if isEditing && isOwner}
			<div class="edit-overlay">
				<div class="edit-panel">
					<h3>{$_('player.overview.set_image_url') || 'Set Image URL'}</h3>
					<Input
						type="url"
						placeholder="https://example.com/image.jpg"
						bind:value={imageUrlInput}
						disabled={saving}
					/>
					<div class="edit-actions">
						<Button variant="outline" size="sm" on:click={cancelEditing} disabled={saving}>
							{$_('general.cancel') || 'Cancel'}
						</Button>
						<Button variant="default" size="sm" on:click={handleSaveImageUrl} disabled={saving}>
							{saving ? $_('general.saving') || 'Saving...' : $_('general.save') || 'Save'}
						</Button>
					</div>
				</div>
			</div>
		{/if}
	</div>
</BaseCard>

<style lang="scss">
	.custom-image-card {
		width: 100%;
		height: 300px;
		display: flex;
		flex-direction: column;
		background-color: rgba(128, 128, 128, 0.1);
		border-radius: 8px;
		overflow: hidden;
		position: relative;
	}

	.image-container {
		position: relative;
		width: 100%;
		height: 300px;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;

		img {
			width: 100%;
			height: 300px;
			object-fit: cover;
			display: block;
		}

		.image-overlay {
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background-color: rgba(0, 0, 0, 0.6);
			display: flex;
			align-items: center;
			justify-content: center;
			opacity: 0;
			transition: opacity 0.2s ease;
		}

		&:hover .image-overlay {
			opacity: 1;
		}

		.overlay-buttons {
			display: flex;
			gap: 10px;
			flex-wrap: wrap;
			justify-content: center;
		}
	}

	.empty-state {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
	}

	.empty-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 15px;
		text-align: center;
		color: rgba(255, 255, 255, 0.6);

		svg {
			opacity: 0.3;
		}

		p {
			font-size: 0.95rem;
			margin: 0;
		}
	}

	.edit-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
		z-index: 10;
	}

	.edit-panel {
		background-color: rgba(30, 30, 30, 0.95);
		border-radius: 8px;
		padding: 24px;
		width: 100%;
		max-width: 300px;
		display: flex;
		flex-direction: column;
		gap: 16px;

		h3 {
			font-size: 1.1rem;
			font-weight: 600;
			margin: 0;
			text-align: center;
		}
	}

	.edit-actions {
		display: flex;
		gap: 10px;
		justify-content: flex-end;
	}

	@media screen and (max-width: 768px) {
		.custom-image-card {
			height: 300px;
		}

		.edit-panel {
			padding: 20px;
		}

		.overlay-buttons {
			flex-direction: column;
		}
	}
</style>
