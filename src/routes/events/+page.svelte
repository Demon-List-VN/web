<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { _ } from 'svelte-i18n';
	import EventCard from './eventCard.svelte';
	import FilterCard from './filterCard.svelte';

	export let data: any;

	$: currentTime = new Date();

	$: upcomingEvents = data.events.filter((event: any) => {
		const eventStart = new Date(event.start);
		return eventStart > currentTime;
	});

	$: ongoingEvents = data.events.filter((event: any) => {
		const eventStart = new Date(event.start);
		const eventEnd = new Date(event.end);
		return eventStart <= currentTime && eventEnd >= currentTime;
	});

	$: permanentEvents = data.events.filter((event: any) => {
		return !event.end;
	});

	$: pastEvents = data.events.filter((event: any) => {
		if (!event.end) {
			return false;
		}

		const eventEnd = new Date(event.end);
		return eventEnd < currentTime;
	});

	interface Filter {
		search: string;
		eventType: 'all' | 'contest' | 'nonContest';
		contestType: 'all' | 'ranked' | 'unranked';
		start: string;
		end: string;
	}

	let filter: Filter = {
		search: '',
		eventType: 'all',
		contestType: 'all',
		start: '',
		end: ''
	};

	async function fetchData() {
		// @ts-ignore
		const query = new URLSearchParams({ ...filter, from: 0, to: 49 }).toString();
		const res = await (await fetch(`${import.meta.env.VITE_API_URL}/events?${query}`)).json();

		data.events = res;
		data = data;
	}

	function handleFilterApply(event: CustomEvent<Filter>) {
		filter = event.detail;
		toast.promise(fetchData, {
			success: $_('toast.filter.success'),
			loading: $_('toast.filter.loading'),
			error: $_('toast.filter.error')
		});
	}
</script>

<svelte:head>
	<title>Sự kiện - Geometry Dash VN</title>
</svelte:head>

<div class="mx-auto mt-[20px] w-full max-w-[1500px] px-1">
	<div class="flex flex-col gap-[10px] lg:hidden">
		<FilterCard bind:filter on:filterApply={handleFilterApply} />
		<div class="mt-[10px]">
			{#if upcomingEvents.length}
				<h2 class="mb-[20px] text-center text-xl font-bold">{$_('events.upcoming')}</h2>
				<div class="mb-[20px] grid grid-cols-1 gap-[10px] xl:grid-cols-2">
					{#each upcomingEvents as event}
						<EventCard {event} />
					{/each}
				</div>
			{/if}
			{#if ongoingEvents.length}
				<h2 class="mb-[20px] text-center text-xl font-bold">{$_('events.ongoing')}</h2>
				<div class="mb-[20px] grid grid-cols-1 gap-[10px] xl:grid-cols-2">
					{#each ongoingEvents as event}
						<EventCard {event} />
					{/each}
				</div>
			{/if}
			{#if permanentEvents.length}
				<h2 class="mb-[20px] text-center text-xl font-bold">{$_('events.permanent_event')}</h2>
				<div class="mb-[20px] grid grid-cols-1 gap-[10px] xl:grid-cols-2">
					{#each permanentEvents as event}
						<EventCard {event} />
					{/each}
				</div>
			{/if}
			{#if pastEvents.length}
				<h2 class="mb-[20px] text-center text-xl font-bold">{$_('events.past')}</h2>
				<div class="mb-[20px] grid grid-cols-1 gap-[10px] xl:grid-cols-2">
					{#each pastEvents as event}
						<EventCard {event} />
					{/each}
				</div>
			{/if}
		</div>
	</div>
	<div class="hidden lg:grid lg:grid-cols-[300px_1fr] lg:gap-6">
		<div class="sticky top-[75px] h-fit">
			<FilterCard bind:filter on:filterApply={handleFilterApply} />
		</div>
		<div>
			{#if upcomingEvents.length}
				<h2 class="mb-[20px] text-center text-xl font-bold">{$_('events.upcoming')}</h2>
				<div class="mb-[20px] grid grid-cols-1 gap-[10px] xl:grid-cols-2">
					{#each upcomingEvents as event}
						<EventCard {event} />
					{/each}
				</div>
			{/if}
			{#if ongoingEvents.length}
				<h2 class="mb-[20px] text-center text-xl font-bold">{$_('events.ongoing')}</h2>
				<div class="mb-[20px] grid grid-cols-1 gap-[10px] xl:grid-cols-2">
					{#each ongoingEvents as event}
						<EventCard {event} />
					{/each}
				</div>
			{/if}
			{#if permanentEvents.length}
				<h2 class="mb-[20px] text-center text-xl font-bold">{$_('events.permanent_event')}</h2>
				<div class="mb-[20px] grid grid-cols-1 gap-[10px] xl:grid-cols-2">
					{#each permanentEvents as event}
						<EventCard {event} />
					{/each}
				</div>
			{/if}
			{#if pastEvents.length}
				<h2 class="mb-[20px] text-center text-xl font-bold">{$_('events.past')}</h2>
				<div class="mb-[20px] grid grid-cols-1 gap-[10px] xl:grid-cols-2">
					{#each pastEvents as event}
						<EventCard {event} />
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
