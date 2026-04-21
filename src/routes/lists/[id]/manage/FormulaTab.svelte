<script lang="ts">
	import WeightFormulaPreview from '$lib/components/custom-lists/WeightFormulaPreview.svelte';
	import { Textarea } from '$lib/components/ui/textarea';
	import { _ } from 'svelte-i18n';

	export let editForm: any;
</script>

<div class="tabContent">
	<div class="toolCard">
		<h2 class="toolHeading">{$_('custom_lists.formula.label')}</h2>
		<div class="formGrid">
			<div class="field">
				<label for="list-weight-formula">{$_('custom_lists.formula.label')}</label>
				<Textarea
					id="list-weight-formula"
					bind:value={editForm.weightFormula}
					placeholder={$_('custom_lists.formula.placeholder')}
					rows={5}
				/>
				<p class="hint">{$_('custom_lists.formula.hint')}</p>
				<WeightFormulaPreview
					formula={editForm.weightFormula}
					isPlatformer={editForm.isPlatformer}
					mode={editForm.mode}
				/>
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

	label {
		font-size: 0.9rem;
		font-weight: 500;
	}

	.hint {
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
		margin: 0;
	}

	@media (max-width: 760px) {
		.toolCard {
			padding: 16px;
		}
	}
</style>