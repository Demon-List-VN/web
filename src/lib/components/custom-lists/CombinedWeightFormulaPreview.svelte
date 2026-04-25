<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { createPreviewCustomListWeightFormula } from '$lib/utils/customListWeightFormula';
	import { _ } from 'svelte-i18n';

	export let recordScoreFormula = '1';
	export let weightFormula = '1';
	export let isPlatformer = false;
	export let mode: 'rating' | 'top' = 'rating';

	type PreviewInput = {
		position: string;
		levelCount: string;
		top: string;
		rating: string;
		baseTime: string;
		time: string;
	};

	type FormulaVariable = {
		token: string;
		label: string;
		inputKey: keyof PreviewInput;
	};

	type FormulaVariableInfo = {
		token: string;
		label: string;
	};

	type GraphPoint = {
		x: number;
		y: number;
	};

	type GraphBar = {
		x: number;
		y: number;
		label: string;
		valueLabel: string;
		topPercent: number;
		heightPercent: number;
		showLabel: boolean;
		isCurrent: boolean;
	};

	type FormulaPreviewEvaluator = ReturnType<typeof createPreviewCustomListWeightFormula>;

	type FormulaPreviewEvaluators = {
		recordScore: FormulaPreviewEvaluator;
		weight: FormulaPreviewEvaluator;
	};

	type FormulaPreviewResult = {
		recordScore: number;
		weight: number;
	};

	type FormulaOutputKey = keyof FormulaPreviewResult;

	type FormulaResultCard = {
		key: FormulaOutputKey;
		label: string;
		description: string;
		value: number | null;
	};

	type FormulaOutputOption = {
		key: FormulaOutputKey;
		label: string;
	};

	const RECORD_SCORE_FORMULA_VALIDATION_SCOPE = {
		levelCount: 1,
		top: 1,
		rating: 1,
		time: 0,
		baseTime: 0,
		minProgress: 0,
		progress: 0
	};

	const DEFAULT_GRAPH_SAMPLE_COUNT = 100;

	let previewInput: PreviewInput = {
		position: '1',
		levelCount: '25',
		top: '1',
		rating: '10',
		baseTime: getDefaultMinProgress(isPlatformer),
		time: getDefaultProgress(isPlatformer)
	};
	let previewResult: FormulaPreviewResult | null = null;
	let formulaResultCards: FormulaResultCard[] = [];
	let formulaOutputOptions: FormulaOutputOption[] = [];
	let previewError = '';
	let previewLoading = false;
	let previewSignature = '';
	let previewRequestId = 0;
	let previousPlatformer = isPlatformer;
	let formulaVariables: FormulaVariable[] = [];
	let recordFormulaVariables: FormulaVariable[] = [];
	let weightFormulaVariables: FormulaVariableInfo[] = [];
	let graphXAxis = getDefaultGraphXAxis(isPlatformer);
	let graphOutputKey: FormulaOutputKey = 'weight';
	let graphOutputSignature: FormulaOutputKey = graphOutputKey;
	let graphPoints: GraphPoint[] = [];
	let graphCurrentPoint: GraphPoint | null = null;
	let graphError = '';
	let graphAxisLabel = 'position';
	let graphOutputLabel = '';
	let showCumulativeSum = false;
	let graphDisplayPoints: GraphPoint[] = [];
	let graphDisplayCurrentPoint: GraphPoint | null = null;
	let graphBars: GraphBar[] = [];
	let graphMinValue = 0;
	let graphMaxValue = 0;
	let graphZeroLineTop = 100;
	let graphSelectionSignature = 'position';
	let graphRangeMin = '0';
	let graphRangeMax = '100';
	let graphRangeSignature = '0|100';
	let hasPreviewed = false;

	function getDefaultGraphXAxis(platformer: boolean) {
		return platformer ? 'time' : 'progress';
	}

	function getDefaultMinProgress(platformer: boolean) {
		return platformer ? '60000' : '100';
	}

	function getDefaultProgress(platformer: boolean) {
		return platformer ? '60000' : '100';
	}

	function formatOutput(value: number) {
		return Number.isInteger(value) ? String(value) : String(Math.round(value * 1000) / 1000);
	}

	function parseNumericInput(value: string, fallback: number = 0) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : fallback;
	}

	function isIntegerGraphAxis(token: string) {
		return token === 'position' || token === 'levelCount' || token === 'top';
	}

	function getGraphAxisMin(token: string) {
		return isIntegerGraphAxis(token) ? 1 : 0;
	}

	function formatAxisValue(token: string, value: number) {
		if (isPlatformer && (token === 'time' || token === 'baseTime')) {
			return `${Math.round(value)} ms`;
		}

		return formatOutput(value);
	}

	function getPreviewPayload(input: PreviewInput, scoreOverride?: number) {
		return {
			score: String(scoreOverride ?? 1),
			position: input.position,
			levelCount: input.levelCount,
			top: input.top,
			rating: input.rating,
			baseTime: input.baseTime,
			time: input.time,
			minProgress: input.baseTime,
			progress: input.time
		};
	}

	function createFormulaPreviewEvaluators(): FormulaPreviewEvaluators {
		return {
			recordScore: createPreviewCustomListWeightFormula(recordScoreFormula, {
				formulaName: 'recordScoreFormula',
				validationScope: RECORD_SCORE_FORMULA_VALIDATION_SCOPE
			}),
			weight: createPreviewCustomListWeightFormula(weightFormula, {
				formulaName: 'weightFormula'
			})
		};
	}

	function assertFiniteFormulaOutput(value: number) {
		if (!Number.isFinite(value)) {
			throw new Error($_('custom_lists.formula.preview_error'));
		}

		return value;
	}

	async function fetchFormulaPreviewResult(
		input: PreviewInput,
		evaluators: FormulaPreviewEvaluators
	): Promise<FormulaPreviewResult> {
		const recordScore = assertFiniteFormulaOutput(
			Number(evaluators.recordScore.evaluate(getPreviewPayload(input)).output)
		);
		const weight = assertFiniteFormulaOutput(
			Number(evaluators.weight.evaluate(getPreviewPayload(input, recordScore)).output)
		);

		return {
			recordScore,
			weight
		};
	}

	function getFormulaOutputValue(result: FormulaPreviewResult, key: FormulaOutputKey) {
		return result[key];
	}

	function getFormulaOutputLabel(key: FormulaOutputKey) {
		switch (key) {
			case 'recordScore':
				return `score(x) - ${$_('custom_lists.formula.record_score_output_label')}`;
			case 'weight':
			default:
				return `weighted(x) - ${$_('custom_lists.formula.weight_output_label')}`;
		}
	}

	function getFormulaOutputOptions(): FormulaOutputOption[] {
		return [
			{ key: 'recordScore', label: getFormulaOutputLabel('recordScore') },
			{ key: 'weight', label: getFormulaOutputLabel('weight') }
		];
	}

	function getFormulaResultCards(result: FormulaPreviewResult | null): FormulaResultCard[] {
		return [
			{
				key: 'recordScore',
				label: 'score(x)',
				description: $_('custom_lists.formula.record_score_output_label'),
				value: result?.recordScore ?? null
			},
			{
				key: 'weight',
				label: 'weighted(x)',
				description: $_('custom_lists.formula.weight_output_label'),
				value: result?.weight ?? null
			}
		];
	}

	function getRecordFormulaVariables() {
		return [
			{
				token: 'levelCount',
				label: $_('custom_lists.formula.level_count_label'),
				inputKey: 'levelCount' as const
			},
			...(mode === 'top'
				? [{ token: 'top', label: $_('custom_lists.formula.top_label'), inputKey: 'top' as const }]
				: [
						{
							token: 'rating',
							label: $_('custom_lists.formula.rating_label'),
							inputKey: 'rating' as const
						}
					]),
			{
				token: isPlatformer ? 'time' : 'progress',
				inputKey: 'time' as const,
				label: isPlatformer
					? $_('custom_lists.formula.time_label')
					: $_('custom_lists.formula.progress_label')
			},
			{
				token: isPlatformer ? 'baseTime' : 'minProgress',
				inputKey: 'baseTime' as const,
				label: isPlatformer
					? $_('custom_lists.formula.base_time_label')
					: $_('custom_lists.formula.min_progress_label')
			}
		];
	}

	function getWeightFormulaVariables(): FormulaVariableInfo[] {
		return [
			{ token: 'score', label: 'score(x)' },
			{ token: 'position', label: $_('custom_lists.formula.position_label') },
			...recordFormulaVariables.map(({ token, label }) => ({ token, label }))
		];
	}

	function getFormulaVariables() {
		return [
			{
				token: 'position',
				label: $_('custom_lists.formula.position_label'),
				inputKey: 'position' as const
			},
			...recordFormulaVariables
		];
	}

	function updatePreviewInput(key: keyof PreviewInput, value: string) {
		previewInput = {
			...previewInput,
			[key]: value
		};
	}

	function handlePreviewInput(key: keyof PreviewInput, event: Event) {
		const target = event.target as HTMLInputElement | null;
		updatePreviewInput(key, target?.value ?? '');
	}

	function dedupeSortedValues(values: number[]) {
		return [...new Set(values.map((value) => Math.max(0, Math.round(value))))].sort(
			(left, right) => left - right
		);
	}

	function getDefaultGraphRange(variable: FormulaVariable | undefined) {
		if (!variable) {
			return {
				min: '0',
				max: '100'
			};
		}

		const currentValue = parseNumericInput(
			previewInput[variable.inputKey],
			getGraphAxisMin(variable.token)
		);
		const levelCount = Math.max(1, parseNumericInput(previewInput.levelCount, 25));

		switch (variable.token) {
			case 'position':
			case 'top':
				return {
					min: '1',
					max: String(Math.max(levelCount, currentValue, 10))
				};
			case 'levelCount':
				return {
					min: '1',
					max: String(Math.max(currentValue, 25))
				};
			case 'rating':
				return {
					min: '0',
					max: String(Math.max(20, Math.round(currentValue * 1.5)))
				};
			case 'progress':
			case 'minProgress':
				return {
					min: '0',
					max: '100'
				};
			case 'time':
			case 'baseTime':
				return {
					min: '0',
					max: String(Math.max(currentValue, 60000, Math.round(currentValue * 1.5)))
				};
			default:
				return {
					min: '0',
					max: String(Math.max(currentValue, 10))
				};
		}
	}

	function normalizeGraphRange(variable: FormulaVariable | undefined) {
		const defaults = getDefaultGraphRange(variable);
		const token = variable?.token || 'progress';
		const axisMin = getGraphAxisMin(token);
		let min = parseNumericInput(graphRangeMin, Number(defaults.min));
		let max = parseNumericInput(graphRangeMax, Number(defaults.max));

		if (isIntegerGraphAxis(token)) {
			min = Math.round(min);
			max = Math.round(max);
		}

		min = Math.max(axisMin, min);
		max = Math.max(axisMin, max);

		if (max < min) {
			[max, min] = [min, max];
		}

		return {
			min,
			max,
			minLabel: formatOutput(min),
			maxLabel: formatOutput(max)
		};
	}

	function buildSampleValues(
		min: number,
		max: number,
		current: number,
		count: number = DEFAULT_GRAPH_SAMPLE_COUNT
	) {
		if (max <= min) {
			return dedupeSortedValues([min, current]);
		}

		const values: number[] = [];

		for (let index = 0; index < count; index += 1) {
			const ratio = count === 1 ? 0 : index / (count - 1);
			values.push(min + (max - min) * ratio);
		}

		if (min <= 0 && max >= 0) {
			values.push(0);
		}

		values.push(current);

		return dedupeSortedValues(values);
	}

	function getGraphSampleValues(variable: FormulaVariable) {
		const currentValue = parseNumericInput(previewInput[variable.inputKey], 0);
		const range = normalizeGraphRange(variable);

		return buildSampleValues(range.min, range.max, currentValue);
	}

	async function buildGraphPoints(
		baseInput: PreviewInput,
		selectedVariable: FormulaVariable,
		evaluators: FormulaPreviewEvaluators,
		outputKey: FormulaOutputKey
	) {
		const graphSampleValues = getGraphSampleValues(selectedVariable);
		const settled = await Promise.allSettled(
			graphSampleValues.map(async (sampleValue) => {
				const result = await fetchFormulaPreviewResult(
					{
						...baseInput,
						[selectedVariable.inputKey]: String(sampleValue)
					},
					evaluators
				);

				return {
					x: sampleValue,
					y: getFormulaOutputValue(result, outputKey)
				};
			})
		);

		const points = settled
			.filter(
				(result): result is PromiseFulfilledResult<GraphPoint> => result.status === 'fulfilled'
			)
			.map((result) => result.value)
			.sort((left, right) => left.x - right.x);

		if (points.length) {
			return points;
		}

		const firstError = settled.find(
			(result): result is PromiseRejectedResult => result.status === 'rejected'
		);

		throw firstError?.reason instanceof Error
			? firstError.reason
			: new Error($_('custom_lists.formula.preview_error'));
	}

	function mergeGraphPoints(points: GraphPoint[], currentPoint: GraphPoint | null) {
		const mergedPoints = points.map((point) =>
			currentPoint && point.x === currentPoint.x ? currentPoint : point
		);

		if (currentPoint && !mergedPoints.some((point) => point.x === currentPoint.x)) {
			mergedPoints.push(currentPoint);
		}

		return [...mergedPoints].sort((left, right) => left.x - right.x);
	}

	function buildDisplayGraphData(
		points: GraphPoint[],
		currentPoint: GraphPoint | null,
		useCumulativeSum: boolean
	) {
		const mergedPoints = mergeGraphPoints(points, currentPoint);

		if (!useCumulativeSum) {
			return {
				points: mergedPoints,
				currentPoint: currentPoint
					? mergedPoints.find((point) => point.x === currentPoint.x) || currentPoint
					: null
			};
		}

		let runningTotal = 0;
		const cumulativePoints = mergedPoints.map((point) => {
			runningTotal += point.y;

			return {
				x: point.x,
				y: runningTotal
			};
		});

		return {
			points: cumulativePoints,
			currentPoint: currentPoint
				? cumulativePoints.find((point) => point.x === currentPoint.x) || null
				: null
		};
	}

	function buildGraphBars(points: GraphPoint[], currentPoint: GraphPoint | null, token: string) {
		const sortedPoints = [...points].sort((left, right) => left.x - right.x);

		if (!sortedPoints.length) {
			return {
				bars: [] as GraphBar[],
				minValue: 0,
				maxValue: 0,
				zeroLineTop: 100
			};
		}

		const values = sortedPoints.map((point) => point.y);
		const minValue = Math.min(0, ...values);
		let maxValue = Math.max(0, ...values);

		if (minValue === maxValue) {
			maxValue = minValue + 1;
		}

		const range = maxValue - minValue;
		const zeroLineTop = ((maxValue - 0) / range) * 100;
		const labelInterval = Math.max(1, Math.ceil(sortedPoints.length / 6));

		return {
			bars: sortedPoints.map((point, index) => {
				const pointTop = ((maxValue - point.y) / range) * 100;
				const rawTopPercent = Math.min(pointTop, zeroLineTop);
				const rawHeightPercent = Math.abs(pointTop - zeroLineTop);
				const heightPercent = Math.min(100, Math.max(rawHeightPercent, 1.5));
				const topPercent = Math.max(0, Math.min(100 - heightPercent, rawTopPercent));
				const isCurrent = currentPoint ? point.x === currentPoint.x : false;

				return {
					x: point.x,
					y: point.y,
					label: formatAxisValue(token, point.x),
					valueLabel: formatOutput(point.y),
					topPercent,
					heightPercent,
					showLabel:
						index === 0 ||
						index === sortedPoints.length - 1 ||
						isCurrent ||
						index % labelInterval === 0,
					isCurrent
				};
			}),
			minValue,
			maxValue,
			zeroLineTop: Math.max(0, Math.min(100, zeroLineTop))
		};
	}

	async function runPreview() {
		const requestId = ++previewRequestId;
		hasPreviewed = true;
		previewLoading = true;
		previewError = '';
		graphError = '';

		try {
			const selectedVariable = formulaVariables.find((variable) => variable.token === graphXAxis);

			if (!selectedVariable) {
				throw new Error($_('custom_lists.formula.preview_error'));
			}

			const evaluators = createFormulaPreviewEvaluators();
			const baseInput = { ...previewInput };
			const outputKey = graphOutputKey;
			const [currentResult, graphResult] = await Promise.allSettled([
				fetchFormulaPreviewResult(baseInput, evaluators),
				buildGraphPoints(baseInput, selectedVariable, evaluators, outputKey)
			]);

			if (requestId !== previewRequestId) {
				return;
			}

			if (currentResult.status === 'fulfilled') {
				previewResult = currentResult.value;
				previewError = '';
				graphCurrentPoint = {
					x: parseNumericInput(baseInput[selectedVariable.inputKey], 0),
					y: getFormulaOutputValue(currentResult.value, outputKey)
				};
			} else {
				previewResult = null;
				previewError =
					currentResult.reason instanceof Error
						? currentResult.reason.message
						: $_('custom_lists.formula.preview_error');
				graphCurrentPoint = null;
			}

			if (graphResult.status === 'fulfilled') {
				graphPoints = graphResult.value;
				graphError = '';
			} else {
				graphPoints = [];
				graphError =
					graphResult.reason instanceof Error
						? graphResult.reason.message
						: $_('custom_lists.formula.preview_error');
			}
		} catch (error) {
			if (requestId !== previewRequestId) {
				return;
			}

			previewResult = null;
			graphPoints = [];
			graphCurrentPoint = null;
			previewError =
				error instanceof Error ? error.message : $_('custom_lists.formula.preview_error');
			graphError = previewError;
		} finally {
			if (requestId === previewRequestId) {
				previewLoading = false;
			}
		}
	}

	$: if (isPlatformer !== previousPlatformer) {
		previousPlatformer = isPlatformer;
		previewInput = {
			...previewInput,
			baseTime: getDefaultMinProgress(isPlatformer),
			time: getDefaultProgress(isPlatformer)
		};
		graphXAxis = getDefaultGraphXAxis(isPlatformer);
	}

	$: recordFormulaVariables = getRecordFormulaVariables();
	$: weightFormulaVariables = getWeightFormulaVariables();
	$: formulaVariables = getFormulaVariables();
	$: formulaOutputOptions = getFormulaOutputOptions();
	$: formulaResultCards = getFormulaResultCards(previewResult);

	$: if (
		formulaVariables.length &&
		!formulaVariables.some((variable) => variable.token === graphXAxis)
	) {
		graphXAxis =
			formulaVariables.find((variable) => variable.token === getDefaultGraphXAxis(isPlatformer))
				?.token || formulaVariables[0].token;
	}

	$: if (graphXAxis !== graphSelectionSignature) {
		graphSelectionSignature = graphXAxis;
		const nextVariable = formulaVariables.find((variable) => variable.token === graphXAxis);
		const defaultRange = getDefaultGraphRange(nextVariable);
		graphRangeMin = defaultRange.min;
		graphRangeMax = defaultRange.max;
		graphPoints = [];
		graphCurrentPoint = null;
		graphError = '';
	}

	$: if (graphOutputKey !== graphOutputSignature) {
		graphOutputSignature = graphOutputKey;
		graphPoints = [];
		graphCurrentPoint = null;
		graphError = '';

		if (hasPreviewed) {
			void runPreview();
		}
	}

	$: {
		const selectedVariable = formulaVariables.find((variable) => variable.token === graphXAxis);
		const normalizedRange = normalizeGraphRange(selectedVariable);
		const nextRangeSignature = [
			graphXAxis,
			normalizedRange.minLabel,
			normalizedRange.maxLabel
		].join('|');

		if (nextRangeSignature !== graphRangeSignature) {
			graphRangeSignature = nextRangeSignature;
			graphRangeMin = normalizedRange.minLabel;
			graphRangeMax = normalizedRange.maxLabel;
			graphPoints = [];
			graphCurrentPoint = null;
			graphError = '';

			if (hasPreviewed) {
				void runPreview();
			}
		}
	}

	$: {
		const nextSignature = [
			recordScoreFormula,
			weightFormula,
			mode,
			previewInput.position,
			previewInput.levelCount,
			previewInput.top,
			previewInput.rating,
			previewInput.time,
			previewInput.baseTime,
			isPlatformer ? 'platformer' : 'classic'
		].join('|');

		if (nextSignature !== previewSignature) {
			previewSignature = nextSignature;
			previewRequestId += 1;
			previewLoading = false;
			previewResult = null;
			previewError = '';
			graphPoints = [];
			graphCurrentPoint = null;
			graphError = '';
		}
	}

	$: graphAxisLabel =
		formulaVariables.find((variable) => variable.token === graphXAxis)?.label || graphXAxis;

	$: graphOutputLabel = showCumulativeSum
		? $_('custom_lists.formula.cumulative_output_label')
		: getFormulaOutputLabel(graphOutputKey);

	$: ({ points: graphDisplayPoints, currentPoint: graphDisplayCurrentPoint } =
		buildDisplayGraphData(graphPoints, graphCurrentPoint, showCumulativeSum));

	$: ({
		bars: graphBars,
		minValue: graphMinValue,
		maxValue: graphMaxValue,
		zeroLineTop: graphZeroLineTop
	} = buildGraphBars(graphDisplayPoints, graphDisplayCurrentPoint, graphXAxis));
