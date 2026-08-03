<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Switch } from '$lib/components/ui/switch';
	import { Button } from '$lib/components/ui/button';
	import type { PageData } from './$types';
	import PlayerHoverCard from '$lib/components/playerLink.svelte';
	import { onMount } from 'svelte';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import imageCompression from 'browser-image-compression';
	import { upload } from '$lib/client/storage';
	import InviteButton from './inviteButton.svelte';
	import BoostButton from './boostButton.svelte';
	import Markdown from '$lib/components/markdown.svelte';
	import { isActive } from '$lib/client/isSupporterActive';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import Levels from './levels.svelte';
	import ClanCommunity from './community.svelte';
	import ActivityFeed from './ActivityFeed.svelte';
	import ClanRecordCard from '$lib/components/clan/ClanRecordCard.svelte';
	import ClanTag from '$lib/components/clan/ClanTag.svelte';
	import { _, locale } from 'svelte-i18n';
	import {
		normalizeCustomListRankBadges,
		resolveCustomListRankBadge
	} from '$lib/utils/customListRank';
	import {
		Activity,
		ArrowRight,
		BookOpen,
		CalendarDays,
		Crown,
		Gauge,
		Globe2,
		Layers3,
		LockKeyhole,
		MessageCircle,
		Settings,
		Shield,
		Sparkles,
		Trophy,
		UserPlus,
		Users,
		Zap
	} from 'lucide-svelte';

	export let data: PageData;

	const editedData = structuredClone(data) as any;
	let currentTab = isActive(data.boostedUntil) ? 'activity' : 'members';
	let members: any[] = [];
	let records: any[] = [];
	let invitations: any[] = [];
	let rankedLists: any[] = [];
	let customMemberStats: any[] = [];
	let selectedMemberStat = 'general';
	let selectedRankedList: any = null;
	let membersLoading = false;
	let recordsLoading = false;
	let rankedStatsLoading = false;
	let membersHasMore = true;
	let recordsHasMore = true;
	let transferUID = '';
	let invitation: any = null;
	let invitationCheckedFor = '';
	let fileinput: HTMLInputElement;

	const membersFilter: any = {
		start: 0,
		end: 49,
		sortBy: 'name',
		ascending: true
	};
	const recordsFilter: any = {
		start: 0,
		end: 49,
		sortBy: 'timestamp',
		ascending: false
	};

	$: isMember = $user.loggedIn && Number($user.data?.clan) === Number(data.id);
	$: isOwner = $user.loggedIn && $user.data?.uid === data.owner;
	$: boosted = isActive(data.boostedUntil);
	$: clanImage = `https://cdn.gdvn.net/clan-photos/${data.id}.jpg?version=${data.imageVersion ?? 0}`;
	$: memberRows = selectedMemberStat.startsWith('list:')
		? customMemberStats
		: members.map((player) => ({ player }));

	function tr(english: string, vietnamese: string) {
		return $locale === 'vi' ? vietnamese : english;
	}

	function formatNumber(value: unknown, digits = 0) {
		const number = Number(value);

		return Number.isFinite(number)
			? new Intl.NumberFormat($locale === 'vi' ? 'vi-VN' : 'en-US', {
				maximumFractionDigits: digits
			})
				.format(number)
			: '—';
	}

	function getMemberRankBadge(entry: any) {
		if (!selectedRankedList) {
			return null;
		}

		return resolveCustomListRankBadge(
			entry,
			normalizeCustomListRankBadges(selectedRankedList.rankBadges)
		);
	}

	function getClanPayload() {
		const payload = structuredClone(editedData);

		for (const key of [
			'id',
			'created_at',
			'players',
			'boostedUntil',
			'initialLocale',
			'nameFts',
			'initialActivity'
		]) {
			delete payload[key];
		}

		if (!boosted) {
			delete payload.homeContent;
			delete payload.mode;
			delete payload.tagBgColor;
			delete payload.tagTextColor;
		}

		return payload;
	}

	async function authHeaders(includeJson = false) {
		return {
			...(includeJson ? { 'Content-Type': 'application/json' } : {}),
			Authorization: `Bearer ${await $user.token()}`
		};
	}

	async function fetchMembers(append = false) {
		if (membersLoading || (append && !membersHasMore)) {
			return;
		}

		membersLoading = true;

		const start = append ? members.length : 0;
		const params = new URLSearchParams({
			start: String(start),
			end: String(start + 49),
			sortBy: membersFilter.sortBy,
			ascending: String(membersFilter.ascending)
		});

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/clans/${data.id}/members?${params}`
			);
			const incoming = response.ok ? await response.json() : [];
			members = append ? [...members, ...incoming] : incoming;
			membersHasMore = incoming.length === 50;
		} finally {
			membersLoading = false;
		}
	}

	async function fetchRecords(append = false) {
		if (recordsLoading || (append && !recordsHasMore)) {
			return;
		}

		recordsLoading = true;

		const start = append ? records.length : 0;
		const params = new URLSearchParams({
			start: String(start),
			end: String(start + 49),
			sortBy: recordsFilter.sortBy,
			ascending: String(recordsFilter.ascending)
		});

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/clans/${data.id}/records?${params}`
			);
			const incoming = response.ok ? await response.json() : [];
			records = append ? [...records, ...incoming] : incoming;
			recordsHasMore = incoming.length === 50;
		} finally {
			recordsLoading = false;
		}
	}

	async function fetchRankedLists() {
		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/clans/${data.id}/ranked-lists`
			);
			rankedLists = response.ok ? await response.json() : [];
		} catch {
			rankedLists = [];
		}
	}

	async function fetchCustomMemberStats(listId: number) {
		rankedStatsLoading = true;

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/clans/${data.id}/member-stats/${listId}?start=0&end=499`
			);

			if (!response.ok) {
				throw new Error('Failed to load list stats');
			}

			const result = await response.json();
			customMemberStats = result.data || [];
			selectedRankedList = result.list || rankedLists.find((list) => list.id === listId);
		} catch {
			customMemberStats = [];
			selectedRankedList = null;
			toast.error(tr('Could not load list statistics', 'Không thể tải thống kê danh sách'));
		} finally {
			rankedStatsLoading = false;
		}
	}

	async function changeMemberStat(value: string) {
		selectedMemberStat = value;

		if (value.startsWith('list:')) {
			await fetchCustomMemberStats(Number(value.slice(5)));

			return;
		}

		selectedRankedList = null;
		membersFilter.sortBy = value === 'classic'
			? 'rating'
			: value === 'featured'
			? 'totalFLpt'
			: 'name';
		membersFilter.ascending = value === 'general';
		membersHasMore = true;
		await fetchMembers(false);
	}

	async function fetchInvitations() {
		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/clans/${data.id}/invitations`
			);
			invitations = response.ok ? await response.json() : [];
		} catch {
			invitations = [];
		}
	}

	async function joinClan() {
		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/clans/${data.id}/join`, {
				method: 'PUT',
				headers: await authHeaders()
			})
				.then((response) => {
					if (!response.ok) {
						throw new Error('Failed to join');
					}

					window.location.reload();
				}),
			{
				loading: tr('Joining clan…', 'Đang tham gia bang hội…'),
				success: tr('Welcome to the clan', 'Chào mừng đến với bang hội'),
				error: tr('Could not join this clan', 'Không thể tham gia bang hội')
			}
		);
	}

	async function leaveClan() {
		if (!confirm($_('toast.clan_leave.confirm'))) {
			return;
		}

		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/clans/leave`, {
				method: 'PUT',
				headers: await authHeaders()
			})
				.then((response) => {
					if (!response.ok) {
						throw new Error('Failed to leave');
					}

					window.location.reload();
				}),
			{
				loading: $_('toast.clan_leave.loading'),
				success: tr('You left the clan', 'Bạn đã rời bang hội'),
				error: tr('Could not leave the clan', 'Không thể rời bang hội')
			}
		);
	}

	async function updateClan() {
		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/clans/${data.id}`, {
				method: 'PATCH',
				headers: await authHeaders(true),
				body: JSON.stringify(getClanPayload())
			})
				.then((response) => {
					if (!response.ok) {
						throw new Error('Failed to update clan');
					}

					window.location.reload();
				}),
			{
				loading: $_('toast.clan_update.loading'),
				success: $_('toast.clan_update.success'),
				error: $_('toast.clan_update.error')
			}
		);
	}

	async function transferOwnership() {
		if (!transferUID.trim()) {
			return;
		}

		const previousOwner = editedData.owner;
		editedData.owner = transferUID.trim();
		await updateClan();
		editedData.owner = previousOwner;
	}

	async function deleteClan() {
		if (!confirm($_('toast.clan_delete.confirm'))) {
			return;
		}

		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/clans/${data.id}`, {
				method: 'DELETE',
				headers: await authHeaders()
			})
				.then((response) => {
					if (!response.ok) {
						throw new Error('Failed to delete clan');
					}

					goto('/clans');
					$user.refresh();
				}),
			{
				loading: $_('toast.clan_delete.loading'),
				success: $_('toast.clan_delete.success'),
				error: $_('toast.clan_delete.error')
			}
		);
	}

	async function getImage(event: Event) {
		const target = event.target as HTMLInputElement;
		const image = target.files?.[0];

		if (!image) {
			return;
		}

		const compressed = await imageCompression(image, {
			maxSizeMB: 0.5,
			maxWidthOrHeight: 1200,
			useWebWorker: true
		});

		const uploadImage = async () => {
			editedData.imageVersion = Number(editedData.imageVersion || 0) + 1;
			await upload(`clan-photos/${data.id}.jpg`, compressed, (await $user.token())!);
			const response = await fetch(`${import.meta.env.VITE_API_URL}/clans/${data.id}`, {
				method: 'PATCH',
				headers: await authHeaders(true),
				body: JSON.stringify(getClanPayload())
			});

			if (!response.ok) {
				throw new Error('Failed to save clan image');
			}

			window.location.reload();
		};

		toast.promise(uploadImage(), {
			loading: $_('toast.player_edit.uploading'),
			success: $_('toast.player_edit.success'),
			error: $_('toast.player_edit.error')
		});
	}

	async function acceptInvitation(clanID: number) {
		await fetch(`${import.meta.env.VITE_API_URL}/clans/${clanID}/invite`, {
			method: 'PATCH',
			headers: await authHeaders()
		});
		window.location.reload();
	}

	async function rejectInvitation(clanID: number) {
		await fetch(`${import.meta.env.VITE_API_URL}/clans/${clanID}/invite`, {
			method: 'DELETE',
			headers: await authHeaders()
		});
		window.location.reload();
	}

	async function kickPlayer(player: any) {
		if (!confirm(tr(`Remove ${player.name} from the clan?`, `Xóa ${player.name} khỏi bang hội?`))) {
			return;
		}

		await fetch(`${import.meta.env.VITE_API_URL}/clans/${data.id}/kick/${player.uid}`, {
			method: 'PATCH',
			headers: await authHeaders()
		});
		members = members.filter((member) => member.uid !== player.uid);
		customMemberStats = customMemberStats.filter((entry) => entry.player?.uid !== player.uid);
	}

	async function revokeInvitation(uid: string) {
		if (!confirm(tr('Revoke this invitation?', 'Thu hồi lời mời này?'))) {
			return;
		}

		await fetch(`${import.meta.env.VITE_API_URL}/clans/${data.id}/invitation/${uid}`, {
			method: 'DELETE',
			headers: await authHeaders()
		});
		invitations = invitations.filter((item) => item.players?.uid !== uid);
	}

	$: if (
		$user.checked
		&& $user.loggedIn
		&& $user.data?.uid
		&& invitationCheckedFor !== $user.data.uid
	) {
		invitationCheckedFor = $user.data.uid;
		fetch(`${import.meta.env.VITE_API_URL}/clans/${data.id}/invitation/${$user.data.uid}`)
			.then((response) => (response.ok ? response.json() : null))
			.then((result) => (invitation = result))
			.catch(() => (invitation = null));
	}

	onMount(() => {
		const requests = [fetchMembers(), fetchInvitations()];

		if (boosted) {
			requests.push(fetchRecords(), fetchRankedLists());
		}

		void Promise.all(requests);
	});
</script>

<svelte:head>
  <title>{$_('head.labels.clan')} {data.name} - {$_('head.site_name')}</title>
  <meta property="og:title" content={`${data.name} · ${$_('head.site_name')}`} />
  <meta property="og:description" content={`${data.memberCount} ${tr('members in', 'thành viên trong')} ${data.tag || data.name}`} />
  <meta property="og:image" content={clanImage} />
</svelte:head>

<input
  class="sr-only"
  type="file"
  accept=".jpg,.jpeg,.png,.webp"
  on:change={getImage}
  bind:this={fileinput}
/>

<main class="clan-page">
  <section class="clan-hero">
    <img class="hero-image" src={clanImage} alt="" />
    <div class="hero-shade"></div>
    <div class="hero-content">
      <div class="clan-mark" aria-hidden="true">
        <img src={clanImage} alt="" />
      </div>
      <div class="hero-copy">
        <div class="hero-eyebrow">
          <span><Shield size={13} /> <ClanTag clan={data} compact /></span>
          {#if boosted}<span class="boosted"><Zap size={12} /> {tr('Boosted', 'Đã boost')}</span>{/if}
        </div>
        <h1>{data.name}</h1>
        <div class="hero-meta">
          <span><Users size={15} /> {formatNumber(data.memberCount)} {tr('members', 'thành viên')}</span>
          <span>{#if data.isPublic}<Globe2 size={15} /> {tr('Public community', 'Cộng đồng công khai')}{:else}<LockKeyhole size={15} /> {tr('Private community', 'Cộng đồng riêng tư')}{/if}</span>
        </div>
      </div>

      <div class="hero-actions">
        {#if invitation}
          <Button on:click={() => acceptInvitation(Number(data.id))}>{tr('Accept invite', 'Chấp nhận')}</Button>
          <Button variant="outline" on:click={() => rejectInvitation(Number(data.id))}>{tr('Decline', 'Từ chối')}</Button>
        {:else if isMember}
          {#if boosted && (data.isPublic || isOwner)}<InviteButton />{/if}
          {#if boosted}
            <a class="create-post-action" href={`/community/create?clanId=${data.id}`}>
              <MessageCircle size={16} /> {tr('Create post', 'Tạo bài viết')}
            </a>
          {/if}
        {:else if $user.loggedIn && data.isPublic && (data.memberCount < data.memberLimit || data.memberLimit == 0)}
          <Button on:click={joinClan}><UserPlus size={16} class="mr-2" /> {tr('Join clan', 'Tham gia')}</Button>
        {:else if !$user.loggedIn}
          <a class="create-post-action" href="/clans"><Users size={16} /> {tr('Browse clans', 'Khám phá')}</a>
        {/if}
        {#if $user.loggedIn}<BoostButton {data} />{/if}
      </div>
    </div>
  </section>

  <div class="clan-shell">
    <div class="clan-main">
      <Tabs.Root bind:value={currentTab}>
        {#if !boosted}
          <div class="feature-lock-note">
            <LockKeyhole size={16} />
            <span>{tr('This clan is not boosted. The player list remains available; activity, posts, records, levels, and custom features are locked.', 'Bang hội chưa được boost. Danh sách người chơi vẫn khả dụng; hoạt động, bài viết, kỷ lục, level và tính năng tùy chỉnh đang bị khóa.')}</span>
          </div>
        {/if}
        <div class="tab-strip">
          <Tabs.List class="clan-tabs">
            {#if boosted}<Tabs.Trigger value="activity"><Activity size={15} /> {tr('Overview', 'Tổng quan')}</Tabs.Trigger>{/if}
            {#if boosted}<Tabs.Trigger value="community"><MessageCircle size={15} /> {tr('Posts', 'Bài viết')}</Tabs.Trigger>{/if}
            {#if boosted}<Tabs.Trigger value="records"><Trophy size={15} /> {tr('Records', 'Kỷ lục')}</Tabs.Trigger>{/if}
            <Tabs.Trigger value="members"><Users size={15} /> {tr('Members', 'Thành viên')}</Tabs.Trigger>
            {#if boosted}<Tabs.Trigger value="levels"><Layers3 size={15} /> {tr('Levels', 'Level')}</Tabs.Trigger>{/if}
            {#if boosted && data.homeContent}<Tabs.Trigger value="about"><BookOpen size={15} /> {tr('About', 'Giới thiệu')}</Tabs.Trigger>{/if}
            {#if isMember}<Tabs.Trigger value="invitations"><UserPlus size={15} /> {tr('Invites', 'Lời mời')}</Tabs.Trigger>{/if}
            {#if isMember}<Tabs.Trigger value="settings"><Settings size={15} /> {tr('Settings', 'Cài đặt')}</Tabs.Trigger>{/if}
          </Tabs.List>
        </div>

        {#if boosted}<Tabs.Content value="activity" class="tab-content">
          <div class="section-heading">
            <div>
              <span>{tr('Clan feed', 'Bảng tin bang hội')}</span>
              <h2>{tr('What’s happening in the clan', 'Hoạt động mới trong bang hội')}</h2>
            </div>
            {#if isMember}
              <a href={`/community/create?clanId=${data.id}`}>{tr('New post', 'Bài viết mới')} <ArrowRight size={15} /></a>
            {/if}
          </div>
          <ActivityFeed clan={data} initialActivity={data.initialActivity} />
        </Tabs.Content>{/if}

        {#if boosted}<Tabs.Content value="community" class="tab-content">
          <ClanCommunity clan={data} />
        </Tabs.Content>{/if}

        {#if boosted}<Tabs.Content value="records" class="tab-content">
          <div class="section-heading filter-heading">
            <div>
              <span>{tr('Verified activity', 'Hoạt động đã duyệt')}</span>
              <h2>{tr('Clan records', 'Kỷ lục bang hội')}</h2>
            </div>
            <label class="modern-select">
              <span class="sr-only">{tr('Sort records', 'Sắp xếp kỷ lục')}</span>
              <select
                bind:value={recordsFilter.sortBy}
                on:change={() => {
                  recordsHasMore = true;
                  void fetchRecords(false);
                }}
              >
                <option value="timestamp">{tr('Newest first', 'Mới nhất')}</option>
                <option value="dlPt">{tr('Demon List points', 'Điểm Demon List')}</option>
                <option value="flPt">{tr('Featured points', 'Điểm Featured')}</option>
              </select>
            </label>
          </div>
          <div class="records-list">
            {#each records as record (record.id)}
              <ClanRecordCard {record} clan={data} />
            {/each}
            {#if recordsLoading && records.length === 0}
              {#each { length: 4 } as _}<div class="row-skeleton"></div>{/each}
            {:else if records.length === 0}
              <div class="panel-empty"><Trophy size={24} /><h3>{tr('No records yet', 'Chưa có kỷ lục')}</h3></div>
            {/if}
          </div>
          {#if recordsHasMore && records.length > 0}
            <button class="load-more" type="button" disabled={recordsLoading} on:click={() => fetchRecords(true)}>
              {recordsLoading ? tr('Loading…', 'Đang tải…') : tr('Load more records', 'Tải thêm kỷ lục')}
            </button>
          {/if}
        </Tabs.Content>{/if}

        <Tabs.Content value="members" class="tab-content">
          <div class="section-heading filter-heading">
            <div>
              <span>{tr('Player statistics', 'Thống kê người chơi')}</span>
              <h2>{formatNumber(data.memberCount)} {tr('clan members', 'thành viên bang hội')}</h2>
            </div>
            <label class="modern-select stats-select">
              <span><Gauge size={14} /> {tr('Ranking system', 'Hệ thống xếp hạng')}</span>
              <select value={selectedMemberStat} on:change={(event) => changeMemberStat(event.currentTarget.value)}>
                <option value="general">{tr('General profile', 'Hồ sơ chung')}</option>
                <option value="classic">{tr('Legacy Classic rating', 'Rating Classic cũ')}</option>
                <option value="featured">{tr('Legacy Featured points', 'Điểm Featured cũ')}</option>
                {#if rankedLists.length}
                  <optgroup label={tr('Official & verified lists', 'Danh sách chính thức & xác minh')}>
                    {#each rankedLists as list}
                      <option value={`list:${list.id}`}>{list.title} · {list.rankedMemberCount}</option>
                    {/each}
                  </optgroup>
                {/if}
              </select>
            </label>
          </div>

          {#if selectedRankedList}
            <div class="list-context">
              <div><Layers3 size={17} /><span><strong>{selectedRankedList.title}</strong><small>{selectedRankedList.leaderboardMode === 'creator' ? tr('Creator contributions', 'Đóng góp sáng tạo') : tr('Player leaderboard', 'Bảng xếp hạng người chơi')}</small></span></div>
              <a href={`/lists/${selectedRankedList.identifier}`}>{tr('Open list', 'Mở danh sách')} <ArrowRight size={14} /></a>
            </div>
          {/if}

          <div class="member-list">
            {#if rankedStatsLoading}
              {#each { length: 6 } as _}<div class="member-row row-skeleton"></div>{/each}
            {:else}
              {#each memberRows as entry, index}
                {@const player = entry.player}
                <article class="member-row">
                  <span class="member-position">#{index + 1}</span>
                  <div class="member-player">
                    <PlayerHoverCard {player} showAvatar avatarSize={38} rankBadge={getMemberRankBadge(entry)} />
                    {#if player.uid === data.owner}<span class="owner-chip"><Crown size={11} /> {tr('Owner', 'Chủ bang')}</span>{/if}
                  </div>
                  <div class="member-metrics">
                    {#if selectedRankedList}
                      <span><small>{tr('Global rank', 'Hạng toàn cục')}</small><strong>{entry.rank ? `#${entry.rank}` : '—'}</strong></span>
                      <span><small>{selectedRankedList.mode === 'top' || selectedRankedList.leaderboardMode === 'creator' ? tr('Score', 'Điểm') : tr('Rating', 'Rating')}</small><strong>{formatNumber(entry.score, 1)}</strong></span>
                      <span><small>{selectedRankedList.leaderboardMode === 'creator' ? tr('Contributions', 'Đóng góp') : tr('Completed', 'Hoàn thành')}</small><strong>{formatNumber(entry.completedCount)}</strong></span>
                    {:else if selectedMemberStat === 'classic'}
                      <span><small>{tr('Global rank', 'Hạng toàn cục')}</small><strong>{player.overallRank ? `#${player.overallRank}` : '—'}</strong></span>
                      <span><small>{tr('Classic rating', 'Rating Classic')}</small><strong>{formatNumber(player.rating)}</strong></span>
                    {:else if selectedMemberStat === 'featured'}
                      <span><small>{tr('Global rank', 'Hạng toàn cục')}</small><strong>{player.flrank ? `#${player.flrank}` : '—'}</strong></span>
                      <span><small>{tr('Featured points', 'Điểm Featured')}</small><strong>{formatNumber(player.totalFLpt)}</strong></span>
                    {:else}
                      <span><small>{tr('Classic', 'Classic')}</small><strong>{formatNumber(player.rating)}</strong></span>
                      <span><small>{tr('Featured', 'Featured')}</small><strong>{formatNumber(player.totalFLpt)}</strong></span>
                    {/if}
                  </div>
                  {#if isOwner && player.uid !== $user.data?.uid}
                    <button class="member-remove" type="button" on:click={() => kickPlayer(player)}>{tr('Remove', 'Xóa')}</button>
                  {/if}
                </article>
              {/each}
            {/if}
          </div>

          {#if !selectedRankedList && membersHasMore && members.length > 0}
            <button class="load-more" type="button" disabled={membersLoading} on:click={() => fetchMembers(true)}>{membersLoading ? tr('Loading…', 'Đang tải…') : tr('Load more members', 'Tải thêm thành viên')}</button>
          {/if}
        </Tabs.Content>

        {#if boosted}
          <Tabs.Content value="levels" class="tab-content"><Levels clan={data} /></Tabs.Content>
        {/if}

        {#if boosted && data.homeContent}
          <Tabs.Content value="about" class="tab-content about-content">
            {#if data.mode === 'iframe'}
              <iframe src={data.homeContent} title={tr('Clan home', 'Trang bang hội')}></iframe>
            {:else}
              <Markdown content={data.homeContent} />
            {/if}
          </Tabs.Content>
        {/if}

        <Tabs.Content value="invitations" class="tab-content">
          <div class="section-heading"><div><span>{tr('Grow the community', 'Phát triển cộng đồng')}</span><h2>{tr('Pending invitations', 'Lời mời đang chờ')}</h2></div></div>
          <div class="member-list">
            {#each invitations as item}
              <article class="member-row">
                <div class="member-player"><PlayerHoverCard player={item.players} showAvatar avatarSize={38} /></div>
                <time>{new Date(item.created_at)
.toLocaleDateString($locale === 'vi' ? 'vi-VN' : 'en-US')}</time>
                <button class="member-remove" type="button" on:click={() => revokeInvitation(item.players.uid)}>{tr('Revoke', 'Thu hồi')}</button>
              </article>
            {/each}
            {#if invitations.length === 0}<div class="panel-empty"><UserPlus size={24} /><h3>{tr('No pending invitations', 'Không có lời mời đang chờ')}</h3></div>{/if}
          </div>
        </Tabs.Content>

        <Tabs.Content value="settings" class="tab-content">
          {#if isOwner}
            <section class="settings-card">
              <div class="settings-heading"><Settings size={19} /><div><h2>{tr('Community settings', 'Cài đặt cộng đồng')}</h2><p>{tr('Update how your clan appears and who can join.', 'Cập nhật giao diện bang hội và quyền tham gia.')}</p></div></div>
              <div class="settings-grid">
                <label for="clan-name"><span>{tr('Clan name', 'Tên bang hội')}</span><Input id="clan-name" bind:value={editedData.name} /></label>
                <label for="clan-tag"><span>{tr('Clan tag', 'Tag bang hội')}</span><Input id="clan-tag" bind:value={editedData.tag} /></label>
                <label for="clan-member-limit"><span>{tr('Member limit', 'Giới hạn thành viên')}</span><Input id="clan-member-limit" bind:value={editedData.memberLimit} type="number" inputmode="numeric" /></label>
                <div class="switch-field"><span>{tr('Public community', 'Cộng đồng công khai')}</span><Switch id="clan-public" bind:checked={editedData.isPublic} /></div>
              </div>
              <Button disabled={!boosted} variant="outline" on:click={() => fileinput.click()}>{tr('Change clan cover', 'Đổi ảnh bìa bang hội')}</Button>
              <div class="tag-colors">
                <ClanTag clan={{ ...editedData, boostedUntil: data.boostedUntil }} />
                <Input disabled={!boosted} type="color" bind:value={editedData.tagBgColor} />
                <Input disabled={!boosted} type="color" bind:value={editedData.tagTextColor} />
                <Button disabled={!boosted} variant="outline" on:click={() => {
 editedData.tagTextColor = null; editedData.tagBgColor = null;
}}>{tr('Reset', 'Đặt lại')}</Button>
              </div>

              <div class="custom-home-settings">
                <div><Label>{tr('Custom clan page', 'Trang bang hội tùy chỉnh')}</Label><small>{boosted ? tr('Shown in the About tab.', 'Hiển thị trong tab Giới thiệu.') : tr('Available while the clan is boosted.', 'Khả dụng khi bang hội được boost.')}</small></div>
                <RadioGroup.Root bind:value={editedData.mode} disabled={!boosted}>
                  <div><RadioGroup.Item value="markdown" /><Label for="markdown">Markdown</Label></div>
                  <div><RadioGroup.Item value="iframe" /><Label for="iframe">iframe</Label></div>
                </RadioGroup.Root>
                <Textarea disabled={!boosted} bind:value={editedData.homeContent} rows={7} placeholder={editedData.mode === 'iframe' ? 'https://…' : tr('Tell people about your clan…', 'Giới thiệu về bang hội…')} />
              </div>
              <div class="settings-save"><Button on:click={updateClan}>{tr('Save changes', 'Lưu thay đổi')}</Button></div>
            </section>

            <section class="settings-card danger-card">
              <div class="settings-heading"><Shield size={19} /><div><h2>{tr('Ownership & danger zone', 'Quyền sở hữu & vùng nguy hiểm')}</h2><p>{tr('These actions affect the entire community.', 'Các thao tác này ảnh hưởng đến toàn bộ cộng đồng.')}</p></div></div>
              <Dialog.Root>
                <Dialog.Trigger class="w-full"><Button class="w-full" variant="outline">{tr('Transfer ownership', 'Chuyển quyền sở hữu')}</Button></Dialog.Trigger>
                <Dialog.Content>
                  <Dialog.Header><Dialog.Title>{tr('Transfer ownership', 'Chuyển quyền sở hữu')}</Dialog.Title></Dialog.Header>
                  <Input bind:value={transferUID} placeholder={tr('New owner UID', 'UID chủ bang mới')} />
                  <Button on:click={transferOwnership}>{tr('Transfer', 'Chuyển')}</Button>
                </Dialog.Content>
              </Dialog.Root>
              <Button class="w-full text-red-500" variant="outline" on:click={deleteClan}>{tr('Delete clan', 'Xóa bang hội')}</Button>
            </section>
          {:else}
            <section class="settings-card danger-card">
              <div class="settings-heading"><Shield size={19} /><div><h2>{tr('Leave community', 'Rời cộng đồng')}</h2><p>{tr('You can join another clan after leaving.', 'Bạn có thể tham gia bang hội khác sau khi rời.')}</p></div></div>
              <Button class="w-full text-red-500" variant="outline" on:click={leaveClan}>{tr('Leave clan', 'Rời bang hội')}</Button>
            </section>
          {/if}
        </Tabs.Content>
      </Tabs.Root>
    </div>

    <aside class="clan-sidebar">
      <section class="sidebar-card about-card">
        <div class="sidebar-title"><Shield size={17} /><h2>{tr('About this clan', 'Về bang hội')}</h2></div>
        <p>{tr('A GDListHub community for players to share records, discuss levels, and play together.', 'Cộng đồng GDListHub để người chơi chia sẻ kỷ lục, thảo luận level và cùng thi đấu.')}</p>
        <div class="sidebar-stats">
          <div><strong>{formatNumber(data.memberCount)}</strong><span>{tr('Members', 'Thành viên')}</span></div>
          <div><strong>{data.memberLimit ? formatNumber(data.memberLimit) : '∞'}</strong><span>{tr('Capacity', 'Sức chứa')}</span></div>
        </div>
        <dl>
          <div><dt><Crown size={14} /> {tr('Owner', 'Chủ bang')}</dt><dd><PlayerHoverCard player={data.players} /></dd></div>
          <div><dt><CalendarDays size={14} /> {tr('Created', 'Được tạo')}</dt><dd>{data.created_at ? new Date(data.created_at)
.toLocaleDateString($locale === 'vi' ? 'vi-VN' : 'en-US') : '—'}</dd></div>
          <div><dt>{#if data.isPublic}<Globe2 size={14} />{:else}<LockKeyhole size={14} />{/if} {tr('Access', 'Truy cập')}</dt><dd>{data.isPublic ? tr('Public', 'Công khai') : tr('Invite only', 'Chỉ lời mời')}</dd></div>
        </dl>
      </section>

      <section class="sidebar-card community-rules">
        <div class="sidebar-title"><Sparkles size={17} /><h2>{tr('Community basics', 'Nguyên tắc cộng đồng')}</h2></div>
        <ol>
          <li><span>1</span>{tr('Keep records honest and verifiable.', 'Giữ kỷ lục trung thực và có thể xác minh.')}</li>
          <li><span>2</span>{tr('Respect other players and their progress.', 'Tôn trọng người chơi khác và tiến độ của họ.')}</li>
          <li><span>3</span>{tr('Keep posts relevant to the clan.', 'Giữ bài viết liên quan đến bang hội.')}</li>
        </ol>
      </section>

      {#if boosted}
        <div class="boost-note"><Zap size={15} /><span>{tr('Boost active until', 'Boost hiệu lực đến')} {new Date(data.boostedUntil)
.toLocaleDateString($locale === 'vi' ? 'vi-VN' : 'en-US')}</span></div>
      {/if}
    </aside>
  </div>
</main>

<style lang="scss">
.clan-page {
  --clan-border: hsl(var(--border) / 0.9);
  min-height: calc(100vh - 56px);
  padding-bottom: 64px;
  background:
    radial-gradient(circle at 50% -10%, hsl(199 89% 48% / 0.08), transparent 34rem),
    hsl(var(--background));
}

.clan-hero {
  position: relative;
  width: min(1240px, calc(100% - 32px));
  min-height: 330px;
  margin: 24px auto 0;
  border: 1px solid var(--clan-border);
  border-radius: 22px;
  background: hsl(var(--muted));
  box-shadow: 0 18px 50px hsl(222 40% 2% / 0.12);
  overflow: hidden;
}

.hero-image { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.hero-shade { position: absolute; inset: 0; background: linear-gradient(100deg, rgba(4, 8, 17, 0.92) 4%, rgba(4, 8, 17, 0.62) 52%, rgba(4, 8, 17, 0.22)), linear-gradient(to top, rgba(4, 8, 17, 0.62), transparent 48%); }

.hero-content {
  position: absolute;
  inset: auto 0 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: end;
  gap: 18px;
  padding: 28px;
  color: white;
}

.clan-mark { width: 88px; height: 88px; border: 3px solid rgba(255,255,255,.82); border-radius: 24px; background: #0a0f19; box-shadow: 0 10px 30px rgba(0,0,0,.28); overflow: hidden; }
.clan-mark img { width: 100%; height: 100%; object-fit: cover; }
.hero-copy { min-width: 0; }
.hero-eyebrow, .hero-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.hero-eyebrow > span, .hero-meta > span { display: inline-flex; align-items: center; gap: 5px; }
.hero-eyebrow > span { padding: 5px 8px; border: 1px solid rgba(255,255,255,.18); border-radius: 999px; background: rgba(5,9,17,.34); backdrop-filter: blur(9px); font-size: 10px; font-weight: 850; }
.hero-eyebrow .boosted { color: #fde68a; }
.hero-copy h1 { margin: 8px 0 7px; overflow: hidden; font-size: clamp(32px, 5vw, 52px); font-weight: 900; letter-spacing: -.045em; line-height: .96; text-overflow: ellipsis; white-space: nowrap; }
.hero-meta { color: rgba(255,255,255,.76); font-size: 11px; font-weight: 700; }
.hero-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
.create-post-action { display: inline-flex; min-height: 40px; align-items: center; gap: 7px; padding: 0 14px; border: 1px solid rgba(255,255,255,.26); border-radius: 9px; color: #07101c; background: white; font-size: 12px; font-weight: 850; text-decoration: none; }

.clan-shell { display: grid; grid-template-columns: minmax(0, 820px) minmax(270px, 330px); gap: 24px; width: min(1180px, calc(100% - 32px)); margin: 24px auto 0; align-items: start; }
.clan-main { min-width: 0; }
.feature-lock-note { display: flex; align-items: flex-start; gap: 9px; margin-bottom: 12px; padding: 12px 14px; border: 1px solid hsl(43 90% 52% / .25); border-radius: 12px; color: hsl(43 70% 43%); background: hsl(43 90% 52% / .08); font-size: 11px; font-weight: 700; line-height: 1.5; }
.feature-lock-note :global(svg) { flex: 0 0 auto; margin-top: 1px; }
.tab-strip { position: sticky; top: 56px; z-index: 20; margin-bottom: 16px; padding: 6px; border: 1px solid var(--clan-border); border-radius: 14px; background: hsl(var(--background) / .88); box-shadow: 0 8px 28px hsl(222 40% 2% / .05); backdrop-filter: blur(18px); overflow-x: auto; }
:global(.clan-tabs) { display: flex !important; width: max-content !important; min-width: 100%; height: auto !important; gap: 3px; justify-content: flex-start !important; }
:global(.clan-tabs button) { display: inline-flex; align-items: center; gap: 6px; min-height: 38px; white-space: nowrap; }
:global(.tab-content) { min-width: 0; width: 100%; }

.section-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; margin: 4px 2px 16px; }
.section-heading > div:first-child { display: flex; flex-direction: column; gap: 3px; }
.section-heading span { color: hsl(199 89% 43%); font-size: 10px; font-weight: 850; letter-spacing: .08em; text-transform: uppercase; }
.section-heading h2 { margin: 0; color: hsl(var(--foreground)); font-size: 21px; font-weight: 850; letter-spacing: -.025em; }
.section-heading > a { display: inline-flex; align-items: center; gap: 6px; color: hsl(var(--foreground)); font-size: 12px; font-weight: 800; text-decoration: none; }

.clan-sidebar { position: sticky; top: 76px; display: flex; flex-direction: column; gap: 12px; }
.sidebar-card, .settings-card, .list-context { border: 1px solid var(--clan-border); border-radius: 16px; background: hsl(var(--card)); box-shadow: 0 4px 18px hsl(222 40% 2% / .035); }
.sidebar-card { padding: 18px; }
.sidebar-title, .settings-heading { display: flex; align-items: center; gap: 9px; }
.sidebar-title h2, .settings-heading h2 { margin: 0; font-size: 14px; font-weight: 850; }
.about-card > p { margin: 13px 0 16px; color: hsl(var(--muted-foreground)); font-size: 12px; line-height: 1.55; }
.sidebar-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 15px; }
.sidebar-stats div { display: flex; flex-direction: column; padding: 11px; border-radius: 11px; background: hsl(var(--muted) / .58); }
.sidebar-stats strong { font-size: 19px; font-weight: 850; }
.sidebar-stats span { color: hsl(var(--muted-foreground)); font-size: 9px; font-weight: 750; text-transform: uppercase; letter-spacing: .05em; }
.about-card dl { display: flex; flex-direction: column; gap: 10px; margin: 0; }
.about-card dl > div { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 11px; }
.about-card dt { display: flex; align-items: center; gap: 6px; color: hsl(var(--muted-foreground)); }
.about-card dd { margin: 0; text-align: right; }
.community-rules ol { display: flex; flex-direction: column; gap: 11px; margin: 15px 0 0; padding: 0; list-style: none; }
.community-rules li { display: flex; align-items: flex-start; gap: 9px; color: hsl(var(--muted-foreground)); font-size: 11px; line-height: 1.45; }
.community-rules li span { display: grid; width: 20px; height: 20px; flex: 0 0 20px; place-items: center; border-radius: 50%; color: hsl(var(--foreground)); background: hsl(var(--muted)); font-size: 9px; font-weight: 850; }
.boost-note { display: flex; align-items: center; gap: 8px; padding: 11px 13px; border: 1px solid hsl(43 90% 52% / .25); border-radius: 12px; color: hsl(43 70% 43%); background: hsl(43 90% 52% / .08); font-size: 10px; font-weight: 750; }

.modern-select { display: flex; align-items: center; gap: 8px; color: hsl(var(--muted-foreground)); font-size: 11px; font-weight: 750; }
.modern-select > span { display: inline-flex; align-items: center; gap: 5px; color: hsl(var(--muted-foreground)); letter-spacing: 0; text-transform: none; }
.modern-select select { min-height: 38px; max-width: 270px; padding: 0 32px 0 11px; border: 1px solid var(--clan-border); border-radius: 9px; color: hsl(var(--foreground)); background: hsl(var(--card)); font: inherit; cursor: pointer; }
.records-list, .member-list { display: flex; flex-direction: column; gap: 10px; }
.load-more { display: flex; width: 100%; min-height: 42px; align-items: center; justify-content: center; margin-top: 12px; border: 1px solid var(--clan-border); border-radius: 11px; color: hsl(var(--foreground)); background: hsl(var(--card)); font-size: 12px; font-weight: 800; cursor: pointer; }

.list-context { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; padding: 13px 15px; }
.list-context > div { display: flex; align-items: center; gap: 10px; }
.list-context > div span { display: flex; flex-direction: column; }
.list-context strong { font-size: 12px; }
.list-context small { color: hsl(var(--muted-foreground)); font-size: 10px; }
.list-context a { display: inline-flex; align-items: center; gap: 5px; color: hsl(var(--foreground)); font-size: 11px; font-weight: 800; text-decoration: none; }

.member-row { display: grid; grid-template-columns: 42px minmax(180px, 1fr) auto auto; align-items: center; gap: 12px; min-height: 72px; padding: 12px 14px; border: 1px solid var(--clan-border); border-radius: 13px; background: hsl(var(--card)); }
.member-position { color: hsl(var(--muted-foreground)); font-size: 11px; font-weight: 850; text-align: center; }
.member-player { display: flex; min-width: 0; align-items: center; gap: 8px; }
.owner-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 6px; border-radius: 999px; color: hsl(43 73% 38%); background: hsl(43 90% 52% / .11); font-size: 8px; font-weight: 850; text-transform: uppercase; }
.member-metrics { display: flex; align-items: center; gap: 6px; }
.member-metrics > span { display: flex; min-width: 80px; flex-direction: column; align-items: flex-end; gap: 2px; padding: 7px 9px; border-radius: 9px; background: hsl(var(--muted) / .55); }
.member-metrics small { color: hsl(var(--muted-foreground)); font-size: 8px; font-weight: 750; text-transform: uppercase; letter-spacing: .04em; }
.member-metrics strong { font-size: 13px; font-weight: 850; }
.member-remove { padding: 7px 9px; border: 0; border-radius: 8px; color: hsl(0 70% 48%); background: transparent; font-size: 10px; font-weight: 800; cursor: pointer; }
.member-remove:hover { background: hsl(0 75% 52% / .09); }
.member-row > time { color: hsl(var(--muted-foreground)); font-size: 11px; }

.row-skeleton { min-height: 86px; border: 1px solid var(--clan-border); border-radius: 13px; background: linear-gradient(100deg, hsl(var(--muted)) 20%, hsl(var(--background)) 42%, hsl(var(--muted)) 64%); background-size: 220% 100%; animation: shimmer 1.35s linear infinite; }
.panel-empty { display: flex; min-height: 220px; flex-direction: column; align-items: center; justify-content: center; gap: 8px; border: 1px solid var(--clan-border); border-radius: 14px; color: hsl(var(--muted-foreground)); background: hsl(var(--card)); text-align: center; }
.panel-empty h3 { margin: 0; color: hsl(var(--foreground)); font-size: 15px; }
@keyframes shimmer { from { background-position: 130% 0; } to { background-position: -90% 0; } }

:global(.about-content) { padding: 22px; border: 1px solid var(--clan-border); border-radius: 16px; background: hsl(var(--card)); }
:global(.about-content iframe) { width: 100%; min-height: 70vh; border: 0; border-radius: 10px; }
.settings-card { display: flex; flex-direction: column; gap: 18px; margin-bottom: 14px; padding: 20px; }
.settings-heading { align-items: flex-start; }
.settings-heading p { margin: 3px 0 0; color: hsl(var(--muted-foreground)); font-size: 11px; }
.settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.settings-grid label { display: flex; flex-direction: column; gap: 7px; color: hsl(var(--muted-foreground)); font-size: 11px; font-weight: 750; }
.settings-grid .switch-field { flex-direction: row; align-items: center; justify-content: space-between; padding: 11px 12px; border: 1px solid var(--clan-border); border-radius: 9px; }
.tag-colors { display: flex; align-items: center; gap: 10px; }
.tag-colors :global(input[type='color']) { width: 48px; padding: 3px; }
.custom-home-settings { display: flex; flex-direction: column; gap: 10px; padding-top: 16px; border-top: 1px solid var(--clan-border); }
.custom-home-settings > div:first-child { display: flex; flex-direction: column; gap: 3px; }
.custom-home-settings small { color: hsl(var(--muted-foreground)); font-size: 10px; }
.custom-home-settings :global([role='radiogroup']) { display: flex; gap: 16px; }
.custom-home-settings :global([role='radiogroup'] > div) { display: flex; align-items: center; gap: 6px; }
.settings-save { display: flex; justify-content: flex-end; }
.danger-card { border-color: hsl(0 70% 50% / .25); }

@media (max-width: 980px) {
  .clan-shell { grid-template-columns: 1fr; }
  .clan-sidebar { position: static; display: grid; grid-template-columns: 1fr 1fr; }
  .boost-note { grid-column: 1 / -1; }
  .hero-content { grid-template-columns: auto minmax(0, 1fr); }
  .hero-actions { grid-column: 1 / -1; justify-content: flex-start; }
}

@media (max-width: 700px) {
  .clan-page { padding-bottom: 36px; }
  .clan-hero { width: 100%; min-height: 370px; margin-top: 0; border-right: 0; border-left: 0; border-radius: 0; }
  .hero-content { grid-template-columns: 66px minmax(0, 1fr); padding: 20px 16px; }
  .clan-mark { width: 66px; height: 66px; border-radius: 18px; }
  .hero-copy h1 { font-size: 34px; }
  .hero-actions { width: 100%; }
  .clan-shell { width: 100%; margin-top: 12px; }
  .tab-strip { top: 55px; margin: 0 8px 14px; border-radius: 12px; }
  :global(.tab-content > :not(.records-list):not(.member-list):not(.activity-feed):not(.clanCommunity)) { margin-right: 10px; margin-left: 10px; }
  .section-heading { align-items: flex-start; flex-direction: column; }
  .filter-heading { gap: 11px; }
  .modern-select, .modern-select select { width: 100%; max-width: none; }
  .stats-select { align-items: stretch; flex-direction: column; }
  .records-list, .member-list { gap: 8px; }
  .member-row { grid-template-columns: 34px minmax(0, 1fr) auto; border-right: 0; border-left: 0; border-radius: 0; }
  .member-metrics { grid-column: 2 / -1; justify-content: flex-start; }
  .member-metrics > span { align-items: flex-start; }
  .member-remove { grid-column: 3; grid-row: 1; }
  .clan-sidebar { grid-template-columns: 1fr; padding: 0 10px; }
  .settings-grid { grid-template-columns: 1fr; }
  .settings-card { margin-right: 10px; margin-left: 10px; }
  .list-context { margin-right: 10px; margin-left: 10px; }
  .load-more { width: calc(100% - 20px); margin-right: 10px; margin-left: 10px; }
}

@media (prefers-reduced-motion: reduce) {
  .row-skeleton { animation: none; }
}
</style>
