<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { onMount, onDestroy } from 'svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Switch } from '$lib/components/ui/switch';
	import { tournamentFetch } from '$lib/client/tournament';
	import { getManageDirty } from '$lib/components/tournament/manage/manageDirty';

	export let tournament: any;
	export let disabled = false;

	const ID = 'contest-config';
	const dirtyStore = getManageDirty();
	const cfg = tournament.contestConfig ?? {};
	type LateRegMode = 'until_end' | 'custom';

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

	function contestStartMs() {
		const date = new Date(String(tournament.startedAt ?? tournament.startsAt ?? ''));
		const time = date.getTime();

		return Number.isFinite(time) ? time : null;
	}

	function offsetToCloseTime(offsetSeconds: unknown) {
		const startMs = contestStartMs();
		const offset = Number(offsetSeconds);

		if (startMs === null || !Number.isFinite(offset) || offset <= 0) {
			return '';
		}

		return toDatetimeLocal(new Date(startMs + offset * 1000)
			.toISOString());
	}

	function defaultCloseTime(durationSeconds: number) {
		const startMs = contestStartMs();

		if (startMs === null) {
			return '';
		}

		return toDatetimeLocal(new Date(startMs + durationSeconds * 1000)
			.toISOString());
	}

	function offsetToFreezeTime(offsetSeconds: unknown, durationSeconds: unknown) {
		const startMs = contestStartMs();
		const offset = Number(offsetSeconds);
		const duration = Number(durationSeconds);

		if (
			startMs === null
			|| !Number.isFinite(offset)
			|| offset <= 0
			|| !Number.isFinite(duration)
			|| duration <= offset
		) {
			return '';
		}

		return toDatetimeLocal(new Date(startMs + (duration - offset) * 1000)
			.toISOString());
	}

	function modeFromConfig() {
		if (cfg.lateRegOffsetSeconds == null) {
			return 'until_end';
		}

		const offset = Number(cfg.lateRegOffsetSeconds);
		const duration = Number(cfg.durationSeconds);

		return Number.isFinite(offset)
			&& Number.isFinite(duration)
			&& duration > 0
			&& offset >= duration
			? 'until_end'
			: 'custom';
	}

	let initial = {
		durationHours: cfg.durationSeconds ? cfg.durationSeconds / 3600 : 2,
		freezeEnabled: Boolean(
			cfg.freezeAt
			|| (Number.isFinite(Number(cfg.freezeOffsetSeconds)) && Number(cfg.freezeOffsetSeconds) > 0)
		),
		autoUnfreezeLeaderboard: cfg.autoUnfreezeLeaderboard !== false,
		freezeAt: toDatetimeLocal(cfg.freezeAt)
			|| offsetToFreezeTime(cfg.freezeOffsetSeconds, cfg.durationSeconds),
		allowGeodeSubmit: cfg.allowGeodeSubmit !== false,
		allowManualSubmit: cfg.allowManualSubmit === true,
		lateRegEnabled: cfg.lateRegOffsetSeconds != null,
		lateRegMode: modeFromConfig() as LateRegMode,
		lateRegClosesAt: offsetToCloseTime(cfg.lateRegOffsetSeconds)
			|| defaultCloseTime(Number(cfg.durationSeconds ?? 7200)),
		lateRegPenaltyPercent: cfg.lateRegPenaltyFraction != null ? cfg.lateRegPenaltyFraction * 100 : 0
	};

	let durationHours = initial.durationHours;
	let freezeEnabled = initial.freezeEnabled;
	let autoUnfreezeLeaderboard = initial.autoUnfreezeLeaderboard;
	let freezeAt = initial.freezeAt;
	let allowGeodeSubmit = initial.allowGeodeSubmit;
	let allowManualSubmit = initial.allowManualSubmit;
	let lateRegEnabled = initial.lateRegEnabled;
	let lateRegMode = initial.lateRegMode;
	let lateRegClosesAt = initial.lateRegClosesAt;
	let lateRegPenaltyPercent = initial.lateRegPenaltyPercent;

	$: current = {
		durationHours,
		freezeEnabled,
		autoUnfreezeLeaderboard: freezeEnabled ? autoUnfreezeLeaderboard : true,
		freezeAt,
		allowGeodeSubmit,
		allowManualSubmit,
		lateRegEnabled,
		lateRegMode,
		lateRegClosesAt,
		lateRegPenaltyPercent
	};
	$: dirty = JSON.stringify(current) !== JSON.stringify(initial);
	$: dirtyStore?.setDirty(ID, dirty && !disabled);
	$: customLateRegValid = !lateRegEnabled
		|| lateRegMode !== 'custom'
		|| Boolean(lateRegClosesAt);
	$: freezeValid = !freezeEnabled || Boolean(toIso(freezeAt));

	function reset() {
		durationHours = initial.durationHours;
		freezeEnabled = initial.freezeEnabled;
		autoUnfreezeLeaderboard = initial.autoUnfreezeLeaderboard;
		freezeAt = initial.freezeAt;
		allowGeodeSubmit = initial.allowGeodeSubmit;
		allowManualSubmit = initial.allowManualSubmit;
		lateRegEnabled = initial.lateRegEnabled;
		lateRegMode = initial.lateRegMode;
		lateRegClosesAt = initial.lateRegClosesAt;
		lateRegPenaltyPercent = initial.lateRegPenaltyPercent;
	}

	function setLateRegMode(value: unknown) {
		if (value === 'until_end' || value === 'custom') {
			lateRegMode = value;
		}
	}

	function lateRegOffsetSeconds() {
		if (!lateRegEnabled) {
			return null;
		}

		const durationSeconds = Math.round(durationHours * 3600);

		if (lateRegMode === 'until_end') {
			return durationSeconds;
		}

		const startMs = contestStartMs();
		const closeIso = toIso(lateRegClosesAt);
		const closeMs = closeIso
			? new Date(closeIso)
				.getTime()
			: NaN;

		if (startMs === null || !Number.isFinite(closeMs)) {
			throw new Error($_('tournament.manage.late_reg_close_invalid'));
		}

		return Math.round((closeMs - startMs) / 1000);
	}

	async function save() {
		if (!customLateRegValid) {
			throw new Error($_('tournament.manage.late_reg_close_invalid'));
		}

		if (!freezeValid) {
			throw new Error($_('tournament.manage.freeze_at_invalid'));
		}

		await tournamentFetch(`/${tournament.id}/contest/config`, {
			method: 'PUT',
			body: JSON.stringify({
				durationSeconds: Math.round(durationHours * 3600),
				freezeAt: freezeEnabled ? toIso(freezeAt) : null,
				autoUnfreezeLeaderboard: freezeEnabled ? autoUnfreezeLeaderboard : true,
				allowGeodeSubmit,
				allowManualSubmit,
				lateRegOffsetSeconds: lateRegOffsetSeconds(),
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
  </div>
  <div class="flex items-center gap-[8px]">
    <Switch bind:checked={freezeEnabled} {disabled} id="leaderboard-freeze" />
    <Label for="leaderboard-freeze">{$_('tournament.manage.leaderboard_freeze')}</Label>
  </div>
  {#if freezeEnabled}
    <div class="flex flex-col gap-[6px]">
      <Label>{$_('tournament.manage.freeze_at')}</Label>
      <Input type="datetime-local" bind:value={freezeAt} {disabled} />
      {#if !freezeValid}
        <p class="text-xs text-destructive">{$_('tournament.manage.freeze_at_invalid')}</p>
      {/if}
    </div>
    <div class="flex items-center gap-[8px]">
      <Switch
        bind:checked={autoUnfreezeLeaderboard}
        {disabled}
        id="auto-unfreeze-leaderboard"
      />
      <Label for="auto-unfreeze-leaderboard">
        {$_('tournament.manage.auto_unfreeze_leaderboard')}
      </Label>
    </div>
  {/if}
  <div class="flex items-center gap-[8px]">
    <Switch bind:checked={allowGeodeSubmit} {disabled} id="allow-geode-submit" />
    <Label for="allow-geode-submit">
      {$_('tournament.manage.allow_geode_submit')}
    </Label>
  </div>
  <div class="flex items-center gap-[8px]">
    <Switch bind:checked={allowManualSubmit} {disabled} id="allow-manual-submit" />
    <Label for="allow-manual-submit">
      {$_('tournament.manage.allow_manual_submit')}
    </Label>
  </div>
  <div class="flex items-center gap-[8px]">
    <Switch bind:checked={lateRegEnabled} {disabled} id="late-reg" />
    <Label for="late-reg">{$_('tournament.manage.late_registration')}</Label>
  </div>
  {#if lateRegEnabled}
    <div class="grid grid-cols-1 gap-[10px] sm:grid-cols-2">
      <div class="flex flex-col gap-[6px]">
        <Label>{$_('tournament.manage.late_reg_window')}</Label>
        <Select.Root
          {disabled}
          selected={{
            value: lateRegMode,
            label: $_(`tournament.manage.late_reg_${lateRegMode}`)
          }}
          onSelectedChange={(v) => v && setLateRegMode(v.value)}
        >
          <Select.Trigger>
            {$_(`tournament.manage.late_reg_${lateRegMode}`)}
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="until_end" label={$_('tournament.manage.late_reg_until_end')}>
              {$_('tournament.manage.late_reg_until_end')}
            </Select.Item>
            <Select.Item value="custom" label={$_('tournament.manage.late_reg_custom')}>
              {$_('tournament.manage.late_reg_custom')}
            </Select.Item>
          </Select.Content>
        </Select.Root>
      </div>
      <div class="flex flex-col gap-[6px]">
        <Label>{$_('tournament.manage.late_reg_penalty')}</Label>
        <Input type="number" bind:value={lateRegPenaltyPercent} {disabled} />
      </div>
    </div>
    {#if lateRegMode === 'custom'}
      <div class="flex flex-col gap-[6px]">
        <Label>{$_('tournament.manage.late_reg_closes_at')}</Label>
        <Input type="datetime-local" bind:value={lateRegClosesAt} {disabled} />
        {#if !customLateRegValid}
          <p class="text-xs text-destructive">{$_('tournament.manage.late_reg_close_invalid')}</p>
        {/if}
      </div>
    {/if}
  {/if}
</section>
