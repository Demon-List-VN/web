export type CommunityCacheEntry = {
	posts: unknown[];
	total: number;
	offset: number;
	hasMore: boolean;
	activeType: string | null;
	sortMode: 'newest' | 'best' | 'recommended';
	searchQuery: string;
	scrollY: number;
};

let cached: CommunityCacheEntry | null = null;

export function getCommunityCache(): CommunityCacheEntry | null {
	return cached;
}

export function setCommunityCache(entry: CommunityCacheEntry): void {
	cached = entry;
}

export function clearCommunityCache(): void {
	cached = null;
}
