<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { Star } from 'lucide-svelte';
	import { isActive } from '$lib/client/isSupporterActive';
	import { user } from '$lib/client';
	import { _ } from 'svelte-i18n';

	export let supporterUntil: string | null;
	export let uid: string;

	$: isOwner = $user.loggedIn && $user.data?.uid === uid;
	$: expiryDate = supporterUntil ? new Date(supporterUntil).toLocaleDateString() : '';
</script>

{#if isActive(supporterUntil)}
	{#if isOwner}
		<Tooltip.Root>
			<Tooltip.Trigger>
				<Badge class="supporter-badge gap-1 border-yellow-500/30 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20">
					<Star class="h-3 w-3 fill-yellow-500" />
					{$_('player.supporter_badge')}
				</Badge>
			</Tooltip.Trigger>
			<Tooltip.Content>
				<p>{$_('player.supporter_expires')}: {expiryDate}</p>
			</Tooltip.Content>
		</Tooltip.Root>
	{:else}
		<Badge class="supporter-badge gap-1 border-yellow-500/30 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20">
			<Star class="h-3 w-3 fill-yellow-500" />
			{$_('player.supporter_badge')}
		</Badge>
	{/if}
{/if}
