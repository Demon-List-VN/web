<script lang="ts">
	import { browser } from '$app/environment';
	import LevelCard from '$lib/components/levelCard.svelte';
	import CommunityPostCard from '$lib/components/communityPostCard.svelte';
	import { toLevelCardProps } from '$lib/components/levelCardProps';
	import ListFilter from '$lib/components/listFilter.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Pagination from '$lib/components/ui/pagination';
	import * as Table from '$lib/components/ui/table';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Popover from '$lib/components/ui/popover';
	import Ads from '$lib/components/ads.svelte';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import {
		clearCustomListBranding,
		setCustomListBranding
	} from '$lib/client/customListBranding';
	import {
		normalizeCustomListRankBadges,
		resolveCustomListRankBadge,
		type CustomListRankBadge
	} from '$lib/utils/customListRank';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';
	import {
		ArrowLeft,
		Settings,
		Globe2,
		EyeOff,
		Lock,
		Layers,
		Clock,
		ListOrdered,
		Info,
		MoreHorizontal,
		Star,
		MessageSquare,
		ChevronUp
	} from 'lucide-svelte';
	import { onDestroy, onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { locale, _ } from 'svelte-i18n';

	export let data: any;

	const LEVELS_PAGE_SIZE = 50;
	const LEVELS_AD_FREQUENCY = 6;

	type CustomListItem = {
		id: number;
		levelId: number;
		created_at: string;
		minProgress: number | null;
		rating: number;
		position: number | null;
		videoID: string | null;
		level: any | null;
	};

	type CustomListPermissionFlags = {
		canEditSettings: boolean;
		canEditLevels: boolean;
		canViewAudit?: boolean;
		canViewMembers?: boolean;
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
		leaderboardEnabled?: boolean;
		faviconUrl?: string | null;
		isBanned: boolean;
		isPlatformer: boolean;
		isOfficial?: boolean;
		levelSubmissionEnabled?: boolean;
		logoUrl?: string | null;
		topEnabled?: boolean;
		visibility: 'private' | 'unlisted' | 'public';
		mode: 'rating' | 'top';
		tags: string[];
		levelCount: number;
		updated_at: string;
		starCount?: number;
		starred?: boolean;
		ownerData?: any;
		permissions?: CustomListPermissionFlags;
		rankBadges?: CustomListRankBadge[];
		weightFormula?: string;
		items: CustomListItem[];
	};

	type CustomListRecordPoint = {
		uid: string;
		levelId: number;
		progress: number;
		timestamp: number | null;
		point: number;
		no: number;
		formulaScope: {
			position: number;
			levelCount: number;
			top: number;
			rating: number;
			minProgress: number;
			progress: number;
		};
		player: any | null;
		level: {
			id: number;
			name: string | null;
			creator: string | null;
			difficulty: string | null;
			isPlatformer: boolean;
			rating: number | null;
			minProgress: number | null;
		} | null;
	};

	type LeaderboardPlayer = {
		uid: string;
		rank: number;
		score: number;
		completedCount: number;
		name: string;
	} & Record<string, any>;

	type DetailTab = 'levels' | 'leaderboard' | 'my-record' | 'community';

	let list: CustomList | null = data?.list ?? null;
	let loadingError = data?.error ?? '';
	let requiresAuthRecovery = Boolean(data?.requiresAuthRecovery);
	let authRecoveryLoading = requiresAuthRecovery;
	let authFetchKey = '';
	let relatedPosts: any[] = [];
	let relatedPostsKey = '';
	let loadingRelatedPosts = false;
	let starLoading = false;
	let activeTab: DetailTab = 'levels';
	let leaderboard: any[] = [];
	let leaderboardCount = 0;
	let leaderboardError = '';
	let leaderboardLoading = false;
	let leaderboardFetchKey = '';
	let selectedLeaderboardPlayerUid = '';
	let selectedLeaderboardPlayer: LeaderboardPlayer | null = null;
	let recordPoints: CustomListRecordPoint[] = [];
	let recordPointsCount = 0;
	let recordPointsError = '';
	let recordPointsLoading = false;
	let recordPointsFetchKey = '';
	let recordPointsPage = 1;
	let recordPointsDialogOpen = false;
	let myRecordPoints: CustomListRecordPoint[] = [];
	let myRecordPointsCount = 0;
	let myRecordPointsError = '';
	let myRecordPointsLoading = false;
	let myRecordPointsFetchKey = '';
	let myRecordPointsPage = 1;
	let listLevelsObserver: IntersectionObserver | undefined;
	let listLevelsSentinel: HTMLDivElement | null = null;
	let listLevelsLoading = false;
	let listLevelsError = '';
	let listLevelsFetchKey = '';
	let reachedEnd = false;
	let showScrollToTop = false;

	type LevelFilters = {
		topStart: string | null;
		topEnd: string | null;
		ratingMin: string | null;
		ratingMax: string | null;
		nameSearch: string;
		creatorSearch: string;
		sortBy: string | null;
		ascending: boolean;
		tagIds: string | null;
	};

	let filters: LevelFilters = {
		topStart: null,
		topEnd: null,
		ratingMin: null,
		ratingMax: null,
		nameSearch: '',
		creatorSearch: '',
		sortBy: null,
		ascending: true,
		tagIds: null
	};

	function formatVisibility(visibility: string) {
		if (visibility === 'public') return $_('custom_lists.visibility.public');
		if (visibility === 'unlisted') return $_('custom_lists.visibility.unlisted');
		return $_('custom_lists.visibility.private');
	}

	function formatDate(value: string) {
		return new Date(value).toLocaleDateString('vi-VN', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function getModeLabel(mode: 'rating' | 'top') {
		return mode === 'rating'
			? $_('custom_lists.detail.edit.mode_rating')
			: $_('custom_lists.detail.edit.mode_top');
	}

	function getListTypeLabel(isPlatformer: boolean) {
		return isPlatformer ? $_('custom_lists.type.platformer') : $_('custom_lists.type.classic');
	}

	function getVisibilityIcon(visibility: string) {
		if (visibility === 'public') return Globe2;
		if (visibility === 'unlisted') return EyeOff;
		return Lock;
	}

	function getModeIcon(mode: string) {
		return mode === 'top' ? ListOrdered : Star;
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

	function getListThemeBackgroundColor(currentList: CustomList | null) {
		const backgroundColor = currentList?.backgroundColor;

		if (!isHexColor(backgroundColor)) {
			return null;
		}

		return String(backgroundColor).trim();
	}

	function getListThemeBorderColor(currentList: CustomList | null) {
		const borderColor = currentList?.borderColor;

		if (!isHexColor(borderColor)) {
			return null;
		}

		return String(borderColor).trim();
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

	function getListHeroStyle(currentList: CustomList | null) {
		return getThemedSurfaceStyle(
			getListThemeBackgroundColor(currentList),
			getListThemeBorderColor(currentList)
		);
	}

	function getListHeroBannerStyle(currentList: CustomList | null) {
		const borderColor = getListThemeBorderColor(currentList);

		return borderColor ? `border-bottom-color: ${borderColor};` : undefined;
	}

	function getMissingLevelStyle(currentList: CustomList | null) {
		return getThemedSurfaceStyle(
			getListThemeBackgroundColor(currentList),
			getListThemeBorderColor(currentList)
		);
	}

	function getItemCardType(item: CustomListItem) {
		if (list?.isOfficial && list.slug === 'fl') {
			return item.level?.isPlatformer ? 'pl' : 'dl';
		}

		return list?.isPlatformer ? 'pl' : 'dl';
	}

	function getListItemTop(item: CustomListItem, index: number) {
		if (item.position == null) {
			return index + 1;
		}

		return Number(item.position);
	}

	function getRequestedTab(searchParams: URLSearchParams): DetailTab {
		const tab = searchParams.get('tab');

		if (tab === 'leaderboard') return 'leaderboard';
		if (tab === 'my-record') return 'my-record';
		if (tab === 'records') return 'leaderboard';
		if (tab === 'community') return 'community';
		return 'levels';
	}

	function getRequestedLeaderboardPage(searchParams: URLSearchParams) {
		const parsed = Number.parseInt(searchParams.get('page') || '1', 10);
		return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
	}

	function buildDetailUrl(nextTab: DetailTab, nextPage: number = 1) {
		const query = new URLSearchParams($page.url.searchParams);

		if (nextTab === 'levels') {
			query.delete('tab');
			query.delete('page');
		} else {
			query.set('tab', nextTab);

			if (nextTab === 'leaderboard') {
				query.set('page', String(nextPage));
			} else {
				query.delete('page');
			}
		}

		const search = query.toString();
		return `${$page.url.pathname}${search ? `?${search}` : ''}`;
	}

	function switchTab(nextTab: DetailTab) {
		if (nextTab === 'my-record') {
			myRecordPointsPage = 1;
		}

		goto(buildDetailUrl(nextTab, nextTab === 'leaderboard' ? activeLeaderboardPage : 1), {
			keepFocus: true,
			noScroll: true
		});
	}

	function setLeaderboardPage(nextPage: number) {
		selectedLeaderboardPlayerUid = '';
		recordPointsPage = 1;
		goto(buildDetailUrl('leaderboard', nextPage), {
			keepFocus: true,
			noScroll: true
		});
	}

	function setRecordPointsPage(nextPage: number) {
		recordPointsPage = nextPage;
	}

	function setMyRecordPointsPage(nextPage: number) {
		myRecordPointsPage = nextPage;
	}

	function selectLeaderboardPlayer(player: LeaderboardPlayer) {
		if (selectedLeaderboardPlayerUid !== player.uid) {
			recordPointsPage = 1;
			recordPoints = [];
			recordPointsCount = 0;
			recordPointsError = '';
		}

		selectedLeaderboardPlayerUid = player.uid;
		recordPointsDialogOpen = true;
	}

	function formatScore(score: number) {
		return Math.floor(score);
	}

	function formatPoint(point: number) {
		const rounded = Math.round(point * 1000) / 1000;

		if (Number.isInteger(rounded)) {
			return String(rounded);
		}

		return rounded
			.toFixed(3)
			.replace(/\.0+$|0+$/g, '')
			.replace(/\.$/, '');
	}

	function getLeaderboardRankBadge(player: LeaderboardPlayer | null | undefined) {
		return resolveCustomListRankBadge(player, normalizeCustomListRankBadges(list?.rankBadges));
	}

	function getTimeString(ms: number) {
		const minutes = Math.floor(ms / 60000);
		const seconds = Math.floor((ms % 60000) / 1000);
		const milliseconds = ms % 1000;
		return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
	}

	function formatRecordProgress(progress: number) {
		if (list?.isPlatformer) {
			return getTimeString(progress);
		}

		return `${progress}%`;
	}

	function formatFormulaScopeValue(
		key: keyof CustomListRecordPoint['formulaScope'],
		value: number
	) {
		if (key === 'minProgress' || key === 'progress') {
			if (list?.isPlatformer) {
				return `${Math.round(value)} ms (${formatRecordProgress(Math.round(value))})`;
			}

			return formatRecordProgress(Math.round(value));
		}

		return formatPoint(value);
	}

	function buildListItemsQuery(start: number, end: number) {
		const params = new URLSearchParams({
			start: String(start),
			end: String(end)
		});

		if (filters.topStart) params.set('topMin', filters.topStart);
		if (filters.topEnd) params.set('topMax', filters.topEnd);
		if (filters.ratingMin) params.set('ratingMin', filters.ratingMin);
		if (filters.ratingMax) params.set('ratingMax', filters.ratingMax);
		if (filters.nameSearch) params.set('nameSearch', filters.nameSearch);
		if (filters.creatorSearch) params.set('creatorSearch', filters.creatorSearch);
		if (filters.tagIds) params.set('tagIds', filters.tagIds);

		if (hasActiveFilters()) {
			params.set('ascending', String(filters.ascending));
		}

		return params.toString();
	}

	function hasActiveFilters() {
		return Boolean(
			filters.topStart ||
				filters.topEnd ||
				filters.ratingMin ||
				filters.ratingMax ||
				filters.nameSearch ||
				filters.creatorSearch ||
				filters.tagIds
		);
	}

	function getListDetailUrl(start: number, end: number) {
		return `${import.meta.env.VITE_API_URL}/lists/${$page.params.id}?${buildListItemsQuery(start, end)}`;
	}

	function getLoadedLevelCount(currentList: CustomList | null) {
		return currentList?.items?.length ?? 0;
	}

	function shouldShowLevelsAd(index: number, totalItems: number) {
		return (
			totalItems > LEVELS_AD_FREQUENCY &&
			(index + 1) % LEVELS_AD_FREQUENCY === 0 &&
			index < totalItems - 1
		);
	}

	function hasMoreLevels(currentList: CustomList | null) {
		if (!currentList || reachedEnd) {
			return false;
		}

		if (hasActiveFilters()) {
			// With filters, only stop once we've hit a short page
			return true;
		}

		return getLoadedLevelCount(currentList) < currentList.levelCount;
	}

	function mergeListItems(existingItems: CustomListItem[], incomingItems: CustomListItem[]) {
		const seenLevelIds = new Set(existingItems.map((item) => item.levelId));
		const mergedItems = [...existingItems];

		for (const item of incomingItems) {
			if (seenLevelIds.has(item.levelId)) {
				continue;
			}

			seenLevelIds.add(item.levelId);
			mergedItems.push(item);
		}

		return mergedItems;
	}

	async function fetchListDetail(start: number, end: number, headers?: HeadersInit) {
		const res = await fetch(getListDetailUrl(start, end), headers ? { headers } : undefined);
		const payload = await res.json().catch(() => null);

		if (!res.ok || !payload) {
			throw new Error(payload?.error || 'Failed to load list');
		}

		return payload as CustomList;
	}

	function destroyLevelsObserver() {
		if (listLevelsObserver) {
			listLevelsObserver.disconnect();
			listLevelsObserver = undefined;
		}
	}

	function setupLevelsObserver() {
		if (
			!browser ||
			activeTab !== 'levels' ||
			!listLevelsSentinel ||
			!hasMoreLevels(list) ||
			listLevelsLoading ||
			listLevelsError
		) {
			destroyLevelsObserver();
			return;
		}

		destroyLevelsObserver();

		listLevelsObserver = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) {
					loadMoreLevels();
				}
			},
			{ rootMargin: '200px' }
		);

		listLevelsObserver.observe(listLevelsSentinel);
	}

	$: if ($user.checked && $user.loggedIn) {
		refetchWithAuth();
	}
	$: if (requiresAuthRecovery && $user.checked && !$user.loggedIn && !list) {
		loadingError = 'This list is private';
		authRecoveryLoading = false;
		requiresAuthRecovery = false;
	}

	async function refetchWithAuth() {
		const key = `${$page.params.id}:${$user.data?.uid || 'authed'}`;
		if (key === authFetchKey) return;
		authFetchKey = key;
		const recoveringPrivateList = requiresAuthRecovery;

		if (recoveringPrivateList) {
			authRecoveryLoading = true;
		}

		try {
			list = await fetchListDetail(0, LEVELS_PAGE_SIZE - 1, {
				Authorization: `Bearer ${await $user.token()}`
			});
			loadingError = '';
			listLevelsError = '';
		} catch (error) {
			if (recoveringPrivateList) {
				loadingError = error instanceof Error ? error.message : 'Failed to load list';
			}
		} finally {
			if (recoveringPrivateList) {
				authRecoveryLoading = false;
				requiresAuthRecovery = false;
			}
		}
	}

	async function loadMoreLevels() {
		if (!list || listLevelsLoading || !hasMoreLevels(list)) {
			return;
		}

		const start = getLoadedLevelCount(list);
		const end = start + LEVELS_PAGE_SIZE - 1;
		const fetchKey = `${$page.params.id}:${$user.loggedIn ? $user.data?.uid || 'authed' : 'anon'}:${start}`;
		const headers = $user.loggedIn
			? {
					Authorization: `Bearer ${await $user.token()}`
				}
			: undefined;

		listLevelsFetchKey = fetchKey;
		listLevelsLoading = true;
		listLevelsError = '';

		try {
			const payload = await fetchListDetail(start, end, headers);

			if (fetchKey !== listLevelsFetchKey) {
				return;
			}

			const incoming = payload.items ?? [];
			if (incoming.length < LEVELS_PAGE_SIZE) {
				reachedEnd = true;
			}

			list = list
				? {
						...list,
						...payload,
						items: mergeListItems(list.items, incoming)
					}
				: payload;
			loadingError = '';
			listLevelsError = '';
		} catch (error) {
			if (fetchKey !== listLevelsFetchKey) {
				return;
			}

			listLevelsError = error instanceof Error ? error.message : 'Failed to load list';
		} finally {
			if (fetchKey === listLevelsFetchKey) {
				listLevelsLoading = false;
			}
		}
	}

	function retryLoadMoreLevels() {
		listLevelsError = '';
		loadMoreLevels();
	}

	async function handleFilterChange(event: CustomEvent) {
		const finishApplying = typeof event.detail.done === 'function' ? event.detail.done : null;

		filters = {
			topStart: event.detail.topStart ?? null,
			topEnd: event.detail.topEnd ?? null,
			ratingMin: event.detail.ratingMin ?? null,
			ratingMax: event.detail.ratingMax ?? null,
			nameSearch: event.detail.nameSearch ?? '',
			creatorSearch: event.detail.creatorSearch ?? '',
			sortBy: event.detail.sortBy ?? null,
			ascending: event.detail.ascending ?? true,
			tagIds: event.detail.tagIds ?? null
		};

		if (!list) {
			finishApplying?.();
			return;
		}

		reachedEnd = false;
		listLevelsError = '';
		const fetchKey = `${$page.params.id}:filter:${Date.now()}`;
		listLevelsFetchKey = fetchKey;
		listLevelsLoading = true;

		const headers = $user.loggedIn
			? { Authorization: `Bearer ${await $user.token()}` }
			: undefined;

		try {
			const payload = await fetchListDetail(0, LEVELS_PAGE_SIZE - 1, headers);

			if (fetchKey !== listLevelsFetchKey) {
				return;
			}

			const incoming = payload.items ?? [];
			if (incoming.length < LEVELS_PAGE_SIZE) {
				reachedEnd = true;
			}

			list = list
				? { ...list, ...payload, items: incoming }
				: payload;
		} catch (error) {
			if (fetchKey !== listLevelsFetchKey) {
				return;
			}

			listLevelsError = error instanceof Error ? error.message : 'Failed to load list';
		} finally {
			if (fetchKey === listLevelsFetchKey) {
				listLevelsLoading = false;
			}

			finishApplying?.();
		}
	}

	function scrollToTop() {
		if (browser) {
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	}

	function handleScroll() {
		if (browser) {
			showScrollToTop = window.pageYOffset > 300;
		}
	}

	onMount(() => {
		if (!browser) return;
		window.addEventListener('scroll', handleScroll);
	});

	async function toggleStar() {
		if (!list || starLoading) return;

		if (!$user.loggedIn) {
			toast.error($_('community.login_required'));
			return;
		}

		starLoading = true;

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${list.id}/star`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${await $user.token()}`
				}
			});

			const payload = await res.json().catch(() => null);

			if (!res.ok) {
				throw new Error(payload?.error || $_('custom_lists.toast.failed_star'));
			}

			list = {
				...list,
				starred: payload?.starred ?? false,
				starCount: payload?.starCount ?? list.starCount ?? 0
			};

			toast.success(
				payload?.starred ? $_('custom_lists.toast.starred') : $_('custom_lists.toast.unstarred')
			);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_star'));
		} finally {
			starLoading = false;
		}
	}

	async function fetchRelatedPosts(listId: number) {
		loadingRelatedPosts = true;

		try {
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/community/lists/${listId}/posts?limit=6`
			);
			if (!res.ok) {
				relatedPosts = [];
				return;
			}

			relatedPosts = await res.json();
		} catch {
			relatedPosts = [];
		} finally {
			loadingRelatedPosts = false;
		}
	}

	function openCreatePost() {
		if (!list) return;
		goto(`/community/create?listId=${list.id}`);
	}

	async function fetchLeaderboard(fetchKey: string) {
		leaderboardLoading = true;
		leaderboardError = '';

		try {
			const query = new URLSearchParams({
				start: String((activeLeaderboardPage - 1) * 50),
				end: String(activeLeaderboardPage * 50 - 1)
			});
			const headers = $user.loggedIn
				? {
						Authorization: `Bearer ${await $user.token()}`
					}
				: undefined;
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/lists/${$page.params.id}/leaderboard?${query.toString()}`,
				{
					headers
				}
			);
			const payload = await res.json().catch(() => null);

			if (fetchKey !== leaderboardFetchKey) {
				return;
			}

			if (!res.ok) {
				throw new Error(payload?.error || $_('custom_lists.detail.leaderboard.failed_load'));
			}

			leaderboard = payload?.data ?? [];
			leaderboardCount = payload?.total ?? 0;
			leaderboardError = '';
		} catch (error) {
			if (fetchKey !== leaderboardFetchKey) {
				return;
			}

			leaderboard = [];
			leaderboardCount = 0;
			leaderboardError =
				error instanceof Error ? error.message : $_('custom_lists.detail.leaderboard.failed_load');
		} finally {
			if (fetchKey === leaderboardFetchKey) {
				leaderboardLoading = false;
			}
		}
	}

	async function requestRecordPoints(uid: string, pageNumber: number) {
		const query = new URLSearchParams({
			start: String((pageNumber - 1) * 50),
			end: String(pageNumber * 50 - 1),
			uid
		});
		const headers = $user.loggedIn
			? {
					Authorization: `Bearer ${await $user.token()}`
				}
			: undefined;
		const res = await fetch(
			`${import.meta.env.VITE_API_URL}/lists/${$page.params.id}/records?${query.toString()}`,
			{
				headers
			}
		);
		const payload = await res.json().catch(() => null);

		if (!res.ok) {
			throw new Error(payload?.error || $_('custom_lists.detail.records.failed_load'));
		}

		return payload;
	}

	async function fetchRecordPoints(fetchKey: string, uid: string, pageNumber: number) {
		recordPointsLoading = true;
		recordPointsError = '';

		try {
			const payload = await requestRecordPoints(uid, pageNumber);

			if (fetchKey !== recordPointsFetchKey) {
				return;
			}

			recordPoints = payload?.data ?? [];
			recordPointsCount = payload?.total ?? 0;
			recordPointsError = '';
		} catch (error) {
			if (fetchKey !== recordPointsFetchKey) {
				return;
			}

			recordPoints = [];
			recordPointsCount = 0;
			recordPointsError =
				error instanceof Error ? error.message : $_('custom_lists.detail.records.failed_load');
		} finally {
			if (fetchKey === recordPointsFetchKey) {
				recordPointsLoading = false;
			}
		}
	}

	async function fetchMyRecordPoints(fetchKey: string, uid: string, pageNumber: number) {
		myRecordPointsLoading = true;
		myRecordPointsError = '';

		try {
			const payload = await requestRecordPoints(uid, pageNumber);

			if (fetchKey !== myRecordPointsFetchKey) {
				return;
			}

			myRecordPoints = payload?.data ?? [];
			myRecordPointsCount = payload?.total ?? 0;
			myRecordPointsError = '';
		} catch (error) {
			if (fetchKey !== myRecordPointsFetchKey) {
				return;
			}

			myRecordPoints = [];
			myRecordPointsCount = 0;
			myRecordPointsError =
				error instanceof Error ? error.message : $_('custom_lists.detail.records.failed_load');
		} finally {
			if (fetchKey === myRecordPointsFetchKey) {
				myRecordPointsLoading = false;
			}
		}
	}

	$: canManageList = Boolean(
		list &&
			(list.permissions?.canEditSettings ||
				list.permissions?.canEditLevels ||
				list.permissions?.canViewAudit ||
				list.permissions?.canViewMembers)
	);
	$: listItems = list?.items ?? [];
	$: listCardType = list?.isPlatformer ? 'pl' : 'dl';
	$: canStarList = Boolean(list && list.id > 0 && list.visibility !== 'private');
	$: canShowCommunity = Boolean(list && list.visibility !== 'private' && list.communityEnabled);
	$: canShowLeaderboard = Boolean(list && list.leaderboardEnabled !== false);
	$: canShowMyRecord = Boolean(canShowLeaderboard && $user.loggedIn && $user.data?.uid);
	$: requestedTab = getRequestedTab($page.url.searchParams);
	$: activeLeaderboardPage = getRequestedLeaderboardPage($page.url.searchParams);
	$: activeTab =
		requestedTab === 'community' && !canShowCommunity
			? 'levels'
			: requestedTab === 'leaderboard' && !canShowLeaderboard
				? 'levels'
				: requestedTab === 'my-record' && !canShowMyRecord
					? 'levels'
					: requestedTab;
	$: selectedLeaderboardPlayer =
		(leaderboard.find((player) => player.uid === selectedLeaderboardPlayerUid) as
			| LeaderboardPlayer
			| undefined) ?? null;
	$: if (!canShowCommunity) {
		relatedPosts = [];
		relatedPostsKey = '';
	}
	$: if (list?.id && canShowCommunity && activeTab === 'community') {
		const nextKey = String(list.id);
		if (nextKey !== relatedPostsKey) {
			relatedPostsKey = nextKey;
			fetchRelatedPosts(list.id);
		}
	}
	$: if (!canShowLeaderboard) {
		leaderboard = [];
		leaderboardCount = 0;
		leaderboardFetchKey = '';
		recordPoints = [];
		recordPointsCount = 0;
		recordPointsFetchKey = '';
		recordPointsDialogOpen = false;
	}
	$: if (!canShowMyRecord) {
		myRecordPoints = [];
		myRecordPointsCount = 0;
		myRecordPointsFetchKey = '';
	}
	$: if (list?.id && canShowLeaderboard && activeTab === 'leaderboard') {
		const nextKey = `${list.id}:${activeLeaderboardPage}:${$user.loggedIn ? $user.data?.uid || 'authed' : 'anon'}`;

		if (nextKey !== leaderboardFetchKey) {
			leaderboardFetchKey = nextKey;
			fetchLeaderboard(nextKey);
		}
	}
	$: if (list?.id && canShowMyRecord && activeTab === 'my-record' && $user.data?.uid) {
		const nextKey = `${list.id}:${$user.data.uid}:${myRecordPointsPage}:${$user.loggedIn ? $user.data?.uid || 'authed' : 'anon'}`;

		if (nextKey !== myRecordPointsFetchKey) {
			myRecordPointsFetchKey = nextKey;
			fetchMyRecordPoints(nextKey, $user.data.uid, myRecordPointsPage);
		}
	}
	$: if (!selectedLeaderboardPlayer && !leaderboardLoading) {
		recordPoints = [];
		recordPointsCount = 0;
	}
	$: if (activeTab !== 'leaderboard') {
		recordPointsDialogOpen = false;
	}
	$: if (recordPointsDialogOpen && !selectedLeaderboardPlayer) {
		recordPointsDialogOpen = false;
	}
	$: if (
		list?.id &&
		activeTab === 'leaderboard' &&
		recordPointsDialogOpen &&
		selectedLeaderboardPlayer
	) {
		const nextKey = `${list.id}:${selectedLeaderboardPlayer.uid}:${recordPointsPage}:${$user.loggedIn ? $user.data?.uid || 'authed' : 'anon'}`;

		if (nextKey !== recordPointsFetchKey) {
			recordPointsFetchKey = nextKey;
			fetchRecordPoints(nextKey, selectedLeaderboardPlayer.uid, recordPointsPage);
		}
	}
	$: if (browser) {
		if (activeTab === 'levels' && listLevelsSentinel && hasMoreLevels(list) && !listLevelsError) {
			setupLevelsObserver();
		} else {
			destroyLevelsObserver();
		}
	}
	$: setCustomListBranding(
		list
			? { faviconUrl: list.faviconUrl, logoUrl: list.logoUrl, title: list.title }
			: null
	);

	onDestroy(() => {
		clearCustomListBranding();
		destroyLevelsObserver();
		if (browser) {
			window.removeEventListener('scroll', handleScroll);
		}
	});
