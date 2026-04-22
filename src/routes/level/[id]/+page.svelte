<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import CommunityPostCard from '$lib/components/communityPostCard.svelte';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import Loading from '$lib/components/animation/loading.svelte';
	import Chart from 'chart.js/auto';
	import Ads from '$lib/components/ads.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { goto } from '$app/navigation';
	import { _ } from 'svelte-i18n';
	import {
		MessageSquare,
		Tag,
		Link,
		Crown,
		Monitor,
		Smartphone,
		ExternalLink,
		ListPlus,
	} from 'lucide-svelte';

	export let data: any;
	let levelAPI: any = null;
	let records: any[] = [];
	let deathCount: any[] = [];
	let chart: any = null;
	let loaded = false;
	let relatedPosts: any[] = [];
	let activeTab = 'records';
	let levelTags: any[] = [];
	let levelVariants: any[] = [];

	type StarredListEntry = {
		id: number;
		slug?: string | null;
		title: string;
		description: string;
		updated_at: string;
		mode: 'rating' | 'top';
		isPlatformer: boolean;
		isOfficial?: boolean;
		starCount: number;
		topEnabled?: boolean;
		ownerData?: any | null;
		item?: {
			created_at: string;
			rating: number | null;
			position: number | null;
			minProgress: number | null;
		} | null;
	};

	function getTimeString(ms: number) {
		const minutes = Math.floor(ms / 60000);
		const seconds = Math.floor((ms % 60000) / 1000);
		const milliseconds = ms % 1000;

		return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds}`;
	}

	function genPercent() {
		const res = Array(100);

		for (let i = 0; i < 100; i++) {
			res[i] = `${i}%`;
		}

		return res;
	}

	function createChart(node: any) {
		if (chart != null) {
			chart.destroy();
		}

		chart = new Chart(node, {
			type: 'bar',
			data: {
				labels: genPercent(),
				datasets: [
					{
						label: 'Death count',
						data: deathCount,
						borderWidth: 1
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				scales: {
					y: {
						beginAtZero: true
					}
				},
				plugins: {
					tooltip: {
						callbacks: {
							label: function (context) {
								return String(context.parsed.y);
							}
						}
					}
				}
			}
		});
	}

	async function fetchData() {
		if (!loaded) {
			return;
		}

		levelAPI = null;
		records = [];
		deathCount = [];
		relatedPosts = [];
		levelTags = [];
		levelVariants = [];

		fetch(`${import.meta.env.VITE_API_URL}/levels/${$page.params.id}?fromGD=1`)
			.then((res) => res.json())
			.then((res) => (levelAPI = res));

		fetch(`${import.meta.env.VITE_API_URL}/levels/${$page.params.id}/records?end=500`)
			.then((res) => res.json())
			.then((res: any) => (records = res));

		fetch(`${import.meta.env.VITE_API_URL}/levels/${$page.params.id}/deathCount`)
			.then((res) => res.json())
			.then((res: any) => {
				deathCount = res.count;
			});

		fetch(`${import.meta.env.VITE_API_URL}/community/levels/${$page.params.id}/posts?limit=5`)
			.then((res) => res.json())
			.then((res: any) => (relatedPosts = res))
			.catch(() => (relatedPosts = []));

		fetch(`${import.meta.env.VITE_API_URL}/levels/${$page.params.id}/tags`)
			.then((res) => res.json())
			.then(
				(res: any) => (levelTags = (res || []).map((t: any) => t.levelTags || t).filter(Boolean))
			)
			.catch(() => (levelTags = []));

		fetch(`${import.meta.env.VITE_API_URL}/levels/${$page.params.id}/variants`)
			.then((res) => res.json())
			.then((res: any) => (levelVariants = res || []))
			.catch(() => (levelVariants = []));
	}

	function getList() {
		if (data.level.isChallenge) {
			return $_('level.challenge_rating');
		}

		return data.level.isPlatformer ? $_('level.platformer_rating') : $_('level.classic_rating');
	}

	function hasStarredListPositionBadge(list: StarredListEntry) {
		return list.topEnabled ?? list.mode === 'top';
	}

	function formatStarredListPrimaryValue(list: StarredListEntry) {
		if (hasStarredListPositionBadge(list)) {
			return list.item?.position != null ? `#${list.item.position}` : '#?';
		}

		return `${list.item?.rating ?? '?'}pt`;
	}

	function formatStarredListRatingValue(list: StarredListEntry) {
		return `${list.item?.rating}pt`;
	}

	function getListHref(list: StarredListEntry) {
		return `/lists/${list.slug || list.id}`;
	}

	function getOfficialLevelLists(level: any): StarredListEntry[] {
		if (!level) {
			return [];
		}

		const officialLists: StarredListEntry[] = [];
		const createdAt = level.created_at || new Date().toISOString();
		const updatedAt = level.updated_at || createdAt;

		if (level.dlTop != null) {
			if (level.isChallenge) {
				officialLists.push({
					id: -3,
					slug: 'cl',
					title: 'Challenge List',
					description: 'Official Geometry Dash Việt Nam challenge list.',
					updated_at: updatedAt,
					mode: 'rating',
					isPlatformer: false,
					isOfficial: true,
					starCount: 0,
					topEnabled: false,
					item: {
						created_at: createdAt,
						rating: level.rating ?? null,
						position: typeof level.dlTop === 'number' ? level.dlTop - 1 : null,
						minProgress: level.minProgress ?? null
					}
				});
			} else if (level.isPlatformer) {
				officialLists.push({
					id: -2,
					slug: 'pl',
					title: 'Platformer List',
					description: 'Official Geometry Dash Việt Nam platformer list.',
					updated_at: updatedAt,
					mode: 'top',
					isPlatformer: true,
					isOfficial: true,
					starCount: 0,
					topEnabled: true,
					item: {
						created_at: createdAt,
						rating: level.rating ?? null,
						position: typeof level.dlTop === 'number' ? level.dlTop - 1 : null,
						minProgress: level.minProgress ?? null
					}
				});
			} else {
				officialLists.push({
					id: -1,
					slug: 'dl',
					title: 'Classic List',
					description: 'Official Geometry Dash Việt Nam classic demon list.',
					updated_at: updatedAt,
					mode: 'rating',
					isPlatformer: false,
					isOfficial: true,
					starCount: 0,
					topEnabled: false,
					item: {
						created_at: createdAt,
						rating: level.rating ?? null,
						position: typeof level.dlTop === 'number' ? level.dlTop - 1 : null,
						minProgress: level.minProgress ?? null
					}
				});
			}
		}

		if (level.flTop != null) {
			officialLists.push({
				id: -4,
				slug: 'fl',
				title: 'Featured List',
				description: 'Official Geometry Dash Việt Nam featured list.',
				updated_at: updatedAt,
				mode: 'top',
				isPlatformer: Boolean(level.isPlatformer),
				isOfficial: true,
				starCount: 0,
				topEnabled: true,
				item: {
					created_at: createdAt,
					rating: level.flPt ?? null,
					position: typeof level.flTop === 'number' ? level.flTop - 1 : null,
					minProgress: level.minProgress ?? null
				}
			});
		}

		return officialLists;
	}

	function mergeLevelLists(level: any, remoteLists: StarredListEntry[]) {
		const remoteByKey = new Map(remoteLists.map((list) => [list.slug || String(list.id), list]));
		const officialLists = getOfficialLevelLists(level).map((officialList) => {
			const key = officialList.slug || String(officialList.id);
			const remoteList = remoteByKey.get(key);

			if (!remoteList) {
				return officialList;
			}

			return {
				...officialList,
				...remoteList,
				item: remoteList.item ?? officialList.item
			};
		});

		const seen = new Set(officialLists.map((list) => list.slug || String(list.id)));
		const merged = [...officialLists];

		for (const list of remoteLists) {
			const key = list.slug || String(list.id);
			if (seen.has(key)) {
				continue;
			}

			seen.add(key);
			merged.push(list);
		}

		return merged;
	}

	function handleStarredListCardKeydown(event: KeyboardEvent, list: StarredListEntry) {
		if (event.target instanceof Element && event.target.closest('[data-starred-list-author]')) {
			return;
		}

		if (event.key !== 'Enter' && event.key !== ' ') {
			return;
		}

		event.preventDefault();
		goto(getListHref(list));
	}

	function handleStarredListCardClick(event: MouseEvent, list: StarredListEntry) {
		if (event.target instanceof Element && event.target.closest('[data-starred-list-author]')) {
			return;
		}

		goto(getListHref(list));
	}

	$: hasLocalLevel = 'level' in data;
	$: starredLists = mergeLevelLists(data?.level, (data?.starredLists ?? []) as StarredListEntry[]);
	$: ($page.params.id, fetchData());

	onMount(() => {
		loaded = true;
		fetchData();

		const recordParam = $page.url.searchParams.get('record');
		if (recordParam) {
			goto(`/record/${recordParam}/${$page.params.id}`);
		}
	});
