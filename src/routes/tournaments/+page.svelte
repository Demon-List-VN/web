<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { user } from '$lib/client';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import { Plus, Search } from 'lucide-svelte';
	import {
		groupTournaments,
		formatLabelKey,
		statusLabelKey,
		type TournamentStatus
	} from '$lib/client/tournament';
	import TournamentCard from './tournamentCard.svelte';

	export let data: any;

	const STATUSES: TournamentStatus[] = [
		'registration_open',
		'registration_closed',
		'ready',
		'ongoing',
		'finished',
		'draft',
		'cancelled'
	];

	let search = '';
	let formatFilter = 'all';
	let statusFilter = 'all';

	$: tournaments = data.tournaments ?? [];
	$: needle = search.trim()
		.toLowerCase();
	$: filtered = tournaments.filter((tournament: any) => {
		if (needle && !(tournament.name ?? '').toLowerCase()
			.includes(needle)) {
			return false;
		}

		if (formatFilter !== 'all' && tournament.format !== formatFilter) {
			return false;
		}

		if (statusFilter !== 'all' && tournament.status !== statusFilter) {
			return false;
		}

		return true;
	});
	$: groups = groupTournaments(filtered);

	$: formatSelected = {
		value: formatFilter,
		label:
			formatFilter === 'all'
				? $_('tournament.list.all_formats')
				: $_(formatLabelKey(formatFilter as any))
	};
	$: statusSelected = {
		value: statusFilter,
		label:
			statusFilter === 'all'
				? $_('tournament.list.all_statuses')
				: $_(statusLabelKey(statusFilter as TournamentStatus))
	};
</script>

<svelte:head>
  <title>{$_('tournament.title')} - {$_('head.site_name')}</title>
</svelte:head>

<div class="mx-auto mt-[20px] w-full max-w-[1100px] px-[10px]">
  <div class="mb-[16px] flex items-center justify-between">
    <h1 class="text-2xl font-bold">{$_('tournament.title')}</h1>
    {#if $user?.loggedIn}
      <Button href="/tournaments/create" class="flex items-center gap-[6px]">
        <Plus size={16} />
        {$_('tournament.create')}
      </Button>
    {/if}
  </div>

  <div class="mb-[24px] flex flex-col gap-[10px] sm:flex-row sm:items-center">
    <div class="relative flex-1">
      <Search size={16} class="absolute left-[10px] top-1/2 -translate-y-1/2 text-muted-foreground" />
      <Input bind:value={search} placeholder={$_('tournament.list.search')} class="pl-[34px]" />
    </div>
    <Select.Root selected={formatSelected} onSelectedChange={(v) => v && (formatFilter = String(v.value))}>
      <Select.Trigger class="sm:w-[180px]">
        <Select.Value placeholder={$_('tournament.list.filter_format')} />
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="all" label={$_('tournament.list.all_formats')}>
          {$_('tournament.list.all_formats')}
        </Select.Item>
        <Select.Item value="single_elimination" label={$_('tournament.format.single_elimination')}>
          {$_('tournament.format.single_elimination')}
        </Select.Item>
        <Select.Item value="contest" label={$_('tournament.format.contest')}>
          {$_('tournament.format.contest')}
        </Select.Item>
      </Select.Content>
    </Select.Root>
    <Select.Root selected={statusSelected} onSelectedChange={(v) => v && (statusFilter = String(v.value))}>
      <Select.Trigger class="sm:w-[190px]">
        <Select.Value placeholder={$_('tournament.list.filter_status')} />
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="all" label={$_('tournament.list.all_statuses')}>
          {$_('tournament.list.all_statuses')}
        </Select.Item>
        {#each STATUSES as status}
          <Select.Item value={status} label={$_(statusLabelKey(status))}>
            {$_(statusLabelKey(status))}
          </Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
  </div>

  {#if groups.length}
    <div class="flex flex-col gap-[28px]">
      {#each groups as group (group.key)}
        <section>
          <div class="mb-[12px] flex items-center gap-[8px]">
            <h2 class="text-lg font-bold">{$_(group.labelKey)}</h2>
            <span class="rounded-full bg-muted px-[8px] py-[1px] text-xs tabular-nums text-muted-foreground">
              {group.items.length}
            </span>
          </div>
          <div class="grid gap-[12px] sm:grid-cols-2 xl:grid-cols-3">
            {#each group.items as tournament (tournament.id)}
              <TournamentCard {tournament} />
            {/each}
          </div>
        </section>
      {/each}
    </div>
  {:else}
    <p class="mt-[40px] text-center text-muted-foreground">
      {tournaments.length ? $_('tournament.list.no_results') : $_('tournament.empty')}
    </p>
  {/if}
</div>
