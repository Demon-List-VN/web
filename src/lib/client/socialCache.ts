import { browser } from '$app/environment';
import { get, writable, type Writable } from 'svelte/store';
import {
	getSocialConversations,
	getSocialFriends,
	getSocialMessages,
	type SocialConversation,
	type SocialMessage,
	type SocialPlayer
} from '$lib/client/social';

const DB_NAME = 'gdvn-social-cache';
const DB_VERSION = 1;
const FRIENDS_STORE = 'friends';
const CONVERSATIONS_STORE = 'conversations';
const MESSAGES_STORE = 'messages';

type CacheRecord<T> = {
	key: string;
	uid: string;
	data: T;
	updatedAt: string;
};

type MessageCacheRecord = CacheRecord<SocialMessage[]> & {
	conversationId: string;
	complete: boolean;
};

type SocialMessageNotificationMetadata = {
	type?: string;
	conversationId?: number | string;
	message?: SocialMessage;
	conversation?: SocialConversation;
	sender?: SocialPlayer;
};

export const friendsStore = writable<SocialPlayer[]>([]);
export const conversationsStore = writable<SocialConversation[]>([]);

let currentUid = '';
let dbPromise: Promise<IDBDatabase> | null = null;
const messageStores = new Map<string, Writable<SocialMessage[]>>();

function nowIso() {
	return new Date().toISOString();
}

function messageRecordKey(uid: string, conversationId: number | string) {
	return `${uid}:${conversationId}`;
}

function openDb() {
	if (!browser) return Promise.resolve(null);
	if (dbPromise) return dbPromise;

	dbPromise = new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onupgradeneeded = () => {
			const db = request.result;
			for (const storeName of [FRIENDS_STORE, CONVERSATIONS_STORE, MESSAGES_STORE]) {
				if (!db.objectStoreNames.contains(storeName)) {
					db.createObjectStore(storeName, { keyPath: 'key' });
				}
			}
		};

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});

	return dbPromise;
}

