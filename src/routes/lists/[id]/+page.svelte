<script lang="ts">
	import LevelCard from '$lib/components/levelCard.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { user } from '$lib/client';
	import { ArrowLeft, Settings } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';

	type CustomListItem = {
		id: number;
		levelId: number;
		created_at: string;
		rating: number;
		position: number | null;
		level: any | null;
	};

	type CustomList = {
		id: number;
		owner: string;
		title: string;
		description: string;
		visibility: 'private' | 'unlisted' | 'public';
		mode: 'rating' | 'top';
		tags: string[];
		levelCount: number;
		updated_at: string;
		items: CustomListItem[];
	};

	let list: CustomList | null = null;
	let loading = true;
	let loadingError = '';
	let loadKey = '';

	function formatVisibility(visibility: string) {
		if (visibility === 'public') return $_('custom_lists.visibility.public');
		if (visibility === 'unlisted') return $_('custom_lists.visibility.unlisted');
		return $_('custom_lists.visibility.private');
	}

	function formatDate(value: string) {
		return new Date(value).toLocaleString('vi-VN');
	}

	function getModeLabel(mode: 'rating' | 'top') {
		return mode === 'rating'
			? $_('custom_lists.detail.edit.mode_rating')
			: $_('custom_lists.detail.edit.mode_top');
	}

	async function fetchList() {
		loading = true;
		loadingError = '';

		try {
			const headers: Record<string, string> = {};
			if ($user.loggedIn) {
				headers.Authorization = `Bearer ${await $user.token()}`;
			}

			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${$page.params.id}`, {
				headers
			});

			const payload = await res.json().catch(() => null);

			if (!res.ok) {
				throw new Error(payload?.error || $_('custom_lists.toast.failed_load'));
			}

			list = payload as CustomList;
		} catch (error) {
			loadingError = error instanceof Error ? error.message : $_('custom_lists.toast.failed_load');
			list = null;
		} finally {
			loading = false;
		}
	}

	$: isOwner = Boolean(list && $user.loggedIn && list.owner === $user.data?.uid);
	$: listItems = list?.items ?? [];
	$: if ($user.checked) {
		const viewerKey = $user.loggedIn ? $user.data?.uid || 'authed' : 'guest';
		const nextKey = `${$page.params.id}:${viewerKey}`;
		if (nextKey !== loadKey) {
			loadKey = nextKey;
			fetchList();
		}
	}
</script>

<svelte:head>
	<title>{list ? `${list.title} - ${$_('custom_lists.page_title')}` : $_('custom_lists.index.title')} - Geometry Dash Việt Nam</title>
</svelte:head>

<div class="page">
	<div class="toolbar">
		<Button variant="outline" on:click={() => goto('/lists')}>
			<ArrowLeft class="mr-2 h-4 w-4" />
			{$_('custom_lists.back')}
		</Button>
		{#if list && isOwner}
			<Button on:click={() => goto(`/lists/${$page.params.id}/manage`)}>
				<Settings class="mr-2 h-4 w-4" />
				{$_('custom_lists.actions.manage')}
			</Button>
		{/if}
	</div>

	{#if loading}
		<div class="emptyState">{$_('custom_lists.detail.loading')}</div>
	{:else if loadingError}
		<div class="emptyState">
			<h2>{$_('custom_lists.detail.error_title')}</h2>
			<p>{loadingError}</p>
		</div>
	{:else if list}
		<Card.Root class="heroCard">
			<Card.Content class="pt-6">
				<div class="heroHead">
					<div>
						<h1>{list.title}</h1>
						<p>{list.description || $_('custom_lists.detail.no_description')}</p>
					</div>
					<div class="heroMeta">
						<Badge variant="outline">{formatVisibility(list.visibility)}</Badge>
						<Badge variant="secondary">{getModeLabel(list.mode)}</Badge>
						<Badge variant="outline">{$_('custom_lists.detail.levels_badge', { values: { count: list.levelCount } })}</Badge>
					</div>
				</div>

				{#if list.tags?.length}
					<div class="tagRow">
						{#each list.tags as tag}
							<Badge variant="outline">{tag}</Badge>
						{/each}
					</div>
				{/if}

				<p class="updatedAt">{$_('custom_lists.detail.updated', { values: { date: formatDate(list.updated_at) } })}</p>
			</Card.Content>
		</Card.Root>

		<div class="sectionHeader">
			<h2>{$_('custom_lists.detail.levels.heading')}</h2>
			<Badge variant="outline">{list.items.length}</Badge>
		</div>

		{#if listItems.length === 0}
			<div class="emptyState slim">
				<h2>{$_('custom_lists.detail.levels.empty_title')}</h2>
				<p>{isOwner ? $_('custom_lists.detail.levels.empty_owner_manage') : $_('custom_lists.detail.levels.empty_visitor')}</p>
			</div>
		{:else}
			<div class="levelsWrapper">
				<div class="levels">
					{#each listItems as item, i}
						{#if item.level}
							<LevelCard
								level={{
									...item.level,
									rating: list.mode === 'rating' ? (item.rating ?? item.level.rating) : item.level.rating
								}}
								type="dl"
								top={i + 1}
							/>
						{:else}
							<Card.Root class="missingLevelCard">
								<Card.Content class="pt-6">
									<div class="missingLevelHeader">
										<div class="rankBadge">#{i + 1}</div>
										<div>
											<h3>{$_('custom_lists.detail.levels.unavailable', { values: { id: item.levelId } })}</h3>
											<p>{$_('custom_lists.detail.levels.unavailable_desc')}</p>
										</div>
									</div>
								</Card.Content>
							</Card.Root>
						{/if}
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>

<style lang="scss">
	.page {
		max-width: 1100px;
		margin: 0 auto;
		padding: 24px 16px 48px;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	h1,
	h2,
	.emptyState h2 {
		margin: 0;
	}

	:global(.heroCard),
	:global(.missingLevelCard) {
		border: 1px solid hsl(var(--border));
	}

	.toolbar,
	.heroHead,
	.heroMeta,
	.sectionHeader,
	.tagRow,
	.missingLevelHeader {
		display: flex;
		gap: 12px;
	}

	.toolbar,
	.heroHead,
	.sectionHeader {
		justify-content: space-between;
	}

	.toolbar,
	.heroHead,
	.heroMeta,
	.sectionHeader,
	.missingLevelHeader {
		align-items: center;
	}

	.heroMeta,
	.tagRow {
		flex-wrap: wrap;
	}

	.heroHead p,
	.updatedAt,
	:global(.missingLevelCard) p,
	.emptyState p {
		color: hsl(var(--muted-foreground));
	}

	.tagRow,
	.updatedAt {
		margin-top: 12px;
	}

	.levelsWrapper {
		display: flex;
		justify-content: center;
	}

	.levels {
		display: grid;
		align-items: start;
		gap: 10px;
		grid-template-columns: 500px 500px;
		margin-inline: auto;
		margin-bottom: 20px;
		padding-inline: 10px;
	}

	:global(.missingLevelCard) {
		width: 500px;
	}

	:global(.missingLevelCard) h3 {
		margin: 0;
		font-size: 1rem;
	}

	.rankBadge {
		font-size: 0.85rem;
		font-weight: 700;
		color: hsl(var(--muted-foreground));
		min-width: 28px;
		text-align: center;
		flex-shrink: 0;
	}

	@media screen and (max-width: 1100px) {
		.levels {
			grid-template-columns: 100%;
		}

		:global(.missingLevelCard) {
			width: 100%;
		}
	}

	.emptyState {
		border: 1px dashed hsl(var(--border));
		border-radius: 16px;
		padding: 32px 20px;
		text-align: center;
		background: hsl(var(--muted) / 0.18);
	}

	.emptyState.slim {
		padding: 28px 20px;
	}

	@media screen and (max-width: 700px) {
		.toolbar,
		.heroHead,
		.sectionHeader,
		.missingLevelHeader {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>