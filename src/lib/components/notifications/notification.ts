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

export type PopupNotification = UserNotification & {
    popupId: string;
};

export function notificationKey(notification: UserNotification) {
    return String(
        notification.id
            ?? `${notification.timestamp ?? Date.now()}-${notification.redirect ?? ''}-${
                notification.content ?? ''
            }`
    );
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
