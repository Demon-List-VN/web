<script lang="ts">
	import PlayerLink from '$lib/components/playerLink.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import type { PvpPlayer, PvpWeeklyRace } from '$lib/client/pvp';
	import { _, locale } from 'svelte-i18n';
	import { BookOpen, CalendarDays, RefreshCw, Trophy } from 'lucide-svelte';

	export let weeklyRace: PvpWeeklyRace;
	export let currentUid: string | null = null;
	export let currentPlayer: PvpPlayer | null = null;
	export let loading = false;
	export let error = '';
	export let now = Date.now();
	export let onRefresh: () => void | Promise<void>;

	let activeTab = 'standings';

	$: weekRange = formatWeekRange(weeklyRace.week);
	$: resetCountdown = remainingLongLabel(getWeekEndMs(weeklyRace.week), now);
	$: previousWeekRange = formatWeekRange(weeklyRace.previousWeek);
	$: userRaceRow = getUserRaceRow(weeklyRace, currentUid, currentPlayer);

	function remainingLongLabel(targetMs: number | null, currentNow: number) {
		if (!targetMs) return '--';

		const totalMinutes = Math.max(0, Math.floor((targetMs - currentNow) / 60_000));
		const days = Math.floor(totalMinutes / (24 * 60));
		const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
		const minutes = totalMinutes % 60;

		if (days > 0) return `${days}d ${hours}h`;
		if (hours > 0) return `${hours}h ${minutes}m`;
		return `${minutes}m`;
	}

	function getWeekEndMs(week: PvpWeeklyRace['week']) {
		const value = week?.weekEndAt ?? week?.week_end_at;
		if (!value) return null;

		const ms = new Date(value).getTime();
		return Number.isFinite(ms) ? ms : null;
	}

	function formatWeekRange(week: PvpWeeklyRace['week']) {
		const start = week?.weekStartAt ?? week?.week_start_at;
		const end = week?.weekEndAt ?? week?.week_end_at;
		if (!start || !end) return '--';

		return `${formatWeekDate(start)} - ${formatWeekDate(
			new Date(new Date(end).getTime() - 1).toISOString()
		)}`;
	}

	function formatWeekDate(value: string) {
		const date = new Date(value);
		if (!Number.isFinite(date.getTime())) return '--';

		return new Intl.DateTimeFormat($locale || 'en', {
			month: 'short',
			day: 'numeric',
			timeZone: 'Asia/Ho_Chi_Minh'
		}).format(date);
	}

	function rowPlayer(row: PvpWeeklyRace['leaderboard'][number]) {
		return row.player ?? row.players ?? { uid: row.uid, name: row.uid };
	}

	function rowUid(row: PvpWeeklyRace['leaderboard'][number]) {
		const player = row.player ?? row.players;
		return row.uid ?? player?.uid ?? player?.id;
	}

	function getUserRaceRow(
		race: PvpWeeklyRace,
		uid: string | null,
		player: PvpPlayer | null
	): PvpWeeklyRace['leaderboard'][number] | null {
		if (!uid) return null;

		return (
			race.leaderboard.find((row) => rowUid(row) === uid) ??
			race.currentPlayer ??
			({
				uid,
				points: 0,
				wins: 0,
				matches: 0,
				winrate: 0,
				player
			} as PvpWeeklyRace['leaderboard'][number])
		);
	}

	function formatWinrate(value: number | null | undefined) {
		const winrate = Number(value);
		if (!Number.isFinite(winrate)) return '0%';

		return `${winrate.toLocaleString($locale || 'en', {
			maximumFractionDigits: winrate % 1 === 0 ? 0 : 1
		})}%`;
	}
</script>

