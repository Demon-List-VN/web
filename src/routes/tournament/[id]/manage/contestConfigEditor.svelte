<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { tournamentFetch } from '$lib/client/tournament';

	export let tournament: any;
	export let disabled = false;

	const cfg = tournament.contestConfig ?? {};

	let durationHours = cfg.durationSeconds ? cfg.durationSeconds / 3600 : 2;
	let freezeMinutes = cfg.freezeOffsetSeconds ? cfg.freezeOffsetSeconds / 60 : 0;
	let lateRegEnabled = cfg.lateRegOffsetSeconds != null;
	let lateRegMinutes = cfg.lateRegOffsetSeconds ? cfg.lateRegOffsetSeconds / 60 : 0;
	let lateRegPenaltyPercent = cfg.lateRegPenaltyFraction != null
		? cfg.lateRegPenaltyFraction * 100
		: 0;
	let saving = false;

	async function save() {
		saving = true;

		try {
			await tournamentFetch(`/${tournament.id}/contest/config`, {
				method: 'PUT',
				body: JSON.stringify({
					durationSeconds: Math.round(durationHours * 3600),
					freezeOffsetSeconds: Math.round(freezeMinutes * 60),
					lateRegOffsetSeconds: lateRegEnabled ? Math.round(lateRegMinutes * 60) : null,
					lateRegPenaltyFraction: lateRegEnabled ? lateRegPenaltyPercent / 100 : null
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
  <h2 class="text-lg font-bold">{$_('tournament.manage.contest_config')}</h2>
  <div class="grid grid-cols-2 gap-[10px]">
    <div class="flex flex-col gap-[6px]">
      <Label>{$_('tournament.manage.duration_hours')}</Label>
      <Input type="number" step="0.5" bind:value={durationHours} {disabled} />
    </div>
    <div class="flex flex-col gap-[6px]">
      <Label>{$_('tournament.manage.freeze_minutes')}</Label>
      <Input type="number" bind:value={freezeMinutes} {disabled} />
    </div>
  </div>
  <label class="flex items-center gap-[8px]">
    <input type="checkbox" bind:checked={lateRegEnabled} {disabled} />
    {$_('tournament.manage.late_registration')}
  </label>
  {#if lateRegEnabled}
    <div class="grid grid-cols-2 gap-[10px]">
      <div class="flex flex-col gap-[6px]">
        <Label>{$_('tournament.manage.late_reg_minutes')}</Label>
        <Input type="number" bind:value={lateRegMinutes} {disabled} />
      </div>
      <div class="flex flex-col gap-[6px]">
        <Label>{$_('tournament.manage.late_reg_penalty')}</Label>
        <Input type="number" bind:value={lateRegPenaltyPercent} {disabled} />
      </div>
    </div>
  {/if}
  <Button on:click={save} disabled={saving || disabled}>{$_('tournament.manage.save')}</Button>
</section>
