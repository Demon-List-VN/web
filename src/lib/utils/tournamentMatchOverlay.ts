export type TournamentMatchOverlaySide = {
    uid: string | null;
    player: any;
    score: unknown;
};

function comparePlayerNames(
    left: TournamentMatchOverlaySide,
    right: TournamentMatchOverlaySide
) {
    const leftName = String(left.player?.name ?? left.uid ?? '')
        .trim();
    const rightName = String(right.player?.name ?? right.uid ?? '')
        .trim();
    const nameComparison = leftName.localeCompare(rightName, 'en', {
        numeric: true,
        sensitivity: 'base'
    });

    if (nameComparison !== 0) {
        return nameComparison;
    }

    return String(left.uid ?? '')
        .localeCompare(String(right.uid ?? ''), 'en', {
            numeric: true,
            sensitivity: 'base'
        });
}

export function getTournamentMatchOverlaySides(
    match: any
): [TournamentMatchOverlaySide, TournamentMatchOverlaySide] {
    const sides: [TournamentMatchOverlaySide, TournamentMatchOverlaySide] = [
        {
            uid: match?.player1Uid ? String(match.player1Uid) : null,
            player: match?.player1 ?? null,
            score: match?.score1
        },
        {
            uid: match?.player2Uid ? String(match.player2Uid) : null,
            player: match?.player2 ?? null,
            score: match?.score2
        }
    ];

    if (
        !sides[0].player
        || !sides[1].player
        || comparePlayerNames(sides[0], sides[1]) <= 0
    ) {
        return sides;
    }

    return [sides[1], sides[0]];
}
