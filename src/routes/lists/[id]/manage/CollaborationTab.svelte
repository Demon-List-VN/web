<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import { isActive } from '$lib/client/isSupporterActive';
	import { ArrowUpDown, Crown, Plus, Save, Search, Trash2, UserPlus, X } from 'lucide-svelte';
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

	// Local filter for the existing staff list
	let memberFilter = '';

	// Add-collaborator dialog state
	let showAddDialog = false;
	let addSearchQuery = '';
	let addSearchLoading = false;
	let addSearchResults: any[] = [];
	let addSelectedPlayer: any | null = null;
	let addSelectedRole: CollaboratorRole = 'helper';

	// Audit detail dialog state
	let auditDetailEntry: any = null;
	let showAuditDetailDialog = false;

	$: if (list) {
		adminsCanManageHelpers = Boolean(list.adminsCanManageHelpers);
	}

	$: filteredMembers = filterMembers(list?.members ?? [], memberFilter);

	$: addDialogExistingMember = addSelectedPlayer?.uid ? getMemberByUid(addSelectedPlayer.uid) : null;

	function filterMembers(members: any[], query: string) {
		const q = query.trim().toLowerCase();
		if (!q) return members;
		return members.filter((member: any) => {
			const name = (member.playerData?.name || '').toLowerCase();
			const uid = (member.uid || '').toLowerCase();
			return name.includes(q) || uid.includes(q);
		});
	}

	function getMemberByUid(uid: string | null | undefined) {
		if (!uid || !list?.members) return null;
		return list.members.find((member: any) => member.uid === uid) ?? null;
	}

	function getPlayerName(player: any, fallbackUid?: string | null) {
		return player?.name || fallbackUid || $_('custom_lists.manage.collaboration.unknown_player');
	}

	function getAvatarSrc(player: any) {
		if (!player?.uid) return '';
		const extension = isActive(player.supporterUntil) && player.isAvatarGif ? '.gif' : '.jpg';
		const version = player.avatarVersion ?? 0;
		return `https://cdn.gdvn.net/avatars/${player.uid}${extension}?version=${version}`;
	}

	function getAvatarFallback(player: any) {
		const label = getPlayerName(player, player?.uid).trim();
		return label ? label[0].toUpperCase() : '?';
	}

	async function saveCollaborationSettings() {
		await updateCollaborationSettings(adminsCanManageHelpers);
	}

	function openAddDialog() {
		addSearchQuery = '';
		addSearchResults = [];
		addSelectedPlayer = null;
		addSelectedRole = 'helper';
		showAddDialog = true;
	}

	async function runAddDialogSearch() {
		const query = addSearchQuery.trim();
		if (!query.length) {
			addSearchResults = [];
			return;
		}
		addSearchLoading = true;
		try {
			const results = await searchPlayersForCollaboration(query);
			addSearchResults = (Array.isArray(results) ? results : []).filter(
				(player: any) => player?.uid && player.uid !== list?.owner
			);
		} finally {
			addSearchLoading = false;
		}
	}

	function selectAddDialogPlayer(player: any) {
		addSelectedPlayer = player;
		const existing = getMemberByUid(player?.uid);
		addSelectedRole = existing?.role === 'admin' ? 'admin' : 'helper';
	}

	function clearAddDialogSelection() {
		addSelectedPlayer = null;
		addSelectedRole = 'helper';
	}

	async function confirmAddDialog() {
		if (!addSelectedPlayer) return;
		const role = canConfigureCollaboration ? addSelectedRole : 'helper';
		if (addDialogExistingMember) {
			if (addDialogExistingMember.role !== role) {
				await updateCollaboratorRole(addDialogExistingMember, role);
			}
		} else {
			await addCollaborator(addSelectedPlayer, role);
		}
		showAddDialog = false;
	}

	async function transferFromAddDialog() {
		if (!addSelectedPlayer) return;
		await transferOwnership(addSelectedPlayer);
		showAddDialog = false;
	}

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
</script>

