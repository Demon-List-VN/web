<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Tabs from '$lib/components/ui/tabs';
	import AppearanceTab from './AppearanceTab.svelte';
	import BasicTab from './BasicTab.svelte';
	import CollaborationTab from './CollaborationTab.svelte';
	import DangerTab from './DangerTab.svelte';
	import FormulaTab from './FormulaTab.svelte';
	import LevelsTab from './LevelsTab.svelte';
	import RankTab from './RankTab.svelte';
	import SubmissionsTab from './SubmissionsTab.svelte';
	import imageCompression from 'browser-image-compression';
	import { browser } from '$app/environment';
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
		AlertTriangle,
		Settings,
		Palette,
		Calculator,
		Filter,
		Award,
		ListOrdered,
		Inbox,
		Users,
		ShieldAlert
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
		isPendingAddition?: boolean;
	};

	type PreparedCustomListLevel = {
		id: number;
		name: string | null;
		creator: string | null;
		difficulty: string | null;
		isPlatformer: boolean;
		minProgress: number | null;
		videoID?: string | null;
	};

	type PendingLevelAddition = CustomListItem & {
		stagedCreatedAt?: string | null;
		crawlStatus?: 'crawled' | 'skipped';
		isPendingAddition: true;
	};

	type PendingLevelOrderDraft = {
		top: number;
		inputIndex: number;
	};

	type CustomListSubmission = {
		id: number;
		created_at: string;
		listId: number;
		levelId: number;
		addedBy: string;
		rating: number;
		position: number | null;
		minProgress: number | null;
		videoID: string | null;
		submissionComment?: string | null;
		level?: {
			id: number;
			name: string | null;
			creator: string | null;
			difficulty: string | null;
			isPlatformer: boolean;
			minProgress: number | null;
			videoID?: string | null;
		} | null;
		submitterData?: {
			uid: string;
			name?: string | null;
		} | null;
	};

	type CustomListResolvedRole = 'viewer' | 'owner' | 'admin' | 'helper' | 'moderator';

	type CustomListPermissionFlags = {
		canEditSettings: boolean;
		canEditLevels: boolean;
		canReviewSubmissions: boolean;
		canDelete: boolean;
		canBan: boolean;
		canManageMembers: boolean;
		canConfigureCollaboration: boolean;
		canTransferOwnership: boolean;
		canViewMembers: boolean;
		canViewAudit: boolean;
		canViewPendingInvitations: boolean;
		canRespondToInvitation: boolean;
	};

	type CustomListMember = {
		id: number;
		uid: string;
		role: 'admin' | 'helper';
		created_at: string;
		updated_at: string;
		playerData?: any | null;
	};

	type CustomListInvitation = {
		id: number;
		uid: string;
		role: 'admin' | 'helper';
		invitedBy: string;
		created_at: string;
		updated_at: string;
		playerData?: any | null;
		invitedByData?: any | null;
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
		levelSubmissionEnabled?: boolean;
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
		pendingInvitations?: CustomListInvitation[];
		pendingInvitation?: CustomListInvitation | null;
		auditLog?: CustomListAuditLogEntry[];
		rankBadges?: CustomListRankBadge[];
		weightFormula?: string;
		recordFilterPlatform?: 'any' | 'pc' | 'mobile';
		recordFilterMinRefreshRate?: number | null;
		recordFilterMaxRefreshRate?: number | null;
		recordFilterManualAcceptanceOnly?: boolean;
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

	type BatchCrawlLevelResult = {
		id: number;
		status: 'skipped' | 'crawled' | 'not_found';
		level?: PreparedCustomListLevel;
		error?: string;
	};

	type BatchCrawlLevelsResponse = {
		forced: boolean;
		results: BatchCrawlLevelResult[];
		crawled: number;
		skipped: number;
		notFound: number;
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

	type LevelItemPatch = {
		rating?: number;
		minProgress?: number | null;
		videoID?: string | null;
		createdAt?: string;
	};

	type PendingLevelAuditChange = {
		old: unknown;
		new: unknown;
	};

	type PendingLevelAuditState = {
		rating: number;
		minProgress: number | null;
		videoID: string | null;
		createdAt: string | null;
		position: number;
	};

	type PendingSettingsAuditState = {
		title: string;
		description: string;
		backgroundColor: string;
		bannerUrl: string;
		borderColor: string;
		communityEnabled: boolean;
		levelSubmissionEnabled: boolean;
		faviconUrl: string;
		isPlatformer: boolean;
		logoUrl: string;
		topEnabled: boolean;
		itemSort: 'mode_default' | 'created_at';
		visibility: 'private' | 'unlisted' | 'public';
		tags: string[];
		mode: 'rating' | 'top';
		rankBadges: Array<{
			name: string;
			shorthand: string;
			color: string;
			minRating: number | null;
			minTop: number | null;
		}>;
		weightFormula: string;
		recordFilterPlatform: 'any' | 'pc' | 'mobile';
		recordFilterMinRefreshRate: number | null;
		recordFilterMaxRefreshRate: number | null;
		recordFilterManualAcceptanceOnly: boolean;
	};

	type PendingManageAuditField = keyof PendingLevelAuditState | keyof PendingSettingsAuditState;

	type PendingManageAuditEntry = {
		action: 'list_updated' | 'level_added' | 'level_removed' | 'level_updated';
		label: string;
		identifier?: number | null;
		creator?: string | null;
		fields: PendingManageAuditField[];
		metadata: Record<string, any>;
	};

	type PendingLevelAuditEntry = {
		action: 'level_added' | 'level_removed' | 'level_updated';
		levelId: number;
		levelItemId: number;
		levelName: string;
		creator: string | null;
		fields: Array<keyof LevelItemPatch | 'position'>;
		metadata: Record<string, any>;
	};

	type ManageTab = 'basic' | 'appearance' | 'formula' | 'record-filter' | 'rank' | 'danger' | 'levels' | 'submissions' | 'collaboration';

	const defaultPermissions: CustomListPermissionFlags = {
		canEditSettings: false,
		canEditLevels: false,
		canReviewSubmissions: false,
		canDelete: false,
		canBan: false,
		canManageMembers: false,
		canConfigureCollaboration: false,
		canTransferOwnership: false,
		canViewMembers: false,
		canViewAudit: false,
		canViewPendingInvitations: false,
		canRespondToInvitation: false
	};

	// SSR data - hydrate into reactive local state
	let list: CustomList | null = data?.list ?? null;
	let loadingError = data?.error ?? '';
	let requiresAuthRecovery = Boolean(data?.requiresAuthRecovery);
	let authRecoveryLoading = requiresAuthRecovery;
	let hasResolvedManageAccess = false;
	let redirectingUnauthorizedManage = false;

	let addingLevel = false;
	let savingLevelItemId: number | null = null;
	let savingLevelDrafts = false;
	let savingReorder = false;
	let refreshingLeaderboard = false;
	let savingBanState = false;
	let savingCollaboration = false;
	let hasUnsavedSettings = false;
	let hasUnsavedLevelEdits = false;
	let hasUnsavedManageChanges = false;
	let initialSyncDone = false;
	let uploadingAsset: 'banner' | 'favicon' | 'logo' | null = null;
	let batchAddProgress: BatchAddProgress | null = null;
	let batchAddAbortController: AbortController | null = null;
	let levelDrafts: Record<number, LevelItemPatch> = {};
	let levelDeletionDraftIds: number[] = [];
	let pendingLevelAdditions: PendingLevelAddition[] = [];
	let pendingLevelOrderDrafts: Record<number, PendingLevelOrderDraft> = {};
	let pendingSubmissions: CustomListSubmission[] = [];
	let pendingSubmissionsLoading = false;
	let pendingSubmissionsError = '';
	let pendingSubmissionsRequestKey = '';
	let savingSubmissionId: number | null = null;
	let levelsTabList: (CustomList & { items: CustomListItem[] }) | null = null;
	let showPendingLevelChangesDialog = false;
	let nextPendingLevelItemId = -1;

	const CUSTOM_LIST_CDN_BASE_URL = 'https://cdn.gdvn.net';
	const CSV_IMPORT_RATE_LIMIT_RETRY_MS = 1000;
	const CSV_IMPORT_RATE_LIMIT_TIMEOUT_MS = 15000;
	const DEFAULT_ITEM_SORT: 'mode_default' | 'created_at' = 'mode_default';
	const LEVEL_AUDIT_MUTABLE_FIELDS: Array<keyof LevelItemPatch> = ['rating', 'minProgress', 'videoID', 'createdAt'];
	const RECORD_FILTER_PLATFORM_OPTIONS: Array<'any' | 'pc' | 'mobile'> = ['any', 'pc', 'mobile'];

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
		levelSubmissionEnabled: false,
		faviconUrl: '',
		isPlatformer: false,
		logoUrl: '',
		topEnabled: true,
		itemSort: 'mode_default' as 'mode_default' | 'created_at',
		visibility: 'private' as 'private' | 'unlisted' | 'public',
		tags: '',
		mode: 'rating' as 'rating' | 'top',
		rankBadges: [] as CustomListRankBadgeDraft[],
		weightFormula: '1',
		recordFilterPlatform: 'any' as 'any' | 'pc' | 'mobile',
		recordFilterMinRefreshRate: null as number | null,
		recordFilterMaxRefreshRate: null as number | null,
		recordFilterManualAcceptanceOnly: true
	};

	let activeTab: ManageTab = getInitialManageTab();
	let initialManageTabSettled = false;
	let collaborationTabProps: any = {};

	function buildListRequestUrl() {
		return `${import.meta.env.VITE_API_URL}/lists/${$page.params.id}`;
	}


	function getInitialManageTab(): ManageTab {
		const requestedTab = $page.url.searchParams.get('tab');

		if (requestedTab === 'pending-invitations') {
			return 'collaboration';
		}

		if (
			requestedTab === 'basic'
			|| requestedTab === 'appearance'
			|| requestedTab === 'formula'
			|| requestedTab === 'record-filter'
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

	function getInitialCollaborationSection() {
		return $page.url.searchParams.get('tab') === 'pending-invitations'
			|| $page.url.searchParams.get('collaborationTab') === 'pending'
			? 'pending'
			: 'members';
	}

	function syncForm() {
		if (!list) return;
		editForm.title = list.title;
		editForm.description = list.description;
		editForm.backgroundColor = list.backgroundColor || '';
		editForm.bannerUrl = list.bannerUrl || '';
		editForm.borderColor = list.borderColor || '';
		editForm.communityEnabled = list.communityEnabled;
		editForm.levelSubmissionEnabled = list.levelSubmissionEnabled ?? false;
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
		editForm.recordFilterPlatform = list.recordFilterPlatform || 'any';
		editForm.recordFilterMinRefreshRate = list.recordFilterMinRefreshRate ?? null;
		editForm.recordFilterMaxRefreshRate = list.recordFilterMaxRefreshRate ?? null;
		editForm.recordFilterManualAcceptanceOnly = list.recordFilterManualAcceptanceOnly ?? true;
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
			levelSubmissionEnabled: currentList.levelSubmissionEnabled ?? false,
			faviconUrl: currentList.faviconUrl || '',
			isPlatformer: currentList.isPlatformer,
			logoUrl: currentList.logoUrl || '',
			topEnabled: currentList.topEnabled ?? true,
			itemSort: currentList.itemSort || DEFAULT_ITEM_SORT,
			visibility: currentList.visibility,
			tags: currentList.tags,
			mode: currentList.mode,
			rankBadges: getRankBadgeSnapshot(currentList.rankBadges),
			weightFormula: currentList.weightFormula || '1',
			recordFilterPlatform: currentList.recordFilterPlatform || 'any',
			recordFilterMinRefreshRate: currentList.recordFilterMinRefreshRate ?? null,
			recordFilterMaxRefreshRate: currentList.recordFilterMaxRefreshRate ?? null,
			recordFilterManualAcceptanceOnly: currentList.recordFilterManualAcceptanceOnly ?? true
		};
	}

	function getEditableSettingsSnapshot(currentForm: typeof editForm) {
		return {
			title: currentForm.title,
			description: currentForm.description,
			backgroundColor: currentForm.backgroundColor,
			bannerUrl: currentForm.bannerUrl,
			borderColor: currentForm.borderColor,
			communityEnabled: currentForm.communityEnabled,
			levelSubmissionEnabled: currentForm.levelSubmissionEnabled,
			faviconUrl: currentForm.faviconUrl,
			isPlatformer: currentForm.isPlatformer,
			logoUrl: currentForm.logoUrl,
			topEnabled: currentForm.topEnabled,
			itemSort: currentForm.itemSort || DEFAULT_ITEM_SORT,
			visibility: currentForm.visibility,
			tags: parseTags(currentForm.tags),
			mode: currentForm.mode,
			rankBadges: getRankBadgeSnapshot(currentForm.rankBadges),
			weightFormula: currentForm.weightFormula,
			recordFilterPlatform: currentForm.recordFilterPlatform,
			recordFilterMinRefreshRate: currentForm.recordFilterMinRefreshRate,
			recordFilterMaxRefreshRate: currentForm.recordFilterMaxRefreshRate,
			recordFilterManualAcceptanceOnly: currentForm.recordFilterManualAcceptanceOnly
		};
	}

	function getSettingsSnapshotKey(value: unknown) {
		return JSON.stringify(value);
	}

	function hasDraftValue(patch: LevelItemPatch | undefined, key: keyof LevelItemPatch) {
		return patch ? Object.prototype.hasOwnProperty.call(patch, key) : false;
	}

	function applyDraftToLevelItem(item: CustomListItem, drafts: Record<number, LevelItemPatch>) {
		const patch = drafts[item.levelId];

		if (!patch) {
			return item;
		}

		return {
			...item,
			...(patch.rating !== undefined ? { rating: patch.rating } : {}),
			...(hasDraftValue(patch, 'minProgress') ? { minProgress: patch.minProgress ?? null } : {}),
			...(hasDraftValue(patch, 'videoID') ? { videoID: patch.videoID ?? null } : {}),
			...(hasDraftValue(patch, 'createdAt') ? { created_at: patch.createdAt ?? item.created_at } : {}),
		};
	}

	function getPendingLevelOrderEntries(orderDrafts: Record<number, PendingLevelOrderDraft> = pendingLevelOrderDrafts) {
		return Object.entries(orderDrafts)
			.map(([levelId, draft]) => ({
				levelId: Number(levelId),
				top: draft.top,
				inputIndex: draft.inputIndex
			}))
			.filter((entry) => Number.isInteger(entry.levelId) && entry.levelId > 0 && Number.isInteger(entry.top) && entry.top > 0);
	}

	function applyPendingOrderDrafts(items: CustomListItem[], currentList: CustomList | null, orderDrafts: Record<number, PendingLevelOrderDraft>) {
		if (!currentList || currentList.mode !== 'top' || currentList.itemSort === 'created_at') {
			return sortLevelItemsForDisplay(items, currentList);
		}

		const orderedItems = sortLevelItemsForDisplay(items, currentList);
		const itemsByLevelId = new Map(orderedItems.map((item) => [item.levelId, item]));
		const topOverrides = getPendingLevelOrderEntries(orderDrafts).filter((entry) => itemsByLevelId.has(entry.levelId));
		const baseLevelIds = orderedItems.map((item) => item.levelId);
		const reorderedLevelIds = topOverrides.length
			? buildReorderedLevelIds(baseLevelIds, topOverrides)
			: baseLevelIds;

		return reorderedLevelIds.map((levelId, index) => ({
			...itemsByLevelId.get(levelId)!,
			position: index + 1
		}));
	}

	function sortLevelItemsForDisplay(items: CustomListItem[], currentList: CustomList | null) {
		const itemSort = currentList?.itemSort || DEFAULT_ITEM_SORT;

		return [...items].sort((left, right) => {
			if (itemSort === 'created_at') {
				const createdAtDifference = new Date(left.created_at).getTime() - new Date(right.created_at).getTime();

				if (createdAtDifference !== 0) {
					return createdAtDifference;
				}

				return left.id - right.id;
			}

			if (currentList?.mode === 'top') {
				const leftPosition = left.position;
				const rightPosition = right.position;

				if (leftPosition == null && rightPosition == null) {
					const createdAtDifference = new Date(left.created_at).getTime() - new Date(right.created_at).getTime();

					if (createdAtDifference !== 0) {
						return createdAtDifference;
					}

					return left.id - right.id;
				}

				if (leftPosition == null) return 1;
				if (rightPosition == null) return -1;

				if (leftPosition !== rightPosition) {
					return leftPosition - rightPosition;
				}
			} else {
				const leftRating = left.rating ?? 5;
				const rightRating = right.rating ?? 5;

				if (leftRating !== rightRating) {
					return rightRating - leftRating;
				}
			}

			const createdAtDifference = new Date(left.created_at).getTime() - new Date(right.created_at).getTime();

			if (createdAtDifference !== 0) {
				return createdAtDifference;
			}

			return left.id - right.id;
		});
	}

	function getCombinedLevelItems(currentList: CustomList | null = list) {
		return [
			...(currentList?.items ?? []),
			...pendingLevelAdditions
		];
	}

	function getLevelsTabList(currentList: CustomList | null = list) {
		if (!currentList) {
			return null;
		}

		return {
			...currentList,
			items: getDisplayedLevelItems(currentList)
		};
	}

	function getDisplayedLevelItems(
		currentList: CustomList | null = list,
		drafts: Record<number, LevelItemPatch> = levelDrafts,
		deletionDraftIds: number[] = levelDeletionDraftIds,
		orderDrafts: Record<number, PendingLevelOrderDraft> = pendingLevelOrderDrafts
	) {
		const deletionDraftSet = new Set(deletionDraftIds);

		return applyPendingOrderDrafts(
			getCombinedLevelItems(currentList)
				.filter((item) => !deletionDraftSet.has(item.levelId))
				.map((item) => applyDraftToLevelItem(item, drafts)),
			currentList,
			orderDrafts
		);
	}

	function normalizeMutationListPayload(payload: CustomList) {
		return {
			...payload,
			itemSort: editForm.itemSort || list?.itemSort || DEFAULT_ITEM_SORT
		};
	}

	function buildPendingLevelAddition(level: PreparedCustomListLevel & { crawlStatus?: 'crawled' | 'skipped' }, options: {
		createdAt?: string;
		crawlStatus?: 'crawled' | 'skipped';
	} = {}): PendingLevelAddition {
		return {
			id: nextPendingLevelItemId--,
			levelId: level.id,
			created_at: options.createdAt ?? new Date().toISOString(),
			minProgress: null,
			rating: 5,
			position: null,
			videoID: null,
			stagedCreatedAt: options.createdAt ?? null,
			crawlStatus: options.crawlStatus ?? level.crawlStatus,
			level: {
				id: level.id,
				name: level.name,
				creator: level.creator,
				difficulty: level.difficulty,
				isPlatformer: level.isPlatformer,
				minProgress: level.minProgress ?? null,
				videoID: level.videoID ?? null
			},
			isPendingAddition: true
		};
	}

	function stageLevelOrderDraft(levelId: number, top: number, inputIndex: number) {
		if (!list || list.mode !== 'top' || !Number.isInteger(top) || top < 1) {
			return;
		}

		const { [levelId]: _removedDraft, ...remainingDrafts } = pendingLevelOrderDrafts;
		const currentPosition = getDisplayedLevelItems(list, levelDrafts, levelDeletionDraftIds, remainingDrafts)
			.findIndex((item) => item.levelId === levelId) + 1;

		if (currentPosition === top) {
			pendingLevelOrderDrafts = remainingDrafts;
			return;
		}

		pendingLevelOrderDrafts = {
			...remainingDrafts,
			[levelId]: {
				top,
				inputIndex
			}
		};
	}

	function clearLevelOrderDraft(levelId: number) {
		if (!pendingLevelOrderDrafts[levelId]) {
			return;
		}

		const { [levelId]: _removedDraft, ...remainingDrafts } = pendingLevelOrderDrafts;
		pendingLevelOrderDrafts = remainingDrafts;
	}

	// Sync form when list changes from SSR data
	$: if (list && !initialSyncDone) {
		initialSyncDone = true;
		syncForm();
	}
	$: hasUnsavedSettings = Boolean(
		list
		&& canEditSettings
		&& getSettingsSnapshotKey(getEditableSettingsSnapshot(editForm)) !== getSettingsSnapshotKey(getSavedSettingsSnapshot(list))
	);
	$: hasUnsavedLevelEdits = Boolean(
		canEditLevels
		&& (Object.keys(levelDrafts).length || levelDeletionDraftIds.length || pendingLevelAdditions.length || Object.keys(pendingLevelOrderDrafts).length)
	);
	$: hasUnsavedManageChanges = hasUnsavedSettings || hasUnsavedLevelEdits;
	$: if (list) {
		const availableLevelIds = new Set(getCombinedLevelItems(list).map((item) => item.levelId));
		const nextLevelDrafts = Object.fromEntries(
			Object.entries(levelDrafts).filter(([levelId]) => availableLevelIds.has(Number(levelId)))
		) as Record<number, LevelItemPatch>;
		const nextPendingLevelOrderDrafts = Object.fromEntries(
			Object.entries(pendingLevelOrderDrafts).filter(([levelId]) => availableLevelIds.has(Number(levelId)))
		) as Record<number, PendingLevelOrderDraft>;
		const nextLevelDeletionDraftIds = levelDeletionDraftIds.filter((levelId) => availableLevelIds.has(levelId));

		if (Object.keys(nextLevelDrafts).length !== Object.keys(levelDrafts).length) {
			levelDrafts = nextLevelDrafts;
		}

		if (Object.keys(nextPendingLevelOrderDrafts).length !== Object.keys(pendingLevelOrderDrafts).length) {
			pendingLevelOrderDrafts = nextPendingLevelOrderDrafts;
		}

		if (nextLevelDeletionDraftIds.length !== levelDeletionDraftIds.length) {
			levelDeletionDraftIds = nextLevelDeletionDraftIds;
		}
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
	$: if ($user.checked && !$user.loggedIn) {
		hasResolvedManageAccess = true;
	}

	onMount(() => {
		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			if (!addingLevel && !hasUnsavedManageChanges) {
				return;
			}

			event.preventDefault();
			event.returnValue = addingLevel
				? $_('custom_lists.detail.add_level.csv_close_warning')
				: $_('custom_lists.manage.unsaved_manage_changes_close_warning');
			return event.returnValue;
		};

		window.addEventListener('beforeunload', handleBeforeUnload);

		return () => {
			window.removeEventListener('beforeunload', handleBeforeUnload);
		};
	});

	let authFetchKey = '';
	async function refetchWithAuth(force: boolean = false) {
		const key = `${$page.params.id}:${$user.data?.uid}`;
		if (!force && key === authFetchKey) return;
		authFetchKey = key;
		const recoveringPrivateList = requiresAuthRecovery;

		if (recoveringPrivateList) {
			authRecoveryLoading = true;
		}

		try {
			const res = await fetch(buildListRequestUrl(), {
				headers: { Authorization: `Bearer ${await $user.token()}` }
			});
			const payload = await res.json().catch(() => null);
			if (res.ok && payload) {
				list = payload as CustomList;
				loadingError = '';
				syncForm();
				hasResolvedManageAccess = true;
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

	let pendingSubmissionsFetchAbortController: AbortController | null = null;

	async function loadPendingSubmissions(force: boolean = false) {
		if (!list || !canReviewSubmissions || !$user.checked || !$user.loggedIn) {
			pendingSubmissions = [];
			pendingSubmissionsError = '';
			pendingSubmissionsLoading = false;
			pendingSubmissionsRequestKey = '';
			pendingSubmissionsFetchAbortController?.abort();
			pendingSubmissionsFetchAbortController = null;
			return;
		}

		const key = `${list.id}:${$user.data?.uid || ''}`;
		if (!force && key === pendingSubmissionsRequestKey) {
			return;
		}

		pendingSubmissionsRequestKey = key;
		pendingSubmissionsError = '';
		pendingSubmissionsLoading = true;
		pendingSubmissionsFetchAbortController?.abort();
		pendingSubmissionsFetchAbortController = new AbortController();

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${list.id}/submissions`, {
				signal: pendingSubmissionsFetchAbortController.signal,
				headers: {
					Authorization: `Bearer ${await $user.token()}`
				}
			});
			const payload = await res.json().catch(() => null);

			if (!res.ok) {
				throw new Error(payload?.error || $_('custom_lists.toast.failed_update_level'));
			}

			pendingSubmissions = Array.isArray(payload) ? payload : [];
		} catch (error) {
			pendingSubmissions = [];
			pendingSubmissionsError = error instanceof Error ? error.message : $_('custom_lists.toast.failed_update_level');
		} finally {
			pendingSubmissionsLoading = false;
			pendingSubmissionsFetchAbortController = null;
		}
	}

	function updateItemSort(nextItemSort: 'mode_default' | 'created_at') {
		if (!list) return;
		editForm.itemSort = nextItemSort;
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
			if (!res.ok) throw new Error(payload.error || $_('custom_lists.toast.failed_invite_collaborator'));
			list = payload;
			syncForm();
			toast.success($_('custom_lists.toast.invitation_sent'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_invite_collaborator'));
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

	async function revokePendingInvitation(invitation: CustomListInvitation) {
		if (!list || !canManageMembers) return;

		savingCollaboration = true;

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${list.id}/invitations/${invitation.uid}`, {
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${await $user.token()}`
				}
			});
			const payload = await res.json().catch(() => null);
			if (!res.ok) throw new Error(payload?.error || $_('custom_lists.toast.failed_revoke_invitation'));
			list = payload;
			syncForm();
			toast.success($_('custom_lists.toast.invitation_revoked'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_revoke_invitation'));
		} finally {
			savingCollaboration = false;
		}
	}

	function isTabAllowed(tab: ManageTab) {
		if (tab === 'levels') return true;
		if (tab === 'submissions') return canReviewSubmissions;
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

	function setRecordFilterPlatform(platform: 'any' | 'pc' | 'mobile') {
		editForm = {
			...editForm,
			recordFilterPlatform: platform
		};
	}

	function setRecordFilterManualAcceptanceOnly(value: boolean) {
		editForm = {
			...editForm,
			recordFilterManualAcceptanceOnly: value
		};
	}

	function updateRecordFilterRefreshRate(
		field: 'recordFilterMinRefreshRate' | 'recordFilterMaxRefreshRate',
		event: Event
	) {
		const target = event.currentTarget;

		if (!(target instanceof HTMLInputElement)) {
			return;
		}

		const nextValue = target.value.trim();

		editForm = {
			...editForm,
			[field]: nextValue.length ? Number.parseInt(nextValue, 10) : null
		};
	}

	function formatRecordFilterPlatformOption(platform: 'any' | 'pc' | 'mobile') {
		if (platform === 'pc') return $_('custom_lists.manage.record_filter.platform_pc');
		if (platform === 'mobile') return $_('custom_lists.manage.record_filter.platform_mobile');
		return $_('custom_lists.manage.record_filter.platform_any');
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
	function buildSettingsMutationPayload() {
		return {
			title: editForm.title,
			description: editForm.description,
			backgroundColor: editForm.backgroundColor,
			bannerUrl: editForm.bannerUrl,
			borderColor: editForm.borderColor,
			communityEnabled: editForm.communityEnabled,
			levelSubmissionEnabled: editForm.levelSubmissionEnabled,
			faviconUrl: editForm.faviconUrl,
			isPlatformer: editForm.isPlatformer,
			logoUrl: editForm.logoUrl,
			topEnabled: editForm.topEnabled,
			itemSort: editForm.itemSort,
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
			weightFormula: editForm.weightFormula,
			recordFilterPlatform: editForm.recordFilterPlatform,
			recordFilterMinRefreshRate: editForm.recordFilterMinRefreshRate,
			recordFilterMaxRefreshRate: editForm.recordFilterMaxRefreshRate,
			recordFilterManualAcceptanceOnly: editForm.recordFilterManualAcceptanceOnly
		};
	}

	async function refreshLeaderboardPrecalc(options: { reloadList?: boolean } = {}) {
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
				await refetchWithAuth(true);
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

	function viewPendingLevelChanges() {
		if (!pendingManageAuditEntries.length) {
			return;
		}

		showPendingLevelChangesDialog = true;
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
		return Number.isFinite(levelInput.rating)
			|| Number.isInteger(levelInput.minProgress)
			|| (typeof levelInput.videoId === 'string' && levelInput.videoId.length > 0)
			|| (typeof levelInput.createdAt === 'string' && levelInput.createdAt.length > 0);
	}

	function hasBatchLevelTopOverride(levelInput: BatchAddLevelInput) {
		return Number.isInteger(levelInput.top);
	}

	function buildBatchUpdateLevelPatch(levelInput: BatchAddLevelInput) {
		const patch: { rating?: number; minProgress?: number; videoID?: string | null; createdAt?: string } = {};

		if (Number.isFinite(levelInput.rating)) {
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

	async function requestCrawlLevel(levelId: number, signal?: AbortSignal) {
		const res = await fetch(`${import.meta.env.VITE_API_URL}/levels/${levelId}/crawl`, {
			method: 'POST',
			signal,
			headers: {
				Authorization: `Bearer ${await $user.token()}`,
				'Content-Type': 'application/json'
			}
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
			payload: payload as PreparedCustomListLevel & { crawlStatus?: 'crawled' | 'skipped' }
		};
	}

	async function requestBatchCrawlLevels(levelIds: number[], signal?: AbortSignal) {
		const query = new URLSearchParams({ ids: levelIds.join(',') });
		const res = await fetch(`${import.meta.env.VITE_API_URL}/levels/crawl?${query.toString()}`, {
			method: 'POST',
			signal,
			headers: {
				Authorization: `Bearer ${await $user.token()}`,
				'Content-Type': 'application/json'
			}
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
			payload: payload as BatchCrawlLevelsResponse
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

	async function requestRemoveLevel(listId: number, levelId: number, signal?: AbortSignal) {
		const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${listId}/levels/${levelId}`, {
			method: 'DELETE',
			signal,
			headers: {
				Authorization: `Bearer ${await $user.token()}`
			}
		});
		const payload = await res.json().catch(() => null);

		if (!res.ok) {
			return {
				ok: false as const,
				status: res.status,
				error: payload?.error || $_('custom_lists.toast.failed_remove_level')
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
		if (getCombinedLevelItems().some((item) => item.levelId === levelId)) {
			toast.error($_('custom_lists.toast.level_already_in_list'));
			return false;
		}

		batchAddProgress = null;
		batchAddAbortController = null;
		addingLevel = true;
		try {
			const result = await requestCrawlLevel(levelId);
			if (!result.ok) throw new Error(result.error);

			if (Boolean(result.payload.isPlatformer) !== Boolean(list.isPlatformer)) {
				throw new Error($_('custom_lists.toast.level_type_mismatch'));
			}

			pendingLevelAdditions = [...pendingLevelAdditions, buildPendingLevelAddition(result.payload)];
			toast.success($_('custom_lists.toast.level_staged'));
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
		const existingLevelIds = new Set(list.items.map((item) => item.levelId));
		const pendingLevelIds = new Set(pendingLevelAdditions.map((item) => item.levelId));
		const processedLevelIds = new Set<number>();
		const actionableLevelInputs: Array<BatchAddLevelInput & { inputIndex: number }> = [];
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
			actionableLevelInputs.push({
				...levelInput,
				inputIndex
			});
		}

		if (!actionableLevelInputs.length) {
			return {
				added,
				updated,
				skipped,
				failed,
				aborted: false
			};
		}

		const newLevelInputs = actionableLevelInputs.filter((levelInput) => !existingLevelIds.has(levelInput.levelId) && !pendingLevelIds.has(levelInput.levelId));
		const totalSteps = actionableLevelInputs.length;
		batchAddProgress = createBatchAddProgress(totalSteps, skipped);

		try {
			const crawledLevelsById = new Map<number, BatchCrawlLevelResult>();

			if (newLevelInputs.length) {
				const crawlResult = await requestBatchCrawlLevels(
					newLevelInputs.map((levelInput) => levelInput.levelId),
					importSignal
				);

				if (!crawlResult.ok) {
					throw new Error(crawlResult.error);
				}

				for (const result of crawlResult.payload.results) {
					crawledLevelsById.set(result.id, result);
				}
			}

			for (const levelInput of actionableLevelInputs) {
				throwIfBatchAddAborted(importSignal);

				let stagedChange = false;
				let stagedAddition = false;
				const hasSavedListItem = existingLevelIds.has(levelInput.levelId);
				const hasPendingListItem = pendingLevelIds.has(levelInput.levelId);

				if (!hasSavedListItem && !hasPendingListItem) {
					const crawlResult = crawledLevelsById.get(levelInput.levelId);

					if (!crawlResult?.level || crawlResult.status === 'not_found') {
						failed.push({
							levelId: levelInput.levelId,
							message: crawlResult?.error || $_('custom_lists.toast.failed_add_level')
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

					if (Boolean(crawlResult.level.isPlatformer) !== Boolean(list.isPlatformer)) {
						failed.push({
							levelId: levelInput.levelId,
							message: $_('custom_lists.toast.level_type_mismatch')
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

					pendingLevelAdditions = [
						...pendingLevelAdditions,
						buildPendingLevelAddition(crawlResult.level, {
							createdAt: levelInput.createdAt,
							crawlStatus: crawlResult.status === 'skipped' ? 'skipped' : 'crawled'
						})
					];
					pendingLevelIds.add(levelInput.levelId);
					added += 1;
					stagedAddition = true;
				}

				if (pendingLevelIds.has(levelInput.levelId) && typeof levelInput.createdAt === 'string' && levelInput.createdAt.length) {
					const previousPendingSignature = JSON.stringify(
						pendingLevelAdditions.find((item) => item.levelId === levelInput.levelId) ?? null
					);

					pendingLevelAdditions = pendingLevelAdditions.map((item) => item.levelId === levelInput.levelId
						? {
							...item,
							created_at: levelInput.createdAt!,
							stagedCreatedAt: levelInput.createdAt!
						}
						: item);

					const nextPendingSignature = JSON.stringify(
						pendingLevelAdditions.find((item) => item.levelId === levelInput.levelId) ?? null
					);

					if (previousPendingSignature !== nextPendingSignature) {
						stagedChange = true;
					}
				}

				const nextPatch: Partial<LevelItemPatch> = {};

				if (Number.isFinite(levelInput.rating)) {
					nextPatch.rating = levelInput.rating;
				}

				if (Number.isInteger(levelInput.minProgress)) {
					nextPatch.minProgress = levelInput.minProgress;
				}

				if (typeof levelInput.videoId === 'string' && levelInput.videoId.length) {
					nextPatch.videoID = levelInput.videoId;
				}

				if (hasSavedListItem && typeof levelInput.createdAt === 'string' && levelInput.createdAt.length) {
					nextPatch.createdAt = levelInput.createdAt;
				}

				if (Object.keys(nextPatch).length) {
					const previousDraftSignature = JSON.stringify(levelDrafts[levelInput.levelId] ?? null);
					stageLevelDraft(levelInput.levelId, nextPatch);
					const nextDraftSignature = JSON.stringify(levelDrafts[levelInput.levelId] ?? null);

					if (previousDraftSignature !== nextDraftSignature) {
						stagedChange = true;
					}
				}

				if (list.mode === 'top' && Number.isInteger(levelInput.top)) {
					const nextTop = levelInput.top as number;
					const previousOrderDraftSignature = JSON.stringify(pendingLevelOrderDrafts[levelInput.levelId] ?? null);
					stageLevelOrderDraft(levelInput.levelId, nextTop, levelInput.inputIndex);
					const nextOrderDraftSignature = JSON.stringify(pendingLevelOrderDrafts[levelInput.levelId] ?? null);

					if (previousOrderDraftSignature !== nextOrderDraftSignature) {
						stagedChange = true;
					}
				}

				if (!stagedAddition && !stagedChange) {
					skipped += 1;
				}

				if (stagedChange) {
					updated += 1;
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

			updateBatchAddProgress({
				completed: totalSteps,
				added,
				updated,
				skipped,
				failed: failed.length,
				phase: 'adding',
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

	function getLevelItem(levelId: number) {
		return getCombinedLevelItems().find((item) => item.levelId === levelId) ?? null;
	}

	function getLevelItemPosition(currentList: CustomList, item: CustomListItem) {
		const itemIndex = currentList.items.findIndex((candidate) => candidate.levelId === item.levelId);

		if (item.position == null) {
			return itemIndex + 1;
		}

		return Number(item.position);
	}

	function getLevelAuditState(currentList: CustomList, item: CustomListItem): PendingLevelAuditState {
		return {
			rating: item.rating ?? 5,
			minProgress: item.minProgress ?? null,
			videoID: item.videoID ?? null,
			createdAt: item.created_at ?? null,
			position: getLevelItemPosition(currentList, item)
		};
	}

	function getPendingLevelAuditDisplayName(item: CustomListItem | null, levelId: number) {
		const name = item?.level?.name?.trim();
		return name?.length ? name : `Level #${levelId}`;
	}

	function formatPendingLevelAuditTime(ms: number) {
		const minutes = Math.floor(ms / 60000);
		const seconds = Math.floor((ms % 60000) / 1000);
		const milliseconds = ms % 1000;
		return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
	}

	function normalizePendingManageAuditValue(value: unknown): unknown {
		if (value == null) {
			return null;
		}

		if (Array.isArray(value)) {
			return value.map((entry) => normalizePendingManageAuditValue(entry));
		}

		if (typeof value === 'object') {
			return Object.fromEntries(
				Object.entries(value as Record<string, unknown>)
					.sort(([left], [right]) => left.localeCompare(right))
					.map(([key, entryValue]) => [key, normalizePendingManageAuditValue(entryValue)])
			);
		}

		return value;
	}

	function arePendingManageAuditValuesEqual(left: unknown, right: unknown) {
		return JSON.stringify(normalizePendingManageAuditValue(left)) === JSON.stringify(normalizePendingManageAuditValue(right));
	}

	function getPendingManageAuditFieldLabel(field: PendingManageAuditField) {
		if (field === 'rating') return $_('custom_lists.detail.levels.rating_label');
		if (field === 'minProgress') return $_('custom_lists.detail.levels.min_progress_label');
		if (field === 'videoID') return $_('custom_lists.detail.levels.video_id_label');
		if (field === 'position') return $_('custom_lists.formula.position_label');
		if (field === 'title') return $_('custom_lists.detail.edit.title_label');
		if (field === 'description') return $_('custom_lists.detail.edit.description_label');
		if (field === 'backgroundColor') return $_('custom_lists.detail.edit.background_color_label');
		if (field === 'bannerUrl') return $_('custom_lists.detail.edit.banner_url_label');
		if (field === 'borderColor') return $_('custom_lists.detail.edit.border_color_label');
		if (field === 'communityEnabled') return $_('custom_lists.detail.edit.community_label');
		if (field === 'faviconUrl') return $_('custom_lists.detail.edit.favicon_url_label');
		if (field === 'isPlatformer') return $_('custom_lists.detail.edit.type_label');
		if (field === 'levelSubmissionEnabled') return $_('custom_lists.detail.edit.level_submission_label');
		if (field === 'logoUrl') return $_('custom_lists.detail.edit.logo_url_label');
		if (field === 'mode') return $_('custom_lists.detail.edit.mode_label');
		if (field === 'rankBadges') return $_('custom_lists.detail.edit.rank_badges_label');
		if (field === 'recordFilterPlatform') return $_('custom_lists.manage.record_filter.platform_label');
		if (field === 'recordFilterMinRefreshRate') return $_('custom_lists.manage.record_filter.min_refresh_rate_label');
		if (field === 'recordFilterMaxRefreshRate') return $_('custom_lists.manage.record_filter.max_refresh_rate_label');
		if (field === 'recordFilterManualAcceptanceOnly') return $_('custom_lists.manage.record_filter.acceptance_label');
		if (field === 'tags') return $_('custom_lists.detail.edit.tags_label');
		if (field === 'topEnabled') return $_('custom_lists.detail.edit.top_enabled_label');
		if (field === 'visibility') return $_('custom_lists.detail.edit.visibility_label');
		if (field === 'weightFormula') return $_('custom_lists.formula.label');
		if (field === 'itemSort') return $_('custom_lists.detail.edit.item_sort_label');
		return field;
	}

	function formatPendingManageAuditValue(field: PendingManageAuditField, value: unknown) {
		if (value == null || value === '') {
			return '-';
		}

		if (field === 'minProgress' && typeof value === 'number') {
			return list?.isPlatformer ? `${formatPendingLevelAuditTime(value)} Base` : `${value}% Min`;
		}

		if (field === 'position' && typeof value === 'number') {
			return `#${value}`;
		}

		if (field === 'visibility' && typeof value === 'string') {
			if (value === 'public') return $_('custom_lists.visibility.public');
			if (value === 'unlisted') return $_('custom_lists.visibility.unlisted');
			return $_('custom_lists.visibility.private');
		}

		if (field === 'mode' && typeof value === 'string') {
			return value === 'rating'
				? $_('custom_lists.detail.edit.mode_rating')
				: $_('custom_lists.detail.edit.mode_top');
		}

		if (field === 'itemSort' && typeof value === 'string') {
			return value === 'created_at'
				? $_('custom_lists.detail.edit.item_sort_created_at')
				: $_('custom_lists.detail.edit.item_sort_mode_default');
		}

		if (field === 'recordFilterPlatform' && typeof value === 'string') {
			if (value === 'pc') return $_('custom_lists.manage.record_filter.platform_pc');
			if (value === 'mobile') return $_('custom_lists.manage.record_filter.platform_mobile');
			return $_('custom_lists.manage.record_filter.platform_any');
		}

		if ((field === 'recordFilterMinRefreshRate' || field === 'recordFilterMaxRefreshRate') && typeof value === 'number') {
			return `${value} FPS`;
		}

		if (field === 'isPlatformer' && typeof value === 'boolean') {
			return value ? $_('custom_lists.type.platformer') : $_('custom_lists.type.classic');
		}

		if (
			(field === 'communityEnabled' || field === 'topEnabled' || field === 'levelSubmissionEnabled')
			&& typeof value === 'boolean'
		) {
			return value ? $_('general.yes') : $_('general.no');
		}

		if (field === 'recordFilterManualAcceptanceOnly' && typeof value === 'boolean') {
			return value
				? $_('custom_lists.manage.record_filter.acceptance_manual_only')
				: $_('custom_lists.manage.record_filter.acceptance_manual_or_auto');
		}

		if (field === 'tags' && Array.isArray(value)) {
			return value.length ? value.join(', ') : '-';
		}

		if (typeof value === 'object') {
			return JSON.stringify(value);
		}

		return String(value);
	}

	function buildPendingLevelAuditEntries(
		currentList: CustomList | null,
		pendingAdditions: PendingLevelAddition[],
		drafts: Record<number, LevelItemPatch>,
		deletionDraftIds: number[]
	): PendingLevelAuditEntry[] {
		if (!currentList) {
			return [];
		}

		const entries: PendingLevelAuditEntry[] = [];
		const deletionDraftSet = new Set(deletionDraftIds);
		const displayedItems = getDisplayedLevelItems(currentList, drafts, deletionDraftIds);
		const displayedPositionByLevelId = new Map(
			displayedItems.map((item, index) => [item.levelId, index + 1])
		);

		for (const item of pendingAdditions) {
			const draft = drafts[item.levelId];
			const nextState: PendingLevelAuditState = {
				rating: draft?.rating ?? item.rating ?? 5,
				minProgress: hasDraftValue(draft, 'minProgress') ? draft?.minProgress ?? null : item.minProgress ?? null,
				videoID: hasDraftValue(draft, 'videoID') ? draft?.videoID ?? null : item.videoID ?? null,
				createdAt: hasDraftValue(draft, 'createdAt') ? draft?.createdAt ?? null : item.stagedCreatedAt ?? item.created_at ?? null,
				position: displayedPositionByLevelId.get(item.levelId) ?? displayedItems.length + 1
			};

			entries.push({
				action: 'level_added',
				levelId: item.levelId,
				levelItemId: item.id,
				levelName: getPendingLevelAuditDisplayName(item, item.levelId),
				creator: item.level?.creator ?? null,
				fields: [],
				metadata: {
					levelId: item.levelId,
					levelItemId: item.id,
					levelName: item.level?.name ?? null,
					creator: item.level?.creator ?? null,
					nextState
				}
			});
		}

		for (const levelId of deletionDraftIds) {
			const item = currentList.items.find((candidate) => candidate.levelId === levelId);
			if (!item) {
				continue;
			}

			const previousState = getLevelAuditState(currentList, item);

			entries.push({
				action: 'level_removed',
				levelId,
				levelItemId: item.id,
				levelName: getPendingLevelAuditDisplayName(item, levelId),
				creator: item.level?.creator ?? null,
				fields: [],
				metadata: {
					levelId,
					levelItemId: item.id,
					levelName: item.level?.name ?? null,
					creator: item.level?.creator ?? null,
					position: previousState.position,
					previousState
				}
			});
		}

		for (const item of currentList.items) {
			if (deletionDraftSet.has(item.levelId)) {
				continue;
			}

			const patch = drafts[item.levelId];
			const orderDraft = pendingLevelOrderDrafts[item.levelId];
			if (!patch && !orderDraft) {
				continue;
			}

			const previousState = getLevelAuditState(currentList, item);
			const nextState: PendingLevelAuditState = {
				...previousState,
				...(patch?.rating !== undefined ? { rating: patch.rating } : {}),
				...(Object.prototype.hasOwnProperty.call(patch ?? {}, 'minProgress') ? { minProgress: patch?.minProgress ?? null } : {}),
				...(Object.prototype.hasOwnProperty.call(patch ?? {}, 'videoID') ? { videoID: patch?.videoID ?? null } : {}),
				...(Object.prototype.hasOwnProperty.call(patch ?? {}, 'createdAt') ? { createdAt: patch?.createdAt ?? null } : {}),
				...(orderDraft ? { position: orderDraft.top } : {})
			};
			const fields = [
				...LEVEL_AUDIT_MUTABLE_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(patch ?? {}, field)),
				...(orderDraft && previousState.position !== orderDraft.top ? ['position' as const] : [])
			];

			if (!fields.length) {
				continue;
			}

			const changes = Object.fromEntries(
				fields.map((field) => [field, { old: previousState[field], new: nextState[field] } satisfies PendingLevelAuditChange])
			);

			entries.push({
				action: 'level_updated',
				levelId: item.levelId,
				levelItemId: item.id,
				levelName: getPendingLevelAuditDisplayName(item, item.levelId),
				creator: item.level?.creator ?? null,
				fields,
				metadata: {
					levelId: item.levelId,
					levelItemId: item.id,
					levelName: item.level?.name ?? null,
					creator: item.level?.creator ?? null,
					fields,
					changes,
					previousState,
					nextState
				}
			});
		}

		return entries;
	}

	function buildPendingSettingsAuditEntry(
		currentList: CustomList | null,
		currentForm: typeof editForm
	): PendingManageAuditEntry | null {
		if (!currentList) {
			return null;
		}

		const previousState = getSavedSettingsSnapshot(currentList);

		if (!previousState) {
			return null;
		}

		const nextState: PendingSettingsAuditState = getEditableSettingsSnapshot(currentForm);
		const fields = (Object.keys(nextState) as Array<keyof PendingSettingsAuditState>)
			.filter((field) => !arePendingManageAuditValuesEqual(previousState[field], nextState[field]));

		if (!fields.length) {
			return null;
		}

		const changes = Object.fromEntries(
			fields.map((field) => [field, {
				old: normalizePendingManageAuditValue(previousState[field]),
				new: normalizePendingManageAuditValue(nextState[field])
			} satisfies PendingLevelAuditChange])
		);

		return {
			action: 'list_updated',
			label: nextState.title.trim().length ? nextState.title : currentList.title,
			fields,
			metadata: {
				listId: currentList.id,
				fields,
				changes,
				previousState: normalizePendingManageAuditValue(previousState),
				nextState: normalizePendingManageAuditValue(nextState)
			}
		};
	}

	function buildPendingManageAuditEntries(
		settingsEntry: PendingManageAuditEntry | null,
		levelEntries: PendingLevelAuditEntry[]
	): PendingManageAuditEntry[] {
		return [
			...(settingsEntry ? [settingsEntry] : []),
			...levelEntries.map((entry) => ({
				action: entry.action,
				label: entry.levelName,
				identifier: entry.levelId,
				creator: entry.creator,
				fields: entry.fields,
				metadata: entry.metadata
			}))
		];
	}

	function getPendingLevelAuditEntryActionLabel(entry: PendingManageAuditEntry) {
		if (entry.action === 'list_updated') {
			return $_('custom_lists.manage.audit.list_updated');
		}

		if (entry.action === 'level_added') {
			return $_('custom_lists.manage.unsaved_level_edits_dialog_action_added');
		}

		return entry.action === 'level_removed'
			? $_('custom_lists.manage.unsaved_level_edits_dialog_action_removed')
			: $_('custom_lists.manage.unsaved_level_edits_dialog_action_updated');
	}

	function getPendingLevelAuditEntryDetail(entry: PendingManageAuditEntry) {
		if (entry.action === 'list_updated') {
			return entry.fields
				.map((field) => `${getPendingManageAuditFieldLabel(field)}: ${formatPendingManageAuditValue(field, entry.metadata.changes?.[field]?.old)} -> ${formatPendingManageAuditValue(field, entry.metadata.changes?.[field]?.new)}`)
				.join('; ');
		}

		if (entry.action === 'level_added') {
			const position = entry.metadata.nextState?.position;

			if (list?.mode === 'top' && typeof position === 'number') {
				return $_('custom_lists.manage.unsaved_level_edits_dialog_added_summary_with_position', {
					values: {
						position: formatPendingManageAuditValue('position', position)
					}
				});
			}

			return $_('custom_lists.manage.unsaved_level_edits_dialog_added_summary');
		}

		if (entry.action === 'level_removed') {
			return $_('custom_lists.manage.unsaved_level_edits_dialog_removed_summary', {
				values: {
					position: formatPendingManageAuditValue('position', entry.metadata.position)
				}
			});
		}

		return entry.fields
			.map((field) => `${getPendingManageAuditFieldLabel(field)}: ${formatPendingManageAuditValue(field, entry.metadata.changes?.[field]?.old)} -> ${formatPendingManageAuditValue(field, entry.metadata.changes?.[field]?.new)}`)
			.join('; ');
	}

	function getPendingLevelRemovalPreviewRows(entry: PendingManageAuditEntry) {
		return [
			{ field: 'position' as const, value: entry.metadata.previousState?.position },
			{ field: 'rating' as const, value: entry.metadata.previousState?.rating },
			{ field: 'minProgress' as const, value: entry.metadata.previousState?.minProgress },
			{ field: 'videoID' as const, value: entry.metadata.previousState?.videoID },
			{ field: 'createdAt' as const, value: entry.metadata.previousState?.createdAt }
		];
	}

	function getPendingLevelAdditionPreviewRows(entry: PendingManageAuditEntry) {
		return [
			{ field: 'position' as const, value: entry.metadata.nextState?.position },
			{ field: 'rating' as const, value: entry.metadata.nextState?.rating },
			{ field: 'minProgress' as const, value: entry.metadata.nextState?.minProgress },
			{ field: 'videoID' as const, value: entry.metadata.nextState?.videoID },
			{ field: 'createdAt' as const, value: entry.metadata.nextState?.createdAt }
		];
	}

	function getNormalizedLevelPatch(
		levelId: number,
		patch: Partial<LevelItemPatch>,
		drafts: Record<number, LevelItemPatch> = levelDrafts
	) {
		const item = getLevelItem(levelId);
		if (!item) return null;

		const mergedPatch = {
			...(drafts[levelId] ?? {}),
			...patch
		};
		const normalizedPatch: LevelItemPatch = {};
		const nextRating = mergedPatch.rating ?? item.rating ?? 5;
		const hasMinProgress = Object.prototype.hasOwnProperty.call(mergedPatch, 'minProgress');
		const nextMinProgress = hasMinProgress ? mergedPatch.minProgress ?? null : item.minProgress;
		const hasVideoId = Object.prototype.hasOwnProperty.call(mergedPatch, 'videoID');
		const nextVideoId = hasVideoId ? mergedPatch.videoID ?? null : item.videoID;
		const hasCreatedAt = Object.prototype.hasOwnProperty.call(mergedPatch, 'createdAt');
		const nextCreatedAt = hasCreatedAt ? mergedPatch.createdAt ?? item.created_at : item.created_at;

		if (nextRating !== (item.rating ?? 5)) {
			normalizedPatch.rating = nextRating;
		}

		if ((nextMinProgress ?? null) !== (item.minProgress ?? null)) {
			normalizedPatch.minProgress = nextMinProgress ?? null;
		}

		if ((nextVideoId ?? null) !== (item.videoID ?? null)) {
			normalizedPatch.videoID = nextVideoId ?? null;
		}

		if ((nextCreatedAt ?? null) !== (item.created_at ?? null) && typeof nextCreatedAt === 'string') {
			normalizedPatch.createdAt = nextCreatedAt;
		}

		return Object.keys(normalizedPatch).length ? normalizedPatch : null;
	}

	function stageLevelDraft(levelId: number, patch: Partial<LevelItemPatch>) {
		if (!list || !canEditLevels) return;

		const nextPatch = getNormalizedLevelPatch(levelId, patch);
		if (!nextPatch) {
			const { [levelId]: _removedDraft, ...remainingDrafts } = levelDrafts;
			levelDrafts = remainingDrafts;
			return;
		}

		levelDrafts = {
			...levelDrafts,
			[levelId]: nextPatch
		};
	}

	function stageMultipleLevelDrafts(levelIds: number[], patch: Partial<LevelItemPatch>) {
		if (!list || !canEditLevels || !levelIds.length) return;

		const nextDrafts = { ...levelDrafts };

		for (const levelId of levelIds) {
			const nextPatch = getNormalizedLevelPatch(levelId, patch, nextDrafts);

			if (!nextPatch) {
				delete nextDrafts[levelId];
				continue;
			}

			nextDrafts[levelId] = nextPatch;
		}

		levelDrafts = nextDrafts;
	}

	function stageLevelDeletion(levelId: number) {
		if (!list || !canEditLevels || !getLevelItem(levelId)) return;

		if (pendingLevelAdditions.some((item) => item.levelId === levelId)) {
			pendingLevelAdditions = pendingLevelAdditions.filter((item) => item.levelId !== levelId);
			const { [levelId]: _removedOrderDraft, ...remainingOrderDrafts } = pendingLevelOrderDrafts;
			pendingLevelOrderDrafts = remainingOrderDrafts;
			const { [levelId]: _removedDraft, ...remainingDrafts } = levelDrafts;
			levelDrafts = remainingDrafts;
			return;
		}

		const { [levelId]: _removedOrderDraft, ...remainingOrderDrafts } = pendingLevelOrderDrafts;
		pendingLevelOrderDrafts = remainingOrderDrafts;
		const { [levelId]: _removedDraft, ...remainingDrafts } = levelDrafts;
		levelDrafts = remainingDrafts;

		if (!levelDeletionDraftIds.includes(levelId)) {
			levelDeletionDraftIds = [...levelDeletionDraftIds, levelId];
		}
	}

	function stageMultipleLevelDeletions(levelIds: number[]) {
		if (!list || !canEditLevels || !levelIds.length) return;

		const existingLevelIds = new Set(list.items.map((item) => item.levelId));
		const pendingLevelIds = new Set(pendingLevelAdditions.map((item) => item.levelId));
		const nextDeletionDraftIds = new Set(levelDeletionDraftIds);
		const nextDrafts = { ...levelDrafts };
		const nextOrderDrafts = { ...pendingLevelOrderDrafts };
		const nextPendingLevelAdditions = pendingLevelAdditions.filter((item) => !levelIds.includes(item.levelId));

		for (const levelId of levelIds) {
			if (pendingLevelIds.has(levelId)) {
				delete nextDrafts[levelId];
				delete nextOrderDrafts[levelId];
				continue;
			}

			if (!existingLevelIds.has(levelId)) continue;

			delete nextDrafts[levelId];
			delete nextOrderDrafts[levelId];
			nextDeletionDraftIds.add(levelId);
		}

		levelDrafts = nextDrafts;
		pendingLevelOrderDrafts = nextOrderDrafts;
		pendingLevelAdditions = nextPendingLevelAdditions;
		levelDeletionDraftIds = [...nextDeletionDraftIds];
	}

	function discardLevelDrafts() {
		levelDrafts = {};
		levelDeletionDraftIds = [];
		pendingLevelAdditions = [];
		pendingLevelOrderDrafts = {};
		showPendingLevelChangesDialog = false;
	}

	function discardStagedManageChanges() {
		if (hasUnsavedSettings) {
			syncForm();
		}

		discardLevelDrafts();
	}

	async function saveStagedManageChanges() {
		if (!list || !hasUnsavedManageChanges || savingLevelDrafts) return;
		if (hasUnsavedSettings && (!canEditSettings || !editForm.title.trim())) {
			toast.error($_('custom_lists.toast.title_required'));
			return;
		}
		if (hasUnsavedLevelEdits && !canEditLevels) return;

		const currentDrafts = { ...levelDrafts };
		const currentDeletionDraftIds = [...levelDeletionDraftIds];
		const currentPendingLevelAdditions = [...pendingLevelAdditions];
		const currentPendingOrderDrafts = { ...pendingLevelOrderDrafts };
		const currentHasUnsavedSettings = hasUnsavedSettings;
		const currentHasUnsavedLevelEdits = hasUnsavedLevelEdits;
		const settingsPayload = currentHasUnsavedSettings ? buildSettingsMutationPayload() : undefined;
		const savedSettingsSnapshot = list ? getSavedSettingsSnapshot(list) : null;
		const editableSettingsSnapshot = getEditableSettingsSnapshot(editForm);
		const leaderboardConfigChanged = Boolean(
			currentHasUnsavedSettings
			&& savedSettingsSnapshot
			&& (
				editableSettingsSnapshot.weightFormula !== savedSettingsSnapshot.weightFormula
				|| editableSettingsSnapshot.recordFilterPlatform !== savedSettingsSnapshot.recordFilterPlatform
				|| editableSettingsSnapshot.recordFilterMinRefreshRate !== savedSettingsSnapshot.recordFilterMinRefreshRate
				|| editableSettingsSnapshot.recordFilterMaxRefreshRate !== savedSettingsSnapshot.recordFilterMaxRefreshRate
				|| editableSettingsSnapshot.recordFilterManualAcceptanceOnly !== savedSettingsSnapshot.recordFilterManualAcceptanceOnly
			)
		);
		let nextList = list;
		const totalPendingLevelChanges = currentPendingLevelAdditions.length + currentDeletionDraftIds.length + Object.keys(currentDrafts).length + Object.keys(currentPendingOrderDrafts).length;

		if (!currentHasUnsavedSettings && !totalPendingLevelChanges) {
			return;
		}

		savingLevelDrafts = true;
		const savingToast = toast.loading($_('custom_lists.toast.saving_list'));

		try {
			const createInputs = currentPendingLevelAdditions.map((pendingItem) => {
				const draft = currentDrafts[pendingItem.levelId];
				const orderDraft = currentPendingOrderDrafts[pendingItem.levelId];
				const createInput: Record<string, unknown> = {
					levelId: pendingItem.levelId,
					createdAt: pendingItem.stagedCreatedAt ?? pendingItem.created_at ?? undefined,
					rating: draft?.rating ?? pendingItem.rating ?? 5,
					minProgress: Object.prototype.hasOwnProperty.call(draft ?? {}, 'minProgress')
						? draft?.minProgress ?? null
						: pendingItem.minProgress ?? null,
					videoID: Object.prototype.hasOwnProperty.call(draft ?? {}, 'videoID')
						? draft?.videoID ?? null
						: pendingItem.videoID ?? null
				};

				if (orderDraft) {
					createInput.top = orderDraft.top;
				}

				return createInput;
			});

			const updateInputs = Object.entries(currentDrafts)
				.filter(([levelId]) => !currentDeletionDraftIds.includes(Number(levelId)))
				.filter(([levelId]) => !currentPendingLevelAdditions.some((pendingItem) => pendingItem.levelId === Number(levelId)))
				.map(([levelId, patch]) => ({
					levelId: Number(levelId),
					...patch
				}));

			const batchPayload = {
				creates: createInputs,
				updates: updateInputs,
				deletes: currentDeletionDraftIds,
				auditEntries: pendingLevelAuditEntries.map((entry) => ({
					action: entry.action,
					actorUid: entry.metadata?.actorUid ?? null,
					targetUid: entry.metadata?.targetUid ?? null,
					metadata: entry.metadata
				}))
			};

			const reorderEntries = getPendingLevelOrderEntries(currentPendingOrderDrafts).filter((entry) => {
				return !currentDeletionDraftIds.includes(entry.levelId);
			});

			if (settingsPayload) {
				(batchPayload as Record<string, unknown>).settings = settingsPayload;
			}

			const savingTopMode = (settingsPayload?.mode ?? list.mode) === 'top';

			if (reorderEntries.length && savingTopMode) {
				(batchPayload as Record<string, unknown>).reorderLevelIds = getDisplayedLevelItems(
					list,
					currentDrafts,
					currentDeletionDraftIds,
					currentPendingOrderDrafts
				).map((item) => item.levelId);
			}

			savingLevelItemId = null;
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${list.id}/levels/batch`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(batchPayload)
			});
			const payload = await res.json().catch(() => null);

			if (!res.ok) {
				throw new Error(payload?.error || $_('custom_lists.toast.failed_update_level'));
			}

			nextList = normalizeMutationListPayload(payload);
			list = nextList;
			syncForm();
			pendingLevelAdditions = [];
			levelDrafts = {};
			levelDeletionDraftIds = [];
			pendingLevelOrderDrafts = {};
			toast.dismiss(savingToast);
			toast.success(currentHasUnsavedLevelEdits && !currentHasUnsavedSettings
				? $_('custom_lists.toast.levels_updated', {
					values: { count: totalPendingLevelChanges }
				})
				: $_('custom_lists.toast.list_updated'));

			if (leaderboardConfigChanged) {
				await refreshLeaderboardPrecalc({ reloadList: true });
			}
		} catch (error) {
			toast.dismiss(savingToast);
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_update_level'));
			pendingLevelAdditions = currentPendingLevelAdditions;
			levelDrafts = currentDrafts;
			levelDeletionDraftIds = currentDeletionDraftIds;
			pendingLevelOrderDrafts = currentPendingOrderDrafts;
		} finally {
			savingLevelItemId = null;
			savingLevelDrafts = false;
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
			list = normalizeMutationListPayload(payload);
			toast.success($_('custom_lists.toast.reordered'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_reorder'));
		} finally {
			savingReorder = false;
		}
	}

	async function reviewPendingSubmission(submission: CustomListSubmission, payload: {
		accept: boolean;
		rating?: number | null;
		minProgress?: number | null;
		position?: number | null;
	}) {
		if (!list || !canReviewSubmissions) return;

		savingSubmissionId = submission.id;

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${list.id}/submissions/${submission.levelId}`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			});
			const responsePayload = await res.json().catch(() => null);

			if (!res.ok) {
				throw new Error(responsePayload?.error || $_('custom_lists.toast.failed_update_level'));
			}

			list = normalizeMutationListPayload(responsePayload);
			syncForm();
			await loadPendingSubmissions(true);
			toast.success(payload.accept ? 'Submission approved' : 'Submission rejected');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_update_level'));
		} finally {
			savingSubmissionId = null;
		}
	}

	async function rejectPendingSubmission(submission: CustomListSubmission) {
		await reviewPendingSubmission(submission, { accept: false });
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
	$: canViewPendingInvitations = Boolean(list && permissions.canViewPendingInvitations);
	$: canRespondToInvitation = Boolean(list && permissions.canRespondToInvitation);
	$: canReviewSubmissions = Boolean(list && permissions.canReviewSubmissions);
	$: if (
		browser
		&& list
		&& $user.checked
		&& hasResolvedManageAccess
		&& !redirectingUnauthorizedManage
		&& list.currentUserRole === 'viewer'
	) {
		redirectingUnauthorizedManage = true;
		void goto(
			canRespondToInvitation
				? `/lists/${$page.params.id}/collaborator-invitation`
				: `/lists/${$page.params.id}`,
			{ replaceState: true }
		);
	}
	$: canShowCollaboration = Boolean(
		list
		&& (
			canViewMembers
			|| canViewAudit
			|| canManageMembers
			|| canConfigureCollaboration
			|| canTransferOwnership
			|| canViewPendingInvitations
		)
	);
	$: collaborationTabProps = {
		list,
		savingCollaboration,
		canConfigureCollaboration,
		canViewMembers,
		canManageMembers,
		canTransferOwnership,
		canViewAudit,
		canViewPendingInvitations,
		pendingInvitationCount: list?.pendingInvitations?.length ?? 0,
		updateCollaborationSettings,
		searchPlayersForCollaboration,
		addCollaborator,
		updateCollaboratorRole,
		transferOwnership,
		removeCollaborator,
		revokePendingInvitation,
		preferredSection: getInitialCollaborationSection(),
		getRoleLabel,
		formatDate,
		formatDateTime
	};
	$: pendingLevelAuditEntries = buildPendingLevelAuditEntries(list, pendingLevelAdditions, levelDrafts, levelDeletionDraftIds);
	$: pendingSettingsAuditEntry = buildPendingSettingsAuditEntry(list, editForm);
	$: pendingManageAuditEntries = buildPendingManageAuditEntries(pendingSettingsAuditEntry, pendingLevelAuditEntries);
	$: pendingSettingsAuditFieldCount = pendingSettingsAuditEntry?.fields.length ?? 0;
	$: pendingLevelAuditAddedCount = pendingLevelAuditEntries.filter((entry) => entry.action === 'level_added').length;
	$: pendingLevelAuditUpdatedCount = pendingLevelAuditEntries.filter((entry) => entry.action === 'level_updated').length;
	$: pendingLevelAuditRemovedCount = pendingLevelAuditEntries.filter((entry) => entry.action === 'level_removed').length;
	$: if (list && $user.checked && canReviewSubmissions) {
		const requestKey = `${list.id}:${$user.data?.uid || ''}`;

		if (pendingSubmissionsRequestKey !== requestKey && !pendingSubmissionsLoading) {
			void loadPendingSubmissions();
		}
	} else if (!canReviewSubmissions && pendingSubmissions.length) {
		pendingSubmissions = [];
		pendingSubmissionsError = '';
		pendingSubmissionsRequestKey = '';
		pendingSubmissionsLoading = false;
	}
	$: if (showPendingLevelChangesDialog && !pendingManageAuditEntries.length) {
		showPendingLevelChangesDialog = false;
	}
	$: levelsTabList = (() => {
		void pendingLevelAdditions;
		void levelDrafts;
		void levelDeletionDraftIds;
		void pendingLevelOrderDrafts;
		return getLevelsTabList(list);
	})();
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
		pendingSubmissionsFetchAbortController?.abort();
		clearCustomListBranding();
	});
</script>

<svelte:head>
	<title>{list ? `Quản lý danh sách - ${list.title} - Geometry Dash Việt Nam` : 'Danh sách - Geometry Dash Việt Nam'}</title>
</svelte:head>

<div class="page">
	<!-- Top Bar -->
	<header class="topBar">
		<div class="topBarLeft">
			<Button variant="ghost" size="sm" on:click={() => goto('/lists')}>
				<ArrowLeft class="mr-2 h-4 w-4" />
				{$_('custom_lists.back')}
			</Button>
			{#if list}
				<span class="topBarDivider" aria-hidden="true"></span>
				<span class="topBarLabel">{$_('custom_lists.manage.title') || 'Manage'}</span>
			{/if}
		</div>
		{#if list}
			<div class="topBarRight">
				<Button variant="outline" size="sm" on:click={() => goto(`/lists/${$page.params.id}`)}>
					<Eye class="mr-2 h-4 w-4" />
					{$_('custom_lists.actions.view')}
				</Button>
			</div>
		{/if}
	</header>

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
		<section class="hero" class:heroHasBanner={Boolean(getManageHeroBannerUrl())} style={heroStyle}>
			{#if getManageHeroBannerUrl()}
				<div class="heroBanner" style={heroBannerStyle}>
					<img src={getManageHeroBannerUrl()} alt="" loading="lazy" decoding="async" />
				</div>
			{/if}
			<div class="heroBody">
				<div class="heroHeader">
					<div class="heroTitleGroup">
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
							<span class="chip chipAccent">
								{$_('custom_lists.detail.levels_badge', { values: { count: list.items.length } })}
							</span>
							{#if list.currentUserRole && list.currentUserRole !== 'viewer'}
								<span class="chip chipRole">{getRoleLabel(list.currentUserRole)}</span>
							{/if}
						</div>
						<h1>{getManagePreviewTitle()}</h1>
						{#if getManagePreviewDescription()}
							<p class="heroDesc">{getManagePreviewDescription()}</p>
						{/if}
					</div>
					{#if canEditSettings}
						<div class="heroActions">
							<Button
								variant="outline"
								size="sm"
								on:click={handleRefreshLeaderboardClick}
								disabled={refreshingLeaderboard}
								title="Refresh leaderboard"
							>
								<RefreshCw class="mr-2 h-4 w-4 {refreshingLeaderboard ? 'animate-spin' : ''}" />
								{refreshingLeaderboard ? `${$_('general.loading')}...` : 'Refresh leaderboard'}
							</Button>
						</div>
					{/if}
				</div>

				{#if getManagePreviewTags().length}
					<div class="tagRow">
						{#each getManagePreviewTags() as tag}
							<Badge variant="outline">{tag}</Badge>
						{/each}
					</div>
				{/if}

				<div class="heroMeta">
					<span class="metaItem">
						<Clock class="h-3.5 w-3.5" />
						{$_('custom_lists.detail.updated', { values: { date: formatDate(list.updated_at) } })}
					</span>
					{#if list.lastRefreshedAt}
						<span class="metaItem">
							<RefreshCw class="h-3.5 w-3.5" />
							Leaderboard refreshed {formatDateTime(list.lastRefreshedAt)}
						</span>
					{/if}
				</div>
			</div>
		</section>

		{#if list.isBanned}
			<div class="toolCard moderationNotice">
				<div class="moderationIcon">
					<AlertTriangle class="h-5 w-5" />
				</div>
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
			</div>
		{/if}

		<Tabs.Root bind:value={activeTab}>
			<div class="tabRail">
				<Tabs.List class="tabBar">
					{#if canEditSettings}
						<Tabs.Trigger value="basic" class="manageTab">
							<Settings class="h-4 w-4" />
							<span>{$_('custom_lists.manage.tabs.basic')}</span>
						</Tabs.Trigger>
						<Tabs.Trigger value="appearance" class="manageTab">
							<Palette class="h-4 w-4" />
							<span>{$_('custom_lists.manage.tabs.appearance')}</span>
						</Tabs.Trigger>
						<Tabs.Trigger value="formula" class="manageTab">
							<Calculator class="h-4 w-4" />
							<span>{$_('custom_lists.manage.tabs.formula')}</span>
						</Tabs.Trigger>
						<Tabs.Trigger value="record-filter" class="manageTab">
							<Filter class="h-4 w-4" />
							<span>{$_('custom_lists.manage.tabs.record_filter')}</span>
						</Tabs.Trigger>
						<Tabs.Trigger value="rank" class="manageTab">
							<Award class="h-4 w-4" />
							<span>{$_('custom_lists.manage.tabs.rank')}</span>
						</Tabs.Trigger>
					{/if}
					<Tabs.Trigger value="levels" class="manageTab">
						<ListOrdered class="h-4 w-4" />
						<span>{$_('custom_lists.manage.tabs.levels')}</span>
					</Tabs.Trigger>
					{#if canReviewSubmissions}
						<Tabs.Trigger value="submissions" class="manageTab">
							<Inbox class="h-4 w-4" />
							<span>{$_('custom_lists.manage.tabs.submissions')}</span>
							{#if pendingSubmissions?.length}
								<span class="tabCount">{pendingSubmissions.length}</span>
							{/if}
						</Tabs.Trigger>
					{/if}
					{#if canShowCollaboration}
						<Tabs.Trigger value="collaboration" class="manageTab">
							<Users class="h-4 w-4" />
							<span>{$_('custom_lists.manage.tabs.collaboration')}</span>
						</Tabs.Trigger>
					{/if}
					{#if canBan || canDelete}
						<span class="tabSpacer" aria-hidden="true"></span>
						<Tabs.Trigger value="danger" class="manageTab dangerTabTrigger">
							<ShieldAlert class="h-4 w-4" />
							<span>{$_('custom_lists.manage.tabs.danger')}</span>
						</Tabs.Trigger>
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

				<Tabs.Content value="record-filter">
					<div class="recordFilterTabContent">
						<div class="toolCard">
							<h2 class="toolHeading">{$_('custom_lists.manage.record_filter.heading')}</h2>
							<div class="recordFilterFormGrid">
								<div class="recordFilterField">
									<span class="recordFilterFieldLabel">{$_('custom_lists.manage.record_filter.platform_label')}</span>
									<div class="recordFilterOptionRow">
										{#each RECORD_FILTER_PLATFORM_OPTIONS as platform}
											<button
												type="button"
												class="recordFilterOptionBtn"
												class:selected={editForm.recordFilterPlatform === platform}
												on:click={() => setRecordFilterPlatform(platform)}
											>
												{formatRecordFilterPlatformOption(platform)}
											</button>
										{/each}
									</div>
									<p class="hint">{$_('custom_lists.manage.record_filter.platform_hint')}</p>
								</div>

								<div class="recordFilterField">
									<span class="recordFilterFieldLabel">{$_('custom_lists.manage.record_filter.acceptance_label')}</span>
									<div class="recordFilterOptionRow">
										<button
											type="button"
											class="recordFilterOptionBtn"
											class:selected={editForm.recordFilterManualAcceptanceOnly}
											on:click={() => setRecordFilterManualAcceptanceOnly(true)}
										>
											{$_('custom_lists.manage.record_filter.acceptance_manual_only')}
										</button>
										<button
											type="button"
											class="recordFilterOptionBtn"
											class:selected={!editForm.recordFilterManualAcceptanceOnly}
											on:click={() => setRecordFilterManualAcceptanceOnly(false)}
										>
											{$_('custom_lists.manage.record_filter.acceptance_manual_or_auto')}
										</button>
									</div>
									<p class="hint">{$_('custom_lists.manage.record_filter.acceptance_hint')}</p>
								</div>

								<div class="recordFilterFieldGroup">
									<div class="recordFilterField">
										<label for="list-record-filter-min-refresh-rate">{$_('custom_lists.manage.record_filter.min_refresh_rate_label')}</label>
										<input
											id="list-record-filter-min-refresh-rate"
											type="number"
											inputmode="numeric"
											min="1"
											value={editForm.recordFilterMinRefreshRate ?? ''}
											on:input={(event) => updateRecordFilterRefreshRate('recordFilterMinRefreshRate', event)}
										/>
									</div>
									<div class="recordFilterField">
										<label for="list-record-filter-max-refresh-rate">{$_('custom_lists.manage.record_filter.max_refresh_rate_label')}</label>
										<input
											id="list-record-filter-max-refresh-rate"
											type="number"
											inputmode="numeric"
											min="1"
											value={editForm.recordFilterMaxRefreshRate ?? ''}
											on:input={(event) => updateRecordFilterRefreshRate('recordFilterMaxRefreshRate', event)}
										/>
									</div>
								</div>
								<p class="hint">{$_('custom_lists.manage.record_filter.refresh_rate_hint')}</p>
							</div>
						</div>
					</div>
				</Tabs.Content>

				<Tabs.Content value="rank">
					<RankTab bind:editForm />
				</Tabs.Content>
			{/if}

			{#if canShowCollaboration}
				<Tabs.Content value="collaboration">
					<CollaborationTab {...collaborationTabProps} />
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

			<Tabs.Content value="levels">
				<LevelsTab
					list={levelsTabList}
					{canEditLevels}
					{levelDrafts}
					{levelDeletionDraftIds}
					{addingLevel}
					{batchAddProgress}
					{abortBatchAddImport}
					{savingLevelItemId}
					{savingLevelDrafts}
					{savingReorder}
					{addLevel}
					{addLevels}
					{stageLevelDraft}
					{stageMultipleLevelDrafts}
					{stageLevelDeletion}
					{stageMultipleLevelDeletions}
					{reorderLevels}
				/>
			</Tabs.Content>

			{#if canReviewSubmissions}
				<Tabs.Content value="submissions">
					<SubmissionsTab
						{list}
						submissions={pendingSubmissions}
						{canReviewSubmissions}
						loading={pendingSubmissionsLoading}
						errorMessage={pendingSubmissionsError}
						savingSubmissionId={savingSubmissionId}
						reviewSubmission={reviewPendingSubmission}
						rejectSubmission={rejectPendingSubmission}
					/>
				</Tabs.Content>
			{/if}
		</Tabs.Root>

		<Dialog.Root bind:open={showPendingLevelChangesDialog}>
			<Dialog.Content class="max-w-[860px]">
				<div class="pendingChangesDialog">
				<Dialog.Header>
					<Dialog.Title>{$_('custom_lists.manage.unsaved_manage_changes_title')}</Dialog.Title>
				</Dialog.Header>

				<div class="pendingChangesSummary">
					{#if pendingSettingsAuditFieldCount}
						<Badge variant="secondary">{$_('custom_lists.manage.audit.list_updated')}</Badge>
					{/if}
					{#if pendingLevelAuditAddedCount}
						<Badge variant="secondary">
							{$_('custom_lists.manage.unsaved_level_edits_dialog_added_count', {
								values: { count: pendingLevelAuditAddedCount }
							})}
						</Badge>
					{/if}
					{#if pendingLevelAuditUpdatedCount}
						<Badge variant="secondary">
							{$_('custom_lists.manage.unsaved_level_edits_dialog_updated_count', {
								values: { count: pendingLevelAuditUpdatedCount }
							})}
						</Badge>
					{/if}
					{#if pendingLevelAuditRemovedCount}
						<Badge variant="destructive">
							{$_('custom_lists.manage.unsaved_level_edits_dialog_removed_count', {
								values: { count: pendingLevelAuditRemovedCount }
							})}
						</Badge>
					{/if}
				</div>

				{#if pendingManageAuditEntries.length}
					<div class="pendingChangesList">
						{#each pendingManageAuditEntries as entry}
							<section class="pendingChangeEntry">
								<div class="pendingChangeHeader">
									<div class="pendingChangeHeading">
										<div class="pendingChangeTitleRow">
											<Badge variant={entry.action === 'level_removed' ? 'destructive' : 'secondary'}>
												{getPendingLevelAuditEntryActionLabel(entry)}
											</Badge>
											<h3>{entry.label}</h3>
											{#if entry.identifier != null}
												<Badge variant="outline">#{entry.identifier}</Badge>
											{/if}
										</div>
										{#if entry.creator}
											<p class="hint">{$_('custom_lists.detail.levels.by')} {entry.creator}</p>
										{/if}
										<p class="pendingChangeDetail">{getPendingLevelAuditEntryDetail(entry)}</p>
									</div>
									<div class="pendingChangeAuditAction">
										<span class="pendingChangeMetaLabel">{$_('custom_lists.manage.unsaved_level_edits_dialog_audit_action_label')}</span>
										<code>{entry.action}</code>
									</div>
								</div>

								{#if entry.action === 'level_updated' || entry.action === 'list_updated'}
									<div class="pendingChangeFieldList">
										{#each entry.fields as field}
											<div class="pendingChangeFieldRow">
												<div class="pendingChangeFieldLabel">{getPendingManageAuditFieldLabel(field)}</div>
												<div class="pendingChangeFieldValues">
													<span class="pendingChangeFieldValue pendingChangeFieldValueOld">{formatPendingManageAuditValue(field, entry.metadata.changes?.[field]?.old)}</span>
													<span class="pendingChangeFieldArrow" aria-hidden="true">→</span>
													<span class="pendingChangeFieldValue pendingChangeFieldValueNew">{formatPendingManageAuditValue(field, entry.metadata.changes?.[field]?.new)}</span>
												</div>
											</div>
										{/each}
									</div>
								{:else if entry.action === 'level_added'}
									<div class="pendingChangeFieldList">
										{#each getPendingLevelAdditionPreviewRows(entry) as row}
											<div class="pendingChangeFieldRow">
												<div class="pendingChangeFieldLabel">{getPendingManageAuditFieldLabel(row.field)}</div>
												<div class="pendingChangeFieldValues pendingChangeFieldValuesSingle">
													<span class="pendingChangeFieldValue pendingChangeFieldValueNew">{formatPendingManageAuditValue(row.field, row.value)}</span>
												</div>
											</div>
										{/each}
									</div>
								{:else}
									<div class="pendingChangeFieldList">
										{#each getPendingLevelRemovalPreviewRows(entry) as row}
											<div class="pendingChangeFieldRow">
												<div class="pendingChangeFieldLabel">{getPendingManageAuditFieldLabel(row.field)}</div>
												<div class="pendingChangeFieldValues pendingChangeFieldValuesSingle">
													<span class="pendingChangeFieldValue">{formatPendingManageAuditValue(row.field, row.value)}</span>
												</div>
											</div>
										{/each}
									</div>
								{/if}

								<details class="pendingChangePayload">
									<summary>{$_('custom_lists.manage.unsaved_level_edits_dialog_payload_label')}</summary>
									<pre>{JSON.stringify(entry.metadata, null, 2)}</pre>
								</details>
							</section>
						{/each}
					</div>
				{:else}
					<p class="hint">{$_('custom_lists.manage.unsaved_level_edits_dialog_empty')}</p>
				{/if}

				<Dialog.Footer>
					<Button variant="outline" on:click={() => (showPendingLevelChangesDialog = false)}>
						{$_('general.close')}
					</Button>
				</Dialog.Footer>
				</div>
			</Dialog.Content>
		</Dialog.Root>

		{#if hasUnsavedManageChanges}
			<div class="unsavedBar" role="status" aria-live="polite">
				<div class="unsavedBarInner">
					<div class="unsavedBarInfo">
						<div class="unsavedBarDot" aria-hidden="true"></div>
						<div class="unsavedBarText">
							<h2 class="unsavedBarTitle">{$_('custom_lists.manage.unsaved_manage_changes_title')}</h2>
							<div class="unsavedBarBadges">
								{#if pendingSettingsAuditFieldCount}
									<Badge variant="secondary">{$_('custom_lists.manage.audit.list_updated')}</Badge>
								{/if}
								{#if pendingLevelAuditAddedCount}
									<Badge variant="secondary">
										{$_('custom_lists.manage.unsaved_level_edits_dialog_added_count', {
											values: { count: pendingLevelAuditAddedCount }
										})}
									</Badge>
								{/if}
								{#if pendingLevelAuditUpdatedCount}
									<Badge variant="secondary">
										{$_('custom_lists.manage.unsaved_level_edits_dialog_updated_count', {
											values: { count: pendingLevelAuditUpdatedCount }
										})}
									</Badge>
								{/if}
								{#if pendingLevelAuditRemovedCount}
									<Badge variant="destructive">
										{$_('custom_lists.manage.unsaved_level_edits_dialog_removed_count', {
											values: { count: pendingLevelAuditRemovedCount }
										})}
									</Badge>
								{/if}
							</div>
						</div>
					</div>
					<div class="unsavedBarActions">
						{#if pendingManageAuditEntries.length}
							<Button variant="ghost" size="sm" on:click={viewPendingLevelChanges} disabled={savingLevelDrafts || !pendingManageAuditEntries.length}>
								{$_('custom_lists.manage.unsaved_level_edits_view_changes')}
							</Button>
						{/if}
						<Button variant="outline" size="sm" on:click={discardStagedManageChanges} disabled={savingLevelDrafts}>
							{$_('custom_lists.detail.levels.cancel_button')}
						</Button>
						<Button size="sm" on:click={saveStagedManageChanges} disabled={savingLevelDrafts}>
							<Save class="mr-2 h-4 w-4" />
							{savingLevelDrafts ? `${$_('general.loading')}...` : $_('custom_lists.detail.edit.save')}
						</Button>
					</div>
				</div>
			</div>
		{/if}
	{/if}
</div>

<style lang="scss">
	.page {
		max-width: 1120px;
		margin: 0 auto;
		padding: 16px 16px 160px;
		display: flex;
		flex-direction: column;
		gap: 20px;
		background-repeat: no-repeat;
	}

	/* Top Bar */
	.topBar {
		position: sticky;
		top: 0;
		z-index: 20;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 10px 0;
		margin: -16px -16px 0;
		padding-inline: 16px;
		background: hsl(var(--background) / 0.85);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		border-bottom: 1px solid hsl(var(--border) / 0.6);
	}

	.topBarLeft,
	.topBarRight {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}

	.topBarDivider {
		width: 1px;
		height: 18px;
		background: hsl(var(--border));
	}

	.topBarLabel {
		font-size: 0.85rem;
		font-weight: 600;
		color: hsl(var(--muted-foreground));
	}

	/* Hero */
	.hero {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 16px;
		overflow: hidden;
		color: var(--custom-surface-foreground, inherit);
	}

	.heroBanner {
		min-height: 140px;
		border-bottom: 1px solid hsl(var(--border));
		background: hsl(var(--muted) / 0.18);
	}

	.heroBanner img {
		display: block;
		width: 100%;
		height: 200px;
		object-fit: cover;
	}

	.heroBody {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.heroHeader {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 20px;
		flex-wrap: wrap;
	}

	.heroTitleGroup {
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-width: 0;
		flex: 1 1 360px;
	}

	.heroTitleGroup h1 {
		margin: 0;
		font-size: 1.6rem;
		font-weight: 700;
		line-height: 1.25;
		letter-spacing: -0.01em;
	}

	.heroDesc {
		margin: 0;
		color: var(--custom-surface-muted, hsl(var(--muted-foreground)));
		font-size: 0.92rem;
		line-height: 1.5;
	}

	.heroActions {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		flex-shrink: 0;
	}

	.heroChips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--custom-surface-muted, hsl(var(--muted-foreground)));
		background: var(--custom-surface-chip-background, hsl(var(--muted) / 0.5));
		padding: 3px 10px;
		border-radius: 999px;
		white-space: nowrap;
	}

	.chipAccent {
		color: hsl(var(--primary));
		background: hsl(var(--primary) / 0.1);
	}

	.chipRole {
		color: hsl(var(--foreground));
		background: hsl(var(--foreground) / 0.08);
		font-weight: 600;
	}

	.tagRow {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.heroMeta {
		display: flex;
		flex-wrap: wrap;
		gap: 14px;
		padding-top: 10px;
		border-top: 1px dashed hsl(var(--border) / 0.7);
	}

	.metaItem {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 0.78rem;
		color: var(--custom-surface-muted, hsl(var(--muted-foreground)));
	}

	/* Tabs */
	.tabRail {
		position: sticky;
		top: 52px;
		z-index: 10;
		margin: 0 -16px;
		padding: 8px 16px;
		background: hsl(var(--background) / 0.85);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		border-bottom: 1px solid hsl(var(--border) / 0.6);
		overflow-x: auto;
		scrollbar-width: thin;
	}

	.tabRail :global(.tabBar) {
		display: flex;
		align-items: center;
		gap: 4px;
		width: 100%;
		min-width: fit-content;
		background: transparent;
		padding: 4px;
		height: auto;
	}

	.tabRail :global(.manageTab) {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 8px 14px;
		border-radius: 8px;
		font-size: 0.88rem;
		font-weight: 500;
		color: hsl(var(--muted-foreground));
		background: transparent;
		border: 1px solid transparent;
		white-space: nowrap;
		transition: color 120ms ease, background-color 120ms ease, border-color 120ms ease;
	}

	.tabRail :global(.manageTab:hover) {
		color: hsl(var(--foreground));
		background: hsl(var(--muted) / 0.5);
	}

	.tabRail :global(.manageTab[data-state='active']) {
		color: hsl(var(--foreground));
		background: hsl(var(--card));
		border-color: hsl(var(--border));
		box-shadow: 0 1px 2px hsl(var(--foreground) / 0.06);
	}

	.tabCount {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 20px;
		height: 20px;
		padding: 0 6px;
		border-radius: 999px;
		background: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
		font-size: 0.7rem;
		font-weight: 700;
		line-height: 1;
	}

	.tabSpacer {
		flex: 1;
		min-width: 16px;
	}

	:global(.dangerTabTrigger) {
		color: hsl(var(--destructive) / 0.8) !important;
	}

	:global(.dangerTabTrigger:hover),
	:global(.dangerTabTrigger[data-state='active']) {
		color: hsl(var(--destructive)) !important;
		border-color: hsl(var(--destructive) / 0.3) !important;
	}

	/* Cards */
	.toolCard {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.moderationNotice {
		flex-direction: row;
		align-items: flex-start;
		gap: 14px;
		background: hsl(var(--destructive) / 0.08);
		border-color: hsl(var(--destructive) / 0.35);
	}

	.moderationIcon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: hsl(var(--destructive) / 0.15);
		color: hsl(var(--destructive));
		flex-shrink: 0;
	}

	.moderationCopy {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.toolHeading {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.recordFilterTabContent {
		margin-top: 16px;
	}

	.recordFilterFormGrid {
		display: grid;
		gap: 14px;
	}

	.recordFilterFieldGroup {
		display: grid;
		gap: 14px;
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.recordFilterField {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.recordFilterFieldLabel,
	.recordFilterField label {
		font-size: 0.9rem;
		font-weight: 500;
	}

	.recordFilterField input {
		width: 100%;
		border-radius: 10px;
		border: 1px solid hsl(var(--border));
		background: hsl(var(--background));
		padding: 9px 12px;
		color: hsl(var(--foreground));
	}

	.recordFilterOptionRow {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.recordFilterOptionBtn {
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

	.recordFilterOptionBtn:hover {
		background: hsl(var(--muted) / 0.5);
	}

	.recordFilterOptionBtn.selected {
		background: hsl(var(--primary) / 0.12);
		border-color: hsl(var(--primary));
	}

	.hint {
		font-size: 0.82rem;
		color: hsl(var(--muted-foreground));
		margin: 0;
	}

	/* Unsaved changes floating bar */
	.unsavedBar {
		position: fixed;
		left: 50%;
		bottom: 20px;
		transform: translateX(-50%);
		z-index: 40;
		width: min(860px, calc(100vw - 24px));
		padding: 0;
		animation: unsavedBarSlideUp 220ms ease-out;
	}

	@keyframes unsavedBarSlideUp {
		from {
			transform: translate(-50%, 20px);
			opacity: 0;
		}
		to {
			transform: translate(-50%, 0);
			opacity: 1;
		}
	}

	.unsavedBarInner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 12px 16px;
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 14px;
		box-shadow:
			0 20px 40px hsl(var(--foreground) / 0.16),
			0 0 0 1px hsl(var(--primary) / 0.15);
	}

	.unsavedBarInfo {
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
		flex: 1;
	}

	.unsavedBarDot {
		flex-shrink: 0;
		width: 10px;
		height: 10px;
		border-radius: 999px;
		background: hsl(var(--primary));
		box-shadow: 0 0 0 4px hsl(var(--primary) / 0.2);
		animation: unsavedBarPulse 2s ease-in-out infinite;
	}

	@keyframes unsavedBarPulse {
		0%, 100% {
			box-shadow: 0 0 0 4px hsl(var(--primary) / 0.2);
		}
		50% {
			box-shadow: 0 0 0 7px hsl(var(--primary) / 0.08);
		}
	}

	.unsavedBarText {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.unsavedBarTitle {
		margin: 0;
		font-size: 0.92rem;
		font-weight: 600;
	}

	.unsavedBarBadges {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}

	.unsavedBarActions {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-shrink: 0;
	}

	/* Pending changes dialog */
	.pendingChangesDialog {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.pendingChangesSummary {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.pendingChangesList {
		display: flex;
		flex-direction: column;
		gap: 14px;
		max-height: min(65vh, 760px);
		overflow-y: auto;
		padding-right: 4px;
	}

	.pendingChangeEntry {
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		padding: 16px;
		background: hsl(var(--muted) / 0.08);
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.pendingChangeHeader {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 16px;
		flex-wrap: wrap;
	}

	.pendingChangeHeading {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}

	.pendingChangeTitleRow {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.pendingChangeTitleRow h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.pendingChangeDetail {
		margin: 0;
		font-size: 0.88rem;
		color: hsl(var(--muted-foreground));
	}

	.pendingChangeAuditAction {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 6px;
	}

	.pendingChangeAuditAction code {
		padding: 4px 8px;
		border-radius: 999px;
		background: hsl(var(--muted));
		border: 1px solid hsl(var(--border));
		font-size: 0.78rem;
	}

	.pendingChangeMetaLabel {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: hsl(var(--muted-foreground));
	}

	.pendingChangeFieldList {
		display: grid;
		gap: 10px;
	}

	.pendingChangeFieldRow {
		display: grid;
		grid-template-columns: minmax(140px, 200px) minmax(0, 1fr);
		gap: 12px;
		align-items: center;
	}

	.pendingChangeFieldLabel {
		font-size: 0.85rem;
		font-weight: 600;
	}

	.pendingChangeFieldValues {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.pendingChangeFieldValuesSingle {
		gap: 0;
	}

	.pendingChangeFieldValue {
		padding: 6px 10px;
		border-radius: 8px;
		background: hsl(var(--background));
		border: 1px solid hsl(var(--border));
		font-size: 0.84rem;
	}

	.pendingChangeFieldValueOld {
		color: hsl(var(--muted-foreground));
	}

	.pendingChangeFieldValueNew {
		border-color: hsl(var(--primary) / 0.35);
		background: hsl(var(--primary) / 0.08);
	}

	.pendingChangeFieldArrow {
		color: hsl(var(--muted-foreground));
		font-weight: 700;
	}

	.pendingChangePayload {
		border-top: 1px solid hsl(var(--border));
		padding-top: 12px;
	}

	.pendingChangePayload summary {
		cursor: pointer;
		font-size: 0.84rem;
		font-weight: 600;
		color: hsl(var(--muted-foreground));
	}

	.pendingChangePayload pre {
		margin: 10px 0 0;
		padding: 12px;
		border-radius: 10px;
		background: hsl(var(--background));
		border: 1px solid hsl(var(--border));
		font-size: 0.78rem;
		line-height: 1.5;
		overflow-x: auto;
	}

	/* Empty State */
	.emptyState {
		border: 1px dashed hsl(var(--border));
		border-radius: 12px;
		padding: 48px 24px;
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
		.page {
			padding: 8px 12px 180px;
			gap: 16px;
		}

		.topBar {
			margin: -8px -12px 0;
			padding-inline: 12px;
		}

		.heroHeader {
			flex-direction: column;
		}

		.heroActions {
			width: 100%;
		}

		.heroTitleGroup h1 {
			font-size: 1.3rem;
		}

		.tabRail {
			top: 52px;
			margin: 0 -12px;
			padding: 6px 12px;
		}

		.pendingChangeFieldRow {
			grid-template-columns: 1fr;
		}

		.pendingChangeAuditAction {
			align-items: flex-start;
		}

		.unsavedBar {
			bottom: 12px;
			width: calc(100vw - 16px);
		}

		.unsavedBarInner {
			flex-direction: column;
			align-items: stretch;
			gap: 10px;
		}

		.unsavedBarActions {
			justify-content: flex-end;
			flex-wrap: wrap;
		}
	}

	@media (max-width: 480px) {
		.heroBody {
			padding: 18px 16px;
		}

		.heroBanner img {
			height: 140px;
		}

		.toolCard {
			padding: 16px;
		}

		.recordFilterFieldGroup {
			grid-template-columns: 1fr;
		}

		.tabRail :global(.manageTab) {
			padding: 7px 10px;
			font-size: 0.82rem;
		}
	}
</style>
