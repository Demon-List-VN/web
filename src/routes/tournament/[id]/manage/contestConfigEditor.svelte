<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { onMount, onDestroy } from 'svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { tournamentFetch } from '$lib/client/tournament';
	import { getManageDirty } from '$lib/components/tournament/manage/manageDirty';

	export let tournament: any;
	export let disabled = false;

	const ID = 'contest-config';
	const dirtyStore = getManageDirty();
	const cfg = tournament.contestConfig ?? {};

	let initial = {
		durationHours: cfg.durationSeconds ? cfg.durationSeconds / 3600 : 2,
		freezeMinutes: cfg.freezeOffsetSeconds ? cfg.freezeOffsetSeconds / 60 : 0,
		lateRegEnabled: cfg.lateRegOffsetSeconds != null,
		lateRegMinutes: cfg.lateRegOffsetSeconds ? cfg.lateRegOffsetSeconds / 60 : 0,
		lateRegPenaltyPercent: cfg.lateRegPenaltyFraction != null ? cfg.lateRegPenaltyFraction * 100 : 0
	};

	let durationHours = initial.durationHours;
	let freezeMinutes = initial.freezeMinutes;
	let lateRegEnabled = initial.lateRegEnabled;
	let lateRegMinutes = initial.lateRegMinutes;
	let lateRegPenaltyPercent = initial.lateRegPenaltyPercent;

	$: current = { durationHours, freezeMinutes, lateRegEnabled, lateRegMinutes, lateRegPenaltyPercent };
	$: dirty = JSON.stringify(current) !== JSON.stringify(initial);
	$: dirtyStore?.setDirty(ID, dirty && !disabled);

	function reset() {
		durationHours = initial.durationHours;
		freezeMinutes = initial.freezeMinutes;
		lateRegEnabled = initial.lateRegEnabled;
		lateRegMinutes = initial.lateRegMinutes;
		lateRegPenaltyPercent = initial.lateRegPenaltyPercent;
	}

	async function save() {
		await tournamentFetch(`/${tournament.id}/contest/config`, {
			method: 'PUT',
			body: JSON.stringify({
				durationSeconds: Math.round(durationHours * 3600),
				freezeOffsetSeconds: Math.round(freezeMinutes * 60),
				lateRegOffsetSeconds: lateRegEnabled ? Math.round(lateRegMinutes * 60) : null,
				lateRegPenaltyFraction: lateRegEnabled ? lateRegPenaltyPercent / 100 : null
			})
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
  <h2 class="text-lg font-bold">{$_('tournament.manage.contest_config')}</h2>
  <div class="grid grid-cols-1 gap-[10px] sm:grid-cols-2">
    <div class="flex flex-col gap-[6px]">
      <Label>{$_('tournament.manage.duration_hours')}</Label>
      <Input type="number" step="0.5" bind:value={durationHours} {disabled} />
    </div>
    <div class="flex flex-col gap-[6px]">
      <Label>{$_('tournament.manage.freeze_minutes')}</Label>
      <Input type="number" bind:value={freezeMinutes} {disabled} />
    </div>
  </div>
  <div class="flex items-center gap-[8px]">
    <Switch bind:checked={lateRegEnabled} {disabled} id="late-reg" />
    <Label for="late-reg">{$_('tournament.manage.late_registration')}</Label>
  </div>
  {#if lateRegEnabled}
    <div class="grid grid-cols-1 gap-[10px] sm:grid-cols-2">
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
</section>
