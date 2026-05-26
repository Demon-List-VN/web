<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import * as Pagination from '$lib/components/ui/pagination';
	import * as Table from '$lib/components/ui/table';
	import { buttonVariants } from '$lib/components/ui/button';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import { cn } from '$lib/utils';
	import { ArrowRight } from 'lucide-svelte';
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
		getPvpVisibleParticipantRatingLabel,
		getPvpWinnerUid,
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
					(participant) => getPvpParticipantUid(participant) === userID
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

	function shouldHideRating(match: PvpMatch) {
		return ratingAfterLabel(match) === null;
	}

	function ratingAfterLabel(match: PvpMatch) {
		return getPvpVisibleParticipantRatingLabel(playerParticipant(match));
	}

	function matchResult(match: PvpMatch) {
		const winnerUid = getPvpWinnerUid(match);

		if (!winnerUid || !playerParticipant(match)) {
			return null;
		}

		return String(winnerUid) === String(userID) ? 'win' : 'lose';
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
          <Table.Head class="w-[100px] text-center">{
            $_('player.table.result')
          }</Table.Head>
          <Table.Head class="w-[120px] text-center">{
            $_('player.table.elo_before')
          }</Table.Head>
          <Table.Head class="w-[120px] text-center">{
            $_('player.table.elo_diff')
          }</Table.Head>
          <Table.Head class="w-[120px] text-center">{
            $_('player.table.current_elo')
          }</Table.Head>
          <Table.Head class="w-[120px] text-right"></Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each matches as match}
          {@const diff = ratingDiff(match)}
          {@const result = matchResult(match)}
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
                  <span>{participantText(playerA, 'Player A')}</span>
                {/if}
                <span class="text-muted-foreground">vs</span>
                {#if playerBData?.uid}
                  <PlayerLink player={playerBData} truncate={18} />
                {:else}
                  <span>{participantText(playerB, 'Player B')}</span>
                {/if}
              </div>
            </Table.Cell>
            <Table.Cell class="text-center">{
              formatDate(matchDate(match))
            }</Table.Cell>
            <Table.Cell
              class={`text-center font-semibold ${
                  result === 'win'
                      ? 'text-green-600'
                      : result === 'lose'
                      ? 'text-red-600'
                      : ''
              }`}
            >
              {result === 'win' ? 'Win' : result === 'lose' ? 'Lose' : '-'}
            </Table.Cell>
            <Table.Cell class="text-center">{
              shouldHideRating(match) ? '-' : formatRating(ratingBefore(match))
            }</Table.Cell>
            <Table.Cell
              class={`text-center font-semibold ${
                  shouldHideRating(match) || diff === null
                      ? ''
                      : diff > 0
                      ? 'text-primary'
                      : diff < 0
                      ? 'text-destructive'
                      : ''
              }`}
            >
              {shouldHideRating(match) ? '-' : formatRatingDiff(diff)}
            </Table.Cell>
            <Table.Cell class="text-center font-semibold">{
              shouldHideRating(match)
              ? '-'
              : (ratingAfterLabel(match) ?? formatRating(ratingAfter(match)))
            }</Table.Cell>
            <Table.Cell class="text-right">
              {#if matchId}
                <a
                  href={`/versus/matches/${matchId}`}
                  class={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1')}
                >
                  {$_('pvp.view_match')}
                  <ArrowRight class="h-4 w-4" />
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
