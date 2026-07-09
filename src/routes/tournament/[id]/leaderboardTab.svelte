<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { cubicInOut } from 'svelte/easing';
	import { _ } from 'svelte-i18n';
	import { Download, FastForward, Pause, Play, RefreshCw, Rewind, Snowflake } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import * as Table from '$lib/components/ui/table';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import { user } from '$lib/client';
	import {
		getTournamentContestLevels,
		tournamentFetch
	} from '$lib/client/tournament';
	import { cn } from '$lib/utils.js';
	import { resolvePvpRankBadge } from '$lib/utils/pvpRank';
	import ContestStatsDialog from './contestStatsDialog.svelte';

	export let tournament: any;
	export let canManage = false;
	export let personalOnly = false;

	let board: any = null;
	let levels: any[] = [];
	let loading = true;
	let refreshing = false;
	let viewLive = false;
	let showPercentage = false;
	let leaderboardViewMode: 'normal' | 'reveal' = 'normal';
	let liveRevealBoard: any = null;
	let replayMode = false;
	let replayPlaying = false;
	let replayLoading = false;
	let replaySpeed = 1;
	let replayRangeStartMs = 0;
	let replayRangeEndMs = 0;
	let replayAtMs = 0;
	let replayPlaybackTimer: ReturnType<typeof setInterval> | null = null;
	let replayEvents: any[] = [];
	let replayParticipants: any[] = [];
	let replayMeta: any = null;
	let revealedCells = new Set<string>();
	type ReplayCellChange = 'better' | 'worse' | 'unchanged';

	let replayCellFlashTokens = new Map<string, { sequence: number; change: ReplayCellChange; }>();
	let replayCellFlashTimer: ReturnType<typeof setTimeout> | null = null;
	let replayCellFlashSequence = 0;
	let statsDialogOpen = false;
	let statsDialogMode: 'player' | 'level' = 'player';
	let statsDialogEntry: any = null;
	let statsDialogLevel: any = null;
	const replaySpeeds = [1, 2, 5, 10, 25, 50, 100, 250, 500, 750, 1000];
	const replaySeekSeconds = 10;
	const leaderboardFlyDurationMs = 1600;
	const replayLeaderboardFlyDurationMs = 1000;
	const replayCellFlashDurationMs = 700;
	const contestScorePrecision = 100_000_000;

	$: totalAvailablePoints = levels.reduce(
		(total, level) => total + Number(level.maxPoints || 0),
		0
	);
	$: viewerUid = $user?.loggedIn ? $user.data?.uid : null;
	$: freezeAtMs = parseTime(tournament?.contestConfig?.freezeAt ?? board?.frozenAt);
	$: canReplay = Boolean(
		!personalOnly
		&& board
		&& (
			(canManage && tournament?.status === 'ongoing')
			|| tournament?.status === 'finished'
			|| board.frozen
			|| (freezeAtMs > 0 && Date.now() >= freezeAtMs && !board.revealed)
		)
	);
	$: canViewLiveFrozenBoard = Boolean(
		!personalOnly
		&& canManage
		&& (
			board?.frozen
			|| (freezeAtMs > 0 && Date.now() >= freezeAtMs)
		)
	);
	$: frozenNoticeKey = tournament?.contestConfig?.autoUnfreezeLeaderboard === false
		? 'tournament.leaderboard.frozen_manual_notice'
		: 'tournament.leaderboard.frozen_notice';
	$: canUseRevealMode = Boolean(!personalOnly && canManage && canReplay && !replayMode && !viewLive);
	$: replayDurationMs = Math.max(0, replayRangeEndMs - replayRangeStartMs);
	$: replayProgressPercent = replayDurationMs > 0
		? Math.round(((replayAtMs - replayRangeStartMs) / replayDurationMs) * 1000) / 10
		: 0;
	$: if (replayMode && !canReplay) {
		exitReplay();
	}

	function indexToRoman(value: number) {
		const numerals: Array<[number, string]> = [
			[1000, 'M'],
			[900, 'CM'],
			[500, 'D'],
			[400, 'CD'],
			[100, 'C'],
			[90, 'XC'],
			[50, 'L'],
			[40, 'XL'],
			[10, 'X'],
			[9, 'IX'],
			[5, 'V'],
			[4, 'IV'],
			[1, 'I']
		];
		let remaining = value;
		let result = '';

		for (const [amount, numeral] of numerals) {
			while (remaining >= amount) {
				result += numeral;
				remaining -= amount;
			}
		}

		return result;
	}

	function rankClass(rank: number) {
		switch (rank) {
			case 1:
				return 'text-amber-400';
			case 2:
				return 'text-zinc-300';
			case 3:
				return 'text-orange-400';
			default:
				return '';
		}
	}

	function displayTotal(entry: any) {
		if (!showPercentage) {
			return formatScore(entry.totalScore);
		}

		if (totalAvailablePoints <= 0) {
			return '0%';
		}

		const percentage = Math.round(
			(Number(entry.totalScore || 0) / totalAvailablePoints) * 10000
		) / 100;

		return `${percentage}%`;
	}

	function roundContestScore(value: number) {
		return Math.round(value * contestScorePrecision) / contestScorePrecision;
	}

	function formatScore(value: unknown) {
		return Math.round(Number(value || 0) * 100) / 100;
	}

	function playerDisplayName(entry: any) {
		return entry?.player?.name || entry?.uid || '';
	}

	function levelDisplayName(level: any) {
		return level?.name || `Level ${level?.levelId ?? ''}`;
	}

	function getPenaltyMs(entry: any) {
		if (Number.isFinite(Number(entry.penaltyMs))) {
			return Number(entry.penaltyMs);
		}

		const startedAt = new Date(tournament.startedAt)
			.getTime();

		if (!Number.isFinite(startedAt)) {
			return 0;
		}

		return Object.values(entry.levels ?? {})
			.reduce((total: number, result: any) => {
				const reachedAt = new Date(result?.reachedAt)
					.getTime();

				return Number.isFinite(reachedAt)
					? total + Math.max(0, reachedAt - startedAt)
					: total;
			}, 0);
	}

	function getPenaltyMinutes(entry: any) {
		return Math.round(getPenaltyMs(entry) / 60000);
	}

	function getPenaltyTooltip(entry: any) {
		const totalMs = getPenaltyMs(entry);
		const hours = Math.floor(totalMs / 3600000);
		const minutes = Math.floor((totalMs % 3600000) / 60000);
		const seconds = Math.floor((totalMs % 60000) / 1000);

		return $_('tournament.leaderboard.penalty_detail', {
			values: { hours, minutes, seconds }
		});
	}

	function escapeCsv(value: unknown) {
		const text = String(value ?? '');

		return text.includes('"') || text.includes(',') || text.includes('\n')
			? `"${text.replace(/"/g, '""')}"`
			: text;
	}

	function exportToCsv() {
		if (!board?.entries?.length) {
			return;
		}

		const headers = [
			'Rank',
			'Player',
			'UserID',
			'Total',
			'Penalty',
			'Completed',
			...levels.map((level) => level.name || `Level ${level.levelId}`)
		];
		const rows = board.entries.map((entry: any) => [
			entry.rank,
			entry.player?.name || entry.uid,
			entry.uid,
			entry.totalScore,
			getPenaltyMinutes(entry),
			entry.completedCount,
			...levels.map((level) => entry.levels[String(level.levelId)]?.score ?? 0)
		]);
		const csv = [headers, ...rows]
			.map((row) =>
				row.map(escapeCsv)
					.join(',')
			)
			.join('\n');
		const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
		const link = document.createElement('a');
		link.href = url;
		const replaySuffix = replayMode && replayAtMs
			? `_replay_${new Date(replayAtMs)
				.toISOString()
				.replace(/[:.]/g, '-')}`
			: '';

		link.download = `tournament_${tournament.id}_leaderboard${replaySuffix}.csv`;
		document.body.appendChild(link);
		link.click();
		link.remove();
		URL.revokeObjectURL(url);
	}

	async function load(showToast = false) {
		if (replayMode) {
			await loadReplayData(showToast);

			return;
		}

		if (leaderboardViewMode === 'reveal') {
			await loadRevealMode(showToast);

			return;
		}

		refreshing = true;
		const request = async () => {
			const leaderboardParams = new URLSearchParams();

			if (viewLive || personalOnly) {
				leaderboardParams.set('live', 'true');
			}

			if (personalOnly) {
				leaderboardParams.set('mine', 'true');
			}

			const leaderboardQuery = leaderboardParams.toString();

			const [nextBoard, nextLevels] = await Promise.all([
				tournamentFetch(`/${tournament.id}/leaderboard${leaderboardQuery ? `?${leaderboardQuery}` : ''}`),
				getTournamentContestLevels(tournament)
			]);
			board = personalOnly && viewerUid
				? {
					...nextBoard,
					frozen: false,
					entries: (nextBoard?.entries ?? [])
						.filter((entry: any) => entry.uid === viewerUid)
				}
				: nextBoard;
			levels = nextLevels;
			liveRevealBoard = null;
		};

		try {
			if (showToast) {
				await toast.promise(request(), {
					success: $_('contest.leaderboard.refresh.success'),
					error: $_('contest.leaderboard.refresh.error'),
					loading: $_('contest.leaderboard.refresh.loading')
				});
			} else {
				await request();
			}
		} catch (error: any) {
			if (!showToast) {
				toast.error(error.message);
			}
		} finally {
			loading = false;
			refreshing = false;
		}
	}

	function cloneValue(value: any) {
		return JSON.parse(JSON.stringify(value));
	}

	async function loadRevealMode(showToast = false) {
		refreshing = true;
		const request = async () => {
			const [normalBoard, liveBoard, nextLevels] = await Promise.all([
				tournamentFetch(`/${tournament.id}/leaderboard`),
				tournamentFetch(`/${tournament.id}/leaderboard?live=true`),
				getTournamentContestLevels(tournament)
			]);

			board = cloneValue(normalBoard);
			liveRevealBoard = liveBoard;
			levels = nextLevels;
			revealedCells = new Set();
		};

		try {
			if (showToast) {
				await toast.promise(request(), {
					success: $_('contest.leaderboard.refresh.success'),
					error: $_('contest.leaderboard.refresh.error'),
					loading: $_('contest.leaderboard.refresh.loading')
				});
			} else {
				await request();
			}
		} catch (error: any) {
			leaderboardViewMode = 'normal';
			liveRevealBoard = null;
			toast.error(error.message);
		} finally {
			refreshing = false;
		}
	}

	function parseTime(value: unknown) {
		const time = value
			? new Date(String(value))
				.getTime()
			: NaN;

		return Number.isFinite(time) ? time : 0;
	}

	function formatReplayTime(valueMs: number) {
		if (!Number.isFinite(valueMs) || valueMs <= 0) {
			return '-';
		}

		return new Date(valueMs)
			.toLocaleString();
	}

	function replayPath() {
		const params = new URLSearchParams();

		if (viewLive) {
			params.set('live', 'true');
		}

		const query = params.toString();

		return `/${tournament.id}/leaderboard/replay${query ? `?${query}` : ''}`;
	}

	function clampReplayAt(valueMs: number) {
		return Math.min(Math.max(valueMs, replayRangeStartMs), replayRangeEndMs);
	}

	function replayEventTime(event: any) {
		return parseTime(event?.created_at);
	}

	function compareEntries(a: any, b: any) {
		if (b.totalScore !== a.totalScore) {
			return b.totalScore - a.totalScore;
		}

		return a.penaltyMs - b.penaltyMs;
	}

	function sortAndRankEntries(entries: any[]) {
		const sorted = [...entries].sort(compareEntries);
		let rank = 0;
		let previous: any = null;

		for (let index = 0; index < sorted.length; index += 1) {
			const entry = sorted[index];

			if (!previous || !entriesTied(previous, entry)) {
				rank = index + 1;
			}

			entry.rank = rank;
			previous = entry;
		}

		return sorted;
	}

	function entriesTied(a: any, b: any) {
		return a.totalScore === b.totalScore && a.penaltyMs === b.penaltyMs;
	}

	function replayCellKey(entry: any, column: string) {
		return `${entry.uid}:${column}`;
	}

	function replayLevelCellKey(entry: any, level: any) {
		return replayCellKey(entry, `level:${level?.levelId ?? ''}`);
	}

	function replayLevelCellValue(entry: any, level: any) {
		const result = entry?.levels?.[String(level?.levelId)] ?? null;

		if (!result) {
			return '0';
		}

		return `${Number(result.score ?? 0)}:${Number(result.progress ?? 0)}`;
	}

	function replayVisibleCellValue(entry: any, column: string) {
		switch (column) {
			case 'rank':
				return String(entry?.rank ?? '');
			case 'total':
				return String(entry?.totalScore ?? 0);
			case 'penalty':
				return String(getPenaltyMinutes(entry));
			case 'completed':
				return String(entry?.completedCount ?? 0);
			default:
				return '';
		}
	}

	function replayCellChange(previous: number, next: number, lowerIsBetter = false): ReplayCellChange {
		if (previous === next) {
			return 'unchanged';
		}

		const improved = lowerIsBetter ? next < previous : next > previous;

		return improved ? 'better' : 'worse';
	}

	function replayVisibleCellChange(previous: any, next: any, column: string): ReplayCellChange {
		const lowerIsBetter = column === 'rank' || column === 'penalty';

		return replayCellChange(
			Number(replayVisibleCellValue(previous, column)),
			Number(replayVisibleCellValue(next, column)),
			lowerIsBetter
		);
	}

	function replayLevelCellChange(previous: any, next: any, level: any): ReplayCellChange {
		const previousResult = previous?.levels?.[String(level?.levelId)] ?? {};
		const nextResult = next?.levels?.[String(level?.levelId)] ?? {};
		const scoreChange = replayCellChange(
			Number(previousResult.score ?? 0),
			Number(nextResult.score ?? 0)
		);

		return scoreChange === 'unchanged'
			? replayCellChange(Number(previousResult.progress ?? 0), Number(nextResult.progress ?? 0))
			: scoreChange;
	}

	function markReplayCellChanges(
		previousEntries: any[],
		nextEntries: any[],
		previousAtMs: number,
		nextAtMs: number
	) {
		if (!replayMode || !previousEntries?.length) {
			return;
		}

		const previousByUid = new Map(previousEntries.map((entry) => [entry.uid, entry]));
		const changed = new Map<string, { sequence: number; change: ReplayCellChange; }>();
		const staticColumns = ['rank', 'total', 'penalty', 'completed'];

		for (const entry of nextEntries) {
			const previous = previousByUid.get(entry.uid);

			if (!previous) {
				continue;
			}

			for (const column of staticColumns) {
				if (replayVisibleCellValue(previous, column) !== replayVisibleCellValue(entry, column)) {
					changed.set(replayCellKey(entry, column), {
						sequence: replayCellFlashSequence + 1,
						change: replayVisibleCellChange(previous, entry, column)
					});
				}
			}

			for (const level of levels) {
				if (replayLevelCellValue(previous, level) !== replayLevelCellValue(entry, level)) {
					changed.set(replayLevelCellKey(entry, level), {
						sequence: replayCellFlashSequence + 1,
						change: replayLevelCellChange(previous, entry, level)
					});
				}
			}
		}

		if (nextAtMs > previousAtMs) {
			const nextByUid = new Map(nextEntries.map((entry) => [entry.uid, entry]));

			for (const event of replayEvents) {
				const eventMs = replayEventTime(event);

				if (eventMs <= previousAtMs || eventMs > nextAtMs) {
					continue;
				}

				const entry = nextByUid.get(event.uid);
				const level = levels.find((item) => Number(item.levelId) === Number(event.levelId));
				const key = entry && level ? replayLevelCellKey(entry, level) : null;

				if (key && !changed.has(key)) {
					changed.set(key, {
						sequence: replayCellFlashSequence + 1,
						change: 'unchanged'
					});
				}
			}
		}

		if (!changed.size) {
			return;
		}

		replayCellFlashSequence += 1;
		replayCellFlashTokens = changed;

		if (replayCellFlashTimer) {
			clearTimeout(replayCellFlashTimer);
		}

		replayCellFlashTimer = setTimeout(() => {
			replayCellFlashTokens = new Map();
			replayCellFlashTimer = null;
		}, replayCellFlashDurationMs);
	}

	function replayCellFlash(key: string) {
		return replayCellFlashTokens.get(key) ?? null;
	}

	function buildReplayEntries(atMs: number) {
		const levelById = new Map(levels.map((level: any) => [Number(level.levelId), level]));
		const startedAtMs = parseTime(tournament.startedAt ?? tournament.startsAt);
		const lateRegPenaltyFraction = Number(replayMeta?.lateRegPenaltyFraction ?? 0);
		const disqualificationByKey = new Map(
			(replayMeta?.disqualifications ?? []).map((row: any) => [
				`${row.uid}:${Number(row.levelId)}`,
				row
			])
		);
		const byUid = new Map<string, any>();
		const best = new Map<string, any>();

		for (const participant of replayParticipants) {
			byUid.set(participant.uid, {
				uid: participant.uid,
				isLate: Boolean(participant.isLate),
				player: participant.player ?? null,
				totalScore: 0,
				penaltyMs: 0,
				completedCount: 0,
				lastImprovedAt: null,
				disqualifications: {},
				levels: {}
			});
		}

		for (const disqualification of replayMeta?.disqualifications ?? []) {
			const entry = byUid.get(disqualification.uid);
			const level = levelById.get(Number(disqualification.levelId));

			if (entry && level) {
				entry.disqualifications[String(disqualification.levelId)] = disqualification;
			}
		}

		for (const event of replayEvents) {
			const eventMs = replayEventTime(event);

			if (!eventMs || eventMs > atMs) {
				if (eventMs > atMs) {
					break;
				}

				continue;
			}

			const levelId = Number(event.levelId);
			const progress = Math.max(0, Math.min(100, Number(event.progress) || 0));

			if (disqualificationByKey.has(`${event.uid}:${levelId}`)) {
				continue;
			}

			const key = `${event.uid}:${levelId}`;
			const current = best.get(key);

			if (!current || progress > current.progress) {
				best.set(key, {
					uid: event.uid,
					levelId,
					progress,
					reachedAt: event.created_at,
					source: event.source ?? null
				});
			}
		}

		for (const row of best.values()) {
			const entry = byUid.get(row.uid);
			const level = levelById.get(Number(row.levelId));

			if (!entry || !level) {
				continue;
			}

			const lateFactor = entry.isLate && lateRegPenaltyFraction
				? 1 - lateRegPenaltyFraction
				: 1;
			const score = roundContestScore(
				(row.progress / 100) * Number(level.maxPoints) * lateFactor
			);

			entry.levels[String(row.levelId)] = {
				progress: row.progress,
				score,
				reachedAt: row.reachedAt,
				source: row.source ?? null
			};
			entry.totalScore = roundContestScore(entry.totalScore + score);

			if (row.reachedAt && startedAtMs > 0) {
				const reachedAtMs = parseTime(row.reachedAt);

				if (reachedAtMs > 0) {
					entry.penaltyMs += Math.max(0, reachedAtMs - startedAtMs);
				}
			}

			if (row.progress >= 100) {
				entry.completedCount += 1;
			}

			if (
				row.reachedAt
				&& (!entry.lastImprovedAt || parseTime(row.reachedAt) > parseTime(entry.lastImprovedAt))
			) {
				entry.lastImprovedAt = row.reachedAt;
			}
		}

		return sortAndRankEntries([...byUid.values()]);
	}

	function applyReplayAt(nextAtMs: number, flashChanges = true) {
		const previousAtMs = replayAtMs;
		replayAtMs = clampReplayAt(nextAtMs);
		const previousEntries = board?.replay ? board.entries ?? [] : [];
		const entries = buildReplayEntries(replayAtMs);

		if (flashChanges) {
			markReplayCellChanges(previousEntries, entries, previousAtMs, replayAtMs);
		} else {
			replayCellFlashTokens = new Map();
		}

		board = {
			...replayMeta,
			replay: true,
			replayAt: new Date(replayAtMs)
				.toISOString(),
			entries
		};
	}

	function applyReplayData(data: any, requestedAtMs = replayAtMs || 0) {
		replayMeta = {
			replay: true,
			rangeStart: data?.rangeStart,
			rangeEnd: data?.rangeEnd,
			frozen: Boolean(data?.frozen),
			frozenAt: data?.frozenAt ?? null,
			revealed: Boolean(data?.revealed),
			endsAt: data?.endsAt ?? null,
			lateRegPenaltyFraction: data?.lateRegPenaltyFraction ?? null,
			disqualifications: Array.isArray(data?.disqualifications) ? data.disqualifications : []
		};
		replayParticipants = Array.isArray(data?.participants) ? data.participants : [];
		replayEvents = (Array.isArray(data?.events) ? data.events : [])
			.sort((a: any, b: any) => replayEventTime(a) - replayEventTime(b));
		replayRangeStartMs = parseTime(data?.rangeStart);
		replayRangeEndMs = parseTime(data?.rangeEnd);
		applyReplayAt(requestedAtMs || replayRangeEndMs, false);
	}

	async function loadReplayData(showToast = false) {
		replayLoading = true;
		refreshing = true;
		const request = async () => {
			applyReplayData(await tournamentFetch(replayPath()));
		};

		try {
			if (showToast) {
				await toast.promise(request(), {
					success: $_('contest.leaderboard.refresh.success'),
					error: $_('contest.leaderboard.refresh.error'),
					loading: $_('contest.leaderboard.refresh.loading')
				});
			} else {
				await request();
			}
		} catch (error: any) {
			stopReplayPlayback();
			toast.error(error.message);
		} finally {
			replayLoading = false;
			refreshing = false;
		}
	}

	async function enterReplay() {
		if (!canReplay) {
			return;
		}

		replayMode = true;
		stopReplayPlayback();
		await loadReplayData();
	}

	function exitReplay() {
		replayMode = false;
		stopReplayPlayback();
		replayCellFlashTokens = new Map();
		replayEvents = [];
		replayParticipants = [];
		replayMeta = null;
		void load();
	}

	async function setLeaderboardMode(mode: 'normal' | 'reveal') {
		if (leaderboardViewMode === mode && !refreshing) {
			return;
		}

		leaderboardViewMode = mode;

		if (mode === 'normal') {
			liveRevealBoard = null;
		}

		await load();
	}

	function liveEntryFor(uid: string) {
		return liveRevealBoard?.entries?.find((entry: any) => entry.uid === uid) ?? null;
	}

	function cellKey(entry: any, level: any) {
		return `${entry.uid}:${level?.levelId ?? ''}`;
	}

	function hasLiveUpdate(current: any, live: any) {
		if (!live) {
			return false;
		}

		if (!current) {
			return true;
		}

		return Number(live?.score ?? 0) > Number(current?.score ?? 0)
			|| Number(live?.progress ?? 0) > Number(current?.progress ?? 0);
	}

	function isZeroScore(result: any) {
		return !result || Number(result?.score ?? 0) <= 0;
	}

	function isManualResult(result: any) {
		return result?.source === 'manual';
	}

	function hasHiddenScore(entry: any, level: any) {
		if (isLevelDisqualified(entry, level)) {
			return false;
		}

		if (leaderboardViewMode !== 'reveal' || !liveRevealBoard || !level) {
			return false;
		}

		if (revealedCells.has(cellKey(entry, level))) {
			return false;
		}

		const levelId = String(level.levelId);
		const current = entry.levels?.[levelId] ?? null;
		const live = liveEntryFor(entry.uid)?.levels?.[levelId] ?? null;

		return isZeroScore(current) || hasLiveUpdate(current, live);
	}

	function recomputeEntry(entry: any) {
		const startedAtMs = parseTime(tournament.startedAt ?? tournament.startsAt);
		const nextEntry = {
			...entry,
			totalScore: 0,
			penaltyMs: 0,
			completedCount: 0,
			lastImprovedAt: null
		};

		for (const [levelId, result] of Object.entries(nextEntry.levels ?? {}) as Array<[string, any]>) {
			if (nextEntry.disqualifications?.[levelId]) {
				continue;
			}

			nextEntry.totalScore = roundContestScore(
				nextEntry.totalScore + Number(result?.score || 0)
			);

			if (Number(result?.progress || 0) >= 100) {
				nextEntry.completedCount += 1;
			}

			const reachedAtMs = parseTime(result?.reachedAt);

			if (reachedAtMs > 0 && startedAtMs > 0) {
				nextEntry.penaltyMs += Math.max(0, reachedAtMs - startedAtMs);
			}

			if (
				result?.reachedAt
				&& (!nextEntry.lastImprovedAt
					|| parseTime(result.reachedAt) > parseTime(nextEntry.lastImprovedAt))
			) {
				nextEntry.lastImprovedAt = result.reachedAt;
			}
		}

		return nextEntry;
	}

	function revealScore(entry: any, level: any) {
		const levelId = String(level?.levelId ?? '');
		const live = liveEntryFor(entry.uid)?.levels?.[levelId] ?? null;
		revealedCells = new Set([...revealedCells, cellKey(entry, level)]);

		const entries = (board?.entries ?? []).map((row: any) => {
			if (row.uid !== entry.uid) {
				return row;
			}

			if (!live) {
				return cloneValue(row);
			}

			return recomputeEntry({
				...cloneValue(row),
				levels: {
					...(cloneValue(row.levels ?? {})),
					[levelId]: cloneValue(live)
				}
			});
		});

		board = {
			...board,
			entries: sortAndRankEntries(entries)
		};
	}

	function openPlayerStats(entry: any) {
		statsDialogMode = 'player';
		statsDialogEntry = entry;
		statsDialogLevel = null;
		statsDialogOpen = true;
	}

	function openLevelStats(entry: any, level: any) {
		statsDialogMode = 'level';
		statsDialogEntry = entry;
		statsDialogLevel = level;
		statsDialogOpen = true;
	}

	function isLevelDisqualified(entry: any, level: any) {
		return Boolean(entry?.disqualifications?.[String(level?.levelId ?? '')]);
	}

	function handleLevelCellClick(entry: any, level: any, hiddenScore: boolean) {
		if (hiddenScore) {
			revealScore(entry, level);

			return;
		}

		openLevelStats(entry, level);
	}

	function handleReplaySliderInput(event: Event) {
		const target = event.currentTarget as HTMLInputElement;

		applyReplayAt(Number(target.value));
	}

	function stopReplayPlayback() {
		replayPlaying = false;

		if (replayPlaybackTimer) {
			clearInterval(replayPlaybackTimer);
			replayPlaybackTimer = null;
		}
	}

	function tickReplayPlayback() {
		const nextAt = Math.min(replayRangeEndMs, replayAtMs + replaySpeed * 1000);

		applyReplayAt(nextAt);

		if (nextAt >= replayRangeEndMs) {
			stopReplayPlayback();
		}
	}

	function seekReplay(direction: -1 | 1) {
		if (!replayMode || replayLoading || replayRangeEndMs <= replayRangeStartMs) {
			return;
		}

		const nextAt = replayAtMs + direction * replaySeekSeconds * Number(replaySpeed) * 1000;

		applyReplayAt(nextAt);

		if (direction > 0 && nextAt >= replayRangeEndMs) {
			stopReplayPlayback();
		}
	}

	function toggleReplayPlayback() {
		if (!replayMode || replayLoading || replayRangeEndMs <= replayRangeStartMs) {
			return;
		}

		if (replayPlaying) {
			stopReplayPlayback();

			return;
		}

		if (replayAtMs >= replayRangeEndMs) {
			applyReplayAt(replayRangeStartMs, false);
		}

		replayPlaying = true;
		replayPlaybackTimer = setInterval(tickReplayPlayback, 1000);
	}

	function handleLiveToggle(checked: boolean) {
		viewLive = checked;

		if (viewLive && leaderboardViewMode === 'reveal') {
			leaderboardViewMode = 'normal';
			liveRevealBoard = null;
		}

		if (replayMode) {
			stopReplayPlayback();
			void loadReplayData();

			return;
		}

		void load();
	}

	onMount(() => {
		if (!personalOnly) {
			void load();

			return undefined;
		}

		let loadedFor = '';
		const unsubscribe = user.subscribe((currentUser) => {
			if (!currentUser.checked) {
				return;
			}

			if (!currentUser.loggedIn) {
				loadedFor = '';
				board = null;
				levels = [];
				loading = false;

				return;
			}

			const uid = String(currentUser.data?.uid ?? '');

			if (!uid || uid === loadedFor) {
				return;
			}

			loadedFor = uid;
			void load();
		});

		return unsubscribe;
	});
	onDestroy(() => {
		stopReplayPlayback();

		if (replayCellFlashTimer) {
			clearTimeout(replayCellFlashTimer);
		}
	});
