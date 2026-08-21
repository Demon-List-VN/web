<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import Title from '$lib/components/Title.svelte';
	import PlayerSelector from '$lib/components/playerSelector.svelte';
	import { user } from '$lib/client';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import {
		banAdminOverwatchPlayer,
		getAdminOverwatchMetrics,
		getAdminOverwatchPlayer,
		setAdminOverwatchReputation,
		unbanAdminOverwatchPlayer
	} from '$lib/client/overwatch';

	let selectedPlayer: { uid: string; name: string; } | null = null;
	let data: any = null;
	let metrics: any = null;
	let loading = false;
	let saving = false;
	let targetScore = 150;
	let reputationReason = '';
	let banReason = '';
	let permanentBan = true;
	let bannedUntil = '';
	let unbanReason = '';

	async function token() {
		return $user.token();
	}

	async function loadPlayer() {
		if (!selectedPlayer) {
			return;
		}

		loading = true;

		try {
			data = await getAdminOverwatchPlayer(await token(), selectedPlayer.uid);
			targetScore = Number(data.profile.reputationScore);
		} catch (error) {
			data = null;
			toast.error(error instanceof Error ? error.message : 'Failed to load reviewer');
		} finally {
			loading = false;
		}
	}

	async function saveReputation() {
		if (!selectedPlayer || !reputationReason.trim()) {
			toast.error('A reason is required.');

			return;
		}

		saving = true;

		try {
			data = await setAdminOverwatchReputation(
				await token(),
				selectedPlayer.uid,
				Number(targetScore),
				reputationReason.trim()
			);
			reputationReason = '';
			targetScore = Number(data.profile.reputationScore);
			toast.success('Reputation updated.');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update reputation');
		} finally {
			saving = false;
		}
	}

	async function banPlayer() {
		if (!selectedPlayer || !banReason.trim()) {
			toast.error('A ban reason is required.');

			return;
		}

		if (!permanentBan && !bannedUntil) {
			toast.error('Choose when the temporary ban ends.');

			return;
		}

		saving = true;

		try {
			data = await banAdminOverwatchPlayer(
				await token(),
				selectedPlayer.uid,
				banReason.trim(),
				permanentBan ? null : new Date(bannedUntil)
					.toISOString()
			);
			banReason = '';
			bannedUntil = '';
			toast.success('Overwatch access suspended.');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to ban reviewer');
		} finally {
			saving = false;
		}
	}

	async function unbanPlayer() {
		if (!selectedPlayer || !unbanReason.trim()) {
			toast.error('An unban note is required.');

			return;
		}

		saving = true;

		try {
			data = await unbanAdminOverwatchPlayer(
				await token(),
				selectedPlayer.uid,
				unbanReason.trim()
			);
			unbanReason = '';
			toast.success('Overwatch access restored.');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to unban reviewer');
		} finally {
			saving = false;
		}
	}

	onMount(async () => {
		if ($user.data?.isAdmin) {
			try {
				metrics = await getAdminOverwatchMetrics(await token());
			} catch {
			// The player management tool remains usable when metrics fail.
			}
		}
	});
</script>

<svelte:head><title>Overwatch Administration</title></svelte:head>

<Title value="Overwatch Administration" />

