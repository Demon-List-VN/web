<script lang="ts">
	import { user } from '$lib/client/user';
	import { isActive } from '$lib/client/isSupporterActive';
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import PlayerSelector from '$lib/components/playerSelector.svelte';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import { X } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';

	let player1: any = null;
	let player2: any = null;
	let player1Records: any = null;
	let player2Records: any = null;
	let selectorOpen = false;
	let selectingFor: 1 | 2 = 1;

	let hasAutoLoaded = false;

	$: if ($user.checked && !player1 && $user.data && !hasAutoLoaded) {
		// Auto-select current user as player 1 (only once)
		loadPlayer($user.data.uid, 1);
		hasAutoLoaded = true;
	}

	async function loadPlayer(uid: string, playerSlot: 1 | 2) {
		try {
			const [playerRes, recordsRes] = await Promise.all([
				fetch(`${import.meta.env.VITE_API_URL}/players/${uid}`),
				fetch(`${import.meta.env.VITE_API_URL}/players/${uid}/records`)
			]);

			const data = await playerRes.json();
			const recordsData = await recordsRes.json();

			// Combine all records from dl, fl, and pl arrays
			const allRecords = [
				...(recordsData.dl || []),
				...(recordsData.fl || []),
				...(recordsData.pl || [])
			];

			if (playerSlot === 1) {
				player1 = data;
				player1Records = allRecords;
			} else {
				player2 = data;
				player2Records = allRecords;
			}
		} catch (err) {
			console.error('Failed to load player', err);
		}
	}

	function handlePlayerSelect(event: CustomEvent<any>) {
		loadPlayer(event.detail.uid, selectingFor);
	}

	function openSelector(slot: 1 | 2) {
		selectingFor = slot;
		selectorOpen = true;
	}

	function removePlayer(slot: 1 | 2) {
		if (slot === 1) {
			player1 = null;
			player1Records = null;
		} else {
			player2 = null;
			player2Records = null;
		}
	}

	function getBestRecord(records: any[], listType: 'dl' | 'pl') {
		if (!records || !Array.isArray(records) || records.length === 0) return null;

		const filtered = records.filter((r: any) => {
			return r.levels?.dlTop && r.levels.dlTop > 0 && r.levels.isPlatformer == (listType == 'pl');
		});

		if (filtered.length === 0) return null;

		return filtered.reduce((best: any, current: any) => {
			const bestRank = best.levels.dlTop;
			const currentRank = current.levels.dlTop;
			return currentRank < bestRank ? current : best;
		});
	}

	function getStatDisplay(value: any) {
		return value ?? 'N/A';
	}

	function getRankDisplay(value: any) {
		return value ? `#${value}` : 'N/A';
	}

	function getStatComparison(value1: any, value2: any, higherIsBetter = true) {
		if (value1 === null || value2 === null) return 'neutral';
		const v1 = Number(value1);
		const v2 = Number(value2);
		if (isNaN(v1) || isNaN(v2)) return 'neutral';

		if (higherIsBetter) {
			return v1 > v2 ? 'better' : v1 < v2 ? 'worse' : 'neutral';
		} else {
			return v1 < v2 ? 'better' : v1 > v2 ? 'worse' : 'neutral';
		}
	}
</script>

<svelte:head>
	<title>{$_('compare.title')} - Geometry Dash VN</title>
</svelte:head>

