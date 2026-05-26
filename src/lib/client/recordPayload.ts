const RECORD_UPDATE_FIELDS = [
    'id',
    'userid',
    'levelid',
    'progress',
    'refreshRate',
    'mobile',
    'videoLink',
    'raw',
    'timestamp',
    'acceptedManually',
    'acceptedAuto',
    'needMod',
    'queueNo',
    'reviewer',
    'reviewerComment',
    'suggestedRating',
    'prioritizedBy',
    'no',
    'dlPt',
    'flPt',
    'plPt',
    'clPt',
    'comment'
] as const;

export function pickRecordUpdatePayload(record: Record<string, unknown>) {
    return Object.fromEntries(
        RECORD_UPDATE_FIELDS.filter((field) => field in record)
            .map((
                field
            ) => [field, record[field]])
    );
}
