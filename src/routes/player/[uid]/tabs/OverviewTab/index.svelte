<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { getTitle } from '$lib/client';
	import { getExpLevel } from '$lib/client/getExpLevel';
	import {
		getPvpParticipantRatingAfter,
		getPvpParticipantRatingBefore,
		getPvpParticipantRatingDiff,
		getPvpMode,
		getPvpSelfParticipant,
		getPvpStatus,
		getPvpRequiredSubmissionLevel,
		getPvpRequiredSubmissionLevelId,
		getPvpVisibleRatingLabel,
		isPvpMatchRanked,
		isPvpRatingStable,
		type PvpMatch,
		type PvpMode,
		type PvpRequiredSubmission
	} from '$lib/client/pvp';
	import Heatmap from '$lib/components/heatmap.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import type { PlayerListRecordEntry } from '$lib/types/playerRankedList';
	import { getPlayerRankedListScoreLabel } from '$lib/types/playerRankedList';
	import {
		normalizeCustomListRankBadges,
		resolveCustomListRankBadge
	} from '$lib/utils/customListRank';
	import {
		getPvpRatingDeviationForMode,
		getPvpRatingForMode,
		resolvePvpRank
	} from '$lib/utils/pvpRank';
	import Chart from 'chart.js/auto';
	import 'chartjs-adapter-date-fns';
	import annotationPlugin from 'chartjs-plugin-annotation';
	import {
		Activity,
		CalendarClock,
		LineChart,
		ListChecks,
		Medal,
		ShieldAlert,
		Trophy,
		Zap
	} from 'lucide-svelte';
	import { _ } from 'svelte-i18n';
	import type { PageData } from '../../$types';
	import { getBorderStyle } from './cards/getBorderStyle';

	Chart.register(annotationPlugin);

	export let data: PageData;

	const INITIAL_EVENT_RATING = 1500;
	const PVP_MODES: PvpMode[] = ['classic', 'platformer'];
	const eloRankBands = [
		{ min: 3500, max: Infinity, color: 'rgba(170, 0, 0, 0.15)' },
		{ min: 3000, max: 3500, color: 'rgba(255, 51, 51, 0.15)' },
		{ min: 2500, max: 3000, color: 'rgba(255, 128, 0, 0.15)' },
		{ min: 2000, max: 2500, color: 'rgba(170, 0, 170, 0.15)' },
		{ min: 1500, max: 2000, color: 'rgba(0, 128, 255, 0.15)' },
		{ min: 1000, max: 1500, color: 'rgba(0, 200, 150, 0.15)' },
		{ min: 500, max: 1000, color: 'rgba(100, 200, 100, 0.15)' },
		{ min: 0, max: 500, color: 'rgba(150, 150, 150, 0.15)' }
	];
	const eventRatingBackgroundPlugin = {
		id: 'eventRatingBackground',
		beforeDraw: (chart: any) => {
			const { ctx, chartArea } = chart;
			const yScale = chart.scales.y;

			if (!chartArea || !yScale) {
				return;
			}

			ctx.save();

			for (const band of eloRankBands) {
				const yTop = yScale.getPixelForValue(
					Math.min(band.max, yScale.max)
				);
				const yBottom = yScale.getPixelForValue(
					Math.max(band.min, yScale.min)
				);

				if (yBottom > chartArea.top && yTop < chartArea.bottom) {
					ctx.fillStyle = band.color;
					ctx.fillRect(
						chartArea.left,
						Math.max(yTop, chartArea.top),
						chartArea.right - chartArea.left,
						Math.min(yBottom, chartArea.bottom)
							- Math.max(yTop, chartArea.top)
					);
				}
			}

			ctx.restore();
		}
	};

	$: player = data.player;
	$: listSummaries = data.listSummaries || [];
	$: pvpMatches = data.pvpMatches || [];
	$: selectedList = data.selectedList;
	$: selectedListRecords = data.selectedListRecords?.data || [];
	$: playerRecords = data.playerRecords?.data || [];
	$: rankedListRecords = data.allListRecords?.data || [];
	$: manuallyAcceptedPlayerRecords = rankedListRecords.length
		? rankedListRecords
		: playerRecords.filter((record) => isManuallyAcceptedRecord(record));
	$: uniqueManuallyAcceptedRecords = uniqueRecords(manuallyAcceptedPlayerRecords);
	$: recentRecords = [...uniqueManuallyAcceptedRecords]
		.sort((left, right) => getRecordTime(right) - getRecordTime(left))
		.slice(0, 5);
	$: selectedListOption = selectedList
		? { label: selectedList.title, value: selectedList.identifier }
		: undefined;
	$: selectedListBadge = selectedList
		? resolveCustomListRankBadge(
			selectedList,
			normalizeCustomListRankBadges(selectedList.rankBadges)
		)
		: null;
	$: selectedListScoreLabel = getPlayerRankedListScoreLabel(selectedList);
	$: selectedListTotalRecords = selectedList?.completedCount
		?? selectedListRecords.filter(hasListLeaderboardRecordEntry).length
		?? data.selectedListRecords?.total
		?? 0;
	$: selectedListTotalLevels =
		Array.isArray(data.selectedListRecords?.list?.items)
			? data.selectedListRecords.list.items.length
			: null;
	$: selectedListCoverage = selectedListTotalLevels && selectedListTotalLevels > 0
		? Math.round((selectedListTotalRecords / selectedListTotalLevels) * 100)
		: null;
	$: exp = player.exp + player.extraExp;
	$: expLevel = getExpLevel(exp);
	$: contestTitle = getTitle('elo', player);
	$: pvpRequiredSubmission = (
		player?.pvpRequiredSubmission
		?? player?.pvp_required_submission
		?? data.pvpRequiredSubmission
		?? null
	) as PvpRequiredSubmission | null;
	$: pvpRequiredSubmissionLevel = getPvpRequiredSubmissionLevel(
		pvpRequiredSubmission
	);
	$: pvpRequiredSubmissionLevelId = getPvpRequiredSubmissionLevelId(
		pvpRequiredSubmission
	);
	$: pvpRequiredSubmissionLevelLabel = pvpRequiredSubmissionLevel?.name
		|| (pvpRequiredSubmissionLevelId ? `#${pvpRequiredSubmissionLevelId}` : '-');
	let selectedPvpMode: PvpMode = 'classic';
	$: pvpRating = getPvpRatingForMode(player, selectedPvpMode);
	$: pvpRatedMatchCount = getPvpRatedMatchCount(player, selectedPvpMode);
	$: pvpRatingDeviation = getPvpRatingDeviationForMode(player, selectedPvpMode);
	$: pvpRank = resolvePvpRank(pvpRating, pvpRatingDeviation);
	$: pvpGraphDisabled = pvpRating !== null
		&& !isPvpRatingStable(pvpRatingDeviation);
	$: pvpStartLabel = $_('player.overview.start');
	$: pvpRatingHistory = getPvpRatingHistory(
		pvpMatches.filter((match) => getPvpMode(match) === selectedPvpMode),
		player.uid,
		pvpStartLabel
	);
	$: rankedEventHistory = getRankedEventHistory(data.events || []);

	function formatScore(value: number | null | undefined, precision = 0) {
		if (typeof value !== 'number' || !Number.isFinite(value)) {
			return '-';
		}

		return precision > 0
			? String(Math.round(value * 10 ** precision) / 10 ** precision)
			: String(Math.round(value));
	}

	function formatRank(value: number | null | undefined) {
		return typeof value === 'number' && Number.isFinite(value) && value > 0
			? `#${value}`
			: '-';
	}

	function formatPercent(value: number | null | undefined) {
		return typeof value === 'number' && Number.isFinite(value)
			? `${value}%`
			: '-';
	}

	function formatPvpRating() {
		if (pvpRating === null) {
			return '-';
		}

		return getPvpVisibleRatingLabel(pvpRating, pvpRatingDeviation) ?? '-';
	}

	function formatDate(record: PlayerListRecordEntry) {
		const timestamp = getRecordTime(record);

		return timestamp > 0
			? new Date(timestamp)
				.toLocaleDateString('vi-VN')
			: '-';
	}

	function formatRecordResult(record: PlayerListRecordEntry) {
		const isPlatformer = Boolean(
			record.level?.isPlatformer ?? record.rankedList?.isPlatformer
		);

		if (isPlatformer && typeof record.progress === 'number') {
			const minutes = Math.floor(record.progress / 60000);
			const seconds = Math.floor((record.progress % 60000) / 1000);
			const milliseconds = record.progress % 1000;

			return `${minutes}:${
				seconds.toString()
					.padStart(2, '0')
			}.${milliseconds}`;
		}

		return `${record.progress ?? 0}%`;
	}

	function getPvpRatedMatchCount(value: any, mode: PvpMode) {
		const matchCount = Number(
			mode === 'platformer'
				? value?.pvpPlatformerRatedMatchCount
					?? value?.pvp_platformer_rated_match_count
					?? value?.ratings?.platformer?.pvpRatedMatchCount
					?? value?.ratings?.platformer?.pvp_rated_match_count
					?? value?.platformerRating?.pvpRatedMatchCount
					?? value?.platformerRating?.pvp_rated_match_count
					?? (String(value?.mode || '') === mode
						? value?.pvpRatedMatchCount ?? value?.pvp_rated_match_count
						: null)
				: value?.pvpRatedMatchCount
					?? value?.pvp_rated_match_count
					?? value?.ratings?.classic?.pvpRatedMatchCount
					?? value?.ratings?.classic?.pvp_rated_match_count
					?? value?.rating?.pvpRatedMatchCount
					?? value?.rating?.pvp_rated_match_count
					?? null
		);

		return Number.isFinite(matchCount) ? matchCount : null;
	}

	function getRecordTime(record: PlayerListRecordEntry) {
		if (record.createdAt) {
			const createdAt = new Date(record.createdAt)
				.getTime();

			if (Number.isFinite(createdAt)) {
				return createdAt;
			}
		}

		return Number.isFinite(Number(record.timestamp))
			? Number(record.timestamp)
			: 0;
	}

	function getRecordDetailHref(record: PlayerListRecordEntry) {
		const recordQuery = record.id ? `?id=${record.id}` : '';

		return `/record/${record.uid}/${record.levelId}${recordQuery}`;
	}

	function getRecordKey(record: PlayerListRecordEntry) {
		return record.id != null
			? `record:${record.id}`
			: `level:${record.uid}:${record.levelId}:${
				record.timestamp ?? record.createdAt ?? ''
			}`;
	}

	function uniqueRecords(records: PlayerListRecordEntry[]) {
		const seen = new Set<string>();
		const result: PlayerListRecordEntry[] = [];

		for (const record of records) {
			const key = getRecordKey(record);

			if (seen.has(key)) {
				continue;
			}

			seen.add(key);
			result.push(record);
		}

		return result;
	}

	function isManuallyAcceptedRecord(record: PlayerListRecordEntry) {
		return Boolean(record.acceptedManually);
	}

	function hasListLeaderboardRecordEntry(record: PlayerListRecordEntry) {
		return Number.isFinite(Number(record.point))
			&& Number.isFinite(Number(record.no));
	}

	async function handleListChange(option: { value?: string; } | undefined) {
		const identifier = option?.value;
		const nextUrl = new URL($page.url.href);

		if (identifier) {
			nextUrl.searchParams.set('list', identifier);
		} else {
			nextUrl.searchParams.delete('list');
		}

		await goto(`${nextUrl.pathname}${nextUrl.search}`, {
			keepFocus: true,
			noScroll: true,
			replaceState: true
		});
	}

	function getPvpMatchTime(match: PvpMatch) {
		const timestamp = new Date(
			match.ratingAppliedAt
			?? match.rating_applied_at
			?? match.endedAt
			?? match.endAt
			?? match.endsAt
			?? match.startedAt
			?? match.created_at
			?? 0
		)
			.getTime();

		return Number.isFinite(timestamp) ? timestamp : 0;
	}

	function getPvpRatingHistory(
		matches: PvpMatch[],
		uid: string | null | undefined,
		startLabel: string
	) {
		if (!uid) {
			return { labels: [], ratings: [], diffs: [] };
		}

		const ratedMatches = [...matches]
			.filter((match) =>
				getPvpStatus(match, '') === 'completed' && isPvpMatchRanked(match)
			)
			.sort((left, right) => getPvpMatchTime(left) - getPvpMatchTime(right))
			.map((match) => getPvpSelfParticipant(match, uid))
			.filter(Boolean)
			.map((participant) => ({
				before: getPvpParticipantRatingBefore(participant),
				after: getPvpParticipantRatingAfter(participant),
				diff: getPvpParticipantRatingDiff(participant)
			}))
			.filter((point) => point.after !== null)
			.slice(-25);

		if (!ratedMatches.length) {
			return { labels: [], ratings: [], diffs: [] };
		}

		const firstBefore = ratedMatches[0].before;
		const rawRatings = [
			firstBefore ?? ratedMatches[0].after,
			...ratedMatches.map((point) => point.after)
		].filter((rating): rating is number => rating !== null);

		return {
			labels: rawRatings.map((
				_,
				index
			) => (index === 0 ? startLabel : String(index))),
			ratings: rawRatings.map((rating) => Math.round(rating)),
			diffs: rawRatings.map((_, index) => {
				const diff = ratedMatches[index - 1]?.diff;

				return index === 0 || diff === null || diff === undefined
					? null
					: Math.round(diff);
			})
		};
	}

	function getRankedEventHistory(events: any[]) {
		const labels: string[] = [];
		const ratings: number[] = [];
		const diffs: number[] = [];
		const titles: string[] = [];
		let currentRating = INITIAL_EVENT_RATING;

		for (const entry of [...events].reverse()) {
			if (
				!entry?.events?.isContest || !entry?.events?.isRanked
				|| entry.diff === null
			) {
				continue;
			}

			currentRating += entry.diff;
			labels.push(entry.events.start);
			ratings.push(currentRating);
			diffs.push(entry.diff);
			titles.push(entry.events.title);
		}

		return { labels, ratings, diffs, titles };
	}

	function createEventChart(node: HTMLCanvasElement) {
		const chart = new Chart(node, {
			type: 'line',
			data: {
				labels: rankedEventHistory.labels,
				datasets: [
					{
						label: $_('player.overview.contest_rating'),
						data: rankedEventHistory.ratings,
						borderColor: player.borderColor || 'hsl(210, 90%, 55%)',
						backgroundColor: 'rgba(59, 130, 246, 0.12)',
						tension: 0,
						fill: true,
						pointRadius: 4,
						pointHoverRadius: 7
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				scales: {
					x: {
						type: 'time',
						ticks: {
							display: false
						},
						grid: {
							display: false
						}
					},
					y: {
						beginAtZero: false,
						grid: {
							color: 'rgba(128, 128, 128, 0.18)'
						}
					}
				},
				plugins: {
					legend: {
						display: false
					},
					tooltip: {
						callbacks: {
							title: (context) =>
								rankedEventHistory.titles[context[0].dataIndex]
									|| '',
							label: (context) => {
								const diff =
									rankedEventHistory.diffs[context.dataIndex];
								const diffLabel = diff >= 0
									? `+${diff}`
									: String(diff);

								return [
									`${
										$_('player.overview.contest_rating')
									}: ${context.parsed.y}`,
									`${$_('player.overview.change')}: ${diffLabel}`
								];
							}
						}
					}
				}
			},
			plugins: [eventRatingBackgroundPlugin]
		});

		return {
			destroy() {
				chart.destroy();
			}
		};
	}

	function createPvpChart(node: HTMLCanvasElement) {
		const chart = new Chart(node, {
			type: 'line',
			data: {
				labels: pvpRatingHistory.labels,
				datasets: [
					{
						label: $_('player.overview.pvp_rating'),
						data: pvpRatingHistory.ratings,
						borderColor: 'hsl(24, 94%, 53%)',
						backgroundColor: 'rgba(249, 115, 22, 0.12)',
						tension: 0,
						fill: true,
						pointRadius: 4,
						pointHoverRadius: 7
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				scales: {
					x: {
						grid: {
							display: false
						}
					},
					y: {
						beginAtZero: false,
						grid: {
							color: 'rgba(128, 128, 128, 0.18)'
						}
					}
				},
				plugins: {
					legend: {
						display: false
					},
					tooltip: {
						callbacks: {
							label: (context) => {
								const diff =
									pvpRatingHistory.diffs[context.dataIndex];
								const lines = [
									`${
										$_('player.overview.pvp_rating')
									}: ${context.parsed.y}`
								];

								if (typeof diff === 'number') {
									const diffLabel = diff >= 0
										? `+${diff}`
										: String(diff);
									lines.push(
										`${
											$_('player.overview.change')
										}: ${diffLabel}`
									);
								}

								return lines;
							}
						}
					}
				}
			},
			plugins: [eventRatingBackgroundPlugin]
		});

		return {
			destroy() {
				chart.destroy();
			}
		};
	}
</script>

<div class="overview-shell">
  <Card.Root class="overflow-hidden pt-[20px]" style={getBorderStyle(player)}>
    <Card.Content>
      <div class="heatmap-frame">
        {#key player.uid}
          <Heatmap uid={player.uid} />
        {/key}
      </div>
    </Card.Content>
  </Card.Root>

  <section class="top-card-grid">
    <Card.Root
      class="rating-graph-card overflow-hidden"
      style={getBorderStyle(player)}
    >
      <Card.Header>
        <div class="section-heading">
          <Medal class="h-5 w-5" />
          <Card.Title class="text-xl">{
            $_('player.overview.contest_rating')
          }</Card.Title>
        </div>
      </Card.Header>
      <Card.Content class="space-y-4">
        <div class="rating-value-row">
          <Tooltip.Root>
            <Tooltip.Trigger>
              <strong
                class="rating-value"
                style={contestTitle?.color ? `color: ${contestTitle.color}` : ''}
              >
                {player.matchCount < 5 ? `${player.elo}?` : player.elo}
              </strong>
            </Tooltip.Trigger>
            <Tooltip.Content>{contestTitle?.fullTitle}</Tooltip.Content>
          </Tooltip.Root>
          <span>{contestTitle?.fullTitle}</span>
        </div>
        {#if rankedEventHistory.ratings.length}
          <div class="chart-wrapper compact">
            {#key `${player.uid}:contest:${rankedEventHistory.ratings.length}`}
              <canvas
                use:createEventChart
                aria-label={$_('player.overview.contest_rating')}
              />
            {/key}
          </div>
        {:else}
          <div class="empty-panel graph-empty">
            <LineChart class="h-5 w-5" />
            <span>{$_('player.overview.no_event_data')}</span>
          </div>
        {/if}
      </Card.Content>
    </Card.Root>

    <Card.Root
      class="rating-graph-card overflow-hidden"
      style={getBorderStyle(player)}
    >
      <Card.Header class="pvp-card-header">
        <div class="section-heading">
          <Zap class="h-5 w-5" />
          <Card.Title class="text-xl">{
            $_('player.overview.pvp_rating')
          }</Card.Title>
        </div>
        <Tabs.Root bind:value={selectedPvpMode}>
          <Tabs.List
            class="profile-pvp-mode-list"
            aria-label={$_('pvp.mode_label')}
          >
            {#each PVP_MODES as mode}
              <Tabs.Trigger value={mode} class="profile-pvp-mode-trigger">
                {$_(`pvp.mode.${mode}`)}
              </Tabs.Trigger>
            {/each}
          </Tabs.List>
        </Tabs.Root>
      </Card.Header>
      <Card.Content class="space-y-4">
        <div class="rating-value-row pvp-rating-row">
          <div class="pvp-rating-main">
            {#if pvpRank && !pvpRequiredSubmission}
              <span class="pvp-rank-badge" style={pvpRank.badgeStyle}>
                {pvpRank.label}
              </span>
            {/if}
            {#if !pvpRequiredSubmission}
              <strong class="rating-value">{formatPvpRating()}</strong>
            {/if}
          </div>
          <div class="pvp-rating-meta">
            {#if !pvpRequiredSubmission}
              <span>
                {$_('player.overview.rank')}: {pvpRank?.label ?? $_('pvp.unranked')}
              </span>
              <span>
                {pvpRatedMatchCount ?? 0}
                {$_('player.overview.rated_matches')}
              </span>
            {/if}
          </div>
        </div>
        {#if pvpRequiredSubmission}
          <div class="empty-panel graph-empty pvp-verification-panel">
            <ShieldAlert class="h-5 w-5" />
            <div>
              <strong>{
                $_('player.overview.pvp_manual_verification_title')
              }</strong>
              <span>{
                $_('player.overview.pvp_manual_verification_description', {
                  values: { level: pvpRequiredSubmissionLevelLabel }
                })
              }</span>
            </div>
          </div>
        {:else if pvpGraphDisabled}
          <div class="empty-panel graph-empty">
            <LineChart class="h-5 w-5" />
            <span>{$_('player.overview.pvp_graph_unstable')}</span>
          </div>
        {:else if pvpRatingHistory.ratings.length}
          <div class="chart-wrapper compact">
            {#key `${player.uid}:pvp:${selectedPvpMode}:${pvpRatingHistory.ratings.join(':')}`}
              <canvas
                use:createPvpChart
                aria-label={$_('player.overview.pvp_rating')}
              />
            {/key}
          </div>
        {:else}
          <div class="empty-panel graph-empty">
            <LineChart class="h-5 w-5" />
            <span>{$_('player.overview.no_pvp_data')}</span>
          </div>
        {/if}
      </Card.Content>
    </Card.Root>

    <Card.Root class="exp-card overflow-hidden" style={getBorderStyle(player)}>
      <Card.Header>
        <div class="section-heading">
          <Activity class="h-5 w-5" />
          <Card.Title class="text-xl">{
            $_('player.overview.level_progress')
          }</Card.Title>
        </div>
      </Card.Header>
      <Card.Content class="space-y-5">
        <div class="exp-value-row">
          <strong>{$_('player.level')}.{expLevel.level}</strong>
          <span>{exp}/{expLevel.upperBound} EXP</span>
        </div>
        <Tooltip.Root>
          <Tooltip.Trigger class="w-full">
            <div class="progress-bar large">
              <div
                class="progress-fill"
                style={`width: ${expLevel.progress}%`}
              />
            </div>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p>{exp}/{expLevel.upperBound} ({expLevel.progress}%)</p>
            <p class="text-xs text-muted-foreground">
              {expLevel.upperBound - exp}
              {$_('player.exp_to_next')}
            </p>
          </Tooltip.Content>
        </Tooltip.Root>
        <div class="exp-detail-grid">
          <div>
            <span>EXP</span>
            <strong>{exp}</strong>
          </div>
          <div>
            <span>{$_('player.exp_to_next')}</span>
            <strong>{expLevel.upperBound - exp}</strong>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  </section>

  <section class="overview-main-grid">
    <Card.Root class="overflow-hidden" style={getBorderStyle(player)}>
      <Card.Header
        class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="section-heading">
          <Trophy class="h-5 w-5" />
          <div>
            <Card.Title class="text-xl">{
              $_('player.overview.selected_list')
            }</Card.Title>
            <p class="section-subtitle">
              {selectedList?.title || $_('player.overview.no_selected_list')}
            </p>
          </div>
        </div>
        {#if listSummaries.length}
          <Select.Root
            selected={selectedListOption}
            onSelectedChange={handleListChange}
          >
            <Select.Trigger class="w-full sm:w-[280px]">
              <Select.Value
                placeholder={$_('player.overview.selected_list_placeholder')}
              />
            </Select.Trigger>
            <Select.Content>
              {#each listSummaries as listSummary}
                <Select.Item value={listSummary.identifier}>{
                  listSummary.title
                }</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        {/if}
      </Card.Header>
      <Card.Content>
        {#if selectedList}
          <div class="summary-stats">
            <div class="summary-stat primary">
              <span>{selectedListScoreLabel}</span>
              <strong
                style={selectedListBadge ? `color: ${selectedListBadge.color}` : ''}
              >
                {formatScore(selectedList.score)}
              </strong>
              {#if selectedListBadge}
                <small
                  class="summary-badge"
                  style={`background: ${selectedListBadge.color}`}
                >
                  {selectedListBadge.label}
                </small>
              {/if}
            </div>
            <div class="summary-stat">
              <span>{$_('player.overview.rank')}</span>
              <strong>{formatRank(selectedList.rank)}</strong>
              <small>{$_('player.overview.leaderboard')}</small>
            </div>
            <div class="summary-stat">
              <span>{$_('player.overview.records')}</span>
              <strong>{selectedListTotalRecords}</strong>
              <small>{$_('player.overview.completed')}</small>
            </div>
            <div class="summary-stat">
              <span>{$_('player.overview.coverage')}</span>
              <strong>{formatPercent(selectedListCoverage)}</strong>
              <small>
                {selectedListTotalLevels ?? '-'}
                {$_('player.overview.levels')}
              </small>
            </div>
          </div>
        {:else}
          <div class="empty-panel">
            <ListChecks class="h-6 w-6" />
            <span>{$_('player.overview.no_ranked_lists')}</span>
          </div>
        {/if}
      </Card.Content>
    </Card.Root>
  </section>

  <Card.Root
    class="min-h-[350px] overflow-hidden"
    style={getBorderStyle(player)}
  >
    <Card.Header>
      <div class="section-heading">
        <CalendarClock class="h-5 w-5" />
        <div>
          <Card.Title class="text-xl">{
            $_('player.overview.recent_accepted_records')
          }</Card.Title>
          <p class="section-subtitle">
            {$_('player.overview.all_ranked_records')}
          </p>
        </div>
      </div>
    </Card.Header>
    <Card.Content>
      {#if recentRecords.length}
        <div class="recent-list">
          {#each recentRecords as record (getRecordKey(record))}
            <a class="recent-item" href={getRecordDetailHref(record)}>
              <div class="recent-main">
                <strong>{
                  record.level?.name || $_('player.overview.unknown_level')
                }</strong>
                <span>{
                  record.rankedList?.title || $_('player.overview.records')
                }</span>
              </div>
              <div class="recent-meta">
                <span>{formatRecordResult(record)}</span>
                <small>{formatDate(record)}</small>
              </div>
            </a>
          {/each}
        </div>
      {:else}
        <div class="empty-panel">
          <ListChecks class="h-6 w-6" />
          <span>{$_('player.overview.no_recent_records')}</span>
        </div>
      {/if}
    </Card.Content>
  </Card.Root>
</div>

<style lang="scss">
.overview-shell {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}

.top-card-grid,
.overview-main-grid {
  display: grid;
  gap: 20px;
}

.top-card-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.overview-main-grid {
  grid-template-columns: 1fr;
}

:global(.rating-graph-card),
:global(.exp-card) {
  min-height: 360px;
}

.section-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.section-heading :global(svg) {
  flex-shrink: 0;
  color: hsl(var(--primary));
}

:global(.pvp-card-header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

:global(.profile-pvp-mode-list) {
  display: inline-grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  width: auto;
  min-width: 190px;
  height: auto;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--muted) / 0.28);
  padding: 3px;
}

:global(.profile-pvp-mode-trigger) {
  min-height: 30px;
  padding-inline: 10px;
  font-size: 12px;
}

.section-subtitle {
  margin-top: 3px;
  color: hsl(var(--muted-foreground));
  font-size: 13px;
  line-height: 1.25;
}

.rating-value-row,
.exp-value-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  min-width: 0;
}

.rating-value,
.exp-value-row strong {
  font-size: 34px;
  font-weight: 800;
  line-height: 1;
}

.rating-value-row > span,
.exp-value-row span {
  max-width: 48%;
  color: hsl(var(--muted-foreground));
  font-size: 12px;
  font-weight: 600;
  line-height: 1.25;
  text-align: right;
}

.pvp-rating-row {
  align-items: center;
}

.pvp-rating-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.pvp-rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  min-height: 22px;
  border-radius: 5px;
  padding-inline: 8px;
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
}

.pvp-rating-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  max-width: 48%;
  color: hsl(var(--muted-foreground));
  font-size: 12px;
  font-weight: 600;
  line-height: 1.25;
  text-align: right;
}

.chart-wrapper {
  position: relative;
  height: 300px;
  width: 100%;
}

.chart-wrapper.compact {
  height: 220px;
}

.exp-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.exp-detail-grid div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
  border-radius: 8px;
  background: hsl(var(--muted) / 0.45);
  padding: 14px;
}

.exp-detail-grid span {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
  font-weight: 600;
}

.exp-detail-grid strong {
  font-size: 20px;
  line-height: 1.1;
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.summary-stat {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
  border-radius: 8px;
  background: hsl(var(--muted) / 0.45);
  padding: 14px;
}

.summary-stat span {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
  font-weight: 600;
}

.summary-stat strong {
  font-size: 24px;
  line-height: 1.1;
}

.summary-stat small {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}

.summary-badge {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  border-radius: 999px;
  color: white;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  padding: 4px 7px;
  text-transform: uppercase;
}

.progress-bar {
  height: 6px;
  width: 100%;
  overflow: hidden;
  border-radius: 999px;
  background: hsl(var(--background));
}

.progress-bar.large {
  height: 10px;
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: hsl(var(--primary));
  transition: width 0.25s ease;
}

.heatmap-frame {
  overflow-x: auto;
  padding-bottom: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.recent-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 10px;
}

.recent-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border-radius: 8px;
  background: hsl(var(--muted) / 0.45);
  padding: 12px;
  color: inherit;
  text-decoration: none;
  transition: background-color 0.2s ease;

  &:hover {
    background: hsl(var(--muted));
  }
}

.recent-main {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.recent-main strong,
.recent-main span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-main span,
.recent-meta small {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}

.recent-meta {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  font-weight: 700;
}

.empty-panel {
  display: flex;
  min-height: 180px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-radius: 8px;
  background: hsl(var(--muted) / 0.45);
  color: hsl(var(--muted-foreground));
  font-size: 14px;
  text-align: center;
}

.empty-panel.graph-empty {
  min-height: 220px;
}

.pvp-verification-panel {
  align-items: center;
  padding: 18px;
}

.pvp-verification-panel :global(svg) {
  color: hsl(38, 92%, 50%);
}

.pvp-verification-panel div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
  text-align: left;
}

.pvp-verification-panel strong {
  color: hsl(var(--foreground));
  font-size: 14px;
  line-height: 1.25;
}

.pvp-verification-panel span {
  color: hsl(var(--muted-foreground));
  line-height: 1.35;
}

@media screen and (max-width: 1180px) {
  .top-card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  :global(.exp-card) {
    grid-column: 1 / -1;
  }
}

@media screen and (max-width: 1024px) {
  .summary-stats {
    grid-template-columns: 1fr;
  }
}

@media screen and (max-width: 720px) {
  .top-card-grid,
  .exp-detail-grid {
    grid-template-columns: 1fr;
  }

  :global(.exp-card) {
    grid-column: auto;
  }

  .rating-value-row,
  .exp-value-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .rating-value-row > span,
  .exp-value-row span {
    max-width: 100%;
    text-align: left;
  }

  .pvp-rating-meta {
    align-items: flex-start;
    max-width: 100%;
    text-align: left;
  }

  .recent-item {
    align-items: flex-start;
    flex-direction: column;
  }

  .recent-meta {
    align-items: flex-start;
  }
}
</style>
