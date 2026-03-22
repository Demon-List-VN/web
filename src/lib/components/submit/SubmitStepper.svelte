<script lang="ts">
	import { Check } from 'lucide-svelte';

	export let steps: string[] = [];
	export let currentStep: number = 0;
</script>

<div class="stepper">
	{#each steps as step, i}
		<div class="step" class:completed={i < currentStep} class:active={i === currentStep}>
			<div class="step-circle">
				{#if i < currentStep}
					<Check size={14} strokeWidth={3} />
				{:else}
					<span>{i + 1}</span>
				{/if}
			</div>
			<span class="step-label">{step}</span>
		</div>
		{#if i < steps.length - 1}
			<div class="step-line" class:filled={i < currentStep} />
		{/if}
	{/each}
</div>

<style lang="scss">
	.stepper {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0;
		padding: 8px 0 24px;
	}

	.step {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		position: relative;
		z-index: 1;
	}

	.step-circle {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 13px;
		font-weight: 600;
		border: 2px solid hsl(var(--border));
		background: hsl(var(--background));
		color: hsl(var(--muted-foreground));
		transition: all 0.3s ease;
	}

	.step.active .step-circle {
		border-color: hsl(var(--primary));
		background: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
		box-shadow: 0 0 0 4px hsl(var(--primary) / 0.15);
	}

	.step.completed .step-circle {
		border-color: hsl(var(--primary));
		background: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
	}

	.step-label {
		font-size: 11px;
		font-weight: 500;
		color: hsl(var(--muted-foreground));
		transition: color 0.3s ease;
		white-space: nowrap;
	}

	.step.active .step-label {
		color: hsl(var(--foreground));
		font-weight: 600;
	}

	.step.completed .step-label {
		color: hsl(var(--foreground));
	}

	.step-line {
		flex: 1;
		height: 2px;
		min-width: 32px;
		max-width: 64px;
		background: hsl(var(--border));
		margin: 0 4px;
		margin-bottom: 22px;
		border-radius: 1px;
		transition: background 0.3s ease;
	}

	.step-line.filled {
		background: hsl(var(--primary));
	}

	@media (max-width: 480px) {
		.step-label {
			display: none;
		}

		.step-line {
			margin-bottom: 0;
		}

		.step-circle {
			width: 28px;
			height: 28px;
			font-size: 12px;
		}
	}
</style>
