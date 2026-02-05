<script lang="ts">
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Calendar, Clock, Star } from 'svelte-radix';
	import { _ } from 'svelte-i18n';

	export let event: any;

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('vi-VN');
	}

	function formatTime(dateString: string) {
		return new Date(dateString).toLocaleTimeString('vi-VN', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function isMultiDayEvent(start: string, end: string) {
		const startDate = new Date(start).toDateString();
		const endDate = new Date(end).toDateString();
		return startDate !== endDate;
	}
</script>

<a href={`/event/${event.id}`}>
	<Card class="w-full">
		<CardHeader>
			<div class="flex items-start justify-between">
				<div class="flex-1">
					<CardTitle class="text-lg">{event.title}</CardTitle>
					<CardDescription class="mt-1">{event.description}</CardDescription>
				</div>
				<div class="ml-2 flex flex-col gap-1">
					{#if event.isContest}
						<Badge
							variant="default"
							class="flex w-[90px] justify-center hover:bg-primary hover:text-primary-foreground"
						>
							{$_('events.contest')}
						</Badge>
					{/if}
					{#if event.isSupporterOnly}
						<Badge variant="secondary" class="flex w-[90px] justify-center">
							<Star class="mr-1 h-3 w-3" />
							Supporter
						</Badge>
					{/if}
					{#if event.isRanked}
						<Badge variant="outline" class="flex w-[90px] justify-center"
							>{$_('events.ranked')}</Badge
						>
					{/if}
				</div>
			</div>
		</CardHeader>
		<CardContent>
			<div class="mb-4">
				<img
					src={event.imgUrl || `https://cdn.gdvn.net/event-banner/${event.id}.webp`}
					alt={event.title}
					class="aspect-[4/1] w-full rounded-md object-cover"
					loading="lazy"
				/>
			</div>
			{#if event.end}
				<div class="space-y-2 text-sm text-foreground/80">
					<div class="flex items-center gap-2">
						<Calendar class="h-4 w-4" />
						{#if isMultiDayEvent(event.start, event.end)}
							<span>{formatDate(event.start)} - {formatDate(event.end)}</span>
						{:else}
							<span>{formatDate(event.start)}</span>
						{/if}
					</div>
					<div class="flex items-center gap-2">
						<Clock class="h-4 w-4" />
						<span>{formatTime(event.start)} - {formatTime(event.end)}</span>
					</div>
					{#if event.minExp > 0}
						<div class="text-sm text-foreground/70">
							Minimum EXP: <span class="font-medium">{event.minExp}</span>
						</div>
					{/if}
				</div>
			{/if}
		</CardContent>
	</Card>
</a>