function requestResult<T>(request: IDBRequest<T>) {
	return new Promise<T>((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

async function readRecord<T>(storeName: string, key: string): Promise<CacheRecord<T> | null> {
	const db = await openDb();
	if (!db) return null;

	const transaction = db.transaction(storeName, 'readonly');
	const record = await requestResult<CacheRecord<T> | undefined>(
		transaction.objectStore(storeName).get(key)
	);
	return record || null;
}

async function writeRecord<T>(storeName: string, record: CacheRecord<T>) {
	const db = await openDb();
	if (!db) return;

	const transaction = db.transaction(storeName, 'readwrite');
	await requestResult(transaction.objectStore(storeName).put(record));
}

async function readMessageRecord(uid: string, conversationId: number | string) {
	return readRecord<SocialMessage[]>(MESSAGES_STORE, messageRecordKey(uid, conversationId)) as Promise<MessageCacheRecord | null>;
}

async function writeMessageRecord(record: MessageCacheRecord) {
	await writeRecord<SocialMessage[]>(MESSAGES_STORE, record);
}

export function setSocialCacheUser(uid: string) {
	if (currentUid === uid) return;

	currentUid = uid;
	friendsStore.set([]);
	conversationsStore.set([]);
	for (const store of messageStores.values()) {
		store.set([]);
	}
	messageStores.clear();
}

export function resetSocialCacheState() {
	setSocialCacheUser('');
}

export async function hydrateSocialCache(uid: string) {
	if (!uid) return;
	setSocialCacheUser(uid);

	const [friendsRecord, conversationsRecord] = await Promise.all([
		readRecord<SocialPlayer[]>(FRIENDS_STORE, uid),
		readRecord<SocialConversation[]>(CONVERSATIONS_STORE, uid)
	]);

	if (currentUid !== uid) return;
	friendsStore.set(friendsRecord?.data || []);
	conversationsStore.set(sortConversations(conversationsRecord?.data || []));
}

export async function refreshSocialFriends(uid: string, token?: string | null) {
	const friends = await getSocialFriends(token);
	if (currentUid !== uid) return friends;

	friendsStore.set(friends);
	await writeRecord<SocialPlayer[]>(FRIENDS_STORE, {
		key: uid,
		uid,
		data: friends,
		updatedAt: nowIso()
	});
	return friends;
}

export async function refreshSocialConversations(uid: string, token?: string | null) {
	const conversations = sortConversations(await getSocialConversations(token));
	if (currentUid !== uid) return conversations;

	conversationsStore.set(conversations);
	await writeRecord<SocialConversation[]>(CONVERSATIONS_STORE, {
		key: uid,
		uid,
		data: conversations,
		updatedAt: nowIso()
	});
	return conversations;
}

function conversationStoreValue() {
	return get(conversationsStore);
}

function sortConversations(conversations: SocialConversation[]) {
	return [...conversations].sort((left, right) => {
		const leftMs = conversationTimeMs(left);
		const rightMs = conversationTimeMs(right);
		return (Number.isFinite(rightMs) ? rightMs : 0) - (Number.isFinite(leftMs) ? leftMs : 0);
	});
}

function conversationTimeMs(conversation: SocialConversation) {
	const raw =
		conversation.lastMessageAt ||
		conversation.latestMessage?.createdAt ||
		(conversation as any).updatedAt ||
		(conversation as any).createdAt ||
		0;
	const ms = new Date(raw as string | number).getTime();
	return Number.isFinite(ms) ? ms : 0;
}

export async function persistConversations(uid: string, conversations: SocialConversation[]) {
	const sorted = sortConversations(conversations);
	conversationsStore.set(sorted);
	await writeRecord<SocialConversation[]>(CONVERSATIONS_STORE, {
		key: uid,
		uid,
		data: sorted,
		updatedAt: nowIso()
	});
}

export async function upsertCachedConversation(uid: string, conversation: SocialConversation) {
	const conversationId = String(conversation.id);
	const next = [
		conversation,
		...conversationStoreValue().filter((item) => String(item.id) !== conversationId)
	];
	await persistConversations(uid, next);
}

export async function updateCachedConversationWithMessage(
	uid: string,
	conversationId: number | string,
	message: SocialMessage,
	conversation?: SocialConversation | null
) {
	if (conversation) {
		await upsertCachedConversation(uid, {
			...conversation,
			latestMessage: message,
			lastMessageAt: message.createdAt || conversation.lastMessageAt
		});
		return;
	}

	const conversationIdString = String(conversationId);
	const next = conversationStoreValue().map((item) =>
		String(item.id) === conversationIdString
			? {
					...item,
					latestMessage: message,
					lastMessageAt: message.createdAt || item.lastMessageAt,
					conversationStatus:
						item.pendingForUid === uid ? 'active' : item.conversationStatus,
					pendingForUid: item.pendingForUid === uid ? null : item.pendingForUid
				}
			: item
	);
	await persistConversations(uid, next);
}

export async function removeFriendFromCache(uid: string, playerUid: string) {
	const next = get(friendsStore).filter((friend) => friend.uid !== playerUid);
	friendsStore.set(next);
	await writeRecord<SocialPlayer[]>(FRIENDS_STORE, {
		key: uid,
		uid,
		data: next,
		updatedAt: nowIso()
	});
}

export async function removeConversationsWithPlayerFromCache(uid: string, playerUid: string) {
	const next = conversationStoreValue().filter(
		(conversation) => conversation.otherPlayer?.uid !== playerUid
	);
	await persistConversations(uid, next);
}

export function getConversationMessageStore(conversationId: number | string) {
	const key = String(conversationId);
	let store = messageStores.get(key);
	if (!store) {
		store = writable<SocialMessage[]>([]);
		messageStores.set(key, store);
	}
	return store;
}

function sortMessages(messages: SocialMessage[]) {
	return [...messages].sort((left, right) => {
		const leftId = Number(left.id);
		const rightId = Number(right.id);
		if (Number.isFinite(leftId) && Number.isFinite(rightId) && leftId !== rightId) {
			return leftId - rightId;
		}

		return (
			new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime()
		);
	});
}

function mergeMessages(left: SocialMessage[], right: SocialMessage[]) {
	const byId = new Map<string, SocialMessage>();
	for (const message of [...left, ...right]) {
		byId.set(String(message.id), message);
	}
	return sortMessages([...byId.values()]);
}

function lastMessage(messages: SocialMessage[]) {
	return messages[messages.length - 1] || null;
}

async function setCachedMessages(
	uid: string,
	conversationId: number | string,
	messages: SocialMessage[],
	complete: boolean
) {
	const conversationIdString = String(conversationId);
	const sorted = sortMessages(messages);
	getConversationMessageStore(conversationIdString).set(sorted);
	await writeMessageRecord({
		key: messageRecordKey(uid, conversationIdString),
		uid,
		conversationId: conversationIdString,
		data: sorted,
		complete,
		updatedAt: nowIso()
	});
}

export async function hydrateConversationMessages(uid: string, conversationId: number | string) {
	const record = await readMessageRecord(uid, conversationId);
	const messages = record?.data || [];
	getConversationMessageStore(conversationId).set(messages);
	return { messages, complete: Boolean(record?.complete), cached: Boolean(record) };
}

export async function ensureConversationMessages(
	uid: string,
	token: string | null | undefined,
	conversationId: number | string
) {
	const cached = await hydrateConversationMessages(uid, conversationId);
	if (cached.complete) {
		return cached.messages;
	}

	const messages = await getSocialMessages(token, conversationId);
	await setCachedMessages(uid, conversationId, messages, true);
	return messages;
}

export async function appendCachedMessages(
	uid: string,
	conversationId: number | string,
	messages: SocialMessage[],
	options: { complete?: boolean } = {}
) {
	if (!messages.length) return get(getConversationMessageStore(conversationId));

	const existingRecord = await readMessageRecord(uid, conversationId);
	const existing = existingRecord?.data?.length
		? existingRecord.data
		: get(getConversationMessageStore(conversationId));
	const merged = mergeMessages(existing, messages);
	const complete = options.complete ?? Boolean(existingRecord?.complete);
	await setCachedMessages(uid, conversationId, merged, complete);
	return merged;
}

export async function syncConversationMessagesAfter(
	uid: string,
	token: string | null | undefined,
	conversationId: number | string,
	afterId: number | string
) {
	const messages = await getSocialMessages(token, conversationId, { afterId });
	if (!messages.length) return [];

	await appendCachedMessages(uid, conversationId, messages);
	const latest = lastMessage(messages);
	if (latest) {
		await updateCachedConversationWithMessage(uid, conversationId, latest);
	}
	return messages;
}

export async function handleSocialMessageNotification(
	uid: string,
	token: string | null | undefined,
	metadata: SocialMessageNotificationMetadata | null | undefined
) {
	if (!uid || metadata?.type !== 'social_message' || !metadata.message) return false;

	const message = metadata.message;
	const conversationId = metadata.conversationId ?? message.conversationId;
	if (conversationId === undefined || conversationId === null || conversationId === '') return false;

	const existingRecord = await readMessageRecord(uid, conversationId);
	const existingMessages = existingRecord?.data?.length
		? existingRecord.data
		: get(getConversationMessageStore(conversationId));
	const previousLast = lastMessage(existingMessages);

	await appendCachedMessages(uid, conversationId, [message], {
		complete: Boolean(existingRecord?.complete)
	});
	await updateCachedConversationWithMessage(
		uid,
		conversationId,
		message,
		metadata.conversation || null
	);

	if (previousLast?.id !== undefined && previousLast?.id !== null) {
		await syncConversationMessagesAfter(uid, token, conversationId, previousLast.id);
	}

	return true;
}
