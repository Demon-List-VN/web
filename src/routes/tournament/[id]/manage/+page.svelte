<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { user } from '$lib/client';
	import { tournamentFetch } from '$lib/client/tournament';
	import { Button } from '$lib/components/ui/button';
	import * as Tabs from '$lib/components/ui/tabs';
	import { createManageDirty, setManageDirty } from '$lib/components/tournament/manage/manageDirty';
	import SaveBar from '$lib/components/tournament/manage/SaveBar.svelte';
	import BasicsEditor from './basicsEditor.svelte';
	import ScheduleEditor from './scheduleEditor.svelte';
	import LevelPoolEditor from './levelPoolEditor.svelte';
	import RewardsEditor from './rewardsEditor.svelte';
	import PvpFormatEditor from './pvpFormatEditor.svelte';
	import ContestConfigEditor from './contestConfigEditor.svelte';
	import BracketManager from './bracketManager.svelte';
	import MatchesManager from './matchesManager.svelte';
	import ParticipantsTab from '../participantsTab.svelte';

	export let data: any;

	setManageDirty(createManageDirty());

	$: tournament = data.tournament;
	$: tournamentId = tournament?.id ?? data.id;
	$: isHost = Boolean(tournament && tournament.hostUid === $user?.data?.uid);
	$: isManager = Boolean($user?.data?.isManager || $user?.data?.isAdmin);
	$: preStart = Boolean(
		tournament
		&& ['draft', 'registration_open', 'registration_closed', 'ready'].includes(
			tournament.status
		)
	);
	$: gated = !preStart && !isManager;
	$: isSingleElim = tournament?.format === 'single_elimination';

	let activeTab = 'settings';
	let authenticatedTournamentLoaded = false;
	let loadingError = data?.error ?? '';
	let requiresAuthRecovery = Boolean(data?.requiresAuthRecovery);
	let authRecoveryLoading = requiresAuthRecovery;

	$: if ($user?.checked && !authenticatedTournamentLoaded) {
		authenticatedTournamentLoaded = true;

		if ($user.loggedIn) {
			refreshManagedTournament();
		} else if (requiresAuthRecovery && !tournament) {
			loadingError = 'Tournament not found';
			authRecoveryLoading = false;
			requiresAuthRecovery = false;
		}
	}

	async function refreshManagedTournament() {
		const id = tournament?.id ?? data.id;

		if (!id) {
			return;
		}

		const recoveringTournament = requiresAuthRecovery || !tournament;

		if (recoveringTournament) {
			authRecoveryLoading = true;
		}

		try {
			data = {
				...data,
				tournament: await tournamentFetch(`/${id}`)
			};
			loadingError = '';
		} catch (error: any) {
			if (recoveringTournament) {
				loadingError = error.message || 'Tournament not found';
			} else {
				toast.error(error.message);
			}
		} finally {
			if (recoveringTournament) {
				authRecoveryLoading = false;
				requiresAuthRecovery = false;
			}
		}
	}

	onMount(() => {
		if (
			$user?.loggedIn
			&& tournament
			&& !(
				tournament.hostUid === $user.data?.uid
				|| $user.data?.isManager
				|| $user.data?.isAdmin
			)
		) {
			goto(`/tournament/${tournament.id}`);
		}
	});
</script>

<svelte:head>
  <title>{$_('tournament.manage.title')}{tournament ? ` - ${tournament.name}` : ''}</title>
</svelte:head>

{#if authRecoveryLoading && !tournament}
  <div class="mx-auto mt-[60px] w-full max-w-[900px] px-[10px] text-center text-muted-foreground">
    {$_('tournament.loading')}
  </div>
{:else if loadingError || !tournament}
  <div class="mx-auto mt-[60px] w-full max-w-[900px] px-[10px] text-center">
    <h1 class="text-2xl font-bold">{$_('tournament.manage.title')}</h1>
    <p class="mt-[8px] text-muted-foreground">{loadingError || 'Tournament not found'}</p>
  </div>
{:else}
<div class="mx-auto mt-[20px] w-full max-w-[1100px] px-[10px] pb-[80px]">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold">{$_('tournament.manage.title')}</h1>
    <Button variant="outline" href={`/tournament/${tournament.id}`}>
      {$_('tournament.manage.view')}
    </Button>
  </div>

  <Tabs.Root bind:value={activeTab} class="mt-[20px]">
    <Tabs.List>
      <Tabs.Trigger value="settings">{$_('tournament.manage.tabs.settings')}</Tabs.Trigger>
      <Tabs.Trigger value="schedule">{$_('tournament.manage.tabs.schedule')}</Tabs.Trigger>
      <Tabs.Trigger value="participants">{$_('tournament.manage.tabs.participants')}</Tabs.Trigger>
      {#if isSingleElim}
        <Tabs.Trigger value="bracket">{$_('tournament.manage.tabs.bracket')}</Tabs.Trigger>
        <Tabs.Trigger value="matches">{$_('tournament.manage.tabs.matches')}</Tabs.Trigger>
      {/if}
    </Tabs.List>

    <Tabs.Content value="settings" class="mt-[20px]">
      <div class="mx-auto flex w-full max-w-[800px] flex-col gap-[20px]">
        <BasicsEditor {tournament} disabled={gated} on:published={refreshManagedTournament} />
        {#if isSingleElim}
          <PvpFormatEditor {tournament} disabled={gated} />
        {:else}
          <ContestConfigEditor {tournament} disabled={gated} />
          <LevelPoolEditor {tournament} disabled={gated} />
        {/if}
        {#if isManager}
          <RewardsEditor {tournament} />
        {/if}
      </div>
    </Tabs.Content>

    <Tabs.Content value="schedule" class="mt-[20px]">
      <ScheduleEditor {tournament} disabled={gated} />
    </Tabs.Content>

    <Tabs.Content value="participants" class="mt-[20px]">
      <ParticipantsTab
        {tournament}
        isHost={isHost || isManager}
        {isManager}
        onChange={refreshManagedTournament}
      />
    </Tabs.Content>

    {#if isSingleElim}
      <Tabs.Content value="bracket" class="mt-[20px]">
        <BracketManager {tournament} {isManager} onChange={refreshManagedTournament} />
      </Tabs.Content>
      <Tabs.Content value="matches" class="mt-[20px]">
        <MatchesManager {tournament} onChange={refreshManagedTournament} />
      </Tabs.Content>
    {/if}
  </Tabs.Root>
</div>

<SaveBar onSaved={refreshManagedTournament} />
{/if}
