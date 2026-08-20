<script lang="ts">
	import { user } from '$lib/client';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { locale } from 'svelte-i18n';
	import { Check, Globe2, Layers, Loader2, Search } from 'lucide-svelte';
	import { onMount } from 'svelte';

	type TargetList = {
		id: number;
		slug?: string | null;
		title: string;
		description?: string | null;
		isPlatformer?: boolean;
		levelSubmissionEnabled?: boolean;
		nonGlobalRecordsEnabled?: boolean;
		visibility?: string;
	};

	export let submissionType: 'record' | 'level';
	export let selectedIds: number[] = [];
	export let recordScope: 'global' | 'lists' = 'global';
	export let pinnedLists: TargetList[] = [];
	export let selectedLists: TargetList[] = [];

	const pageSize = 12;
	let lists: TargetList[] = [];
	let knownLists: TargetList[] = [];
	let search = '';
	let committedSearch = '';
	let offset = 0;
	let total = 0;
	let loading = false;
	let errorMessage = '';
	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	function t(vi: string, en: string) {
		return $locale == 'vi' ? vi : en;
	}

	function mergeKnown(next: TargetList[]) {
		const byId = new Map(knownLists.map((list) => [list.id, list]));

		for (const list of [...pinnedLists, ...next]) {
			byId.set(list.id, list);
		}

		knownLists = [...byId.values()];
	}

	async function loadLists() {
		loading = true;
		errorMessage = '';

		try {
			const params = new URLSearchParams({ limit: String(pageSize), offset: String(offset), acceptsSubmission: submissionType });

			if (committedSearch) {
				params.set('search', committedSearch);
			}

			const headers: HeadersInit = {};

			if ($user.loggedIn) {
				headers.Authorization = `Bearer ${await $user.token()}`;
			}

			const response = await fetch(`${import.meta.env.VITE_API_URL}/lists?${params}`, { headers });
			const payload = await response.json()
				.catch(() => null);

			if (!response.ok) {
				throw new Error(payload?.error || t('Không thể tải danh sách', 'Unable to load lists'));
			}

			lists = Array.isArray(payload?.data) ? payload.data : [];
			total = Number(payload?.total) || 0;
			mergeKnown(lists);
		} catch (error) {
			lists = [];
			errorMessage = error instanceof Error ? error.message : t('Không thể tải danh sách', 'Unable to load lists');
		} finally {
			loading = false;
		}
	}

	function scheduleSearch() {
		if (searchTimer) {
			clearTimeout(searchTimer);
		}

		searchTimer = setTimeout(() => {
			committedSearch = search.trim();
			offset = 0;
			void loadLists();
		}, 250);
	}

	function selectGlobal() {
		recordScope = 'global';
		selectedIds = [];
	}

	function toggleList(id: number) {
		if (recordScope === 'global') {
			recordScope = 'lists';
		}

		selectedIds = selectedIds.includes(id) ? selectedIds.filter((value) => value !== id) : [...selectedIds, id];
	}

	$: mergeKnown(pinnedLists);
	$: selectedLists = selectedIds.map((id) => knownLists.find((list) => list.id === id) || { id, title: `#${id}` });
	$: visibleLists = [...pinnedLists.filter((list) => selectedIds.includes(list.id)), ...lists]
		.filter((list, index, entries) => entries.findIndex((entry) => entry.id === list.id) === index);

	onMount(loadLists);
</script>

