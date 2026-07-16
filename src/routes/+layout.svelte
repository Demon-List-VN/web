<script lang="ts">
	import type { LayoutData } from './$types';
	import '../app.pcss';
	import '../app.scss';
	import { resolveLocale, setAppLocale } from '../i18n';

	import { ModeWatcher, setMode } from 'mode-watcher';

	import { Toaster } from '$lib/components/ui/sonner';
	import { LoadingBar } from 'svelte-loading-bar';
	import { toast } from 'svelte-sonner';

	import Search from '$lib/components/search.svelte';

	import supabase from '$lib/client/supabase';
	import { user } from '$lib/client';
	import { onMount, tick } from 'svelte';
	import { isActive } from '$lib/client/isSupporterActive';
	import { customListBranding } from '$lib/client/customListBranding';
	import { page } from '$app/stores';
	import { locale } from 'svelte-i18n';
	import { derived, writable } from 'svelte/store';
	import { closeSidebar } from '$lib/client/sidebar';
	import OnboardingModal from '$lib/components/OnboardingModal.svelte';
	import NavigationChrome from '$lib/components/layout/NavigationChrome.svelte';
	import {
		ownSocialPresenceUid,
		socialPresenceVisible
	} from '$lib/client/socialPresence';

	export let data: LayoutData;

	$: setAppLocale(data.initialLocale);

	$: showOnboarding = $user.checked
		&& $user.loggedIn
		&& $user.data
		&& $user.data.onboarding_done === false
		&& ($user.data.onboarding_step == null || $user.data.onboarding_step === 1);

	let searchQuery = '';
	let searchToggled = false;
	let hideNav = false;
	let removePad = false;
	let pathname = '';
	let isSupporterOverlay = false;
	let isPvpMatchOverlay = false;
	let isTournamentMatchOverlay = false;
	let currentCustomLogoUrl = '';
	let passwordSignInOpen = false;
	let passwordSignInEmail = '';
	let passwordSignInPassword = '';
	let passwordSignInLoading = false;
	let passwordInput: HTMLInputElement;
	const defaultNavLogoSrc = '/logo.png';
	const defaultFaviconHref = '/favicon.png';
	const customLogoFailed = writable(false);
	const localPasswordSignInEmailKey = 'localPasswordSignIn.email';

	function normalizeThemeAssetUrl(value: unknown) {
		return typeof value === 'string' ? value.trim() : '';
	}

	const activeCustomListBranding = derived(
		[page, customListBranding],
		([$page, $branding]) => ({
			faviconUrl: normalizeThemeAssetUrl(
				$branding?.faviconUrl ?? $page.data?.list?.faviconUrl
			),
			logoUrl: normalizeThemeAssetUrl(
				$branding?.logoUrl ?? $page.data?.list?.logoUrl
			),
			title: normalizeThemeAssetUrl(
				$branding?.title ?? $page.data?.list?.title
			)
		})
	);
	const customListFaviconUrl = derived(
		activeCustomListBranding,
		($branding) => normalizeThemeAssetUrl($branding.faviconUrl)
	);
	const customListLogoUrl = derived(
		activeCustomListBranding,
		($branding) => normalizeThemeAssetUrl($branding.logoUrl)
	);
	const customListTitle = derived(
		activeCustomListBranding,
		($branding) => normalizeThemeAssetUrl($branding.title)
	);
	const useCustomListLogo = derived(
		[customListLogoUrl, customLogoFailed],
		([$customListLogoUrl, $customLogoFailed]) =>
			Boolean($customListLogoUrl && !$customLogoFailed)
	);
	const navLogoSrc = derived(
		[customListLogoUrl, useCustomListLogo],
		([$customListLogoUrl, $useCustomListLogo]) =>
			$useCustomListLogo ? $customListLogoUrl : defaultNavLogoSrc
	);
	const faviconHref = derived(
		[customListFaviconUrl, customListLogoUrl, useCustomListLogo],
		([$customListFaviconUrl, $customListLogoUrl, $useCustomListLogo]) =>
			$customListFaviconUrl
				|| ($useCustomListLogo ? $customListLogoUrl : defaultFaviconHref)
	);
	const navLogoAlt = derived(
		[customListTitle, useCustomListLogo],
		([$customListTitle, $useCustomListLogo]) =>
			$useCustomListLogo && $customListTitle
				? `${$customListTitle} logo`
				: 'logo'
	);

	$: if ($customListLogoUrl !== currentCustomLogoUrl) {
		currentCustomLogoUrl = $customListLogoUrl;
		customLogoFailed.set(false);
	}

	$: pathname = $page.url.pathname;
	$: isSupporterOverlay = $page.route.id === '/supporter/overlay';
	$: isPvpMatchOverlay = $page.route.id === '/versus/matches/[id]'
		&& $page.url.searchParams.has('overlay');
	$: isTournamentMatchOverlay = $page.route.id
		=== '/tournament/[id]/matches/[matchId]/overlay';
	$: ownSocialPresenceUid.set($user.loggedIn ? ($user.data?.uid ?? '') : '');
	$: socialPresenceVisible.set(
		$user.loggedIn ? $user.data?.socialPresenceVisible !== false : false
	);

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

	function isLocalhost() {
		return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
	}

	async function openPasswordSignInPrompt() {
		if (!isLocalhost() || passwordSignInOpen) {
			return;
		}

		passwordSignInEmail = localStorage.getItem(localPasswordSignInEmailKey)
			|| passwordSignInEmail;
		passwordSignInPassword = '';
		passwordSignInOpen = true;
		await tick();
		passwordInput?.focus();
	}

	function closePasswordSignInPrompt() {
		if (passwordSignInLoading) {
			return;
		}

		passwordSignInOpen = false;
		passwordSignInPassword = '';
	}

	async function signInWithPassword() {
		const email = passwordSignInEmail.trim();

		if (!email || !passwordSignInPassword) {
			toast.error('Email and password are required.');

			return;
		}

		passwordSignInLoading = true;

		try {
			const { error } = await supabase.auth.signInWithPassword({
				email,
				password: passwordSignInPassword
			});

			if (error) {
				throw error;
			}

			localStorage.setItem(localPasswordSignInEmailKey, email);
			passwordSignInOpen = false;
			passwordSignInPassword = '';
			window.location.reload();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'Failed to sign in.'
			);
		} finally {
			passwordSignInLoading = false;
		}
	}

	function handleLocalPasswordShortcut(event: KeyboardEvent) {
		const isSlashKey = event.code === 'Slash' || event.key === '/'
			|| event.key === '?';

		if (event.ctrlKey && event.shiftKey && event.altKey && isSlashKey) {
			event.preventDefault();
			openPasswordSignInPrompt();
		}
	}

	function handlePasswordSignInKeydown(event: KeyboardEvent) {
		if (passwordSignInOpen && event.key === 'Escape') {
			closePasswordSignInPrompt();
		}
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
			const enabled = u.checked
				&& (!u.loggedIn || !isActive(u.data?.supporterUntil));

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

		const currentTheme = localStorage.getItem('theme')
			|| document.documentElement.getAttribute('data-theme');

		if (!currentTheme) {
			setMode('dark');
			setTheme('dark');
		} else if (currentTheme !== 'light' && currentTheme !== 'dark') {
			user.subscribe((u) => {
				if (
					u.checked && (!u.loggedIn || !isActive(u.data?.supporterUntil))
				) {
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

		if (isLocalhost()) {
			document.addEventListener('keydown', handleLocalPasswordShortcut);
		}

		return () => {
			unsubscribeLocale();
			document.removeEventListener('keydown', handleLocalPasswordShortcut);
		};
	});
</script>

<svelte:window on:keydown={handlePasswordSignInKeydown} />

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

{#if passwordSignInOpen}
  <div class="passwordSignInLayer">
    <button
      type="button"
      class="passwordSignInBackdrop"
      aria-label="Close password sign in"
      on:click={closePasswordSignInPrompt}
    >
    </button>
    <form
      class="passwordSignInDialog"
      on:submit|preventDefault={signInWithPassword}
    >
      <h2>Password sign in</h2>
      <label>
        <span>Email</span>
        <input
          type="email"
          autocomplete="username"
          bind:value={passwordSignInEmail}
          disabled={passwordSignInLoading}
        />
      </label>
      <label>
        <span>Password</span>
        <input
          bind:this={passwordInput}
          type="password"
          autocomplete="current-password"
          bind:value={passwordSignInPassword}
          disabled={passwordSignInLoading}
        />
      </label>
      <div class="passwordSignInActions">
        <button
          type="button"
          on:click={closePasswordSignInPrompt}
          disabled={passwordSignInLoading}
        >
          Cancel
        </button>
        <button type="submit" disabled={passwordSignInLoading}>
          {passwordSignInLoading ? 'Signing in...' : 'Sign in'}
        </button>
      </div>
    </form>
  </div>
{/if}

{#if !hideNav && !isSupporterOverlay && !isPvpMatchOverlay && !isTournamentMatchOverlay}
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
<div
  class="layout-container"
  class:has-sidebar={!hideNav && !isSupporterOverlay && !isPvpMatchOverlay && !isTournamentMatchOverlay}
  class:no-pad={removePad || isSupporterOverlay || isPvpMatchOverlay || isTournamentMatchOverlay}
  class:transparent={isPvpMatchOverlay || isTournamentMatchOverlay}
>
  <slot />

  {#if !isSupporterOverlay && !isPvpMatchOverlay && !isTournamentMatchOverlay}
    <footer>
    <div class="footerFiller"></div>
    <p>
      © Copyright 2020-2025 gdvn.net.<br />
      All rights reserved gdvn.net and Geometry Dash Việt Nam are in no way
      affiliated with RobTopGamesAB ®
    </p>
    <div class="links">
      <a href="/about">About</a>
      <a href="/privacyPolicy">Privacy Policy</a>
      <a href="/tos">Terms of service</a>
    </div>
    </footer>
  {/if}
</div>

<style lang="scss">
.passwordSignInLayer {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 20px;
}

.passwordSignInBackdrop {
  position: absolute;
  inset: 0;
  border: 0;
  padding: 0;
  background: rgb(0 0 0 / 55%);
}

.passwordSignInDialog {
  position: relative;
  width: min(100%, 360px);
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 8px;
  background: var(--background, #111);
  color: var(--foreground, #fff);
  box-shadow: 0 18px 60px rgb(0 0 0 / 45%);

  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 650;
  }

  label {
    display: grid;
    gap: 6px;
    font-size: 13px;
  }

  input {
    width: 100%;
    border: 1px solid rgb(255 255 255 / 16%);
    border-radius: 6px;
    padding: 9px 10px;
    background: rgb(255 255 255 / 7%);
    color: inherit;
    font: inherit;
  }
}

.passwordSignInActions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;

  button {
    border: 1px solid rgb(255 255 255 / 16%);
    border-radius: 6px;
    padding: 8px 12px;
    background: rgb(255 255 255 / 8%);
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  button[type="submit"] {
    background: rgb(0 100 220 / 90%);
  }

  button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
}

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
    list-style: disc;
    margin: initial;
    padding: 0 0 0 40px;
  }

  :global(ol) {
    list-style: decimal;
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

.layout-container.transparent {
  background: transparent;
}

:global(html:has(.match-page.overlay-mode)),
:global(body:has(.match-page.overlay-mode)),
:global(html:has(.tournament-match-overlay)),
:global(body:has(.tournament-match-overlay)) {
  background: transparent;
}

/* Layout container */
.layout-container {
  padding-top: 56px;
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
