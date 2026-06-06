export type PvpDifficulty = 'easy' | 'medium' | 'hard';
export type PvpMode = 'classic' | 'platformer';
export type PvpSelectionMode = PvpMode | 'event';
export type PvpPlayMode = 'normal' | 'practice';
export type PvpRoomVisibility = 'public' | 'private';
export type PvpRoomCompletionRuleType = 'count' | 'percentage';
export type PvpRoomScoringMode = 'progress' | 'score' | 'hp' | 'powerup';
export type PvpPowerupSkill =
    | 'flashbang'
    | 'invisible'
    | 'shield'
    | 'pause'
    | 'double_click'
    | 'force_reset';
export type PvpMatchReportTargetType = 'player' | 'level';

export type PvpPowerupState = {
    matchId: number;
    uid: string;
    mana: number;
    maxMana: number;
    shieldExpiresAt?: string | null;
    shieldCharges?: number;
    shieldActive?: boolean;
    playerMana: Array<{
        uid: string;
        mana: number;
        maxMana: number;
    }>;
    skills?: Array<{
        skill: PvpPowerupSkill;
        cost: number;
        durationMs: number;
        effect: string;
        harmful: boolean;
    }>;
};

export type PvpMatchStatus =
    | 'pending'
    | 'ban_pick'
    | 'in_progress'
    | 'waiting_result'
    | 'completed'
    | 'cancelled'
    | 'disputed'
    | string;

export type PvpInviteStatus =
    | 'pending'
    | 'accepted'
    | 'declined'
    | 'expired'
    | 'cancelled'
    | string;
export type PvpQueueStatus =
    | 'idle'
    | 'searching'
    | 'matching'
    | 'matched'
    | 'cancelled'
    | 'expired'
    | string;
export type PvpPlayerMatchReportReason = 'cheating' | 'abusive_communication' | 'other';
export type PvpLevelMatchReportReason =
    | 'too_easy'
    | 'too_difficult'
    | 'level_deleted'
    | 'secret_way'
    | 'unenjoyable'
    | 'other';
export type PvpMatchReportReason = PvpPlayerMatchReportReason | PvpLevelMatchReportReason;

export type PvpPlayer = {
    uid?: string;
    id?: string;
    name?: string | null;
    pvpRating?: number | null;
    pvp_rating?: number | null;
    pvpRatedMatchCount?: number | null;
    pvp_rated_match_count?: number | null;
    pvpStartingRating?: number | null;
    pvpRatingInitializedAt?: string | null;
    pvpRatingDeviation?: number | null;
    pvp_rating_deviation?: number | null;
    pvpRatingVolatility?: number | null;
    pvp_rating_volatility?: number | null;
    pvpPlatformerRating?: number | null;
    pvp_platformer_rating?: number | null;
    pvpPlatformerRatedMatchCount?: number | null;
    pvp_platformer_rated_match_count?: number | null;
    pvpPlatformerStartingRating?: number | null;
    pvp_platformer_starting_rating?: number | null;
    pvpPlatformerRatingInitializedAt?: string | null;
    pvp_platformer_rating_initialized_at?: string | null;
    pvpPlatformerRatingDeviation?: number | null;
    pvp_platformer_rating_deviation?: number | null;
    pvpPlatformerRatingVolatility?: number | null;
    pvp_platformer_rating_volatility?: number | null;
    anonymous?: boolean;
    isAnonymous?: boolean;
    anonymousRevealAfterMatchEnd?: boolean;
    anonymous_reveal_after_match_end?: boolean;
    avatarVersion?: number;
    isAvatarGif?: boolean;
    supporterUntil?: string | null;
    exp?: number | null;
    extraExp?: number | null;
    clan?: number | null;
    clans?: Record<string, unknown> | null;
    [key: string]: unknown;
};

export type PvpLevel = {
    id?: number;
    levelId?: number;
    levelID?: number;
    level_id?: number;
    ID?: number;
    name?: string | null;
    creator?: string | null;
    author?: string | null;
    difficulty?: string | null;
    rating?: number | null;
    listPosition?: number | null;
    videoID?: string | null;
    minProgress?: number | null;
    [key: string]: unknown;
};

export type PvpResult = {
    uid?: string;
    userId?: string;
    playerId?: string;
    progress?: number | null;
    bestProgress?: number | null;
    deathCount?: number[] | number | null;
    death_count?: number[] | number | null;
    timeReachedMs?: number | null;
    timeReachedProgress?: number | null;
    time_reached_progress?: number | null;
    submittedAt?: string | null;
    submitted_at?: string | null;
    completedAt?: string | null;
    completed_at?: string | null;
    player?: PvpPlayer | null;
    players?: PvpPlayer | null;
    anonymous?: boolean;
    isAnonymous?: boolean;
    is_anonymous?: boolean;
    anonymousRevealAfterMatchEnd?: boolean;
    anonymous_reveal_after_match_end?: boolean;
    [key: string]: unknown;
};

export type PvpParticipant = {
    uid?: string;
    userId?: string;
    playerId?: string;
    player?: PvpPlayer | null;
    players?: PvpPlayer | null;
    anonymous?: boolean;
    isAnonymous?: boolean;
    is_anonymous?: boolean;
    anonymousRevealAfterMatchEnd?: boolean;
    anonymous_reveal_after_match_end?: boolean;
    result?: PvpResult | null;
    progress?: number | null;
    bestProgress?: number | null;
    deathCount?: number[] | number | null;
    death_count?: number[] | number | null;
    timeReachedMs?: number | null;
    timeReachedProgress?: number | null;
    acceptedAt?: string | null;
    accepted_at?: string | null;
    pvpRatingBefore?: number | null;
    pvp_rating_before?: number | null;
    pvpRatingAfter?: number | null;
    pvp_rating_after?: number | null;
    pvpRatingDiff?: number | null;
    pvp_rating_diff?: number | null;
    pvpRating?: number | null;
    pvp_rating?: number | null;
    pvpRatedMatchCount?: number | null;
    pvp_rated_match_count?: number | null;
    pvpRatingDeviation?: number | null;
    pvp_rating_deviation?: number | null;
    [key: string]: unknown;
};

export type PvpBanPickAction = {
    id?: number | string;
    matchId?: number | string;
    uid?: string | null;
    levelId?: number;
    turnIndex?: number;
    auto?: boolean;
    created_at?: string;
    level?: PvpLevel | null;
    [key: string]: unknown;
};

export type PvpBanPick = {
    poolLevelIds?: number[];
    poolLevels?: PvpLevel[];
    actions?: PvpBanPickAction[];
    firstUid?: string | null;
    currentUid?: string | null;
    current_uid?: string | null;
    turnIndex?: number;
    turnStartsAt?: string | null;
    turnEndsAt?: string | null;
    completedAt?: string | null;
    remainingLevelIds?: number[];
    requiredCount?: number;
    totalBans?: number;
    [key: string]: unknown;
};

export type PvpEvent = {
    id?: number | string;
    title?: string;
    description?: string | null;
    bannerUrl?: string | null;
    banner_url?: string | null;
    listId?: number | string;
    list_id?: number | string;
    startsAt?: string | null;
    starts_at?: string | null;
    endsAt?: string | null;
    ends_at?: string | null;
    enabled?: boolean;
    levelSelectionMode?: 'random' | 'sbmm' | string;
    level_selection_mode?: 'random' | 'sbmm' | string;
    ranked?: boolean;
    isRanked?: boolean;
    is_ranked?: boolean;
    mode?: PvpMode | string;
    baseMode?: PvpMode | string;
    base_mode?: PvpMode | string;
    completionRuleType?: PvpRoomCompletionRuleType | string | null;
    completion_rule_type?: PvpRoomCompletionRuleType | string | null;
    completionRuleValue?: number | null;
    completion_rule_value?: number | null;
    scoringMode?: PvpRoomScoringMode | string | null;
    scoring_mode?: PvpRoomScoringMode | string | null;
    targetScore?: number | null;
    target_score?: number | null;
    startingHp?: number | null;
    starting_hp?: number | null;
    finalizeAliveCount?: number | null;
    finalize_alive_count?: number | null;
    participantsPerMatch?: number | null;
    participants_per_match?: number | null;
    timeLimitSeconds?: number | null;
    time_limit_seconds?: number | null;
    list?: Record<string, unknown> | null;
    lists?: Record<string, unknown> | null;
    [key: string]: unknown;
};

export type AdminPvpEventPayload = {
    title: string;
    description?: string | null;
    bannerUrl?: string | null;
    listId: number;
    startsAt: string;
    endsAt?: string | null;
    enabled?: boolean;
    levelSelectionMode?: 'random' | 'sbmm';
    ranked?: boolean;
    timeLimitSeconds?: number | null;
    completionRuleType?: PvpRoomCompletionRuleType | string | null;
    completionRuleValue?: number | null;
    scoringMode?: PvpRoomScoringMode | string | null;
    targetScore?: number | null;
    startingHp?: number | null;
    finalizeAliveCount?: number | null;
    participantsPerMatch?: number | null;
};

