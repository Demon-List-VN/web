<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Switch } from '$lib/components/ui/switch';
	import * as Select from '$lib/components/ui/select';
	import Pencil1 from 'svelte-radix/Pencil1.svelte';
	import Plus from 'svelte-radix/Plus.svelte';
	import Trash from 'svelte-radix/Trash.svelte';
	import { toast } from 'svelte-sonner';
	import { _ } from 'svelte-i18n';

	export let open = false;
	export let dashboardBg: string = '';
	export let overlayType: 'none' | 'dark' | 'blur' | 'both' = 'none';
	export let searchEnabled = true;
	export let searchEngine:
		| 'google'
		| 'bing'
		| 'duckduckgo'
		| 'yahoo'
		| 'yandex'
		| 'ecosisa' = 'google';
	export let searchPosition: 'top' | 'center' | 'bottom' = 'center';
	export let shortcutsVisible = true;
	export let shortcuts: Array<{ name: string; url: string; icon: string; }> = [];
	export let bottomLeftWidgets: Array<'profile' | 'submissions'> = [
		'submissions',
		'profile'
	];
	export let searchOpenInNewTab = false;

	// Weather settings (local temp copies)
	let tempWeatherEnabled = true;
	// Do not auto-detect location by default
	let tempWeatherAutoDetect = false;
	// Default manual location to Hanoi
	let tempWeatherLocation = 'Hanoi';

	// Local copies for editing (initialize to safe defaults; sync on mount)
	let tempBgUrl = '';
	let tempOverlayType: 'none' | 'dark' | 'blur' | 'both' = 'none';
	let tempSearchEnabled = true;
	let tempSearchEngine:
		| 'google'
		| 'bing'
		| 'duckduckgo'
		| 'yahoo'
		| 'yandex'
		| 'ecosisa' = 'google';
	let tempSearchPosition: 'top' | 'center' | 'bottom' = 'center';
	let tempShortcutsVisible = true;
	let tempShortcuts: Array<{ name: string; url: string; icon: string; }> = [];
	// Whether to open search results in a new tab. Default: false (open in current tab)
	let tempSearchOpenInNewTab = false;
	type WidgetId = 'profile' | 'submissions';

	// Internal structure supports enabled flag and ordering
	let tempBottomLeftWidgets: Array<{ id: WidgetId; enabled: boolean; }> = [
		{ id: 'submissions', enabled: true },
		{ id: 'profile', enabled: true }
	];

	// Drag drop index
	let dragIndex: number | null = null;

	const canCustomizeDashboard = true;

	function handleDragStart(event: DragEvent, idx: number) {
		dragIndex = idx;

		try {
			event.dataTransfer?.setData('text/plain', String(idx));
		} catch {}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
	}

	function handleDrop(event: DragEvent, idx: number) {
		event.preventDefault();
		const data = event.dataTransfer?.getData('text/plain');
		const sourceIndex = data ? parseInt(data, 10) : (dragIndex ?? -1);

		if (sourceIndex < 0 || isNaN(sourceIndex)) {
			return;
		}

		if (sourceIndex === idx) {
			return;
		}

		const arr = [...tempBottomLeftWidgets];
		const [item] = arr.splice(sourceIndex, 1);
		arr.splice(idx, 0, item);
		tempBottomLeftWidgets = arr;
		dragIndex = null;
	}

	// Shortcut editing
	let editingShortcutIndex: number | null = null;
	let editingShortcut = { name: '', url: '', icon: '' };
	let shortcutDialogOpen = false;

	const SEARCH_ENGINES = {
		google: { name: 'Google', url: 'https://www.google.com/search?q=' },
		bing: { name: 'Bing', url: 'https://www.bing.com/search?q=' },
		duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
		yahoo: { name: 'Yahoo', url: 'https://search.yahoo.com/search?p=' },
		yandex: { name: 'Yandex', url: 'https://yandex.com/search/?text=' },
		ecosisa: { name: 'Ecosia', url: 'https://www.ecosia.org/search?q=' }
	};

	const DEFAULT_SHORTCUTS = [
		{
			name: 'YouTube',
			url: 'https://youtube.com',
			icon: 'https://www.google.com/s2/favicons?domain=youtube.com&sz=64'
		},
		{
			name: 'GitHub',
			url: 'https://github.com',
			icon: 'https://www.google.com/s2/favicons?domain=github.com&sz=64'
		},
		{
			name: 'Facebook',
			url: 'https://facebook.com',
			icon: 'https://www.google.com/s2/favicons?domain=facebook.com&sz=64'
		},
		{
			name: 'Discord',
			url: 'https://discord.com',
			icon: 'https://www.google.com/s2/favicons?domain=discord.com&sz=64'
		}
	];

	function openShortcutDialog(index: number | null = null) {
		if (index !== null && tempShortcuts[index]) {
			editingShortcutIndex = index;
			editingShortcut = { ...tempShortcuts[index] };
		} else {
			editingShortcutIndex = null;
			editingShortcut = { name: '', url: '', icon: '' };
		}

		shortcutDialogOpen = true;
	}

	function saveShortcut() {
		if (!editingShortcut.name.trim() || !editingShortcut.url.trim()) {
			toast.error($_('dashboard.settings.shortcut_required'));

			return;
		}

		// Auto-generate icon if not provided
		if (!editingShortcut.icon.trim()) {
			try {
				const url = new URL(editingShortcut.url);
				editingShortcut.icon =
					`https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`;
			} catch {
				editingShortcut.icon = '';
			}
		}

		if (editingShortcutIndex !== null) {
			tempShortcuts[editingShortcutIndex] = { ...editingShortcut };
		} else {
			tempShortcuts = [...tempShortcuts, { ...editingShortcut }];
		}

		shortcutDialogOpen = false;
		editingShortcutIndex = null;
		editingShortcut = { name: '', url: '', icon: '' };
	}

	function deleteShortcut(index: number) {
		tempShortcuts = tempShortcuts.filter((_, i) => i !== index);
	}

	function saveDashboardSettings() {
		if (browser) {
			// Save to localStorage
			const DASHBOARD_BG_KEY = 'dashboard.backgroundUrl';
			const DASHBOARD_OVERLAY_KEY = 'dashboard.overlayType';
			const DASHBOARD_SEARCH_ENABLED_KEY = 'dashboard.searchEnabled';
			const DASHBOARD_SEARCH_ENGINE_KEY = 'dashboard.searchEngine';
			const DASHBOARD_SEARCH_POSITION_KEY = 'dashboard.searchPosition';
			const DASHBOARD_SHORTCUTS_VISIBLE_KEY = 'dashboard.shortcutsVisible';
			const DASHBOARD_SHORTCUTS_KEY = 'dashboard.shortcuts';
			const DASHBOARD_BOTTOM_LEFT_WIDGETS_KEY = 'dashboard.bottomLeftWidgets';
			const DASHBOARD_WEATHER_ENABLED_KEY = 'dashboard.weatherEnabled';
			const DASHBOARD_WEATHER_AUTODETECT_KEY = 'dashboard.weatherAutoDetect';
			const DASHBOARD_WEATHER_LOCATION_KEY = 'dashboard.weatherLocation';
			const DASHBOARD_SEARCH_OPEN_IN_NEW_TAB_KEY =
				'dashboard.searchOpenInNewTab';

			localStorage.setItem(DASHBOARD_BG_KEY, tempBgUrl);
			localStorage.setItem(DASHBOARD_OVERLAY_KEY, tempOverlayType);
			localStorage.setItem(
				DASHBOARD_SEARCH_ENABLED_KEY,
				String(tempSearchEnabled)
			);
			localStorage.setItem(DASHBOARD_SEARCH_ENGINE_KEY, tempSearchEngine);
			localStorage.setItem(DASHBOARD_SEARCH_POSITION_KEY, tempSearchPosition);
			localStorage.setItem(
				DASHBOARD_SEARCH_OPEN_IN_NEW_TAB_KEY,
				String(tempSearchOpenInNewTab)
			);
			localStorage.setItem(
				DASHBOARD_SHORTCUTS_VISIBLE_KEY,
				String(tempShortcutsVisible)
			);
			localStorage.setItem(
				DASHBOARD_SHORTCUTS_KEY,
				JSON.stringify(tempShortcuts)
			);
			// Persist both legacy array (enabled-only ids) and full state (id+enabled) for compatibility
			const enabledIds = tempBottomLeftWidgets.filter((w) => w.enabled)
				.map((
					w
				) => w.id);
			localStorage.setItem(
				DASHBOARD_BOTTOM_LEFT_WIDGETS_KEY,
				JSON.stringify(enabledIds)
			);
			localStorage.setItem(
				'dashboard.bottomLeftWidgetsState',
				JSON.stringify(tempBottomLeftWidgets)
			);
			localStorage.setItem(
				DASHBOARD_WEATHER_ENABLED_KEY,
				String(tempWeatherEnabled)
			);
			localStorage.setItem(
				DASHBOARD_WEATHER_AUTODETECT_KEY,
				String(tempWeatherAutoDetect)
			);
			localStorage.setItem(
				DASHBOARD_WEATHER_LOCATION_KEY,
				tempWeatherLocation
			);

			// Notify other parts of the app (same-tab listeners) that weather settings changed
			try {
				window.dispatchEvent(new Event('dashboard.weather.updated'));
			} catch {}

			// Also notify that search settings changed
			try {
				window.dispatchEvent(new Event('dashboard.search.updated'));
			} catch {}

			// Emit update
			dashboardBg = tempBgUrl;
			overlayType = tempOverlayType;
			searchEnabled = tempSearchEnabled;
			searchEngine = tempSearchEngine;
			searchPosition = tempSearchPosition;
			// reflect search open-in-new-tab
        // Note: dashboardSearch component listens to 'dashboard.search.updated' or storage change
			shortcutsVisible = tempShortcutsVisible;
			shortcuts = tempShortcuts.map((s) => ({ ...s }));
			// expose as legacy array: only enabled widget ids in order
			bottomLeftWidgets = tempBottomLeftWidgets.filter((w) => w.enabled)
				.map((
					w
				) => w.id);

			// No need to emit weather props here; weather component listens to storage changes

			toast.success($_('dashboard.settings.saved'));
			open = false;
		}
	}

	function clearDashboardBackground() {
		if (browser) {
			const DASHBOARD_BG_KEY = 'dashboard.backgroundUrl';
			const DASHBOARD_OVERLAY_KEY = 'dashboard.overlayType';

			localStorage.removeItem(DASHBOARD_BG_KEY);
			localStorage.removeItem(DASHBOARD_OVERLAY_KEY);
			tempBgUrl = '';
			tempOverlayType = 'none';
			toast.success($_('dashboard.settings.bg_cleared'));
		}
	}

	function resetSearchSettings() {
		if (browser) {
			const DASHBOARD_SEARCH_ENABLED_KEY = 'dashboard.searchEnabled';
			const DASHBOARD_SEARCH_ENGINE_KEY = 'dashboard.searchEngine';
			const DASHBOARD_SEARCH_POSITION_KEY = 'dashboard.searchPosition';
			const DASHBOARD_SHORTCUTS_VISIBLE_KEY = 'dashboard.shortcutsVisible';
			const DASHBOARD_SHORTCUTS_KEY = 'dashboard.shortcuts';

			localStorage.removeItem(DASHBOARD_SEARCH_ENABLED_KEY);
			localStorage.removeItem(DASHBOARD_SEARCH_ENGINE_KEY);
			localStorage.removeItem(DASHBOARD_SEARCH_POSITION_KEY);
			localStorage.removeItem(DASHBOARD_SHORTCUTS_VISIBLE_KEY);
			localStorage.removeItem(DASHBOARD_SHORTCUTS_KEY);
			localStorage.removeItem('dashboard.searchOpenInNewTab');

			tempSearchEnabled = true;
			tempSearchEngine = 'google';
			tempSearchPosition = 'center';
			tempShortcutsVisible = true;
			tempShortcuts = [...DEFAULT_SHORTCUTS];
			tempSearchOpenInNewTab = false;

			toast.success($_('dashboard.settings.search_reset'));
		}
	}

	function handleOpenChange(newOpen: boolean) {
		if (newOpen && browser) {
			const DASHBOARD_BG_KEY = 'dashboard.backgroundUrl';
			const DASHBOARD_OVERLAY_KEY = 'dashboard.overlayType';
			const DASHBOARD_SEARCH_ENABLED_KEY = 'dashboard.searchEnabled';
			const DASHBOARD_SEARCH_ENGINE_KEY = 'dashboard.searchEngine';
			const DASHBOARD_SEARCH_POSITION_KEY = 'dashboard.searchPosition';
			const DASHBOARD_SHORTCUTS_VISIBLE_KEY = 'dashboard.shortcutsVisible';
			const DASHBOARD_SHORTCUTS_KEY = 'dashboard.shortcuts';

			tempBgUrl = localStorage.getItem(DASHBOARD_BG_KEY) || '';
			tempOverlayType = localStorage.getItem(
				DASHBOARD_OVERLAY_KEY
			) as typeof overlayType;

			const savedSearchEnabled = localStorage.getItem(
				DASHBOARD_SEARCH_ENABLED_KEY
			);
			tempSearchEnabled = savedSearchEnabled === null
				? true
				: savedSearchEnabled === 'true';

			tempSearchEngine = localStorage.getItem(
				DASHBOARD_SEARCH_ENGINE_KEY
			) as typeof searchEngine;
			tempSearchPosition = localStorage.getItem(
				DASHBOARD_SEARCH_POSITION_KEY
			) as typeof searchPosition;

			const savedSearchOpenInNewTab = localStorage.getItem(
				'dashboard.searchOpenInNewTab'
			);
			tempSearchOpenInNewTab = savedSearchOpenInNewTab === 'true';

			const savedShortcutsVisible = localStorage.getItem(
				DASHBOARD_SHORTCUTS_VISIBLE_KEY
			);
			tempShortcutsVisible = savedShortcutsVisible === null
				? true
				: savedShortcutsVisible === 'true';

			const savedShortcuts = localStorage.getItem(DASHBOARD_SHORTCUTS_KEY);

			if (savedShortcuts) {
				try {
					tempShortcuts = JSON.parse(savedShortcuts);
				} catch {
					tempShortcuts = DEFAULT_SHORTCUTS.map((s) => ({ ...s }));
				}
			} else {
				tempShortcuts = DEFAULT_SHORTCUTS.map((s) => ({ ...s }));
			}

			const savedBottomLeftWidgetsState = localStorage.getItem(
				'dashboard.bottomLeftWidgetsState'
			);
			const savedBottomLeftWidgets = localStorage.getItem(
				'dashboard.bottomLeftWidgets'
			);

			if (savedBottomLeftWidgetsState) {
				try {
					const parsed = JSON.parse(savedBottomLeftWidgetsState);

					if (
						Array.isArray(parsed)
						&& parsed.every((it) => it && typeof it.id === 'string')
					) {
						tempBottomLeftWidgets = parsed.map((it) => ({
							id: it.id as WidgetId,
							enabled: it.enabled ?? true
						}));
					} else {
						tempBottomLeftWidgets = [
							{ id: 'submissions', enabled: true },
							{ id: 'profile', enabled: true }
						];
					}
				} catch {
					tempBottomLeftWidgets = [
						{ id: 'submissions', enabled: true },
						{ id: 'profile', enabled: true }
					];
				}
			} else if (savedBottomLeftWidgets) {
				try {
					const parsed = JSON.parse(savedBottomLeftWidgets);

					if (Array.isArray(parsed)) {
						tempBottomLeftWidgets = parsed.map((id) => ({
							id: id as WidgetId,
							enabled: true
						}));
					} else {
						tempBottomLeftWidgets = [
							{ id: 'submissions', enabled: true },
							{ id: 'profile', enabled: true }
						];
					}
				} catch {
					tempBottomLeftWidgets = [
						{ id: 'submissions', enabled: true },
						{ id: 'profile', enabled: true }
					];
				}
			} else {
				tempBottomLeftWidgets = [
					{ id: 'submissions', enabled: true },
					{ id: 'profile', enabled: true }
				];
			}

			tempWeatherEnabled =
				(localStorage.getItem('dashboard.weatherEnabled') ?? 'true')
				=== 'true';
			tempWeatherAutoDetect =
				(localStorage.getItem('dashboard.weatherAutoDetect') ?? 'false')
				=== 'true';
			tempWeatherLocation = localStorage.getItem('dashboard.weatherLocation')
				|| 'Hanoi';
			dashboardBg = tempBgUrl;
			overlayType = tempOverlayType;
			searchEnabled = tempSearchEnabled;
			searchEngine = tempSearchEngine;
			searchPosition = tempSearchPosition;
			shortcutsVisible = tempShortcutsVisible;
			shortcuts = tempShortcuts.map((s) => ({ ...s }));
			bottomLeftWidgets = tempBottomLeftWidgets.filter((w) => w.enabled)
				.map((
					w
				) => w.id);
			searchOpenInNewTab = tempSearchOpenInNewTab;
		}

		open = newOpen;
	}

	onMount(() => {
		if (!browser) {
			return;
		}

		const DASHBOARD_BG_KEY = 'dashboard.backgroundUrl';
		const DASHBOARD_OVERLAY_KEY = 'dashboard.overlayType';
		const DASHBOARD_SEARCH_ENABLED_KEY = 'dashboard.searchEnabled';
		const DASHBOARD_SEARCH_ENGINE_KEY = 'dashboard.searchEngine';
		const DASHBOARD_SEARCH_POSITION_KEY = 'dashboard.searchPosition';
		const DASHBOARD_SHORTCUTS_VISIBLE_KEY = 'dashboard.shortcutsVisible';
		const DASHBOARD_SHORTCUTS_KEY = 'dashboard.shortcuts';

		tempBgUrl = localStorage.getItem(DASHBOARD_BG_KEY) || '';
		const overlay = localStorage.getItem(DASHBOARD_OVERLAY_KEY);
		tempOverlayType =
			overlay === 'none' || overlay === 'dark' || overlay === 'blur'
				|| overlay === 'both'
				? (overlay as typeof tempOverlayType)
				: 'none';

		const savedSearchEnabled = localStorage.getItem(
			DASHBOARD_SEARCH_ENABLED_KEY
		);
		tempSearchEnabled = savedSearchEnabled === null
			? true
			: savedSearchEnabled === 'true';

		const engine = localStorage.getItem(DASHBOARD_SEARCH_ENGINE_KEY);
		tempSearchEngine = engine && engine in SEARCH_ENGINES
			? (engine as typeof tempSearchEngine)
			: 'google';

		const position = localStorage.getItem(DASHBOARD_SEARCH_POSITION_KEY);
		tempSearchPosition =
			position === 'top' || position === 'center' || position === 'bottom'
				? (position as typeof tempSearchPosition)
				: 'center';

		// search open in new tab
		const savedSearchOpenInNewTab = localStorage.getItem(
			'dashboard.searchOpenInNewTab'
		);
		tempSearchOpenInNewTab = savedSearchOpenInNewTab === 'true';

		const savedShortcutsVisible = localStorage.getItem(
			DASHBOARD_SHORTCUTS_VISIBLE_KEY
		);
		tempShortcutsVisible = savedShortcutsVisible === null
			? true
			: savedShortcutsVisible === 'true';

		const savedShortcuts = localStorage.getItem(DASHBOARD_SHORTCUTS_KEY);

		if (savedShortcuts) {
			try {
				tempShortcuts = JSON.parse(savedShortcuts);
			} catch {
				tempShortcuts = DEFAULT_SHORTCUTS.map((s) => ({ ...s }));
			}

			tempWeatherEnabled =
				(localStorage.getItem('dashboard.weatherEnabled') ?? 'true')
				=== 'true';
			tempWeatherAutoDetect =
				(localStorage.getItem('dashboard.weatherAutoDetect') ?? 'false')
				=== 'true';
			tempWeatherLocation = localStorage.getItem('dashboard.weatherLocation')
				|| 'Hanoi';
		} else {
			tempShortcuts = DEFAULT_SHORTCUTS.map((s) => ({ ...s }));
		}

		const savedBottomLeftWidgetsState = localStorage.getItem(
			'dashboard.bottomLeftWidgetsState'
		);
		const savedBottomLeftWidgets = localStorage.getItem(
			'dashboard.bottomLeftWidgets'
		);

		if (savedBottomLeftWidgetsState) {
			try {
				const parsed = JSON.parse(savedBottomLeftWidgetsState);

				if (
					Array.isArray(parsed)
					&& parsed.every((it) => it && typeof it.id === 'string')
				) {
					tempBottomLeftWidgets = parsed.map((it) => ({
						id: it.id as WidgetId,
						enabled: it.enabled ?? true
					}));
				} else {
					tempBottomLeftWidgets = [
						{ id: 'submissions', enabled: true },
						{ id: 'profile', enabled: true }
					];
				}
			} catch {
				tempBottomLeftWidgets = [
					{ id: 'submissions', enabled: true },
					{ id: 'profile', enabled: true }
				];
			}
		} else if (savedBottomLeftWidgets) {
			try {
				const parsed = JSON.parse(savedBottomLeftWidgets);

				if (Array.isArray(parsed)) {
					tempBottomLeftWidgets = parsed.map((id) => ({
						id: id as WidgetId,
						enabled: true
					}));
				}
			} catch {
				tempBottomLeftWidgets = [
					{ id: 'submissions', enabled: true },
					{ id: 'profile', enabled: true }
				];
			}
		} else {
			tempBottomLeftWidgets = [
				{ id: 'submissions', enabled: true },
				{ id: 'profile', enabled: true }
			];
		}

		dashboardBg = tempBgUrl;
		overlayType = tempOverlayType;
		searchEnabled = tempSearchEnabled;
		searchEngine = tempSearchEngine;
		searchPosition = tempSearchPosition;
		searchOpenInNewTab = tempSearchOpenInNewTab;
		shortcutsVisible = tempShortcutsVisible;
		shortcuts = tempShortcuts.map((s) => ({ ...s }));
		bottomLeftWidgets = tempBottomLeftWidgets.filter((w) => w.enabled)
			.map((
				w
			) => w.id);
	});
