<script lang="ts">
	import HamburgerMenu from 'svelte-radix/HamburgerMenu.svelte';
	import MagnifyingGlass from 'svelte-radix/MagnifyingGlass.svelte';
	import X from 'svelte-radix/Cross2.svelte';
	import { PanelLeftClose, PanelLeftOpen } from 'lucide-svelte';

	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import NotificationButton from '$lib/components/notificationButton.svelte';
	import SettingButton from '$lib/components/settingButton.svelte';
	import UserPopover from '$lib/components/userPopover.svelte';
	import { user } from '$lib/client';
	import { _ } from 'svelte-i18n';
	import { mediaQuery } from 'svelte-legos';
	import {
		sidebarOpen,
		sidebarCollapsed,
		toggleSidebar,
		toggleSidebarCollapsed
	} from '$lib/client/sidebar';

	export let searchToggled = false;
	export let navLogoSrc: string;
	export let navLogoAlt: string;
	export let useCustomListLogo = false;
	export let onCustomLogoError: () => void;
	export let signIn: () => void;
	export let signOut: () => void | Promise<void>;

	const isDesktop = mediaQuery('(min-width: 1025px)');
</script>

<header class="topbar">
	<div class="topbar-left">
		<button
			class="desktop-collapse-toggle"
			on:click={toggleSidebarCollapsed}
			aria-label={$sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
		>
			{#if $sidebarCollapsed}
				<PanelLeftOpen size={16} />
			{:else}
				<PanelLeftClose size={16} />
			{/if}
		</button>
		<button class="sidebar-toggle" on:click={toggleSidebar} aria-label="Toggle sidebar">
			{#if $sidebarOpen}
				<X size={18} />
			{:else}
				<HamburgerMenu size={18} />
			{/if}
		</button>
		<a href="/" class="logo-link" data-sveltekit-preload-data="tap">
			{#key navLogoSrc}
				<img
					src={navLogoSrc}
					alt={navLogoAlt}
					class:customListLogo={useCustomListLogo}
					on:error={onCustomLogoError}
				/>
			{/key}
		</a>
	</div>
	<div class="topbar-right">
		{#if $isDesktop}
			<Button variant="outline" on:click={() => (searchToggled = true)}>
				<div class="searchBtn">
					<MagnifyingGlass size={18} />
					<p>{$_('search.button')}</p>
					<kbd
						class="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100"
					>
						<span class="text-xs">Ctrl K</span>
					</kbd>
				</div>
			</Button>
		{:else}
			<button class="clickable topbar-icon-btn" on:click={() => (searchToggled = true)}>
				<MagnifyingGlass size={18} />
			</button>
		{/if}

		{#if !$user.loggedIn}
			<Button variant="outline" on:click={signIn}>{$_('nav.sign_in')}</Button>
		{:else}
			<a href="/submit" class={buttonVariants({ variant: 'outline' })}>{$_('submit.button')}</a>
			<NotificationButton />
			<UserPopover {signOut} />
		{/if}
		<SettingButton />
	</div>
</header>

<style lang="scss">
	.topbar {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: 48px;
		background-color: var(--navbar-bg);
		backdrop-filter: blur(20px);
		border-bottom: 1px solid var(--border1);
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 16px;
		z-index: 50;
		box-sizing: border-box;
	}

	.topbar-left {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.sidebar-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: none;
		background: none;
		color: var(--textColor2);
		cursor: pointer;
		border-radius: 6px;
		transition:
			background-color 0.1s,
			color 0.1s;

		&:hover {
			background-color: hsl(var(--accent));
			color: var(--textColor1);
		}

		@media screen and (min-width: 1025px) {
			display: none;
		}
	}

	.desktop-collapse-toggle {
		display: none;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: none;
		background: none;
		color: var(--textColor2);
		cursor: pointer;
		border-radius: 6px;
		transition:
			background-color 0.1s,
			color 0.1s;

		&:hover {
			background-color: hsl(var(--accent));
			color: var(--textColor1);
		}

		@media screen and (min-width: 1025px) {
			display: flex;
		}
	}

	.logo-link {
		display: flex;
		align-items: center;
		text-decoration: none;

		img {
			filter: invert(var(--inverted));
			max-width: 65px;
			max-height: 42px;
			margin-bottom: 12px;
			object-fit: contain;
		}

		img.customListLogo {
			filter: none;
			max-width: 120px;
			max-height: 34px;
			margin-bottom: 0;
		}
	}

	.topbar-right {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.topbar-icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: none;
		background: none;
		color: var(--textColor2);
		border-radius: 6px;
		transition:
			background-color 0.1s,
			color 0.1s;

		&:hover {
			background-color: hsl(var(--accent));
			color: var(--textColor1);
		}
	}

	.searchBtn {
		display: flex;
		align-items: center;
		gap: 10px;
		color: var(--textColor2);

		kbd {
			margin-left: 50px;
		}
	}
</style>
