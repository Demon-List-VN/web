<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { locale } from 'svelte-i18n';
	import { Lightbulb } from 'lucide-svelte';
	import { user } from '$lib/client';
	import { isActive } from '$lib/client/isSupporterActive';

	export let levelId: number;
	export let submissionType: 'record' | 'level';
</script>

<div class="step-content">
	{#if submissionType === 'record' && !isActive($user.data.supporterUntil)}
		<Alert.Root>
			<Alert.Description class="flex items-center gap-[10px]">
				<Lightbulb size={20} />
				<span class="text-sm">
					{#if $locale == 'vi'}
						Mẹo: Vào trang level và bấm Nộp để tự động điền ID. (Dành cho <a
							class="underline"
							href="/supporter">Supporter</a
						>)
					{:else}
						Tip: Go to the level page and click Submit to auto-fill the ID. (For <a
							class="underline"
							href="/supporter">Supporter</a
						>)
					{/if}
				</span>
			</Alert.Description>
		</Alert.Root>
	{/if}

	<div class="field">
		<Label class="field-label">Level ID</Label>
		<Input
			type="number"
			inputmode="numeric"
			bind:value={levelId}
			placeholder={$locale == 'vi' ? 'Ví dụ: 97272981' : 'e.g. 97272981'}
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
	}
</style>
