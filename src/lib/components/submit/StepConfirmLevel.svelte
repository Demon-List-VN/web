<script lang="ts">
	import { Label } from '$lib/components/ui/label/index.js';
	import Loading from '$lib/components/animation/loading.svelte';
	import { locale } from 'svelte-i18n';
	import { Link, ExternalLink } from 'lucide-svelte';
	import { fade } from 'svelte/transition';

	export let apiLevel: any;
	export let level: any;
	export let levelVariants: any[];
	export let selectedVariantId: number | null;
	export let targetLabel: string | null = null;

	let thumbFailed = false;
</script>

<div class="step-content">
	{#if !apiLevel}
		<div class="fallback-card" in:fade={{ duration: 200 }}>
			<div class="loading-container">
				<Loading inverted={true} />
			</div>
			<p class="fallback-title">
				{$locale == 'vi' ? 'Không tải được thông tin level để xem trước' : 'Unable to load level preview'}
			</p>
			<p class="fallback-copy">
				{$locale == 'vi'
					? 'Bạn vẫn có thể tiếp tục gửi level. Hệ thống sẽ kiểm tra Level ID khi bạn gửi biểu mẫu.'
					: 'You can still continue with the submission. The backend will validate the level ID when you submit the form.'}
			</p>
		</div>
	{:else}
		<div class="level-card" in:fade={{ duration: 200 }}>
			<div class="thumbnail-wrapper">
				{#if level?.videoID}
					<img
						src={`https://img.youtube.com/vi/${level.videoID}/0.jpg`}
						alt=""
						class="thumbnail bg-thumb"
					/>
				{/if}
				{#if !thumbFailed}
					<img
						src={`https://levelthumbs.prevter.me/thumbnail/${apiLevel.id}/small`}
						alt=""
						class="thumbnail fg-thumb"
						on:error={() => { thumbFailed = true; }}
					/>
				{/if}
			</div>

			<div class="level-info">
				<a href={`/level/${apiLevel.id}`} class="level-name" target="_blank">
					{apiLevel.name}
					<ExternalLink size={13} class="inline ml-1 opacity-50" />
				</a>
				<div class="level-meta">
					{$locale == 'vi' ? 'bởi' : 'by'} <span class="author">{apiLevel.author}</span>
				</div>
				{#if targetLabel}
					<div class="level-context">
						{#if $locale == 'vi'}
							Bạn đang nộp level này vào {targetLabel}
						{:else}
							You are submitting this level to {targetLabel}
						{/if}
					</div>
				{/if}
				<div class="level-id-badge">
					ID: {apiLevel.id}
				</div>
			</div>
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

	.fallback-card {
		border: 1px solid hsl(var(--border));
		border-radius: 14px;
		padding: 16px 18px 18px;
		background: hsl(var(--muted) / 0.08);
	}

	.fallback-title {
		font-size: 15px;
		font-weight: 600;
		color: hsl(var(--foreground));
	}

	.fallback-copy {
		margin-top: 6px;
		font-size: 13px;
		line-height: 1.6;
		color: hsl(var(--muted-foreground));
	}

	.level-card {
		border: 1px solid hsl(var(--border));
		border-radius: 14px;
		overflow: hidden;
		background: hsl(var(--muted) / 0.08);
	}

	.thumbnail-wrapper {
		position: relative;
		width: 100%;
		height: 180px;
		overflow: hidden;
		background: hsl(var(--muted) / 0.2);
	}

	.thumbnail {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.fg-thumb {
		z-index: 1;
		opacity: 0;
		transition: opacity 0.4s ease;

		&:not([src=""]) {
			opacity: 1;
		}
	}

	.bg-thumb {
		z-index: 0;
	}

	.level-info {
		padding: 16px 20px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.level-name {
		font-size: 17px;
		font-weight: 600;
		color: hsl(var(--foreground));
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		transition: color 0.15s ease;

		&:hover {
			color: hsl(var(--primary));
		}
	}

	.level-meta {
		font-size: 13px;
		color: hsl(var(--muted-foreground));
	}

	.level-context {
		font-size: 13px;
		color: hsl(var(--muted-foreground));
	}

	.author {
		font-weight: 500;
		color: hsl(var(--foreground));
	}

	.level-id-badge {
		display: inline-flex;
		width: fit-content;
		font-size: 11px;
		font-family: monospace;
		color: hsl(var(--muted-foreground));
		background: hsl(var(--muted) / 0.4);
		padding: 2px 8px;
		border-radius: 6px;
		margin-top: 4px;
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
