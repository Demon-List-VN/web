export type CosmeticType = 'avatarFrame' | 'profileTheme';

export interface Cosmetic {
    itemId: number;
    type: CosmeticType;
    avatarWidth: number | null;
    bgColor: string | null;
    borderColor: string | null;
    imageVersion: number;
}

export function frameImageUrl(cosmetic: Cosmetic): string {
    return `https://cdn.gdvn.net/cosmetics/frames/${cosmetic.itemId}.webp?version=${
        cosmetic.imageVersion ?? 0
    }`;
}

export function bannerImageUrl(cosmetic: Cosmetic): string {
    return `https://cdn.gdvn.net/cosmetics/banners/${cosmetic.itemId}.webp?version=${
        cosmetic.imageVersion ?? 0
    }`;
}

export function getThemeStyle(theme: Cosmetic | null | undefined): string {
    if (!theme) {
        return '';
    }

    const styles: string[] = [];

    if (theme.bgColor) {
        styles.push(`background-color: ${theme.bgColor}`);
        styles.push('color: white');
    }

    if (theme.borderColor) {
        styles.push(`border-color: ${theme.borderColor}`);
    }

    return styles.join('; ');
}

export function getEquippedFrame(player: any): Cosmetic | null {
    return player?.equippedFrameData ?? null;
}

export function getEquippedTheme(player: any): Cosmetic | null {
    return player?.equippedThemeData ?? null;
}

export async function equipCosmetic(
    token: string,
    type: CosmeticType,
    itemId: number | null
) {
    const response = await fetch(
        `${import.meta.env.VITE_API_URL}/cosmetics/equip`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ type, itemId })
        }
    );

    if (!response.ok) {
        let message = 'Failed to equip cosmetic';

        try {
            const body = await response.json();

            if (body?.message) {
                message = body.message;
            }
        } catch {
            // keep default message
        }

        throw new Error(message);
    }

    return await response.json();
}
