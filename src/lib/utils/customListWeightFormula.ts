import { all, create } from 'mathjs';

export type PreviewCustomListWeightFormulaScope = {
	position?: unknown;
	levelCount?: unknown;
	top?: unknown;
	rating?: unknown;
	time?: unknown;
	baseTime?: unknown;
	minProgress?: unknown;
	progress?: unknown;
};

type NormalizedPreviewCustomListWeightFormulaScope = {
	position: number;
	levelCount: number;
	top: number;
	rating: number;
	time: number;
	baseTime: number;
	minProgress: number;
	progress: number;
};

type WeightFormulaNode = {
	type?: unknown;
	mathjs?: unknown;
	traverse: (callback: (child: WeightFormulaNode) => void) => void;
	compile: () => {
		evaluate: (scope: NormalizedPreviewCustomListWeightFormulaScope) => unknown;
	};
};

const WEIGHT_FORMULA_VALIDATION_SCOPE: NormalizedPreviewCustomListWeightFormulaScope = {
	position: 1,
	levelCount: 1,
	top: 1,
	rating: 1,
	time: 0,
	baseTime: 0,
	minProgress: 0,
	progress: 0
};

const WEIGHT_FORMULA_DISABLED_FUNCTIONS = [
	'import',
	'createUnit',
	'reviver',
	'evaluate',
	'parse',
	'simplify',
	'derivative',
	'resolve',
	'parser'
] as const;

const weightFormulaMath = create(all);
const parseWeightFormulaNode = weightFormulaMath.parse.bind(weightFormulaMath) as (
	expression: string
) => WeightFormulaNode;

class WeightFormulaPreviewError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'WeightFormulaPreviewError';
	}
}

weightFormulaMath.import(
	Object.fromEntries(
		WEIGHT_FORMULA_DISABLED_FUNCTIONS.map((functionName) => [
			functionName,
			() => {
				throw new WeightFormulaPreviewError(`weightFormula function "${functionName}" is disabled`);
			}
		])
	),
	{ override: true }
);

function getWeightFormulaNodeType(node: { type?: unknown; mathjs?: unknown } | null | undefined) {
	if (typeof node?.type === 'string') {
		return node.type;
	}

	if (typeof node?.mathjs === 'string') {
		return node.mathjs;
	}

	return null;
}

function assertWeightFormulaNodeIsSafe(node: WeightFormulaNode) {
	node.traverse((child) => {
		if (getWeightFormulaNodeType(child) === 'FunctionAssignmentNode') {
			throw new WeightFormulaPreviewError('weightFormula custom functions are disabled');
		}
	});
}

function validateWeightFormulaExpression(value: string) {
	try {
		const node = parseWeightFormulaNode(value);
		assertWeightFormulaNodeIsSafe(node);
		return node;
	} catch (error) {
		if (error instanceof WeightFormulaPreviewError) {
			throw error;
		}

		throw new WeightFormulaPreviewError('weightFormula must be a valid math expression');
	}
}

function normalizeWeightFormulaResult(result: unknown): number {
	if (result && typeof result === 'object' && Array.isArray((result as { entries?: unknown[] }).entries)) {
		const entries = (result as { entries: unknown[] }).entries;

		for (let index = entries.length - 1; index >= 0; index -= 1) {
			if (entries[index] !== undefined) {
				return normalizeWeightFormulaResult(entries[index]);
			}
		}
	}

	if (typeof result === 'boolean' || typeof result === 'string' || Array.isArray(result) || result == null) {
		throw new WeightFormulaPreviewError('weightFormula must evaluate to a finite number');
	}

	const normalized = typeof result === 'number' ? result : Number(result);

	if (!Number.isFinite(normalized)) {
		throw new WeightFormulaPreviewError('weightFormula must evaluate to a finite number');
	}

	return normalized;
}

function evaluateCompiledWeightFormula(
	compiledNode: ReturnType<WeightFormulaNode['compile']>,
	scope: NormalizedPreviewCustomListWeightFormulaScope
) {
	try {
		return normalizeWeightFormulaResult(compiledNode.evaluate({ ...scope }));
	} catch (error) {
		if (error instanceof WeightFormulaPreviewError) {
			throw error;
		}

		throw new WeightFormulaPreviewError(
			error instanceof Error ? error.message : 'weightFormula must evaluate to a finite number'
		);
	}
}

function sanitizePreviewNumber(value: unknown, label: string, options?: { integer?: boolean; min?: number }) {
	const parsed = typeof value === 'number' ? value : Number(value);

	if (!Number.isFinite(parsed)) {
		throw new WeightFormulaPreviewError(`${label} must be a finite number`);
	}

	if (options?.integer && !Number.isInteger(parsed)) {
		throw new WeightFormulaPreviewError(`${label} must be an integer`);
	}

	if (options?.min !== undefined && parsed < options.min) {
		throw new WeightFormulaPreviewError(`${label} must be at least ${options.min}`);
	}

	return parsed;
}

function normalizePreviewScope(scope: PreviewCustomListWeightFormulaScope) {
	const normalizedTime = sanitizePreviewNumber(scope.time ?? scope.progress, 'time', { min: 0 });
	const normalizedBaseTime = sanitizePreviewNumber(scope.baseTime ?? scope.minProgress, 'baseTime', {
		min: 0
	});

	return {
		position: sanitizePreviewNumber(scope.position, 'position', { integer: true, min: 1 }),
		levelCount: sanitizePreviewNumber(scope.levelCount, 'levelCount', { integer: true, min: 1 }),
		top: sanitizePreviewNumber(scope.top, 'top', { integer: true, min: 1 }),
		rating: sanitizePreviewNumber(scope.rating, 'rating', { min: 0 }),
		time: normalizedTime,
		baseTime: normalizedBaseTime,
		minProgress: normalizedBaseTime,
		progress: normalizedTime
	};
}

function sanitizeWeightFormula(value: unknown) {
	if (typeof value !== 'string') {
		throw new WeightFormulaPreviewError('weightFormula must be a string');
	}

	const weightFormula = value.trim();

	if (!weightFormula.length) {
		throw new WeightFormulaPreviewError('weightFormula is required');
	}

	if (weightFormula.length > 500) {
		throw new WeightFormulaPreviewError('weightFormula must be at most 500 characters');
	}

	const node = validateWeightFormulaExpression(weightFormula);
	const compiledNode = node.compile();

	evaluateCompiledWeightFormula(compiledNode, WEIGHT_FORMULA_VALIDATION_SCOPE);

	return {
		formula: weightFormula,
		compiledNode
	};
}

export function createPreviewCustomListWeightFormula(formula: unknown) {
	const normalizedFormula = sanitizeWeightFormula(formula);

	return {
		formula: normalizedFormula.formula,
		evaluate(scope: PreviewCustomListWeightFormulaScope) {
			const normalizedScope = normalizePreviewScope(scope);

			return {
				formula: normalizedFormula.formula,
				input: normalizedScope,
				output: evaluateCompiledWeightFormula(normalizedFormula.compiledNode, normalizedScope)
			};
		}
	};
}

export function previewCustomListWeightFormula(
	formula: unknown,
	scope: PreviewCustomListWeightFormulaScope
) {
	return createPreviewCustomListWeightFormula(formula).evaluate(scope);
}