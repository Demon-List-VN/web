<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { onMount } from 'svelte';
	import { invalidateAll, beforeNavigate } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { getManageDirty } from './manageDirty';

	export let onSaved: (() => Promise<void> | void) | null = null;

	const store = getManageDirty();
	const dirtyIds = store?.dirtyIds;

	let saving = false;

	$: count = ($dirtyIds ?? []).length;

	async function save() {
		if (!store) {
			return;
		}

		saving = true;

		try {
			await store.saveAll();
			toast.success($_('tournament.manage.all_saved'));

			if (onSaved) {
				await onSaved();
			} else {
				await invalidateAll();
			}
		} catch (error: any) {
			toast.error(error.message);
		} finally {
			saving = false;
		}
	}

	function discard() {
		store?.discardAll();
	}

	beforeNavigate((navigation) => {
		if (count > 0 && !confirm($_('tournament.manage.leave_confirm'))) {
			navigation.cancel();
		}
	});

	onMount(() => {
		const handler = (event: BeforeUnloadEvent) => {
			if (count > 0) {
				event.preventDefault();
				event.returnValue = '';
			}
		};

		window.addEventListener('beforeunload', handler);

		return () => window.removeEventListener('beforeunload', handler);
	});
</script>

{#if count > 0}
  <div class="fixed inset-x-0 bottom-0 z-50 border-t border-[hsl(var(--border))] bg-background/95 backdrop-blur">
    <div class="mx-auto flex max-w-[1100px] items-center justify-between gap-[12px] px-[16px] py-[12px]">
      <span class="flex items-center gap-[8px] text-sm font-medium">
        <span class="h-[8px] w-[8px] rounded-full bg-amber-500"></span>
        {$_('tournament.manage.unsaved')}
      </span>
      <div class="flex gap-[8px]">
        <Button variant="ghost" on:click={discard} disabled={saving}>
          {$_('tournament.manage.discard')}
        </Button>
        <Button on:click={save} disabled={saving}>
          {saving ? $_('tournament.manage.saving') : $_('tournament.manage.save_all')}
        </Button>
      </div>
    </div>
  </div>
{/if}
