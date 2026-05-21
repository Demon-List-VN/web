<script lang="ts">
	import { user } from '$lib/client';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Check, Copy, Megaphone, RefreshCw, Save, Trash2 } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { _ } from 'svelte-i18n';

	export let list: any = null;
	export let canViewAudit = false;
	export let canEditLevels = false;
	export let refreshKey = 0;
	export let formatDateTime: (value: string) => string = (value) => value;

	type ChangelogEntry = {
		id: number;
		auditLogId: number | null;
		sortOrder: number;
		snapshot: any;
	};

	type Changelog = {
		id: number;
		title: string;
		body: string;
		status: 'draft' | 'published';
		publishedAt?: string | null;
		publishMethod?: 'copy' | 'discord' | null;
		discordChannelId?: string | null;
		entries: ChangelogEntry[];
	};

	type ChangelogDiffMode = 'top' | 'rating';

	let loading = false;
	let saving = false;
	let settings: any = null;
	let changelogs: Changelog[] = [];
	let auditEntries: any[] = [];
	let activeChangelogId: number | null = null;
	let selectedAuditIds: number[] = [];
	let editorTitle = '';
	let editorBody = '';
	let changelogMode: ChangelogDiffMode = 'top';
	let changelogModeListId: number | null = null;
	let lastLoadedKey = '';

	$: loadKey = list ? `${list.id}:${refreshKey}:${$user.data?.uid ?? ''}` : '';
	$: if (list && changelogModeListId !== list.id) {
		changelogMode = list.mode === 'rating' ? 'rating' : 'top';
		changelogModeListId = list.id;
	}
	$: if (canViewAudit && loadKey && loadKey !== lastLoadedKey && !loading) {
		void loadBundle();
	}
	$: activeChangelog = changelogs.find((entry) => entry.id === activeChangelogId) ?? null;
	$: publishText = [editorTitle, editorBody].filter((value) => value.trim().length).join('\n\n');
	$: selectedAuditSet = new Set(selectedAuditIds);

	async function getAuthHeaders() {
		return {
			Authorization: `Bearer ${await $user.token()}`
		};
	}

	async function readPayload(response: Response) {
		const payload = await response.json().catch(() => null);
		if (!response.ok) {
			throw new Error(payload?.error || 'Failed to update changelog');
		}
		return payload;
	}

	function syncEditor(changelog: Changelog | null) {
		editorTitle = changelog?.title ?? '';
		editorBody = changelog?.body ?? '';
		selectedAuditIds = (changelog?.entries ?? [])
			.map((entry) => entry.auditLogId)
			.filter((auditLogId): auditLogId is number => typeof auditLogId === 'number');
	}

	async function loadBundle() {
		if (!list || !$user.loggedIn) return;
		const key = loadKey;
		lastLoadedKey = key;
		loading = true;

		try {
			const response = await fetch(`${import.meta.env.VITE_API_URL}/lists/${list.id}/changelogs`, {
				headers: await getAuthHeaders()
			});
			const payload = await readPayload(response);

			if (key !== lastLoadedKey) return;

			settings = payload.settings ?? null;
			changelogs = payload.changelogs ?? [];
			auditEntries = payload.auditEntries ?? [];
			const preferred =
				changelogs.find((entry) => entry.status === 'draft') ?? changelogs[0] ?? null;
			activeChangelogId = preferred?.id ?? null;
			syncEditor(preferred);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to load changelogs');
		} finally {
			loading = false;
		}
	}

	function getAuditMetadata(entry: any) {
		return entry?.metadata && typeof entry.metadata === 'object' ? entry.metadata : {};
	}

	function getActorName(entry: any) {
		return (
			entry.actorData?.name ||
			entry.actorUid ||
			$_('custom_lists.manage.collaboration.unknown_player')
		);
	}

	function getActionLabel(action: string) {
		if (action === 'level_added') return $_('custom_lists.manage.audit.level_added');
		if (action === 'level_updated') return $_('custom_lists.manage.audit.level_updated');
		if (action === 'level_removed') return $_('custom_lists.manage.audit.level_removed');
		if (action === 'levels_reordered') return $_('custom_lists.manage.audit.levels_reordered');
		return action.replaceAll('_', ' ');
	}

	function getAuditTitle(entry: any) {
		const metadata = getAuditMetadata(entry);
		const levelName = String(metadata.levelName ?? '').trim();
		const levelId = metadata.levelId ?? entry.id;

		if (entry.action === 'levels_reordered') {
			return $_('custom_lists.manage.audit.levels_reordered');
		}

		return levelName || `Level #${levelId}`;
	}

	function getAuditDetail(entry: any) {
		const metadata = getAuditMetadata(entry);
		const actor = getActorName(entry);

		if (entry.action === 'level_added') {
			return `${actor} added level #${metadata.levelId ?? '-'}.`;
		}

		if (entry.action === 'level_removed') {
			return `${actor} removed level #${metadata.levelId ?? '-'}.`;
		}

		if (entry.action === 'level_updated') {
			const fields = Array.isArray(metadata.fields) ? metadata.fields.join(', ') : '-';
			return `${actor} updated level #${metadata.levelId ?? '-'}: ${fields}.`;
		}

		return `${actor} reordered the list.`;
	}

	function toggleAuditSelection(auditLogId: number) {
		if (selectedAuditSet.has(auditLogId)) {
			selectedAuditIds = selectedAuditIds.filter((id) => id !== auditLogId);
		} else {
			selectedAuditIds = [...selectedAuditIds, auditLogId];
		}
	}

	function selectChangelog(changelog: Changelog) {
		activeChangelogId = changelog.id;
		syncEditor(changelog);
	}

	async function stageSelectedAuditEntries() {
		if (!list || !canEditLevels || !selectedAuditIds.length) return;
		saving = true;

		try {
			const response = await fetch(`${import.meta.env.VITE_API_URL}/lists/${list.id}/changelogs`, {
				method: 'POST',
				headers: {
					...(await getAuthHeaders()),
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					changelogId: activeChangelog?.status === 'draft' ? activeChangelog.id : undefined,
					auditLogIds: selectedAuditIds,
					mode: changelogMode
				})
			});
			const saved = await readPayload(response);
			toast.success($_('custom_lists.manage.changelog.staged'));
			await loadBundle();
			activeChangelogId = saved.id;
			const next = changelogs.find((entry) => entry.id === saved.id) ?? saved;
			syncEditor(next);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to stage changelog');
		} finally {
			saving = false;
		}
	}

	async function saveActiveChangelog(options: { regenerate?: boolean } = {}) {
		if (!list || !activeChangelog || !canEditLevels) return;
		if (options.regenerate && !confirm($_('custom_lists.manage.changelog.regenerate_confirm')))
			return;
		saving = true;

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/lists/${list.id}/changelogs/${activeChangelog.id}`,
				{
					method: 'PATCH',
					headers: {
						...(await getAuthHeaders()),
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						title: editorTitle,
						body: editorBody,
						auditLogIds: selectedAuditIds,
						regenerate: options.regenerate,
						mode: changelogMode
					})
				}
			);
			const saved = await readPayload(response);
			await loadBundle();
			activeChangelogId = saved.id;
			const next = changelogs.find((entry) => entry.id === saved.id) ?? saved;
			syncEditor(next);
			toast.success($_('custom_lists.manage.changelog.saved'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to save changelog');
		} finally {
			saving = false;
		}
	}

	async function removeAuditEntry(auditLogId: number) {
		selectedAuditIds = selectedAuditIds.filter((id) => id !== auditLogId);
		await saveActiveChangelog({ regenerate: true });
	}

	async function deleteActiveChangelog() {
		if (!list || !activeChangelog || !canEditLevels) return;
		if (!confirm($_('custom_lists.manage.changelog.delete_confirm'))) return;
		saving = true;

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/lists/${list.id}/changelogs/${activeChangelog.id}`,
				{
					method: 'DELETE',
					headers: await getAuthHeaders()
				}
			);

			if (!response.ok) {
				await readPayload(response);
			}

			toast.success($_('custom_lists.manage.changelog.deleted'));
			await loadBundle();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to delete changelog');
		} finally {
			saving = false;
		}
	}

	async function publish(method: 'copy' | 'discord') {
		if (!list || !activeChangelog || !canEditLevels) return;

		if (method === 'copy') {
			await navigator.clipboard.writeText(publishText);
		}

		saving = true;
		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/lists/${list.id}/changelogs/${activeChangelog.id}/publish`,
				{
					method: 'POST',
					headers: {
						...(await getAuthHeaders()),
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ method })
				}
			);
			const saved = await readPayload(response);
			toast.success(
				method === 'copy'
					? $_('custom_lists.manage.changelog.copied')
					: $_('custom_lists.manage.changelog.sent_discord')
			);
			await loadBundle();
			activeChangelogId = saved.id;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to publish changelog');
		} finally {
			saving = false;
		}
	}
</script>

<div class="tabContent">
	<section class="card">
		<header class="cardHead">
			<div>
				<h2 class="cardTitle">{$_('custom_lists.manage.changelog.heading')}</h2>
				<p class="hint">{$_('custom_lists.manage.changelog.hint')}</p>
			</div>
			<Button variant="outline" size="sm" on:click={loadBundle} disabled={loading}>
				<RefreshCw class="mr-2 h-4 w-4" />
				{$_('general.refresh')}
			</Button>
		</header>

		{#if loading}
			<p class="hint">{$_('general.loading')}...</p>
		{:else}
			<div class="layoutGrid">
				<div class="sidePanel">
					<div class="panelBlock">
						<h3>{$_('custom_lists.manage.changelog.audit_picker')}</h3>
						<div class="modePicker" aria-label="Changelog mode">
							<button
								type="button"
								class:selected={changelogMode === 'top'}
								on:click={() => (changelogMode = 'top')}
								disabled={saving}
							>
								Thay đổi top
							</button>
							<button
								type="button"
								class:selected={changelogMode === 'rating'}
								on:click={() => (changelogMode = 'rating')}
								disabled={saving}
							>
								Thay đổi rating
							</button>
						</div>
						{#if auditEntries.length}
							<div class="auditList">
								{#each auditEntries as entry}
									<button
										type="button"
										class="auditRow"
										class:selected={selectedAuditSet.has(entry.id)}
										on:click={() => toggleAuditSelection(entry.id)}
									>
										<div class="auditRowTop">
											<Badge variant="secondary">{getActionLabel(entry.action)}</Badge>
											<span>{formatDateTime(entry.created_at)}</span>
										</div>
										<strong>{getAuditTitle(entry)}</strong>
										<p>{getAuditDetail(entry)}</p>
									</button>
								{/each}
							</div>
						{:else}
							<p class="hint">{$_('custom_lists.manage.collaboration.audit_empty')}</p>
						{/if}
						<Button
							class="w-full"
							on:click={stageSelectedAuditEntries}
							disabled={!canEditLevels || saving || !selectedAuditIds.length}
						>
							<Check class="mr-2 h-4 w-4" />
							{$_('custom_lists.manage.changelog.stage_selected')}
						</Button>
					</div>
				</div>

				<div class="editorPanel">
					<div class="changelogList">
						{#each changelogs as changelog}
							<button
								type="button"
								class="changelogPill"
								class:selected={changelog.id === activeChangelogId}
								on:click={() => selectChangelog(changelog)}
							>
								<span>{changelog.title}</span>
								<Badge variant={changelog.status === 'published' ? 'secondary' : 'outline'}>
									{changelog.status}
								</Badge>
							</button>
						{/each}
					</div>

					{#if activeChangelog}
						<div class="editorFields">
							<div class="editorField">
								<label for="changelog-title"
									>{$_('custom_lists.manage.changelog.title_label')}</label
								>
								<Input
									id="changelog-title"
									bind:value={editorTitle}
									disabled={!canEditLevels || saving}
								/>
							</div>
							<div class="editorField">
								<label for="changelog-body">{$_('custom_lists.manage.changelog.body_label')}</label>
								<Textarea
									id="changelog-body"
									bind:value={editorBody}
									rows={16}
									disabled={!canEditLevels || saving}
								/>
							</div>
						</div>

						{#if activeChangelog.entries?.length}
							<div class="entryList">
								{#each activeChangelog.entries as entry}
									<div class="entryRow">
										<span>{getAuditTitle(entry.snapshot)}</span>
										<Button
											variant="ghost"
											size="sm"
											on:click={() => entry.auditLogId && removeAuditEntry(entry.auditLogId)}
											disabled={!canEditLevels || saving || !entry.auditLogId}
										>
											<Trash2 class="h-4 w-4" />
										</Button>
									</div>
								{/each}
							</div>
						{/if}

						<div class="actionRow">
							<Button
								variant="outline"
								on:click={() => saveActiveChangelog()}
								disabled={!canEditLevels || saving}
							>
								<Save class="mr-2 h-4 w-4" />
								{$_('custom_lists.manage.changelog.save')}
							</Button>
							<Button
								variant="outline"
								on:click={() => saveActiveChangelog({ regenerate: true })}
								disabled={!canEditLevels || saving}
							>
								<RefreshCw class="mr-2 h-4 w-4" />
								{$_('custom_lists.manage.changelog.regenerate')}
							</Button>
							<Button
								variant="outline"
								on:click={() => publish('copy')}
								disabled={!canEditLevels || saving || !publishText.trim()}
							>
								<Copy class="mr-2 h-4 w-4" />
								{$_('custom_lists.manage.changelog.copy_publish')}
							</Button>
							<Button
								on:click={() => publish('discord')}
								disabled={!canEditLevels ||
									saving ||
									!settings?.discordChannelId ||
									!publishText.trim()}
							>
								<Megaphone class="mr-2 h-4 w-4" />
								{$_('custom_lists.manage.changelog.discord_publish')}
							</Button>
							<Button
								variant="destructive"
								on:click={deleteActiveChangelog}
								disabled={!canEditLevels || saving}
							>
								<Trash2 class="mr-2 h-4 w-4" />
								{$_('general.delete')}
							</Button>
						</div>
					{:else}
						<div class="emptyState">
							<p>{$_('custom_lists.manage.changelog.empty')}</p>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</section>
</div>

<style lang="scss">
	.tabContent {
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin-top: 16px;
	}

	.card {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 14px;
		padding: 22px;
	}

	.cardHead {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 12px;
		margin-bottom: 16px;
	}

	.cardTitle {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
	}

	.hint,
	.auditRow p,
	.emptyState {
		margin: 0;
		color: hsl(var(--muted-foreground));
		font-size: 0.85rem;
	}

	.layoutGrid {
		display: grid;
		grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
		gap: 16px;
	}

	.sidePanel,
	.editorPanel,
	.panelBlock {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.panelBlock,
	.editorPanel {
		border: 1px solid hsl(var(--border));
		border-radius: 10px;
		padding: 14px;
	}

	.panelBlock h3 {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 600;
	}

	.modePicker {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 6px;
	}

	.modePicker button {
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		background: transparent;
		color: hsl(var(--foreground));
		cursor: pointer;
		font-size: 0.82rem;
		font-weight: 600;
		min-height: 36px;
		padding: 7px 9px;
	}

	.modePicker button.selected {
		border-color: hsl(var(--primary));
		background: hsl(var(--primary) / 0.1);
		color: hsl(var(--primary));
	}

	.auditList {
		display: flex;
		flex-direction: column;
		gap: 8px;
		max-height: 520px;
		overflow: auto;
	}

	.auditRow,
	.changelogPill {
		text-align: left;
		border: 1px solid hsl(var(--border));
		background: transparent;
		color: hsl(var(--foreground));
		border-radius: 8px;
		cursor: pointer;
	}

	.auditRow {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 10px;
	}

	.auditRow.selected,
	.changelogPill.selected {
		border-color: hsl(var(--primary));
		background: hsl(var(--primary) / 0.08);
	}

	.auditRowTop,
	.changelogPill,
	.entryRow,
	.actionRow {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.auditRowTop,
	.changelogPill {
		justify-content: space-between;
	}

	.auditRowTop span {
		color: hsl(var(--muted-foreground));
		font-size: 0.75rem;
	}

	.changelogList {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.changelogPill {
		padding: 8px 10px;
		max-width: 100%;
	}

	.changelogPill span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.editorFields {
		display: grid;
		gap: 12px;
	}

	.editorField {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.editorField label {
		font-size: 0.9rem;
		font-weight: 500;
	}

	.entryList {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.entryRow {
		justify-content: space-between;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		padding: 8px 10px;
		font-size: 0.85rem;
	}

	.actionRow {
		flex-wrap: wrap;
	}

	.emptyState {
		border: 1px dashed hsl(var(--border));
		border-radius: 10px;
		padding: 24px;
		text-align: center;
	}

	@media (max-width: 900px) {
		.layoutGrid {
			grid-template-columns: 1fr;
		}
	}
</style>
