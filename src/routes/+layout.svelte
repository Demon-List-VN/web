<script lang="ts">
	import type { LayoutData } from './$types';
	import '../app.pcss';
	import '../app.scss';
	import 'non.geist';
	import { resolveLocale, setAppLocale } from '../i18n';

	import { ModeWatcher, setMode } from 'mode-watcher';

	import { Toaster } from '$lib/components/ui/sonner';
	import { LoadingBar } from 'svelte-loading-bar';

	import Search from '$lib/components/search.svelte';

	import supabase from '$lib/client/supabase';
	import { user } from '$lib/client';
	import { onMount } from 'svelte';
	import { isActive } from '$lib/client/isSupporterActive';
	import { customListBranding } from '$lib/client/customListBranding';
	import { page } from '$app/stores';
	import { locale } from 'svelte-i18n';
	import { derived, writable } from 'svelte/store';
	import { closeSidebar } from '$lib/client/sidebar';
	import OnboardingModal from '$lib/components/OnboardingModal.svelte';
	import NavigationChrome from '$lib/components/layout/NavigationChrome.svelte';

	export let data: LayoutData;

	$: setAppLocale(data.initialLocale);

	$: showOnboarding =
		$user.checked &&
		$user.loggedIn &&
		$user.data &&
		$user.data.onboarding_done === false &&
		($user.data.onboarding_step == null || $user.data.onboarding_step === 1);

	let searchQuery = '';
	let searchToggled = false;
	let hideNav = false;
	let removePad = false;
	let pathname = '';
	let currentCustomLogoUrl = '';
	const defaultNavLogoSrc = '/logo.png';
	const defaultFaviconHref = '/favicon.png';
	const customLogoFailed = writable(false);

	function normalizeThemeAssetUrl(value: unknown) {
		return typeof value === 'string' ? value.trim() : '';
	}

	const activeCustomListBranding = derived([page, customListBranding], ([$page, $branding]) => ({
		faviconUrl: normalizeThemeAssetUrl($branding?.faviconUrl ?? $page.data?.list?.faviconUrl),
		logoUrl: normalizeThemeAssetUrl($branding?.logoUrl ?? $page.data?.list?.logoUrl),
		title: normalizeThemeAssetUrl($branding?.title ?? $page.data?.list?.title)
	}));
	const customListFaviconUrl = derived(activeCustomListBranding, ($branding) =>
		normalizeThemeAssetUrl($branding.faviconUrl)
	);
	const customListLogoUrl = derived(activeCustomListBranding, ($branding) =>
		normalizeThemeAssetUrl($branding.logoUrl)
	);
	const customListTitle = derived(activeCustomListBranding, ($branding) =>
		normalizeThemeAssetUrl($branding.title)
	);
	const useCustomListLogo = derived(
		[customListLogoUrl, customLogoFailed],
		([$customListLogoUrl, $customLogoFailed]) => Boolean($customListLogoUrl && !$customLogoFailed)
	);
	const navLogoSrc = derived(
		[customListLogoUrl, useCustomListLogo],
		([$customListLogoUrl, $useCustomListLogo]) =>
			$useCustomListLogo ? $customListLogoUrl : defaultNavLogoSrc
	);
	const faviconHref = derived(
		[customListFaviconUrl, customListLogoUrl, useCustomListLogo],
		([$customListFaviconUrl, $customListLogoUrl, $useCustomListLogo]) =>
			$customListFaviconUrl || ($useCustomListLogo ? $customListLogoUrl : defaultFaviconHref)
	);
	const navLogoAlt = derived(
		[customListTitle, useCustomListLogo],
		([$customListTitle, $useCustomListLogo]) =>
			$useCustomListLogo && $customListTitle ? `${$customListTitle} logo` : 'logo'
	);

	$: if ($customListLogoUrl !== currentCustomLogoUrl) {
		currentCustomLogoUrl = $customListLogoUrl;
		customLogoFailed.set(false);
	}

	$: pathname = $page.url.pathname;

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

	function persistLocale(value: string) {
		localStorage.setItem('locale', value);
		document.cookie = `locale=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
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
		const initialLocale = resolveLocale(data.initialLocale);
		const unsubscribeLocale = locale.subscribe((value) => {
			if (value) {
				persistLocale(resolveLocale(value));
			}
		});

		setAppLocale(initialLocale);
		persistLocale(initialLocale);

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

		const urlParams = new URLSearchParams(window.location.search);
		hideNav = urlParams.has('hideNav');
		removePad = urlParams.has('removePad');

		enableAds();

		return () => {
			unsubscribeLocale();
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={$faviconHref} />
</svelte:head>

<ModeWatcher defaultMode="system" />
<Toaster position="top-center" />
<OnboardingModal bind:open={showOnboarding} />
<Search bind:open={searchToggled} bind:value={searchQuery} />
<LoadingBar
	--loading-bar-background-color="rgb(0 100 160 / 80%)"
	--loading-bar-train-background-color="rgb(0 100 220 / 90%)"
/>

{#if !hideNav}
	<NavigationChrome
		bind:searchToggled
		navLogoSrc={$navLogoSrc}
		navLogoAlt={$navLogoAlt}
		useCustomListLogo={$useCustomListLogo}
		onCustomLogoError={() => customLogoFailed.set(true)}
		{signIn}
		{signOut}
	/>
{/if}

<!-- Main content wrapper -->
<div class="layout-container" class:has-sidebar={!hideNav} class:no-pad={removePad}>
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
