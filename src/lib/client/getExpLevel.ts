interface ExpLevel {
    level: number;
    lowerBound: number;
    upperBound: number;
    progress: number;
}

export function getExpLevel(exp: number) {
    const normalizedExp = Math.max(0, Math.floor(Number(exp) || 0));
    const level = Math.floor(normalizedExp / 100) + 1;
    const lowerBound = (level - 1) * 100;
    const upperBound = level * 100;
    const res: ExpLevel = {
        level,
        lowerBound,
        upperBound,
        progress: 0
    };

    res.progress = Math.round(
        ((normalizedExp - res.lowerBound) / (res.upperBound - res.lowerBound)) * 1000
    )
        / 10;

    return res;
}
