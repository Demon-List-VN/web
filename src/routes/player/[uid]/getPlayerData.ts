import type {
    PlayerListRecordEntry,
    PlayerListRecordsResponse,
    PlayerRankedListSummary
} from '$lib/types/playerRankedList';
import { resolvePlayerRankedListSelection } from '$lib/types/playerRankedList';
import { normalizePvpMatches } from '$lib/client/pvp';

function normalizePlayerListRecordsResponse(
    value: unknown,
    fallback: PlayerListRecordsResponse
): PlayerListRecordsResponse {
    if (!value || typeof value !== 'object') {
        return fallback;
    }

    const response = value as Partial<PlayerListRecordsResponse>;
    const data = Array.isArray(response.data)
        ? response.data.filter(hasListLeaderboardRecordEntry)
        : fallback.data;

    return {
        list: response.list ?? fallback.list,
        data,
        total: data.length,
        lastRefreshedAt:
            typeof response.lastRefreshedAt === 'string' || response.lastRefreshedAt === null
                ? response.lastRefreshedAt
                : fallback.lastRefreshedAt
    };
}

function hasListLeaderboardRecordEntry(record: PlayerListRecordEntry) {
    return Number.isFinite(Number(record.point)) && Number.isFinite(Number(record.no));
}

function normalizePlayerRecords(value: unknown, uid: string): PlayerListRecordEntry[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.map((record: any) => {
        return {
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
            mobile: record.mobile ?? null,
            refreshRate: record.refreshRate ?? null,
            rankedList: record.rankedList ?? null,
            level: record.levels ?? record.level ?? null,
            player: record.players ?? record.player ?? null,
            formulaScope: record.formulaScope ?? null
        };
    });
}

export async function getPlayerData(player: any, fetch: any, url: URL) {
    const emptyRecordsResponse: PlayerListRecordsResponse = {
        list: null,
        data: [],
        total: 0,
        lastRefreshedAt: null
    };

    const [listSummaries, events, rawPlayerRecords, rawPvpMatches] = await Promise.all([
        (await fetch(`${import.meta.env.VITE_API_URL}/players/${player.uid}/lists`))
            .json() as Promise<
            PlayerRankedListSummary[]
        >,
        (await fetch(`${import.meta.env.VITE_API_URL}/players/${player.uid}/events`))
            .json() as Promise<
            any[]
        >,
        fetch(`${import.meta.env.VITE_API_URL}/players/${player.uid}/records`)
            .then((response: Response) => (response.ok ? response.json() : []))
            .catch(() => []),
        fetch(
            `${import.meta.env.VITE_API_URL}/pvp/players/${
                encodeURIComponent(player.uid)
            }/matches?limit=25`
        )
            .then((response: Response) => (response.ok ? response.json() : []))
            .catch(() => [])
    ]);

    const playerRecordData = normalizePlayerRecords(rawPlayerRecords, player.uid);
    const playerRecords: PlayerListRecordsResponse = {
        list: null,
        data: playerRecordData,
        total: playerRecordData.length,
        lastRefreshedAt: null
    };

    const selectedList = resolvePlayerRankedListSelection(
        listSummaries,
        url.searchParams.get('list')
    );
    const listRecordResponses = await Promise.all(
        listSummaries.map(async (listSummary) => {
            let response = emptyRecordsResponse;

            try {
                const rawResponse = await (
                    await fetch(
                        `${import.meta.env.VITE_API_URL}/lists/${listSummary.id}/records?uid=${player.uid}&end=5000&ignoreRecordSettings=true`
                    )
                ).json();
                response = normalizePlayerListRecordsResponse(rawResponse, emptyRecordsResponse);
            } catch {
                response = emptyRecordsResponse;
            }

            return {
                listSummary,
                response
            };
        })
    );

    const selectedListRecords: PlayerListRecordsResponse = selectedList
        ? listRecordResponses.find(({ listSummary }) => listSummary.id === selectedList.id)
            ?.response
            || emptyRecordsResponse
        : emptyRecordsResponse;

    const allListRecordData = listRecordResponses
        .flatMap(({ listSummary, response }) =>
            response.data.map((record) => ({
                ...record,
                rankedList: {
                    id: listSummary.id,
                    identifier: listSummary.identifier,
                    title: listSummary.title,
                    isPlatformer: listSummary.isPlatformer
                }
            }))
        )
        .sort((left, right) => {
            const createdAtDiff = new Date(right.createdAt ?? 0)
                .getTime()
                - new Date(left.createdAt ?? 0)
                    .getTime();

            if (createdAtDiff !== 0) {
                return createdAtDiff;
            }

            const timestampDiff = (right.timestamp ?? 0) - (left.timestamp ?? 0);

            if (timestampDiff !== 0) {
                return timestampDiff;
            }

            return (right.point ?? 0) - (left.point ?? 0);
        });

    const allListRecords: PlayerListRecordsResponse = {
        list: null,
        data: allListRecordData,
        total: allListRecordData.length,
        lastRefreshedAt: listRecordResponses.reduce<string | null>((latest, { response }) => {
            if (!response.lastRefreshedAt) {
                return latest;
            }

            if (!latest || response.lastRefreshedAt > latest) {
                return response.lastRefreshedAt;
            }

            return latest;
        }, null)
    };

    return {
        player,
        pvpRequiredSubmission: player?.pvpRequiredSubmission ?? player?.pvp_required_submission ?? null,
        listSummaries,
        selectedList,
        playerRecords,
        selectedListRecords,
        allListRecords,
        events,
        pvpMatches: normalizePvpMatches(rawPvpMatches)
    };
}
