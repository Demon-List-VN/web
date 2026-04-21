export type LevelCardTag = {
	name: string;
	color?: string | null;
};

export type LevelCardRecord = {
	isChecked: boolean;
	progress: number;
};

export type LevelCardProps = {
	type: string;
	borderColor?: string | null;
	top?: number | null;
	hideTop?: boolean;
	hideRating?: boolean;
	loading?: boolean;
	ratingPrediction?: boolean;
	id?: number | string | null;
	videoID?: string | null;
	name?: string | null;
	rating?: number | null;
	minProgress?: number | null;
	creator?: string | null;
	creatorId?: number | string | null;
	creatorData?: any;
	tags?: LevelCardTag[];
	record?: LevelCardRecord | null;
	isPlatformer?: boolean;
};

type LevelCardTagSource =
	| LevelCardTag
	| {
			levelTags?: LevelCardTag | null;
	  }
	| null
	| undefined;

export type LevelCardSource = Omit<
	LevelCardProps,
	'type' | 'top' | 'hideTop' | 'hideRating' | 'loading' | 'tags'
> & {
	flPt?: number | null;
	dlTop?: number | null;
	flTop?: number | null;
	levelsTags?: LevelCardTagSource[] | null;
};

type LevelCardDataProps = Omit<LevelCardProps, 'type' | 'hideTop' | 'loading'>;

function normalizeTags(levelsTags?: LevelCardTagSource[] | null): LevelCardTag[] {
	return (levelsTags || [])
		.map((tag) => {
			if (!tag) {
				return null;
			}

			return 'levelTags' in tag ? tag.levelTags || null : tag;
		})
		.filter(Boolean) as LevelCardTag[];
}

export function toLevelCardProps(
	level: LevelCardSource,
	type: LevelCardProps['type'],
	overrides: Partial<LevelCardDataProps> = {}
): LevelCardDataProps {
	return {
		id: level.id ?? null,
		videoID: level.videoID ?? null,
		name: level.name ?? null,
		rating: type == 'fl' ? (level.flPt ?? null) : (level.rating ?? null),
		top: type == 'fl' ? (level.flTop ?? null) : (level.dlTop ?? null),
		minProgress: level.minProgress ?? null,
		creator: level.creator ?? null,
		creatorId: level.creatorId ?? null,
		creatorData: level.creatorData ?? null,
		tags: normalizeTags(level.levelsTags),
		record: level.record ?? null,
		isPlatformer: level.isPlatformer ?? false,
		...overrides
	};
}