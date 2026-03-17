<script lang="ts">
	import type { ComponentType } from 'svelte';
	import { fade } from 'svelte/transition';
	import { page } from '$app/stores';
	import { mediaQuery } from 'svelte-legos';
	import {
		sidebarOpen,
		closeSidebar,
		sidebarCollapsed,
		setSidebarCollapsed
	} from '$lib/client/sidebar';
	import { user } from '$lib/client';
	import { isActive } from '$lib/client/isSupporterActive';
	import { _ } from 'svelte-i18n';
	import ChevronDown from 'svelte-radix/ChevronDown.svelte';
	import { Heart } from 'lucide-svelte';
	import * as Tooltip from '$lib/components/ui/tooltip';

	$: pathname = $page.url.pathname;

	// Track which groups are expanded
	let expandedGroups: Record<string, boolean> = {};

	function toggleGroup(name: string) {
		expandedGroups[name] = !expandedGroups[name];
	}

	function isLinkActive(route: string): boolean {
		if (route.startsWith('http')) return false;
		if (route === '/') return pathname === '/';
		// strip query strings for comparison
		const cleanRoute = route.split('?')[0];
		return pathname.startsWith(cleanRoute);
	}

	function isGroupActive(
		group: {
			name: string;
			routes?: { route: string; name: string }[];
			route?: string;
		}
	): boolean {
		if (group.routes) {
			return group.routes.some((r) => isLinkActive(r.route));
		}
		if (group.route) {
			return isLinkActive(group.route);
		}
		return false;
	}

	type NavGroup = {
		name: string;
		icon: ComponentType;
		route?: string;
		routes?: { route: string; name: string; icon?: ComponentType }[];
	};
	export let linkGroup: NavGroup[] = [];
	const DESKTOP_BREAKPOINT = 1025;
	const isDesktop = mediaQuery(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
	$: showTooltip = $sidebarCollapsed && $isDesktop;

	function handleLinkClick() {
		closeSidebar();
	}

	function handleBackdropClick() {
		if ($isDesktop) {
			setSidebarCollapsed(true);
		} else {
			closeSidebar();
		}
	}

	// Auto-expand active groups on mount
	$: {
		for (const group of linkGroup) {
			if (group.routes && isGroupActive(group) && expandedGroups[group.name] === undefined) {
				expandedGroups[group.name] = true;
			}
		}
	}

	function handleGroupToggle(name: string) {
		if ($isDesktop && $sidebarCollapsed) {
			setSidebarCollapsed(false);
			expandedGroups[name] = true;
			return;
		}
		toggleGroup(name);
	}
</script>

<!-- Backdrop -->
{#if $sidebarOpen || ($isDesktop && !$sidebarCollapsed)}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div class="sidebar-backdrop" on:click={handleBackdropClick} transition:fade={{ duration: 200 }} />
{/if}

<aside class="sidebar" class:open={$sidebarOpen} class:collapsed={$sidebarCollapsed}>
	<nav class="sidebar-nav">
		{#each linkGroup as group}
			{#if group.routes}
				<!-- Expandable group -->
				<div class="nav-group">
					{#if showTooltip}
						<Tooltip.Root openDelay={0} closeDelay={0}>
							<Tooltip.Trigger asChild let:builder>
								<button
									{...builder}
									use:builder.action
									class="nav-item nav-group-trigger"
									class:active={isGroupActive(group)}
									on:click={() => handleGroupToggle(group.name)}
								>
									<svelte:component this={group.icon} size={18} />
									<span>{group.name}</span>
									<span class="chevron" class:expanded={expandedGroups[group.name]}>
										<ChevronDown size={14} />
									</span>
								</button>
							</Tooltip.Trigger>
							<Tooltip.Content side="right" align="center" sideOffset={10}>
								{group.name}
								<Tooltip.Arrow class="fill-primary" />
							</Tooltip.Content>
						</Tooltip.Root>
					{:else}
						<button
							class="nav-item nav-group-trigger"
							class:active={isGroupActive(group)}
							on:click={() => handleGroupToggle(group.name)}
						>
							<svelte:component this={group.icon} size={18} />
							<span>{group.name}</span>
							<span class="chevron" class:expanded={expandedGroups[group.name]}>
								<ChevronDown size={14} />
							</span>
						</button>
					{/if}
					{#if expandedGroups[group.name] && !$sidebarCollapsed}
						<div class="nav-subitems">
							{#each group.routes as link}
								<a
									href={link.route}
									class="nav-item nav-subitem"
									class:active={isLinkActive(link.route)}
									data-sveltekit-preload-data="tap"
									on:click={handleLinkClick}
								>
									{#if link.icon}
										<svelte:component this={link.icon} size={16} />
									{/if}
									<span>{link.name}</span>
								</a>
							{/each}
						</div>
					{/if}
				</div>
			{:else if group.route}
				<!-- Direct link -->
				{#if showTooltip}
					<Tooltip.Root openDelay={0} closeDelay={0}>
						<Tooltip.Trigger asChild let:builder>
							<a
								{...builder}
								use:builder.action
								href={group.route}
								class="nav-item"
								class:active={isLinkActive(group.route)}
								data-sveltekit-preload-data="tap"
								on:click={handleLinkClick}
							>
								<svelte:component this={group.icon} size={18} />
								<span>{group.name}</span>
							</a>
						</Tooltip.Trigger>
						<Tooltip.Content side="right" align="center" sideOffset={10}>
							{group.name}
							<Tooltip.Arrow class="fill-primary" />
						</Tooltip.Content>
					</Tooltip.Root>
				{:else}
					<a
						href={group.route}
						class="nav-item"
						class:active={isLinkActive(group.route)}
						data-sveltekit-preload-data="tap"
						on:click={handleLinkClick}
					>
						<svelte:component this={group.icon} size={18} />
						<span>{group.name}</span>
					</a>
				{/if}
			{/if}
		{/each}

		<div class="nav-separator" />

		<!-- Supporter link -->
		{#if $user.loggedIn && isActive($user.data.supporterUntil)}
			{#if showTooltip}
				<Tooltip.Root openDelay={0} closeDelay={0}>
					<Tooltip.Trigger asChild let:builder>
						<a
							{...builder}
							use:builder.action
							href="/supporter"
							class="nav-item supporter-link"
							class:active={isLinkActive('/supporter')}
							data-sveltekit-preload-data="tap"
							on:click={handleLinkClick}
						>
							<Heart size={18} />
							<span>{$_('nav.supporter')}</span>
						</a>
					</Tooltip.Trigger>
					<Tooltip.Content side="right" align="center" sideOffset={10}>
						{$_('nav.supporter')}
						<Tooltip.Arrow class="fill-primary" />
					</Tooltip.Content>
				</Tooltip.Root>
			{:else}
				<a
					href="/supporter"
					class="nav-item supporter-link"
					class:active={isLinkActive('/supporter')}
					data-sveltekit-preload-data="tap"
					on:click={handleLinkClick}
				>
					<Heart size={18} />
					<span>{$_('nav.supporter')}</span>
				</a>
			{/if}
		{:else}
			{#if showTooltip}
				<Tooltip.Root openDelay={0} closeDelay={0}>
					<Tooltip.Trigger asChild let:builder>
						<a
							{...builder}
							use:builder.action
							href="/supporter"
							class="nav-item supporter-cta"
							data-sveltekit-preload-data="tap"
							on:click={handleLinkClick}
						>
							<Heart size={18} />
							<span>{$_('nav.supporter')}</span>
						</a>
					</Tooltip.Trigger>
					<Tooltip.Content side="right" align="center" sideOffset={10}>
						{$_('nav.supporter')}
						<Tooltip.Arrow class="fill-primary" />
					</Tooltip.Content>
				</Tooltip.Root>
			{:else}
				<a
					href="/supporter"
					class="nav-item supporter-cta"
					data-sveltekit-preload-data="tap"
					on:click={handleLinkClick}
				>
					<Heart size={18} />
					<span>{$_('nav.supporter')}</span>
				</a>
			{/if}
		{/if}
	</nav>
</aside>

<style lang="scss">
	.sidebar-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 40;
		display: block;

		@media screen and (min-width: 1025px) {
			top: 48px;
		}
	}

	.sidebar {
		position: fixed;
		top: 48px;
		left: 0;
		bottom: 0;
		width: 240px;
		background-color: hsl(var(--background));
		border-right: 1px solid var(--border1);
		z-index: 45;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 8px;
		box-sizing: border-box;
		transition: width 0.2s ease;

		&.collapsed {
			width: 72px;
		}

		/* Custom scrollbar */
		&::-webkit-scrollbar {
			width: 4px;
		}
		&::-webkit-scrollbar-thumb {
			background: hsl(var(--muted));
			border-radius: 4px;
		}

		@media screen and (max-width: 1024px) {
			transform: translateX(-100%);
			transition: transform 0.2s ease;
			z-index: 50;
			top: 0;
			padding-top: 56px;
			width: 75vw;
			max-width: 320px;

			&.collapsed {
				width: 75vw;
				max-width: 320px;
			}

			&.open {
				transform: translateX(0);
			}
		}
	}

	.sidebar-nav {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.nav-separator {
		height: 1px;
		background: var(--border1);
		margin: 6px 8px;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 7px 10px;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		color: var(--textColor2);
		text-decoration: none;
		cursor: pointer;
		border: none;
		background: none;
		width: 100%;
		text-align: left;
		transition: background-color 0.1s, color 0.1s, padding 0.2s ease;
		white-space: nowrap;
		overflow: hidden;

		&:hover {
			background-color: hsl(var(--accent));
			color: var(--textColor1);
		}

		&.active {
			background-color: hsl(var(--accent));
			color: var(--textColor);
			font-weight: 600;
		}
	}

	@media screen and (min-width: 1025px) {
		.sidebar.collapsed {
			// 72px sidebar - 8px*2 padding = 56px inner
			// center 18px icon: (56 - 18) / 2 = 19px
			.nav-item {
				padding: 8px 19px;

				span {
					display: none;
				}
			}

			.nav-group-trigger .chevron {
				display: none;
			}

			.nav-subitems,
			.nav-separator {
				display: none;
			}
		}
	}

	.nav-group-trigger {
		.chevron {
			margin-left: auto;
			display: flex;
			align-items: center;

			&.expanded {
				transform: rotate(180deg);
			}
		}
	}

	.nav-subitems {
		display: flex;
		flex-direction: column;
		gap: 1px;
		padding-left: 12px;
	}

	.nav-subitem {
		font-size: 13px;
		padding: 6px 10px;
	}

	.supporter-cta {
		color: #eab308;
		font-weight: 600;

		&:hover {
			background-color: rgba(234, 179, 8, 0.1);
			color: #facc15;
		}
	}

	.supporter-link {
		color: #eab308;

		&.active {
			color: #facc15;
			background-color: rgba(234, 179, 8, 0.1);
		}
	}
</style>
