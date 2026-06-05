export type NotificationAction = 'accept' | 'reject';

export type UserNotification = {
    id?: number | string;
    content?: string | null;
    redirect?: string | null;
    timestamp?: string | null;
    to?: string | null;
    metadata?: {
        type?: string;
        actionEndpoints?: {
            accept?: string;
            reject?: string;
            decline?: string;
        };
        [key: string]: unknown;
    } | null;
};

export type SystemNotification = {
    id?: number | string;
    title?: string | null;
    content?: string | null;
    redirect?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    timestamp?: string | null;
    expiresAt?: string | null;
    expires_at?: string | null;
    enabled?: boolean | null;
};

export type PopupNotification = UserNotification & {
    popupId: string;
};

const SYSTEM_NOTIFICATION_READ_KEY_PREFIX = 'gdvn:system-notification-read:';

export function notificationKey(notification: UserNotification) {
    return String(
        notification.id
            ?? `${notification.timestamp ?? Date.now()}-${notification.redirect ?? ''}-${
                notification.content ?? ''
            }`
    );
}

export function systemNotificationKey(notification: SystemNotification) {
    return String(
        notification.id
            ?? `${notification.created_at ?? notification.timestamp ?? Date.now()}-${
                notification.redirect ?? ''
            }-${notification.content ?? ''}`
    );
}

export function systemNotificationTimestamp(notification: SystemNotification) {
    return notification.created_at ?? notification.timestamp ?? null;
}

export function systemNotificationExpiresAt(notification: SystemNotification) {
    return notification.expiresAt ?? notification.expires_at ?? null;
}

export function isExpiredSystemNotification(notification: SystemNotification) {
    const expiresAt = systemNotificationExpiresAt(notification);

    if (!expiresAt) {
        return true;
    }

    return new Date(expiresAt)
        .getTime() <= Date.now();
}

export function systemNotificationReadStorageKey(uid: string) {
    return `${SYSTEM_NOTIFICATION_READ_KEY_PREFIX}${uid}`;
}

export function readSystemNotificationIds(uid: string) {
    if (!uid || typeof localStorage === 'undefined') {
        return new Set<string>();
    }

    try {
        const parsed = JSON.parse(
            localStorage.getItem(systemNotificationReadStorageKey(uid)) || '[]'
        );

        return new Set<string>(
            Array.isArray(parsed) ? parsed.map((item) => String(item)) : []
        );
    } catch {
        return new Set<string>();
    }
}

export function writeSystemNotificationIds(uid: string, ids: Set<string>) {
    if (!uid || typeof localStorage === 'undefined') {
        return;
    }

    localStorage.setItem(
        systemNotificationReadStorageKey(uid),
        JSON.stringify([...ids])
    );
}

export function markSystemNotificationRead(uid: string, notification: SystemNotification) {
    const ids = readSystemNotificationIds(uid);
    ids.add(systemNotificationKey(notification));
    writeSystemNotificationIds(uid, ids);

    return ids;
}

export function pruneSystemNotificationReadIds(
    uid: string,
    notifications: SystemNotification[]
) {
    const activeIds = new Set(notifications.map(systemNotificationKey));
    const ids = readSystemNotificationIds(uid);
    const pruned = new Set([...ids].filter((id) => activeIds.has(id)));

    writeSystemNotificationIds(uid, pruned);

    return pruned;
}

export function actionEndpoint(notification: UserNotification, action: NotificationAction) {
    const endpoints = notification.metadata?.actionEndpoints;

    if (!endpoints) {
        return null;
    }

    return action === 'accept' ? endpoints.accept : endpoints.reject || endpoints.decline || null;
}

export function isActionableNotification(notification: UserNotification) {
    const type = notification.metadata?.type;

    return (
        (type === 'friend_request' || type === 'pvp_invite' || type === 'pvp_room_invite')
        && Boolean(actionEndpoint(notification, 'accept'))
        && Boolean(actionEndpoint(notification, 'reject'))
    );
}
