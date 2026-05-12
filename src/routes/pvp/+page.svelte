<script lang="ts">
	import { goto } from '$app/navigation';
	import PlayerSelector from '$lib/components/playerSelector.svelte';
	import MatchCard from '$lib/components/pvp/MatchCard.svelte';
	import { user } from '$lib/client';
	import supabase from '$lib/client/supabase';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import {
		PVP_DIFFICULTIES,
		acceptPvpInvite,
		acceptPvpMatch,
		cancelPvpMatchmaking,
		declinePvpInvite,
		getPvpInviteExpiresMs,
		getPvpMatchAcceptanceExpiresMs,
		getPvpInviteId,
		getPvpMatchedMatchId,
		getPvpMatchId,
		getPvpMe,
		getPvpMatch,
		getPvpOpponent,
		getPvpParticipantPlayer,
		getPvpStatus,
		getPvpSelfParticipant,
		hasPvpParticipantAccepted,
		isActivePvpMatch,
		sendPvpInvite,
		startPvpMatchmaking,
		type PvpDifficulty,
		type PvpInvite,
		type PvpMe
	} from '$lib/client/pvp';
	import { setPvpRealtimeAuth, subscribeToPvpLobby } from '$lib/client/pvpRealtime';
	import { playPvpBell } from '$lib/client/pvpSound';
	import { onDestroy, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { _, locale } from 'svelte-i18n';
	import {
		ArrowRight,
		BellRing,
		Clock,
		Loader2,
		LogIn,
		RefreshCw,
		Send,
		Swords,
		UserCheck,
		Users,
		X
	} from 'lucide-svelte';

	const PVP_GEODE_ALERT_DISMISSED_KEY = 'gdvn:pvp-geode-alert-dismissed';

	let selectedDifficulty: PvpDifficulty | null = 'easy';
	let selectedPlayer: any = null;
	let lobby: PvpMe = {
		activeMatch: null,
		matchmaking: null,
		incomingInvites: [],
		outgoingInvites: []
	};
	let loading = false;
	let actionLoading = '';
	let initializedForUid = '';
	let cleanupRealtime: (() => Promise<void>) | null = null;
	let now = Date.now();
	let ticker: ReturnType<typeof setInterval> | null = null;
	let routedMatchId: number | string | null = null;
	let announcedMatchIds = new Set<string>();
	let endedMatchBellIds = new Set<string>();
	let matchDialogOpen = false;
	let showGeodeAlert = true;
	let lobbyReady = false;
	let pendingDialogTimeout: ReturnType<typeof setTimeout> | null = null;
	let keydownHandler: ((e: KeyboardEvent) => void) | null = null;

	$: currentUid = $user.data?.uid;
	$: activeMatch =
		lobby.activeMatch && isActivePvpMatch(lobby.activeMatch) ? lobby.activeMatch : null;
	$: pendingMatch = activeMatch && getPvpStatus(activeMatch) === 'pending' ? activeMatch : null;
	$: pendingMatchId = getPvpMatchId(pendingMatch);
	$: pendingOpponent = getPvpOpponent(pendingMatch, currentUid);
	$: pendingOpponentPlayer = getPvpParticipantPlayer(pendingOpponent);
	$: pendingSelfAccepted = hasPvpParticipantAccepted(
		getPvpSelfParticipant(pendingMatch, currentUid)
	);
	$: queueStatus = getPvpStatus(lobby.matchmaking, 'idle');
	$: isSearching = queueStatus === 'searching';
	$: queueMatchId = getPvpMatchedMatchId(lobby.matchmaking);
	$: queueElapsedMs = getElapsedMs(lobby.matchmaking?.created_at, now);
	$: showSlowSearchAlert = isSearching && queueElapsedMs >= 90 * 1000;
	$: incomingPending = lobby.incomingInvites.filter((invite) => getPvpStatus(invite) === 'pending');
	$: outgoingVisible = lobby.outgoingInvites.filter((invite) =>
		['pending', 'accepted', 'declined', 'expired', 'cancelled'].includes(getPvpStatus(invite))
	);
	$: checkingLobby = $user.checked && $user.loggedIn && !lobbyReady;
	$: controlsDisabled = Boolean(checkingLobby || activeMatch || isSearching || actionLoading);

	$: if ($user.checked && $user.loggedIn && currentUid && initializedForUid !== currentUid) {
		initializeRealtime(currentUid);
	}

	$: if ($user.checked && !$user.loggedIn) {
		lobby = {
			activeMatch: null,
			matchmaking: null,
			incomingInvites: [],
			outgoingInvites: []
		};
		initializedForUid = '';
		lobbyReady = false;
	}

	$: if (
		queueStatus === 'matched' &&
		queueMatchId &&
		activeMatch &&
		getPvpStatus(activeMatch) === 'in_progress'
	) {
		navigateToMatch(queueMatchId);
	}

	onMount(() => {
		showGeodeAlert = localStorage.getItem(PVP_GEODE_ALERT_DISMISSED_KEY) !== 'true';

		ticker = setInterval(() => {
			now = Date.now();
		}, 1000);

		keydownHandler = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && pendingMatch) {
				e.preventDefault();
				e.stopPropagation();
			}
		};

		window.addEventListener('keydown', keydownHandler);
	});

	onDestroy(() => {
		if (ticker) clearInterval(ticker);
		cleanupRealtime?.();
		if (keydownHandler) window.removeEventListener('keydown', keydownHandler);
		if (pendingDialogTimeout) clearTimeout(pendingDialogTimeout);
	});

	async function initializeRealtime(uid: string) {
		initializedForUid = uid;
		lobbyReady = false;
		cleanupRealtime?.();

		try {
			const token = await $user.token();
			setPvpRealtimeAuth(token);
			await refreshLobby();
			lobbyReady = true;

			cleanupRealtime = subscribeToPvpLobby(uid, async () => {
				await refreshLobby();
			});
		} catch (error) {
			lobbyReady = true;
			toast.error(error instanceof Error ? error.message : $_('pvp.toast.load_failed'));
		}
	}

	async function refreshLobby() {
		if (!$user.loggedIn) return;

		loading = true;
		try {
			const previousActiveMatch = lobby.activeMatch;
			const nextLobby = await getPvpMe(await $user.token());
			handleLobbyMatchSounds(previousActiveMatch, nextLobby.activeMatch);
			lobby = nextLobby;
			await routeAcceptedInvite(lobby.incomingInvites);
			await routeAcceptedInvite(lobby.outgoingInvites);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('pvp.toast.load_failed'));
		} finally {
			loading = false;
		}
	}

	function handleLobbyMatchSounds(
		previousMatch: PvpMe['activeMatch'],
		nextMatch: PvpMe['activeMatch']
	) {
		const nextId = getPvpMatchId(nextMatch);
		const nextStatus = getPvpStatus(nextMatch, '');

		if (nextId && nextStatus === 'pending' && !announcedMatchIds.has(String(nextId))) {
			announcedMatchIds.add(String(nextId));
			playPvpBell();
		}

		const previousId = getPvpMatchId(previousMatch);
		const previousStatus = getPvpStatus(previousMatch, '');
		const previousWasInProgress = previousStatus === 'in_progress';
		const nextStillActive = Boolean(nextMatch && isActivePvpMatch(nextMatch));

		// Play end bell only if the previous match was actually in-progress (not just pending acceptance)
		if (
			previousId &&
			previousWasInProgress &&
			!nextStillActive &&
			!endedMatchBellIds.has(String(previousId))
		) {
			endedMatchBellIds.add(String(previousId));
			playPvpBell();
		}
	}

	// Control dialog open state and auto-close when acceptance expires
	$: if (pendingMatch) {
		if (!matchDialogOpen) matchDialogOpen = true;
		const expires = getPvpMatchAcceptanceExpiresMs(pendingMatch);
		if (expires) {
			if (pendingDialogTimeout) clearTimeout(pendingDialogTimeout);
			const delay = Math.max(0, expires - Date.now());
			pendingDialogTimeout = setTimeout(() => {
				matchDialogOpen = false;
				pendingDialogTimeout = null;
			}, delay);
		}
	} else {
		matchDialogOpen = false;
		if (pendingDialogTimeout) {
			clearTimeout(pendingDialogTimeout);
			pendingDialogTimeout = null;
		}
	}

	async function routeAcceptedInvite(invites: PvpInvite[]) {
		if (!Array.isArray(invites) || invites.length === 0) return;
		const token = await $user.token();
		for (const invite of invites) {
			if (getPvpStatus(invite) !== 'accepted') continue;
			const matchId = getPvpMatchedMatchId(invite);
			if (!matchId) continue;

			let match = (invite as any)?.match ?? null;
			if (!match) {
				try {
					match = await getPvpMatch(token, matchId);
				} catch {
					continue;
				}
			}

			if (isActivePvpMatch(match)) {
				navigateToMatch(matchId);
			}
		}
	}

	function navigateToMatch(matchId: number | string | null) {
		if (!matchId || routedMatchId === matchId) return;
		routedMatchId = matchId;
		goto(`/pvp/matches/${matchId}`);
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

	async function startQueue() {
		if (!selectedDifficulty) {
			toast.error($_('pvp.toast.select_difficulty'));
			return;
		}

		actionLoading = 'matchmaking';
		try {
			const response = await startPvpMatchmaking(await $user.token(), selectedDifficulty);
			const responseStatus = getPvpStatus(response as any, 'searching');
			const matchId = responseStatus === 'matched' ? getPvpMatchedMatchId(response as any) : null;
			await refreshLobby();
			if (matchId && getPvpStatus((response as any)?.match) === 'in_progress')
				navigateToMatch(matchId);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('pvp.toast.matchmaking_failed'));
		} finally {
			actionLoading = '';
		}
	}

	async function cancelQueue() {
		actionLoading = 'cancel-matchmaking';
		try {
			await cancelPvpMatchmaking(await $user.token());
			await refreshLobby();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('pvp.toast.cancel_failed'));
		} finally {
			actionLoading = '';
		}
	}

	async function invitePlayer() {
		if (!selectedDifficulty) {
			toast.error($_('pvp.toast.select_difficulty'));
			return;
		}

		if (!selectedPlayer?.uid) {
			toast.error($_('pvp.toast.select_player'));
			return;
		}

		if (selectedPlayer.uid === currentUid) {
			toast.error($_('pvp.toast.self_invite'));
			return;
		}

		actionLoading = 'invite';
		try {
			const invite = await sendPvpInvite(await $user.token(), {
				inviteeUid: selectedPlayer.uid,
				difficulty: selectedDifficulty
			});
			const matchId = getPvpMatchedMatchId(invite);
			selectedPlayer = null;
			await refreshLobby();
			if (matchId) navigateToMatch(matchId);
			toast.success($_('pvp.toast.invite_sent'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('pvp.toast.invite_failed'));
		} finally {
			actionLoading = '';
		}
	}

	async function acceptInvite(invite: PvpInvite) {
		const inviteId = getPvpInviteId(invite);
		if (!inviteId) return;

		actionLoading = `accept-${inviteId}`;
		try {
			const response = await acceptPvpInvite(await $user.token(), inviteId);
			const matchId = getPvpMatchedMatchId(response as any) ?? getPvpMatchId(response as any);
			await refreshLobby();
			if (matchId) navigateToMatch(matchId);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('pvp.toast.accept_failed'));
		} finally {
			actionLoading = '';
		}
	}

	async function acceptPendingMatch() {
		if (!pendingMatchId) return;

		actionLoading = `accept-match-${pendingMatchId}`;
		try {
			const response = await acceptPvpMatch(await $user.token(), pendingMatchId);
			await refreshLobby();

			if (getPvpStatus(response) === 'in_progress') {
				navigateToMatch(pendingMatchId);
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('pvp.toast.accept_match_failed'));
		} finally {
			actionLoading = '';
		}
	}

	async function declineInvite(invite: PvpInvite) {
		const inviteId = getPvpInviteId(invite);
		if (!inviteId) return;

		actionLoading = `decline-${inviteId}`;
		try {
			await declinePvpInvite(await $user.token(), inviteId);
			await refreshLobby();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('pvp.toast.decline_failed'));
		} finally {
			actionLoading = '';
		}
	}

	function difficultyLabel(value: unknown) {
		return $_(`pvp.difficulty.${String(value || 'easy')}`);
	}

	function statusLabel(value: unknown) {
		const status = String(value || 'pending');
		return $_(`pvp.status.${status}`);
	}

	function inviteName(invite: PvpInvite, direction: 'incoming' | 'outgoing') {
		const player =
			direction === 'incoming'
				? (invite.inviter ?? invite.fromPlayer)
				: (invite.invitee ?? invite.toPlayer);

		return (
			player?.name || player?.uid || (direction === 'incoming' ? invite.from : invite.to) || '--'
		);
	}

	function pendingOpponentName() {
		return (
			pendingOpponentPlayer?.name || pendingOpponentPlayer?.uid || pendingOpponent?.uid || '--'
		);
	}

	function remainingLabel(targetMs: number | null, currentNow: number) {
		if (!targetMs) return '--:--';

		const totalSeconds = Math.max(0, Math.floor((targetMs - currentNow) / 1000));
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;

		return `${minutes}:${String(seconds).padStart(2, '0')}`;
	}

	function elapsedLabel(startValue: unknown, currentNow: number) {
		const totalSeconds = Math.max(0, Math.floor(getElapsedMs(startValue, currentNow) / 1000));
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;

		return `${minutes}:${String(seconds).padStart(2, '0')}`;
	}

	function getElapsedMs(startValue: unknown, currentNow: number) {
		if (!startValue) return 0;

		const startMs = new Date(String(startValue)).getTime();
		if (!Number.isFinite(startMs)) return 0;

		return Math.max(0, currentNow - startMs);
	}

	function dismissGeodeAlert() {
		showGeodeAlert = false;
		localStorage.setItem(PVP_GEODE_ALERT_DISMISSED_KEY, 'true');
	}
