<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Bell, Check, ExternalLink, Inbox, Loader2, Trash2, X } from 'lucide-svelte';
	import * as Popover from '$lib/components/ui/popover';
	import { Button } from '$lib/components/ui/button';
	import { user } from '$lib/client';
	import { handleSocialMessageNotification } from '$lib/client/socialCache';
	import supabase from '$lib/client/supabase';
	import { _, locale } from 'svelte-i18n';
	import { toast } from 'svelte-sonner';

	type Notification = {
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

	type PopupNotification = Notification & {
		popupId: string;
	};

	const POPUP_DURATION_MS = 6000;

	let notifications: Notification[] = [];
	let popups: PopupNotification[] = [];
	let activeUid = '';
	let loading = false;
	let clearing = false;
	let actionLoading = '';
	let cleanupRealtime: (() => Promise<void>) | null = null;
	const popupTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

	function notificationKey(notification: Notification) {
		return String(
			notification.id ??
				`${notification.timestamp ?? Date.now()}-${notification.redirect ?? ''}-${notification.content ?? ''}`
		);
	}

	function normalizeRedirect(redirect?: string | null) {
		if (!redirect) return null;

		try {
			const url = new URL(redirect);

			if (url.hostname === 'gdvn.net' || url.hostname === 'www.gdvn.net') {
				return `${url.pathname}${url.search}${url.hash}`;
			}

			return redirect;
		} catch {
			return redirect;
		}
	}

	function normalizeNotification(notification: Notification): Notification {
		return {
			...notification,
			redirect: normalizeRedirect(notification.redirect),
			timestamp: notification.timestamp ?? new Date().toISOString()
		};
	}

	function mergeNotification(notification: Notification) {
		const normalized = normalizeNotification(notification);
		const key = notificationKey(normalized);
		notifications = [normalized, ...notifications.filter((item) => notificationKey(item) !== key)];
	}

	async function handleSocialNotification(uid: string, notification: Notification) {
		if (notification.metadata?.type !== 'social_message') return;

		try {
			await handleSocialMessageNotification(uid, await $user.token(), notification.metadata);
		} catch (error) {
			console.warn('Failed to sync social message notification', error);
		}
	}

	function actionEndpoint(notification: Notification, action: 'accept' | 'reject') {
		const endpoints = notification.metadata?.actionEndpoints;
		if (!endpoints) return null;
		return action === 'accept' ? endpoints.accept : endpoints.reject || endpoints.decline || null;
	}

	function isActionable(notification: Notification) {
		const type = notification.metadata?.type;
		return (
			(type === 'friend_request' || type === 'pvp_invite') &&
			Boolean(actionEndpoint(notification, 'accept')) &&
			Boolean(actionEndpoint(notification, 'reject'))
		);
	}

	async function handleNotificationAction(
		event: MouseEvent,
		notification: Notification,
		action: 'accept' | 'reject'
	) {
		event.preventDefault();
		event.stopPropagation();

		const endpoint = actionEndpoint(notification, action);
		if (!endpoint || actionLoading) return;

		const key = `${notificationKey(notification)}:${action}`;
		actionLoading = key;

		try {
			const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
				method: 'POST',
				headers: {
					Authorization: 'Bearer ' + (await $user.token())!
				}
			});

			if (!response.ok) {
				let message = `Action failed: ${response.status}`;
				try {
					const payload = await response.json();
					message = payload?.error || payload?.message || message;
				} catch {
					// Keep status fallback.
				}
				throw new Error(message);
			}

			notifications = notifications.filter(
				(item) => notificationKey(item) !== notificationKey(notification)
			);
			toast.success(action === 'accept' ? $_('general.accept') : $_('general.reject'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Notification action failed');
		} finally {
			actionLoading = '';
		}
	}

	function addUnlockReminder() {
		if ($user.data?.recordCount !== 0) return;

		notifications = [
			{
				content:
					$locale == 'en'
						? 'Beat Platinum Adventure (or any level in the list) to fully unlock your account'
						: 'Đánh bại Platinum Adventure (hoặc bất cứ level nào trong list) để mở khóa toàn bộ tài khoản',
				redirect: '/level/5904109',
				timestamp: new Date().toISOString()
			}
		];
	}

	function timeSince(date: any) {
		const seconds = Math.max(
			0,
			Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000)
		);
		const intervals = [
			{ unit: 'year', seconds: 31536000 },
			{ unit: 'month', seconds: 2592000 },
			{ unit: 'day', seconds: 86400 },
			{ unit: 'hour', seconds: 3600 },
			{ unit: 'minute', seconds: 60 },
			{ unit: 'second', seconds: 1 }
		];

		for (const { unit, seconds: intervalSeconds } of intervals) {
			const count = Math.floor(seconds / intervalSeconds);
			if (count >= 1) {
				return count + ' ' + $_(`time_unit.${unit}`) + ($locale === 'en' && count > 1 ? 's' : '');
			}
		}

		return $_('time_unit.now').charAt(0).toUpperCase() + $_('time_unit.now').slice(1);
	}

	async function fetchNotifications(uid: string) {
		loading = true;

		try {
			const token = await $user.token();

			if (!token) {
				notifications = [];
				return;
			}

			const response = await fetch(`${import.meta.env.VITE_API_URL}/notifications/${uid}`, {
				headers: {
					Authorization: 'Bearer ' + token
				}
			});

			if (!response.ok) {
				throw new Error(`Failed to load notifications: ${response.status}`);
			}

			const data = await response.json();
			notifications = Array.isArray(data) ? data.map(normalizeNotification) : [];
		} catch {
			notifications = [];
		} finally {
			loading = false;
		}
	}

	function closePopup(popupId: string) {
		const timeout = popupTimeouts.get(popupId);

		if (timeout) {
			clearTimeout(timeout);
			popupTimeouts.delete(popupId);
		}

		popups = popups.filter((popup) => popup.popupId !== popupId);
	}

	function showPopup(notification: Notification) {
		const popupId = `${notificationKey(notification)}-${Date.now()}`;
		popups = [{ ...notification, popupId }, ...popups].slice(0, 3);

		const timeout = setTimeout(() => closePopup(popupId), POPUP_DURATION_MS);
		popupTimeouts.set(popupId, timeout);
	}

	async function setupRealtime(uid: string) {
		await cleanupRealtime?.();
		cleanupRealtime = null;

		const token = await $user.token();

		if (token) {
			supabase.realtime.setAuth(token);
		}

		const channel = supabase
			.channel(`notifications:${uid}`)
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'notifications',
					filter: `to=eq.${uid}`
				},
				(payload) => {
					const notification = normalizeNotification(payload.new as Notification);
					mergeNotification(notification);
					void handleSocialNotification(uid, notification);
					showPopup(notification);
				}
			)
			.subscribe();

		cleanupRealtime = async () => {
			await supabase.removeChannel(channel);
		};
	}

	async function clear() {
		if (!$user.loggedIn || !$user.data?.uid || clearing) return;

		clearing = true;
		notifications = [];
		addUnlockReminder();

		try {
			await fetch(`${import.meta.env.VITE_API_URL}/notifications/${$user.data.uid}`, {
				method: 'DELETE',
				headers: {
					Authorization: 'Bearer ' + (await $user.token())!
				}
			});
		} finally {
			clearing = false;
		}
	}

	$: if ($user.checked) {
		const uid = $user.loggedIn ? ($user.data?.uid ?? '') : '';

		if (uid !== activeUid) {
			activeUid = uid;
			notifications = [];
			popups = [];
			popupTimeouts.forEach(clearTimeout);
			popupTimeouts.clear();

			if (cleanupRealtime) {
				cleanupRealtime();
				cleanupRealtime = null;
			}

			if (uid) {
				fetchNotifications(uid);
				setupRealtime(uid);
			}
		}
	}

	onDestroy(() => {
		cleanupRealtime?.();
		popupTimeouts.forEach(clearTimeout);
		popupTimeouts.clear();
	});