</script>

<div class="formulaPreviewCard">
	<div class="formulaPreviewHeader">
		<div>
			<h3>{$_('custom_lists.formula.combined_preview_title')}</h3>
			<p>{$_('custom_lists.formula.combined_preview_hint')}</p>
		</div>
		<Button
			type="button"
			variant="outline"
			size="sm"
			on:click={runPreview}
			disabled={previewLoading}
		>
			{previewLoading ? `${$_('general.loading')}...` : $_('custom_lists.formula.preview_button')}
		</Button>
	</div>

	<div class="formulaPreviewVariables">
		<span class="formulaPreviewVariablesLabel"
			>{$_('custom_lists.formula.available_variables_label')}</span
		>
		<div class="formulaPreviewVariableGroups">
			<div class="formulaPreviewVariableGroup">
				<span class="formulaPreviewVariableGroupLabel">score(x)</span>
				<div class="formulaPreviewVariableList">
					{#each recordFormulaVariables as variable}
						<div class="formulaPreviewVariable">
							<code class="formulaPreviewVariableToken">{variable.token}</code>
							<span class="formulaPreviewVariableName">{variable.label}</span>
						</div>
					{/each}
				</div>
			</div>
			<div class="formulaPreviewVariableGroup">
				<span class="formulaPreviewVariableGroupLabel">weighted(x)</span>
				<div class="formulaPreviewVariableList">
					{#each weightFormulaVariables as variable}
						<div class="formulaPreviewVariable">
							<code class="formulaPreviewVariableToken">{variable.token}</code>
							<span class="formulaPreviewVariableName">{variable.label}</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
		{#if isPlatformer}
			<p class="formulaPreviewNote">{$_('custom_lists.formula.platformer_time_note')}</p>
		{/if}
	</div>

	<div class="formulaPreviewGrid">
		{#each formulaVariables as variable}
			<div class="field">
				<label for={`formula-preview-combined-${variable.token}`}>{variable.label}</label>
				<Input
					id={`formula-preview-combined-${variable.token}`}
					type="number"
					min={getGraphAxisMin(variable.token)}
					value={previewInput[variable.inputKey]}
					on:input={(event) => handlePreviewInput(variable.inputKey, event)}
				/>
			</div>
		{/each}
	</div>

	<div class="formulaPreviewResults" class:formulaPreviewResultError={Boolean(previewError)}>
		{#if previewError}
			<div class="formulaPreviewResultMessage">{previewError}</div>
		{:else}
			{#each formulaResultCards as card (card.key)}
				<div class="formulaPreviewResultCard">
					<div>
						<span class="formulaPreviewResultFunction">{card.label}</span>
						<span class="formulaPreviewResultDescription">{card.description}</span>
					</div>
					<span
						class="formulaPreviewResultValue"
						class:formulaPreviewResultPlaceholder={card.value == null}
					>
						{card.value == null
							? $_('custom_lists.formula.preview_pending')
							: formatOutput(card.value)}
					</span>
				</div>
			{/each}
		{/if}
	</div>

	<div class="formulaPreviewGraphCard" class:formulaPreviewResultError={Boolean(graphError)}>
		<div class="formulaPreviewGraphHeader">
			<div>
				<h4>{$_('custom_lists.formula.graph_title')}</h4>
				<p>{$_('custom_lists.formula.graph_hint')}</p>
			</div>
			<div class="formulaPreviewGraphControls">
				<div class="field formulaPreviewGraphOutputField">
					<label for="formula-preview-combined-output"
						>{$_('custom_lists.formula.graph_output_label')}</label
					>
					<select id="formula-preview-combined-output" bind:value={graphOutputKey}>
						{#each formulaOutputOptions as output}
							<option value={output.key}>{output.label}</option>
						{/each}
					</select>
				</div>
				<div class="field formulaPreviewGraphAxisField">
					<label for="formula-preview-combined-x-axis"
						>{$_('custom_lists.formula.x_axis_label')}</label
					>
					<select id="formula-preview-combined-x-axis" bind:value={graphXAxis}>
						{#each formulaVariables as variable}
							<option value={variable.token}>{variable.label}</option>
						{/each}
					</select>
				</div>
				<div class="field formulaPreviewGraphRangeField">
					<label for="formula-preview-combined-graph-range-min"
						>{$_('custom_lists.formula.range_start_label')}</label
					>
					<Input
						id="formula-preview-combined-graph-range-min"
						type="number"
						min={getGraphAxisMin(graphXAxis)}
						bind:value={graphRangeMin}
					/>
				</div>
				<div class="field formulaPreviewGraphRangeField">
					<label for="formula-preview-combined-graph-range-max"
						>{$_('custom_lists.formula.range_end_label')}</label
					>
					<Input
						id="formula-preview-combined-graph-range-max"
						type="number"
						min={getGraphAxisMin(graphXAxis)}
						bind:value={graphRangeMax}
					/>
				</div>
				<label class="formulaPreviewGraphToggle" for="formula-preview-combined-cumulative-sum">
					<input
						id="formula-preview-combined-cumulative-sum"
						type="checkbox"
						bind:checked={showCumulativeSum}
					/>
					<span>{$_('custom_lists.formula.cumulative_sum_label')}</span>
				</label>
			</div>
		</div>

		{#if graphError}
			<div class="formulaPreviewGraphEmptyState">{graphError}</div>
		{:else if previewLoading}
			<div class="formulaPreviewGraphEmptyState">{$_('general.loading')}...</div>
		{:else if graphBars.length > 0}
			<div class="formulaPreviewBarChart">
				<div class="formulaPreviewBarChartSummary">
					<span
						>{graphAxisLabel}: {graphDisplayCurrentPoint
							? formatAxisValue(graphXAxis, graphDisplayCurrentPoint.x)
							: '-'}</span
					>
					<span
						>{graphOutputLabel}: {graphDisplayCurrentPoint
							? formatOutput(graphDisplayCurrentPoint.y)
							: '-'}</span
					>
				</div>
				<div class="formulaPreviewBarChartLayout">
					<div class="formulaPreviewBarChartScale" aria-hidden="true">
						<span>{formatOutput(graphMaxValue)}</span>
						{#if graphZeroLineTop > 0 && graphZeroLineTop < 100}
							<span
								class="formulaPreviewBarChartScaleZero"
								style={`top: calc(${graphZeroLineTop}% - 0.55rem);`}
							>
								0
							</span>
						{/if}
						<span>{formatOutput(graphMinValue)}</span>
					</div>
					<div class="formulaPreviewBarChartPlot">
						<div class="formulaPreviewBarChartArea">
							<div class="formulaPreviewBarChartGrid"></div>
							<div class="formulaPreviewBarChartZeroLine" style={`top: ${graphZeroLineTop}%`}></div>
							<div
								class="formulaPreviewBarChartColumns"
								style={`--bar-count: ${Math.max(graphBars.length, 1)};`}
							>
								{#each graphBars as bar (bar.x)}
									<div class="formulaPreviewBarColumn">
										<div class="formulaPreviewBarTrack">
											<button
												type="button"
												class="formulaPreviewBar"
												class:formulaPreviewBarCurrent={bar.isCurrent}
												style={`top: ${bar.topPercent}%; height: ${bar.heightPercent}%`}
												aria-label={`${graphAxisLabel}: ${bar.label}, ${graphOutputLabel}: ${bar.valueLabel}`}
											>
												<span class="formulaPreviewBarTooltip" aria-hidden="true">
													<span>{graphAxisLabel}: {bar.label}</span>
													<span>{graphOutputLabel}: {bar.valueLabel}</span>
												</span>
											</button>
										</div>
										<span class="formulaPreviewBarLabel">
											{bar.showLabel ? bar.label : ''}
										</span>
									</div>
								{/each}
							</div>
						</div>
					</div>
				</div>
			</div>
		{:else}
			<div class="formulaPreviewGraphEmptyState">{$_('custom_lists.formula.graph_pending')}</div>
		{/if}
	</div>
</div>

<style lang="scss">
	.formulaPreviewCard {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 14px;
		border: 1px solid hsl(var(--border));
		border-radius: 10px;
		background: hsl(var(--muted) / 0.18);
	}

	.formulaPreviewHeader {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 12px;
		flex-wrap: wrap;
	}

	.formulaPreviewHeader h3 {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 600;
	}

	.formulaPreviewHeader p {
		margin: 4px 0 0;
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
	}

	.formulaPreviewGrid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 12px;
	}

	.formulaPreviewVariables {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 12px 14px;
		border-radius: 8px;
		border: 1px dashed hsl(var(--border));
		background: hsl(var(--background));
	}

	.formulaPreviewVariablesLabel {
		font-size: 0.8rem;
		font-weight: 600;
	}

	.formulaPreviewVariableGroups {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 12px;
	}

	.formulaPreviewVariableGroup {
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-width: 0;
	}

	.formulaPreviewVariableGroupLabel {
		font-size: 0.78rem;
		font-weight: 700;
	}

	.formulaPreviewNote {
		margin: 0;
		font-size: 0.78rem;
		color: hsl(var(--muted-foreground));
	}

	.formulaPreviewVariableList {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 10px;
	}

	.formulaPreviewVariable {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.formulaPreviewVariableToken {
		padding: 4px 8px;
		border-radius: 999px;
		border: 1px solid hsl(var(--border));
		background: hsl(var(--muted));
		font-size: 0.78rem;
		font-weight: 600;
	}

	.formulaPreviewVariableName {
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.field label {
		font-size: 0.85rem;
		font-weight: 500;
	}

	.formulaPreviewResults {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
		gap: 10px;
	}

	.formulaPreviewResultCard,
	.formulaPreviewResultMessage {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		padding: 12px 14px;
		border-radius: 8px;
		background: hsl(var(--background));
		border: 1px solid hsl(var(--border));
	}

	.formulaPreviewResultMessage {
		grid-column: 1 / -1;
		justify-content: flex-start;
		color: hsl(var(--destructive));
		font-size: 0.86rem;
		font-weight: 600;
	}

	.formulaPreviewResultError .formulaPreviewResultCard,
	.formulaPreviewResultError .formulaPreviewResultMessage {
		border-color: hsl(var(--destructive) / 0.45);
	}

	.formulaPreviewResultFunction,
	.formulaPreviewResultValue {
		display: block;
		font-size: 0.9rem;
		font-weight: 700;
	}

	.formulaPreviewResultDescription {
		display: block;
		margin-top: 2px;
		font-size: 0.76rem;
		color: hsl(var(--muted-foreground));
	}

	.formulaPreviewResultValue {
		text-align: right;
	}

	.formulaPreviewResultPlaceholder {
		color: hsl(var(--muted-foreground));
		font-weight: 500;
	}

	.formulaPreviewGraphCard {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 12px 14px;
		border-radius: 8px;
		background: hsl(var(--background));
		border: 1px solid hsl(var(--border));
	}

	.formulaPreviewGraphCard.formulaPreviewResultError {
		border-color: hsl(var(--destructive) / 0.45);
	}

	.formulaPreviewGraphHeader {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 12px;
		flex-wrap: wrap;
	}

	.formulaPreviewGraphHeader h4 {
		margin: 0;
		font-size: 0.9rem;
		font-weight: 600;
	}

	.formulaPreviewGraphHeader p {
		margin: 4px 0 0;
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
	}

	.formulaPreviewGraphOutputField,
	.formulaPreviewGraphAxisField {
		min-width: 180px;
	}

	.formulaPreviewGraphRangeField {
		width: 8rem;
	}

	.formulaPreviewGraphControls {
		display: flex;
		align-items: flex-end;
		gap: 12px;
		flex-wrap: wrap;
	}

	.formulaPreviewGraphOutputField select,
	.formulaPreviewGraphAxisField select {
		height: 2.5rem;
		padding: 0 0.75rem;
		border-radius: calc(var(--radius) - 2px);
		border: 1px solid hsl(var(--input));
		background: hsl(var(--background));
		font-size: 0.875rem;
	}

	.formulaPreviewGraphToggle {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 2.5rem;
		font-size: 0.82rem;
		font-weight: 500;
		color: hsl(var(--foreground));
		cursor: pointer;
	}

	.formulaPreviewGraphToggle input {
		width: 1rem;
		height: 1rem;
		margin: 0;
		accent-color: hsl(var(--primary));
	}

	.formulaPreviewBarChart {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.formulaPreviewBarChartSummary {
		display: flex;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
	}

	.formulaPreviewBarChartLayout {
		display: flex;
		gap: 12px;
		align-items: stretch;
	}

	.formulaPreviewBarChartScale {
		position: relative;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		width: 3rem;
		padding: 2px 0 1.85rem;
		font-size: 0.72rem;
		color: hsl(var(--muted-foreground));
	}

	.formulaPreviewBarChartScaleZero {
		position: absolute;
		left: 0;
	}

	.formulaPreviewBarChartPlot {
		flex: 1;
		min-width: 0;
	}

	.formulaPreviewBarChartArea {
		position: relative;
		height: 260px;
		padding: 8px 0 0;
	}

	.formulaPreviewBarChartGrid {
		position: absolute;
		inset: 8px 0 1.85rem;
		border-radius: 8px;
		background-image: linear-gradient(
			to top,
			hsl(var(--border) / 0.75) 0,
			hsl(var(--border) / 0.75) 1px,
			transparent 1px,
			transparent calc(25% - 1px)
		);
		background-size: 100% 25%;
	}

	.formulaPreviewBarChartZeroLine {
		position: absolute;
		left: 0;
		right: 0;
		height: 1px;
		background: hsl(var(--border));
		transform: translateY(-0.5px);
		pointer-events: none;
	}

	.formulaPreviewBarChartColumns {
		position: absolute;
		inset: 8px 0 0;
		display: grid;
		grid-template-columns: repeat(var(--bar-count), minmax(0, 1fr));
		gap: 2px;
		overflow: visible;
	}

	.formulaPreviewBarColumn {
		display: flex;
		flex-direction: column;
		gap: 8px;
		align-items: center;
		min-width: 0;
	}

	.formulaPreviewBarTrack {
		position: relative;
		width: 100%;
		height: 220px;
		overflow: visible;
	}

	.formulaPreviewBar {
		position: absolute;
		left: 50%;
		right: auto;
		width: min(100%, 0.32rem);
		padding: 0;
		border: 0;
		border-radius: 0;
		background: hsl(var(--primary));
		appearance: none;
		cursor: pointer;
		transform: translateX(-50%);
		transition:
			transform 0.16s ease,
			opacity 0.16s ease;
	}

	.formulaPreviewBarColumn:hover .formulaPreviewBar,
	.formulaPreviewBarColumn:focus-within .formulaPreviewBar,
	.formulaPreviewBar:hover,
	.formulaPreviewBar:focus-visible {
		transform: translate(-50%, -2px);
		opacity: 0.92;
		outline: none;
	}

	.formulaPreviewBarCurrent {
		background: hsl(var(--destructive));
	}

	.formulaPreviewBarTooltip {
		position: absolute;
		left: 50%;
		bottom: calc(100% + 8px);
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 7px 9px;
		border-radius: 6px;
		background: hsl(var(--foreground));
		color: hsl(var(--background));
		font-size: 0.72rem;
		line-height: 1.3;
		white-space: nowrap;
		transform: translate(-50%, 6px);
		opacity: 0;
		visibility: hidden;
		pointer-events: none;
		z-index: 2;
		transition:
			transform 0.16s ease,
			opacity 0.16s ease,
			visibility 0.16s ease;
	}

	.formulaPreviewBarTooltip::after {
		content: '';
		position: absolute;
		left: 50%;
		top: 100%;
		width: 8px;
		height: 8px;
		background: hsl(var(--foreground));
		transform: translate(-50%, -50%) rotate(45deg);
	}

	.formulaPreviewBarColumn:hover .formulaPreviewBarTooltip,
	.formulaPreviewBarColumn:focus-within .formulaPreviewBarTooltip,
	.formulaPreviewBar:hover .formulaPreviewBarTooltip,
	.formulaPreviewBar:focus-visible .formulaPreviewBarTooltip {
		transform: translate(-50%, 0);
		opacity: 1;
		visibility: visible;
	}

	.formulaPreviewBarLabel {
		min-height: 1.8rem;
		width: 100%;
		overflow: hidden;
		font-size: 0.7rem;
		line-height: 1.25;
		color: hsl(var(--muted-foreground));
		text-align: center;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.formulaPreviewGraphEmptyState {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 180px;
		padding: 16px;
		border-radius: 8px;
		border: 1px dashed hsl(var(--border));
		color: hsl(var(--muted-foreground));
		text-align: center;
		font-size: 0.85rem;
	}

	@media (max-width: 720px) {
		.formulaPreviewBarChartLayout {
			gap: 8px;
		}

		.formulaPreviewBarChartScale {
			width: 2.5rem;
		}

		.formulaPreviewBarChartColumns {
			gap: 1px;
		}
	}
</style>
