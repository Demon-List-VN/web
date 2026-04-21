<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { AlertTriangle, Trash2 } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';

	export let list: any = null;
	export let canBan = false;
	export let canDelete = false;
	export let savingBanState = false;
	export let setBanState: (nextIsBanned: boolean, confirmationName: string) => void | Promise<void> = async () => {};
	export let deleteList: (confirmationName: string) => void | Promise<void> = async () => {};

	let dangerConfirmName = '';

	$: if (list) {
		dangerConfirmName = '';
	}

	function hasDangerConfirmation() {
		return Boolean(list && dangerConfirmName.trim() === list.title);
	}
</script>

<div class="tabContent">
	<div class="toolCard dangerCard">
		<h2 class="toolHeading">{$_('custom_lists.manage.danger_heading')}</h2>
		<p class="hint">{$_('custom_lists.manage.danger_hint')}</p>
		<div class="field">
			<label for="danger-confirm-name">{$_('custom_lists.manage.confirm_title_label')}</label>
			<Input id="danger-confirm-name" bind:value={dangerConfirmName} placeholder={list?.title} />
			<p class="hint">{$_('custom_lists.manage.confirm_title_hint', { values: { title: list?.title || '' } })}</p>
		</div>
		<div class="formActions">
			{#if canBan}
				<Button
					variant={list?.isBanned ? 'outline' : 'destructive'}
					on:click={() => list && setBanState(!list.isBanned, dangerConfirmName)}
					disabled={savingBanState || !hasDangerConfirmation()}
				>
					<AlertTriangle class="mr-2 h-4 w-4" />
					{list?.isBanned ? $_('custom_lists.manage.unban') : $_('custom_lists.manage.ban')}
				</Button>
			{/if}
			{#if canDelete}
				<Button variant="destructive" on:click={() => deleteList(dangerConfirmName)} disabled={!hasDangerConfirmation()}>
					<Trash2 class="mr-2 h-4 w-4" />
					{$_('custom_lists.detail.edit.delete')}
				</Button>
			{/if}
		</div>
	</div>
</div>

<style lang="scss">
	.tabContent {
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin-top: 16px;
	}

	.toolCard {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		padding: 22px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.dangerCard {
		border-color: hsl(var(--destructive) / 0.35);
		background: hsl(var(--destructive) / 0.04);
	}

	.toolHeading {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	label {
		font-size: 0.9rem;
		font-weight: 500;
	}

	.hint {
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
		margin: 0;
	}

	.formActions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 4px;
	}

	@media (max-width: 760px) {
		.toolCard {
			padding: 16px;
		}
	}
</style>