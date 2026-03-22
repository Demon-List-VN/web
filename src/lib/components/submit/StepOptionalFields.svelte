<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { locale, _ } from 'svelte-i18n';
	import { Star, MessageSquare } from 'lucide-svelte';

	export let apiLevel: any;
	export let progress: number;
	export let suggestedRating: number;
	export let comment: string;

	$: isPlatformer = apiLevel?.length == 5;
	$: ratingDisabled = !isPlatformer && progress != 100;
</script>

<div class="step-content">
	<div class="step-intro">
		<p>
			{$locale == 'vi'
				? 'Các trường này không bắt buộc nhưng giúp việc duyệt nhanh hơn.'
				: 'These fields are optional but help speed up the review process.'}
		</p>
	</div>

	<!-- Rating suggestion -->
	<div class="field-card" class:disabled-card={ratingDisabled}>
		<div class="field-header">
			<div class="field-icon">
				<Star size={16} />
			</div>
			<div>
				<Label class="field-title">
					{$_('submit.optional.suggestion')}
					<span class="optional-badge">{$locale == 'vi' ? 'tùy chọn' : 'optional'}</span>
				</Label>
				<p class="field-desc">
					{#if ratingDisabled}
						{$locale == 'vi'
							? 'Chỉ có thể đề xuất khi progress là 100%'
							: 'Only available when progress is 100%'}
					{:else}
						{$locale == 'vi'
							? 'Điểm đề xuất theo thang DLVN'
							: 'Suggested rating on the DLVN scale'}
					{/if}
				</p>
			</div>
		</div>
		<Input
			type="number"
			inputmode="numeric"
			disabled={ratingDisabled}
			bind:value={suggestedRating}
			placeholder={!ratingDisabled
				? $locale == 'vi'
					? 'Không ghi cũng được'
					: 'Leave empty if unsure'
				: '—'}
		/>
	</div>

	<!-- Comment -->
	<div class="field-card">
		<div class="field-header">
			<div class="field-icon">
				<MessageSquare size={16} />
			</div>
			<div>
				<Label class="field-title">
					{$_('submit.optional.comment')}
					<span class="optional-badge">{$locale == 'vi' ? 'tùy chọn' : 'optional'}</span>
				</Label>
				<p class="field-desc">
					{$locale == 'vi'
						? 'Thêm ghi chú cho người duyệt'
						: 'Add a note for the reviewer'}
				</p>
			</div>
		</div>
		<Textarea
			bind:value={comment}
			placeholder={$locale == 'vi' ? 'Ghi chú thêm...' : 'Any additional notes...'}
			rows={3}
		/>
	</div>
</div>

<style lang="scss">
	.step-content {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.step-intro {
		text-align: center;
		padding: 4px 0 8px;

		p {
			font-size: 13px;
			color: hsl(var(--muted-foreground));
		}
	}

	.field-card {
		padding: 14px 16px;
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		background: hsl(var(--muted) / 0.04);
		display: flex;
		flex-direction: column;
		gap: 10px;
		transition: border-color 0.15s ease;

		&:focus-within {
			border-color: hsl(var(--primary) / 0.5);
		}

		&.disabled-card {
			opacity: 0.5;
		}
	}

	.field-header {
		display: flex;
		align-items: flex-start;
		gap: 10px;
	}

	.field-icon {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: hsl(var(--primary) / 0.08);
		color: hsl(var(--primary));
		flex-shrink: 0;
		margin-top: 1px;
	}

	.field-card :global(.field-title) {
		font-size: 13px;
		font-weight: 600;
		color: hsl(var(--foreground));
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.field-desc {
		font-size: 12px;
		color: hsl(var(--muted-foreground));
		margin-top: 1px;
		line-height: 1.3;
	}

	.optional-badge {
		font-size: 10px;
		font-weight: 400;
		color: hsl(var(--muted-foreground));
		padding: 1px 6px;
		border-radius: 4px;
		background: hsl(var(--muted) / 0.5);
		text-transform: uppercase;
		letter-spacing: 0.3px;
	}
</style>