export type PvpMatch = {
    id?: number | string;
    matchId?: number | string;
    status?: PvpMatchStatus;
    mode?: PvpMode | string;
    difficulty?: PvpDifficulty | string;
    levelId?: number;
    winnerUid?: string | null;
    winner?: string | PvpPlayer | null;
    winnerId?: string | null;
    resultReason?: string | null;
    reason?: string | null;
    ranked?: boolean;
    isRanked?: boolean;
    levelRating?: number | null;
    level_rating?: number | null;
    ratingTarget?: number | null;
    rating_target?: number | null;
    ratingOffset?: number | null;
    rating_offset?: number | null;
    levelChangeRequestedByUid?: string | null;
    level_change_requested_by_uid?: string | null;
    levelChangeRequestExpiresAt?: string | null;
    level_change_request_expires_at?: string | null;
    levelChangedAt?: string | null;
    level_changed_at?: string | null;
    banPickAbortRequestedByUid?: string | null;
    ban_pick_abort_requested_by_uid?: string | null;
    banPickAbortRequestExpiresAt?: string | null;
    ban_pick_abort_request_expires_at?: string | null;
    ratingAppliedAt?: string | null;
    rating_applied_at?: string | null;
    roomId?: number | string | null;
    room_id?: number | string | null;
    room?: PvpRoom | null;
    pvpEventId?: number | string | null;
    pvp_event_id?: number | string | null;
    pvpEvent?: PvpEvent | null;
    pvp_event?: PvpEvent | null;
    completionRuleType?: PvpRoomCompletionRuleType | string | null;
    completion_rule_type?: PvpRoomCompletionRuleType | string | null;
    completionRuleValue?: number | null;
    completion_rule_value?: number | null;
    scoringMode?: PvpRoomScoringMode | string | null;
    scoring_mode?: PvpRoomScoringMode | string | null;
    targetScore?: number | null;
    target_score?: number | null;
    startingHp?: number | null;
    starting_hp?: number | null;
    finalizeAliveCount?: number | null;
    finalize_alive_count?: number | null;
    timeLimitSeconds?: number | null;
    time_limit_seconds?: number | null;
    startedAt?: string | null;
    startsAt?: string | null;
    started_at?: string | null;
    acceptanceExpiresAt?: string | null;
    acceptance_expires_at?: string | null;
    endAt?: string | null;
    endsAt?: string | null;
    endedAt?: string | null;
    created_at?: string;
    level?: PvpLevel | null;
    levels?: PvpLevel | null;
    selectedLevel?: PvpLevel | null;
    banPick?: PvpBanPick | null;
    ban_pick?: PvpBanPick | null;
    viewerReport?: PvpMatchReport | null;
    viewer_report?: PvpMatchReport | null;
    viewerPlayerReport?: PvpMatchReport | null;
    viewer_player_report?: PvpMatchReport | null;
    viewerLevelReport?: PvpMatchReport | null;
    viewer_level_report?: PvpMatchReport | null;
    viewerReports?: PvpMatchReport[];
    viewer_reports?: PvpMatchReport[];
    reportedByViewer?: boolean;
    reported_by_viewer?: boolean;
    reportedPlayerByViewer?: boolean;
    reported_player_by_viewer?: boolean;
    reportedLevelByViewer?: boolean;
    reported_level_by_viewer?: boolean;
    viewerXpAward?: PvpXpAward | null;
    viewer_xp_award?: PvpXpAward | null;
    participants?: PvpParticipant[];
    results?: PvpResult[];
    [key: string]: unknown;
};

export type PvpMatchesPage = {
    data: PvpMatch[];
    total: number;
    page: number;
    limit: number;
};

export type PvpPagination = {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
};

export type PvpMatchMessage = {
    id?: number | string;
    matchId?: number | string;
    senderUid?: string | null;
    type?: 'user' | 'system' | string;
    content?: string;
    metadata?: Record<string, unknown> | null;
    created_at?: string;
    sender?: PvpPlayer | null;
    player?: PvpPlayer | null;
    senderAnonymous?: boolean;
    sender_anonymous?: boolean;
    [key: string]: unknown;
};

export type PvpMatchReport = {
    id?: number | string;
    matchId?: number | string;
    match_id?: number | string;
    uid?: string;
    targetType?: PvpMatchReportTargetType | string;
    target_type?: PvpMatchReportTargetType | string;
    targetLevelId?: number | string | null;
    target_level_id?: number | string | null;
    reason?: PvpMatchReportReason | string;
    description?: string | null;
    resolved?: boolean;
    created_at?: string;
    [key: string]: unknown;
};

export type PvpXpAward = {
    id?: number | string;
    created_at?: string;
    reason?: 'pvp_match_win' | 'pvp_match_loss' | string;
    diff?: number;
    newXp?: number;
    sourceType?: 'pvp_match' | string;
    sourceId?: string;
    metadata?: Record<string, unknown> | null;
    [key: string]: unknown;
};

export type AdminPvpReportEvidence = {
    report: PvpMatchReport;
    reporter: PvpPlayer | null;
    reportedPlayer: PvpPlayer | null;
    reportedLevel?: PvpLevel | null;
    reportedParticipant: PvpParticipant | null;
    match: PvpMatch | null;
    messages: PvpMatchMessage[];
};

export type AdminPvpReportPlayerCount = {
    uid: string | null;
    player: PvpPlayer | null;
    reportCount: number;
    unresolvedCount: number;
};

export type AdminPvpReportsResponse = {
    days: 7 | 14 | 30 | null;
    since: string | null;
    playerCounts: AdminPvpReportPlayerCount[];
    reports: AdminPvpReportEvidence[];
};

export type PvpInvite = {
    id?: number | string;
    inviteId?: number | string;
    status?: PvpInviteStatus;
    mode?: PvpMode | string;
    difficulty?: PvpDifficulty | string;
    inviterUid?: string;
    inviteeUid?: string;
    from?: string;
    to?: string;
    matchId?: number | string | null;
    pvpEventId?: number | string | null;
    pvp_event_id?: number | string | null;
    pvpEvent?: PvpEvent | null;
    pvp_event?: PvpEvent | null;
    expiresAt?: string | null;
    expires_at?: string | null;
    created_at?: string;
    inviter?: PvpPlayer | null;
    invitee?: PvpPlayer | null;
    fromPlayer?: PvpPlayer | null;
    toPlayer?: PvpPlayer | null;
    inviterAnonymous?: boolean;
    inviteeAnonymous?: boolean;
    inviterAnonymousRevealAfterMatchEnd?: boolean;
    inviteeAnonymousRevealAfterMatchEnd?: boolean;
    match?: PvpMatch | null;
    [key: string]: unknown;
};

export type PvpRoomMember = {
    id?: number | string;
    roomId?: number | string;
    uid?: string;
    role?: 'host' | 'member' | string;
    status?: 'active' | 'left' | 'kicked' | string;
    ready?: boolean;
    isReady?: boolean;
    is_ready?: boolean;
    readyAt?: string | null;
    ready_at?: string | null;
    joinedAt?: string | null;
    joined_at?: string | null;
    leftAt?: string | null;
    left_at?: string | null;
    player?: PvpPlayer | null;
    players?: PvpPlayer | null;
    [key: string]: unknown;
};

export type PvpRoomMessage = {
    id?: number | string;
    roomId?: number | string;
    senderUid?: string | null;
    type?: 'user' | 'system' | string;
    content?: string;
    metadata?: Record<string, unknown> | null;
    created_at?: string;
    sender?: PvpPlayer | null;
    player?: PvpPlayer | null;
    [key: string]: unknown;
};

export type PvpRoom = {
    id?: number | string;
    name?: string;
    visibility?: PvpRoomVisibility | string;
    isPrivate?: boolean;
    status?: 'active' | 'closed' | string;
    selectedLevelId?: number | string | null;
    selected_level_id?: number | string | null;
    levelId?: number | string | null;
    level_id?: number | string | null;
    hostUid?: string;
    host?: PvpPlayer | null;
    inviteToken?: string | null;
    inviteUrl?: string | null;
    memberCount?: number;
    activeMemberCount?: number;
    viewerRole?: 'host' | 'member' | null | string;
    viewerMembership?: PvpRoomMember | null;
    members?: PvpRoomMember[];
    pendingInvites?: PvpRoomInvite[];
    activeMatch?: PvpMatch | null;
    history?: PvpMatch[];
    created_at?: string;
    updated_at?: string;
    [key: string]: unknown;
};