<div class="target-step">
  <header>
    <h2>{t('Chọn nơi nhận bài', 'Choose submission targets')}</h2>
    <p>{submissionType === 'level'
      ? t('Bạn có thể nộp cùng một level đến nhiều danh sách đang mở nhận bài.', 'You can submit the same level to multiple lists accepting submissions.')
      : t('Chọn Global hoặc một hay nhiều custom list.', 'Choose Global or one or more custom lists.')}</p>
  </header>

  {#if submissionType === 'record'}
    <div class="scope-grid">
      <button type="button" class:selected={recordScope === 'global'} on:click={selectGlobal}>
        <Globe2 size={20} /><span><strong>Global</strong><small>{t('Hợp lệ trên mọi list', 'Valid across every list')}</small></span>{#if recordScope === 'global'}<Check size={18} />{/if}
      </button>
      <button type="button" class:selected={recordScope === 'lists'} on:click={() => (recordScope = 'lists')}>
        <Layers size={20} /><span><strong>{t('List cụ thể', 'Specific lists')}</strong><small>{t('Chọn một hoặc nhiều list', 'Choose one or more lists')}</small></span>{#if recordScope === 'lists'}<Check size={18} />{/if}
      </button>
    </div>
  {/if}

  {#if submissionType === 'level' || recordScope === 'lists'}
    <div class="search-field"><Search size={16} /><Input bind:value={search} on:input={scheduleSearch} placeholder={t('Tìm danh sách...', 'Search lists...')} /></div>
    {#if errorMessage}
      <div class="state error">{errorMessage}</div>
    {:else if loading}
      <div class="state"><Loader2 size={18} class="spin" /> {t('Đang tải...', 'Loading...')}</div>
    {:else if visibleLists.length === 0}
      <div class="state">{t('Không tìm thấy danh sách đang nhận bài.', 'No accepting lists found.')}</div>
    {:else}
      <div class="list-grid">
        {#each visibleLists as list (list.id)}
          <button type="button" class:selected={selectedIds.includes(list.id)} on:click={() => toggleList(list.id)}>
            <span class="check">{#if selectedIds.includes(list.id)}<Check size={14} />{/if}</span>
            <span class="list-copy"><strong>{list.title}</strong><small>{list.isPlatformer ? 'Platformer' : 'Classic'}{list.description ? ` · ${list.description}` : ''}</small></span>
          </button>
        {/each}
      </div>
    {/if}
    {#if total > pageSize}
      <div class="pagination">
        <Button variant="outline" disabled={offset === 0 || loading} on:click={() => {
 offset = Math.max(0, offset - pageSize); void loadLists();
}}>{t('Trước', 'Previous')}</Button>
        <span>{Math.floor(offset / pageSize) + 1} / {Math.max(1, Math.ceil(total / pageSize))}</span>
        <Button variant="outline" disabled={offset + pageSize >= total || loading} on:click={() => {
 offset += pageSize; void loadLists();
}}>{t('Sau', 'Next')}</Button>
      </div>
    {/if}
  {/if}
</div>

<style lang="scss">
.target-step { display: grid; gap: 16px; }
header { text-align: center; } header h2 { font-size: 19px; font-weight: 700; } header p { margin: 5px auto 0; max-width: 500px; color: hsl(var(--muted-foreground)); font-size: 13px; line-height: 1.5; }
.scope-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.scope-grid button, .list-grid button { display: flex; align-items: center; gap: 10px; border: 1px solid hsl(var(--border)); border-radius: 10px; background: hsl(var(--background)); color: hsl(var(--foreground)); cursor: pointer; text-align: left; }
.scope-grid button { padding: 14px; } .scope-grid button > span { display: grid; flex: 1; } small { color: hsl(var(--muted-foreground)); font-size: 11px; font-weight: 400; }
button.selected { border-color: hsl(var(--primary)); background: hsl(var(--primary) / 0.06); }
.search-field { position: relative; } .search-field > :global(svg) { position: absolute; left: 11px; top: 11px; z-index: 1; color: hsl(var(--muted-foreground)); } .search-field :global(input) { padding-left: 36px; }
.list-grid { display: grid; gap: 8px; } .list-grid button { width: 100%; padding: 12px; }
.check { display: grid; place-items: center; width: 20px; height: 20px; border: 1px solid hsl(var(--border)); border-radius: 5px; flex: 0 0 auto; } button.selected .check { background: hsl(var(--primary)); border-color: hsl(var(--primary)); color: hsl(var(--primary-foreground)); }
.list-copy { min-width: 0; display: grid; gap: 3px; } .list-copy small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.state { display: flex; justify-content: center; align-items: center; gap: 8px; padding: 28px; color: hsl(var(--muted-foreground)); font-size: 13px; border: 1px dashed hsl(var(--border)); border-radius: 10px; } .state.error { color: hsl(var(--destructive)); }
.pagination { display: flex; align-items: center; justify-content: center; gap: 12px; } .pagination span { color: hsl(var(--muted-foreground)); font-size: 12px; }
:global(.spin) { animation: spin 0.8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 560px) { .scope-grid { grid-template-columns: 1fr; } }
</style>
