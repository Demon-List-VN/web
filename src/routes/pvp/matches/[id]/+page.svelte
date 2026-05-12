<script lang="ts">
	import { page } from '$app/stores';
	import MatchCard from '$lib/components/pvp/MatchCard.svelte';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import { user } from '$lib/client';
	import supabase from '$lib/client/supabase';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import {
		acceptPvpMatch,
		getPvpLevel,
		getPvpMatchAcceptanceExpiresMs,
		getPvpMatch,
		getPvpMatchEndMs,
		getPvpMatchId,
		getPvpParticipants,
		getPvpParticipantPlayer,
		getPvpParticipantUid,
		getPvpProgress,
		getPvpResultReason,
		getPvpSelfParticipant,
		getPvpStatus,
		getPvpTimeReachedMs,
		getPvpWinnerUid,
		hasPvpParticipantAccepted,
		isActivePvpMatch,
		type PvpMatch,
		type PvpParticipant
	} from '$lib/client/pvp';
	import { setPvpRealtimeAuth, subscribeToPvpMatchDetail } from '$lib/client/pvpRealtime';
	import { playPvpBell } from '$lib/client/pvpSound';
	import { onDestroy, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { _ } from 'svelte-i18n';
	import { ArrowLeft, Clock, ExternalLink, Gauge, Loader2, LogIn, RefreshCw, Trophy } from 'lucide-svelte';

	let match: PvpMatch | null = null;
	let loading = false;
	let initializedFor = '';
	let cleanupRealtime: (() => Promise<void>) | null = null;
	let now = Date.now();
	let ticker: ReturnType<typeof setInterval> | null = null;
	let actionLoading = '';
	let endedBellPlayedFor: string | null = null;

	$: matchId = $page.params.id;
	$: currentUid = $user.data?.uid;
	$: status = getPvpStatus(match);
	$: level = getPvpLevel(match);
	$: participants = getPvpParticipants(match);
	$: winnerUid = getPvpWinnerUid(match);
	$: resultReason = getPvpResultReason(match);
	$: remainingMs = Math.max(0, (getPvpMatchEndMs(match) ?? now) - now);
	$: acceptanceRemainingMs = Math.max(0, (getPvpMatchAcceptanceExpiresMs(match) ?? now) - now);
	$: isActive = isActivePvpMatch(match);
	$: selfAccepted = hasPvpParticipantAccepted(getPvpSelfParticipant(match, currentUid));

	$: if ($user.checked && $user.loggedIn && matchId && initializedFor !== `${currentUid}:${matchId}`) {
		initializeRealtime(matchId);
	}

	onMount(() => {
		ticker = setInterval(() => {
			now = Date.now();
		}, 1000);
	});

	onDestroy(() => {
		if (ticker) clearInterval(ticker);
		cleanupRealtime?.();
	});

	async function initializeRealtime(id: string) {
		initializedFor = `${currentUid}:${id}`;
		cleanupRealtime?.();

		try {
			const token = await $user.token();
			setPvpRealtimeAuth(token);
			await refreshMatch();

			cleanupRealtime = subscribeToPvpMatchDetail(id, async () => {
				await refreshMatch();
			});
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('pvp.toast.load_failed'));
		}
	}

	async function refreshMatch() {
		if (!$user.loggedIn || !matchId) return;

		loading = true;
		try {
			const previousMatch = match;
			const nextMatch = await getPvpMatch(await $user.token(), matchId);
			handleMatchSound(previousMatch, nextMatch);
			match = nextMatch;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('pvp.toast.load_failed'));
		} finally {
			loading = false;
		}
	}

	function handleMatchSound(previousMatch: PvpMatch | null, nextMatch: PvpMatch | null) {
		const id = getPvpMatchId(nextMatch);
		if (!id || endedBellPlayedFor === String(id)) return;

		if (previousMatch && isActivePvpMatch(previousMatch) && nextMatch && !isActivePvpMatch(nextMatch)) {
			endedBellPlayedFor = String(id);
			playPvpBell();
		}
	}

	async function acceptMatch() {
		if (!matchId) return;

		actionLoading = 'accept-match';
		try {
			const response = await acceptPvpMatch(await $user.token(), matchId);
			match = response;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('pvp.toast.accept_match_failed'));
		} finally {
			actionLoading = '';
		}
	}

	async function signIn() {
		await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				queryParams: {
					access_type: 'offline',
					prompt: 'consent'
				},
				redirectTo: window.location.origin
			}
		});
	}

	function difficultyLabel(value: unknown) {
		return $_(`pvp.difficulty.${String(value || 'easy')}`);
	}

	function statusLabel(value: unknown) {
		const key = String(value || 'pending');
		return $_(`pvp.status.${key}`);
	}

	function formatDuration(ms: number | null) {
		if (ms === null) return '--:--';

		const totalSeconds = Math.max(0, Math.floor(ms / 1000));
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;

		return `${minutes}:${String(seconds).padStart(2, '0')}`;
	}

	function resultTitle() {
		if (!match) return $_('pvp.match_loading');
		if (status === 'completed') {
			if (!winnerUid) return $_('pvp.result.draw');
			return winnerUid === currentUid ? $_('pvp.result.win') : $_('pvp.result.loss');
		}
		if (status === 'cancelled') return $_('pvp.result.cancelled');
		if (status === 'disputed') return $_('pvp.result.disputed');
		if (status === 'pending') return $_('pvp.match_found_title');
		return $_('pvp.timer_active');
	}

	function participantName(participant: PvpParticipant) {
		const player = getPvpParticipantPlayer(participant);
		return player?.name || getPvpParticipantUid(participant) || '--';
	}
