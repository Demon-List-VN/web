export type MirrorCrawlCounters = {
	processed: number;
	inserted: number;
	updated: number;
	unchanged: number;
	failed: number;
};

export type MirrorCrawlResult<TList> = MirrorCrawlCounters & {
	source: {
		name: string;
		mirrorListId: number;
		fetched?: number;
		pages?: number;
	};
	removed: number;
	sourceLevelCount: number;
	list: TList;
	failures?: Array<{
		levelId: number;
		position: number;
		name: string;
		error: string;
	}>;
};

type MirrorCrawlerOptions = {
	apiUrl: string;
	listId: number;
	getToken: () => string | undefined | Promise<string | undefined>;
	fetcher?: typeof fetch;
	failedMessage?: string;
};

async function getAuthorizationHeader(options: MirrorCrawlerOptions) {
	const token = await options.getToken();

	if (!token) {
		throw new Error(options.failedMessage || 'Failed to crawl mirror list');
	}

	return `Bearer ${token}`;
}

export async function crawlMirrorList<TList>(
	options: MirrorCrawlerOptions
): Promise<MirrorCrawlResult<TList>> {
	const fetcher = options.fetcher ?? fetch;
	const res = await fetcher(`${options.apiUrl}/lists/${options.listId}/crawl`, {
		method: 'POST',
		headers: {
			Authorization: await getAuthorizationHeader(options),
			'Content-Type': 'application/json'
		}
	});
	const payload = await res.json().catch(() => null);

	if (!res.ok) {
		throw new Error(payload?.error || options.failedMessage || 'Failed to crawl mirror list');
	}

	return payload as MirrorCrawlResult<TList>;
}
