<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { onMount } from 'svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { user } from '$lib/client';
	import { upload } from '$lib/client/storage';
	import { tournamentFetch } from '$lib/client/tournament';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Switch } from '$lib/components/ui/switch';
	import * as Tabs from '$lib/components/ui/tabs';
	import LevelPoolEditor from './levelPoolEditor.svelte';
	import RewardsEditor from './rewardsEditor.svelte';
	import PvpFormatEditor from './pvpFormatEditor.svelte';
	import ContestConfigEditor from './contestConfigEditor.svelte';
	import BracketManager from './bracketManager.svelte';

	export let data: any;

	$: tournament = data.tournament;
	$: isManager = Boolean($user?.data?.isManager || $user?.data?.isAdmin);
	$: preStart = ['draft', 'registration_open', 'registration_closed', 'ready'].includes(
		tournament.status
	);

	let name = '';
	let description = '';
	let detail = '';
	let visibility = 'public';
	let minElo: number | null = null;
	let maxElo: number | null = null;
	let eloEnforced = false;
	let saving = false;
	let initialized = false;
	let activeTab = 'settings';
	let authenticatedTournamentLoaded = false;

	$: if (tournament && !initialized) {
		name = tournament.name ?? '';
		description = tournament.description ?? '';
		detail = tournament.detail ?? '';
		visibility = tournament.visibility ?? 'public';
		minElo = tournament.minElo;
		maxElo = tournament.maxElo;
		eloEnforced = tournament.eloEnforced ?? false;
		initialized = true;
	}

	$: if ($user?.checked && !authenticatedTournamentLoaded) {
		authenticatedTournamentLoaded = true;

		if ($user.loggedIn) {
			refreshManagedTournament();
		}
	}

	async function refreshManagedTournament() {
		try {
			data = {
				...data,
				tournament: await tournamentFetch(`/${tournament.id}`)
			};
		} catch (error: any) {
			toast.error(error.message);
		}
	}

	onMount(() => {
		if (
			$user?.loggedIn
			&& !(
				tournament.hostUid === $user.data?.uid
				|| $user.data?.isManager
				|| $user.data?.isAdmin
			)
		) {
			goto(`/tournament/${tournament.id}`);
		}
	});

	async function saveBasics() {
		saving = true;

		try {
			await tournamentFetch(`/${tournament.id}`, {
				method: 'PATCH',
				body: JSON.stringify({
					name,
					description,
					detail,
					visibility,
					minElo,
					maxElo,
					eloEnforced
				})
			});
			toast.success($_('tournament.manage.saved'));
			await invalidateAll();
		} catch (error: any) {
			toast.error(error.message);
		} finally {
			saving = false;
		}
	}

	async function uploadBanner(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) {
			return;
		}

		if (file.size > 500 * 1024) {
			toast.error($_('tournament.manage.banner_too_large'));

			return;
		}

		try {
			const token = await $user.token();

			await upload(`tournament-banner/${tournament.id}.webp`, file, token!);
			await tournamentFetch(`/${tournament.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ bumpBannerVersion: true })
			});
			toast.success($_('tournament.manage.banner_uploaded'));
			await invalidateAll();
		} catch (error: any) {
			toast.error(error.message);
		}
	}

	async function lifecycle(action: string) {
		try {
			await tournamentFetch(`/${tournament.id}/${action}`, { method: 'POST' });
			await invalidateAll();
			toast.success($_('tournament.manage.action_done'));
		} catch (error: any) {
			toast.error(error.message);
		}
	}

	async function startTournament() {
		try {
			await tournamentFetch(`/${tournament.id}/start`, { method: 'POST' });
			toast.success($_('tournament.manage.started'));
			goto(`/tournament/${tournament.id}`);
		} catch (error: any) {
			toast.error(error.message);
		}
	}

	async function cancelTournament() {
		if (!confirm($_('tournament.manage.cancel_confirm'))) {
			return;
		}

		try {
			await tournamentFetch(`/${tournament.id}/cancel`, {
				method: 'POST',
				body: JSON.stringify({ reason: '' })
			});
			toast.success($_('tournament.manage.cancelled'));
			await invalidateAll();
		} catch (error: any) {
			toast.error(error.message);
		}
	}
</script>

<svelte:head>
  <title>{$_('tournament.manage')} - {tournament.name}</title>
</svelte:head>

<div class="mx-auto mt-[20px] w-full max-w-[1500px] px-[10px] pb-[60px]">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold">{$_('tournament.manage')}</h1>
    <Button variant="outline" href={`/tournament/${tournament.id}`}>
      {$_('tournament.manage.view')}
    </Button>
  </div>

  <Tabs.Root bind:value={activeTab} class="mt-[20px]">
    <Tabs.List>
      <Tabs.Trigger value="settings">{$_('tournament.manage.tabs.settings')}</Tabs.Trigger>
      {#if tournament.format === 'single_elimination'}
        <Tabs.Trigger value="bracket">{$_('tournament.manage.tabs.bracket')}</Tabs.Trigger>
      {/if}
    </Tabs.List>

    <Tabs.Content value="settings" class="mt-[20px]">
      <div class="mx-auto flex w-full max-w-[800px] flex-col gap-[24px]">
  <!-- Lifecycle -->
  <section class="flex flex-col gap-[10px] rounded-[8px] border border-[hsl(var(--border))] p-[16px]">
    <h2 class="text-lg font-bold">{$_('tournament.manage.lifecycle')}</h2>
    <p class="text-sm text-muted-foreground">
      {$_('tournament.manage.current_status')}: {$_(`tournament.status.${tournament.status}`)}
    </p>
    {#if tournament.startBlockers?.length}
      <ul class="list-disc pl-[20px] text-sm text-yellow-600">
        {#each tournament.startBlockers as blocker}
          <li>{blocker}</li>
        {/each}
      </ul>
    {/if}
    <div class="flex flex-wrap gap-[8px]">
      {#if tournament.status === 'draft' || tournament.status === 'registration_closed'}
        <Button size="sm" variant="outline" on:click={() => lifecycle('registration/open')}>
          {$_('tournament.manage.open_registration')}
        </Button>
      {/if}
      {#if tournament.status === 'registration_open'}
        <Button size="sm" variant="outline" on:click={() => lifecycle('registration/close')}>
          {$_('tournament.manage.close_registration')}
        </Button>
      {/if}
      {#if preStart}
        <Button size="sm" on:click={startTournament} disabled={tournament.canStart === false}>
          {$_('tournament.manage.start')}
        </Button>
      {/if}
      {#if tournament.format === 'contest' && tournament.status === 'ongoing'}
        <Button size="sm" on:click={() => lifecycle('end')}>
          {$_('tournament.manage.end_contest')}
        </Button>
      {/if}
      {#if tournament.status !== 'finished' && tournament.status !== 'cancelled'}
        <Button size="sm" variant="destructive" on:click={cancelTournament}>
          {$_('tournament.manage.cancel')}
        </Button>
      {/if}
    </div>
  </section>

  <!-- Basics -->
  <section class="flex flex-col gap-[12px] rounded-[8px] border border-[hsl(var(--border))] p-[16px]">
    <h2 class="text-lg font-bold">{$_('tournament.manage.basics')}</h2>
    <div class="flex flex-col gap-[6px]">
      <Label>{$_('tournament.create_form.name')}</Label>
      <Input bind:value={name} maxlength={96} />
    </div>
    <div class="flex flex-col gap-[6px]">
      <Label>{$_('tournament.create_form.description')}</Label>
      <Textarea bind:value={description} rows={2} />
    </div>
    <div class="flex flex-col gap-[6px]">
      <Label>{$_('tournament.manage.detail')}</Label>
      <Textarea bind:value={detail} rows={8} placeholder={$_('tournament.manage.detail_placeholder')} />
    </div>
    <div class="flex flex-col gap-[6px]">
      <Label>{$_('tournament.create_form.visibility')}</Label>
      <select
        bind:value={visibility}
        disabled={!preStart && !isManager}
        class="h-10 rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="public">{$_('tournament.visibility.public')}</option>
        <option value="unlisted">{$_('tournament.visibility.unlisted')}</option>
        <option value="private">{$_('tournament.visibility.private')}</option>
      </select>
    </div>
    <div class="grid grid-cols-2 gap-[10px]">
      <div class="flex flex-col gap-[6px]">
        <Label>{$_('tournament.manage.min_elo')}</Label>
        <Input type="number" bind:value={minElo} disabled={!preStart && !isManager} />
      </div>
      <div class="flex flex-col gap-[6px]">
        <Label>{$_('tournament.manage.max_elo')}</Label>
        <Input type="number" bind:value={maxElo} disabled={!preStart && !isManager} />
      </div>
    </div>
    <div class="flex items-center gap-[8px]">
      <Switch bind:checked={eloEnforced} disabled={!preStart && !isManager} id="elo-enforced" />
      <Label for="elo-enforced">{$_('tournament.manage.elo_enforced')}</Label>
    </div>
    <div class="flex flex-col gap-[6px]">
      <Label>{$_('tournament.manage.banner')}</Label>
      <input type="file" accept="image/webp" on:change={uploadBanner} />
      <p class="text-xs text-muted-foreground">{$_('tournament.manage.banner_hint')}</p>
    </div>
    <Button on:click={saveBasics} disabled={saving}>{$_('tournament.manage.save')}</Button>
  </section>

  <!-- Format-specific config -->
  {#if tournament.format === 'single_elimination'}
    <PvpFormatEditor {tournament} disabled={!preStart && !isManager} />
  {:else}
    <ContestConfigEditor {tournament} disabled={!preStart && !isManager} />
    <LevelPoolEditor {tournament} disabled={!preStart && !isManager} />
  {/if}

  <!-- Rewards (manager only) -->
  {#if isManager}
    <RewardsEditor {tournament} />
  {/if}
      </div>
    </Tabs.Content>

    {#if tournament.format === 'single_elimination'}
      <Tabs.Content value="bracket" class="mt-[20px]">
        <BracketManager {tournament} onChange={refreshManagedTournament} />
      </Tabs.Content>
    {/if}
  </Tabs.Root>
</div>
