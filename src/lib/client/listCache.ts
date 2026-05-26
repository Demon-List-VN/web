export type ListCacheEntry = {
    levels: unknown[];
    curPage: number;
};

const cache = new Map<string, ListCacheEntry>();

export function getListCache(key: string): ListCacheEntry | undefined {
    return cache.get(key);
}

export function setListCache(key: string, value: ListCacheEntry): void {
    cache.set(key, value);
}

export function clearListCache(key?: string): void {
    if (key) {
        cache.delete(key);
    } else {
        cache.clear();
    }
}
