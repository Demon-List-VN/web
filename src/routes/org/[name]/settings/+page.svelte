<script lang="ts">
	import type { PageData } from './$types';
	import { user } from '$lib/client';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Avatar from '$lib/components/ui/avatar';
	import { upload } from '$lib/client/storage';
	import imageCompression from 'browser-image-compression';
	import { toast } from 'svelte-sonner';
	import { locale } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { ArrowLeft, Camera, Crown, Image, LogIn, Palette, Plus, Save, Trash2, UserRoundCog, Users } from 'lucide-svelte';

	export let data: PageData;

	let organization = data.organization;
	let name = organization.name || '';
	let organizationDescription = organization.organizationDescription || '';
	let youtube = organization.youtube || '';
	let facebook = organization.facebook || '';
	let bgColor = organization.bgColor || '#111827';
	let borderColor = organization.borderColor || '#6366F1';
	let collaboratorName = '';
	let privateLoaded = false;
	let saving = false;
	let uploadingAvatar = false;
	let uploadingBanner = false;
	let addingCollaborator = false;
	let switching = false;
	let transferringUid = '';

	$: role = organization.currentUserRole as 'owner' | 'collaborator' | null;
	$: isOwner = role === 'owner';
	$: collaborators = (organization.members || []).filter((member: any) => member.role === 'collaborator');
	$: avatarUrl = `https://cdn.gdvn.net/avatars/${organization.uid}.jpg?version=${organization.avatarVersion || 0}`;
	$: bannerUrl = `https://cdn.gdvn.net/banners/${organization.uid}.jpg?version=${organization.bannerVersion || 0}`;
	$: if ($user.checked && !privateLoaded) {
		privateLoaded = true;
		void loadPrivate();
	}

	function text(en: string, vi: string) {
		return $locale === 'vi' ? vi : en;
	}

	async function api(path = '', options: RequestInit = {}) {
		const response = await fetch(
			`${import.meta.env.VITE_API_URL}/organizations/${encodeURIComponent(organization.uid)}${path}`,
			{
				...options,
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					...(options.body ? { 'Content-Type': 'application/json' } : {}),
					...options.headers
				}
			}
		);
		const payload = response.status === 204 ? null : await response.json()
			.catch(() => ({}));

		if (!response.ok) {
			throw new Error(payload?.message || 'Organization request failed');
		}

		return payload;
	}

	async function loadPrivate() {
		if (!$user.loggedIn) {
			goto(`/org/${encodeURIComponent(organization.name)}`);

			return;
		}

		try {
			organization = await api();

			if (!organization.currentUserRole && !$user.data?.isAdmin) {
				goto(`/org/${encodeURIComponent(organization.name)}`);
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not load organization access');
			goto(`/org/${encodeURIComponent(organization.name)}`);
		}
	}

	async function saveProfile() {
		saving = true;

		try {
			const previousName = organization.name;
			organization = {
				...organization,
				...await api('', {
					method: 'PATCH',
					body: JSON.stringify({
						name: name.trim(),
						organizationDescription: organizationDescription.trim(),
						youtube: youtube.trim(),
						facebook: facebook.trim(),
						bgColor,
						borderColor
					})
				})
			};
			toast.success(text('Organization profile saved.', 'Đã lưu hồ sơ tổ chức.'));

			if (previousName !== organization.name) {
				goto(`/org/${encodeURIComponent(organization.name)}/settings`, { replaceState: true });
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not save organization');
		} finally {
			saving = false;
		}
	}

	async function uploadImage(event: Event, type: 'avatar' | 'banner') {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];

		if (!file || !isOwner) {
			return;
		}

		type === 'avatar' ? (uploadingAvatar = true) : (uploadingBanner = true);

		try {
			const compressed = await imageCompression(file, {
				maxSizeMB: type === 'avatar' ? 0.08 : 0.35,
				maxWidthOrHeight: type === 'avatar' ? 640 : 1920,
				useWebWorker: true,
				fileType: 'image/jpeg'
			});
			await upload(
				`${type === 'avatar' ? 'avatars' : 'banners'}/${organization.uid}.jpg`,
				compressed,
				(await $user.token())!
			);
			const versionField = type === 'avatar' ? 'avatarVersion' : 'bannerVersion';
			const version = Number(organization[versionField] || 0) + 1;
			organization = {
				...organization,
				...await api('', {
					method: 'PATCH',
					body: JSON.stringify({ [versionField]: version })
				})
			};
			toast.success(type === 'avatar'
				? text('Avatar updated.', 'Đã cập nhật ảnh đại diện.')
				: text('Banner updated.', 'Đã cập nhật ảnh bìa.'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not upload image');
		} finally {
			input.value = '';
			type === 'avatar' ? (uploadingAvatar = false) : (uploadingBanner = false);
		}
	}

	async function addCollaborator() {
		if (!collaboratorName.trim()) {
			return;
		}

		addingCollaborator = true;

		try {
			await api('/collaborators', {
				method: 'POST',
				body: JSON.stringify({ name: collaboratorName.trim() })
			});
			collaboratorName = '';
			organization = await api();
			toast.success(text('Collaborator added.', 'Đã thêm cộng tác viên.'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not add collaborator');
		} finally {
			addingCollaborator = false;
		}
	}

	async function removeCollaborator(member: any) {
		if (!confirm(text(`Remove ${member.players.name} from this organization?`, `Xóa ${member.players.name} khỏi tổ chức?`))) {
			return;
		}

		try {
			await api(`/collaborators/${encodeURIComponent(member.players.uid)}`, { method: 'DELETE' });
			organization = await api();
			toast.success(text('Collaborator removed.', 'Đã xóa cộng tác viên.'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not remove collaborator');
		}
	}

	async function transferOwnership(member: any) {
		const player = member.players;

		if (!confirm(text(
			`Transfer ownership of ${organization.name} to ${player.name}? You will become a collaborator.`,
			`Chuyển quyền sở hữu ${organization.name} cho ${player.name}? Bạn sẽ trở thành cộng tác viên.`
		))) {
			return;
		}

		transferringUid = player.uid;

		try {
			await api('/ownership', {
				method: 'POST',
				body: JSON.stringify({ playerUid: player.uid })
			});
			organization = await api();
			toast.success(text('Ownership transferred.', 'Đã chuyển quyền sở hữu.'));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not transfer ownership');
		} finally {
			transferringUid = '';
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

	async function deleteOrganization() {
		if (!confirm(text(`Permanently delete ${organization.name}?`, `Xóa vĩnh viễn ${organization.name}?`))) {
			return;
		}

		try {
			await api('', { method: 'DELETE' });
			toast.success(text('Organization deleted.', 'Đã xóa tổ chức.'));
			await $user.switchOrganization(null)
				.catch(() => {});
			goto('/organizations');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not delete organization');
		}
	}
</script>

<svelte:head><title>{text('Manage', 'Quản lý')} {organization.name}</title></svelte:head>

<div class="settings-page">
  <header class="settings-header">
    <a href={`/org/${encodeURIComponent(organization.name)}`}><ArrowLeft size={16} /> {text('Back to profile', 'Về hồ sơ')}</a>
    <div><span>{text('Organization settings', 'Cài đặt tổ chức')}</span><h1>{organization.name}</h1></div>
    {#if role}<span class="role-pill">{role}</span>{/if}
  </header>

  {#if role}
    <div class="settings-grid">
      <main>
        {#if isOwner}
          <section class="settings-card media-card">
            <div class="card-heading"><div><span><Image size={15} /> {text('Identity', 'Nhận diện')}</span><h2>{text('Avatar and banner', 'Ảnh đại diện và ảnh bìa')}</h2></div><p>{text('Free for every organization.', 'Miễn phí cho mọi tổ chức.')}</p></div>
            <div class="banner-preview" style={`background:${bgColor};border-color:${borderColor}`}>
              <img src={bannerUrl} alt="" />
              <Avatar.Root class="settings-avatar"><Avatar.Image src={avatarUrl} alt={organization.name} /><Avatar.Fallback>{organization.name?.[0]}</Avatar.Fallback></Avatar.Root>
            </div>
            <div class="upload-actions">
              <label class="upload-button"><Camera size={16} /> {uploadingAvatar ? text('Uploading…', 'Đang tải…') : text('Change avatar', 'Đổi ảnh đại diện')}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingAvatar} on:change={(event) => uploadImage(event, 'avatar')} /></label>
              <label class="upload-button"><Image size={16} /> {uploadingBanner ? text('Uploading…', 'Đang tải…') : text('Change banner', 'Đổi ảnh bìa')}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingBanner} on:change={(event) => uploadImage(event, 'banner')} /></label>
            </div>
          </section>

          <section class="settings-card">
            <div class="card-heading"><div><span><UserRoundCog size={15} /> {text('Basic info', 'Thông tin cơ bản')}</span><h2>{text('Public profile', 'Hồ sơ công khai')}</h2></div></div>
            <div class="form-grid">
              <div class="field"><Label for="org-name">{text('Name', 'Tên')}</Label><Input id="org-name" bind:value={name} maxlength={20} /></div>
              <div class="field full"><Label for="org-description">{text('Description', 'Mô tả')}</Label><textarea id="org-description" bind:value={organizationDescription} maxlength={500} rows={5} /></div>
              <div class="field"><Label for="org-youtube">YouTube URL</Label><Input id="org-youtube" bind:value={youtube} /></div>
              <div class="field"><Label for="org-facebook">Facebook URL</Label><Input id="org-facebook" bind:value={facebook} /></div>
            </div>
          </section>

          <section class="settings-card">
            <div class="card-heading"><div><span><Palette size={15} /> {text('Theme', 'Giao diện')}</span><h2>{text('Profile colors', 'Màu hồ sơ')}</h2></div><span class="theme-dot" style={`background:${borderColor}`} /></div>
            <div class="color-grid"><label><span>{text('Background', 'Nền')}</span><input type="color" bind:value={bgColor} /><code>{bgColor}</code></label><label><span>{text('Accent', 'Điểm nhấn')}</span><input type="color" bind:value={borderColor} /><code>{borderColor}</code></label></div>
            <div class="save-row"><Button disabled={saving} on:click={saveProfile}><Save size={16} /> {saving ? text('Saving…', 'Đang lưu…') : text('Save changes', 'Lưu thay đổi')}</Button></div>
          </section>
        {:else}
          <section class="settings-card collaborator-note">
            <Users size={26} /><div><h2>{text('Collaborator access', 'Quyền cộng tác viên')}</h2><p>{text('You can represent this organization throughout GDListHub. Only the owner can change its name, description, avatar, banner, colors, collaborators, or delete it.', 'Bạn có thể đại diện tổ chức trên GDListHub. Chỉ chủ sở hữu có thể đổi tên, mô tả, ảnh, màu sắc, cộng tác viên hoặc xóa tổ chức.')}</p></div>
          </section>
        {/if}
      </main>

      <aside>
        <section class="settings-card">
          <div class="card-heading"><div><span><LogIn size={15} /> {text('Account', 'Tài khoản')}</span><h2>{text('Represent organization', 'Đại diện tổ chức')}</h2></div></div>
          <p class="muted">{text('Switch your active identity. Organization accounts cannot submit content or create clans.', 'Chuyển danh tính đang hoạt động. Tài khoản tổ chức không thể gửi nội dung hoặc tạo bang hội.')}</p>
          <Button class="wide" disabled={switching || $user.data?.uid === organization.uid} on:click={actAsOrganization}><LogIn size={16} /> {$user.data?.uid === organization.uid ? text('Currently active', 'Đang hoạt động') : text('Act as organization', 'Đại diện tổ chức')}</Button>
        </section>

        {#if isOwner}
          <section class="settings-card">
            <div class="card-heading"><div><span><Users size={15} /> {text('Access', 'Quyền truy cập')}</span><h2>{text('Collaborators', 'Cộng tác viên')}</h2></div><span class="count">{collaborators.length}</span></div>
            <div class="add-row"><Input bind:value={collaboratorName} placeholder={text('Exact player name', 'Tên người chơi chính xác')} on:keydown={(event) => event.key === 'Enter' && addCollaborator()} /><Button size="icon" disabled={addingCollaborator} on:click={addCollaborator}><Plus size={16} /></Button></div>
            <div class="collaborator-list">
              {#each collaborators as member}
                <div class="collaborator"><Avatar.Root class="small-avatar"><Avatar.Image src={`https://cdn.gdvn.net/avatars/${member.players.uid}.jpg?version=${member.players.avatarVersion || 0}`} alt={member.players.name} /><Avatar.Fallback>{member.players.name?.[0]}</Avatar.Fallback></Avatar.Root><span>{member.players.name}</span><button disabled={Boolean(transferringUid)} on:click={() => transferOwnership(member)} aria-label={text('Transfer ownership', 'Chuyển quyền sở hữu')} title={text('Transfer ownership', 'Chuyển quyền sở hữu')}><Crown size={15} /></button><button on:click={() => removeCollaborator(member)} aria-label={text('Remove collaborator', 'Xóa cộng tác viên')}><Trash2 size={15} /></button></div>
              {/each}
              {#if !collaborators.length}<p class="muted">{text('No collaborators yet.', 'Chưa có cộng tác viên.')}</p>{/if}
            </div>
          </section>

          <section class="settings-card danger-card"><h2>{text('Delete organization', 'Xóa tổ chức')}</h2><p>{text('This removes access for every collaborator and hides the organization profile.', 'Thao tác này xóa quyền của mọi cộng tác viên và ẩn hồ sơ tổ chức.')}</p><Button variant="destructive" class="wide" on:click={deleteOrganization}><Trash2 size={16} /> {text('Delete organization', 'Xóa tổ chức')}</Button></section>
        {/if}
      </aside>
    </div>
  {:else}
    <div class="loading-card">{text('Checking organization access…', 'Đang kiểm tra quyền truy cập…')}</div>
  {/if}
</div>

<style>
  .settings-page{max-width:1180px;margin:0 auto;padding:32px 22px 80px}.settings-header{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;margin-bottom:26px}.settings-header>a{display:inline-flex;align-items:center;gap:7px;color:hsl(var(--muted-foreground));font-size:.9rem}.settings-header>div{text-align:center}.settings-header span{font-size:.74rem;text-transform:uppercase;letter-spacing:.12em;color:hsl(var(--muted-foreground));font-weight:750}.settings-header h1{font-size:2.1rem;font-weight:800;letter-spacing:-.04em}.role-pill{justify-self:end;border:1px solid hsl(var(--border));border-radius:999px;padding:5px 10px}.settings-grid{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:16px;align-items:start}.settings-grid main,.settings-grid aside{display:grid;gap:16px}.settings-grid aside{position:sticky;top:72px}.settings-card{border:1px solid hsl(var(--border));border-radius:16px;background:hsl(var(--card));padding:21px}.card-heading{display:flex;justify-content:space-between;align-items:start;gap:16px;margin-bottom:17px}.card-heading>div>span{display:flex;align-items:center;gap:6px;color:hsl(var(--primary));font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;font-weight:800}.card-heading h2,.danger-card h2,.collaborator-note h2{font-size:1.18rem;font-weight:760;margin-top:4px}.card-heading>p,.muted,.danger-card p,.collaborator-note p{font-size:.88rem;color:hsl(var(--muted-foreground))}.banner-preview{height:200px;position:relative;overflow:hidden;border:2px solid;border-radius:13px}.banner-preview>img{width:100%;height:100%;object-fit:cover}.banner-preview:after{content:'';position:absolute;inset:0;background:linear-gradient(to top,rgb(0 0 0/.45),transparent)}:global(.settings-avatar){position:absolute;width:82px;height:82px;left:20px;bottom:16px;border:4px solid hsl(var(--card));z-index:1}.upload-actions{display:flex;gap:9px;margin-top:13px}.upload-button{display:inline-flex;align-items:center;gap:7px;border:1px solid hsl(var(--border));border-radius:8px;padding:8px 11px;font-size:.88rem;cursor:pointer}.upload-button input{display:none}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px}.field{display:grid;gap:7px}.field.full{grid-column:1/-1}.field textarea{resize:vertical;border:1px solid hsl(var(--input));border-radius:8px;background:hsl(var(--background));padding:10px 12px}.color-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.color-grid label{display:grid;grid-template-columns:1fr auto;align-items:center;gap:6px;border:1px solid hsl(var(--border));border-radius:10px;padding:11px}.color-grid input{width:42px;height:30px;border:0;background:transparent}.color-grid code{grid-column:1/-1;color:hsl(var(--muted-foreground));font-size:.78rem}.theme-dot{width:24px;height:24px;border-radius:50%}.save-row{display:flex;justify-content:flex-end;margin-top:17px}:global(.wide){width:100%;margin-top:14px}.add-row{display:flex;gap:7px}.collaborator-list{display:grid;gap:4px;margin-top:12px}.collaborator{display:flex;align-items:center;gap:9px;padding:8px;border-radius:9px;background:hsl(var(--muted)/.45)}:global(.small-avatar){width:31px;height:31px}.collaborator span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}.collaborator button{color:hsl(var(--muted-foreground));padding:5px}.collaborator button:hover{color:hsl(var(--destructive))}.count{border-radius:999px;background:hsl(var(--muted));padding:3px 8px}.danger-card{border-color:hsl(var(--destructive)/.4)}.danger-card p{margin:7px 0}.collaborator-note{display:flex;gap:14px}.collaborator-note :global(svg){color:hsl(var(--primary));flex:none}.loading-card{text-align:center;padding:80px;border:1px dashed hsl(var(--border));border-radius:16px;color:hsl(var(--muted-foreground))}@media(max-width:850px){.settings-grid{grid-template-columns:1fr}.settings-grid aside{position:static}.settings-header{grid-template-columns:1fr auto}.settings-header>div{text-align:right}.role-pill{display:none}}@media(max-width:560px){.settings-page{padding:22px 12px 60px}.settings-header h1{font-size:1.45rem}.form-grid,.color-grid{grid-template-columns:1fr}.field.full{grid-column:auto}.upload-actions{flex-direction:column}.upload-button{justify-content:center}}
</style>
