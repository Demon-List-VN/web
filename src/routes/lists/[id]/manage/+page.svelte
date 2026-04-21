<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Badge } from '$lib/components/ui/badge';
	import { Switch } from '$lib/components/ui/switch';
	import * as Tabs from '$lib/components/ui/tabs';
	import WeightFormulaPreview from '$lib/components/custom-lists/WeightFormulaPreview.svelte';
	import imageCompression from 'browser-image-compression';
	import {
		createEmptyCustomListRankBadge,
		normalizeCustomListRankBadges,
		type CustomListRankBadge
	} from '$lib/utils/customListRank';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';
	import {
		ArrowLeft,
		Plus,
		Trash2,
		GripVertical,
		Eye,
		Globe2,
		EyeOff,
		Lock,
		Layers,
		Clock,
		Star,
		ListOrdered,
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
		level: {
			id: number;
			name: string | null;
			creator: string | null;
			difficulty: string | null;
			isPlatformer: boolean;
			minProgress: number | null;
		} | null;
	};

	type CustomList = {
		id: number;
		slug?: string | null;
		owner: string;
		title: string;
		description: string;
		backgroundColor?: string | null;
		bannerUrl?: string | null;
		borderColor?: string | null;
		communityEnabled: boolean;
		isBanned: boolean;
		isPlatformer: boolean;
		isOfficial?: boolean;
		logoUrl?: string | null;
		visibility: 'private' | 'unlisted' | 'public';
		mode: 'rating' | 'top';
		tags: string[];
		updated_at: string;
		lastRefreshedAt?: string | null;
		rankBadges?: CustomListRankBadge[];
		weightFormula?: string;
		items: CustomListItem[];
	};

	type CustomListRankBadgeDraft = {
		name: string;
		shorthand: string;
		color: string;
		minRating: number | null | undefined;
		minTop: number | null | undefined;
	};

	type ManageTab = 'basic' | 'formula' | 'rank' | 'levels';

	// SSR data - hydrate into reactive local state
	let list: CustomList | null = data?.list ?? null;
	let loadingError = data?.error ?? '';
	let requiresAuthRecovery = Boolean(data?.requiresAuthRecovery);
	let authRecoveryLoading = requiresAuthRecovery;

	let savingMetadata = false;
	let addingLevel = false;
	let mutatingLevelId: number | null = null;
	let draggedIndex: number | null = null;
	let dragOverIndex: number | null = null;
	let draggedRankBadgeIndex: number | null = null;
	let dragOverRankBadgeIndex: number | null = null;
	let editingRatingItemId: number | null = null;
	let editingRatingValue = '';
	let editingMinProgressItemId: number | null = null;
	let editingMinProgressValue: string | number | undefined = '';
	let savingLevelItemId: number | null = null;
	let savingReorder = false;
	let refreshingLeaderboard = false;
	let savingBanState = false;
	let initialSyncDone = false;
	let bannerFileInput: HTMLInputElement | null = null;
	let logoFileInput: HTMLInputElement | null = null;
	let uploadingAsset: 'banner' | 'logo' | null = null;

	const CUSTOM_LIST_CDN_BASE_URL = 'https://cdn.gdvn.net';

	const editForm = {
		title: '',
		description: '',
		backgroundColor: '',
		bannerUrl: '',
		borderColor: '',
		communityEnabled: true,
		isPlatformer: false,
		logoUrl: '',
		visibility: 'private' as 'private' | 'unlisted' | 'public',
		tags: '',
		mode: 'rating' as 'rating' | 'top',
		rankBadges: [] as CustomListRankBadgeDraft[],
		weightFormula: '1'
	};

	const visibilityOptions: Array<'private' | 'unlisted' | 'public'> = ['private', 'unlisted', 'public'];

	let levelIdInput = '';
	let activeTab: ManageTab = getInitialManageTab();

	function getQuickLevelId() {
		const raw = $page.url.searchParams.get('levelId');
		const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
		return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
	}

	function getInitialManageTab(): ManageTab {
		const requestedTab = $page.url.searchParams.get('tab');

		if (requestedTab === 'basic' || requestedTab === 'formula' || requestedTab === 'rank') {
			return requestedTab;
		}

		if (requestedTab === 'levels') {
			return 'levels';
		}

		return getQuickLevelId() ? 'levels' : 'basic';
	}

	$: quickLevelId = getQuickLevelId();
	$: if (quickLevelId && !levelIdInput) {
		levelIdInput = String(quickLevelId);
	}

	function syncForm() {
		if (!list) return;
		editForm.title = list.title;
		editForm.description = list.description;
		editForm.backgroundColor = list.backgroundColor || '';
		editForm.bannerUrl = list.bannerUrl || '';
		editForm.borderColor = list.borderColor || '';
		editForm.communityEnabled = list.communityEnabled;
		editForm.isPlatformer = list.isPlatformer;
		editForm.logoUrl = list.logoUrl || '';
		editForm.visibility = list.visibility;
		editForm.tags = list.tags.join(', ');
		editForm.mode = list.mode;
		editForm.rankBadges = normalizeCustomListRankBadges(list.rankBadges).map((rankBadge) => ({
			...rankBadge
		}));
		editForm.weightFormula = list.weightFormula || '1';
	}

	// Sync form when list changes from SSR data
	$: if (list && !initialSyncDone) {
		initialSyncDone = true;
		syncForm();
	}

	// Re-fetch with auth once user is available so managers and owners can recover private lists.
	$: if ($user.checked && $user.loggedIn) {
		refetchWithAuth();
	}
	$: if (requiresAuthRecovery && $user.checked && !$user.loggedIn && !list) {
		loadingError = 'This list is private';
		authRecoveryLoading = false;
		requiresAuthRecovery = false;
	}

	let authFetchKey = '';
	async function refetchWithAuth() {
		const key = `${$page.params.id}:${$user.data?.uid}`;
		if (key === authFetchKey) return;
		authFetchKey = key;
		const recoveringPrivateList = requiresAuthRecovery;

		if (recoveringPrivateList) {
			authRecoveryLoading = true;
		}

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${$page.params.id}`, {
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

	function getTimeString(ms: number) {
		const minutes = Math.floor(ms / 60000);
		const seconds = Math.floor((ms % 60000) / 1000);
		const milliseconds = ms % 1000;
		return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds}`;
	}

	function getEffectiveMinProgress(item: CustomListItem) {
		return item.minProgress ?? item.level?.minProgress ?? null;
	}

	function isHexColor(value: string | null | undefined) {
		return typeof value === 'string' && /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value.trim());
	}

	function withHexAlpha(color: string, alpha: string) {
		const normalized = color.trim();
		return normalized.length === 9 ? `${normalized.slice(0, 7)}${alpha}` : `${normalized}${alpha}`;
	}

	function getColorPickerValue(value: string | null | undefined) {
		if (!isHexColor(value)) {
			return '#000000';
		}

		return (typeof value === 'string' ? value.trim() : '').slice(0, 7);
	}

	function setThemeColorFromPicker(field: 'backgroundColor' | 'borderColor', event: Event) {
		const input = event.currentTarget;

		if (!(input instanceof HTMLInputElement)) {
			return;
		}

		editForm[field] = input.value;
	}

	function getManageThemeBackgroundColor() {
		if (initialSyncDone && isHexColor(editForm.backgroundColor)) {
			return editForm.backgroundColor.trim();
		}

		return isHexColor(list?.backgroundColor) ? list!.backgroundColor!.trim() : null;
	}

	function getManageThemeBorderColor() {
		if (initialSyncDone && isHexColor(editForm.borderColor)) {
			return editForm.borderColor.trim();
		}

		return isHexColor(list?.borderColor) ? list!.borderColor!.trim() : null;
	}

	function getThemedSurfaceStyle(backgroundColor: string | null, borderColor: string | null) {
		const styles: string[] = [];

		if (backgroundColor) {
			styles.push(
				`background: linear-gradient(180deg, ${withHexAlpha(backgroundColor, '18')} 0%, ${withHexAlpha(backgroundColor, '0d')} 100%), hsl(var(--card));`
			);
		}

		if (borderColor) {
			styles.push(`border-color: ${borderColor};`);
			styles.push(`box-shadow: 0 0 0 1px ${withHexAlpha(borderColor, '22')};`);
		}

		return styles.length ? styles.join(' ') : undefined;
	}

	function getManageHeroStyle() {
		return getThemedSurfaceStyle(getManageThemeBackgroundColor(), getManageThemeBorderColor());
	}

	function getManageHeroBannerStyle() {
		const borderColor = getManageThemeBorderColor();

		return borderColor ? `border-bottom-color: ${borderColor};` : undefined;
	}

	function getManageHeroBannerUrl() {
		if (initialSyncDone) {
			const value = editForm.bannerUrl.trim();
			return /^https?:\/\//i.test(value) ? value : null;
		}

		return list?.bannerUrl ?? null;
	}

	function getManageLogoPreviewUrl() {
		if (initialSyncDone) {
			const value = editForm.logoUrl.trim();
			return /^https?:\/\//i.test(value) ? value : null;
		}

		return list?.logoUrl ?? null;
	}

	function getImageExtension(file: File) {
		const normalizedType = file.type.toLowerCase();
		if (normalizedType === 'image/png') return 'png';
		if (normalizedType === 'image/webp') return 'webp';
		if (normalizedType === 'image/gif') return 'gif';

		const normalizedName = file.name.toLowerCase();
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
		if (extension === 'webp') return 'image/webp';
		if (extension === 'gif') return 'image/gif';
		return 'image/jpeg';
	}

	function getCustomListAssetPath(asset: 'banner' | 'logo', extension: string) {
		return `custom-lists/${$user.data?.uid}/${list?.id}/${asset}.${extension}`;
	}

	function getCustomListAssetUrl(path: string) {
		return `${CUSTOM_LIST_CDN_BASE_URL}/${path}?v=${Date.now()}`;
	}

	async function normalizeCustomListAsset(file: File, asset: 'banner' | 'logo') {
		const extension = getImageExtension(file);

		if (extension === 'gif') {
			return file;
		}

		return imageCompression(file, {
			maxSizeMB: asset === 'banner' ? 4.5 : 0.35,
			maxWidthOrHeight: asset === 'banner' ? 1920 : 512,
			useWebWorker: true
		});
	}

	async function handleCustomListAssetUpload(asset: 'banner' | 'logo', event: Event) {
		if (!list || !canManage) return;

		const input = event.currentTarget;
		if (!(input instanceof HTMLInputElement)) {
			return;
		}

		const selectedFile = input.files?.[0];

		if (!selectedFile) {
			return;
		}

		if (!selectedFile.type.startsWith('image/')) {
			toast.error($_('custom_lists.toast.invalid_image'));
			input.value = '';
			return;
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

			if (asset === 'banner') {
				editForm.bannerUrl = uploadedUrl;
			} else {
				editForm.logoUrl = uploadedUrl;
			}

			toast.success($_('custom_lists.toast.image_uploaded_save'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_upload_image'));
		} finally {
			uploadingAsset = null;
			input.value = '';
		}
	}

	function getMinProgressLabel(item: CustomListItem) {
		const minProgress = getEffectiveMinProgress(item);
		if (minProgress == null) return $_('custom_lists.detail.levels.min_progress_label');
		const value = list?.isPlatformer
			? `${getTimeString(minProgress)} Base`
			: `${minProgress}% Min`;
		return item.minProgress == null ? value : `${value} *`;
	}

	function getVisibilityIcon(v: string) {
		if (v === 'public') return Globe2;
		if (v === 'unlisted') return EyeOff;
		return Lock;
	}

	// Mutations
	async function saveMetadata() {
		if (!list || !canManage) return;
		if (!editForm.title.trim()) {
			toast.error($_('custom_lists.toast.title_required'));
			return;
		}

		savingMetadata = true;
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
					isPlatformer: editForm.isPlatformer,
					logoUrl: editForm.logoUrl,
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
			list = payload;
			syncForm();
			toast.success($_('custom_lists.toast.list_updated'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_update'));
		} finally {
			savingMetadata = false;
		}
	}

	async function refreshLeaderboardPrecalc() {
		if (!list || !canManage || refreshingLeaderboard) return;

		refreshingLeaderboard = true;

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

			const refreshedTotal = typeof payload?.total === 'number' ? payload.total : null;
			const refreshedRecordTotal = typeof payload?.totalRecords === 'number' ? payload.totalRecords : null;
			toast.success(
				refreshedTotal == null
					? 'Leaderboard refreshed'
					: refreshedRecordTotal == null
						? `Leaderboard refreshed (${refreshedTotal} ranked players)`
						: `Leaderboard refreshed (${refreshedTotal} ranked players, ${refreshedRecordTotal} records)`
			);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to refresh leaderboard');
		} finally {
			refreshingLeaderboard = false;
		}
	}

	async function deleteList() {
		if (!list || !canDelete) return;
		if (!confirm($_('custom_lists.detail.delete_confirm'))) return;

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

	async function addLevel() {
		if (!list || !canManage) return;
		const levelId = Number.parseInt(levelIdInput, 10);
		if (!Number.isInteger(levelId) || levelId <= 0) {
			toast.error($_('custom_lists.toast.level_id_invalid'));
			return;
		}

		addingLevel = true;
		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${list.id}/levels`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ levelId })
			});
			const payload = await res.json();
			if (!res.ok) throw new Error(payload.error || $_('custom_lists.toast.failed_add_level'));
			list = payload;
			levelIdInput = '';
			toast.success($_('custom_lists.toast.level_added'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_add_level'));
		} finally {
			addingLevel = false;
		}
	}

	async function removeLevel(levelId: number) {
		if (!list || !canManage) return;
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

	function startRatingEdit(item: CustomListItem) {
		if (!canManage) return;
		editingRatingItemId = item.id;
		editingRatingValue = String(item.rating ?? 5);
	}

	function startMinProgressEdit(item: CustomListItem) {
		if (!canManage) return;
		editingMinProgressItemId = item.id;
		editingMinProgressValue = item.minProgress == null ? '' : String(item.minProgress);
	}

	function cancelMinProgressEdit() {
		editingMinProgressItemId = null;
		editingMinProgressValue = '';
	}

	function handleMinProgressBlur(event: FocusEvent) {
		const nextTarget = event.relatedTarget;
		if (nextTarget instanceof HTMLElement && nextTarget.dataset.minProgressAction) {
			return;
		}

		cancelMinProgressEdit();
	}

	async function saveRatingEdit(levelId: number) {
		const rating = Number.parseInt(editingRatingValue, 10);
		editingRatingItemId = null;
		if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
			toast.error($_('custom_lists.toast.rating_invalid'));
			return;
		}
		await updateLevelItem(levelId, { rating });
	}

	async function saveMinProgressEdit(levelId: number) {
		if (!list) return;
		const rawValue = editingMinProgressValue == null ? '' : String(editingMinProgressValue).trim();
		editingMinProgressItemId = null;

		if (!rawValue.length) {
			await updateLevelItem(levelId, { minProgress: null });
			return;
		}

		const minProgress = Number.parseInt(rawValue, 10);
		if (!Number.isInteger(minProgress) || minProgress < 0 || (!list.isPlatformer && minProgress > 100)) {
			toast.error($_('custom_lists.toast.min_progress_invalid'));
			return;
		}
		await updateLevelItem(levelId, { minProgress });
	}

	async function updateLevelItem(levelId: number, patch: { rating?: number; minProgress?: number | null }) {
		if (!list || !canManage) return;
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

	async function setBanState(nextIsBanned: boolean) {
		if (!list || !canBan || savingBanState) return;

		const confirmationKey = nextIsBanned
			? 'custom_lists.manage.ban_confirm'
			: 'custom_lists.manage.unban_confirm';

		if (!confirm($_(confirmationKey))) return;

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

	// Drag & drop reorder
	function onDragStart(e: DragEvent, index: number) {
		draggedIndex = index;
		if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
	}

	function onDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		dragOverIndex = index;
	}

	function onDragEnd() {
		draggedIndex = null;
		dragOverIndex = null;
	}

	function addRankBadge() {
		editForm.rankBadges = [...editForm.rankBadges, createEmptyCustomListRankBadge()];
	}

	function getRankBadgePreviewLabel(rankBadge: CustomListRankBadgeDraft) {
		return rankBadge.shorthand.trim() || rankBadge.name.trim() || '?';
	}

	function removeRankBadge(index: number) {
		editForm.rankBadges = editForm.rankBadges.filter((_, currentIndex) => currentIndex !== index);
	}

	function onRankBadgeDragStart(event: DragEvent, index: number) {
		draggedRankBadgeIndex = index;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
		}
	}

	function onRankBadgeDragOver(event: DragEvent, index: number) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
		dragOverRankBadgeIndex = index;
	}

	function onRankBadgeDragEnd() {
		draggedRankBadgeIndex = null;
		dragOverRankBadgeIndex = null;
	}

	function onRankBadgeDrop(event: DragEvent, targetIndex: number) {
		event.preventDefault();

		if (draggedRankBadgeIndex === null || draggedRankBadgeIndex === targetIndex) {
			onRankBadgeDragEnd();
			return;
		}

		const nextRankBadges = [...editForm.rankBadges];
		const [movedRankBadge] = nextRankBadges.splice(draggedRankBadgeIndex, 1);
		nextRankBadges.splice(targetIndex, 0, movedRankBadge);
		editForm.rankBadges = nextRankBadges;
		onRankBadgeDragEnd();
	}

	function onDrop(e: DragEvent, targetIndex: number) {
		e.preventDefault();
		if (draggedIndex === null || draggedIndex === targetIndex || !list) {
			draggedIndex = null;
			dragOverIndex = null;
			return;
		}
		const newItems = [...list.items];
		const [moved] = newItems.splice(draggedIndex, 1);
		newItems.splice(targetIndex, 0, moved);
		list = { ...list, items: newItems };
		draggedIndex = null;
		dragOverIndex = null;
		reorderLevels(newItems.map((item) => item.levelId));
	}

	async function reorderLevels(levelIds: number[]) {
		if (!list || !canManage) return;
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

	$: isModerator = Boolean($user.loggedIn && ($user.data?.isAdmin || $user.data?.isManager));
	$: isOwner = Boolean(list && $user.loggedIn && list.owner === $user.data?.uid);
	$: ownerCanManage = Boolean(list && isOwner && !list.isBanned);
	$: canManage = Boolean(list && (ownerCanManage || isModerator));
	$: canDelete = Boolean(list && ownerCanManage && !list.isOfficial);
	$: canBan = Boolean(list && isModerator && !list.isOfficial);
	$: if (!canManage && activeTab !== 'levels') {
		activeTab = 'levels';
	}
</script>

<svelte:head>
	<title>{list ? `Quản lý danh sách - ${list.title} - Geometry Dash Việt Nam` : 'Danh sách - Geometry Dash Việt Nam'}</title>
</svelte:head>

<input
	hidden
	type="file"
	accept="image/png,image/jpeg,image/webp,image/gif"
	on:change={(event) => handleCustomListAssetUpload('banner', event)}
	bind:this={bannerFileInput}
/>

<input
	hidden
	type="file"
	accept="image/png,image/jpeg,image/webp,image/gif"
	on:change={(event) => handleCustomListAssetUpload('logo', event)}
	bind:this={logoFileInput}
/>

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
		<div class="hero" class:heroHasBanner={Boolean(getManageHeroBannerUrl())} style={getManageHeroStyle()}>
			{#if getManageHeroBannerUrl()}
				<div class="heroBanner" style={getManageHeroBannerStyle()}>
					<img src={getManageHeroBannerUrl()} alt="" loading="lazy" decoding="async" />
				</div>
			{/if}
			<div class="heroTop">
				<div class="heroInfo">
					<h1>{list.title}</h1>
					<p class="heroDesc">{list.description || $_('custom_lists.detail.no_description')}</p>
				</div>
				<div class="heroChips">
					<span class="chip">
						<svelte:component this={getVisibilityIcon(list.visibility)} class="h-3.5 w-3.5" />
						{formatVisibility(list.visibility)}
					</span>
					<span class="chip">
						<Layers class="h-3.5 w-3.5" />
						{formatListType(list.isPlatformer)}
					</span>
					<span class="chip">
						{list.mode === 'top' ? '🔢' : '⭐'}
						{list.mode === 'rating' ? $_('custom_lists.detail.edit.mode_rating') : $_('custom_lists.detail.edit.mode_top')}
					</span>
					<span class="chip">
						{$_('custom_lists.detail.levels_badge', { values: { count: list.items.length } })}
					</span>
				</div>
			</div>
			{#if list.tags?.length}
				<div class="tagRow">
					{#each list.tags as tag}
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

		{#if list.isBanned}
			<div class="toolCard moderationNotice">
				<div class="moderationCopy">
					<h2 class="toolHeading">{$_('custom_lists.manage.banned_title')}</h2>
					<p class="hint">{canBan ? $_('custom_lists.manage.banned_manager_hint') : $_('custom_lists.manage.banned_owner_hint')}</p>
				</div>
				<div class="moderationIcon">
					<AlertTriangle class="h-5 w-5" />
				</div>
			</div>
		{/if}

		<Tabs.Root bind:value={activeTab}>
			<div class="tabsList">
				<Tabs.List class="flex h-fit w-fit flex-wrap">
					{#if canManage}
						<Tabs.Trigger value="basic">{$_('custom_lists.manage.tabs.basic')}</Tabs.Trigger>
						<Tabs.Trigger value="formula">{$_('custom_lists.manage.tabs.formula')}</Tabs.Trigger>
						<Tabs.Trigger value="rank">{$_('custom_lists.manage.tabs.rank')}</Tabs.Trigger>
					{/if}
					<Tabs.Trigger value="levels">{$_('custom_lists.manage.tabs.levels')}</Tabs.Trigger>
				</Tabs.List>
			</div>

			{#if canManage}
				<Tabs.Content value="basic">
					<div class="tabContent">
						<div class="toolCard">
							<h2 class="toolHeading">{$_('custom_lists.detail.edit.heading')}</h2>
							<div class="formGrid">
								<div class="field">
									<label for="list-title">{$_('custom_lists.detail.edit.title_label')}</label>
									<Input id="list-title" bind:value={editForm.title} maxlength={100} />
								</div>
								<div class="field">
									<label for="list-description">{$_('custom_lists.detail.edit.description_label')}</label>
									<Textarea id="list-description" bind:value={editForm.description} rows={3} />
								</div>
								<div class="field">
									<div class="switchRow">
										<div>
											<label for="list-platformer">{$_('custom_lists.detail.edit.type_label')}</label>
											<p class="hint">{$_('custom_lists.detail.edit.type_hint')}</p>
										</div>
										<div class="switchControl">
											<span class="switchLabel">{formatListType(editForm.isPlatformer)}</span>
											<Switch id="list-platformer" bind:checked={editForm.isPlatformer} />
										</div>
									</div>
								</div>
								<div class="field">
									<div class="switchRow">
										<div>
											<label for="list-community-enabled">{$_('custom_lists.detail.edit.community_label')}</label>
											<p class="hint">{$_('custom_lists.detail.edit.community_hint')}</p>
										</div>
										<div class="switchControl">
											<span class="switchLabel">{editForm.communityEnabled ? $_('general.yes') : $_('general.no')}</span>
											<Switch id="list-community-enabled" bind:checked={editForm.communityEnabled} />
										</div>
									</div>
								</div>
								<div class="field">
									<span class="fieldLabel">{$_('custom_lists.detail.edit.visibility_label')}</span>
									<div class="optionRow">
										{#each visibilityOptions as v}
											<button
												type="button"
												class="optionBtn"
												class:selected={editForm.visibility === v}
												disabled={list.isBanned}
												on:click={() => (editForm.visibility = v)}
											>
												<svelte:component this={getVisibilityIcon(v)} class="h-3.5 w-3.5" />
												{formatVisibility(v)}
											</button>
										{/each}
									</div>
								</div>
								<div class="field">
									<span class="fieldLabel">{$_('custom_lists.detail.edit.mode_label')}</span>
									<div class="optionRow">
										{#each ['rating', 'top'] as m}
											<button
												type="button"
												class="optionBtn"
												class:selected={editForm.mode === m}
												on:click={() => (editForm.mode = m === 'rating' ? 'rating' : 'top')}
											>
												{#if m === 'rating'}<Star class="h-3.5 w-3.5" />{:else}<ListOrdered class="h-3.5 w-3.5" />{/if}
												{m === 'rating' ? $_('custom_lists.detail.edit.mode_rating') : $_('custom_lists.detail.edit.mode_top')}
											</button>
										{/each}
									</div>
									<p class="hint">{editForm.mode === 'rating' ? $_('custom_lists.detail.edit.mode_rating_hint') : $_('custom_lists.detail.edit.mode_top_hint')}</p>
								</div>
								<div class="field">
									<label for="list-tags">{$_('custom_lists.detail.edit.tags_label')}</label>
									<Input id="list-tags" bind:value={editForm.tags} placeholder="challenge, favorite" />
								</div>
								<div class="field">
									<span class="fieldLabel">{$_('custom_lists.detail.edit.appearance_heading')}</span>
									<p class="hint">{$_('custom_lists.detail.edit.appearance_hint')}</p>
								</div>
								<div class="field">
									<label for="list-background-color">{$_('custom_lists.detail.edit.background_color_label')}</label>
									<div class="colorFieldRow">
										<input
											class="nativeColorInput"
											type="color"
											value={getColorPickerValue(editForm.backgroundColor)}
											on:input={(event) => setThemeColorFromPicker('backgroundColor', event)}
											aria-label={$_('custom_lists.detail.edit.background_color_label')}
										/>
										<span class="colorSwatch" style={isHexColor(editForm.backgroundColor) ? `background: ${editForm.backgroundColor}` : undefined}></span>
										<Input id="list-background-color" bind:value={editForm.backgroundColor} placeholder={$_('custom_lists.detail.edit.background_color_placeholder')} />
										<Button variant="ghost" size="sm" on:click={() => (editForm.backgroundColor = '')}>
											{$_('general.reset')}
										</Button>
									</div>
									<p class="hint">{$_('custom_lists.detail.edit.background_color_hint')}</p>
								</div>
								<div class="field">
									<label for="list-border-color">{$_('custom_lists.detail.edit.border_color_label')}</label>
									<div class="colorFieldRow">
										<input
											class="nativeColorInput"
											type="color"
											value={getColorPickerValue(editForm.borderColor)}
											on:input={(event) => setThemeColorFromPicker('borderColor', event)}
											aria-label={$_('custom_lists.detail.edit.border_color_label')}
										/>
										<span class="colorSwatch" style={isHexColor(editForm.borderColor) ? `background: ${editForm.borderColor}` : undefined}></span>
										<Input id="list-border-color" bind:value={editForm.borderColor} placeholder={$_('custom_lists.detail.edit.border_color_placeholder')} />
										<Button variant="ghost" size="sm" on:click={() => (editForm.borderColor = '')}>
											{$_('general.reset')}
										</Button>
									</div>
									<p class="hint">{$_('custom_lists.detail.edit.border_color_hint')}</p>
								</div>
								<div class="field">
									<div class="assetFieldHeader">
										<label for="list-banner-url">{$_('custom_lists.detail.edit.banner_url_label')}</label>
										<Button
											variant="outline"
											size="sm"
											on:click={() => bannerFileInput?.click()}
											disabled={uploadingAsset === 'banner'}
										>
											{uploadingAsset === 'banner'
												? `${$_('general.loading')}...`
												: $_('custom_lists.detail.edit.banner_upload_button')}
										</Button>
									</div>
									<Input id="list-banner-url" bind:value={editForm.bannerUrl} placeholder={$_('custom_lists.detail.edit.banner_url_placeholder')} />
									<p class="hint">{$_('custom_lists.detail.edit.banner_url_hint')}</p>
									<p class="hint">{$_('custom_lists.detail.edit.asset_upload_hint')}</p>
								</div>
								<div class="field">
									<div class="assetFieldHeader">
										<label for="list-logo-url">{$_('custom_lists.detail.edit.logo_url_label')}</label>
										<Button
											variant="outline"
											size="sm"
											on:click={() => logoFileInput?.click()}
											disabled={uploadingAsset === 'logo'}
										>
											{uploadingAsset === 'logo'
												? `${$_('general.loading')}...`
												: $_('custom_lists.detail.edit.logo_upload_button')}
										</Button>
									</div>
									<Input id="list-logo-url" bind:value={editForm.logoUrl} placeholder={$_('custom_lists.detail.edit.logo_url_placeholder')} />
									{#if getManageLogoPreviewUrl()}
										<div class="assetPreview assetPreviewLogo">
											<img src={getManageLogoPreviewUrl()} alt="" loading="lazy" decoding="async" />
										</div>
									{/if}
									<p class="hint">{$_('custom_lists.detail.edit.logo_url_hint')}</p>
									<p class="hint">{$_('custom_lists.detail.edit.asset_upload_hint')}</p>
								</div>
							</div>
						</div>
					</div>
				</Tabs.Content>

				<Tabs.Content value="formula">
					<div class="tabContent">
						<div class="toolCard">
							<h2 class="toolHeading">{$_('custom_lists.formula.label')}</h2>
							<div class="formGrid">
								<div class="field">
									<label for="list-weight-formula">{$_('custom_lists.formula.label')}</label>
									<Textarea
										id="list-weight-formula"
										bind:value={editForm.weightFormula}
										placeholder={$_('custom_lists.formula.placeholder')}
										rows={5}
									/>
									<p class="hint">{$_('custom_lists.formula.hint')}</p>
									<WeightFormulaPreview
										formula={editForm.weightFormula}
										isPlatformer={editForm.isPlatformer}
										mode={editForm.mode}
									/>
								</div>
							</div>
						</div>
					</div>
				</Tabs.Content>

				<Tabs.Content value="rank">
					<div class="tabContent">
						<div class="toolCard">
							<h2 class="toolHeading">{$_('custom_lists.detail.edit.rank_badges_label')}</h2>
							<div class="formGrid">
								<div class="field">
									<div class="rankBadgeHeader">
										<div>
											<span class="fieldLabel">{$_('custom_lists.detail.edit.rank_badges_label')}</span>
											<p class="hint">{$_('custom_lists.detail.edit.rank_badges_hint')}</p>
										</div>
										<Button type="button" variant="outline" size="sm" on:click={addRankBadge}>
											<Plus class="mr-2 h-4 w-4" />
											{$_('custom_lists.detail.edit.rank_badges_add')}
										</Button>
									</div>
									{#if editForm.rankBadges.length === 0}
										<p class="hint">{$_('custom_lists.detail.edit.rank_badges_empty')}</p>
									{:else}
										<div class="rankBadgeList" role="list">
											{#each editForm.rankBadges as rankBadge, index}
												<div
													class="rankBadgeEditor"
													class:dragOver={dragOverRankBadgeIndex === index}
													class:dragging={draggedRankBadgeIndex === index}
													role="listitem"
													draggable="true"
													on:dragstart={(event) => onRankBadgeDragStart(event, index)}
													on:dragover={(event) => onRankBadgeDragOver(event, index)}
													on:drop={(event) => onRankBadgeDrop(event, index)}
													on:dragend={onRankBadgeDragEnd}
												>
													<div class="rankBadgeEditorHandle" title={$_('custom_lists.detail.edit.rank_badges_priority_hint')}>
														<GripVertical class="h-5 w-5" />
													</div>
													<div class="rankBadgePreview" style={`background: ${rankBadge.color || '#64748b'}`}>
														{getRankBadgePreviewLabel(rankBadge)}
													</div>
													<div class="rankBadgeEditorFields">
														<div class="field compactField">
															<label for={`rank-badge-name-${index}`}>{$_('custom_lists.detail.edit.rank_badges_name_label')}</label>
															<Input id={`rank-badge-name-${index}`} bind:value={rankBadge.name} maxlength={30} placeholder={$_('custom_lists.detail.edit.rank_badges_name_placeholder')} />
														</div>
														<div class="field compactField">
															<label for={`rank-badge-shorthand-${index}`}>{$_('custom_lists.detail.edit.rank_badges_shorthand_label')}</label>
															<Input id={`rank-badge-shorthand-${index}`} bind:value={rankBadge.shorthand} maxlength={20} placeholder={$_('custom_lists.detail.edit.rank_badges_shorthand_placeholder')} />
														</div>
														<div class="field compactField">
															<label for={`rank-badge-color-${index}`}>{$_('custom_lists.detail.edit.rank_badges_color_label')}</label>
															<Input id={`rank-badge-color-${index}`} bind:value={rankBadge.color} placeholder={$_('custom_lists.detail.edit.rank_badges_color_placeholder')} />
														</div>
														<div class="field compactField">
															<label for={`rank-badge-min-rating-${index}`}>{$_('custom_lists.detail.edit.rank_badges_min_rating_label')}</label>
															<Input id={`rank-badge-min-rating-${index}`} type="number" bind:value={rankBadge.minRating} min="0" step="0.001" placeholder={$_('custom_lists.detail.edit.rank_badges_min_rating_placeholder')} />
														</div>
														<div class="field compactField">
															<label for={`rank-badge-min-top-${index}`}>{$_('custom_lists.detail.edit.rank_badges_min_top_label')}</label>
															<Input id={`rank-badge-min-top-${index}`} type="number" bind:value={rankBadge.minTop} min="1" step="1" placeholder={$_('custom_lists.detail.edit.rank_badges_min_top_placeholder')} />
														</div>
													</div>
													<Button
														type="button"
														variant="ghost"
														size="icon"
														on:click={() => removeRankBadge(index)}
														title={$_('custom_lists.detail.edit.rank_badges_remove')}
														aria-label={$_('custom_lists.detail.edit.rank_badges_remove')}
													>
														<Trash2 class="h-4 w-4" />
													</Button>
												</div>
											{/each}
										</div>
									{/if}
								</div>
							</div>
						</div>
					</div>
				</Tabs.Content>

			{#if canManage && activeTab !== 'levels'}
				<div class="toolCard actionCard">
					<div class="formActions">
						<Button on:click={saveMetadata} disabled={savingMetadata}>
							<Save class="mr-2 h-4 w-4" />
							{$_('custom_lists.detail.edit.save')}
						</Button>
						<Button variant="outline" on:click={refreshLeaderboardPrecalc} disabled={refreshingLeaderboard}>
							<RefreshCw class="mr-2 h-4 w-4" />
							{refreshingLeaderboard ? `${$_('general.loading')}...` : 'Refresh leaderboard'}
						</Button>
						{#if canBan}
							<Button
								variant={list.isBanned ? 'outline' : 'destructive'}
								on:click={() => list && setBanState(!list.isBanned)}
								disabled={savingBanState}
							>
								<AlertTriangle class="mr-2 h-4 w-4" />
								{list.isBanned ? $_('custom_lists.manage.unban') : $_('custom_lists.manage.ban')}
							</Button>
						{/if}
						{#if canDelete}
							<Button variant="destructive" on:click={deleteList}>
								<Trash2 class="mr-2 h-4 w-4" />
								{$_('custom_lists.detail.edit.delete')}
							</Button>
						{/if}
					</div>
				</div>
			{/if}
			{/if}

			<Tabs.Content value="levels">
				<div class="tabContent">
					{#if canManage}
						<div class="toolCard">
							<h2 class="toolHeading">{$_('custom_lists.detail.add_level.heading')}</h2>
							<div class="field">
								<label for="level-id">{$_('custom_lists.detail.add_level.id_label')}</label>
								<Input id="level-id" bind:value={levelIdInput} inputmode="numeric" />
							</div>
							<p class="hint">{$_('custom_lists.detail.add_level.hint')}</p>
							<div class="formActions">
								<Button on:click={addLevel} disabled={addingLevel}>
									<Plus class="mr-2 h-4 w-4" />
									{$_('custom_lists.detail.add_level.button')}
								</Button>
							</div>
						</div>
					{/if}

					<div class="levelsSection">
						<div class="sectionHeader">
							<h2>{$_('custom_lists.detail.levels.heading')}</h2>
							<div class="sectionMeta">
								{#if list.mode === 'rating'}
									<Badge variant="secondary">
										<Star class="mr-1 h-3 w-3" />
										{$_('custom_lists.detail.edit.mode_rating')}
									</Badge>
								{:else}
									<Badge variant="secondary">
										<ListOrdered class="mr-1 h-3 w-3" />
										{$_('custom_lists.detail.edit.mode_top')}
									</Badge>
								{/if}
								<Badge variant="outline">{list.items.length}</Badge>
							</div>
						</div>

						{#if list.items.length === 0}
							<div class="emptyState slim">
								<h3>{$_('custom_lists.detail.levels.empty_title')}</h3>
								<p>{canManage ? $_('custom_lists.detail.levels.empty_owner') : $_('custom_lists.detail.levels.empty_visitor')}</p>
							</div>
						{:else}
							<div class="levelList">
								{#each list.items as item, i}
									<div
										class="levelItem"
										class:isDraggable={canManage && list.mode === 'top' && !savingReorder}
										class:dragOver={canManage && list.mode === 'top' && dragOverIndex === i}
										class:dragging={canManage && list.mode === 'top' && draggedIndex === i}
										role="listitem"
										draggable={canManage && list.mode === 'top' && !savingReorder}
										on:dragstart={(e) => { if (canManage && list?.mode === 'top' && !savingReorder) onDragStart(e, i); }}
										on:dragover={(e) => { if (canManage && list?.mode === 'top' && !savingReorder) onDragOver(e, i); }}
										on:drop={(e) => { if (canManage && list?.mode === 'top' && !savingReorder) onDrop(e, i); }}
										on:dragend={() => { if (canManage && list?.mode === 'top') onDragEnd(); }}
									>
										<div class="levelRow">
											{#if canManage && list.mode === 'top'}
												<div class="dragHandle" title={$_('custom_lists.detail.levels.drag_hint')}>
													<GripVertical class="h-5 w-5" />
												</div>
											{/if}

											<div class="rankBadge">#{i + 1}</div>

											<div class="levelBody">
												{#if item.level}
													<a class="levelLink" href={`/level/${item.levelId}`}>{item.level.name || `Level #${item.levelId}`}</a>
													<p class="levelMeta">
														{$_('custom_lists.detail.levels.by')} {item.level.creator || 'Unknown'}
														{#if item.level.difficulty} • {item.level.difficulty}{/if}
														{#if item.level.isPlatformer} • {$_('custom_lists.detail.levels.platformer')}{/if}
													</p>
												{:else}
													<span class="levelLink missing">{$_('custom_lists.detail.levels.unavailable', { values: { id: item.levelId } })}</span>
													<p class="levelMeta">{$_('custom_lists.detail.levels.unavailable_desc')}</p>
												{/if}
											</div>

											<div class="levelActions">
												{#if list.mode === 'rating'}
													{#if canManage && editingRatingItemId === item.id}
														<input
															class="inlineInput ratingInput"
															type="number"
															min="1"
															max="10"
															bind:value={editingRatingValue}
															on:blur={() => saveRatingEdit(item.levelId)}
															on:keydown={(e) => e.key === 'Enter' && saveRatingEdit(item.levelId)}
														/>
													{:else}
														<button
															class="chipBtn"
															class:editable={canManage}
															type="button"
															on:click={canManage ? () => startRatingEdit(item) : undefined}
															title={canManage ? $_('custom_lists.detail.levels.rating_edit_hint') : undefined}
														>
															★ {item.rating ?? 5}
														</button>
													{/if}
												{/if}

												{#if canManage && editingMinProgressItemId === item.id}
													<input
														class="inlineInput minProgressInput"
														type="number"
														min="0"
														max={list.isPlatformer ? undefined : '100'}
														placeholder={item.level?.minProgress != null ? String(item.level.minProgress) : undefined}
														bind:value={editingMinProgressValue}
														on:blur={handleMinProgressBlur}
														on:keydown={(e) => {
															if (e.key === 'Enter') {
																e.preventDefault();
																saveMinProgressEdit(item.levelId);
															}
															if (e.key === 'Escape') {
																e.preventDefault();
																cancelMinProgressEdit();
															}
														}}
													/>
													<div class="inlineEditActions">
														<button
															type="button"
															class="inlineEditBtn inlineEditBtnPrimary"
															data-min-progress-action="save"
															on:mousedown|preventDefault
															on:click={() => saveMinProgressEdit(item.levelId)}
															disabled={savingLevelItemId === item.levelId}
														>
															<Save class="mr-1.5 h-3.5 w-3.5" />
															{$_('custom_lists.detail.levels.save_button')}
														</button>
														<button
															type="button"
															class="inlineEditBtn inlineEditBtnSecondary"
															data-min-progress-action="cancel"
															on:mousedown|preventDefault
															on:click={cancelMinProgressEdit}
															disabled={savingLevelItemId === item.levelId}
														>
															{$_('custom_lists.detail.levels.cancel_button')}
														</button>
													</div>
												{:else}
													<button
														class="chipBtn"
														class:editable={canManage}
														type="button"
														on:click={canManage ? () => startMinProgressEdit(item) : undefined}
														title={canManage ? $_('custom_lists.detail.levels.min_progress_edit_hint') : undefined}
													>
														{getMinProgressLabel(item)}
													</button>
												{/if}

												<Badge variant="outline">{$_('custom_lists.detail.levels.id_badge', { values: { id: item.levelId } })}</Badge>

												{#if canManage}
													<Button
														variant="destructive"
														size="sm"
														on:click={() => removeLevel(item.levelId)}
														disabled={mutatingLevelId === item.levelId}
													>
														<Trash2 class="mr-1.5 h-3.5 w-3.5" />
														{$_('custom_lists.detail.levels.remove')}
													</Button>
												{/if}
											</div>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>
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
		color: hsl(var(--muted-foreground));
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
		color: hsl(var(--muted-foreground));
		background: hsl(var(--muted) / 0.4);
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
		color: hsl(var(--muted-foreground));
	}

	.tabsList {
		display: flex;
	}

	.tabContent {
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin-top: 16px;
	}

	.toolCard {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		padding: 22px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.moderationNotice {
		flex-direction: row;
		align-items: flex-start;
		justify-content: space-between;
		background: hsl(var(--destructive) / 0.08);
		border-color: hsl(var(--destructive) / 0.35);
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

	.formGrid {
		display: grid;
		gap: 14px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	label, .fieldLabel {
		font-size: 0.9rem;
		font-weight: 500;
	}

	.hint {
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
		margin: 0;
	}

	.optionRow {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.optionBtn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		border: 1px solid hsl(var(--border));
		background: transparent;
		color: hsl(var(--foreground));
		padding: 7px 14px;
		border-radius: 999px;
		cursor: pointer;
		font-size: 0.85rem;
		transition: background 0.15s ease, border-color 0.15s ease;
	}

	.optionBtn:hover {
		background: hsl(var(--muted) / 0.5);
	}

	.optionBtn.selected {
		background: hsl(var(--primary) / 0.12);
		border-color: hsl(var(--primary));
	}

	.assetFieldHeader {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}

	.colorFieldRow {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.nativeColorInput {
		width: 42px;
		height: 42px;
		padding: 0;
		border: 1px solid hsl(var(--border));
		border-radius: 10px;
		background: transparent;
		cursor: pointer;
		flex-shrink: 0;
	}

	.nativeColorInput::-webkit-color-swatch-wrapper {
		padding: 4px;
	}

	.nativeColorInput::-webkit-color-swatch {
		border: none;
		border-radius: 8px;
	}

	.nativeColorInput::-moz-color-swatch {
		border: none;
		border-radius: 8px;
	}

	.colorSwatch {
		width: 28px;
		height: 28px;
		border-radius: 999px;
		border: 1px solid hsl(var(--border));
		background: hsl(var(--muted) / 0.35);
		flex-shrink: 0;
	}

	.optionBtn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.switchRow {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}

	.switchControl {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.switchLabel {
		font-size: 0.9rem;
		font-weight: 500;
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

	.assetPreview {
		width: fit-content;
		padding: 10px;
		border: 1px solid hsl(var(--border));
		border-radius: 10px;
		background: hsl(var(--muted) / 0.12);
	}

	.assetPreview img {
		display: block;
		max-width: 100%;
	}

	.assetPreviewLogo img {
		width: 56px;
		height: 56px;
		object-fit: contain;
	}

	.rankBadgeHeader {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}

	.rankBadgeList {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.rankBadgeEditor {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 14px;
		border: 1px solid hsl(var(--border));
		border-radius: 10px;
		background: hsl(var(--muted) / 0.12);
		transition: border-color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
	}

	.rankBadgeEditor.dragOver {
		border-color: hsl(var(--primary));
		box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2);
	}

	.rankBadgeEditor.dragging {
		opacity: 0.45;
	}

	.rankBadgeEditorHandle {
		display: flex;
		align-items: center;
		justify-content: center;
		color: hsl(var(--muted-foreground));
		padding-top: 7px;
		cursor: grab;
	}

	.rankBadgePreview {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 68px;
		padding: 7px 12px;
		border-radius: 999px;
		color: white;
		font-size: 0.8rem;
		font-weight: 700;
		white-space: nowrap;
		margin-top: 4px;
	}

	.rankBadgeEditorFields {
		flex: 1;
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 12px;
	}

	.compactField {
		min-width: 0;
	}

	/* Levels Section */
	.levelsSection {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.sectionHeader {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}

	.sectionHeader h2 {
		margin: 0;
		font-size: 1.2rem;
		font-weight: 600;
	}

	.sectionMeta {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.levelList {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.levelItem {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 10px;
		padding: 14px 18px;
		transition: opacity 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
	}

	.levelItem.isDraggable {
		cursor: grab;
	}

	.levelItem.isDraggable:active {
		cursor: grabbing;
	}

	.levelItem.dragging {
		opacity: 0.4;
	}

	.levelItem.dragOver {
		border-color: hsl(var(--primary));
		box-shadow: 0 0 0 2px hsl(var(--primary) / 0.25);
	}

	.levelRow {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.dragHandle {
		color: hsl(var(--muted-foreground));
		flex-shrink: 0;
		display: flex;
		align-items: center;
	}

	.rankBadge {
		font-size: 0.85rem;
		font-weight: 700;
		color: hsl(var(--muted-foreground));
		min-width: 28px;
		text-align: center;
		flex-shrink: 0;
	}

	.levelBody {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
		min-width: 0;
	}

	.levelLink {
		font-weight: 600;
		text-decoration: none;
		color: hsl(var(--foreground));
		font-size: 0.95rem;
	}

	.levelLink:hover {
		text-decoration: underline;
	}

	.levelLink.missing {
		color: hsl(var(--destructive));
	}

	.levelMeta {
		margin: 0;
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
	}

	.levelActions {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		flex-shrink: 0;
	}

	.chipBtn {
		background: hsl(var(--muted));
		border: 1px solid hsl(var(--border));
		color: hsl(var(--foreground));
		font-size: 0.8rem;
		font-weight: 600;
		padding: 4px 10px;
		border-radius: 999px;
		cursor: default;
		white-space: nowrap;
	}

	.chipBtn.editable {
		cursor: pointer;
		transition: background 0.15s ease, border-color 0.15s ease;
	}

	.chipBtn.editable:hover {
		background: hsl(var(--primary) / 0.12);
		border-color: hsl(var(--primary));
	}

	.inlineInput {
		padding: 4px 8px;
		border: 1px solid hsl(var(--primary));
		border-radius: 6px;
		background: hsl(var(--background));
		color: hsl(var(--foreground));
		font-size: 0.85rem;
		text-align: center;
	}

	.ratingInput {
		width: 60px;
	}

	.minProgressInput {
		width: 120px;
	}

	.inlineEditActions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.inlineEditBtn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		min-height: 32px;
		padding: 0 12px;
		border-radius: 8px;
		border: 1px solid hsl(var(--border));
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
	}

	.inlineEditBtn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.inlineEditBtnPrimary {
		background: hsl(var(--primary));
		border-color: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
	}

	.inlineEditBtnPrimary:hover:not(:disabled) {
		background: hsl(var(--primary) / 0.9);
	}

	.inlineEditBtnSecondary {
		background: hsl(var(--background));
		color: hsl(var(--foreground));
	}

	.inlineEditBtnSecondary:hover:not(:disabled) {
		background: hsl(var(--muted) / 0.5);
	}

	/* Empty State */
	.emptyState {
		border: 1px dashed hsl(var(--border));
		border-radius: 12px;
		padding: 40px 24px;
		text-align: center;
		background: hsl(var(--muted) / 0.12);
	}

	.emptyState.slim {
		padding: 28px 20px;
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

		.rankBadgeEditor {
			flex-direction: column;
		}

		.rankBadgeEditorFields {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			width: 100%;
		}

		.levelRow {
			flex-direction: column;
			align-items: flex-start;
		}

		.levelActions {
			width: 100%;
		}

		.sectionHeader {
			flex-direction: column;
			align-items: flex-start;
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

		.rankBadgeEditorFields {
			grid-template-columns: 1fr;
		}

		.heroInfo h1 {
			font-size: 1.2rem;
		}

		.toolCard {
			padding: 16px;
		}

		.levelItem {
			padding: 12px 14px;
		}

		.optionBtn {
			padding: 6px 12px;
			font-size: 0.8rem;
		}
	}
</style>