export type PvpRoomInvite = {
    id?: number | string;
    roomId?: number | string;
    inviterUid?: string;
    inviteeUid?: string;
    status?: PvpInviteStatus;
    expiresAt?: string | null;
    expires_at?: string | null;
    created_at?: string;
    inviter?: PvpPlayer | null;
    invitee?: PvpPlayer | null;
    room?: PvpRoom | null;
    [key: string]: unknown;
};

export type PvpRoomsOverview = {
    publicRooms: PvpRoom[];
    joinedRooms: PvpRoom[];
    invites: PvpRoomInvite[];
};

export type PvpMatchmakingRequest = {
    id?: number | string;
    status?: PvpQueueStatus;
    mode?: PvpMode | string;
    difficulty?: PvpDifficulty | string;
    uid?: string;
    userId?: string;
    anonymous?: boolean;
    anonymousRevealAfterMatchEnd?: boolean;
    matchId?: number | string | null;
    match?: PvpMatch | null;
    pvpEventId?: number | string | null;
    pvp_event_id?: number | string | null;
    pvpEvent?: PvpEvent | null;
    pvp_event?: PvpEvent | null;
    pvpRating?: number | null;
    searchStartedAt?: string | null;
    search_started_at?: string | null;
    currentSearchRange?: number | null;
    current_search_range?: number | null;
    matchedParticipantCount?: number | null;
    matched_participant_count?: number | null;
    targetParticipantCount?: number | null;
    target_participant_count?: number | null;
    expiresAt?: string | null;
    expires_at?: string | null;
    created_at?: string;
    updated_at?: string;
    [key: string]: unknown;
};

export type PvpRequiredSubmission = {
    id?: number | string;
    uid?: string;
    levelId?: number;
    levelID?: number;
    level_id?: number;
    level?: PvpLevel | null;
    levels?: PvpLevel | null;
    note?: string | null;
    createdAt?: string | null;
    created_at?: string | null;
    resolvedAt?: string | null;
    resolved_at?: string | null;
    cancelledAt?: string | null;
    cancelled_at?: string | null;
    [key: string]: unknown;
};

export type PvpRatingState = {
    mode?: PvpMode | string;
    pvpRating?: number | null;
    pvpRatedMatchCount?: number | null;
    pvpStartingRating?: number | null;
    pvpRatingInitializedAt?: string | null;
    pvpRatingInitialized?: boolean;
    pvpRatingDeviation?: number | null;
    pvpRatingVolatility?: number | null;
    [key: string]: unknown;
};

export type PvpMe = {
    rating?: PvpRatingState | null;
    ratings?: {
        classic?: PvpRatingState | null;
        platformer?: PvpRatingState | null;
    };
    platformerRating?: PvpRatingState | null;
    pvpRating?: number | null;
    pvpRatedMatchCount?: number | null;
    pvpRatingInitialized?: boolean;
    pvpPlatformerRating?: number | null;
    pvpPlatformerRatedMatchCount?: number | null;
    pvpPlatformerRatingInitialized?: boolean;
    activeMatch: PvpMatch | null;
    matchmaking: PvpMatchmakingRequest | null;
    requiredSubmission?: PvpRequiredSubmission | null;
    activePvpEvent?: PvpEvent | null;
    active_pvp_event?: PvpEvent | null;
    incomingInvites: PvpInvite[];
    outgoingInvites: PvpInvite[];
};

export type PvpLeaderboardPlayer = PvpPlayer & {
    rank?: number;
    mode?: PvpMode | string;
    pvpRating: number;
    pvpRatingDeviation?: number | null;
    pvpRatedMatchCount: number;
};

export type PvpLeaderboardPage = PvpPagination & {
    data: PvpLeaderboardPlayer[];
};

export type PvpWeeklyRaceWeek = {
    id?: number;
    weekStartAt?: string | null;
    week_start_at?: string | null;
    weekEndAt?: string | null;
    week_end_at?: string | null;
    status?: 'active' | 'finalized' | string;
    finalizedAt?: string | null;
    finalized_at?: string | null;
};

export type PvpWeeklyRacePlayer = {
    rank?: number | null;
    uid?: string;
    points: number;
    wins: number;
    matches?: number;
    winrate: number;
    updated_at?: string | null;
    player?: PvpPlayer | null;
    players?: PvpPlayer | null;
};

export type PvpWeeklyRace = {
    mode?: PvpMode | string;
    event?: PvpEvent | null;
    week: PvpWeeklyRaceWeek | null;
    currentWeek: PvpWeeklyRaceWeek | null;
    previousWeek: PvpWeeklyRaceWeek | null;
    leaderboard: PvpWeeklyRacePlayer[];
    previousLeaderboard: PvpWeeklyRacePlayer[];
    currentPlayer?: PvpWeeklyRacePlayer | null;
    pagination?: PvpPagination | null;
};

export type PvpClan = {
    id?: number;
    name?: string | null;
    tag?: string | null;
    tagBgColor?: string | null;
    tagTextColor?: string | null;
    boostedUntil?: string | null;
    memberCount?: number | null;
    imageVersion?: number | null;
    players?: PvpPlayer | null;
    [key: string]: unknown;
};

export type PvpClanWeeklyRaceClan = {
    rank?: number | null;
    clanId?: number;
    points: number;
    wins: number;
    matches?: number;
    winrate: number;
    updated_at?: string | null;
    clan?: PvpClan | null;
    clans?: PvpClan | null;
};

export type PvpClanWeeklyRace = {
    week: PvpWeeklyRaceWeek | null;
    currentWeek: PvpWeeklyRaceWeek | null;
    previousWeek: PvpWeeklyRaceWeek | null;
    leaderboard: PvpClanWeeklyRaceClan[];
    previousLeaderboard: PvpClanWeeklyRaceClan[];
    currentClan?: PvpClanWeeklyRaceClan | null;
    pagination?: PvpPagination | null;
};

export type PvpMissionPeriodType = 'daily' | 'weekly';
export type PvpMissionMetric = 'loginDays' | 'matchesPlayed' | 'matchesWon';

export type PvpMission = {
    key: string;
    periodType: PvpMissionPeriodType;
    title: string;
    description: string;
    xp: number;
    metric: PvpMissionMetric;
    target: number;
    progress: number;
    completed: boolean;
    claimed: boolean;
    claimable: boolean;
    periodKey: string;
    resetAt: string;
};

export type PvpMissionClaimResponse = {
    mission?: PvpMission;
    xpAward?: PvpXpAward | null;
    missions: PvpMission[];
};

export const PVP_ACTIVE_MATCH_STATUSES = ['pending', 'ban_pick', 'in_progress', 'waiting_result'];
export const PVP_FINISHED_MATCH_STATUSES = ['completed', 'cancelled', 'disputed'];
export const PVP_DIFFICULTIES: PvpDifficulty[] = ['easy', 'medium', 'hard'];
export const PVP_DEFAULT_RATING_DEVIATION = 350;
export const PVP_UNCERTAIN_RATING_DEVIATION = 150;
export const PVP_RATING_ACTIVITY_DAYS = 7;
export const PVP_CLASSIC_MATCH_DURATION_MS = 15 * 60 * 1000;
export const PVP_PLATFORMER_MATCH_DURATION_MS = 60 * 60 * 1000;

type PvpRequestInit = Omit<RequestInit, 'body'> & {
    token?: string | null;
    body?: BodyInit | Record<string, unknown> | null;
};

export class PvpClientError extends Error {
    status: number;
    details: Record<string, unknown>;
    code?: string;

    constructor(status: number, message: string, details: Record<string, unknown> = {}) {
        super(message);
        this.name = 'PvpClientError';
        this.status = status;
        this.details = details;
        this.code = typeof details.code === 'string' ? details.code : undefined;
    }
}

async function pvpRequest<T>(path: string, options: PvpRequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    const body =
        options.body && typeof options.body === 'object' && !(options.body instanceof FormData)
            ? JSON.stringify(options.body)
            : options.body;

    if (body && typeof body === 'string' && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    if (options.token) {
        headers.set('Authorization', `Bearer ${options.token}`);
    }

    const response = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
        ...options,
        body,
        headers
    });

    if (!response.ok) {
        let message = `PvP request failed with ${response.status}`;
        let details: Record<string, unknown> = {};

        try {
            const payload = await response.json();
            details = payload && typeof payload === 'object' ? payload : {};
            message = payload?.error || payload?.message || message;
        } catch {
            try {
                message = (await response.text()) || message;
            } catch {
                // Keep the status-based fallback.
            }
        }

        throw new PvpClientError(response.status, message, details);
    }

    if (response.status === 204) {
        return null as T;
    }

    return response.json();
}

