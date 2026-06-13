<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { user } from '$lib/client';
	import { Clock } from 'lucide-svelte';
	import { tournamentFetch, nextMilestone } from '$lib/client/tournament';
	import StatBar from '$lib/components/tournament/StatBar.svelte';
	import LifecycleTimeline from '$lib/components/tournament/LifecycleTimeline.svelte';
	import Countdown from '$lib/components/tournament/Countdown.svelte';
	import OverviewTab from './overviewTab.svelte';
	import BracketTab from './bracketTab.svelte';
	import LevelsTab from './levelsTab.svelte';
	import LeaderboardTab from './leaderboardTab.svelte';
	import ParticipantsTab from './participantsTab.svelte';
	import MatchesTab from './matchesTab.svelte';

	export let data: any;

	$: tournament = data.tournament;
	$: isHost = Boolean(
		$user?.loggedIn
		&& (
			tournament.hostUid === $user.data?.uid
			|| $user.data?.isManager
			|| $user.data?.isAdmin
		)
	);
	$: isManager = Boolean($user?.data?.isManager || $user?.data?.isAdmin);
	$: participant = tournament.viewerParticipant;
	$: preStart = ['draft', 'registration_open', 'registration_closed', 'ready'].includes(
		tournament.status
	);
	$: contestStarted = ['ongoing', 'finished'].includes(tournament.status);
	$: bannerUrl = `https://cdn.gdvn.net/tournament-banner/${tournament.id}.webp?v=${tournament.bannerVersion ?? 0}`;
	$: milestone = nextMilestone(tournament);

	let rewardClaim: any = null;

	async function refresh() {
		await invalidateAll();
	}

	function handleMilestoneDone() {
		if (milestone?.labelKey === 'tournament.milestone.starts') {
			window.location.reload();

			return;
		}

		void refresh();
	}

	async function act(path: string, body?: any) {
		try {
			await tournamentFetch(path, {
				method: 'POST',
				body: body ? JSON.stringify(body) : undefined
			});
			await refresh();
		} catch (error: any) {
			toast.error(error.message);
		}
	}

	async function register() {
		await act(`/${tournament.id}/register`);
	}

	async function withdraw() {
		try {
			await tournamentFetch(`/${tournament.id}/register`, { method: 'DELETE' });
			await refresh();
		} catch (error: any) {
			toast.error(error.message);
		}
	}

	async function loadRewardClaim() {
		if (tournament.status !== 'finished' || !$user?.loggedIn) {
			return;
		}

		try {
			rewardClaim = await tournamentFetch(`/${tournament.id}/rewards/claim`);
		} catch {
			rewardClaim = null;
		}
	}

	async function claimReward() {
		try {
			await tournamentFetch(`/${tournament.id}/rewards/claim`, { method: 'POST' });
			toast.success($_('tournament.reward_claimed'));
			await loadRewardClaim();
		} catch (error: any) {
			toast.error(error.message);
		}
	}

	onMount(loadRewardClaim);
</script>

