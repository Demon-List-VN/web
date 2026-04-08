<script lang="ts">
	import type { ComponentType } from 'svelte';
	import '../app.pcss';
	import '../app.scss';
	import 'non.geist';
	import '../i18n';

	import { ModeWatcher, setMode } from 'mode-watcher';

	import HamburgerMenu from 'svelte-radix/HamburgerMenu.svelte';
	import MagnifyingGlass from 'svelte-radix/MagnifyingGlass.svelte';
	import X from 'svelte-radix/Cross2.svelte';
	import { PanelLeftClose, PanelLeftOpen } from 'lucide-svelte';

	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { Toaster } from '$lib/components/ui/sonner';
	import { LoadingBar } from 'svelte-loading-bar';

	import Search from '$lib/components/search.svelte';
	import SettingButton from '$lib/components/settingButton.svelte';
	import Sidebar from '$lib/components/sidebar.svelte';

	import supabase from '$lib/client/supabase';
	import { user } from '$lib/client';
	import { mediaQuery } from 'svelte-legos';
	import NotificationButton from '$lib/components/notificationButton.svelte';
	import { onMount } from 'svelte';
	import { isActive } from '$lib/client/isSupporterActive';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { page } from '$app/stores';
	import { _, locale } from 'svelte-i18n';
	import UserPopover from '$lib/components/userPopover.svelte';
	import {
		sidebarOpen,
		sidebarCollapsed,
		toggleSidebar,
		closeSidebar,
		toggleSidebarCollapsed
	} from '$lib/client/sidebar';
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
		List,
		Gamepad2,
		Award,
		Shuffle,
		GitCompare,
		CreditCard,
		Bug
	} from 'lucide-svelte';
	import OnboardingModal from '$lib/components/OnboardingModal.svelte';

	$: showOnboarding =
		$user.checked &&
		$user.loggedIn &&
		$user.data &&
		$user.data.onboarding_done === false &&
		($user.data.onboarding_step == null || $user.data.onboarding_step === 1);

	type NavGroup = {
		name: string;
		icon: ComponentType;
		route?: string;
		routes?: { route: string; name: string; icon?: ComponentType }[];
	};
	$: listUidQuery = $user.loggedIn ? `?uid=${$user.data.uid}` : '';

	$: linkGroup = [
		{
			name: 'List',
			icon: LayoutList,
			routes: [
				{ route: `/list/dl${listUidQuery}`, name: 'Classic', icon: List },
				{ route: `/list/pl${listUidQuery}`, name: 'Platformer', icon: Gamepad2 },
				{ route: `/list/fl${listUidQuery}`, name: 'Featured', icon: Award },
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
				{ route: '/players', name: $locale === 'en' ? 'Players' : 'Người chơi', icon: Users },
				{ route: '/clans', name: $locale === 'en' ? 'Clans' : 'Hội', icon: Users }
			]
		},
		{
			route: 'https://github.com/NamPE286/DemonListVN-geode-mod/releases',
			name: $locale === 'en' ? 'Mod' : 'Mod',
			icon: Download
		},
		{ route: '/discord', name: 'Discord', icon: MessageCircle },
		{ route: '/wiki', name: 'Wiki', icon: BookOpen },
		{ route: '/store', name: $locale === 'en' ? 'Store' : 'Cửa hàng', icon: ShoppingBag },
		{ route: '/vending', name: $locale === 'en' ? 'Card Maker' : 'Máy Tạo Thẻ', icon: CreditCard },
		{ route: 'https://docs.google.com/forms/d/e/1FAIpQLSdF4pJFdwbrFKQPLU0PPPX-bkrPJpMTSnlJ6XWNbSCpSOUqpQ/viewform?usp=dialog', name: $locale === 'en' ? 'Bug Report' : 'Báo lỗi', icon: Bug },
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

	let searchQuery = '';
	let searchToggled = false;
	let isVisible = false;
	let hideNav = false;
	let removePad = false;
	let pathname = '';
	let supporterAlertDismissed = false;
	
	onMount(() => {
		supporterAlertDismissed = localStorage.getItem('supporterAlertDismissed') === 'true';
	});
	$: pathname = $page.url.pathname;

	const isDesktop = mediaQuery('(min-width: 1025px)');

	function signIn() {
		supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				queryParams: {
					access_type: 'offline',
					prompt: 'consent'
				},
				redirectTo: window.location.origin
			}
		});
	}

	async function signOut() {
		await supabase.auth.signOut();
		window.location.reload();
	}

	function setTheme(theme: string) {
		document.documentElement.setAttribute('data-theme', theme);
		localStorage.setItem('theme', theme);
	}

	// Close sidebar on route change (mobile)
	$: if (pathname) {
		closeSidebar();
	}
  
	function enableAds() {
		let adsScriptLoaded = false;

		user.subscribe((u) => {
			const enabled = u.checked && (!u.loggedIn || !isActive(u.data.supporterUntil));

			if (!adsScriptLoaded && enabled) {
				adsScriptLoaded = true;
				const s = document.createElement('script');
				s.async = true;
				s.src =
					'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4605218533506777';
				s.crossOrigin = 'anonymous';
				document.head.appendChild(s);
			}
		});
  }

	onMount(() => {
		const savedLocale = localStorage.getItem('locale');

		locale.set(savedLocale || 'vi');
		locale.subscribe((value) => {
			if (value) {
				localStorage.setItem('locale', value);
			}
		});

		const currentTheme =
			localStorage.getItem('theme') || document.documentElement.getAttribute('data-theme');

		if (!currentTheme) {
			setMode('dark');
			setTheme('dark');
		} else if (currentTheme !== 'light' && currentTheme !== 'dark') {
			user.subscribe((u) => {
				if (u.checked && (!u.loggedIn || !isActive(u.data.supporterUntil))) {
					setMode('dark');
					setTheme('dark');
				} else {
					setTheme(currentTheme);
				}
			});
		} else {
			setTheme(currentTheme);
		}

		isVisible = true;

		const urlParams = new URLSearchParams(window.location.search);
		hideNav = urlParams.has('hideNav');
		removePad = urlParams.has('removePad');

		enableAds();
	});

	function dismissSupporterAlert() {
		supporterAlertDismissed = true;
		localStorage.setItem('supporterAlertDismissed', 'true');
	}
