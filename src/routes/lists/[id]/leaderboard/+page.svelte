<script lang="ts">
	import * as Pagination from '$lib/components/ui/pagination';
	import * as Table from '$lib/components/ui/table';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { _ } from 'svelte-i18n';

	export let data: any;

	let calibrated = false;

	function getListIdentifier() {
		return data?.list?.slug || $page.params.id;
	}

	function formatScore(score: number) {
		return Number.isInteger(score) ? score : Math.round(score * 1000) / 1000;
	}
</script>

<svelte:head>
	<title>{data?.list ? `Leaderboard - ${data.list.title} - Geometry Dash Việt Nam` : 'Leaderboard - Geometry Dash Việt Nam'}</title>
</svelte:head>

<div class="page">
	{#if data.error}
		<div class="emptyState">
			<h3>{$_('custom_lists.detail.error_title')}</h3>
			<p>{data.error}</p>
		</div>
	{:else if !data.list}
		<div class="emptyState">
			<h3>{$_('custom_lists.detail.error_title')}</h3>
			<p>Failed to load list.</p>
		</div>
	{:else}
		<div class="header">
			<h1>{data.list.title} Leaderboard</h1>
			<p class="subhead">
				{data.list.mode === 'top'
					? 'Score is the weighted count of eligible list records.'
					: 'Score is the weighted sum of each eligible record contribution.'}
			</p>
		</div>

		<div class="tableWrapper">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head class="w-[55px]">{$_('list.tabs.rank')}</Table.Head>
						<Table.Head>{$_('list.tabs.player')}</Table.Head>
						<Table.Head class="w-[100px] text-right">Score</Table.Head>
						<Table.Head class="w-[120px] text-right">Eligible Records</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.leaderboard as player}
						<Table.Row>
							<Table.Cell class="font-medium">#{player.rank}</Table.Cell>
							<Table.Cell>
								<div class="playerNameWrapper">
									<PlayerLink player={player} showTitle={!data.list.isPlatformer} titleType={data.list.isPlatformer ? 'pl' : 'dl'} />
								</div>
							</Table.Cell>
							<Table.Cell class="text-right">{formatScore(player.score)}</Table.Cell>
							<Table.Cell class="text-right">{player.completedCount}</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>

		<Pagination.Root count={data.count} perPage={50} let:pages let:currentPage>
			<Pagination.Content>
				<Pagination.Item>
					<Pagination.PrevButton
						on:click={() => goto(`/lists/${getListIdentifier()}/leaderboard?page=${currentPage - 1}`)}
					/>
				</Pagination.Item>
				{#each pages as p (p.key)}
					{#if p.type === 'ellipsis'}
						<Pagination.Item>
							<Pagination.Ellipsis />
						</Pagination.Item>
					{:else}
						<Pagination.Item isVisible={currentPage == p.value}>
							<Pagination.Link
								page={p}
								isActive={currentPage == p.value}
								on:click={() => {
									if (!calibrated) {
										calibrated = true;
									} else {
										goto(`/lists/${getListIdentifier()}/leaderboard?page=${p.value}`);
									}
								}}
							>
								{p.value}
							</Pagination.Link>
						</Pagination.Item>
					{/if}
				{/each}
				<Pagination.Item>
					<Pagination.NextButton
						on:click={() => goto(`/lists/${getListIdentifier()}/leaderboard?page=${currentPage + 1}`)}
					/>
				</Pagination.Item>
			</Pagination.Content>
		</Pagination.Root>
	{/if}
</div>

<style lang="scss">
	.page {
		max-width: 1000px;
		margin: 0 auto;
		padding: 24px 16px 48px;
	}

	.header {
		margin-bottom: 20px;
	}

	.header h1 {
		margin: 0;
		font-size: 1.75rem;
		font-weight: 700;
	}

	.subhead {
		margin: 8px 0 0;
		color: hsl(var(--muted-foreground));
	}

	.playerNameWrapper {
		display: flex;
		gap: 10px;
	}

	.tableWrapper {
		margin-bottom: 24px;
	}

	.emptyState {
		padding: 32px 20px;
		text-align: center;
		border: 1px solid hsl(var(--border));
		border-radius: 16px;
		background: hsl(var(--card));
		color: hsl(var(--muted-foreground));
	}

	.emptyState h3 {
		margin: 0 0 8px;
		color: hsl(var(--foreground));
	}

	.emptyState p {
		margin: 0;
	}
</style>