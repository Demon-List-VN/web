<script lang="ts">
	import { goto } from '$app/navigation';
	import { user } from '$lib/client';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Avatar from '$lib/components/ui/avatar';
	import { toast } from 'svelte-sonner';
	import { locale } from 'svelte-i18n';
	import { ArrowLeft, Building2, Check, ChevronRight, Plus, Settings, UserRound } from 'lucide-svelte';

	let personal: any = null;
	let organizations: any[] = [];
	let loadedFor = '';
	let switchingUid = '';
	let showCreate = false;
	let creating = false;
	let newName = '';
	let newDescription = '';

	$: activeUid = String($user.data?.uid || '');
	$: baseUid = String($user.data?.authenticatedPlayerUid || $user.data?.uid || '');
	$: if ($user.checked) {
		if (!$user.loggedIn) {
			goto('/');
		} else if (baseUid && baseUid !== loadedFor) {
			loadedFor = baseUid;
			void loadAccounts();
		}
	}

	function text(en: string, vi: string) {
		return $locale === 'vi' ? vi : en;
	}

	function avatarUrl(account: any) {
		return `https://cdn.gdlisthub.dev/avatars/${account.uid}.jpg?version=${account.avatarVersion || 0}`;
	}

	async function loadAccounts() {
		try {
			const token = await $user.token();
			const [personalResponse, organizationsResponse] = await Promise.all([
				fetch(`${import.meta.env.VITE_API_URL}/players/${encodeURIComponent(baseUid)}`),
				fetch(`${import.meta.env.VITE_API_URL}/organizations/mine`, {
					headers: { Authorization: `Bearer ${token}` }
				})
			]);
			personal = personalResponse.ok ? await personalResponse.json() : null;
			organizations = organizationsResponse.ok ? await organizationsResponse.json() : [];
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not load accounts');
		}
	}

	async function selectAccount(organization: any | null) {
		const targetUid = organization?.uid || baseUid;

		if (!targetUid || targetUid === activeUid) {
			return;
		}

		switchingUid = targetUid;

		try {
			await $user.switchOrganization(organization?.uid || null);
			toast.success(text('Account switched.', 'Đã chuyển tài khoản.'));
			goto(organization
				? `/org/${encodeURIComponent(organization.name)}`
				: `/player/${encodeURIComponent(baseUid)}`);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not switch account');
		} finally {
			switchingUid = '';
		}
	}

	async function createOrganization() {
		if (!/^[A-Za-z0-9]{3,20}$/.test(newName.trim())) {
			toast.error(text(
				'Name must contain 3-20 letters or numbers.',
				'Tên phải gồm 3-20 chữ cái hoặc chữ số.'
			));

			return;
		}

		creating = true;

		try {
			const response = await fetch(`${import.meta.env.VITE_API_URL}/organizations`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name: newName.trim(),
					organizationDescription: newDescription.trim()
				})
			});
			const organization = await response.json()
				.catch(() => ({}));

			if (!response.ok) {
				throw new Error(organization.message || 'Could not create organization');
			}

			await $user.switchOrganization(organization.uid);
			toast.success(text('Organization created.', 'Đã tạo tổ chức.'));
			goto(`/org/${encodeURIComponent(organization.name)}/settings`);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not create organization');
		} finally {
			creating = false;
		}
	}
</script>

<svelte:head><title>{text('Switch account', 'Chuyển tài khoản')} - GDVN</title></svelte:head>

