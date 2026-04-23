<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import { isActive } from '$lib/client/isSupporterActive';
	import { Plus, Save, Trash2 } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';

	type CollaboratorRole = 'admin' | 'helper';

	export let list: any = null;
	export let savingCollaboration = false;
	export let canConfigureCollaboration = false;
	export let canViewMembers = false;
	export let canManageMembers = false;
	export let canTransferOwnership = false;
	export let canViewAudit = false;

	export let updateCollaborationSettings: (adminsCanManageHelpers: boolean) => void | Promise<void> = async () => {};
	export let searchPlayersForCollaboration: (query: string) => any[] | Promise<any[]> = async () => [];
	export let addCollaborator: (player: any, role: CollaboratorRole) => void | Promise<void> = async () => {};
	export let updateCollaboratorRole: (member: any, role: CollaboratorRole) => void | Promise<void> = async () => {};
	export let transferOwnership: (player: any) => void | Promise<void> = async () => {};
	export let removeCollaborator: (member: any) => void | Promise<void> = async () => {};
	export let getRoleLabel: (role: CollaboratorRole | string) => string = () => '';
	export let formatDate: (value: string) => string = () => '';
	export let formatDateTime: (value: string) => string = () => '';

	let adminsCanManageHelpers = false;
	let memberSearchLoading = false;
	let memberSearchQuery = '';
	let memberSearchResults: any[] = [];
	let selectedMember: any | null = null;
	let collaboratorRole: CollaboratorRole = 'helper';
	let auditDetailEntry: any = null;
	let showAuditDetailDialog = false;

	function openAuditDetail(entry: any) {
		auditDetailEntry = entry;
		showAuditDetailDialog = true;
	}

	function getAuditChangeFields(entry: any): string[] {
		const metadata = entry?.metadata && typeof entry.metadata === 'object' ? entry.metadata : {};
		if (metadata.changes && typeof metadata.changes === 'object') {
			return Object.keys(metadata.changes);
		}
		if (Array.isArray(metadata.fields)) {
			return metadata.fields.map((field: unknown) => String(field));
		}
		return [];
	}

	function auditEntryHasChangeDetails(entry: any) {
		const metadata = entry?.metadata && typeof entry.metadata === 'object' ? entry.metadata : {};
		return Boolean(metadata.changes && typeof metadata.changes === 'object' && Object.keys(metadata.changes).length);
	}

	$: if (list) {
		adminsCanManageHelpers = Boolean(list.adminsCanManageHelpers);
	}

	$: selectedExistingMember = selectedMember?.uid ? getMemberByUid(selectedMember.uid) : null;

	function getPlayerName(player: any, fallbackUid?: string | null) {
		return player?.name || fallbackUid || $_('custom_lists.manage.collaboration.unknown_player');
	}

	function getMemberByUid(uid: string | null | undefined) {
		if (!uid || !list?.members) {
			return null;
		}

		return list.members.find((member: any) => member.uid === uid) ?? null;
	}

	function getAvatarSrc(player: any) {
		if (!player?.uid) {
			return '';
		}

		const extension = isActive(player.supporterUntil) && player.isAvatarGif ? '.gif' : '.jpg';
		const version = player.avatarVersion ?? 0;
		return `https://cdn.gdvn.net/avatars/${player.uid}${extension}?version=${version}`;
	}

	function getAvatarFallback(player: any) {
		const label = getPlayerName(player, player?.uid).trim();
		return label ? label[0].toUpperCase() : '?';
	}

	function humanizeAuditField(field: string) {
		if (field === 'title') return $_('custom_lists.detail.edit.title_label');
		if (field === 'description') return $_('custom_lists.detail.edit.description_label');
		if (field === 'backgroundColor') return $_('custom_lists.detail.edit.background_color_label');
		if (field === 'bannerUrl') return $_('custom_lists.detail.edit.banner_url_label');
		if (field === 'borderColor') return $_('custom_lists.detail.edit.border_color_label');
		if (field === 'communityEnabled') return $_('custom_lists.detail.edit.community_label');
		if (field === 'faviconUrl') return $_('custom_lists.detail.edit.favicon_url_label');
		if (field === 'isPlatformer') return $_('custom_lists.detail.edit.type_label');
		if (field === 'levelSubmissionEnabled') return $_('custom_lists.detail.edit.level_submission_label');
		if (field === 'logoUrl') return $_('custom_lists.detail.edit.logo_url_label');
		if (field === 'mode') return $_('custom_lists.detail.edit.mode_label');
		if (field === 'rankBadges') return $_('custom_lists.detail.edit.rank_badges_label');
		if (field === 'slug') return $_('custom_lists.detail.edit.slug_label');
		if (field === 'tags') return $_('custom_lists.detail.edit.tags_label');
		if (field === 'topEnabled') return $_('custom_lists.detail.edit.top_enabled_label');
		if (field === 'visibility') return $_('custom_lists.detail.edit.visibility_label');
		if (field === 'weightFormula') return $_('custom_lists.formula.label');
		if (field === 'adminsCanManageHelpers') return $_('custom_lists.manage.collaboration.admin_helper_toggle_label');
		return field;
	}

	function formatAuditFieldValue(field: string, value: unknown) {
		if (value == null || value === '') {
			return '-';
		}

		if (field === 'visibility' && typeof value === 'string') {
			if (value === 'public') return $_('custom_lists.visibility.public');
			if (value === 'unlisted') return $_('custom_lists.visibility.unlisted');
			return $_('custom_lists.visibility.private');
		}

		if (field === 'mode' && typeof value === 'string') {
			return value === 'rating'
				? $_('custom_lists.detail.edit.mode_rating')
				: $_('custom_lists.detail.edit.mode_top');
		}

		if (field === 'isPlatformer' && typeof value === 'boolean') {
			return value ? $_('custom_lists.type.platformer') : $_('custom_lists.type.classic');
		}

		if (
			(field === 'communityEnabled' || field === 'topEnabled' || field === 'levelSubmissionEnabled' || field === 'adminsCanManageHelpers')
			&& typeof value === 'boolean'
		) {
			return value ? $_('general.yes') : $_('general.no');
		}

		if (field === 'tags' && Array.isArray(value)) {
			return value.length ? value.join(', ') : '-';
		}

		if (typeof value === 'object') {
			return JSON.stringify(value);
		}

		return String(value);
	}

	function getAuditChangeSummary(metadata: Record<string, any>) {
		if (!metadata.changes || typeof metadata.changes !== 'object') {
			return '';
		}

		return Object.entries(metadata.changes)
			.map(([field, change]) => {
				const previousValue = getAuditChangeValue(change, 'old');
				const nextValue = getAuditChangeValue(change, 'new');

				return `${humanizeAuditField(field)}: ${formatAuditFieldValue(field, previousValue)} -> ${formatAuditFieldValue(field, nextValue)}`;
			})
			.join('; ');
	}

	function getAuditChangeValue(change: unknown, key: 'old' | 'new') {
		if (!change || typeof change !== 'object') {
			return null;
		}

		return (change as any)[key] ?? null;
	}

	function getAuditActionLabel(action: string) {
		if (action === 'list_created') return $_('custom_lists.manage.audit.list_created');
		if (action === 'list_updated') return $_('custom_lists.manage.audit.list_updated');
		if (action === 'level_added') return $_('custom_lists.manage.audit.level_added');
		if (action === 'level_removed') return $_('custom_lists.manage.audit.level_removed');
		if (action === 'level_updated') return $_('custom_lists.manage.audit.level_updated');
		if (action === 'levels_reordered') return $_('custom_lists.manage.audit.levels_reordered');
		if (action === 'member_added') return $_('custom_lists.manage.audit.member_added');
		if (action === 'member_removed') return $_('custom_lists.manage.audit.member_removed');
		if (action === 'member_role_updated') return $_('custom_lists.manage.audit.member_role_updated');
		if (action === 'ownership_transferred') return $_('custom_lists.manage.audit.ownership_transferred');
		if (action === 'collaboration_settings_updated') return $_('custom_lists.manage.audit.collaboration_settings_updated');
		if (action === 'ban_state_updated') return $_('custom_lists.manage.audit.ban_state_updated');
		if (action === 'leaderboard_refreshed') return $_('custom_lists.manage.audit.leaderboard_refreshed');
		return action.replaceAll('_', ' ');
	}

	function getAuditEntryDetail(entry: any) {
		const metadata = entry.metadata && typeof entry.metadata === 'object' ? entry.metadata : {};
		const actor = getPlayerName(entry.actorData, entry.actorUid);
		const target = getPlayerName(entry.targetData, entry.targetUid);
		const fields = Array.isArray(metadata.fields)
			? metadata.fields.map((field: string) => humanizeAuditField(String(field))).join(', ')
			: '';
		const changes = getAuditChangeSummary(metadata) || fields || '-';

		if (entry.action === 'list_created') {
			return $_('custom_lists.manage.audit_detail.list_created', { values: { actor } });
		}

		if (entry.action === 'list_updated') {
			return $_('custom_lists.manage.audit_detail.list_updated', { values: { actor, changes } });
		}

		if (entry.action === 'level_added' || entry.action === 'level_removed') {
			return $_('custom_lists.manage.audit_detail.level_changed', {
				values: {
					actor,
					levelId: String(metadata.levelId ?? '-')
				}
			});
		}

		if (entry.action === 'level_updated') {
			return $_('custom_lists.manage.audit_detail.level_updated', {
				values: {
					actor,
					levelId: String(metadata.levelId ?? '-'),
					fields: fields || '-'
				}
			});
		}

		if (entry.action === 'levels_reordered') {
			return $_('custom_lists.manage.audit_detail.levels_reordered', { values: { actor } });
		}

		if (entry.action === 'member_added' || entry.action === 'member_removed') {
			return $_('custom_lists.manage.audit_detail.member_changed', {
				values: {
					actor,
					target,
					role: getRoleLabel(String(metadata.role || 'helper') as CollaboratorRole)
				}
			});
		}

		if (entry.action === 'member_role_updated') {
			return $_('custom_lists.manage.audit_detail.member_role_updated', {
				values: {
					actor,
					target,
					fromRole: getRoleLabel(String(metadata.fromRole || 'helper') as CollaboratorRole),
					toRole: getRoleLabel(String(metadata.toRole || 'helper') as CollaboratorRole)
				}
			});
		}

		if (entry.action === 'ownership_transferred') {
			return $_('custom_lists.manage.audit_detail.ownership_transferred', {
				values: {
					actor,
					target
				}
			});
		}

		if (entry.action === 'collaboration_settings_updated') {
			return $_('custom_lists.manage.audit_detail.collaboration_settings_updated', {
				values: {
					actor,
					enabled: metadata.adminsCanManageHelpers ? $_('general.yes') : $_('general.no')
				}
			});
		}

		if (entry.action === 'ban_state_updated') {
			return $_('custom_lists.manage.audit_detail.ban_state_updated', {
				values: {
					actor,
					state: metadata.isBanned ? $_('custom_lists.manage.ban') : $_('custom_lists.manage.unban')
				}
			});
		}

		if (entry.action === 'leaderboard_refreshed') {
			return $_('custom_lists.manage.audit_detail.leaderboard_refreshed', {
				values: {
					actor,
					totalPlayers: String(metadata.totalPlayers ?? '-'),
					totalRecords: String(metadata.totalRecords ?? '-')
				}
			});
		}

		return actor;
	}

	async function saveCollaborationSettings() {
		await updateCollaborationSettings(adminsCanManageHelpers);
	}

	async function runPlayerSearch() {
		const query = memberSearchQuery.trim();

		if (!query.length) {
			memberSearchResults = [];
			return;
		}

		memberSearchLoading = true;

		try {
			const results = await searchPlayersForCollaboration(query);
			memberSearchResults = (Array.isArray(results) ? results : []).filter((player: any) => player?.uid !== list?.owner);
		} finally {
			memberSearchLoading = false;
		}
	}

	function selectCollaborationMember(player: any) {
		selectedMember = player;
		memberSearchQuery = getPlayerName(player, player?.uid);
		memberSearchResults = [];
		const existingMember = getMemberByUid(player?.uid);
		if (existingMember?.role === 'admin' || existingMember?.role === 'helper') {
			collaboratorRole = existingMember.role;
		} else {
			collaboratorRole = 'helper';
		}
	}

	function clearSelectedMember() {
		selectedMember = null;
		memberSearchQuery = '';
		memberSearchResults = [];
		collaboratorRole = 'helper';
	}

	async function addSelectedCollaborator() {
		if (!selectedMember) return;
		await addCollaborator(selectedMember, canConfigureCollaboration ? collaboratorRole : 'helper');
	}

	async function transferSelectedOwnership() {
		if (!selectedMember) return;
		await transferOwnership(selectedMember);
	}
