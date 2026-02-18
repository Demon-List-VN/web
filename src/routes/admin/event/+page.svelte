<script lang="ts">
	import Title from '$lib/components/Title.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import * as Alert from '$lib/components/ui/alert';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';
	import { upload } from '$lib/client/storage';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import BasicInfoTab from './basicInfoTab.svelte';
	import ContestTab from './contestTab.svelte';
	import ProofsTab from './proofsTab.svelte';
	import QuestsTab from './questsTab.svelte';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	enum State {
		DEFAULT,
		NO_EVENT,
		NEW_EVENT,
		EDIT_EVENT
	}

	let state = 0;
	let levels: any[] = [];
	let proofs: any[] = [];
	let event = {
		id: NaN,
		created_at: '',
		start: '',
		end: '',
		title: '',
		description: '',
		imgUrl: '',
		exp: NaN,
		content: '',
		redirect: null,
		minExp: 0,
		needProof: false,
		isSupporterOnly: false,
		isContest: false,
		hidden: false,
		freeze: '',
		isExternal: false,
		data: null,
		isRanked: false,
		isCalculated: false,
		priority: 0,
		type: ''
	};

	function convertTime(x: string) {
		if (!x) {
			return '';
		}

		const d = new Date(x);
		d.setMinutes(d.getMinutes() - d.getTimezoneOffset());

		return d.toISOString().slice(0, 16);
	}

	async function fetchEvent() {
		if (!event.id) {
			state = State.NEW_EVENT;
			return;
		}

		try {
			event = await (await fetch(`${import.meta.env.VITE_API_URL}/events/${event.id}`)).json();
			state = State.EDIT_EVENT;

			event.start = convertTime(event.start);
			event.end = convertTime(event.end);
			event.createdAt = convertTime(event.createdAt);
			event.freeze = convertTime(event.freeze);

			if (event.isContest) {
				await fetchLevels();
			}

			if (event.needProof) {
				await fetchProofs();
			}
		} catch (e) {
			state = State.NO_EVENT;
		}
	}
	function validate() {
		const missing: string[] = [];

		if (!event.title || String(event.title).trim() === '') {
			missing.push('Title');
		}

		if (!event.description || String(event.description).trim() === '') {
			missing.push('Description');
		}

		const minExpRaw: any = event.minExp;

		if (minExpRaw === '' || minExpRaw === null || minExpRaw === undefined) {
			missing.push('Min EXP');
		} else if (isNaN(Number(minExpRaw))) {
			throw new Error('Min EXP must be a number');
		}

		const priorityRaw: any = event.priority;

		if (priorityRaw === '' || priorityRaw === null || priorityRaw === undefined) {
			missing.push('Priority');
		} else if (isNaN(Number(priorityRaw))) {
			throw new Error('Priority must be a number');
		}

		if (missing.length) {
			throw new Error(`Missing required fields: ${missing.join(', ')}`);
		}

		if (event.data && typeof event.data === 'string') {
			try {
				event.data = JSON.parse(event.data);
			} catch (e) {
				throw new Error('Data must be valid JSON');
			}
		}

		event.minExp = Number(event.minExp);
		event.priority = Number(event.priority);

		if (event.exp !== undefined && event.exp !== null) {
			event.exp = Number(event.exp);
		}

		if (event.createdAt) {
			event.createdAt = new Date(event.createdAt).toISOString();
		} else {
			// @ts-ignore
			delete event.createdAt;
		}

		if (event.start) {
			event.start = new Date(event.start).toISOString();
		} else {
			// @ts-ignore
			delete event.start;
		}

		if (event.end) {
			event.end = new Date(event.end).toISOString();
		} else {
			// @ts-ignore
			delete event.end;
		}

		if (event.freeze) {
			event.freeze = new Date(event.freeze).toISOString();
		} else {
			// @ts-ignore
			delete event.freeze;
		}

		if(!event.id) {
			// @ts-ignore
			delete event.id
		}
	}

	async function addEvent() {
		if (!confirm(`Add ${event.title} event?`)) {
			return;
		}

		try {
			validate();
		} catch (err: any) {
			toast.error(err.message);
			return;
		}

		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/events`, {
				method: 'POST',
				body: JSON.stringify(event),
				headers: {
					Authorization: 'Bearer ' + (await $user.token()),
					'Content-Type': 'application/json'
				}
			}),
			{
				success: () => {
					window.location.reload();

					return 'Event added!';
				},
				loading: 'Adding...',
				error: 'Failed to add'
			}
		);
	}

	async function editEvent() {
		if (!confirm(`Edit ${event.title} event?`)) {
			return;
		}

		try {
			validate();
		} catch (err: any) {
			toast.error(err.message);
			return;
		}

		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/events/${event.id}`, {
				method: 'PATCH',
				body: JSON.stringify(event),
				headers: {
					Authorization: 'Bearer ' + (await $user.token()),
					'Content-Type': 'application/json'
				}
			}),
			{
				success: () => {
					window.location.reload();

					return 'Event edited!';
				},
				loading: 'Editing...',
				error: 'Failed to edit'
			}
		);
	}

	async function handleUpload(e: any) {
		const file: File | null = e.target.files[0];

		if (!file) {
			return;
		}

		const MAX_BYTES = 200 * 1024;

		if (file.size > MAX_BYTES) {
			toast.error('File must be 200 KB or smaller');

			try {
				e.target.value = '';
			} catch {}
			return;
		}

		if (!event.id) {
			toast.error('Event ID is required to upload');
			return;
		}

		const fileToUpload = new File([file], `${event.id}.webp`, {
			type: 'image/webp'
		});

		toast.promise(upload(`event-banner/${event.id}.webp`, fileToUpload, (await $user.token())!), {
			success: () => {
				window.location.reload();
				return 'Uploaded!';
			},
			loading: 'Uploading...',
			error: 'Failed to upload'
		});
	}

	async function fetchLevels() {
		levels = await (
			await fetch(`${import.meta.env.VITE_API_URL}/events/${event.id}/levels`, {
				method: 'GET',
				headers: {
					Authorization: 'Bearer ' + (await $user.token())
				}
			})
		).json();
	}

	async function fetchProofs() {
		proofs = await (
			await fetch(`${import.meta.env.VITE_API_URL}/events/${event.id}/proofs?accepted=all`, {
				method: 'GET',
				headers: {
					Authorization: 'Bearer ' + (await $user.token())
				}
			})
		).json();
	}

	async function acceptProof(userid: string) {
		if (!confirm('Accept this proof?')) {
			return;
		}

		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/events/${event.id}/proofs/${userid}`, {
				method: 'PATCH',
				body: JSON.stringify({ accepted: true }),
				headers: {
					Authorization: 'Bearer ' + (await $user.token()),
					'Content-Type': 'application/json'
				}
			}),
			{
				success: () => {
					fetchProofs();
					return 'Proof accepted!';
				},
				loading: 'Accepting...',
				error: 'Failed to accept'
			}
		);
	}

	async function rejectProof(userid: string) {
		if (!confirm('Reject this proof?')) {
			return;
		}

		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/events/${event.id}/proofs/${userid}`, {
				method: 'PATCH',
				body: JSON.stringify({ accepted: false }),
				headers: {
					Authorization: 'Bearer ' + (await $user.token()),
					'Content-Type': 'application/json'
				}
			}),
			{
				success: () => {
					fetchProofs();
					return 'Proof rejected!';
				},
				loading: 'Rejecting...',
				error: 'Failed to reject'
			}
		);
	}

	function exportToCSV() {
		const headers = ['Created At', 'Player Name', 'Player ID', 'Content', 'Accepted', 'Data', 'Diff'];
		const rows = proofs.map((proof) => [
			new Date(proof.createdAt).toLocaleString(),
			proof.players?.name || 'Unknown',
			proof.userid,
			proof.content,
			proof.accepted ? 'Yes' : 'No',
			proof.data ? JSON.stringify(proof.data) : '',
			proof.diff || ''
		]);

		const csvContent = [
			headers.join(','),
			...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
		].join('\n');

		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement('a');
		const url = URL.createObjectURL(blob);
		link.setAttribute('href', url);
		link.setAttribute('download', `event_${event.id}_proofs.csv`);
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		toast.success('CSV exported!');
	}

	onMount(() => {
		const id = $page.url.searchParams.get('id');

		if (id) {
			event.id = Number(id);
			fetchEvent();
		}
	});
