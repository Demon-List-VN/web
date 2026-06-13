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

	const loaded = (tournament.contestLevels ?? []).map((level: any) => ({
		levelId: level.levelId,
		maxPoints: level.maxPoints
	}));

	let levels: { levelId: number | null; maxPoints: number | null; }[] = loaded.length
		? structuredClone(loaded)
		: [{ levelId: null, maxPoints: 100 }];
	let initial = structuredClone(levels);

	$: dirty = JSON.stringify(levels) !== JSON.stringify(initial);
	$: dirtyStore?.setDirty(ID, dirty && !disabled);

	function addRow() {
		levels = [...levels, { levelId: null, maxPoints: 100 }];
	}

	function removeRow(index: number) {
		levels = levels.filter((_, i) => i !== index);
	}

	function reset() {
		levels = structuredClone(initial);
	}

	async function save() {
		const payload = levels
			.filter((level) => level.levelId && level.maxPoints)
			.map((level) => ({ levelId: Number(level.levelId), maxPoints: Number(level.maxPoints) }));

		await tournamentFetch(`/${tournament.id}/levels`, {
			method: 'PUT',
			body: JSON.stringify({ levels: payload })
		});
		initial = structuredClone(levels);
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
    <div class="grid grid-cols-[1fr_1fr_40px] gap-[8px] text-xs text-muted-foreground">
      <span>{$_('tournament.manage.level_id')}</span>
      <span>{$_('tournament.manage.max_points')}</span>
      <span></span>
    </div>
    {#each levels as level, index}
      <div class="grid grid-cols-[1fr_1fr_40px] items-center gap-[8px]">
        <Input type="number" bind:value={level.levelId} {disabled} />
        <Input type="number" bind:value={level.maxPoints} {disabled} />
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
