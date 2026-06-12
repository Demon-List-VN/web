<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { tournamentFetch } from '$lib/client/tournament';

	export let tournament: any;
	export let disabled = false;

	const fmt = tournament.pvpFormat ?? {};

	let mode = fmt.mode ?? 'classic';
	let levelSelectionMode = fmt.levelSelectionMode ?? 'random';
	let levelsPerMatch = fmt.levelsPerMatch ?? 1;
	let timeLimitSeconds: number | null = fmt.timeLimitSeconds ?? null;
	let tieHandling = fmt.tieHandling ?? 'replay';
	let listId: number | null = fmt.listId ?? null;
	let saving = false;

	async function save() {
		saving = true;

		try {
			await tournamentFetch(`/${tournament.id}/format`, {
				method: 'PUT',
				body: JSON.stringify({
					mode,
					levelSelectionMode,
					levelsPerMatch,
					timeLimitSeconds,
					tieHandling,
					listId
				})
			});
			toast.success($_('tournament.manage.saved'));
		} catch (error: any) {
			toast.error(error.message);
		} finally {
			saving = false;
		}
	}
</script>

<section class="flex flex-col gap-[12px] rounded-[8px] border border-[hsl(var(--border))] p-[16px]">
  <h2 class="text-lg font-bold">{$_('tournament.manage.match_format')}</h2>
  <div class="grid grid-cols-2 gap-[10px]">
    <div class="flex flex-col gap-[6px]">
      <Label>{$_('tournament.overview.mode')}</Label>
      <select bind:value={mode} {disabled} class="h-10 rounded-md border border-input bg-background px-3 text-sm">
        <option value="classic">Classic</option>
        <option value="platformer">Platformer</option>
      </select>
    </div>
    <div class="flex flex-col gap-[6px]">
      <Label>{$_('tournament.manage.level_selection')}</Label>
      <select bind:value={levelSelectionMode} {disabled} class="h-10 rounded-md border border-input bg-background px-3 text-sm">
        <option value="random">{$_('tournament.manage.random')}</option>
        <option value="sbmm">{$_('tournament.manage.sbmm')}</option>
        <option value="manual">{$_('tournament.manage.manual')}</option>
      </select>
    </div>
    <div class="flex flex-col gap-[6px]">
      <Label>{$_('tournament.manage.levels_per_match')}</Label>
      <select bind:value={levelsPerMatch} {disabled} class="h-10 rounded-md border border-input bg-background px-3 text-sm">
        <option value={1}>{$_('tournament.manage.best_of', { values: { n: 1 } })}</option>
        <option value={3}>{$_('tournament.manage.best_of', { values: { n: 3 } })}</option>
        <option value={5}>{$_('tournament.manage.best_of', { values: { n: 5 } })}</option>
      </select>
    </div>
    <div class="flex flex-col gap-[6px]">
      <Label>{$_('tournament.manage.tie_handling')}</Label>
      <select bind:value={tieHandling} {disabled} class="h-10 rounded-md border border-input bg-background px-3 text-sm">
        <option value="replay">{$_('tournament.manage.tie_replay')}</option>
        <option value="higher_seed">{$_('tournament.manage.tie_higher_seed')}</option>
      </select>
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
  <Button on:click={save} disabled={saving || disabled}>{$_('tournament.manage.save')}</Button>
</section>
