<script lang="ts">
	import LevelCard from '$lib/components/levelCard.svelte';
	import { toLevelCardProps } from '$lib/components/levelCardProps';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { user } from '$lib/client';
	import {
		ArrowLeft,
		Settings,
		Globe2,
		EyeOff,
		Lock,
		Layers,
		Clock,
		ListOrdered,
		Star
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
		level: any | null;
	};

	type CustomList = {
		id: number;
		owner: string;
		title: string;
		description: string;
		isPlatformer: boolean;
		visibility: 'private' | 'unlisted' | 'public';
		mode: 'rating' | 'top';
		tags: string[];
		levelCount: number;
		updated_at: string;
		items: CustomListItem[];
	};

	let list: CustomList | null = data?.list ?? null;
	let loadingError = data?.error ?? '';
	let authFetchKey = '';

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

	$: if ($user.checked && $user.loggedIn) {
		refetchWithAuth();
	}

	async function refetchWithAuth() {
		const key = `${$page.params.id}:${$user.data?.uid || 'authed'}`;
		if (key === authFetchKey) return;
		authFetchKey = key;

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${$page.params.id}`, {
				headers: {
					Authorization: `Bearer ${await $user.token()}`
				}
			});

			const payload = await res.json().catch(() => null);

			if (res.ok && payload) {
				list = payload as CustomList;
				loadingError = '';
				return;
			}

			if (!list) {
				loadingError = payload?.error || loadingError || 'Failed to load list';
			}
		} catch {
			// Keep the SSR state when auth recovery fails.
		}
	}

	$: isOwner = Boolean(list && $user.loggedIn && list.owner === $user.data?.uid);
	$: listItems = list?.items ?? [];
	$: listCardType = list?.isPlatformer ? 'pl' : 'dl';
</script>

<svelte:head>
	<title>{list ? `${list.title} - Danh sách - Geometry Dash Việt Nam` : 'Danh sách - Geometry Dash Việt Nam'}</title>
	{#if list?.description}
		<meta name="description" content={list.description} />
	{/if}
</svelte:head>

<div class="page">
	<!-- Toolbar -->
	<div class="toolbar">
		<Button variant="outline" size="sm" on:click={() => goto('/lists')}>
			<ArrowLeft class="mr-2 h-4 w-4" />
			{$_('custom_lists.back')}
		</Button>
		{#if list && isOwner}
			<Button size="sm" on:click={() => goto(`/lists/${$page.params.id}/manage`)}>
				<Settings class="mr-2 h-4 w-4" />
				{$_('custom_lists.actions.manage')}
			</Button>
		{/if}
	</div>

	{#if loadingError}
		<div class="emptyState">
			<h3>{$_('custom_lists.detail.error_title')}</h3>
			<p>{loadingError}</p>
		</div>
	{:else if list}
		<!-- Hero Card -->
		<div class="hero">
			<div class="heroTop">
				<h1>{list.title}</h1>
				{#if list.description}
					<p class="heroDesc">{list.description}</p>
				{:else}
					<p class="heroDesc muted">{$_('custom_lists.detail.no_description')}</p>
				{/if}
			</div>

			<div class="heroMeta">
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
				<span class="metaChip">
					{$_('custom_lists.detail.levels_badge', { values: { count: list.levelCount } })}
				</span>
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

		<!-- Levels Section -->
		<div class="levelsSection">
			<div class="sectionHeader">
				<h2>{$_('custom_lists.detail.levels.heading')}</h2>
				<Badge variant="outline">{list.items.length}</Badge>
			</div>

			{#if listItems.length === 0}
				<div class="emptyState slim">
					<h3>{$_('custom_lists.detail.levels.empty_title')}</h3>
					<p>{isOwner ? $_('custom_lists.detail.levels.empty_owner_manage') : $_('custom_lists.detail.levels.empty_visitor')}</p>
				</div>
			{:else}
				<div class="levels">
					{#each listItems as item, i}
						{#if item.level}
							<LevelCard
								{...toLevelCardProps(item.level, listCardType, {
									rating: list.mode === 'rating' ? (item.rating ?? item.level.rating) : item.level.rating,
									top: i + 1,
									minProgress: item.minProgress ?? item.level.minProgress ?? null
								})}
								type={listCardType}
								hideRating={list.mode === 'top'}
								ratingPrediction={false}
							/>
						{:else}
							<div class="missingLevel">
								<div class="missingRank">#{i + 1}</div>
								<div class="missingContent">
									<h4>{$_('custom_lists.detail.levels.unavailable', { values: { id: item.levelId } })}</h4>
									<p>{$_('custom_lists.detail.levels.unavailable_desc')}</p>
								</div>
							</div>
						{/if}
					{/each}
				</div>
			{/if}
		</div>
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
	}

	/* Toolbar */
	.toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
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
	}

	.heroTop h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 700;
		letter-spacing: -0.01em;
	}

	.heroDesc {
		margin: 6px 0 0;
		font-size: 0.95rem;
		color: hsl(var(--foreground));
		line-height: 1.5;
	}

	.heroDesc.muted {
		color: hsl(var(--muted-foreground));
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

	/* Levels */
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

	.levels {
		display: grid;
		align-items: start;
		gap: 10px;
		grid-template-columns: repeat(2, 1fr);
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
</style>