<div class="wrapper">
	<h1 class="mb-8 text-center text-4xl font-bold">{$_('compare.title')}</h1>

	<!-- Player Selection Cards -->
	<div class="selection-grid">
		<!-- Player 1 Card -->
		<Card.Root class="player-select-card">
			<Card.Header>
				<Card.Title>{$_('compare.player_1')}</Card.Title>
			</Card.Header>
			<Card.Content>
				{#if player1}
					<div class="selected-player">
						<Avatar.Root class="h-16 w-16">
							<Avatar.Image
								class="object-cover"
								src={`https://cdn.demonlistvn.com/avatars/${player1.uid}${
									isActive(player1.supporterUntil) && player1.isAvatarGif ? '.gif' : '.jpg'
								}`}
								alt={player1.name}
							/>
							<Avatar.Fallback>{player1.name[0]}</Avatar.Fallback>
						</Avatar.Root>
						<div class="flex-1">
							<PlayerLink player={player1} />
						</div>
						<Button variant="ghost" size="icon" on:click={() => removePlayer(1)}>
							<X class="h-4 w-4" />
						</Button>
					</div>
				{:else}
					<Button class="w-full" on:click={() => openSelector(1)}
						>{$_('compare.select_player')}</Button
					>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- VS Divider -->
		<div class="vs-divider">
			<span class="text-2xl font-bold text-muted-foreground">VS</span>
		</div>

		<!-- Player 2 Card -->
		<Card.Root class="player-select-card">
			<Card.Header>
				<Card.Title>{$_('compare.player_2')}</Card.Title>
			</Card.Header>
			<Card.Content>
				{#if player2}
					<div class="selected-player">
						<Avatar.Root class="h-16 w-16">
							<Avatar.Image
								class="object-cover"
								src={`https://cdn.demonlistvn.com/avatars/${player2.uid}${
									isActive(player2.supporterUntil) && player2.isAvatarGif ? '.gif' : '.jpg'
								}`}
								alt={player2.name}
							/>
							<Avatar.Fallback>{player2.name[0]}</Avatar.Fallback>
						</Avatar.Root>
						<div class="flex-1">
							<PlayerLink player={player2} />
						</div>
						<Button variant="ghost" size="icon" on:click={() => removePlayer(2)}>
							<X class="h-4 w-4" />
						</Button>
					</div>
				{:else}
					<Button class="w-full" on:click={() => openSelector(2)}>Select Player</Button>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Comparison Table -->
	{#if player1 && player2}
		<Card.Root class="comparison-card mt-8">
			<Card.Header>
				<Card.Title class="text-center">{$_('compare.statistics_comparison')}</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="comparison-table">
					<!-- Rating -->
					<div class="comparison-row">
						<div class="stat-cell {getStatComparison(player1.rating, player2.rating)}">
							<div class="stat-value">{getStatDisplay(player1.rating)}</div>
							<div
								class="stat-rank {getStatComparison(
									player1.overallRank,
									player2.overallRank,
									false
								)}"
							>
								{getRankDisplay(player1.overallRank)}
							</div>
						</div>
						<div class="stat-label">{$_('compare.rating')}</div>
						<div class="stat-cell {getStatComparison(player2.rating, player1.rating)}">
							<div class="stat-value">{getStatDisplay(player2.rating)}</div>
							<div
								class="stat-rank {getStatComparison(
									player2.overallRank,
									player1.overallRank,
									false
								)}"
							>
								{getRankDisplay(player2.overallRank)}
							</div>
						</div>
					</div>

					<!-- Platformer Rating -->
					<div class="comparison-row">
						<div class="stat-cell {getStatComparison(player1.plRating, player2.plRating)}">
							<div class="stat-value">{getStatDisplay(player1.plRating)}</div>
							<div class="stat-rank {getStatComparison(player1.plrank, player2.plrank, false)}">
								{getRankDisplay(player1.plrank)}
							</div>
						</div>
						<div class="stat-label">{$_('compare.platformer_rating')}</div>
						<div class="stat-cell {getStatComparison(player2.plRating, player1.plRating)}">
							<div class="stat-value">{getStatDisplay(player2.plRating)}</div>
							<div class="stat-rank {getStatComparison(player2.plrank, player1.plrank, false)}">
								{getRankDisplay(player2.plrank)}
							</div>
						</div>
					</div>

					<!-- Featured List Points -->
					<div class="comparison-row">
						<div class="stat-cell {getStatComparison(player1.totalFLpt, player2.totalFLpt)}">
							<div class="stat-value">{getStatDisplay(player1.totalFLpt)}</div>
							<div class="stat-rank {getStatComparison(player1.flrank, player2.flrank, false)}">
								{getRankDisplay(player1.flrank)}
							</div>
						</div>
						<div class="stat-label">{$_('compare.featured_list_points')}</div>
						<div class="stat-cell {getStatComparison(player2.totalFLpt, player1.totalFLpt)}">
							<div class="stat-value">{getStatDisplay(player2.totalFLpt)}</div>
							<div class="stat-rank {getStatComparison(player2.flrank, player1.flrank, false)}">
								{getRankDisplay(player2.flrank)}
							</div>
						</div>
					</div>

					<!-- ELO -->
					<div class="comparison-row">
						<div class="stat-cell {getStatComparison(player1.elo, player2.elo)}">
							{getStatDisplay(player1.elo)}
							{#if player1.matchCount < 5}
								<span class="text-xs opacity-50">?</span>
							{/if}
						</div>
						<div class="stat-label">{$_('compare.contest_elo')}</div>
						<div class="stat-cell {getStatComparison(player2.elo, player1.elo)}">
							{getStatDisplay(player2.elo)}
							{#if player2.matchCount < 5}
								<span class="text-xs opacity-50">?</span>
							{/if}
						</div>
					</div>

					<!-- Best Classic Record -->
					{#if player1Records && player2Records}
						{@const p1Best = getBestRecord(player1Records, 'dl')}
						{@const p2Best = getBestRecord(player2Records, 'dl')}
						<div class="comparison-row">
							<div
								class="stat-cell {getStatComparison(
									p1Best?.levels?.dlTop,
									p2Best?.levels?.dlTop,
									false
								)}"
							>
								{#if p1Best}
									<a href="/level/{p1Best.levels.id}" class="level-link">
										<div class="stat-value">{p1Best.levels.name}</div>
										<div
											class="stat-rank {getStatComparison(
												p1Best.levels.dlTop,
												p2Best?.levels?.dlTop,
												false
											)}"
										>
											#{p1Best.levels.dlTop}
										</div>
									</a>
								{:else}
									<div class="stat-value">N/A</div>
								{/if}
							</div>
							<div class="stat-label">{$_('compare.best_classic')}</div>
							<div
								class="stat-cell {getStatComparison(
									p2Best?.levels?.dlTop,
									p1Best?.levels?.dlTop,
									false
								)}"
							>
								{#if p2Best}
									<a href="/level/{p2Best.levels.id}" class="level-link">
										<div class="stat-value">{p2Best.levels.name}</div>
										<div
											class="stat-rank {getStatComparison(
												p2Best.levels.dlTop,
												p1Best?.levels?.dlTop,
												false
											)}"
										>
											#{p2Best.levels.dlTop}
										</div>
									</a>
								{:else}
									<div class="stat-value">N/A</div>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Best Platformer Record -->
					{#if player1Records && player2Records}
						{@const p1Best = getBestRecord(player1Records, 'pl')}
						{@const p2Best = getBestRecord(player2Records, 'pl')}
						<div class="comparison-row">
							<div
								class="stat-cell {getStatComparison(
									p1Best?.levels?.dlTop,
									p2Best?.levels?.dlTop,
									false
								)}"
							>
								{#if p1Best}
									<a href="/level/{p1Best.levels.id}" class="level-link">
										<div class="stat-value">{p1Best.levels.name}</div>
										<div
											class="stat-rank {getStatComparison(
												p1Best.levels.dlTop,
												p2Best?.levels?.dlTop,
												false
											)}"
										>
											#{p1Best.levels.dlTop}
										</div>
									</a>
								{:else}
									<div class="stat-value">N/A</div>
								{/if}
							</div>
							<div class="stat-label">Best Platformer</div>
							<div
								class="stat-cell {getStatComparison(
									p2Best?.levels?.dlTop,
									p1Best?.levels?.dlTop,
									false
								)}"
							>
								{#if p2Best}
									<a href="/level/{p2Best.levels.id}" class="level-link">
										<div class="stat-value">{p2Best.levels.name}</div>
										<div
											class="stat-rank {getStatComparison(
												p2Best.levels.dlTop,
												p1Best?.levels?.dlTop,
												false
											)}"
										>
											#{p2Best.levels.dlTop}
										</div>
									</a>
								{:else}
									<div class="stat-value">N/A</div>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Total Records -->
					<div class="comparison-row">
						<div class="stat-cell {getStatComparison(player1.recordCount, player2.recordCount)}">
							{getStatDisplay(player1.recordCount)}
						</div>
						<div class="stat-label">{$_('compare.total_records')}</div>
						<div class="stat-cell {getStatComparison(player2.recordCount, player1.recordCount)}">
							{getStatDisplay(player2.recordCount)}
						</div>
					</div>

					<!-- Experience -->
					<div class="comparison-row">
						<div
							class="stat-cell {getStatComparison(
								player1.exp + player1.extraExp,
								player2.exp + player2.extraExp
							)}"
						>
							{getStatDisplay(player1.exp + player1.extraExp)}
						</div>
						<div class="stat-label">{$_('compare.total_experience')}</div>
						<div
							class="stat-cell {getStatComparison(
								player2.exp + player2.extraExp,
								player1.exp + player1.extraExp
							)}"
						>
							{getStatDisplay(player2.exp + player2.extraExp)}
						</div>
					</div>

					<!-- Location -->
					<div class="comparison-row">
						<div class="stat-cell neutral">
							{player1.city || player1.province || 'N/A'}
						</div>
						<div class="stat-label">{$_('compare.location')}</div>
						<div class="stat-cell neutral">
							{player2.city || player2.province || 'N/A'}
						</div>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Player Selector -->
	<PlayerSelector
		bind:open={selectorOpen}
		title="{$_('compare.select_player')} {selectingFor}"
		on:select={handlePlayerSelect}
	/>
