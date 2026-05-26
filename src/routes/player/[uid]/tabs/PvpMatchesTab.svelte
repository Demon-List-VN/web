<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import * as Pagination from '$lib/components/ui/pagination';
	import * as Table from '$lib/components/ui/table';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import { cn } from '$lib/utils';
	import { ExternalLink } from 'lucide-svelte';
	import {
		getPublicPvpMatchesPageForPlayer,
		getPvpMatchId,
		getPvpParticipants,
		getPvpParticipantIsAnonymous,
		getPvpParticipantPlayer,
		getPvpParticipantRatingAfter,
		getPvpParticipantRatingBefore,
		getPvpParticipantRatingDiff,
		getPvpParticipantUid,
		type PvpParticipant,
		type PvpMatch
	} from '$lib/client/pvp';

	export let userID: string;

	const PAGE_SIZE = 25;

	let matches: PvpMatch[] = [];
	let total = 0;
	let currentPage = 1;
	let loading = true;

	$: pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

	onMount(async () => {
		await loadPage(1);
	});

	async function loadPage(page: number) {
		const nextPage = Math.max(1, Math.min(page, pageCount));
		loading = true;

		try {
			const result = await getPublicPvpMatchesPageForPlayer(
				userID,
				nextPage,
				PAGE_SIZE
			);
			matches = result.data;
			total = result.total;
			currentPage = result.page;
		} catch (error) {
			console.error('Failed to fetch PvP matches:', error);
			matches = [];
			total = 0;
		} finally {
			loading = false;
		}
	}

	function playerParticipant(match: PvpMatch) {
		return (
			getPvpParticipants(match)
				.find(
					(participant) =>
						String(getPvpParticipantUid(participant)) === String(userID)
				) ?? null
		);
	}

	function ratingBefore(match: PvpMatch) {
		return getPvpParticipantRatingBefore(playerParticipant(match));
	}

	function ratingAfter(match: PvpMatch) {
		return getPvpParticipantRatingAfter(playerParticipant(match));
	}

	function ratingDiff(match: PvpMatch) {
		return getPvpParticipantRatingDiff(playerParticipant(match));
	}

	function formatRating(value: number | null) {
		return value === null ? '-' : Math.round(value);
	}

	function formatRatingDiff(value: number | null) {
		if (value === null) {
			return '-';
		}

		const rounded = Math.round(value);

		return `${rounded > 0 ? '+' : ''}${rounded}`;
	}

	function formatDate(value: string | null | undefined) {
		if (!value) {
			return '-';
		}

		return new Date(value)
			.toLocaleString('vi-VN');
	}

	function matchDate(match: PvpMatch) {
		return (
			match.ratingAppliedAt ?? match.endedAt ?? match.endsAt
			?? match.startedAt ?? match.created_at
		);
	}

	function participantText(
		participant: PvpParticipant | null | undefined,
		fallback: string
	) {
		if (!participant) {
			return fallback;
		}

		if (getPvpParticipantIsAnonymous(participant)) {
			return $_('pvp.anonymous_player');
		}

		const player = getPvpParticipantPlayer(participant);

		return player?.name || fallback;
	}
</script>

{#if loading}
  <div class="flex justify-center py-10">
    <p>{$_('general.loading')}...</p>
  </div>
{:else if matches.length === 0}
  <div class="flex flex-col items-center justify-center py-12 text-center">
    <p class="text-muted-foreground">{$_('player.no_pvp_matches')}</p>
  </div>
{:else}
  <div class="space-y-4">
    <Table.Root>
      <Table.Caption>{$_('player.table.total_pvp_matches')}: {
          total
        }</Table.Caption>
      <Table.Header>
        <Table.Row>
          <Table.Head class="min-w-[220px]">{
            $_('player.table.match')
          }</Table.Head>
          <Table.Head class="w-[180px] text-center">{
            $_('player.table.time')
          }</Table.Head>
          <Table.Head class="w-[220px] text-center">{
            $_('player.table.elo')
          }</Table.Head>
          <Table.Head class="w-[56px] text-right"></Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each matches as match}
          {@const before = ratingBefore(match)}
          {@const after = ratingAfter(match)}
          {@const diff = ratingDiff(match)}
          {@const matchId = getPvpMatchId(match)}
          {@const participants = getPvpParticipants(match)}
          {@const playerA = participants[0]}
          {@const playerB = participants[1]}
          {@const playerAData = getPvpParticipantPlayer(playerA)}
          {@const playerBData = getPvpParticipantPlayer(playerB)}
          <Table.Row>
            <Table.Cell class="font-medium">
              <div class="flex min-w-0 items-center gap-2">
                {#if playerAData?.uid}
                  <PlayerLink player={playerAData} truncate={18} />
                {:else}
                  <span class="truncate">{participantText(playerA, 'Player A')}</span>
                {/if}
                <span class="shrink-0 text-muted-foreground">vs</span>
                {#if playerBData?.uid}
                  <PlayerLink player={playerBData} truncate={18} />
                {:else}
                  <span class="truncate">{participantText(playerB, 'Player B')}</span>
                {/if}
              </div>
            </Table.Cell>
            <Table.Cell class="text-center">{
              formatDate(matchDate(match))
            }</Table.Cell>
            <Table.Cell
              class="text-center font-semibold"
            >
              {#if before !== null || after !== null}
                <span>{formatRating(before)}</span>
                <span class="mx-1 text-muted-foreground">-&gt;</span>
                <span>{formatRating(after)}</span>
                {#if diff !== null}
                  <span
                    class={cn(
                      'ml-1',
                      diff > 0
                          ? 'text-green-600'
                          : diff < 0
                          ? 'text-red-600'
                          : 'text-muted-foreground'
                    )}
                  >
                    ({formatRatingDiff(diff)})
                  </span>
                {/if}
              {:else}
                -
              {/if}
            </Table.Cell>
            <Table.Cell class="text-right">
              {#if matchId}
                <a
                  href={`/versus/matches/${matchId}`}
                  class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={$_('pvp.view_match')}
                  title={$_('pvp.view_match')}
                >
                  <ExternalLink class="h-4 w-4" />
                </a>
              {/if}
            </Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>

    {#if total > PAGE_SIZE}
      <Pagination.Root
        count={total}
        perPage={PAGE_SIZE}
        page={currentPage}
        let:pages
        let:currentPage={paginationCurrentPage}
      >
        <Pagination.Content>
          <Pagination.Item>
            <Pagination.PrevButton
              disabled={paginationCurrentPage <= 1 || loading}
              on:click={() => loadPage(paginationCurrentPage - 1)}
            />
          </Pagination.Item>
          {#each pages as page (page.key)}
            {#if page.type === 'ellipsis'}
              <Pagination.Item>
                <Pagination.Ellipsis />
              </Pagination.Item>
            {:else}
              <Pagination.Item isVisible={paginationCurrentPage === page.value}>
                <Pagination.Link
                  {page}
                  isActive={paginationCurrentPage === page.value}
                  disabled={loading}
                  on:click={() => loadPage(page.value)}
                >
                  {page.value}
                </Pagination.Link>
              </Pagination.Item>
            {/if}
          {/each}
          <Pagination.Item>
            <Pagination.NextButton
              disabled={paginationCurrentPage >= pageCount || loading}
              on:click={() => loadPage(paginationCurrentPage + 1)}
            />
          </Pagination.Item>
        </Pagination.Content>
      </Pagination.Root>
    {/if}
  </div>
{/if}
