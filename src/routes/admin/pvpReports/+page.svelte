<script lang="ts">
	import { onMount } from 'svelte';
	import Chart from 'chart.js/auto';
	import Title from '$lib/components/Title.svelte';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import { user } from '$lib/client';
	import {
		getAdminPvpReports,
		resolveAdminPvpReport,
		resolveAdminPvpReportsByPlayerReason,
		type AdminPvpReportEvidence,
		type AdminPvpReportsResponse,
		type PvpMatchReportReason,
		type PvpMatchReportTargetType,
		type PvpPlayer
	} from '$lib/client/pvp';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { toast } from 'svelte-sonner';
	import {
		AlertTriangle,
		BarChart3,
		CalendarDays,
		CheckCircle2,
		RefreshCw,
		ShieldAlert,
		UserRound
	} from 'lucide-svelte';

	type DateFilter = 'all' | 7 | 14 | 30;
	type ResolveFilter = 'all' | 'open' | 'resolved';
	type ReasonFilter = 'all' | PvpMatchReportReason;
	type TargetFilter = 'all' | PvpMatchReportTargetType;

	type ReportFilters = {
		date: DateFilter;
		reason: ReasonFilter;
		reportedUid: string;
		status: ResolveFilter;
		target: TargetFilter;
	};

	const dateOptions: Array<{ value: DateFilter; label: string; }> = [
		{ value: 'all', label: 'All time' },
		{ value: 7, label: '7 days' },
		{ value: 14, label: '14 days' },
		{ value: 30, label: '30 days' }
	];
	const resolveOptions: Array<{ value: ResolveFilter; label: string; }> = [
		{ value: 'all', label: 'All statuses' },
		{ value: 'open', label: 'Unresolved' },
		{ value: 'resolved', label: 'Resolved' }
	];
	const targetOptions: Array<{ value: TargetFilter; label: string; }> = [
		{ value: 'all', label: 'All targets' },
		{ value: 'player', label: 'Player reports' },
		{ value: 'level', label: 'Level reports' }
	];
	const playerReasonOptions: Array<{ value: PvpMatchReportReason; label: string; color: string; }> = [
		{ value: 'cheating', label: 'Cheating', color: 'rgba(239, 68, 68, 0.72)' },
		{
			value: 'abusive_communication',
			label: 'Abusive communication',
			color: 'rgba(245, 158, 11, 0.72)'
		},
		{ value: 'other', label: 'Other', color: 'rgba(59, 130, 246, 0.72)' }
	];
	const levelReasonOptions: Array<{ value: PvpMatchReportReason; label: string; color: string; }> = [
		{ value: 'too_easy', label: 'Too easy', color: 'rgba(34, 197, 94, 0.72)' },
		{ value: 'too_difficult', label: 'Too difficult', color: 'rgba(249, 115, 22, 0.72)' },
		{ value: 'level_deleted', label: 'Level deleted', color: 'rgba(107, 114, 128, 0.72)' },
		{ value: 'secret_way', label: 'Secret way', color: 'rgba(168, 85, 247, 0.72)' },
		{ value: 'unenjoyable', label: 'Unenjoyable', color: 'rgba(20, 184, 166, 0.72)' }
	];
	const reasonOptions = [
		...playerReasonOptions,
		...levelReasonOptions
	];

	let draftFilters: ReportFilters = {
		date: 'all',
		reason: 'all',
		reportedUid: 'all',
		status: 'open',
		target: 'all'
	};
	let appliedFilters: ReportFilters = {
		date: 'all',
		reason: 'all',
		reportedUid: 'all',
		status: 'open',
		target: 'all'
	};
	let data: AdminPvpReportsResponse | null = null;
	let loading = false;
	let resolvingKey = '';
	let initialLoaded = false;

	$: reports = data?.reports ?? [];
	$: playerCounts = data?.playerCounts ?? [];
	$: selectedPlayerCount = playerCounts.find((count) => count.uid === appliedFilters.reportedUid) ?? null;
	$: selectedPlayer = selectedPlayerCount?.player ?? null;
	$: reportsForSelectedPlayer = reports.filter((item) =>
		appliedFilters.reportedUid === 'all'
			|| (reportTargetType(item) === 'player' && reportedUid(item) === appliedFilters.reportedUid)
	);
	$: visibleReports = reportsForSelectedPlayer
		.filter((item) => matchesAppliedFilters(item))
		.sort(compareReports);
	$: chartData = buildChartData(visibleReports);
	$: unresolvedByReason = buildUnresolvedByReason(reportsForSelectedPlayer);
	$: if ($user.data?.isAdmin && !initialLoaded) {
		initialLoaded = true;
		void loadReports();
	}

	onMount(() => {
		if ($user.data?.isAdmin && !initialLoaded) {
			initialLoaded = true;
			void loadReports();
		}
	});

	async function loadReports() {
		loading = true;

		try {
			data = await getAdminPvpReports(await $user.token());

			if (!isKnownReportedUid(appliedFilters.reportedUid, data)) {
				appliedFilters = { ...appliedFilters, reportedUid: 'all' };
			}

			if (!isKnownReportedUid(draftFilters.reportedUid, data)) {
				draftFilters = { ...draftFilters, reportedUid: 'all' };
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to load PvP reports');
		} finally {
			loading = false;
		}
	}

	function isKnownReportedUid(uid: string, payload: AdminPvpReportsResponse | null = data) {
		return uid === 'all' || Boolean(payload?.playerCounts.some((count) => count.uid === uid));
	}

	function applyFilters() {
		appliedFilters = { ...draftFilters };
	}

	function reportedUid(item: AdminPvpReportEvidence) {
		return item.reportedPlayer?.uid
			?? item.reportedParticipant?.uid
			?? null;
	}

	function playerName(player: PvpPlayer | null | undefined, fallback = 'Unknown player') {
		return String(player?.name || player?.uid || fallback);
	}

	function reportId(item: AdminPvpReportEvidence) {
		const id = Number(item.report?.id);

		return Number.isInteger(id) && id > 0 ? id : null;
	}

	function reportMatchId(item: AdminPvpReportEvidence) {
		return item.report?.matchId ?? item.report?.match_id ?? item.match?.id ?? item.match?.matchId ?? null;
	}

	function formatDate(value: string | null | undefined) {
		if (!value) {
			return 'Unknown';
		}

		const date = new Date(value);

		return Number.isFinite(date.getTime())
			? date.toLocaleString()
			: String(value);
	}

	function dateKey(value: string | null | undefined) {
		if (!value) {
			return 'Unknown';
		}

		const date = new Date(value);

		return Number.isFinite(date.getTime())
			? date.toISOString()
				.slice(0, 10)
			: 'Unknown';
	}

	function formatReason(value: unknown) {
		return reasonOptions.find((reason) => reason.value === value)?.label
			?? String(value || 'Unknown');
	}

	function reportTargetType(item: AdminPvpReportEvidence): PvpMatchReportTargetType {
		return (item.report?.targetType ?? item.report?.target_type ?? 'player') === 'level'
			? 'level'
			: 'player';
	}

	function formatTarget(item: AdminPvpReportEvidence) {
		return reportTargetType(item) === 'level' ? 'Level' : 'Player';
	}

	function reportLevel(item: AdminPvpReportEvidence) {
		return item.reportedLevel
			?? item.match?.level
			?? item.match?.levels
			?? item.match?.selectedLevel
			?? null;
	}

	function reportLevelId(item: AdminPvpReportEvidence) {
		const level = reportLevel(item);

		return item.report?.targetLevelId
			?? item.report?.target_level_id
			?? level?.id
			?? item.match?.levelId
			?? item.match?.level_id
			?? null;
	}

	function levelLabel(item: AdminPvpReportEvidence) {
		const level = reportLevel(item);
		const id = reportLevelId(item);
		const name = level?.name ? String(level.name) : null;

		return name && id ? `${name} (#${id})` : name || (id ? `Level #${id}` : 'Unknown level');
	}

	function matchesAppliedFilters(item: AdminPvpReportEvidence) {
		return matchesReportedPlayer(item)
			&& matchesDate(item)
			&& matchesTarget(item)
			&& matchesReason(item)
			&& matchesResolveStatus(item);
	}

	function matchesReportedPlayer(item: AdminPvpReportEvidence) {
		return appliedFilters.reportedUid === 'all'
			|| (reportTargetType(item) === 'player' && reportedUid(item) === appliedFilters.reportedUid);
	}

	function matchesTarget(item: AdminPvpReportEvidence) {
		return appliedFilters.target === 'all'
			|| reportTargetType(item) === appliedFilters.target;
	}

	function matchesDate(item: AdminPvpReportEvidence) {
		if (appliedFilters.date === 'all') {
			return true;
		}

		const createdMs = new Date(String(item.report?.created_at || ''))
			.getTime();

		return Number.isFinite(createdMs)
			&& createdMs >= Date.now() - appliedFilters.date * 24 * 60 * 60 * 1000;
	}

	function matchesReason(item: AdminPvpReportEvidence) {
		return appliedFilters.reason === 'all'
			|| item.report?.reason === appliedFilters.reason;
	}

	function matchesResolveStatus(item: AdminPvpReportEvidence) {
		if (appliedFilters.status === 'all') {
			return true;
		}

		return appliedFilters.status === 'resolved'
			? isReportResolved(item)
			: !isReportResolved(item);
	}

	function isReportResolved(item: AdminPvpReportEvidence) {
		const resolved = item.report?.resolved as unknown;

		return resolved === true
			|| resolved === 1
			|| resolved === 'true'
			|| resolved === '1';
	}

	function compareReports(a: AdminPvpReportEvidence, b: AdminPvpReportEvidence) {
		const resolvedDelta = Number(isReportResolved(a))
			- Number(isReportResolved(b));

		if (resolvedDelta) {
			return resolvedDelta;
		}

		return new Date(String(b.report?.created_at || 0))
			.getTime()
			- new Date(String(a.report?.created_at || 0))
				.getTime();
	}

	function buildChartData(items: AdminPvpReportEvidence[]) {
		const labels = [...new Set(items.map((item) => dateKey(item.report?.created_at)))]
			.sort();
		const counts = new Map<string, Record<string, number>>();

		for (const label of labels) {
			counts.set(
				label,
				Object.fromEntries(reasonOptions.map((reason) => [reason.value, 0]))
			);
		}

		for (const item of items) {
			const label = dateKey(item.report?.created_at);
			const reason = String(item.report?.reason || 'other');
			const bucket = counts.get(label);

			if (bucket && reason in bucket) {
				bucket[reason] += 1;
			}
		}

		return {
			labels,
			datasets: reasonOptions.map((reason) => ({
				label: reason.label,
				data: labels.map((label) => counts.get(label)?.[reason.value] ?? 0),
				backgroundColor: reason.color,
				borderRadius: 4
			}))
		};
	}

	function reportChart(node: HTMLCanvasElement, value: ReturnType<typeof buildChartData>) {
		const chart = new Chart(node, {
			type: 'bar',
			data: value,
			options: {
				responsive: true,
				maintainAspectRatio: false,
				scales: {
					x: {
						grid: { display: false },
						stacked: false
					},
					y: {
						beginAtZero: true,
						ticks: { precision: 0 }
					}
				},
				plugins: {
					legend: {
						position: 'bottom'
					}
				}
			}
		});

		return {
			update(nextValue: ReturnType<typeof buildChartData>) {
				chart.data = nextValue;
				chart.update();
			},
			destroy() {
				chart.destroy();
			}
		};
	}

	function buildUnresolvedByReason(items: AdminPvpReportEvidence[]) {
		const counts: Record<PvpMatchReportReason, number> = {
			cheating: 0,
			abusive_communication: 0,
			too_easy: 0,
			too_difficult: 0,
			level_deleted: 0,
			secret_way: 0,
			unenjoyable: 0,
			other: 0
		};

		for (const item of items) {
			const reason = item.report?.reason as PvpMatchReportReason;

			if (reportTargetType(item) === 'player' && !isReportResolved(item) && reason in counts) {
				counts[reason] += 1;
			}
		}

		return counts;
	}

	async function resolveReason(reason: PvpMatchReportReason) {
		if (appliedFilters.reportedUid === 'all') {
			toast.error('Select one reported player first');

			return;
		}

		const count = unresolvedByReason[reason] ?? 0;

		if (!count) {
			return;
		}

		const label = formatReason(reason);
		const name = playerName(selectedPlayer, appliedFilters.reportedUid);

		if (!confirm(`Mark ${count} ${label} report(s) for ${name} as resolved?`)) {
			return;
		}

		resolvingKey = `reason:${reason}`;

		try {
			const result = await resolveAdminPvpReportsByPlayerReason(await $user.token(), {
				uid: appliedFilters.reportedUid,
				reason
			});
			toast.success(`Resolved ${result.resolvedCount} report(s)`);
			await loadReports();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to resolve reports');
		} finally {
			resolvingKey = '';
		}
	}

	async function resolveOne(item: AdminPvpReportEvidence) {
		const id = reportId(item);

		if (!id || isReportResolved(item)) {
			return;
		}

		resolvingKey = `report:${id}`;

		try {
			await resolveAdminPvpReport(await $user.token(), id);
			toast.success('Report resolved');
			await loadReports();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to resolve report');
		} finally {
			resolvingKey = '';
		}
	}
</script>

<Title value="PvP Reports - Admin" />

{#if $user.data?.isAdmin}
  <div class="page">
    <div class="page-header">
      <div>
        <h1>PvP Reports</h1>
        <p>Filter reports, review summaries, and resolve reports without opening match evidence here.</p>
      </div>
      <Button variant="outline" disabled={loading} on:click={loadReports}>
        <RefreshCw class={`mr-2 h-4 w-4${loading ? ' animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>

    <Card.Root>
      <Card.Content>
        <div class="filters">
          <label class="selector">
            <span>Reported player</span>
            <select bind:value={draftFilters.reportedUid}>
              <option value="all">All reported players</option>
              {#each playerCounts.filter((count) => count.uid) as count}
                <option value={count.uid}>
                  {playerName(count.player, count.uid || 'Unknown')} ({count.reportCount})
                </option>
              {/each}
            </select>
          </label>

          <label class="selector">
            <span>Resolved status</span>
            <select bind:value={draftFilters.status}>
              {#each resolveOptions as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </label>

          <label class="selector">
            <span>Target</span>
            <select bind:value={draftFilters.target}>
              {#each targetOptions as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </label>

          <label class="selector">
            <span>Reason</span>
            <select bind:value={draftFilters.reason}>
              <option value="all">All reasons</option>
              {#each reasonOptions as reason}
                <option value={reason.value}>{reason.label}</option>
              {/each}
            </select>
          </label>

          <div class="date-filter" aria-label="Date filter">
            {#each dateOptions as option}
              <Button
                variant={draftFilters.date === option.value ? 'default' : 'outline'}
                on:click={() => (draftFilters = { ...draftFilters, date: option.value })}
              >
                <CalendarDays class="mr-2 h-4 w-4" />
                {option.label}
              </Button>
            {/each}
          </div>

          <div class="apply-row">
            <Button class="apply-button" on:click={applyFilters}>
              Apply
            </Button>
          </div>
        </div>

        {#if appliedFilters.reportedUid !== 'all'}
          <div class="resolve-actions">
            {#each playerReasonOptions as reason}
              <Button
                variant="outline"
                disabled={loading || resolvingKey === `reason:${reason.value}` || !unresolvedByReason[reason.value]}
                on:click={() => resolveReason(reason.value)}
              >
                <CheckCircle2 class="mr-2 h-4 w-4" />
                Resolve {formatReason(reason.value)} ({unresolvedByReason[reason.value]})
              </Button>
            {/each}
          </div>
        {/if}
      </Card.Content>
    </Card.Root>

    <div class="stats-grid">
      <div class="stat">
        <ShieldAlert class="h-5 w-5" />
        <span>All reports</span>
        <strong>{reports.length}</strong>
      </div>
      <div class="stat">
        <AlertTriangle class="h-5 w-5" />
        <span>Visible reports</span>
        <strong>{visibleReports.length}</strong>
      </div>
      <div class="stat">
        <UserRound class="h-5 w-5" />
        <span>Reported players</span>
        <strong>{playerCounts.length}</strong>
      </div>
    </div>

    <Card.Root>
      <Card.Header>
        <Card.Title>
          <BarChart3 class="h-5 w-5" />
          Reports by Date
        </Card.Title>
        <Card.Description>Each date has separate bars for each report reason.</Card.Description>
      </Card.Header>
      <Card.Content>
        {#if visibleReports.length === 0}
          <div class="empty">No visible reports for this selection.</div>
        {:else}
          <div class="chart-wrap">
            <canvas use:reportChart={chartData} aria-label="PvP report count by date and reason" />
          </div>
        {/if}
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header>
        <Card.Title>Report List</Card.Title>
        <Card.Description>Use the match link for full match details.</Card.Description>
      </Card.Header>
      <Card.Content>
        {#if loading && !data}
          <div class="empty">Loading reports...</div>
        {:else if visibleReports.length === 0}
          <div class="empty">No reports to show.</div>
        {:else}
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Target</th>
                  <th>Reported target</th>
                  <th>Reported by</th>
                  <th>Reason</th>
                  <th>Description</th>
                  <th>Match</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {#each visibleReports as item}
                  <tr>
                    <td>{formatTarget(item)}</td>
                    <td>
                      {#if reportTargetType(item) === 'level'}
                        {#if reportLevelId(item)}
                          <a href={`/level/${reportLevelId(item)}`}>
                            {levelLabel(item)}
                          </a>
                        {:else}
                          {levelLabel(item)}
                        {/if}
                      {:else if item.reportedPlayer}
                        <PlayerLink player={item.reportedPlayer} truncate={22} />
                      {:else}
                        Unknown opponent
                      {/if}
                    </td>
                    <td>
                      {#if item.reporter}
                        <PlayerLink player={item.reporter} truncate={22} />
                      {:else}
                        Unknown reporter
                      {/if}
                    </td>
                    <td>{formatReason(item.report?.reason)}</td>
                    <td class="description-cell">{item.report?.description || '-'}</td>
                    <td>
                      {#if reportMatchId(item)}
                        <a href={`/versus/matches/${reportMatchId(item)}`}>Match #{reportMatchId(item)}</a>
                      {:else}
                        -
                      {/if}
                    </td>
                    <td>{formatDate(item.report?.created_at)}</td>
                    <td>
                      <Badge variant={isReportResolved(item) ? 'outline' : 'destructive'}>
                        {isReportResolved(item) ? 'Resolved' : 'Unresolved'}
                      </Badge>
                    </td>
                    <td>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isReportResolved(item) || resolvingKey === `report:${reportId(item)}`}
                        on:click={() => resolveOne(item)}
                      >
                        Resolve
                      </Button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </Card.Content>
    </Card.Root>
  </div>
{/if}

<style lang="scss">
.page {
  width: min(1400px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 32px 0;
  display: grid;
  gap: 20px;
}

.page-header,
.filters,
.date-filter,
.resolve-actions,
.stat,
:global([data-card-title]) {
  display: flex;
  align-items: center;
}

.page-header {
  justify-content: space-between;
  gap: 16px;
}

.page-header h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
}

.page-header p,
.selector span {
  color: hsl(var(--muted-foreground));
}

.page-header p {
  margin: 4px 0 0;
}

.filters {
  gap: 14px;
  flex-wrap: wrap;
}

.selector {
  display: grid;
  gap: 8px;
  min-width: 220px;
}

.selector span {
  font-size: 13px;
  font-weight: 600;
}

.selector select {
  height: 40px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--background));
  padding: 0 10px;
}

.date-filter,
.resolve-actions,
.apply-row {
  gap: 8px;
  flex-wrap: wrap;
}

.date-filter {
  align-self: end;
}

.resolve-actions {
  margin-top: 14px;
}

.apply-row {
  display: flex;
  justify-content: flex-end;
  width: 100%;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.stat {
  gap: 10px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  padding: 14px;
  background: hsl(var(--card));
}

.stat strong {
  margin-left: auto;
  font-size: 22px;
}

.chart-wrap {
  height: 280px;
  min-height: 280px;
}

.empty {
  border: 1px dashed hsl(var(--border));
  border-radius: 8px;
  padding: 20px;
  color: hsl(var(--muted-foreground));
  text-align: center;
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

table {
  width: 100%;
  min-width: 980px;
  border-collapse: collapse;
  font-size: 13px;
}

th,
td {
  padding: 10px;
  border-bottom: 1px solid hsl(var(--border));
  text-align: left;
  vertical-align: top;
}

th {
  color: hsl(var(--muted-foreground));
  font-weight: 600;
}

tbody tr:last-child td {
  border-bottom: 0;
}

.description-cell {
  max-width: 360px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

a {
  color: hsl(var(--primary));
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

@media (max-width: 900px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .page-header {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