{#if !$user.data?.isAdmin}
  <div class="mx-auto max-w-3xl px-4 py-10 text-center text-muted-foreground">
    Administrator access is required.
  </div>
{:else}
  <main class="admin-overwatch">
    {#if metrics}
      <section class="metric-grid">
        <article><span>Queue</span><strong>{metrics.queueLength}</strong></article>
        <article><span>Pool</span><strong>{metrics.poolLength}</strong></article>
        <article><span>Resolved / 7d</span><strong>{metrics.recordsResolvedLast7Days}</strong></article>
        <article><span>Active reviewers / 7d</span><strong>{metrics.activeReviewersLast7Days}</strong></article>
      </section>
    {/if}

    <section class="card selector-card">
      <div><h2>Reviewer account</h2><p>Select a player to inspect and manage their Overwatch profile.</p></div>
      <PlayerSelector bind:value={selectedPlayer} disabled={loading || saving} on:select={loadPlayer} on:clear={() => (data = null)} />
      <Button disabled={!selectedPlayer || loading || saving} on:click={loadPlayer}>{loading ? 'Loading…' : 'Load profile'}</Button>
    </section>

    {#if data}
      <section class="profile-strip">
        <div><span>Player</span><strong>{data.player.name}</strong><small>{data.player.uid}</small></div>
        <div><span>Reputation</span><strong>{data.profile.reputationScore}</strong><small>{data.profile.reputationTier} · weight {data.profile.effectiveWeight.toFixed(2)}</small></div>
        <div><span>Completed</span><strong>{data.profile.completedReviews}</strong><small>{data.profile.probation ? 'Probation' : 'Full weight'}</small></div>
        <div><span>Access</span><strong>{data.profile.banned ? 'Banned' : 'Active'}</strong><small>{data.profile.bannedUntil ? `Until ${new Date(data.profile.bannedUntil)
.toLocaleString()}` : data.profile.banned ? 'Permanent' : 'Eligible when level ≥ 50'}</small></div>
      </section>

      <div class="management-grid">
        <section class="card">
          <h2>Set reputation</h2>
          <p>Set the exact score. The actual delta and administrator reason are appended to the ledger.</p>
          <div class="field"><Label for="score">Score (0–1000)</Label><Input id="score" type="number" min="0" max="1000" step="0.01" bind:value={targetScore} /></div>
          <div class="field"><Label for="rep-reason">Reason</Label><Textarea id="rep-reason" bind:value={reputationReason} /></div>
          <Button disabled={saving || targetScore < 0 || targetScore > 1000 || !reputationReason.trim()} on:click={saveReputation}>Save reputation</Button>
        </section>

        <section class="card danger-card">
          <h2>{data.profile.banned ? 'Restore access' : 'Suspend access'}</h2>
          {#if data.profile.banned}
            <p><strong>Current reason:</strong> {data.profile.banReason}</p>
            <div class="field"><Label for="unban-reason">Administrative note</Label><Textarea id="unban-reason" bind:value={unbanReason} /></div>
            <Button disabled={saving || !unbanReason.trim()} on:click={unbanPlayer}>Unban reviewer</Button>
          {:else}
            <div class="field"><Label for="ban-reason">Reason</Label><Textarea id="ban-reason" bind:value={banReason} /></div>
            <label class="checkbox-row"><input type="checkbox" bind:checked={permanentBan} /> Permanent ban</label>
            {#if !permanentBan}
              <div class="field"><Label for="ban-until">Ban until</Label><Input id="ban-until" type="datetime-local" bind:value={bannedUntil} /></div>
            {/if}
            <Button variant="destructive" disabled={saving || !banReason.trim() || (!permanentBan && !bannedUntil)} on:click={banPlayer}>Ban from Overwatch</Button>
          {/if}
        </section>
      </div>

      <section class="card history-card">
        <h2>Reputation ledger</h2>
        <Table.Root>
          <Table.Header><Table.Row><Table.Head>Date</Table.Head><Table.Head>Type</Table.Head><Table.Head>Change</Table.Head><Table.Head>Score</Table.Head><Table.Head>Reason</Table.Head></Table.Row></Table.Header>
          <Table.Body>
            {#each data.reputationHistory as event (event.id)}
              <Table.Row><Table.Cell>{new Date(event.createdAt)
.toLocaleString()}</Table.Cell><Table.Cell><Badge variant="outline">{event.type}</Badge></Table.Cell><Table.Cell>{Number(event.delta) >= 0 ? '+' : ''}{event.delta}</Table.Cell><Table.Cell>{event.scoreAfter}</Table.Cell><Table.Cell>{event.reason ?? '—'}</Table.Cell></Table.Row>
            {:else}
              <Table.Row><Table.Cell colspan={5} class="text-center text-muted-foreground">No reputation events.</Table.Cell></Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      </section>
    {/if}
  </main>
{/if}

<style>
  .admin-overwatch{max-width:1100px;margin:0 auto;padding:24px 18px 80px;display:grid;gap:17px}.metric-grid,.profile-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:11px}.metric-grid article,.profile-strip>div,.card{border:1px solid hsl(var(--border));border-radius:14px;background:hsl(var(--card));padding:18px}.metric-grid article,.profile-strip>div{display:grid;gap:3px}.metric-grid span,.profile-strip span,.profile-strip small{font-size:.76rem;color:hsl(var(--muted-foreground))}.metric-grid strong,.profile-strip strong{font-size:1.35rem}.selector-card{display:grid;grid-template-columns:minmax(220px,1fr) minmax(260px,1.2fr) auto;align-items:end;gap:14px}.card h2{font-size:1.1rem;font-weight:750}.card>p{margin:5px 0 15px;color:hsl(var(--muted-foreground));font-size:.88rem}.management-grid{display:grid;grid-template-columns:1fr 1fr;gap:17px}.field{display:grid;gap:7px;margin:13px 0}.danger-card{border-color:hsl(var(--destructive)/.38)}.checkbox-row{display:flex;align-items:center;gap:8px;margin:12px 0}.history-card{overflow:auto}.history-card h2{margin-bottom:12px}@media(max-width:800px){.metric-grid,.profile-strip{grid-template-columns:1fr 1fr}.selector-card,.management-grid{grid-template-columns:1fr}}@media(max-width:480px){.metric-grid,.profile-strip{grid-template-columns:1fr}}
</style>
