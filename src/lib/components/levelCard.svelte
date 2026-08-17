<script lang="ts">
	import { browser } from '$app/environment';
	import * as Card from '$lib/components/ui/card';
	import * as ContextMenu from '$lib/components/ui/context-menu';
	import type {
		LevelCardProps,
		LevelCardTag
	} from '$lib/components/levelCardProps';
	import { toast } from 'svelte-sonner';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import Check from 'svelte-radix/Check.svelte';
	import Clock from 'svelte-radix/Clock.svelte';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { user } from '$lib/client';
	import { calcRating } from '$lib/client/rating';
	import { _ } from 'svelte-i18n';
	import PlayerLink from '$lib/components/playerLink.svelte';

	let failedToLoad = false;
	let hoverThumbnailFailed = false;
	let thumbnailStatusKey = '';

	async function getThumbnailResponse(url: string) {
		let response = await fetch(url, { method: 'HEAD' });

		if (response.status === 405) {
			response = await fetch(url);
		}

		return response;
	}

	async function verifyYoutubeThumbnail(statusKey: string, url: string) {
		try {
			const response = await getThumbnailResponse(url);

			if (thumbnailStatusKey !== statusKey) {
				return;
			}

			failedToLoad = !response.ok || response.status === 404;
		} catch {
			if (thumbnailStatusKey === statusKey) {
				failedToLoad = true;
			}
		}
	}

	$: hasVideoThumbnail = Boolean(videoID?.trim());
	$: youtubeThumbnailUrl = hasVideoThumbnail
		? `https://img.youtube.com/vi/${videoID}/0.jpg`
		: '';
	$: levelThumbUrl = `https://levelthumbs.prevter.me/thumbnail/${id}/small`;
	$: thumbnailUrl = hasVideoThumbnail && !failedToLoad
		? youtubeThumbnailUrl
		: levelThumbUrl;
	$: if (!hasVideoThumbnail) {
		failedToLoad = false;
		hoverThumbnailFailed = false;
		thumbnailStatusKey = '';
	} else if (browser) {
		const nextThumbnailStatusKey = `${id ?? ''}:${videoID}`;

		if (thumbnailStatusKey !== nextThumbnailStatusKey) {
			thumbnailStatusKey = nextThumbnailStatusKey;
			failedToLoad = false;
			hoverThumbnailFailed = false;
			void verifyYoutubeThumbnail(
				nextThumbnailStatusKey,
				youtubeThumbnailUrl
			);
		}
	}

	function getTimeString(ms: number) {
		const minutes = Math.floor(ms / 60000);
		const seconds = Math.floor((ms % 60000) / 1000);
		const milliseconds = ms % 1000;

		return `${minutes}:${seconds.toString()
			.padStart(2, '0')}.${milliseconds}`;
	}

	function isHexColor(value: string | null | undefined) {
		return typeof value === 'string'
			&& /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value.trim());
	}

	function withHexAlpha(color: string, alpha: string) {
		const normalized = color.trim();

		return normalized.length === 9
			? `${normalized.slice(0, 7)}${alpha}`
			: `${normalized}${alpha}`;
	}

	function hexToRgb(color: string) {
		const normalized = color.trim()
			.slice(1, 7);

		return {
			r: Number.parseInt(normalized.slice(0, 2), 16),
			g: Number.parseInt(normalized.slice(2, 4), 16),
			b: Number.parseInt(normalized.slice(4, 6), 16)
		};
	}

	function isLightColor(color: string) {
		const { r, g, b } = hexToRgb(color);
		const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

		return luminance >= 0.62;
	}

	let levelCardStyle: string | undefined;
	let resolvedHref = '#!';

	export let id: LevelCardProps['id'] = null;
	export let href: LevelCardProps['href'] = null;
	export let videoID: LevelCardProps['videoID'] = null;
	export let name: LevelCardProps['name'] = null;
	export let rating: LevelCardProps['rating'] = null;
	export let top: LevelCardProps['top'] = null;
	export let minProgress: LevelCardProps['minProgress'] = null;
	export let backgroundColor: LevelCardProps['backgroundColor'] = null;
	export let borderColor: LevelCardProps['borderColor'] = null;
	export let creator: LevelCardProps['creator'] = null;
	export let creatorId: LevelCardProps['creatorId'] = null;
	export let creatorData: LevelCardProps['creatorData'] = null;
	export let tags: LevelCardTag[] = [];
	export let record: LevelCardProps['record'] = null;
	export let isPlatformer: LevelCardProps['isPlatformer'] = false;
	export let type: string;
	export let variant: LevelCardProps['variant'] = 'default';
	export let hideTop: boolean = false;
	export let hideRating: boolean = false;
	export let loading: boolean = false;
	export let ratingPrediction: boolean = true;

	$: {
		const nextStyle: string[] = [];

		if (isHexColor(backgroundColor)) {
			const resolvedBackgroundColor = String(backgroundColor)
				.trim();
			const lightBackground = isLightColor(resolvedBackgroundColor);
			nextStyle.push(
				`background: ${resolvedBackgroundColor}; --level-card-foreground-color: ${
					lightBackground ? '#0f172a' : '#f8fafc'
				}; --level-card-muted-color: ${
					lightBackground
						? 'rgba(15, 23, 42, 0.72)'
						: 'rgba(248, 250, 252, 0.78)'
				}; --level-card-badge-background: ${
					lightBackground
						? 'rgba(15, 23, 42, 0.14)'
						: 'rgba(248, 250, 252, 0.18)'
				}; --level-card-badge-foreground: ${
					lightBackground ? '#0f172a' : '#f8fafc'
				};`
			);
		}

		if (borderColor) {
			nextStyle.push(
				`border-color: ${borderColor}; --level-card-border-color: ${borderColor};`
			);
		}

		levelCardStyle = nextStyle.length ? nextStyle.join(' ') : undefined;
	}

	$: resolvedHref = typeof href === 'string' && href.length > 0
		? href
		: id != null
		? `/level/${id}`
		: '#!';

	function formatListPoints(value: number) {
		return value.toFixed(2);
	}

	function getLowercaseTranslation(key: string) {
		return String($_(key))
			.toLocaleLowerCase();
	}
