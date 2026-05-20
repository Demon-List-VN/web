<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import type { PvpMatch } from '$lib/client/pvp';
	import { getPvpMatchAcceptanceExpiresMs, getPvpMode } from '$lib/client/pvp';
	import { _ } from 'svelte-i18n';
	import { BellRing, Loader2, ShieldCheck, UserCheck } from 'lucide-svelte';

	export let matchDialogOpen = false;
	export let ratingDialogOpen = false;
	export let pendingMatch: PvpMatch | null = null;
	export let pendingMatchId: number | string | null | undefined = null;
	export let pendingSelfAccepted = false;
	export let shouldForceStartingRating = false;
	export let actionLoading = '';
	export let checkingLobby = false;
	export let now = Date.now();
	export let onAcceptPendingMatch: () => void | Promise<void>;
	export let onChooseStartingRating: (rating: 800 | 1500 | 2500) => void | Promise<void>;

	const STARTING_RATING_OPTIONS = [
		{ rating: 800 as const, key: 'beginner' },
		{ rating: 1500 as const, key: 'intermediate' },
		{ rating: 2500 as const, key: 'expert' }
	];

	$: pendingMatchMode = getPvpMode(pendingMatch);

	function remainingLabel(targetMs: number | null, currentNow: number) {
		if (!targetMs) return '--:--';

		const totalSeconds = Math.max(0, Math.floor((targetMs - currentNow) / 1000));
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;

		return `${minutes}:${String(seconds).padStart(2, '0')}`;
	}
</script>

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
				<span>{$_('pvp.match_type')}</span>
				<strong>{$_('pvp.ranked')}</strong>
			</div>
			<div class="match-found-row">
				<span>{$_('pvp.mode_label')}</span>
				<strong>{$_(`pvp.mode.${pendingMatchMode}`)}</strong>
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
				<Button class="w-full" disabled={Boolean(actionLoading)} on:click={() => onAcceptPendingMatch?.()}>
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

<Dialog.Root
	bind:open={ratingDialogOpen}
	on:openChange={(e) => {
		if (e?.detail === false && shouldForceStartingRating) {
			ratingDialogOpen = true;
		}
	}}
>
	<Dialog.Content showClose={false} class="sm:max-w-[520px]">
		<Dialog.Header>
			<div class="match-found-icon">
				<ShieldCheck class="h-5 w-5" />
			</div>
			<Dialog.Title>{$_('pvp.pvp_rating')}</Dialog.Title>
			<Dialog.Description>
				{$_('pvp.starting_rating_hint')}
			</Dialog.Description>
		</Dialog.Header>

		<div class="starting-rating-grid">
			{#each STARTING_RATING_OPTIONS as option}
				<Button
					variant="outline"
					disabled={Boolean(actionLoading || checkingLobby)}
					on:click={() => onChooseStartingRating?.(option.rating)}
				>
					{#if actionLoading === `start-rating-${option.rating}`}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{/if}
					<span>{$_(`pvp.starting_rating.${option.key}`)}</span>
					<strong>{option.rating}</strong>
				</Button>
			{/each}
		</div>
	</Dialog.Content>
</Dialog.Root>

<style>
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

	.starting-rating-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
	}

	.starting-rating-grid :global(button) {
		display: flex;
		min-height: 78px;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.starting-rating-grid strong {
		font-size: 1.2rem;
	}

	@media (max-width: 640px) {
		.starting-rating-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