export function normalizePvpMe(payload: any): PvpMe {
    const platformerRating = payload?.platformerRating ?? payload?.ratings?.platformer
        ?? payload?.platformer_rating ?? null;

    return {
        rating: payload?.rating ?? null,
        ratings: payload?.ratings ?? {
            classic: payload?.rating ?? null,
            platformer: platformerRating
        },
        platformerRating,
        pvpRating: payload?.pvpRating ?? payload?.pvp_rating ?? payload?.rating?.pvpRating ?? null,
        pvpRatedMatchCount: payload?.pvpRatedMatchCount
            ?? payload?.pvp_rated_match_count
            ?? payload?.rating?.pvpRatedMatchCount
            ?? null,
        pvpRatingInitialized: payload?.pvpRatingInitialized
            ?? payload?.pvp_rating_initialized
            ?? payload?.rating?.pvpRatingInitialized
            ?? false,
        pvpPlatformerRating: payload?.pvpPlatformerRating
            ?? payload?.pvp_platformer_rating
            ?? platformerRating?.pvpRating
            ?? null,
        pvpPlatformerRatedMatchCount: payload?.pvpPlatformerRatedMatchCount
            ?? payload?.pvp_platformer_rated_match_count
            ?? platformerRating?.pvpRatedMatchCount
            ?? null,
        pvpPlatformerRatingInitialized: payload?.pvpPlatformerRatingInitialized
            ?? payload?.pvp_platformer_rating_initialized
            ?? platformerRating?.pvpRatingInitialized
            ?? false,
        activeMatch: payload?.activeMatch
            ?? payload?.active_match
            ?? payload?.currentMatch
            ?? payload?.current_match
            ?? payload?.match
            ?? null,
        matchmaking: payload?.matchmaking
            ?? payload?.matchmakingRequest
            ?? payload?.matchmaking_request
            ?? payload?.queue
            ?? null,
        requiredSubmission: payload?.requiredSubmission
            ?? payload?.required_submission
            ?? null,
        activePvpEvent: payload?.activePvpEvent
            ?? payload?.active_pvp_event
            ?? null,
        incomingInvites: payload?.incomingInvites
            ?? payload?.incoming_invites
            ?? payload?.receivedInvites
            ?? payload?.received_invites
            ?? [],
        outgoingInvites: payload?.outgoingInvites
            ?? payload?.outgoing_invites
            ?? payload?.sentInvites
            ?? payload?.sent_invites
            ?? []
    };
}

export function normalizePvpMatches(payload: any): PvpMatch[] {
    if (Array.isArray(payload)) {
        return payload;
    }

    if (Array.isArray(payload?.matches)) {
        return payload.matches;
    }

    if (Array.isArray(payload?.data)) {
        return payload.data;
    }

    if (Array.isArray(payload?.items)) {
        return payload.items;
    }

    return [];
}

function normalizePvpPagination(
    payload: any,
    fallbackPage: number,
    fallbackLimit: number,
    dataLength: number
): PvpPagination {
    const page = Number(payload?.page);
    const limit = Number(payload?.limit);
    const total = Number(payload?.total ?? payload?.count);
    const normalizedPage = Number.isFinite(page) && page > 0
        ? Math.floor(page)
        : fallbackPage;
    const normalizedLimit = Number.isFinite(limit) && limit > 0
        ? Math.floor(limit)
        : fallbackLimit;
    const normalizedTotal = Number.isFinite(total) && total >= 0
        ? Math.floor(total)
        : dataLength;
    const rawHasMore = payload?.hasMore ?? payload?.has_more;

    return {
        page: normalizedPage,
        limit: normalizedLimit,
        total: normalizedTotal,
        hasMore: typeof rawHasMore === 'boolean'
            ? rawHasMore
            : normalizedPage * normalizedLimit < normalizedTotal
    };
}

export async function getPvpMe(token?: string | null) {
    return normalizePvpMe(await pvpRequest('/pvp/me', { token }));
}

export async function getPvpMissions(token?: string | null) {
    return pvpRequest<PvpMission[]>('/pvp/missions', { token });
}

export async function recordPvpMissionVisit(token?: string | null) {
    return pvpRequest<PvpMission[]>('/pvp/missions/visit', {
        method: 'POST',
        token
    });
}

export async function claimPvpMission(token: string | null | undefined, missionKey: string) {
    return pvpRequest<PvpMissionClaimResponse>(
        `/pvp/missions/${encodeURIComponent(missionKey)}/claim`,
        {
            method: 'POST',
            token
        }
    );
}

export async function getActivePvpEvent() {
    return pvpRequest<PvpEvent | null>('/pvp/event/active');
}

export async function startPvpMatchmaking(
    token: string | null | undefined,
    anonymous = false,
    mode: PvpSelectionMode = 'classic',
    anonymousRevealAfterMatchEnd = false
) {
    return pvpRequest<PvpMatchmakingRequest | PvpMe>('/pvp/matchmaking', {
        method: 'POST',
        token,
        body: { anonymous, mode, anonymousRevealAfterMatchEnd }
    });
}

export async function checkPvpMatchmaking(token?: string | null) {
    return pvpRequest<PvpMatchmakingRequest | PvpMe>('/pvp/matchmaking/check', {
        method: 'POST',
        token
    });
}

export async function cancelPvpMatchmaking(token?: string | null) {
    return pvpRequest<PvpMatchmakingRequest | null>('/pvp/matchmaking', {
        method: 'DELETE',
        token
    });
}

export async function getAdminPvpRequiredSubmissions(
    token: string | null | undefined,
    options: { uid?: string | null; status?: 'open' | 'resolved' | 'cancelled'; } = {}
) {
    const params = new URLSearchParams();

    if (options.uid) {
        params.set('uid', options.uid);
    }

    if (options.status) {
        params.set('status', options.status);
    }

    const query = params.toString();

    return pvpRequest<PvpRequiredSubmission[]>(
        `/pvp/admin/required-submissions${query ? `?${query}` : ''}`,
        { token }
    );
}

export async function createAdminPvpRequiredSubmission(
    token: string | null | undefined,
    payload: { uid: string; levelId: number; note?: string | null; }
) {
    return pvpRequest<PvpRequiredSubmission>('/pvp/admin/required-submissions', {
        method: 'POST',
        token,
        body: payload
    });
}

export async function cancelAdminPvpRequiredSubmission(
    token: string | null | undefined,
    id: number | string
) {
    return pvpRequest<PvpRequiredSubmission>(`/pvp/admin/required-submissions/${id}`, {
        method: 'DELETE',
        token
    });
}

export async function getAdminPvpEvents(token: string | null | undefined) {
    return pvpRequest<PvpEvent[]>('/pvp/admin/events', { token });
}

export async function createAdminPvpEvent(
    token: string | null | undefined,
    payload: AdminPvpEventPayload
) {
    return pvpRequest<PvpEvent>('/pvp/admin/events', {
        method: 'POST',
        token,
        body: payload
    });
}

export async function updateAdminPvpEvent(
    token: string | null | undefined,
    id: number | string,
    payload: Partial<AdminPvpEventPayload>
) {
    return pvpRequest<PvpEvent>(`/pvp/admin/events/${id}`, {
        method: 'PATCH',
        token,
        body: payload
    });
}

export async function deleteAdminPvpEvent(
    token: string | null | undefined,
    id: number | string
) {
    return pvpRequest<PvpEvent>(`/pvp/admin/events/${id}`, {
        method: 'DELETE',
        token
    });
}

export async function getAdminPvpReports(
    token: string | null | undefined,
    options: { days?: 7 | 14 | 30 | number | string | null; } = {}
) {
    const params = new URLSearchParams();

    if (options.days) {
        params.set('days', String(options.days));
    }

    const query = params.toString();

    return pvpRequest<AdminPvpReportsResponse>(
        `/pvp/admin/reports${query ? `?${query}` : ''}`,
        { token }
    );
}

export async function resolveAdminPvpReportsByPlayerReason(
    token: string | null | undefined,
    payload: { uid: string; reason: PvpMatchReportReason | string; }
) {
    return pvpRequest<{ resolvedCount: number; reportIds: number[]; }>(
        '/pvp/admin/reports/resolve',
        {
            method: 'POST',
            token,
            body: payload
        }
    );
}

export async function resolveAdminPvpReport(
    token: string | null | undefined,
    id: number | string
) {
    return pvpRequest<PvpMatchReport>(`/pvp/admin/reports/${id}/resolve`, {
        method: 'POST',
        token
    });
}

export async function sendPvpInvite(
    token: string | null | undefined,
    payload: {
        inviteeUid: string;
        anonymous?: boolean;
        anonymousRevealAfterMatchEnd?: boolean;
        mode?: PvpSelectionMode;
    }
) {
    return pvpRequest<PvpInvite>('/pvp/invites', {
        method: 'POST',
        token,
        body: payload
    });
}