</script>

<svelte:head>
	<title>{$_('pvp.lobby_title')} - {$_('head.site_name')}</title>
</svelte:head>

<main class="arena-page">
	{#if showGeodeAlert}
		<div class="pvp-top-alert geode-alert">
			<div class="pvp-top-alert-inner">
				<strong>{$_('pvp.geode_alert.title')}</strong>
				<span>{$_('pvp.geode_alert.description')}</span>
			</div>
			<button
				type="button"
				class="pvp-alert-dismiss"
				on:click={dismissGeodeAlert}
				aria-label={$_('pvp.geode_alert.dismiss')}
			>
				<X class="h-4 w-4" />
			</button>
		</div>
	{/if}

	{#if activeMatch}
		<div class="pvp-top-alert">
			<div class="pvp-top-alert-inner">
				<strong>{$_('pvp.active_match')}</strong>
				<a class="inline-link" href={`/pvp/matches/${getPvpMatchId(activeMatch)}`}
					>{$_('pvp.enter_match')}</a
				>
			</div>
		</div>
	{/if}

	<section class="arena-topbar">
		<div>
			<div class="eyebrow">
				<Swords class="h-4 w-4" />
				<span>{$_('pvp.arena')}</span>
			</div>
			<h1>{$_('pvp.lobby_title')}</h1>
		</div>
		<a class="topbar-link" href="/pvp/matches">
			{$_('pvp.matches_title')}
			<ArrowRight class="h-4 w-4" />
		</a>
	</section>

	<Dialog.Root
		bind:open={matchDialogOpen}
		on:openChange={(e) => {
			if (e?.detail === false && pendingMatch) {
				matchDialogOpen = true;
			}
		}}
	>
		<Dialog.Content class="sm:max-w-[440px]">
			<Dialog.Header>
				<div class="match-found-icon">
					<BellRing class="h-5 w-5" />
				</div>
				<Dialog.Title>{$_('pvp.match_found_title')}</Dialog.Title>
				<Dialog.Description>
					{$_('pvp.match_found_hint')}
				</Dialog.Description>
			</Dialog.Header>

			<div class="match-found-body">
				<div class="match-found-row">
					<span>{$_('pvp.opponent')}</span>
					<strong>{pendingOpponentName()}</strong>
				</div>
				<div class="match-found-row">
					<span>{$_('pvp.choose_difficulty')}</span>
					<strong>{difficultyLabel(pendingMatch?.difficulty)}</strong>
				</div>
				<div class="match-found-row">
					<span>{$_('pvp.acceptance_timer')}</span>
					<strong>{remainingLabel(getPvpMatchAcceptanceExpiresMs(pendingMatch), now)}</strong>
				</div>
			</div>

			<Dialog.Footer>
				{#if pendingSelfAccepted}
					<Button disabled class="w-full">
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						{$_('pvp.waiting_for_acceptance')}
					</Button>
				{:else}
					<Button class="w-full" disabled={Boolean(actionLoading)} on:click={acceptPendingMatch}>
						{#if actionLoading === `accept-match-${pendingMatchId}`}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						{:else}
							<UserCheck class="mr-2 h-4 w-4" />
						{/if}
						{$_('pvp.accept_match')}
					</Button>
				{/if}
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>

	{#if !$user.checked}
		<Card.Root class="state-panel">
			<Card.Content class="state-content">
				<Loader2 class="h-5 w-5 animate-spin" />
				<span>{$_('general.loading')}</span>
			</Card.Content>
		</Card.Root>
	{:else if !$user.loggedIn}
		<Card.Root class="state-panel">
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
		{#if activeMatch}
			<section class="active-section">
				<div class="section-heading">
					<h2>{$_('pvp.active_match')}</h2>
					<a href={`/pvp/matches/${getPvpMatchId(activeMatch)}`}>{$_('pvp.enter_match')}</a>
				</div>
				<MatchCard
					match={activeMatch}
					{currentUid}
					{now}
					href={`/pvp/matches/${getPvpMatchId(activeMatch)}`}
				/>
			</section>
		{/if}

		<section class="control-grid">
			<Card.Root>
				<Card.Header>
					<Card.Title>{$_('pvp.choose_difficulty')}</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="difficulty-grid">
						{#each PVP_DIFFICULTIES as difficulty}
							<button
								type="button"
								class:selected={selectedDifficulty === difficulty}
								class="difficulty-button"
								disabled={Boolean(actionLoading)}
								on:click={() => (selectedDifficulty = difficulty)}
							>
								<span>{difficultyLabel(difficulty)}</span>
								<small>{$_(`pvp.difficulty_band.${difficulty}`)}</small>
							</button>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>{$_('pvp.matchmaking')}</Card.Title>
					<Card.Description>
						{isSearching ? $_('pvp.searching_state') : $_('pvp.queue_state_idle')}
					</Card.Description>
				</Card.Header>
				<Card.Content class="action-panel">
					{#if checkingLobby}
						<div class="matchmaking-skeleton" aria-label={$_('general.loading')}>
							<div></div>
							<div></div>
							<div></div>
						</div>
					{:else if activeMatch}
						<Button on:click={() => navigateToMatch(getPvpMatchId(activeMatch))}>
							<Swords class="mr-2 h-4 w-4" />
							{$_('pvp.enter_match')}
						</Button>
					{:else if isSearching}
						<div class="queue-status">
							<Badge>{statusLabel(queueStatus)}</Badge>
							<span>
								<Clock class="h-4 w-4" />
								{elapsedLabel(lobby.matchmaking?.created_at, now)}
							</span>
						</div>
						{#if showSlowSearchAlert}
							<div class="queue-hint">
								{$_('pvp.search_slow_hint')}
							</div>
						{/if}
						<Button variant="outline" disabled={Boolean(actionLoading)} on:click={cancelQueue}>
							{#if actionLoading === 'cancel-matchmaking'}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							{/if}
							{$_('pvp.cancel_search')}
						</Button>
					{:else}
						<Button disabled={controlsDisabled || !selectedDifficulty} on:click={startQueue}>
							{#if actionLoading === 'matchmaking'}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							{:else}
								<Users class="mr-2 h-4 w-4" />
							{/if}
							{$_('pvp.start_matchmaking')}
						</Button>
					{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>{$_('pvp.invite_player')}</Card.Title>
					<Card.Description>{$_('pvp.invite_state')}</Card.Description>
				</Card.Header>
				<Card.Content class="invite-form">
					<PlayerSelector
						bind:value={selectedPlayer}
						disabled={controlsDisabled}
						placeholder={$_('pvp.search_player')}
					/>
					<Button
						disabled={controlsDisabled || !selectedDifficulty || !selectedPlayer}
						on:click={invitePlayer}
					>
						{#if actionLoading === 'invite'}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						{:else}
							<Send class="mr-2 h-4 w-4" />
						{/if}
						{$_('pvp.send_invite')}
					</Button>
				</Card.Content>
			</Card.Root>
		</section>

		<section class="invite-grid">
			<Card.Root>
				<Card.Header>
					<Card.Title>{$_('pvp.incoming_invites')}</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if incomingPending.length === 0}
						<div class="empty-state">{$_('pvp.no_incoming_invites')}</div>
					{:else}
						<div class="invite-list">
							{#each incomingPending as invite}
								<div class="invite-row">
									<div>
										<strong>{inviteName(invite, 'incoming')}</strong>
										<span>{difficultyLabel(invite.difficulty)}</span>
									</div>
									<div class="invite-actions">
										<span class="timer">{remainingLabel(getPvpInviteExpiresMs(invite), now)}</span>
										<Button
											size="sm"
											disabled={Boolean(actionLoading)}
											on:click={() => acceptInvite(invite)}
										>
											{#if actionLoading === `accept-${getPvpInviteId(invite)}`}
												<Loader2 class="mr-2 h-4 w-4 animate-spin" />
											{:else}
												<UserCheck class="mr-2 h-4 w-4" />
											{/if}
											{$_('general.accept')}
										</Button>
										<Button
											size="sm"
											variant="outline"
											disabled={Boolean(actionLoading)}
											on:click={() => declineInvite(invite)}
										>
											{$_('general.reject')}
										</Button>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<div class="section-heading inside">
						<Card.Title>{$_('pvp.outgoing_invites')}</Card.Title>
						<Button
							variant="ghost"
							size="icon"
							disabled={loading}
							on:click={refreshLobby}
							aria-label={$_('pvp.refresh')}
						>
							<RefreshCw class={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
						</Button>
					</div>
				</Card.Header>
				<Card.Content>
					{#if outgoingVisible.length === 0}
						<div class="empty-state">{$_('pvp.no_outgoing_invites')}</div>
					{:else}
						<div class="invite-list">
							{#each outgoingVisible as invite}
								<div class="invite-row">
									<div>
										<strong>{inviteName(invite, 'outgoing')}</strong>
										<span>{difficultyLabel(invite.difficulty)}</span>
									</div>
									<div class="invite-actions">
										<Badge variant={getPvpStatus(invite) === 'pending' ? 'default' : 'secondary'}>
											{statusLabel(getPvpStatus(invite))}
										</Badge>
										{#if getPvpStatus(invite) === 'pending'}
											<span class="timer">{remainingLabel(getPvpInviteExpiresMs(invite), now)}</span
											>
										{/if}
										{#if getPvpMatchedMatchId(invite)}
											<a class="inline-link" href={`/pvp/matches/${getPvpMatchedMatchId(invite)}`}>
												{$_('pvp.view_match')}
											</a>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</section>
	{/if}
</main>

<style>
	.arena-page {
		width: min(1120px, calc(100vw - 32px));
		margin: 0 auto;
		padding: 36px 0 64px;
	}

	.arena-topbar,
	:global(.auth-content),
	.section-heading,
	.queue-status,
	.invite-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}

	.arena-topbar {
		margin-bottom: 24px;
	}

	h1 {
		margin: 4px 0 0;
		font-size: clamp(2rem, 4vw, 3.25rem);
		font-weight: 800;
		letter-spacing: 0;
	}

	.eyebrow,
	.topbar-link,
	.inline-link,
	.queue-status span {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}

	.eyebrow {
		color: hsl(var(--muted-foreground));
		font-size: 14px;
		font-weight: 700;
		text-transform: uppercase;
	}

	.match-found-icon {
		display: inline-flex;
		width: 40px;
		height: 40px;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		background: hsl(var(--primary) / 0.12);
		color: hsl(var(--primary));
	}

	.match-found-body {
		display: grid;
		gap: 10px;
		margin: 18px 0;
	}

	.match-found-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 14px;
		border-radius: 8px;
		background: hsl(var(--muted) / 0.55);
		padding: 10px 12px;
		font-size: 14px;
	}

	.match-found-row span {
		color: hsl(var(--muted-foreground));
	}

	.topbar-link,
	.inline-link,
	.section-heading a {
		border-radius: 6px;
		color: hsl(var(--primary));
		font-weight: 700;
		text-decoration: none;
	}

	.topbar-link:hover,
	.inline-link:hover,
	.section-heading a:hover {
		text-decoration: underline;
	}

	:global(.state-panel),
	.active-section {
		margin-bottom: 20px;
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

	.control-grid {
		display: grid;
		grid-template-columns: 1.2fr 1fr 1fr;
		gap: 16px;
		align-items: stretch;
	}

	.invite-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
		margin-top: 16px;
	}

	.difficulty-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
	}

	.difficulty-button {
		min-height: 86px;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		background: hsl(var(--background));
		padding: 12px;
		text-align: left;
		transition:
			border-color 140ms ease,
			background-color 140ms ease,
			color 140ms ease;
	}

	.difficulty-button span,
	.difficulty-button small {
		display: block;
	}

	.difficulty-button span {
		font-weight: 750;
	}

	.difficulty-button small {
		margin-top: 6px;
		color: hsl(var(--muted-foreground));
	}

	.difficulty-button.selected {
		border-color: hsl(var(--primary));
		background: hsl(var(--primary) / 0.1);
	}

	:global(.action-panel),
	:global(.invite-form) {
		display: grid;
		gap: 12px;
	}

	.queue-status {
		min-height: 40px;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		padding: 10px 12px;
	}

	.queue-hint {
		border: 1px solid hsl(var(--primary) / 0.28);
		border-radius: 8px;
		background: hsl(var(--primary) / 0.08);
		padding: 10px 12px;
		color: hsl(var(--foreground));
		font-size: 13px;
		line-height: 1.45;
	}

	.matchmaking-skeleton {
		display: grid;
		gap: 10px;
	}

	.matchmaking-skeleton div {
		height: 40px;
		border-radius: 8px;
		background: linear-gradient(
			90deg,
			hsl(var(--muted) / 0.45),
			hsl(var(--muted) / 0.22),
			hsl(var(--muted) / 0.45)
		);
		background-size: 200% 100%;
		animation: pvp-skeleton 1.2s ease-in-out infinite;
	}

	.matchmaking-skeleton div:nth-child(2) {
		width: 78%;
	}

	.matchmaking-skeleton div:nth-child(3) {
		width: 56%;
	}

	@keyframes pvp-skeleton {
		from {
			background-position: 200% 0;
		}

		to {
			background-position: -200% 0;
		}
	}

	.invite-list {
		display: grid;
		gap: 10px;
	}

	.invite-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		padding: 12px;
	}

	.invite-row strong,
	.invite-row span {
		display: block;
	}

	.invite-row span,
	.timer,
	.empty-state {
		color: hsl(var(--muted-foreground));
		font-size: 13px;
	}

	.empty-state {
		display: flex;
		align-items: center;
		min-height: 72px;
	}

	.section-heading {
		margin-bottom: 12px;
	}

	.section-heading.inside {
		margin: 0;
	}

	.section-heading h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 750;
	}

	@media (max-width: 980px) {
		.control-grid,
		.invite-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.arena-page {
			width: min(100vw - 20px, 1120px);
			padding-top: 24px;
		}

		.arena-topbar,
		:global(.auth-content),
		.invite-row,
		.invite-actions {
			align-items: stretch;
			flex-direction: column;
		}

		.difficulty-grid {
			grid-template-columns: 1fr;
		}
	}

	.pvp-top-alert {
		margin-bottom: 12px;
		padding: 12px;
		border-radius: 8px;
		background: hsl(var(--muted) / 0.08);
		border: 1px solid hsl(var(--border));
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.pvp-top-alert-inner {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.geode-alert {
		background: hsl(var(--primary) / 0.08);
		border-color: hsl(var(--primary) / 0.28);
	}

	.pvp-alert-dismiss {
		display: inline-flex;
		width: 32px;
		height: 32px;
		flex: 0 0 auto;
		align-items: center;
		justify-content: center;
		border: 0;
		border-radius: 6px;
		background: transparent;
		color: hsl(var(--muted-foreground));
		cursor: pointer;
	}

	.pvp-alert-dismiss:hover {
		background: hsl(var(--primary) / 0.12);
		color: hsl(var(--foreground));
	}

	@media (max-width: 640px) {
		.pvp-top-alert {
			align-items: flex-start;
			gap: 10px;
		}

		.pvp-top-alert-inner {
			align-items: flex-start;
			flex-direction: column;
			gap: 4px;
		}
	}
</style>
