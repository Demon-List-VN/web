<script lang="ts">
	import MagnifyingGlass from 'svelte-radix/MagnifyingGlass.svelte';
	import Calendar from 'svelte-radix/Calendar.svelte';
	import MixerHorizontal from 'svelte-radix/MixerHorizontal.svelte';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { _ } from 'svelte-i18n';
	import { onMount, createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher<{
		filterApply: Filter;
	}>();

	interface Filter {
		search: string;
		eventType: 'all' | 'contest' | 'nonContest';
		contestType: 'all' | 'ranked' | 'unranked'; // all if eventType == 'all' or 'nonContest'
		start: string;
		end: string;
	}

	const defaultFilter: Filter = {
		search: '',
		eventType: 'all',
		contestType: 'all',
		start: '',
		end: ''
	};

	export let filter: Filter = {
		search: '',
		eventType: 'all',
		contestType: 'all',
		start: '',
		end: ''
	};

	let isExpanded = false;

	$: if (filter.eventType !== 'contest') {
		filter.contestType = 'all';
	}

	onMount(() => {
		const checkWidth = () => {
			isExpanded = window.innerWidth >= 1024;
		};

		checkWidth();
		window.addEventListener('resize', checkWidth);

		return () => {
			window.removeEventListener('resize', checkWidth);
		};
	});
</script>

<Card class="w-full">
	<CardHeader class="pb-4">
		<div class="flex items-center justify-between">
			<CardTitle class="flex items-center gap-2">
				<MixerHorizontal class="h-5 w-5" />
				{$_('event_filter.title')}
			</CardTitle>
			<Button
				on:click={() => {
					isExpanded = !isExpanded;
				}}
				variant="ghost"
				size="sm"
			>
				{isExpanded ? $_('event_filter.collapse') : $_('event_filter.expand')}
			</Button>
		</div>
	</CardHeader>

	<CardContent class="space-y-4">
		<div class="relative">
			<MagnifyingGlass
				class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
			/>
			<Input
				type="text"
				placeholder={$_('event_filter.search_placeholder')}
				bind:value={filter.search}
				class="pl-10"
			/>
		</div>

		{#if isExpanded}
			<Separator />

			<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
				<div class="space-y-3">
					<Label class="text-sm font-medium">{$_('event_filter.event_type')}</Label>
					<RadioGroup.Root bind:value={filter.eventType} class="space-y-1">
						<div class="flex items-center space-x-2">
							<RadioGroup.Item value="all" id="all-events" />
							<Label for="all-events" class="text-sm font-normal">{$_('event_filter.all_events')}</Label>
						</div>
						<div class="flex items-center space-x-2">
							<RadioGroup.Item value="contest" id="contest-only" />
							<Label for="contest-only" class="text-sm font-normal">{$_('event_filter.contest_only')}</Label>
						</div>
						<div class="flex items-center space-x-2">
							<RadioGroup.Item value="nonContest" id="non-contest" />
							<Label for="non-contest" class="text-sm font-normal">{$_('event_filter.non_contest')}</Label>
						</div>
					</RadioGroup.Root>
				</div>

				<div class="space-y-3">
					<Label class="flex items-center gap-2 text-sm font-medium">
						{$_('event_filter.ranking')}
					</Label>
					<RadioGroup.Root 
						bind:value={filter.contestType} 
						disabled={filter.eventType !== 'contest'}
						class="space-y-1"
					>
						<div class="flex items-center space-x-2">
							<RadioGroup.Item value="all" id="all-ranking" disabled={filter.eventType !== 'contest'} />
							<Label
								for="all-ranking"
								class={`text-sm font-normal ${filter.eventType !== 'contest' ? 'text-muted-foreground' : ''}`}
							>
								{$_('event_filter.all_ranking')}
							</Label>
						</div>
						<div class="flex items-center space-x-2">
							<RadioGroup.Item value="ranked" id="has-ranking" disabled={filter.eventType !== 'contest'} />
							<Label
								for="has-ranking"
								class={`text-sm font-normal ${filter.eventType !== 'contest' ? 'text-muted-foreground' : ''}`}
							>
								{$_('event_filter.has_ranking')}
							</Label>
						</div>
						<div class="flex items-center space-x-2">
							<RadioGroup.Item value="unranked" id="no-ranking" disabled={filter.eventType !== 'contest'} />
							<Label
								for="no-ranking"
								class={`text-sm font-normal ${filter.eventType !== 'contest' ? 'text-muted-foreground' : ''}`}
							>
								{$_('event_filter.no_ranking')}
							</Label>
						</div>
					</RadioGroup.Root>
				</div>
			</div>

			<Separator />

			<div class="space-y-3">
				<Label class="flex items-center gap-2 text-sm font-medium">
					<Calendar class="h-4 w-4" />
					{$_('event_filter.time_period')}
				</Label>
				<div class="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
					<div class="space-y-2">
						<Label for="start-date" class="text-xs text-muted-foreground"
							>{$_('event_filter.start_date')}</Label
						>
						<Input id="start-date" type="date" bind:value={filter.start} class="text-sm" />
					</div>
					<div class="space-y-2">
						<Label for="end-date" class="text-xs text-muted-foreground"
							>{$_('event_filter.end_date')}</Label
						>
						<Input id="end-date" type="date" bind:value={filter.end} class="text-sm" />
					</div>
				</div>
			</div>

			<div class="flex justify-end gap-2">
				<Button
					variant="outline"
					size="sm"
					on:click={() => {
						filter = { ...defaultFilter };
					}}
				>
					{$_('event_filter.clear_filters')}
				</Button>
				<Button
					size="sm"
					on:click={() => {
						dispatch('filterApply', filter);
					}}
				>
					{$_('event_filter.apply')}
				</Button>
			</div>
		{:else}
			<div class="flex justify-end">
				<Button
					size="sm"
					on:click={() => {
						dispatch('filterApply', filter);
					}}
				>
					{$_('event_filter.apply')}
				</Button>
			</div>
		{/if}
	</CardContent>
</Card>