export async function acceptPvpInvite(
    token: string | null | undefined,
    id: number | string,
    anonymous = false,
    anonymousRevealAfterMatchEnd = false
) {
    return pvpRequest<PvpInvite | PvpMatch>(`/pvp/invites/${id}/accept`, {
        method: 'POST',
        token,
        body: { anonymous, anonymousRevealAfterMatchEnd }
    });
}

export async function declinePvpInvite(token: string | null | undefined, id: number | string) {
    return pvpRequest<PvpInvite>(`/pvp/invites/${id}/decline`, {
        method: 'POST',
        token
    });
}

export async function getPvpInvite(token: string | null | undefined, id: number | string) {
    return pvpRequest<PvpInvite | null>(`/pvp/invites/${id}`, { token });
}

export async function getPvpRoomsOverview(token?: string | null) {
    return pvpRequest<PvpRoomsOverview>('/pvp/rooms', { token });
}

export async function createPvpRoom(
    token: string | null | undefined,
    payload: { name: string; visibility?: PvpRoomVisibility | string; }
) {
    return pvpRequest<PvpRoom>('/pvp/rooms', {
        method: 'POST',
        token,
        body: payload
    });
}

export async function getPvpRoom(
    token: string | null | undefined,
    id: number | string,
    options: { token?: string | null; } = {}
) {
    const params = new URLSearchParams();

    if (options.token) {
        params.set('token', options.token);
    }

    const query = params.toString();

    return pvpRequest<PvpRoom>(`/pvp/rooms/${id}${query ? `?${query}` : ''}`, { token });
}

export async function joinPvpRoom(
    token: string | null | undefined,
    id: number | string,
    inviteToken?: string | null
) {
    return pvpRequest<PvpRoom>(`/pvp/rooms/${id}/join`, {
        method: 'POST',
        token,
        body: inviteToken ? { token: inviteToken } : {}
    });
}

export async function leavePvpRoom(token: string | null | undefined, id: number | string) {
    return pvpRequest<{ left: boolean; roomId: number | string; closed?: boolean; }>(
        `/pvp/rooms/${id}/leave`,
        {
            method: 'POST',
            token
        }
    );
}

export async function updatePvpRoom(
    token: string | null | undefined,
    id: number | string,
    payload: {
        name?: string;
        visibility?: PvpRoomVisibility | string;
        selectedLevelId?: number | string | null;
    }
) {
    return pvpRequest<PvpRoom>(`/pvp/rooms/${id}`, {
        method: 'PATCH',
        token,
        body: payload
    });
}

export async function endPvpRoom(token: string | null | undefined, id: number | string) {
    return pvpRequest<{ closed: boolean; roomId: number | string; }>(
        `/pvp/rooms/${id}/end`,
        {
            method: 'POST',
            token
        }
    );
}

export async function invitePvpRoomPlayer(
    token: string | null | undefined,
    id: number | string,
    uid: string
) {
    return pvpRequest<PvpRoomInvite>(`/pvp/rooms/${id}/invites`, {
        method: 'POST',
        token,
        body: { uid }
    });
}

export async function acceptPvpRoomInvite(
    token: string | null | undefined,
    id: number | string
) {
    return pvpRequest<PvpRoom>(`/pvp/rooms/invites/${id}/accept`, {
        method: 'POST',
        token
    });
}

export async function declinePvpRoomInvite(
    token: string | null | undefined,
    id: number | string
) {
    return pvpRequest<{ declined: boolean; inviteId: number | string; }>(
        `/pvp/rooms/invites/${id}/decline`,
        {
            method: 'POST',
            token
        }
    );
}

export async function kickPvpRoomMember(
    token: string | null | undefined,
    id: number | string,
    uid: string
) {
    return pvpRequest<PvpRoom>(`/pvp/rooms/${id}/members/${encodeURIComponent(uid)}/kick`, {
        method: 'POST',
        token
    });
}

export async function transferPvpRoomHost(
    token: string | null | undefined,
    id: number | string,
    uid: string
) {
    return pvpRequest<PvpRoom>(
        `/pvp/rooms/${id}/members/${encodeURIComponent(uid)}/transfer-host`,
        {
            method: 'POST',
            token
        }
    );
}

export async function setPvpRoomReady(
    token: string | null | undefined,
    id: number | string,
    ready: boolean
) {
    return pvpRequest<PvpRoom>(`/pvp/rooms/${id}/ready`, {
        method: 'POST',
        token,
        body: { ready }
    });
}

export async function startPvpRoomMatch(
    token: string | null | undefined,
    id: number | string,
    payload: {
        levelId: number | string;
        timeLimitSeconds?: number | string | null;
        timeLimitMinutes?: number | string | null;
        completionRuleType?: PvpRoomCompletionRuleType | string;
        completionRuleValue?: number | string | null;
        scoringMode?: PvpRoomScoringMode | string;
        targetScore?: number | string | null;
        startingHp?: number | string | null;
        finalizeAliveCount?: number | string | null;
        forceStart?: boolean;
    }
) {
    return pvpRequest<PvpMatch>(`/pvp/rooms/${id}/start-match`, {
        method: 'POST',
        token,
        body: payload
    });
}

export async function endPvpRoomMatch(token: string | null | undefined, id: number | string) {
    return pvpRequest<PvpRoom>(`/pvp/rooms/${id}/end-match`, {
        method: 'POST',
        token
    });
}

export async function getPvpRoomMessages(
    token: string | null | undefined,
    id: number | string,
    options: { afterId?: number | string | null; limit?: number | string | null; } = {}
) {
    const params = new URLSearchParams();

    if (options.afterId !== undefined && options.afterId !== null && options.afterId !== '') {
        params.set('afterId', String(options.afterId));
    }

    if (options.limit !== undefined && options.limit !== null && options.limit !== '') {
        params.set('limit', String(options.limit));
    }

    const query = params.toString();
    const payload = await pvpRequest<
        PvpRoomMessage[] | { messages?: PvpRoomMessage[]; data?: PvpRoomMessage[]; }
    >(`/pvp/rooms/${id}/messages${query ? `?${query}` : ''}`, { token });

    if (Array.isArray(payload)) {
        return payload;
    }

    if (Array.isArray(payload?.messages)) {
        return payload.messages;
    }

    if (Array.isArray(payload?.data)) {
        return payload.data;
    }

    return [];
}

export async function sendPvpRoomMessage(
    token: string | null | undefined,
    id: number | string,
    content: string
) {
    return pvpRequest<PvpRoomMessage>(`/pvp/rooms/${id}/messages`, {
        method: 'POST',
        token,
        body: { content }
    });
}

export async function getPvpMatches(token?: string | null) {
    return normalizePvpMatches(await pvpRequest('/pvp/matches', { token }));
}

export async function getPvpLeaderboard(limit = 50, mode: PvpMode = 'classic') {
    const params = new URLSearchParams({ limit: String(limit), mode });
    const payload = await pvpRequest<PvpLeaderboardPlayer[] | { data?: PvpLeaderboardPlayer[]; }>(
        `/pvp/leaderboard?${params}`
    );

    if (Array.isArray(payload)) {
        return payload;
    }

    if (Array.isArray(payload?.data)) {
        return payload.data;
    }

    return [];
}

export async function getPvpLeaderboardPage(
    page = 1,
    limit = 50,
    mode: PvpMode = 'classic'
): Promise<PvpLeaderboardPage> {
    const params = new URLSearchParams({
        limit: String(limit),
        mode,
        page: String(page)
    });
    const payload = await pvpRequest<
        PvpLeaderboardPlayer[] | {
            data?: PvpLeaderboardPlayer[];
            total?: number;
            count?: number;
            page?: number;
            limit?: number;
            hasMore?: boolean;
            has_more?: boolean;
        }
    >(`/pvp/leaderboard?${params}`);
    const data = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
            ? payload.data
            : [];
    const pagination = normalizePvpPagination(payload, page, limit, data.length);

    return {
        data,
        ...pagination
    };
}

export async function getPvpWeeklyRace(
    week: 'current' | 'previous' | string = 'current',
    limit = 50,
    uid?: string | null,
    page?: number | string | null
) {
    const params = new URLSearchParams({ week, limit: String(limit) });

    if (uid) {
        params.set('uid', uid);
    }

    if (page !== undefined && page !== null && page !== '') {
        params.set('page', String(page));
    }

    const payload = await pvpRequest<PvpWeeklyRace | { data?: PvpWeeklyRace; }>(
        `/pvp/weekly-race?${params}`
    );

    const race = ('data' in payload && payload.data ? payload.data : payload) as PvpWeeklyRace;
    const leaderboard = Array.isArray(race.leaderboard) ? race.leaderboard : [];
    const pagination = page !== undefined && page !== null && page !== ''
        ? normalizePvpPagination(
            race.pagination ?? race,
            Number(page) || 1,
            limit,
            leaderboard.length
        )
        : race.pagination ?? null;

    return {
        mode: race.mode,
        event: race.event ?? null,
        week: race.week ?? null,
        currentWeek: race.currentWeek ?? null,
        previousWeek: race.previousWeek ?? null,
        leaderboard,
        previousLeaderboard: Array.isArray(race.previousLeaderboard)
            ? race.previousLeaderboard
            : [],
        currentPlayer: race.currentPlayer ?? null,
        pagination
    };
}

