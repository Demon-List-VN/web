<script lang="ts">
	import { goto } from '$app/navigation';
	import { user } from '$lib/client/user';
	import { isActive } from '$lib/client/isSupporterActive';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { _ } from 'svelte-i18n';
</script>

<svelte:head>
	<title>Misc - Geometry Dash Việt Nam</title>
</svelte:head>

{#if $user.loggedIn && isActive($user.data.supporterUntil)}
	<slot />
{:else}
	<Card.Root class="mx-auto mt-[100px] max-w-[600px]">
		<Card.Header>
			<Card.Title class="text-center">{$_('misc.supporter_feature.title')}</Card.Title>
		</Card.Header>
		<Card.Content>
			<p class="text-center">
				{$_('misc.supporter_feature.description')}
			</p>
		</Card.Content>
		<Card.Footer class="flex justify-center gap-4">
			<Button variant="outline" on:click={() => goto('/')}>{$_('misc.supporter_feature.go_home')}</Button>
			<Button on:click={() => goto('/supporter')}>{$_('misc.supporter_feature.become_supporter')}</Button>
		</Card.Footer>
	</Card.Root>
{/if}
