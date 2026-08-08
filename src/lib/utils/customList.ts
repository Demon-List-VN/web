export const BUILT_IN_LIST_SLUGS = new Set(['dl', 'pl', 'cl', 'fl']);

export function isBuiltInList(list: { slug?: string | null; } | null | undefined) {
    return Boolean(list?.slug && BUILT_IN_LIST_SLUGS.has(list.slug));
}
