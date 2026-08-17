<script lang="ts">
	import {
		ArrowRight,
		BadgeCheck,
		CalendarDays,
		Clock3,
		Flame,
		Gamepad2,
		Layers3,
		LockKeyhole,
		Radio,
		Shield,
		Sparkles,
		Star,
		Swords,
		Target,
		Trophy,
		Users
	} from 'lucide-svelte';
	import { browser } from '$app/environment';
	import { _, locale } from 'svelte-i18n';
	import { user } from '$lib/client';
	import CommunityPostCard from '$lib/components/communityPostCard.svelte';
	import OnboardingProgress from '$lib/components/homepage/OnboardingProgress.svelte';
	import QuickPostComposer from '$lib/components/homepage/QuickPostComposer.svelte';
	import FriendLevelCard from '$lib/components/homepage/FriendLevelCard.svelte';
	import SocialRightRail from '$lib/components/homepage/SocialRightRail.svelte';
	import OnboardingModal from '$lib/components/OnboardingModal.svelte';
	import ClanRecordCard from '$lib/components/clan/ClanRecordCard.svelte';
	import ClanTag from '$lib/components/clan/ClanTag.svelte';
	import { isActive } from '$lib/client/isSupporterActive';

	export let data: any;

	type FeedItem = {
		kind: 'community' | 'event' | 'level' | 'promo' | 'pvp' | 'record-progress' | 'supporter' | 'tournament';
		key: string;
		data: any;
	};
	type HomepageRequestMode = 'auth' | 'public';
	type HomeFeedTab = 'for-you' | 'friends' | 'clan';
	type ClanFeedItem = {
		kind: 'record' | 'level' | 'community';
		key: string;
		data: any;
		timestamp: number;
	};
	type FriendFeedItem = {
		kind: 'record' | 'level' | 'community';
		key: string;
		data: any;
		timestamp: number;
	};

	const COMMUNITY_PAGE_SIZE = 8;

	const siteUrl = (import.meta.env.VITE_SITE_URL || 'https://gdlisthub.dev').replace(
		/\/$/,
		''
	);
	const homepageUrl = siteUrl || 'https://gdlisthub.dev';
	const officialListMeta: Record<string, { title: string; href: string; }> = {
		dl: { title: 'Demon List', href: '/lists/dl' },
		fl: { title: 'Featured List', href: '/lists/fl' },
		pl: { title: 'Platformer List', href: '/lists/pl' },
		cl: { title: 'Challenge List', href: '/lists/cl' }
	};

	$: homepageTitle = $_('head.site_name');
	$: homepageDescription = $_('head.descriptions.homepage');

	let showOnboardingModal = false;
	let activeFeedTab: HomeFeedTab = 'for-you';
	let homeData: any = data?.homeData || null;
	let homepageRequestMode: HomepageRequestMode | null = null;
	let loadedFeedItems: FeedItem[] = [];
	let feedCursor: { before: string; beforeKey: string; } | null = null;
	let feedHasMore = false;
	let feedLoadingMore = false;
	let feedLoadError = false;
	let feedInitialized = false;

	$: if (data?.homeData) {
		homeData = data.homeData;
	}

	$: if (browser && $user.checked) {
		ensureHomepageLoaded($user.loggedIn);
	}

	$: events = homeData?.events ?? null;
	$: communityPosts = homeData?.communityPosts ?? null;
	$: officialTournaments = homeData?.officialTournaments ?? null;
	$: topSupporters = homeData?.topSupporters ?? [];
	$: pvp = homeData?.pvp ?? null;
	$: feedSeed = Number(homeData?.feedSeed ?? 1);
	$: activeSeason = homeData?.activeSeason ?? null;
	$: battlepassProgress = homeData?.battlepassProgress ?? null;
	$: latestUnverifiedRecord = homeData?.latestUnverifiedRecord ?? null;
	$: friendFeed = homeData?.friendFeed ?? null;
	$: friendActivity = buildFriendActivity(friendFeed);
	$: clanFeed = homeData?.clanFeed ?? null;
	$: clanBoosted = isActive(clanFeed?.clan?.boostedUntil);
	$: clanActivity = buildClanActivity(clanFeed);
	$: levelFeed = homeData?.levelFeed?.length
		? homeData.levelFeed
		: buildLegacyLevelFeed(homeData?.levels);
	$: mixedFeed = buildMixedFeed({
		levels: levelFeed ?? [],
		posts: communityPosts ?? [],
		events: events ?? [],
		tournaments: officialTournaments ?? [],
		supporters: topSupporters,
		pvp,
		activeSeason,
		battlepassProgress,
		latestUnverifiedRecord,
		seed: feedSeed
	});
	$: mixedContentItems = mixedFeed.filter(
		(item) => item.kind === 'community'
			|| item.kind === 'level'
			|| item.kind === 'event'
			|| item.kind === 'tournament'
	);
	$: mixedScrollableItems = mixedContentItems.filter(
		(item) => item.kind === 'community' || item.kind === 'level'
	);
	$: mixedScrollableKeys = new Set(mixedScrollableItems.map((item) => item.key));
	$: feedContinuationItems = mergeFeedItems(loadedFeedItems);

	function ensureHomepageLoaded(authenticated: boolean) {
		const mode: HomepageRequestMode = authenticated ? 'auth' : 'public';

		if (homepageRequestMode === mode) {
			return;
		}

		homepageRequestMode = mode;
		void loadHomepage(mode);
	}

	async function loadHomepage(mode: HomepageRequestMode) {
		const headers: Record<string, string> = {};

		if (mode === 'auth') {
			try {
				headers.Authorization = `Bearer ${await $user.token()}`;
			} catch {
				if (homepageRequestMode === mode && homeData === null) {
					homeData = {};
					initializeFeedContinuation();
				}

				return;
			}
		}

		try {
			const response = await fetch(`${import.meta.env.VITE_API_URL}/homepage`, {
				headers
			});

			if (!response.ok) {
				throw new Error('Failed to load homepage');
			}

			const loadedData = await response.json();

			if (homepageRequestMode !== mode) {
				return;
			}

			homeData = {
				...loadedData,
				feedSeed: loadedData?.feedSeed
					?? Math.floor(Math.random() * 2_147_483_647)
			};
			initializeFeedContinuation();
		} catch {
			if (homepageRequestMode === mode && homeData === null) {
				homeData = {};
				initializeFeedContinuation();
			}
		}
	}

	function initializeFeedContinuation() {
		loadedFeedItems = [];
		feedCursor = null;
		feedHasMore = true;
		feedLoadingMore = false;
		feedLoadError = false;
		feedInitialized = true;
	}

	async function loadMoreFeed() {
		if (!feedInitialized || feedLoadingMore || !feedHasMore) {
			return;
		}

		feedLoadingMore = true;
		feedLoadError = false;
		const headers: Record<string, string> = {};

		if ($user.loggedIn) {
			try {
				headers.Authorization = `Bearer ${await $user.token()}`;
			} catch {}
		}

		try {
			const cursor = feedCursor ?? getFeedCursor(mixedContentItems);

			if (!cursor) {
				feedHasMore = false;

				return;
			}

			const params = new URLSearchParams({
				limit: String(COMMUNITY_PAGE_SIZE),
				before: cursor.before,
				beforeKey: cursor.beforeKey
			});
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/homepage/feed?${params}`,
				{ headers }
			);

			if (!response.ok) {
				throw new Error('Failed to load feed');
			}

			const result = await response.json();
			const incoming: FeedItem[] = Array.isArray(result?.data) ? result.data : [];
			const knownKeys = new Set([
				...mixedScrollableKeys,
				...loadedFeedItems.map((item) => item.key)
			]);
			const uniqueItems = incoming.filter((item) => !knownKeys.has(item.key));

			loadedFeedItems = [...loadedFeedItems, ...uniqueItems];
			feedCursor = result?.nextCursor ?? null;
			feedHasMore = Boolean(result?.hasMore && result?.nextCursor);

			const incomingPostIds = incoming
				.filter((item) => item.kind === 'community')
				.map((item) => item.data?.id)
				.filter(Boolean);

			if (headers.Authorization && incomingPostIds.length) {
				void fetch(`${import.meta.env.VITE_API_URL}/community/posts/views`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: headers.Authorization
					},
					body: JSON.stringify({ postIds: incomingPostIds })
				})
					.catch(() => {});
			}
		} catch {
			feedLoadError = true;
		} finally {
			feedLoadingMore = false;
		}
	}

	function observeFeedEnd(node: HTMLElement) {
		if (!browser || typeof IntersectionObserver === 'undefined') {
			return {};
		}

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) {
					void loadMoreFeed();
				}
			},
			{ rootMargin: '500px 0px' }
		);

		observer.observe(node);

		return {
			destroy() {
				observer.disconnect();
			}
		};
	}

	function tr(english: string, vietnamese: string) {
		return $locale === 'vi' ? vietnamese : english;
	}

	function buildLegacyLevelFeed(levels: Record<string, any[]> | null | undefined) {
		if (!levels) {
			return null;
		}

		const seen = new Set<number>();

		return Object.entries(levels)
			.flatMap(([listType, entries]) => {
				const source = officialListMeta[listType] ?? {
					title: 'Official List',
					href: '/lists'
				};

				return (entries || []).map((level) => ({
					level,
					listType,
					sourceKind: 'official',
					sourceTitle: source.title,
					sourceHref: source.href,
					addedAt: level?.created_at
				}));
			})
			.sort(
				(left, right) =>
					new Date(right.addedAt || 0)
						.getTime()
						- new Date(left.addedAt || 0)
							.getTime()
			)
			.filter((entry) => {
				const id = Number(entry.level?.id);

				if (!id || seen.has(id)) {
					return false;
				}

				seen.add(id);

				return true;
			})
			.slice(0, 12);
	}

	function buildClanActivity(value: any): ClanFeedItem[] {
		return [
			...(value?.records || []).map((record: any, index: number) => ({
				kind: 'record' as const,
				key: `clan-record-${record.id ?? index}`,
				data: record,
				timestamp: normalizeTimestamp(record.timestamp ?? record.createdAt)
			})),
			...(value?.levels || []).map((level: any, index: number) => ({
				kind: 'level' as const,
				key: `clan-level-${level.id ?? index}`,
				data: level,
				timestamp: normalizeTimestamp(level.created_at)
			})),
			...(value?.communityPosts || []).map((post: any, index: number) => ({
				kind: 'community' as const,
				key: `clan-community-${post.id ?? index}`,
				data: post,
				timestamp: normalizeTimestamp(post.createdAt ?? post.created_at)
			}))
		].sort((left, right) => right.timestamp - left.timestamp);
	}

	function buildFriendActivity(value: any): FriendFeedItem[] {
		return [
			...(value?.records || []).map((record: any, index: number) => ({
				kind: 'record' as const,
				key: `friend-record-${record.id ?? index}`,
				data: record,
				timestamp: normalizeTimestamp(record.timestamp ?? record.createdAt)
			})),
			...(value?.levels || []).map((level: any, index: number) => ({
				kind: 'level' as const,
				key: `friend-level-${level.id ?? index}`,
				data: level,
				timestamp: normalizeTimestamp(level.created_at)
			})),
			...(value?.communityPosts || []).map((post: any, index: number) => ({
				kind: 'community' as const,
				key: `friend-community-${post.id ?? index}`,
				data: post,
				timestamp: normalizeTimestamp(post.createdAt ?? post.created_at)
			}))
		]
			.sort((left, right) => right.timestamp - left.timestamp)
			.slice(0, 30);
	}

	function normalizeTimestamp(value: string | number | null | undefined) {
		if (!value) {
			return 0;
		}

		const numeric = Number(value);
		const parsed = Number.isFinite(numeric)
			? new Date(numeric < 10_000_000_000 ? numeric * 1000 : numeric)
			: new Date(value);
		const timestamp = parsed.getTime();

		return Number.isFinite(timestamp) ? timestamp : 0;
	}

	function buildScrollableFeedItems(levels: any[], posts: any[]): FeedItem[] {
		return [
			...levels.map((entry, index) => ({
				kind: 'level' as const,
				key: `level-${entry.feedKey ?? entry.id ?? entry.level?.id ?? index}`,
				data: entry
			})),
			...posts.map((entry, index) => ({
				kind: 'community' as const,
				key: `community-${entry.id ?? index}`,
				data: entry
			}))
		].sort((left, right) => {
			const timeDifference = feedItemTimestamp(right) - feedItemTimestamp(left);

			return timeDifference || left.key.localeCompare(right.key);
		});
	}

	function mergeFeedItems(...groups: FeedItem[][]) {
		const seen = new Set<string>();

		return groups.flat()
			.filter((item) => {
				if (seen.has(item.key)) {
					return false;
				}

				seen.add(item.key);

				return true;
			})
			.sort((left, right) => {
				const timeDifference = feedItemTimestamp(right) - feedItemTimestamp(left);

				return timeDifference || left.key.localeCompare(right.key);
			});
	}

	function getFeedCursor(items: FeedItem[]) {
		const lastItem = mergeFeedItems(items)
			.at(-1);

		if (!lastItem) {
			return null;
		}

		return {
			before: new Date(feedItemTimestamp(lastItem))
				.toISOString(),
			beforeKey: lastItem.key
		};
	}

	function buildMixedFeed(input: {
		levels: any[];
		posts: any[];
		events: any[];
		tournaments: any[];
		supporters: any[];
		pvp: any;
		activeSeason: any;
		battlepassProgress: any;
		latestUnverifiedRecord: any;
		seed: number;
	}) {
		const contentItems: FeedItem[] = [
			...buildScrollableFeedItems(input.levels, input.posts),
			...input.events.map((entry, index) => ({
				kind: 'event' as const,
				key: `event-${entry.id ?? index}`,
				data: entry
			})),
			...input.tournaments.map((entry, index) => ({
				kind: 'tournament' as const,
				key: `tournament-${entry.id ?? index}`,
				data: entry
			}))
		]
			.sort((left, right) => {
				const timeDifference = feedItemTimestamp(right) - feedItemTimestamp(left);

				return timeDifference || left.key.localeCompare(right.key);
			})
			.slice(0, 15);
		const promotedItems: FeedItem[] = [
			{ kind: 'pvp', key: 'pvp-pulse', data: input.pvp }
		];

		if (input.supporters.length) {
			promotedItems.push({
				kind: 'supporter',
				key: 'top-supporters',
				data: input.supporters.slice(0, 3)
			});
		}

		promotedItems.push({
			kind: 'promo',
			key: 'gdvn-promo',
			data: {
				activeSeason: input.activeSeason,
				battlepassProgress: input.battlepassProgress
			}
		});

		const mixedItems = insertPromotedItems(contentItems, promotedItems, input.seed);

		return input.latestUnverifiedRecord
			? [{
				kind: 'record-progress' as const,
				key: `record-progress-${input.latestUnverifiedRecord.id}`,
				data: input.latestUnverifiedRecord
			}, ...mixedItems]
			: mixedItems;
	}

	function feedItemTimestamp(item: FeedItem) {
		const value = item.kind === 'level'
			? item.data?.addedAt ?? item.data?.level?.created_at
			: item.kind === 'community'
			? item.data?.createdAt ?? item.data?.created_at
			: item.kind === 'event'
			? item.data?.start ?? item.data?.createdAt ?? item.data?.created_at
			: item.data?.created_at
				?? item.data?.createdAt
				?? item.data?.registrationStart
				?? item.data?.start;
		const timestamp = new Date(value || 0)
			.getTime();

		return Number.isFinite(timestamp) ? timestamp : 0;
	}

	function insertPromotedItems(content: FeedItem[], promoted: FeedItem[], seed: number) {
		const result = [...content];
		const slots = seededShuffle(
			Array.from(
				{ length: Math.max(1, content.length) },
				(_, index) => Math.min(content.length, index + 1)
			),
			seed ^ 0x9e3779b9
		)
			.slice(0, promoted.length);
		const placements = seededShuffle(promoted, seed)
			.map((item, index) => ({
				item,
				slot: slots[index] ?? content.length
			}))
			.sort((left, right) => left.slot - right.slot);

		placements.forEach((placement, index) => {
			result.splice(placement.slot + index, 0, placement.item);
		});

		return result;
	}

	function seededShuffle<T>(source: T[], seed: number) {
		const shuffled = [...source];
		let state = (Math.floor(seed) || 1) >>> 0;

		for (let index = shuffled.length - 1; index > 0; index -= 1) {
			state = (state + 0x6d2b79f5) >>> 0;
			let value = state;
			value = Math.imul(value ^ (value >>> 15), value | 1);
			value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
			const random = ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
			const swapIndex = Math.floor(random * (index + 1));
			[shuffled[index], shuffled[swapIndex]] = [
				shuffled[swapIndex],
				shuffled[index]
			];
		}

		return shuffled;
	}

	function timeAgo(value: string | null | undefined) {
		if (!value) {
			return tr('Recently', 'Gần đây');
		}

		const seconds = Math.max(
			0,
			Math.floor((Date.now() - new Date(value)
				.getTime()) / 1000)
		);

		if (!Number.isFinite(seconds) || seconds < 60) {
			return tr('Just now', 'Vừa xong');
		}

		const minutes = Math.floor(seconds / 60);

		if (minutes < 60) {
			return `${minutes}m`;
		}

		const hours = Math.floor(minutes / 60);

		if (hours < 24) {
			return `${hours}h`;
		}

		const days = Math.floor(hours / 24);

		return days < 30
			? `${days}d`
			: new Date(value)
				.toLocaleDateString($locale || 'en');
	}

	function formatTimeLeft(end: string | null | undefined) {
		if (!end) {
			return tr('Open-ended', 'Không giới hạn');
		}

		const remaining = new Date(end)
			.getTime() - Date.now();

		if (!Number.isFinite(remaining) || remaining <= 0) {
			return tr('Ending soon', 'Sắp kết thúc');
		}

		const days = Math.floor(remaining / 86_400_000);
		const hours = Math.floor((remaining % 86_400_000) / 3_600_000);

		return days > 0
			? tr(`${days}d ${hours}h left`, `Còn ${days} ngày ${hours} giờ`)
			: tr(`${hours}h left`, `Còn ${hours} giờ`);
	}

	function formatNumber(value: unknown) {
		const number = Number(value);

		return Number.isFinite(number)
			? new Intl.NumberFormat($locale === 'vi' ? 'vi-VN' : 'en-US', {
				maximumFractionDigits: 0
			})
				.format(number)
			: '—';
	}

	function getLevelThumbnail(level: any) {
		return level?.videoID
			? `https://img.youtube.com/vi/${level.videoID}/maxresdefault.jpg`
			: `https://levelthumbs.prevter.me/thumbnail/${level?.id}/small`;
	}

	function getRecordLevel(record: any) {
		return Array.isArray(record?.levels) ? record.levels[0] : record?.levels;
	}

	function isCompletedRecord(record: any) {
		const level = getRecordLevel(record);

		return Boolean(level?.isPlatformer) || Number(record?.progress) >= 100;
	}

	function formatRecordProgress(record: any) {
		const value = Number(record?.progress);
		const level = getRecordLevel(record);

		if (!Number.isFinite(value)) {
			return '—';
		}

		if (!level?.isPlatformer) {
			return `${Math.min(100, Math.max(0, value))}%`;
		}

		const minutes = Math.floor(value / 60_000);
		const seconds = Math.floor((value % 60_000) / 1000);
		const milliseconds = Math.floor(value % 1000);

		return `${minutes}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
	}

	function useLevelThumbnailFallback(event: Event, levelId: number | string) {
		const image = event.currentTarget as HTMLImageElement;
		const fallback = `https://levelthumbs.prevter.me/thumbnail/${levelId}/small`;

		if (image.src !== fallback) {
			image.src = fallback;
		}
	}

	function getEventThumbnail(event: any) {
		return event?.imgUrl || `https://cdn.gdlisthub.dev/event-banner/${event?.id}.webp`;
	}

	function tournamentStatus(status: string) {
		const labels: Record<string, [string, string]> = {
			registration_open: ['Registration open', 'Đang mở đăng ký'],
			registration_closed: ['Registration closed', 'Đã đóng đăng ký'],
			ready: ['Starting soon', 'Sắp bắt đầu'],
			ongoing: ['Live now', 'Đang diễn ra']
		};
		const label = labels[status] ?? ['Official tournament', 'Giải đấu chính thức'];

		return tr(label[0], label[1]);
	}

	function tournamentFormat(format: string) {
		return format === 'contest'
			? tr('Progress contest', 'Đua tiến độ')
			: tr('Single elimination', 'Loại trực tiếp');
	}

</script>

<svelte:head>
  <title>{homepageTitle}</title>
  <meta name="description" content={homepageDescription} />
  <link rel="canonical" href={homepageUrl} />
  <meta property="og:title" content={homepageTitle} />
  <meta property="og:type" content="website" />
  <meta property="og:url" content={homepageUrl} />
  <meta property="og:description" content={homepageDescription} />
  <meta property="og:site_name" content={$_('head.site_name')} />
  <meta property="og:image" content={`${homepageUrl}/og.png`} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta
    property="og:image:alt"
    content="GDListHub Social — new levels, live events, PvP, and official tournaments in one feed"
  />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={homepageTitle} />
  <meta name="twitter:description" content={homepageDescription} />
  <meta name="twitter:image" content={`${homepageUrl}/og.png`} />
  <meta
    name="twitter:image:alt"
    content="GDListHub Social — play what’s happening now"
  />
</svelte:head>

<main class="social-home">
  <div class="feed-layout">
    <section class="feed-column" aria-label={tr('Home feed', 'Bảng tin')}>
      <div class="feed-tabs" aria-label={tr('Home feed', 'Bảng tin')}>
        <button
          type="button"
          class="feed-tab"
          class:active={activeFeedTab === 'for-you'}
          on:click={() => (activeFeedTab = 'for-you')}
        >
          <Flame size={16} />
          {tr('For you', 'Dành cho bạn')}
	        </button>
	        <button
	          type="button"
	          class="feed-tab"
	          class:active={activeFeedTab === 'friends'}
	          on:click={() => (activeFeedTab = 'friends')}
	        >
	          <Users size={16} />
	          {tr('Friends', 'Bạn bè')}
	          {#if friendActivity.length}
	            <span class="tab-dot" aria-label={tr('New friend activity', 'Hoạt động mới từ bạn bè')}></span>
	          {/if}
	        </button>
	        <button
	          type="button"
          class="feed-tab"
          class:active={activeFeedTab === 'clan'}
          on:click={() => (activeFeedTab = 'clan')}
        >
          <Shield size={16} />
          {tr('Clan', 'Bang hội')}
          {#if clanBoosted && (clanFeed?.communityPosts?.length || clanFeed?.records?.length || clanFeed?.levels?.length)}
            <span class="tab-dot" aria-label={tr('New clan activity', 'Hoạt động bang hội mới')}></span>
          {/if}
        </button>
      </div>

      {#if activeFeedTab === 'for-you'}
        <QuickPostComposer />

        {#if $user.loggedIn && $user.data && $user.data.onboarding_done === false}
          <div class="onboarding-feed-item">
            <OnboardingProgress
              step={$user.data.onboarding_step ?? 1}
              onResume={() => (showOnboardingModal = true)}
            />
          </div>
          <OnboardingModal bind:open={showOnboardingModal} />
        {/if}

      <div id="for-you-panel">
        {#if homeData === null}
          <div class="feed-stream" aria-label={tr('Loading feed', 'Đang tải bảng tin')}>
            {#each { length: 5 } as _}
              <div class="feed-card skeleton-card" aria-hidden="true">
                <div class="skeleton-row">
                  <span class="skeleton-avatar"></span>
                  <span class="skeleton-line medium"></span>
                </div>
                <span class="skeleton-line wide"></span>
                <span class="skeleton-media"></span>
              </div>
            {/each}
          </div>
        {:else}
	          <div class="feed-stream">
	            {#each mixedFeed as item (item.key)}
	              {#if item.kind === 'record-progress'}
	                {@const record = item.data}
	                {@const level = getRecordLevel(record)}
	                {@const completed = isCompletedRecord(record)}
	                <article class="feed-card record-progress-post">
	                  <div class="post-head">
	                    <div class="source-avatar record-progress-source"><Target size={19} /></div>
	                    <div class="source-copy">
	                      <div class="source-line">
	                        <a href={`/level/${level?.id ?? record.levelid}`}>{tr('Your latest run', 'Lượt chơi mới nhất')}</a>
	                      </div>
	                      <span>{tr('Unverified record', 'Kỷ lục chưa xác minh')} · {timeAgo(record.timestamp)}</span>
	                    </div>
	                  </div>

	                  <a
	                    class="record-progress-creative"
	                    href={completed
	                      ? `/submit/record?levelId=${level?.id ?? record.levelid}`
	                      : `/level/${level?.id ?? record.levelid}`}
	                    style={`background-image: linear-gradient(105deg, rgba(5,10,20,.95), rgba(5,10,20,.62)), url('${getLevelThumbnail(level)}')`}
	                  >
	                    <span class="content-label record-progress-label">
	                      <Target size={13} />
	                      {completed ? tr('LEVEL COMPLETE', 'HOÀN THÀNH LEVEL') : tr('KEEP GOING', 'TIẾP TỤC NÀO')}
	                    </span>
	                    <h2>
	                      {completed
	                        ? tr(`Great job on ${level?.name || `#${record.levelid}`}!`, `Làm tốt lắm với ${level?.name || `#${record.levelid}`}!`)
	                        : tr(`Good job — ${formatRecordProgress(record)} on ${level?.name || `#${record.levelid}`}.`, `Tốt lắm — ${formatRecordProgress(record)} ở ${level?.name || `#${record.levelid}`}.`)}
	                    </h2>
	                    <p>
	                      {completed
	                        ? tr('Submit your run with proof to get the record manually verified.', 'Gửi lượt chơi kèm bằng chứng để kỷ lục được xác minh thủ công.')
	                        : tr('Keep the momentum going and push your progress further.', 'Giữ vững phong độ và tiếp tục nâng tiến độ của bạn.')}
	                    </p>
	                    {#if !completed && !level?.isPlatformer}
	                      <div class="record-progress-bar" aria-label={formatRecordProgress(record)}>
	                        <span style={`width: ${Math.min(100, Math.max(0, Number(record.progress) || 0))}%`}></span>
	                      </div>
	                    {/if}
	                    <span class="record-progress-cta">
	                      {completed ? tr('Submit this record', 'Gửi kỷ lục này') : tr('Continue with this level', 'Tiếp tục level này')}
	                      <ArrowRight size={16} />
	                    </span>
	                  </a>
	                </article>
	              {:else if item.kind === 'level'}
                {@const entry = item.data}
                {@const level = entry.level}
                <article class="feed-card level-post">
                  <div class="post-head">
                    <div class="source-avatar level-source">
                      {#if entry.sourceKind === 'starred'}
                        <Star size={18} fill="currentColor" />
                      {:else}
                        <Layers3 size={18} />
                      {/if}
                    </div>
                    <div class="source-copy">
                      <div class="source-line">
                        <a href={entry.sourceHref}>{entry.sourceTitle}</a>
                        {#if entry.sourceKind === 'official'}
                          <BadgeCheck size={15} class="verified" />
                        {:else}
                          <span class="following-chip">{tr('Starred', 'Đã theo dõi')}</span>
                        {/if}
                      </div>
                      <span>{tr('added a new level', 'vừa thêm level mới')} · {timeAgo(entry.addedAt)}</span>
                    </div>
                  </div>

                  <p class="post-caption">
                    {tr('Fresh in the list:', 'Mới có trong danh sách:')}
                    <strong>{level?.name}</strong>
                    {tr('by', 'bởi')} {level?.creator || tr('Unknown creator', 'Chưa rõ tác giả')}.
                  </p>

                  <a class="level-media" href={`/level/${level?.id}`} aria-label={level?.name}>
                    <img
                      src={getLevelThumbnail(level)}
                      alt={level?.name || ''}
                      loading="lazy"
                      on:error={(event) => useLevelThumbnailFallback(event, level?.id)}
                    />
                    <div class="media-shade"></div>
                    <div class="level-overlay">
                      <div>
                        <span class="content-label">
                          <Gamepad2 size={13} />
                          {tr('New level', 'Level mới')}
                        </span>
                        <h2>{level?.name}</h2>
                        <p>{level?.creator}</p>
                      </div>
                      {#if level?.dlTop || level?.flTop || entry.listType === 'custom-top'}
                        <span class="rank-pill">#{level?.dlTop || level?.flTop || level?.position || '—'}</span>
                      {:else if level?.rating}
                        <span class="rank-pill">{formatNumber(level.rating)} pt</span>
                      {/if}
                    </div>
                  </a>

                  <div class="post-actions">
                    <a href={`/level/${level?.id}`}>
                      <Target size={16} />
                      {tr('View level', 'Xem level')}
                    </a>
                    <a href={entry.sourceHref}>
                      <Layers3 size={16} />
                      {tr('Open list', 'Mở danh sách')}
                    </a>
                  </div>
                </article>
              {:else if item.kind === 'community'}
                <div class="community-feed-item">
                  <CommunityPostCard post={item.data} compact={false} />
                </div>
              {:else if item.kind === 'pvp'}
                {@const viewerPvp = item.data?.viewer}
                {@const viewerMatches = Number(viewerPvp?.matches ?? viewerPvp?.pvpRatedMatchCount ?? 0)}
                {@const viewerWins = Number(viewerPvp?.wins ?? 0)}
                {@const viewerLosses = Math.max(0, viewerMatches - viewerWins)}
                <article class="feed-card pvp-post">
                  <div class="post-head">
                    <div class="source-avatar pvp-source"><Swords size={19} /></div>
                    <div class="source-copy">
                      <div class="source-line">
                        <a href="/versus/play">GDListHub Versus</a>
                        <BadgeCheck size={15} class="verified" />
                      </div>
                      <span><Radio size={11} /> {tr('Ranked pulse · Live stats', 'Nhịp xếp hạng · Thống kê trực tiếp')}</span>
                    </div>
                  </div>

                  <a class="pvp-hero pvp-cta-card" href="/versus/play">
                    <div class="pvp-copy">
                      <span class="content-label cyan-label">
                        <Swords size={13} />
                        {tr('Your PvP hub', 'Trung tâm PvP')}
                      </span>
                      <h2>
                        {viewerPvp
                          ? tr('Your next match starts here.', 'Trận tiếp theo của bạn bắt đầu tại đây.')
                          : tr('Play, track, and climb.', 'Thi đấu, theo dõi và leo hạng.')}
                      </h2>
                      <p>{tr('W/L stats, match history, ranked queue, and the full leaderboard.', 'Thống kê thắng/thua, lịch sử đấu, ghép trận xếp hạng và bảng xếp hạng đầy đủ.')}</p>
                    </div>

                    <div class="pvp-stats">
                      <div>
                        <span>W / L</span>
                        <strong>{viewerPvp ? `${viewerWins} / ${viewerLosses}` : '— / —'}</strong>
                      </div>
                      <div>
                        <span>{tr('Leaderboard', 'Xếp hạng')}</span>
                        <strong>{viewerPvp?.rank ? `#${viewerPvp.rank}` : '—'}</strong>
                      </div>
                      <div>
                        <span>{tr('Rating', 'Điểm hạng')}</span>
                        <strong>{formatNumber(viewerPvp?.pvpRating)}</strong>
                      </div>
                    </div>
                    <span class="pvp-open-cta">
                      {tr('Open PvP', 'Mở PvP')}
                      <ArrowRight size={17} />
                    </span>
                  </a>
                </article>
              {:else if item.kind === 'event'}
                {@const event = item.data}
                <article class="feed-card event-post">
                  <div class="post-head">
                    <div class="source-avatar event-source"><CalendarDays size={18} /></div>
                    <div class="source-copy">
                      <div class="source-line">
                        <a href="/events">GDListHub Events</a>
                        <BadgeCheck size={15} class="verified" />
                      </div>
                      <span>{tr('An event is running now', 'Sự kiện đang diễn ra')} · {timeAgo(event.start)}</span>
                    </div>
                  </div>

                  <a class="event-media" href={`/event/${event.id}`}>
                    <img src={getEventThumbnail(event)} alt={event.title || ''} loading="lazy" />
                    <div class="media-shade event-shade"></div>
                    <div class="event-live"><Radio size={12} /> {tr('LIVE EVENT', 'SỰ KIỆN LIVE')}</div>
                    <div class="event-overlay">
                      <h2>{event.title}</h2>
                      <div>
                        <span><Clock3 size={14} /> {formatTimeLeft(event.end)}</span>
                        {#if event.exp}
                          <span><Sparkles size={14} /> {event.exp} EXP</span>
                        {/if}
                      </div>
                    </div>
                  </a>

                  <div class="post-actions">
                    <a href={`/event/${event.id}`} class="primary-action">
                      <ArrowRight size={16} />
                      {tr('Join event', 'Tham gia')}
                    </a>
                    <a href="/events">
                      <CalendarDays size={16} />
                      {tr('All events', 'Mọi sự kiện')}
                    </a>
                  </div>
                </article>
              {:else if item.kind === 'tournament'}
                {@const tournament = item.data}
                <article class="feed-card tournament-post">
                  <div class="post-head">
                    <div class="source-avatar tournament-source"><Trophy size={18} /></div>
                    <div class="source-copy">
                      <div class="source-line">
                        <a href="/tournaments">GDListHub Tournaments</a>
                        <BadgeCheck size={15} class="verified" />
                      </div>
                      <span>{tournamentStatus(tournament.status)} · {timeAgo(tournament.created_at)}</span>
                    </div>
                  </div>

                  <p class="post-caption">
                    {tr('The official bracket is open. Watch, register, or follow the race.', 'Giải đấu chính thức đã mở. Xem, đăng ký hoặc theo dõi cuộc đua.')}
                  </p>

                  <a class="tournament-media" href={`/tournament/${tournament.id}`}>
                    <img
                      src={`https://cdn.gdlisthub.dev/tournament-banner/${tournament.id}.webp?v=${tournament.bannerVersion ?? 0}`}
                      alt={tournament.name || ''}
                      loading="lazy"
                    />
                    <div class="media-shade tournament-shade"></div>
                    <div class="official-pill"><BadgeCheck size={13} /> {tr('OFFICIAL', 'CHÍNH THỨC')}</div>
                    <div class="tournament-overlay">
                      <span>{tournamentFormat(tournament.format)}</span>
                      <h2>{tournament.name}</h2>
                      <div>
                        <span><Users size={14} /> {tournament.participantCount ?? 0}{tournament.maxPlayers ? `/${tournament.maxPlayers}` : ''}</span>
                        <span><Radio size={14} /> {tournamentStatus(tournament.status)}</span>
                      </div>
                    </div>
                  </a>

                  <div class="post-actions">
                    <a href={`/tournament/${tournament.id}`} class="primary-action">
                      <Trophy size={16} />
                      {tr('Open tournament', 'Mở giải đấu')}
                    </a>
                    <a href="/tournaments">
                      <ArrowRight size={16} />
                      {tr('Browse all', 'Xem tất cả')}
                    </a>
                  </div>
                </article>
              {:else if item.kind === 'supporter'}
                <article class="feed-card supporter-post">
                  <div class="post-head">
                    <div class="source-avatar supporter-source"><Star size={18} fill="currentColor" /></div>
                    <div class="source-copy">
                      <div class="source-line">
                        <a href="/supporter/top">GDListHub Premium</a>
                        <BadgeCheck size={15} class="verified" />
                      </div>
                      <span>{tr('Community-powered', 'Được cộng đồng chung tay')}</span>
                    </div>
                  </div>

                  <div class="supporter-spotlight">
                    <span class="content-label supporter-label"><Trophy size={13} /> {tr('TOP PREMIUM MEMBERS', 'TOP THÀNH VIÊN PREMIUM')}</span>
                    <h2>{tr('The players powering GDListHub.', 'Những người chơi tiếp sức cho GDListHub.')}</h2>
                    <div class="supporter-list">
                      {#each item.data as supporter, index}
                        <a href={`/player/${supporter.player?.uid}`} class="supporter-row">
                          <strong>#{index + 1}</strong>
                          <img
                            src={`https://cdn.gdlisthub.dev/avatars/${supporter.player?.uid}${supporter.player?.isAvatarGif ? '.gif' : '.jpg'}?version=${supporter.player?.avatarVersion ?? 0}`}
                            alt=""
                            loading="lazy"
                          />
                          <span>{supporter.player?.name}</span>
                          <small>{formatNumber(supporter.totalAmount)}₫</small>
                        </a>
                      {/each}
                    </div>
                    <div class="supporter-actions">
                      <a class="supporter-buy-cta" href="/supporter">
                        <Star size={15} fill="currentColor" />
                        {tr('Get Premium', 'Mua Premium')}
                      </a>
                      <a class="supporter-cta" href="/supporter/top">
                        {tr('View leaderboard', 'Xem bảng xếp hạng')}
                        <ArrowRight size={16} />
                      </a>
                    </div>
                  </div>
                </article>
              {:else if item.kind === 'promo'}
                {@const season = item.data?.activeSeason}
                {@const progress = item.data?.battlepassProgress}
                <article class="feed-card promo-post">
                  <div class="post-head">
                    <div class="source-avatar promo-source"><Sparkles size={18} /></div>
                    <div class="source-copy">
                      <div class="source-line">
                        <a href="/battlepass">GDListHub</a>
                        <BadgeCheck size={15} class="verified" />
                      </div>
                      <span>{tr('Promoted', 'Quảng bá')} · {tr('Made for active players', 'Dành cho người chơi năng động')}</span>
                    </div>
                  </div>

                  <a
                    class="promo-creative"
                    class:has-season={Boolean(season)}
                    href={season ? '/battlepass' : '/supporter'}
                    style={season ? `background-image: linear-gradient(105deg, rgba(8,10,18,.93), rgba(8,10,18,.42)), url('${season.backgroundUrl || `https://cdn.gdlisthub.dev/battlepasses/${season.id}.webp`}')` : ''}
                  >
                    <span class="content-label promo-label"><Sparkles size={13} /> {season ? 'GDListHub PASS' : tr('SUPPORT GDListHub', 'ỦNG HỘ GDListHub')}</span>
                    <h2>{season?.title || tr('Keep the community moving.', 'Giữ cộng đồng luôn chuyển động.')}</h2>
                    <p>
                      {season
                        ? tr('Play daily, earn rewards, and make every session count.', 'Chơi mỗi ngày, nhận phần thưởng và biến mỗi phiên chơi thành tiến độ.')
                        : tr('Unlock Premium perks and help fund official events.', 'Mở khóa đặc quyền Premium và góp sức cho các sự kiện chính thức.')}
                    </p>
                    {#if season && progress}
                      <div class="promo-progress">
                        <div><span style={`width: ${Math.min(100, Number(progress.xp || 0) % 100)}%`}></span></div>
                        <strong>{formatNumber(progress.xp)} XP</strong>
                      </div>
                    {/if}
                    <span class="promo-cta">
                      {season ? tr('Open your pass', 'Mở Pass của bạn') : tr('Get Premium', 'Mua Premium')}
                      <ArrowRight size={16} />
                    </span>
                  </a>
                </article>
              {/if}
            {/each}

            {#if mixedFeed.length === 0}
              <div class="empty-feed">
                <Sparkles size={24} />
                <h2>{tr('Your feed is warming up.', 'Bảng tin đang khởi động.')}</h2>
                <p>{tr('Explore lists or meet the community while new posts arrive.', 'Khám phá danh sách hoặc ghé cộng đồng trong lúc chờ nội dung mới.')}</p>
                <a href="/lists">{tr('Explore lists', 'Khám phá danh sách')} <ArrowRight size={15} /></a>
              </div>
            {/if}

            {#if !feedInitialized}
              {#each { length: 2 } as _}
                <div class="community-feed-item">
                  <CommunityPostCard post={null} />
                </div>
              {/each}
            {:else}
              {#each feedContinuationItems as item (item.key)}
                {#if item.kind === 'level'}
                  {@const entry = item.data}
                  {@const level = entry.level}
                  <article class="feed-card level-post">
                    <div class="post-head">
                      <div class="source-avatar level-source">
                        {#if entry.sourceKind === 'starred'}
                          <Star size={18} fill="currentColor" />
                        {:else}
                          <Layers3 size={18} />
                        {/if}
                      </div>
                      <div class="source-copy">
                        <div class="source-line">
                          <a href={entry.sourceHref}>{entry.sourceTitle}</a>
                          {#if entry.sourceKind === 'official'}
                            <BadgeCheck size={15} class="verified" />
                          {:else}
                            <span class="following-chip">{tr('Starred', 'Đã theo dõi')}</span>
                          {/if}
                        </div>
                        <span>{tr('added a new level', 'vừa thêm level mới')} · {timeAgo(entry.addedAt)}</span>
                      </div>
                    </div>

                    <p class="post-caption">
                      {tr('Fresh in the list:', 'Mới có trong danh sách:')}
                      <strong>{level?.name}</strong>
                      {tr('by', 'bởi')} {level?.creator || tr('Unknown creator', 'Chưa rõ tác giả')}.
                    </p>

                    <a class="level-media" href={`/level/${level?.id}`} aria-label={level?.name}>
                      <img
                        src={getLevelThumbnail(level)}
                        alt={level?.name || ''}
                        loading="lazy"
                        on:error={(event) => useLevelThumbnailFallback(event, level?.id)}
                      />
                      <div class="media-shade"></div>
                      <div class="level-overlay">
                        <div>
                          <span class="content-label">
                            <Gamepad2 size={13} />
                            {tr('New level', 'Level mới')}
                          </span>
                          <h2>{level?.name}</h2>
                          <p>{level?.creator}</p>
                        </div>
                        {#if level?.dlTop || level?.flTop || entry.listType === 'custom-top'}
                          <span class="rank-pill">#{level?.dlTop || level?.flTop || level?.position || '—'}</span>
                        {:else if level?.rating}
                          <span class="rank-pill">{formatNumber(level.rating)} pt</span>
                        {/if}
                      </div>
                    </a>

                    <div class="post-actions">
                      <a href={`/level/${level?.id}`}>
                        <Target size={16} />
                        {tr('View level', 'Xem level')}
                      </a>
                      <a href={entry.sourceHref}>
                        <Layers3 size={16} />
                        {tr('Open list', 'Mở danh sách')}
                      </a>
                    </div>
                  </article>
                {:else if item.kind === 'community'}
                  <div class="community-feed-item">
                    <CommunityPostCard post={item.data} compact={false} />
                  </div>
                {/if}
              {/each}
            {/if}

            {#if feedLoadingMore}
              {#each { length: 2 } as _}
                <div class="community-feed-item">
                  <CommunityPostCard post={null} />
                </div>
              {/each}
            {/if}

            {#if feedLoadError}
              <button class="community-retry" type="button" on:click={loadMoreFeed}>
                {tr('Could not load more. Try again', 'Không thể tải thêm. Thử lại')}
              </button>
            {:else if feedHasMore}
              {#key `${feedCursor?.before ?? 'initial'}:${feedCursor?.beforeKey ?? ''}`}
                <div
                  class="community-load-sentinel"
                  use:observeFeedEnd
                  aria-label={tr('Load more feed content', 'Tải thêm nội dung bảng tin')}
                ></div>
              {/key}
            {/if}
          </div>
        {/if}
        </div>
	      {:else if activeFeedTab === 'friends'}
	        {#if homeData === null || ($user.loggedIn && friendFeed === null)}
	          <div class="feed-stream" aria-label={tr('Loading friends feed', 'Đang tải bảng tin bạn bè')}>
	            {#each { length: 4 } as _}
	              <div class="feed-card skeleton-card" aria-hidden="true">
	                <div class="skeleton-row">
	                  <span class="skeleton-avatar"></span>
	                  <span class="skeleton-line medium"></span>
	                </div>
	                <span class="skeleton-line wide"></span>
	                <span class="skeleton-media"></span>
	              </div>
	            {/each}
	          </div>
	        {:else if !$user.loggedIn}
	          <div class="friend-gate empty-feed">
	            <Users size={28} />
	            <h2>{tr('See what your friends are playing.', 'Xem bạn bè của bạn đang chơi gì.')}</h2>
	            <p>{tr('Sign in to follow their newest records, levels, and community posts.', 'Đăng nhập để theo dõi kỷ lục, level và bài viết cộng đồng mới nhất của họ.')}</p>
	            <a href="/social?tab=friends">{tr('Open friends', 'Mở danh sách bạn bè')} <ArrowRight size={15} /></a>
	          </div>
	        {:else if Number(friendFeed?.friendCount || 0) === 0}
	          <div class="friend-gate empty-feed">
	            <Users size={28} />
	            <h2>{tr('Build your friends feed.', 'Tạo bảng tin bạn bè của bạn.')}</h2>
	            <p>{tr('Add friends to see their newest achievements and creations here.', 'Thêm bạn bè để xem thành tích và sáng tạo mới nhất của họ tại đây.')}</p>
	            <a href="/social?tab=friends">{tr('Find friends', 'Tìm bạn bè')} <ArrowRight size={15} /></a>
	          </div>
	        {:else}
	          <div class="feed-stream friend-feed-stream">
	            {#each friendActivity as item (item.key)}
	              {#if item.kind === 'record'}
	                <ClanRecordCard record={item.data} />
	              {:else if item.kind === 'level'}
	                <FriendLevelCard level={item.data} />
	              {:else}
	                <div class="community-feed-item">
	                  <CommunityPostCard post={item.data} compact={false} />
	                </div>
	              {/if}
	            {/each}

	            {#if friendActivity.length === 0}
	              <div class="empty-feed">
	                <Sparkles size={24} />
	                <h2>{tr('No recent friend activity.', 'Chưa có hoạt động mới từ bạn bè.')}</h2>
	                <p>{tr('New records, accepted levels, and posts will appear here.', 'Kỷ lục, level đã duyệt và bài viết mới sẽ xuất hiện tại đây.')}</p>
	                <a href="/social?tab=friends">{tr('View friends', 'Xem bạn bè')} <ArrowRight size={15} /></a>
	              </div>
	            {/if}
	          </div>
	        {/if}
	      {:else if homeData === null}
        <div class="feed-stream" aria-label={tr('Loading clan feed', 'Đang tải bảng tin bang hội')}>
          {#each { length: 4 } as _}
            <div class="feed-card skeleton-card" aria-hidden="true">
              <div class="skeleton-row">
                <span class="skeleton-avatar"></span>
                <span class="skeleton-line medium"></span>
              </div>
              <span class="skeleton-line wide"></span>
              <span class="skeleton-media"></span>
            </div>
          {/each}
        </div>
      {:else if !$user.loggedIn}
        <div class="clan-gate empty-feed">
          <Shield size={28} />
          <h2>{tr('Your clan feed lives here.', 'Bảng tin bang hội của bạn ở đây.')}</h2>
          <p>{tr('Sign in to see new records and posts from your clan in one private stream.', 'Đăng nhập để xem kỷ lục mới và bài viết từ bang hội trong một bảng tin riêng.')}</p>
          <a href="/clans">{tr('Browse clans', 'Khám phá bang hội')} <ArrowRight size={15} /></a>
        </div>
      {:else if !clanFeed?.clan}
        <div class="clan-gate empty-feed">
          <Users size={28} />
          <h2>{tr('Find your community.', 'Tìm cộng đồng của bạn.')}</h2>
          <p>{tr('Join a clan to unlock a dedicated feed for team records, discussions, guides, and collabs.', 'Tham gia bang hội để mở bảng tin riêng cho kỷ lục, thảo luận, hướng dẫn và collab.')}</p>
          <a href="/clans">{tr('Find a clan', 'Tìm bang hội')} <ArrowRight size={15} /></a>
        </div>
      {:else}
        <section class="clan-feed-header">
          <div
            class="clan-feed-cover"
            style={`background-image: linear-gradient(90deg, rgba(4,8,16,.9), rgba(4,8,16,.48)), url('https://cdn.gdlisthub.dev/clan-photos/${clanFeed.clan.id}.jpg?version=${clanFeed.clan.imageVersion ?? 0}')`}
          >
            <div>
              <span class="clan-community-label"><Shield size={13} /> <ClanTag clan={clanFeed.clan} compact /></span>
              <h2>{clanFeed.clan.name}</h2>
              <p><Users size={14} /> {formatNumber(clanFeed.clan.memberCount)} {tr('members', 'thành viên')}</p>
            </div>
            <a href={`/clan/${clanFeed.clan.id}`}>{tr('Open clan', 'Mở bang hội')} <ArrowRight size={16} /></a>
          </div>
        </section>

        {#if clanBoosted}
          <QuickPostComposer clan={clanFeed.clan} />

          <div class="feed-stream clan-feed-stream">
	            {#each clanActivity as item (item.key)}
	              {#if item.kind === 'record'}
	                <ClanRecordCard record={item.data} clan={clanFeed.clan} />
	              {:else if item.kind === 'level'}
	                <FriendLevelCard level={item.data} context="clan" />
	              {:else}
                <div class="community-feed-item">
                  <CommunityPostCard
                    post={item.data}
                    compact={false}
                    apiPrefix={`${import.meta.env.VITE_API_URL}/clans/${clanFeed.clan.id}/community`}
                  />
                </div>
              {/if}
            {/each}

            {#if clanActivity.length === 0}
              <div class="empty-feed">
                <Sparkles size={24} />
                <h2>{tr('Start the clan conversation.', 'Bắt đầu cuộc trò chuyện bang hội.')}</h2>
	                <p>{tr('New records, clan-created levels, and community posts will appear here.', 'Kỷ lục mới, level do bang hội tạo và bài viết cộng đồng sẽ xuất hiện tại đây.')}</p>
                <a href={`/community/create?clanId=${clanFeed.clan.id}`}>{tr('Create the first post', 'Tạo bài viết đầu tiên')} <ArrowRight size={15} /></a>
              </div>
            {/if}
          </div>
        {:else}
          <div class="clan-gate empty-feed">
            <LockKeyhole size={28} />
            <h2>{tr('Boost this clan to unlock its feed.', 'Boost bang hội để mở khóa bảng tin.')}</h2>
            <p>{tr('Clan posts, records, levels, and activity are available while the clan is boosted.', 'Bài viết, kỷ lục, level và hoạt động bang hội khả dụng trong thời gian boost.')}</p>
            <a href={`/clan/${clanFeed.clan.id}`}>{tr('Open player list', 'Mở danh sách người chơi')} <ArrowRight size={15} /></a>
          </div>
        {/if}
      {/if}
    </section>
    <div class="right-rail-column">
      <SocialRightRail />
    </div>
  </div>
</main>

<style lang="scss">
.social-home {
  --feed-border: hsl(var(--border) / 0.9);
  min-height: calc(100vh - 56px);
  background:
    radial-gradient(circle at 52% -20%, hsl(206 100% 55% / 0.075), transparent 31rem),
    hsl(var(--background));
}

.feed-layout {
  display: grid;
  grid-template-columns: minmax(0, 700px) minmax(260px, 300px);
  gap: 24px;
  width: min(1024px, calc(100% - 32px));
  margin: 0 auto;
  padding: 28px 0 56px;
  align-items: start;
}

.feed-column {
  min-width: 0;
}

.right-rail-column {
  position: sticky;
  top: 76px;
  min-width: 0;
  align-self: start;
}

.feed-tabs {
  position: sticky;
  top: 56px;
  z-index: 20;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  height: 52px;
  margin-bottom: 12px;
  border: 1px solid var(--feed-border);
  border-radius: 14px;
  background: hsl(var(--background) / 0.88);
  box-shadow: 0 8px 28px hsl(222 40% 2% / 0.06);
  backdrop-filter: blur(18px);
  overflow: hidden;

  .feed-tab {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 0;
    color: hsl(var(--muted-foreground));
    background: transparent;
    font-size: 13px;
    font-weight: 750;
    cursor: pointer;

    &::after {
      content: '';
      position: absolute;
      left: 28%;
      right: 28%;
      bottom: 0;
      height: 3px;
      border-radius: 999px 999px 0 0;
      background: transparent;
    }

    &:hover { color: hsl(var(--foreground)); }

    &.active {
      color: hsl(var(--foreground));

      &::after { background: hsl(199 89% 48%); }
    }
  }
}

.tab-dot {
  width: 6px;
  height: 6px;
  margin-left: -2px;
  border-radius: 50%;
  background: hsl(199 89% 48%);
  box-shadow: 0 0 0 3px hsl(199 89% 48% / 0.12);
}

.clan-feed-header {
  margin-bottom: 12px;
}

.clan-feed-cover {
  display: flex;
  min-height: 164px;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding: 22px;
  border: 1px solid var(--feed-border);
  border-radius: 14px;
  color: white;
  background-position: center;
  background-size: cover;
  box-shadow: 0 8px 28px hsl(222 40% 2% / 0.08);
  overflow: hidden;

  h2 {
    margin: 8px 0 4px;
    font-size: clamp(24px, 5vw, 34px);
    font-weight: 880;
    letter-spacing: -0.035em;
  }

  p,
  > div > span {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  p { margin: 0; color: rgba(255, 255, 255, 0.76); font-size: 11px; font-weight: 700; }

  > a {
    display: inline-flex;
    min-height: 38px;
    flex: none;
    align-items: center;
    gap: 7px;
    padding: 0 14px;
    border: 1px solid rgba(255, 255, 255, 0.28);
    border-radius: 999px;
    color: #07101c;
    background: white;
    font-size: 12px;
    font-weight: 850;
    text-decoration: none;
  }
}

.clan-community-label {
  width: fit-content;
  padding: 5px 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  background: rgba(4, 8, 16, 0.4);
  backdrop-filter: blur(10px);
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.04em;
}

.clan-gate { min-height: 320px; }

.onboarding-feed-item {
  margin-bottom: 12px;

  :global(.onboarding-progress) {
    margin: 0;
  }
}

.feed-stream {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.feed-card,
.empty-feed {
  border: 1px solid var(--feed-border);
  border-radius: 14px;
  background: hsl(var(--card));
  box-shadow: 0 4px 18px hsl(222 40% 2% / 0.035);
}

.feed-card {
  overflow: hidden;
}

.post-head {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 15px 16px 10px;
}

.source-avatar {
  display: grid;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  place-items: center;
  border-radius: 12px;
  border: 1px solid currentColor;
}

.level-source {
  color: hsl(43 90% 48%);
  background: hsl(43 90% 52% / 0.11);
}

.pvp-source {
  color: hsl(184 76% 42%);
  background: hsl(184 80% 45% / 0.11);
}

.event-source {
  color: hsl(25 95% 52%);
  background: hsl(25 95% 52% / 0.11);
}

.tournament-source {
  color: hsl(268 78% 59%);
  background: hsl(268 78% 59% / 0.11);
}

.promo-source {
  color: hsl(327 82% 58%);
  background: hsl(327 82% 58% / 0.11);
}

.record-progress-source {
  color: hsl(153 72% 42%);
  background: hsl(153 72% 45% / 0.11);
}

.supporter-source {
  color: hsl(43 90% 45%);
  background: hsl(43 95% 52% / 0.12);
}

.source-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;

  > span {
    display: flex;
    align-items: center;
    gap: 4px;
    color: hsl(var(--muted-foreground));
    font-size: 11px;
    line-height: 1.35;
  }
}

.source-line {
  display: flex;
  align-items: center;
  gap: 5px;

  a {
    min-width: 0;
    overflow: hidden;
    color: hsl(var(--foreground));
    font-size: 13px;
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-decoration: none;
  }
}

:global(.verified) {
  flex: none;
  color: hsl(199 89% 48%);
}

.following-chip {
  display: inline-flex;
  padding: 2px 6px;
  border-radius: 999px;
  color: hsl(43 80% 40%);
  background: hsl(43 90% 52% / 0.12);
  font-size: 9px;
  font-weight: 850;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.post-caption {
  margin: 0;
  padding: 2px 16px 13px;
  color: hsl(var(--muted-foreground));
  font-size: 13px;
  line-height: 1.55;

  strong {
    color: hsl(var(--foreground));
    font-weight: 800;
  }
}

.level-media,
.event-media,
.tournament-media {
  position: relative;
  display: block;
  aspect-ratio: 16 / 8.6;
  margin: 0 12px;
  border-radius: 11px;
  background: hsl(var(--muted));
  overflow: hidden;

  > img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.media-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(4, 7, 14, 0.86), transparent 62%);
}

.level-overlay,
.event-overlay,
.tournament-overlay {
  position: absolute;
  inset: auto 0 0;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 18px;
  color: white;
  text-shadow: 0 1px 10px rgba(0, 0, 0, 0.5);

  h2 {
    margin: 6px 0 1px;
    font-size: clamp(21px, 4vw, 30px);
    line-height: 1;
    letter-spacing: -0.025em;
    font-weight: 880;
  }

}

.level-overlay p {
  margin: 0;
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
}

.content-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  width: fit-content;
  padding: 4px 8px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.95);
  background: rgba(6, 9, 17, 0.38);
  backdrop-filter: blur(8px);
  font-size: 9px;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.rank-pill {
  flex: none;
  padding: 7px 10px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 10px;
  color: white;
  background: rgba(5, 8, 15, 0.48);
  backdrop-filter: blur(10px);
  font-size: 13px;
  font-weight: 850;
}

.post-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 12px 11px;

  a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-height: 34px;
    padding: 0 11px;
    border-radius: 9px;
    color: hsl(var(--muted-foreground));
    font-size: 12px;
    font-weight: 750;
    text-decoration: none;
    &:hover {
      color: hsl(var(--foreground));
      background: hsl(var(--muted) / 0.7);
    }

    &.primary-action {
      color: hsl(var(--foreground));
      background: hsl(var(--muted) / 0.72);
    }
  }
}

.community-feed-item {
  :global(.communityPost) {
    border-radius: 14px;
    border-color: var(--feed-border);
    box-shadow: 0 4px 18px hsl(222 40% 2% / 0.035);
    transition: none !important;
  }

  :global(.communityPost:hover) {
    transform: none;
  }

  :global(.communityPost *) {
    transition: none !important;
  }
}

.pvp-hero {
  margin: 2px 12px 0;
  padding: 22px;
  border-radius: 11px;
  color: #eaffff;
  background:
    radial-gradient(circle at 85% 10%, rgba(45, 212, 191, 0.32), transparent 36%),
    linear-gradient(145deg, #0d3940, #091b28 70%);
  overflow: hidden;
  text-decoration: none;
}

.pvp-cta-card {
  display: block;
}

.pvp-copy {
  max-width: 480px;

  h2 {
    margin: 9px 0 5px;
    color: white;
    font-size: clamp(22px, 4vw, 30px);
    line-height: 1.08;
    letter-spacing: -0.03em;
    font-weight: 870;
  }

  p {
    margin: 0;
    color: rgba(223, 255, 255, 0.7);
    font-size: 12px;
  }
}

.cyan-label {
  color: #b9fff8;
  border-color: rgba(153, 246, 228, 0.25);
  background: rgba(20, 184, 166, 0.15);
}

.pvp-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 20px;

  div {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 11px 12px;
    border: 1px solid rgba(153, 246, 228, 0.13);
    border-radius: 9px;
    background: rgba(255, 255, 255, 0.05);
  }

  span {
    color: rgba(204, 251, 241, 0.66);
    font-size: 9px;
    font-weight: 750;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  strong {
    color: white;
    font-size: 20px;
    line-height: 1;
    font-weight: 850;
    font-variant-numeric: tabular-nums;
  }
}

.pvp-open-cta {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: 18px;
  padding: 9px 13px;
  border-radius: 9px;
  color: #082822;
  background: #ccfbf1;
  font-size: 11px;
  font-weight: 850;
}

.event-live,
.official-pill {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 8px;
  border-radius: 999px;
  color: white;
  background: hsl(8 85% 52% / 0.92);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.event-overlay,
.tournament-overlay {
  display: block;

  > div {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 9px;

    span {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      color: rgba(255, 255, 255, 0.82);
      font-size: 11px;
      font-weight: 700;
    }
  }
}

.event-shade {
  background: linear-gradient(to top, rgba(13, 5, 2, 0.9), rgba(12, 6, 2, 0.08) 70%);
}

.tournament-shade {
  background: linear-gradient(to top, rgba(17, 5, 31, 0.92), rgba(14, 6, 27, 0.08) 70%);
}

.official-pill {
  color: #f4e8ff;
  background: hsl(268 78% 52% / 0.9);
}

.tournament-overlay > span {
  color: rgba(240, 220, 255, 0.85);
  font-size: 10px;
  font-weight: 850;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.supporter-spotlight {
  margin: 2px 12px 12px;
  padding: 22px;
  border-radius: 11px;
  color: #fff9e9;
  background:
    radial-gradient(circle at 88% 5%, rgba(250, 204, 21, 0.28), transparent 38%),
    linear-gradient(145deg, #3b2808, #17130d 68%);

  h2 {
    margin: 9px 0 16px;
    font-size: clamp(22px, 4vw, 30px);
    line-height: 1.08;
    letter-spacing: -0.03em;
    font-weight: 870;
  }
}

.supporter-label {
  color: #fff1a8;
  border-color: rgba(253, 224, 71, 0.22);
  background: rgba(234, 179, 8, 0.14);
}

.supporter-list {
  display: grid;
  gap: 6px;
}

.supporter-row {
  display: grid;
  grid-template-columns: 28px 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  min-height: 48px;
  padding: 5px 9px;
  border: 1px solid rgba(253, 224, 71, 0.1);
  border-radius: 9px;
  color: #fff9e9;
  background: rgba(255, 255, 255, 0.045);
  text-decoration: none;

  > strong {
    color: #fde047;
    font-size: 12px;
    text-align: center;
  }

  img {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    object-fit: cover;
  }

  > span {
    min-width: 0;
    overflow: hidden;
    font-size: 12px;
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    color: rgba(255, 249, 233, 0.64);
    font-size: 10px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
}

.supporter-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  flex-wrap: wrap;
}

.supporter-buy-cta,
.supporter-cta {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 36px;
  text-decoration: none;
}

.supporter-buy-cta {
  padding: 0 13px;
  border: 1px solid rgba(255, 241, 168, 0.8);
  border-radius: 9px;
  color: #2a1d05;
  background: linear-gradient(135deg, #fde68a, #facc15);
  box-shadow: 0 8px 22px rgba(234, 179, 8, 0.16);
  font-size: 11px;
  font-weight: 900;
}

.supporter-cta {
  color: #fde68a;
  font-size: 11px;
  font-weight: 800;
}

.record-progress-creative {
  position: relative;
  display: flex;
  min-height: 285px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 9px;
  margin: 2px 12px 12px;
  padding: 26px;
  border-radius: 11px;
  color: white;
  background-color: #08130f;
  background-position: center;
  background-size: cover;
  overflow: hidden;
  text-decoration: none;

  h2 {
    max-width: 520px;
    margin: 3px 0 0;
    font-size: clamp(24px, 4.5vw, 36px);
    line-height: 1.05;
    letter-spacing: -0.035em;
    font-weight: 900;
  }

  p {
    max-width: 470px;
    margin: 0;
    color: rgba(255, 255, 255, 0.75);
    font-size: 13px;
    line-height: 1.5;
  }
}

.record-progress-label {
  color: #d1fae5;
  border-color: rgba(167, 243, 208, 0.26);
  background: rgba(16, 185, 129, 0.2);
}

.record-progress-bar {
  width: min(100%, 410px);
  height: 6px;
  margin: 4px 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  overflow: hidden;

  span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #34d399, #a7f3d0);
  }
}

.record-progress-cta {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: 3px;
  padding: 9px 13px;
  border-radius: 9px;
  color: #082117;
  background: #d1fae5;
  font-size: 11px;
  font-weight: 850;
}

.promo-creative {
  position: relative;
  display: flex;
  min-height: 310px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 9px;
  margin: 2px 12px 12px;
  padding: 26px;
  border-radius: 11px;
  color: white;
  background:
    radial-gradient(circle at 85% 10%, rgba(244, 114, 182, 0.4), transparent 37%),
    linear-gradient(145deg, #3f1136, #17101f 65%);
  background-size: cover;
  background-position: center;
  overflow: hidden;
  text-decoration: none;

  &::after {
    content: '';
    position: absolute;
    width: 220px;
    height: 220px;
    right: -66px;
    top: -72px;
    border: 1px solid rgba(255, 255, 255, 0.13);
    border-radius: 42%;
    transform: rotate(24deg);
  }

  > * {
    position: relative;
    z-index: 1;
  }

  h2 {
    max-width: 520px;
    margin: 3px 0 0;
    font-size: clamp(26px, 5vw, 39px);
    line-height: 1;
    letter-spacing: -0.04em;
    font-weight: 900;
  }

  p {
    max-width: 470px;
    margin: 0;
    color: rgba(255, 255, 255, 0.72);
    font-size: 13px;
    line-height: 1.5;
  }
}

.promo-label {
  color: #ffe5f5;
  border-color: rgba(255, 255, 255, 0.2);
  background: rgba(236, 72, 153, 0.2);
}

.promo-progress {
  width: min(100%, 410px);
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 4px 0;

  > div {
    height: 5px;
    flex: 1;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.16);
    overflow: hidden;

    span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #f472b6, #c084fc);
    }
  }

  strong {
    font-size: 10px;
    font-variant-numeric: tabular-nums;
  }
}

.promo-cta {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: 3px;
  padding: 9px 13px;
  border-radius: 9px;
  color: #190f1b;
  background: white;
  font-size: 11px;
  font-weight: 850;
}

.community-load-sentinel {
  width: 100%;
  height: 1px;
}

.community-retry {
  min-height: 44px;
  border: 1px solid var(--feed-border);
  border-radius: 12px;
  color: hsl(var(--foreground));
  background: hsl(var(--card));
  font: inherit;
  font-size: 12px;
  font-weight: 750;
  cursor: pointer;
}

.empty-feed {
  display: flex;
  min-height: 220px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 30px;
  color: hsl(var(--muted-foreground));
  text-align: center;

  h2 {
    margin: 3px 0 0;
    color: hsl(var(--foreground));
    font-size: 18px;
    font-weight: 800;
  }

  p {
    max-width: 430px;
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
  }

  a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
    color: hsl(199 89% 43%);
    font-size: 12px;
    font-weight: 800;
    text-decoration: none;
  }
}

.skeleton-card {
  display: flex;
  min-height: 310px;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
}

.skeleton-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.skeleton-avatar,
.skeleton-line,
.skeleton-media {
  display: block;
  border-radius: 8px;
  background:
    linear-gradient(
      100deg,
      transparent 20%,
      hsl(var(--background) / 0.6) 40%,
      transparent 60%
    ),
    hsl(var(--muted));
  background-size: 220% 100%;
  animation: skeleton-shimmer 1.35s linear infinite;
}

.skeleton-avatar {
  width: 40px;
  height: 40px;
  border-radius: 12px;
}

.skeleton-line {
  height: 12px;

  &.medium { width: 38%; }
  &.wide { width: 68%; }
}

.skeleton-media {
  min-height: 210px;
}

@keyframes skeleton-shimmer {
  from { background-position: 130% 0; }
  to { background-position: -90% 0; }
}

@media (max-width: 1240px) {
  .feed-layout {
    display: block;
    width: min(700px, calc(100% - 24px));
    padding-top: 22px;
  }

  .right-rail-column {
    display: none;
  }
}

@media (max-width: 640px) {
  .social-home {
    background: hsl(var(--background));
  }

  .feed-layout {
    width: 100%;
    padding: 18px 0 32px;
  }

  .feed-tabs {
    top: 55px;
    margin: 0 8px 10px;
    border-radius: 12px;
  }

  .clan-feed-header {
    margin: 0 8px 8px;
  }

  .clan-feed-cover {
    min-height: 150px;
    padding: 18px;

    > a {
      width: 38px;
      padding: 0;
      justify-content: center;
      font-size: 0;
    }
  }

  .record-progress-creative {
    min-height: 250px;
    margin-right: 8px;
    margin-left: 8px;
    padding: 20px;
  }

  .feed-stream {
    gap: 8px;
  }

  .feed-card,
  .empty-feed,
  .community-feed-item :global(.communityPost) {
    border-right: 0;
    border-left: 0;
    border-radius: 0;
  }

  .clan-feed-stream :global(.clan-record-card),
  .friend-feed-stream :global(.clan-record-card) {
    border-right: 0;
    border-left: 0;
    border-radius: 0;
  }

  .onboarding-feed-item {
    margin: 0 8px 8px;
  }

  .post-head {
    padding: 13px 14px 9px;
  }

  .source-avatar {
    width: 38px;
    height: 38px;
    flex-basis: 38px;
  }

  .post-caption {
    padding: 2px 14px 12px;
  }

  .level-media,
  .event-media,
  .tournament-media,
  .pvp-hero,
  .supporter-spotlight,
  .promo-creative {
    margin-right: 8px;
    margin-left: 8px;
  }

  .level-media,
  .event-media,
  .tournament-media {
    aspect-ratio: 4 / 3;
  }

  .level-overlay,
  .event-overlay,
  .tournament-overlay {
    padding: 14px;

    h2 {
      font-size: 22px;
    }
  }

  .pvp-hero {
    padding: 18px;
  }

  .pvp-stats {
    gap: 5px;

    div {
      padding: 9px 8px;
    }

    strong {
      font-size: 17px;
    }
  }

  .promo-creative {
    min-height: 330px;
    padding: 20px;
  }

}

@media (prefers-reduced-motion: reduce) {
  .skeleton-avatar,
  .skeleton-line,
  .skeleton-media {
    animation: none;
  }
}

</style>
