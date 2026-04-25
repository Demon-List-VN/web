<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { user } from '$lib/client';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import PendingInvitationsTab from '../manage/PendingInvitationsTab.svelte';
	import { toast } from 'svelte-sonner';
	import { AlertTriangle, ArrowLeft, CheckCircle2, Users } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';

	type CustomListResolvedRole = 'viewer' | 'owner' | 'admin' | 'helper' | 'moderator';

	type CustomListPermissionFlags = {
		canRespondToInvitation?: boolean;
	};

	type InvitationPageList = {
		id: number;
		title: string;
		currentUserRole?: CustomListResolvedRole;
		permissions?: CustomListPermissionFlags;
		pendingInvitation?: any | null;
	};

	let list: InvitationPageList | null = null;
	let loading = true;
	let loadingError = '';
	let savingCollaboration = false;
	let requestKey = '';
	let justAccepted = false;

	function buildListRequestUrl() {
		return `${import.meta.env.VITE_API_URL}/lists/${$page.params.id}`;
	}

	function getRoleLabel(role: string) {
		if (role === 'owner') return $_('custom_lists.manage.roles.owner');
		if (role === 'admin') return $_('custom_lists.manage.roles.admin');
		if (role === 'helper') return $_('custom_lists.manage.roles.helper');
		if (role === 'moderator') return $_('custom_lists.manage.roles.moderator');
		return $_('custom_lists.manage.roles.viewer');
	}

	function formatDateTime(value: string) {
		return new Date(value).toLocaleString('vi-VN', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	async function loadInvitation(force: boolean = false) {
		if (!$user.checked || !$user.loggedIn) {
			return;
		}

		const nextKey = `${$page.params.id}:${$user.data?.uid || ''}`;
		if (!force && nextKey === requestKey) {
			return;
		}

		requestKey = nextKey;
		loading = true;
		loadingError = '';

		try {
			const res = await fetch(buildListRequestUrl(), {
				headers: {
					Authorization: `Bearer ${await $user.token()}`
				}
			});
			const payload = await res.json().catch(() => null);

			if (!res.ok || !payload) {
				throw new Error(payload?.error || $_('custom_lists.collaborator_invitation.load_failed'));
			}

			list = payload as InvitationPageList;
			if (payload.permissions?.canRespondToInvitation) {
				justAccepted = false;
			}
		} catch (error) {
			loadingError = error instanceof Error ? error.message : $_('custom_lists.collaborator_invitation.load_failed');
		} finally {
			loading = false;
		}
	}

	async function acceptPendingInvitation() {
		if (!list || !canRespondToInvitation) return;

		savingCollaboration = true;

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${list.id}/invitations/accept`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${await $user.token()}`
				}
			});
			const payload = await res.json().catch(() => null);
			if (!res.ok || !payload) {
				throw new Error(payload?.error || $_('custom_lists.toast.failed_accept_invitation'));
			}

			list = payload as InvitationPageList;
			justAccepted = true;
			toast.success($_('custom_lists.toast.invitation_accepted'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_accept_invitation'));
		} finally {
			savingCollaboration = false;
		}
	}

	async function rejectPendingInvitation() {
		if (!list || !canRespondToInvitation) return;

		savingCollaboration = true;

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists/${list.id}/invitations/reject`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${await $user.token()}`
				}
			});
			const payload = await res.json().catch(() => null);
			if (!res.ok) {
				throw new Error(payload?.error || $_('custom_lists.toast.failed_reject_invitation'));
			}

			toast.success($_('custom_lists.toast.invitation_rejected'));
			await goto(payload?.redirect || `/lists/${$page.params.id}`);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_reject_invitation'));
		} finally {
			savingCollaboration = false;
		}
	}

	$: permissions = list?.permissions ?? {};
	$: canRespondToInvitation = Boolean(list && permissions.canRespondToInvitation);
	$: isCollaborator = Boolean(list && list.currentUserRole && list.currentUserRole !== 'viewer');
	$: if ($user.checked && $user.loggedIn) {
		void loadInvitation();
	}
	$: if ($user.checked && !$user.loggedIn) {
		loading = false;
		loadingError = $_('custom_lists.collaborator_invitation.sign_in_required');
	}
</script>

<svelte:head>
	<title>{$_('custom_lists.collaborator_invitation.title')} - {$_('head.site_name')}</title>
</svelte:head>

