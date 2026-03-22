<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { locale } from 'svelte-i18n';
	import { Lightbulb, Search } from 'lucide-svelte';
	import { user } from '$lib/client';
	import { isActive } from '$lib/client/isSupporterActive';

	export let levelId: number;
	export let submissionType: 'record' | 'level';
</script>

<div class="step-content">
	<div class="hero-section">
		<div class="icon-wrapper">
			<Search size={32} />
		</div>
		<h2>
			{$locale == 'vi' ? 'Nhập Level ID' : 'Enter Level ID'}
		</h2>
		<p class="subtitle">
			{#if submissionType === 'record'}
				{$locale == 'vi'
					? 'Nhập ID của level bạn muốn nộp record. Bạn có thể tìm ID trong Geometry Dash.'
					: 'Enter the ID of the level you want to submit a record for. You can find the ID in Geometry Dash.'}
			{:else}
				{$locale == 'vi'
					? 'Nhập ID của challenge level bạn muốn đề xuất thêm vào danh sách.'
					: 'Enter the ID of the challenge level you want to suggest for the list.'}
			{/if}
		</p>
	</div>

	<div class="input-section">
		<div class="big-input">
			<Input
				type="number"
				inputmode="numeric"
				bind:value={levelId}
				placeholder={$locale == 'vi' ? 'Ví dụ: 97272981' : 'e.g. 97272981'}
				class="level-id-input"
			/>
		</div>
	</div>

	{#if submissionType === 'record' && !isActive($user.data.supporterUntil)}
		<Alert.Root class="tip-alert">
			<Alert.Description class="flex items-center gap-[10px]">
				<Lightbulb size={18} class="shrink-0" />
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
</div>

<style lang="scss">
	.step-content {
		display: flex;
		flex-direction: column;
		gap: 24px;
		padding: 8px 0;
	}

	.hero-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 8px;
	}

	.icon-wrapper {
		width: 56px;
		height: 56px;
		border-radius: 14px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: hsl(var(--primary) / 0.08);
		color: hsl(var(--primary));
		margin-bottom: 4px;
	}

	h2 {
		font-size: 18px;
		font-weight: 600;
		color: hsl(var(--foreground));
	}

	.subtitle {
		font-size: 13px;
		color: hsl(var(--muted-foreground));
		line-height: 1.5;
		max-width: 380px;
	}

	.input-section {
		max-width: 320px;
		margin: 0 auto;
		width: 100%;
	}

	.big-input :global(.level-id-input) {
		text-align: center;
		font-size: 18px;
		font-weight: 500;
		padding: 12px 16px;
		height: auto;
		letter-spacing: 0.5px;
	}

	.tip-alert {
		max-width: 420px;
		margin: 0 auto;
	}
</style>
