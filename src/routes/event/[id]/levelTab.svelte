<script lang="ts">
	import * as sdk from '$lib/client/sdk';
	import { onMount } from 'svelte';
	import LevelCard from './levelCard.svelte';
	import type { Level } from './type';
	import { user } from '$lib/client';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { ExclamationTriangle } from 'svelte-radix';
	import { isActive } from '$lib/client/isSupporterActive';
	import { _ } from 'svelte-i18n';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Reload } from 'svelte-radix';

	export let levels: (Level | null)[];
	export let event: any;
	export let refresh: () => void;
	let records: any[] = [];
	let showDeathCount: boolean = true;

	async function fetchRecord() {
		if (!$user.loggedIn) {
			return;
		}

		records = await (
			await sdk.eventsApi.byId(event.id).submissions.request({
				method: 'GET',
				headers: {
					Authorization: 'Bearer ' + (await $user.token())
				}
			})
		).json();
	}

	onMount(async () => {
		// await fetchRecord();
		// user.subscribe((value) => {
		// 	fetchRecord();
		// });
	});
</script>

<div class="ml-auto mr-auto flex w-[1000px] max-w-full flex-col gap-[10px]">
	<div class="flex items-center justify-center gap-[20px] rounded-lg border p-3">
		<div class="flex items-center gap-2">
			<Button class="w-fit" variant="outline" on:click={() => refresh()}>
				<Reload size={16} />
			</Button>
		</div>
		<div class="flex items-center gap-2">
			<Switch id="death-count-toggle" bind:checked={showDeathCount} />
			<Label for="death-count-toggle" class="cursor-pointer">
				{$_('contest.show_death_count')}
			</Label>
		</div>
	</div>

	{#if $user.loggedIn && !$user.data.discord}
		<Alert.Root class="text-yellow-400">
			<Alert.Title class="flex items-center gap-[10px]">
				<ExclamationTriangle size={15} />
				{$_('contest.alerts.discord_required')}
			</Alert.Title>
		</Alert.Root>
	{/if}
	{#if event.isSupporterOnly && !isActive($user.data.supporterUntil)}
		<Alert.Root class="text-yellow-400">
			<Alert.Title class="flex items-center gap-[10px]">
				<ExclamationTriangle size={15} />
				{$_('contest.alerts.supporter_only')}
			</Alert.Title>
		</Alert.Root>
	{/if}

	{#key records}
		{#each levels as level, index}
			<LevelCard {level} {index} {event} {showDeathCount} type={event.type} />
		{/each}
	{/key}
</div>
