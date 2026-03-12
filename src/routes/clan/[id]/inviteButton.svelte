<script lang="ts">
	import * as sdk from '$lib/client/sdk';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import PlayerSelector from '$lib/components/playerSelector.svelte';
	import { toast } from 'svelte-sonner';
	import { user } from '$lib/client';
	import { _ } from 'svelte-i18n';

	let opened = false;
	let selectedPlayer: any = null;

	async function invitePlayer() {
		if (!selectedPlayer?.uid) return;
		
		opened = false;

		toast.promise(
			sdk.fetch(`/clans/invite/${selectedPlayer.uid}`, {
				method: 'POST',
				headers: {
					Authorization: 'Bearer ' + (await $user.token())
				}
			}),
			{
				success: () => {
					selectedPlayer = null;
					return $_('toast.clan_invite.success');
				},
				loading: $_('toast.clan_invite.loading'),
				error: $_('toast.clan_invite.error')
			}
		);
	}

	function handlePlayerSelect(e: CustomEvent) {
		selectedPlayer = e.detail;
	}
</script>

<Dialog.Root bind:open={opened}>
	<Dialog.Trigger class="w-full">
		<Button variant="outline" class="w-full">{$_('clan.invite.button')}</Button>
	</Dialog.Trigger>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{$_('clan.invite.title')}</Dialog.Title>
		</Dialog.Header>
			<div class="flex items-center gap-[10px]">
				<PlayerSelector 
					bind:value={selectedPlayer} 
					on:select={handlePlayerSelect}
					placeholder={$_('clan.invite.placeholder')}
				/>
				<Button 
					on:click={invitePlayer} 
					disabled={!selectedPlayer} 
					class="w-[100px]"
				>
					{$_('clan.invite.button')}
				</Button>
			</div>
	</Dialog.Content>
</Dialog.Root>