</script>

<svelte:head>
	<title>{$_('pvp.match')} #{matchId} - {$_('head.site_name')}</title>
</svelte:head>

<main class="match-page">
	<section class="match-topbar">
		<div>
			<a class="back-link" href="/pvp/matches">
				<ArrowLeft class="h-4 w-4" />
				{$_('pvp.matches_title')}
			</a>
			<h1>{$_('pvp.match')} #{matchId}</h1>
		</div>

		{#if $user.loggedIn}
			<Button variant="outline" disabled={loading} on:click={refreshMatch}>
				<RefreshCw class={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
				{$_('pvp.refresh')}
			</Button>
		{/if}
	</section>

	{#if !$user.checked}
		<Card.Root>
			<Card.Content class="state-content">
				<Loader2 class="h-5 w-5 animate-spin" />
				<span>{$_('general.loading')}</span>
			</Card.Content>
		</Card.Root>
	{:else if !$user.loggedIn}
		<Card.Root>
			<Card.Content class="auth-content">
				<div>
					<h2>{$_('pvp.sign_in_title')}</h2>
					<p>{$_('pvp.sign_in_hint')}</p>
				</div>
				<Button on:click={signIn}>
					<LogIn class="mr-2 h-4 w-4" />
					{$_('nav.sign_in')}
				</Button>
			</Card.Content>
		</Card.Root>
	{:else if loading && !match}
		<Card.Root>
			<Card.Content class="state-content">
				<Loader2 class="h-5 w-5 animate-spin" />
				<span>{$_('general.loading')}</span>
			</Card.Content>
		</Card.Root>
	{:else if match}
		<div class="summary-grid">
			<MatchCard match={match} {currentUid} now={now} />

			<Card.Root class="result-panel">
				<Card.Header>
					<Card.Title>{resultTitle()}</Card.Title>
					<Card.Description>
						{#if resultReason}
							{resultReason}
						{:else}
							{statusLabel(status)}
						{/if}
					</Card.Description>
				</Card.Header>
				<Card.Content class="result-content">
					<div class="result-line">
						<Badge variant={isActive ? 'default' : 'secondary'}>{statusLabel(status)}</Badge>
						<Badge variant="outline">{difficultyLabel(match.difficulty)}</Badge>
					</div>
					<div class="timer-display">
						{#if status === 'completed'}
							<Trophy class="h-5 w-5" />
						{:else}
							<Clock class="h-5 w-5" />
						{/if}
						<strong>
							{#if status === 'pending'}
								{formatDuration(acceptanceRemainingMs)}
							{:else}
								{isActive ? formatDuration(remainingMs) : statusLabel(status)}
							{/if}
						</strong>
					</div>
					{#if status === 'pending'}
						<div class="acceptance-panel">
							<p>{$_('pvp.match_found_hint')}</p>
							{#if selfAccepted}
								<Button disabled class="w-full">
									<Loader2 class="mr-2 h-4 w-4 animate-spin" />
									{$_('pvp.waiting_for_acceptance')}
								</Button>
							{:else}
								<Button disabled={Boolean(actionLoading)} class="w-full" on:click={acceptMatch}>
									{#if actionLoading === 'accept-match'}
										<Loader2 class="mr-2 h-4 w-4 animate-spin" />
									{/if}
									{$_('pvp.accept_match')}
								</Button>
							{/if}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>

		<section class="detail-grid">
			<Card.Root>
				<Card.Header>
					<Card.Title>{$_('pvp.challenge_level')}</Card.Title>
				</Card.Header>
				<Card.Content class="level-content">
					{#if level}
						<div>
							<h2>{level.name || `#${level.id || match.levelId}`}</h2>
							<p>
								{#if level.creator || level.author}
									{$_('head.labels.by')} {level.creator || level.author}
								{:else}
									{$_('pvp.level_pending')}
								{/if}
							</p>
						</div>
						<div class="level-meta">
							{#if level.rating !== null && level.rating !== undefined}
								<Badge variant="secondary">{level.rating}pt</Badge>
							{/if}
							{#if level.difficulty}
								<Badge variant="outline">{level.difficulty}</Badge>
							{/if}
							{#if level.id || match.levelId}
								<a class="level-link" href={`/level/${level.id || match.levelId}`}>
									{$_('pvp.open_level')}
									<ExternalLink class="h-4 w-4" />
								</a>
							{/if}
						</div>
					{:else}
						<div class="empty-state">{$_('pvp.level_pending')}</div>
					{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>{$_('pvp.live_progress')}</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if participants.length === 0}
						<div class="empty-state">{$_('pvp.waiting_opponent')}</div>
					{:else}
						<div class="participant-list">
							{#each participants as participant}
								<div
									class:winner={winnerUid && getPvpParticipantUid(participant) === winnerUid}
									class="participant-row"
								>
									<div class="participant-name">
										{#if getPvpParticipantPlayer(participant)?.uid}
											<PlayerLink player={getPvpParticipantPlayer(participant)} showAvatar truncate={26} />
										{:else}
											<strong>{participantName(participant)}</strong>
										{/if}
										{#if getPvpParticipantUid(participant) === currentUid}
											<Badge variant="outline">{$_('pvp.you')}</Badge>
										{/if}
									</div>

									<div class="participant-progress">
										<div class="progress-label">
											<span>{getPvpProgress(participant)}%</span>
											<span>
												<Gauge class="h-3.5 w-3.5" />
												{formatDuration(getPvpTimeReachedMs(participant))}
											</span>
										</div>
										<div class="progress-track">
											<div
												class="progress-bar"
												style={`width: ${Math.min(100, getPvpProgress(participant))}%;`}
											/>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</section>
	{:else}
		<Card.Root>
			<Card.Content class="state-content">{$_('pvp.match_not_found')}</Card.Content>
		</Card.Root>
	{/if}
</main>

<style>
	.match-page {
		width: min(1120px, calc(100vw - 32px));
		margin: 0 auto;
		padding: 36px 0 64px;
	}

	.match-topbar,
	:global(.auth-content),
	.result-line,
	.timer-display,
	.level-meta,
	.participant-name,
	.progress-label span {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.match-topbar,
	:global(.auth-content) {
		justify-content: space-between;
		gap: 16px;
	}

	.match-topbar {
		margin-bottom: 24px;
	}

	h1 {
		margin: 6px 0 0;
		font-size: clamp(2rem, 4vw, 3.25rem);
		font-weight: 800;
		letter-spacing: 0;
	}

	.back-link,
	.level-link {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		color: hsl(var(--primary));
		font-size: 14px;
		font-weight: 700;
		text-decoration: none;
	}

	.back-link:hover,
	.level-link:hover {
		text-decoration: underline;
	}

	:global(.state-content) {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		min-height: 160px;
	}

	:global(.auth-content) h2 {
		margin: 0 0 6px;
		font-size: 1.35rem;
		font-weight: 750;
	}

	:global(.auth-content) p,
	:global(.level-content) p,
	.empty-state,
	.progress-label {
		color: hsl(var(--muted-foreground));
	}

	.summary-grid,
	.detail-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.65fr);
		gap: 16px;
	}

	.detail-grid {
		margin-top: 16px;
	}

	:global(.result-content),
	:global(.level-content),
	.participant-list {
		display: grid;
		gap: 14px;
	}

	.timer-display {
		min-height: 54px;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		justify-content: center;
	}

	.timer-display strong {
		font-size: 1.4rem;
	}

	.acceptance-panel {
		display: grid;
		gap: 12px;
		border-radius: 8px;
		background: hsl(var(--muted) / 0.55);
		padding: 14px;
	}

	.acceptance-panel p {
		margin: 0;
		color: hsl(var(--muted-foreground));
		font-size: 14px;
	}

	:global(.level-content) h2 {
		margin: 0;
		font-size: 1.35rem;
		font-weight: 750;
	}

	:global(.level-content) p {
		margin: 4px 0 0;
	}

	.level-meta {
		flex-wrap: wrap;
	}

	.participant-row {
		display: grid;
		gap: 10px;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		padding: 12px;
	}

	.participant-row.winner {
		border-color: hsl(var(--primary));
		background: hsl(var(--primary) / 0.08);
	}

	.participant-name {
		justify-content: space-between;
	}

	.progress-label {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 13px;
	}

	.progress-track {
		height: 9px;
		overflow: hidden;
		border-radius: 999px;
		background: hsl(var(--muted));
	}

	.progress-bar {
		height: 100%;
		border-radius: inherit;
		background: hsl(var(--primary));
		transition: width 180ms ease;
	}

	.empty-state {
		display: flex;
		align-items: center;
		min-height: 72px;
	}

	@media (max-width: 900px) {
		.summary-grid,
		.detail-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.match-page {
			width: min(100vw - 20px, 1120px);
			padding-top: 24px;
		}

		.match-topbar,
		:global(.auth-content) {
			align-items: stretch;
			flex-direction: column;
		}
	}
</style>
