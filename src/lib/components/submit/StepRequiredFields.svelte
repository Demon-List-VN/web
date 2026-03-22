<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { locale, _ } from 'svelte-i18n';
	import { Timer, Gauge, Video, Film, Monitor } from 'lucide-svelte';

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
	<!-- Progress / Time -->
	<div class="field-card">
		<div class="field-header">
			<div class="field-icon">
				{#if isPlatformer}
					<Timer size={16} />
				{:else}
					<Gauge size={16} />
				{/if}
			</div>
			<div>
				<Label class="field-title">
					{#if isPlatformer}
						{$locale == 'vi' ? 'Thời gian' : 'Time'}
					{:else}
						{$_('submit.required.progress')}
					{/if}
				</Label>
				<p class="field-desc">
					{#if isPlatformer}
						{$locale == 'vi' ? 'Thời gian hoàn thành level' : 'Your completion time'}
					{:else}
						{$locale == 'vi'
							? level && level.rating
								? `Tối thiểu ${level.minProgress}%`
								: 'Tối thiểu 100%'
							: level && level.rating
								? `Minimum ${level.minProgress}%`
								: 'Minimum 100%'}
					{/if}
				</p>
			</div>
		</div>
		{#if isPlatformer}
			<div class="time-inputs">
				<div class="time-field">
					<Input type="number" inputmode="numeric" bind:value={time.m} placeholder="0" />
					<span class="time-unit">{$locale == 'vi' ? 'phút' : 'min'}</span>
				</div>
				<span class="time-sep">:</span>
				<div class="time-field">
					<Input type="number" inputmode="numeric" bind:value={time.s} placeholder="0" />
					<span class="time-unit">{$locale == 'vi' ? 'giây' : 'sec'}</span>
				</div>
				<span class="time-sep">.</span>
				<div class="time-field">
					<Input type="number" inputmode="numeric" bind:value={time.ms} placeholder="0" />
					<span class="time-unit">ms</span>
				</div>
			</div>
		{:else}
			<Input
				type="number"
				inputmode="numeric"
				bind:value={progress}
				placeholder={level && level.rating
					? `${$_('submit.required.minimum')} ${level.minProgress}%`
					: `${$_('submit.required.minimum')} 100%`}
			/>
		{/if}
	</div>

	<!-- FPS -->
	<div class="field-card">
		<div class="field-header">
			<div class="field-icon">
				<Monitor size={16} />
			</div>
			<div>
				<Label class="field-title">FPS</Label>
				<p class="field-desc">
					{$locale == 'vi' ? 'CBF hoặc ∞ FPS = 0' : 'CBF or ∞ FPS = 0'}
				</p>
			</div>
		</div>
		<Input
			type="number"
			inputmode="numeric"
			bind:value={refreshRate}
			placeholder="60, 120, 240, 360..."
		/>
	</div>

	<!-- Video links -->
	<div class="field-card">
		<div class="field-header">
			<div class="field-icon">
				<Video size={16} />
			</div>
			<div>
				<Label class="field-title">{$_('submit.required.video')}</Label>
				<p class="field-desc">
					{$locale == 'vi' ? 'Link YouTube video hoàn thành' : 'YouTube link of your completion'}
				</p>
			</div>
		</div>
		<Input bind:value={videoLink} placeholder="https://youtube.com/watch?v=..." />
	</div>

	{#if needsRaw}
		<div class="field-card">
			<div class="field-header">
				<div class="field-icon">
					<Film size={16} />
				</div>
				<div>
					<Label class="field-title">{$_('submit.required.raw')}</Label>
					<p class="field-desc">
						{$locale == 'vi'
							? 'Video chưa chỉnh sửa từ đầu đến cuối'
							: 'Unedited recording from start to finish'}
					</p>
				</div>
			</div>
			<Input bind:value={raw} placeholder="https://youtube.com/watch?v=..." />
		</div>
	{/if}

	<!-- Platform -->
	<div class="field-card">
		<div class="field-header">
			<div class="field-icon platform-icon">
				<Monitor size={16} />
			</div>
			<div>
				<Label class="field-title">{$_('submit.required.platform')}</Label>
				<p class="field-desc">
					{$locale == 'vi' ? 'Nền tảng bạn chơi' : 'The platform you played on'}
				</p>
			</div>
		</div>
		<div class="platform-buttons">
			<button
				class="platform-btn"
				class:selected={mobile?.value === false}
				on:click={() => (mobile = { value: false, label: 'PC' })}
			>
				<span class="platform-label">PC</span>
			</button>
			<button
				class="platform-btn"
				class:selected={mobile?.value === true}
				on:click={() => (mobile = { value: true, label: 'Mobile' })}
			>
				<span class="platform-label">Mobile</span>
			</button>
		</div>
	</div>
</div>

<style lang="scss">
	.step-content {
		display: flex;
		flex-direction: column;
		gap: 12px;
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
	}

	.field-desc {
		font-size: 12px;
		color: hsl(var(--muted-foreground));
		margin-top: 1px;
		line-height: 1.3;
	}

	.time-inputs {
		display: flex;
		align-items: flex-start;
		gap: 6px;
	}

	.time-field {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		flex: 1;
	}

	.time-unit {
		font-size: 10px;
		color: hsl(var(--muted-foreground));
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.time-sep {
		font-size: 20px;
		font-weight: 600;
		color: hsl(var(--muted-foreground));
		margin-top: 6px;
	}

	.platform-buttons {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}

	.platform-btn {
		padding: 10px 16px;
		border: 2px solid hsl(var(--border));
		border-radius: 10px;
		background: transparent;
		cursor: pointer;
		font-size: 14px;
		font-weight: 500;
		color: hsl(var(--foreground));
		transition: all 0.15s ease;

		&:hover {
			background: hsl(var(--muted) / 0.3);
		}

		&.selected {
			border-color: hsl(var(--primary));
			background: hsl(var(--primary) / 0.06);
			color: hsl(var(--primary));
		}
	}
</style>