</script>

<ModeWatcher defaultMode="system" />
<Toaster position="top-center" />
<OnboardingModal bind:open={showOnboarding} />
<Search bind:open={searchToggled} bind:value={searchQuery} />
<LoadingBar
	--loading-bar-background-color="rgb(0 100 160 / 80%)"
	--loading-bar-train-background-color="rgb(0 100 220 / 90%)"
/>

{#if !hideNav}
	<!-- Top bar -->
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
				<img src="/logo.png" alt="logo" />
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

	<!-- Sidebar -->
	<Sidebar {linkGroup} />
{/if}

<!-- Main content wrapper -->
<div
	class="layout-container"
	class:has-sidebar={!hideNav}
	class:no-pad={removePad}
>
	<slot />

	<footer>
		<div class="footerFiller"></div>
		<p>
			© Copyright 2020-2025 gdvn.net.<br />
			All rights reserved gdvn.net and Geometry Dash Việt Nam are in no way affiliated with RobTopGamesAB
			®
		</p>
		<div class="links">
			<a href="/about">About</a>
			<a href="/privacyPolicy">Privacy Policy</a>
			<a href="/tos">Terms of service</a>
		</div>
	</footer>
</div>

<style lang="scss">
	:global(.markdown) {
		:global(h1) {
			display: block;
			font-size: 2em;
			margin-top: 0.67em;
			margin-bottom: 0.67em;
			margin-left: 0;
			margin-right: 0;
			font-weight: bold;
		}

		:global(h2) {
			display: block;
			font-size: 1.5em;
			margin-top: 0.83em;
			margin-bottom: 0.83em;
			margin-left: 0;
			margin-right: 0;
			font-weight: bold;
		}

		:global(h3) {
			display: block;
			font-size: 1.17em;
			margin-top: 1em;
			margin-bottom: 1em;
			margin-left: 0;
			margin-right: 0;
			font-weight: bold;
		}

		:global(h4) {
			display: block;
			margin-top: 1.33em;
			margin-bottom: 1.33em;
			margin-left: 0;
			margin-right: 0;
			font-weight: bold;
		}

		:global(h5) {
			display: block;
			font-size: 0.83em;
			margin-top: 1.67em;
			margin-bottom: 1.67em;
			margin-left: 0;
			margin-right: 0;
			font-weight: bold;
		}

		:global(h6) {
			display: block;
			font-size: 0.67em;
			margin-top: 2.33em;
			margin-bottom: 2.33em;
			margin-left: 0;
			margin-right: 0;
			font-weight: bold;
		}

		:global(ul) {
			list-style: initial;
			margin: initial;
			padding: 0 0 0 40px;
		}

		:global(li) {
			display: list-item;
		}

		:global(table) {
			border: solid 1px var(--textColor);
		}

		:global(th) {
			border: solid 1px var(--textColor);
			padding-inline: 10px;
		}

		:global(td) {
			border: solid 1px var(--textColor);
			padding-inline: 10px;
		}
	}

	/* Top bar */
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
		transition: background-color 0.1s, color 0.1s;

		&:hover {
			background-color: hsl(var(--accent));
			color: var(--textColor1);
		}

		/* Show only on mobile */
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
		transition: background-color 0.1s, color 0.1s;

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
			margin-bottom: 12px;
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
		transition: background-color 0.1s, color 0.1s;

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

	/* Layout container */
	.layout-container {
		padding-top: 48px;
		min-height: 100vh;
		box-sizing: border-box;

		&.has-sidebar {
			@media screen and (min-width: 1025px) {
				margin-left: 72px;
			}
		}

		&.no-pad {
			padding-top: 0;
		}
	}

	/* Footer */
	footer {
		height: fit-content;
		padding-top: 20px;
		margin-bottom: -80px;
		color: var(--textColor2);
		background-color: var(--background);

		.footerFiller {
			height: 100px;
			border-bottom: 1px solid var(--border1);
			margin-bottom: 20px;
		}
		.links {
			display: flex;
			justify-content: center;
			gap: 10px;

			a {
				text-decoration: underline;
			}
		}

		p {
			text-align: center;
		}
	}
</style>
