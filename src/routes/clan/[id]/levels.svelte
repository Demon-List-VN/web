<script lang="ts">
	import { onMount } from 'svelte';
	import { locale } from 'svelte-i18n';
	import {
		Activity,
		ArrowRight,
		BadgeCheck,
		Layers3,
		RefreshCw,
		Sparkles,
		Trophy,
		Users
	} from 'lucide-svelte';
	import LevelCard from '$lib/components/levelCard.svelte';
	import { toLevelCardProps } from '$lib/components/levelCardProps';

	export let clan: any;

	const PAGE_SIZE = 20;

	let rankedLists: any[] = [];
	let selectedListId = 'created';
	let activeList: any = null;
	let levels: any[] = [];
	let total = 0;
	let loadingLists = true;
	let loadingLevels = false;
	let loadError = false;
	let requestVersion = 0;

	$: hasMore = levels.length < total;
	$: isCreatedCategory = selectedListId === 'created';
	$: coverage = !isCreatedCategory && activeList?.levelCount > 0
		? Math.round((total / activeList.levelCount) * 100)
		: null;

	function tr(english: string, vietnamese: string) {
		return $locale === 'vi' ? vietnamese : english;
	}

	function formatNumber(value: unknown) {
		const number = Number(value);

		return Number.isFinite(number)
			? new Intl.NumberFormat($locale === 'vi' ? 'vi-VN' : 'en-US')
				.format(number)
			: '—';
	}

	function cardType(entry: any) {
		return (isCreatedCategory ? entry.level?.isPlatformer : activeList?.isPlatformer)
			? 'pl'
			: 'dl';
	}

	function cardProps(entry: any) {
		return toLevelCardProps(entry.level || {}, cardType(entry), {
			top: entry.position ?? null,
			rating: entry.rating ?? entry.level?.rating ?? null,
			minProgress: entry.minProgress ?? null,
			backgroundColor: activeList?.backgroundColor ?? null,
			borderColor: activeList?.borderColor ?? null
		});
	}

	function activityLabel(entry: any) {
		const roles = Array.isArray(entry.clanSourceRoles) ? entry.clanSourceRoles : [];

		if (roles.includes('record')) {
			return tr('Clan completion', 'Bang hội đã hoàn thành');
		}

		if (roles.includes('creator')) {
			return tr('Creator contribution', 'Đóng góp sáng tạo');
		}

		return tr('Clan contribution', 'Đóng góp bang hội');
	}

	async function fetchRankedLists() {
		loadingLists = true;
		loadError = false;

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/clans/${clan.id}/ranked-lists`
			);

			if (!response.ok) {
				throw new Error('Failed to load ranked lists');
			}

			rankedLists = await response.json();
		} catch {
			rankedLists = [];
		} finally {
			loadingLists = false;
		}

		selectedListId = 'created';
		await fetchLevels(false);
	}

	async function fetchLevels(append: boolean) {
		if (!selectedListId || loadingLevels) {
			return;
		}

		loadingLevels = true;
		loadError = false;
		const version = ++requestVersion;
		const start = append ? levels.length : 0;
		const params = new URLSearchParams({
			start: String(start),
			end: String(start + PAGE_SIZE - 1)
		});

		try {
			const endpoint = isCreatedCategory
				? `${import.meta.env.VITE_API_URL}/clans/${clan.id}/created-levels?${params}`
				: `${import.meta.env.VITE_API_URL}/clans/${clan.id}/list-levels/${selectedListId}?${params}`;
			const response = await fetch(endpoint);

			if (!response.ok) {
				throw new Error('Failed to load clan list levels');
			}

			const result = await response.json();

			if (version !== requestVersion) {
				return;
			}

			activeList = isCreatedCategory
				? {
					id: 'created',
					title: tr('Levels created by clan', 'Level được tạo bởi bang hội'),
					isCreatedCategory: true
				}
				: result.list;
			total = Number(result.total || 0);
			const incoming = isCreatedCategory
				? (result.data || []).map((level: any) => ({
					id: level.id,
					level,
					clanMemberCount: 1,
					clanSourceRoles: ['creator']
				}))
				: (result.data || []);
			levels = append ? [...levels, ...incoming] : incoming;
		} catch {
			if (version === requestVersion) {
				loadError = true;

				if (!append) {
					levels = [];
					activeList = isCreatedCategory
						? {
							id: 'created',
							title: tr('Levels created by clan', 'Level được tạo bởi bang hội'),
							isCreatedCategory: true
						}
						: rankedLists.find(
							(list) => String(list.id) === selectedListId
						) || null;
				}
			}
		} finally {
			if (version === requestVersion) {
				loadingLevels = false;
			}
		}
	}

	async function changeList(value: string) {
		selectedListId = value;
		levels = [];
		total = 0;
		activeList = rankedLists.find((list) => String(list.id) === value) || null;
		requestVersion += 1;
		loadingLevels = false;
		await fetchLevels(false);
	}

	onMount(() => {
		void fetchRankedLists();
	});
</script>

<div class="clan-levels">
  <section class="levels-toolbar">
    <div class="toolbar-copy">
      <span><Layers3 size={14} /> {tr('Clan level categories', 'Danh mục level bang hội')}</span>
      <h2>{tr('Levels connected to this clan', 'Level liên quan đến bang hội')}</h2>
      <p>{tr('See levels created by clan members, or choose an official or verified list to follow clan progress.', 'Xem level do thành viên tạo, hoặc chọn danh sách chính thức hay đã xác minh để theo dõi tiến độ bang hội.')}</p>
    </div>

    {#if !loadingLists}
      <label class="list-picker" for="clan-level-list">
        <span>{tr('Category', 'Danh mục')}</span>
        <select
          id="clan-level-list"
          value={selectedListId}
          on:change={(event) => changeList(event.currentTarget.value)}
        >
          <option value="created">{tr('Levels created by clan', 'Level được tạo bởi bang hội')}</option>
          {#if rankedLists.length}
            <optgroup label={tr('Ranked-list progress', 'Tiến độ danh sách xếp hạng')}>
              {#each rankedLists as list}
                <option value={String(list.id)}>{list.title} · {formatNumber(list.rankedMemberCount)}</option>
              {/each}
            </optgroup>
          {/if}
        </select>
      </label>
    {/if}
  </section>

  {#if activeList}
    <section class="list-summary" class:created-summary={isCreatedCategory}>
      <div class="list-identity">
        <span class="list-icon"><Trophy size={18} /></span>
        <div>
          <span class="list-badges">
            {#if isCreatedCategory}
              <span><Users size={12} /> {tr('Clan creators', 'Nhà sáng tạo bang hội')}</span>
            {:else}
              {#if activeList.isOfficial}<span><BadgeCheck size={12} /> {tr('Official', 'Chính thức')}</span>{:else if activeList.isVerified}<span><BadgeCheck size={12} /> {tr('Verified', 'Đã xác minh')}</span>{/if}
              <span>{activeList.leaderboardMode === 'creator' ? tr('Creator list', 'Danh sách sáng tạo') : tr('Player list', 'Danh sách người chơi')}</span>
            {/if}
          </span>
          <h3>{activeList.title}</h3>
        </div>
      </div>

      <div class="summary-metrics">
        <span><strong>{formatNumber(total)}</strong><small>{isCreatedCategory ? tr('Created levels', 'Level đã tạo') : tr('Clan levels', 'Level bang hội')}</small></span>
        {#if !isCreatedCategory}
          <span><strong>{formatNumber(activeList.levelCount)}</strong><small>{tr('List levels', 'Level trong list')}</small></span>
          <span><strong>{coverage === null ? '—' : `${coverage}%`}</strong><small>{tr('Coverage', 'Độ phủ')}</small></span>
        {/if}
      </div>

      {#if !isCreatedCategory}
        <a href={`/lists/${activeList.identifier}`}>
          {tr('Open list', 'Mở danh sách')} <ArrowRight size={15} />
        </a>
      {/if}
    </section>
  {/if}

  {#if loadingLists || (loadingLevels && levels.length === 0)}
    <div class="levels-grid" aria-label={tr('Loading levels', 'Đang tải level')}>
      {#each { length: 6 } as _}
        <div class="level-skeleton" aria-hidden="true"></div>
      {/each}
    </div>
  {:else if loadError && levels.length === 0}
    <div class="levels-empty">
      <RefreshCw size={25} />
      <h3>{tr('Could not load clan levels', 'Không thể tải level bang hội')}</h3>
      <button type="button" on:click={() => rankedLists.length ? fetchLevels(false) : fetchRankedLists()}>{tr('Try again', 'Thử lại')}</button>
    </div>
  {:else if !isCreatedCategory && rankedLists.length === 0}
    <div class="levels-empty">
      <Sparkles size={25} />
      <h3>{tr('No ranked-list activity yet', 'Chưa có hoạt động trên danh sách xếp hạng')}</h3>
      <p>{tr('When clan members enter an official or verified list leaderboard, their levels will appear here.', 'Khi thành viên xuất hiện trên bảng xếp hạng chính thức hoặc đã xác minh, level của họ sẽ hiện tại đây.')}</p>
      <a href="/lists">{tr('Explore lists', 'Khám phá danh sách')} <ArrowRight size={15} /></a>
    </div>
  {:else if levels.length === 0}
    <div class="levels-empty">
      <Activity size={25} />
      <h3>{isCreatedCategory ? tr('No clan-created levels yet', 'Chưa có level do bang hội tạo') : tr('No level activity on this list', 'Chưa có hoạt động level trên danh sách này')}</h3>
      <p>{isCreatedCategory ? tr('Accepted levels created by current clan members will appear here.', 'Level đã được duyệt do thành viên hiện tại tạo sẽ xuất hiện tại đây.') : tr('Try another list from the selector above.', 'Hãy thử danh sách khác ở bộ chọn phía trên.')}</p>
    </div>
  {:else}
    <div class="levels-grid">
      {#each levels as entry (entry.id)}
        <article class="clan-level-entry">
          <LevelCard
            {...cardProps(entry)}
            type={cardType(entry)}
            ratingPrediction={false}
          />
          <footer>
            {#if isCreatedCategory}
              <span><Users size={14} /> {entry.level?.creatorData?.name || entry.level?.creator || tr('Clan member', 'Thành viên bang hội')}</span>
              <span><Layers3 size={14} /> {tr('Created by clan member', 'Do thành viên bang hội tạo')}</span>
            {:else}
              <span><Users size={14} /> {formatNumber(entry.clanMemberCount)} {tr('members', 'thành viên')}</span>
              <span><Activity size={14} /> {activityLabel(entry)}</span>
            {/if}
          </footer>
        </article>
      {/each}
    </div>

    {#if hasMore}
      <button class="load-more" type="button" disabled={loadingLevels} on:click={() => fetchLevels(true)}>
        {loadingLevels ? tr('Loading…', 'Đang tải…') : tr('Load more levels', 'Tải thêm level')}
      </button>
    {/if}
  {/if}
</div>

<style lang="scss">
.clan-levels {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 14px;
}

.levels-toolbar,
.list-summary {
  border: 1px solid hsl(var(--border));
  border-radius: 16px;
  background: hsl(var(--card));
  box-shadow: 0 4px 18px hsl(222 40% 2% / 0.035);
}

.list-summary.created-summary {
  grid-template-columns: minmax(0, 1fr) auto;
}

.levels-toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: 18px;
}

.toolbar-copy {
  min-width: 0;

  > span {
    display: flex;
    align-items: center;
    gap: 6px;
    color: hsl(199 89% 43%);
    font-size: 10px;
    font-weight: 850;
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }

  h2 {
    margin: 5px 0 4px;
    color: hsl(var(--foreground));
    font-size: 19px;
    font-weight: 850;
    letter-spacing: -0.025em;
  }

  p {
    max-width: 520px;
    margin: 0;
    color: hsl(var(--muted-foreground));
    font-size: 11px;
    line-height: 1.5;
  }
}

.list-picker {
  display: flex;
  min-width: 230px;
  flex: 0 0 250px;
  flex-direction: column;
  gap: 6px;
  color: hsl(var(--muted-foreground));
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;

  select {
    width: 100%;
    min-height: 40px;
    padding: 0 32px 0 11px;
    border: 1px solid hsl(var(--border));
    border-radius: 9px;
    color: hsl(var(--foreground));
    background: hsl(var(--background));
    font-size: 11px;
    font-weight: 750;
    text-transform: none;
    cursor: pointer;
  }
}

.list-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 18px;
  padding: 15px 17px;
}

.list-identity {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 11px;

  h3 {
    margin: 3px 0 0;
    overflow: hidden;
    font-size: 15px;
    font-weight: 850;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.list-icon {
  display: grid;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  place-items: center;
  border-radius: 11px;
  color: hsl(43 82% 44%);
  background: hsl(43 90% 52% / 0.11);
}

.list-badges {
  display: flex;
  align-items: center;
  gap: 5px;

  span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: hsl(var(--muted-foreground));
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  span:first-child { color: hsl(199 89% 43%); }
}

.summary-metrics {
  display: flex;
  gap: 5px;

  > span {
    display: flex;
    min-width: 72px;
    flex-direction: column;
    align-items: flex-end;
    padding: 7px 9px;
    border-radius: 9px;
    background: hsl(var(--muted) / 0.55);
  }

  strong { font-size: 13px; font-weight: 850; }
  small { color: hsl(var(--muted-foreground)); font-size: 8px; font-weight: 750; text-transform: uppercase; }
}

.list-summary > a,
.levels-empty a,
.levels-empty button {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 12px;
  border: 1px solid hsl(var(--border));
  border-radius: 999px;
  color: hsl(var(--foreground));
  background: hsl(var(--background));
  font-size: 10px;
  font-weight: 800;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
}

.levels-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.clan-level-entry {
  min-width: 0;
  border: 1px solid hsl(var(--border));
  border-radius: 13px;
  background: hsl(var(--card));
  overflow: hidden;

  :global(.level) { margin: 0; }
  :global(.level > *) { border: 0; border-radius: 0; box-shadow: none; }

  footer {
    display: flex;
    min-height: 38px;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 11px;
    border-top: 1px solid hsl(var(--border));
    color: hsl(var(--muted-foreground));
    font-size: 9px;
    font-weight: 750;

    span {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
  }
}

.level-skeleton {
  min-height: 340px;
  border: 1px solid hsl(var(--border));
  border-radius: 13px;
  background:
    linear-gradient(100deg, transparent 20%, hsl(var(--background) / 0.7) 42%, transparent 64%),
    hsl(var(--muted));
  background-size: 220% 100%;
  animation: levels-shimmer 1.35s linear infinite;
}

.levels-empty {
  display: flex;
  min-height: 270px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 30px;
  border: 1px solid hsl(var(--border));
  border-radius: 16px;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--card));
  text-align: center;

  h3 { margin: 0; color: hsl(var(--foreground)); font-size: 16px; font-weight: 850; }
  p { max-width: 470px; margin: 0; font-size: 11px; line-height: 1.5; }
}

.load-more {
  min-height: 42px;
  border: 1px solid hsl(var(--border));
  border-radius: 11px;
  color: hsl(var(--foreground));
  background: hsl(var(--card));
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

@keyframes levels-shimmer {
  from { background-position: 130% 0; }
  to { background-position: -90% 0; }
}

@media (max-width: 760px) {
  .levels-toolbar {
    align-items: stretch;
    flex-direction: column;
    margin: 0 10px;
  }

  .list-picker { width: 100%; min-width: 0; flex-basis: auto; }

  .list-summary {
    grid-template-columns: minmax(0, 1fr) auto;
    margin: 0 10px;
  }

  .summary-metrics {
    grid-column: 1 / -1;
    grid-row: 2;

    > span { flex: 1; align-items: flex-start; }
  }

  .levels-grid { grid-template-columns: 1fr; gap: 8px; }
  .clan-level-entry { border-right: 0; border-left: 0; border-radius: 0; }
  .levels-empty { margin: 0 10px; }
  .load-more { margin: 0 10px; }
}

@media (prefers-reduced-motion: reduce) {
  .level-skeleton { animation: none; }
}
</style>