</script>

{#if loading}
  <p class="text-center text-muted-foreground">{$_('tournament.loading')}</p>
{:else if board}
  <div class="mx-auto w-full max-w-[1500px] px-[10px]">
    {#if board.frozen && !personalOnly}
      <div class="mb-[10px] flex items-center gap-[8px] rounded-[8px] border border-amber-500/40 bg-amber-500/10 px-[12px] py-[8px] text-sm text-amber-300">
        <Snowflake size={16} class="shrink-0" />
        {$_(frozenNoticeKey)}
      </div>
    {/if}

    <div class="mb-[10px] flex flex-wrap justify-center gap-[10px]">
      <div class="flex items-center gap-[10px] rounded-md border border-input bg-background px-3">
        <Label for="tournament-percentage-switch" class="cursor-pointer text-sm">
          {showPercentage
            ? $_('contest.leaderboard.display_mode.contribution_percentage')
            : $_('contest.leaderboard.display_mode.total_points')}
        </Label>
        <Switch id="tournament-percentage-switch" bind:checked={showPercentage} />
      </div>
      {#if !personalOnly}
        <Button href="#tournament-me" variant="outline">
          {$_('contest.leaderboard.jump_to_me')}
        </Button>
      {/if}
      {#if !personalOnly && (canReplay || replayMode)}
        <Button
          variant={replayMode ? 'default' : 'outline'}
          on:click={replayMode ? exitReplay : enterReplay}
          disabled={refreshing && !replayMode}
        >
          {replayMode ? $_('tournament.leaderboard.exit_replay') : $_('tournament.leaderboard.replay')}
        </Button>
      {/if}
      {#if canUseRevealMode}
        <div class="flex items-center gap-[4px] rounded-md border border-input bg-background p-1">
          <Button
            size="sm"
            variant={leaderboardViewMode === 'normal' ? 'default' : 'ghost'}
            on:click={() => setLeaderboardMode('normal')}
            disabled={refreshing}
          >
            {$_('tournament.leaderboard.normal_mode')}
          </Button>
          <Button
            size="sm"
            variant={leaderboardViewMode === 'reveal' ? 'default' : 'ghost'}
            on:click={() => setLeaderboardMode('reveal')}
            disabled={refreshing || !board.entries?.length}
          >
            {$_('tournament.leaderboard.reveal_mode')}
          </Button>
        </div>
      {/if}
      {#if !personalOnly}
        <Button
          size="icon"
          variant="outline"
          on:click={exportToCsv}
          disabled={!board.entries?.length}
          aria-label={$_('tournament.leaderboard.export')}
        >
          <Download size={16} />
        </Button>
      {/if}
      <Button
        size="icon"
        variant="outline"
        on:click={() => load(true)}
        disabled={refreshing}
        aria-label={$_('tournament.leaderboard.refresh')}
      >
        <RefreshCw size={16} class={refreshing ? 'animate-spin' : ''} />
      </Button>
      {#if canViewLiveFrozenBoard}
        <div class="flex items-center gap-[8px] rounded-md border border-input bg-background px-3">
          <Switch
            bind:checked={viewLive}
            onCheckedChange={handleLiveToggle}
            id="view-live"
          />
          <Label for="view-live">{$_('tournament.leaderboard.bypass_freeze')}</Label>
        </div>
      {/if}
    </div>

    {#if replayMode}
      <div class="sticky top-[55px] z-20 mb-[12px] rounded-[10px] border border-[hsl(var(--border))] bg-background/95 p-[12px] shadow-sm backdrop-blur">
        <div class="flex flex-col gap-[10px]">
          <div class="flex flex-wrap items-center justify-between gap-[10px]">
            <div class="flex items-center gap-[8px]">
              <Button
                size="icon"
                variant="outline"
                on:click={() => seekReplay(-1)}
                disabled={replayLoading || replayRangeEndMs <= replayRangeStartMs}
                aria-label={$_('tournament.leaderboard.seek_previous_replay')}
              >
                <Rewind size={16} />
              </Button>
              <Button
                size="icon"
                variant="outline"
                on:click={toggleReplayPlayback}
                disabled={replayLoading || replayRangeEndMs <= replayRangeStartMs}
                aria-label={replayPlaying
                  ? $_('tournament.leaderboard.pause_replay')
                  : $_('tournament.leaderboard.play_replay')}
              >
                {#if replayPlaying}
                  <Pause size={16} />
                {:else}
                  <Play size={16} />
                {/if}
              </Button>
              <Button
                size="icon"
                variant="outline"
                on:click={() => seekReplay(1)}
                disabled={replayLoading || replayRangeEndMs <= replayRangeStartMs}
                aria-label={$_('tournament.leaderboard.seek_next_replay')}
              >
                <FastForward size={16} />
              </Button>
              <div class="text-sm">
                <div class="font-semibold">{$_('tournament.leaderboard.replay_at')}</div>
                <div class="text-muted-foreground">{formatReplayTime(replayAtMs)}</div>
              </div>
            </div>
            <div class="flex items-center gap-[8px]">
              <Label for="replay-speed" class="text-sm">{$_('tournament.leaderboard.replay_speed')}</Label>
              <select
                id="replay-speed"
                class="h-9 rounded-md border border-input bg-background px-2 text-sm"
                bind:value={replaySpeed}
              >
                {#each replaySpeeds as speed}
                  <option value={speed}>{speed}x</option>
                {/each}
              </select>
            </div>
          </div>
          <div class="flex flex-col gap-[6px]">
            <input
              type="range"
              min={replayRangeStartMs}
              max={replayRangeEndMs}
              step="1000"
              value={replayAtMs}
              on:input={handleReplaySliderInput}
              disabled={replayRangeEndMs <= replayRangeStartMs}
              aria-label={$_('tournament.leaderboard.replay_slider')}
              class="w-full accent-primary"
            />
            <div class="flex flex-wrap items-center justify-between gap-[8px] text-xs text-muted-foreground">
              <span>{formatReplayTime(replayRangeStartMs)}</span>
              <span>
                {$_('tournament.leaderboard.replay_progress', {
                  values: { progress: replayProgressPercent }
                })}
                {#if replayLoading}
                  · {$_('tournament.leaderboard.replay_loading')}
                {/if}
              </span>
              <span>{formatReplayTime(replayRangeEndMs)}</span>
            </div>
          </div>
        </div>
      </div>
    {/if}

    {#if board.entries?.length}
      <div class="overflow-x-auto">
        <Table.Root class="min-w-[760px]">
          <Table.Header class="bg-background">
            <Table.Row>
              <Table.Head class="w-[100px]">{$_('tournament.leaderboard.rank')}</Table.Head>
              <Table.Head class="min-w-[200px]">{$_('tournament.leaderboard.player')}</Table.Head>
              <Table.Head class="w-[100px] text-center">{$_('contest.leaderboard.total')}</Table.Head>
              <Table.Head class="w-[100px] text-center">{$_('contest.leaderboard.penalty')}</Table.Head>
              <Table.Head class="w-[100px] text-center">{$_('tournament.leaderboard.completed')}</Table.Head>
              {#each levels as level, index}
                <Table.Head class="w-[90px] text-center">
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      {indexToRoman(index + 1)}
                    </Tooltip.Trigger>
                    <Tooltip.Content>{level.name || `Level ${level.levelId}`}</Tooltip.Content>
                  </Tooltip.Root>
                </Table.Head>
              {/each}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each board.entries as entry (entry.uid)}
              {@const rankFlash = replayCellFlash(replayCellKey(entry, 'rank'))}
              {@const totalFlash = replayCellFlash(replayCellKey(entry, 'total'))}
              {@const penaltyFlash = replayCellFlash(replayCellKey(entry, 'penalty'))}
              {@const completedFlash = replayCellFlash(replayCellKey(entry, 'completed'))}
              <tr
                animate:flip={{
                  duration: replayMode ? replayLeaderboardFlyDurationMs : leaderboardFlyDurationMs,
                  easing: cubicInOut
                }}
                class={cn(
                  'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
                  leaderboardViewMode === 'reveal' ? 'duration-700 ease-in-out' : '',
                  personalOnly ? 'bg-primary/5' : ''
                )}
              >
                <Table.Cell
                  class={cn(
                    'w-[100px] text-base font-bold tabular-nums',
                    rankClass(entry.rank),
                    $user.loggedIn && entry.uid === $user.data.uid ? 'text-yellow-500' : ''
                  )}
                >
                  {#key rankFlash?.sequence ?? 0}
                    <span
                      class:replay-cell-flash-better={rankFlash?.change === 'better'}
                      class:replay-cell-flash-worse={rankFlash?.change === 'worse'}
                      class:replay-cell-flash-unchanged={rankFlash?.change === 'unchanged'}
                    >#{entry.rank}</span>
                  {/key}
                </Table.Cell>
                <Table.Cell class="min-w-[200px]">
                  {#if entry.player}
                    <div id={$user.loggedIn && entry.uid === $user.data.uid ? 'tournament-me' : undefined}>
						<PlayerLink
							player={entry.player}
							showAvatar
							avatarSize={22}
							rankBadge={resolvePvpRankBadge(entry.player)}
						/>
                    </div>
                  {:else}
                    {entry.uid}
                  {/if}
                </Table.Cell>
                <Table.Cell class="w-[100px] text-center font-bold tabular-nums">
                  {#key totalFlash?.sequence ?? 0}
                    <button
                      type="button"
                      class="w-full rounded-sm px-2 py-1 tabular-nums transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      class:replay-cell-flash-better={totalFlash?.change === 'better'}
                      class:replay-cell-flash-worse={totalFlash?.change === 'worse'}
                      class:replay-cell-flash-unchanged={totalFlash?.change === 'unchanged'}
                      on:click={() => openPlayerStats(entry)}
                      aria-label={$_('tournament.stats.open_player', {
                        values: { player: playerDisplayName(entry) }
                      })}
                    >
                      {displayTotal(entry)}
                    </button>
                  {/key}
                </Table.Cell>
                <Table.Cell class="w-[100px] text-center tabular-nums">
                  {#key penaltyFlash?.sequence ?? 0}
                    <span
                      class:replay-cell-flash-better={penaltyFlash?.change === 'better'}
                      class:replay-cell-flash-worse={penaltyFlash?.change === 'worse'}
                      class:replay-cell-flash-unchanged={penaltyFlash?.change === 'unchanged'}
                    >
                      <Tooltip.Root>
                        <Tooltip.Trigger>
                          {getPenaltyMinutes(entry)}
                        </Tooltip.Trigger>
                        <Tooltip.Content>{getPenaltyTooltip(entry)}</Tooltip.Content>
                      </Tooltip.Root>
                    </span>
                  {/key}
                </Table.Cell>
                <Table.Cell class="w-[100px] text-center tabular-nums text-muted-foreground">
                  {#key completedFlash?.sequence ?? 0}
                    <span
                      class:replay-cell-flash-better={completedFlash?.change === 'better'}
                      class:replay-cell-flash-worse={completedFlash?.change === 'worse'}
                      class:replay-cell-flash-unchanged={completedFlash?.change === 'unchanged'}
                    >{entry.completedCount}</span>
                  {/key}
                </Table.Cell>
                {#each levels as level}
                  {@const result = entry.levels[String(level.levelId)]}
                  {@const disqualified = isLevelDisqualified(entry, level)}
                  {@const hiddenScore = hasHiddenScore(entry, level)}
                  {@const levelFlash = replayCellFlash(replayLevelCellKey(entry, level))}
                  <Table.Cell
                    class="w-[90px] text-center tabular-nums"
                  >
                    {#key levelFlash?.sequence ?? 0}
                      <button
                        type="button"
                        class={cn(
                          'w-full rounded-sm px-2 py-1 tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          hiddenScore ? 'cursor-pointer' : 'hover:text-primary',
                          disqualified ? 'text-destructive line-through decoration-2 hover:text-destructive' : ''
                        )}
                        class:replay-cell-flash-better={levelFlash?.change === 'better'}
                        class:replay-cell-flash-worse={levelFlash?.change === 'worse'}
                        class:replay-cell-flash-unchanged={levelFlash?.change === 'unchanged'}
                        on:click={() => handleLevelCellClick(entry, level, hiddenScore)}
                        aria-label={hiddenScore
                          ? $_('tournament.leaderboard.hidden_score')
                          : $_('tournament.stats.open_level', {
                            values: {
                              player: playerDisplayName(entry),
                              level: levelDisplayName(level)
                            }
                          })}
                      >
                        {#if hiddenScore}
                          {#if disqualified}
                            <span class="font-semibold">0</span><br />
                            <span class="text-[11px] opacity-70">
                              {$_('tournament.moderation.disqualified_short')}
                            </span>
                          {:else if result && Number(result.score || 0) > 0}
                            <span>{formatScore(result.score)}<sup>?</sup></span><br />
                            <span class="text-[11px] opacity-50">
                              {Math.round(Number(result.progress) * 100) / 100}%
                            </span>
                          {:else}
                            <span class="font-semibold">0<sup>?</sup></span>
                          {/if}
                        {:else if result}
                          {formatScore(result.score)}{#if isManualResult(result)}<sup>*</sup>{/if}<br />
                          <span class="text-[11px] opacity-50">
                            {Math.round(Number(result.progress) * 100) / 100}%
                          </span>
                        {:else}
                          0
                        {/if}
                      </button>
                    {/key}
                  </Table.Cell>
                {/each}
              </tr>
            {/each}
          </Table.Body>
        </Table.Root>
      </div>
    {:else}
      <p class="py-8 text-center text-muted-foreground">
        {personalOnly
          ? $_('tournament.leaderboard.personal_empty')
          : $_('tournament.leaderboard.empty')}
      </p>
    {/if}
    <ContestStatsDialog
      bind:open={statsDialogOpen}
      mode={statsDialogMode}
      {tournament}
      {levels}
      entry={statsDialogEntry}
      level={statsDialogLevel}
      live={viewLive || personalOnly}
      {personalOnly}
      {canManage}
      onModerationChange={load}
    />
  </div>
{:else if personalOnly}
  <p class="py-8 text-center text-muted-foreground">
    {$_('tournament.leaderboard.personal_login_required')}
  </p>
{/if}

<style>
	.replay-cell-flash-better,
	.replay-cell-flash-worse,
	.replay-cell-flash-unchanged {
		animation: replay-cell-flash 700ms ease-out;
	}

	.replay-cell-flash-better {
		--replay-cell-flash-color: rgb(34 197 94);
	}

	.replay-cell-flash-worse {
		--replay-cell-flash-color: rgb(239 68 68);
	}

	.replay-cell-flash-unchanged {
		--replay-cell-flash-color: rgb(250 204 21);
	}

	@keyframes replay-cell-flash {
		0%,
		55% {
			color: var(--replay-cell-flash-color);
			text-shadow: 0 0 10px color-mix(in srgb, var(--replay-cell-flash-color) 45%, transparent);
		}

		100% {
			color: inherit;
			text-shadow: none;
		}
	}
</style>