export async function getPvpEventRace(
    eventId?: number | string | null,
    limit = 50,
    uid?: string | null,
    page?: number | string | null
) {
    const params = new URLSearchParams({ limit: String(limit) });

    if (eventId) {
        params.set('eventId', String(eventId));
    }

    if (uid) {
        params.set('uid', uid);
    }

    if (page !== undefined && page !== null && page !== '') {
        params.set('page', String(page));
    }

    const payload = await pvpRequest<PvpWeeklyRace | { data?: PvpWeeklyRace; }>(
        `/pvp/event-race?${params}`
    );

    const race = ('data' in payload && payload.data ? payload.data : payload) as PvpWeeklyRace;
    const leaderboard = Array.isArray(race.leaderboard) ? race.leaderboard : [];
    const pagination = page !== undefined && page !== null && page !== ''
        ? normalizePvpPagination(
            race.pagination ?? race,
            Number(page) || 1,
            limit,
            leaderboard.length
        )
        : race.pagination ?? null;

    return {
        mode: race.mode,
        event: race.event ?? null,
        week: race.week ?? null,
        currentWeek: race.currentWeek ?? null,
        previousWeek: race.previousWeek ?? null,
        leaderboard,
        previousLeaderboard: Array.isArray(race.previousLeaderboard)
            ? race.previousLeaderboard
            : [],
        currentPlayer: race.currentPlayer ?? null,
        pagination
    };
}

export async function getPvpClanWeeklyRace(
    week: 'current' | 'previous' | string = 'current',
    limit = 50,
    clanId?: number | string | null,
    page?: number | string | null
) {
    const params = new URLSearchParams({ week, limit: String(limit) });

    if (clanId) {
        params.set('clanId', String(clanId));
    }

    if (page !== undefined && page !== null && page !== '') {
        params.set('page', String(page));
    }

    const payload = await pvpRequest<PvpClanWeeklyRace | { data?: PvpClanWeeklyRace; }>(
        `/pvp/clan-weekly-race?${params}`
    );

    const race = ('data' in payload && payload.data ? payload.data : payload) as PvpClanWeeklyRace;
    const leaderboard = Array.isArray(race.leaderboard) ? race.leaderboard : [];
    const pagination = page !== undefined && page !== null && page !== ''
        ? normalizePvpPagination(
            race.pagination ?? race,
            Number(page) || 1,
            limit,
            leaderboard.length
        )
        : race.pagination ?? null;

    return {
        week: race.week ?? null,
        currentWeek: race.currentWeek ?? null,
        previousWeek: race.previousWeek ?? null,
        leaderboard,
        previousLeaderboard: Array.isArray(race.previousLeaderboard)
            ? race.previousLeaderboard
            : [],
        currentClan: race.currentClan ?? null,
        pagination
    };
}

export async function getPublicPvpMatchesForPlayer(uid: string, limit = 25) {
    const params = new URLSearchParams({ limit: String(limit) });

    return normalizePvpMatches(
        await pvpRequest(`/pvp/players/${encodeURIComponent(uid)}/matches?${params}`)
    );
}

export async function getPublicPvpMatchesPageForPlayer(uid: string, page = 1, limit = 25) {
    const params = new URLSearchParams({ limit: String(limit), page: String(page) });
    const payload = await pvpRequest<PvpMatchesPage | PvpMatch[]>(
        `/pvp/players/${encodeURIComponent(uid)}/matches?${params}`
    );

    if (Array.isArray(payload)) {
        return {
            data: normalizePvpMatches(payload),
            total: payload.length,
            page,
            limit
        };
    }

    return {
        data: normalizePvpMatches(payload?.data ?? []),
        total: Number.isFinite(Number(payload?.total)) ? Number(payload.total) : 0,
        page: Number.isFinite(Number(payload?.page)) ? Number(payload.page) : page,
        limit: Number.isFinite(Number(payload?.limit)) ? Number(payload.limit) : limit
    };
}

export async function getPvpMatch(token: string | null | undefined, id: number | string) {
    return pvpRequest<PvpMatch>(`/pvp/matches/${id}`, { token });
}

export async function getSpectatablePvpMatch(
    token: string | null | undefined,
    id: number | string
) {
    return pvpRequest<PvpMatch>(`/pvp/matches/${id}/spectate`, { token });
}

export async function acceptPvpMatch(token: string | null | undefined, id: number | string) {
    return pvpRequest<PvpMatch>(`/pvp/matches/${id}/accept`, {
        method: 'POST',
        token
    });
}

export async function banPvpMatchLevel(
    token: string | null | undefined,
    id: number | string,
    levelIds: number | string | Array<number | string>
) {
    return pvpRequest<PvpMatch>(`/pvp/matches/${id}/ban-pick/ban`, {
        method: 'POST',
        token,
        body: { levelIds: Array.isArray(levelIds) ? levelIds : [levelIds] }
    });
}

export async function resignPvpMatch(token: string | null | undefined, id: number | string) {
    return pvpRequest<PvpMatch>(`/pvp/matches/${id}/resign`, {
        method: 'POST',
        token
    });
}

export async function abortPvpMatchAsManager(
    token: string | null | undefined,
    id: number | string
) {
    return pvpRequest<PvpMatch>(`/pvp/admin/matches/${id}/abort`, {
        method: 'POST',
        token
    });
}

export async function requestPvpBanPickAbort(
    token: string | null | undefined,
    id: number | string
) {
    return pvpRequest<PvpMatch>(`/pvp/matches/${id}/ban-pick/abort`, {
        method: 'POST',
        token
    });
}

export async function requestPvpMatchLevelChange(
    token: string | null | undefined,
    id: number | string
) {
    return pvpRequest<PvpMatch>(`/pvp/matches/${id}/level-change`, {
        method: 'POST',
        token
    });
}

export async function getPvpMatchMessages(
    token: string | null | undefined,
    id: number | string,
    options: { afterId?: number | string | null; limit?: number | string | null; } = {}
) {
    const params = new URLSearchParams();

    if (options.afterId !== undefined && options.afterId !== null && options.afterId !== '') {
        params.set('afterId', String(options.afterId));
    }

    if (options.limit !== undefined && options.limit !== null && options.limit !== '') {
        params.set('limit', String(options.limit));
    }

    const query = params.toString();
    const payload = await pvpRequest<
        PvpMatchMessage[] | { messages?: PvpMatchMessage[]; data?: PvpMatchMessage[]; }
    >(`/pvp/matches/${id}/messages${query ? `?${query}` : ''}`, { token });

    if (Array.isArray(payload)) {
        return payload;
    }

    if (Array.isArray(payload?.messages)) {
        return payload.messages;
    }

    if (Array.isArray(payload?.data)) {
        return payload.data;
    }

    return [];
}

export async function sendPvpMatchMessage(
    token: string | null | undefined,
    id: number | string,
    content: string
) {
    return pvpRequest<PvpMatchMessage>(`/pvp/matches/${id}/messages`, {
        method: 'POST',
        token,
        body: { content }
    });
}

export async function sendPvpPlayMode(
    token: string | null | undefined,
    id: number | string,
    playMode: PvpPlayMode,
    elapsedMs?: number | null
) {
    return pvpRequest<{ playMode: PvpPlayMode; changed: boolean; }>(
        `/pvp/matches/${id}/play-mode`,
        {
            method: 'PUT',
            token,
            body: {
                playMode,
                ...(elapsedMs === null || elapsedMs === undefined ? {} : { elapsedMs })
            }
        }
    );
}

export async function getPvpPowerupState(
    token: string | null | undefined,
    id: number | string
) {
    return pvpRequest<PvpPowerupState>(`/pvp/matches/${id}/powerups`, { token });
}

export async function castPvpPowerupSkill(
    token: string | null | undefined,
    id: number | string,
    payload: {
        skill: PvpPowerupSkill | string;
        targetUid?: string | null;
        randomTarget?: boolean;
    }
) {
    return pvpRequest<{
        skill: PvpPowerupSkill | string;
        targetUid: string;
        blocked: boolean;
        state: PvpPowerupState;
    }>(`/pvp/matches/${id}/powerups/cast`, {
        method: 'POST',
        token,
        body: payload
    });
}

