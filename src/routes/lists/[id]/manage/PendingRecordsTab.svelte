<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { _ } from 'svelte-i18n';
	import {
		CheckCircle2,
		Clock3,
		ExternalLink,
		FileVideo2,
		MessageSquareText,
		Monitor,
		Smartphone,
		User,
		Video,
		XCircle
	} from 'lucide-svelte';

	type PendingRecord = {
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
		level?: {
			id: number;
			name: string | null;
			creator: string | null;
			isPlatformer: boolean;
		} | null;
		playerData?: {
			uid: string;
			name?: string | null;
		} | null;
	};

	export let records: PendingRecord[] = [];
	export let loading = false;
	export let errorMessage = '';
	export let savingRecordId: number | null = null;
	export let reviewRecord: (
		record: PendingRecord,
		payload: { accept: boolean; reason?: string; }
	) => Promise<boolean> = async () => false;

	let rejectionDialogOpen = false;
	let activeRecord: PendingRecord | null = null;
	let rejectionReason = '';

	function getLevelName(record: PendingRecord) {
		return record.level?.name?.trim() || `Level #${record.levelid}`;
	}

	function getPlayerName(record: PendingRecord) {
		return record.playerData?.name?.trim() || record.userid;
	}

	function formatDate(timestamp: number | null) {
		if (!timestamp) {
			return $_('custom_lists.manage.pending_records.unknown_date');
		}

		return new Date(timestamp)
			.toLocaleString(undefined, {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
	}

	function formatPlatformerTime(progress: number) {
		const total = Math.max(0, Math.round(Number(progress) || 0));
		const minutes = Math.floor(total / 60000);
		const seconds = Math.floor((total % 60000) / 1000);
		const milliseconds = total % 1000;

		return `${minutes}:${String(seconds)
			.padStart(2, '0')}.${
			String(milliseconds)
				.padStart(3, '0')
		}`;
	}

	function formatProgress(record: PendingRecord) {
		return record.level?.isPlatformer
			? formatPlatformerTime(record.progress)
			: `${record.progress}%`;
	}

	function getRecordHref(record: PendingRecord) {
		return `/record/${record.userid}/${record.levelid}?id=${record.id}`;
	}

	async function acceptRecord(record: PendingRecord) {
		if (!confirm($_('custom_lists.manage.pending_records.accept_confirm'))) {
			return;
		}

		await reviewRecord(record, { accept: true });
	}

	function openRejectionDialog(record: PendingRecord) {
		activeRecord = record;
		rejectionReason = '';
		rejectionDialogOpen = true;
	}

	async function rejectRecord() {
		if (!activeRecord) {
			return;
		}

		const reviewed = await reviewRecord(activeRecord, {
			accept: false,
			reason: rejectionReason.trim()
		});

		if (reviewed) {
			rejectionDialogOpen = false;
			activeRecord = null;
			rejectionReason = '';
		}
	}
</script>

<div class="tabContent">
  <div class="toolCard queueCard">
    <div class="queueHeader">
      <div>
        <h2 class="toolHeading">{
          $_('custom_lists.manage.pending_records.heading')
        }</h2>
        <p class="hint">{$_('custom_lists.manage.pending_records.hint')}</p>
      </div>
      <Badge variant="secondary">{records.length}</Badge>
    </div>

    {#if loading}
      <p class="hint">{$_('custom_lists.manage.pending_records.loading')}</p>
    {:else if errorMessage}
      <p class="queueError">{errorMessage}</p>
    {:else if records.length === 0}
      <p class="hint">{$_('custom_lists.manage.pending_records.empty')}</p>
    {:else}
      <div class="queueList">
        {#each records as record}
          <article class="queueItem">
            <div class="queueItemTop">
              <div class="recordHeading">
                <h3>{getLevelName(record)}</h3>
                <Badge variant="outline">#{record.levelid}</Badge>
              </div>
              <Badge variant="secondary" class="statusBadge">
                <Clock3 size={12} class="mr-1" />
                {$_('custom_lists.manage.pending_records.pending')}
              </Badge>
            </div>

            {#if record.level?.creator}
              <p class="creatorLine">
                {$_('custom_lists.manage.pending_records.created_by')}
                <strong>{record.level.creator}</strong>
              </p>
            {/if}

            <div class="metaChips">
              <a class="chip chipLink" href={`/player/${record.userid}`}>
                <User size={12} />
                {getPlayerName(record)}
              </a>
              <span class="chip">
                {#if record.mobile}
                  <Smartphone size={12} />
                  Mobile
                {:else}
                  <Monitor size={12} />
                  PC
                {/if}
              </span>
              <span class="chip">{formatProgress(record)}</span>
              {#if record.refreshRate != null}
                <span class="chip">{record.refreshRate} FPS</span>
              {/if}
              <span class="chip">
                <Clock3 size={12} />
                {formatDate(record.timestamp)}
              </span>
              {#if record.suggestedRating != null}
                <span class="chip">
                  {$_('custom_lists.manage.pending_records.suggested_rating')}:
                  {record.suggestedRating}
                </span>
              {/if}
            </div>

            {#if record.comment}
              <div class="commentBlock">
                <MessageSquareText size={14} class="commentIcon" />
                <p>{record.comment}</p>
              </div>
            {/if}

            <div class="recordLinks">
              <a href={getRecordHref(record)} target="_blank" rel="noreferrer">
                <ExternalLink size={14} />
                {$_('custom_lists.manage.pending_records.open_record')}
              </a>
              {#if record.videoLink}
                <a href={record.videoLink} target="_blank" rel="noreferrer">
                  <Video size={14} />
                  {$_('custom_lists.manage.pending_records.completion_video')}
                </a>
              {/if}
              {#if record.raw}
                <a href={record.raw} target="_blank" rel="noreferrer">
                  <FileVideo2 size={14} />
                  {$_('custom_lists.manage.pending_records.raw_video')}
                </a>
              {/if}
            </div>

            <div class="queueItemActions">
              <Button
                variant="outline"
                size="sm"
                on:click={() => openRejectionDialog(record)}
                disabled={savingRecordId !== null}
              >
                <XCircle class="mr-2 h-4 w-4" />
                {$_('custom_lists.manage.pending_records.reject')}
              </Button>
              <Button
                size="sm"
                on:click={() => acceptRecord(record)}
                disabled={savingRecordId !== null}
              >
                <CheckCircle2 class="mr-2 h-4 w-4" />
                {$_('custom_lists.manage.pending_records.accept')}
              </Button>
            </div>
          </article>
        {/each}
      </div>
    {/if}
  </div>
</div>

<Dialog.Root bind:open={rejectionDialogOpen}>
  <Dialog.Content class="max-w-[560px]">
    <Dialog.Header>
      <Dialog.Title>{$_('custom_lists.manage.pending_records.reject_title')}</Dialog.Title>
      <Dialog.Description>
        {$_('custom_lists.manage.pending_records.reject_description')}
      </Dialog.Description>
    </Dialog.Header>

    <div class="dialogBody">
      {#if activeRecord}
        <div class="summaryCard">
          <Badge variant="secondary">#{activeRecord.levelid}</Badge>
          <strong>{getLevelName(activeRecord)}</strong>
          <span>{getPlayerName(activeRecord)}</span>
        </div>
      {/if}
      <div class="field">
        <Label for="record-rejection-reason">{
          $_('custom_lists.manage.pending_records.reason_label')
        }</Label>
        <Textarea
          id="record-rejection-reason"
          bind:value={rejectionReason}
          rows={4}
          maxlength={1000}
          placeholder={$_('custom_lists.manage.pending_records.reason_placeholder')}
        />
      </div>
    </div>

    <Dialog.Footer class="gap-2">
      <Button
        variant="outline"
        on:click={() => (rejectionDialogOpen = false)}
        disabled={savingRecordId !== null}
      >
        {$_('custom_lists.manage.pending_records.cancel')}
      </Button>
      <Button
        variant="destructive"
        on:click={rejectRecord}
        disabled={activeRecord == null || savingRecordId !== null}
      >
        <XCircle class="mr-2 h-4 w-4" />
        {$_('custom_lists.manage.pending_records.confirm_reject')}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<style lang="scss">
.tabContent {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.queueCard,
.dialogBody {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.queueHeader,
.queueItemTop {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.queueList {
  display: grid;
  gap: 12px;
}

.queueItem {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border: 1px solid hsl(var(--border));
  border-radius: 14px;
  background: hsl(var(--card));
}

.recordHeading {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    line-height: 1.3;
    word-break: break-word;
  }
}

.creatorLine,
.queueError {
  margin: 0;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.creatorLine strong {
  color: hsl(var(--foreground));
  font-weight: 500;
}

.queueError {
  color: hsl(var(--destructive));
}

.metaChips,
.recordLinks {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip,
.recordLinks a {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 999px;
  background: hsl(var(--muted) / 0.6);
  color: hsl(var(--muted-foreground));
  font-size: 11.5px;
  line-height: 1.4;
}

.chipLink,
.recordLinks a {
  color: hsl(var(--foreground));
  text-decoration: none;
}

.chipLink:hover,
.recordLinks a:hover {
  background: hsl(var(--muted));
}

.commentBlock {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-left: 3px solid hsl(var(--primary) / 0.5);
  border-radius: 10px;
  background: hsl(var(--muted) / 0.35);

  p {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  }
}

:global(.commentIcon) {
  flex-shrink: 0;
  margin-top: 2px;
  color: hsl(var(--muted-foreground));
}

.queueItemActions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.summaryCard {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  background: hsl(var(--muted) / 0.2);

  span:last-child {
    color: hsl(var(--muted-foreground));
    font-size: 13px;
  }
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

@media (max-width: 640px) {
  .queueItemTop {
    flex-direction: column;
  }

  .queueItemActions :global(button) {
    flex: 1;
  }
}
</style>
