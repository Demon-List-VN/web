const API = import.meta.env.VITE_API_URL;

export type OverwatchVerdict = 'accept' | 'reject' | 'unsure';

export type OverwatchAssignment = {
    assignmentId: string;
    expiresAt: string;
    record: {
        levelId: number;
        levelName: string;
        isPlatformer: boolean;
        videoUrl: string;
		rawUrl: string | null;
        progress: number;
        refreshRate: number | null;
        mobile: boolean;
        comment: string | null;
    };
};

export type OverwatchMe = {
    eligible: boolean;
    eligibilityReason: string | null;
    minimumLevel: number;
    profile: {
        reputationScore: number;
        reputationTier: string;
        effectiveWeight: number;
        completedReviews: number;
        probation: boolean;
        probationReviewsLeft: number;
        dailyLimit: number;
        usedToday: number;
        limitLeft: number;
        returnLimitLeft: number;
        banned: boolean;
        bannedAt: string | null;
        bannedUntil: string | null;
        banReason: string | null;
    };
    currentAssignment: OverwatchAssignment | null;
};

async function request<T>(path: string, token: string | undefined, init: RequestInit = {}) {
    const response = await fetch(`${API}${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(init.body ? { 'Content-Type': 'application/json' } : {}),
            ...init.headers
        }
    });
    const data = response.status === 204
        ? null
        : await response.json()
            .catch(() => null);

    if (!response.ok) {
        throw new Error(data?.code || data?.message || `Request failed (${response.status})`);
    }

    return data as T;
}

export function getOverwatchMe(token: string | undefined) {
    return request<OverwatchMe>('/overwatch/me', token);
}

export function retrieveOverwatchAssignment(token: string | undefined) {
    return request<OverwatchAssignment>('/overwatch/assignments/retrieve', token, {
        method: 'POST'
    });
}

export function submitOverwatchVote(
    token: string | undefined,
    assignmentId: string,
    verdict: OverwatchVerdict,
    reason: string,
    idempotencyKey: string
) {
    return request(`/overwatch/assignments/${assignmentId}/vote`, token, {
        method: 'POST',
        body: JSON.stringify({ verdict, reason, idempotencyKey })
    });
}

export function returnOverwatchAssignment(token: string | undefined, assignmentId: string) {
    return request(`/overwatch/assignments/${assignmentId}/return`, token, {
        method: 'POST'
    });
}

export type OverwatchRecordStatus = {
    recordId: number;
    status: string;
    recordsAhead: number | null;
    queuePosition: number | null;
    estimatedDays: { min: number; max: number; } | null;
    evidenceDeadline: string | null;
    appealDeadline: string | null;
    canSubmitEvidence: boolean;
    canAppeal: boolean;
};

export function getOverwatchRecordStatus(token: string | undefined, recordId: number) {
    return request<OverwatchRecordStatus>(`/overwatch/records/${recordId}/status`, token);
}

export function submitOverwatchEvidence(token: string | undefined, recordId: number, videoUrl: string) {
    return request(`/overwatch/records/${recordId}/evidence`, token, {
        method: 'POST',
        body: JSON.stringify({ videoUrl })
    });
}

export function submitOverwatchAppeal(
    token: string | undefined,
    recordId: number,
    reason: string,
    videoUrl: string
) {
    return request(`/overwatch/records/${recordId}/appeals`, token, {
        method: 'POST',
        body: JSON.stringify({ reason, videoUrl: videoUrl.trim() || null })
    });
}

export function getAdminOverwatchPlayer(token: string | undefined, uid: string) {
    return request<any>(`/overwatch/admin/players/${encodeURIComponent(uid)}`, token);
}

export function getAdminOverwatchMetrics(token: string | undefined) {
    return request<any>('/overwatch/admin/metrics', token);
}

export function setAdminOverwatchReputation(
    token: string | undefined,
    uid: string,
    score: number,
    reason: string
) {
    return request<any>(`/overwatch/admin/players/${encodeURIComponent(uid)}/reputation`, token, {
        method: 'PATCH',
        body: JSON.stringify({ score, reason })
    });
}

export function banAdminOverwatchPlayer(
    token: string | undefined,
    uid: string,
    reason: string,
    bannedUntil: string | null
) {
    return request<any>(`/overwatch/admin/players/${encodeURIComponent(uid)}/ban`, token, {
        method: 'PUT',
        body: JSON.stringify({ reason, bannedUntil })
    });
}

export function unbanAdminOverwatchPlayer(token: string | undefined, uid: string, reason: string) {
    return request<any>(`/overwatch/admin/players/${encodeURIComponent(uid)}/ban`, token, {
        method: 'DELETE',
        body: JSON.stringify({ reason })
    });
}