<svelte:head>
  <title>{tournament.name} - {$_('head.site_name')}</title>
  <meta property="og:title" content={`${tournament.name} - ${$_('head.site_name')}`} />
  {#if tournament.description}
    <meta property="og:description" content={tournament.description} />
  {/if}
  <meta property="og:image" content={bannerUrl} />
</svelte:head>

<div class="mx-auto w-full max-w-[1500px] px-[10px]">
  <div
    class="mt-[20px] flex flex-col justify-end overflow-hidden rounded-[10px] border border-[hsl(var(--border))] bg-muted bg-cover bg-center p-[20px] text-white"
    style={`background-image: linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0.1)), url('${bannerUrl}'); aspect-ratio: 40 / 10; min-height: 200px;`}
  >
    <h1 class="text-3xl font-bold" style="text-shadow: black 1px 0 10px;">{tournament.name}</h1>
    {#if tournament.description}
      <p class="max-w-[650px]" style="text-shadow: black 1px 0 10px;">{tournament.description}</p>
    {/if}
  </div>

  <div class="mt-[14px]">
    <StatBar {tournament} />
  </div>

  <div class="mt-[12px] flex flex-col gap-[12px] lg:flex-row lg:items-stretch">
    <div class="flex flex-1 items-center rounded-[12px] border border-[hsl(var(--border))] bg-card/40 px-[16px] py-[14px]">
      <LifecycleTimeline status={tournament.status} />
    </div>
    {#if milestone}
      <div class="flex items-center gap-[10px] rounded-[12px] border border-primary/30 bg-primary/5 px-[16px] py-[12px]">
        <Clock size={20} class="shrink-0 text-primary" />
        <div class="flex flex-col leading-tight">
          <span class="text-xs text-muted-foreground">{$_(milestone.labelKey)}</span>
          <Countdown
            to={milestone.at}
            class="text-base font-semibold"
            on:done={handleMilestoneDone}
          />
        </div>
      </div>
    {/if}
  </div>

  <div class="mt-[16px] flex flex-wrap items-center justify-center gap-[10px]">
    {#if $user?.loggedIn}
      {#if participant?.status === 'invited'}
        <Button on:click={() => act(`/${tournament.id}/invites/accept`)}>
          {$_('tournament.accept_invite')}
        </Button>
        <Button variant="outline" on:click={() => act(`/${tournament.id}/invites/decline`)}>
          {$_('tournament.decline_invite')}
        </Button>
      {:else if participant?.status === 'active' && preStart}
        <Button variant="outline" on:click={withdraw}>{$_('tournament.withdraw')}</Button>
      {:else if !participant && (tournament.status === 'registration_open' || (tournament.format === 'contest' && tournament.status === 'ongoing'))}
        <Button on:click={register}>{$_('tournament.register')}</Button>
      {/if}
    {/if}

    {#if rewardClaim?.status === 'claimable'}
      <Button on:click={claimReward}>{$_('tournament.claim_reward')}</Button>
    {:else if rewardClaim?.status === 'claimed'}
      <Button variant="outline" disabled>{$_('tournament.reward_claimed')}</Button>
    {/if}

    {#if isHost}
      <Button variant="outline" href={`/tournament/${tournament.id}/manage`}>
        {$_('tournament.manage.title')}
      </Button>
    {/if}
  </div>

  <Tabs.Root value="overview" class="mt-[20px] flex flex-col items-center">
    <Tabs.List>
      <Tabs.Trigger value="overview">{$_('tournament.tabs.overview')}</Tabs.Trigger>
      {#if tournament.format === 'single_elimination'}
        <Tabs.Trigger value="bracket">{$_('tournament.tabs.bracket')}</Tabs.Trigger>
      {:else}
        {#if contestStarted}
          <Tabs.Trigger value="levels">{$_('tournament.tabs.levels')}</Tabs.Trigger>
          <Tabs.Trigger value="leaderboard">{$_('tournament.tabs.leaderboard')}</Tabs.Trigger>
        {/if}
      {/if}
      <Tabs.Trigger value="participants">{$_('tournament.tabs.participants')}</Tabs.Trigger>
      {#if tournament.format === 'single_elimination'}
        <Tabs.Trigger value="matches">{$_('tournament.tabs.matches')}</Tabs.Trigger>
      {/if}
    </Tabs.List>

    <Tabs.Content value="overview" class="mt-[20px] w-full">
      <OverviewTab {tournament} />
    </Tabs.Content>
    {#if tournament.format === 'single_elimination'}
      <Tabs.Content value="bracket" class="mt-[20px] w-full">
        <BracketTab {tournament} />
      </Tabs.Content>
      <Tabs.Content value="matches" class="mt-[20px] w-full">
        <MatchesTab {tournament} />
      </Tabs.Content>
    {:else}
      {#if contestStarted}
        <Tabs.Content value="levels" class="mt-[20px] w-full">
          <LevelsTab {tournament} />
        </Tabs.Content>
        <Tabs.Content value="leaderboard" class="mt-[20px] w-full">
          <LeaderboardTab {tournament} canManage={isHost} />
        </Tabs.Content>
      {/if}
    {/if}
    <Tabs.Content value="participants" class="mt-[20px] w-full">
      <ParticipantsTab {tournament} {isHost} {isManager} onChange={refresh} />
    </Tabs.Content>
  </Tabs.Root>
</div>
