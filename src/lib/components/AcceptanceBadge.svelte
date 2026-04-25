<script lang="ts">
	import { Clock3, Shield, Zap } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';

	export let acceptedManually: boolean | null | undefined = false;
	export let acceptedAuto: boolean | null | undefined = false;
	export let compact = false;

	$: status = acceptedManually ? 'manual' : acceptedAuto ? 'auto' : 'pending';
	$: Icon = status === 'manual' ? Shield : status === 'auto' ? Zap : Clock3;
	$: label =
		status === 'manual'
			? $_('acceptance.manual')
			: status === 'auto'
				? $_('acceptance.auto')
				: $_('acceptance.pending');
</script>

<span
	class="acceptanceBadge"
	class:manual={status === 'manual'}
	class:auto={status === 'auto'}
	class:pending={status === 'pending'}
	class:compact
	title={label}
	aria-label={label}
>
	<svelte:component this={Icon} size={compact ? 14 : 13} strokeWidth={2.4} />
	{#if !compact}
		<span>{label}</span>
	{/if}
</span>

<style lang="scss">
	.acceptanceBadge {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		width: fit-content;
		max-width: 100%;
		padding: 3px 9px;
		border: 1px solid currentColor;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 700;
		line-height: 1.2;
		white-space: nowrap;

		&.compact {
			justify-content: center;
			width: 26px;
			height: 26px;
			padding: 0;
		}

		&.manual {
			background: rgba(234, 179, 8, 0.14);
			border-color: rgba(234, 179, 8, 0.42);
			color: #facc15;
		}

		&.auto {
			background: rgba(59, 130, 246, 0.14);
			border-color: rgba(59, 130, 246, 0.38);
			color: #93c5fd;
		}

		&.pending {
			background: rgba(148, 163, 184, 0.12);
			border-color: rgba(148, 163, 184, 0.3);
			color: #cbd5e1;
		}
	}
</style>
