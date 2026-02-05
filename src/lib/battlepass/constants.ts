// Battle Pass Constants
export const XP_PER_TIER = 100;
export const MAX_TIER = 100;
export const PREMIUM_PRICE = 149000; // VND

// Difficulty colors for map packs
export const DIFFICULTY_COLORS: Record<string, string> = {
	easier: '#22c55e',
	harder: '#f97316',
	medium_demon: '#ef4444',
	insane_demon: '#a855f7',
	extreme_demon: '#dc2626'
};

// Difficulty display names
export const DIFFICULTY_NAMES: Record<string, string> = {
	easier: 'Easier',
	harder: 'Harder',
	medium_demon: 'Medium Demon',
	insane_demon: 'Insane Demon',
	extreme_demon: 'Extreme Demon'
};

// Mission refresh type options
export const MISSION_REFRESH_TYPES = [
	{ value: 'none', label: 'No Refresh', description: 'Mission does not reset automatically' },
	{ value: 'daily', label: 'Daily', description: 'Resets every day at 0:00 AM UTC+7' },
	{ value: 'weekly', label: 'Weekly', description: 'Resets every Monday at 0:00 AM UTC+7' }
];

// Mission condition types documentation
export const MISSION_CONDITION_TYPES = [
	{
		type: 'clear_level',
		description: 'Clear a specific level',
		example: { type: 'clear_level', targetId: 123456 }
	},
	{
		type: 'clear_mappack',
		description: 'Clear a specific map pack',
		example: { type: 'clear_mappack', targetId: 1 }
	},
	{
		type: 'reach_tier',
		description: 'Reach a specific tier',
		example: { type: 'reach_tier', value: 50 }
	},
	{
		type: 'earn_xp',
		description: 'Earn a total amount of XP',
		example: { type: 'earn_xp', value: 1000 }
	},
	{
		type: 'clear_level_count',
		description: 'Clear any number of levels',
		example: { type: 'clear_level_count', value: 5 }
	},
	{
		type: 'clear_mappack_count',
		description: 'Clear any number of map packs',
		example: { type: 'clear_mappack_count', value: 3 }
	}
];

// Map Pack difficulty options
export const MAP_PACK_DIFFICULTY_OPTIONS = [
	{ value: 'easier', label: 'Easier' },
	{ value: 'harder', label: 'Harder' },
	{ value: 'medium_demon', label: 'Medium Demon' },
	{ value: 'insane_demon', label: 'Insane Demon' }
];
