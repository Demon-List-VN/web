<script lang="ts">
	import type { PageData } from './$types';
	import { user } from '$lib/client';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Avatar from '$lib/components/ui/avatar';
	import { toast } from 'svelte-sonner';
	import { Building2, Plus, Search, Settings, Users } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { locale } from 'svelte-i18n';

	export let data: PageData;

	let organizations: any[] = data.organizations || [];
	let mine: any[] = [];
	let mineLoadedFor = '';
	let search = '';
	let showCreate = false;
	let newName = '';
	let newDescription = '';
	let creating = false;

	$: filtered = organizations.filter((organization) =>
		String(organization.name || '')
			.toLowerCase()
			.includes(search.trim()
				.toLowerCase())
	);
	$: if ($user.checked && $user.loggedIn) {
		const key = String($user.data?.authenticatedPlayerUid || $user.data?.uid || '');

		if (key && key !== mineLoadedFor) {
			mineLoadedFor = key;
			void loadMine();
		}
	}

	function text(en: string, vi: string) {
		return $locale === 'vi' ? vi : en;
	}

	function avatarUrl(organization: any) {
		return `https://cdn.gdvn.net/avatars/${organization.uid}.jpg?version=${organization.avatarVersion || 0}`;
	}

	async function loadMine() {
		try {
			const response = await fetch(`${import.meta.env.VITE_API_URL}/organizations/mine`, {
				headers: { Authorization: `Bearer ${await $user.token()}` }
			});
			mine = response.ok ? await response.json() : [];
		} catch {
			mine = [];
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
			const payload = await response.json()
				.catch(() => ({}));

			if (!response.ok) {
				throw new Error(payload.message || 'Could not create organization');
			}

			toast.success(text('Organization created.', 'Đã tạo tổ chức.'));
			goto(`/org/${encodeURIComponent(payload.name)}/settings`);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not create organization');
		} finally {
			creating = false;
		}
	}
</script>

<svelte:head>
  <title>{text('Organizations', 'Tổ chức')} - GDListHub</title>
</svelte:head>

