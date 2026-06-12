<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Trash2 } from 'lucide-svelte';
	import { tournamentFetch } from '$lib/client/tournament';

	export let tournament: any;
	export let disabled = false;

	let levels: { levelId: number | null; maxPoints: number | null; }[] = [];
	let saving = false;

	onMount(() => {
		levels = (tournament.contestLevels ?? []).map((level: any) => ({
			levelId: level.levelId,
			maxPoints: level.maxPoints
		}));

		if (!levels.length) {
			levels = [{ levelId: null, maxPoints: 100 }];
		}
	});

	function addRow() {
		levels = [...levels, { levelId: null, maxPoints: 100 }];
	}

	function removeRow(index: number) {
		levels = levels.filter((_, i) => i !== index);
	}

	async function save() {
		saving = true;

		try {
			const payload = levels
				.filter((level) => level.levelId && level.maxPoints)
				.map((level) => ({ levelId: Number(level.levelId), maxPoints: Number(level.maxPoints) }));

			await tournamentFetch(`/${tournament.id}/levels`, {
				method: 'PUT',
				body: JSON.stringify({ levels: payload })
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
        <Button size="icon" variant="ghost" on:click={() => removeRow(index)} {disabled}>
          <Trash2 size={16} />
        </Button>
      </div>
    {/each}
  </div>
  <div class="flex gap-[8px]">
    <Button size="sm" variant="outline" on:click={addRow} {disabled}>
      {$_('tournament.manage.add_level')}
    </Button>
    <Button size="sm" on:click={save} disabled={saving || disabled}>
      {$_('tournament.manage.save')}
    </Button>
  </div>
</section>
