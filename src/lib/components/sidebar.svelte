<script lang="ts">
	import { page } from '$app/stores';
	import { sidebarOpen, closeSidebar } from '$lib/client/sidebar';
	import { user } from '$lib/client';
	import { isActive } from '$lib/client/isSupporterActive';
	import { _, locale } from 'svelte-i18n';
	import { Button } from '$lib/components/ui/button/index.js';
	import { slide } from 'svelte/transition';
	import ChevronDown from 'svelte-radix/ChevronDown.svelte';

	import {
		LayoutList,
		Ticket,
		Calendar,
		Users,
		Download,
		MessageCircle,
		BookOpen,
		ShoppingBag,
		MoreHorizontal,
		Heart,
		List,
		Gamepad2,
		Award,
		Shuffle,
		GitCompare
	} from 'lucide-svelte';

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
		icon: any;
		route?: string;
		routes?: { route: string; name: string; icon?: any }[];
	};

	$: navGroups = [
		{
			name: 'List',
			icon: LayoutList,
			routes: [
				{ route: '/list/dl', name: 'Classic', icon: List },
				{ route: '/list/pl', name: 'Platformer', icon: Gamepad2 },
				{ route: '/list/fl', name: 'Featured', icon: Award },
				{ route: '/list/cl', name: 'Challenge', icon: Shuffle }
			]
		},
		{ route: '/battlepass', name: 'Pass', icon: Ticket },
		{ route: '/events', name: $locale === 'en' ? 'Event' : 'Sự kiện', icon: Calendar },
		{
			name: $locale === 'en' ? 'Community' : 'Cộng đồng',
			icon: Users,
			routes: [
				{
					route: '/community',
					name: $locale === 'en' ? 'Community Hub' : 'Cộng đồng',
					icon: MessageCircle
				},
				{
					route: '/players',
					name: $locale === 'en' ? 'Players' : 'Người chơi',
					icon: Users
				},
				{
					route: '/clans',
					name: $locale === 'en' ? 'Clans' : 'Hội',
					icon: Users
				}
			]
		},
		{
			route: 'https://github.com/NamPE286/DemonListVN-geode-mod/releases',
			name: 'Mod',
			icon: Download
		},
		{ route: '/discord', name: 'Discord', icon: MessageCircle },
		{ route: '/wiki', name: 'Wiki', icon: BookOpen },
		{ route: '/store', name: $locale === 'en' ? 'Store' : 'Cửa hàng', icon: ShoppingBag },
		{
			name: $locale === 'en' ? 'Misc' : 'Khác',
			icon: MoreHorizontal,
			routes: [
				{
					route: '/misc/compare',
					name: $locale === 'en' ? 'Player comparison' : 'So sánh người chơi',
					icon: GitCompare
				},
				{
					route: '/misc/roulette',
					name: 'Roulette',
					icon: Shuffle
				},
				{
					route: '/misc/roulette-v2',
					name: 'Roulette v2',
					icon: Shuffle
				}
			]
		}
	] as NavGroup[];

	function handleLinkClick() {
		closeSidebar();
	}

	// Auto-expand active groups on mount
	$: {
		for (const group of navGroups) {
			if (group.routes && isGroupActive(group) && expandedGroups[group.name] === undefined) {
				expandedGroups[group.name] = true;
			}
		}
	}
</script>

<!-- Mobile backdrop -->
{#if $sidebarOpen}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div class="sidebar-backdrop" on:click={closeSidebar} />
{/if}

<aside class="sidebar" class:open={$sidebarOpen}>
	<nav class="sidebar-nav">
		{#each navGroups as group}
			{#if group.routes}
				<!-- Expandable group -->
				<div class="nav-group">
					<button
						class="nav-item nav-group-trigger"
						class:active={isGroupActive(group)}
						on:click={() => toggleGroup(group.name)}
					>
						<svelte:component this={group.icon} size={18} />
						<span>{group.name}</span>
						<span class="chevron" class:expanded={expandedGroups[group.name]}>
							<ChevronDown size={14} />
						</span>
					</button>
					{#if expandedGroups[group.name]}
						<div class="nav-subitems" transition:slide={{ duration: 150 }}>
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
		{/each}

		<div class="nav-separator" />

		<!-- Supporter link -->
		{#if $user.loggedIn && isActive($user.data.supporterUntil)}
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
	</nav>
</aside>

<style lang="scss">
	.sidebar-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 40;
		display: none;

		@media screen and (max-width: 1024px) {
			display: block;
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
		transition: transform 0.2s ease;

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
			z-index: 50;
			top: 0;
			padding-top: 56px;

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
		transition: background-color 0.1s, color 0.1s;
		white-space: nowrap;

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

	.nav-group-trigger {
		.chevron {
			margin-left: auto;
			display: flex;
			align-items: center;
			transition: transform 0.2s;

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
