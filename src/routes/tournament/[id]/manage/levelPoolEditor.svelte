<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { onMount, onDestroy } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Plus, Trash2 } from 'lucide-svelte';
	import { tournamentFetch } from '$lib/client/tournament';
	import { getManageDirty } from '$lib/components/tournament/manage/manageDirty';

	export let tournament: any;
	export let disabled = false;

	const ID = 'level-pool';
	const dirtyStore = getManageDirty();

	type LevelDraft = {
		levelId: number | string | null;
		maxPoints: number | string | null;
		requireRaw: boolean;
	};

	function emptyLevels(): LevelDraft[] {
		return [{ levelId: null, maxPoints: 100, requireRaw: false }];
	}

	function normalizeLevels(contestLevels: any[] | null | undefined): LevelDraft[] {
		const normalized = (contestLevels ?? []).map((level: any) => ({
			levelId: level.levelId,
			maxPoints: level.maxPoints,
			requireRaw: level.requireRaw === true
		}));

		return normalized.length ? normalized : emptyLevels();
	}

	function levelsKey(contestLevels: any[] | null | undefined) {
		return JSON.stringify(normalizeLevels(contestLevels));
	}

	function applyLoadedLevels(contestLevels: any[] | null | undefined) {
		levels = normalizeLevels(contestLevels);
		initial = structuredClone(levels);
		lastLoadedKey = levelsKey(contestLevels);
	}

	let levels: LevelDraft[] = Array.isArray(tournament.contestLevels)
		? normalizeLevels(tournament.contestLevels)
		: emptyLevels();
	let initial = structuredClone(levels);
	let dirty = false;
	let lastLoadedKey = Array.isArray(tournament.contestLevels)
		? levelsKey(tournament.contestLevels)
		: null;

	$: dirty = JSON.stringify(levels) !== JSON.stringify(initial);
	$: if (Array.isArray(tournament.contestLevels)) {
		const nextLoadedKey = levelsKey(tournament.contestLevels);

		if (!dirty && nextLoadedKey !== lastLoadedKey) {
			applyLoadedLevels(tournament.contestLevels);
		}
	}
	$: dirtyStore?.setDirty(ID, dirty && !disabled);

	function addRow() {
		levels = [...levels, { levelId: null, maxPoints: 100, requireRaw: false }];
	}

	function removeRow(index: number) {
		levels = levels.filter((_, i) => i !== index);
	}

	function reset() {
		levels = structuredClone(initial);
	}

	async function save() {
		const payload = levels
			.filter((level) => level.levelId !== null && level.levelId !== '' && level.maxPoints !== null && level.maxPoints !== '')
			.map((level) => ({
				levelId: Number(level.levelId),
				maxPoints: Number(level.maxPoints),
				requireRaw: level.requireRaw === true
			}));

		const savedLevels = await tournamentFetch(`/${tournament.id}/levels`, {
			method: 'PUT',
			body: JSON.stringify({ levels: payload })
		});
		applyLoadedLevels(savedLevels);
		dirtyStore?.setDirty(ID, false);
	}

	let unregister: (() => void) | undefined;

	onMount(() => {
		unregister = dirtyStore?.registerEntry({ id: ID, save, reset });
	});
	onDestroy(() => unregister?.());
</script>

<section class="flex flex-col gap-[12px] rounded-[10px] border border-[hsl(var(--border))] bg-card/40 p-[16px]">
  <h2 class="text-lg font-bold">{$_('tournament.manage.level_pool')}</h2>
  <div class="flex flex-col gap-[8px]">
    <div class="grid grid-cols-[1fr_1fr_120px_40px] gap-[8px] text-xs text-muted-foreground">
      <span>{$_('tournament.manage.level_id')}</span>
      <span>{$_('tournament.manage.max_points')}</span>
      <span>{$_('tournament.manage.require_raw')}</span>
      <span></span>
    </div>
    {#each levels as level, index}
      <div class="grid grid-cols-[1fr_1fr_120px_40px] items-center gap-[8px]">
        <Input type="number" bind:value={level.levelId} {disabled} />
        <Input type="number" bind:value={level.maxPoints} {disabled} />
        <label class="flex items-center justify-center">
          <input type="checkbox" bind:checked={level.requireRaw} {disabled} />
        </label>
        <Button size="icon" variant="ghost" class="text-muted-foreground hover:text-destructive" on:click={() => removeRow(index)} {disabled}>
          <Trash2 size={16} />
        </Button>
      </div>
    {/each}
  </div>
  <Button size="sm" variant="outline" class="self-start" on:click={addRow} {disabled}>
    <Plus size={15} class="mr-[4px]" />
    {$_('tournament.manage.add_level')}
  </Button>
</section>