<div class="accounts-page">
  <header>
    <a href="/"><ArrowLeft size={16} /> {text('Back', 'Quay lại')}</a>
    <span class="eyebrow">GDVN</span>
    <h1>{text('Choose an account', 'Chọn tài khoản')}</h1>
    <p>{text(
      'Choose who you want to represent. You can return here from the avatar menu at any time.',
      'Chọn danh tính bạn muốn đại diện. Bạn có thể quay lại đây từ menu ảnh đại diện bất cứ lúc nào.'
    )}</p>
  </header>

  <section class="account-list">
    {#if personal}
      <button class:active={activeUid === personal.uid} class="account-row" disabled={Boolean(switchingUid)} on:click={() => selectAccount(null)}>
        <span class="avatar-wrap">
          <Avatar.Root class="account-avatar"><Avatar.Image src={avatarUrl(personal)} alt={personal.name} /><Avatar.Fallback>{personal.name?.[0]}</Avatar.Fallback></Avatar.Root>
          <span class="type-icon"><UserRound size={13} /></span>
        </span>
        <span class="account-copy"><strong>{personal.name}</strong><small>{text('Personal account', 'Tài khoản cá nhân')}</small></span>
        {#if activeUid === personal.uid}<span class="active-badge"><Check size={14} /> {text('Active', 'Đang dùng')}</span>{:else}<ChevronRight size={18} />{/if}
      </button>
    {/if}

    {#each organizations as membership}
      {@const organization = membership.players}
      <div class:active={activeUid === organization.uid} class="account-row organization-row">
        <button class="account-main" disabled={Boolean(switchingUid)} on:click={() => selectAccount(organization)}>
          <span class="avatar-wrap">
            <Avatar.Root class="account-avatar"><Avatar.Image src={avatarUrl(organization)} alt={organization.name} /><Avatar.Fallback>{organization.name?.[0]}</Avatar.Fallback></Avatar.Root>
            <span class="type-icon"><Building2 size={13} /></span>
          </span>
          <span class="account-copy"><strong>{organization.name}</strong><small>{text('Organization', 'Tổ chức')} · {membership.role}</small></span>
          {#if activeUid === organization.uid}<span class="active-badge"><Check size={14} /> {text('Active', 'Đang dùng')}</span>{:else}<ChevronRight size={18} />{/if}
        </button>
        <a class="manage-button" href={`/org/${encodeURIComponent(organization.name)}/settings`} title={text('Organization settings', 'Cài đặt tổ chức')}><Settings size={16} /></a>
      </div>
    {/each}
  </section>

  <section class="create-section">
    <button class="create-toggle" on:click={() => (showCreate = !showCreate)}>
      <span><Plus size={19} /></span>
      <div><strong>{text('Create organization', 'Tạo tổ chức')}</strong><small>{text('Start a new shared account', 'Bắt đầu tài khoản dùng chung mới')}</small></div>
      <i class:rotated={showCreate} class="toggle-chevron"><ChevronRight size={18} /></i>
    </button>

    {#if showCreate}
      <div class="create-form">
        <div class="field"><Label for="account-org-name">{text('Name', 'Tên')}</Label><Input id="account-org-name" bind:value={newName} maxlength={20} placeholder="GDVNTeam" /><small>{text('3-20 letters or numbers', '3-20 chữ cái hoặc chữ số')}</small></div>
        <div class="field"><Label for="account-org-description">{text('Description', 'Mô tả')}</Label><textarea id="account-org-description" bind:value={newDescription} maxlength={500} rows={3} /></div>
        <div class="form-actions"><Button variant="outline" on:click={() => (showCreate = false)}>{text('Cancel', 'Hủy')}</Button><Button disabled={creating} on:click={createOrganization}>{creating ? text('Creating…', 'Đang tạo…') : text('Create and switch', 'Tạo và chuyển')}</Button></div>
      </div>
    {/if}
  </section>
</div>

<style>
  .accounts-page{width:min(680px,calc(100% - 28px));margin:0 auto;padding:42px 0 80px}.accounts-page header{text-align:center;margin-bottom:28px}.accounts-page header>a{display:inline-flex;align-items:center;gap:6px;float:left;color:hsl(var(--muted-foreground));font-size:.88rem}.eyebrow{display:block;color:hsl(var(--primary));font-size:.72rem;font-weight:800;letter-spacing:.14em}.accounts-page h1{font-size:clamp(2rem,7vw,3.3rem);font-weight:820;letter-spacing:-.05em;margin:8px 0}.accounts-page header p{max-width:540px;margin:0 auto;color:hsl(var(--muted-foreground))}.account-list{display:grid;gap:9px}.account-row{display:flex;width:100%;align-items:center;gap:14px;border:1px solid hsl(var(--border));border-radius:15px;background:hsl(var(--card));padding:13px;text-align:left;transition:.16s ease}.account-row:hover{border-color:hsl(var(--primary)/.55);transform:translateY(-1px)}.account-row.active{border-color:hsl(var(--primary));box-shadow:0 0 0 3px hsl(var(--primary)/.1)}.organization-row{padding:0;gap:0}.account-main{display:flex;min-width:0;flex:1;align-items:center;gap:14px;padding:13px;text-align:left}.avatar-wrap{position:relative;display:inline-flex;flex:none}:global(.account-avatar){width:54px;height:54px}.type-icon{position:absolute;right:-3px;bottom:-3px;display:grid;width:22px;height:22px;place-items:center;border:2px solid hsl(var(--card));border-radius:50%;background:hsl(var(--primary));color:hsl(var(--primary-foreground))}.account-copy{min-width:0;flex:1}.account-copy strong,.account-copy small{display:block}.account-copy strong{font-size:1.02rem}.account-copy small{color:hsl(var(--muted-foreground));font-size:.8rem;text-transform:capitalize}.active-badge{display:inline-flex;align-items:center;gap:5px;border-radius:999px;background:hsl(var(--primary)/.12);padding:5px 8px;color:hsl(var(--primary));font-size:.75rem;font-weight:700}.manage-button{display:grid;width:46px;align-self:stretch;place-items:center;border-left:1px solid hsl(var(--border));color:hsl(var(--muted-foreground))}.manage-button:hover{color:hsl(var(--foreground))}.create-section{margin-top:20px;overflow:hidden;border:1px dashed hsl(var(--border));border-radius:15px;background:hsl(var(--card))}.create-toggle{display:flex;width:100%;align-items:center;gap:13px;padding:16px;text-align:left}.create-toggle>span{display:grid;width:42px;height:42px;place-items:center;border-radius:12px;background:hsl(var(--muted));color:hsl(var(--primary))}.create-toggle>div{min-width:0;flex:1}.create-toggle strong,.create-toggle small{display:block}.create-toggle small{color:hsl(var(--muted-foreground))}.toggle-chevron{display:inline-flex;transition:transform .16s}.toggle-chevron.rotated{transform:rotate(90deg)}.create-form{display:grid;gap:15px;border-top:1px solid hsl(var(--border));padding:18px}.field{display:grid;gap:6px}.field small{color:hsl(var(--muted-foreground));font-size:.76rem}.field textarea{resize:vertical;border:1px solid hsl(var(--input));border-radius:8px;background:hsl(var(--background));padding:10px 12px}.form-actions{display:flex;justify-content:flex-end;gap:8px}@media(max-width:520px){.accounts-page{padding-top:24px}.accounts-page header>a{float:none;margin-bottom:15px}.active-badge{font-size:0;gap:0}.account-main{padding:11px}.account-row{padding:11px}.organization-row{padding:0}:global(.account-avatar){width:48px;height:48px}}
</style>