</script>

<div class="tabContent">
	{#if canConfigureCollaboration}
		<div class="toolCard">
			<h2 class="toolHeading">{$_('custom_lists.manage.collaboration.settings_title')}</h2>
			<div class="field">
				<div class="switchRow">
					<div>
						<label for="admins-can-manage-helpers">{$_('custom_lists.manage.collaboration.admin_helper_toggle_label')}</label>
						<p class="hint">{$_('custom_lists.manage.collaboration.admin_helper_toggle_hint')}</p>
					</div>
					<div class="switchControl">
						<span class="switchLabel">{adminsCanManageHelpers ? $_('general.yes') : $_('general.no')}</span>
						<Switch id="admins-can-manage-helpers" bind:checked={adminsCanManageHelpers} />
					</div>
				</div>
			</div>
			<div class="formActions">
				<Button on:click={saveCollaborationSettings} disabled={savingCollaboration}>
					<Save class="mr-2 h-4 w-4" />
					{$_('custom_lists.detail.edit.save')}
				</Button>
			</div>
		</div>
	{/if}

	{#if canViewMembers || canManageMembers || canTransferOwnership}
		<div class="toolCard">
			<h2 class="toolHeading">{$_('custom_lists.manage.collaboration.members_title')}</h2>
			<div class="field">
				<label for="collaboration-player-search">{$_('custom_lists.manage.collaboration.search_label')}</label>
				<div class="searchRow">
					<Input
						id="collaboration-player-search"
						bind:value={memberSearchQuery}
						placeholder={$_('custom_lists.manage.collaboration.search_placeholder')}
						on:keydown={(event) => event.key === 'Enter' && runPlayerSearch()}
					/>
					<Button variant="outline" on:click={runPlayerSearch} disabled={memberSearchLoading}>
						{memberSearchLoading ? `${$_('general.loading')}...` : $_('custom_lists.manage.collaboration.search_button')}
					</Button>
				</div>
				<p class="hint">{$_('custom_lists.manage.collaboration.search_hint')}</p>
			</div>

			{#if memberSearchResults.length}
				<div class="searchResults">
					{#each memberSearchResults as player}
						<button type="button" class="searchResult" on:click={() => selectCollaborationMember(player)}>
							<div class="searchResultMain">
								<Avatar.Root class="h-10 w-10 flex-shrink-0">
									<Avatar.Image
										class="h-full w-full rounded-full object-cover"
										src={getAvatarSrc(player)}
										alt={getPlayerName(player, player?.uid)}
									/>
									<Avatar.Fallback class="inline-flex h-full w-full items-center justify-center rounded-full text-[0.95rem] font-bold">
										{getAvatarFallback(player)}
									</Avatar.Fallback>
								</Avatar.Root>
								<div class="searchResultCopy">
									<span class="searchResultName">{getPlayerName(player, player?.uid)}</span>
									<span class="searchResultMeta">{player.uid}</span>
								</div>
							</div>
						</button>
					{/each}
				</div>
			{/if}

			{#if selectedMember}
				<div class="selectedMemberCard">
					<div class="selectedMemberInfo">
						<div class="memberNameRow">
							<PlayerLink player={selectedMember} showAvatar />
							{#if selectedExistingMember}
								<Badge variant="outline">{getRoleLabel(selectedExistingMember.role)}</Badge>
							{/if}
						</div>
						<span class="searchResultMeta">{selectedMember.uid}</span>
					</div>
					{#if canConfigureCollaboration}
						<div class="optionRow">
							<button
								type="button"
								class="optionBtn"
								class:selected={collaboratorRole === 'helper'}
								on:click={() => (collaboratorRole = 'helper')}
							>
								{$_('custom_lists.manage.roles.helper')}
							</button>
							<button
								type="button"
								class="optionBtn"
								class:selected={collaboratorRole === 'admin'}
								on:click={() => (collaboratorRole = 'admin')}
							>
								{$_('custom_lists.manage.roles.admin')}
							</button>
						</div>
					{/if}
					{#if selectedExistingMember}
						<p class="hint">
							{$_('custom_lists.manage.collaboration.selected_member_existing', {
								values: {
									role: getRoleLabel(selectedExistingMember.role || 'helper')
								}
							})}
						</p>
					{/if}
					<div class="formActions">
						{#if canManageMembers && !selectedExistingMember}
							<Button on:click={addSelectedCollaborator} disabled={savingCollaboration}>
								<Plus class="mr-2 h-4 w-4" />
								{$_('custom_lists.manage.collaboration.add_button')}
							</Button>
						{:else if canConfigureCollaboration && selectedExistingMember && selectedExistingMember.role !== collaboratorRole}
							<Button on:click={() => updateCollaboratorRole(selectedExistingMember, collaboratorRole)} disabled={savingCollaboration}>
								<Save class="mr-2 h-4 w-4" />
								{$_('custom_lists.manage.collaboration.update_role_button')}
							</Button>
						{/if}
						{#if canTransferOwnership}
							<Button variant="outline" on:click={transferSelectedOwnership} disabled={savingCollaboration}>
								{$_('custom_lists.manage.collaboration.transfer_button')}
							</Button>
						{/if}
						<Button variant="ghost" on:click={clearSelectedMember} disabled={savingCollaboration}>
							{$_('general.reset')}
						</Button>
					</div>
				</div>
			{/if}

			{#if canViewMembers}
				<div class="memberList">
					<div class="memberRow">
						<div class="memberInfo">
							<div class="memberNameRow">
								{#if list.ownerData}
									<PlayerLink player={list.ownerData} showAvatar />
								{:else}
									<span class="memberFallbackName">{list.owner}</span>
								{/if}
								<Badge variant="secondary">{$_('custom_lists.manage.roles.owner')}</Badge>
							</div>
							<p class="hint">{$_('custom_lists.manage.collaboration.owner_hint')}</p>
						</div>
					</div>

					{#if list.members?.length}
						{#each list.members as member}
							<div class="memberRow">
								<div class="memberInfo">
									<div class="memberNameRow">
										{#if member.playerData}
											<PlayerLink player={member.playerData} showAvatar />
										{:else}
											<span class="memberFallbackName">{member.uid}</span>
										{/if}
										<Badge variant="outline">{getRoleLabel(member.role)}</Badge>
									</div>
									<p class="hint">{$_('custom_lists.manage.collaboration.member_since', { values: { date: formatDate(member.created_at) } })}</p>
								</div>
								<div class="memberActions">
									{#if canConfigureCollaboration}
										<Button
											variant="outline"
											size="sm"
											on:click={() => updateCollaboratorRole(member, member.role === 'admin' ? 'helper' : 'admin')}
											disabled={savingCollaboration}
										>
											{member.role === 'admin'
												? $_('custom_lists.manage.collaboration.demote_button')
												: $_('custom_lists.manage.collaboration.promote_button')}
										</Button>
									{/if}
									{#if canManageMembers && (canConfigureCollaboration || member.role === 'helper')}
										<Button
											variant="destructive"
											size="sm"
											on:click={() => removeCollaborator(member)}
											disabled={savingCollaboration}
										>
											<Trash2 class="mr-1.5 h-3.5 w-3.5" />
											{$_('custom_lists.manage.collaboration.remove_button')}
										</Button>
									{/if}
								</div>
							</div>
						{/each}
					{:else}
						<p class="hint">{$_('custom_lists.manage.collaboration.members_empty')}</p>
					{/if}
				</div>
			{/if}
		</div>
	{/if}

	{#if canViewAudit}
		<div class="toolCard">
			<h2 class="toolHeading">{$_('custom_lists.manage.collaboration.audit_title')}</h2>
			<p class="hint">{$_('custom_lists.manage.collaboration.audit_hint')}</p>
			{#if list.auditLog?.length}
				<div class="auditList">
					{#each list.auditLog as entry}
						<button
							type="button"
							class="auditRow auditRowButton"
							on:click={() => openAuditDetail(entry)}
						>
							<div class="auditRowHeader">
								<strong>{getAuditActionLabel(entry.action)}</strong>
								<span class="auditTimestamp">{formatDateTime(entry.created_at)}</span>
							</div>
							<p class="hint">{getAuditEntryDetail(entry)}</p>
						</button>
					{/each}
				</div>
			{:else}
				<p class="hint">{$_('custom_lists.manage.collaboration.audit_empty')}</p>
			{/if}
		</div>
	{/if}
</div>

<Dialog.Root bind:open={showAuditDetailDialog}>
	<Dialog.Content class="max-w-[860px]">
		{#if auditDetailEntry}
			<div class="auditDetailDialog">
				<Dialog.Header>
					<Dialog.Title>{getAuditActionLabel(auditDetailEntry.action)}</Dialog.Title>
				</Dialog.Header>

				<div class="auditDetailMeta">
					<div class="auditDetailMetaRow">
						<span class="auditDetailMetaLabel">{$_('custom_lists.manage.audit_detail.actor_label')}</span>
						<span>{getPlayerName(auditDetailEntry.actorData, auditDetailEntry.actorUid)}</span>
					</div>
					<div class="auditDetailMetaRow">
						<span class="auditDetailMetaLabel">{$_('custom_lists.manage.audit_detail.time_label')}</span>
						<span>{formatDateTime(auditDetailEntry.created_at)}</span>
					</div>
					<div class="auditDetailMetaRow">
						<span class="auditDetailMetaLabel">{$_('custom_lists.manage.audit_detail.action_label')}</span>
						<code>{auditDetailEntry.action}</code>
					</div>
				</div>

				<p class="hint">{getAuditEntryDetail(auditDetailEntry)}</p>

				{#if auditEntryHasChangeDetails(auditDetailEntry)}
					<div class="auditDetailFieldList">
						{#each getAuditChangeFields(auditDetailEntry) as field}
							<div class="auditDetailFieldRow">
								<div class="auditDetailFieldLabel">{humanizeAuditField(field)}</div>
								<div class="auditDetailFieldValues">
									<span class="auditDetailFieldValue auditDetailFieldValueOld">{formatAuditFieldValue(field, auditDetailEntry.metadata?.changes?.[field]?.old ?? null)}</span>
									<span class="auditDetailFieldArrow" aria-hidden="true">→</span>
									<span class="auditDetailFieldValue auditDetailFieldValueNew">{formatAuditFieldValue(field, auditDetailEntry.metadata?.changes?.[field]?.new ?? null)}</span>
								</div>
							</div>
						{/each}
					</div>
				{/if}

				<details class="auditDetailPayload">
					<summary>{$_('custom_lists.manage.unsaved_level_edits_dialog_payload_label')}</summary>
					<pre>{JSON.stringify(auditDetailEntry.metadata ?? {}, null, 2)}</pre>
				</details>

				<Dialog.Footer>
					<Button variant="outline" on:click={() => (showAuditDetailDialog = false)}>
						{$_('general.close')}
					</Button>
				</Dialog.Footer>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<style lang="scss">
	.tabContent {
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin-top: 16px;
	}

	.toolCard {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		padding: 22px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.toolHeading {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	label {
		font-size: 0.9rem;
		font-weight: 500;
	}

	.hint {
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
		margin: 0;
	}

	.optionRow {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.optionBtn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		border: 1px solid hsl(var(--border));
		background: transparent;
		color: hsl(var(--foreground));
		padding: 7px 14px;
		border-radius: 999px;
		cursor: pointer;
		font-size: 0.85rem;
		transition: background 0.15s ease, border-color 0.15s ease;
	}

	.optionBtn:hover {
		background: hsl(var(--muted) / 0.5);
	}

	.optionBtn.selected {
		background: hsl(var(--primary) / 0.12);
		border-color: hsl(var(--primary));
	}

	.switchRow {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}

	.switchControl {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.switchLabel {
		font-size: 0.9rem;
		font-weight: 500;
	}

	.formActions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 4px;
	}

	.searchRow {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}

	.searchResults,
	.memberList,
	.auditList {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.searchResult,
	.memberRow,
	.auditRow,
	.selectedMemberCard {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 14px;
		border: 1px solid hsl(var(--border));
		border-radius: 10px;
		background: hsl(var(--muted) / 0.12);
	}

	.searchResult {
		cursor: pointer;
		text-align: left;
	}

	.searchResult:hover {
		border-color: hsl(var(--primary));
		background: hsl(var(--primary) / 0.08);
	}

	.searchResultMain {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}

	.searchResultCopy {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.searchResultName,
	.memberFallbackName {
		font-weight: 600;
	}

	.searchResultMeta,
	.auditTimestamp {
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
	}

	.selectedMemberCard,
	.memberRow,
	.auditRow {
		align-items: flex-start;
	}

	.selectedMemberInfo,
	.memberInfo {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}

	.memberNameRow,
	.auditRowHeader {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.memberActions {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	@media (max-width: 760px) {
		.toolCard {
			padding: 16px;
		}

		.searchResult,
		.selectedMemberCard,
		.memberRow,
		.auditRow {
			flex-direction: column;
			align-items: stretch;
		}

		.memberActions {
			justify-content: flex-start;
		}
	}

	.auditRowButton {
		cursor: pointer;
		text-align: left;
		width: 100%;
		flex-direction: column;
		color: inherit;
		font: inherit;
	}

	.auditRowButton:hover {
		border-color: hsl(var(--primary));
		background: hsl(var(--primary) / 0.08);
	}

	.auditDetailDialog {
		display: flex;
		flex-direction: column;
		gap: 16px;
		max-height: 70vh;
		overflow-y: auto;
	}

	.auditDetailMeta {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 12px;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		background: hsl(var(--muted) / 0.2);
	}

	.auditDetailMetaRow {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		font-size: 0.9rem;
	}

	.auditDetailMetaLabel {
		font-weight: 600;
		color: hsl(var(--muted-foreground));
		min-width: 80px;
	}

	.auditDetailFieldList {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.auditDetailFieldRow {
		display: grid;
		grid-template-columns: minmax(120px, 180px) 1fr;
		gap: 12px;
		padding: 10px 12px;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		background: hsl(var(--muted) / 0.12);
	}

	.auditDetailFieldLabel {
		font-weight: 600;
		color: hsl(var(--muted-foreground));
		word-break: break-word;
	}

	.auditDetailFieldValues {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		min-width: 0;
	}

	.auditDetailFieldValue {
		word-break: break-word;
		font-family: var(--font-mono, monospace);
		font-size: 0.85rem;
	}

	.auditDetailFieldValueOld {
		color: hsl(var(--destructive));
		text-decoration: line-through;
		opacity: 0.85;
	}

	.auditDetailFieldValueNew {
		color: hsl(var(--primary));
	}

	.auditDetailFieldArrow {
		color: hsl(var(--muted-foreground));
	}

	.auditDetailPayload pre {
		max-height: 300px;
		overflow: auto;
		background: hsl(var(--muted) / 0.3);
		padding: 10px;
		border-radius: 6px;
		font-size: 0.8rem;
	}

	.auditDetailPayload summary {
		cursor: pointer;
		font-size: 0.85rem;
		color: hsl(var(--muted-foreground));
	}

	@media (max-width: 760px) {
		.auditDetailFieldRow {
			grid-template-columns: 1fr;
		}
	}
</style>
