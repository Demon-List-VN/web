<script lang="ts">
	import * as Pagination from '$lib/components/ui/pagination';
	import * as Table from '$lib/components/ui/table';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import PlayerLink from '$lib/components/playerLink.svelte';

	import { getTitle } from '$lib/client';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { _ } from 'svelte-i18n';

	import type { PageData } from './$types';
	import Ads from '$lib/components/ads.svelte';

	export let data: PageData;
	let curPage = -1;
	let calibrated = false;

	async function update() {
		curPage = parseInt($page.url.searchParams.get('page') || '1');
	}

	function getListTitle() {
		if ($page.params.list == 'dl') {
			return 'Classic List';
		} else if ($page.params.list == 'pl') {
			return 'Platformer List';
		} else if ($page.params.list == 'cl') {
			return 'Challenge List';
		} else if ($page.params.list == 'fl') {
			return 'Featured List';
		}

		return 'None';
	}

	$: ($page.url, update());

	onMount(() => {
		document.getElementById(`page${curPage}`)?.click();
	});
</script>

<svelte:head>
	<title>Bảng xếp hạng - {getListTitle()} - Geometry Dash Việt Nam</title>
</svelte:head>

<Ads dataAdFormat="rectangle" />

<div class="tableWrapper">
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head class="w-[55px]">{$_('list.tabs.rank')}</Table.Head>
				<Table.Head>{$_('list.tabs.player')}</Table.Head>
				<Table.Head class="w-[70px] text-right">
					{$page.params.list == 'dl' || $page.params.list == 'pl' || $page.params.list == 'cl'
						? $_('list.tabs.rating')
						: $_('list.tabs.total_point')}
				</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each data.leaderboard as player}
				<Table.Row>
					<Table.Cell class="font-medium">
						#{(() => {
							if ($page.params.list == 'dl') {
								return player.overallRank;
							}

							return player[$page.params.list + 'rank'];
						})()}
					</Table.Cell>
					<Table.Cell>
						<div class="playerNameWrapper">
							<PlayerLink {player} showTitle={$page.params.list != 'pl'} titleType={$page.params.list}  />
						</div>
					</Table.Cell>
					<Table.Cell class="text-right">
						{(() => {
							if ($page.params.list == 'dl') {
								return player.rating;
							}

							if ($page.params.list == 'pl') {
								return player.plRating;
							}

							if ($page.params.list == 'cl') {
								return player.clRating;
							}

							return player[
								'total' +
									// @ts-ignore
									$page.params.list.toUpperCase() +
									'pt'
							];
						})()}
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</div>

<Pagination.Root count={data.count} perPage={50} let:pages let:currentPage>
	<Pagination.Content>
		<Pagination.Item>
			<Pagination.PrevButton
				on:click={() => goto(`/list/${$page.params.list}/leaderboard?page=${currentPage - 1}`)}
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
								goto(`/list/${$page.params.list}/leaderboard?page=${p.value}`);
							}
						}}
						id={`page${p.value}`}
					>
						{p.value}
					</Pagination.Link>
				</Pagination.Item>
			{/if}
		{/each}
		<Pagination.Item>
			<Pagination.NextButton
				on:click={() => goto(`/list/${$page.params.list}/leaderboard?page=${currentPage + 1}`)}
			/>
		</Pagination.Item>
	</Pagination.Content>
</Pagination.Root>

<style lang="scss">
	.playerNameWrapper {
		display: flex;
		gap: 10px;

		.rank {
			color: white;
			font-size: 10px;
			width: fit-content;
			padding-inline: 5px;
			border-radius: 5px;
			font-weight: 600;
		}
	}

	.tableWrapper {
		margin-inline: auto;
		margin-bottom: 25px;
		width: 1000px;
		max-width: calc(100% - 40px);
	}
</style>
