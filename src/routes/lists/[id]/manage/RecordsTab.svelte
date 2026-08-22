<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { user } from '$lib/client';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { _ } from 'svelte-i18n';
	import {
		CheckCircle2,
		ChevronLeft,
		ChevronRight,
		Clock3,
		ExternalLink,
		FileVideo2,
		Monitor,
		Search,
		Smartphone,
		User,
		Video,
		XCircle
	} from 'lucide-svelte';

	type RecordStatus = 'all' | 'pending' | 'accepted' | 'rejected';
	type TargetedRecord = {
		id: number;
		userid: string;
		levelid: number;
		progress: number;
		refreshRate: number | null;
		videoLink: string | null;
		raw: string | null;
		mobile: boolean;
		suggestedRating: number | null;
		comment: string | null;
		timestamp: number | null;
		acceptedManually: boolean | null;
		acceptedAuto: boolean;
		rejectedAt: string | null;
		reviewer: string | null;
		reviewerComment: string | null;
		level?: {
			id: number;
			name: string | null;
			creator: string | null;
			isPlatformer: boolean;
		} | null;
		playerData?: { uid: string; name?: string | null; } | null;
		reviewerData?: { uid: string; name?: string | null; } | null;
	};

	export let listId: number;
	export let canReviewRecords = false;
	export let savingRecordId: number | null = null;
	export let reviewRecord: (
		record: TargetedRecord,
		payload: { accept: boolean; reason?: string; }
	) => Promise<boolean> = async () => false;

	const pageSize = 50;
	const statusOptions: RecordStatus[] = ['all', 'pending', 'accepted', 'rejected'];
	let records: TargetedRecord[] = [];
	let total = 0;
	let page = 1;
	let status: RecordStatus = 'all';
	let searchQuery = '';
	let loading = true;
	let errorMessage = '';
	let requestController: AbortController | null = null;
	let rejectionDialogOpen = false;
	let activeRecord: TargetedRecord | null = null;
	let rejectionReason = '';

	$: pageCount = Math.max(1, Math.ceil(total / pageSize));
	$: visibleRecords = records.filter((record) => {
		const query = searchQuery.trim()
			.toLowerCase();

		if (!query) {
			return true;
		}

		return [
			record.id,
			record.levelid,
			record.userid,
			record.level?.name,
			record.level?.creator,
			record.playerData?.name
		].some((value) => String(value ?? '')
			.toLowerCase()
			.includes(query));
	});

	function recordStatus(record: TargetedRecord): Exclude<RecordStatus, 'all'> {
		if (record.rejectedAt) {
			return 'rejected';
		}

		if (record.acceptedManually || record.acceptedAuto) {
			return 'accepted';
		}

		return 'pending';
	}

	function getLevelName(record: TargetedRecord) {
		return record.level?.name?.trim() || `Level #${record.levelid}`;
	}

	function getPlayerName(record: TargetedRecord) {
		return record.playerData?.name?.trim() || record.userid;
	}

	function getRecordHref(record: TargetedRecord) {
		return `/record/${record.userid}/${record.levelid}?id=${record.id}`;
	}

	function formatDate(timestamp: number | null) {
		return timestamp
			? new Date(timestamp)
				.toLocaleString()
			: $_('custom_lists.manage.pending_records.unknown_date');
	}

	function formatPlatformerTime(progress: number) {
		const totalMilliseconds = Math.max(0, Math.round(Number(progress) || 0));
		const minutes = Math.floor(totalMilliseconds / 60000);
		const seconds = Math.floor((totalMilliseconds % 60000) / 1000);
		const milliseconds = totalMilliseconds % 1000;

		return `${minutes}:${String(seconds)
			.padStart(2, '0')}.${String(milliseconds)
			.padStart(3, '0')}`;
	}

	function formatProgress(record: TargetedRecord) {
		return record.level?.isPlatformer
			? formatPlatformerTime(record.progress)
			: `${record.progress}%`;
	}

	async function loadRecords() {
		requestController?.abort();
		requestController = new AbortController();
		const currentController = requestController;
		loading = true;
		errorMessage = '';

		try {
			const params = new URLSearchParams({
				limit: String(pageSize),
				offset: String((page - 1) * pageSize),
				status
			});
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/lists/${listId}/targeted-records?${params}`,
				{
					cache: 'no-store',
					signal: currentController.signal,
					headers: { Authorization: `Bearer ${await $user.token()}` }
				}
			);
			const payload = await response.json()
				.catch(() => null);

			if (!response.ok) {
				throw new Error(
					payload?.error
					|| $_('custom_lists.manage.targeted_records.load_failed')
				);
			}

			if (requestController !== currentController) {
				return;
			}

			records = Array.isArray(payload?.records) ? payload.records : [];
			total = Number(payload?.total) || 0;

			if (page > Math.max(1, Math.ceil(total / pageSize))) {
				page = Math.max(1, Math.ceil(total / pageSize));
				await loadRecords();
			}
		} catch (error) {
			if ((error as any)?.name === 'AbortError') {
				return;
			}

			if (requestController === currentController) {
				records = [];
				total = 0;
				errorMessage = error instanceof Error
					? error.message
					: $_('custom_lists.manage.targeted_records.load_failed');
			}
		} finally {
			if (requestController === currentController) {
				loading = false;
				requestController = null;
			}
		}
	}

	async function selectStatus(nextStatus: RecordStatus) {
		status = nextStatus;
		page = 1;
		await loadRecords();
	}

	async function changePage(nextPage: number) {
		page = Math.max(1, Math.min(pageCount, nextPage));
		await loadRecords();
	}

	async function acceptRecord(record: TargetedRecord) {
		if (!confirm($_('custom_lists.manage.pending_records.accept_confirm'))) {
			return;
		}

		if (await reviewRecord(record, { accept: true })) {
			await loadRecords();
		}
	}

	function openRejectionDialog(record: TargetedRecord) {
		activeRecord = record;
		rejectionReason = '';
		rejectionDialogOpen = true;
	}

	async function rejectRecord() {
		if (!activeRecord) {
			return;
		}

		if (await reviewRecord(activeRecord, {
			accept: false,
			reason: rejectionReason.trim()
		})) {
			rejectionDialogOpen = false;
			activeRecord = null;
			rejectionReason = '';
			await loadRecords();
		}
	}

	onMount(loadRecords);
	onDestroy(() => requestController?.abort());
</script>

<div class="tabContent">
  <section class="toolCard">
    <div class="headerRow">
      <div>
        <h2>{$_('custom_lists.manage.targeted_records.heading')}</h2>
        <p>{$_('custom_lists.manage.targeted_records.hint')}</p>
      </div>
      <Badge variant="secondary">{total}</Badge>
    </div>

    <div class="toolbar">
      <div class="statusTabs" aria-label={$_('custom_lists.manage.targeted_records.status_filter')}>
        {#each statusOptions as item}
          <button
            type="button"
            class:active={status === item}
            on:click={() => selectStatus(item)}
          >
            {$_(`custom_lists.manage.targeted_records.status_${item}`)}
          </button>
        {/each}
      </div>
      <label class="searchField">
        <Search size={15} />
        <input
          bind:value={searchQuery}
          placeholder={$_('custom_lists.manage.targeted_records.search_placeholder')}
        />
      </label>
    </div>

    {#if loading}
      <div class="state">{$_('custom_lists.manage.targeted_records.loading')}</div>
    {:else if errorMessage}
      <div class="state errorState">
        <span>{errorMessage}</span>
        <Button variant="outline" size="sm" on:click={loadRecords}>{$_('general.retry')}</Button>
      </div>
    {:else if visibleRecords.length === 0}
      <div class="state">{
        searchQuery.trim()
          ? $_('custom_lists.manage.targeted_records.no_search_results')
          : $_('custom_lists.manage.targeted_records.empty')
      }</div>
    {:else}
      <div class="recordList">
        {#each visibleRecords as record (record.id)}
          <article class="recordCard">
            <div class="recordTop">
              <div>
                <div class="recordTitle">
                  <a href={getRecordHref(record)}>{getLevelName(record)}</a>
                  <Badge variant="outline">#{record.levelid}</Badge>
                </div>
                <span class="creator">{record.level?.creator || `Record #${record.id}`}</span>
              </div>
              <span class="statusBadge {recordStatus(record)}">
                {$_(`custom_lists.manage.targeted_records.status_${recordStatus(record)}`)}
              </span>
            </div>

            <div class="metaChips">
              <a class="chip" href={`/player/${record.userid}`}>
                <User size={12} /> {getPlayerName(record)}
              </a>
              <span class="chip">
                {#if record.mobile}<Smartphone size={12} /> Mobile{:else}<Monitor size={12} /> PC{/if}
              </span>
              <span class="chip">{formatProgress(record)}</span>
              {#if record.refreshRate != null}<span class="chip">{record.refreshRate} FPS</span>{/if}
              <span class="chip"><Clock3 size={12} /> {formatDate(record.timestamp)}</span>
              {#if record.reviewerData}
                <span class="chip">{$_('custom_lists.manage.targeted_records.reviewed_by')}: {record.reviewerData.name || record.reviewerData.uid}</span>
              {/if}
            </div>

            {#if record.comment || record.reviewerComment}
              <div class="notes">
                {#if record.comment}<p><strong>{$_('custom_lists.manage.targeted_records.submitter_note')}:</strong> {record.comment}</p>{/if}
                {#if record.reviewerComment}<p><strong>{$_('custom_lists.manage.targeted_records.reviewer_note')}:</strong> {record.reviewerComment}</p>{/if}
              </div>
            {/if}

            <div class="recordFooter">
              <div class="links">
                <a href={getRecordHref(record)} target="_blank" rel="noreferrer"><ExternalLink size={14} />{$_('custom_lists.manage.pending_records.open_record')}</a>
                {#if record.videoLink}<a href={record.videoLink} target="_blank" rel="noreferrer"><Video size={14} />{$_('custom_lists.manage.pending_records.completion_video')}</a>{/if}
                {#if record.raw}<a href={record.raw} target="_blank" rel="noreferrer"><FileVideo2 size={14} />{$_('custom_lists.manage.pending_records.raw_video')}</a>{/if}
              </div>
              {#if canReviewRecords && recordStatus(record) === 'pending'}
                <div class="actions">
                  <Button variant="outline" size="sm" disabled={savingRecordId !== null} on:click={() => openRejectionDialog(record)}><XCircle size={15} />{$_('custom_lists.manage.pending_records.reject')}</Button>
                  <Button size="sm" disabled={savingRecordId !== null} on:click={() => acceptRecord(record)}><CheckCircle2 size={15} />{$_('custom_lists.manage.pending_records.accept')}</Button>
                </div>
              {/if}
            </div>
          </article>
        {/each}
      </div>
    {/if}

    <div class="pagination">
      <span>{$_('custom_lists.manage.targeted_records.page_summary', { values: { page, pages: pageCount, total } })}</span>
      <div>
        <Button variant="outline" size="sm" disabled={loading || page <= 1} on:click={() => changePage(page - 1)}><ChevronLeft size={15} />{$_('general.previous')}</Button>
        <Button variant="outline" size="sm" disabled={loading || page >= pageCount} on:click={() => changePage(page + 1)}>{$_('general.next')}<ChevronRight size={15} /></Button>
      </div>
    </div>
  </section>
</div>

<Dialog.Root bind:open={rejectionDialogOpen}>
  <Dialog.Content class="max-w-[560px]">
    <Dialog.Header>
      <Dialog.Title>{$_('custom_lists.manage.pending_records.reject_title')}</Dialog.Title>
      <Dialog.Description>{$_('custom_lists.manage.pending_records.reject_description')}</Dialog.Description>
    </Dialog.Header>
    <div class="dialogBody">
      {#if activeRecord}
        <div class="dialogSummary"><Badge variant="secondary">#{activeRecord.levelid}</Badge><strong>{getLevelName(activeRecord)}</strong><span>{getPlayerName(activeRecord)}</span></div>
      {/if}
      <Label for="targeted-record-rejection-reason">{$_('custom_lists.manage.pending_records.reason_label')}</Label>
      <Textarea id="targeted-record-rejection-reason" bind:value={rejectionReason} rows={4} maxlength={1000} placeholder={$_('custom_lists.manage.pending_records.reason_placeholder')} />
    </div>
    <Dialog.Footer class="gap-2">
      <Button variant="outline" disabled={savingRecordId !== null} on:click={() => (rejectionDialogOpen = false)}>{$_('custom_lists.manage.pending_records.cancel')}</Button>
      <Button variant="destructive" disabled={!activeRecord || savingRecordId !== null} on:click={rejectRecord}><XCircle size={15} />{$_('custom_lists.manage.pending_records.confirm_reject')}</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<style lang="scss">
.tabContent { display: grid; gap: 20px; }
.toolCard { display: grid; gap: 18px; padding: 22px; border: 1px solid hsl(var(--border)); border-radius: 12px; background: hsl(var(--card)); }
.headerRow,.recordTop,.recordFooter,.pagination { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.headerRow h2 { margin: 0; font-size: 1.1rem; font-weight: 700; }
.headerRow p,.creator,.pagination>span { margin: 4px 0 0; color: hsl(var(--muted-foreground)); font-size: .78rem; }
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.statusTabs { display: flex; flex-wrap: wrap; gap: 5px; }
.statusTabs button { padding: 7px 11px; border-radius: 8px; color: hsl(var(--muted-foreground)); font-size: .75rem; font-weight: 650; }
.statusTabs button:hover,.statusTabs button.active { background: hsl(var(--muted)); color: hsl(var(--foreground)); }
.searchField { display: flex; align-items: center; gap: 7px; width: min(280px,100%); padding: 8px 10px; border: 1px solid hsl(var(--border)); border-radius: 9px; color: hsl(var(--muted-foreground)); }
.searchField input { min-width: 0; width: 100%; border: 0; outline: 0; background: transparent; color: hsl(var(--foreground)); font-size: .8rem; }
.recordList { display: grid; gap: 10px; }
.recordCard { display: grid; gap: 11px; padding: 15px; border: 1px solid hsl(var(--border)); border-radius: 12px; background: hsl(var(--background)/.3); }
.recordTitle,.metaChips,.links,.actions,.pagination>div,.dialogSummary { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; }
.recordTitle a { font-weight: 700; }
.recordTitle a:hover { text-decoration: underline; }
.statusBadge { padding: 4px 8px; border-radius: 999px; font-size: .68rem; font-weight: 750; }
.statusBadge.pending { color: #d99831; background: color-mix(in srgb,#d99831 13%,transparent); }
.statusBadge.accepted { color: #2aaa78; background: color-mix(in srgb,#2aaa78 13%,transparent); }
.statusBadge.rejected { color: hsl(var(--destructive)); background: hsl(var(--destructive)/.1); }
.chip,.links a { display: inline-flex; align-items: center; gap: 5px; padding: 4px 8px; border-radius: 999px; background: hsl(var(--muted)/.55); color: hsl(var(--muted-foreground)); font-size: .72rem; }
.links a { color: hsl(var(--foreground)); }
.notes { display: grid; gap: 5px; padding: 10px 12px; border-left: 3px solid hsl(var(--primary)/.45); border-radius: 8px; background: hsl(var(--muted)/.28); }
.notes p { margin: 0; font-size: .78rem; white-space: pre-wrap; }
.recordFooter { align-items: center; }
.actions :global(button),.pagination :global(button),:global(.dialogBody button) { display: inline-flex; gap: 6px; }
.state { padding: 38px 15px; border: 1px dashed hsl(var(--border)); border-radius: 11px; text-align: center; color: hsl(var(--muted-foreground)); }
.errorState { display: grid; justify-items: center; gap: 10px; color: hsl(var(--destructive)); }
.pagination { align-items: center; padding-top: 4px; }
.dialogBody { display: grid; gap: 10px; }
.dialogSummary { padding: 11px; border: 1px solid hsl(var(--border)); border-radius: 10px; }
.dialogSummary span { color: hsl(var(--muted-foreground)); font-size: .78rem; }
@media(max-width:720px) { .toolbar,.recordFooter,.pagination { align-items: stretch; flex-direction: column; } .searchField { width: 100%; } .actions { width: 100%; } .actions :global(button) { flex: 1; } }
</style>
