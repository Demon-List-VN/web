<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { onMount, onDestroy } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Plus, Trash2 } from 'lucide-svelte';
	import { tournamentFetch } from '$lib/client/tournament';
	import { getManageDirty } from '$lib/components/tournament/manage/manageDirty';

	export let tournament: any;

	const ID = 'rewards';
	const dirtyStore = getManageDirty();

	const loaded = (tournament.rewards ?? []).map((reward: any) => ({
		placement: reward.placement,
		itemId: reward.itemId,
		quantity: reward.quantity
	}));

	let rewards: { placement: number | null; itemId: number | null; quantity: number | null; }[] =
		structuredClone(loaded);
	let initial = structuredClone(rewards);

	$: dirty = JSON.stringify(rewards) !== JSON.stringify(initial);
	$: dirtyStore?.setDirty(ID, dirty);

	function addRow() {
		rewards = [...rewards, { placement: rewards.length + 1, itemId: null, quantity: 1 }];
	}

	function removeRow(index: number) {
		rewards = rewards.filter((_, i) => i !== index);
	}

	function reset() {
		rewards = structuredClone(initial);
	}

	async function save() {
		const payload = rewards
			.filter((reward) => reward.placement && reward.itemId)
			.map((reward) => ({
				placement: Number(reward.placement),
				itemId: Number(reward.itemId),
				quantity: Number(reward.quantity ?? 1)
			}));

		await tournamentFetch(`/${tournament.id}/rewards`, {
			method: 'PUT',
			body: JSON.stringify({ rewards: payload })
		});
		initial = structuredClone(rewards);
		dirtyStore?.setDirty(ID, false);
	}

	let unregister: (() => void) | undefined;

	onMount(() => {
		unregister = dirtyStore?.registerEntry({ id: ID, save, reset });
	});
	onDestroy(() => unregister?.());
</script>

<section class="flex flex-col gap-[12px] rounded-[10px] border border-[hsl(var(--border))] bg-card/40 p-[16px]">
  <h2 class="text-lg font-bold">{$_('tournament.manage.rewards')}</h2>
  <p class="text-sm text-muted-foreground">{$_('tournament.manage.rewards_hint')}</p>
  <div class="flex flex-col gap-[8px]">
    <div class="grid grid-cols-[1fr_1fr_1fr_40px] gap-[8px] text-xs text-muted-foreground">
      <span>{$_('tournament.manage.placement')}</span>
      <span>{$_('tournament.manage.item_id')}</span>
      <span>{$_('tournament.manage.quantity')}</span>
      <span></span>
    </div>
    {#each rewards as reward, index}
      <div class="grid grid-cols-[1fr_1fr_1fr_40px] items-center gap-[8px]">
        <Input type="number" bind:value={reward.placement} />
        <Input type="number" bind:value={reward.itemId} />
        <Input type="number" bind:value={reward.quantity} />
        <Button size="icon" variant="ghost" class="text-muted-foreground hover:text-destructive" on:click={() => removeRow(index)}>
          <Trash2 size={16} />
        </Button>
      </div>
    {/each}
  </div>
  <Button size="sm" variant="outline" class="self-start" on:click={addRow}>
    <Plus size={15} class="mr-[4px]" />
    {$_('tournament.manage.add_reward')}
  </Button>
</section>
