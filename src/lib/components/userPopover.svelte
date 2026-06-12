<script lang="ts">
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button/index.js';
	import PlayerCard from '$lib/components/playerCard.svelte';
	import PlayerLevelBadge from '$lib/components/PlayerLevelBadge.svelte';
	import AvatarFrame from '$lib/components/AvatarFrame.svelte';
	import SupporterTierProgress from '$lib/components/SupporterTierProgress.svelte';
	import { getEquippedFrame } from '$lib/client/cosmetics';
	import { user } from '$lib/client';
	import { isActive } from '$lib/client/isSupporterActive';
	import { goto } from '$app/navigation';
	import { _ } from 'svelte-i18n';
	import {
		User,
		Package,
		LayoutList,
		ShoppingBag,
		Users,
		Shield,
		MessageSquareText,
		LogOut
	} from 'lucide-svelte';

	export let signOut: () => void;

	let open = false;
	let hydratedNavbarPlayer: any = null;
	let hydratedNavbarPlayerUid = '';

	$: currentPlayer = $user.data;
	$: if (
		currentPlayer?.uid
		&& currentPlayer.uid !== hydratedNavbarPlayerUid
	) {
		hydratedNavbarPlayerUid = currentPlayer.uid;
		hydratedNavbarPlayer = null;
		void loadNavbarPlayer(currentPlayer.uid);
	}
	$: navbarFrame = getEquippedFrame(currentPlayer)
		?? getEquippedFrame(hydratedNavbarPlayer);

	function navigate(path: string) {
		open = false;
		goto(path);
	}

	async function loadNavbarPlayer(uid: string) {
		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/players/${encodeURIComponent(uid)}`
			);

			if (!response.ok || hydratedNavbarPlayerUid !== uid) {
				return;
			}

			hydratedNavbarPlayer = await response.json();
		} catch {
			hydratedNavbarPlayer = null;
		}
	}
</script>

<Popover.Root bind:open>
  <Popover.Trigger asChild let:builder>
    <Button
      variant="outline"
      size="icon"
      class="avatar-menu-button rounded-full"
      builders={[builder]}
    >
      <span class="avatar-menu-frame">
        <AvatarFrame frame={navbarFrame}>
          <Avatar.Root class="h-[28px] w-[28px]">
            <Avatar.Image
              class="object-cover"
              src={`https://cdn.gdvn.net/avatars/${$user.data.uid}${
                  isActive($user.data.supporterUntil) && $user.data.isAvatarGif
                      ? '.gif'
                      : '.jpg'
              }?version=${$user.data.avatarVersion}`}
              alt=""
            />
            <Avatar.Fallback>{$user.data.name[0]}</Avatar.Fallback>
          </Avatar.Root>
        </AvatarFrame>
        <PlayerLevelBadge player={$user.data} size="sm" />
      </span>
    </Button>
  </Popover.Trigger>
  <Popover.Content
    align="end"
    class="z-[99999] w-[min(340px,calc(100vw-32px))] p-0"
    sideOffset={8}
  >
    <!-- Header -->
    <div class="popover-header">
      <PlayerCard player={$user.data} />
    </div>

    {#if isActive($user.data.supporterUntil)}
      <div class="tier-progress-wrap">
        <SupporterTierProgress
          supporterUntil={$user.data.supporterUntil}
          compact
        />
      </div>
    {:else}
      <div class="tier-progress-wrap">
        <SupporterTierProgress preview compact nonSupporter />
      </div>
    {/if}

    <div class="popover-separator" />

    <!-- Navigation -->
    <div class="popover-menu">
      <button
        class="popover-item"
        on:click={() => navigate(`/player/${$user.data.uid}`)}
      >
        <User size={16} />
        <span>{$_('dropdown.profile')}</span>
      </button>
      <button class="popover-item" on:click={() => navigate('/inventory')}>
        <Package size={16} />
        <span>{$_('dropdown.inventory')}</span>
      </button>
      <button
        class="popover-item"
        on:click={() => navigate(`/mySubmission/${$user.data.uid}`)}
      >
        <LayoutList size={16} />
        <span>{$_('dropdown.submissions')}</span>
      </button>
      <button class="popover-item" on:click={() => navigate('/orders')}>
        <ShoppingBag size={16} />
        <span>{$_('dropdown.orders')}</span>
      </button>
      {#if $user.data.clan}
        <button
          class="popover-item"
          on:click={() => navigate(`/clan/${$user.data.clan}`)}
        >
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
      {#if $user.data.isLevelReviewer || $user.data.isAdmin}
        <button class="popover-item" on:click={() => navigate('/level-review')}>
          <MessageSquareText size={16} />
          <span>{$_('dropdown.level_review')}</span>
        </button>
      {/if}
    </div>

    <div class="popover-separator" />

    <!-- Sign out -->
    <div class="popover-menu">
      <button
        class="popover-item popover-item--destructive"
        on:click={() => {
            open = false;
            signOut();
        }}
      >
        <LogOut size={16} />
        <span>{$_('dropdown.sign_out')}</span>
      </button>
    </div>
  </Popover.Content>
</Popover.Root>

<style lang="scss">
:global(.avatar-menu-button) {
  overflow: visible;
}

.avatar-menu-frame {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.popover-header {
  padding: 12px;
}

.tier-progress-wrap {
  padding: 0 12px 12px;
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