</script>

<!-- Dashboard Settings Dialog -->
<Dialog.Root bind:open onOpenChange={handleOpenChange}>
  <Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
    <Dialog.Header>
      <Dialog.Title>{$_('dashboard.settings.title')}</Dialog.Title>
      <Dialog.Description>
        {$_('dashboard.settings.description')}
      </Dialog.Description>
    </Dialog.Header>
    <ScrollArea class="max-h-[60vh] pr-4">
      <div class="grid gap-6 py-4">
        <!-- Background Settings Section -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold">
              {$_('dashboard.settings.background_section')}
            </h3>
            {#if !canCustomizeDashboard}
              <span
                class="text-xs font-medium text-amber-600 dark:text-amber-400"
              >
                {$_('dashboard.settings.supporter_only') || '💎 Supporter Only'}
              </span>
            {/if}
          </div>

          <div class="grid gap-2">
            <Label for="bg-url">{$_('dashboard.settings.bg_url')}</Label>
            <Input
              id="bg-url"
              bind:value={tempBgUrl}
              placeholder={$_('dashboard.settings.bg_placeholder')}
              disabled={!canCustomizeDashboard}
            />
            <p class="text-xs text-muted-foreground">
              {#if !canCustomizeDashboard}
                {
                  $_('dashboard.settings.bg_supporter_hint')
                  || 'Become a supporter to customize your dashboard background'
                }
              {:else}
                {
                  $_('dashboard.settings.bg_hint')
                  || 'Enter a URL to an image for your dashboard background'
                }
              {/if}
            </p>
          </div>

          <!-- Overlay Options -->
          <div class="grid gap-2">
            <Label>{$_('dashboard.settings.overlay')}</Label>
            <div class="flex flex-wrap gap-2">
              <Button
                variant={tempOverlayType === 'none' ? 'default' : 'outline'}
                size="sm"
                on:click={() => (tempOverlayType = 'none')}
                disabled={!canCustomizeDashboard}
              >
                {$_('dashboard.settings.overlay_none')}
              </Button>
              <Button
                variant={tempOverlayType === 'dark' ? 'default' : 'outline'}
                size="sm"
                on:click={() => (tempOverlayType = 'dark')}
                disabled={!canCustomizeDashboard}
              >
                {$_('dashboard.settings.overlay_dark')}
              </Button>
              <Button
                variant={tempOverlayType === 'blur' ? 'default' : 'outline'}
                size="sm"
                on:click={() => (tempOverlayType = 'blur')}
                disabled={!canCustomizeDashboard}
              >
                {$_('dashboard.settings.overlay_blur')}
              </Button>
              <Button
                variant={tempOverlayType === 'both' ? 'default' : 'outline'}
                size="sm"
                on:click={() => (tempOverlayType = 'both')}
                disabled={!canCustomizeDashboard}
              >
                {$_('dashboard.settings.overlay_both')}
              </Button>
            </div>
          </div>

          {#if tempBgUrl}
            <div class="relative aspect-video w-full overflow-hidden rounded-md border">
              <img
                src={tempBgUrl}
                alt={$_('dashboard.settings.preview')}
                class="h-full w-full object-cover"
                on:error={() => toast.error($_('dashboard.settings.invalid_bg_url'))}
              />
              <!-- Preview overlay -->
              {#if tempOverlayType === 'dark' || tempOverlayType === 'both'}
                <div class="absolute inset-0 bg-black/40"></div>
              {/if}
              {#if tempOverlayType === 'blur' || tempOverlayType === 'both'}
                <div class="absolute inset-0 backdrop-blur-sm"></div>
              {/if}
            </div>
          {/if}

          <Button
            variant="outline"
            size="sm"
            on:click={clearDashboardBackground}
            disabled={!canCustomizeDashboard}
          >
            {$_('dashboard.settings.clear_bg')}
          </Button>
        </div>

        <!-- Divider -->
        <div class="border-t"></div>

        <!-- Web Search Settings Section -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold">
              {$_('dashboard.settings.search_section')}
            </h3>
            {#if !canCustomizeDashboard}
              <span
                class="text-xs font-medium text-amber-600 dark:text-amber-400"
              >
                {$_('dashboard.settings.supporter_only') || '💎 Supporter Only'}
              </span>
            {/if}
          </div>

          <!-- Enable/Disable Search -->
          <div class="flex items-center justify-between">
            <div>
              <Label>{$_('dashboard.settings.enable_search')}</Label>
              <p class="text-xs text-muted-foreground">
                {#if !canCustomizeDashboard}
                  {
                    $_('dashboard.settings.search_supporter_hint')
                    || 'Become a supporter to use web search'
                  }
                {:else}
                  {$_('dashboard.settings.enable_search_hint')}
                {/if}
              </p>
            </div>
            <Switch
              bind:checked={tempSearchEnabled}
              disabled={!canCustomizeDashboard}
            />
          </div>

          {#if tempSearchEnabled}
            <!-- Search Engine Selection -->
            <div class="grid gap-2">
              <Label>{$_('dashboard.settings.search_engine')}</Label>
              <Select.Root
                selected={{ value: tempSearchEngine, label: SEARCH_ENGINES[tempSearchEngine].name }}
                onSelectedChange={(v) => {
                    if (v && canCustomizeDashboard) {
 tempSearchEngine = v.value;
}
                }}
                disabled={!canCustomizeDashboard}
              >
                <Select.Trigger
                  class="w-full"
                  disabled={!canCustomizeDashboard}
                >
                  <Select.Value
                    placeholder={$_('dashboard.settings.select_search_engine')}
                  />
                </Select.Trigger>
                <Select.Content>
                  {#each Object.entries(SEARCH_ENGINES) as [key, engine]}
                    <Select.Item value={key}>{engine.name}</Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
            </div>
            <!-- Open results in new tab -->
            <div class="flex items-center justify-between">
              <div>
                <Label>{$_('dashboard.settings.open_in_new_tab')}</Label>
                <p class="text-xs text-muted-foreground">
                  {
                    $_('dashboard.settings.open_in_new_tab_hint')
                    || 'Open search results in a new tab by default'
                  }
                </p>
              </div>
              <Switch
                bind:checked={tempSearchOpenInNewTab}
                disabled={!canCustomizeDashboard}
              />
            </div>
            <!-- Search Bar Position -->
            <div class="grid gap-2">
              <Label>{$_('dashboard.settings.search_position')}</Label>
              <div class="flex flex-wrap gap-2">
                <Button
                  variant={tempSearchPosition === 'top' ? 'default' : 'outline'}
                  size="sm"
                  on:click={() => (tempSearchPosition = 'top')}
                  disabled={!canCustomizeDashboard}
                >
                  {$_('dashboard.settings.position_top')}
                </Button>
                <Button
                  variant={tempSearchPosition === 'center' ? 'default' : 'outline'}
                  size="sm"
                  on:click={() => (tempSearchPosition = 'center')}
                  disabled={!canCustomizeDashboard}
                >
                  {$_('dashboard.settings.position_center')}
                </Button>
                <Button
                  variant={tempSearchPosition === 'bottom' ? 'default' : 'outline'}
                  size="sm"
                  on:click={() => (tempSearchPosition = 'bottom')}
                  disabled={!canCustomizeDashboard}
                >
                  {$_('dashboard.settings.position_bottom')}
                </Button>
              </div>
            </div>

            <!-- Show/Hide Shortcuts -->
            <div class="flex items-center justify-between">
              <div>
                <Label>{$_('dashboard.settings.show_shortcuts')}</Label>
                <p class="text-xs text-muted-foreground">
                  {#if !canCustomizeDashboard}
                    {
                      $_('dashboard.settings.shortcuts_supporter_hint')
                      || 'Become a supporter to customize shortcuts'
                    }
                  {:else}
                    {
                      $_('dashboard.settings.show_shortcuts_hint')
                      || 'Display quick access links below search'
                    }
                  {/if}
                </p>
              </div>
              <Switch
                bind:checked={tempShortcutsVisible}
                disabled={!canCustomizeDashboard}
              />
            </div>

            {#if tempShortcutsVisible}
              <!-- Shortcuts Management -->
              <div class="grid gap-2">
                <div class="flex items-center justify-between">
                  <Label>{$_('dashboard.settings.shortcuts')}</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    on:click={() => openShortcutDialog()}
                    disabled={!canCustomizeDashboard}
                  >
                    <Plus class="mr-1 h-3 w-3" />
                    {$_('dashboard.settings.add_shortcut')}
                  </Button>
                </div>
                <div class="space-y-2 rounded-md border p-2">
                  {#if tempShortcuts.length === 0}
                    <p class="py-2 text-center text-xs text-muted-foreground">
                      {$_('dashboard.settings.no_shortcuts')}
                    </p>
                  {:else}
                    {#each tempShortcuts as shortcut, index}
                      <div class="flex items-center gap-2 rounded-md bg-muted/50 p-2">
                        {#if shortcut.icon}
                          <img
                            src={shortcut.icon}
                            alt=""
                            class="h-5 w-5 rounded"
                          />
                        {:else}
                          <div class="flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px] font-bold">
                            {shortcut.name.charAt(0)
.toUpperCase()}
                          </div>
                        {/if}
                        <span class="flex-1 truncate text-sm">{
                          shortcut.name
                        }</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          class="h-7 w-7 p-0"
                          on:click={() => openShortcutDialog(index)}
                          disabled={!canCustomizeDashboard}
                        >
                          <Pencil1 class="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          class="h-7 w-7 p-0 text-destructive"
                          on:click={() => deleteShortcut(index)}
                          disabled={!canCustomizeDashboard}
                        >
                          <Trash class="h-3 w-3" />
                        </Button>
                      </div>
                    {/each}
                  {/if}
                </div>
              </div>
            {/if}

            <Button
              variant="outline"
              size="sm"
              on:click={resetSearchSettings}
              disabled={!canCustomizeDashboard}
            >
              {$_('dashboard.settings.reset_search')}
            </Button>
          {/if}

          <!-- Divider -->
          <div class="border-t"></div>

          <!-- Weather Settings Section -->
          <div class="space-y-4">
            <h3 class="text-sm font-semibold">
              {$_('dashboard.settings.weather_section')}
            </h3>

            <div class="flex items-center justify-between">
              <div>
                <Label>{$_('dashboard.settings.enable_weather')}</Label>
                <p class="text-xs text-muted-foreground">
                  {$_('dashboard.settings.enable_weather_hint')}
                </p>
              </div>
              <Switch bind:checked={tempWeatherEnabled} />
            </div>

            <div class="flex items-center justify-between">
              <div>
                <Label>{$_('dashboard.settings.weather_autodetect')}</Label>
                <p class="text-xs text-muted-foreground">
                  {$_('dashboard.settings.weather_autodetect_hint')}
                </p>
              </div>
              <Switch bind:checked={tempWeatherAutoDetect} />
            </div>

            {#if !tempWeatherAutoDetect}
              <div class="grid gap-2">
                <Label for="weather-location">{
                  $_('dashboard.settings.weather_location')
                }</Label>
                <Input
                  id="weather-location"
                  bind:value={tempWeatherLocation}
                  placeholder={$_('dashboard.settings.weather_location_placeholder')}
                />
                <p class="text-xs text-muted-foreground">
                  {$_('dashboard.settings.weather_location_hint')}
                </p>
              </div>
            {/if}

            <Button
              variant="outline"
              size="sm"
              on:click={() => {
                  // Reset to app defaults: autoDetect disabled, default location Hanoi
                  localStorage.setItem('dashboard.weatherLocation', 'Hanoi');
                  localStorage.setItem('dashboard.weatherAutoDetect', 'false');
                  localStorage.setItem('dashboard.weatherEnabled', 'true');
                  tempWeatherLocation = 'Hanoi';
                  tempWeatherAutoDetect = false;
                  tempWeatherEnabled = true;
                  toast.success($_('dashboard.settings.weather_reset'));
              }}
            >
              {$_('dashboard.settings.reset_weather')}
            </Button>
          </div>

          <!-- Divider -->
          <div class="border-t"></div>

          <!-- Bottom Left Widgets Section -->
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold">
                {
                  $_('dashboard.settings.widgets_section') || 'Bottom Left Widgets'
                }
              </h3>
              {#if !canCustomizeDashboard}
                <span
                  class="text-xs font-medium text-amber-600 dark:text-amber-400"
                >
                  {
                    $_('dashboard.settings.supporter_only') || '💎 Supporter Only'
                  }
                </span>
              {/if}
            </div>
            <p class="text-xs text-muted-foreground">
              {#if !canCustomizeDashboard}
                {
                  $_('dashboard.settings.widgets_supporter_hint')
                  || 'Become a supporter to customize widget order and visibility'
                }
              {:else}
                {
                  $_('dashboard.settings.widgets_hint')
                  || 'Customize which widgets appear in the bottom left corner and their order. Drag to reorder.'
                }
              {/if}
            </p>

            <div class="space-y-2 rounded-md border p-3" role="list">
              {#each tempBottomLeftWidgets as widget, index (widget.id)}
                <div
                  class="flex items-center gap-2 rounded-md bg-muted/50 p-2"
                  class:opacity-70={dragIndex === index}
                  draggable={canCustomizeDashboard ? 'true' : 'false'}
                  aria-grabbed={dragIndex === index}
                  role="listitem"
                  on:dragstart={(e) => canCustomizeDashboard && handleDragStart(e, index)}
                  on:dragover={handleDragOver}
                  on:drop={(e) => canCustomizeDashboard && handleDrop(e, index)}
                >
                  <div class="flex flex-col gap-1">
                    <button
                      class="flex h-5 w-5 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
                      disabled={!canCustomizeDashboard || index === 0}
                      on:click={() => {
                          if (canCustomizeDashboard && index > 0) {
                              const newWidgets = [...tempBottomLeftWidgets];
                              const temp = newWidgets[index - 1];
                              newWidgets[index - 1] = newWidgets[index];
                              newWidgets[index] = temp;
                              tempBottomLeftWidgets = newWidgets;
                          }
                      }}
                    >
                      ▲
                    </button>
                    <button
                      class="flex h-5 w-5 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
                      disabled={!canCustomizeDashboard || index === tempBottomLeftWidgets.length - 1}
                      on:click={() => {
                          if (canCustomizeDashboard && index < tempBottomLeftWidgets.length - 1) {
                              const newWidgets = [...tempBottomLeftWidgets];
                              const temp = newWidgets[index];
                              newWidgets[index] = newWidgets[index + 1];
                              newWidgets[index + 1] = temp;
                              tempBottomLeftWidgets = newWidgets;
                          }
                      }}
                    >
                      ▼
                    </button>
                  </div>
                  <span class="flex-1 text-sm font-medium">
                    {
                      widget.id === 'profile'
                      ? $_('dashboard.settings.widget_profile') || 'Player Profile'
                      : $_('dashboard.settings.widget_submissions') || 'Pending Submissions'
                    }
                  </span>
                  <div class="mr-2">
                    <input
                      id={`widget-enable-${index}`}
                      type="checkbox"
                      class="h-4 w-4 rounded border-muted-foreground text-primary focus:ring-0"
                      checked={widget.enabled}
                      disabled={!canCustomizeDashboard}
                      on:change={() => {
                          if (canCustomizeDashboard) {
                              tempBottomLeftWidgets = tempBottomLeftWidgets.map((w, i) =>
                                  i === index ? { ...w, enabled: !w.enabled } : w
                              );
                          }
                      }}
                      aria-label={widget.id === 'profile'
                      ? $_('dashboard.settings.widget_profile') || 'Player Profile'
                      : $_('dashboard.settings.widget_submissions') || 'Pending Submissions'}
                    />
                  </div>
                </div>
              {/each}
              {#if tempBottomLeftWidgets.filter((w) => w.enabled).length === 0}
                <p class="py-2 text-center text-xs text-muted-foreground">
                  {$_('dashboard.settings.no_widgets') || 'No widgets selected'}
                </p>
              {/if}
            </div>

            <!-- Add Widget Buttons -->
            <div class="flex flex-wrap gap-2">
              {#if !tempBottomLeftWidgets.some((w) => w.id === 'profile')}
                <Button
                  variant="outline"
                  size="sm"
                  on:click={() => {
                      tempBottomLeftWidgets = [
                          ...tempBottomLeftWidgets,
                          { id: 'profile', enabled: true }
                      ];
                  }}
                  disabled={!canCustomizeDashboard}
                >
                  <Plus class="mr-1 h-3 w-3" />
                  {$_('dashboard.settings.add_widget_profile') || 'Add Profile'}
                </Button>
              {/if}
              {#if !tempBottomLeftWidgets.some((w) => w.id === 'submissions')}
                <Button
                  variant="outline"
                  size="sm"
                  on:click={() => {
                      tempBottomLeftWidgets = [
                          ...tempBottomLeftWidgets,
                          { id: 'submissions', enabled: true }
                      ];
                  }}
                  disabled={!canCustomizeDashboard}
                >
                  <Plus class="mr-1 h-3 w-3" />
                  {
                    $_('dashboard.settings.add_widget_submissions') || 'Add Submissions'
                  }
                </Button>
              {/if}
            </div>

            <Button
              variant="outline"
              size="sm"
              on:click={() => {
                  tempBottomLeftWidgets = [
                      { id: 'submissions', enabled: true },
                      { id: 'profile', enabled: true }
                  ];
                  toast.success(
                      $_('dashboard.settings.widgets_reset') || 'Widgets reset to default'
                  );
              }}
              disabled={!canCustomizeDashboard}
            >
              {$_('dashboard.settings.reset_widgets') || 'Reset to Default'}
            </Button>
          </div>
        </div>
      </div>
    </ScrollArea>
    <Dialog.Footer>
      <Button variant="outline" on:click={() => (open = false)}>
        {$_('general.cancel')}
      </Button>
      <Button on:click={saveDashboardSettings}>
        {$_('dashboard.settings.save')}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Shortcut Edit Dialog -->
<Dialog.Root bind:open={shortcutDialogOpen}>
  <Dialog.Content class="sm:max-w-[400px]">
    <Dialog.Header>
      <Dialog.Title>
        {
          editingShortcutIndex !== null
          ? $_('dashboard.settings.edit_shortcut')
          : $_('dashboard.settings.add_shortcut')
        }
      </Dialog.Title>
    </Dialog.Header>
    <div class="grid gap-4 py-4">
      <div class="grid gap-2">
        <Label for="shortcut-name">{
          $_('dashboard.settings.shortcut_name')
        }</Label>
        <Input
          id="shortcut-name"
          bind:value={editingShortcut.name}
          placeholder="YouTube"
        />
      </div>
      <div class="grid gap-2">
        <Label for="shortcut-url">{
          $_('dashboard.settings.shortcut_url')
        }</Label>
        <Input
          id="shortcut-url"
          bind:value={editingShortcut.url}
          placeholder="https://youtube.com"
        />
      </div>
      <div class="grid gap-2">
        <Label for="shortcut-icon">{
          $_('dashboard.settings.shortcut_icon')
        }</Label>
        <Input
          id="shortcut-icon"
          bind:value={editingShortcut.icon}
          placeholder="https://..."
        />
        <p class="text-xs text-muted-foreground">
          {
            $_('dashboard.settings.shortcut_icon_hint')
            || 'Leave empty to auto-generate from website'
          }
        </p>
      </div>
    </div>
    <Dialog.Footer>
      <Button variant="outline" on:click={() => (shortcutDialogOpen = false)}>
        {$_('general.cancel')}
      </Button>
      <Button on:click={saveShortcut}>
        {$_('general.save')}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
