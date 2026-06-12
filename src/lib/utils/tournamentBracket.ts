export function bracketSeedOrder(size: number) {
    let order = [1];

    while (order.length < size) {
        const next: number[] = [];
        const doubled = order.length * 2;

        for (const seed of order) {
            next.push(seed, doubled + 1 - seed);
        }

        order = next;
    }

    return order;
}

export function autoFillTournamentSlots(participants: any[], size: number) {
    const sorted = [...participants].sort((a, b) => {
        const eloDifference =
            Number(b.eloAtRegistration ?? 1500) - Number(a.eloAtRegistration ?? 1500);

        if (eloDifference) {
            return eloDifference;
        }

        const aJoined = String(a.joinedAt ?? a.created_at ?? '');
        const bJoined = String(b.joinedAt ?? b.created_at ?? '');
        const joinedDifference = aJoined.localeCompare(bJoined);

        return joinedDifference || String(a.uid)
            .localeCompare(String(b.uid));
    });
    const seedOrder = bracketSeedOrder(size);

    return seedOrder.map((seed) => sorted[seed - 1]?.uid ?? null);
}

export function changeTournamentSlot(
    slots: Array<string | null>,
    index: number,
    nextUid: string | null
) {
    const next = [...slots];
    const previousUid = next[index] ?? null;

    if (nextUid) {
        const existingIndex = next.indexOf(nextUid);

        if (existingIndex >= 0 && existingIndex !== index) {
            next[existingIndex] = previousUid;
        }
    }

    next[index] = nextUid;

    return next;
}
