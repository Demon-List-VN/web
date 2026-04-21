<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { createEmptyCustomListRankBadge } from '$lib/utils/customListRank';
	import { GripVertical, Plus, Trash2 } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';

	export let editForm: any;

	let draggedRankBadgeIndex: number | null = null;
	let dragOverRankBadgeIndex: number | null = null;

	function addRankBadge() {
		editForm = {
			...editForm,
			rankBadges: [...editForm.rankBadges, createEmptyCustomListRankBadge()]
		};
	}

	function getRankBadgePreviewLabel(rankBadge: any) {
		return rankBadge.shorthand.trim() || rankBadge.name.trim() || '?';
	}

	function updateRankBadge(index: number, patch: Record<string, any>) {
		editForm = {
			...editForm,
			rankBadges: editForm.rankBadges.map((rankBadge: any, currentIndex: number) =>
				currentIndex === index ? { ...rankBadge, ...patch } : rankBadge
			)
		};
	}

	function getInputValue(event: Event) {
		const target = event.target;
		return target instanceof HTMLInputElement ? target.value : '';
	}

	function updateTextRankBadge(index: number, field: 'name' | 'shorthand' | 'color', event: Event) {
		updateRankBadge(index, { [field]: getInputValue(event) });
	}

	function updateNumberRankBadge(index: number, field: 'minRating' | 'minTop', event: Event) {
		const rawValue = getInputValue(event).trim();
		let nextValue: number | null = null;

		if (rawValue.length) {
			nextValue = field === 'minRating'
				? Number.parseFloat(rawValue)
				: Number.parseInt(rawValue, 10);

			if (Number.isNaN(nextValue)) {
				nextValue = null;
			}
		}

		updateRankBadge(index, { [field]: nextValue });
	}

	function removeRankBadge(index: number) {
		editForm = {
			...editForm,
			rankBadges: editForm.rankBadges.filter((_: any, currentIndex: number) => currentIndex !== index)
		};
	}

	function onRankBadgeDragStart(event: DragEvent, index: number) {
		draggedRankBadgeIndex = index;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
		}
	}

	function onRankBadgeDragOver(event: DragEvent, index: number) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
		dragOverRankBadgeIndex = index;
	}

	function onRankBadgeDragEnd() {
		draggedRankBadgeIndex = null;
		dragOverRankBadgeIndex = null;
	}

	function onRankBadgeDrop(event: DragEvent, targetIndex: number) {
		event.preventDefault();

		if (draggedRankBadgeIndex === null || draggedRankBadgeIndex === targetIndex) {
			onRankBadgeDragEnd();
			return;
		}

		const nextRankBadges = [...editForm.rankBadges];
		const [movedRankBadge] = nextRankBadges.splice(draggedRankBadgeIndex, 1);
		nextRankBadges.splice(targetIndex, 0, movedRankBadge);
		editForm = {
			...editForm,
			rankBadges: nextRankBadges
		};
		onRankBadgeDragEnd();
	}
</script>