</script>

<svelte:head>
	<title
		>{list
			? `${list.title} - Danh sách - Geometry Dash Việt Nam`
			: 'Danh sách - Geometry Dash Việt Nam'}</title
	>
	{#if list?.description}
		<meta name="description" content={list.description} />
	{/if}
</svelte:head>

<div class="page">
	<!-- Toolbar -->
	<div class="toolbar">
		<Button variant="ghost" size="sm" on:click={() => goto('/lists')}>
			<ArrowLeft class="mr-2 h-4 w-4" />
			{$_('custom_lists.back')}
		</Button>
		<div class="toolbarActions">
			{#if list && list.levelSubmissionEnabled}
				<Button variant="outline" size="sm" on:click={() => goto(`/lists/${$page.params.id}/submit`)}>
					{#if $locale == 'vi'}
						Nộp level
					{:else}
						Submit level
					{/if}
				</Button>
			{/if}
			{#if list && canManageList}
				<Button size="sm" on:click={() => goto(`/lists/${$page.params.id}/manage`)}>
					<Settings class="mr-2 h-4 w-4" />
					{$_('custom_lists.actions.manage')}
				</Button>
			{/if}
		</div>
	</div>

	{#if authRecoveryLoading && !list}
		<div class="emptyState">
			<h3>{$_('custom_lists.detail.loading')}</h3>
			<p>{$_('custom_lists.detail.loading')}</p>
		</div>
	{:else if loadingError}
		<div class="emptyState">
			<h3>{$_('custom_lists.detail.error_title')}</h3>
			<p>{loadingError}</p>
		</div>
	{:else if list}
		<!-- Hero Card -->
		<div class="hero" class:heroHasBanner={Boolean(list.bannerUrl)} style={getListHeroStyle(list)}>
			{#if list.bannerUrl}
				<div class="heroBanner" style={getListHeroBannerStyle(list)}>
					<img src={list.bannerUrl} alt="" loading="lazy" decoding="async" />
				</div>
			{/if}
			<div class="heroTop">
				<div class="heroText">
					<h1>{list.title}</h1>
					{#if list.description}
						<p class="heroDesc">{list.description}</p>
					{:else}
						<p class="heroDesc muted">{$_('custom_lists.detail.no_description')}</p>
					{/if}
				</div>
				{#if canStarList}
					<Button
						variant="ghost"
						size="icon"
						class={list.starred ? 'heroStarButton heroStarButtonStarred' : 'heroStarButton'}
						on:click={toggleStar}
						disabled={starLoading}
						aria-label={list.starred
							? $_('custom_lists.actions.unstar')
							: $_('custom_lists.actions.star')}
						title={list.starred
							? $_('custom_lists.actions.unstar')
							: $_('custom_lists.actions.star')}
					>
						<Star class={`h-5 w-5 ${list.starred ? 'starFilled' : ''}`} />
					</Button>
				{/if}
			</div>

			<div class="heroMeta">
				{#if list.ownerData}
					<span class="metaChip">
						{$_('custom_lists.index.browse.by')}
						<span class="metaOwner">
							<PlayerLink player={list.ownerData} />
						</span>
					</span>
				{/if}
				<span class="metaChip">
					<svelte:component this={getVisibilityIcon(list.visibility)} class="h-3.5 w-3.5" />
					{formatVisibility(list.visibility)}
				</span>
				<span class="metaChip">
					<Layers class="h-3.5 w-3.5" />
					{getListTypeLabel(list.isPlatformer)}
				</span>
				<span class="metaChip">
					<svelte:component this={getModeIcon(list.mode)} class="h-3.5 w-3.5" />
					{getModeLabel(list.mode)}
				</span>
				{#if list.isOfficial}
					<span class="metaChip">
						<Star class="starFilled h-3.5 w-3.5" />
						{$_('custom_lists.detail.official_badge')}
					</span>
				{/if}
				<span class="metaChip">
					{$_('custom_lists.detail.levels_badge', { values: { count: list.levelCount } })}
				</span>
				{#if canStarList}
					<span class="metaChip">
						<Star class={`h-3.5 w-3.5 ${list.starred ? 'starFilled' : ''}`} />
						{$_('custom_lists.detail.star_count', { values: { count: list.starCount ?? 0 } })}
					</span>
				{/if}
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
		</div>

		<Ads dataAdFormat="auto" />

		<Tabs.Root value={activeTab}>
			<div class="tabsList">
				<Tabs.List>
					<Tabs.Trigger value="levels" on:click={() => switchTab('levels')}>
						{$_('custom_lists.detail.tabs.levels')}
					</Tabs.Trigger>
					{#if canShowLeaderboard}
						<Tabs.Trigger value="leaderboard" on:click={() => switchTab('leaderboard')}>
							{$_('custom_lists.detail.tabs.leaderboard')}
						</Tabs.Trigger>
					{/if}
					{#if canShowMyRecord}
						<Tabs.Trigger value="my-record" on:click={() => switchTab('my-record')}>
							{$_('custom_lists.detail.tabs.my_record')}
						</Tabs.Trigger>
					{/if}
					{#if canShowCommunity}
						<Tabs.Trigger value="community" on:click={() => switchTab('community')}>
							{$_('custom_lists.detail.tabs.community')}
						</Tabs.Trigger>
					{/if}
				</Tabs.List>
			</div>

			<Tabs.Content value="levels">
				<div class="levelsSection">
					<div class="sectionHeader">
						<h2>{$_('custom_lists.detail.levels.heading')}</h2>
						<Badge variant="outline">{list.levelCount}</Badge>
					</div>

					<ListFilter listType="cl" on:filter={handleFilterChange} />

					{#if listItems.length === 0}
						<div class="emptyState slim">
							<h3>{$_('custom_lists.detail.levels.empty_title')}</h3>
							<p>
								{canManageList
									? $_('custom_lists.detail.levels.empty_owner_manage')
									: $_('custom_lists.detail.levels.empty_visitor')}
							</p>
						</div>
					{:else}
						<div class="levels">
							{#each listItems as item, i}
								{#if item.level}
									{@const itemCardType = getItemCardType(item)}
									<LevelCard
										{...toLevelCardProps(item.level, itemCardType, {
											videoID: item.videoID ?? item.level.videoID ?? null,
											rating:
												list.mode === 'rating'
													? (item.rating ?? item.level.rating)
													: item.level.rating,
												top: getListItemTop(item, i),
											minProgress: item.minProgress ?? item.level.minProgress ?? null
										})}
										backgroundColor={list.backgroundColor ?? null}
										borderColor={list.borderColor ?? null}
										type={itemCardType}
										hideTop={list.topEnabled === false}
										hideRating={list.mode === 'top'}
										ratingPrediction={false}
									/>
								{:else}
									<div class="missingLevel" style={getMissingLevelStyle(list)}>
										<div class="missingRank">#{getListItemTop(item, i)}</div>
										<div class="missingContent">
											<h4>
												{$_('custom_lists.detail.levels.unavailable', {
													values: { id: item.levelId }
												})}
											</h4>
											<p>{$_('custom_lists.detail.levels.unavailable_desc')}</p>
										</div>
									</div>
								{/if}
							{/each}
						</div>
						{#if hasMoreLevels(list)}
							<div bind:this={listLevelsSentinel} class="loadMoreSentinel">
								{#if listLevelsLoading}
									<span class="loadMoreStatus">{$_('general.loading')}...</span>
								{/if}
							</div>
						{/if}
						{#if listLevelsError}
							<div class="loadMoreError">
								<p>{listLevelsError}</p>
								<Button variant="outline" size="sm" on:click={retryLoadMoreLevels}>Retry</Button>
							</div>
						{/if}
					{/if}
				</div>
			</Tabs.Content>

			<Tabs.Content value="leaderboard">
				<div class="levelsSection">
					<div class="leaderboardHeader">
						<div>
							<h2>
								{$_('custom_lists.detail.leaderboard.heading', { values: { title: list.title } })}
							</h2>
							<p class="leaderboardSubhead">
								{list.mode === 'top'
									? $_('custom_lists.detail.leaderboard.subhead_top')
									: $_('custom_lists.detail.leaderboard.subhead_rating')}
							</p>
						</div>
						<Badge variant="outline">{leaderboardCount}</Badge>
					</div>

					{#if leaderboardLoading}
						<div class="emptyState slim">{$_('general.loading')}...</div>
					{:else if leaderboardError}
						<div class="emptyState slim">
							<h3>{$_('custom_lists.detail.error_title')}</h3>
							<p>{leaderboardError}</p>
						</div>
					{:else if leaderboard.length === 0}
						<div class="emptyState slim">
							<p>{$_('custom_lists.detail.leaderboard.empty')}</p>
						</div>
					{:else}
						<div class="tableWrapper">
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head class="w-[55px]">{$_('list.tabs.rank')}</Table.Head>
										<Table.Head>{$_('list.tabs.player')}</Table.Head>
										<Table.Head class="w-[100px] text-right">
											{$_('custom_lists.detail.leaderboard.score_label')}
										</Table.Head>
										<Table.Head class="w-[56px] text-right">
											<span class="sr-only"
												>{$_('custom_lists.detail.leaderboard.view_records_label')}</span
											>
										</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each leaderboard as player}
										<Table.Row
											class={`leaderboardRow ${selectedLeaderboardPlayerUid === player.uid ? 'selectedLeaderboardRow' : ''}`}
										>
											<Table.Cell class="font-medium">#{player.rank}</Table.Cell>
											<Table.Cell>
												<div class="playerNameWrapper">
													<PlayerLink {player} rankBadge={getLeaderboardRankBadge(player)} />
												</div>
											</Table.Cell>
											<Table.Cell class="text-right">{formatScore(player.score)}</Table.Cell>
											<Table.Cell class="text-right">
												<Button
													variant="ghost"
													size="icon"
													class="ml-auto h-8 w-8"
													title={$_('custom_lists.detail.leaderboard.view_records_label')}
													aria-label={`${$_('custom_lists.detail.leaderboard.view_records_label')}: ${player.name || player.uid}`}
													aria-pressed={selectedLeaderboardPlayerUid === player.uid}
													on:click={() => selectLeaderboardPlayer(player)}
												>
													<MoreHorizontal class="h-4 w-4" />
												</Button>
											</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						</div>

						<Pagination.Root
							count={leaderboardCount}
							perPage={50}
							page={activeLeaderboardPage}
							let:pages={leaderboardPages}
							let:currentPage={leaderboardCurrentPage}
						>
							<Pagination.Content>
								<Pagination.Item>
									<Pagination.PrevButton
										on:click={() => setLeaderboardPage(Math.max(1, leaderboardCurrentPage - 1))}
									/>
								</Pagination.Item>
								{#each leaderboardPages as p (p.key)}
									{#if p.type === 'ellipsis'}
										<Pagination.Item>
											<Pagination.Ellipsis />
										</Pagination.Item>
									{:else}
										<Pagination.Item isVisible={leaderboardCurrentPage == p.value}>
											<Pagination.Link
												page={p}
												isActive={leaderboardCurrentPage == p.value}
												on:click={() => setLeaderboardPage(p.value)}
											>
												{p.value}
											</Pagination.Link>
										</Pagination.Item>
									{/if}
								{/each}
								<Pagination.Item>
									<Pagination.NextButton on:click={() => setLeaderboardPage(leaderboardCurrentPage + 1)} />
								</Pagination.Item>
							</Pagination.Content>
						</Pagination.Root>

						<Dialog.Root bind:open={recordPointsDialogOpen}>
							{#if selectedLeaderboardPlayer}
								<Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-[900px]">
									<Dialog.Header>
										<Dialog.Title>
											{$_('custom_lists.detail.records.heading', { values: { title: list.title } })}
										</Dialog.Title>
										<Dialog.Description>
											{list.mode === 'top'
												? $_('custom_lists.detail.records.subhead_top')
												: $_('custom_lists.detail.records.subhead_rating')}
										</Dialog.Description>
									</Dialog.Header>

									<div class="recordPointsSection">
										<div class="leaderboardHeader">
											<div class="recordPointsHeading">
												<h3>
													<PlayerLink
														player={selectedLeaderboardPlayer}
														rankBadge={getLeaderboardRankBadge(selectedLeaderboardPlayer)}
													/>
												</h3>
												<div class="recordPointsMeta">
													<span class="metaChip">#{selectedLeaderboardPlayer.rank}</span>
													<span class="metaChip">
														{$_('custom_lists.detail.leaderboard.score_label')}: {formatScore(
															selectedLeaderboardPlayer.score
														)}
													</span>
												</div>
											</div>
											<Badge variant="outline">{recordPointsCount}</Badge>
										</div>

										{#if recordPointsLoading}
											<div class="emptyState slim">{$_('general.loading')}...</div>
										{:else if recordPointsError}
											<div class="emptyState slim">
												<h3>{$_('custom_lists.detail.error_title')}</h3>
												<p>{recordPointsError}</p>
											</div>
										{:else if recordPoints.length === 0}
											<div class="emptyState slim">
												<p>{$_('custom_lists.detail.records.empty')}</p>
											</div>
										{:else}
											<div class="tableWrapper">
												<Table.Root>
													<Table.Header>
														<Table.Row>
															<Table.Head class="w-[70px]"
																>{$_('custom_lists.detail.records.position_label')}</Table.Head
															>
															<Table.Head
																>{$_('custom_lists.detail.records.level_label')}</Table.Head
															>
															<Table.Head class="w-[110px] text-right"
																>{$_('custom_lists.detail.records.progress_label')}</Table.Head
															>
															<Table.Head class="w-[150px] text-right"
																>{$_('custom_lists.detail.records.point_label')}</Table.Head
															>
														</Table.Row>
													</Table.Header>
													<Table.Body>
														{#each recordPoints as entry}
															<Table.Row>
																<Table.Cell class="font-medium">#{entry.no}</Table.Cell>
																<Table.Cell>
																	<div class="recordLevelName">
																		{entry.level?.name ||
																			$_('custom_lists.detail.level_badge', {
																				values: { id: entry.levelId }
																			})}
																	</div>
																	{#if entry.level?.creator}
																		<div class="recordLevelMeta">{entry.level.creator}</div>
																	{/if}
																</Table.Cell>
																<Table.Cell class="text-right"
																	>{formatRecordProgress(entry.progress)}</Table.Cell
																>
																<Table.Cell class="text-right">
																	<div class="recordPointCell">
																		<span>{formatPoint(entry.point)}</span>
																		<Popover.Root>
																			<Popover.Trigger
																				class="recordPointInfo"
																				aria-label={$_(
																					'custom_lists.detail.records.variable_values_label'
																				)}
																			>
																				<Info class="h-3.5 w-3.5" />
																			</Popover.Trigger>
																			<Popover.Content class="recordPointPopover" align="end">
																				<div class="recordPointPopoverTitle">
																					{$_('custom_lists.detail.records.variable_values_label')}
																				</div>
																				<div class="recordPointPopoverGrid">
																					<div>
																						<span>{$_('custom_lists.formula.position_label')}</span>
																						<span
																							>{formatFormulaScopeValue(
																								'position',
																								entry.formulaScope.position
																							)}</span
																						>
																					</div>
																					<div>
																						<span
																							>{$_('custom_lists.formula.level_count_label')}</span
																						>
																						<span
																							>{formatFormulaScopeValue(
																								'levelCount',
																								entry.formulaScope.levelCount
																							)}</span
																						>
																					</div>
																					{#if list.mode === 'top'}
																						<div>
																							<span>{$_('custom_lists.formula.top_label')}</span>
																							<span
																								>{formatFormulaScopeValue(
																									'top',
																									entry.formulaScope.top
																								)}</span
																							>
																						</div>
																					{:else}
																						<div>
																							<span>{$_('custom_lists.formula.rating_label')}</span>
																							<span
																								>{formatFormulaScopeValue(
																									'rating',
																									entry.formulaScope.rating
																								)}</span
																							>
																						</div>
																					{/if}
																					<div>
																						<span
																							>{list.isPlatformer
																								? $_('custom_lists.formula.time_label')
																								: $_('custom_lists.formula.progress_label')}</span
																						>
																						<span
																							>{formatFormulaScopeValue(
																								'progress',
																								entry.formulaScope.progress
																							)}</span
																						>
																					</div>
																					<div>
																						<span>
																							{list.isPlatformer
																								? $_('custom_lists.formula.base_time_label')
																								: $_('custom_lists.formula.min_progress_label')}
																						</span>
																						<span
																							>{formatFormulaScopeValue(
																								'minProgress',
																								entry.formulaScope.minProgress
																							)}</span
																						>
																					</div>
																				</div>
																			</Popover.Content>
																		</Popover.Root>
																	</div>
																</Table.Cell>
															</Table.Row>
														{/each}
													</Table.Body>
												</Table.Root>
											</div>

											<Pagination.Root
												count={recordPointsCount}
												perPage={50}
												page={recordPointsPage}
												let:pages={recordPointsPages}
												let:currentPage={recordPointsCurrentPage}
											>
												<Pagination.Content>
													<Pagination.Item>
														<Pagination.PrevButton
															on:click={() => setRecordPointsPage(Math.max(1, recordPointsCurrentPage - 1))}
														/>
													</Pagination.Item>
													{#each recordPointsPages as p (p.key)}
														{#if p.type === 'ellipsis'}
															<Pagination.Item>
																<Pagination.Ellipsis />
															</Pagination.Item>
														{:else}
															<Pagination.Item isVisible={recordPointsCurrentPage == p.value}>
																<Pagination.Link
																	page={p}
																	isActive={recordPointsCurrentPage == p.value}
																	on:click={() => setRecordPointsPage(p.value)}
																>
																	{p.value}
																</Pagination.Link>
															</Pagination.Item>
														{/if}
													{/each}
													<Pagination.Item>
														<Pagination.NextButton
															on:click={() => setRecordPointsPage(recordPointsCurrentPage + 1)}
														/>
													</Pagination.Item>
												</Pagination.Content>
											</Pagination.Root>
										{/if}
									</div>
								</Dialog.Content>
							{/if}
						</Dialog.Root>
					{/if}
				</div>
			</Tabs.Content>

			{#if canShowMyRecord}
				<Tabs.Content value="my-record">
					<div class="levelsSection">
						<div class="leaderboardHeader">
							<div>
								<h2>{$_('custom_lists.detail.records.my_record_heading')}</h2>
								<p class="leaderboardSubhead">
									{list.mode === 'top'
										? $_('custom_lists.detail.records.subhead_top')
										: $_('custom_lists.detail.records.subhead_rating')}
								</p>
							</div>
							<Badge variant="outline">{myRecordPointsCount}</Badge>
						</div>

						{#if myRecordPointsLoading}
							<div class="emptyState slim">{$_('general.loading')}...</div>
						{:else if myRecordPointsError}
							<div class="emptyState slim">
								<h3>{$_('custom_lists.detail.error_title')}</h3>
								<p>{myRecordPointsError}</p>
							</div>
						{:else if myRecordPoints.length === 0}
							<div class="emptyState slim">
								<p>{$_('custom_lists.detail.records.empty')}</p>
							</div>
						{:else}
							<div class="tableWrapper">
								<Table.Root>
									<Table.Header>
										<Table.Row>
											<Table.Head class="w-[70px]"
												>{$_('custom_lists.detail.records.position_label')}</Table.Head
											>
											<Table.Head>{$_('custom_lists.detail.records.level_label')}</Table.Head>
											<Table.Head class="w-[110px] text-right"
												>{$_('custom_lists.detail.records.progress_label')}</Table.Head
											>
											<Table.Head class="w-[150px] text-right"
												>{$_('custom_lists.detail.records.point_label')}</Table.Head
											>
										</Table.Row>
									</Table.Header>
									<Table.Body>
										{#each myRecordPoints as entry}
											<Table.Row>
												<Table.Cell class="font-medium">#{entry.no}</Table.Cell>
												<Table.Cell>
													<div class="recordLevelName">
														{entry.level?.name ||
															$_('custom_lists.detail.level_badge', {
																values: { id: entry.levelId }
															})}
													</div>
													{#if entry.level?.creator}
														<div class="recordLevelMeta">{entry.level.creator}</div>
													{/if}
												</Table.Cell>
												<Table.Cell class="text-right"
													>{formatRecordProgress(entry.progress)}</Table.Cell
												>
												<Table.Cell class="text-right">
													<div class="recordPointCell">
														<span>{formatPoint(entry.point)}</span>
														<Popover.Root>
															<Popover.Trigger
																class="recordPointInfo"
																aria-label={$_('custom_lists.detail.records.variable_values_label')}
															>
																<Info class="h-3.5 w-3.5" />
															</Popover.Trigger>
															<Popover.Content class="recordPointPopover" align="end">
																<div class="recordPointPopoverTitle">
																	{$_('custom_lists.detail.records.variable_values_label')}
																</div>
																<div class="recordPointPopoverGrid">
																	<div>
																		<span>{$_('custom_lists.formula.position_label')}</span>
																		<span>{formatFormulaScopeValue('position', entry.formulaScope.position)}</span>
																	</div>
																	<div>
																		<span>{$_('custom_lists.formula.level_count_label')}</span>
																		<span>{formatFormulaScopeValue('levelCount', entry.formulaScope.levelCount)}</span>
																	</div>
																	{#if list.mode === 'top'}
																		<div>
																			<span>{$_('custom_lists.formula.top_label')}</span>
																			<span>{formatFormulaScopeValue('top', entry.formulaScope.top)}</span>
																		</div>
																	{:else}
																		<div>
																			<span>{$_('custom_lists.formula.rating_label')}</span>
																			<span>{formatFormulaScopeValue('rating', entry.formulaScope.rating)}</span>
																		</div>
																	{/if}
																	<div>
																		<span>{list.isPlatformer ? $_('custom_lists.formula.time_label') : $_('custom_lists.formula.progress_label')}</span>
																		<span>{formatFormulaScopeValue('progress', entry.formulaScope.progress)}</span>
																	</div>
																	<div>
																		<span>
																			{list.isPlatformer
																				? $_('custom_lists.formula.base_time_label')
																				: $_('custom_lists.formula.min_progress_label')}
																		</span>
																		<span>{formatFormulaScopeValue('minProgress', entry.formulaScope.minProgress)}</span>
																	</div>
																</div>
															</Popover.Content>
														</Popover.Root>
													</div>
												</Table.Cell>
											</Table.Row>
										{/each}
									</Table.Body>
								</Table.Root>
							</div>

							<Pagination.Root
								count={myRecordPointsCount}
								perPage={50}
								page={myRecordPointsPage}
								let:pages={myRecordPointsPages}
								let:currentPage={myRecordPointsCurrentPage}
							>
								<Pagination.Content>
									<Pagination.Item>
										<Pagination.PrevButton
											on:click={() => setMyRecordPointsPage(Math.max(1, myRecordPointsCurrentPage - 1))}
										/>
									</Pagination.Item>
									{#each myRecordPointsPages as p (p.key)}
										{#if p.type === 'ellipsis'}
											<Pagination.Item>
												<Pagination.Ellipsis />
											</Pagination.Item>
										{:else}
											<Pagination.Item isVisible={myRecordPointsCurrentPage == p.value}>
												<Pagination.Link
													page={p}
													isActive={myRecordPointsCurrentPage == p.value}
													on:click={() => setMyRecordPointsPage(p.value)}
												>
													{p.value}
												</Pagination.Link>
											</Pagination.Item>
										{/if}
									{/each}
									<Pagination.Item>
										<Pagination.NextButton
											on:click={() => setMyRecordPointsPage(myRecordPointsCurrentPage + 1)}
										/>
									</Pagination.Item>
								</Pagination.Content>
							</Pagination.Root>
						{/if}
					</div>
				</Tabs.Content>
			{/if}

			{#if canShowCommunity}
				<Tabs.Content value="community">
					<div class="levelsSection">
						<div class="sectionHeader sectionHeaderWrap">
							<div class="sectionTitleRow">
								<h2>{$_('custom_lists.detail.tabs.community')}</h2>
								<Badge variant="outline">{relatedPosts.length}</Badge>
							</div>
							{#if $user.loggedIn}
								<Button variant="outline" size="sm" on:click={openCreatePost}>
									<MessageSquare class="mr-2 h-4 w-4" />
									{$_('custom_lists.actions.post_about')}
								</Button>
							{/if}
						</div>

						{#if loadingRelatedPosts}
							<div class="emptyState slim">{$_('general.loading')}...</div>
						{:else if relatedPosts.length === 0}
							<div class="emptyState slim">
								<p>{$_('custom_lists.detail.community_empty')}</p>
							</div>
						{:else}
							<div class="relatedGrid">
								{#each relatedPosts as post}
									<CommunityPostCard {post} compact />
								{/each}
							</div>
						{/if}
					</div>
				</Tabs.Content>
			{/if}
		</Tabs.Root>
	{/if}
</div>

{#if showScrollToTop}
	<button
		class="scrollToTop"
		on:click={scrollToTop}
		title={$_('list_filter.scroll_to_top') || 'Scroll to top'}
		transition:fly={{ y: 20, duration: 300 }}
	>
		<ChevronUp size={24} />
	</button>
{/if}

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

	/* Toolbar */
	.toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
	}

	.toolbarActions {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	/* Hero */
	.hero {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 16px;
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

	.heroText {
		flex: 1;
		min-width: 0;
	}

	.heroTop {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
	}

	.heroTop h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 700;
		letter-spacing: -0.01em;
	}

	:global(.heroStarButton) {
		flex-shrink: 0;
		margin: -4px -6px 0 0;
		color: hsl(var(--muted-foreground));
	}

	:global(.heroStarButtonStarred) {
		color: #eab308;
		background: rgba(234, 179, 8, 0.12);
	}

	.heroDesc {
		margin: 6px 0 0;
		font-size: 0.95rem;
		color: var(--custom-surface-foreground, hsl(var(--foreground)));
		line-height: 1.5;
	}

	.heroDesc.muted {
		color: var(--custom-surface-muted, hsl(var(--muted-foreground)));
		font-style: italic;
	}

	.heroMeta {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.metaChip {
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

	.metaOwner {
		font-weight: 600;
		color: var(--custom-surface-foreground, hsl(var(--foreground)));
	}

	.metaOwner :global(.wrapper) {
		gap: 4px;
	}

	:global(.starFilled) {
		fill: currentColor;
	}

	.tabsList {
		align-self: flex-start;
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

	/* Levels */
	.levelsSection {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.sectionHeaderWrap {
		flex-wrap: wrap;
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

	.leaderboardHeader {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 12px;
		flex-wrap: wrap;
	}

	.leaderboardHeader h2 {
		margin: 0;
		font-size: 1.2rem;
		font-weight: 600;
	}

	.leaderboardSubhead {
		margin: 6px 0 0;
		color: hsl(var(--muted-foreground));
		font-size: 0.9rem;
	}

	.levels {
		display: grid;
		align-items: start;
		gap: 10px;
		grid-template-columns: repeat(2, 1fr);
	}

	.relatedGrid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 12px;
	}

	.playerNameWrapper {
		display: flex;
		gap: 10px;
	}

	.recordPointsSection {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding-top: 8px;
	}

	.recordPointsHeading {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.recordPointsHeading h3 {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 600;
	}

	.recordPointsMeta {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.recordLevelName {
		font-weight: 600;
	}

	.recordLevelMeta {
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
	}

	.tableWrapper {
		margin-bottom: 8px;
	}

	.recordPointCell {
		display: inline-flex;
		align-items: center;
		justify-content: flex-end;
		gap: 6px;
	}

	:global(.recordPointInfo) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: hsl(var(--muted-foreground));
		cursor: pointer;
	}

	:global(.recordPointPopover) {
		width: min(22rem, calc(100vw - 2rem));
		background: hsl(var(--popover));
		color: hsl(var(--popover-foreground));
	}

	.recordPointPopoverTitle {
		font-size: 0.8rem;
		font-weight: 600;
		margin-bottom: 8px;
	}

	.recordPointPopoverGrid {
		display: grid;
		gap: 8px;
	}

	.recordPointPopoverGrid div {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		font-size: 0.8rem;
	}

	.recordPointPopoverGrid div span:first-child {
		color: hsl(var(--muted-foreground));
	}

	:global(.leaderboardRow) {
		transition: background-color 0.18s ease;
	}

	:global(.selectedLeaderboardRow) {
		background: hsl(var(--muted) / 0.5);
	}

	.loadMoreSentinel {
		min-height: 24px;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.loadMoreStatus {
		font-size: 0.85rem;
		color: hsl(var(--muted-foreground));
	}

	.loadMoreError {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	.loadMoreError p {
		margin: 0;
		font-size: 0.85rem;
		color: hsl(var(--destructive));
	}

	/* Missing level card */
	.missingLevel {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px 18px;
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 10px;
	}

	.missingRank {
		font-size: 0.85rem;
		font-weight: 700;
		color: hsl(var(--muted-foreground));
		min-width: 28px;
		text-align: center;
		flex-shrink: 0;
	}

	.missingContent h4 {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 600;
	}

	.missingContent p {
		margin: 2px 0 0;
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
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
	@media (max-width: 900px) {
		.levels {
			grid-template-columns: 1fr;
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

		.heroTop h1 {
			font-size: 1.25rem;
		}

		.toolbar {
			flex-direction: column;
			align-items: stretch;
		}

		.sectionHeader {
			flex-direction: column;
			align-items: flex-start;
		}
	}

	.scrollToTop {
		position: fixed;
		bottom: 24px;
		right: 24px;
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
		transition: all 0.3s ease;
		z-index: 999;
		opacity: 0.9;
	}

	.scrollToTop:hover {
		transform: translateY(-4px);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.6);
		opacity: 1;
	}

	.scrollToTop:active {
		transform: translateY(-2px);
	}
</style>
