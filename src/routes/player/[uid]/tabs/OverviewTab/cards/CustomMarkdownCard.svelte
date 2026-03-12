<script lang="ts">
	import * as sdk from '$lib/client/sdk';
	import BaseCard from './BaseCard.svelte';
	import type { CardConfig } from './types';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import Markdown from '$lib/components/markdown.svelte';
	import { _ } from 'svelte-i18n';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';

	export let data: any;
	export let cardConfigs: CardConfig[];
	export let config: CardConfig;
	export let draggedCard: string | null;
	export let isCustomizing: boolean = false;

	$: isOwner = $user.loggedIn && $user.data?.uid === data.player.uid;
	$: markdownContent = data.player.overviewData?.[config.id]?.markdownContent || '';

	let isEditing = false;
	let markdownInput = '';
	let saving = false;

	function startEditing() {
		markdownInput = markdownContent;
		isEditing = true;
	}

	function cancelEditing() {
		markdownInput = '';
		isEditing = false;
	}

	async function handleSaveMarkdown() {
		if (!markdownInput.trim()) {
			toast.error($_('player.overview.empty_markdown') || 'Please enter some markdown content');
			return;
		}

		saving = true;

		try {
			const currentOverviewData = data.player.overviewData || {};
			const updatedOverviewData = {
				...currentOverviewData,
				[config.id]: {
					...(currentOverviewData[config.id] || {}),
					markdownContent: markdownInput.trim()
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
			data.player.overviewData[config.id].markdownContent = markdownInput.trim();
			
			toast.success($_('player.overview.markdown_saved') || 'Markdown saved successfully!');
			isEditing = false;
		} catch (error) {
			console.error('Save error:', error);
			toast.error($_('player.overview.save_failed') || 'Failed to save markdown');
		} finally {
			saving = false;
		}
	}

	async function handleRemoveMarkdown() {
		saving = true;

		try {
			const currentOverviewData = data.player.overviewData || {};
			
			const updatedOverviewData = {
				...currentOverviewData,
				[config.id]: {
					...(currentOverviewData[config.id] || {}),
					markdownContent: ''
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

			if (data.player.overviewData?.[config.id]) {
				data.player.overviewData[config.id].markdownContent = '';
			}
			
			toast.success($_('player.overview.markdown_removed') || 'Markdown removed successfully!');
		} catch (error) {
			console.error('Delete error:', error);
			toast.error($_('player.overview.remove_failed') || 'Failed to remove markdown');
		} finally {
			saving = false;
		}
	}
</script>

<BaseCard bind:draggedCard bind:cardConfigs bind:config bind:isCustomizing>
	<div class="custom-markdown-card">
		{#if markdownContent}
			<div class="markdown-container">
				<div class="markdown-content">
					<Markdown content={markdownContent} />
				</div>
				{#if isOwner && !saving}
					<div class="markdown-overlay">
						<div class="overlay-buttons">
							<Button variant="outline" size="sm" on:click={startEditing}>
								{$_('player.overview.edit_markdown') || 'Edit Markdown'}
							</Button>
							<Button variant="destructive" size="sm" on:click={handleRemoveMarkdown}>
								{$_('player.overview.remove_markdown') || 'Remove Markdown'}
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
							<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
							<polyline points="14 2 14 8 20 8" />
							<line x1="16" y1="13" x2="8" y2="13" />
							<line x1="16" y1="17" x2="8" y2="17" />
							<line x1="10" y1="9" x2="8" y2="9" />
						</svg>
						<p>{$_('player.overview.no_custom_markdown') || 'No custom markdown'}</p>
						<Button variant="outline" size="sm" on:click={startEditing} disabled={saving}>
							{$_('player.overview.add_markdown') || 'Add Markdown'}
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
							<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
							<polyline points="14 2 14 8 20 8" />
							<line x1="16" y1="13" x2="8" y2="13" />
							<line x1="16" y1="17" x2="8" y2="17" />
							<line x1="10" y1="9" x2="8" y2="9" />
						</svg>
						<p>{$_('player.overview.no_custom_markdown') || 'No custom markdown'}</p>
					</div>
				{/if}
			</div>
		{/if}

		{#if isEditing && isOwner}
			<div class="edit-overlay">
				<div class="edit-panel">
					<h3>{$_('player.overview.edit_markdown') || 'Edit Markdown'}</h3>
					<Textarea
						placeholder="Enter markdown content here..."
						bind:value={markdownInput}
						disabled={saving}
						rows={10}
						class="markdown-textarea"
					/>
					<div class="edit-actions">
						<Button variant="outline" size="sm" on:click={cancelEditing} disabled={saving}>
							{$_('general.cancel') || 'Cancel'}
						</Button>
						<Button variant="default" size="sm" on:click={handleSaveMarkdown} disabled={saving}>
							{saving ? $_('general.saving') || 'Saving...' : $_('general.save') || 'Save'}
						</Button>
					</div>
				</div>
			</div>
		{/if}
	</div>
</BaseCard>

<style lang="scss">
	.custom-markdown-card {
		width: 100%;
		min-height: 300px;
		display: flex;
		flex-direction: column;
		background-color: rgba(128, 128, 128, 0.1);
		border-radius: 8px;
		overflow: hidden;
		position: relative;
	}

	.markdown-container {
		position: relative;
		width: 100%;
		min-height: 300px;
		display: flex;
		flex-direction: column;
		overflow: hidden;

		.markdown-content {
			padding: 20px;
			overflow-y: auto;
			flex: 1;
		}

		.markdown-overlay {
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

		&:hover .markdown-overlay {
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
		min-height: 300px;
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
		background-color: rgba(0, 0, 0, 0.9);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
		z-index: 10;
		overflow-y: auto;
	}

	.edit-panel {
		background-color: rgba(30, 30, 30, 0.95);
		border-radius: 8px;
		padding: 24px;
		width: 100%;
		max-width: 600px;
		display: flex;
		flex-direction: column;
		gap: 16px;

		h3 {
			font-size: 1.1rem;
			font-weight: 600;
			margin: 0;
			text-align: center;
		}

		:global(.markdown-textarea) {
			min-height: 200px;
			font-family: 'Courier New', monospace;
			font-size: 0.9rem;
		}
	}

	.edit-actions {
		display: flex;
		gap: 10px;
		justify-content: flex-end;
	}

	@media screen and (max-width: 768px) {
		.custom-markdown-card {
			min-height: 250px;
		}

		.edit-panel {
			padding: 20px;
			max-width: 100%;
		}

		.overlay-buttons {
			flex-direction: column;
		}
	}
</style>