</script>

{#if !loading}
  <div class:listVariant={variant === 'list'} class="level">
    <Card.Root class={variant === 'list' ? 'listCard' : undefined} style={levelCardStyle}>
      <Card.Content class={variant === 'list' ? 'listCardContent' : undefined}>
        <ContextMenu.Root>
          <ContextMenu.Trigger>
            {#if variant === 'list'}
              <div class="listCardLayout">
                <a
                  href={resolvedHref}
                  class="listThumbnailLink"
                  data-sveltekit-preload-data="tap"
                  aria-label={name || 'Level details'}
                >
                  <img
                    src={thumbnailUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    class="listThumbnail"
                    on:error={() => {
                        failedToLoad = true;
                    }}
                  />
                  {#if hasVideoThumbnail && !failedToLoad && !hoverThumbnailFailed}
                    <img
                      src={levelThumbUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      class="listThumbnail listThumbnailHover"
                      on:error={() => {
                          hoverThumbnailFailed = true;
                      }}
                    />
                  {/if}
                </a>
                <div class="listInfo">
                  <a
                    href={resolvedHref}
                    class="listTitle"
                    data-sveltekit-preload-data="tap"
                  >
                    {#if !hideTop && top != null}<span>#{top}<span class="listTitleSeparator"> – </span></span>{/if}{name}
                  </a>
                  <div class="listCreator">
                    <span>{$_('level_card.published_by')}</span>
                    {#if creatorId}
                      <span class="listCreatorLink"><PlayerLink player={creatorData} /></span>
                    {:else}
                      <span class="listCreatorName">{creator}</span>
                    {/if}
                  </div>
                  {#if !hideRating && rating != null}
                    <div class="listPoints">
                      {#if minProgress != null && !isPlatformer}
                        {formatListPoints(rating / 10)} ({minProgress}%)
                        <span aria-hidden="true"> — </span>
                        {formatListPoints(rating)} (100%) {$_('level_card.points')}
                      {:else if minProgress != null}
                        {getTimeString(minProgress)} {getLowercaseTranslation('level.base_time')}
                        <span aria-hidden="true"> — </span>
                        {formatListPoints(rating)} {$_('level_card.points')}
                      {:else}
                        {formatListPoints(rating)} {$_('level_card.points')}
                      {/if}
                    </div>
                  {:else if minProgress != null}
                    <div class="listPoints">
                      {isPlatformer
                        ? `${getTimeString(minProgress)} ${getLowercaseTranslation('level.base_time')}`
                        : `${minProgress}% ${$_('level_card.minimum')}`}
                    </div>
                  {/if}
                  {#if tags.length > 0}
                    <div class="listTags">
                      {#each tags as tag}
                        <span
                          class="levelTag"
                          style="background: {tag.color || '#666'}18; color: {tag.color
    || '#666'}; border-color: {tag.color || '#666'}30"
                        >{tag.name}</span>
                      {/each}
                    </div>
                  {/if}
                  {#if record}
                    <div class="listProgress">
                      {#if record.isChecked}
                        {#if !isPlatformer}
                          {#if record.progress == 100}<Check />{:else}{record.progress}%{/if}
                        {:else}
                          {getTimeString(record.progress)}
                        {/if}
                      {:else}
                        <Clock />
                      {/if}
                    </div>
                  {/if}
                </div>
              </div>
            {:else}
            <a href={resolvedHref} data-sveltekit-preload-data="tap">
              <div class="relative flex h-[235px] justify-center">
                <img
                  src={thumbnailUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  class="thumbnail absolute"
                  on:error={() => {
                      failedToLoad = true;
                  }}
                />
                {#if hasVideoThumbnail && !failedToLoad && !hoverThumbnailFailed}
                  <img
                    src={levelThumbUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    class="thumbnail z-1 absolute translate-x-4 opacity-0 transition-all duration-300 ease-in-out hover:translate-x-0 hover:opacity-100"
                    on:error={() => {
                        hoverThumbnailFailed = true;
                    }}
                  />
                {/if}
              </div>
            </a>
            <div class="levelInfo relative h-[60px]">
              <a
                href={resolvedHref}
                class="absolute inset-0 z-10"
                data-sveltekit-preload-data="tap"
                aria-label={name || 'Level details'}
              ></a>
              {#if !hideTop}
                {#if top}
                  <div class="top">#{top}</div>
                {:else}
                  <div class="top">#{top}</div>
                {/if}
              {/if}
              <div class="info">
                <div class="levelName">
                  <div class="name">
                    {name}
                  </div>
                  {#if !hideRating}
                    <div class="pt">
                      {rating}pt
                    </div>
                  {/if}
                  {#key $user}
                    {#if !hideRating && ratingPrediction && $user.loggedIn && type == 'dl'}
                      {#if !record}
                        <Tooltip.Root>
                          <div class="relative z-20">
                            <Tooltip.Trigger>
                              <div class="pt">
                                +{
                                  calcRating($user.ratings, rating) - $user.data.rating
                                }
                              </div>
                            </Tooltip.Trigger>
                          </div>
                          <Tooltip.Content>
                            <p>
                              {$user.data.rating} -> {
                                calcRating($user.ratings, rating)
                              }
                            </p>
                          </Tooltip.Content>
                        </Tooltip.Root>
                      {/if}
                    {/if}
                  {/key}
                  {#if minProgress != null}
                    {#if type == 'dl' && minProgress != 100}
                      <div class="pt">
                        {minProgress}% Min
                      </div>
                    {:else if type == 'pl'}
                      <div class="pt">
                        {getTimeString(minProgress)} Base
                      </div>
                    {/if}
                  {/if}
                </div>
                <div class="creator flex gap-[5px]">
                  by
                  {#if creatorId}
                    <div class="relative z-20">
                      <PlayerLink player={creatorData} />
                    </div>
                  {:else}
                    {creator}
                  {/if}
                  {#if tags.length > 0}
                    <div class="levelTags">
                      {#each tags as tag}
                        <span
                          class="levelTag"
                          style="background: {tag.color || '#666'}18; color: {tag.color
    || '#666'}; border-color: {tag.color || '#666'}30"
                        >
                          {tag.name}
                        </span>
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>
              {#if record}
                <div class="progress">
                  {#if record.isChecked}
                    {#if !isPlatformer}
                      {#if record.progress == 100}
                        <Check />
                      {:else}
                        {record.progress}%
                      {/if}
                    {:else}
                      {getTimeString(record.progress)}
                    {/if}
                  {:else}
                    <Clock />
                  {/if}
                </div>
              {/if}
            </div>
            {/if}
          </ContextMenu.Trigger>
          <ContextMenu.Content class="w-64">
            <ContextMenu.Item
              inset
              on:click={async () => {
                  await navigator.clipboard.writeText(String(id));
                  toast.success($_('toast.clipboard'));
              }}
            >{$_('context.copy_level_id')}</ContextMenu.Item>
            <ContextMenu.Item
              inset
              on:click={async () => {
                  await navigator.clipboard.writeText(
                      `https://img.youtube.com/vi/${videoID}/0.jpg`
                  );
                  toast.success($_('toast.clipboard'));
              }}
            >{$_('context.copy_thumbnail')}</ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Root>
      </Card.Content>
    </Card.Root>
  </div>
{:else}
  <div class:listVariant={variant === 'list'} class="level">
    <Card.Root class={variant === 'list' ? 'listCard' : undefined} style={levelCardStyle}>
      <Card.Content class={variant === 'list' ? 'listCardContent' : undefined}>
        <ContextMenu.Root>
          <ContextMenu.Trigger>
            {#if variant === 'list'}
              <div class="listCardLayout listCardLoading">
                <Skeleton class="listThumbnailSkeleton" />
                <div class="listInfo">
                  <Skeleton class="h-[38px] w-[260px] max-w-full" />
                  <Skeleton class="h-[24px] w-[190px] max-w-full" />
                  <Skeleton class="h-[22px] w-[240px] max-w-full" />
                </div>
              </div>
            {:else}
            <a href="#!" data-sveltekit-preload-data="tap">
              <Skeleton class="mb-[15px] mt-[20px] h-[200px] w-full" />
            </a>
            <a href="#!" data-sveltekit-preload-data="tap">
              <div class="levelInfo">
                <div class="top">
                  <Skeleton class="mb-[10px] mt-[10px] h-[60px] w-[60px]" />
                </div>
                <div class="info">
                  <div class="levelName">
                    <div class="name">
                      <Skeleton class="mb-[10px] h-[30px] w-[200px]" />
                    </div>
                  </div>
                  <div class="creator">
                    <Skeleton class="h-[20px] w-[100px]" />
                  </div>
                </div>
              </div></a>
            {/if}
          </ContextMenu.Trigger>
        </ContextMenu.Root>
      </Card.Content>
    </Card.Root>
  </div>
{/if}

<style lang="scss">
.name {
  margin-right: 3px;
}
.thumbnail {
  height: 200px;
  width: 500px;
  object-fit: cover;
  margin-top: 20px;
  border-radius: var(--radius);
  border: 1px solid var(--level-card-border-color, var(--border1));
  margin-bottom: 15px;
  margin-inline: auto;
}

.level {
  overflow: hidden;
  color: var(--level-card-foreground-color, inherit);

  .levelInfo {
    margin-top: -5px;
    margin-bottom: -15px;
    display: flex;
    gap: 15px;
    align-items: center;

    .top {
      font-size: 44px;
      font-weight: 600;
    }

    .info {
      display: flex;
      flex-direction: column;
      line-height: 20px;

      .levelName {
        font-size: 18px;
        font-weight: 500;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 5px;

        .pt {
          background-color: var(
            --level-card-badge-background,
            var(--textColor)
          );
          color: var(--level-card-badge-foreground, var(--textColorInverted));
          padding: 4px;
          font-size: 11px;
          border-radius: var(--radius);
          line-height: 18px;
        }
      }

      .creator {
        color: var(--level-card-muted-color, var(--textColor2));
      }

      .levelTags {
        display: flex;
        flex-wrap: wrap;
        gap: 3px;
        margin-top: 2px;
      }

      .levelTag {
        display: inline-flex;
        padding: 1px 6px;
        border-radius: 8px;
        font-size: 10px;
        font-weight: 600;
        line-height: 1.3;
        border: 1px solid;
      }
    }

    .progress {
      margin-left: auto;
      font-weight: 500;
    }
  }
}

.listVariant {
  width: 100%;
}

.listVariant :global(.listCard) {
  overflow: hidden;
  border-color: var(--level-card-border-color, hsl(var(--border)));
  border-radius: 0;
  box-shadow: none;
}

.listVariant :global(.listCardContent) {
  padding: 0;
}

.listCardLayout {
  position: relative;
  display: grid;
  grid-template-columns: minmax(260px, 31%) minmax(0, 1fr);
  align-items: center;
  gap: clamp(28px, 3.2vw, 48px);
  min-height: 272px;
  padding: 40px;
}

.listThumbnailLink {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: hsl(var(--muted));
}

.listThumbnail {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.listThumbnailHover {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 220ms ease;
}

.listThumbnailLink:hover .listThumbnailHover {
  opacity: 1;
}

.listInfo {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.listTitle {
  max-width: 100%;
  color: var(--level-card-foreground-color, inherit);
  font-size: clamp(2rem, 3.2vw, 3rem);
  font-weight: 750;
  line-height: 1.05;
  letter-spacing: -0.035em;
  overflow-wrap: anywhere;
}

.listTitle:hover {
  text-decoration: underline;
  text-underline-offset: 5px;
}

.listCreator {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.25em;
  margin-top: 14px;
  color: var(--level-card-muted-color, hsl(var(--muted-foreground)));
  font-size: clamp(1.25rem, 2.1vw, 2rem);
  font-weight: 700;
  line-height: 1.15;
}

.listCreatorLink,
.listCreatorName {
  color: var(--level-card-foreground-color, inherit);
  text-decoration: underline dotted;
  text-underline-offset: 8px;
}

.listPoints {
  margin-top: 12px;
  color: var(--level-card-muted-color, hsl(var(--muted-foreground)));
  font-size: clamp(1rem, 1.55vw, 1.45rem);
  line-height: 1.3;
}

.listTags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 14px;
}

.levelTag {
  display: inline-flex;
  padding: 1px 6px;
  border: 1px solid;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.3;
}

.listProgress {
  position: absolute;
  top: 18px;
  right: 20px;
  display: inline-flex;
  align-items: center;
  font-weight: 600;
}

.listProgress :global(svg) {
  width: 22px;
  height: 22px;
}

.listCardLoading :global(.listThumbnailSkeleton) {
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
  border-radius: 0;
}

@media (max-width: 700px) {
  .listCardLayout {
    grid-template-columns: minmax(0, 1fr);
    gap: 22px;
    min-height: 0;
    padding: 20px;
  }

  .listTitle {
    font-size: clamp(1.65rem, 8vw, 2.25rem);
  }

  .listCreator {
    margin-top: 10px;
    font-size: clamp(1.05rem, 5vw, 1.4rem);
  }

  .listPoints {
    margin-top: 9px;
    font-size: 1rem;
  }
}
</style>
