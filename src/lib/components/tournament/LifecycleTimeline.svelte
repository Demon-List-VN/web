<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Check, X } from 'lucide-svelte';
	import { cn } from '$lib/utils.js';
	import {
		LIFECYCLE_STAGES,
		lifecycleStageKey,
		stageIndex,
		type TournamentStatus
	} from '$lib/client/tournament';

	export let status: TournamentStatus;
	export let inviteOnly = false;
	let className: string | undefined = undefined;
	export { className as class };

	$: current = stageIndex(status);
	$: stages = inviteOnly ? LIFECYCLE_STAGES.slice(2) : LIFECYCLE_STAGES;
	$: visibleCurrent = inviteOnly ? current - 2 : current;
	$: cancelled = status === 'cancelled';
</script>

<div class={cn('w-full', className)}>
	{#if cancelled}
		<div
			class="flex items-center gap-[8px] rounded-[8px] border border-red-500/40 bg-red-500/10 px-[12px] py-[8px] text-sm font-medium text-red-400"
		>
			<X size={16} />
			{$_('tournament.status.cancelled')}
		</div>
	{:else}
		<div class="overflow-x-auto">
			<ol class={cn('flex items-start', inviteOnly ? 'min-w-[220px]' : 'min-w-[460px]')}>
				{#each stages as stage, i}
					{@const isDone = i < visibleCurrent}
					{@const isActive = i === visibleCurrent}
					<li class="flex flex-col items-center gap-[6px]" style="flex: 0 0 auto;">
						<div
							class={cn(
								'flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
								isDone
									? 'border-transparent bg-primary text-primary-foreground'
									: isActive
										? 'border-primary text-primary'
										: 'border-[hsl(var(--border))] text-muted-foreground'
							)}
						>
							{#if isDone}
								<Check size={15} />
							{:else}
								{i + 1}
							{/if}
						</div>
						<span
							class={cn(
								'whitespace-nowrap text-[11px]',
								isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'
							)}
						>
							{$_(lifecycleStageKey(stage))}
						</span>
					</li>
					{#if i < stages.length - 1}
						<div
							class={cn(
								'mt-[13px] h-[2px] min-w-[24px] flex-1 rounded-full transition-colors',
								isDone ? 'bg-primary' : 'bg-[hsl(var(--border))]'
							)}
						></div>
					{/if}
				{/each}
			</ol>
		</div>
	{/if}
</div>
