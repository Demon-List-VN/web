<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import PlayerSelector from '$lib/components/playerSelector.svelte';
	import { user } from '$lib/client';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import { Activity, AlertTriangle, ArrowRight, BarChart3, CheckCircle2, Clock3, Gauge, RefreshCw, Search, ShieldCheck, Users, Workflow, Zap } from 'lucide-svelte';
	import { banAdminOverwatchPlayer, getAdminOverwatchMetrics, getAdminOverwatchPlayer, setAdminOverwatchReputation, unbanAdminOverwatchPlayer } from '$lib/client/overwatch';

	type DashboardView = 'analytics' | 'cases' | 'reviewers';
	type OverwatchCaseSummary = {
		caseId: number; recordId: number | null; playerId: string | null; playerName: string;
		levelId: number | null; levelName: string; progress: number; status: string; phase: string;
		round: number; requiredReviewers: number; submittedAt: string; poolEnteredAt: string | null;
		finalizedAt: string | null; finalVerdict: string | null;
	};
	type OverwatchMetrics = {
		queueLength: number; poolLength: number; recordsResolvedLast7Days: number;
		averageDailyThroughput: number; recordsEnteredPoolLast7Days: number;
		medianQueueTimeMs: number | null; medianReviewTimeMs: number | null;
		reviewsLast7Days: number; activeReviewersLast7Days: number; reviewsPerRecord: number;
		highRepReviewRate: number; auditRate: number; auditDisagreementRate: number;
		percentageResolvedAt2: number; percentageResolvedAt3: number;
		percentageResolvedAt5: number; percentageResolvedAt7: number;
		evidenceRequestRate: number; appealRate: number; appealOverturnRate: number;
		overturnRate: number; collusionFlagsLast7Days: number; reviewerProfiles: number;
		poolRecords: OverwatchCaseSummary[]; queueRecords: OverwatchCaseSummary[];
		recentlyConcludedRecords: OverwatchCaseSummary[];
	};

	let activeView: DashboardView = 'analytics';
	let selectedPlayer: { uid: string; name: string; } | null = null;
	let data: any = null;
	let metrics: OverwatchMetrics | null = null;
	let metricsLoading = false;
	let metricsError = '';
	let lastUpdated: Date | null = null;
	let loading = false;
	let saving = false;
	let targetScore = 150;
	let reputationReason = '';
	let banReason = '';
	let permanentBan = true;
	let bannedUntil = '';
	let unbanReason = '';
	let metricsLoadedUid: string | null = null;

	$: openWork = (metrics?.queueLength ?? 0) + (metrics?.poolLength ?? 0);
	$: netFlow = (metrics?.recordsResolvedLast7Days ?? 0) - (metrics?.recordsEnteredPoolLast7Days ?? 0);
	$: sevenDayCapacity = (metrics?.averageDailyThroughput ?? 0) * 7;
	$: estimatedClearDays = metrics && metrics.averageDailyThroughput > 0 ? openWork / metrics.averageDailyThroughput : null;

	async function token() { return $user.token(); }
	function number(value: number, digits = 0) {
		return new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(value) || 0);
	}
	function percent(value: number) { return `${number((Number(value) || 0) * 100, 1)}%`; }
	function duration(value: number | null) {
		if (value === null || !Number.isFinite(value)) return 'No data';
		const hours = value / 3600000;
		if (hours < 1) return `${Math.max(1, Math.round(value / 60000))}m`;
		if (hours < 24) return `${number(hours, hours < 10 ? 1 : 0)}h`;
		return `${number(hours / 24, 1)}d`;
	}
	function clampPercent(value: number) { return Math.max(0, Math.min(100, (Number(value) || 0) * 100)); }
	function errorText(error: unknown, fallback: string) { return error instanceof Error ? error.message : fallback; }
	function statusLabel(value: string) {
		return value.toLowerCase().split('_').map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' ');
	}
	function statusTone(value: string) {
		if (value === 'ACCEPTED') return 'success';
		if (['REJECTED', 'REJECTED_FINAL', 'REJECTED_INSUFFICIENT_EVIDENCE', 'REVOKED'].includes(value)) return 'danger';
		if (['EVIDENCE_REQUESTED', 'RECHECK_REQUIRED', 'APPEAL_PENDING', 'COLLUSION_RECHECK_REQUIRED'].includes(value)) return 'warning';
		if (['CANCELLED', 'SUPERSEDED'].includes(value)) return 'neutral';
		return 'active';
	}
	function recordHref(item: OverwatchCaseSummary) {
		return item.playerId && item.levelId ? `/record/${item.playerId}/${item.levelId}` : null;
	}

	async function loadMetrics(showToast = false) {
		metricsLoading = true;
		metricsError = '';
		try {
			metrics = await getAdminOverwatchMetrics(await token());
			lastUpdated = new Date();
			if (showToast) toast.success('Analytics refreshed.');
		} catch (error) {
			metricsError = errorText(error, 'Failed to load analytics.');
			if (showToast) toast.error(metricsError);
		} finally { metricsLoading = false; }
	}

	async function loadPlayer() {
		if (!selectedPlayer) return;
		loading = true;
		try {
			data = await getAdminOverwatchPlayer(await token(), selectedPlayer.uid);
			targetScore = Number(data.profile.reputationScore);
		} catch (error) {
			data = null;
			toast.error(errorText(error, 'Failed to load reviewer'));
		} finally { loading = false; }
	}

	async function saveReputation() {
		if (!selectedPlayer || !reputationReason.trim()) { toast.error('A reason is required.'); return; }
		saving = true;
		try {
			data = await setAdminOverwatchReputation(await token(), selectedPlayer.uid, Number(targetScore), reputationReason.trim());
			reputationReason = '';
			targetScore = Number(data.profile.reputationScore);
			toast.success('Reputation updated.');
		} catch (error) { toast.error(errorText(error, 'Failed to update reputation')); }
		finally { saving = false; }
	}

	async function banPlayer() {
		if (!selectedPlayer || !banReason.trim()) { toast.error('A ban reason is required.'); return; }
		if (!permanentBan && !bannedUntil) { toast.error('Choose when the temporary ban ends.'); return; }
		saving = true;
		try {
			data = await banAdminOverwatchPlayer(await token(), selectedPlayer.uid, banReason.trim(), permanentBan ? null : new Date(bannedUntil).toISOString());
			banReason = '';
			bannedUntil = '';
			toast.success('Overwatch access suspended.');
			void loadMetrics();
		} catch (error) { toast.error(errorText(error, 'Failed to ban reviewer')); }
		finally { saving = false; }
	}

	async function unbanPlayer() {
		if (!selectedPlayer || !unbanReason.trim()) { toast.error('An unban note is required.'); return; }
		saving = true;
		try {
			data = await unbanAdminOverwatchPlayer(await token(), selectedPlayer.uid, unbanReason.trim());
			unbanReason = '';
			toast.success('Overwatch access restored.');
			void loadMetrics();
		} catch (error) { toast.error(errorText(error, 'Failed to unban reviewer')); }
		finally { saving = false; }
	}

	onMount(() => user.subscribe((currentUser) => {
		const uid = currentUser.data?.isAdmin ? String(currentUser.data.uid ?? '') : null;

		if (currentUser.checked && uid && uid !== metricsLoadedUid) {
			metricsLoadedUid = uid;
			void loadMetrics();
		}
	}));
