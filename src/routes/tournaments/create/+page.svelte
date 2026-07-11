<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Swords, Trophy } from 'lucide-svelte';
	import { user } from '$lib/client';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Select from '$lib/components/ui/select';
	import { cn } from '$lib/utils.js';
	import { SINGLE_ELIM_SIZES, formatLabelKey, tournamentFetch } from '$lib/client/tournament';

	let name = '';
	let description = '';
	let format: 'single_elimination' | 'contest' = 'single_elimination';
	let visibility = 'private';
	let registrationMode: 'open' | 'invite_only' = 'open';
	let maxPlayers = 8;
	let submitting = false;

	const formatOptions = [
		{ value: 'single_elimination', icon: Swords },
		{ value: 'contest', icon: Trophy }
	] as const;

	onMount(() => {
		if (!$user?.loggedIn) {
			goto('/tournaments');
		}
	});

	async function create() {
		if (!name.trim()) {
			toast.error($_('tournament.create_form.name_required'));

			return;
		}

		submitting = true;

		try {
			const body: any = { name, description, format, visibility, registrationMode };

			if (format === 'single_elimination') {
				body.maxPlayers = maxPlayers;
			}

			const created = await tournamentFetch('/', {
				method: 'POST',
				body: JSON.stringify(body)
			});

			toast.success($_('tournament.create_form.success'));
			goto(`/tournament/${created.id}/manage`);
		} catch (error: any) {
			toast.error(error.message);
		} finally {
			submitting = false;
		}
	}

	const visibilityLabel = (value: string) => $_(`tournament.visibility.${value}`);
	const registrationModeLabel = (value: string) => $_(`tournament.registration_mode.${value}`);
	function setRegistrationMode(value: string) {
		registrationMode = value === 'invite_only' ? 'invite_only' : 'open';
	}
</script>

<svelte:head>
  <title>{$_('tournament.create')} - {$_('head.site_name')}</title>
</svelte:head>

<div class="mx-auto mt-[20px] w-full max-w-[640px] px-[10px]">
  <h1 class="mb-[20px] text-2xl font-bold">{$_('tournament.create')}</h1>
  <div class="flex flex-col gap-[16px] rounded-[12px] border border-[hsl(var(--border))] bg-card/40 p-[20px]">
    <div class="flex flex-col gap-[6px]">
      <Label>{$_('tournament.create_form.name')}</Label>
      <Input bind:value={name} maxlength={96} />
    </div>
    <div class="flex flex-col gap-[6px]">
      <Label>{$_('tournament.create_form.description')}</Label>
      <Textarea bind:value={description} rows={3} />
    </div>

    <div class="flex flex-col gap-[6px]">
      <Label>{$_('tournament.create_form.format')}</Label>
      <div class="grid grid-cols-2 gap-[10px]">
        {#each formatOptions as option}
          <button
            type="button"
            class={cn(
              'flex flex-col gap-[8px] rounded-[10px] border p-[14px] text-left transition-colors',
              format === option.value
                ? 'border-primary bg-primary/5'
                : 'border-[hsl(var(--border))] hover:bg-muted/40'
            )}
            on:click={() => (format = option.value)}
          >
            <svelte:component this={option.icon} size={20} class={format === option.value ? 'text-primary' : 'text-muted-foreground'} />
            <span class="font-semibold">{$_(formatLabelKey(option.value))}</span>
          </button>
        {/each}
      </div>
    </div>

    {#if format === 'single_elimination'}
      <div class="flex flex-col gap-[6px]">
        <Label>{$_('tournament.create_form.size')}</Label>
        <Select.Root selected={{ value: String(maxPlayers), label: String(maxPlayers) }} onSelectedChange={(v) => v && (maxPlayers = Number(v.value))}>
          <Select.Trigger><Select.Value /></Select.Trigger>
          <Select.Content>
            {#each SINGLE_ELIM_SIZES as size}
              <Select.Item value={String(size)} label={String(size)}>{size}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
    {/if}

    <div class="flex flex-col gap-[6px]">
      <Label>{$_('tournament.create_form.registration_mode')}</Label>
      <Select.Root selected={{ value: registrationMode, label: registrationModeLabel(registrationMode) }} onSelectedChange={(v) => v && setRegistrationMode(String(v.value))}>
        <Select.Trigger><Select.Value /></Select.Trigger>
        <Select.Content>
          <Select.Item value="open" label={registrationModeLabel('open')}>{registrationModeLabel('open')}</Select.Item>
          <Select.Item value="invite_only" label={registrationModeLabel('invite_only')}>{registrationModeLabel('invite_only')}</Select.Item>
        </Select.Content>
      </Select.Root>
    </div>

    <div class="flex flex-col gap-[6px]">
      <Label>{$_('tournament.create_form.visibility')}</Label>
      <Select.Root disabled selected={{ value: visibility, label: visibilityLabel(visibility) }} onSelectedChange={(v) => v && (visibility = String(v.value))}>
        <Select.Trigger><Select.Value /></Select.Trigger>
        <Select.Content>
          <Select.Item value="public" label={visibilityLabel('public')}>{visibilityLabel('public')}</Select.Item>
          <Select.Item value="unlisted" label={visibilityLabel('unlisted')}>{visibilityLabel('unlisted')}</Select.Item>
          <Select.Item value="private" label={visibilityLabel('private')}>{visibilityLabel('private')}</Select.Item>
        </Select.Content>
      </Select.Root>
    </div>

    <Button on:click={create} disabled={submitting}>
      {$_('tournament.create_form.submit')}
    </Button>
  </div>
</div>
