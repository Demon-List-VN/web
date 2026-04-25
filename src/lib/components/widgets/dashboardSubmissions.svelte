<script lang="ts">
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { _ } from 'svelte-i18n';

	export let submissions: any[] = [];
	export let loading = false;

	function formatProgress(progress: number, isPlatformer: boolean) {
		if (!isPlatformer) {
			return `${progress}%`;
		}
		return `${Math.floor(progress / 60000)}:${Math.floor((progress % 60000) / 1000)
			.toString()
			.padStart(2, '0')}.${(progress % 1000)
			.toString()
			.padStart(3, '0')}`;
	}

	function getRecordDetailHref(submission: any) {
		const recordQuery = submission?.id ? `?id=${submission.id}` : '';
		return `/record/${submission.uid}/${submission.levelid}${recordQuery}`;
	}
</script>

<Card.Root class="w-full bg-background/60 backdrop-blur-md sm:w-auto">
	<Card.Header class="px-3 pb-2 pt-3 sm:px-6 sm:pt-6">
		<Card.Title class="flex items-center justify-between text-sm sm:text-base">
			<span>{$_('dashboard.pending_submissions') || 'Pending Submissions'}</span>
			{#if submissions.length > 0}
				<a
					href={`/mySubmission/${submissions[0].uid}`}
					class="text-xs text-muted-foreground hover:text-foreground sm:text-sm"
				>
					{$_('dashboard.view_all') || 'View All'} →
				</a>
			{/if}
		</Card.Title>
	</Card.Header>
	<Card.Content class="px-3 pb-3 sm:px-6 sm:pb-6">
		{#if loading}
			<div class="space-y-2">
				{#each { length: 2 } as _}
					<div class="flex items-center gap-2 sm:gap-3">
						<Skeleton class="h-7 w-7 rounded sm:h-8 sm:w-8" />
						<div class="flex-1">
							<Skeleton class="mb-1 h-2.5 w-20 sm:h-3 sm:w-24" />
							<Skeleton class="h-2 w-12 sm:w-16" />
						</div>
					</div>
				{/each}
			</div>
		{:else if submissions.length === 0}
			<p class="py-2 text-center text-xs text-muted-foreground sm:text-sm">
				{$_('dashboard.no_submissions') || 'No pending submissions'}
			</p>
		{:else}
			<div class="space-y-1">
				{#each submissions.slice(0, 3) as submission}
					<button
						on:click={() => goto(getRecordDetailHref(submission))}
						class="flex w-full items-center gap-2 rounded-md p-1.5 transition-colors hover:bg-muted/50 sm:gap-3 sm:p-2"
					>
						<div class="flex-1 overflow-hidden">
							<p class="truncate text-xs font-medium sm:text-sm">
								{submission.levels.name}
							</p>
							<div class="flex items-center gap-1 text-[10px] text-muted-foreground sm:text-xs">
								<span>{formatProgress(submission.progress, submission.levels?.isPlatformer)}</span>
								<span>•</span>
								{#if submission.needMod}
									<span>{$_('submissions.forwarded')}</span>
								{:else if !submission.queueNo}
									<span>-</span>
								{:else}
									<span>Queue: {submission.queueNo}</span>
								{/if}
							</div>
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</Card.Content>
</Card.Root>