<div class="page">
	<header class="topBar">
		<div class="topBarLeft">
			<Button variant="ghost" size="sm" on:click={() => goto(`/lists/${$page.params.id}`)}>
				<ArrowLeft class="mr-2 h-4 w-4" />
				{$_('custom_lists.back')}
			</Button>
			<span class="topBarDivider" aria-hidden="true"></span>
			<span class="topBarLabel">{$_('custom_lists.collaborator_invitation.title')}</span>
		</div>
	</header>

	<section class="heroCard">
		<div class="heroCopy">
			<h1>{$_('custom_lists.collaborator_invitation.title')}</h1>
			<p>{$_('custom_lists.collaborator_invitation.subtitle')}</p>
		</div>
		{#if list?.currentUserRole && list.currentUserRole !== 'viewer'}
			<Badge variant="secondary">{getRoleLabel(list.currentUserRole)}</Badge>
		{/if}
	</section>

	{#if loading}
		<div class="stateCard">
			<Users class="h-6 w-6" />
			<p>{$_('custom_lists.detail.loading')}</p>
		</div>
	{:else if loadingError}
		<div class="stateCard errorState">
			<AlertTriangle class="h-6 w-6" />
			<p>{loadingError}</p>
			<div class="stateActions">
				<Button variant="outline" on:click={() => goto(`/lists/${$page.params.id}`)}>
					{$_('custom_lists.collaborator_invitation.view_button')}
				</Button>
			</div>
		</div>
	{:else if list && canRespondToInvitation}
		<PendingInvitationsTab
			{list}
			{savingCollaboration}
			canManageMembers={false}
			canViewPendingInvitations={false}
			{canRespondToInvitation}
			{acceptPendingInvitation}
			{rejectPendingInvitation}
			{getRoleLabel}
			{formatDateTime}
		/>
	{:else if list && isCollaborator}
		<section class="stateCard successState">
			<CheckCircle2 class="h-6 w-6" />
			<div class="stateCopy">
				<h2>{$_(justAccepted ? 'custom_lists.collaborator_invitation.accepted_title' : 'custom_lists.collaborator_invitation.already_member_title')}</h2>
				<p>{$_(justAccepted ? 'custom_lists.collaborator_invitation.accepted_hint' : 'custom_lists.collaborator_invitation.already_member_hint')}</p>
			</div>
			<div class="stateActions">
				<Button on:click={() => goto(`/lists/${$page.params.id}/manage?tab=collaboration`)}>
					{$_('custom_lists.collaborator_invitation.manage_button')}
				</Button>
				<Button variant="outline" on:click={() => goto(`/lists/${$page.params.id}`)}>
					{$_('custom_lists.collaborator_invitation.view_button')}
				</Button>
			</div>
		</section>
	{:else}
		<section class="stateCard">
			<AlertTriangle class="h-6 w-6" />
			<div class="stateCopy">
				<h2>{$_('custom_lists.collaborator_invitation.missing_title')}</h2>
				<p>{$_('custom_lists.collaborator_invitation.missing_hint')}</p>
			</div>
			<div class="stateActions">
				<Button variant="outline" on:click={() => goto(`/lists/${$page.params.id}`)}>
					{$_('custom_lists.collaborator_invitation.view_button')}
				</Button>
			</div>
		</section>
	{/if}
</div>

<style lang="scss">
	.page {
		display: flex;
		flex-direction: column;
		gap: 20px;
		max-width: 960px;
		margin: 0 auto;
		padding: 20px 16px 40px;
	}

	.topBar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}

	.topBarLeft {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.topBarDivider {
		width: 1px;
		height: 18px;
		background: hsl(var(--border));
	}

	.topBarLabel {
		font-size: 0.9rem;
		font-weight: 600;
		color: hsl(var(--muted-foreground));
	}

	.heroCard,
	.stateCard {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 16px;
		padding: 22px;
	}

	.heroCard {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
		background: linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--muted) / 0.24) 100%);
	}

	.heroCopy {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.heroCopy h1,
	.stateCopy h2 {
		margin: 0;
		font-size: 1.3rem;
		font-weight: 700;
	}

	.heroCopy p,
	.stateCopy p,
	.stateCard > p {
		margin: 0;
		color: hsl(var(--muted-foreground));
	}

	.stateCard {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.successState {
		background: hsl(var(--primary) / 0.06);
		border-color: hsl(var(--primary) / 0.3);
	}

	.errorState {
		border-color: hsl(var(--destructive) / 0.32);
	}

	.stateCopy {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.stateActions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	@media (max-width: 640px) {
		.heroCard {
			flex-direction: column;
		}

		.page {
			padding-inline: 12px;
		}
	}
</style>