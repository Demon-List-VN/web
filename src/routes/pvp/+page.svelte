<script lang="ts">
	import { goto } from '$app/navigation';
	import PlayerSelector from '$lib/components/playerSelector.svelte';
	import MatchCard from '$lib/components/pvp/MatchCard.svelte';
	import { user } from '$lib/client';
	import supabase from '$lib/client/supabase';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import {
		PVP_DIFFICULTIES,
		acceptPvpInvite,
		cancelPvpMatchmaking,
		declinePvpInvite,
		getPvpInviteExpiresMs,
		getPvpInviteId,
		getPvpMatchedMatchId,
		getPvpMatchId,
		getPvpMe,
		getPvpStatus,
		isActivePvpMatch,
		sendPvpInvite,
		startPvpMatchmaking,
		type PvpDifficulty,
		type PvpInvite,
		type PvpMe
	} from '$lib/client/pvp';
	import { setPvpRealtimeAuth, subscribeToPvpLobby } from '$lib/client/pvpRealtime';
	import { onDestroy, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { _, locale } from 'svelte-i18n';
	import {
		ArrowRight,
		Clock,
		Loader2,
		LogIn,
		RefreshCw,
		Send,
		Swords,
		UserCheck,
		Users
	} from 'lucide-svelte';

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

	$: currentUid = $user.data?.uid;
	$: activeMatch = lobby.activeMatch && isActivePvpMatch(lobby.activeMatch) ? lobby.activeMatch : null;
	$: queueStatus = getPvpStatus(lobby.matchmaking, 'idle');
	$: isSearching = queueStatus === 'searching';
	$: queueMatchId = getPvpMatchedMatchId(lobby.matchmaking);
	$: incomingPending = lobby.incomingInvites.filter((invite) => getPvpStatus(invite) === 'pending');
	$: outgoingVisible = lobby.outgoingInvites.filter((invite) =>
		['pending', 'accepted', 'declined', 'expired', 'cancelled'].includes(getPvpStatus(invite))
	);
	$: controlsDisabled = Boolean(activeMatch || isSearching || actionLoading);

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
	}

	$: if (queueStatus === 'matched' && queueMatchId) {
		navigateToMatch(queueMatchId);
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

	async function initializeRealtime(uid: string) {
		initializedForUid = uid;
		cleanupRealtime?.();

		try {
			const token = await $user.token();
			setPvpRealtimeAuth(token);
			await refreshLobby();

			cleanupRealtime = subscribeToPvpLobby(uid, async () => {
				await refreshLobby();
			});
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('pvp.toast.load_failed'));
		}
	}

	async function refreshLobby() {
		if (!$user.loggedIn) return;

		loading = true;
		try {
			lobby = await getPvpMe(await $user.token());
			routeAcceptedInvite(lobby.incomingInvites);
			routeAcceptedInvite(lobby.outgoingInvites);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('pvp.toast.load_failed'));
		} finally {
			loading = false;
		}
	}

	function routeAcceptedInvite(invites: PvpInvite[]) {
		for (const invite of invites) {
			if (getPvpStatus(invite) !== 'accepted') continue;
			const matchId = getPvpMatchedMatchId(invite);
			if (matchId) navigateToMatch(matchId);
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
			if (matchId) navigateToMatch(matchId);
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
				? invite.inviter ?? invite.fromPlayer
				: invite.invitee ?? invite.toPlayer;

		return player?.name || player?.uid || (direction === 'incoming' ? invite.from : invite.to) || '--';
	}

	function remainingLabel(targetMs: number | null, currentNow: number) {
		if (!targetMs) return '--:--';

		const totalSeconds = Math.max(0, Math.floor((targetMs - currentNow) / 1000));
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;

		return `${minutes}:${String(seconds).padStart(2, '0')}`;
	}

	function elapsedLabel(startValue: unknown, currentNow: number) {
		if (!startValue) return '0:00';

		const startMs = new Date(String(startValue)).getTime();
		if (!Number.isFinite(startMs)) return '0:00';

		const totalSeconds = Math.max(0, Math.floor((currentNow - startMs) / 1000));
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;

		return `${minutes}:${String(seconds).padStart(2, '0')}`;
	}
</script>

<svelte:head>
	<title>{$_('pvp.lobby_title')} - {$_('head.site_name')}</title>
</svelte:head>

<main class="arena-page">
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
				<MatchCard match={activeMatch} {currentUid} now={now} href={`/pvp/matches/${getPvpMatchId(activeMatch)}`} />
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
					{#if isSearching}
						<div class="queue-status">
							<Badge>{statusLabel(queueStatus)}</Badge>
							<span>
								<Clock class="h-4 w-4" />
								{elapsedLabel(lobby.matchmaking?.created_at, now)}
							</span>
						</div>
						<Button
							variant="outline"
							disabled={Boolean(actionLoading)}
							on:click={cancelQueue}
						>
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
					<Button disabled={controlsDisabled || !selectedDifficulty || !selectedPlayer} on:click={invitePlayer}>
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
						<Button variant="ghost" size="icon" disabled={loading} on:click={refreshLobby} aria-label={$_('pvp.refresh')}>
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
											<span class="timer">{remainingLabel(getPvpInviteExpiresMs(invite), now)}</span>
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
</style>
