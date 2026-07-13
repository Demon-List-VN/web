<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { onMount, onDestroy } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { AlertTriangle } from 'lucide-svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import LifecycleTimeline from '$lib/components/tournament/LifecycleTimeline.svelte';
	import TournamentStatusBadge from '$lib/components/tournament/TournamentStatusBadge.svelte';
	import { tournamentFetch } from '$lib/client/tournament';
	import { getManageDirty } from '$lib/components/tournament/manage/manageDirty';

	export let tournament: any;
	export let disabled = false;

	const ID = 'schedule';
	const dirtyStore = getManageDirty();

	function toDatetimeLocal(value: unknown) {
		const date = new Date(String(value || ''));

		if (Number.isNaN(date.getTime())) {
			return '';
		}

		const offsetMs = date.getTimezoneOffset() * 60 * 1000;

		return new Date(date.getTime() - offsetMs)
			.toISOString()
			.slice(0, 16);
	}

	function toIso(value: string) {
		const date = new Date(value);

		return Number.isNaN(date.getTime()) ? null : date.toISOString();
	}

	function timestamp(value: string) {
		return new Date(value)
			.getTime();
	}

	let initial = {
		registrationOpensAt: toDatetimeLocal(tournament.registrationOpensAt),
		registrationClosesAt: toDatetimeLocal(tournament.registrationClosesAt),
		startsAt: toDatetimeLocal(tournament.startsAt),
		endsAt: toDatetimeLocal(tournament.endsAt)
	};

	let registrationOpensAt = initial.registrationOpensAt;
	let registrationClosesAt = initial.registrationClosesAt;
	let startsAt = initial.startsAt;
	let endsAt = initial.endsAt;
	$: inviteOnly = tournament.registrationMode === 'invite_only';

	$: current = { registrationOpensAt, registrationClosesAt, startsAt, endsAt };
	$: dirty = JSON.stringify(current) !== JSON.stringify(initial);
	$: dirtyStore?.setDirty(ID, dirty && !disabled);
	$: scheduleValid = inviteOnly
		? Boolean(startsAt && endsAt) && timestamp(startsAt) < timestamp(endsAt)
		: Boolean(registrationOpensAt && registrationClosesAt && startsAt && endsAt)
			&& timestamp(registrationOpensAt) < timestamp(registrationClosesAt)
			&& timestamp(registrationClosesAt) <= timestamp(startsAt)
			&& timestamp(startsAt) < timestamp(endsAt);

	function reset() {
		registrationOpensAt = initial.registrationOpensAt;
		registrationClosesAt = initial.registrationClosesAt;
		startsAt = initial.startsAt;
		endsAt = initial.endsAt;
	}

	async function save() {
		if (!scheduleValid) {
			throw new Error($_('tournament.manage.schedule_invalid'));
		}

		const schedule = {
			startsAt: toIso(startsAt),
			endsAt: toIso(endsAt),
			...(inviteOnly
				? {}
				: {
					registrationOpensAt: toIso(registrationOpensAt),
					registrationClosesAt: toIso(registrationClosesAt)
				})
		};

		await tournamentFetch(`/${tournament.id}`, {
			method: 'PATCH',
			body: JSON.stringify(schedule)
		});
		initial = { ...current };
		dirtyStore?.setDirty(ID, false);
	}

	async function lifecycle(action: string) {
		try {
			await tournamentFetch(`/${tournament.id}/${action}`, { method: 'POST' });
			await invalidateAll();
			toast.success($_('tournament.manage.action_done'));
		} catch (error: any) {
			toast.error(error.message);
		}
	}

	async function cancelTournament() {
		if (!confirm($_('tournament.manage.cancel_confirm'))) {
			return;
		}

		try {
			await tournamentFetch(`/${tournament.id}/cancel`, {
				method: 'POST',
				body: JSON.stringify({ reason: '' })
			});
			toast.success($_('tournament.manage.cancelled'));
			await invalidateAll();
		} catch (error: any) {
			toast.error(error.message);
		}
	}

	let unregister: (() => void) | undefined;

	onMount(() => {
		unregister = dirtyStore?.registerEntry({ id: ID, save, reset });
	});
	onDestroy(() => unregister?.());

	$: canEndContest = tournament.format === 'contest' && tournament.status === 'ongoing';
	$: canCancel = tournament.status !== 'finished' && tournament.status !== 'cancelled';
</script>

<div class="mx-auto flex w-full max-w-[800px] flex-col gap-[20px]">
  <section class="flex flex-col gap-[12px] rounded-[10px] border border-[hsl(var(--border))] bg-card/40 p-[16px]">
    <div class="flex flex-wrap items-center gap-[8px]">
      <h2 class="text-lg font-bold">{$_('tournament.manage.lifecycle')}</h2>
      <TournamentStatusBadge status={tournament.status} />
    </div>

    <LifecycleTimeline status={tournament.status} {inviteOnly} class="py-[6px]" />

    {#if tournament.startBlockers?.length}
      <div class="rounded-[8px] border border-amber-500/40 bg-amber-500/10 p-[12px]">
        <div class="mb-[4px] flex items-center gap-[6px] text-sm font-semibold text-amber-500">
          <AlertTriangle size={15} />
          {$_('tournament.manage.current_status')}
        </div>
        <ul class="list-disc pl-[20px] text-sm text-amber-500/90">
          {#each tournament.startBlockers as blocker}
            <li>{blocker}</li>
          {/each}
        </ul>
      </div>
    {/if}

    <div class="grid grid-cols-1 gap-[10px] md:grid-cols-2">
      <div class="flex flex-col gap-[6px]">
        <Label>{$_('tournament.manage.registration_opens_at')}</Label>
        <Input type="datetime-local" bind:value={registrationOpensAt} disabled={disabled || inviteOnly} />
      </div>
      <div class="flex flex-col gap-[6px]">
        <Label>{$_('tournament.manage.registration_closes_at')}</Label>
        <Input type="datetime-local" bind:value={registrationClosesAt} disabled={disabled || inviteOnly} />
      </div>
      <div class="flex flex-col gap-[6px]">
        <Label>{$_('tournament.manage.starts_at')}</Label>
        <Input type="datetime-local" bind:value={startsAt} {disabled} />
      </div>
      <div class="flex flex-col gap-[6px]">
        <Label>{$_('tournament.manage.ends_at')}</Label>
        <Input type="datetime-local" bind:value={endsAt} {disabled} />
      </div>
    </div>
    <p class="text-xs text-muted-foreground">{$_('tournament.manage.schedule_hint')}</p>
    {#if dirty && !scheduleValid}
      <p class="text-xs text-destructive">{$_('tournament.manage.schedule_invalid')}</p>
    {/if}
  </section>

  {#if canEndContest || canCancel}
    <section class="flex flex-col gap-[12px] rounded-[10px] border border-destructive/40 bg-destructive/5 p-[16px]">
      <h2 class="text-lg font-bold text-destructive">{$_('tournament.manage.danger_zone')}</h2>
      <div class="flex flex-wrap gap-[8px]">
        {#if canEndContest}
          <Button size="sm" on:click={() => lifecycle('end')}>
            {$_('tournament.manage.end_contest')}
          </Button>
        {/if}
        {#if canCancel}
          <Button size="sm" variant="destructive" on:click={cancelTournament}>
            {$_('tournament.manage.cancel')}
          </Button>
        {/if}
      </div>
    </section>
  {/if}
</div>
