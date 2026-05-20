<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Ban, Clock, ShieldX } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';
	import type { PvpBanPick, PvpBanPickAction, PvpLevel } from '$lib/client/pvp';

	export let banPick: PvpBanPick | null = null;
	export let currentUid: string | null | undefined = null;
	export let selectedLevelIds: number[] = [];
	export let remainingMs = 0;
	export let waitingToStart = false;
	export let turnSubmitted = false;
	export let requiredCount = 0;
	export let formatDuration: (ms: number) => string = (ms) => String(ms);
	export let turnPlayerName = '';
	export let actionPlayerName: (action: PvpBanPickAction) => string = () => '';
	export let onToggleBan: (levelId: number) => void = () => {};

	$: actions = Array.isArray(banPick?.actions) ? banPick.actions : [];
	$: poolLevelIds = Array.isArray(banPick?.poolLevelIds)
		? banPick.poolLevelIds
				.map((levelId) => normalizeLevelId(levelId))
				.filter((levelId): levelId is number => Boolean(levelId))
		: [];
	$: poolLevels = Array.isArray(banPick?.poolLevels) ? banPick.poolLevels : [];
	$: displayLevels = poolLevels.length
		? poolLevels
		: poolLevelIds.map((levelId) => ({ id: levelId, levelId }) as PvpLevel);
	$: currentTurnUid = banPick?.currentUid ?? banPick?.current_uid ?? null;
	$: isViewerTurn = sameUid(currentTurnUid, currentUid);
	$: totalBans = Number(banPick?.totalBans ?? 6);

	function sameUid(a: unknown, b: unknown) {
		return Boolean(a && b && String(a) === String(b));
	}

	function normalizeLevelId(value: unknown) {
		const id = Number(value);
		return Number.isInteger(id) && id > 0 ? id : null;
	}

	function levelIdFor(level: PvpLevel | null | undefined, poolIndex: number) {
		return (
			normalizeLevelId(poolLevelIds[poolIndex]) ??
			normalizeLevelId(level?.levelId) ??
			normalizeLevelId(level?.id) ??
			normalizeLevelId(level?.levelID) ??
			normalizeLevelId(level?.level_id) ??
			normalizeLevelId(level?.ID)
		);
	}

	function actionForLevel(levelId: number | null | undefined) {
		if (!levelId) return null;
		return actions.find((action) => Number(action.levelId) === levelId) ?? null;
	}

	function canToggleLevel(
		levelId: number | null,
		banAction: PvpBanPickAction | null,
		selected: boolean
	) {
		if (!levelId || !isViewerTurn || banAction) return false;
		if (!selected && selectedLevelIds.length >= requiredCount) return false;
		return true;
	}
</script>