</div>

<style lang="scss">
	.wrapper {
		padding: 50px 20px;
		max-width: 1400px;
		margin: 0 auto;
	}

	.selection-grid {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: 2rem;
		align-items: center;
		margin-bottom: 2rem;
	}

	.vs-divider {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.player-select-card {
		min-height: 200px;
		display: flex;
		flex-direction: column;
	}

	.selected-player {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.comparison-card {
		max-width: 1000px;
		margin: 0 auto;
	}

	.comparison-table {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.comparison-row {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: 1rem;
		align-items: center;
		padding: 0.75rem;
		border-radius: 0.5rem;
		background-color: hsl(var(--muted) / 0.3);
	}

	.stat-cell {
		text-align: center;
		font-weight: 600;
		font-size: 1.125rem;
		padding: 0.5rem;
		border-radius: 0.375rem;
		transition: all 0.2s;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;

		&.better {
			background-color: hsl(142 76% 36% / 0.2);
			color: hsl(142 76% 56%);
		}

		&.worse {
			background-color: hsl(0 84% 60% / 0.2);
			color: hsl(0 84% 70%);
		}

		&.neutral {
			opacity: 0.7;
		}
	}

	.stat-value {
		font-size: 1.125rem;
		font-weight: 600;
	}

	.stat-rank {
		font-size: 0.875rem;
		font-weight: 500;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		width: fit-content;
		margin: 0 auto;

		&.better {
			background-color: hsl(142 76% 36% / 0.3);
			color: hsl(142 76% 56%);
		}

		&.worse {
			background-color: hsl(0 84% 60% / 0.3);
			color: hsl(0 84% 70%);
		}

		&.neutral {
			opacity: 0.6;
		}
	}

	:global(.dark) {
		.stat-cell {
			&.better {
				background-color: hsl(142 76% 36% / 0.3);
				color: hsl(142 76% 65%);
			}

			&.worse {
				background-color: hsl(0 84% 60% / 0.3);
				color: hsl(0 84% 75%);
			}
		}

		.stat-rank {
			&.better {
				background-color: hsl(142 76% 36% / 0.4);
				color: hsl(142 76% 70%);
			}

			&.worse {
				background-color: hsl(0 84% 60% / 0.4);
				color: hsl(0 84% 80%);
			}
		}
	}

	.stat-label {
		font-weight: 500;
		text-align: center;
		min-width: 150px;
		color: hsl(var(--muted-foreground));
	}

	.level-link {
		color: inherit;
		text-decoration: none;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		transition: opacity 0.2s;

		&:hover {
			opacity: 0.8;
			text-decoration: underline;
		}
	}

	@media screen and (max-width: 1024px) {
		.selection-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.vs-divider {
			order: 2;
			padding: 0.5rem;
		}

		.stat-label {
			min-width: 120px;
			font-size: 0.875rem;
		}
	}

	@media screen and (max-width: 768px) {
		.wrapper {
			padding: 30px 15px;
		}

		.comparison-row {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}

		.stat-label {
			order: -1;
			text-align: left;
			font-size: 0.875rem;
			font-weight: 600;
		}

		.stat-cell {
			text-align: left;
		}
	}
</style>
