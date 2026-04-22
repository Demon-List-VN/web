<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import Loading from '$lib/components/animation/loading.svelte';
	import { locale } from 'svelte-i18n';
	import { isValidYouTubeLink } from './submitState';

	export let apiLevel: any;
	export let videoLink: string;
	export let comment: string;
	export let targetLabel: string | null = null;
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

		<div class="level-context">
			{#if $locale == 'vi'}
				Bạn đang nộp level này vào {targetLabel || 'danh sách này'}
			{:else}
				You are submitting this level to {targetLabel || 'this list'}
			{/if}
		</div>

		<div class="field">
			<Label class="field-label">
				{$locale == 'vi' ? 'Link Video YouTube' : 'YouTube Video Link'}
				<span class="required">*</span>
			</Label>
			<Input
				bind:value={videoLink}
				placeholder={$locale == 'vi' ? 'Link YouTube (bắt buộc)' : 'YouTube link (required)'}
			/>
			{#if videoLink && !isValidYouTubeLink(videoLink)}
				<p class="validation-error">
					{$locale == 'vi'
						? 'Link video không hợp lệ. Vui lòng nhập link YouTube.'
						: 'Invalid video link. Please enter a valid YouTube link.'}
				</p>
			{/if}
		</div>

		<div class="field">
			<Label class="field-label">
				{$locale == 'vi' ? 'Ghi chú' : 'Comment'}
				<span class="optional-tag">{$locale == 'vi' ? 'không bắt buộc' : 'optional'}</span>
			</Label>
			<Textarea
				bind:value={comment}
				placeholder={$locale == 'vi' ? 'Ghi chú (không bắt buộc)' : 'Comment (optional)'}
				rows={3}
			/>
		</div>
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

	.level-context {
		text-align: center;
		font-size: 13px;
		color: hsl(var(--muted-foreground));
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.field :global(.field-label) {
		font-size: 13px;
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.required {
		color: hsl(var(--destructive, 0 84% 60%));
	}

	.optional-tag {
		font-size: 11px;
		font-weight: 400;
		color: hsl(var(--muted-foreground));
		padding: 1px 6px;
		border-radius: 4px;
		background: hsl(var(--muted) / 0.5);
	}

	.validation-error {
		font-size: 12px;
		color: hsl(var(--destructive, 0 84% 60%));
	}
</style>