<section class="ban-pick-section">
	<Card.Root>
		<Card.Header>
			<div class="ban-pick-header">
				<div>
					<Card.Title>{$_('pvp.ban_pick.title')}</Card.Title>
					<Card.Description>
						{$_('pvp.ban_pick.description')}
					</Card.Description>
				</div>
				<div class="ban-pick-turn">
					<Clock class="h-4 w-4" />
					<strong>{formatDuration(remainingMs)}</strong>
					<span>{waitingToStart ? $_('pvp.ban_pick.starts_in') : $_('pvp.ban_pick.ends_in')}</span>
				</div>
			</div>
		</Card.Header>

		<Card.Content class="ban-pick-content">
			<div class="ban-pick-status">
				<Badge variant={isViewerTurn ? 'default' : 'secondary'}>
					{turnSubmitted
						? $_('pvp.ban_pick.turn_submitted')
						: waitingToStart
							? $_('pvp.ban_pick.turn_starts_soon')
							: isViewerTurn
								? $_('pvp.ban_pick.your_turn')
								: $_('pvp.ban_pick.waiting_turn', { values: { player: turnPlayerName } })}
				</Badge>
				<span>
					{$_('pvp.ban_pick.bans_progress', {
						values: {
							current: actions.length,
							total: totalBans
						}
					})}
				</span>
				{#if isViewerTurn && !turnSubmitted}
					<span>
						{$_('pvp.ban_pick.selected_progress', {
							values: {
								current: selectedLevelIds.length,
								total: requiredCount
							}
						})}
					</span>
				{/if}
			</div>

			<div class="ban-pick-grid">
				{#each displayLevels as poolLevel, poolIndex}
					{@const levelId = levelIdFor(poolLevel, poolIndex)}
					{@const banAction = actionForLevel(levelId)}
					{@const selectedForBan = levelId ? selectedLevelIds.includes(levelId) : false}
					{@const canToggle = canToggleLevel(levelId, banAction, selectedForBan)}
					<div
						class:banned={Boolean(banAction)}
						class:selected={selectedForBan}
						class="ban-pick-level"
					>
						<div class="ban-pick-level-main">
							<div>
								<strong>{poolLevel.name || `#${levelId ?? '?'}`}</strong>
								<p>
									{#if poolLevel.creator || poolLevel.author}
										{$_('head.labels.by')} {poolLevel.creator || poolLevel.author}
									{:else}
										ID: {levelId ?? '--'}
									{/if}
								</p>
							</div>
							{#if banAction}
								<Badge variant="destructive">
									<ShieldX class="mr-1 h-3.5 w-3.5" />
									{banAction.auto ? $_('pvp.ban_pick.auto_banned') : $_('pvp.ban_pick.banned')}
								</Badge>
							{/if}
						</div>

						<div class="ban-pick-level-footer">
							{#if banAction}
								<span>
									{banAction.auto
										? $_('pvp.ban_pick.auto_banned_by', {
												values: { player: actionPlayerName(banAction) }
											})
										: $_('pvp.ban_pick.banned_by', {
												values: { player: actionPlayerName(banAction) }
											})}
								</span>
							{:else}
								<Button
									variant={selectedForBan ? 'default' : 'outline'}
									size="sm"
									disabled={!canToggle}
									on:click={() => levelId && onToggleBan(levelId)}
								>
									<Ban class="mr-2 h-4 w-4" />
									{selectedForBan ? $_('pvp.ban_pick.unselect') : $_('pvp.ban_pick.select')}
								</Button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</Card.Content>
	</Card.Root>
</section>

<style lang="scss">
	.ban-pick-section {
		margin-top: 16px;
	}

	.ban-pick-header,
	.ban-pick-status,
	.ban-pick-level-main,
	.ban-pick-level-footer {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.ban-pick-header,
	.ban-pick-level-main,
	.ban-pick-level-footer {
		justify-content: space-between;
	}

	.ban-pick-turn {
		display: inline-flex;
		min-width: 78px;
		align-items: center;
		justify-content: center;
		gap: 6px;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		padding: 8px 10px;
	}

	.ban-pick-turn span {
		color: hsl(var(--muted-foreground));
		font-size: 12px;
	}

	:global(.ban-pick-content) {
		display: grid;
		gap: 14px;
	}

	.ban-pick-status {
		flex-wrap: wrap;
		color: hsl(var(--muted-foreground));
		font-size: 14px;
	}

	.ban-pick-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}

	.ban-pick-level {
		display: grid;
		gap: 12px;
		min-height: 118px;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		padding: 12px;
		transition:
			border-color 0.2s ease,
			opacity 0.2s ease,
			background 0.2s ease;
	}

	.ban-pick-level.banned {
		border-color: hsl(var(--destructive) / 0.45);
		background: hsl(var(--destructive) / 0.08);
		opacity: 0.72;
	}

	.ban-pick-level.selected {
		border-color: hsl(var(--primary));
		background: hsl(var(--primary) / 0.08);
	}

	.ban-pick-level-main {
		align-items: flex-start;
	}

	.ban-pick-level-main strong {
		display: block;
		font-size: 0.98rem;
	}

	.ban-pick-level-main p,
	.ban-pick-level-footer span {
		margin: 3px 0 0;
		color: hsl(var(--muted-foreground));
		font-size: 13px;
	}

	@media (max-width: 900px) {
		.ban-pick-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.ban-pick-header {
			align-items: stretch;
			flex-direction: column;
		}
	}
</style>
