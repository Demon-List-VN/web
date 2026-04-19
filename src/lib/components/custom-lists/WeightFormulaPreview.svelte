<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { _ } from 'svelte-i18n';

	export let formula = '1';
	export let isPlatformer = false;

	type FormulaVariable = {
		token: string;
		label: string;
	};

	let previewInput = {
		position: '1',
		levelCount: '25',
		rating: '10',
		minProgress: getDefaultMinProgress(isPlatformer)
	};
	let previewOutput: number | null = null;
	let previewError = '';
	let previewLoading = false;
	let previewSignature = '';
	let previewRequestId = 0;
	let previousPlatformer = isPlatformer;
	let formulaVariables: FormulaVariable[] = [];

	function getDefaultMinProgress(platformer: boolean) {
		return platformer ? '60000' : '100';
	}

	function formatOutput(value: number) {
		return Number.isInteger(value) ? String(value) : String(Math.round(value * 1000) / 1000);
	}

	async function runPreview() {
		const requestId = ++previewRequestId;
		previewLoading = true;
		previewError = '';

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/formula/preview`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					formula,
					position: previewInput.position,
					levelCount: previewInput.levelCount,
					rating: previewInput.rating,
					minProgress: previewInput.minProgress
				})
			});

			const payload = await res.json().catch(() => null);

			if (requestId !== previewRequestId) {
				return;
			}

			if (!res.ok) {
				throw new Error(payload?.error || $_('custom_lists.formula.preview_error'));
			}

			previewOutput = typeof payload?.output === 'number' ? payload.output : null;
			previewError = '';
		} catch (error) {
			if (requestId !== previewRequestId) {
				return;
			}

			previewOutput = null;
			previewError = error instanceof Error ? error.message : $_('custom_lists.formula.preview_error');
		} finally {
			if (requestId === previewRequestId) {
				previewLoading = false;
			}
		}
	}

	$: if (isPlatformer !== previousPlatformer) {
		previousPlatformer = isPlatformer;
		previewInput = {
			...previewInput,
			minProgress: getDefaultMinProgress(isPlatformer)
		};
	}

	$: formulaVariables = [
		{ token: 'position', label: $_('custom_lists.formula.position_label') },
		{ token: 'levelCount', label: $_('custom_lists.formula.level_count_label') },
		{ token: 'rating', label: $_('custom_lists.formula.rating_label') },
		{
			token: 'minProgress',
			label: isPlatformer
				? $_('custom_lists.formula.base_time_label')
				: $_('custom_lists.formula.min_progress_label')
		}
	];

	$: {
		const nextSignature = [
			formula,
			previewInput.position,
			previewInput.levelCount,
			previewInput.rating,
			previewInput.minProgress,
			isPlatformer ? 'platformer' : 'classic'
		].join('|');

		if (nextSignature !== previewSignature) {
			previewSignature = nextSignature;
			previewRequestId += 1;
			previewLoading = false;
			previewOutput = null;
			previewError = '';
		}
	}
</script>

<div class="formulaPreviewCard">
	<div class="formulaPreviewHeader">
		<div>
			<h3>{$_('custom_lists.formula.preview_title')}</h3>
			<p>{$_('custom_lists.formula.preview_hint')}</p>
		</div>
		<Button type="button" variant="outline" size="sm" on:click={runPreview} disabled={previewLoading}>
			{previewLoading ? `${$_('general.loading')}...` : $_('custom_lists.formula.preview_button')}
		</Button>
	</div>

	<div class="formulaPreviewVariables">
		<span class="formulaPreviewVariablesLabel">{$_('custom_lists.formula.available_variables_label')}</span>
		<div class="formulaPreviewVariableList">
			{#each formulaVariables as variable}
				<div class="formulaPreviewVariable">
					<code class="formulaPreviewVariableToken">{variable.token}</code>
					<span class="formulaPreviewVariableName">{variable.label}</span>
				</div>
			{/each}
		</div>
	</div>

	<div class="formulaPreviewGrid">
		<div class="field">
			<label for="formula-preview-position">{$_('custom_lists.formula.position_label')}</label>
			<Input id="formula-preview-position" type="number" min="1" bind:value={previewInput.position} />
		</div>
		<div class="field">
			<label for="formula-preview-level-count">{$_('custom_lists.formula.level_count_label')}</label>
			<Input id="formula-preview-level-count" type="number" min="1" bind:value={previewInput.levelCount} />
		</div>
		<div class="field">
			<label for="formula-preview-rating">{$_('custom_lists.formula.rating_label')}</label>
			<Input id="formula-preview-rating" type="number" min="0" bind:value={previewInput.rating} />
		</div>
		<div class="field">
			<label for="formula-preview-min-progress">
				{isPlatformer
					? $_('custom_lists.formula.base_time_label')
					: $_('custom_lists.formula.min_progress_label')}
			</label>
			<Input id="formula-preview-min-progress" type="number" min="0" bind:value={previewInput.minProgress} />
		</div>
	</div>

	<div class="formulaPreviewResult" class:formulaPreviewResultError={Boolean(previewError)}>
		<span class="formulaPreviewResultLabel">{$_('custom_lists.formula.output_label')}</span>
		{#if previewError}
			<span class="formulaPreviewResultValue">{previewError}</span>
		{:else if previewOutput != null}
			<span class="formulaPreviewResultValue">{formatOutput(previewOutput)}</span>
		{:else}
			<span class="formulaPreviewResultValue formulaPreviewResultPlaceholder">
				{$_('custom_lists.formula.preview_pending')}
			</span>
		{/if}
	</div>
</div>

<style lang="scss">
	.formulaPreviewCard {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 14px;
		border: 1px solid hsl(var(--border));
		border-radius: 10px;
		background: hsl(var(--muted) / 0.18);
	}

	.formulaPreviewHeader {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 12px;
		flex-wrap: wrap;
	}

	.formulaPreviewHeader h3 {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 600;
	}

	.formulaPreviewHeader p {
		margin: 4px 0 0;
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
	}

	.formulaPreviewGrid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 12px;
	}

	.formulaPreviewVariables {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 12px 14px;
		border-radius: 8px;
		border: 1px dashed hsl(var(--border));
		background: hsl(var(--background));
	}

	.formulaPreviewVariablesLabel {
		font-size: 0.8rem;
		font-weight: 600;
	}

	.formulaPreviewVariableList {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
		gap: 10px;
	}

	.formulaPreviewVariable {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.formulaPreviewVariableToken {
		padding: 4px 8px;
		border-radius: 999px;
		border: 1px solid hsl(var(--border));
		background: hsl(var(--muted));
		font-size: 0.78rem;
		font-weight: 600;
	}

	.formulaPreviewVariableName {
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.field label {
		font-size: 0.85rem;
		font-weight: 500;
	}

	.formulaPreviewResult {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		padding: 12px 14px;
		border-radius: 8px;
		background: hsl(var(--background));
		border: 1px solid hsl(var(--border));
	}

	.formulaPreviewResultError {
		border-color: hsl(var(--destructive) / 0.45);
	}

	.formulaPreviewResultLabel {
		font-size: 0.85rem;
		font-weight: 600;
	}

	.formulaPreviewResultValue {
		font-size: 0.9rem;
		font-weight: 600;
		text-align: right;
	}

	.formulaPreviewResultPlaceholder {
		color: hsl(var(--muted-foreground));
		font-weight: 500;
	}
</style>