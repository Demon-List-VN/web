<script lang="ts">
	import RecordDetail from '$lib/components/recordDetail.svelte';
	import ListSelector, { type ListSelectorOption } from '$lib/components/listSelector.svelte';
	import Title from '$lib/components/Title.svelte';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import CrossCircled from 'svelte-radix/CrossCircled.svelte';
	import CheckCircled from 'svelte-radix/CheckCircled.svelte';
	import type { PageData } from './$types';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';

	export let data: PageData;

	const listSearchUrl = `${import.meta.env.VITE_API_URL}/lists`;

	let isOpen = false;
	let userID: string, levelID: number, recordID: number | null = null;
	let selectedListId: number | null = null;
	let records: any[] = data.data || [];
	let recordsLoading = false;

	$: listOptions = getListOptions(data.lists || [], records);

	function getTimeString(ms: number) {
		const minutes = Math.floor(ms / 60000);
		const seconds = Math.floor((ms % 60000) / 1000);
		const milliseconds = ms % 1000;

		return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds}`;
	}

	function getRecordLists(record: any) {
		return Array.isArray(record?.lists) ? record.lists : [];
	}

	function toListOption(list: any): ListSelectorOption | null {
		const id = Number(list?.id);
		const title = typeof list?.title === 'string' ? list.title.trim() : '';

		if (!Number.isFinite(id) || !title) {
			return null;
		}

		return {
			id,
			title,
			identifier: typeof list.slug === 'string' ? list.slug : null,
			subtitle: list.isOfficial ? 'Official' : list.isVerified ? 'Verified' : null
		};
	}

	function getListOptions(lists: any[], records: any[]) {
		const optionsById = new Map<number, ListSelectorOption>();

		for (const list of lists) {
			const option = toListOption(list);

			if (option) {
				optionsById.set(option.id, option);
			}
		}

		for (const record of records) {
			for (const list of getRecordLists(record)) {
				const option = toListOption(list);

				if (option && !optionsById.has(option.id)) {
					optionsById.set(option.id, option);
				}
			}
		}

		return [...optionsById.values()].sort((left, right) => left.title.localeCompare(right.title));
	}

	function handleListSelection(event: CustomEvent<ListSelectorOption | null>) {
		selectedListId = event.detail?.id ?? null;
		void loadRecords(selectedListId);
	}

	function getListHref(list: any) {
		return `/lists/${list.slug || list.id}`;
	}

	async function loadRecords(listId: number | null) {
		recordsLoading = true;
		const query = new URLSearchParams({
			end: '500',
			isChecked: 'false'
		});

		if (listId !== null) {
			query.set('listId', String(listId));
		}

		try {
			const response = await fetch(`${import.meta.env.VITE_API_URL}/records?${query.toString()}`);

			if (!response.ok) {
				throw new Error(response.statusText);
			}

			records = await response.json();
		} catch {
			toast.error('Failed to load submissions');
			records = [];
		} finally {
			recordsLoading = false;
		}
	}

	function handleAcceptClick(event: MouseEvent, record: any) {
		event.stopPropagation();
		void accept(record);
	}

	function handleRejectClick(event: MouseEvent, record: any) {
		event.stopPropagation();
		void reject(record);
	}

	async function accept(record: any) {
		const level = record.levels;
		const player = record.players;

		if (!confirm('Accept this record?')) {
			return;
		}

		toast.loading('Submitting verdict... This page will be refreshed.');

		await fetch(`${import.meta.env.VITE_API_URL}/records`, {
			method: 'PUT',
			body: JSON.stringify({
				id: record.id,
				userid: player.uid,
				levelid: level.id,
				acceptedManually: true,
				isChecked: true,
				needMod: false,
				queueNo: null
			}),
			headers: {
				Authorization: `Bearer ${await $user.token()}`,
				'Content-Type': 'application/json'
			}
		});

		await fetch(`${import.meta.env.VITE_API_URL}/notifications`, {
			method: 'POST',
			body: JSON.stringify({
				to: player.uid,
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

	async function reject(record: any) {
		const level = record.levels;
		const player = record.players;
		const reason = prompt('Reason for rejection');

		if (!confirm('Reject this record?')) {
			return;
		}

		toast.loading('Submitting verdict... This page will be refreshed.');
		const recordQuery = record.id ? `?id=${record.id}` : '';

		await fetch(`${import.meta.env.VITE_API_URL}/records/${player.uid}/${level.id}${recordQuery}`, {
			method: 'DELETE',
			headers: {
				Authorization: `Bearer ${await $user.token()}`
			}
		});

		await fetch(`${import.meta.env.VITE_API_URL}/notifications`, {
			method: 'POST',
			body: JSON.stringify({
				to: player.uid,
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
</script>

<RecordDetail bind:open={isOpen} uid={userID} {levelID} recordId={recordID} />

<Title value="Submission" />

<div class="wrapper">
	<div class="filterBar">
		<div class="filterField">
			<Label for="submission-list-filter">List</Label>
			<ListSelector
				id="submission-list-filter"
				selectedId={selectedListId}
				options={listOptions}
				searchUrl={listSearchUrl}
				placeholder="All lists"
				searchPlaceholder="Search lists..."
				emptyLabel="No lists found"
				loadingLabel="Loading..."
				allowClear
				clearLabel="All lists"
				triggerClass="min-w-[260px]"
				on:select={handleListSelection}
			/>
		</div>
	</div>
	<Table.Root>
		<Table.Caption>Total record: {records.length}{recordsLoading ? ' (loading...)' : ''}</Table.Caption>
		<Table.Header>
			<Table.Row>
				<Table.Head class="w-[80px] text-center">Queue</Table.Head>
				<Table.Head>Level</Table.Head>
				<Table.Head>Lists</Table.Head>
				<Table.Head class="w-[100px] text-center">Submitted by</Table.Head>
				<Table.Head class="w-[100px] text-center">Device</Table.Head>
				<Table.Head class="w-[80px] text-center">Progress</Table.Head>
				<Table.Head class="w-[80px] text-center">Time</Table.Head>
				<Table.Head class="w-[0px] text-center"></Table.Head>
				<Table.Head class="w-[0px] text-center"></Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each records as record (record.id)}
				<Table.Row
					on:click={(e) => {
						// @ts-expect-error
						if (e.target.nodeName != 'TD') {
							return;
						}

						userID = record.players.uid;
						levelID = record.levels.id;
						recordID = record.id ?? null;
						isOpen = true;
					}}
				>
					<Table.Cell class="text-center">{record.queueNo ? `#${record.queueNo}` : '-'}</Table.Cell>
					<Table.Cell class="font-medium">
						<a href={`/level/${record.levels.id}`} data-sveltekit-preload-data="tap">
							{record.levels.name}
						</a>
					</Table.Cell>
					<Table.Cell>
						{#if getRecordLists(record).length}
							<div class="listBadges">
								{#each getRecordLists(record).slice(0, 3) as list (list.id)}
									<a class="listBadge" href={getListHref(list)}>{list.title}</a>
								{/each}
								{#if getRecordLists(record).length > 3}
									<span class="listBadge muted">+{getRecordLists(record).length - 3}</span>
								{/if}
							</div>
						{:else}
							<span class="text-muted-foreground">No list</span>
						{/if}
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
						<Button variant="ghost" size="icon" on:click={(event) => handleAcceptClick(event, record)}>
							<CheckCircled size={20} />
						</Button>
					</Table.Cell>
					<Table.Cell class="text-center">
						<Button variant="ghost" size="icon" on:click={(event) => handleRejectClick(event, record)}>
							<CrossCircled size={20} />
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

	.filterBar {
		display: flex;
		align-items: flex-end;
		gap: 12px;
		margin-bottom: 16px;
	}

	.filterField {
		display: grid;
		gap: 6px;
		width: min(360px, 100%);
	}

	.listBadges {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.listBadge {
		display: inline-flex;
		max-width: 180px;
		align-items: center;
		border-radius: 6px;
		border: 1px solid hsl(var(--border));
		padding: 2px 8px;
		font-size: 12px;
		line-height: 1.5;
		color: hsl(var(--foreground));
		text-decoration: none;
	}

	.listBadge:not(.muted) {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.listBadge.muted {
		color: hsl(var(--muted-foreground));
	}

	@media screen and (max-width: 900px) {
		.wrapper {
			padding-inline: 10px;
		}
	}
</style>
