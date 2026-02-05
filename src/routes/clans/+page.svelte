<script lang="ts">
	import Title from '$lib/components/Title.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Switch } from '$lib/components/ui/switch';
	import { toast } from 'svelte-sonner';
	import { user } from '$lib/client';
	import * as Tabs from '$lib/components/ui/tabs';
	import type { PageData } from './$types';
	import PlayerHoverCard from '$lib/components/playerLink.svelte';
	import { onMount } from 'svelte';
	import MagnifyingGlass from 'svelte-radix/MagnifyingGlass.svelte';
	import LockClosed from 'svelte-radix/LockClosed.svelte';
	import StarFilled from 'svelte-radix/StarFilled.svelte';
	import Globe from 'svelte-radix/Globe.svelte';
	import Person from 'svelte-radix/Person.svelte';
	import { goto } from '$app/navigation';
	import Ads from '$lib/components/ads.svelte';
	import { _ } from 'svelte-i18n';

	export let data: PageData;
	const newClanData = {
		name: '',
		tag: '',
		memberLimit: NaN,
		isPublic: false
	};
	let invitations: any = [];
	let searchQuery = '';

	async function createClan() {
		if (
			!/^[a-zA-Z0-9]*$/gm.test(newClanData.tag) ||
			!(2 <= newClanData.tag.length && newClanData.tag.length <= 6)
		) {
			toast.error('Tag must be alphanumericm contains no space and must have 3-6 characters.');
			return;
		}

		if (!newClanData.name.length || !newClanData.tag.length) {
			toast.error('Please fill in all fields.');
			return;
		}

		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/clans`, {
				method: 'POST',
				body: JSON.stringify(newClanData),
				headers: {
					Authorization: 'Bearer ' + (await $user.token()),
					'Content-Type': 'application/json'
				}
			}).then(async (res) => {
				if (res.ok) {
					await $user.refresh();
					goto(`/clan/${$user.data.clan}`);
				} else {
					throw new Error();
				}
			}),
			{
				success: 'Clan created!',
				loading: 'Creating clan...',
				error: 'Failed to create new clan.'
			}
		);
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

	async function fetchClanList() {
		data = {
			data: await (
				await fetch(`${import.meta.env.VITE_API_URL}/clans?searchQuery=${searchQuery}`)
			).json()
		};
	}

	onMount(async () => {
		if ($user.loggedIn) {
			fetch(`${import.meta.env.VITE_API_URL}/clans/invitations`, {
				headers: {
					Authorization: 'Bearer ' + (await $user.token()),
					'Content-Type': 'application/json'
				}
			})
				.then((res) => res.json())
				.then((res) => (invitations = res));
		}
	});
</script>

<svelte:head>
	<title>Hội - Geometry Dash VN</title>
</svelte:head>

<div class="titleWrapper">
	<Title value={$_("clans.title")} />
	<Dialog.Root>
		{#if $user.loggedIn && !$user.data.clan}
			<Dialog.Trigger>
				{#if $user.data.rating || $user.data.totalFLpt}
					<Button>{$_("clans.create.button")}</Button>
				{:else}
					<Button disabled>{$_("clans.create.button")}</Button>
				{/if}
			</Dialog.Trigger>
		{/if}
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>{$_("clans.create.title")}</Dialog.Title>
				<Dialog.Description
					>{$_("clans.create.description")}</Dialog.Description
				>
			</Dialog.Header>
			<div class="grid gap-4 py-4">
				<div class="grid grid-cols-4 items-center gap-4">
					<Label class="text-right">{$_("clans.create.name")}</Label>
					<Input class="col-span-3" bind:value={newClanData.name} />
				</div>
				<div class="grid grid-cols-4 items-center gap-4">
					<Label class="text-right">{$_("clans.create.tag")}</Label>
					<Input
						class="col-span-3"
						placeholder={$_("clans.create.tag_placeholder")}
						bind:value={newClanData.tag}
						maxlength={6}
					/>
				</div>
				<div class="grid grid-cols-4 items-center gap-4">
					<Label class="text-right">{$_("clans.create.member_limit")}</Label>
					<Input
						class="col-span-3"
						bind:value={newClanData.memberLimit}
						type="number" inputmode="numeric"
						placeholder={$_("clans.create.member_limit_placeholder")}
					/>
				</div>
				<div class="grid grid-cols-4 items-center gap-4">
					<Label class="text-right">{$_("clans.create.public")}</Label>
					<Switch bind:checked={newClanData.isPublic} />
				</div>
			</div>
			<Dialog.Footer>
				<Button on:click={createClan}>{$_("clans.create.create_button")}</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
</div>
<Tabs.Root value="clans" class="flex w-[100%] flex-col items-center">
	<Tabs.List class="mb-[5px] w-fit">
		<Tabs.Trigger value="clans">{$_("clans.tabs.listing")}</Tabs.Trigger>
		{#if $user.loggedIn && !$user.data.clan}
			<Tabs.Trigger value="invitations">{$_("clans.tabs.invitations")}</Tabs.Trigger>
		{/if}
	</Tabs.List>
	<Tabs.Content value="clans" class="w-full">
		<div class="flex justify-center gap-[10px] pl-[10px] pr-[10px]">
			<Input placeholder={$_("clans.search_placeholder")} class="mb-[20px] w-[400px] max-w-full" bind:value={searchQuery} />
			<Button on:click={fetchClanList}><MagnifyingGlass /></Button>
		</div>
		<Ads dataAdFormat="rectangle" />
		<div class="clans">
			{#each data.data as clan, index}
				<div class="clan">
					<a href={`/clan/${clan.id}`}>
						<img
							src={`https://cdn.demonlistvn.com/clan-photos/${clan.id}.jpg`}
							alt=""
							loading="lazy"
						/>
					</a>
					<div class="info">
						<a href={`/clan/${clan.id}`}><h3>{clan.name}</h3></a>
						<span class="flex gap-[10px]"
							><StarFilled size={20} /> <PlayerHoverCard player={clan.players} /></span
						>
						<div class="flex gap-[10px]">
							<div class="flex items-center gap-[5px]">
								{#if clan.isPublic}
									<Globe size={20} /> {$_("clan.public")}
								{:else}
									<LockClosed size={20} /> {$_("clan.invite_only")}
								{/if}
							</div>
							<div class="flex items-center gap-[5px]">
								<Person size={20} />
								{#if clan.memberLimit}
									{clan.memberCount}/{clan.memberLimit}
								{:else}
									{clan.memberCount}/∞
								{/if}
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</Tabs.Content>
	<Tabs.Content value="invitations" class="w-full">
		<div class="invitationsWrapper">
			{#each invitations as invitation, index}
				<div class="clan">
					<a href={`/clan/${invitation.clans.id}`}>
						<img
							src={`https://cdn.demonlistvn.com/clan-photos/${invitation.clans.id}.jpg`}
							alt=""
							loading="lazy"
						/>
					</a>
					<div class="info">
						<a href={`/clan/${invitation.clans.id}`}><h3>{invitation.clans.name}</h3></a>
						<span class="flex gap-[10px]"
							>{$_("clans.owned_by")} <PlayerHoverCard player={invitation.clans.players} /></span
						>
						<div class="mt-[20px]">
							<Button on:click={() => acceptInvitation(invitation.clans.id)}>Accept</Button>
							<Button on:click={() => rejectInvitation(invitation.clans.id)} variant="outline"
								>{$_("general.reject")}</Button
							>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</Tabs.Content>
</Tabs.Root>

<style lang="scss">
	.titleWrapper {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-right: 100px;
	}

	.clans {
		padding-inline: 250px;
		display: grid;
		grid-template-columns: calc(50% - 5px) calc(50% - 5px);
		gap: 10px;
	}

	.clan {
		width: 100%;
		height: 110px;
		border-radius: var(--radius);
		border: 1px solid var(--border1);
		display: flex;
		gap: 25px;

		.info {
			padding-top: 15px;

			h3 {
				font-size: 20px;
				font-weight: bold;
			}
		}

		img {
			height: 100%;
			width: 95px;
			object-fit: cover;
			border-radius: var(--radius) 0 0 var(--radius);
		}
	}

	.invitationsWrapper {
		padding-inline: 200px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	@media screen and (max-width: 1200px) {
		.titleWrapper {
			padding-right: 20px;
		}

		.clans {
			padding-inline: 10px;
			display: flex;
			flex-direction: column;
			gap: 10px;
		}

		.invitationsWrapper {
			padding-inline: 10px;
		}
	}
</style>
