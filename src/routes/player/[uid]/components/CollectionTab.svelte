<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs';
	import MedalsTab from '../tabs/MedalsTab.svelte';
	import CardCollectionTab from '../tabs/CardCollectionTab.svelte';
	import EventTab from '../tabs/EventsTab.svelte';
	import { _ } from 'svelte-i18n';

	export let userID: string;
	export let data: any;
</script>

<Tabs.Root value="medals">
	<div class="flex flex-col items-center gap-3">
		<Tabs.List class="flex h-fit w-fit flex-wrap">
			<Tabs.Trigger value="medals">{$_('player.tabs.medals')}</Tabs.Trigger>
			<Tabs.Trigger value="cards">{$_('player.tabs.cards')}</Tabs.Trigger>
			<Tabs.Trigger value="events">{$_('player.tabs.events')}</Tabs.Trigger>
		</Tabs.List>
		<Tabs.Content value="medals" class="w-full">
			<MedalsTab {userID} />
		</Tabs.Content>
		<Tabs.Content value="cards" class="w-full">
			<CardCollectionTab {userID} />
		</Tabs.Content>
		<Tabs.Content value="events" class="w-full">
			<EventTab {data} />
		</Tabs.Content>
	</div>
</Tabs.Root>