</script>

<svelte:head>
	{#if 'gdbrowser' in data}
		<title>{data.gdbrowser.name} by {data.gdbrowser.author} - Geometry Dash Việt Nam</title>
		<meta
			property="og:title"
			content={`${data.gdbrowser.name} by {data.gdbrowser.author} - Geometry Dash Việt Nam`}
		/>
		<meta property="og:description" content={data.gdbrowser.description} />
	{:else}
		<title>{data.level.name} by {data.level.creator} - Geometry Dash Việt Nam</title>
		<meta
			property="og:title"
			content={`${data.level.name} by ${data.level.creator} - Geometry Dash Việt Nam`}
		/>
		<meta
			property="og:description"
			content={`${data.level.isPlatformer ? 'Điểm Platformer' : 'Điểm Classic'}: ${data.level.rating} #${data.level.dlTop}\n Điểm Featured List: ${data.level.flPt} #${data.level.flTop}`}
		/>
	{/if}
	<meta
		property="og:image"
		content={'pointercrate' in data
			? `https://img.youtube.com/vi/${new URL(data.pointercrate.video).searchParams.get('v')}/0.jpg`
			: `https://img.youtube.com/vi/${data.level.videoID}/mqdefault.jpg`}
	/>
</svelte:head>

<img
	in:fade={{ delay: 500, duration: 300 }}
	class="bg"
	src={'pointercrate' in data
		? `https://img.youtube.com/vi/${new URL(data.pointercrate.video).searchParams.get('v')}/0.jpg`
		: `https://img.youtube.com/vi/${data.level.videoID}/0.jpg`}
	alt="thumbnail"
/>

<div class="head">
	<div class="cardWrapper">
		<Card.Root>
			<Card.Content>
				<div class="content">
					<div class="levelName">
						{#if 'gdbrowser' in data}
							<h2>{data.gdbrowser.name}</h2>
							<span class="creator">by {data.gdbrowser.author}</span>
						{:else}
							<h2>{data.level.name}</h2>
							<span class="creator flex gap-[5px]"
								>by
								{#if data.level.creatorId}
									<PlayerLink player={data.level.creatorData} />
								{:else}
									{data.level.creator}
								{/if}
							</span>
						{/if}
						{#if levelTags.length > 0}
							<div class="levelTagsRow">
								{#each levelTags as tag}
									<span
										class="levelTagBadge"
										style="background: {tag.color || '#666'}18; color: {tag.color || '#666'}; border: 1px solid {tag.color || '#666'}30"
									>
										<Tag class="h-3 w-3" />
										{tag.name}
									</span>
								{/each}
							</div>
						{/if}
						{#if 'level' in data}
							<div class="levelActionRow">
								<Button variant="outline" size="sm" on:click={() => goto(`/lists?levelId=${$page.params.id}`)}>
									<ListPlus class="mr-2 h-4 w-4" />
									Add to List
								</Button>
							</div>
						{/if}
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>

<div class="detailWrapper">
	<div class="cardWrapper1 point">
		<Card.Root>
			<Card.Content>
				<div class="content" class:starredListPanel={'level' in data}>
					{#if 'level' in data}
						{#if starredLists.length > 0}
							<div class="starredLists">
								{#each starredLists as list}
									<div
										class="starredListCard"
										role="link"
										tabindex="0"
										on:click={(event) => handleStarredListCardClick(event, list)}
										on:keydown={(event) => handleStarredListCardKeydown(event, list)}
									>
										<div class="starredListHeader">
											<div class="starredListTitleWrap">
												<h3>{list.title}</h3>
												{#if list.isOfficial}
													<div class="starredListOfficial">{$_('custom_lists.detail.official_badge')}</div>
												{:else if list.ownerData}
													<div class="starredListAuthor" data-starred-list-author>
														<span>{$_('custom_lists.index.browse.by')}</span>
														<PlayerLink player={list.ownerData} />
													</div>
												{/if}
											</div>
											<div class="starredListBadges">
												<span class="starredListBadge">{formatStarredListPrimaryValue(list)}</span>
												{#if list.mode === 'rating' && hasStarredListPositionBadge(list) && list.item?.rating != null}
													<span class="starredListRatingChip">{formatStarredListRatingValue(list)}</span>
												{/if}
											</div>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<p class="starredListEmpty">{$_('custom_lists.detail.level_lists_empty')}</p>
						{/if}
					{:else if 'pointercrate' in data && data.pointercrate.requirement != -1}
						<div class="pointLabel">
							Pointercrate:
							<div class="top">
								#{data.pointercrate.position}
								{#if 150 <= data.pointercrate.position && data.pointercrate.position < 75}
									(Extended)
								{:else if data.pointercrate.position > 150}
									(Legacy)
								{/if}
							</div>
						</div>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>
	</div>
	<Ads dataAdFormat="auto" />
	<div class="cardWrapper1 detail">
		<Card.Root>
			<Card.Content>
				{#if !('pointercrate' in data)}
					<iframe
						src={`https://www.youtube.com/embed/${data.level.videoID}?si=3M9vP_nLFlxX-0hE`}
						title="YouTube video player"
						frameborder="0"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
						referrerpolicy="strict-origin-when-cross-origin"
						allowfullscreen
					></iframe>
				{/if}
				{#if 'pointercrate' in data}
					<iframe
						src={`https://www.youtube.com/embed/${new URL(data.pointercrate.video).searchParams.get('v')}?si=3M9vP_nLFlxX-0hE`}
						title="YouTube video player"
						frameborder="0"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
						referrerpolicy="strict-origin-when-cross-origin"
						allowfullscreen
					></iframe>
				{/if}
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content>
				<div class="content">
					{#if levelAPI}
						<p><b>{$_('level.description')}:</b> <span>{levelAPI.description}</span></p>
						{#if 'pointercrate' in data && data.pointercrate.requirement != -1}
							<p>
								<b>{$_('level.minimum_progress')}:</b>
								<span>{data.pointercrate.requirement}% (Pointercrate)</span>
							</p>
						{:else if 'level' in data && data.level.rating}
							<p>
								<b
									>{data.level.isPlatformer
										? $_('level.base_time')
										: $_('level.minimum_progress')}:</b
								>
								<span>
									{data.level.isPlatformer
										? getTimeString(data.level.minProgress)
										: `${data.level.minProgress}%`}
								</span>
							</p>
						{/if}
						<p><b>{$_('level.difficulty')}: </b><span>{levelAPI.difficulty}</span></p>
						<p><b>{$_('level.id')}: </b><span>{levelAPI.id}</span></p>
					{:else}
						<Loading inverted />
					{/if}
				</div>
			</Card.Content>
		</Card.Root>
	</div>
	{#if levelVariants.length > 0}
		<div class="cardWrapper1 variantsSection">
			<Card.Root>
				<Card.Content>
					<div class="content">
						<h3 class="variantsTitle">
							<Link class="h-4 w-4" />
							{$_('level.low_detail_variants', { default: 'Low Detail Variants' })}
						</h3>
						<div class="variantsList">
							{#each levelVariants as variant}
								<div class="variantCard">
									<div class="variantDetails">
										<span class="variantName">{variant.name}</span>
										<span class="variantCreator">by {variant.creator}</span>
										<span class="variantId">ID: {variant.id}</span>
									</div>
								</div>
							{/each}
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	{/if}
	{#if 'level' in data && !data.level.isPlatformer}
		<div class="chartWrapper cardWrapper1">
			{#if !deathCount.length}
				<Loading inverted />
			{:else}
				<canvas id="chart" use:createChart />
			{/if}
		</div>
	{/if}
	<div class="cardWrapper1 tabs-section">
		<Tabs.Root bind:value={activeTab} class="w-full">
			<Tabs.List class="grid h-[50px] w-full grid-cols-2">
				<Tabs.Trigger class="h-[40px]" value="records">{$_('level.records')}</Tabs.Trigger>
				<Tabs.Trigger class="h-[40px]" value="community">
					<MessageSquare class="mr-2 h-4 w-4" />
					{$_('community.related_posts')}
				</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="records" class="mt-4">
				{#if records && records.length > 0}
					<div class="records-list">
						{#each records as record, index}
							<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
							<div
								class="record-row"
								class:top1={index === 0}
								on:click={() => goto(`/record/${record.userid}/${record.levelid}`)}
							>
								<span class="record-rank" class:rank-top1={index === 0}>
									{#if index === 0}
										<Crown size={14} />
									{:else}
										#{index + 1}
									{/if}
								</span>

								<div class="record-player">
									<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
									<div on:click={(e) => e.stopPropagation()}>
										<PlayerLink player={record.players} />
									</div>
								</div>

								<div class="record-meta">
									<span class="record-device">
										{#if record.mobile}
											<Smartphone size={12} />
										{:else}
											<Monitor size={12} />
										{/if}
										{#if record.refreshRate}
											<span class="record-fps">{record.refreshRate}fps</span>
										{/if}
									</span>
									<span class="record-date">
										{new Date(record.timestamp).toLocaleDateString('vi-VN')}
									</span>
								</div>

								<span class="record-progress" class:progress-top1={index === 0}>
									{'level' in data && data.level.isPlatformer
										? getTimeString(record.progress)
										: `${record.progress}%`}
								</span>

								<button
									class="record-detail-btn"
									on:click|stopPropagation={() => goto(`/record/${record.userid}/${record.levelid}`)}
									title="View detail"
								>
									<ExternalLink size={13} />
									Detail
								</button>
							</div>
						{/each}
					</div>
					<p class="records-count">{$_('level.total_records')}: {records.length}</p>
				{:else if records}
					<p class="records-empty">No records yet.</p>
				{:else}
					<Loading inverted />
				{/if}
			</Tabs.Content>
			<Tabs.Content value="community" class="mt-4">
				{#if relatedPosts.length > 0}
					<div class="relatedGrid">
						{#each relatedPosts as post}
							<CommunityPostCard {post} compact />
						{/each}
					</div>
				{:else}
					<p class="py-8 text-center text-muted-foreground">{$_('community.no_posts')}</p>
				{/if}
			</Tabs.Content>
		</Tabs.Root>
	</div>
</div>

{#if !records}
	<Loading inverted />
{/if}

<style lang="scss">
	.tabs-section {
		padding-bottom: 20px;
	}

	.records-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.record-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 14px;
		border-radius: 10px;
		border: 1px solid transparent;
		cursor: pointer;
		transition: background 0.15s, border-color 0.15s;

		&:hover {
			background: hsl(var(--muted) / 0.5);
			border-color: hsl(var(--border));

			.record-detail-btn {
				opacity: 1;
			}
		}

		&.top1 {
			background: linear-gradient(90deg, rgba(234, 179, 8, 0.08) 0%, transparent 100%);
			border-color: rgba(234, 179, 8, 0.25);

			&:hover {
				background: linear-gradient(90deg, rgba(234, 179, 8, 0.14) 0%, rgba(234, 179, 8, 0.04) 100%);
				border-color: rgba(234, 179, 8, 0.4);
			}
		}
	}

	.record-rank {
		width: 32px;
		flex-shrink: 0;
		font-size: 0.75rem;
		font-weight: 700;
		color: hsl(var(--muted-foreground));
		display: flex;
		align-items: center;
		justify-content: center;

		&.rank-top1 {
			color: #f59e0b;
			filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.6));
		}
	}

	.record-player {
		flex: 1;
		min-width: 0;
		font-weight: 500;
	}

	.record-meta {
		display: flex;
		align-items: center;
		gap: 8px;
		color: hsl(var(--muted-foreground));
		font-size: 0.75rem;
	}

	.record-device {
		display: flex;
		align-items: center;
		gap: 3px;
	}

	.record-fps {
		font-size: 0.7rem;
	}

	.record-date {
		font-size: 0.75rem;
	}

	.record-progress {
		font-size: 0.875rem;
		font-weight: 600;
		min-width: 56px;
		text-align: right;
		flex-shrink: 0;

		&.progress-top1 {
			color: #f59e0b;
		}
	}

	.record-detail-btn {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 4px 10px;
		border-radius: 6px;
		font-size: 0.75rem;
		font-weight: 600;
		border: 1px solid hsl(var(--border));
		background: hsl(var(--background));
		color: hsl(var(--foreground));
		cursor: pointer;
		opacity: 0;
		transition: opacity 0.15s, background 0.15s;
		flex-shrink: 0;
		white-space: nowrap;

		&:hover {
			background: hsl(var(--muted));
		}
	}

	.record-row:hover .record-detail-btn {
		opacity: 1;
	}

	.records-count {
		font-size: 0.75rem;
		color: hsl(var(--muted-foreground));
		text-align: center;
		margin-top: 12px;
	}

	.records-empty {
		text-align: center;
		padding: 32px 0;
		color: hsl(var(--muted-foreground));
		font-size: 0.875rem;
	}

	@media (max-width: 600px) {
		.record-meta {
			display: none;
		}

		.record-detail-btn {
			opacity: 1;
		}
	}

	@media (hover: none) {
		.record-detail-btn {
			opacity: 1;
		}
	}

	.chartWrapper {
		height: 200px;
		display: flex;
		justify-content: center;
		margin-top: 20px;
		width: 100%;
	}

	.detail {
		display: grid;
		grid-template-columns: calc(50% - 10px) calc(50% - 10px);
		gap: 20px;

		iframe {
			width: 100%;
			height: 280px;
			margin-top: 20px;
			border-radius: var(--radius);
		}

		.content {
			p {
				line-height: 20px;
				margin-bottom: 5px;
			}

			span {
				color: var(--textColor2);
			}
		}
	}

	h2 {
		font-weight: bold;
		font-size: 30px;
	}

	.creator {
		color: var(--textColor2);
	}

	.bg {
		width: 100%;
		height: 38vw;
		max-height: 500px;
		min-height: 400px;
		object-fit: cover;
		position: fixed;
		z-index: 0;
		top: 0;
	}

	.detailWrapper {
		background-color: hsl(var(--background));
		position: relative;
		z-index: 1;
	}

	.cardWrapper {
		width: 1200px;
		max-width: 100%;
		margin-inline: auto;
		margin-top: auto;
		padding-inline: 10px;

		.content {
			padding-top: 20px;
		}
	}

	.cardWrapper1 {
		width: 1200px;
		max-width: 100%;
		margin-inline: auto;
		padding-inline: 10px;
		padding-top: 20px;
		position: relative;
		z-index: 2;

		.content {
			padding-top: 20px;
		}
	}

	.point {
		.content {
			display: flex;
			justify-content: space-evenly;
			gap: 12px;

			.pointLabel {
				display: flex;
				gap: 10px;
				font-weight: 600;

				.top {
					background-color: var(--textColor);
					color: var(--textColorInverted);
					padding-inline: 10px;
					border-radius: 4px;
				}
			}

			&.starredListPanel {
				display: block;
			}
		}
	}

	.starredLists {
		display: grid;
		gap: 12px;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
	}

	.starredListCard {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 14px;
		border: 1px solid var(--border1);
		border-radius: var(--radius);
		text-decoration: none;
		color: inherit;
		transition: background 0.15s ease, border-color 0.15s ease;

		&:hover {
			background: hsl(var(--muted) / 0.25);
			border-color: hsl(var(--border));
		}
	}

	.starredListHeader {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		align-items: center;
	}

	.starredListTitleWrap {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;

		h3 {
			margin: 0;
			font-size: 16px;
			font-weight: 700;
		}
	}

	.starredListAuthor {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: var(--textColor2);
	}

	.starredListOfficial {
		font-size: 12px;
		font-weight: 600;
		color: var(--textColor2);
	}

	.starredListBadges {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.starredListBadge {
		background: var(--textColor);
		color: var(--textColorInverted);
		padding: 4px 8px;
		border-radius: 999px;
		font-size: 12px;
		font-weight: 700;
		white-space: nowrap;
	}

	.starredListRatingChip {
		background: hsl(var(--muted));
		color: hsl(var(--foreground));
		padding: 4px 8px;
		border-radius: 999px;
		font-size: 12px;
		font-weight: 700;
		white-space: nowrap;
		border: 1px solid hsl(var(--border));
	}

	.starredListEmpty {
		margin: 0;
		text-align: center;
		color: var(--textColor2);
		padding: 8px 0;
	}

	.head {
		position: relative;
		background: linear-gradient(rgba(0, 0, 0, 0) 10%, hsl(var(--background)) 400px);
		height: 33vw;
		max-height: 500px;
		min-height: 300px;
		z-index: 10;
		display: flex;
		flex-direction: column;
	}

	@media screen and (max-width: 900px) {
		.point {
			.content {
				flex-direction: column;
			}
		}

		.detail {
			grid-template-columns: 100%;
		}
	}

	.relatedGrid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 12px;
	}

	.levelTagsRow {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 6px;
	}

	.levelTagBadge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 3px 10px;
		border-radius: 10px;
		font-size: 12px;
		font-weight: 600;
		line-height: 1;
	}

	.levelActionRow {
		display: flex;
		margin-top: 10px;
	}

	.variantsSection {
		margin-top: 0;
	}

	.variantsTitle {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 16px;
		font-weight: 600;
		margin-bottom: 12px;
	}

	.variantsList {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 12px;
	}

	.variantCard {
		display: flex;
		gap: 12px;
		padding: 10px;
		border: 1px solid var(--border1);
		border-radius: var(--radius);
		text-decoration: none;
		color: inherit;
		transition: background 0.15s;

		&:hover {
			background: hsl(var(--muted) / 0.3);
		}
	}

	.variantDetails {
		display: flex;
		flex-direction: column;
		gap: 2px;
		justify-content: center;
	}

	.variantName {
		font-weight: 600;
		font-size: 14px;
	}

	.variantCreator {
		color: var(--textColor2);
		font-size: 13px;
	}

	.variantId {
		color: var(--textColor2);
		font-size: 12px;
		opacity: 0.7;
	}
</style>
