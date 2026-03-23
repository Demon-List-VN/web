export interface CardPreviewData {
    playerUID: string;
    playerName: string;
    clanTag?: string | null;
    clanTagBg?: string | null;
    clanTagText?: string | null;
    levelName: string;
    creator?: string | null;
    progress?: number | null;
    bgImage: string;
    avatarImage?: string | null;
    template: 1 | 2 | 3;
}
