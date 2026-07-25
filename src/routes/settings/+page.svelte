<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { user } from '$lib/client';
	import { DISCORD_OAUTH_URL } from '$lib/client/discord';
	import { isActive } from '$lib/client/isSupporterActive';
	import supabase from '$lib/client/supabase';
	import { setMode } from 'mode-watcher';
	import { toast } from 'svelte-sonner';
	import { _, locale } from 'svelte-i18n';
	import {
		AlertTriangle,
		Check,
		ChevronRight,
		Cloud,
		ExternalLink,
		KeyRound,
		Link2,
		LoaderCircle,
		Moon,
		RefreshCw,
		ShieldCheck,
		Sun,
		Trash,
		UserRound,
		WalletCards
	} from 'lucide-svelte';

	type SettingsTab = 'general' | 'auth' | 'subscriptions' | 'connections' | 'sync';
	type SyncResult = {
		synced: number;
		created: number;
		updated: number;
	};

	const settingsTabs: SettingsTab[] = [
		'general',
		'auth',
		'subscriptions',
		'connections',
		'sync'
	];
	const colorThemes = [
		{ id: 'red', color: '#ef4444' },
		{ id: 'green', color: '#22c55e' },
		{ id: 'blue', color: '#3b82f6' },
		{ id: 'pink', color: '#ec4899' },
		{ id: 'gold', color: '#eab308' }
	];

	let APIKeys: any[] = [];
	let apiKeysLoadedForUid = '';
	let loadingAPIKeys = false;
	let loggingOutAll = false;
	let pointercrateToken = '';
	let linkingPointercrate = false;
	let linkedAccountId: number | null = null;
	let gdStatusLoadedForUid = '';
	let loadingGDStatus = false;
	let gdUsername = '';
	let gdPassword = '';
	let linkingGeometryDash = false;
	let showRelinkForm = false;
	let syncingLevels = false;
	let lastSyncResult: SyncResult | null = null;

	$: requestedTab = $page.url.searchParams.get('tab') as SettingsTab | null;
	$: activeTab = requestedTab && settingsTabs.includes(requestedTab)
		? requestedTab
		: 'general';
	$: navigation = [
		{
			id: 'general' as const,
			label: text('General', 'Chung'),
			description: text('Appearance and language', 'Giao diện và ngôn ngữ'),
			icon: UserRound
		},
		{
			id: 'auth' as const,
			label: text('Authentication', 'Xác thực'),
			description: text('Sessions and API keys', 'Phiên và khoá API'),
			icon: KeyRound
		},
		{
			id: 'subscriptions' as const,
			label: text('Subscriptions', 'Gói đăng ký'),
			description: text('Supporter access', 'Quyền Supporter'),
			icon: WalletCards
		},
		{
			id: 'connections' as const,
			label: text('Connections', 'Kết nối'),
			description: text('Discord and Pointercrate', 'Discord và Pointercrate'),
			icon: Link2
		},
		{
			id: 'sync' as const,
			label: text('Sync', 'Đồng bộ'),
			description: text('Geometry Dash data', 'Dữ liệu Geometry Dash'),
			icon: Cloud
		}
	];
	$: if (
		$user.checked
		&& $user.loggedIn
		&& $user.data?.uid
		&& apiKeysLoadedForUid !== $user.data.uid
		&& !loadingAPIKeys
	) {
		void fetchAPIKeys($user.data.uid);
	}
	$: if (
		$user.checked
		&& $user.loggedIn
		&& $user.data?.uid
		&& gdStatusLoadedForUid !== $user.data.uid
		&& !loadingGDStatus
	) {
		void fetchGeometryDashStatus($user.data.uid);
	}

	function text(en: string, vi: string) {
		return $locale === 'vi' ? vi : en;
	}

	async function getToken() {
		const token = await $user.token();

		if (!token) {
			throw new Error(text('Please sign in first.', 'Vui lòng đăng nhập trước.'));
		}

		return token;
	}

	async function responseError(response: Response, fallback: string) {
		const body = await response.json()
			.catch(() => null);

		return typeof body?.error === 'string' ? body.error : fallback;
	}

	async function signIn() {
		await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				queryParams: {
					access_type: 'offline',
					prompt: 'consent'
				},
				redirectTo: window.location.href
			}
		});
	}

	async function fetchAPIKeys(uid: string) {
		loadingAPIKeys = true;

		try {
			const response = await fetch(`${import.meta.env.VITE_API_URL}/APIKey`, {
				headers: {
					Authorization: `Bearer ${await getToken()}`
				}
			});

			if (!response.ok) {
				throw new Error('Failed to load API keys');
			}

			APIKeys = await response.json();
			apiKeysLoadedForUid = uid;
		} catch {
			APIKeys = [];
		} finally {
			apiKeysLoadedForUid = uid;
			loadingAPIKeys = false;
		}
	}

	async function copyToClipboard(value: string) {
		await navigator.clipboard.writeText(value);
		toast.success(text('API key copied.', 'Đã sao chép khoá API.'));
	}

	async function createNewKey() {
		const response = await fetch(`${import.meta.env.VITE_API_URL}/APIKey`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${await getToken()}`
			},
			body: JSON.stringify({ flag: 'manual' })
		});

		if (response.status === 409) {
			toast.error(
				await responseError(response, $_('settings.api.create.limit'))
			);

			return;
		}

		if (!response.ok) {
			toast.error($_('settings.api.create.error'));

			return;
		}

		toast.success(text('Created a new API key.', 'Đã tạo khoá API mới.'));
		await fetchAPIKeys($user.data.uid);
	}

	async function deleteKey(key: string) {
		const response = await fetch(
			`${import.meta.env.VITE_API_URL}/APIKey/${encodeURIComponent(key)}`,
			{
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${await getToken()}`
				}
			}
		);

		if (!response.ok) {
			toast.error(text('Failed to delete API key.', 'Không thể xoá khoá API.'));

			return;
		}

		toast.success(text('API key deleted.', 'Đã xoá khoá API.'));
		await fetchAPIKeys($user.data.uid);
	}

	async function linkPointercrate() {
		if (!pointercrateToken.trim() || linkingPointercrate) {
			return;
		}

		linkingPointercrate = true;

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/auth/link/pointercrate`,
				{
					method: 'PATCH',
					body: JSON.stringify({ token: pointercrateToken.trim() }),
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${await getToken()}`
					}
				}
			);

			if (!response.ok) {
				throw new Error($_('pointercrate_link.error'));
			}

			pointercrateToken = '';
			toast.success($_('pointercrate_link.success'));
			await $user.refresh();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : $_('pointercrate_link.error')
			);
		} finally {
			linkingPointercrate = false;
		}
	}

	async function syncDiscordRole() {
		try {
			await $user.syncRole();
			toast.success($_('settings.account.sync_role_synced'));
		} catch {
			toast.error(text('Failed to sync role.', 'Không thể đồng bộ Role.'));
		}
	}

	async function logoutAllDevices() {
		if (loggingOutAll) {
			return;
		}

		loggingOutAll = true;

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/auth/logout-all`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${await getToken()}`
					}
				}
			);

			if (!response.ok) {
				throw new Error('Failed to log out all devices');
			}

			await supabase.auth.signOut();
			toast.success($_('settings.auth.logout_all.success'));
			goto('/');
		} catch {
			toast.error($_('settings.auth.logout_all.error'));
		} finally {
			loggingOutAll = false;
		}
	}

	function setTheme(theme: string) {
		setMode(theme === 'light' ? 'light' : 'dark');
		document.documentElement.setAttribute('data-theme', theme);
		localStorage.setItem('theme', theme);
	}

	function switchLanguage() {
		const newLang = $locale === 'en' ? 'vi' : 'en';
		document.cookie = `locale=${newLang}; Path=/; Max-Age=31536000; SameSite=Lax`;

		try {
			localStorage.setItem('locale', newLang);
		} catch {}

		locale.set(newLang);

		const currentPath = $page.url.pathname;
		const stripped = currentPath.replace(/^\/(en|vi)(?=\/|$)/, '') || '/';
		const target = `/${newLang}${stripped === '/' ? '' : stripped}${$page.url.search}`;
		goto(target, { invalidateAll: true });
	}

	async function fetchGeometryDashStatus(uid: string) {
		loadingGDStatus = true;

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/sync/geometry-dash`,
				{
					headers: {
						Authorization: `Bearer ${await getToken()}`
					}
				}
			);

			if (!response.ok) {
				throw new Error('Failed to load Geometry Dash link status');
			}

			const data = await response.json();
			const accountId = Number(data.accountId);
			linkedAccountId = Number.isSafeInteger(accountId) && accountId > 0
				? accountId
				: null;
			gdStatusLoadedForUid = uid;
		} catch {
			linkedAccountId = $user.data?.gdAccountId ?? null;
		} finally {
			gdStatusLoadedForUid = uid;
			loadingGDStatus = false;
		}
	}

	async function linkGeometryDash() {
		if (
			linkingGeometryDash
			|| !gdUsername.trim()
			|| !gdPassword
		) {
			return;
		}

		linkingGeometryDash = true;
		const requestBody = JSON.stringify({
			username: gdUsername.trim(),
			password: gdPassword
		});

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/sync/geometry-dash/link`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${await getToken()}`
					},
					body: requestBody
				}
			);

			if (!response.ok) {
				throw new Error(
					await responseError(
						response,
						text(
							'Could not verify the Geometry Dash account.',
							'Không thể xác minh tài khoản Geometry Dash.'
						)
					)
				);
			}

			const data = await response.json();
			linkedAccountId = data.accountId;
			showRelinkForm = false;
			lastSyncResult = null;
			user.update((current) => ({
				...current,
				data: {
					...current.data,
					gdAccountId: data.accountId
				}
			}));
			toast.success(
				text(
					'Geometry Dash account linked. Change its password now for extra security.',
					'Đã liên kết tài khoản Geometry Dash. Hãy đổi mật khẩu ngay để tăng bảo mật.'
				)
			);
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: text('Linking failed.', 'Liên kết thất bại.')
			);
		} finally {
			gdUsername = '';
			gdPassword = '';
			linkingGeometryDash = false;
		}
	}

	async function syncCreatedLevels() {
		if (!linkedAccountId || syncingLevels) {
			return;
		}

		syncingLevels = true;

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/sync/geometry-dash/levels`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${await getToken()}`
					}
				}
			);

			if (!response.ok) {
				throw new Error(
					await responseError(
						response,
						text('Level sync failed.', 'Đồng bộ màn chơi thất bại.')
					)
				);
			}

			lastSyncResult = await response.json();
			toast.success(
				text(
					`Synced ${lastSyncResult?.synced ?? 0} created levels.`,
					`Đã đồng bộ ${lastSyncResult?.synced ?? 0} màn chơi đã tạo.`
				)
			);
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: text('Level sync failed.', 'Đồng bộ màn chơi thất bại.')
			);
		} finally {
			syncingLevels = false;
		}
	}
</script>

<svelte:head>
  <title>{text('Settings', 'Cài đặt')} · GDVN</title>
  <meta
    name="description"
    content={text(
        'Manage your GDVN account, connections, and data sync.',
        'Quản lý tài khoản, kết nối và đồng bộ dữ liệu GDVN.'
    )}
  />
</svelte:head>

<div class="settings-shell">
  <header class="page-header">
    <div>
      <p class="eyebrow">GDVN</p>
      <h1>{text('Settings', 'Cài đặt')}</h1>
      <p>
        {text(
          'Manage your account, integrations, and player data.',
          'Quản lý tài khoản, kết nối và dữ liệu người chơi.'
        )}
      </p>
    </div>
    {#if $user.loggedIn}
      <a class="profile-link" href={`/player/${$user.data.uid}`}>
        <span>{text('View profile', 'Xem hồ sơ')}</span>
        <ExternalLink size={15} />
      </a>
    {/if}
  </header>

  <div class="settings-layout">
    <aside class="settings-sidebar">
      <nav aria-label={text('Settings sections', 'Các mục cài đặt')}>
        {#each navigation as item}
          <a
            href={`?tab=${item.id}`}
            class:active={activeTab === item.id}
            aria-current={activeTab === item.id ? 'page' : undefined}
          >
            <svelte:component this={item.icon} size={17} />
            <span>
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </span>
            <span class="chevron"><ChevronRight size={15} /></span>
          </a>
        {/each}
      </nav>
    </aside>

    <main class="settings-content">
      {#if activeTab === 'general'}
        <section class="section-heading">
          <h2>{text('General', 'Chung')}</h2>
          <p>
            {text(
              'Choose how GDVN looks and which language it uses on this device.',
              'Chọn giao diện và ngôn ngữ GDVN trên thiết bị này.'
            )}
          </p>
        </section>

        <section class="settings-card">
          <div class="card-row">
            <div>
              <h3>{$_('settings.general.theme.title')}</h3>
              <p>
                {text(
                  'Select a light, dark, or supporter color theme.',
                  'Chọn chủ đề sáng, tối hoặc màu dành cho Supporter.'
                )}
              </p>
            </div>
            <div class="theme-picker" aria-label={$_('settings.general.theme.title')}>
              <Button
                variant="outline"
                size="icon"
                title={$_('settings.general.theme.light')}
                on:click={() => setTheme('light')}
              >
                <Sun size={17} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                title={$_('settings.general.theme.dark')}
                on:click={() => setTheme('dark')}
              >
                <Moon size={17} />
              </Button>
              {#if $user.loggedIn && isActive($user.data.supporterUntil)}
                {#each colorThemes as theme}
                  <Button
                    variant="outline"
                    size="icon"
                    title={$_(`settings.general.theme.${theme.id}`)}
                    aria-label={$_(`settings.general.theme.${theme.id}`)}
                    on:click={() => setTheme(theme.id)}
                  >
                    <span
                      class="theme-dot"
                      style={`background-color: ${theme.color}`}
                    />
                  </Button>
                {/each}
              {/if}
            </div>
          </div>
          <div class="card-row">
            <div>
              <h3>{$_('settings.general.language.title')}</h3>
              <p>
                {text(
                  'Change the language used across the site.',
                  'Đổi ngôn ngữ được sử dụng trên toàn trang.'
                )}
              </p>
            </div>
            <Button variant="outline" on:click={switchLanguage}>
              {$locale === 'vi' ? 'Tiếng Việt' : 'English'}
            </Button>
          </div>
        </section>
      {:else if activeTab === 'auth'}
        <section class="section-heading">
          <h2>{text('Authentication', 'Xác thực')}</h2>
          <p>
            {text(
              'Manage device access and credentials used by the Geode mod.',
              'Quản lý quyền truy cập thiết bị và khoá dùng bởi Geode mod.'
            )}
          </p>
        </section>

        {#if !$user.checked}
          <div class="loading-panel">
            <span class="spin"><LoaderCircle size={22} /></span>
          </div>
        {:else if !$user.loggedIn}
          <section class="empty-card">
            <ShieldCheck size={24} />
            <h3>{text('Sign in to continue', 'Đăng nhập để tiếp tục')}</h3>
            <p>
              {text(
                'Authentication settings are available after you sign in.',
                'Cài đặt xác thực khả dụng sau khi bạn đăng nhập.'
              )}
            </p>
            <Button on:click={signIn}>{$_('nav.sign_in')}</Button>
          </section>
        {:else}
          <section class="settings-card">
            <div class="card-row">
              <div>
                <h3>{$_('settings.auth.otp.title')}</h3>
                <p>{$_('settings.auth.otp.description')}</p>
              </div>
              <Button variant="outline" on:click={() => goto('/auth/otp')}>
                {$_('settings.auth.otp.button')}
              </Button>
            </div>
            <div class="card-row">
              <div>
                <h3>{$_('settings.auth.logout_all.title')}</h3>
                <p>{$_('settings.auth.logout_all.description')}</p>
              </div>
              <AlertDialog.Root>
                <AlertDialog.Trigger asChild let:builder>
                  <Button
                    variant="destructive"
                    builders={[builder]}
                    disabled={loggingOutAll}
                  >
                    {$_('settings.auth.logout_all.button')}
                  </Button>
                </AlertDialog.Trigger>
                <AlertDialog.Content>
                  <AlertDialog.Header>
                    <AlertDialog.Title>
                      {$_('settings.auth.logout_all.confirm_title')}
                    </AlertDialog.Title>
                    <AlertDialog.Description>
                      {$_('settings.auth.logout_all.confirm_description')}
                    </AlertDialog.Description>
                  </AlertDialog.Header>
                  <AlertDialog.Footer>
                    <AlertDialog.Cancel>
                      {$_('settings.auth.logout_all.cancel')}
                    </AlertDialog.Cancel>
                    <AlertDialog.Action on:click={logoutAllDevices}>
                      {$_('settings.auth.logout_all.continue')}
                    </AlertDialog.Action>
                  </AlertDialog.Footer>
                </AlertDialog.Content>
              </AlertDialog.Root>
            </div>
          </section>

          <section class="section-heading subsection">
            <h2>{text('API keys', 'Khoá API')}</h2>
            <p>
              {text(
                'Use API keys to identify the Geode mod. Treat them like passwords.',
                'Dùng khoá API để xác thực Geode mod. Hãy bảo vệ chúng như mật khẩu.'
              )}
            </p>
          </section>

          <section class="settings-card table-card">
            <div class="table-scroll">
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>{$_('settings.api.key')}</Table.Head>
                    <Table.Head>{$_('settings.api.flag')}</Table.Head>
                    <Table.Head>{$_('settings.api.created_at')}</Table.Head>
                    <Table.Head class="text-right"></Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {#if loadingAPIKeys}
                    <Table.Row>
                      <Table.Cell colspan={4}>
                        <span class="inline-loading">
                          <span class="spin"><LoaderCircle size={16} /></span>
                          {text('Loading keys…', 'Đang tải khoá…')}
                        </span>
                      </Table.Cell>
                    </Table.Row>
                  {:else if APIKeys.length === 0}
                    <Table.Row>
                      <Table.Cell colspan={4}>
                        <span class="muted">
                          {text('No API keys yet.', 'Chưa có khoá API.')}
                        </span>
                      </Table.Cell>
                    </Table.Row>
                  {:else}
                    {#each APIKeys as key}
                      <Table.Row>
                        <Table.Cell>
                          <button
                            class="key-value"
                            on:click={() => copyToClipboard(key.key)}
                            title={text('Copy key', 'Sao chép khoá')}
                          >
                            {key.key}
                          </button>
                        </Table.Cell>
                        <Table.Cell>{key.flag ?? 'manual'}</Table.Cell>
                        <Table.Cell>
                          {new Date(key.created_at)
                            .toLocaleString($locale ?? 'en')}
                        </Table.Cell>
                        <Table.Cell class="text-right">
                          <AlertDialog.Root>
                            <AlertDialog.Trigger asChild let:builder>
                              <Button
                                variant="ghost"
                                size="icon"
                                builders={[builder]}
                                aria-label={text('Delete key', 'Xoá khoá')}
                              >
                                <Trash size={16} />
                              </Button>
                            </AlertDialog.Trigger>
                            <AlertDialog.Content>
                              <AlertDialog.Header>
                                <AlertDialog.Title>
                                  {$_('settings.api.delete.title')}
                                </AlertDialog.Title>
                                <AlertDialog.Description>
                                  {$_('settings.api.delete.description')}
                                </AlertDialog.Description>
                              </AlertDialog.Header>
                              <AlertDialog.Footer>
                                <AlertDialog.Cancel>
                                  {$_('settings.api.delete.cancel')}
                                </AlertDialog.Cancel>
                                <AlertDialog.Action on:click={() => deleteKey(key.key)}>
                                  {$_('settings.api.delete.continue')}
                                </AlertDialog.Action>
                              </AlertDialog.Footer>
                            </AlertDialog.Content>
                          </AlertDialog.Root>
                        </Table.Cell>
                      </Table.Row>
                    {/each}
                  {/if}
                </Table.Body>
              </Table.Root>
            </div>
            <div class="card-footer">
              <AlertDialog.Root>
                <AlertDialog.Trigger asChild let:builder>
                  <Button variant="outline" builders={[builder]}>
                    {$_('settings.api.create.button')}
                  </Button>
                </AlertDialog.Trigger>
                <AlertDialog.Content>
                  <AlertDialog.Header>
                    <AlertDialog.Title>
                      {$_('settings.api.create.title')}
                    </AlertDialog.Title>
                    <AlertDialog.Description>
                      {$_('settings.api.create.description')}
                    </AlertDialog.Description>
                  </AlertDialog.Header>
                  <AlertDialog.Footer>
                    <AlertDialog.Cancel>
                      {$_('settings.api.create.cancel')}
                    </AlertDialog.Cancel>
                    <AlertDialog.Action on:click={createNewKey}>
                      {$_('settings.api.create.continue')}
                    </AlertDialog.Action>
                  </AlertDialog.Footer>
                </AlertDialog.Content>
              </AlertDialog.Root>
            </div>
          </section>
        {/if}
      {:else if activeTab === 'subscriptions'}
        <section class="section-heading">
          <h2>{text('Subscriptions', 'Gói đăng ký')}</h2>
          <p>
            {text(
              'See the benefits currently active on your account.',
              'Xem các quyền lợi đang hoạt động trên tài khoản.'
            )}
          </p>
        </section>

        {#if !$user.checked}
          <div class="loading-panel">
            <span class="spin"><LoaderCircle size={22} /></span>
          </div>
        {:else if !$user.loggedIn}
          <section class="empty-card">
            <WalletCards size={24} />
            <h3>{text('Sign in to view subscriptions', 'Đăng nhập để xem gói')}</h3>
            <Button on:click={signIn}>{$_('nav.sign_in')}</Button>
          </section>
        {:else}
          <section class="settings-card">
            <div class="card-row">
              <div>
                <h3>Supporter Role</h3>
                <p>
                  {#if $user.data.supporterUntil == null}
                    {text('Not activated', 'Chưa kích hoạt')}
                  {:else}
                    {text('Active until', 'Có hiệu lực đến')}
                    {new Date($user.data.supporterUntil)
                      .toLocaleString($locale ?? 'en')}
                  {/if}
                </p>
              </div>
              <span
                class="status-pill"
                class:success={isActive($user.data.supporterUntil)}
              >
                {isActive($user.data.supporterUntil)
                  ? text('Active', 'Đang hoạt động')
                  : text('Inactive', 'Không hoạt động')}
              </span>
            </div>
          </section>
        {/if}
      {:else if activeTab === 'connections'}
        <section class="section-heading">
          <h2>{text('Connections', 'Kết nối')}</h2>
          <p>
            {text(
              'Connect the services you use with your GDVN profile.',
              'Kết nối các dịch vụ bạn sử dụng với hồ sơ GDVN.'
            )}
          </p>
        </section>

        {#if !$user.checked}
          <div class="loading-panel">
            <span class="spin"><LoaderCircle size={22} /></span>
          </div>
        {:else if !$user.loggedIn}
          <section class="empty-card">
            <Link2 size={24} />
            <h3>{text('Sign in to manage connections', 'Đăng nhập để quản lý kết nối')}</h3>
            <Button on:click={signIn}>{$_('nav.sign_in')}</Button>
          </section>
        {:else}
          <section class="settings-card">
            <div class="card-row">
              <div class="connection-title">
                <img src="/discord.svg" alt="" />
                <div>
                  <h3>Discord</h3>
                  <p>
                    {$user.data.discord
                      ? text('Connected to your GDVN profile.', 'Đã kết nối với hồ sơ GDVN.')
                      : text('Link Discord for roles and community features.', 'Kết nối Discord để nhận role và tính năng cộng đồng.')}
                  </p>
                </div>
              </div>
              <div class="row-actions">
                {#if $user.data.discord}
                  <span class="status-pill success"><Check size={13} /> {$_('settings.account.linked')}</span>
                  <Button variant="outline" on:click={syncDiscordRole}>
                    {$_('settings.account.sync_role')}
                  </Button>
                {:else}
                  <a href={DISCORD_OAUTH_URL}>
                    <Button variant="outline">{$_('settings.account.link')}</Button>
                  </a>
                {/if}
              </div>
            </div>
            <div class="card-row pointercrate-row">
              <div>
                <h3>Pointercrate</h3>
                <p>
                  {text(
                    'Connect your Pointercrate access token.',
                    'Kết nối access token Pointercrate.'
                  )}
                </p>
              </div>
              {#if $user.data.pointercrate}
                <span class="status-pill success"><Check size={13} /> {$_('settings.account.linked')}</span>
              {:else}
                <form class="inline-form" on:submit|preventDefault={linkPointercrate}>
                  <Input
                    placeholder={$_('settings.account.pointercrate.placeholder')}
                    bind:value={pointercrateToken}
                    aria-label={$_('settings.account.pointercrate.placeholder')}
                  />
                  <Button type="submit" disabled={linkingPointercrate || !pointercrateToken.trim()}>
                    {linkingPointercrate
                      ? text('Linking…', 'Đang liên kết…')
                      : $_('settings.account.link')}
                  </Button>
                </form>
              {/if}
            </div>
          </section>
        {/if}
      {:else if activeTab === 'sync'}
        <section class="section-heading">
          <h2>{text('Geometry Dash sync', 'Đồng bộ Geometry Dash')}</h2>
          <p>
            {text(
              'Verify your Geometry Dash account and claim the levels you created.',
              'Xác minh tài khoản Geometry Dash và nhận các màn chơi bạn đã tạo.'
            )}
          </p>
        </section>

        {#if !$user.checked || loadingGDStatus}
          <div class="loading-panel">
            <span class="spin"><LoaderCircle size={22} /></span>
          </div>
        {:else if !$user.loggedIn}
          <section class="empty-card">
            <Cloud size={24} />
            <h3>{text('Sign in to sync player data', 'Đăng nhập để đồng bộ dữ liệu')}</h3>
            <p>
              {text(
                'Your Geometry Dash account is linked to your signed-in GDVN profile.',
                'Tài khoản Geometry Dash sẽ được liên kết với hồ sơ GDVN đang đăng nhập.'
              )}
            </p>
            <Button on:click={signIn}>{$_('nav.sign_in')}</Button>
          </section>
        {:else}
          <section class="settings-card">
            <div class="card-row account-status-row">
              <div>
                <h3>{text('Geometry Dash account', 'Tài khoản Geometry Dash')}</h3>
                <p>
                  {#if linkedAccountId}
                    {text('Verified account ID', 'ID tài khoản đã xác minh')}:
                    <strong>{linkedAccountId}</strong>
                  {:else}
                    {text(
                      'Link an account before syncing created levels.',
                      'Liên kết tài khoản trước khi đồng bộ màn chơi.'
                    )}
                  {/if}
                </p>
              </div>
              {#if linkedAccountId}
                <div class="row-actions">
                  <span class="status-pill success">
                    <Check size={13} />
                    {text('Linked', 'Đã liên kết')}
                  </span>
                  <Button
                    variant="outline"
                    on:click={() => (showRelinkForm = !showRelinkForm)}
                  >
                    {text('Change account', 'Đổi tài khoản')}
                  </Button>
                </div>
              {/if}
            </div>

            {#if !linkedAccountId || showRelinkForm}
              <div class="link-form-wrap">
                <div class="security-alert" role="alert">
                  <AlertTriangle size={19} />
                  <div>
                    <strong>
                      {text(
                        'Your credentials are not saved.',
                        'Thông tin đăng nhập của bạn không được lưu.'
                      )}
                    </strong>
                    <p>
                      {text(
                        'They are used once to verify ownership. Change your Geometry Dash password immediately after linking to ensure your account stays secure.',
                        'Thông tin chỉ được dùng một lần để xác minh quyền sở hữu. Hãy đổi mật khẩu Geometry Dash ngay sau khi liên kết để bảo đảm an toàn cho tài khoản.'
                      )}
                    </p>
                  </div>
                </div>

                <form
                  class="gd-link-form"
                  autocomplete="off"
                  on:submit|preventDefault={linkGeometryDash}
                >
                  <div class="field">
                    <Label for="gd-username">
                      {text('Geometry Dash username', 'Tên người dùng Geometry Dash')}
                    </Label>
                    <Input
                      id="gd-username"
                      name="gd-username"
                      autocomplete="off"
                      data-1p-ignore
                      data-lpignore="true"
                      bind:value={gdUsername}
                      disabled={linkingGeometryDash}
                    />
                  </div>
                  <div class="field">
                    <Label for="gd-password">
                      {text('Geometry Dash password', 'Mật khẩu Geometry Dash')}
                    </Label>
                    <Input
                      id="gd-password"
                      name="gd-password"
                      type="password"
                      autocomplete="new-password"
                      data-1p-ignore
                      data-lpignore="true"
                      bind:value={gdPassword}
                      disabled={linkingGeometryDash}
                    />
                  </div>
                  <div class="form-actions">
                    {#if showRelinkForm}
                      <Button
                        variant="ghost"
                        type="button"
                        disabled={linkingGeometryDash}
                        on:click={() => {
                            showRelinkForm = false;
                            gdUsername = '';
                            gdPassword = '';
                        }}
                      >
                        {text('Cancel', 'Huỷ')}
                      </Button>
                    {/if}
                    <Button
                      type="submit"
                      disabled={linkingGeometryDash || !gdUsername.trim() || !gdPassword}
                    >
                      {#if linkingGeometryDash}
                        <span class="spin"><LoaderCircle size={16} /></span>
                        {text('Verifying…', 'Đang xác minh…')}
                      {:else}
                        <ShieldCheck size={16} />
                        {text('Verify and link', 'Xác minh và liên kết')}
                      {/if}
                    </Button>
                  </div>
                </form>
              </div>
            {/if}
          </section>

          <section class="settings-card sync-card">
            <div class="card-row">
              <div>
                <h3>{text('Created levels', 'Màn chơi đã tạo')}</h3>
                <p>
                  {text(
                    'Crawl your public Geometry Dash levels, add missing levels to GDVN, and assign their creator to your player profile.',
                    'Quét các màn chơi công khai trên Geometry Dash, thêm màn còn thiếu vào GDVN và gán người tạo cho hồ sơ của bạn.'
                  )}
                </p>
              </div>
              <Button
                on:click={syncCreatedLevels}
                disabled={!linkedAccountId || syncingLevels}
              >
                {#if syncingLevels}
                  <span class="spin"><LoaderCircle size={16} /></span>
                  {text('Syncing…', 'Đang đồng bộ…')}
                {:else}
                  <RefreshCw size={16} />
                  {text('Sync created levels', 'Đồng bộ màn chơi')}
                {/if}
              </Button>
            </div>
            {#if lastSyncResult}
              <div class="sync-result" aria-live="polite">
                <Check size={16} />
                <span>
                  {text(
                    `${lastSyncResult.synced} levels synced · ${lastSyncResult.created} added · ${lastSyncResult.updated} updated`,
                    `Đã đồng bộ ${lastSyncResult.synced} màn · thêm ${lastSyncResult.created} · cập nhật ${lastSyncResult.updated}`
                  )}
                </span>
              </div>
            {/if}
          </section>
        {/if}
      {/if}
    </main>
  </div>
</div>

<style lang="scss">
.settings-shell {
  width: min(1180px, calc(100% - 32px));
  margin: 0 auto;
  padding: 44px 0 72px;
}

.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 28px;
  border-bottom: 1px solid var(--border1);

  h1 {
    margin: 3px 0 6px;
    color: var(--textColor1);
    font-size: clamp(28px, 4vw, 38px);
    font-weight: 700;
    letter-spacing: -0.04em;
  }

  p:not(.eyebrow) {
    color: var(--textColor2);
    font-size: 15px;
  }
}

.eyebrow {
  color: hsl(var(--primary));
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.profile-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex: none;
  color: var(--textColor2);
  font-size: 13px;
  transition: color 120ms ease;

  &:hover {
    color: var(--textColor1);
  }
}

.settings-layout {
  display: grid;
  grid-template-columns: 238px minmax(0, 1fr);
  gap: 56px;
  padding-top: 34px;
}

.settings-sidebar nav {
  display: grid;
  gap: 3px;
  position: sticky;
  top: 78px;

  a {
    display: grid;
    grid-template-columns: 18px minmax(0, 1fr) 16px;
    align-items: center;
    gap: 10px;
    min-height: 54px;
    padding: 8px 10px;
    border-radius: 8px;
    color: var(--textColor2);
    transition: background 120ms ease, color 120ms ease;

    &:hover,
    &.active {
      background: hsl(var(--accent));
      color: var(--textColor1);
    }

    &.active {
      box-shadow: inset 2px 0 0 hsl(var(--primary));
    }
  }

  strong,
  small {
    display: block;
  }

  strong {
    font-size: 13px;
    font-weight: 600;
  }

  small {
    margin-top: 2px;
    color: var(--textColor2);
    font-size: 11px;
    font-weight: 400;
  }

  .chevron {
    opacity: 0;
  }

  a:hover .chevron,
  a.active .chevron {
    opacity: 0.65;
  }
}

.settings-content {
  min-width: 0;
  max-width: 820px;
}

.section-heading {
  margin-bottom: 20px;

  h2 {
    color: var(--textColor1);
    font-size: 20px;
    font-weight: 650;
    letter-spacing: -0.025em;
  }

  p {
    max-width: 680px;
    margin-top: 5px;
    color: var(--textColor2);
    font-size: 13px;
    line-height: 1.55;
  }

  &.subsection {
    margin-top: 34px;
  }
}

.settings-card,
.empty-card {
  overflow: hidden;
  border: 1px solid var(--border1);
  border-radius: 10px;
  background: hsl(var(--card) / 0.42);
  box-shadow: 0 1px 2px rgb(0 0 0 / 5%);
}

.card-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  padding: 20px;

  & + & {
    border-top: 1px solid var(--border1);
  }

  h3 {
    color: var(--textColor1);
    font-size: 14px;
    font-weight: 600;
  }

  p {
    margin-top: 4px;
    color: var(--textColor2);
    font-size: 12px;
    line-height: 1.5;
  }
}

.theme-picker,
.row-actions,
.inline-loading,
.form-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.theme-picker {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.theme-dot {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  box-shadow: 0 0 0 1px rgb(255 255 255 / 12%);
}

.loading-panel,
.empty-card {
  display: grid;
  place-items: center;
  min-height: 220px;
}

.empty-card {
  align-content: center;
  gap: 9px;
  padding: 32px;
  color: var(--textColor2);
  text-align: center;

  h3 {
    color: var(--textColor1);
    font-size: 15px;
    font-weight: 600;
  }

  p {
    max-width: 440px;
    font-size: 13px;
  }
}

.table-card {
  overflow: visible;
}

.table-scroll {
  overflow-x: auto;
}

.card-footer {
  display: flex;
  justify-content: flex-end;
  padding: 14px 16px;
  border-top: 1px solid var(--border1);
}

.key-value {
  display: block;
  max-width: 140px;
  overflow: hidden;
  color: var(--textColor1);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.muted {
  color: var(--textColor2);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex: none;
  padding: 4px 8px;
  border: 1px solid var(--border1);
  border-radius: 999px;
  color: var(--textColor2);
  font-size: 11px;
  font-weight: 600;

  &.success {
    border-color: rgb(34 197 94 / 32%);
    background: rgb(34 197 94 / 8%);
    color: rgb(34 197 94);
  }
}

.connection-title {
  display: flex;
  align-items: center;
  gap: 12px;

  img {
    width: 30px;
    height: 30px;
  }
}

.pointercrate-row {
  align-items: flex-start;
}

.inline-form {
  display: flex;
  gap: 8px;
  width: min(100%, 420px);
}

.link-form-wrap {
  padding: 20px;
  border-top: 1px solid var(--border1);
}

.security-alert {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 13px 14px;
  border: 1px solid rgb(245 158 11 / 36%);
  border-radius: 8px;
  background: rgb(245 158 11 / 8%);
  color: rgb(245 158 11);

  > :global(svg) {
    flex: none;
    margin-top: 1px;
  }

  strong {
    display: block;
    font-size: 13px;
    font-weight: 650;
  }

  p {
    margin-top: 3px;
    color: color-mix(in srgb, currentColor 82%, var(--textColor1));
    font-size: 12px;
    line-height: 1.5;
  }
}

.gd-link-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 15px;
  margin-top: 18px;
}

.field {
  display: grid;
  gap: 7px;
}

.form-actions {
  grid-column: 1 / -1;
  justify-content: flex-end;
}

.sync-card {
  margin-top: 18px;
}

.sync-result {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid rgb(34 197 94 / 22%);
  background: rgb(34 197 94 / 6%);
  color: rgb(34 197 94);
  font-size: 12px;
}

.spin {
  display: inline-flex;
  animation: spin 800ms linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media screen and (max-width: 840px) {
  .settings-layout {
    grid-template-columns: 1fr;
    gap: 26px;
  }

  .settings-sidebar {
    overflow-x: auto;
    margin-inline: -16px;
    padding-inline: 16px;
  }

  .settings-sidebar nav {
    display: flex;
    width: max-content;
    position: static;

    a {
      grid-template-columns: 18px auto;
      min-height: 40px;
      white-space: nowrap;

      small,
      .chevron {
        display: none;
      }

      &.active {
        box-shadow: inset 0 -2px 0 hsl(var(--primary));
      }
    }
  }

  .settings-content {
    max-width: none;
  }
}

@media screen and (max-width: 620px) {
  .settings-shell {
    width: min(100% - 24px, 1180px);
    padding-top: 28px;
  }

  .page-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
  }

  .card-row,
  .account-status-row {
    align-items: stretch;
    flex-direction: column;
    gap: 15px;
  }

  .theme-picker,
  .row-actions {
    justify-content: flex-start;
  }

  .inline-form,
  .gd-link-form {
    grid-template-columns: 1fr;
    width: 100%;
  }

  .inline-form {
    flex-direction: column;
  }
}
</style>
