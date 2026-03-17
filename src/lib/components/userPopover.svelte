<script lang="ts">
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button/index.js';
	import PlayerCard from '$lib/components/playerCard.svelte';
	import { user } from '$lib/client';
	import { isActive } from '$lib/client/isSupporterActive';
	import { goto } from '$app/navigation';
	import { _ } from 'svelte-i18n';
	import { User, Package, LayoutList, ShoppingBag, Users, Shield, LogOut } from 'lucide-svelte';

	export let signOut: () => void;

	let open = false;

	function navigate(path: string) {
		open = false;
		goto(path);
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger asChild let:builder>
		<Button
			variant="outline"
			size="icon"
			class={`overflow-hidden rounded-full ${isActive($user.data.supporterUntil) ? 'border-[2px] border-yellow-400' : ''}`}
			builders={[builder]}
		>
			<Avatar.Root>
				<Avatar.Image
					class="object-cover"
					src={`https://cdn.gdvn.net/avatars/${$user.data.uid}${
						isActive($user.data.supporterUntil) && $user.data.isAvatarGif ? '.gif' : '.jpg'
					}?version=${$user.data.avatarVersion}`}
					alt=""
				/>
				<Avatar.Fallback>{$user.data.name[0]}</Avatar.Fallback>
			</Avatar.Root>
		</Button>
	</Popover.Trigger>
	<Popover.Content align="end" class="z-[99999] w-[min(340px,calc(100vw-32px))] p-0" sideOffset={8}>
		<!-- Header -->
		<div class="popover-header">
			{#if isActive($user.data.supporterUntil)}
				<PlayerCard player={$user.data} />
			{:else}
				<div class="user-header">
					<Avatar.Root>
						<Avatar.Image
							class="object-cover"
							src={`https://cdn.gdvn.net/avatars/${$user.data.uid}.jpg?version=${$user.data.avatarVersion}`}
							alt=""
						/>
						<Avatar.Fallback>{$user.data.name[0]}</Avatar.Fallback>
					</Avatar.Root>
					<div>
						<div class="font-semibold text-sm">{$user.data.name}</div>
						<div class="text-xs text-muted-foreground">UID: {$user.data.uid}</div>
					</div>
				</div>
			{/if}
		</div>

		<div class="popover-separator" />

		<!-- Navigation -->
		<div class="popover-menu">
			<button class="popover-item" on:click={() => navigate(`/player/${$user.data.uid}`)}>
				<User size={16} />
				<span>{$_('dropdown.profile')}</span>
			</button>
			<button class="popover-item" on:click={() => navigate('/inventory')}>
				<Package size={16} />
				<span>{$_('dropdown.inventory')}</span>
			</button>
			<button class="popover-item" on:click={() => navigate(`/mySubmission/${$user.data.uid}`)}>
				<LayoutList size={16} />
				<span>{$_('dropdown.submissions')}</span>
			</button>
			<button class="popover-item" on:click={() => navigate('/orders')}>
				<ShoppingBag size={16} />
				<span>{$_('dropdown.orders')}</span>
			</button>
			{#if $user.data.clan}
				<button class="popover-item" on:click={() => navigate(`/clan/${$user.data.clan}`)}>
					<Users size={16} />
					<span>{$_('dropdown.clan')}</span>
				</button>
			{/if}
			{#if $user.data.isTrusted || $user.data.isAdmin}
				<button class="popover-item" on:click={() => navigate('/overwatch')}>
					<Shield size={16} />
					<span>{$_('dropdown.overwatch')}</span>
				</button>
			{/if}
		</div>

		<div class="popover-separator" />

		<!-- Sign out -->
		<div class="popover-menu">
			<button class="popover-item popover-item--destructive" on:click={() => { open = false; signOut(); }}>
				<LogOut size={16} />
				<span>{$_('dropdown.sign_out')}</span>
			</button>
		</div>
	</Popover.Content>
</Popover.Root>

<style lang="scss">
	.popover-header {
		padding: 12px;
	}

	.user-header {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.popover-separator {
		height: 1px;
		background: var(--border1);
		margin: 0;
	}

	.popover-menu {
		padding: 4px;
	}

	.popover-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 12px;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		color: var(--textColor2);
		cursor: pointer;
		border: none;
		background: none;
		width: 100%;
		text-align: left;
		transition: background-color 0.1s, color 0.1s;

		&:hover {
			background-color: hsl(var(--accent));
			color: var(--textColor1);
		}

		&--destructive {
			color: hsl(var(--destructive));

			&:hover {
				background-color: hsl(var(--destructive) / 0.1);
			}
		}
	}
</style>
