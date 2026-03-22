import { writable } from 'svelte/store';

export interface SubmitState {
	type: 'record' | 'level';
	step: number;
	direction: 1 | -1; // for transition direction

	// Record fields
	levelid: number;
	progress: number;
	refreshRate: string;
	videoLink: string;
	raw: string;
	mobile: { value: boolean; label: string } | null;
	suggestedRating: number;
	comment: string;
	time: { m: number | null; s: number | null; ms: number | null };

	// Level submission fields
	levelSubmission: {
		levelId: number;
		comment: string;
		videoLink: string;
	};

	// Fetched data
	apiLevel: any;
	level: any;
	levelVariants: any[];
	selectedVariantId: number | null;

	// Submission result
	sendStatus: 0 | 1 | 2; // 0 = loading, 1 = success, 2 = error
	errorMessage: string;
	errorResponse: string;
	submitLog: string[];
	submitId: number;
}

export function createDefaultState(uid: string): SubmitState {
	return {
		type: 'record',
		step: 0,
		direction: 1,
		levelid: NaN,
		progress: NaN,
		refreshRate: '',
		videoLink: '',
		raw: '',
		mobile: null,
		suggestedRating: NaN,
		comment: '',
		time: { m: null, s: null, ms: null },
		levelSubmission: { levelId: NaN, comment: '', videoLink: '' },
		apiLevel: null,
		level: null,
		levelVariants: [],
		selectedVariantId: null,
		sendStatus: 0,
		errorMessage: '',
		errorResponse: '',
		submitLog: [],
		submitId: 0
	};
}

export const RECORD_STEPS = ['Type', 'Level', 'Confirm', 'Details', 'Optional'];
export const LEVEL_STEPS = ['Type', 'Level', 'Details'];

export function getSteps(type: 'record' | 'level') {
	return type === 'level' ? LEVEL_STEPS : RECORD_STEPS;
}

// YouTube utilities
export function extractYouTubeVideoId(url: string): string | null {
	const patterns = [
		/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
		/^([a-zA-Z0-9_-]{11})$/
	];
	for (const pattern of patterns) {
		const match = url.match(pattern);
		if (match) return match[1];
	}
	return null;
}

export function isValidYouTubeLink(url: string): boolean {
	return extractYouTubeVideoId(url) !== null;
}

export function getMs(time: { m: number | null; s: number | null; ms: number | null }) {
	return (
		parseInt(String(time.m || 0)) * 60000 +
		parseInt(String(time.s || 0)) * 1000 +
		parseInt(String(time.ms || 0))
	);
}

export function validTime(time: { m: number | null; s: number | null; ms: number | null }) {
	if (time.m == null || time.s == null || time.ms == null) return false;
	if (time.m < 0 || time.s < 0 || time.ms < 0) return false;
	if (time.s >= 60 || time.ms >= 1000) return false;
	return true;
}
