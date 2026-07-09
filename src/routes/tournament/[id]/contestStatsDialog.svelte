<script lang="ts" context="module">
	const replayCache = new Map<string, Promise<any>>();
	const deathCountCache = new Map<string, Promise<number[]>>();
</script>

<script lang="ts">
	import Chart from 'chart.js/auto';
	import { _ } from 'svelte-i18n';
	import { toast } from 'svelte-sonner';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Tabs from '$lib/components/ui/tabs';
	import Loading from '$lib/components/animation/loading.svelte';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { tournamentFetch } from '$lib/client/tournament';

	export let open = false;
	export let mode: 'player' | 'level' = 'player';
	export let tournament: any;
	export let levels: any[] = [];
	export let entry: any = null;
	export let level: any = null;
	export let live = false;
	export let personalOnly = false;
	export let canManage = false;
	export let onModerationChange: (() => void | Promise<void>) | null = null;

	type LevelPoint = {
		level: any;
		progress: number;
		score: number;
	};

	type HistoryPoint = {
		atMs: number;
		totalScore: number;
		levels: LevelPoint[];
	};

	type PlayerAreaChartData = {
		points: HistoryPoint[];
		showContribution: boolean;
	};

	let loading = false;
	let errorMessage = '';
	let activeLoadKey = '';
	let history: HistoryPoint[] = [];
	let deathCount: number[] = [];
	let showLevelContribution = false;
	let moderationSaving = false;
	let moderationReason = '';
	let localDisqualification: any = undefined;
	let moderationTargetKey = '';

	$: playerName = entry?.player?.name || entry?.uid || '';
	$: selectedLevelId = Number(level?.levelId);
	$: selectedLevelName = level?.name || (selectedLevelId ? `Level ${selectedLevelId}` : '');
	$: selectedDisqualification = localDisqualification === undefined
		? entry?.disqualifications?.[String(selectedLevelId)] ?? null
		: localDisqualification;
	$: hasHistory = history.length > 0;
	$: totalDeaths = deathCount.reduce((total, count) => total + Number(count || 0), 0);
	$: selectedLevelHistory = selectedLevelId
		? history.map((point) => ({
			...point,
			levelPoint: point.levels.find(
				(item) => Number(item.level.levelId) === selectedLevelId
			) ?? {
				level,
				progress: 0,
				score: 0
			}
		}))
		: [];
	$: dialogTitle = mode === 'level'
		? $_('tournament.stats.level_title', {
			values: {
				player: playerName,
				level: selectedLevelName
			}
		})
		: $_('tournament.stats.player_title', { values: { player: playerName } });
	$: loadKey = open && tournament?.id && entry?.uid
		? [
			mode,
			tournament.id,
			entry.uid,
			live ? 'live' : 'frozen',
			personalOnly ? 'mine' : 'all',
			mode === 'level' ? selectedLevelId : 'all'
		].join(':')
		: '';
	$: if (loadKey && loadKey !== activeLoadKey) {
		activeLoadKey = loadKey;
		void loadStats(loadKey);
	}
	$: if (!open) {
		activeLoadKey = '';
		localDisqualification = undefined;
		moderationReason = '';
		moderationTargetKey = '';
	}
	$: if (open && mode === 'level') {
		const nextModerationTargetKey = `${entry?.uid ?? ''}:${selectedLevelId || ''}`;

		if (nextModerationTargetKey !== moderationTargetKey) {
			moderationTargetKey = nextModerationTargetKey;
			localDisqualification = undefined;
			moderationReason = '';
		}
	}

	function parseTime(value: unknown) {
		const time = value
			? new Date(String(value))
				.getTime()
			: NaN;

		return Number.isFinite(time) ? time : 0;
	}

	function roundScore(value: number) {
		return Math.round(value * 100_000_000) / 100_000_000;
	}

	function formatNumber(value: number) {
		return Math.round(Number(value || 0) * 100) / 100;
	}

	function formatDate(valueMs: number) {
		return valueMs > 0
			? new Date(valueMs)
				.toLocaleString()
			: '-';
	}

	function levelLabel(value: any) {
		return value?.name || `Level ${value?.levelId ?? ''}`;
	}

	function replayCacheKey() {
		return `${tournament.id}:${live ? 'live' : 'normal'}:${personalOnly ? 'mine' : 'all'}`;
	}

	function replayPath() {
		const params = new URLSearchParams();

		if (live) {
			params.set('live', 'true');
		}

		if (personalOnly) {
			params.set('mine', 'true');
		}

		const query = params.toString();

		return `/${tournament.id}/leaderboard/replay${query ? `?${query}` : ''}`;
	}

	function getReplayData() {
		const key = replayCacheKey();

		if (!replayCache.has(key)) {
			const request = tournamentFetch(replayPath())
				.catch((error) => {
					replayCache.delete(key);
					throw error;
				});

			replayCache.set(key, request);
		}

		return replayCache.get(key)!;
	}

	function getDeathCount(uid: string, levelId: number) {
		const key = `${uid}:${levelId}`;

		if (!deathCountCache.has(key)) {
			const request = fetch(
				`${import.meta.env.VITE_API_URL}/deathCount/${encodeURIComponent(uid)}/${levelId}`
			)
				.then(async (response) => {
					if (!response.ok) {
						throw new Error('Failed to load death count');
					}

					const payload = await response.json();

					return Array.isArray(payload?.count)
						? Array.from({ length: 100 }, (_, index) => Number(payload.count[index] || 0))
						: [];
				})
				.catch((error) => {
					deathCountCache.delete(key);
					throw error;
				});

			deathCountCache.set(key, request);
		}

		return deathCountCache.get(key)!;
	}

	async function loadStats(key: string) {
		loading = true;
		errorMessage = '';
		history = [];
		deathCount = [];

		try {
			const replayData = await getReplayData();
			const nextHistory = buildHistory(replayData, entry.uid);
			let nextDeathCount: number[] = [];

			if (mode === 'level' && selectedLevelId) {
				nextDeathCount = await getDeathCount(entry.uid, selectedLevelId);
			}

			if (key !== activeLoadKey) {
				return;
			}

			history = nextHistory;
			deathCount = nextDeathCount;
		} catch (error: any) {
			if (key === activeLoadKey) {
				errorMessage = error?.message || $_('tournament.stats.load_failed');
			}
		} finally {
			if (key === activeLoadKey) {
				loading = false;
			}
		}
	}

	function buildHistory(replayData: any, uid: string) {
		const contestLevels = levels.filter((item) => Number.isFinite(Number(item.levelId)));
		const levelById = new Map(
			contestLevels.map((item) => [Number(item.levelId), item])
		);
		const participant = (replayData?.participants ?? [])
			.find((item: any) => item.uid === uid);
		const disqualifiedLevelIds = new Set(
			(replayData?.disqualifications ?? [])
				.filter((item: any) => item.uid === uid)
				.map((item: any) => Number(item.levelId))
		);
		const latePenalty = Number(replayData?.lateRegPenaltyFraction ?? 0);
		const lateFactor = participant?.isLate && latePenalty ? 1 - latePenalty : 1;
		const isRelevantEvent = (event: any) => {
			const eventLevelId = Number(event.levelId);

			return event?.uid === uid
				&& levelById.has(eventLevelId)
				&& !disqualifiedLevelIds.has(eventLevelId);
		};
		const events = (Array.isArray(replayData?.events) ? replayData.events : [])
			.filter(isRelevantEvent)
			.sort((a: any, b: any) => parseTime(a.created_at) - parseTime(b.created_at));
		const rangeStartMs = parseTime(replayData?.rangeStart)
			|| parseTime(tournament?.startedAt ?? tournament?.startsAt)
			|| parseTime(events[0]?.created_at);
		const rangeEndMs = parseTime(replayData?.rangeEnd)
			|| parseTime(tournament?.endedAt ?? tournament?.endsAt)
			|| parseTime(events[events.length - 1]?.created_at)
			|| rangeStartMs;
		const timestamps = [...new Set([
			rangeStartMs,
			...events.map((event: any) => parseTime(event.created_at)),
			rangeEndMs
		])]
			.filter((time) => time > 0)
			.sort((a, b) => a - b);
		const bestProgress = new Map<number, number>();
		const points: HistoryPoint[] = [];
		let eventIndex = 0;

		for (const timestamp of timestamps) {
			while (eventIndex < events.length && parseTime(events[eventIndex].created_at) <= timestamp) {
				const event = events[eventIndex];
				const levelId = Number(event.levelId);
				const progress = Math.max(0, Math.min(100, Number(event.progress) || 0));
				const current = bestProgress.get(levelId) ?? 0;

				if (progress > current) {
					bestProgress.set(levelId, progress);
				}

				eventIndex += 1;
			}

			let totalScore = 0;
			const levelPoints = contestLevels.map((item) => {
				const progress = bestProgress.get(Number(item.levelId)) ?? 0;
				const effectiveProgress = disqualifiedLevelIds.has(Number(item.levelId))
					? 0
					: progress;
				const score = roundScore(
					(effectiveProgress / 100) * Number(item.maxPoints || 0) * lateFactor
				);

				totalScore = roundScore(totalScore + score);

				return {
					level: item,
					progress: effectiveProgress,
					score
				};
			});

			points.push({
				atMs: timestamp,
				totalScore,
				levels: levelPoints
			});
		}

		return points;
	}

	function cssColor(variable: string, fallback: string) {
		if (typeof document === 'undefined') {
			return fallback;
		}

		const value = getComputedStyle(document.documentElement)
			.getPropertyValue(variable)
			.trim();

		return value ? `hsl(${value})` : fallback;
	}

	function cssAlphaColor(variable: string, alpha: number, fallback: string) {
		if (typeof document === 'undefined') {
			return fallback;
		}

		const value = getComputedStyle(document.documentElement)
			.getPropertyValue(variable)
			.trim();

		return value ? `hsl(${value} / ${alpha})` : fallback;
	}

	function palette(index: number, alpha = 1) {
		const colors = [
			`rgba(59, 130, 246, ${alpha})`,
			`rgba(16, 185, 129, ${alpha})`,
			`rgba(245, 158, 11, ${alpha})`,
			`rgba(236, 72, 153, ${alpha})`,
			`rgba(139, 92, 246, ${alpha})`,
			`rgba(20, 184, 166, ${alpha})`,
			`rgba(239, 68, 68, ${alpha})`,
			`rgba(132, 204, 22, ${alpha})`
		];

		return colors[index % colors.length];
	}

	function replaceChart(
		chart: Chart | null,
		node: HTMLCanvasElement,
		nextChart: (node: HTMLCanvasElement) => Chart
	) {
		chart?.destroy();

		return nextChart(node);
	}

	function createLevelAreaChart(node: HTMLCanvasElement, data: PlayerAreaChartData) {
		let chart: Chart | null = null;
		const render = (nextData: PlayerAreaChartData) => {
			chart = replaceChart(
				chart,
				node,
				(canvas) => buildLevelAreaChart(canvas, nextData.points, nextData.showContribution)
			);
		};

		render(data);

		return {
			update: render,
			destroy() {
				chart?.destroy();
			}
		};
	}

	function createSelectedLevelChart(
		node: HTMLCanvasElement,
		points: Array<HistoryPoint & { levelPoint: LevelPoint; }>
	) {
		let chart: Chart | null = null;
		const render = (nextPoints: Array<HistoryPoint & { levelPoint: LevelPoint; }>) => {
			chart = replaceChart(chart, node, (canvas) => buildSelectedLevelChart(canvas, nextPoints));
		};

		render(points);

		return {
			update: render,
			destroy() {
				chart?.destroy();
			}
		};
	}

	function createDeathCountChart(node: HTMLCanvasElement, data: number[]) {
		let chart: Chart | null = null;
		const render = (nextData: number[]) => {
			chart = replaceChart(chart, node, (canvas) => buildDeathCountChart(canvas, nextData));
		};

		render(data);

		return {
			update: render,
			destroy() {
				chart?.destroy();
			}
		};
	}

	function baseChartOptions() {
		return {
			responsive: true,
			maintainAspectRatio: false,
			animation: false as const,
			interaction: {
				mode: 'index' as const,
				intersect: false
			}
		};
	}

	function buildLevelAreaChart(
		node: HTMLCanvasElement,
		points: HistoryPoint[],
		showContribution: boolean
	) {
		return new Chart(node, {
			type: 'line',
			data: {
				labels: points.map((point) => formatDate(point.atMs)),
				datasets: showContribution
					? levels.map((item, index) => ({
						label: levelLabel(item),
						data: points.map((point) =>
							point.levels.find((levelPoint) =>
								Number(levelPoint.level.levelId) === Number(item.levelId)
							)?.score ?? 0
						),
						borderColor: palette(index),
						backgroundColor: palette(index, 0.12),
						fill: index === 0 ? 'origin' : '-1',
						stack: 'score',
						tension: 0,
						borderWidth: 2,
						pointRadius: 0,
						pointHoverRadius: 5,
						pointHitRadius: 10
					}))
					: [
						{
							label: $_('tournament.stats.total_score'),
							data: points.map((point) => point.totalScore),
							borderColor: cssColor('--primary', '#2563eb'),
							backgroundColor: cssAlphaColor('--primary', 0.12, 'rgba(37, 99, 235, 0.12)'),
							fill: true,
							tension: 0,
							borderWidth: 2,
							pointRadius: 0,
							pointHoverRadius: 5,
							pointHitRadius: 10
						}
					]
			},
			options: {
				...baseChartOptions(),
				scales: {
					x: {
						stacked: showContribution,
						grid: { display: false },
						ticks: {
							color: cssColor('--muted-foreground', '#71717a'),
							maxRotation: 0,
							autoSkip: true,
							maxTicksLimit: 6
						}
					},
					y: {
						stacked: showContribution,
						beginAtZero: true,
						border: { display: false },
						grid: { color: cssAlphaColor('--border', 0.85, 'rgba(161, 161, 170, 0.4)') },
						ticks: {
							color: cssColor('--muted-foreground', '#71717a'),
							precision: 0
						}
					}
				},
				plugins: {
					legend: {
						display: showContribution,
						position: 'bottom'
					},
					tooltip: {
						callbacks: {
							label: (context) => {
								const point = points[context.dataIndex];
								const levelPoint = showContribution
									? point?.levels[context.datasetIndex]
									: null;

								if (!showContribution) {
									return `${$_('tournament.stats.total_score')}: ${formatNumber(context.parsed.y)}`;
								}

								return `${context.dataset.label}: ${formatNumber(levelPoint?.score ?? 0)} ${$_('tournament.stats.points_suffix')} · ${formatNumber(levelPoint?.progress ?? 0)}%`;
							},
							afterLabel: (context) => {
								if (showContribution) {
									return [];
								}

								const point = points[context.dataIndex];

								return point?.levels.map((item) =>
									`${levelLabel(item.level)}: ${formatNumber(item.progress)}% · ${formatNumber(item.score)} ${$_('tournament.stats.points_suffix')}`
								) ?? [];
							}
						}
					}
				}
			}
		});
	}

	function buildSelectedLevelChart(
		node: HTMLCanvasElement,
		points: Array<HistoryPoint & { levelPoint: LevelPoint; }>
	) {
		return new Chart(node, {
			type: 'line',
			data: {
				labels: points.map((point) => formatDate(point.atMs)),
				datasets: [
					{
						label: $_('tournament.stats.progress'),
						data: points.map((point) => point.levelPoint.progress),
						borderColor: palette(1),
						backgroundColor: palette(1, 0.14),
						fill: true,
						tension: 0,
						borderWidth: 2,
						pointRadius: 0,
						pointHoverRadius: 5,
						pointHitRadius: 10
					}
				]
			},
			options: {
				...baseChartOptions(),
				scales: {
					x: {
						grid: { display: false },
						ticks: {
							color: cssColor('--muted-foreground', '#71717a'),
							maxRotation: 0,
							autoSkip: true,
							maxTicksLimit: 6
						}
					},
					y: {
						beginAtZero: true,
						max: 100,
						border: { display: false },
						grid: { color: cssAlphaColor('--border', 0.85, 'rgba(161, 161, 170, 0.4)') },
						ticks: {
							color: cssColor('--muted-foreground', '#71717a'),
							callback: (value) => `${value}%`
						}
					}
				},
				plugins: {
					legend: { display: false },
					tooltip: {
						callbacks: {
							label: (context) => {
								const point = points[context.dataIndex]?.levelPoint;

								return `${$_('tournament.stats.progress')}: ${formatNumber(context.parsed.y)}% · ${formatNumber(point?.score ?? 0)} ${$_('tournament.stats.points_suffix')}`;
							}
						}
					}
				}
			}
		});
	}

	function buildDeathCountChart(node: HTMLCanvasElement, data: number[]) {
		return new Chart(node, {
			type: 'bar',
			data: {
				labels: Array.from({ length: 100 }, (_, index) => `${index + 1}%`),
				datasets: [
					{
						label: $_('tournament.stats.deaths'),
						data,
						backgroundColor: palette(6, 0.6),
						borderColor: palette(6),
						borderWidth: 1
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				animation: false,
				scales: {
					x: {
						ticks: {
							color: cssColor('--muted-foreground', '#71717a'),
							maxRotation: 0,
							autoSkip: true,
							maxTicksLimit: 10
						}
					},
					y: {
						beginAtZero: true,
						border: { display: false },
						grid: { color: cssAlphaColor('--border', 0.85, 'rgba(161, 161, 170, 0.4)') },
						ticks: {
							color: cssColor('--muted-foreground', '#71717a'),
							precision: 0
						}
					}
				},
				plugins: {
					legend: { display: false },
					tooltip: {
						callbacks: {
							label: (context) =>
								`${$_('tournament.stats.deaths')}: ${context.parsed.y}`
						}
					}
				}
			}
		});
	}

	async function disqualifyProgress() {
		if (!entry?.uid || !selectedLevelId || moderationSaving) {
			return;
		}

		moderationSaving = true;

		try {
			const next = await tournamentFetch(
				`/${tournament.id}/levels/${selectedLevelId}/disqualifications/${entry.uid}`,
				{
					method: 'PUT',
					body: JSON.stringify({ reason: moderationReason })
				}
			);

			if (!entry.disqualifications) {
				entry.disqualifications = {};
			}

			entry.disqualifications[String(selectedLevelId)] = next;
			localDisqualification = next;
			await onModerationChange?.();
			toast.success($_('tournament.moderation.disqualified_saved'));
		} catch (error: any) {
			toast.error(error?.message || $_('tournament.moderation.update_failed'));
		} finally {
			moderationSaving = false;
		}
	}

	async function clearDisqualification() {
		if (!entry?.uid || !selectedLevelId || moderationSaving) {
			return;
		}

		moderationSaving = true;

		try {
			await tournamentFetch(
				`/${tournament.id}/levels/${selectedLevelId}/disqualifications/${entry.uid}`,
				{ method: 'DELETE' }
			);

			if (entry.disqualifications) {
				delete entry.disqualifications[String(selectedLevelId)];
			}

			localDisqualification = null;
			await onModerationChange?.();
			toast.success($_('tournament.moderation.disqualification_cleared'));
		} catch (error: any) {
			toast.error(error?.message || $_('tournament.moderation.update_failed'));
		} finally {
			moderationSaving = false;
		}
	}
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="max-h-[90vh] overflow-y-auto md:max-w-[900px]">
    <Dialog.Header>
      <Dialog.Title>{dialogTitle}</Dialog.Title>
      <Dialog.Description>
        {mode === 'level'
          ? $_('tournament.stats.level_description')
          : $_('tournament.stats.player_description')}
      </Dialog.Description>
    </Dialog.Header>

    {#if loading}
      <div class="flex h-[360px] items-center justify-center">
        <Loading inverted />
      </div>
    {:else if errorMessage}
      <div class="flex h-[260px] items-center justify-center text-center text-muted-foreground">
        {errorMessage}
      </div>
    {:else if !hasHistory && !(mode === 'level' && canManage)}
      <div class="flex h-[260px] items-center justify-center text-center text-muted-foreground">
        {$_('tournament.stats.no_history')}
      </div>
    {:else if mode === 'player'}
      <div class="flex flex-col gap-6">
        <section>
          <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 class="text-sm font-semibold">{$_('tournament.stats.total_score')}</h3>
            <div class="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2">
              <Switch
                id="contest-stats-contribution-toggle"
                bind:checked={showLevelContribution}
              />
              <Label for="contest-stats-contribution-toggle" class="cursor-pointer text-sm">
                {$_('tournament.stats.show_contribution')}
              </Label>
            </div>
          </div>
          <div class="h-[360px] w-full">
            <canvas
              use:createLevelAreaChart={{
                points: history,
                showContribution: showLevelContribution
              }}
            ></canvas>
          </div>
        </section>
      </div>
    {:else if mode === 'level' && canManage}
      <Tabs.Root value="stats" class="w-full">
        <Tabs.List>
          <Tabs.Trigger value="stats">{$_('tournament.stats.stats_tab')}</Tabs.Trigger>
          <Tabs.Trigger value="moderation">{$_('tournament.moderation.tab')}</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="stats" class="mt-4">
          {#if !hasHistory}
            <div class="flex h-[220px] items-center justify-center text-center text-muted-foreground">
              {$_('tournament.stats.no_history')}
            </div>
          {:else}
            <div class="flex flex-col gap-6">
              <section>
                <h3 class="mb-2 text-sm font-semibold">{$_('tournament.stats.level_progress')}</h3>
                <div class="h-[300px] w-full">
                  <canvas use:createSelectedLevelChart={selectedLevelHistory}></canvas>
                </div>
              </section>
              <section>
                <div class="mb-2 flex items-center justify-between gap-3">
                  <h3 class="text-sm font-semibold">{$_('tournament.stats.death_count')}</h3>
                  <span class="text-sm text-muted-foreground">
                    {$_('tournament.stats.total_deaths', { values: { count: totalDeaths } })}
                  </span>
                </div>
                {#if deathCount.length > 0}
                  <div class="h-[300px] w-full">
                    <canvas use:createDeathCountChart={deathCount}></canvas>
                  </div>
                {:else}
                  <div class="flex h-[220px] items-center justify-center text-center text-muted-foreground">
                    {$_('tournament.stats.no_death_count')}
                  </div>
                {/if}
              </section>
            </div>
          {/if}
        </Tabs.Content>
        <Tabs.Content value="moderation" class="mt-4">
          <div class="flex flex-col gap-4">
            <div class="rounded-md border border-[hsl(var(--border))] p-3 text-sm">
              <div class="font-semibold">
                {selectedDisqualification
                  ? $_('tournament.moderation.disqualified')
                  : $_('tournament.moderation.not_disqualified')}
              </div>
              {#if selectedDisqualification?.reason}
                <div class="mt-1 text-muted-foreground">{selectedDisqualification.reason}</div>
              {/if}
            </div>
            <div class="grid gap-2">
              <Label for="contest-disqualification-reason">
                {$_('tournament.moderation.reason')}
              </Label>
              <Textarea
                id="contest-disqualification-reason"
                bind:value={moderationReason}
                disabled={moderationSaving}
              />
            </div>
            <div class="flex flex-wrap gap-2">
              <Button
                variant="destructive"
                on:click={disqualifyProgress}
                disabled={moderationSaving || Boolean(selectedDisqualification)}
              >
                {$_('tournament.moderation.disqualify')}
              </Button>
              <Button
                variant="outline"
                on:click={clearDisqualification}
                disabled={moderationSaving || !selectedDisqualification}
              >
                {$_('tournament.moderation.clear_disqualification')}
              </Button>
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    {:else}
      <div class="flex flex-col gap-6">
        <section>
          <h3 class="mb-2 text-sm font-semibold">{$_('tournament.stats.level_progress')}</h3>
          <div class="h-[300px] w-full">
            <canvas use:createSelectedLevelChart={selectedLevelHistory}></canvas>
          </div>
        </section>
        <section>
          <div class="mb-2 flex items-center justify-between gap-3">
            <h3 class="text-sm font-semibold">{$_('tournament.stats.death_count')}</h3>
            <span class="text-sm text-muted-foreground">
              {$_('tournament.stats.total_deaths', { values: { count: totalDeaths } })}
            </span>
          </div>
          {#if deathCount.length > 0}
            <div class="h-[300px] w-full">
              <canvas use:createDeathCountChart={deathCount}></canvas>
            </div>
          {:else}
            <div class="flex h-[220px] items-center justify-center text-center text-muted-foreground">
              {$_('tournament.stats.no_death_count')}
            </div>
          {/if}
        </section>
      </div>
    {/if}
  </Dialog.Content>
</Dialog.Root>
