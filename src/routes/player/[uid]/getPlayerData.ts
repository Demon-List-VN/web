import type {
    PlayerListRecordEntry,
    PlayerListRecordsResponse,
    PlayerRankedListSummary
} from '$lib/types/playerRankedList';
import { resolvePlayerRankedListSelection } from '$lib/types/playerRankedList';
import { normalizePvpMatches } from '$lib/client/pvp';

const emptyRecordsResponse = (): PlayerListRecordsResponse => ({
    list: null,
    data: [],
    total: 0,
    lastRefreshedAt: null
});

function normalizePlayerRecords(value: unknown, uid: string): PlayerListRecordEntry[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.map((record: any) => ({
        id: Number.isFinite(Number(record.id)) ? Number(record.id) : null,
        uid: record.userid ?? record.uid ?? uid,
        levelId: Number(
            record.levelid ?? record.levelId ?? record.levels?.id ?? record.level?.id ?? 0
        ),
        point: typeof record.point === 'number' ? record.point : null,
        no: Number.isFinite(Number(record.no)) ? Number(record.no) : null,
        createdAt: record.createdAt ?? null,
        progress: Number(record.progress ?? 0),
        timestamp: Number.isFinite(Number(record.timestamp)) ? Number(record.timestamp) : null,
        acceptedManually: Boolean(record.acceptedManually),
        acceptedAuto: Boolean(record.acceptedAuto),
        sourceRoles: Array.isArray(record.sourceRoles) ? record.sourceRoles : undefined,
        mobile: record.mobile ?? null,
        refreshRate: record.refreshRate ?? null,
        rankedList: record.rankedList ?? null,
        level: record.levels ?? record.level ?? null,
        player: record.players ?? record.player ?? null,
        formulaScope: record.formulaScope ?? null
    }));
}

function normalizeListRecordsResponse(value: unknown): PlayerListRecordsResponse {
    if (!value || typeof value !== 'object') {
        return emptyRecordsResponse();
    }

    const response = value as Partial<PlayerListRecordsResponse>;
    const data = Array.isArray(response.data)
        ? response.data.filter((record) =>
            Number.isFinite(Number(record.point)) && Number.isFinite(Number(record.no))
        )
        : [];

    return {
        list: response.list ?? null,
        data,
        total: typeof response.total === 'number' ? response.total : data.length,
        lastRefreshedAt:
            typeof response.lastRefreshedAt === 'string' || response.lastRefreshedAt === null
                ? response.lastRefreshedAt
                : null
    };
}

/**
 * Keep the route's critical path small: the profile and ranked-list summaries are
 * enough to render the header, sidebar, metadata and overview statistics.
 * Histories and record tables are hydrated after the first render.
 */
export async function getPlayerData(
    player: any,
    fetch: typeof globalThis.fetch,
    url: URL,
    preloadedListSummaries?: PlayerRankedListSummary[]
) {
    const listSummaries = preloadedListSummaries ?? await fetch(
        `${import.meta.env.VITE_API_URL}/players/${player.uid}/lists`
    )
        .then((response) => (response.ok ? response.json() : []))
        .catch(() => []) as PlayerRankedListSummary[];
    const selectedList = resolvePlayerRankedListSelection(
        listSummaries,
        url.searchParams.get('list')
    );

    return {
        player,
        pvpRequiredSubmission:
            player?.pvpRequiredSubmission ?? player?.pvp_required_submission ?? null,
        listSummaries,
        selectedList,
        playerRecords: emptyRecordsResponse(),
        selectedListRecords: emptyRecordsResponse(),
        allListRecords: null as PlayerListRecordsResponse | null,
        events: [] as any[],
        pvpMatches: [] as ReturnType<typeof normalizePvpMatches>,
        detailsLoaded: false
    };
}

/** Load secondary profile data without delaying the profile shell. */
export async function loadPlayerDetails(
    player: any,
    selectedList: PlayerRankedListSummary | null,
    fetcher: typeof globalThis.fetch = fetch
) {
    const selectedListUrl = selectedList
        ? `${import.meta.env.VITE_API_URL}/lists/${selectedList.id}/${
            selectedList.leaderboardMode === 'creator' ? 'contributions' : 'records'
        }?uid=${player.uid}&end=5000${
            selectedList.leaderboardMode === 'creator' ? '' : '&ignoreRecordSettings=true'
        }`
        : null;
    const [events, rawPlayerRecords, rawPvpMatches, rawSelectedListRecords] =
        await Promise.all([
            fetcher(`${import.meta.env.VITE_API_URL}/players/${player.uid}/events`)
                .then((response) => (response.ok ? response.json() : []))
                .catch(() => []),
            fetcher(`${import.meta.env.VITE_API_URL}/players/${player.uid}/records`)
                .then((response) => (response.ok ? response.json() : []))
                .catch(() => []),
            fetcher(
                `${import.meta.env.VITE_API_URL}/pvp/players/${
                    encodeURIComponent(player.uid)
                }/matches?limit=25`
            )
                .then((response) => (response.ok ? response.json() : []))
                .catch(() => []),
            selectedListUrl
                ? fetcher(selectedListUrl)
                    .then((response) => (response.ok ? response.json() : null))
                    .catch(() => null)
                : Promise.resolve(null)
        ]);
    const playerRecordData = normalizePlayerRecords(rawPlayerRecords, player.uid);

    return {
        playerRecords: {
            list: null,
            data: playerRecordData,
            total: playerRecordData.length,
            lastRefreshedAt: null
        } satisfies PlayerListRecordsResponse,
        selectedListRecords: normalizeListRecordsResponse(rawSelectedListRecords),
        events: Array.isArray(events) ? events : [],
        pvpMatches: normalizePvpMatches(rawPvpMatches),
        detailsLoaded: true
    };
}
