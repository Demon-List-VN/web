<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { user } from '$lib/client';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { SINGLE_ELIM_SIZES, tournamentFetch } from '$lib/client/tournament';

	let name = '';
	let description = '';
	let format: 'single_elimination' | 'contest' = 'single_elimination';
	let visibility: 'public' | 'unlisted' | 'private' = 'public';
	let maxPlayers = 8;
	let submitting = false;

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
			const body: any = { name, description, format, visibility };

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
</script>

<svelte:head>
  <title>{$_('tournament.create')} - {$_('head.site_name')}</title>
</svelte:head>

<div class="mx-auto mt-[20px] w-full max-w-[600px] px-[10px]">
  <h1 class="mb-[20px] text-2xl font-bold">{$_('tournament.create')}</h1>
  <div class="flex flex-col gap-[16px]">
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
      <select
        bind:value={format}
        class="h-10 rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="single_elimination">{$_('tournament.format.single_elimination')}</option>
        <option value="contest">{$_('tournament.format.contest')}</option>
      </select>
    </div>
    {#if format === 'single_elimination'}
      <div class="flex flex-col gap-[6px]">
        <Label>{$_('tournament.create_form.size')}</Label>
        <select
          bind:value={maxPlayers}
          class="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          {#each SINGLE_ELIM_SIZES as size}
            <option value={size}>{size}</option>
          {/each}
        </select>
      </div>
    {/if}
    <div class="flex flex-col gap-[6px]">
      <Label>{$_('tournament.create_form.visibility')}</Label>
      <select
        bind:value={visibility}
        class="h-10 rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="public">{$_('tournament.visibility.public')}</option>
        <option value="unlisted">{$_('tournament.visibility.unlisted')}</option>
        <option value="private">{$_('tournament.visibility.private')}</option>
      </select>
    </div>
    <Button on:click={create} disabled={submitting}>
      {$_('tournament.create_form.submit')}
    </Button>
  </div>
</div>
