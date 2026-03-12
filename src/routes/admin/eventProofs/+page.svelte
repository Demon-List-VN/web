<script lang="ts">
	import * as sdk from '$lib/client/sdk';
	import Title from '$lib/components/Title.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import CrossCircled from 'svelte-radix/CrossCircled.svelte';
	import CheckCircled from 'svelte-radix/CheckCircled.svelte';
	import type { PageData } from './$types';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';

	async function accept(item: any) {
		const data = structuredClone(item);
		delete data.players;
		delete data.events;
		data.accepted = true;

		toast.loading('Submitting verdict... This page will be refreshed');

		await sdk.fetch(`/events/proofs`, {
			method: 'PUT',
			headers: {
				Authorization: 'Bearer ' + (await $user.token())!,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(data)
		});

		await sdk.fetch(`/notifications`, {
			method: 'POST',
			body: JSON.stringify({
				to: item.players.uid,
				status: 1,
				content: `${item.events.title} event's reward claimed!`
			}),
			headers: {
				Authorization: `Bearer ${await $user.token()}`,
				'Content-Type': 'application/json'
			}
		});

		window.location.reload();
	}

	async function reject(item: any) {
		const reason = prompt('Reason for rejection');

		if (!reason) {
			return;
		}

		toast.loading('Submitting verdict... This page will be refreshed');

		await sdk.fetch(`/events/${item.eventID}/proofs/${item.players.uid}`, {
			method: 'DELETE',
			headers: {
				Authorization: 'Bearer ' + (await $user.token())!
			}
		});

		await sdk.fetch(`/notifications`, {
			method: 'POST',
			body: JSON.stringify({
				to: item.players.uid,
				status: 2,
				content: `${item.events.title} event's reward claim request rejected. Reason: ${reason}`
			}),
			headers: {
				Authorization: `Bearer ${await $user.token()}`,
				'Content-Type': 'application/json'
			}
		});

		window.location.reload();
	}

	export let data: PageData;
</script>

<Title value="Event proofs" />

<div class="wrapper">
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head class="w-[150px]">Event</Table.Head>
				<Table.Head class="w-[150px]">Player</Table.Head>
				<Table.Head>Content</Table.Head>
				<Table.Head class="w-[50px]"></Table.Head>
				<Table.Head class="w-[50px]"></Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each data.data as item}
				<Table.Row>
					<Table.Cell class="font-medium">
						<a href={`/event/${item.events.id}`}>
							{item.events.title}
						</a>
					</Table.Cell>
					<Table.Cell>
						<a href={`/player/${item.players.uid}`}>
							{item.players.name}
						</a>
					</Table.Cell>
					<Table.Cell>{item.content}</Table.Cell>
					<Table.Cell>
						<Button variant="icon" on:click={() => reject(item)}>
							<CrossCircled size={20} />
						</Button>
					</Table.Cell>
					<Table.Cell>
						<Button variant="icon" on:click={() => accept(item)}>
							<CheckCircled size={20} />
						</Button>
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</div>

<style lang="scss">
	.wrapper {
		padding-inline: 50px;
	}

	@media screen and (max-width: 900px) {
		.wrapper {
			padding-inline: 10px;
		}
	}
</style>
