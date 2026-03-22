<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { locale, _ } from 'svelte-i18n';

	export let apiLevel: any;
	export let level: any;
	export let progress: number;
	export let refreshRate: string;
	export let videoLink: string;
	export let raw: string;
	export let mobile: { value: boolean; label: string } | null;
	export let time: { m: number | null; s: number | null; ms: number | null };

	$: isPlatformer = apiLevel?.length == 5;
	$: needsRaw =
		level
			? (!level.flTop || level.rating) && !(level.isChallenge && level.rating < 2600)
			: true;
</script>

<div class="step-content">
	{#if isPlatformer}
		<div class="field">
			<Label class="field-label">{$locale == 'vi' ? 'Thời gian' : 'Time'} <span class="required">*</span></Label>
			<div class="time-inputs">
				<Input type="number" inputmode="numeric" bind:value={time.m} placeholder="m" />
				<span class="time-sep">:</span>
				<Input type="number" inputmode="numeric" bind:value={time.s} placeholder="s" />
				<span class="time-sep">.</span>
				<Input type="number" inputmode="numeric" bind:value={time.ms} placeholder="ms" />
			</div>
		</div>
	{:else}
		<div class="field">
			<Label class="field-label">{$_('submit.required.progress')} <span class="required">*</span></Label>
			<Input
				type="number"
				inputmode="numeric"
				bind:value={progress}
				placeholder={level && level.rating
					? `${$_('submit.required.minimum')} ${level.minProgress}%`
					: `${$_('submit.required.minimum')} 100%`}
			/>
		</div>
	{/if}

	<div class="field">
		<Label class="field-label">FPS <span class="required">*</span></Label>
		<Input
			type="number"
			inputmode="numeric"
			bind:value={refreshRate}
			placeholder="CBF/∞ FPS = 0 FPS"
		/>
	</div>

	<div class="field">
		<Label class="field-label">{$_('submit.required.video')} <span class="required">*</span></Label>
		<Input bind:value={videoLink} placeholder="https://youtube.com/watch?v=..." />
	</div>

	{#if needsRaw}
		<div class="field">
			<Label class="field-label">{$_('submit.required.raw')} <span class="required">*</span></Label>
			<Input bind:value={raw} placeholder="https://youtube.com/watch?v=..." />
		</div>
	{/if}

	<div class="field">
		<Label class="field-label">{$_('submit.required.platform')} <span class="required">*</span></Label>
		<Select.Root bind:selected={mobile}>
			<Select.Trigger>
				<Select.Value placeholder={$locale == 'vi' ? 'Chọn nền tảng' : 'Select a platform'} />
			</Select.Trigger>
			<Select.Content>
				<Select.Group>
					<Select.Label>{$_('submit.required.platform')}</Select.Label>
					<Select.Item value={false} label="PC">PC</Select.Item>
					<Select.Item value={true} label="Mobile">Mobile</Select.Item>
				</Select.Group>
			</Select.Content>
			<Select.Input name="platform" value={true} />
		</Select.Root>
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

	.required {
		color: hsl(var(--destructive, 0 84% 60%));
	}

	.time-inputs {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.time-sep {
		font-size: 18px;
		font-weight: 600;
		color: hsl(var(--muted-foreground));
	}
</style>
