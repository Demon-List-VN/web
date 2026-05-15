<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import * as Table from '$lib/components/ui/table';
	import {
		getPublicPvpMatchesForPlayer,
		getPvpMatchId,
		getPvpParticipants,
		getPvpParticipantRatingAfter,
		getPvpParticipantRatingBefore,
		getPvpParticipantRatingDiff,
		type PvpMatch
	} from '$lib/client/pvp';

	export let userID: string;

	let matches: PvpMatch[] = [];
	let loading = true;

	onMount(async () => {
		try {
			matches = await getPublicPvpMatchesForPlayer(userID);
		} catch (error) {
			console.error('Failed to fetch PvP matches:', error);
			matches = [];
		} finally {
			loading = false;
		}
	});

	function playerParticipant(match: PvpMatch) {
		return getPvpParticipants(match).find((participant) => participant.uid === userID) ?? null;
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
		if (value === null) return '-';
		const rounded = Math.round(value);
		return `${rounded > 0 ? '+' : ''}${rounded}`;
	}

	function formatDate(value: string | null | undefined) {
		if (!value) return '-';
		return new Date(value).toLocaleString('vi-VN');
	}

	function matchDate(match: PvpMatch) {
		return (
			match.ratingAppliedAt ?? match.endedAt ?? match.endsAt ?? match.startedAt ?? match.created_at
		);
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
	<Table.Root>
		<Table.Caption>{$_('player.table.total_pvp_matches')}: {matches.length}</Table.Caption>
		<Table.Header>
			<Table.Row>
				<Table.Head class="w-[100px] text-center">{$_('player.table.match')}</Table.Head>
				<Table.Head class="w-[180px] text-center">{$_('player.table.time')}</Table.Head>
				<Table.Head class="w-[120px] text-center">{$_('player.table.elo_before')}</Table.Head>
				<Table.Head class="w-[120px] text-center">{$_('player.table.elo_diff')}</Table.Head>
				<Table.Head class="w-[120px] text-center">{$_('player.table.current_elo')}</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each matches as match}
				{@const diff = ratingDiff(match)}
				<Table.Row>
					<Table.Cell class="text-center font-medium">#{getPvpMatchId(match)}</Table.Cell>
					<Table.Cell class="text-center">{formatDate(matchDate(match))}</Table.Cell>
					<Table.Cell class="text-center">{formatRating(ratingBefore(match))}</Table.Cell>
					<Table.Cell
						class={`text-center font-semibold ${
							diff === null ? '' : diff > 0 ? 'text-primary' : diff < 0 ? 'text-destructive' : ''
						}`}
					>
						{formatRatingDiff(diff)}
					</Table.Cell>
					<Table.Cell class="text-center font-semibold"
						>{formatRating(ratingAfter(match))}</Table.Cell
					>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
{/if}
