<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Trash2 } from 'lucide-svelte';
	import { tournamentFetch } from '$lib/client/tournament';

	export let tournament: any;

	let rewards: { placement: number | null; itemId: number | null; quantity: number | null; }[] = [];
	let saving = false;

	onMount(() => {
		rewards = (tournament.rewards ?? []).map((reward: any) => ({
			placement: reward.placement,
			itemId: reward.itemId,
			quantity: reward.quantity
		}));
	});

	function addRow() {
		rewards = [...rewards, { placement: rewards.length + 1, itemId: null, quantity: 1 }];
	}

	function removeRow(index: number) {
		rewards = rewards.filter((_, i) => i !== index);
	}

	async function save() {
		saving = true;

		try {
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
			toast.success($_('tournament.manage.saved'));
		} catch (error: any) {
			toast.error(error.message);
		} finally {
			saving = false;
		}
	}
</script>

<section class="flex flex-col gap-[12px] rounded-[8px] border border-[hsl(var(--border))] p-[16px]">
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
        <Button size="icon" variant="ghost" on:click={() => removeRow(index)}>
          <Trash2 size={16} />
        </Button>
      </div>
    {/each}
  </div>
  <div class="flex gap-[8px]">
    <Button size="sm" variant="outline" on:click={addRow}>{$_('tournament.manage.add_reward')}</Button>
    <Button size="sm" on:click={save} disabled={saving}>{$_('tournament.manage.save')}</Button>
  </div>
</section>