<div class="tabContent">
	<div class="toolCard">
		<h2 class="toolHeading">{$_('custom_lists.detail.edit.rank_badges_label')}</h2>
		<div class="formGrid">
			<div class="field">
				<div class="rankBadgeHeader">
					<div>
						<span class="fieldLabel">{$_('custom_lists.detail.edit.rank_badges_label')}</span>
						<p class="hint">{$_('custom_lists.detail.edit.rank_badges_hint')}</p>
					</div>
					<Button type="button" variant="outline" size="sm" on:click={addRankBadge}>
						<Plus class="mr-2 h-4 w-4" />
						{$_('custom_lists.detail.edit.rank_badges_add')}
					</Button>
				</div>
				{#if editForm.rankBadges.length === 0}
					<p class="hint">{$_('custom_lists.detail.edit.rank_badges_empty')}</p>
				{:else}
					<div class="rankBadgeList" role="list">
						{#each editForm.rankBadges as rankBadge, index}
							<div
								class="rankBadgeEditor"
								class:dragOver={dragOverRankBadgeIndex === index}
								class:dragging={draggedRankBadgeIndex === index}
								role="listitem"
								draggable="true"
								on:dragstart={(event) => onRankBadgeDragStart(event, index)}
								on:dragover={(event) => onRankBadgeDragOver(event, index)}
								on:drop={(event) => onRankBadgeDrop(event, index)}
								on:dragend={onRankBadgeDragEnd}
							>
								<div class="rankBadgeEditorHandle" title={$_('custom_lists.detail.edit.rank_badges_priority_hint')}>
									<GripVertical class="h-5 w-5" />
								</div>
								<div class="rankBadgePreview" style={`background: ${rankBadge.color || '#64748b'}`}>
									{getRankBadgePreviewLabel(rankBadge)}
								</div>
								<div class="rankBadgeEditorFields">
									<div class="field compactField">
										<label for={`rank-badge-name-${index}`}>{$_('custom_lists.detail.edit.rank_badges_name_label')}</label>
										<Input
											id={`rank-badge-name-${index}`}
											value={rankBadge.name}
											maxlength={30}
											placeholder={$_('custom_lists.detail.edit.rank_badges_name_placeholder')}
											on:input={(event) => updateTextRankBadge(index, 'name', event)}
										/>
									</div>
									<div class="field compactField">
										<label for={`rank-badge-shorthand-${index}`}>{$_('custom_lists.detail.edit.rank_badges_shorthand_label')}</label>
										<Input
											id={`rank-badge-shorthand-${index}`}
											value={rankBadge.shorthand}
											maxlength={20}
											placeholder={$_('custom_lists.detail.edit.rank_badges_shorthand_placeholder')}
											on:input={(event) => updateTextRankBadge(index, 'shorthand', event)}
										/>
									</div>
									<div class="field compactField">
										<label for={`rank-badge-color-${index}`}>{$_('custom_lists.detail.edit.rank_badges_color_label')}</label>
										<Input
											id={`rank-badge-color-${index}`}
											value={rankBadge.color}
											placeholder={$_('custom_lists.detail.edit.rank_badges_color_placeholder')}
											on:input={(event) => updateTextRankBadge(index, 'color', event)}
										/>
									</div>
									<div class="field compactField">
										<label for={`rank-badge-min-rating-${index}`}>{$_('custom_lists.detail.edit.rank_badges_min_rating_label')}</label>
										<Input
											id={`rank-badge-min-rating-${index}`}
											type="number"
											value={rankBadge.minRating ?? ''}
											min="0"
											step="0.001"
											placeholder={$_('custom_lists.detail.edit.rank_badges_min_rating_placeholder')}
											on:input={(event) => updateNumberRankBadge(index, 'minRating', event)}
										/>
									</div>
									<div class="field compactField">
										<label for={`rank-badge-min-top-${index}`}>{$_('custom_lists.detail.edit.rank_badges_min_top_label')}</label>
										<Input
											id={`rank-badge-min-top-${index}`}
											type="number"
											value={rankBadge.minTop ?? ''}
											min="1"
											step="1"
											placeholder={$_('custom_lists.detail.edit.rank_badges_min_top_placeholder')}
											on:input={(event) => updateNumberRankBadge(index, 'minTop', event)}
										/>
									</div>
								</div>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									on:click={() => removeRankBadge(index)}
									title={$_('custom_lists.detail.edit.rank_badges_remove')}
									aria-label={$_('custom_lists.detail.edit.rank_badges_remove')}
								>
									<Trash2 class="h-4 w-4" />
								</Button>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style lang="scss">
	.tabContent {
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin-top: 16px;
	}

	.toolCard {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		padding: 22px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.toolHeading {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
	}

	.formGrid {
		display: grid;
		gap: 14px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	label,
	.fieldLabel {
		font-size: 0.9rem;
		font-weight: 500;
	}

	.hint {
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
		margin: 0;
	}

	.rankBadgeHeader {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}

	.rankBadgeList {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.rankBadgeEditor {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 14px;
		border: 1px solid hsl(var(--border));
		border-radius: 10px;
		background: hsl(var(--muted) / 0.12);
		transition: border-color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
	}

	.rankBadgeEditor.dragOver {
		border-color: hsl(var(--primary));
		box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2);
	}

	.rankBadgeEditor.dragging {
		opacity: 0.45;
	}

	.rankBadgeEditorHandle {
		display: flex;
		align-items: center;
		justify-content: center;
		color: hsl(var(--muted-foreground));
		padding-top: 7px;
		cursor: grab;
	}

	.rankBadgePreview {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 68px;
		padding: 7px 12px;
		border-radius: 999px;
		color: white;
		font-size: 0.8rem;
		font-weight: 700;
		white-space: nowrap;
		margin-top: 4px;
	}

	.rankBadgeEditorFields {
		flex: 1;
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 12px;
	}

	.compactField {
		min-width: 0;
	}

	@media (max-width: 760px) {
		.rankBadgeEditor {
			flex-direction: column;
		}

		.rankBadgeEditorFields {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			width: 100%;
		}
	}

	@media (max-width: 480px) {
		.toolCard {
			padding: 16px;
		}

		.rankBadgeEditorFields {
			grid-template-columns: 1fr;
		}
	}
</style>