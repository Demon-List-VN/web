<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Tabs from '$lib/components/ui/tabs';
	import AppearanceTab from './AppearanceTab.svelte';
	import BasicTab from './BasicTab.svelte';
	import CollaborationTab from './CollaborationTab.svelte';
	import DangerTab from './DangerTab.svelte';
	import FormulaTab from './FormulaTab.svelte';
	import LevelsTab from './LevelsTab.svelte';
	import RankTab from './RankTab.svelte';
	import imageCompression from 'browser-image-compression';
	import { onDestroy, onMount } from 'svelte';
	import {
		clearCustomListBranding,
		setCustomListBranding
	} from '$lib/client/customListBranding';
	import {
		normalizeCustomListRankBadges,
		type CustomListRankBadge
	} from '$lib/utils/customListRank';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';
	import {
		ArrowLeft,
		Eye,
		Globe2,
		EyeOff,
		Lock,
		Layers,
		Clock,
		Save,
		RefreshCw,
		AlertTriangle
	} from 'lucide-svelte';
	import { _ } from 'svelte-i18n';

	export let data: any;

	type CustomListItem = {
		id: number;
		levelId: number;
		created_at: string;
		minProgress: number | null;
		rating: number;
		position: number | null;
		videoID: string | null;
		level: {
			id: number;
			name: string | null;
			creator: string | null;
			difficulty: string | null;
			isPlatformer: boolean;
			minProgress: number | null;
			videoID?: string | null;
		} | null;
	};

	type CustomListResolvedRole = 'viewer' | 'owner' | 'admin' | 'helper' | 'moderator';

	type CustomListPermissionFlags = {
		canEditSettings: boolean;
		canEditLevels: boolean;
		canDelete: boolean;
		canBan: boolean;
		canManageMembers: boolean;
		canConfigureCollaboration: boolean;
		canTransferOwnership: boolean;
		canViewMembers: boolean;
		canViewAudit: boolean;
	};

	type CustomListMember = {
		id: number;
		uid: string;
		role: 'admin' | 'helper';
		created_at: string;
		updated_at: string;
		playerData?: any | null;
	};

	type CustomListAuditLogEntry = {
		id: number;
		created_at: string;
		action: string;
		actorUid: string | null;
		targetUid: string | null;
		metadata?: Record<string, any> | null;
		actorData?: any | null;
		targetData?: any | null;
	};

	type CustomList = {
		id: number;
		slug?: string | null;
		adminsCanManageHelpers?: boolean;
		owner: string;
		title: string;
		description: string;
		backgroundColor?: string | null;
		bannerUrl?: string | null;
		borderColor?: string | null;
		communityEnabled: boolean;
		faviconUrl?: string | null;
		isBanned: boolean;
		isPlatformer: boolean;
		isOfficial?: boolean;
		logoUrl?: string | null;
		topEnabled?: boolean;
		itemSort?: 'mode_default' | 'created_at';
		visibility: 'private' | 'unlisted' | 'public';
		mode: 'rating' | 'top';
		tags: string[];
		updated_at: string;
		lastRefreshedAt?: string | null;
		currentUserRole?: CustomListResolvedRole;
		permissions?: CustomListPermissionFlags;
		members?: CustomListMember[];
		auditLog?: CustomListAuditLogEntry[];
		rankBadges?: CustomListRankBadge[];
		weightFormula?: string;
		items: CustomListItem[];
		ownerData?: any;
	};

	type CustomListRankBadgeDraft = {
		name: string;
		shorthand: string;
		color: string;
		minRating: number | null | undefined;
		minTop: number | null | undefined;
	};

	type BatchAddLevelFailure = {
		levelId: number;
		message: string;
	};

	type BatchAddLevelInput = {
		levelId: number;
		rating?: number;
		top?: number;
		minProgress?: number;
		videoId?: string;
		createdAt?: string;
	};

	type BatchAddLevelsResult = {
		added: number;
		updated: number;
		skipped: number;
		failed: BatchAddLevelFailure[];
		aborted: boolean;
	};

	type BatchAddExistingLevelsResponse = {
		added: number;
		missingLevelIds: number[];
		list: CustomList;
	};

	type BatchAddProgressPhase = 'adding' | 'updating' | 'reordering';

	type BatchAddProgress = {
		total: number;
		completed: number;
		added: number;
		updated: number;
		skipped: number;
		failed: number;
		phase: BatchAddProgressPhase;
		currentLevelId: number | null;
		retrying: boolean;
		retryElapsedMs: number;
		aborted: boolean;
	};

	type ManageTab = 'basic' | 'appearance' | 'formula' | 'rank' | 'danger' | 'levels' | 'collaboration';

	const defaultPermissions: CustomListPermissionFlags = {
		canEditSettings: false,
		canEditLevels: false,
		canDelete: false,
		canBan: false,
		canManageMembers: false,
		canConfigureCollaboration: false,
		canTransferOwnership: false,
		canViewMembers: false,
		canViewAudit: false
	};

	// SSR data - hydrate into reactive local state
	let list: CustomList | null = data?.list ?? null;
	let loadingError = data?.error ?? '';
	let requiresAuthRecovery = Boolean(data?.requiresAuthRecovery);
	let authRecoveryLoading = requiresAuthRecovery;

	let savingMetadata = false;
	let addingLevel = false;
	let mutatingLevelId: number | null = null;
	let savingLevelItemId: number | null = null;
	let savingReorder = false;
	let refreshingLeaderboard = false;
	let savingBanState = false;
	let savingCollaboration = false;
	let hasUnsavedSettings = false;
	let initialSyncDone = false;
	let uploadingAsset: 'banner' | 'favicon' | 'logo' | null = null;
	let batchAddProgress: BatchAddProgress | null = null;
	let batchAddAbortController: AbortController | null = null;

	const CUSTOM_LIST_CDN_BASE_URL = 'https://cdn.gdvn.net';
	const CSV_IMPORT_RATE_LIMIT_RETRY_MS = 1000;
	const CSV_IMPORT_RATE_LIMIT_TIMEOUT_MS = 15000;
	const DEFAULT_ITEM_SORT: 'mode_default' | 'created_at' = 'mode_default';

	class BatchAddImportAbortedError extends Error {
		constructor() {
			super('Batch add import aborted');
			this.name = 'BatchAddImportAbortedError';
		}
	}

	let editForm = {
		title: '',
		description: '',
		backgroundColor: '',
		bannerUrl: '',
		borderColor: '',
		communityEnabled: true,
		faviconUrl: '',
		isPlatformer: false,
		logoUrl: '',
		topEnabled: true,
		itemSort: 'mode_default' as 'mode_default' | 'created_at',
		visibility: 'private' as 'private' | 'unlisted' | 'public',
		tags: '',
		mode: 'rating' as 'rating' | 'top',
		rankBadges: [] as CustomListRankBadgeDraft[],
		weightFormula: '1'
	};

	let activeTab: ManageTab = getInitialManageTab();
	let initialManageTabSettled = false;

	function getRequestedItemSort() {
		return $page.url.searchParams.get('itemSort') === 'created_at' ? 'created_at' : DEFAULT_ITEM_SORT;
	}

	function buildListRequestUrl(itemSort: 'mode_default' | 'created_at' = getRequestedItemSort()) {
		const query = new URLSearchParams();

		if (itemSort === 'created_at') {
			query.set('itemSort', itemSort);
		}

		return `${import.meta.env.VITE_API_URL}/lists/${$page.params.id}${query.size ? `?${query.toString()}` : ''}`;
	}

	function getInitialManageTab(): ManageTab {
		const requestedTab = $page.url.searchParams.get('tab');

		if (
			requestedTab === 'basic'
			|| requestedTab === 'appearance'
			|| requestedTab === 'formula'
			|| requestedTab === 'rank'
			|| requestedTab === 'collaboration'
			|| requestedTab === 'danger'
		) {
			return requestedTab;
		}

		if (requestedTab === 'levels') {
			return 'levels';
		}

		return 'basic';
	}

	function syncForm() {
		if (!list) return;
		editForm.title = list.title;
		editForm.description = list.description;
		editForm.backgroundColor = list.backgroundColor || '';
		editForm.bannerUrl = list.bannerUrl || '';
		editForm.borderColor = list.borderColor || '';
		editForm.communityEnabled = list.communityEnabled;
		editForm.faviconUrl = list.faviconUrl || '';
		editForm.isPlatformer = list.isPlatformer;
		editForm.logoUrl = list.logoUrl || '';
		editForm.topEnabled = list.topEnabled ?? true;
		editForm.itemSort = list.itemSort || 'mode_default';
		editForm.visibility = list.visibility;
		editForm.tags = list.tags.join(', ');
		editForm.mode = list.mode;
		editForm.rankBadges = normalizeCustomListRankBadges(list.rankBadges).map((rankBadge) => ({
			...rankBadge
		}));
		editForm.weightFormula = list.weightFormula || '1';
	}

	function getRankBadgeSnapshot(rankBadges: CustomListRankBadgeDraft[] | CustomListRankBadge[] | null | undefined) {
		return normalizeCustomListRankBadges(rankBadges).map((rankBadge) => ({
			name: rankBadge.name,
			shorthand: rankBadge.shorthand,
			color: rankBadge.color,
			minRating: rankBadge.minRating,
			minTop: rankBadge.minTop
		}));
	}

	function getSavedSettingsSnapshot(currentList: CustomList | null) {
		if (!currentList) {
			return null;
		}

		return {
			title: currentList.title,
			description: currentList.description,
			backgroundColor: currentList.backgroundColor || '',
			bannerUrl: currentList.bannerUrl || '',
			borderColor: currentList.borderColor || '',
			communityEnabled: currentList.communityEnabled,
			faviconUrl: currentList.faviconUrl || '',
			isPlatformer: currentList.isPlatformer,
			logoUrl: currentList.logoUrl || '',
			topEnabled: currentList.topEnabled ?? true,
			visibility: currentList.visibility,
			tags: currentList.tags,
			mode: currentList.mode,
			rankBadges: getRankBadgeSnapshot(currentList.rankBadges),
			weightFormula: currentList.weightFormula || '1'
		};
	}

	function getEditableSettingsSnapshot() {
		return {
			title: editForm.title,
			description: editForm.description,
			backgroundColor: editForm.backgroundColor,
			bannerUrl: editForm.bannerUrl,
			borderColor: editForm.borderColor,
			communityEnabled: editForm.communityEnabled,
			faviconUrl: editForm.faviconUrl,
			isPlatformer: editForm.isPlatformer,
			logoUrl: editForm.logoUrl,
			topEnabled: editForm.topEnabled,
			visibility: editForm.visibility,
			tags: parseTags(editForm.tags),
			mode: editForm.mode,
			rankBadges: getRankBadgeSnapshot(editForm.rankBadges),
			weightFormula: editForm.weightFormula
		};
	}

	function getSettingsSnapshotKey(value: unknown) {
		return JSON.stringify(value);
	}

	// Sync form when list changes from SSR data
	$: if (list && !initialSyncDone) {
		initialSyncDone = true;
		syncForm();
	}
	$: hasUnsavedSettings = Boolean(
		list
		&& canEditSettings
		&& getSettingsSnapshotKey(getEditableSettingsSnapshot()) !== getSettingsSnapshotKey(getSavedSettingsSnapshot(list))
	);

	// Re-fetch with auth once user is available so managers and owners can recover private lists.
	$: if ($user.checked && $user.loggedIn) {
		refetchWithAuth();
	}
	$: if (requiresAuthRecovery && $user.checked && !$user.loggedIn && !list) {
		loadingError = 'This list is private';
		authRecoveryLoading = false;
		requiresAuthRecovery = false;
	}

	onMount(() => {
		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			if (!addingLevel && !hasUnsavedSettings) {
				return;
			}

			event.preventDefault();
			event.returnValue = addingLevel
				? $_('custom_lists.detail.add_level.csv_close_warning')
				: $_('custom_lists.manage.unsaved_settings_close_warning');
			return event.returnValue;
		};

		window.addEventListener('beforeunload', handleBeforeUnload);

		return () => {
			window.removeEventListener('beforeunload', handleBeforeUnload);
		};
	});

	let authFetchKey = '';
	async function refetchWithAuth(force: boolean = false, itemSort: 'mode_default' | 'created_at' = getRequestedItemSort()) {
		const key = `${$page.params.id}:${$user.data?.uid}:${itemSort}`;
		if (!force && key === authFetchKey) return;
		authFetchKey = key;
		const recoveringPrivateList = requiresAuthRecovery;

		if (recoveringPrivateList) {
			authRecoveryLoading = true;
		}

		try {
			const res = await fetch(buildListRequestUrl(itemSort), {
				headers: { Authorization: `Bearer ${await $user.token()}` }
			});
			const payload = await res.json().catch(() => null);
			if (res.ok && payload) {
				list = payload as CustomList;
				loadingError = '';
				syncForm();
				return;
			}

			if (recoveringPrivateList) {
				loadingError = payload?.error || 'Failed to load list';
			}
		} catch {
			if (recoveringPrivateList) {
				loadingError = 'Failed to load list';
			}
		} finally {
			if (recoveringPrivateList) {
				authRecoveryLoading = false;
				requiresAuthRecovery = false;
			}
		}
	}

	async function updateItemSort(nextItemSort: 'mode_default' | 'created_at') {
		if (!list) return;
		if (editForm.itemSort === nextItemSort && (list.itemSort || DEFAULT_ITEM_SORT) === nextItemSort) {
			return;
		}

		editForm.itemSort = nextItemSort;

		const nextSearchParams = new URLSearchParams($page.url.searchParams);

		if (nextItemSort === DEFAULT_ITEM_SORT) {
			nextSearchParams.delete('itemSort');
		} else {
			nextSearchParams.set('itemSort', nextItemSort);
		}

		const nextSearch = nextSearchParams.toString();
		await goto(`${$page.url.pathname}${nextSearch ? `?${nextSearch}` : ''}`, {
			keepFocus: true,
			noScroll: true,
			replaceState: true
		});
		await refetchWithAuth(true, nextItemSort);
	}

	function parseTags(tags: string) {
		return tags.split(',').map((tag) => tag.trim()).filter(Boolean);
	}

	function formatVisibility(visibility: string) {
		if (visibility === 'public') return $_('custom_lists.visibility.public');
		if (visibility === 'unlisted') return $_('custom_lists.visibility.unlisted');
		return $_('custom_lists.visibility.private');
	}

	function formatListType(isPlatformer: boolean) {
		return isPlatformer ? $_('custom_lists.type.platformer') : $_('custom_lists.type.classic');
	}

	function formatDate(value: string) {
		return new Date(value).toLocaleDateString('vi-VN', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function formatDateTime(value: string) {
		return new Date(value).toLocaleString('vi-VN', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getRoleLabel(role: string) {
		if (role === 'owner') return $_('custom_lists.manage.roles.owner');
		if (role === 'admin') return $_('custom_lists.manage.roles.admin');
		if (role === 'helper') return $_('custom_lists.manage.roles.helper');
		if (role === 'moderator') return $_('custom_lists.manage.roles.moderator');
		return $_('custom_lists.manage.roles.viewer');
	}

	async function searchPlayersForCollaboration(query: string) {
		if (!query.trim().length) {
			return [];
		}

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/community/players/search?q=${encodeURIComponent(query.trim())}`);
			const payload = await res.json().catch(() => []);

			if (!res.ok) {
				throw new Error($_('custom_lists.toast.failed_player_search'));
			}

			return Array.isArray(payload) ? payload : [];
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_player_search'));
			return [];
		}
	}

	async function updateCollaborationSettings(adminsCanManageHelpers: boolean) {
		if (!list || !canConfigureCollaboration) return;

		savingCollaboration = true;

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${list.id}/collaboration`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ adminsCanManageHelpers })
			});
			const payload = await res.json();
			if (!res.ok) throw new Error(payload.error || $_('custom_lists.toast.failed_collaboration_update'));
			list = payload;
			syncForm();
			toast.success($_('custom_lists.toast.collaboration_updated'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_collaboration_update'));
		} finally {
			savingCollaboration = false;
		}
	}

	async function addCollaborator(selectedMember: any, collaboratorRole: 'admin' | 'helper') {
		if (!list || !selectedMember || !canManageMembers) return;

		savingCollaboration = true;

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${list.id}/members`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					uid: selectedMember.uid,
					role: canConfigureCollaboration ? collaboratorRole : 'helper'
				})
			});
			const payload = await res.json();
			if (!res.ok) throw new Error(payload.error || $_('custom_lists.toast.failed_add_collaborator'));
			list = payload;
			syncForm();
			toast.success($_('custom_lists.toast.collaborator_added'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_add_collaborator'));
		} finally {
			savingCollaboration = false;
		}
	}

	async function updateCollaboratorRole(member: CustomListMember | null, role: 'admin' | 'helper') {
		if (!list || !member || !canConfigureCollaboration) return;

		savingCollaboration = true;

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${list.id}/members/${member.uid}`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ role })
			});
			const payload = await res.json();
			if (!res.ok) throw new Error(payload.error || $_('custom_lists.toast.failed_update_collaborator'));
			list = payload;
			syncForm();
			toast.success($_('custom_lists.toast.collaborator_role_updated'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_update_collaborator'));
		} finally {
			savingCollaboration = false;
		}
	}

	async function removeCollaborator(member: CustomListMember) {
		if (!list || !canManageMembers) return;
		if (!canConfigureCollaboration && member.role !== 'helper') return;

		savingCollaboration = true;

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${list.id}/members/${member.uid}`, {
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${await $user.token()}`
				}
			});
			const payload = await res.json();
			if (!res.ok) throw new Error(payload.error || $_('custom_lists.toast.failed_remove_collaborator'));
			list = payload;
			syncForm();
			toast.success($_('custom_lists.toast.collaborator_removed'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_remove_collaborator'));
		} finally {
			savingCollaboration = false;
		}
	}

	async function transferOwnership(selectedMember: any) {
		if (!list || !selectedMember || !canTransferOwnership) return;

		savingCollaboration = true;

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${list.id}/ownership`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ uid: selectedMember.uid })
			});
			const payload = await res.json();
			if (!res.ok) throw new Error(payload.error || $_('custom_lists.toast.failed_transfer_ownership'));
			list = payload;
			syncForm();
			toast.success($_('custom_lists.toast.ownership_transferred'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_transfer_ownership'));
		} finally {
			savingCollaboration = false;
		}
	}

	function isTabAllowed(tab: ManageTab) {
		if (tab === 'levels') return true;
		if (tab === 'danger') return canBan || canDelete;
		if (tab === 'collaboration') return canShowCollaboration;
		return canEditSettings;
	}

	function isHexColor(value: string | null | undefined) {
		return typeof value === 'string' && /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value.trim());
	}

	function withHexAlpha(color: string, alpha: string) {
		const normalized = color.trim();
		return normalized.length === 9 ? `${normalized.slice(0, 7)}${alpha}` : `${normalized}${alpha}`;
	}

	function hexToRgb(color: string) {
		const normalized = color.trim().slice(1, 7);
		return {
			r: Number.parseInt(normalized.slice(0, 2), 16),
			g: Number.parseInt(normalized.slice(2, 4), 16),
			b: Number.parseInt(normalized.slice(4, 6), 16)
		};
	}

	function isLightColor(color: string) {
		const { r, g, b } = hexToRgb(color);
		const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
		return luminance >= 0.62;
	}

	function getThemedSurfaceStyle(backgroundColor: string | null, borderColor: string | null) {
		const styles: string[] = [];

		if (backgroundColor) {
			const lightBackground = isLightColor(backgroundColor);
			styles.push(
				`background: ${backgroundColor}; --custom-surface-foreground: ${lightBackground ? '#0f172a' : '#f8fafc'}; --custom-surface-muted: ${lightBackground ? 'rgba(15, 23, 42, 0.72)' : 'rgba(248, 250, 252, 0.78)'}; --custom-surface-chip-background: ${lightBackground ? 'rgba(15, 23, 42, 0.12)' : 'rgba(248, 250, 252, 0.16)'};`
			);
		}

		if (borderColor) {
			styles.push(`border-color: ${borderColor};`);
			styles.push(`box-shadow: 0 0 0 1px ${withHexAlpha(borderColor, '22')};`);
		}

		return styles.length ? styles.join(' ') : undefined;
	}

	function getManageHeroBannerUrl() {
		if (initialSyncDone) {
			const value = editForm.bannerUrl.trim();
			return /^https?:\/\//i.test(value) ? value : null;
		}

		return list?.bannerUrl ?? null;
	}

	function getManagePreviewTitle() {
		if (initialSyncDone) {
			return editForm.title.trim() || $_('custom_lists.detail.edit.preview_title');
		}

		return list?.title || $_('custom_lists.detail.edit.preview_title');
	}

	function getManagePreviewDescription() {
		if (initialSyncDone) {
			return editForm.description.trim() || $_('custom_lists.detail.no_description');
		}

		return list?.description || $_('custom_lists.detail.no_description');
	}

	function getManagePreviewTags() {
		if (initialSyncDone) {
			return parseTags(editForm.tags);
		}

		return list?.tags ?? [];
	}

	function getImageExtension(file: File) {
		const normalizedType = file.type.toLowerCase();
		if (normalizedType === 'image/x-icon' || normalizedType === 'image/vnd.microsoft.icon') return 'ico';
		if (normalizedType === 'image/png') return 'png';
		if (normalizedType === 'image/webp') return 'webp';
		if (normalizedType === 'image/gif') return 'gif';

		const normalizedName = file.name.toLowerCase();
		if (normalizedName.endsWith('.ico')) return 'ico';
		if (normalizedName.endsWith('.png')) return 'png';
		if (normalizedName.endsWith('.webp')) return 'webp';
		if (normalizedName.endsWith('.gif')) return 'gif';

		return 'jpg';
	}

	function getImageContentType(file: File, extension: string) {
		if (file.type) {
			return file.type;
		}

		if (extension === 'png') return 'image/png';
		if (extension === 'ico') return 'image/x-icon';
		if (extension === 'webp') return 'image/webp';
		if (extension === 'gif') return 'image/gif';
		return 'image/jpeg';
	}

	function getCustomListAssetPath(asset: 'banner' | 'favicon' | 'logo', extension: string) {
		return `custom-lists/${$user.data?.uid}/${list?.id}/${asset}.${extension}`;
	}

	function getCustomListAssetUrl(path: string) {
		return `${CUSTOM_LIST_CDN_BASE_URL}/${path}?v=${Date.now()}`;
	}

	async function normalizeCustomListAsset(file: File, asset: 'banner' | 'favicon' | 'logo') {
		const extension = getImageExtension(file);

		if (extension === 'gif' || extension === 'ico') {
			return file;
		}

		return imageCompression(file, {
			maxSizeMB: asset === 'banner' ? 4.5 : asset === 'favicon' ? 0.2 : 0.35,
			maxWidthOrHeight: asset === 'banner' ? 1920 : asset === 'favicon' ? 128 : 512,
			useWebWorker: true
			});
	}

	async function uploadCustomListAsset(asset: 'banner' | 'favicon' | 'logo', selectedFile: File) {
		if (!list || !canEditSettings) return;

		if (!selectedFile) {
			return null;
		}

		if (!selectedFile.type.startsWith('image/')) {
			toast.error($_('custom_lists.toast.invalid_image'));
			return null;
		}

		uploadingAsset = asset;

		try {
			const token = await $user.token();
			const ownerUid = $user.data?.uid;

			if (!token || !ownerUid) {
				throw new Error($_('custom_lists.toast.failed_upload_image'));
			}

			const preparedFile = await normalizeCustomListAsset(selectedFile, asset);
			const extension = getImageExtension(preparedFile);
			const assetPath = getCustomListAssetPath(asset, extension);

			const presignRes = await fetch(
				`${import.meta.env.VITE_API_URL}/storage/presign?path=${encodeURIComponent(assetPath)}`,
				{
					headers: {
						Authorization: `Bearer ${token}`
					}
				}
			);

			if (!presignRes.ok) {
				throw new Error($_('custom_lists.toast.failed_upload_image'));
			}

			const presignedUrl = await presignRes.text();
			const uploadRes = await fetch(presignedUrl, {
				method: 'PUT',
				headers: {
					'Content-Type': getImageContentType(preparedFile, extension)
				},
				body: preparedFile
			});

			if (!uploadRes.ok) {
				throw new Error($_('custom_lists.toast.failed_upload_image'));
			}

			const uploadedUrl = getCustomListAssetUrl(assetPath);

			toast.success($_('custom_lists.toast.image_uploaded_save'));
			return uploadedUrl;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_upload_image'));
			return null;
		} finally {
			uploadingAsset = null;
		}
	}

	function getVisibilityIcon(v: string) {
		if (v === 'public') return Globe2;
		if (v === 'unlisted') return EyeOff;
		return Lock;
	}

	function getLeaderboardRefreshToastMessage(payload: { total?: number; totalRecords?: number } | null) {
		const refreshedTotal = typeof payload?.total === 'number' ? payload.total : null;
		const refreshedRecordTotal = typeof payload?.totalRecords === 'number' ? payload.totalRecords : null;

		if (refreshedTotal == null) {
			return $_('custom_lists.toast.leaderboard_refreshed');
		}

		if (refreshedRecordTotal == null) {
			return $_('custom_lists.toast.leaderboard_refreshed_players', {
				values: { total: refreshedTotal }
			});
		}

		return $_('custom_lists.toast.leaderboard_refreshed_records', {
			values: {
				total: refreshedTotal,
				totalRecords: refreshedRecordTotal
			}
		});
	}

	// Mutations
	async function saveMetadata() {
		if (!list || !canEditSettings) return;
		if (!editForm.title.trim()) {
			toast.error($_('custom_lists.toast.title_required'));
			return;
		}

		const currentItemSort = editForm.itemSort;
		const formulaChanged = Boolean(
			list && getEditableSettingsSnapshot().weightFormula !== getSavedSettingsSnapshot(list)?.weightFormula
		);

		savingMetadata = true;
		const savingToast = toast.loading($_('custom_lists.toast.saving_list'));
		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${list.id}`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					title: editForm.title,
					description: editForm.description,
					backgroundColor: editForm.backgroundColor,
					bannerUrl: editForm.bannerUrl,
					borderColor: editForm.borderColor,
					communityEnabled: editForm.communityEnabled,
					faviconUrl: editForm.faviconUrl,
					isPlatformer: editForm.isPlatformer,
					logoUrl: editForm.logoUrl,
					topEnabled: editForm.topEnabled,
					visibility: editForm.visibility,
					tags: parseTags(editForm.tags),
					mode: editForm.mode,
					rankBadges: editForm.rankBadges.map((rankBadge) => ({
						name: rankBadge.name,
						shorthand: rankBadge.shorthand,
						color: rankBadge.color,
						minRating: rankBadge.minRating,
						minTop: rankBadge.minTop
					})),
					weightFormula: editForm.weightFormula
				})
			});
			const payload = await res.json();
			if (!res.ok) throw new Error(payload.error || $_('custom_lists.toast.failed_update'));
			list = {
				...payload,
				itemSort: currentItemSort
			};
			syncForm();
			toast.dismiss(savingToast);
			toast.success($_('custom_lists.toast.list_updated'));

			if (formulaChanged) {
				await refreshLeaderboardPrecalc({
					reloadList: true,
					itemSort: currentItemSort
				});
			} else if (currentItemSort === 'created_at') {
				await refetchWithAuth(true, currentItemSort);
			}
		} catch (error) {
			toast.dismiss(savingToast);
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_update'));
		} finally {
			savingMetadata = false;
		}
	}

	async function refreshLeaderboardPrecalc(options: { reloadList?: boolean; itemSort?: 'mode_default' | 'created_at' } = {}) {
		if (!list || !canEditSettings || refreshingLeaderboard) return;

		refreshingLeaderboard = true;
		const refreshToast = toast.loading($_('custom_lists.toast.refreshing_leaderboard'));

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${list.id}/leaderboard/refresh`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${await $user.token()}`
				}
			});

			const payload = await res.json().catch(() => null);

			if (!res.ok) {
				throw new Error(payload?.error || 'Failed to refresh leaderboard');
			}

			if (list) {
				list = {
					...list,
					lastRefreshedAt: payload?.lastRefreshedAt ?? list.lastRefreshedAt ?? null
				};
			}

			if (options.reloadList !== false) {
				await refetchWithAuth(true, options.itemSort ?? editForm.itemSort);
			}

			toast.dismiss(refreshToast);
			toast.success(getLeaderboardRefreshToastMessage(payload));
		} catch (error) {
			toast.dismiss(refreshToast);
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_refresh_leaderboard'));
		} finally {
			refreshingLeaderboard = false;
		}
	}

	function handleRefreshLeaderboardClick() {
		void refreshLeaderboardPrecalc();
	}

	async function deleteList(confirmationName: string) {
		if (!list || !canDelete) return;
		if (confirmationName.trim() !== list.title) {
			toast.error($_('custom_lists.manage.confirm_title_error'));
			return;
		}

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${list.id}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${await $user.token()}` }
			});
			if (!res.ok) {
				const payload = await res.json().catch(() => null);
				throw new Error(payload?.error || $_('custom_lists.toast.failed_delete'));
			}
			toast.success($_('custom_lists.toast.list_deleted'));
			goto('/lists');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_delete'));
		}
	}

	function isBatchAddAbortError(error: unknown) {
		return error instanceof BatchAddImportAbortedError
			|| (error instanceof DOMException && error.name === 'AbortError')
			|| (error instanceof Error && error.name === 'AbortError');
	}

	function throwIfBatchAddAborted(signal?: AbortSignal) {
		if (signal?.aborted) {
			throw new BatchAddImportAbortedError();
		}
	}

	function sleep(ms: number, signal?: AbortSignal) {
		return new Promise<void>((resolve, reject) => {
			if (signal?.aborted) {
				reject(new BatchAddImportAbortedError());
				return;
			}

			const timeoutId = setTimeout(() => {
				signal?.removeEventListener('abort', onAbort);
				resolve();
			}, ms);

			function onAbort() {
				clearTimeout(timeoutId);
				signal?.removeEventListener('abort', onAbort);
				reject(new BatchAddImportAbortedError());
			}

			signal?.addEventListener('abort', onAbort, { once: true });
		});
	}

	function hasBatchLevelPatch(levelInput: BatchAddLevelInput) {
		return Number.isInteger(levelInput.rating)
			|| Number.isInteger(levelInput.minProgress)
			|| (typeof levelInput.videoId === 'string' && levelInput.videoId.length > 0)
			|| (typeof levelInput.createdAt === 'string' && levelInput.createdAt.length > 0);
	}

	function hasBatchLevelTopOverride(levelInput: BatchAddLevelInput) {
		return Number.isInteger(levelInput.top);
	}

	function buildBatchUpdateLevelPatch(levelInput: BatchAddLevelInput) {
		const patch: { rating?: number; minProgress?: number; videoID?: string | null; createdAt?: string } = {};

		if (Number.isInteger(levelInput.rating)) {
			patch.rating = levelInput.rating;
		}

		if (Number.isInteger(levelInput.minProgress)) {
			patch.minProgress = levelInput.minProgress;
		}

		if (typeof levelInput.videoId === 'string' && levelInput.videoId.length) {
			patch.videoID = levelInput.videoId;
		}

		if (typeof levelInput.createdAt === 'string' && levelInput.createdAt.length) {
			patch.createdAt = levelInput.createdAt;
		}

		return patch;
	}

	function createBatchAddProgress(total: number, skipped: number): BatchAddProgress {
		return {
			total,
			completed: 0,
			added: 0,
			updated: 0,
			skipped,
			failed: 0,
			phase: 'adding',
			currentLevelId: null,
			retrying: false,
			retryElapsedMs: 0,
			aborted: false
		};
	}

	function updateBatchAddProgress(patch: Partial<BatchAddProgress>) {
		if (!batchAddProgress) return;

		batchAddProgress = {
			...batchAddProgress,
			...patch
		};
	}

	function incrementBatchAddProgress(patch: Partial<BatchAddProgress> = {}) {
		if (!batchAddProgress) return;

		const nextCompleted = Math.min(batchAddProgress.completed + 1, batchAddProgress.total);
		batchAddProgress = {
			...batchAddProgress,
			...patch,
			completed: nextCompleted,
			retrying: false,
			retryElapsedMs: 0
		};
	}

	async function withRateLimitRetry<T extends { ok: boolean; status?: number; error?: string }>(
		request: () => Promise<T>,
		options: {
			phase: BatchAddProgressPhase;
			levelId: number | null;
			timeoutError: string;
			signal?: AbortSignal;
		}
	) {
		const startedAt = Date.now();

		while (true) {
			throwIfBatchAddAborted(options.signal);
			updateBatchAddProgress({
				phase: options.phase,
				currentLevelId: options.levelId,
				retrying: false,
				aborted: false
			});

			let result: T;

			try {
				result = await request();
			} catch (error) {
				if (isBatchAddAbortError(error)) {
					throw new BatchAddImportAbortedError();
				}

				throw error;
			}

			if (result.ok || result.status !== 429) {
				updateBatchAddProgress({
					phase: options.phase,
					currentLevelId: options.levelId,
					retrying: false,
					retryElapsedMs: 0,
					aborted: false
				});
				return result;
			}

			const elapsed = Date.now() - startedAt;
			if (elapsed + CSV_IMPORT_RATE_LIMIT_RETRY_MS > CSV_IMPORT_RATE_LIMIT_TIMEOUT_MS) {
				updateBatchAddProgress({
					phase: options.phase,
					currentLevelId: options.levelId,
					retrying: false,
					retryElapsedMs: CSV_IMPORT_RATE_LIMIT_TIMEOUT_MS
				});

				return {
					...result,
					error: options.timeoutError
				};
			}

			updateBatchAddProgress({
				phase: options.phase,
				currentLevelId: options.levelId,
				retrying: true,
				retryElapsedMs: elapsed + CSV_IMPORT_RATE_LIMIT_RETRY_MS,
				aborted: false
			});

			await sleep(CSV_IMPORT_RATE_LIMIT_RETRY_MS, options.signal);
		}
	}

	async function requestAddLevel(listId: number, levelId: number, createdAt?: string, signal?: AbortSignal) {
		const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${listId}/levels`, {
			method: 'POST',
			signal,
			headers: {
				Authorization: `Bearer ${await $user.token()}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				levelId,
				...(createdAt ? { createdAt } : {})
			})
		});
		const payload = await res.json().catch(() => null);

		if (!res.ok) {
			return {
				ok: false as const,
				status: res.status,
				error: payload?.error || $_('custom_lists.toast.failed_add_level')
			};
		}

		return {
			ok: true as const,
			payload: payload as CustomList
		};
	}

	async function requestBatchAddExistingLevels(listId: number, levelInputs: Array<Pick<BatchAddLevelInput, 'levelId' | 'createdAt'>>, signal?: AbortSignal) {
		const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${listId}/levels/batch`, {
			method: 'POST',
			signal,
			headers: {
				Authorization: `Bearer ${await $user.token()}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ levelInputs })
		});
		const payload = await res.json().catch(() => null);

		if (!res.ok) {
			return {
				ok: false as const,
				status: res.status,
				error: payload?.error || $_('custom_lists.toast.failed_add_level')
			};
		}

		return {
			ok: true as const,
			payload: payload as BatchAddExistingLevelsResponse
		};
	}

	async function requestUpdateLevel(listId: number, levelId: number, patch: { rating?: number; minProgress?: number | null; videoID?: string | null; createdAt?: string }, signal?: AbortSignal) {
		const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${listId}/levels/${levelId}`, {
			method: 'PATCH',
			signal,
			headers: {
				Authorization: `Bearer ${await $user.token()}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(patch)
		});
		const payload = await res.json().catch(() => null);

		if (!res.ok) {
			return {
				ok: false as const,
				status: res.status,
				error: payload?.error || $_('custom_lists.toast.failed_update_level')
			};
		}

		return {
			ok: true as const,
			payload: payload as CustomList
		};
	}

	async function requestReorderLevels(listId: number, levelIds: number[], signal?: AbortSignal) {
		const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${listId}/reorder`, {
			method: 'PATCH',
			signal,
			headers: {
				Authorization: `Bearer ${await $user.token()}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ levelIds })
		});
		const payload = await res.json().catch(() => null);

		if (!res.ok) {
			return {
				ok: false as const,
				status: res.status,
				error: payload?.error || $_('custom_lists.toast.failed_reorder')
			};
		}

		return {
			ok: true as const,
			payload: payload as CustomList
		};
	}

	function buildReorderedLevelIds(currentLevelIds: number[], levelsWithTop: Array<BatchAddLevelInput & { inputIndex: number }>) {
		const orderedOverrides = levelsWithTop
			.filter((entry): entry is BatchAddLevelInput & { top: number; inputIndex: number } => Number.isInteger(entry.top))
			.sort((left, right) => (left.top - right.top) || (left.inputIndex - right.inputIndex));

		const overrideIds = new Set(orderedOverrides.map((entry) => entry.levelId));
		const reorderedLevelIds = currentLevelIds.filter((levelId) => !overrideIds.has(levelId));

		for (const entry of orderedOverrides) {
			const insertIndex = Math.min(Math.max(entry.top - 1, 0), reorderedLevelIds.length);
			reorderedLevelIds.splice(insertIndex, 0, entry.levelId);
		}

		return reorderedLevelIds;
	}

	async function addLevel(levelId: number) {
		if (!list || !canEditLevels) return false;

		batchAddProgress = null;
		batchAddAbortController = null;
		addingLevel = true;
		try {
			const result = await requestAddLevel(list.id, levelId);
			if (!result.ok) throw new Error(result.error);
			list = result.payload;
			toast.success($_('custom_lists.toast.level_added'));
			return true;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_add_level'));
			return false;
		} finally {
			addingLevel = false;
		}
	}

	async function addLevels(levelInputs: BatchAddLevelInput[]): Promise<BatchAddLevelsResult> {
		if (!list || !canEditLevels) {
			batchAddProgress = null;
			return {
				added: 0,
				updated: 0,
				skipped: levelInputs.length,
				failed: [],
				aborted: false
			};
		}

		addingLevel = true;
		batchAddProgress = null;
		batchAddAbortController = new AbortController();
		const importSignal = batchAddAbortController.signal;
		const listId = list.id;
		const addLevelInputs: Array<BatchAddLevelInput & { inputIndex: number }> = [];
		const existingLevelIds = new Set(list.items.map((item) => item.levelId));
		const processedLevelIds = new Set<number>();
		const existingPatchInputs: Array<BatchAddLevelInput & { inputIndex: number }> = [];
		const reorderInputs: Array<BatchAddLevelInput & { inputIndex: number }> = [];
		let skipped = 0;
		const failed: BatchAddLevelFailure[] = [];
		let added = 0;
		let updated = 0;

		for (const [inputIndex, levelInput] of levelInputs.entries()) {
			if (processedLevelIds.has(levelInput.levelId)) {
				skipped += 1;
				continue;
			}

			processedLevelIds.add(levelInput.levelId);

			const enrichedInput = {
				...levelInput,
				inputIndex
			};

			if (existingLevelIds.has(levelInput.levelId)) {
				if (hasBatchLevelPatch(levelInput)) {
					existingPatchInputs.push(enrichedInput);
				}

				if (list.mode === 'top' && hasBatchLevelTopOverride(levelInput)) {
					reorderInputs.push(enrichedInput);
				}

				if (!hasBatchLevelPatch(levelInput) && !(list.mode === 'top' && hasBatchLevelTopOverride(levelInput))) {
					skipped += 1;
				}

				continue;
			}

			addLevelInputs.push(enrichedInput);
		}

		if (!addLevelInputs.length && !existingPatchInputs.length && !reorderInputs.length) {
			return {
				added,
				updated,
				skipped,
				failed,
				aborted: false
			};
		}

		const newPatchCount = addLevelInputs.filter((levelInput) => hasBatchLevelPatch(levelInput)).length;
		const shouldRunReorder = list.mode === 'top' && levelInputs.some((levelInput) => hasBatchLevelTopOverride(levelInput));
		const totalSteps = addLevelInputs.length + existingPatchInputs.length + newPatchCount + (shouldRunReorder ? 1 : 0);
		const rateLimitTimeoutError = $_('custom_lists.detail.add_level.csv_rate_limit_timeout');
		batchAddProgress = createBatchAddProgress(totalSteps, skipped);

		try {
			const postAddPatchInputs: Array<BatchAddLevelInput & { inputIndex: number }> = [];
			const reorderCandidates = [...reorderInputs];
			let missingAddLevelInputs = addLevelInputs;

			if (addLevelInputs.length) {
				const batchResult = await requestBatchAddExistingLevels(
					listId,
					addLevelInputs.map((levelInput) => ({
						levelId: levelInput.levelId,
						...(levelInput.createdAt ? { createdAt: levelInput.createdAt } : {})
					})),
					importSignal
				);

				if (!batchResult.ok) {
					throw new Error(batchResult.error);
				}

				list = batchResult.payload.list;
				added += batchResult.payload.added;

				const missingLevelIds = new Set(batchResult.payload.missingLevelIds);
				const fastPathInputs = addLevelInputs.filter((levelInput) => !missingLevelIds.has(levelInput.levelId));

				for (const levelInput of fastPathInputs) {
					if (hasBatchLevelPatch(levelInput)) {
						postAddPatchInputs.push(levelInput);
					}

					if (list.mode === 'top' && hasBatchLevelTopOverride(levelInput)) {
						reorderCandidates.push(levelInput);
					}
				}

				if (fastPathInputs.length) {
					updateBatchAddProgress({
						completed: Math.min((batchAddProgress?.completed ?? 0) + fastPathInputs.length, totalSteps),
						phase: 'adding',
						currentLevelId: null,
						added,
						updated,
						failed: failed.length,
						skipped,
						retrying: false,
						retryElapsedMs: 0,
						aborted: false
					});
				}

				missingAddLevelInputs = addLevelInputs.filter((levelInput) => missingLevelIds.has(levelInput.levelId));
			}

			for (const levelInput of missingAddLevelInputs) {
				throwIfBatchAddAborted(importSignal);

				const result = await withRateLimitRetry(
					() => requestAddLevel(listId, levelInput.levelId, levelInput.createdAt, importSignal),
					{
						phase: 'adding',
						levelId: levelInput.levelId,
						timeoutError: rateLimitTimeoutError,
						signal: importSignal
					}
				);

				if (!result.ok) {
					failed.push({
						levelId: levelInput.levelId,
						message: result.error
					});
					incrementBatchAddProgress({
						phase: 'adding',
						currentLevelId: levelInput.levelId,
						added,
						updated,
						failed: failed.length,
						skipped
					});
					continue;
				}

				list = result.payload;
				added += 1;

				if (hasBatchLevelPatch(levelInput)) {
					postAddPatchInputs.push(levelInput);
				}

				if (list.mode === 'top' && hasBatchLevelTopOverride(levelInput)) {
					reorderCandidates.push(levelInput);
				}

				incrementBatchAddProgress({
					phase: 'adding',
					currentLevelId: levelInput.levelId,
					added,
					updated,
					failed: failed.length,
					skipped
				});
			}

			for (const levelInput of [...existingPatchInputs, ...postAddPatchInputs]) {
				throwIfBatchAddAborted(importSignal);

				const patch = buildBatchUpdateLevelPatch(levelInput);

				const result = await withRateLimitRetry(
					() => requestUpdateLevel(listId, levelInput.levelId, patch, importSignal),
					{
						phase: 'updating',
						levelId: levelInput.levelId,
						timeoutError: rateLimitTimeoutError,
						signal: importSignal
					}
				);

				if (!result.ok) {
					failed.push({
						levelId: levelInput.levelId,
						message: result.error
					});
					incrementBatchAddProgress({
						phase: 'updating',
						currentLevelId: levelInput.levelId,
						added,
						updated,
						failed: failed.length,
						skipped
					});
					continue;
				}

				list = result.payload;
				updated += 1;
				incrementBatchAddProgress({
					phase: 'updating',
					currentLevelId: levelInput.levelId,
					added,
					updated,
					failed: failed.length,
					skipped
				});
			}

			if (shouldRunReorder) {
				throwIfBatchAddAborted(importSignal);

				const levelsWithTop = reorderCandidates.filter((levelInput) => Number.isInteger(levelInput.top));
				if (levelsWithTop.length) {
					const reorderedLevelIds = buildReorderedLevelIds(
						list.items.map((item) => item.levelId),
						levelsWithTop
					);
					const result = await withRateLimitRetry(
						() => requestReorderLevels(listId, reorderedLevelIds, importSignal),
						{
							phase: 'reordering',
							levelId: null,
							timeoutError: rateLimitTimeoutError,
							signal: importSignal
						}
					);

					if (!result.ok) {
						for (const levelInput of levelsWithTop) {
							failed.push({
								levelId: levelInput.levelId,
								message: result.error
							});
						}
					} else {
						list = result.payload;
					}
				}

				incrementBatchAddProgress({
					phase: 'reordering',
					currentLevelId: null,
					added,
					updated,
					failed: failed.length,
					skipped
				});
			}

			updateBatchAddProgress({
				completed: totalSteps,
				added,
				updated,
				skipped,
				failed: failed.length,
				phase: shouldRunReorder ? 'reordering' : 'updating',
				currentLevelId: null,
				retrying: false,
				retryElapsedMs: 0,
				aborted: false
			});

			return {
				added,
				updated,
				skipped,
				failed,
				aborted: false
			};
		} catch (error) {
			if (isBatchAddAbortError(error)) {
				updateBatchAddProgress({
					currentLevelId: null,
					retrying: false,
					retryElapsedMs: 0,
					aborted: true
				});

				return {
					added,
					updated,
					skipped,
					failed,
					aborted: true
				};
			}

			throw error;
		} finally {
			batchAddAbortController = null;
			addingLevel = false;
		}
	}

	function abortBatchAddImport() {
		if (!addingLevel || !batchAddAbortController) return;

		batchAddAbortController.abort();
	}

	async function removeLevel(levelId: number) {
		if (!list || !canEditLevels) return;
		mutatingLevelId = levelId;
		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${list.id}/levels/${levelId}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${await $user.token()}` }
			});
			const payload = await res.json();
			if (!res.ok) throw new Error(payload.error || $_('custom_lists.toast.failed_remove_level'));
			list = payload;
			toast.success($_('custom_lists.toast.level_removed'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_remove_level'));
		} finally {
			mutatingLevelId = null;
		}
	}

	async function updateLevelItem(levelId: number, patch: { rating?: number; minProgress?: number | null; videoID?: string | null; createdAt?: string }) {
		if (!list || !canEditLevels) return;
		savingLevelItemId = levelId;
		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${list.id}/levels/${levelId}`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(patch)
			});
			const payload = await res.json();
			if (!res.ok) throw new Error(payload.error || $_('custom_lists.toast.failed_update_level'));
			list = payload;
			toast.success($_('custom_lists.toast.level_updated'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_update_level'));
		} finally {
			savingLevelItemId = null;
		}
	}

	async function setBanState(nextIsBanned: boolean, confirmationName: string) {
		if (!list || !canBan || savingBanState) return;
		if (confirmationName.trim() !== list.title) {
			toast.error($_('custom_lists.manage.confirm_title_error'));
			return;
		}

		savingBanState = true;

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${list.id}/ban`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ isBanned: nextIsBanned })
			});
			const payload = await res.json();
			if (!res.ok) throw new Error(payload.error || $_('custom_lists.toast.failed_ban'));
			list = payload;
			syncForm();
			toast.success($_(nextIsBanned ? 'custom_lists.toast.list_banned' : 'custom_lists.toast.list_unbanned'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_ban'));
		} finally {
			savingBanState = false;
		}
	}

	async function reorderLevels(levelIds: number[]) {
		if (!list || !canEditLevels) return;
		savingReorder = true;
		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${list.id}/reorder`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ levelIds })
			});
			const payload = await res.json();
			if (!res.ok) throw new Error(payload.error || $_('custom_lists.toast.failed_reorder'));
			list = payload;
			toast.success($_('custom_lists.toast.reordered'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_reorder'));
		} finally {
			savingReorder = false;
		}
	}

	$: permissions = list?.permissions ?? defaultPermissions;
	$: canEditSettings = Boolean(list && permissions.canEditSettings);
	$: canEditLevels = Boolean(list && permissions.canEditLevels);
	$: canDelete = Boolean(list && permissions.canDelete);
	$: canBan = Boolean(list && permissions.canBan);
	$: canManageMembers = Boolean(list && permissions.canManageMembers);
	$: canConfigureCollaboration = Boolean(list && permissions.canConfigureCollaboration);
	$: canTransferOwnership = Boolean(list && permissions.canTransferOwnership);
	$: canViewMembers = Boolean(list && permissions.canViewMembers);
	$: canViewAudit = Boolean(list && permissions.canViewAudit);
	$: canShowCollaboration = Boolean(list && (canViewMembers || canViewAudit || canManageMembers || canConfigureCollaboration || canTransferOwnership));
	$: if (list && $user.checked && !initialManageTabSettled) {
		initialManageTabSettled = true;
		const requestedTab = getInitialManageTab();
		activeTab = isTabAllowed(requestedTab)
			? requestedTab
			: canEditSettings
				? 'basic'
				: canShowCollaboration
					? 'collaboration'
					: 'levels';
	}
	$: if (list && $user.checked && !isTabAllowed(activeTab)) {
		activeTab = canEditSettings ? 'basic' : canShowCollaboration ? 'collaboration' : 'levels';
	}

	// Reactive hero preview colors — update live from editForm without saving
	$: _heroPreviewBg = initialSyncDone
		? (isHexColor(editForm.backgroundColor) ? editForm.backgroundColor.trim() : null)
		: (isHexColor(list?.backgroundColor) ? list!.backgroundColor!.trim() : null);
	$: _heroPreviewBorder = initialSyncDone
		? (isHexColor(editForm.borderColor) ? editForm.borderColor.trim() : null)
		: (isHexColor(list?.borderColor) ? list!.borderColor!.trim() : null);
	$: setCustomListBranding(
		list
			? { faviconUrl: list.faviconUrl, logoUrl: list.logoUrl, title: list.title }
			: null
	);
	$: heroStyle = getThemedSurfaceStyle(_heroPreviewBg, _heroPreviewBorder);
	$: heroBannerStyle = _heroPreviewBorder ? `border-bottom-color: ${_heroPreviewBorder};` : undefined;

	onDestroy(() => {
		batchAddAbortController?.abort();
		clearCustomListBranding();
	});
</script>

<svelte:head>
	<title>{list ? `Quản lý danh sách - ${list.title} - Geometry Dash Việt Nam` : 'Danh sách - Geometry Dash Việt Nam'}</title>
</svelte:head>

<div class="page">
	<!-- Navigation -->
	<div class="navRow">
		<Button variant="ghost" size="sm" on:click={() => goto('/lists')}>
			<ArrowLeft class="mr-2 h-4 w-4" />
			{$_('custom_lists.back')}
		</Button>
		{#if list}
			<Button variant="outline" size="sm" on:click={() => goto(`/lists/${$page.params.id}`)}>
				<Eye class="mr-2 h-4 w-4" />
				{$_('custom_lists.actions.view')}
			</Button>
		{/if}
	</div>

	{#if authRecoveryLoading && !list}
		<div class="emptyState">
			<AlertTriangle class="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
			<h3>{$_('custom_lists.detail.loading')}</h3>
			<p>{$_('custom_lists.detail.loading')}</p>
		</div>
	{:else if loadingError}
		<div class="emptyState">
			<AlertTriangle class="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
			<h3>{$_('custom_lists.detail.error_title')}</h3>
			<p>{loadingError}</p>
		</div>
	{:else if list}
		<!-- Hero Summary -->
		<div class="hero" class:heroHasBanner={Boolean(getManageHeroBannerUrl())} style={heroStyle}>
			{#if getManageHeroBannerUrl()}
				<div class="heroBanner" style={heroBannerStyle}>
					<img src={getManageHeroBannerUrl()} alt="" loading="lazy" decoding="async" />
				</div>
			{/if}
			<div class="heroTop">
				<div class="heroInfo">
					<h1>{getManagePreviewTitle()}</h1>
					<p class="heroDesc">{getManagePreviewDescription()}</p>
				</div>
				<div class="heroChips">
					<span class="chip">
						<svelte:component this={getVisibilityIcon(editForm.visibility)} class="h-3.5 w-3.5" />
						{formatVisibility(editForm.visibility)}
					</span>
					<span class="chip">
						<Layers class="h-3.5 w-3.5" />
						{formatListType(editForm.isPlatformer)}
					</span>
					<span class="chip">
						{editForm.mode === 'top' ? '🔢' : '⭐'}
						{editForm.mode === 'rating' ? $_('custom_lists.detail.edit.mode_rating') : $_('custom_lists.detail.edit.mode_top')}
					</span>
					<span class="chip">
						{$_('custom_lists.detail.levels_badge', { values: { count: list.items.length } })}
					</span>
					{#if list.currentUserRole && list.currentUserRole !== 'viewer'}
						<span class="chip">{getRoleLabel(list.currentUserRole)}</span>
					{/if}
				</div>
			</div>
			{#if getManagePreviewTags().length}
				<div class="tagRow">
					{#each getManagePreviewTags() as tag}
						<Badge variant="outline">{tag}</Badge>
					{/each}
				</div>
			{/if}
			<p class="updatedAt">
				<Clock class="h-3.5 w-3.5" />
				{$_('custom_lists.detail.updated', { values: { date: formatDate(list.updated_at) } })}
			</p>
			{#if list.lastRefreshedAt}
				<p class="updatedAt">
					<RefreshCw class="h-3.5 w-3.5" />
					Leaderboard refreshed {formatDateTime(list.lastRefreshedAt)}
				</p>
			{/if}
		</div>

		{#if canEditSettings && hasUnsavedSettings}
			<div class="toolCard unsavedSettingsNotice">
				<div class="moderationCopy">
					<h2 class="toolHeading">{$_('custom_lists.manage.unsaved_settings_title')}</h2>
					<p class="hint">{$_('custom_lists.manage.unsaved_settings_hint')}</p>
				</div>
				<div class="moderationIcon">
					<AlertTriangle class="h-5 w-5" />
				</div>
			</div>
		{/if}

		{#if list.isBanned}
			<div class="toolCard moderationNotice">
				<div class="moderationCopy">
					<h2 class="toolHeading">{$_('custom_lists.manage.banned_title')}</h2>
					<p class="hint">
						{canBan
							? $_('custom_lists.manage.banned_manager_hint')
							: list.currentUserRole === 'admin' || list.currentUserRole === 'helper'
								? $_('custom_lists.manage.banned_collaborator_hint')
								: $_('custom_lists.manage.banned_owner_hint')}
					</p>
				</div>
				<div class="moderationIcon">
					<AlertTriangle class="h-5 w-5" />
				</div>
			</div>
		{/if}

		<Tabs.Root bind:value={activeTab}>
			<div class="tabsList">
				<Tabs.List class="flex h-fit w-fit flex-wrap">
					{#if canEditSettings}
						<Tabs.Trigger value="basic">{$_('custom_lists.manage.tabs.basic')}</Tabs.Trigger>
						<Tabs.Trigger value="appearance">{$_('custom_lists.manage.tabs.appearance')}</Tabs.Trigger>
						<Tabs.Trigger value="formula">{$_('custom_lists.manage.tabs.formula')}</Tabs.Trigger>
						<Tabs.Trigger value="rank">{$_('custom_lists.manage.tabs.rank')}</Tabs.Trigger>
					{/if}
					<Tabs.Trigger value="levels">{$_('custom_lists.manage.tabs.levels')}</Tabs.Trigger>
					{#if canShowCollaboration}
						<Tabs.Trigger value="collaboration">{$_('custom_lists.manage.tabs.collaboration')}</Tabs.Trigger>
					{/if}
					{#if canBan || canDelete}
						<Tabs.Trigger value="danger" class="dangerTabTrigger">{$_('custom_lists.manage.tabs.danger')}</Tabs.Trigger>
					{/if}
				</Tabs.List>
			</div>

			{#if canEditSettings}
				<Tabs.Content value="basic">
					<BasicTab
						bind:editForm
						{list}
						{updateItemSort}
					/>
				</Tabs.Content>

				<Tabs.Content value="appearance">
					<AppearanceTab
						bind:editForm
						{list}
						uploadingThemeAsset={uploadingAsset}
						uploadAsset={uploadCustomListAsset}
					/>
				</Tabs.Content>

				<Tabs.Content value="formula">
					<FormulaTab bind:editForm />
				</Tabs.Content>

				<Tabs.Content value="rank">
					<RankTab bind:editForm />
				</Tabs.Content>

				{#if canShowCollaboration}
					<Tabs.Content value="collaboration">
						<CollaborationTab
							{list}
							{savingCollaboration}
							{canConfigureCollaboration}
							{canViewMembers}
							{canManageMembers}
							{canTransferOwnership}
							{canViewAudit}
							{updateCollaborationSettings}
							{searchPlayersForCollaboration}
							{addCollaborator}
							{updateCollaboratorRole}
							{transferOwnership}
							{removeCollaborator}
							{getRoleLabel}
							{formatDate}
							{formatDateTime}
						/>
					</Tabs.Content>
				{/if}

				{#if canBan || canDelete}
					<Tabs.Content value="danger">
						<DangerTab
							{list}
							{canBan}
							{canDelete}
							{savingBanState}
							{setBanState}
							{deleteList}
						/>
					</Tabs.Content>
				{/if}

			{#if canEditSettings && activeTab !== 'levels' && activeTab !== 'danger' && activeTab !== 'collaboration'}
				<div class="toolCard actionCard">
					<div class="formActions">
						<Button on:click={saveMetadata} disabled={savingMetadata || !hasUnsavedSettings}>
							<Save class="mr-2 h-4 w-4" />
							{$_('custom_lists.detail.edit.save')}
						</Button>
						<Button variant="outline" on:click={handleRefreshLeaderboardClick} disabled={refreshingLeaderboard}>
							<RefreshCw class="mr-2 h-4 w-4" />
							{refreshingLeaderboard ? `${$_('general.loading')}...` : 'Refresh leaderboard'}
						</Button>
					</div>
				</div>
			{/if}
			{/if}

			<Tabs.Content value="levels">
				<LevelsTab
					{list}
					{canEditLevels}
					{addingLevel}
					{batchAddProgress}
					{abortBatchAddImport}
					{mutatingLevelId}
					{savingLevelItemId}
					{savingReorder}
					{addLevel}
					{addLevels}
					{removeLevel}
					{updateLevelItem}
					{reorderLevels}
				/>
			</Tabs.Content>
		</Tabs.Root>
	{/if}
</div>

<style lang="scss">
	.page {
		max-width: 1100px;
		margin: 0 auto;
		padding: 24px 16px 48px;
		display: flex;
		flex-direction: column;
		gap: 20px;
		background-repeat: no-repeat;
	}

	/* Nav */
	.navRow {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	/* Hero */
	.hero {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 14px;
		color: var(--custom-surface-foreground, inherit);
	}

	.heroHasBanner {
		overflow: hidden;
	}

	.heroBanner {
		margin: -24px -24px 0;
		min-height: 140px;
		border-bottom: 1px solid hsl(var(--border));
		background: hsl(var(--muted) / 0.18);
	}

	.heroBanner img {
		display: block;
		width: 100%;
		height: 180px;
		object-fit: cover;
	}

	.heroTop {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 16px;
		flex-wrap: wrap;
	}

	.heroInfo h1 {
		margin: 0;
		font-size: 1.4rem;
		font-weight: 700;
	}

	.heroDesc {
		margin: 4px 0 0;
		color: var(--custom-surface-muted, hsl(var(--muted-foreground)));
		font-size: 0.9rem;
	}

	.heroChips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-size: 0.8rem;
		color: var(--custom-surface-muted, hsl(var(--muted-foreground)));
		background: var(--custom-surface-chip-background, hsl(var(--muted) / 0.4));
		padding: 4px 10px;
		border-radius: 999px;
		white-space: nowrap;
	}

	.tagRow {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.updatedAt {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		margin: 0;
		font-size: 0.8rem;
		color: var(--custom-surface-muted, hsl(var(--muted-foreground)));
	}

	.tabsList {
		display: flex;
	}

	:global(.dangerTabTrigger) {
		margin-left: 16px;
		color: hsl(var(--destructive) / 0.75);
	}

	:global(.dangerTabTrigger[data-state='active']),
	:global(.dangerTabTrigger:hover) {
		color: hsl(var(--destructive));
	}

	.toolCard {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		padding: 22px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.moderationNotice {
		flex-direction: row;
		align-items: flex-start;
		justify-content: space-between;
		background: hsl(var(--destructive) / 0.08);
		border-color: hsl(var(--destructive) / 0.35);
	}

	.unsavedSettingsNotice {
		flex-direction: row;
		align-items: flex-start;
		justify-content: space-between;
		background: hsl(var(--primary) / 0.08);
		border-color: hsl(var(--primary) / 0.3);
	}

	.unsavedSettingsNotice .moderationIcon {
		color: hsl(var(--primary));
	}

	.moderationCopy {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.moderationIcon {
		color: hsl(var(--destructive));
		flex-shrink: 0;
	}

	.toolHeading {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
	}

	.hint {
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
		margin: 0;
	}

	.formActions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 4px;
	}

	.actionCard {
		padding-block: 18px;
	}

	/* Empty State */
	.emptyState {
		border: 1px dashed hsl(var(--border));
		border-radius: 12px;
		padding: 40px 24px;
		text-align: center;
		background: hsl(var(--muted) / 0.12);
	}

	.emptyState h3 {
		margin: 0 0 6px;
		font-size: 1.05rem;
		font-weight: 600;
	}

	.emptyState p {
		margin: 0;
		color: hsl(var(--muted-foreground));
		font-size: 0.9rem;
	}

	/* Responsive */
	@media (max-width: 760px) {
		.heroTop {
			flex-direction: column;
		}
	}

	@media (max-width: 480px) {
		.hero {
			padding: 18px 16px;
		}

		.heroBanner {
			margin: -18px -16px 0;
		}

		.heroBanner img {
			height: 140px;
		}

		.heroInfo h1 {
			font-size: 1.2rem;
		}

		.toolCard {
			padding: 16px;
		}
	}
</style>
