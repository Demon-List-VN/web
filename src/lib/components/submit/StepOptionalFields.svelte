<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { locale, _ } from 'svelte-i18n';

	export let apiLevel: any;
	export let progress: number;
	export let suggestedRating: number;
	export let comment: string;

	$: isPlatformer = apiLevel?.length == 5;
	$: ratingDisabled = !isPlatformer && progress != 100;
</script>

<div class="step-content">
	<div class="field">
		<Label class="field-label">
			{$_('submit.optional.suggestion')}
			<span class="optional-tag">{$locale == 'vi' ? 'không bắt buộc' : 'optional'}</span>
		</Label>
		<Input
			type="number"
			inputmode="numeric"
			disabled={ratingDisabled}
			bind:value={suggestedRating}
			placeholder={!ratingDisabled
				? $locale == 'vi'
					? 'Không ghi cũng được'
					: 'Leave empty if unsure'
				: $locale == 'vi'
					? 'Progress phải là 100%'
					: 'Progress must be 100%'}
		/>
	</div>

	<div class="field">
		<Label class="field-label">
			{$_('submit.optional.comment')}
			<span class="optional-tag">{$locale == 'vi' ? 'không bắt buộc' : 'optional'}</span>
		</Label>
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
		gap: 16px;
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

	.optional-tag {
		font-size: 11px;
		font-weight: 400;
		color: hsl(var(--muted-foreground));
		padding: 1px 6px;
		border-radius: 4px;
		background: hsl(var(--muted) / 0.5);
	}
</style>
