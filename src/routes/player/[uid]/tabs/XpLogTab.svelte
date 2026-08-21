<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import * as Table from '$lib/components/ui/table';

	export let userID: string;

	type XpLogEntry = {
		id: number;
		created_at: string;
		reason: string;
		diff: number;
		newXp: number;
		actualDiff?: number;
		expectedDiff?: number;
		newActualXp?: number;
		newExpectedXp?: number;
		sourceType: string;
		sourceId: string;
		metadata?: Record<string, unknown> | null;
	};

	const reasonLabelKeys: Record<string, string> = {
		pvp_match_win: 'player.xp_log.reasons.pvp_match_win',
		pvp_match_loss: 'player.xp_log.reasons.pvp_match_loss',
		record_manual_100: 'player.xp_log.reasons.record_manual_100',
		record_submission: 'player.xp_log.reasons.record_submission',
		record_submission_accepted: 'player.xp_log.reasons.record_submission_accepted',
		record_submission_rejected: 'player.xp_log.reasons.record_submission_rejected',
		challenge_submission: 'player.xp_log.reasons.challenge_submission',
		challenge_submission_rejected: 'player.xp_log.reasons.challenge_submission_rejected',
		challenge_submission_accepted: 'player.xp_log.reasons.challenge_submission_accepted'
	};

	let logs: XpLogEntry[] = [];
	let loading = true;

	onMount(async () => {
		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/players/${encodeURIComponent(userID)}/xp-log`
			);

			if (!response.ok) {
				throw new Error(`Failed to fetch XP log: ${response.status}`);
			}

			logs = await response.json();
		} catch (error) {
			console.error('Failed to fetch XP log:', error);
			logs = [];
		} finally {
			loading = false;
		}
	});

	function formatDate(value: string | null | undefined) {
		if (!value) {
			return '-';
		}

		return new Date(value)
			.toLocaleString('vi-VN');
	}

	function formatDiff(value: number) {
		return `${value > 0 ? '+' : ''}${value}`;
	}

	function reasonLabel(reason: string) {
		return $_(reasonLabelKeys[reason] ?? 'player.xp_log.reasons.unknown');
	}
</script>

{#if loading}
  <div class="flex justify-center py-10">
    <p>{$_('general.loading')}...</p>
  </div>
{:else if logs.length === 0}
  <div class="flex flex-col items-center justify-center py-12 text-center">
    <p class="text-muted-foreground">{$_('player.no_xp_log')}</p>
  </div>
{:else}
  <Table.Root>
    <Table.Caption>{$_('player.table.total_xp_logs')}: {logs.length}</Table.Caption>
    <Table.Header>
      <Table.Row>
        <Table.Head class="min-w-[180px]">{$_('player.table.time')}</Table.Head>
        <Table.Head>{$_('player.table.reason')}</Table.Head>
        <Table.Head class="w-[110px] text-center">{$_('player.table.actual_diff')}</Table.Head>
        <Table.Head class="w-[120px] text-center">{$_('player.actual_xp')}</Table.Head>
        <Table.Head class="w-[120px] text-center">{$_('player.table.expected_diff')}</Table.Head>
        <Table.Head class="w-[130px] text-center">{$_('player.expected_xp')}</Table.Head>
      </Table.Row>
    </Table.Header>
    <Table.Body>
      {#each logs as log}
        <Table.Row>
          <Table.Cell>{formatDate(log.created_at)}</Table.Cell>
          <Table.Cell class="font-medium">{reasonLabel(log.reason)}</Table.Cell>
          <Table.Cell
            class={(log.actualDiff ?? log.diff) > 0
              ? 'text-center font-semibold text-green-600'
              : (log.actualDiff ?? log.diff) < 0
                ? 'text-center font-semibold text-red-600'
                : 'text-center text-muted-foreground'}
          >
            {formatDiff(log.actualDiff ?? log.diff)}
          </Table.Cell>
          <Table.Cell class="text-center font-semibold">{log.newActualXp ?? log.newXp}</Table.Cell>
          <Table.Cell
            class={(log.expectedDiff ?? log.diff) > 0
              ? 'text-center font-semibold text-green-600'
              : (log.expectedDiff ?? log.diff) < 0
                ? 'text-center font-semibold text-red-600'
                : 'text-center text-muted-foreground'}
          >
            {formatDiff(log.expectedDiff ?? log.diff)}
          </Table.Cell>
          <Table.Cell class="text-center font-semibold">{log.newExpectedXp ?? log.newXp}</Table.Cell>
        </Table.Row>
      {/each}
    </Table.Body>
  </Table.Root>
{/if}
