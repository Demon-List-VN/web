<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Switch } from '$lib/components/ui/switch';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import LockClosed from 'svelte-radix/LockClosed.svelte';
	import Globe from 'svelte-radix/Globe.svelte';
	import Person from 'svelte-radix/Person.svelte';
	import CrossCircled from 'svelte-radix/CrossCircled.svelte';
	import StarFilled from 'svelte-radix/StarFilled.svelte';
	import type { PageData } from './$types';
	import PlayerHoverCard from '$lib/components/playerLink.svelte';
	import RecordDetail from '$lib/components/recordDetail.svelte';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import imageCompression from 'browser-image-compression';
	import { fade } from 'svelte/transition';
	import * as ContextMenu from '$lib/components/ui/context-menu';
	import Ads from '$lib/components/ads.svelte';
	import { upload } from '$lib/client/storage';
	import InviteButton from './inviteButton.svelte';
	import BoostButton from './boostButton.svelte';
	import Markdown from '$lib/components/markdown.svelte';
	import { isActive } from '$lib/client/isSupporterActive';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import Levels from './levels.svelte';
	import { _ } from 'svelte-i18n';

	export let data: PageData;
	let editedData = structuredClone(data);
	let transferUID = '';
	let currentTab: string = isActive(data.boostedUntil) && data.homeContent ? 'home' : 'members';
	let members: any[] = [];
	let records: any[] = [];
	let invitations: any[] = [];
	let membersFilter: any = {
		start: 0,
		end: 49,
		sortBy: 'name',
		ascending: true
	};
	let recordsFilter: any = {
		start: 0,
		end: 49,
		sortBy: 'timestamp',
		ascending: false
	};
	let appliedMembersFilter = structuredClone(membersFilter);
	let appliedRecordsFilter = structuredClone(recordsFilter);
	let opened = false;
	let uid: string, levelID: number;
	let fileinput: any;
	let membersState = 0;
	let recordsState = 0;
	let invitation: any = null;

	function fetchMembers(e: any, append = false) {
		membersState = 1;

		if (append) {
			if (membersState == 2) {
				return;
			}

			membersFilter.start = membersFilter.end + 1;
			membersFilter.end += 50;
		} else {
			membersFilter.start = 0;
			membersFilter.end += 49;
		}

		appliedMembersFilter = structuredClone(membersFilter);

		fetch(
			`${import.meta.env.VITE_API_URL}/clans/${$page.params.id}/members?${new URLSearchParams(membersFilter).toString()}`
		)
			.then((res) => res.json())
			.then((res: any) => {
				if (append) {
					members = members.concat(res);
				} else {
					members = res;
				}

				if (res.length) {
					membersState = 0;
				} else {
					membersState = 2;
				}
			});
	}

	function fetchRecords(e: any, append = false) {
		recordsState = 1;

		if (append) {
			if (recordsState == 2) {
				return;
			}

			recordsFilter.start = recordsFilter.end + 1;
			recordsFilter.end += 50;
		} else {
			recordsFilter.start = 0;
			recordsFilter.end = 49;
		}

		appliedRecordsFilter = structuredClone(recordsFilter);

		fetch(
			`${import.meta.env.VITE_API_URL}/clans/${$page.params.id}/records?${new URLSearchParams(recordsFilter).toString()}`
		)
			.then((res) => res.json())
			.then((res: any) => {
				if (append) {
					records = records.concat(res);
				} else {
					records = res;
				}

				if (res.length) {
					recordsState = 0;
				} else {
					recordsState = 2;
				}
			});
	}

	function fetchInvitations() {
		fetch(`${import.meta.env.VITE_API_URL}/clans/${$page.params.id}/invitations`)
			.then((res) => res.json())
			.then((res: any) => (invitations = res));
	}

	async function joinClan() {
		toast.loading('Joining clan...');
		fetch(`${import.meta.env.VITE_API_URL}/clans/${$page.params.id}/join`, {
			method: 'PUT',
			headers: {
				Authorization: 'Bearer ' + (await $user.token())
			}
		}).then((res) => window.location.reload());
	}

	async function leaveClan() {
		if (!confirm($_('toast.clan_leave.confirm'))) {
			return;
		}

		toast.loading($_('toast.clan_leave.loading'));

		fetch(`${import.meta.env.VITE_API_URL}/clans/leave`, {
			method: 'PUT',
			headers: {
				Authorization: 'Bearer ' + (await $user.token())
			}
		}).then((res) => window.location.reload());
	}

	async function updateClan() {
		delete editedData.id;
		delete editedData.created_at;
		delete editedData.players;
		delete editedData.boostedUntil;

		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/clans/${$page.params.id}`, {
				method: 'PATCH',
				headers: {
					Authorization: 'Bearer ' + (await $user.token()),
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(editedData)
			}),
			{
				success: () => {
					window.location.reload();
					return $_('toast.clan_update.success');
				},
				loading: $_('toast.clan_update.loading'),
				error: $_('toast.clan_update.error')
			}
		);
	}

	async function transferOwnership() {
		const tmp = editedData.owner;
		editedData.owner = transferUID;
		await updateClan();
		editedData.owner = tmp;
	}

	async function deleteClan() {
		if (!confirm($_('toast.clan_delete.confirm'))) {
			return;
		}

		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/clans/${$page.params.id}`, {
				method: 'DELETE',
				headers: {
					Authorization: 'Bearer ' + (await $user.token())
				}
			}),
			{
				success: () => {
					goto('/clans');
					$user.refresh();
					return $_('toast.clan_delete.success');
				},
				loading: $_('toast.clan_delete.loading'),
				error: $_('toast.clan_delete.error')
			}
		);
	}

	async function getImage(e: any) {
		let image = e.target.files[0];
		const options = {
			maxSizeMB: 0.5,
			maxWidthOrHeight: 480,
			useWebWorker: true
		};

		const cImg = await imageCompression(image, options);
		const handleUpload = async () => {
			delete editedData.id;
			delete editedData.created_at;
			delete editedData.players;
			delete editedData.boostedUntil;

			editedData.imageVersion++;

			await upload(`clan-photos/${$page.params.id}.jpg`, cImg, (await $user.token())!);
			await fetch(`${import.meta.env.VITE_API_URL}/clans/${$page.params.id}`, {
				method: 'PATCH',
				headers: {
					Authorization: 'Bearer ' + (await $user.token()),
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(editedData)
			});
		};
		toast.promise(handleUpload, {
			loading: $_('toast.player_edit.uploading'),
			success: $_('toast.player_edit.success'),
			error: $_('toast.player_edit.error')
		});
	}

	async function acceptInvitation(clanID: number) {
		fetch(`${import.meta.env.VITE_API_URL}/clans/${clanID}/invite`, {
			method: 'PATCH',
			headers: {
				Authorization: 'Bearer ' + (await $user.token())
			}
		}).then((res) => window.location.reload());
	}

	async function rejectInvitation(clanID: number) {
		fetch(`${import.meta.env.VITE_API_URL}/clans/${clanID}/invite`, {
			method: 'DELETE',
			headers: {
				Authorization: 'Bearer ' + (await $user.token())
			}
		}).then((res) => window.location.reload());
	}

	async function kickPlayer(player: any) {
		if (!confirm(`Kick ${player.name}?`)) {
			return;
		}

		fetch(`${import.meta.env.VITE_API_URL}/clans/${$page.params.id}/kick/${player.uid}`, {
			method: 'PATCH',
			headers: {
				Authorization: 'Bearer ' + (await $user.token())
			}
		}).then((res) => window.location.reload());
	}

	async function banPlayer(player: any) {
		if (!confirm(`Ban ${player.name}?`)) {
			return;
		}

		const reason = prompt('Reason for banning');

		if (!reason) {
			alert('Must provide a reason');
			return;
		}

		fetch(
			`${import.meta.env.VITE_API_URL}/clans/${$page.params.id}/ban/${player.uid}?reason=${reason}`,
			{
				method: 'POST',
				headers: {
					Authorization: 'Bearer ' + (await $user.token())
				}
			}
		).then((res) => window.location.reload());
	}

	async function revokeInvitation(uid: string) {
		if (!confirm('Revoke invitation?')) {
			return;
		}

		fetch(`${import.meta.env.VITE_API_URL}/clans/${$page.params.id}/invitation/${uid}`, {
			method: 'DELETE',
			headers: {
				Authorization: 'Bearer ' + (await $user.token())
			}
		}).then((res) => window.location.reload());
	}

	$: ($user,
		(() => {
			if ($user.loggedIn) {
				fetch(
					`${import.meta.env.VITE_API_URL}/clans/${$page.params.id}/invitation/${$user.data.uid}`
				)
					.then((res) => res.json())
					.then((res) => (invitation = res));
			}
		})());

	onMount(async () => {
		fetchMembers(null);
		fetchRecords(null);
		fetchInvitations();

		window.onscroll = function (ev) {
			if (window.innerHeight + window.pageYOffset >= document.body.offsetHeight - 1500) {
				if (currentTab == 'members' && membersState == 0) {
					fetchMembers(null, true);
				}

				if (currentTab == 'records' && recordsState == 0) {
					fetchRecords(null, true);
				}
			}
		};
	});
</script>

<svelte:head>
	<title>Hội {data.name} - Geometry Dash VN</title>
	<meta property="og:title" content={`Hội ${data.name} - Geometry Dash VN`} />
	<meta
		property="og:image"
		content={`https://cdn.gdvn.net/clan-photos/${$page.params.id}.jpg?version=${data.imageVersion}`}
	/>
</svelte:head>

<input
	style="display:none"
	type="file"
	accept=".jpg, .jpeg"
	on:change={(e) => getImage(e)}
	bind:this={fileinput}
/>
<RecordDetail {levelID} {uid} bind:open={opened} />

<div class="wrapper mt-[-50px] min-h-[100vh] pt-[85px]">
	{#if isActive(data.boostedUntil)}
		<div
			class="pageBackground"
			aria-hidden="true"
			style={`background-image: url(https://cdn.gdvn.net/clan-photos/${$page.params.id}.jpg?version=${data.imageVersion});`}
		/>
	{/if}
	<div class="leftWrapper">
		<div class="banner">
			<img
				in:fade={{ delay: 250, duration: 300 }}
				class="bg"
				src={`https://cdn.gdvn.net/clan-photos/${$page.params.id}.jpg?version=${data.imageVersion}`}
				alt="bg"
			/>
			<div class="bannerContentWrapper">
				<div class="bannerContent">
					<h3>{data.tag}</h3>
					<h2>{data.name}</h2>
					<div class="flex items-center gap-[5px]">
						{#if data.isPublic}
							<Globe size={20} /> {$_('clan.public')}
						{:else}
							<LockClosed size={20} /> {$_('clan.invite_only')}
						{/if}
					</div>
					<div class="flex items-center gap-[5px]">
						<StarFilled size={20} />
						<PlayerHoverCard player={data.players} />
					</div>
					<div class="flex items-center gap-[5px]">
						<Person size={20} />
						{#if data.memberLimit}
							{data.memberCount}/{data.memberLimit}
						{:else}
							{data.memberCount}/∞
						{/if}
					</div>
					{#if invitation}
						<p class="mb-[-10px] text-center">{$_('clan.invited')}</p>
					{/if}
					<div class="bannerBtn">
						{#if $user.loggedIn}
							{#if invitation}
								<Button
									class="w-full"
									on:click={() => {
										acceptInvitation(parseInt(String($page.params.id)));
									}}>{$_('general.accept')}</Button
								>
								<Button
									variant="outline"
									class="w-full"
									on:click={() => {
										rejectInvitation(parseInt(String($page.params.id)));
									}}>{$_('general.reject')}</Button
								>
							{:else if $user.data.clan == $page.params.id}
								{#if data.isPublic || data.owner == $user.data.uid}
									<InviteButton />
								{/if}
							{:else if data.isPublic && (data.memberCount < data.memberLimit || data.memberLimit == 0)}
								<Button variant="outline" class="w-full" on:click={joinClan}>Join</Button>
							{/if}

							<BoostButton {data} />
						{/if}
					</div>
					{#if new Date(data.boostedUntil) > new Date()}
						<p class="text-center text-sm text-gray-500">
							{$_('clan.boosted_until')}: {new Date(data.boostedUntil).toLocaleDateString('vi-vn')}
						</p>
					{/if}
				</div>
			</div>
		</div>
		{#if !isActive(data.boostedUntil)}
			<Ads dataAdFormat="vertical" />
		{/if}
	</div>

	<div class="content">
		<Tabs.Root bind:value={currentTab} class="flex w-[100%] flex-col items-center">
			<Tabs.List class="mb-[5px] w-fit">
				{#if isActive(data.boostedUntil)}
					<Tabs.Trigger value="home">{$_('clan.tabs.home')}</Tabs.Trigger>
					<Tabs.Trigger value="levels">{$_('clan.tabs.levels')}</Tabs.Trigger>
				{/if}
				<Tabs.Trigger value="records">{$_('clan.tabs.records')}</Tabs.Trigger>
				<Tabs.Trigger value="members">{$_('clan.tabs.members')}</Tabs.Trigger>
				{#if $user.loggedIn && $user.data.clan == $page.params.id}
					<Tabs.Trigger value="invitations">{$_('clan.tabs.invitations')}</Tabs.Trigger>
					<Tabs.Trigger value="settings">{$_('clan.tabs.settings')}</Tabs.Trigger>
				{/if}
			</Tabs.List>
			{#if isActive(data.boostedUntil)}
				<Tabs.Content value="home" class="w-full">
					{#if data.mode == 'markdown'}
						<Markdown content={data.homeContent} />
					{:else if data.mode == 'iframe'}
						<iframe
							class="h-[calc(100vh-180px)] w-full rounded-lg"
							src={data.homeContent}
							title="home"
						/>
					{/if}
				</Tabs.Content>
			{/if}
			<Tabs.Content value="levels" class="w-full">
				<Levels clan={data} />
			</Tabs.Content>
			<Tabs.Content value="members" class="w-full">
				<div class="filter">
					<div class="filterItem">
						<Label>{$_('general.sort_by')}</Label>
						<Select.Root
							selected={{
								label: 'A-Z',
								value: 'name'
							}}
							onSelectedChange={(e) => {
								membersFilter.sortBy = e?.value;
							}}
						>
							<Select.Trigger class="w-[200px]">
								<Select.Value placeholder="Select item to sort by" />
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="name">A-Z</Select.Item>
								<Select.Item value="rating">{$_('player_card.rating')}</Select.Item>
								<Select.Item value="totalFLpt">{$_('player_card.featured')}</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
					<div class="filterItem">
						<Label>{$_('general.ascending')}</Label>
						<Switch bind:checked={membersFilter.ascending} />
					</div>
					<Button variant="outline" on:click={fetchMembers}>{$_('general.apply')}</Button>
				</div>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="w-[50px]">No.</Table.Head>
							<Table.Head>Player</Table.Head>
							{#if appliedMembersFilter.sortBy == 'rating'}
								<Table.Head class="w-[100px] text-right">Classic Rating</Table.Head>
							{:else if appliedMembersFilter.sortBy == 'totalFLpt'}
								<Table.Head class="w-[100px] text-right">Total FL point</Table.Head>
							{:else}
								<Table.Head class="w-[100px] text-right">Rating</Table.Head>
								<Table.Head class="w-[80px] text-right">Total FL point</Table.Head>
							{/if}
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each members as item, index}
							<Table.Row>
								<Table.Cell class="font-medium">
									#{index + 1}
									{#if appliedMembersFilter.sortBy == 'rating'}
										({item.overallRank})
									{:else if appliedMembersFilter.sortBy == 'totalFLpt'}
										({item.flrank})
									{/if}
								</Table.Cell>
								<Table.Cell>
									{#if $user.loggedIn && $user.data.uid == data.owner}
										<ContextMenu.Root>
											<ContextMenu.Trigger>
												<PlayerHoverCard
													player={item}
													showTitle={appliedMembersFilter.sortBy == 'rating'}
												/>
											</ContextMenu.Trigger>
											<ContextMenu.Content>
												{#if item.uid != $user.data.uid}
													<ContextMenu.Item on:click={() => kickPlayer(item)}
														>Kick player</ContextMenu.Item
													>
													<!-- <ContextMenu.Item on:click={() => banPlayer(item)}
													>Ban player</ContextMenu.Item
												> -->
												{/if}
											</ContextMenu.Content>
										</ContextMenu.Root>
									{:else}
										<PlayerHoverCard
											player={item}
											showTitle={appliedMembersFilter.sortBy == 'rating'}
										/>
									{/if}
								</Table.Cell>
								{#if appliedMembersFilter.sortBy == 'rating'}
									<Table.Cell class="text-right">{item.rating}</Table.Cell>
								{:else if appliedMembersFilter.sortBy == 'totalFLpt'}
									<Table.Cell class="text-right">{item.totalFLpt}</Table.Cell>
								{:else}
									<Table.Cell class="text-right">{item.rating}</Table.Cell>
									<Table.Cell class="text-right">{item.totalFLpt}</Table.Cell>
								{/if}
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Tabs.Content>
			<Tabs.Content value="records" class="w-full">
				<div class="filter">
					<div class="filterItem">
						<Label>{$_('general.sort_by')}</Label>
						<Select.Root
							selected={{
								label: $_('clan.sort.timestamp'),
								value: 'timestamp'
							}}
							onSelectedChange={(e) => {
								recordsFilter.sortBy = e?.value;
							}}
						>
							<Select.Trigger class="w-[200px]">
								<Select.Value placeholder="Select item to sort by" />
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="timestamp" selected>{$_('clan.sort.timestamp')}</Select.Item>
								<Select.Item value="dlPt">{$_('clan.sort.dlPt')}</Select.Item>
								<Select.Item value="flPt">{$_('clan.sort.flPt')}</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
					<div class="filterItem">
						<Label>{$_('general.ascending')}</Label>
						<Switch bind:checked={recordsFilter.ascending} />
					</div>
					<Button variant="outline" on:click={fetchRecords}>{$_('general.apply')}</Button>
				</div>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="w-[50px]">No.</Table.Head>
							<Table.Head class="w-[200px]">Player</Table.Head>
							<Table.Head>Level</Table.Head>
							<Table.Head class="w-[100px] text-center">Submitted on</Table.Head>
							<Table.Head class="w-[100px] text-center">Device</Table.Head>
							<Table.Head class="w-[80px] text-center">Progress</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each records as item, index}
							<Table.Row
								on:click={(e) => {
									// @ts-ignore
									if (e.target.nodeName != 'TD') {
										return;
									}

									uid = item.players.uid;
									levelID = item.levels.id;
									opened = true;
								}}
							>
								<Table.Cell class="font-medium">
									#{index + 1}
								</Table.Cell>
								<Table.Cell>
									<PlayerHoverCard
										player={item.players}
										showTitle={appliedRecordsFilter.sortBy == 'dlPt'}
									/>
								</Table.Cell>
								<Table.Cell>
									<a href={`/level/${item.levels.id}`}>{item.levels.name}</a>
								</Table.Cell>
								<Table.Cell class="text-center">
									{new Date(item.timestamp).toLocaleString('vi-VN')}
								</Table.Cell>
								<Table.Cell class="text-center">
									{item.mobile ? 'Mobile' : 'PC'}
									{#if item.refreshRate}
										<br />({item.refreshRate}fps)
									{/if}
								</Table.Cell>
								<Table.Cell class="text-center">{item.progress}%</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Tabs.Content>
			<Tabs.Content value="invitations" class="w-full">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Player</Table.Head>
							<Table.Head>Sent since</Table.Head>
							<Table.Head class="text-right"></Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each invitations as invitation}
							<Table.Row>
								<Table.Cell>
									<PlayerHoverCard player={invitation.players} />
								</Table.Cell>
								<Table.Cell>
									{new Date(invitation.created_at).toLocaleString('vi-VN')}
								</Table.Cell>
								<Table.Cell class="text-right">
									<Button
										variant="icon"
										on:click={() => {
											revokeInvitation(invitation.players.uid);
										}}><CrossCircled size={20} /></Button
									>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Tabs.Content>
			<Tabs.Content value="settings">
				{#if $user.loggedIn && data.owner == $user.data.uid}
					<section>
						<h3>Basic info</h3>
						<div class="mb-[10px] grid w-[500px] grid-cols-4 items-center gap-4">
							<Label for="name" class="text-right">
								{#if data.mode == 'markdown'}
									Home Content
								{:else if data.mode == 'iframe'}
									iframe URL
								{/if}
							</Label>
							<Textarea
								disabled={!isActive(data.boostedUntil)}
								id="name"
								class="col-span-3"
								bind:value={editedData.homeContent}
							/>
						</div>
						<div class="mb-[10px] grid w-[500px] grid-cols-4 items-center gap-4">
							<Label for="name" class="text-right">Content Mode</Label>
							<RadioGroup.Root bind:value={editedData.mode} disabled={!isActive(data.boostedUntil)}>
								<div class="flex items-center space-x-2">
									<RadioGroup.Item value="markdown" />
									<Label for="markdown">Markdown</Label>
								</div>
								<div class="flex items-center space-x-2">
									<RadioGroup.Item value="iframe" />
									<Label for="iframe">iframe</Label>
								</div>
							</RadioGroup.Root>
						</div>
						<div class="mb-[10px] grid w-[500px] grid-cols-4 items-center gap-4">
							<Label for="name" class="text-right">Clan's name</Label>
							<Input id="name" class="col-span-3" bind:value={editedData.name} />
						</div>

						<div class="mb-[10px] grid w-[500px] grid-cols-4 items-center gap-4">
							<Label for="tag" class="text-right">Clan's tag</Label>
							<Input id="tag" class="col-span-3" bind:value={editedData.tag} />
						</div>
						<div class="mb-[10px] grid w-[500px] grid-cols-4 items-center gap-4">
							<Label for="limit" class="text-right">Member limit</Label>
							<Input
								id="limit"
								class="col-span-3"
								bind:value={editedData.memberLimit}
								type="number"
								inputmode="numeric"
								placeholder="Enter 0 for unlimited"
							/>
						</div>
						<div class="mb-[10px] grid w-[500px] grid-cols-4 items-center gap-4">
							<Label for="public" class="text-right">Public</Label>
							<Switch id="tag" class="col-span-3" bind:checked={editedData.isPublic} />
						</div>
						<Button variant="outline" class="mb-[10px] w-full" on:click={() => fileinput.click()}
							>Change clan photo</Button
						>
						<div class="mb-[10px] flex gap-[10px]">
							<Badge
								class="mb-auto mt-auto h-[20px]"
								style={`background-color: ${editedData.tagBgColor}; color: ${editedData.tagTextColor};`}
								>{data.tag}</Badge
							>
							<Input
								disabled={!isActive(data.boostedUntil)}
								type="color"
								bind:value={editedData.tagBgColor}
							/>
							<Input
								disabled={!isActive(data.boostedUntil)}
								type="color"
								bind:value={editedData.tagTextColor}
							/>
							<Button
								variant="outline"
								on:click={() => {
									editedData.tagTextColor = editedData.tagBgColor = null;
								}}>Reset</Button
							>
						</div>
						<div class="applyBtnWrapper">
							<Button on:click={updateClan}>Save</Button>
						</div>
					</section>
				{/if}
				<section>
					<h3>Danger zone</h3>
					{#if $user.loggedIn && $user.data.uid == data.owner}
						<Dialog.Root>
							<Dialog.Trigger class="mb-[10px] w-full">
								<Button class="w-full text-red-500" variant="outline">Transfer ownership</Button
								></Dialog.Trigger
							>
							<Dialog.Content>
								<Dialog.Header>
									<Dialog.Title>Transfer ownership</Dialog.Title>
								</Dialog.Header>
								<Input bind:value={transferUID} placeholder="New owner UID" />
								<Button on:click={transferOwnership}>Transfer</Button>
							</Dialog.Content>
						</Dialog.Root>
						<Button class="mb-[10px] w-full text-red-500" variant="outline" on:click={deleteClan}
							>Delete clan</Button
						>
					{:else}
						<Button class="w-full text-red-500" variant="outline" on:click={leaveClan}
							>Leave clan</Button
						>
					{/if}
				</section>
			</Tabs.Content>
		</Tabs.Root>
	</div>
</div>

<style lang="scss">
	.pageBackground {
		position: fixed;
		inset: 0;
		background: center/cover no-repeat;
		filter: blur(24px);
		transform: scale(1.04);
		opacity: 0.35;
		z-index: -1;
		pointer-events: none;
	}

	section {
		h3 {
			margin-bottom: 10px;
		}
	}

	.wrapper {
		position: relative;
		overflow: hidden;
		display: grid;
		grid-template-columns: 400px calc(100% - 400px);
		gap: 40px;
		padding-inline: 80px;
		z-index: 0;

		.banner {
			width: 100%;
			height: 500px;
			border-radius: var(--radius);
			border: 1px solid var(--border1);
			position: relative;

			.bg {
				border-radius: var(--radius);
				object-fit: cover;
				position: absolute;
				z-index: 0;
				width: 100%;
				height: 100%;
				border: 1px solid var(--border1);
				box-sizing: border-box;
				padding-bottom: 100px;
			}

			.bannerContentWrapper {
				border-radius: var(--radius);
				background: rgb(0, 0, 0);
				background: linear-gradient(0deg, var(--textColorInverted) 20%, rgba(255, 255, 255, 0) 50%);
				position: absolute;
				z-index: 1;
				height: 100%;
				width: 100%;
				padding-bottom: 8px;
				padding-inline: 18px;
				display: flex;
				flex-direction: column-reverse;

				h2 {
					font-size: 36px;
					font-weight: 600;
				}

				h3 {
					font-size: 20px;
					margin-bottom: -10px;
				}

				.bannerContent {
					display: flex;
					flex-direction: column;
					gap: 5px;
				}

				.bannerBtn {
					width: 100%;
					display: flex;
					justify-content: space-between;
					gap: 10px;
					margin-top: 5px;
				}
			}
		}

		.content {
			width: 100%;

			.applyBtnWrapper {
				display: flex;
				flex-direction: row-reverse;
			}

			h3 {
				font-weight: bold;
			}

			section {
				margin-bottom: 20px;
			}
		}
	}

	.filter {
		display: flex;
		gap: 30px;
		margin-bottom: 10px;
		justify-content: center;
		border-radius: var(--radius);
		border: 1px solid var(--border1);
		padding-top: 10px;
		padding-bottom: 10px;
		width: fit-content;
		padding-inline: 20px;
		margin-inline: auto;

		.filterItem {
			display: flex;
			gap: 10px;
			align-items: center;
		}
	}

	@media screen and (max-width: 1200px) {
		.wrapper {
			display: flex;
			margin-top: 10px;
			flex-direction: column;
			gap: 10px;
			padding-inline: 10px;
		}

		.filter {
			flex-direction: column;
			margin-bottom: 20px;
			gap: 15px;
		}
	}
</style>
