<script lang="ts">
	import type { PageData } from './$types';
	import { user } from '$lib/client';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Avatar from '$lib/components/ui/avatar';
	import { toast } from 'svelte-sonner';
	import { locale } from 'svelte-i18n';
	import { Building2, ExternalLink, Facebook, LogIn, Settings, ShieldCheck, Users, Youtube } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	export let data: PageData;

	let organization = data.organization;
	let privateLoadedFor = '';
	let switching = false;
	let bannerFailed = false;

	$: members = organization.members || [];
	$: owner = members.find((member: any) => member.role === 'owner');
	$: collaborators = members.filter((member: any) => member.role === 'collaborator');
	$: canManage = Boolean(organization.currentUserRole);
	$: avatarUrl = `https://cdn.gdvn.net/avatars/${organization.uid}.jpg?version=${organization.avatarVersion || 0}`;
	$: bannerUrl = `https://cdn.gdvn.net/banners/${organization.uid}.jpg?version=${organization.bannerVersion || 0}`;
	$: themeStyle = `--org-bg:${organization.bgColor || 'hsl(var(--card))'};--org-accent:${organization.borderColor || 'hsl(var(--primary))'};`;
	$: if ($user.checked && $user.loggedIn) {
		const key = String($user.data?.authenticatedPlayerUid || $user.data?.uid || '');

		if (key && key !== privateLoadedFor) {
			privateLoadedFor = key;
			void loadPrivateOrganization();
		}
	}

	function text(en: string, vi: string) {
		return $locale === 'vi' ? vi : en;
	}

	function memberAvatar(member: any) {
		const player = member.players;

		return `https://cdn.gdvn.net/avatars/${player.uid}.jpg?version=${player.avatarVersion || 0}`;
	}

	async function loadPrivateOrganization() {
		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/organizations/${encodeURIComponent(organization.uid)}`,
				{ headers: { Authorization: `Bearer ${await $user.token()}` } }
			);

			if (response.ok) {
				organization = await response.json();
			}
		} catch {
		// Public organization data remains usable.
		}
	}

	async function actAsOrganization() {
		switching = true;

		try {
			await $user.switchOrganization(organization.uid);
			toast.success(text(`Now acting as ${organization.name}.`, `Đang đại diện ${organization.name}.`));
			goto('/');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not switch account');
		} finally {
			switching = false;
		}
	}
</script>

<svelte:head>
  <title>{organization.name} - Geometry Dash VN</title>
  <meta property="og:title" content={`${organization.name} - Organization`} />
  <meta property="og:description" content={organization.organizationDescription || 'GDVN organization'} />
  <meta property="og:image" content={avatarUrl} />
</svelte:head>

<div class="org-profile" style={themeStyle}>
  <section class="profile-hero">
    <div class="banner-surface">
      {#if !bannerFailed}
        <img class="banner-image" src={bannerUrl} alt="" on:error={() => (bannerFailed = true)} />
      {/if}
      <div class="banner-shade" />
    </div>
    <div class="identity-row">
      <Avatar.Root class="hero-avatar">
        <Avatar.Image src={avatarUrl} alt={organization.name} />
        <Avatar.Fallback>{organization.name?.[0] || '?'}</Avatar.Fallback>
      </Avatar.Root>
      <div class="identity-copy">
        <Badge variant="secondary"><Building2 size={13} /> {text('Organization', 'Tổ chức')}</Badge>
        <h1>{organization.name}</h1>
        <p>{organization.organizationDescription || text('A shared organization account on Geometry Dash VN.', 'Tài khoản tổ chức dùng chung trên Geometry Dash VN.')}</p>
      </div>
      {#if canManage}
        <div class="hero-actions">
          <Button variant="outline" on:click={() => goto(`/org/${encodeURIComponent(organization.name)}/settings`)}>
            <Settings size={16} /> {text('Manage', 'Quản lý')}
          </Button>
          {#if !$user.data?.isOrganization || $user.data?.uid !== organization.uid}
            <Button disabled={switching} on:click={actAsOrganization}>
              <LogIn size={16} /> {text('Act as organization', 'Đại diện tổ chức')}
            </Button>
          {/if}
        </div>
      {/if}
    </div>
  </section>

  <div class="profile-grid">
    <main>
      <section class="content-card about-card">
        <span class="card-eyebrow">{text('About', 'Giới thiệu')}</span>
        <h2>{text('Organization profile', 'Hồ sơ tổ chức')}</h2>
        <p>{organization.organizationDescription || text('This organization has not added a description yet.', 'Tổ chức này chưa thêm mô tả.')}</p>
        {#if organization.youtube || organization.facebook}
          <div class="social-links">
            {#if organization.youtube}<a href={organization.youtube} target="_blank" rel="noreferrer"><Youtube size={17} /> YouTube <ExternalLink size={13} /></a>{/if}
            {#if organization.facebook}<a href={organization.facebook} target="_blank" rel="noreferrer"><Facebook size={17} /> Facebook <ExternalLink size={13} /></a>{/if}
          </div>
        {/if}
      </section>

      <section class="stat-free-note">
        <ShieldCheck size={20} />
        <div><strong>{text('Organization identity', 'Danh tính tổ chức')}</strong><span>{text('Organizations do not display player stats, records, ranks, or competitive history.', 'Tổ chức không hiển thị chỉ số người chơi, kỷ lục, xếp hạng hoặc lịch sử thi đấu.')}</span></div>
      </section>
    </main>

    <aside class="content-card team-card">
      <div class="team-heading"><div><span class="card-eyebrow">{text('Access', 'Quyền truy cập')}</span><h2>{text('Team', 'Thành viên')}</h2></div><Users size={20} /></div>
      {#if owner}
        <a class="member-row" href={`/player/${owner.players.uid}`}>
          <Avatar.Root class="member-avatar"><Avatar.Image src={memberAvatar(owner)} alt={owner.players.name} /><Avatar.Fallback>{owner.players.name?.[0]}</Avatar.Fallback></Avatar.Root>
          <span><strong>{owner.players.name}</strong><small>{text('Owner', 'Chủ sở hữu')}</small></span>
        </a>
      {/if}
      {#each collaborators as member}
        <a class="member-row" href={`/player/${member.players.uid}`}>
          <Avatar.Root class="member-avatar"><Avatar.Image src={memberAvatar(member)} alt={member.players.name} /><Avatar.Fallback>{member.players.name?.[0]}</Avatar.Fallback></Avatar.Root>
          <span><strong>{member.players.name}</strong><small>{text('Collaborator', 'Cộng tác viên')}</small></span>
        </a>
      {/each}
      {#if !collaborators.length}<p class="team-empty">{text('No collaborators yet.', 'Chưa có cộng tác viên.')}</p>{/if}
    </aside>
  </div>
</div>

<style>
  .org-profile{max-width:1240px;margin:0 auto;padding:28px 22px 80px}.profile-hero{overflow:hidden;border:1px solid color-mix(in srgb,var(--org-accent) 45%,hsl(var(--border)));border-radius:24px;background:var(--org-bg);box-shadow:0 24px 70px rgb(0 0 0/.13)}.banner-surface{height:260px;position:relative;background:linear-gradient(125deg,color-mix(in srgb,var(--org-accent) 72%,#101827),color-mix(in srgb,var(--org-bg) 78%,#05080d))}.banner-image{width:100%;height:100%;object-fit:cover}.banner-shade{position:absolute;inset:0;background:linear-gradient(to top,rgb(0 0 0/.58),transparent 68%)}.identity-row{display:flex;align-items:flex-end;gap:22px;padding:0 30px 28px;margin-top:-62px;position:relative;color:color-mix(in srgb,hsl(var(--foreground)) 90%,white)}:global(.hero-avatar){width:132px;height:132px;border:5px solid var(--org-bg);box-shadow:0 12px 34px rgb(0 0 0/.28);flex:none}.identity-copy{min-width:0;flex:1}.identity-copy h1{font-size:clamp(2.2rem,6vw,4.2rem);line-height:.95;letter-spacing:-.055em;margin:12px 0 8px}.identity-copy p{max-width:670px;opacity:.76}.hero-actions{display:flex;gap:8px;align-self:center}.profile-grid{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:18px;margin-top:18px}.content-card{border:1px solid hsl(var(--border));border-radius:18px;background:hsl(var(--card));padding:24px}.card-eyebrow{text-transform:uppercase;letter-spacing:.13em;font-size:.7rem;font-weight:800;color:var(--org-accent)}.content-card h2{font-size:1.35rem;font-weight:750;margin:5px 0 13px}.about-card>p{font-size:1.02rem;line-height:1.7;color:hsl(var(--muted-foreground));white-space:pre-wrap}.social-links{display:flex;flex-wrap:wrap;gap:9px;margin-top:22px}.social-links a{display:inline-flex;align-items:center;gap:7px;border:1px solid hsl(var(--border));border-radius:9px;padding:8px 11px}.stat-free-note{display:flex;gap:12px;margin-top:18px;border:1px dashed color-mix(in srgb,var(--org-accent) 50%,hsl(var(--border)));border-radius:14px;padding:17px;color:hsl(var(--muted-foreground))}.stat-free-note svg{color:var(--org-accent);flex:none}.stat-free-note strong,.stat-free-note span{display:block}.stat-free-note strong{color:hsl(var(--foreground));margin-bottom:3px}.team-heading{display:flex;align-items:center;justify-content:space-between}.member-row{display:flex;align-items:center;gap:11px;padding:10px 0;border-top:1px solid hsl(var(--border))}:global(.member-avatar){width:40px;height:40px}.member-row span{min-width:0}.member-row strong,.member-row small{display:block}.member-row small{color:hsl(var(--muted-foreground));font-size:.78rem}.team-empty{color:hsl(var(--muted-foreground));font-size:.9rem;padding-top:8px}@media(max-width:820px){.profile-grid{grid-template-columns:1fr}.identity-row{align-items:flex-start;flex-wrap:wrap}.hero-actions{width:100%;align-self:auto}}@media(max-width:560px){.org-profile{padding:14px 12px 60px}.banner-surface{height:190px}.identity-row{padding:0 18px 20px;margin-top:-45px;gap:14px}:global(.hero-avatar){width:96px;height:96px}.identity-copy{flex-basis:calc(100% - 115px)}.identity-copy h1{font-size:2.15rem}.hero-actions{flex-direction:column}.hero-actions :global(button){width:100%}.content-card{padding:19px}}
</style>