</script>

<svelte:head>
  <title>Overwatch Analytics · Admin</title>
  <meta name="description" content="Operational analytics and reviewer management for Overwatch." />
</svelte:head>

{#if !$user.data?.isAdmin}
  <main class="access-state">
    <span class="access-icon"><ShieldCheck size={25} /></span>
    <h1>Administrator access required</h1>
    <p>This workspace is only available to Overwatch administrators.</p>
  </main>
{:else}
  <main class="admin-overwatch">
    <header class="page-header">
      <div class="eyebrow"><span></span> MODERATION INTELLIGENCE</div>
      <div class="header-row">
        <div><h1>Overwatch <em>analytics</em></h1><p>System health, review quality, and investigator operations in one place.</p></div>
        <div class="header-actions">
          {#if lastUpdated}<span class="updated"><span class="live-dot"></span>Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>{/if}
          <Button variant="outline" disabled={metricsLoading} on:click={() => loadMetrics(true)}><RefreshCw size={15} class={metricsLoading ? 'spin' : ''} /> Refresh</Button>
        </div>
      </div>
      <nav class="view-tabs" aria-label="Overwatch admin sections">
        <button class:active={activeView === 'analytics'} on:click={() => (activeView = 'analytics')}><BarChart3 size={16} /> Analytics</button>
		<button class:active={activeView === 'cases'} on:click={() => (activeView = 'cases')}><Workflow size={16} /> Case monitor</button>
        <button class:active={activeView === 'reviewers'} on:click={() => (activeView = 'reviewers')}><Users size={16} /> Reviewer management</button>
      </nav>
    </header>

    {#if activeView === 'analytics'}
      {#if metricsLoading && !metrics}
        <section class="loading-grid" aria-label="Loading analytics">{#each Array(8) as _}<div class="skeleton"></div>{/each}</section>
      {:else if metricsError && !metrics}
        <section class="error-card"><AlertTriangle size={22} /><div><strong>Analytics are unavailable</strong><p>{metricsError}</p></div><Button variant="outline" on:click={() => loadMetrics()}>Try again</Button></section>
      {:else if metrics}
        <section class="kpi-grid" aria-label="Key performance indicators">
          <article class="kpi-card accent-blue"><div class="kpi-top"><span class="icon-box"><Workflow size={18} /></span><Badge variant="outline">LIVE</Badge></div><span class="kpi-label">Open workload</span><strong>{number(openWork)}</strong><small>{number(metrics.queueLength)} queued · {number(metrics.poolLength)} in review</small></article>
          <article class="kpi-card accent-green"><div class="kpi-top"><span class="icon-box"><CheckCircle2 size={18} /></span><span class="period">LAST 7 DAYS</span></div><span class="kpi-label">Records resolved</span><strong>{number(metrics.recordsResolvedLast7Days)}</strong><small>{number(metrics.averageDailyThroughput, 1)} average per day</small></article>
          <article class="kpi-card accent-violet"><div class="kpi-top"><span class="icon-box"><Users size={18} /></span><span class="period">LAST 7 DAYS</span></div><span class="kpi-label">Active reviewers</span><strong>{number(metrics.activeReviewersLast7Days)}</strong><small>{number(metrics.reviewsLast7Days)} total decisions cast</small></article>
          <article class="kpi-card accent-orange"><div class="kpi-top"><span class="icon-box"><Clock3 size={18} /></span><span class="period">MEDIAN</span></div><span class="kpi-label">Review turnaround</span><strong>{duration(metrics.medianReviewTimeMs)}</strong><small>{duration(metrics.medianQueueTimeMs)} waiting before review</small></article>
        </section>

        <section class="analytics-layout">
          <article class="panel flow-panel">
            <div class="panel-header"><div><span class="section-kicker">OPERATIONS</span><h2>Case flow</h2></div><span class:positive={netFlow >= 0} class:negative={netFlow < 0} class="flow-badge">{netFlow >= 0 ? '↓' : '↑'} {number(Math.abs(netFlow))} net backlog</span></div>
            <div class="flow-visual">
              <div class="flow-step"><span>Entered pool</span><strong>{number(metrics.recordsEnteredPoolLast7Days)}</strong><small>past 7 days</small></div><ArrowRight class="flow-arrow" size={22} />
              <div class="flow-step highlighted"><span>Reviewed</span><strong>{number(metrics.reviewsLast7Days)}</strong><small>{number(metrics.reviewsPerRecord, 1)} reviews / record</small></div><ArrowRight class="flow-arrow" size={22} />
              <div class="flow-step"><span>Resolved</span><strong>{number(metrics.recordsResolvedLast7Days)}</strong><small>{number(sevenDayCapacity, 1)} weekly pace</small></div>
            </div>
            <div class="flow-footer"><div><Gauge size={17} /><span>Estimated clearance</span><strong>{estimatedClearDays === null ? '—' : `${number(estimatedClearDays, 1)} days`}</strong></div><div><Zap size={17} /><span>Throughput</span><strong>{number(metrics.averageDailyThroughput, 1)} / day</strong></div></div>
          </article>

          <article class="panel resolution-panel">
            <div class="panel-header"><div><span class="section-kicker">CONSENSUS</span><h2>Resolution depth</h2></div><Activity size={19} class="muted-icon" /></div>
            <p class="panel-copy">Share of resolved cases that reached consensus at each reviewer checkpoint.</p>
            <div class="checkpoint-list">
              {#each [{ label: '2 reviewers', value: metrics.percentageResolvedAt2, tone: 'blue' }, { label: '3 reviewers', value: metrics.percentageResolvedAt3, tone: 'violet' }, { label: '5 reviewers', value: metrics.percentageResolvedAt5, tone: 'orange' }, { label: '7 reviewers', value: metrics.percentageResolvedAt7, tone: 'red' }] as item}
                <div class="checkpoint"><div><span>{item.label}</span><strong>{percent(item.value)}</strong></div><div class="progress-track"><span class="{item.tone}" style={`width:${clampPercent(item.value)}%`}></span></div></div>
              {/each}
            </div>
          </article>
        </section>

        <section class="quality-grid">
          <article class="panel quality-panel">
            <div class="panel-header"><div><span class="section-kicker">QUALITY CONTROL</span><h2>Review integrity</h2></div><ShieldCheck size={20} class="muted-icon" /></div>
            <div class="metric-list">
              <div><span>High-reputation review share<small>Decisions from elevated review tiers</small></span><strong>{percent(metrics.highRepReviewRate)}</strong></div>
              <div><span>Audit coverage<small>Reviews independently audited</small></span><strong>{percent(metrics.auditRate)}</strong></div>
              <div><span>Audit disagreement<small>Audits that challenged the original vote</small></span><strong class:warn={metrics.auditDisagreementRate > 0.15}>{percent(metrics.auditDisagreementRate)}</strong></div>
              <div><span>Collusion signals<small>Flags created during the past 7 days</small></span><strong class:warn={metrics.collusionFlagsLast7Days > 0}>{number(metrics.collusionFlagsLast7Days)}</strong></div>
            </div>
          </article>
          <article class="panel quality-panel">
            <div class="panel-header"><div><span class="section-kicker">OUTCOMES</span><h2>Escalations & appeals</h2></div><AlertTriangle size={20} class="muted-icon" /></div>
            <div class="metric-list">
              <div><span>Evidence requested<small>Recent cases needing more proof</small></span><strong>{percent(metrics.evidenceRequestRate)}</strong></div>
              <div><span>Appeal rate<small>Recent cases entering appeal</small></span><strong>{percent(metrics.appealRate)}</strong></div>
              <div><span>Appeals overturned<small>Appeals accepted after resolution</small></span><strong>{percent(metrics.appealOverturnRate)}</strong></div>
              <div><span>Overall overturn rate<small>Resolved decisions later revoked</small></span><strong class:warn={metrics.overturnRate > 0.05}>{percent(metrics.overturnRate)}</strong></div>
            </div>
          </article>
          <article class="panel reviewer-panel">
            <div class="panel-header"><div><span class="section-kicker">REVIEWER NETWORK</span><h2>Participation</h2></div><Users size={20} class="muted-icon" /></div>
            <div class="participation"><div class="ring" style={`--value:${clampPercent(metrics.reviewerProfiles ? metrics.activeReviewersLast7Days / metrics.reviewerProfiles : 0)}`}><div><strong>{metrics.reviewerProfiles ? percent(metrics.activeReviewersLast7Days / metrics.reviewerProfiles) : '0%'}</strong><span>active</span></div></div><div class="participation-copy"><strong>{number(metrics.reviewerProfiles)}</strong><span>reviewer profiles</span><strong>{number(metrics.activeReviewersLast7Days)}</strong><span>active this week</span></div></div>
            <Button variant="outline" class="w-full" on:click={() => (activeView = 'reviewers')}><Search size={15} /> Inspect a reviewer</Button>
          </article>
        </section>
      {/if}
	{:else if activeView === 'cases'}
	  {#if metricsLoading && !metrics}
		<section class="loading-grid" aria-label="Loading cases">{#each Array(4) as _}<div class="skeleton"></div>{/each}</section>
	  {:else if metricsError && !metrics}
		<section class="error-card"><AlertTriangle size={22} /><div><strong>Case data is unavailable</strong><p>{metricsError}</p></div><Button variant="outline" on:click={() => loadMetrics()}>Try again</Button></section>
	  {:else if metrics}
		<section class="case-workspace">
		  <div class="reviewer-intro"><span class="section-kicker">LIVE CASE OPERATIONS</span><h2>Case monitor</h2><p>Track records as they move from the queue through review to a final verdict.</p></div>
		  <section class="case-summary-grid">
			<div><span class="summary-dot blue"></span><strong>{metrics.poolRecords.length}</strong><small>records in pool</small></div>
			<div><span class="summary-dot orange"></span><strong>{metrics.queueLength}</strong><small>waiting in queue</small></div>
			<div><span class="summary-dot green"></span><strong>{metrics.recentlyConcludedRecords.length}</strong><small>recent conclusions shown</small></div>
		  </section>

		  <section class="panel case-table-card">
			<div class="panel-header"><div><span class="section-kicker">ACTIVE POOL</span><h2>Records under review</h2><p>Oldest pool entries appear first.</p></div><Badge variant="outline">{metrics.poolRecords.length} active</Badge></div>
			<div class="table-scroll"><Table.Root><Table.Header><Table.Row><Table.Head>Record</Table.Head><Table.Head>Player</Table.Head><Table.Head>Status</Table.Head><Table.Head>Phase</Table.Head><Table.Head class="text-center">Round</Table.Head><Table.Head class="text-center">Reviewers</Table.Head><Table.Head>In pool</Table.Head></Table.Row></Table.Header><Table.Body>
			  {#each metrics.poolRecords as item (item.caseId)}
				<Table.Row><Table.Cell><div class="record-cell">{#if recordHref(item)}<a href={recordHref(item) ?? '#'}>{item.levelName}</a>{:else}<strong>{item.levelName}</strong>{/if}<small>#{item.recordId ?? '—'} · {number(item.progress)}%</small></div></Table.Cell><Table.Cell>{item.playerName}</Table.Cell><Table.Cell><span class="status-pill {statusTone(item.status)}">{statusLabel(item.status)}</span></Table.Cell><Table.Cell><span class="phase-label">{statusLabel(item.phase)}</span></Table.Cell><Table.Cell class="text-center">{item.round}</Table.Cell><Table.Cell class="text-center">{item.requiredReviewers}</Table.Cell><Table.Cell>{item.poolEnteredAt ? duration(Date.now() - new Date(item.poolEnteredAt).getTime()) : '—'}</Table.Cell></Table.Row>
			  {:else}<Table.Row><Table.Cell colspan={7} class="text-center text-muted-foreground">The review pool is empty.</Table.Cell></Table.Row>{/each}
			</Table.Body></Table.Root></div>
		  </section>

		  <div class="case-columns">
			<section class="panel case-table-card">
			  <div class="panel-header"><div><span class="section-kicker">UP NEXT</span><h2>Top 5 in queue</h2><p>Ordered by submission time.</p></div><Clock3 size={19} class="muted-icon" /></div>
			  <div class="compact-case-list">{#each metrics.queueRecords as item, index (item.caseId)}<article><span class="queue-rank">{index + 1}</span><div class="record-cell">{#if recordHref(item)}<a href={recordHref(item) ?? '#'}>{item.levelName}</a>{:else}<strong>{item.levelName}</strong>{/if}<small>{item.playerName} · {number(item.progress)}%</small></div><time>{duration(Date.now() - new Date(item.submittedAt).getTime())}</time></article>{:else}<div class="compact-empty">No records are waiting in queue.</div>{/each}</div>
			</section>
			<section class="panel case-table-card">
			  <div class="panel-header"><div><span class="section-kicker">RECENTLY CONCLUDED</span><h2>Latest verdicts</h2><p>Ten most recent finalized cases.</p></div><CheckCircle2 size={19} class="muted-icon" /></div>
			  <div class="compact-case-list">{#each metrics.recentlyConcludedRecords as item (item.caseId)}<article><span class="verdict-mark {statusTone(item.finalVerdict ?? item.status)}"></span><div class="record-cell">{#if recordHref(item)}<a href={recordHref(item) ?? '#'}>{item.levelName}</a>{:else}<strong>{item.levelName}</strong>{/if}<small>{item.playerName} · {statusLabel(item.finalVerdict ?? item.status)}</small></div><time>{item.finalizedAt ? new Date(item.finalizedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '—'}</time></article>{:else}<div class="compact-empty">No cases have concluded yet.</div>{/each}</div>
			</section>
		  </div>
		</section>
	  {/if}
	{:else}
      <section class="reviewer-workspace">
        <div class="reviewer-intro"><span class="section-kicker">INVESTIGATOR OPERATIONS</span><h2>Reviewer management</h2><p>Inspect reputation history, adjust trust scores, and control Overwatch access.</p></div>
        <section class="panel selector-card"><div><h3>Find a reviewer</h3><p>Search by player name, then load their Overwatch profile.</p></div><PlayerSelector bind:value={selectedPlayer} disabled={loading || saving} on:select={loadPlayer} on:clear={() => (data = null)} /><Button disabled={!selectedPlayer || loading || saving} on:click={loadPlayer}>{loading ? 'Loading…' : 'Load profile'}</Button></section>
        {#if data}
          <section class="profile-strip"><div><span>Player</span><strong>{data.player.name}</strong><small>{data.player.uid}</small></div><div><span>Reputation</span><strong>{number(data.profile.reputationScore)}</strong><small>{data.profile.reputationTier} · weight {number(data.profile.effectiveWeight, 2)}</small></div><div><span>Completed</span><strong>{number(data.profile.completedReviews)}</strong><small>{data.profile.probation ? 'Probation' : 'Full weight'}</small></div><div><span>Access</span><strong class:banned={data.profile.banned}>{data.profile.banned ? 'Suspended' : 'Active'}</strong><small>{data.profile.bannedUntil ? `Until ${new Date(data.profile.bannedUntil).toLocaleString()}` : data.profile.banned ? 'Permanent' : 'Eligible when level ≥ 50'}</small></div></section>
          <div class="management-grid">
            <section class="panel form-card"><span class="section-kicker">TRUST & WEIGHT</span><h3>Set reputation</h3><p>Set the exact score. The delta and administrator reason are appended to the ledger.</p><div class="field"><Label for="score">Score (0–1000)</Label><Input id="score" type="number" min="0" max="1000" step="0.01" bind:value={targetScore} /></div><div class="field"><Label for="rep-reason">Reason</Label><Textarea id="rep-reason" rows={4} bind:value={reputationReason} placeholder="Explain why this score is changing…" /></div><Button disabled={saving || targetScore < 0 || targetScore > 1000 || !reputationReason.trim()} on:click={saveReputation}>Save reputation</Button></section>
            <section class="panel form-card danger-card"><span class="section-kicker">ACCESS CONTROL</span><h3>{data.profile.banned ? 'Restore access' : 'Suspend access'}</h3>{#if data.profile.banned}<p><strong>Current reason:</strong> {data.profile.banReason}</p><div class="field"><Label for="unban-reason">Administrative note</Label><Textarea id="unban-reason" rows={4} bind:value={unbanReason} /></div><Button disabled={saving || !unbanReason.trim()} on:click={unbanPlayer}>Unban reviewer</Button>{:else}<p>Prevent this account from retrieving or voting on Overwatch cases.</p><div class="field"><Label for="ban-reason">Reason</Label><Textarea id="ban-reason" rows={3} bind:value={banReason} /></div><label class="checkbox-row"><input type="checkbox" bind:checked={permanentBan} /> Permanent suspension</label>{#if !permanentBan}<div class="field"><Label for="ban-until">Suspended until</Label><Input id="ban-until" type="datetime-local" bind:value={bannedUntil} /></div>{/if}<Button variant="destructive" disabled={saving || !banReason.trim() || (!permanentBan && !bannedUntil)} on:click={banPlayer}>Suspend reviewer</Button>{/if}</section>
          </div>
          <section class="panel history-card"><div class="panel-header"><div><span class="section-kicker">AUDIT TRAIL</span><h2>Reputation ledger</h2></div><Badge variant="outline">{data.reputationHistory.length} events</Badge></div><Table.Root><Table.Header><Table.Row><Table.Head>Date</Table.Head><Table.Head>Type</Table.Head><Table.Head>Change</Table.Head><Table.Head>Score</Table.Head><Table.Head>Reason</Table.Head></Table.Row></Table.Header><Table.Body>{#each data.reputationHistory as event (event.id)}<Table.Row><Table.Cell>{new Date(event.createdAt).toLocaleString()}</Table.Cell><Table.Cell><Badge variant="outline">{event.type}</Badge></Table.Cell><Table.Cell><span class:positive-text={Number(event.delta) >= 0} class:negative-text={Number(event.delta) < 0}>{Number(event.delta) >= 0 ? '+' : ''}{event.delta}</span></Table.Cell><Table.Cell>{event.scoreAfter}</Table.Cell><Table.Cell>{event.reason ?? '—'}</Table.Cell></Table.Row>{:else}<Table.Row><Table.Cell colspan={5} class="text-center text-muted-foreground">No reputation events.</Table.Cell></Table.Row>{/each}</Table.Body></Table.Root></section>
        {:else if !loading}
          <section class="empty-reviewer"><span><Search size={22} /></span><strong>No reviewer selected</strong><p>Search for a player above to inspect their Overwatch activity.</p></section>
        {/if}
      </section>
    {/if}
  </main>
{/if}

<style>
  :global(body){background:hsl(var(--background))}.admin-overwatch{--ow-blue:#4f8cff;--ow-green:#35c895;--ow-violet:#9a78ff;--ow-orange:#f5a548;--ow-red:#ef6b72;max-width:1380px;margin:0 auto;padding:42px 28px 90px;color:hsl(var(--foreground))}.page-header{margin-bottom:25px}.eyebrow,.section-kicker{font-size:.68rem;font-weight:800;letter-spacing:.16em;color:hsl(var(--muted-foreground))}.eyebrow{display:flex;align-items:center;gap:9px;margin-bottom:10px}.eyebrow>span{width:18px;height:2px;background:var(--ow-blue)}.header-row{display:flex;justify-content:space-between;align-items:flex-end;gap:24px}.header-row h1{font-size:clamp(2.1rem,4vw,3.65rem);font-weight:820;line-height:.98;letter-spacing:-.055em}.header-row h1 em{font-weight:400;font-style:normal;color:hsl(var(--muted-foreground))}.header-row p,.reviewer-intro p{margin-top:12px;color:hsl(var(--muted-foreground));font-size:.96rem}.header-actions{display:flex;align-items:center;gap:13px}.header-actions :global(button){display:flex;gap:7px}.updated{font-size:.76rem;color:hsl(var(--muted-foreground));white-space:nowrap}.live-dot{display:inline-block;width:6px;height:6px;margin-right:6px;border-radius:50%;background:var(--ow-green);box-shadow:0 0 0 4px color-mix(in srgb,var(--ow-green) 15%,transparent)}.view-tabs{display:flex;gap:5px;margin-top:30px;border-bottom:1px solid hsl(var(--border))}.view-tabs button{display:flex;align-items:center;gap:8px;padding:12px 15px;margin-bottom:-1px;border-bottom:2px solid transparent;color:hsl(var(--muted-foreground));font-size:.84rem;font-weight:650;transition:.18s}.view-tabs button:hover{color:hsl(var(--foreground))}.view-tabs button.active{border-color:var(--ow-blue);color:hsl(var(--foreground))}.kpi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px}.kpi-card,.panel,.profile-strip>div{border:1px solid hsl(var(--border));background:color-mix(in srgb,hsl(var(--card)) 92%,transparent);border-radius:13px}.kpi-card{position:relative;overflow:hidden;display:grid;gap:5px;padding:18px 19px 17px}.kpi-card:after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--accent-color)}.accent-blue{--accent-color:var(--ow-blue)}.accent-green{--accent-color:var(--ow-green)}.accent-violet{--accent-color:var(--ow-violet)}.accent-orange{--accent-color:var(--ow-orange)}.kpi-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.icon-box{display:grid;place-items:center;width:34px;height:34px;border-radius:9px;color:var(--accent-color);background:color-mix(in srgb,var(--accent-color) 12%,transparent)}.period{font-size:.59rem;font-weight:800;letter-spacing:.13em;color:hsl(var(--muted-foreground))}.kpi-label{font-size:.78rem;color:hsl(var(--muted-foreground))}.kpi-card>strong{font-size:2rem;line-height:1.15;letter-spacing:-.04em}.kpi-card small{font-size:.72rem;color:hsl(var(--muted-foreground))}.analytics-layout{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(310px,.85fr);gap:13px;margin-top:13px}.panel{padding:21px}.panel-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.panel h2,.reviewer-intro h2{font-size:1.15rem;font-weight:750;margin-top:3px;letter-spacing:-.02em}.muted-icon{color:hsl(var(--muted-foreground))}.flow-badge{padding:5px 9px;border-radius:999px;font-size:.7rem;font-weight:700}.flow-badge.positive{color:var(--ow-green);background:color-mix(in srgb,var(--ow-green) 11%,transparent)}.flow-badge.negative{color:var(--ow-red);background:color-mix(in srgb,var(--ow-red) 11%,transparent)}.flow-visual{display:grid;grid-template-columns:1fr auto 1fr auto 1fr;align-items:center;gap:12px;margin:31px 0}.flow-step{display:grid;gap:3px;padding:17px;border:1px solid hsl(var(--border));border-radius:11px;background:hsl(var(--background)/.35)}.flow-step.highlighted{border-color:color-mix(in srgb,var(--ow-blue) 45%,hsl(var(--border)));background:color-mix(in srgb,var(--ow-blue) 6%,hsl(var(--background)))}.flow-step span,.flow-step small{color:hsl(var(--muted-foreground));font-size:.7rem}.flow-step strong{font-size:1.55rem}.flow-arrow{color:hsl(var(--muted-foreground));opacity:.55}.flow-footer{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid hsl(var(--border));padding-top:16px}.flow-footer>div{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:8px;font-size:.76rem}.flow-footer>div:first-child{padding-right:18px;border-right:1px solid hsl(var(--border))}.flow-footer>div:last-child{padding-left:18px}.flow-footer svg{color:var(--ow-blue)}.flow-footer span{color:hsl(var(--muted-foreground))}.panel-copy{font-size:.75rem;line-height:1.5;color:hsl(var(--muted-foreground));margin:14px 0 20px}.checkpoint-list{display:grid;gap:15px}.checkpoint>div:first-child{display:flex;justify-content:space-between;margin-bottom:6px;font-size:.72rem}.progress-track{height:5px;border-radius:99px;background:hsl(var(--muted));overflow:hidden}.progress-track span{display:block;height:100%;border-radius:inherit;min-width:2px}.progress-track .blue{background:var(--ow-blue)}.progress-track .violet{background:var(--ow-violet)}.progress-track .orange{background:var(--ow-orange)}.progress-track .red{background:var(--ow-red)}.quality-grid{display:grid;grid-template-columns:1fr 1fr .85fr;gap:13px;margin-top:13px}.metric-list{display:grid;margin-top:14px}.metric-list>div{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:12px 0;border-bottom:1px solid hsl(var(--border))}.metric-list>div:last-child{border:0;padding-bottom:0}.metric-list span{display:grid;font-size:.76rem;font-weight:600}.metric-list small{margin-top:2px;color:hsl(var(--muted-foreground));font-size:.66rem;font-weight:400}.metric-list strong{font-size:.95rem}.warn{color:var(--ow-orange)}.participation{display:flex;align-items:center;justify-content:center;gap:22px;margin:24px 0 25px}.ring{--value:0;display:grid;place-items:center;width:105px;height:105px;border-radius:50%;background:conic-gradient(var(--ow-blue) calc(var(--value) * 3.6deg),hsl(var(--muted)) 0);position:relative}.ring:after{content:"";position:absolute;inset:8px;border-radius:50%;background:hsl(var(--card))}.ring>div{position:relative;z-index:1;display:grid;text-align:center}.ring strong{font-size:1.15rem}.ring span{font-size:.65rem;color:hsl(var(--muted-foreground))}.participation-copy{display:grid;grid-template-columns:auto 1fr;align-items:baseline;gap:4px 8px}.participation-copy strong{font-size:1.25rem}.participation-copy span{font-size:.68rem;color:hsl(var(--muted-foreground))}.reviewer-panel :global(button){display:flex;gap:7px}.reviewer-workspace{display:grid;gap:13px}.reviewer-intro{margin:3px 0 10px}.reviewer-intro h2{font-size:1.65rem}.selector-card{display:grid;grid-template-columns:minmax(230px,1fr) minmax(260px,1.1fr) auto;align-items:end;gap:16px}.selector-card h3,.form-card h3{font-weight:730;font-size:1rem}.selector-card p,.form-card>p{margin-top:4px;color:hsl(var(--muted-foreground));font-size:.76rem}.profile-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:13px}.profile-strip>div{display:grid;gap:3px;padding:17px}.profile-strip span,.profile-strip small{font-size:.7rem;color:hsl(var(--muted-foreground))}.profile-strip strong{font-size:1.25rem}.profile-strip strong.banned{color:var(--ow-red)}.management-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}.form-card h3{margin-top:4px;font-size:1.1rem}.field{display:grid;gap:7px;margin:15px 0}.danger-card{border-color:color-mix(in srgb,var(--ow-red) 32%,hsl(var(--border)))}.checkbox-row{display:flex;align-items:center;gap:8px;margin:13px 0;font-size:.78rem}.history-card{overflow:auto}.history-card .panel-header{margin-bottom:14px}.positive-text{color:var(--ow-green)}.negative-text{color:var(--ow-red)}.empty-reviewer,.access-state{display:grid;place-items:center;text-align:center;color:hsl(var(--muted-foreground))}.empty-reviewer{padding:65px 20px;border:1px dashed hsl(var(--border));border-radius:13px}.empty-reviewer>span,.access-icon{display:grid;place-items:center;width:48px;height:48px;margin-bottom:12px;border-radius:50%;background:hsl(var(--muted));color:hsl(var(--foreground))}.empty-reviewer strong{color:hsl(var(--foreground))}.empty-reviewer p{font-size:.76rem;margin-top:4px}.access-state{min-height:60vh;padding:30px}.access-state h1{color:hsl(var(--foreground));font-size:1.35rem;font-weight:750}.access-state p{margin-top:5px}.error-card{display:flex;align-items:center;gap:14px;padding:24px;border:1px solid color-mix(in srgb,var(--ow-red) 35%,hsl(var(--border)));border-radius:13px}.error-card svg{color:var(--ow-red)}.error-card p{font-size:.76rem;color:hsl(var(--muted-foreground));margin-top:3px}.error-card :global(button){margin-left:auto}.loading-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:13px}.skeleton{height:145px;border-radius:13px;background:linear-gradient(90deg,hsl(var(--muted)) 25%,hsl(var(--accent)) 50%,hsl(var(--muted)) 75%);background-size:200% 100%;animation:shimmer 1.4s infinite}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@keyframes shimmer{to{background-position:-200% 0}}
  .case-workspace{display:grid;gap:13px}.case-summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:13px}.case-summary-grid>div{display:grid;grid-template-columns:auto auto 1fr;align-items:center;gap:9px;padding:14px 17px;border:1px solid hsl(var(--border));border-radius:11px;background:hsl(var(--card))}.case-summary-grid strong{font-size:1.15rem}.case-summary-grid small{color:hsl(var(--muted-foreground));font-size:.72rem}.summary-dot,.verdict-mark{display:block;width:7px;height:7px;border-radius:50%}.summary-dot.blue,.verdict-mark.active{background:var(--ow-blue);box-shadow:0 0 0 4px color-mix(in srgb,var(--ow-blue) 13%,transparent)}.summary-dot.orange,.verdict-mark.warning{background:var(--ow-orange);box-shadow:0 0 0 4px color-mix(in srgb,var(--ow-orange) 13%,transparent)}.summary-dot.green,.verdict-mark.success{background:var(--ow-green);box-shadow:0 0 0 4px color-mix(in srgb,var(--ow-green) 13%,transparent)}.verdict-mark.danger{background:var(--ow-red);box-shadow:0 0 0 4px color-mix(in srgb,var(--ow-red) 13%,transparent)}.verdict-mark.neutral{background:hsl(var(--muted-foreground))}.case-table-card{min-width:0}.case-table-card .panel-header{margin-bottom:17px}.case-table-card .panel-header p{margin-top:4px;color:hsl(var(--muted-foreground));font-size:.7rem}.table-scroll{overflow-x:auto}.record-cell{display:grid;min-width:125px}.record-cell a,.record-cell strong{font-size:.78rem;font-weight:700;color:hsl(var(--foreground))}.record-cell a:hover{text-decoration:underline;color:var(--ow-blue)}.record-cell small{font-size:.66rem;color:hsl(var(--muted-foreground))}.status-pill{display:inline-flex;white-space:nowrap;border-radius:999px;padding:4px 8px;font-size:.63rem;font-weight:700}.status-pill.active{color:var(--ow-blue);background:color-mix(in srgb,var(--ow-blue) 12%,transparent)}.status-pill.warning{color:var(--ow-orange);background:color-mix(in srgb,var(--ow-orange) 12%,transparent)}.status-pill.success{color:var(--ow-green);background:color-mix(in srgb,var(--ow-green) 12%,transparent)}.status-pill.danger{color:var(--ow-red);background:color-mix(in srgb,var(--ow-red) 12%,transparent)}.status-pill.neutral{color:hsl(var(--muted-foreground));background:hsl(var(--muted))}.phase-label{text-transform:capitalize;color:hsl(var(--muted-foreground));font-size:.7rem}.case-columns{display:grid;grid-template-columns:1fr 1fr;gap:13px}.compact-case-list{display:grid}.compact-case-list article{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:13px;padding:11px 2px;border-bottom:1px solid hsl(var(--border))}.compact-case-list article:last-child{border-bottom:0;padding-bottom:0}.queue-rank{display:grid;place-items:center;width:25px;height:25px;border-radius:7px;background:hsl(var(--muted));font-size:.67rem;font-weight:800}.compact-case-list time{font-size:.67rem;color:hsl(var(--muted-foreground));white-space:nowrap}.compact-empty{padding:28px 0;text-align:center;color:hsl(var(--muted-foreground));font-size:.75rem}
  @media(max-width:1050px){.kpi-grid{grid-template-columns:1fr 1fr}.quality-grid{grid-template-columns:1fr 1fr}.reviewer-panel{grid-column:1/-1}.participation{margin:20px auto;max-width:360px}.analytics-layout{grid-template-columns:1fr}.loading-grid{grid-template-columns:1fr 1fr}.case-columns{grid-template-columns:1fr}}
  @media(max-width:760px){.admin-overwatch{padding:28px 16px 70px}.header-row{align-items:flex-start;flex-direction:column}.header-actions{width:100%;justify-content:space-between}.kpi-grid,.quality-grid,.profile-strip,.management-grid,.case-summary-grid{grid-template-columns:1fr}.reviewer-panel{grid-column:auto}.selector-card{grid-template-columns:1fr}.flow-visual{grid-template-columns:1fr}.flow-arrow{transform:rotate(90deg);margin:auto}.flow-footer{grid-template-columns:1fr;gap:12px}.flow-footer>div:first-child{padding:0 0 12px;border-right:0;border-bottom:1px solid hsl(var(--border))}.flow-footer>div:last-child{padding:0}.loading-grid{grid-template-columns:1fr}.view-tabs{overflow-x:auto}.view-tabs button{flex:1;justify-content:center;white-space:nowrap}.updated{display:none}}
  @media(max-width:430px){.kpi-grid{grid-template-columns:1fr}.header-actions :global(button){width:100%;justify-content:center}.quality-panel,.flow-panel,.resolution-panel{padding:18px}.participation{gap:14px}}
</style>
