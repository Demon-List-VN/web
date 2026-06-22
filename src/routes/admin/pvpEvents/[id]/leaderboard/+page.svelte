<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import Title from '$lib/components/Title.svelte';
	import { user } from '$lib/client';
	import { getAdminPvpEventLeaderboard, type PvpWeeklyRace } from '$lib/client/pvp';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import WeeklyRaceTab from '../../../../versus/play/WeeklyRaceTab.svelte';
	import { ArrowLeft, Loader2, RefreshCw } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	const PVP_ADMIN_EVENT_LEADERBOARD_PAGE_SIZE = 50;

	let leaderboard: PvpWeeklyRace = emptyLeaderboard();
	let leaderboardPage = 1;
	let leaderboardTotal = 0;
	let loading = false;
	let error = '';
	let initialized = false;
	let now = Date.now();
	let ticker: ReturnType<typeof setInterval> | null = null;

	$: eventId = $page.params.id ?? '';
	$: event = leaderboard.event ?? null;
	$: eventTitle = event?.title || `PvP event #${eventId}`;
	$: eventStatus = leaderboard.currentWeek?.status ?? leaderboard.week?.status ?? null;

	$: if ($user.data?.isAdmin && !initialized) {
		initialized = true;
		void loadLeaderboard();
	}

	onMount(() => {
		ticker = setInterval(() => {
			now = Date.now();
		}, 1000);

		if ($user.data?.isAdmin && !initialized) {
			initialized = true;
			void loadLeaderboard();
		}

		return () => {
			if (ticker) {
				clearInterval(ticker);
			}
		};
	});

	function emptyLeaderboard(): PvpWeeklyRace {
		return {
			mode: 'event',
			event: null,
			week: null,
			currentWeek: null,
			previousWeek: null,
			leaderboard: [],
			previousLeaderboard: [],
			currentPlayer: null,
			pagination: null
		};
	}

	async function loadLeaderboard(page = leaderboardPage) {
		loading = true;
		error = '';

		try {
			const nextLeaderboard = await getAdminPvpEventLeaderboard(
				await $user.token(),
				eventId,
				PVP_ADMIN_EVENT_LEADERBOARD_PAGE_SIZE,
				null,
				page
			);

			leaderboard = nextLeaderboard;
			leaderboardPage = page;
			leaderboardTotal = nextLeaderboard.pagination?.total
				?? nextLeaderboard.leaderboard.length;
		} catch (loadError) {
			error = loadError instanceof Error
				? loadError.message
				: 'Failed to load PvP event leaderboard';
			leaderboard = emptyLeaderboard();
			leaderboardTotal = 0;
			toast.error(error);
		} finally {
			loading = false;
		}
	}

	function setLeaderboardPage(page: number) {
		if (page === leaderboardPage) {
			return;
		}

		void loadLeaderboard(page);
	}

	function statusVariant(status: string | null) {
		return status === 'active'
			? 'default'
			: status === 'finalized'
			? 'secondary'
			: 'outline';
	}

	function statusLabel(status: string | null) {
		return status ? status[0].toUpperCase() + status.slice(1) : 'Unknown';
	}
</script>

<Title value={`${eventTitle} Leaderboard - Admin`} />

{#if $user.data?.isAdmin}
<div class="page">
  <div class="page-header">
    <div>
      <Button variant="ghost" size="sm" href="/admin/pvpEvents">
        <ArrowLeft class="mr-2 h-4 w-4" />
        PvP events
      </Button>
      <h1>{eventTitle}</h1>
      <div class="header-meta">
        <Badge variant="outline">#{eventId}</Badge>
        <Badge variant={statusVariant(eventStatus)}>{statusLabel(eventStatus)}</Badge>
        <Badge variant="outline">{leaderboardTotal} players</Badge>
      </div>
    </div>
    <Button variant="outline" disabled={loading} on:click={() => loadLeaderboard(leaderboardPage)}>
      {#if loading}
        <Loader2 class="mr-2 h-4 w-4 animate-spin" />
      {:else}
        <RefreshCw class="mr-2 h-4 w-4" />
      {/if}
      Refresh
    </Button>
  </div>

  <WeeklyRaceTab
    weeklyRace={leaderboard}
    currentUid={null}
    currentPlayer={null}
    {loading}
    {error}
    page={leaderboardPage}
    total={leaderboardTotal}
    pageSize={PVP_ADMIN_EVENT_LEADERBOARD_PAGE_SIZE}
    {now}
    onRefresh={() => loadLeaderboard(leaderboardPage)}
    onPageChange={setLeaderboardPage}
    title="Event leaderboard"
    description="Admin view for this PvP event, including ended events."
    tabsLabel="PvP event leaderboard"
    rangeLabel="Event window"
    countdownLabel="Status"
    countdownValue={statusLabel(eventStatus)}
    emptyLabel="No completed event matches yet."
    tableLabel="Event leaderboard"
    showTutorial={false}
    showHistory={false}
  />
</div>
{:else}
<div class="page">
  <Card.Root>
    <Card.Content class="state">
      {#if !$user.checked}
        <Loader2 class="h-5 w-5 animate-spin" />
        <span>Loading...</span>
      {:else}
        <span>Admin access required.</span>
      {/if}
    </Card.Content>
  </Card.Root>
</div>
{/if}

<style lang="scss">
.page {
  width: min(100vw - 32px, 1080px);
  margin: 0 auto;
  padding: 32px 0;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 10px 0;
  font-size: 1.8rem;
  font-weight: 800;
}

.header-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

:global(.state) {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 96px;
  color: hsl(var(--muted-foreground));
}

@media (max-width: 640px) {
  .page-header {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