<div class="tabContent">
	{#if canConfigureCollaboration}
		<section class="card">
			<header class="cardHead">
				<h2 class="cardTitle">{$_('custom_lists.manage.collaboration.settings_title')}</h2>
			</header>
			<div class="switchRow">
				<div class="switchCopy">
					<label for="admins-can-manage-helpers">{$_('custom_lists.manage.collaboration.admin_helper_toggle_label')}</label>
					<p class="hint">{$_('custom_lists.manage.collaboration.admin_helper_toggle_hint')}</p>
				</div>
				<div class="switchControl">
					<span class="switchLabel">{adminsCanManageHelpers ? $_('general.yes') : $_('general.no')}</span>
					<Switch id="admins-can-manage-helpers" bind:checked={adminsCanManageHelpers} />
				</div>
			</div>
			<div class="formActions">
				<Button on:click={saveCollaborationSettings} disabled={savingCollaboration}>
					<Save class="mr-2 h-4 w-4" />
					{$_('custom_lists.detail.edit.save')}
				</Button>
			</div>
		</section>
	{/if}

	{#if canViewMembers || canManageMembers || canTransferOwnership}
		<section class="card">
			<header class="cardHead cardHeadSplit">
				<div class="cardHeadCopy">
					<h2 class="cardTitle">{$_('custom_lists.manage.collaboration.members_title')}</h2>
					<p class="hint">{$_('custom_lists.manage.collaboration.search_hint')}</p>
				</div>
				{#if canManageMembers}
					<Button on:click={openAddDialog} disabled={savingCollaboration}>
						<UserPlus class="mr-2 h-4 w-4" />
						{$_('custom_lists.manage.collaboration.add_button')}
					</Button>
				{/if}
			</header>

			{#if canViewMembers}
				<div class="filterRow">
					<div class="filterInput">
						<Search class="filterIcon h-4 w-4" aria-hidden="true" />
						<Input
							bind:value={memberFilter}
							placeholder={$_('custom_lists.manage.collaboration.search_placeholder')}
						/>
						{#if memberFilter}
							<button
								type="button"
								class="filterClear"
								on:click={() => (memberFilter = '')}
								aria-label={$_('general.close')}
							>
								<X class="h-3.5 w-3.5" />
							</button>
						{/if}
					</div>
				</div>

				<ul class="memberList">
					<li class="memberRow ownerRow">
						<div class="memberMain">
							<Avatar.Root class="h-10 w-10 flex-shrink-0">
								<Avatar.Image
									class="h-full w-full rounded-full object-cover"
									src={getAvatarSrc(list.ownerData)}
									alt={getPlayerName(list.ownerData, list.owner)}
								/>
								<Avatar.Fallback class="inline-flex h-full w-full items-center justify-center rounded-full text-[0.95rem] font-bold">
									{getAvatarFallback(list.ownerData ?? { uid: list.owner })}
								</Avatar.Fallback>
							</Avatar.Root>
							<div class="memberCopy">
								<div class="memberNameRow">
									{#if list.ownerData}
										<PlayerLink player={list.ownerData} />
									{:else}
										<span class="memberFallbackName">{list.owner}</span>
									{/if}
									<Badge variant="secondary" class="roleBadge">
										<Crown class="mr-1 h-3 w-3" />
										{$_('custom_lists.manage.roles.owner')}
									</Badge>
								</div>
								<span class="memberMeta">{$_('custom_lists.manage.collaboration.owner_hint')}</span>
							</div>
						</div>
					</li>

					{#if filteredMembers.length}
						{#each filteredMembers as member (member.uid)}
							<li class="memberRow">
								<div class="memberMain">
									<Avatar.Root class="h-10 w-10 flex-shrink-0">
										<Avatar.Image
											class="h-full w-full rounded-full object-cover"
											src={getAvatarSrc(member.playerData)}
											alt={getPlayerName(member.playerData, member.uid)}
										/>
										<Avatar.Fallback class="inline-flex h-full w-full items-center justify-center rounded-full text-[0.95rem] font-bold">
											{getAvatarFallback(member.playerData ?? { uid: member.uid })}
										</Avatar.Fallback>
									</Avatar.Root>
									<div class="memberCopy">
										<div class="memberNameRow">
											{#if member.playerData}
												<PlayerLink player={member.playerData} />
											{:else}
												<span class="memberFallbackName">{member.uid}</span>
											{/if}
											<Badge variant={member.role === 'admin' ? 'default' : 'outline'} class="roleBadge">
												{getRoleLabel(member.role)}
											</Badge>
										</div>
										<span class="memberMeta">
											{$_('custom_lists.manage.collaboration.member_since', { values: { date: formatDate(member.created_at) } })}
										</span>
									</div>
								</div>
								<div class="memberActions">
									{#if canConfigureCollaboration}
										<Button
											variant="outline"
											size="sm"
											on:click={() => updateCollaboratorRole(member, member.role === 'admin' ? 'helper' : 'admin')}
											disabled={savingCollaboration}
										>
											<ArrowUpDown class="mr-1.5 h-3.5 w-3.5" />
											{member.role === 'admin'
												? $_('custom_lists.manage.collaboration.demote_button')
												: $_('custom_lists.manage.collaboration.promote_button')}
										</Button>
									{/if}
									{#if canTransferOwnership}
										<Button
											variant="outline"
											size="sm"
											on:click={() => transferOwnership(member.playerData ?? { uid: member.uid, name: member.uid })}
											disabled={savingCollaboration}
										>
											<Crown class="mr-1.5 h-3.5 w-3.5" />
											{$_('custom_lists.manage.collaboration.transfer_button')}
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
							</li>
						{/each}
					{:else if memberFilter.trim().length}
						<li class="emptyRow">{$_('custom_lists.manage.collaboration.members_empty')}</li>
					{:else}
						<li class="emptyRow">{$_('custom_lists.manage.collaboration.members_empty')}</li>
					{/if}
				</ul>
			{/if}
		</section>
	{/if}

	{#if canViewAudit}
		<section class="card">
			<header class="cardHead">
				<h2 class="cardTitle">{$_('custom_lists.manage.collaboration.audit_title')}</h2>
				<p class="hint">{$_('custom_lists.manage.collaboration.audit_hint')}</p>
			</header>
			{#if list.auditLog?.length}
				<div class="auditList">
					{#each list.auditLog as entry}
						<button type="button" class="auditRow" on:click={() => openAuditDetail(entry)}>
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
		</section>
	{/if}
</div>

<!-- Add collaborator dialog -->
<Dialog.Root bind:open={showAddDialog}>
	<Dialog.Content class="max-w-[560px]">
		<Dialog.Header>
			<Dialog.Title>{$_('custom_lists.manage.collaboration.add_button')}</Dialog.Title>
		</Dialog.Header>

		<div class="addDialog">
			<div class="field">
				<label for="add-collab-search">{$_('custom_lists.manage.collaboration.search_label')}</label>
				<div class="searchRow">
					<Input
						id="add-collab-search"
						bind:value={addSearchQuery}
						placeholder={$_('custom_lists.manage.collaboration.search_placeholder')}
						on:keydown={(event) => event.key === 'Enter' && runAddDialogSearch()}
					/>
					<Button variant="outline" on:click={runAddDialogSearch} disabled={addSearchLoading}>
						{addSearchLoading ? `${$_('general.loading')}...` : $_('custom_lists.manage.collaboration.search_button')}
					</Button>
				</div>
			</div>

			{#if addSearchResults.length && !addSelectedPlayer}
				<div class="dialogSearchResults">
					{#each addSearchResults as player (player.uid)}
						<button type="button" class="dialogSearchResult" on:click={() => selectAddDialogPlayer(player)}>
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
							<div class="dialogSearchResultCopy">
								<span class="dialogSearchResultName">{getPlayerName(player, player?.uid)}</span>
								<span class="dialogSearchResultMeta">{player.uid}</span>
							</div>
						</button>
					{/each}
				</div>
			{/if}

			{#if addSelectedPlayer}
				<div class="selectedCard">
					<div class="selectedHead">
						<Avatar.Root class="h-12 w-12 flex-shrink-0">
							<Avatar.Image
								class="h-full w-full rounded-full object-cover"
								src={getAvatarSrc(addSelectedPlayer)}
								alt={getPlayerName(addSelectedPlayer, addSelectedPlayer?.uid)}
							/>
							<Avatar.Fallback class="inline-flex h-full w-full items-center justify-center rounded-full text-[0.95rem] font-bold">
								{getAvatarFallback(addSelectedPlayer)}
							</Avatar.Fallback>
						</Avatar.Root>
						<div class="dialogSearchResultCopy">
							<span class="dialogSearchResultName">{getPlayerName(addSelectedPlayer, addSelectedPlayer?.uid)}</span>
							<span class="dialogSearchResultMeta">{addSelectedPlayer.uid}</span>
						</div>
						<Button variant="ghost" size="sm" on:click={clearAddDialogSelection} disabled={savingCollaboration}>
							<X class="h-4 w-4" />
						</Button>
					</div>

					{#if addDialogExistingMember}
						<p class="hint">
							{$_('custom_lists.manage.collaboration.selected_member_existing', {
								values: { role: getRoleLabel(addDialogExistingMember.role || 'helper') }
							})}
						</p>
					{/if}

					{#if canConfigureCollaboration}
						<div class="optionRow">
							<button
								type="button"
								class="optionBtn"
								class:selected={addSelectedRole === 'helper'}
								on:click={() => (addSelectedRole = 'helper')}
							>
								{$_('custom_lists.manage.roles.helper')}
							</button>
							<button
								type="button"
								class="optionBtn"
								class:selected={addSelectedRole === 'admin'}
								on:click={() => (addSelectedRole = 'admin')}
							>
								{$_('custom_lists.manage.roles.admin')}
							</button>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<Dialog.Footer>
			{#if addSelectedPlayer && canTransferOwnership}
				<Button variant="outline" on:click={transferFromAddDialog} disabled={savingCollaboration}>
					<Crown class="mr-2 h-4 w-4" />
					{$_('custom_lists.manage.collaboration.transfer_button')}
				</Button>
			{/if}
			<Button variant="ghost" on:click={() => (showAddDialog = false)} disabled={savingCollaboration}>
				{$_('general.close')}
			</Button>
			{#if addSelectedPlayer}
				<Button on:click={confirmAddDialog} disabled={savingCollaboration}>
					{#if addDialogExistingMember}
						<Save class="mr-2 h-4 w-4" />
						{$_('custom_lists.manage.collaboration.update_role_button')}
					{:else}
						<Plus class="mr-2 h-4 w-4" />
						{$_('custom_lists.manage.collaboration.add_button')}
					{/if}
				</Button>
			{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

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

	.card {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 14px;
		padding: 22px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.cardHead {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.cardHeadSplit {
		flex-direction: row;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}

	.cardHeadCopy {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.cardTitle {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
	}

	.hint {
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
		margin: 0;
	}

	label {
		font-size: 0.9rem;
		font-weight: 500;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.switchRow {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
		padding: 14px;
		border: 1px solid hsl(var(--border));
		border-radius: 10px;
		background: hsl(var(--muted) / 0.12);
	}

	.switchCopy {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
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
	}

	.filterRow {
		display: flex;
	}

	.filterInput {
		position: relative;
		flex: 1;
		min-width: 0;
	}

	.filterInput :global(input) {
		padding-left: 36px;
		padding-right: 36px;
	}

	:global(.filterIcon) {
		position: absolute;
		left: 12px;
		top: 50%;
		transform: translateY(-50%);
		color: hsl(var(--muted-foreground));
		pointer-events: none;
	}

	.filterClear {
		position: absolute;
		right: 8px;
		top: 50%;
		transform: translateY(-50%);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		border-radius: 999px;
		background: transparent;
		border: none;
		color: hsl(var(--muted-foreground));
		cursor: pointer;
	}

	.filterClear:hover {
		background: hsl(var(--muted) / 0.5);
		color: hsl(var(--foreground));
	}

	.memberList {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.memberRow {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 12px 14px;
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		background: hsl(var(--muted) / 0.1);
	}

	.ownerRow {
		background: hsl(var(--primary) / 0.06);
		border-color: hsl(var(--primary) / 0.35);
	}

	.memberMain {
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
		flex: 1;
	}

	.memberCopy {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.memberNameRow {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.memberFallbackName {
		font-weight: 600;
	}

	.memberMeta {
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
	}

	.memberActions {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.emptyRow {
		padding: 18px;
		border: 1px dashed hsl(var(--border));
		border-radius: 12px;
		text-align: center;
		font-size: 0.85rem;
		color: hsl(var(--muted-foreground));
		list-style: none;
	}

	.addDialog {
		display: flex;
		flex-direction: column;
		gap: 14px;
		max-height: 60vh;
		overflow-y: auto;
	}

	.searchRow {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.searchRow :global(input) {
		flex: 1;
		min-width: 0;
	}

	.dialogSearchResults {
		display: flex;
		flex-direction: column;
		gap: 6px;
		max-height: 280px;
		overflow-y: auto;
		padding-right: 4px;
	}

	.dialogSearchResult {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 12px;
		border: 1px solid hsl(var(--border));
		border-radius: 10px;
		background: hsl(var(--muted) / 0.1);
		cursor: pointer;
		text-align: left;
		color: inherit;
		font: inherit;
	}

	.dialogSearchResult:hover {
		border-color: hsl(var(--primary));
		background: hsl(var(--primary) / 0.08);
	}

	.dialogSearchResultCopy {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
		flex: 1;
	}

	.dialogSearchResultName {
		font-weight: 600;
	}

	.dialogSearchResultMeta {
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
	}

	.selectedCard {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 14px;
		border: 1px solid hsl(var(--primary) / 0.4);
		border-radius: 12px;
		background: hsl(var(--primary) / 0.06);
	}

	.selectedHead {
		display: flex;
		align-items: center;
		gap: 12px;
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

	.auditList {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.auditRow {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 12px 14px;
		border: 1px solid hsl(var(--border));
		border-radius: 10px;
		background: hsl(var(--muted) / 0.1);
		cursor: pointer;
		text-align: left;
		width: 100%;
		color: inherit;
		font: inherit;
	}

	.auditRow:hover {
		border-color: hsl(var(--primary));
		background: hsl(var(--primary) / 0.08);
	}

	.auditRowHeader {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.auditTimestamp {
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
	}

	@media (max-width: 760px) {
		.card {
			padding: 16px;
		}

		.memberRow {
			flex-direction: column;
			align-items: stretch;
		}

		.memberActions {
			justify-content: flex-start;
		}
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
