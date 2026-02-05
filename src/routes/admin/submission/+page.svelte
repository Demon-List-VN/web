<script lang="ts">
	import RecordDetail from '$lib/components/recordDetail.svelte';
	import Title from '$lib/components/Title.svelte';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select';
	import CrossCircled from 'svelte-radix/CrossCircled.svelte';
	import CheckCircled from 'svelte-radix/CheckCircled.svelte';
	import type { PageData } from './$types';
	import { user } from '$lib/client';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	export let data: PageData;

	let originalData: PageData = {
		data: []
	};
	let isOpen = false;
	let userID: string, levelID: number;

	function getTimeString(ms: number) {
		const minutes = Math.floor(ms / 60000);
		const seconds = Math.floor((ms % 60000) / 1000);
		const milliseconds = ms % 1000;

		return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds}`;
	}

	async function accept(userID: string, level: any) {
		if (!confirm('Accept this record?')) {
			return;
		}

		toast.loading('Submitting verdict... This page will be refreshed.');

		await fetch(`${import.meta.env.VITE_API_URL}/records`, {
			method: 'PUT',
			body: JSON.stringify({
				userid: userID,
				levelid: level.id,
				isChecked: true
			}),
			headers: {
				Authorization: `Bearer ${await $user.token()}`,
				'Content-Type': 'application/json'
			}
		});

		await fetch(`${import.meta.env.VITE_API_URL}/notifications`, {
			method: 'POST',
			body: JSON.stringify({
				to: userID,
				status: 1,
				content: `Your ${level.name} (${level.id}) submission has been accepted by a moderator`
			}),
			headers: {
				Authorization: `Bearer ${await $user.token()}`,
				'Content-Type': 'application/json'
			}
		});

		window.location.reload();
	}

	async function reject(userID: string, level: any) {
		const reason = prompt('Reason for rejection');

		if (!confirm('Reject this record?')) {
			return;
		}

		toast.loading('Submitting verdict... This page will be refreshed.');

		await fetch(`${import.meta.env.VITE_API_URL}/records/${userID}/${level.id}`, {
			method: 'DELETE',
			headers: {
				Authorization: `Bearer ${await $user.token()}`
			}
		});

		await fetch(`${import.meta.env.VITE_API_URL}/notifications`, {
			method: 'POST',
			body: JSON.stringify({
				to: userID,
				status: 2,
				content: `Your ${level.name} (${level.id}) submission has been rejected by a moderator. Reason: ${reason}`
			}),
			headers: {
				Authorization: `Bearer ${await $user.token()}`,
				'Content-Type': 'application/json'
			}
		});

		window.location.reload();
	}

	function filter(value: string) {
		let filtered: PageData = {
			data: []
		};

		if (value == 'all') {
			filtered = originalData;
		} else if (value == 'needMod') {
			for (const i of originalData.data) {
				if (i.needMod) {
					filtered.data.push(i);
				}
			}
		} else if (value == 'dl') {
			for (const i of originalData.data) {
				if (i.levels.rating && !i.levels.isChallenge) {
					filtered.data.push(i);
				}
			}
		} else if (value == 'pl') {
			for (const i of originalData.data) {
				if (i.levels.isPlatformer) {
					filtered.data.push(i);
				}
			}
		} else if (value == 'fl') {
			for (const i of originalData.data) {
				if (i.levels.flPt) {
					filtered.data.push(i);
				}
			}
		} else if (value == 'cl') {
			for (const i of originalData.data) {
				if (i.levels.isChallenge) {
					filtered.data.push(i);
				}
			}
		} else if (value == 'newLevel') {
			for (const i of originalData.data) {
				if (!i.levels.flPt && !i.levels.rating && !i.levels.isChallenge) {
					filtered.data.push(i);
				}
			}
		}

		data = filtered;
	}

	onMount(() => {
		originalData = structuredClone(data);
	});
</script>

<RecordDetail bind:open={isOpen} uid={userID} {levelID} />

<Title value="Submission" />

<div class="wrapper">
	<div class="flex items-center gap-[5px]">
		<Label>Filter</Label>
		<Select.Root
			onSelectedChange={(e) => {
				if (!e) {
					return;
				}

				filter(e.value);
			}}
			selected={{
				label: 'All',
				value: 'all'
			}}
		>
			<Select.Trigger class="w-[250px]">
				<Select.Value />
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="all">All</Select.Item>
				<Select.Item value="needMod">Need further inspection</Select.Item>
				<Select.Item value="newLevel">New level</Select.Item>
				<Select.Item value="dl">Classic</Select.Item>
				<Select.Item value="pl">Platformer</Select.Item>
				<Select.Item value="fl">Featured</Select.Item>
				<Select.Item value="cl">Challenge</Select.Item>
			</Select.Content>
		</Select.Root>
	</div>
	<Table.Root>
		<Table.Caption>Total record: {data.data.length}</Table.Caption>
		<Table.Header>
			<Table.Row>
				<Table.Head>Level</Table.Head>
				<Table.Head class="w-[100px] text-center">Submitted by</Table.Head>
				<Table.Head class="w-[100px] text-center">Device</Table.Head>
				<Table.Head class="w-[80px] text-center">Progress</Table.Head>
				<Table.Head class="w-[80px] text-center">Time</Table.Head>
				<Table.Head class="w-[0px] text-center"></Table.Head>
				<Table.Head class="w-[0px] text-center"></Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each data.data as record}
				<Table.Row
					on:click={(e) => {
						// @ts-ignore
						if (e.target.nodeName != 'TD') {
							return;
						}

						userID = record.players.uid;
						levelID = record.levels.id;
						isOpen = true;
					}}
				>
					<Table.Cell class="font-medium">
						<a href={`/level/${record.levels.id}`} data-sveltekit-preload-data="tap">
							{record.levels.name}
						</a>
					</Table.Cell>
					<Table.Cell class="text-center"
						><a href={`/player/${record.players.uid}`}>{record.players.name}</a></Table.Cell
					>
					<Table.Cell class="text-center">
						{record.mobile ? 'Mobile' : 'PC'}
						{#if record.refreshRate}
							<br />({record.refreshRate}fps)
						{/if}
					</Table.Cell>
					<Table.Cell class="text-center"
						>{!record.levels.isPlatformer ? `${record.progress}%` : '-'}</Table.Cell
					>
					<Table.Cell class="text-center"
						>{record.levels.isPlatformer ? getTimeString(record.progress) : '-'}</Table.Cell
					>
					<Table.Cell class="text-center">
						<button
							on:click={() => {
								accept(record.players.uid, record.levels);
							}}
						>
							<Button variant="icon">
								<CheckCircled size={20} />
							</Button>
						</button>
					</Table.Cell>
					<Table.Cell class="text-center">
						<button
							on:click={() => {
								reject(record.players.uid, record.levels);
							}}
						>
							<Button variant="icon">
								<CrossCircled size={20} />
							</Button>
						</button>
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
