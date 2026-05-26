<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import { badgeVariants } from '$lib/components/ui/badge';
	import { _ } from 'svelte-i18n';

	export let data: any;
</script>

<div class="space-y-4">
  {#if data.events && data.events.length > 0}
    <Table.Root>
      <Table.Caption>{$_('player.table.total_events')}: {
          data.events.length
        }</Table.Caption>
      <Table.Header>
        <Table.Row>
          <Table.Head>{$_('events.event_name')}</Table.Head>
          <Table.Head class="w-[200px] text-center">{
            $_('events.event_type')
          }</Table.Head>
          <Table.Head class="w-[120px] text-center">{
            $_('events.elo_change')
          }</Table.Head>
          <Table.Head class="w-[150px] text-center">{
            $_('general.status')
          }</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each data.events as eventRecord}
          <Table.Row>
            <Table.Cell class="font-medium">
              <a
                href={`/event/${eventRecord.events.id}`}
                class="hover:underline"
                data-sveltekit-preload-data="tap"
              >
                {eventRecord.events.title}
              </a>
            </Table.Cell>
            <Table.Cell class="text-center">
              <div class="flex justify-center gap-1">
                {#if eventRecord.events.isContest}
                  <span class={badgeVariants({ variant: 'default' })}>
                    {$_('events.contest')}
                  </span>
                {/if}
                {#if eventRecord.events.isRanked}
                  <span class={badgeVariants({ variant: 'outline' })}>
                    {$_('events.ranked')}
                  </span>
                {/if}
              </div>
            </Table.Cell>
            <Table.Cell class="text-center">
              {#if eventRecord.diff === null}
                <span class="text-gray-500"> - </span>
              {:else}
                <span
                  class={eventRecord.diff > 0
                  ? 'text-green-500'
                  : eventRecord.diff < 0
                  ? 'text-red-500'
                  : ''}
                >
                  {eventRecord.diff > 0 ? '+' : ''}{eventRecord.diff}
                </span>
              {/if}
            </Table.Cell>
            <Table.Cell class="text-center">
              {#if eventRecord.events.isContest || eventRecord.accepted}
                <span class={badgeVariants({ variant: 'default' })}>
                  {$_('general.accepted')}
                </span>
              {:else}
                <span class={badgeVariants({ variant: 'secondary' })}>
                  {$_('general.pending')}
                </span>
              {/if}
            </Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  {:else}
    <div class="flex flex-col items-center justify-center py-12 text-center">
      <p class="text-muted-foreground">{$_('player.no_events')}</p>
    </div>
  {/if}
</div>