</script>

<Title value="Event manager" />

<div class="wrapper">
	<div class="input">
		<Label for="id" class="w-[100px]">Event's ID</Label>
		<Input
			bind:value={event.id}
			placeholder="Leave blank for new event"
			id="id"
			type="number"
			inputmode="numeric"
			class="w-[300px]"
		/>
		<Button on:click={fetchEvent}>Fetch</Button>
	</div>

	{#if state == State.NO_EVENT}
		<Alert.Root class="w-[500px]">
			<Alert.Title>Attention!</Alert.Title>
			<Alert.Description>No event found</Alert.Description>
		</Alert.Root>
	{:else if state == State.NEW_EVENT}
		<Alert.Root class="w-[500px]">
			<Alert.Title>Attention!</Alert.Title>
			<Alert.Description>Creating new event</Alert.Description>
		</Alert.Root>
	{/if}
	{#if state == State.NEW_EVENT || state == State.EDIT_EVENT}
		<Tabs.Root value="basic">
			<Tabs.List>
				<Tabs.Trigger value="basic">Basic info</Tabs.Trigger>
				<Tabs.Trigger value="contest">Contest</Tabs.Trigger>
				<Tabs.Trigger value="proofs">Proofs</Tabs.Trigger>
				<Tabs.Trigger value="quests">Quests</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="basic">
				<BasicInfoTab {event} {state} {addEvent} {editEvent} {handleUpload} />
			</Tabs.Content>
			<Tabs.Content value="contest">
				<ContestTab {event} {levels} {editEvent} />
			</Tabs.Content>
			<Tabs.Content value="proofs">
				<ProofsTab {event} {proofs} {fetchProofs} {acceptProof} {rejectProof} {exportToCSV} />
			</Tabs.Content>
			<Tabs.Content value="quests">
				<QuestsTab {event} />
			</Tabs.Content>
		</Tabs.Root>
	{/if}
</div>

<style lang="scss">
	.wrapper {
		padding-inline: 75px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.input {
		display: flex;
		align-items: center;
		gap: 10px;
	}
</style>
