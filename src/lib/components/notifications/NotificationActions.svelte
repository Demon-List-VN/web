<script lang="ts">
	import { Check, Loader2, X } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';
	import { Button } from '$lib/components/ui/button';
	import type { NotificationAction } from './notification';

	export let actionKey = '';
	export let actionLoading = '';
	export let compact = false;
	export let disabled = false;
	export let onAction:
		| ((event: MouseEvent, action: NotificationAction) => void | Promise<void>)
		| null = null;

	$: acceptLoading = actionLoading === `${actionKey}:accept`;
	$: rejectLoading = actionLoading === `${actionKey}:reject`;
	$: actionsDisabled = disabled || Boolean(actionLoading);

	function handleAction(event: MouseEvent, action: NotificationAction) {
		void onAction?.(event, action);
	}
</script>

<span class="notificationActions" class:compact>
	<Button
		size="sm"
		class={compact ? 'h-7 px-2 text-[11px]' : ''}
		on:click={(event) => handleAction(event, 'accept')}
		disabled={actionsDisabled}
	>
		{#if acceptLoading}
			<Loader2 class="h-4 w-4 animate-spin" />
		{:else}
			<Check class="h-4 w-4" />
		{/if}
		{$_('general.accept')}
	</Button>
	<Button
		size="sm"
		variant="outline"
		class={compact ? 'h-7 px-2 text-[11px]' : ''}
		on:click={(event) => handleAction(event, 'reject')}
		disabled={actionsDisabled}
	>
		{#if rejectLoading}
			<Loader2 class="h-4 w-4 animate-spin" />
		{:else}
			<X size={14} />
		{/if}
		{$_('general.reject')}
	</Button>
</span>

<style lang="scss">
	.notificationActions {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 4px;
	}

	.compact {
		margin-top: 0;
	}
</style>