</script>

<div class="notificationPopups" aria-live="polite">
	{#each popups as popup (popup.popupId)}
		<div class="notificationPopup">
			<div class="popupIcon">
				<Bell size={16} />
			</div>
			<a class="popupBody" href={popup.redirect || '#!'}>
				<span class="popupEyebrow">{$_('notifications.title')}</span>
				<span class="popupContent">{popup.content}</span>
			</a>
			<button
				class="popupClose"
				aria-label={$_('notifications.close')}
				on:click={() => closePopup(popup.popupId)}
			>
				<X size={14} />
			</button>
		</div>
	{/each}
</div>

<Popover.Root>
	<Popover.Trigger asChild let:builder>
		<button
			{...builder}
			use:builder.action
			class="notificationTrigger"
			aria-label={$_('notifications.title')}
		>
			<Bell size={18} />
			{#if notifications.length != 0}
				<span class="notificationBadge"
					>{notifications.length > 9 ? '9+' : notifications.length}</span
				>
			{/if}
		</button>
	</Popover.Trigger>
	<Popover.Content class="notificationCenter" align="end" sideOffset={10}>
		<div class="centerHeader">
			<div>
				<h4>{$_('notifications.title')}</h4>
				<p>{notifications.length} {$_('notifications.unread')}</p>
			</div>
			<Button
				variant="ghost"
				size="icon"
				class="clearButton"
				on:click={clear}
				disabled={notifications.length === 0 || clearing}
			>
				<Trash2 size={16} />
			</Button>
		</div>

		{#if loading}
			<div class="emptyState">
				<Inbox size={22} />
				<p>{$_('notifications.loading')}</p>
			</div>
		{:else if notifications.length == 0}
			<div class="emptyState">
				<Inbox size={22} />
				<p>{$_('notifications.no_noti')}</p>
			</div>
		{:else}
			<div class="notificationList">
				{#each notifications as notification (notificationKey(notification))}
					{#if isActionable(notification)}
						<div class="notificationItem actionableNotification">
							<span class="itemDot"></span>
							<span class="itemContent">
								<a class="messageLink" href={notification.redirect || '#!'}>
									<span class="message">{notification.content}</span>
									<span class="meta">
										{timeSince(notification.timestamp)}
										{$_('notifications.ago')}
										{#if notification.redirect}
											<ExternalLink size={13} />
										{/if}
									</span>
								</a>
								<span class="notificationActions">
									<Button
										size="sm"
										on:click={(event) => handleNotificationAction(event, notification, 'accept')}
										disabled={Boolean(actionLoading)}
									>
										{#if actionLoading === `${notificationKey(notification)}:accept`}
											<Loader2 class="h-4 w-4 animate-spin" />
										{:else}
											<Check class="h-4 w-4" />
										{/if}
										{$_('general.accept')}
									</Button>
									<Button
										size="sm"
										variant="outline"
										on:click={(event) => handleNotificationAction(event, notification, 'reject')}
										disabled={Boolean(actionLoading)}
									>
										{#if actionLoading === `${notificationKey(notification)}:reject`}
											<Loader2 class="h-4 w-4 animate-spin" />
										{:else}
											<X size={14} />
										{/if}
										{$_('general.reject')}
									</Button>
								</span>
							</span>
						</div>
					{:else}
						<a class="notificationItem" href={notification.redirect || '#!'}>
							<span class="itemDot"></span>
							<span class="itemContent">
								<span class="message">{notification.content}</span>
								<span class="meta">
									{timeSince(notification.timestamp)}
									{$_('notifications.ago')}
									{#if notification.redirect}
										<ExternalLink size={13} />
									{/if}
								</span>
							</span>
						</a>
					{/if}
				{/each}
			</div>
		{/if}
	</Popover.Content>
</Popover.Root>

<style lang="scss">
	.notificationTrigger {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border: 0;
		border-radius: 999px;
		background: transparent;
		color: var(--textColor2);
		cursor: pointer;
		transition:
			background-color 0.12s ease,
			color 0.12s ease;

		&:hover {
			background: hsl(var(--accent));
			color: var(--textColor1);
		}
	}

	.notificationBadge {
		position: absolute;
		top: 2px;
		right: 1px;
		min-width: 17px;
		height: 17px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0 4px;
		border: 2px solid var(--navbar-bg);
		border-radius: 999px;
		background: #ef4444;
		color: white;
		font-size: 10px;
		font-weight: 700;
		line-height: 1;
	}

	:global(.notificationCenter) {
		width: min(390px, calc(100vw - 24px));
		padding: 0;
		overflow: hidden;
		border-color: var(--border1);
		background: hsl(var(--popover));
		box-shadow: 0 20px 60px rgb(0 0 0 / 32%);
	}

	.centerHeader {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 14px 14px 12px;
		border-bottom: 1px solid var(--border1);

		h4,
		p {
			margin: 0;
		}

		h4 {
			font-size: 15px;
			font-weight: 700;
			line-height: 1.25;
		}

		p {
			margin-top: 2px;
			color: var(--textColor2);
			font-size: 12px;
		}
	}

	:global(.clearButton) {
		color: var(--textColor2);
	}

	.notificationList {
		max-height: min(440px, calc(100vh - 130px));
		overflow-y: auto;
		padding: 6px;
	}

	.notificationItem {
		display: grid;
		grid-template-columns: 8px 1fr;
		gap: 10px;
		padding: 11px 10px;
		border-radius: 7px;
		color: inherit;
		text-decoration: none;
		transition: background-color 0.12s ease;

		&:hover {
			background: hsl(var(--accent));
		}
	}

	.actionableNotification:hover {
		background: transparent;
	}

	.messageLink {
		display: grid;
		gap: 6px;
		color: inherit;
		text-decoration: none;
	}

	.notificationActions {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 4px;
	}

	.itemDot {
		width: 7px;
		height: 7px;
		margin-top: 6px;
		border-radius: 999px;
		background: #38bdf8;
	}

	.itemContent {
		min-width: 0;
		display: grid;
		gap: 6px;
	}

	.message {
		color: var(--textColor);
		font-size: 13px;
		line-height: 1.35;
		overflow-wrap: anywhere;
		white-space: pre-line;
	}

	.meta {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		color: var(--textColor2);
		font-size: 12px;
		line-height: 1;
	}

	.emptyState {
		min-height: 160px;
		display: grid;
		place-items: center;
		align-content: center;
		gap: 10px;
		color: var(--textColor2);

		p {
			margin: 0;
			font-size: 13px;
		}
	}

	.notificationPopups {
		position: fixed;
		top: calc(48px + 12px);
		right: 16px;
		z-index: 100000;
		width: min(380px, calc(100vw - 32px));
		display: grid;
		gap: 10px;
		pointer-events: none;
	}

	.notificationPopup {
		display: grid;
		grid-template-columns: 32px 1fr 26px;
		align-items: start;
		gap: 10px;
		min-height: 76px;
		padding: 12px 12px 12px 10px;
		border: 1px solid var(--border1);
		border-left: 3px solid #38bdf8;
		border-radius: 8px;
		background-color: hsl(var(--popover));
		background-image: linear-gradient(135deg, rgb(56 189 248 / 12%), transparent 58%);
		color: var(--textColor);
		box-shadow:
			0 18px 50px rgb(0 0 0 / 35%),
			0 0 0 1px rgb(255 255 255 / 4%) inset;
		pointer-events: auto;
		animation: popupIn 0.18s ease-out;
	}

	.popupIcon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 7px;
		background: hsl(var(--accent));
		color: var(--textColor);
	}

	.popupBody {
		min-width: 0;
		display: grid;
		gap: 4px;
		color: inherit;
		text-decoration: none;
	}

	.popupEyebrow {
		color: var(--textColor2);
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
	}

	.popupContent {
		font-size: 13px;
		line-height: 1.35;
		overflow-wrap: anywhere;
		white-space: pre-line;
	}

	.popupClose {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border: 0;
		border-radius: 6px;
		background: transparent;
		color: var(--textColor2);
		cursor: pointer;

		&:hover {
			background: hsl(var(--accent));
			color: var(--textColor);
		}
	}

	@keyframes popupIn {
		from {
			opacity: 0;
			transform: translateY(-6px);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
