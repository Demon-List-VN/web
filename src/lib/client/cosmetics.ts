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

function hexToHslChannels(color: string): string | null {
    const match = color
        .trim()
        .match(/^#([\da-f]{3}|[\da-f]{6})$/i);

    if (!match) {
        return null;
    }

    const hex = match[1].length === 3
        ? match[1]
            .split('')
            .map((character) => character.repeat(2))
            .join('')
        : match[1];
    const red = parseInt(hex.slice(0, 2), 16) / 255;
    const green = parseInt(hex.slice(2, 4), 16) / 255;
    const blue = parseInt(hex.slice(4, 6), 16) / 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const delta = max - min;
    const lightness = (max + min) / 2;
    let hue = 0;

    if (delta !== 0) {
        if (max === red) {
            hue = ((green - blue) / delta) % 6;
        } else if (max === green) {
            hue = (blue - red) / delta + 2;
        } else {
            hue = (red - green) / delta + 4;
        }

        hue *= 60;

        if (hue < 0) {
            hue += 360;
        }
    }

    const saturation = delta === 0
        ? 0
        : delta / (1 - Math.abs(2 * lightness - 1));

    return `${hue.toFixed(1)} ${(saturation * 100).toFixed(1)}% ${
        (lightness * 100).toFixed(1)
    }%`;
}

export function getProfileThemeVariables(
    theme: Cosmetic | null | undefined
): string {
    if (!theme) {
        return '';
    }

    const styles: string[] = [];
    const background = theme.bgColor ? hexToHslChannels(theme.bgColor) : null;
    const border = theme.borderColor ? hexToHslChannels(theme.borderColor) : null;

    if (background) {
        styles.push(`--card: ${background}`);
        styles.push('--card-foreground: 0 0% 100%');
    }

    if (border) {
        styles.push(`--border: ${border}`);
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
