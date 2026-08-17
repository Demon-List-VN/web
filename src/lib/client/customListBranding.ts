import { writable } from 'svelte/store';

export type CustomListBranding = {
    faviconUrl: string;
    logoUrl: string;
    bannerUrl: string;
    bannerPlacement: 'banner' | 'navigation';
    title: string;
} | null;

const customListBrandingStore = writable<CustomListBranding>(null);

function normalizeThemeAssetUrl(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
}

export const customListBranding = customListBrandingStore;

export function setCustomListBranding(
    value: {
        faviconUrl?: unknown;
        logoUrl?: unknown;
        bannerUrl?: unknown;
        bannerPlacement?: unknown;
        title?: unknown;
    } | null
) {
    if (!value) {
        customListBrandingStore.set(null);

        return;
    }

    customListBrandingStore.set({
        faviconUrl: normalizeThemeAssetUrl(value.faviconUrl),
        logoUrl: normalizeThemeAssetUrl(value.logoUrl),
        bannerUrl: normalizeThemeAssetUrl(value.bannerUrl),
        bannerPlacement: value.bannerPlacement === 'navigation' ? 'navigation' : 'banner',
        title: normalizeThemeAssetUrl(value.title)
    });
}

export function clearCustomListBranding() {
    customListBrandingStore.set(null);
}