export async function setPvpPowerupManaAsManager(
    token: string | null | undefined,
    id: number | string,
    uid: string,
    mana: number
) {
    return pvpRequest<{ uid: string; mana: number; maxMana: number; }>(
        `/pvp/admin/matches/${id}/powerups/mana`,
        {
            method: 'PATCH',
            token,
            body: { uid, mana }
        }
    );
}

export async function reportPvpMatch(
    token: string | null | undefined,
    id: number | string,
    targetType: PvpMatchReportTargetType,
    reason: PvpMatchReportReason,
    description?: string | null
) {
    return pvpRequest<PvpMatchReport>(`/pvp/matches/${id}/report`, {
        method: 'POST',
        token,
        body: { targetType, reason, description }
    });
}

export function getPvpMatchId(match: PvpMatch | null | undefined) {
    return match?.id ?? match?.matchId ?? null;
}

export function getPvpMatchRoomId(match: PvpMatch | null | undefined) {
    return match?.roomId ?? match?.room_id ?? match?.room?.id ?? null;
}

export function getPvpMatchRoom(match: PvpMatch | null | undefined) {
    return match?.room ?? null;
}

export function isPvpCustomRoomMatch(match: PvpMatch | null | undefined) {
    return Boolean(getPvpMatchRoomId(match));
}

export function getPvpMatchRoomName(match: PvpMatch | null | undefined) {
    return match?.room?.name ?? null;
}

export function getPvpInviteId(invite: PvpInvite | null | undefined) {
    return invite?.id ?? invite?.inviteId ?? null;
}

export function getPvpStatus(value: { status?: string; } | null | undefined, fallback = 'pending') {
    return String(value?.status || fallback)
        .toLowerCase();
}

export function getPvpMode(
    match: PvpMatch | PvpInvite | PvpMatchmakingRequest | null | undefined
): PvpMode {
    return match?.mode === 'platformer' ? 'platformer' : 'classic';
}

export function isPvpPlatformerMatch(match: PvpMatch | null | undefined) {
    return getPvpMode(match) === 'platformer';
}

export function isActivePvpMatch(match: PvpMatch | null | undefined) {
    return PVP_ACTIVE_MATCH_STATUSES.includes(getPvpStatus(match));
}

export function isFinishedPvpMatch(match: PvpMatch | null | undefined) {
    return PVP_FINISHED_MATCH_STATUSES.includes(getPvpStatus(match, ''));
}

export function getPvpLevel(match: PvpMatch | null | undefined): PvpLevel | null {
    return (
        match?.level ?? match?.levels ?? match?.selectedLevel ?? (match?.matchLevel as PvpLevel)
            ?? null
    );
}

export function getPvpRequiredSubmissionLevel(
    requirement: PvpRequiredSubmission | null | undefined
): PvpLevel | null {
    return requirement?.level ?? requirement?.levels ?? null;
}

export function getPvpRequiredSubmissionLevelId(
    requirement: PvpRequiredSubmission | null | undefined
) {
    const value = requirement?.levelId
        ?? requirement?.levelID
        ?? requirement?.level_id
        ?? requirement?.level?.id
        ?? requirement?.levels?.id
        ?? null;
    const levelId = Number(value);

    return Number.isInteger(levelId) && levelId > 0 ? levelId : null;
}

export function getPvpBanPick(match: PvpMatch | null | undefined): PvpBanPick | null {
    return match?.banPick ?? match?.ban_pick ?? null;
}

export function getPvpParticipants(match: PvpMatch | null | undefined): PvpParticipant[] {
    if (!match) {
        return [];
    }

    if (Array.isArray(match.participants)) {
        return match.participants;
    }

    if (Array.isArray(match.players)) {
        return match.players.map((player: any) => ({ uid: player?.uid, player }));
    }

    const candidates = [
        match.playerA,
        match.playerB,
        match.player1,
        match.player2,
        match.host,
        match.opponent
    ].filter(Boolean);

    return candidates.map((player: any) => ({ uid: player?.uid, player }));
}

export function getPvpParticipantUid(participant: PvpParticipant | PvpResult | null | undefined) {
    return participant?.uid ?? participant?.userId ?? participant?.playerId ?? null;
}

export function getPvpParticipantPlayer(
    participant: PvpParticipant | PvpResult | null | undefined
) {
    if (getPvpParticipantIsAnonymous(participant)) {
        return null;
    }

    return participant?.player ?? participant?.players ?? null;
}

export function getPvpParticipantDisplayName(
    participant: PvpParticipant | PvpResult | null | undefined,
    fallback = 'Player'
) {
    const player = getPvpParticipantPlayer(participant);
    const rawName = participant
        ? (participant.name ?? participant.displayName ?? player?.name)
        : null;
    const name = typeof rawName === 'string' ? rawName.trim() : '';

    return name || player?.name || getPvpParticipantUid(participant) || fallback;
}

export function getPvpParticipantIsAnonymous(
    participant: PvpParticipant | PvpResult | null | undefined
) {
    return Boolean(
        participant?.anonymous
            ?? (participant as PvpParticipant | undefined)?.isAnonymous
            ?? (participant as PvpParticipant | undefined)?.is_anonymous
            ?? participant?.player?.anonymous
            ?? participant?.player?.isAnonymous
    );
}

export function getPvpMessageSenderIsAnonymous(message: PvpMatchMessage | null | undefined) {
    return Boolean(message?.senderAnonymous ?? message?.sender_anonymous);
}

export function getPvpOpponent(
    match: PvpMatch | null | undefined,
    currentUid: string | null | undefined
) {
    const participants = getPvpParticipants(match);

    return (
        participants.find((participant) => getPvpParticipantUid(participant) !== currentUid)
            ?? participants[0]
            ?? null
    );
}

export function getPvpSelfParticipant(
    match: PvpMatch | null | undefined,
    currentUid: string | null | undefined
) {
    return (
        getPvpParticipants(match)
            .find(
                (participant) => getPvpParticipantUid(participant) === currentUid
            ) ?? null
    );
}

export function getPvpProgress(participant: PvpParticipant | PvpResult | null | undefined) {
    const result = (participant as PvpParticipant | undefined)?.result;
    const value = participant?.progress
        ?? participant?.bestProgress
        ?? result?.progress
        ?? result?.bestProgress
        ?? 0;

    return Number.isFinite(Number(value)) ? Number(value) : 0;
}

export function getPvpDeathCount(participant: PvpParticipant | PvpResult | null | undefined) {
    return getPvpDeathCountArray(participant)
        .reduce((total, count) => total + count, 0);
}

export function getPvpDeathCountArray(participant: PvpParticipant | PvpResult | null | undefined) {
    const result = (participant as PvpParticipant | undefined)?.result;
    const value = participant?.deathCount
        ?? participant?.death_count
        ?? result?.deathCount
        ?? result?.death_count
        ?? 0;

    if (Array.isArray(value)) {
        return Array.from({ length: 100 }, (_, index) => {
            const count = Number(value[index]);

            return Number.isInteger(count) && count > 0 ? count : 0;
        });
    }

    const legacyTotal = Number(value);
    const deathCount = Array(100)
        .fill(0);

    if (Number.isInteger(legacyTotal) && legacyTotal > 0) {
        deathCount[0] = legacyTotal;
    }

    return deathCount;
}

export function getPvpDeathCountEntries(
    participant: PvpParticipant | PvpResult | null | undefined
) {
    return getPvpDeathCountArray(participant)
        .map((count, percent) => ({ percent, count }))
        .filter((entry) => entry.count > 0);
}

export function formatPvpProgressValue(
    value: number,
    mode: PvpMode = 'classic',
    scoringMode: PvpRoomScoringMode | string = 'progress',
    targetScore?: number | string | null,
    startingHp?: number | string | null
) {
    if (mode === 'platformer') {
        return `${Math.max(0, Math.floor(value))} PT`;
    }

    const progress = Number.isInteger(value)
        ? String(value)
        : value.toFixed(2)
            .replace(/\.?0+$/, '');

    if (scoringMode === 'score' || scoringMode === 'powerup') {
        const target = Number(targetScore);

        return Number.isFinite(target) && target > 0
            ? `${progress}/${Math.floor(target)}`
            : progress;
    }

    if (scoringMode === 'hp') {
        const hp = Number(startingHp);

        return Number.isFinite(hp) && hp > 0
            ? `${progress}/${Math.floor(hp)} HP`
            : `${progress} HP`;
    }

    return `${progress}%`;
}

export function getPvpProgressUnit(mode: PvpMode = 'classic') {
    return mode === 'platformer' ? 'PT' : '%';
}

