export type ApiObject = Record<string, unknown>;

export type ApiListResponse = ApiObject[];

export type ApiFetch = typeof globalThis.fetch;

export interface PlayerSummary extends ApiObject {
	uid: string;
	name: string;
	supporterUntil?: string | null;
}

export interface EventData extends ApiObject {
	players: PlayerSummary[];
	bracket: Array<string | PlayerSummary>;
}

export interface EventResponse extends ApiObject {
	redirect?: string;
	data: EventData;
}

export interface Province extends ApiObject {
	name: string;
	wards: string[];
}

export type ProvinceMap = Record<string, Province>;

export interface SupporterProgress extends ApiObject {
	serverCostPercent: number;
	minecraftServerPercent: number;
}

export interface Rule extends ApiObject {
	type: string;
	lang: string;
	content: string;
}

export interface WikiDetail extends ApiObject {
	type: string;
	path: string;
	metadata?: Record<string, ApiObject>;
}

export interface GdBrowserLevel extends ApiObject {
	name: string;
	demonList?: unknown;
}

export interface PointercrateLevel extends ApiObject {
	video: string;
	requirement: number;
}

export interface MapPackWrapper extends ApiObject {
	id: number;
}

export interface StoreProduct extends ApiObject {
	id: number;
	name: string;
	description: string;
	price: number;
	imgCount: number;
	maxQuantity: number;
	stock: number | null;
	featured?: boolean;
	redirect?: string;
	bannerTextColor?: string;
}

export interface ListEntry extends ApiObject {
	dlTop?: number;
	flTop?: number;
	created_at?: number | string;
}

export interface LeaderboardEntry extends ApiObject {
	overallRank?: number;
	dlrank?: number;
	flrank?: number;
	plrank?: number;
	clrank?: number;
}
