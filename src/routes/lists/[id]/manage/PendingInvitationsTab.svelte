<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Avatar from '$lib/components/ui/avatar';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import { isActive } from '$lib/client/isSupporterActive';
	import { Check, Mail, Trash2, X } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';

	type CollaboratorRole = 'admin' | 'helper';

	export let list: any = null;
	export let savingCollaboration = false;
	export let canManageMembers = false;
	export let canViewPendingInvitations = false;
	export let canRespondToInvitation = false;

	export let acceptPendingInvitation: () => void | Promise<void> = async () => {};
	export let rejectPendingInvitation: () => void | Promise<void> = async () => {};
	export let revokePendingInvitation: (invitation: any) => void | Promise<void> = async () => {};
	export let getRoleLabel: (role: CollaboratorRole | string) => string = () => '';
	export let formatDateTime: (value: string) => string = () => '';

	$: pendingInvitation = list?.pendingInvitation ?? null;
	$: pendingInvitations = list?.pendingInvitations ?? [];

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
</script>

<div class="tabContent">
	{#if canRespondToInvitation && pendingInvitation}
		<section class="card highlightCard">
			<header class="cardHead cardHeadSplit">
				<div class="cardHeadCopy">
					<h2 class="cardTitle">{$_('custom_lists.manage.collaboration.pending_your_title')}</h2>
					<p class="hint">{$_('custom_lists.manage.collaboration.pending_your_hint')}</p>
				</div>
				<Badge class="roleBadge" variant={pendingInvitation.role === 'admin' ? 'default' : 'outline'}>
					{getRoleLabel(pendingInvitation.role)}
				</Badge>
			</header>

			<div class="invitationRow invitationRowHighlight">
				<div class="memberMain">
					<Avatar.Root class="h-11 w-11 flex-shrink-0">
						<Avatar.Image
							class="h-full w-full rounded-full object-cover"
							src={getAvatarSrc(pendingInvitation.invitedByData)}
							alt={getPlayerName(pendingInvitation.invitedByData, pendingInvitation.invitedBy)}
						/>
						<Avatar.Fallback class="inline-flex h-full w-full items-center justify-center rounded-full text-[0.95rem] font-bold">
							{getAvatarFallback(pendingInvitation.invitedByData ?? { uid: pendingInvitation.invitedBy })}
						</Avatar.Fallback>
					</Avatar.Root>
					<div class="memberCopy">
						<div class="memberNameRow">
							<span class="pendingLabel">{$_('custom_lists.manage.collaboration.pending_invited_by')}</span>
							{#if pendingInvitation.invitedByData}
								<PlayerLink player={pendingInvitation.invitedByData} />
							{:else}
								<span class="memberFallbackName">{pendingInvitation.invitedBy}</span>
							{/if}
						</div>
						<span class="memberMeta">
							{$_('custom_lists.manage.collaboration.pending_sent_at', {
								values: { date: formatDateTime(pendingInvitation.created_at) }
							})}
						</span>
					</div>
				</div>
			</div>

			<div class="formActions">
				<Button on:click={acceptPendingInvitation} disabled={savingCollaboration}>
					<Check class="mr-2 h-4 w-4" />
					{$_('custom_lists.manage.collaboration.accept_invitation_button')}
				</Button>
				<Button variant="outline" on:click={rejectPendingInvitation} disabled={savingCollaboration}>
					<X class="mr-2 h-4 w-4" />
					{$_('custom_lists.manage.collaboration.reject_invitation_button')}
				</Button>
			</div>
		</section>
	{/if}

	{#if canViewPendingInvitations}
		<section class="card">
			<header class="cardHead cardHeadSplit">
				<div class="cardHeadCopy">
					<h2 class="cardTitle">{$_('custom_lists.manage.collaboration.pending_title')}</h2>
					<p class="hint">{$_('custom_lists.manage.collaboration.pending_hint')}</p>
				</div>
				<Badge variant="secondary">{pendingInvitations.length}</Badge>
			</header>

			{#if pendingInvitations.length}
				<ul class="invitationList">
					{#each pendingInvitations as invitation (invitation.uid)}
						<li class="invitationRow">
							<div class="memberMain">
								<Avatar.Root class="h-10 w-10 flex-shrink-0">
									<Avatar.Image
										class="h-full w-full rounded-full object-cover"
										src={getAvatarSrc(invitation.playerData)}
										alt={getPlayerName(invitation.playerData, invitation.uid)}
									/>
									<Avatar.Fallback class="inline-flex h-full w-full items-center justify-center rounded-full text-[0.95rem] font-bold">
										{getAvatarFallback(invitation.playerData ?? { uid: invitation.uid })}
									</Avatar.Fallback>
								</Avatar.Root>
								<div class="memberCopy">
									<div class="memberNameRow">
										{#if invitation.playerData}
											<PlayerLink player={invitation.playerData} />
										{:else}
											<span class="memberFallbackName">{invitation.uid}</span>
										{/if}
										<Badge variant={invitation.role === 'admin' ? 'default' : 'outline'} class="roleBadge">
											{getRoleLabel(invitation.role)}
										</Badge>
									</div>
									<span class="memberMeta">
										{$_('custom_lists.manage.collaboration.pending_sent_at', {
											values: { date: formatDateTime(invitation.created_at) }
										})}
									</span>
									<span class="memberMeta">
										{$_('custom_lists.manage.collaboration.pending_invited_by')}
										{#if invitation.invitedByData}
											 <PlayerLink player={invitation.invitedByData} />
										{:else}
											 <span class="memberFallbackName">{invitation.invitedBy}</span>
										{/if}
									</span>
								</div>
							</div>

							{#if canManageMembers}
								<div class="invitationActions">
									<Button
										variant="destructive"
										size="sm"
										on:click={() => revokePendingInvitation(invitation)}
										disabled={savingCollaboration}
									>
										<Trash2 class="mr-1.5 h-3.5 w-3.5" />
										{$_('custom_lists.manage.collaboration.revoke_invitation_button')}
									</Button>
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			{:else}
				<p class="emptyRow">{$_('custom_lists.manage.collaboration.pending_empty')}</p>
			{/if}
		</section>
	{/if}

	{#if !canRespondToInvitation && !canViewPendingInvitations}
		<section class="card emptyCard">
			<div class="emptyState">
				<Mail class="h-5 w-5" />
				<p class="hint">{$_('custom_lists.manage.collaboration.pending_empty')}</p>
			</div>
		</section>
	{/if}
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
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.highlightCard {
		background: hsl(var(--primary) / 0.06);
		border-color: hsl(var(--primary) / 0.35);
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

	.formActions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.invitationList {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.invitationRow {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 12px 14px;
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		background: hsl(var(--muted) / 0.1);
	}

	.invitationRowHighlight {
		background: hsl(var(--primary) / 0.08);
		border-color: hsl(var(--primary) / 0.28);
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
		gap: 3px;
		min-width: 0;
	}

	.memberNameRow {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.memberFallbackName,
	.pendingLabel {
		font-weight: 600;
	}

	.memberMeta {
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
	}

	.invitationActions {
		display: flex;
		align-items: center;
		gap: 8px;
		justify-content: flex-end;
	}

	.emptyRow {
		padding: 18px;
		border: 1px dashed hsl(var(--border));
		border-radius: 12px;
		text-align: center;
		font-size: 0.85rem;
		color: hsl(var(--muted-foreground));
		margin: 0;
	}

	.emptyCard {
		align-items: center;
	}

	.emptyState {
		display: flex;
		align-items: center;
		gap: 8px;
		color: hsl(var(--muted-foreground));
	}

	@media (max-width: 760px) {
		.card {
			padding: 16px;
		}

		.invitationRow {
			flex-direction: column;
			align-items: stretch;
		}

		.invitationActions {
			justify-content: flex-start;
		}
	}
</style>