<section class="weekly-race-section">
	<Card.Root>
		<Card.Header>
			<div class="section-heading inside">
				<div>
					<Card.Title class="weekly-race-title">
						<CalendarDays class="h-5 w-5" />
						{$_('pvp.weekly_race.title')}
					</Card.Title>
					<Card.Description>{$_('pvp.weekly_race.description')}</Card.Description>
				</div>
				<Button
					variant="ghost"
					size="icon"
					disabled={loading}
					on:click={() => onRefresh?.()}
					aria-label={$_('pvp.refresh')}
				>
					<RefreshCw class={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
				</Button>
			</div>
		</Card.Header>
		<Card.Content>
			<Tabs.Root bind:value={activeTab}>
				<Tabs.List
					class="weekly-race-tab-list py-[20px]"
					aria-label={$_('pvp.weekly_race.tabs.label')}
				>
					<Tabs.Trigger value="standings" class="weekly-race-tab-trigger">
						<Trophy class="h-4 w-4" />
						{$_('pvp.weekly_race.tabs.standings')}
					</Tabs.Trigger>
					<Tabs.Trigger value="tutorial" class="weekly-race-tab-trigger">
						<BookOpen class="h-4 w-4" />
						{$_('pvp.weekly_race.tabs.tutorial')}
					</Tabs.Trigger>
				</Tabs.List>

				<Tabs.Content value="standings">
					<div class="weekly-race-meta">
						<div>
							<span>{$_('pvp.weekly_race.current_week')}</span>
							<strong>{weekRange}</strong>
						</div>
						<div>
							<span>{$_('pvp.weekly_race.reset_in')}</span>
							<strong>{resetCountdown}</strong>
						</div>
					</div>

					{#if loading}
						<div class="leaderboard-skeleton" aria-label={$_('general.loading')}>
							<div></div>
							<div></div>
							<div></div>
						</div>
					{:else if error}
						<div class="empty-state">{error}</div>
					{:else}
						{#if userRaceRow}
							{@const userPlayer = rowPlayer(userRaceRow)}
							<div class="weekly-race-user-result" aria-label={$_('pvp.weekly_race.your_result')}>
								<span>
									{#if userRaceRow.rank}
										#{userRaceRow.rank}
									{:else}
										{$_('pvp.weekly_race.your_result')}
									{/if}
								</span>
								<span class="leaderboard-player">
									<PlayerLink player={userPlayer} showAvatar truncate={28} />
								</span>
								<strong>{userRaceRow.points}</strong>
								<strong>{formatWinrate(userRaceRow.winrate)}</strong>
							</div>
						{/if}
						{#if weeklyRace.leaderboard.length === 0}
							<div class="empty-state">{$_('pvp.weekly_race.empty')}</div>
						{:else}
							<div class="leaderboard-table" role="table" aria-label={$_('pvp.weekly_race.title')}>
								<div class="leaderboard-row leaderboard-head" role="row">
									<span role="columnheader">{$_('pvp.leaderboard.rank')}</span>
									<span role="columnheader">{$_('pvp.leaderboard.player')}</span>
									<span role="columnheader">{$_('pvp.weekly_race.points')}</span>
									<span role="columnheader">{$_('pvp.weekly_race.winrate')}</span>
								</div>
								{#each weeklyRace.leaderboard as row}
									{@const player = rowPlayer(row)}
									<div class="leaderboard-row" role="row">
										<span class="leaderboard-rank" role="cell">#{row.rank}</span>
										<span class="leaderboard-player" role="cell">
											<PlayerLink {player} showAvatar truncate={28} />
										</span>
										<span class="leaderboard-rating" role="cell">{row.points}</span>
										<span role="cell">{formatWinrate(row.winrate)}</span>
									</div>
								{/each}
							</div>
						{/if}
					{/if}

					{#if !loading && weeklyRace.previousWeek}
						<div class="weekly-race-history">
							<div class="section-heading inside">
								<div>
									<strong>{$_('pvp.weekly_race.history_title')}</strong>
									<span>{previousWeekRange}</span>
								</div>
							</div>
							{#if weeklyRace.previousLeaderboard.length === 0}
								<div class="empty-state compact">{$_('pvp.weekly_race.history_empty')}</div>
							{:else}
								<div class="weekly-race-history-list">
									{#each weeklyRace.previousLeaderboard.slice(0, 3) as row}
										{@const player = rowPlayer(row)}
										<div>
											<span class="leaderboard-rank">#{row.rank}</span>
											<PlayerLink {player} showAvatar truncate={24} />
											<strong>{row.points}</strong>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
				</Tabs.Content>

				<Tabs.Content value="tutorial">
					<div class="weekly-race-tutorial">
						<div>
							<span>1</span>
							<strong>{$_('pvp.weekly_race.tutorial.queue_title')}</strong>
							<p>{$_('pvp.weekly_race.tutorial.queue_description')}</p>
						</div>
						<div>
							<span>2</span>
							<strong>{$_('pvp.weekly_race.tutorial.score_title')}</strong>
							<p>{$_('pvp.weekly_race.tutorial.score_description')}</p>
						</div>
						<div>
							<span>3</span>
							<strong>{$_('pvp.weekly_race.tutorial.reset_title')}</strong>
							<p>{$_('pvp.weekly_race.tutorial.reset_description')}</p>
						</div>
					</div>
				</Tabs.Content>
			</Tabs.Root>
		</Card.Content>
	</Card.Root>
</section>

<style>
	.weekly-race-section {
		margin-bottom: 20px;
	}

	.section-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}

	.section-heading.inside {
		margin: 0;
	}

	:global(.weekly-race-title) {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}

	:global(.weekly-race-tab-list) {
		display: inline-flex;
		width: auto;
		height: auto;
		margin-bottom: 16px;
		gap: 4px;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		background: hsl(var(--muted) / 0.28);
		padding: 4px;
	}

	:global(.weekly-race-tab-trigger) {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 34px;
		padding-inline: 12px;
	}

	.weekly-race-meta {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
		margin-bottom: 16px;
	}

	.weekly-race-meta > div {
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		padding: 12px 14px;
	}

	.weekly-race-meta span,
	.weekly-race-history span {
		display: block;
		color: hsl(var(--muted-foreground));
		font-size: 13px;
	}

	.weekly-race-meta strong {
		display: block;
		margin-top: 4px;
		font-size: 1rem;
	}

	.leaderboard-table {
		display: grid;
		overflow: hidden;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
	}

	.weekly-race-user-result {
		display: grid;
		grid-template-columns: 80px minmax(0, 1fr) 110px 120px;
		align-items: center;
		gap: 12px;
		min-height: 50px;
		margin-bottom: 10px;
		border: 1px solid hsl(var(--primary) / 0.35);
		border-radius: 8px;
		background: hsl(var(--primary) / 0.08);
		padding: 10px 14px;
	}

	.weekly-race-user-result > span:first-child {
		color: hsl(var(--muted-foreground));
		font-size: 12px;
		font-weight: 750;
		text-transform: uppercase;
	}

	.weekly-race-user-result strong {
		font-size: 1rem;
		font-weight: 750;
	}

	.leaderboard-row {
		display: grid;
		grid-template-columns: 80px minmax(0, 1fr) 110px 120px;
		align-items: center;
		gap: 12px;
		min-height: 50px;
		border-top: 1px solid hsl(var(--border));
		padding: 10px 14px;
	}

	.leaderboard-row:first-child {
		border-top: 0;
	}

	.leaderboard-head {
		min-height: 38px;
		background: hsl(var(--muted) / 0.35);
		color: hsl(var(--muted-foreground));
		font-size: 12px;
		font-weight: 750;
		text-transform: uppercase;
	}

	.leaderboard-rank {
		color: hsl(var(--muted-foreground));
		font-weight: 750;
	}

	.leaderboard-player {
		min-width: 0;
	}

	.leaderboard-rating {
		color: hsl(var(--foreground));
		font-size: 1rem;
		font-weight: 750;
	}

	.leaderboard-skeleton {
		display: grid;
		gap: 10px;
	}

	.leaderboard-skeleton div {
		height: 50px;
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

	.empty-state {
		display: flex;
		align-items: center;
		min-height: 72px;
		color: hsl(var(--muted-foreground));
		font-size: 13px;
	}

	.weekly-race-history {
		display: grid;
		gap: 12px;
		margin-top: 18px;
		border-top: 1px solid hsl(var(--border));
		padding-top: 16px;
	}

	.weekly-race-history-list {
		display: grid;
		gap: 8px;
	}

	.weekly-race-history-list > div {
		display: grid;
		grid-template-columns: 56px minmax(0, 1fr) 56px;
		align-items: center;
		gap: 10px;
		min-height: 42px;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		padding: 8px 10px;
	}

	.weekly-race-history-list strong {
		text-align: right;
	}

	.weekly-race-tutorial {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 12px;
	}

	.weekly-race-tutorial > div {
		display: grid;
		align-content: start;
		gap: 8px;
		min-height: 150px;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		padding: 14px;
	}

	.weekly-race-tutorial span {
		display: inline-flex;
		width: 28px;
		height: 28px;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		background: hsl(var(--primary) / 0.12);
		color: hsl(var(--primary));
		font-weight: 800;
	}

	.weekly-race-tutorial strong {
		font-size: 15px;
	}

	.weekly-race-tutorial p {
		margin: 0;
		color: hsl(var(--muted-foreground));
		font-size: 13px;
		line-height: 1.45;
	}

	@keyframes pvp-skeleton {
		from {
			background-position: 200% 0;
		}

		to {
			background-position: -200% 0;
		}
	}

	@media (max-width: 640px) {
		.weekly-race-meta,
		.weekly-race-tutorial {
			grid-template-columns: 1fr;
		}

		.leaderboard-row {
			grid-template-columns: 54px minmax(0, 1fr) 76px;
		}

		.weekly-race-user-result {
			grid-template-columns: minmax(0, 1fr) 76px 76px;
		}

		.weekly-race-user-result > span:first-child {
			display: none;
		}

		.leaderboard-row > :nth-child(4) {
			display: none;
		}
	}
</style>
