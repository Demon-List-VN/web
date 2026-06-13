<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { cn } from '$lib/utils.js';

	export let to: Date | string | number;
	/** Show only the two most significant non-zero units. */
	export let compact = false;
	let className: string | undefined = undefined;
	export { className as class };

	const dispatch = createEventDispatcher();

	let now = Date.now();
	let done = false;

	onMount(() => {
		const id = setInterval(() => (now = Date.now()), 1000);

		return () => clearInterval(id);
	});

	$: target = to instanceof Date ? to.getTime() : new Date(to)
		.getTime();
	$: valid = Number.isFinite(target);
	$: remaining = valid ? Math.max(0, target - now) : 0;
	$: if (valid && remaining === 0 && !done) {
		done = true;
		dispatch('done');
	}

	$: totalSeconds = Math.floor(remaining / 1000);
	$: parts = [
		{ value: Math.floor(totalSeconds / 86400), unit: $_('tournament.countdown.days') },
		{ value: Math.floor((totalSeconds % 86400) / 3600), unit: $_('tournament.countdown.hours') },
		{ value: Math.floor((totalSeconds % 3600) / 60), unit: $_('tournament.countdown.minutes') },
		{ value: totalSeconds % 60, unit: $_('tournament.countdown.seconds') }
	];
	$: segments = (() => {
		let start = 0;

		while (start < parts.length - 1 && parts[start].value === 0) {
			start++;
		}

		const chosen = parts.slice(start);

		return compact ? chosen.slice(0, 2) : chosen;
	})();
</script>

{#if valid}
	{#if remaining <= 0}
		<span class={cn('tabular-nums', className)}>{$_('tournament.countdown.ended')}</span>
	{:else}
		<span class={cn('inline-flex items-center gap-[6px] tabular-nums', className)}>
			{#each segments as seg}
				<span class="inline-flex items-baseline gap-[1px]">
					<span class="font-semibold">{seg.value}</span>
					<span class="text-[0.8em] opacity-70">{seg.unit}</span>
				</span>
			{/each}
		</span>
	{/if}
{/if}
