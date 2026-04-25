export type PointercrateMirrorCrawlCounters = {
	processed: number;
	inserted: number;
	updated: number;
	unchanged: number;
	failed: number;
};

export const POINTERCRATE_MIRROR_LIST_ID = 109;

export function isPointercrateMirrorList(list: { id: number } | null | undefined) {
	return list?.id === POINTERCRATE_MIRROR_LIST_ID;
}

type PointercrateMirrorCrawlPageResult = PointercrateMirrorCrawlCounters & {
	source: {
		name: 'pointercrate';
		mirrorListId: number;
		after: number;
		limit: number;
		nextAfter: number | null;
		hasMore: boolean;
		fetched: number;
	};
	sourceLevelIds: number[];
	failures?: Array<{
		levelId: number;
		position: number;
		name: string;
		error: string;
	}>;
};

type PointercrateMirrorCrawlFinalizeResult<TList> = {
	removed: number;
	list: TList;
};

export type PointercrateMirrorCrawlResult<TList> = PointercrateMirrorCrawlCounters & {
	removed: number;
	pages: number;
	sourceLevelCount: number;
	list: TList;
};

type PointercrateMirrorCrawlerOptions = {
	apiUrl: string;
	listId: number;
	getToken: () => string | undefined | Promise<string | undefined>;
	fetcher?: typeof fetch;
	maxPages?: number;
	failedMessage?: string;
	pageLimitMessage?: string;
};

const DEFAULT_MAX_POINTERCRATE_MIRROR_CRAWL_PAGES = 100;

async function getAuthorizationHeader(options: PointercrateMirrorCrawlerOptions) {
	const token = await options.getToken();

	if (!token) {
		throw new Error(options.failedMessage || 'Failed to crawl Pointercrate mirror');
	}

	return `Bearer ${token}`;
}

async function requestPointercrateMirrorCrawlPage(
	options: PointercrateMirrorCrawlerOptions,
	after: number
) {
	const fetcher = options.fetcher ?? fetch;
	const res = await fetcher(`${options.apiUrl}/lists/${options.listId}/crawl/pointercrate`, {
		method: 'POST',
		headers: {
			Authorization: await getAuthorizationHeader(options),
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ after })
	});
	const payload = await res.json().catch(() => null);

	if (!res.ok) {
		throw new Error(
			payload?.error || options.failedMessage || 'Failed to crawl Pointercrate mirror'
		);
	}

	return payload as PointercrateMirrorCrawlPageResult;
}

async function requestPointercrateMirrorCrawlFinalize<TList>(
	options: PointercrateMirrorCrawlerOptions,
	sourceLevelIds: number[],
	summary: PointercrateMirrorCrawlCounters
) {
	const fetcher = options.fetcher ?? fetch;
	const res = await fetcher(
		`${options.apiUrl}/lists/${options.listId}/crawl/pointercrate/finalize`,
		{
			method: 'POST',
			headers: {
				Authorization: await getAuthorizationHeader(options),
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ sourceLevelIds, summary })
		}
	);
	const payload = await res.json().catch(() => null);

	if (!res.ok) {
		throw new Error(
			payload?.error || options.failedMessage || 'Failed to crawl Pointercrate mirror'
		);
	}

	return payload as PointercrateMirrorCrawlFinalizeResult<TList>;
}

export async function crawlPointercrateMirrorList<TList>(
	options: PointercrateMirrorCrawlerOptions
): Promise<PointercrateMirrorCrawlResult<TList>> {
	const maxPages = options.maxPages ?? DEFAULT_MAX_POINTERCRATE_MIRROR_CRAWL_PAGES;
	const sourceLevelIds = new Set<number>();
	const totals: PointercrateMirrorCrawlCounters = {
		processed: 0,
		inserted: 0,
		updated: 0,
		unchanged: 0,
		failed: 0
	};
	let after = 0;
	let pageCount = 0;
	let completed = false;

	while (pageCount < maxPages) {
		const pageResult = await requestPointercrateMirrorCrawlPage(options, after);
		pageCount += 1;

		totals.processed += pageResult.processed;
		totals.inserted += pageResult.inserted;
		totals.updated += pageResult.updated;
		totals.unchanged += pageResult.unchanged;
		totals.failed += pageResult.failed;

		for (const levelId of pageResult.sourceLevelIds) {
			sourceLevelIds.add(levelId);
		}

		if (!pageResult.source.hasMore || pageResult.source.nextAfter == null) {
			completed = true;
			break;
		}

		after = pageResult.source.nextAfter;
	}

	if (!completed) {
		throw new Error(options.pageLimitMessage || 'Pointercrate crawl stopped after too many pages.');
	}

	const finalized = await requestPointercrateMirrorCrawlFinalize<TList>(
		options,
		[...sourceLevelIds],
		totals
	);

	return {
		...totals,
		removed: finalized.removed,
		pages: pageCount,
		sourceLevelCount: sourceLevelIds.size,
		list: finalized.list
	};
}
