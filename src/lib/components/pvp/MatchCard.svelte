<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import {
		getPvpLevel,
		getPvpMatchAcceptanceExpiresMs,
		getPvpMatchEndMs,
		getPvpOpponent,
		getPvpParticipants,
		getPvpParticipantPlayer,
		getPvpParticipantUid,
		getPvpProgress,
		getPvpResultReason,
		getPvpSelfParticipant,
		getPvpStatus,
		getPvpTimeReachedMs,
		getPvpWinnerUid,
		isActivePvpMatch,
		type PvpMatch
	} from '$lib/client/pvp';
	import { _ } from 'svelte-i18n';
	import { ArrowRight, Clock, Gauge, Swords, Trophy } from 'lucide-svelte';

	export let match: PvpMatch;
	export let currentUid: string | null | undefined = null;
	export let href: string | null = null;
	export let now = Date.now();

	$: status = getPvpStatus(match);
	$: level = getPvpLevel(match);
	$: participants = getPvpParticipants(match);
	$: self = getPvpSelfParticipant(match, currentUid);
	$: opponent = getPvpOpponent(match, currentUid);
	$: titleLeft = participants[0] ?? self;
	$: titleRight = participants[1] ?? opponent;
	$: selfProgress = getPvpProgress(self);
	$: opponentProgress = getPvpProgress(opponent);
	$: opponentPlayer = getPvpParticipantPlayer(opponent);
	$: winnerUid = getPvpWinnerUid(match);
	$: resultReason = getPvpResultReason(match);
	$: remainingMs = Math.max(0, (getPvpMatchEndMs(match) ?? now) - now);
	$: acceptanceRemainingMs = Math.max(0, (getPvpMatchAcceptanceExpiresMs(match) ?? now) - now);
	$: isActive = isActivePvpMatch(match);

	function difficultyLabel(value: unknown) {
		const key = String(value || 'easy');
		return $_(`pvp.difficulty.${key}`);
	}

	function statusLabel(value: string) {
		return $_(`pvp.status.${value}`) || value;
	}

	function formatDuration(ms: number | null) {
		if (ms === null) return '--:--';

		const totalSeconds = Math.max(0, Math.floor(ms / 1000));
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;

		return `${minutes}:${String(seconds).padStart(2, '0')}`;
	}

	function resultLabel() {
		if (status === 'completed') {
			if (!winnerUid) return $_('pvp.result.draw');
			return $_('pvp.winner_named', { values: { name: winnerName() } });
		}

		if (status === 'cancelled') return $_('pvp.result.cancelled');
		if (status === 'disputed') return $_('pvp.result.disputed');
		if (status === 'pending')
			return `${$_('pvp.awaiting_acceptance_short')} ${formatDuration(acceptanceRemainingMs)}`;
		return formatDuration(remainingMs);
	}

	function participantName(participant: typeof titleLeft) {
		const player = getPvpParticipantPlayer(participant);
		return player?.name || getPvpParticipantUid(participant) || $_('pvp.waiting_opponent');
	}

	function winnerName() {
		const winner = participants.find(
			(participant) => getPvpParticipantUid(participant) === winnerUid
		);
		return winner ? participantName(winner) : winnerUid || '--';
	}
</script>