export function getPvpTimeReachedMs(participant: PvpParticipant | PvpResult | null | undefined) {
    const result = (participant as PvpParticipant | undefined)?.result;
    const value = participant?.timeReachedMs
        ?? participant?.timeReachedProgress
        ?? result?.timeReachedMs
        ?? result?.timeReachedProgress
        ?? result?.time_reached_progress
        ?? null;

    return Number.isFinite(Number(value)) ? Number(value) : null;
}

export function getPvpParticipantsSortedByProgress(
    participants: PvpParticipant[],
    mode: PvpMode = 'classic'
) {
    return [...participants].sort((a, b) => {
        const progressDelta = getPvpProgress(b) - getPvpProgress(a);

        if (progressDelta) {
            return progressDelta;
        }

        const aTime = getPvpTimeReachedMs(a);
        const bTime = getPvpTimeReachedMs(b);

        if (aTime === null && bTime === null) {
            return 0;
        }

        if (aTime === null) {
            return 1;
        }

        if (bTime === null) {
            return -1;
        }

        return aTime - bTime;
    });
}

export function getPvpWinnerUid(match: PvpMatch | null | undefined) {
    if (!match) {
        return null;
    }

    if (typeof match.winner === 'string') {
        return match.winner;
    }

    if (match.winner && typeof match.winner === 'object') {
        return match.winner.uid ?? match.winner.id ?? null;
    }

    return match.winnerUid ?? match.winnerId ?? null;
}

export function getPvpMatchStartMs(match: PvpMatch | null | undefined) {
    return getTimeMs(match?.startedAt ?? match?.startsAt ?? match?.started_at ?? match?.created_at);
}

export function getPvpMatchEndMs(match: PvpMatch | null | undefined) {
    const explicit = getTimeMs(match?.endAt ?? match?.endsAt ?? match?.endedAt);

    if (explicit) {
        return explicit;
    }

    if (['pending', 'ban_pick'].includes(getPvpStatus(match))) {
        return null;
    }

    const started = getPvpMatchStartMs(match);
    const duration = getPvpMode(match) === 'platformer'
        ? PVP_PLATFORMER_MATCH_DURATION_MS
        : PVP_CLASSIC_MATCH_DURATION_MS;

    return started ? started + duration : null;
}

export function getPvpMatchAcceptanceExpiresMs(match: PvpMatch | null | undefined) {
    return getTimeMs(match?.acceptanceExpiresAt ?? match?.acceptance_expires_at);
}

export function getPvpLevelChangeRequestExpiresMs(match: PvpMatch | null | undefined) {
    return getTimeMs(match?.levelChangeRequestExpiresAt ?? match?.level_change_request_expires_at);
}

export function getPvpBanPickAbortRequestExpiresMs(match: PvpMatch | null | undefined) {
    return getTimeMs(
        match?.banPickAbortRequestExpiresAt ?? match?.ban_pick_abort_request_expires_at
    );
}

export function getPvpInviteExpiresMs(
    invite: PvpInvite | PvpRoomInvite | PvpMatchmakingRequest | null | undefined
) {
    return getTimeMs(invite?.expiresAt ?? invite?.expires_at);
}

export function getPvpMatchedMatchId(value: PvpInvite | PvpMatchmakingRequest | null | undefined) {
    return value?.matchId ?? value?.match?.id ?? value?.match?.matchId ?? null;
}

export function getPvpResultReason(match: PvpMatch | null | undefined) {
    return match?.resultReason ?? match?.reason ?? null;
}

export function isPvpMatchRanked(match: PvpMatch | null | undefined) {
    return Boolean(match?.ranked ?? match?.isRanked);
}

export function getPvpRatedMatchActivityMs(match: PvpMatch | null | undefined) {
    const value = match?.ratingAppliedAt
        ?? match?.rating_applied_at
        ?? match?.endedAt
        ?? match?.endAt
        ?? match?.endsAt
        ?? match?.startedAt
        ?? match?.started_at
        ?? match?.created_at
        ?? null;

    return getTimeMs(value) ?? 0;
}

export function isPvpRatingActivityRecent(match: PvpMatch | null | undefined, nowMs = Date.now()) {
    if (!match || getPvpStatus(match, '') !== 'completed' || !isPvpMatchRanked(match)) {
        return true;
    }

    const activityMs = getPvpRatedMatchActivityMs(match);

    if (!activityMs) {
        return false;
    }

    return nowMs - activityMs <= PVP_RATING_ACTIVITY_DAYS * 24 * 60 * 60 * 1000;
}

export function getPvpLevelRating(match: PvpMatch | null | undefined) {
    const level = getPvpLevel(match);
    const value = match?.levelRating ?? match?.level_rating ?? level?.listRating ?? level?.rating
        ?? null;

    return getFinitePvpNumber(value);
}

export function getPvpParticipantRatingBefore(participant: PvpParticipant | null | undefined) {
    const value = participant?.pvpRatingBefore ?? participant?.pvp_rating_before ?? null;

    return getFinitePvpNumber(value);
}

export function getPvpParticipantRatingAfter(participant: PvpParticipant | null | undefined) {
    const value = participant?.pvpRatingAfter ?? participant?.pvp_rating_after ?? null;

    return getFinitePvpNumber(value);
}

export function getPvpParticipantRatingDiff(participant: PvpParticipant | null | undefined) {
    const value = participant?.pvpRatingDiff ?? participant?.pvp_rating_diff ?? null;

    return getFinitePvpNumber(value);
}

export function getPvpVisibleParticipantRating(participant: PvpParticipant | null | undefined) {
    const player = getPvpParticipantPlayer(participant);
    const value = getPvpParticipantRatingAfter(participant)
        ?? getPvpParticipantRatingBefore(participant)
        ?? participant?.pvpRating
        ?? participant?.pvp_rating
        ?? player?.pvpRating
        ?? null;

    return getFinitePvpNumber(value);
}

export function getPvpVisibleParticipantRatedMatchCount(
    participant: PvpParticipant | null | undefined
) {
    const player = getPvpParticipantPlayer(participant);
    const value = participant?.pvpRatedMatchCount
        ?? participant?.pvp_rated_match_count
        ?? player?.pvpRatedMatchCount
        ?? player?.pvp_rated_match_count
        ?? null;

    return getFinitePvpNumber(value);
}

export function getPvpVisibleParticipantRatingDeviation(
    participant: PvpParticipant | null | undefined
) {
    const player = getPvpParticipantPlayer(participant);
    const value = participant?.pvpRatingDeviation
        ?? participant?.pvp_rating_deviation
        ?? player?.pvpRatingDeviation
        ?? player?.pvp_rating_deviation
        ?? null;

    return getFinitePvpNumber(value);
}

export function isPvpRatingStable(ratingDeviation: number | null | undefined) {
    return ratingDeviation !== null
        && ratingDeviation !== undefined
        && Number.isFinite(Number(ratingDeviation))
        && Number(ratingDeviation) < PVP_UNCERTAIN_RATING_DEVIATION;
}

export function getPvpVisibleRatingLabel(
    rating: number | null | undefined,
    ratingDeviation: number | null | undefined,
    options: { unstableLabel?: string | null; } = {}
) {
    const value = getFinitePvpNumber(rating);

    if (value === null) {
        return null;
    }

    if (!isPvpRatingStable(ratingDeviation)) {
        return options.unstableLabel ?? null;
    }

    return String(Math.round(value));
}

export function getPvpVisibleParticipantRatingLabel(
    participant: PvpParticipant | null | undefined,
    options: { unstableLabel?: string | null; } = {}
) {
    const rating = getPvpVisibleParticipantRating(participant);
    const ratingDeviation = getPvpVisibleParticipantRatingDeviation(participant);

    return getPvpVisibleRatingLabel(rating, ratingDeviation, options);
}

export function hasPvpParticipantAccepted(participant: PvpParticipant | null | undefined) {
    return Boolean(participant?.acceptedAt ?? participant?.accepted_at);
}

export function isPvpMatchConfirmedByAll(match: PvpMatch | null | undefined) {
    if (!match) {
        return false;
    }

    const participants = getPvpParticipants(match);

    if (participants.length >= 2 && participants.every(hasPvpParticipantAccepted)) {
        return true;
    }

    return ['in_progress', 'waiting_result', 'completed', 'disputed'].includes(
        getPvpStatus(match, '')
    );
}

export function isPvpMatchConfirmedByBoth(match: PvpMatch | null | undefined) {
    return isPvpMatchConfirmedByAll(match);
}

export function getTimeMs(value: unknown) {
    if (!value) {
        return null;
    }

    const ms = new Date(String(value))
        .getTime();

    return Number.isFinite(ms) ? ms : null;
}

function getFinitePvpNumber(value: unknown) {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const numberValue = Number(value);

    return Number.isFinite(numberValue) ? numberValue : null;
}
