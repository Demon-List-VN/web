<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { onMount, onDestroy } from 'svelte';
	import * as Select from '$lib/components/ui/select';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { tournamentFetch } from '$lib/client/tournament';
	import { getManageDirty } from '$lib/components/tournament/manage/manageDirty';

	export let tournament: any;
	export let disabled = false;

	const ID = 'pvp-format';
	const dirtyStore = getManageDirty();
	const fmt = tournament.pvpFormat ?? {};

	let initial = {
		mode: fmt.mode ?? 'classic',
		levelSelectionMode: fmt.levelSelectionMode ?? 'random',
		levelsPerMatch: fmt.levelsPerMatch ?? 1,
		timeLimitSeconds: (fmt.timeLimitSeconds ?? null) as number | null,
		tieHandling: fmt.tieHandling ?? 'replay',
		listId: (fmt.listId ?? null) as number | null
	};

	let mode = initial.mode;
	let levelSelectionMode = initial.levelSelectionMode;
	let levelsPerMatch = initial.levelsPerMatch;
	let timeLimitSeconds: number | null = initial.timeLimitSeconds;
	let tieHandling = initial.tieHandling;
	let listId: number | null = initial.listId;

	$: current = { mode, levelSelectionMode, levelsPerMatch, timeLimitSeconds, tieHandling, listId };
	$: dirty = JSON.stringify(current) !== JSON.stringify(initial);
	$: dirtyStore?.setDirty(ID, dirty && !disabled);

	function reset() {
		mode = initial.mode;
		levelSelectionMode = initial.levelSelectionMode;
		levelsPerMatch = initial.levelsPerMatch;
		timeLimitSeconds = initial.timeLimitSeconds;
		tieHandling = initial.tieHandling;
		listId = initial.listId;
	}

	async function save() {
		await tournamentFetch(`/${tournament.id}/format`, {
			method: 'PUT',
			body: JSON.stringify(current)
		});
		initial = { ...current };
		dirtyStore?.setDirty(ID, false);
	}

	let unregister: (() => void) | undefined;

	onMount(() => {
		unregister = dirtyStore?.registerEntry({ id: ID, save, reset });
	});
	onDestroy(() => unregister?.());
</script>

<section class="flex flex-col gap-[12px] rounded-[10px] border border-[hsl(var(--border))] bg-card/40 p-[16px]">
  <h2 class="text-lg font-bold">{$_('tournament.manage.match_format')}</h2>
  <div class="grid grid-cols-1 gap-[10px] sm:grid-cols-2">
    <div class="flex flex-col gap-[6px]">
      <Label>{$_('tournament.overview.mode')}</Label>
      <Select.Root {disabled} selected={{ value: mode, label: mode === 'platformer' ? 'Platformer' : 'Classic' }} onSelectedChange={(v) => v && (mode = String(v.value))}>
        <Select.Trigger><Select.Value /></Select.Trigger>
        <Select.Content>
          <Select.Item value="classic" label="Classic">Classic</Select.Item>
          <Select.Item value="platformer" label="Platformer">Platformer</Select.Item>
        </Select.Content>
      </Select.Root>
    </div>
    <div class="flex flex-col gap-[6px]">
      <Label>{$_('tournament.manage.level_selection')}</Label>
      <Select.Root {disabled} selected={{ value: levelSelectionMode, label: $_(`tournament.manage.${levelSelectionMode}`) }} onSelectedChange={(v) => v && (levelSelectionMode = String(v.value))}>
        <Select.Trigger><Select.Value /></Select.Trigger>
        <Select.Content>
          <Select.Item value="random" label={$_('tournament.manage.random')}>{$_('tournament.manage.random')}</Select.Item>
          <Select.Item value="sbmm" label={$_('tournament.manage.sbmm')}>{$_('tournament.manage.sbmm')}</Select.Item>
          <Select.Item value="manual" label={$_('tournament.manage.manual')}>{$_('tournament.manage.manual')}</Select.Item>
        </Select.Content>
      </Select.Root>
    </div>
    <div class="flex flex-col gap-[6px]">
      <Label>{$_('tournament.manage.levels_per_match')}</Label>
      <Select.Root {disabled} selected={{ value: String(levelsPerMatch), label: $_('tournament.manage.best_of', { values: { n: levelsPerMatch } }) }} onSelectedChange={(v) => v && (levelsPerMatch = Number(v.value))}>
        <Select.Trigger><Select.Value /></Select.Trigger>
        <Select.Content>
          <Select.Item value="1" label={$_('tournament.manage.best_of', { values: { n: 1 } })}>{$_('tournament.manage.best_of', { values: { n: 1 } })}</Select.Item>
          <Select.Item value="3" label={$_('tournament.manage.best_of', { values: { n: 3 } })}>{$_('tournament.manage.best_of', { values: { n: 3 } })}</Select.Item>
          <Select.Item value="5" label={$_('tournament.manage.best_of', { values: { n: 5 } })}>{$_('tournament.manage.best_of', { values: { n: 5 } })}</Select.Item>
        </Select.Content>
      </Select.Root>
    </div>
    <div class="flex flex-col gap-[6px]">
      <Label>{$_('tournament.manage.tie_handling')}</Label>
      <Select.Root {disabled} selected={{ value: tieHandling, label: $_(`tournament.manage.tie_${tieHandling}`) }} onSelectedChange={(v) => v && (tieHandling = String(v.value))}>
        <Select.Trigger><Select.Value /></Select.Trigger>
        <Select.Content>
          <Select.Item value="replay" label={$_('tournament.manage.tie_replay')}>{$_('tournament.manage.tie_replay')}</Select.Item>
          <Select.Item value="higher_seed" label={$_('tournament.manage.tie_higher_seed')}>{$_('tournament.manage.tie_higher_seed')}</Select.Item>
        </Select.Content>
      </Select.Root>
    </div>
    <div class="flex flex-col gap-[6px]">
      <Label>{$_('tournament.manage.time_limit_seconds')}</Label>
      <Input type="number" bind:value={timeLimitSeconds} {disabled} />
    </div>
    <div class="flex flex-col gap-[6px]">
      <Label>{$_('tournament.manage.list_id')}</Label>
      <Input type="number" bind:value={listId} {disabled} />
    </div>
  </div>
</section>
