<script lang="ts">
	import { locale } from 'svelte-i18n';
	import { MessageCircle, RefreshCw, Sparkles } from 'lucide-svelte';
	import { user } from '$lib/client';
	import CommunityPostCard from '$lib/components/communityPostCard.svelte';
	import ClanRecordCard from '$lib/components/clan/ClanRecordCard.svelte';

	export let clan: any;
	export let initialActivity: any = null;

	type ActivityItem = {
		kind: 'record' | 'community';
		key: string;
		data: any;
		timestamp: number;
	};

	let activity = initialActivity;
	let loading = !initialActivity;
	let failed = false;
	let loadStarted = Boolean(initialActivity);

	$: items = buildItems(activity);
	$: apiPrefix = `${import.meta.env.VITE_API_URL}/clans/${clan.id}/community`;

	function tr(english: string, vietnamese: string) {
		return $locale === 'vi' ? vietnamese : english;
	}

	function timestamp(value: string | number | null | undefined) {
		if (!value) {
			return 0;
		}

		const numeric = Number(value);
		const date = Number.isFinite(numeric)
			? new Date(numeric < 10_000_000_000 ? numeric * 1000 : numeric)
			: new Date(value);
		const result = date.getTime();

		return Number.isFinite(result) ? result : 0;
	}

	function buildItems(value: any): ActivityItem[] {
		return [
			...(value?.records || []).map((record: any, index: number) => ({
				kind: 'record' as const,
				key: `record-${record.id ?? index}`,
				data: record,
				timestamp: timestamp(record.timestamp ?? record.createdAt)
			})),
			...(value?.communityPosts || []).map((post: any, index: number) => ({
				kind: 'community' as const,
				key: `community-${post.id ?? index}`,
				data: post,
				timestamp: timestamp(post.createdAt ?? post.created_at)
			}))
		].sort((left, right) => right.timestamp - left.timestamp);
	}

	async function loadActivity() {
		loading = true;
		failed = false;
		const headers: Record<string, string> = {};

		if ($user.loggedIn) {
			try {
				headers.Authorization = `Bearer ${await $user.token()}`;
			} catch {}
		}

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/clans/${clan.id}/activity?limit=12`,
				{ headers }
			);

			if (!response.ok) {
				throw new Error('Failed to load clan activity');
			}

			activity = await response.json();
		} catch {
			failed = true;
		} finally {
			loading = false;
		}
	}

	$: if (!loadStarted && (clan.isPublic || $user.checked)) {
		loadStarted = true;
		void loadActivity();
	}
</script>

<div class="activity-feed">
  {#if loading}
    {#each { length: 4 } as _}
      <div class="activity-skeleton" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
    {/each}
  {:else if failed}
    <div class="activity-empty">
      <RefreshCw size={24} />
      <h3>{tr('Could not load clan activity', 'Không thể tải hoạt động bang hội')}</h3>
      <button type="button" on:click={loadActivity}>{tr('Try again', 'Thử lại')}</button>
    </div>
  {:else if items.length === 0}
    <div class="activity-empty">
      <Sparkles size={24} />
      <h3>{tr('This clan is ready for its first post.', 'Bang hội đang chờ bài viết đầu tiên.')}</h3>
      <p>{tr('New records and community posts will appear here.', 'Kỷ lục mới và bài viết cộng đồng sẽ xuất hiện tại đây.')}</p>
      {#if $user.loggedIn && $user.data?.clan == clan.id}
        <a href={`/community/create?clanId=${clan.id}`}><MessageCircle size={15} /> {tr('Create a post', 'Tạo bài viết')}</a>
      {/if}
    </div>
  {:else}
    {#each items as item (item.key)}
      {#if item.kind === 'record'}
        <ClanRecordCard record={item.data} {clan} />
      {:else}
        <CommunityPostCard post={item.data} compact={false} {apiPrefix} />
      {/if}
    {/each}
  {/if}
</div>

<style lang="scss">
.activity-feed {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 12px;

  :global(.communityPost) {
    border-radius: 14px;
    box-shadow: 0 4px 18px hsl(222 40% 2% / 0.035);
  }
}

.activity-empty {
  display: flex;
  min-height: 260px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 30px;
  border: 1px solid hsl(var(--border));
  border-radius: 16px;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--card));
  text-align: center;

  h3 { margin: 0; color: hsl(var(--foreground)); font-size: 17px; font-weight: 800; }
  p { margin: 0; font-size: 12px; }
  a, button {
    display: inline-flex;
    min-height: 36px;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
    padding: 0 13px;
    border: 1px solid hsl(var(--border));
    border-radius: 999px;
    color: hsl(var(--foreground));
    background: hsl(var(--background));
    font-size: 12px;
    font-weight: 800;
    text-decoration: none;
    cursor: pointer;
  }
}

.activity-skeleton {
  display: flex;
  min-height: 150px;
  flex-direction: column;
  gap: 12px;
  padding: 18px;
  border: 1px solid hsl(var(--border));
  border-radius: 14px;
  background: hsl(var(--card));

  span {
    display: block;
    height: 12px;
    border-radius: 999px;
    background: hsl(var(--muted));
  }
  span:first-child { width: 34%; }
  span:nth-child(2) { width: 66%; }
  span:last-child { height: 68px; width: 100%; border-radius: 10px; }
}

@media (max-width: 640px) {
  .activity-feed { gap: 8px; }
  .activity-feed :global(.communityPost) { border-right: 0; border-left: 0; border-radius: 0; }
}
</style>