<div class="org-page">
  <section class="hero">
    <div>
      <span class="eyebrow"><Building2 size={15} /> {text('Shared accounts', 'Tài khoản dùng chung')}</span>
      <h1>{text('Organizations', 'Tổ chức')}</h1>
      <p>{text(
        'Create a shared identity for your team, project, or community. Owners control the profile; collaborators can represent the organization across GDListHub.',
        'Tạo danh tính dùng chung cho đội, dự án hoặc cộng đồng. Chủ sở hữu quản lý hồ sơ; cộng tác viên có thể đại diện tổ chức trên GDListHub.'
      )}</p>
    </div>
    {#if $user.loggedIn && !$user.data?.isOrganization}
      <Button on:click={() => (showCreate = !showCreate)}>
        <Plus size={16} /> {text('Create organization', 'Tạo tổ chức')}
      </Button>
    {/if}
  </section>

  {#if showCreate}
    <section class="create-card">
      <div class="field">
        <Label for="organization-name">{text('Organization name', 'Tên tổ chức')}</Label>
        <Input id="organization-name" bind:value={newName} maxlength={20} placeholder="GDListHubTeam" />
        <small>{text('3-20 letters or numbers; this becomes the profile URL.', '3-20 chữ cái hoặc chữ số; đây sẽ là đường dẫn hồ sơ.')}</small>
      </div>
      <div class="field">
        <Label for="organization-description">{text('Short description', 'Mô tả ngắn')}</Label>
        <textarea id="organization-description" bind:value={newDescription} maxlength={500} rows={3} />
      </div>
      <div class="actions">
        <Button variant="outline" on:click={() => (showCreate = false)}>{text('Cancel', 'Hủy')}</Button>
        <Button disabled={creating} on:click={createOrganization}>
          {creating ? text('Creating…', 'Đang tạo…') : text('Create', 'Tạo')}
        </Button>
      </div>
    </section>
  {/if}

  {#if mine.length}
    <section class="section-block">
      <div class="section-title">
        <div><h2>{text('Your organizations', 'Tổ chức của bạn')}</h2><p>{text('Accounts you own or collaborate on.', 'Tài khoản bạn sở hữu hoặc cộng tác.')}</p></div>
      </div>
      <div class="org-grid compact">
        {#each mine as membership}
          {@const organization = membership.players}
          <a class="org-card" href={`/org/${encodeURIComponent(organization.name)}`}>
            <Avatar.Root class="org-avatar">
              <Avatar.Image src={avatarUrl(organization)} alt={organization.name} />
              <Avatar.Fallback>{organization.name?.[0] || '?'}</Avatar.Fallback>
            </Avatar.Root>
            <span class="org-copy"><strong>{organization.name}</strong><small>{membership.role}</small></span>
            <Settings size={17} />
          </a>
        {/each}
      </div>
    </section>
  {/if}

  <section class="section-block">
    <div class="section-title directory-title">
      <div><h2>{text('Discover', 'Khám phá')}</h2><p>{text(`${organizations.length} public organizations`, `${organizations.length} tổ chức công khai`)}</p></div>
      <label class="search-box"><Search size={16} /><input bind:value={search} placeholder={text('Search organizations', 'Tìm tổ chức')} /></label>
    </div>

    {#if filtered.length}
      <div class="org-grid">
        {#each filtered as organization}
          <a class="directory-card" href={`/org/${encodeURIComponent(organization.name)}`} style={`--org-accent:${organization.borderColor || '#64748b'};`}>
            <Avatar.Root class="directory-avatar">
              <Avatar.Image src={avatarUrl(organization)} alt={organization.name} />
              <Avatar.Fallback>{organization.name?.[0] || '?'}</Avatar.Fallback>
            </Avatar.Root>
            <div><h3>{organization.name}</h3><p>{organization.organizationDescription || text('GDListHub organization', 'Tổ chức GDListHub')}</p></div>
            <Users size={17} />
          </a>
        {/each}
      </div>
    {:else}
      <div class="empty">{text('No organizations found.', 'Không tìm thấy tổ chức.')}</div>
    {/if}
  </section>
</div>

<style>
  .org-page{max-width:1180px;margin:0 auto;padding:42px 22px 80px}.hero{display:flex;align-items:flex-end;justify-content:space-between;gap:28px;padding:34px;border:1px solid hsl(var(--border));border-radius:24px;background:radial-gradient(circle at 90% 10%,hsl(var(--primary)/.18),transparent 36%),hsl(var(--card));box-shadow:0 18px 60px rgb(0 0 0/.08)}.hero h1{font-size:clamp(2.1rem,6vw,4.5rem);line-height:.95;letter-spacing:-.055em;margin:14px 0}.hero p{max-width:720px;color:hsl(var(--muted-foreground));font-size:1.04rem}.eyebrow{display:inline-flex;align-items:center;gap:7px;text-transform:uppercase;letter-spacing:.13em;font-size:.74rem;font-weight:800;color:hsl(var(--primary))}.create-card{margin-top:20px;padding:24px;border:1px solid hsl(var(--border));border-radius:18px;background:hsl(var(--card));display:grid;gap:18px}.field{display:grid;gap:7px}.field small,.section-title p{color:hsl(var(--muted-foreground))}.field textarea{width:100%;resize:vertical;border:1px solid hsl(var(--input));border-radius:8px;background:hsl(var(--background));padding:10px 12px}.actions{display:flex;justify-content:flex-end;gap:8px}.section-block{margin-top:42px}.section-title{display:flex;align-items:end;justify-content:space-between;gap:18px;margin-bottom:16px}.section-title h2{font-size:1.35rem;font-weight:750}.directory-title{align-items:center}.search-box{display:flex;align-items:center;gap:8px;width:min(320px,100%);border:1px solid hsl(var(--border));border-radius:10px;padding:9px 12px;background:hsl(var(--card));color:hsl(var(--muted-foreground))}.search-box input{min-width:0;width:100%;border:0;outline:0;background:transparent;color:hsl(var(--foreground))}.org-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.org-grid.compact{grid-template-columns:repeat(2,minmax(0,1fr))}.org-card,.directory-card{display:flex;align-items:center;gap:13px;border:1px solid hsl(var(--border));border-radius:15px;background:hsl(var(--card));padding:14px;transition:.18s ease}.org-card:hover,.directory-card:hover{transform:translateY(-2px);border-color:hsl(var(--primary)/.55);box-shadow:0 10px 28px rgb(0 0 0/.08)}.org-copy,.directory-card>div{min-width:0;flex:1}.org-copy strong,.org-copy small{display:block}.org-copy small{text-transform:capitalize;color:hsl(var(--muted-foreground))}:global(.org-avatar){width:46px;height:46px}:global(.directory-avatar){width:58px;height:58px}.directory-card{border-top:3px solid var(--org-accent)}.directory-card h3{font-size:1.05rem;font-weight:750}.directory-card p{overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;color:hsl(var(--muted-foreground));font-size:.86rem}.empty{padding:50px;text-align:center;border:1px dashed hsl(var(--border));border-radius:16px;color:hsl(var(--muted-foreground))}@media(max-width:850px){.org-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.hero{align-items:flex-start;flex-direction:column}}@media(max-width:580px){.org-page{padding:24px 14px 60px}.hero{padding:24px}.org-grid,.org-grid.compact{grid-template-columns:1fr}.directory-title{align-items:stretch;flex-direction:column}.search-box{width:100%}}
</style>
