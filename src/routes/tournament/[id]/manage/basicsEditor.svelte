<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { onMount, onDestroy } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { Upload } from 'lucide-svelte';
	import { user } from '$lib/client';
	import { upload } from '$lib/client/storage';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Switch } from '$lib/components/ui/switch';
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';
	import { tournamentFetch } from '$lib/client/tournament';
	import { getManageDirty } from '$lib/components/tournament/manage/manageDirty';

	export let tournament: any;
	export let disabled = false;

	const ID = 'basics';
	const dirtyStore = getManageDirty();

	type BasicsDraft = {
		name: string;
		description: string;
		detail: string;
		visibility: string;
		minElo: number | null;
		maxElo: number | null;
		eloEnforced: boolean;
		isOfficial?: boolean;
	};

	function normalizeElo(value: unknown): number | null {
		if (value === null || value === undefined || value === '') {
			return null;
		}

		const parsed = Number(value);

		return Number.isFinite(parsed) ? parsed : null;
	}

	function normalizeTournament(value: any): BasicsDraft {
		const canManageOfficial = value.viewerRole === 'admin' || value.viewerRole === 'manager';

		return {
			name: value.name ?? '',
			description: value.description ?? '',
			detail: value.detail ?? '',
			visibility: value.status === 'draft' ? 'private' : value.visibility ?? 'public',
			minElo: normalizeElo(value.minElo),
			maxElo: normalizeElo(value.maxElo),
			eloEnforced: Boolean(value.eloEnforced),
			...(canManageOfficial ? { isOfficial: Boolean(value.isOfficial) } : {})
		};
	}

	function basicsKey(value: any) {
		return JSON.stringify(normalizeTournament(value));
	}

	function applyLoadedBasics(value: any) {
		initial = normalizeTournament(value);
		name = initial.name;
		description = initial.description;
		detail = initial.detail;
		visibility = initial.visibility;
		minElo = initial.minElo;
		maxElo = initial.maxElo;
		eloEnforced = initial.eloEnforced;
		isOfficial = initial.isOfficial ?? Boolean(value.isOfficial);
		lastLoadedKey = basicsKey(value);
	}

	let initial = normalizeTournament(tournament);

	let name = initial.name;
	let description = initial.description;
	let detail = initial.detail;
	let visibility = initial.visibility;
	let minElo: number | null = initial.minElo;
	let maxElo: number | null = initial.maxElo;
	let eloEnforced = initial.eloEnforced;
	let isOfficial = 'isOfficial' in initial ? initial.isOfficial : Boolean(tournament.isOfficial);
	let fileInput: HTMLInputElement;
	let dirty = false;
	let lastLoadedKey = basicsKey(tournament);

	$: canManageOfficial = tournament.viewerRole === 'admin' || tournament.viewerRole === 'manager';
	$: isDraft = tournament.status === 'draft';
	$: if (isDraft) {
		visibility = 'private';
	}
	$: current = {
		name,
		description,
		detail,
		visibility,
		minElo: normalizeElo(minElo),
		maxElo: normalizeElo(maxElo),
		eloEnforced,
		...(canManageOfficial && 'isOfficial' in initial ? { isOfficial: Boolean(isOfficial) } : {})
	};
	$: dirty = JSON.stringify(current) !== JSON.stringify(initial);
	$: {
		const nextLoadedKey = basicsKey(tournament);

		if (!dirty && nextLoadedKey !== lastLoadedKey) {
			applyLoadedBasics(tournament);
		}
	}
	$: dirtyStore?.setDirty(ID, dirty && !disabled);

	function reset() {
		name = initial.name;
		description = initial.description;
		detail = initial.detail;
		visibility = initial.visibility;
		minElo = initial.minElo;
		maxElo = initial.maxElo;
		eloEnforced = initial.eloEnforced;
		isOfficial = 'isOfficial' in initial ? initial.isOfficial : Boolean(tournament.isOfficial);
	}

	async function save() {
		await tournamentFetch(`/${tournament.id}`, {
			method: 'PATCH',
			body: JSON.stringify(current)
		});
		initial = { ...current };
		dirtyStore?.setDirty(ID, false);
	}

	async function uploadBanner(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) {
			return;
		}

		if (file.size > 500 * 1024) {
			toast.error($_('tournament.manage.banner_too_large'));

			return;
		}

		try {
			const token = await $user.token();

			await upload(`tournament-banner/${tournament.id}.webp`, file, token!);
			await tournamentFetch(`/${tournament.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ bumpBannerVersion: true })
			});
			toast.success($_('tournament.manage.banner_uploaded'));
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

	const visibilityLabel = (value: string) => $_(`tournament.visibility.${value}`);
</script>

<section class="flex flex-col gap-[12px] rounded-[10px] border border-[hsl(var(--border))] bg-card/40 p-[16px]">
  <h2 class="text-lg font-bold">{$_('tournament.manage.basics')}</h2>
  <div class="flex flex-col gap-[6px]">
    <Label>{$_('tournament.create_form.name')}</Label>
    <Input bind:value={name} maxlength={96} />
  </div>
  <div class="flex flex-col gap-[6px]">
    <Label>{$_('tournament.create_form.description')}</Label>
    <Textarea bind:value={description} rows={2} />
  </div>
  <div class="flex flex-col gap-[6px]">
    <Label>{$_('tournament.manage.detail')}</Label>
    <Textarea bind:value={detail} rows={8} placeholder={$_('tournament.manage.detail_placeholder')} />
  </div>
  <div class="grid grid-cols-1 gap-[10px] sm:grid-cols-3">
    <div class="flex flex-col gap-[6px]">
      <Label>{$_('tournament.create_form.visibility')}</Label>
      <Select.Root disabled={disabled || isDraft} selected={{ value: visibility, label: visibilityLabel(visibility) }} onSelectedChange={(v) => v && (visibility = String(v.value))}>
        <Select.Trigger><Select.Value /></Select.Trigger>
        <Select.Content>
          <Select.Item value="public" label={visibilityLabel('public')}>{visibilityLabel('public')}</Select.Item>
          <Select.Item value="unlisted" label={visibilityLabel('unlisted')}>{visibilityLabel('unlisted')}</Select.Item>
          <Select.Item value="private" label={visibilityLabel('private')}>{visibilityLabel('private')}</Select.Item>
        </Select.Content>
      </Select.Root>
    </div>
    <div class="flex flex-col gap-[6px]">
      <Label>{$_('tournament.manage.min_elo')}</Label>
      <Input type="number" bind:value={minElo} {disabled} />
    </div>
    <div class="flex flex-col gap-[6px]">
      <Label>{$_('tournament.manage.max_elo')}</Label>
      <Input type="number" bind:value={maxElo} {disabled} />
    </div>
  </div>
  <div class="flex items-center gap-[8px]">
    <Switch bind:checked={eloEnforced} {disabled} id="elo-enforced" />
    <Label for="elo-enforced">{$_('tournament.manage.elo_enforced')}</Label>
  </div>
  {#if canManageOfficial}
    <div class="flex items-center gap-[8px]">
      <Switch bind:checked={isOfficial} id="official-tournament" />
      <Label for="official-tournament">{$_('tournament.manage.official')}</Label>
    </div>
  {/if}
  <div class="flex flex-col gap-[6px]">
    <Label>{$_('tournament.manage.banner')}</Label>
    <input bind:this={fileInput} type="file" accept="image/webp" class="hidden" on:change={uploadBanner} />
    <Button variant="outline" size="sm" class="flex w-fit items-center gap-[6px]" on:click={() => fileInput.click()}>
      <Upload size={15} />
      {$_('tournament.manage.banner')}
    </Button>
    <p class="text-xs text-muted-foreground">{$_('tournament.manage.banner_hint')}</p>
  </div>
</section>
