<script lang="ts">
	import { Label } from '$lib/components/ui/label/index.js';
	import Loading from '$lib/components/animation/loading.svelte';
	import { locale } from 'svelte-i18n';
	import { Link } from 'lucide-svelte';

	export let apiLevel: any;
	export let levelVariants: any[];
	export let selectedVariantId: number | null;
</script>

<div class="step-content">
	{#if !apiLevel}
		<div class="loading-container">
			<Loading inverted={true} />
		</div>
	{:else}
		<div class="level-preview">
			<div class="level-name">
				<a href={`/level/${apiLevel.id}`}>
					<b>{apiLevel.name}</b>
				</a>
			</div>
			<div class="level-author">{$locale == 'vi' ? 'bởi' : 'by'} {apiLevel.author}</div>
			<div class="level-id">ID: {apiLevel.id}</div>
		</div>

		{#if levelVariants.length > 0}
			<div class="variant-picker">
				<Label class="variant-label">
					<Link class="h-3.5 w-3.5 inline" />
					{$locale == 'vi' ? 'Bạn chơi bản nào?' : 'Which version did you play?'}
				</Label>
				<div class="variant-options">
					<button
						class="variant-option"
						class:selected={selectedVariantId === null}
						on:click={() => (selectedVariantId = null)}
					>
						<span>{apiLevel.name} ({$locale == 'vi' ? 'Bản gốc' : 'Original'})</span>
					</button>
					{#each levelVariants as variant}
						<button
							class="variant-option"
							class:selected={selectedVariantId === variant.id}
							on:click={() => (selectedVariantId = variant.id)}
						>
							<span>{variant.name}</span>
							<span class="variant-id">ID: {variant.id}</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>

<style lang="scss">
	.step-content {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.loading-container {
		display: flex;
		justify-content: center;
		padding: 32px 0;
	}

	.level-preview {
		text-align: center;
		padding: 20px;
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		background: hsl(var(--muted) / 0.15);

		a {
			text-decoration: underline;
			font-size: 18px;
		}
	}

	.level-author {
		font-size: 13px;
		color: hsl(var(--muted-foreground));
		margin-top: 4px;
	}

	.level-id {
		font-size: 12px;
		color: hsl(var(--muted-foreground) / 0.7);
		margin-top: 2px;
		font-family: monospace;
	}

	.variant-picker {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px;
		border: 1px solid hsl(var(--border));
		border-radius: 10px;
		background: hsl(var(--muted) / 0.1);
	}

	.variant-options {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.variant-option {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 14px;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		background: transparent;
		cursor: pointer;
		font-size: 13px;
		text-align: left;
		transition: all 0.15s ease;

		&:hover {
			background: hsl(var(--muted) / 0.3);
		}

		&.selected {
			border-color: hsl(var(--primary));
			background: hsl(var(--primary) / 0.08);
		}
	}

	.variant-id {
		font-size: 11px;
		color: hsl(var(--muted-foreground));
		font-family: monospace;
	}
</style>
