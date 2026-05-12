<script lang="ts">
	import MatchCard from '$lib/components/pvp/MatchCard.svelte';
	import { user } from '$lib/client';
	import supabase from '$lib/client/supabase';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import {
		getPvpMatches,
		getPvpMatchId,
		getPvpStatus,
		isActivePvpMatch,
		type PvpMatch
	} from '$lib/client/pvp';
	import { setPvpRealtimeAuth, subscribeToPvpMatches } from '$lib/client/pvpRealtime';
	import { playPvpBell } from '$lib/client/pvpSound';
	import { onDestroy, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { _ } from 'svelte-i18n';
	import { ArrowLeft, Eye, EyeOff, Loader2, LogIn, RefreshCw, Swords } from 'lucide-svelte';

	const PVP_HIDE_OPPONENT_INFO_KEY = 'gdvn:pvp-hide-opponent-info';

	let matches: PvpMatch[] = [];
	let loading = false;
	let initializedForUid = '';
	let cleanupRealtime: (() => Promise<void>) | null = null;
	let now = Date.now();
	let ticker: ReturnType<typeof setInterval> | null = null;
	let endedMatchBellIds = new Set<string>();
	let hideOpponentInfo = false;
	let preferencesReady = false;

	$: currentUid = $user.data?.uid;
	$: ongoingMatches = matches.filter((match) => isActivePvpMatch(match));
	$: pastMatches = matches.filter((match) => !isActivePvpMatch(match));

	$: if ($user.checked && $user.loggedIn && currentUid && initializedForUid !== currentUid) {
		initializeRealtime(currentUid);
	}

	$: if ($user.checked && !$user.loggedIn) {
		matches = [];
		initializedForUid = '';
	}

	onMount(() => {
		hideOpponentInfo = localStorage.getItem(PVP_HIDE_OPPONENT_INFO_KEY) === 'true';
		preferencesReady = true;

		ticker = setInterval(() => {
			now = Date.now();
		}, 1000);
	});

	$: if (preferencesReady) {
		localStorage.setItem(PVP_HIDE_OPPONENT_INFO_KEY, String(hideOpponentInfo));
	}

	onDestroy(() => {
		if (ticker) clearInterval(ticker);
		cleanupRealtime?.();
	});

	async function initializeRealtime(uid: string) {
		initializedForUid = uid;
		cleanupRealtime?.();

		try {
			const token = await $user.token();
			setPvpRealtimeAuth(token);
			await refreshMatches();

			cleanupRealtime = subscribeToPvpMatches(uid, async () => {
				await refreshMatches();
			});
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('pvp.toast.load_failed'));
		}
	}

	async function refreshMatches() {
		if (!$user.loggedIn) return;

		loading = true;
		try {
			const previousMatches = matches;
			const nextMatches = await getPvpMatches(await $user.token());
			handleMatchEndSounds(previousMatches, nextMatches);
			matches = nextMatches;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('pvp.toast.load_failed'));
		} finally {
			loading = false;
		}
	}

	function handleMatchEndSounds(previousMatches: PvpMatch[], nextMatches: PvpMatch[]) {
		const previousById = new Map(
			previousMatches.map((match) => [String(getPvpMatchId(match)), match])
		);

		for (const match of nextMatches) {
			const id = getPvpMatchId(match);
			if (!id || endedMatchBellIds.has(String(id))) continue;

			const previous = previousById.get(String(id));
			if (previous && isActivePvpMatch(previous) && !isActivePvpMatch(match)) {
				endedMatchBellIds.add(String(id));
				playPvpBell();
			}
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
</script>

<svelte:head>
	<title>{$_('pvp.matches_title')} - {$_('head.site_name')}</title>
</svelte:head>

<main class="matches-page">
	<section class="matches-topbar">
		<div>
			<a class="back-link" href="/pvp">
				<ArrowLeft class="h-4 w-4" />
				{$_('pvp.lobby_title')}
			</a>
			<h1>{$_('pvp.matches_title')}</h1>
		</div>

		{#if $user.loggedIn}
			<div class="topbar-actions">
				<Button
					variant="outline"
					aria-pressed={hideOpponentInfo}
					on:click={() => (hideOpponentInfo = !hideOpponentInfo)}
				>
					{#if hideOpponentInfo}
						<Eye class="mr-2 h-4 w-4" />
						{$_('pvp.show_opponent_info')}
					{:else}
						<EyeOff class="mr-2 h-4 w-4" />
						{$_('pvp.hide_opponent_info')}
					{/if}
				</Button>
				<Button variant="outline" disabled={loading} on:click={refreshMatches}>
					<RefreshCw class={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
					{$_('pvp.refresh')}
				</Button>
			</div>
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
	{:else}
		<section class="match-section">
			<div class="section-title">
				<Swords class="h-5 w-5" />
				<h2>{$_('pvp.ongoing_matches')}</h2>
			</div>
			{#if ongoingMatches.length === 0}
				<div class="empty-state">{$_('pvp.no_ongoing_matches')}</div>
			{:else}
				<div class="match-grid">
					{#each ongoingMatches as match}
						<MatchCard
							{match}
							{currentUid}
							{now}
							{hideOpponentInfo}
							href={`/pvp/matches/${match.id ?? match.matchId}`}
						/>
					{/each}
				</div>
			{/if}
		</section>

		<section class="match-section">
			<div class="section-title">
				<h2>{$_('pvp.past_matches')}</h2>
			</div>
			{#if pastMatches.length === 0}
				<div class="empty-state">{$_('pvp.no_past_matches')}</div>
			{:else}
				<div class="match-grid">
					{#each pastMatches as match}
						<MatchCard
							{match}
							{currentUid}
							{now}
							{hideOpponentInfo}
							href={`/pvp/matches/${match.id ?? match.matchId}`}
						/>
					{/each}
				</div>
			{/if}
		</section>
	{/if}
</main>

<style>
	.matches-page {
		width: min(1120px, calc(100vw - 32px));
		margin: 0 auto;
		padding: 36px 0 64px;
	}

	.matches-topbar,
	.topbar-actions,
	:global(.auth-content) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}

	.matches-topbar {
		margin-bottom: 24px;
	}

	.topbar-actions {
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	h1 {
		margin: 6px 0 0;
		font-size: clamp(2rem, 4vw, 3.25rem);
		font-weight: 800;
		letter-spacing: 0;
	}

	.back-link,
	.section-title {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}

	.back-link {
		color: hsl(var(--primary));
		font-size: 14px;
		font-weight: 700;
		text-decoration: none;
	}

	.back-link:hover {
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

	:global(.auth-content) p {
		margin: 0;
		color: hsl(var(--muted-foreground));
	}

	.match-section {
		margin-top: 24px;
	}

	.section-title {
		margin-bottom: 12px;
	}

	.section-title h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 750;
	}

	.match-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
	}

	.empty-state {
		display: flex;
		align-items: center;
		min-height: 96px;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		color: hsl(var(--muted-foreground));
		padding: 18px;
	}

	@media (max-width: 860px) {
		.match-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.matches-page {
			width: min(100vw - 20px, 1120px);
			padding-top: 24px;
		}

		.matches-topbar,
		.topbar-actions,
		:global(.auth-content) {
			align-items: stretch;
			flex-direction: column;
		}
	}
</style>