<Card.Root class="match-card">
	<Card.Header class="match-card-header">
		<div>
			<div class="match-title">
				<Swords class="h-4 w-4" />
				<span class="match-title-name">
					{#if getPvpParticipantPlayer(titleLeft)?.uid}
						<PlayerLink player={getPvpParticipantPlayer(titleLeft)} truncate={18} />
					{:else}
						{participantName(titleLeft)}
					{/if}
				</span>
				<span class="versus">vs</span>
				<span class="match-title-name">
					{#if getPvpParticipantPlayer(titleRight)?.uid}
						<PlayerLink player={getPvpParticipantPlayer(titleRight)} truncate={18} />
					{:else}
						{participantName(titleRight)}
					{/if}
				</span>
			</div>
			<Card.Description>
				{#if level?.name}
					{level.name}
					{#if level.creator || level.author}
						<span>{$_('head.labels.by')} {level.creator || level.author}</span>
					{/if}
				{:else}
					{$_('pvp.level_pending')}
				{/if}
			</Card.Description>
		</div>

		<div class="match-badges">
			<Badge variant={isActive ? 'default' : 'secondary'}>{statusLabel(status)}</Badge>
			<Badge variant="outline">{difficultyLabel(match.difficulty)}</Badge>
		</div>
	</Card.Header>

	<Card.Content class="match-card-content">
		<div class="opponent-row">
			<span>{$_('pvp.opponent')}</span>
			{#if opponentPlayer?.uid}
				<PlayerLink player={opponentPlayer} showAvatar truncate={24} />
			{:else}
				<strong>{$_('pvp.waiting_opponent')}</strong>
			{/if}
		</div>

		<div class="progress-grid">
			<div>
				<div class="progress-label">
					<span>{$_('pvp.you')}</span>
					<strong>{selfProgress}%</strong>
				</div>
				<div class="progress-track">
					<div class="progress-bar self" style={`width: ${Math.min(100, selfProgress)}%;`} />
				</div>
				<span class="time-mark">
					<Gauge class="h-3.5 w-3.5" />
					{formatDuration(getPvpTimeReachedMs(self))}
				</span>
			</div>

			<div>
				<div class="progress-label">
					<span>{$_('pvp.rival')}</span>
					<strong>{opponentProgress}%</strong>
				</div>
				<div class="progress-track">
					<div class="progress-bar rival" style={`width: ${Math.min(100, opponentProgress)}%;`} />
				</div>
				<span class="time-mark">
					<Gauge class="h-3.5 w-3.5" />
					{formatDuration(getPvpTimeReachedMs(opponent))}
				</span>
			</div>
		</div>
	</Card.Content>

	<Card.Footer class="match-card-footer">
		<div class="result-pill">
			{#if status === 'completed'}
				<Trophy class="h-4 w-4" />
			{:else}
				<Clock class="h-4 w-4" />
			{/if}
			<span>{resultLabel()}</span>
			{#if resultReason}
				<span class="reason">- {resultReason}</span>
			{/if}
		</div>

		{#if href}
			<a class="detail-link" {href}>
				{$_('pvp.view_match')}
				<ArrowRight class="h-4 w-4" />
			</a>
		{/if}
	</Card.Footer>
</Card.Root>

<style>
	:global(.match-card) {
		overflow: hidden;
		border-radius: 8px;
	}

	:global(.match-card-header) {
		display: flex;
		flex-direction: row;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
	}

	.match-title,
	.result-pill,
	.detail-link,
	.time-mark,
	.opponent-row,
	.progress-label {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.match-title {
		font-weight: 700;
	}

	.match-badges {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 6px;
	}

	:global(.match-card-content) {
		display: grid;
		gap: 18px;
	}

	.opponent-row {
		justify-content: space-between;
		font-size: 14px;
	}

	.opponent-row > span,
	.progress-label span,
	.time-mark,
	.reason {
		color: hsl(var(--muted-foreground));
	}

	.progress-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 14px;
	}

	.progress-label {
		justify-content: space-between;
		font-size: 13px;
	}

	.progress-track {
		margin-top: 8px;
		height: 8px;
		overflow: hidden;
		border-radius: 999px;
		background: hsl(var(--muted));
	}

	.progress-bar {
		height: 100%;
		border-radius: inherit;
		transition: width 180ms ease;
	}

	.progress-bar.self {
		background: hsl(var(--primary));
	}

	.progress-bar.rival {
		background: hsl(var(--destructive));
	}

	.time-mark {
		margin-top: 7px;
		font-size: 12px;
	}

	:global(.match-card-footer) {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.result-pill {
		min-height: 32px;
		font-size: 14px;
		font-weight: 600;
	}

	.detail-link {
		min-height: 32px;
		border-radius: 6px;
		padding: 0 10px;
		font-size: 14px;
		font-weight: 600;
		text-decoration: none;
		transition:
			background-color 150ms ease,
			color 150ms ease;
	}

	.detail-link:hover {
		background: hsl(var(--accent));
		color: hsl(var(--accent-foreground));
	}

	@media (max-width: 640px) {
		:global(.match-card-header),
		:global(.match-card-footer) {
			flex-direction: column;
			align-items: stretch;
		}

		.match-badges {
			justify-content: flex-start;
		}

		.progress-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
