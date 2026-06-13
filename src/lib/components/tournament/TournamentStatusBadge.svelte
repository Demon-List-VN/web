<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { cn } from '$lib/utils.js';
	import { statusMeta, type TournamentStatus } from '$lib/client/tournament';

	export let status: TournamentStatus;
	export let withDot = true;
	let className: string | undefined = undefined;
	export { className as class };

	$: meta = statusMeta(status);
</script>

<span
	class={cn(
		'inline-flex items-center gap-[6px] whitespace-nowrap rounded-full border px-[10px] py-[2px] text-xs font-medium',
		meta.badgeClass,
		className
	)}
>
	{#if withDot}
		<span class={cn('h-[6px] w-[6px] rounded-full', meta.dotClass)} class:animate-pulse={meta.tone === 'live'}></span>
	{/if}
	{$_(meta.labelKey)}
</span>
