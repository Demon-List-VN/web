<script lang="ts">
	import { BadgeCheck, Gamepad2, Layers3 } from 'lucide-svelte';
	import { locale } from 'svelte-i18n';

	export let level: any;
	export let context: 'friend' | 'clan' = 'friend';

	$: creator = Array.isArray(level?.creatorData) ? level.creatorData[0] : level?.creatorData;
	$: thumbnail = level?.videoID
		? `https://img.youtube.com/vi/${level.videoID}/mqdefault.jpg`
		: `https://levelthumbs.prevter.me/thumbnail/${level?.id}/small`;

	function tr(english: string, vietnamese: string) {
		return $locale === 'vi' ? vietnamese : english;
	}

	function timeAgo(value: string | null | undefined) {
		const timestamp = new Date(value || 0).getTime();
		const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

		if (!Number.isFinite(timestamp) || seconds < 60) return tr('Just now', 'Vừa xong');
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
		if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;

		return `${Math.floor(seconds / 86400)}d`;
	}

	function handleImageError(event: Event) {
		const image = event.currentTarget as HTMLImageElement;
		const fallback = `https://levelthumbs.prevter.me/thumbnail/${level?.id}/small`;

		if (image.src !== fallback) image.src = fallback;
	}
</script>

{#if level}
  <article class="friend-level-card">
    <a class="level-link" href={`/level/${level.id}`}>
      <div class="level-thumbnail">
        <img src={thumbnail} alt="" loading="lazy" on:error={handleImageError} />
        <span><Layers3 size={13} /> {context === 'clan' ? tr('Clan-created level', 'Level do bang hội tạo') : tr('New level', 'Level mới')}</span>
      </div>
      <div class="level-body">
        <div class="level-kicker">
          {#if creator}
            <span class="friend-player">
              <img
                src={`https://cdn.gdvn.net/avatars/${creator.uid}${creator.isAvatarGif ? '.gif' : '.jpg'}?version=${creator.avatarVersion ?? 0}`}
                alt=""
              />
              <strong>{creator.name}</strong>
            </span>
          {:else}<strong>{level.creator}</strong>{/if}
          <span>·</span>
          <time>{timeAgo(level.created_at)}</time>
        </div>
        <h3>{level.name}</h3>
        <p>{context === 'clan' ? tr('created a new level for the clan', 'vừa tạo một level mới cho bang hội') : tr('published a new level', 'vừa đăng một level mới')}</p>
        <div class="level-meta">
          <span><Gamepad2 size={14} /> {level.creator || tr('Unknown creator', 'Chưa rõ tác giả')}</span>
          {#if level.accepted}
            <span class="accepted"><BadgeCheck size={14} /> {tr('Accepted', 'Đã duyệt')}</span>
          {/if}
        </div>
      </div>
    </a>
  </article>
{/if}

<style lang="scss">
.friend-level-card {
  border: 1px solid var(--feed-border, hsl(var(--border)));
  border-radius: 14px;
  background: hsl(var(--card));
  box-shadow: 0 4px 18px hsl(222 40% 2% / 0.035);
  overflow: hidden;
}

.level-link {
  display: grid;
  grid-template-columns: 188px minmax(0, 1fr);
  min-height: 148px;
  color: inherit;
  text-decoration: none;
}

.level-thumbnail {
  position: relative;
  min-height: 148px;
  background: hsl(var(--muted));
  overflow: hidden;

  img { width: 100%; height: 100%; object-fit: cover; transition: transform 180ms ease; }

  > span {
    position: absolute;
    right: 10px;
    bottom: 10px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 9px;
    border: 1px solid rgba(255, 255, 255, 0.24);
    border-radius: 999px;
    color: white;
    background: rgba(5, 8, 16, 0.72);
    font-size: 11px;
    font-weight: 850;
  }
}

.level-link:hover .level-thumbnail img { transform: scale(1.025); }

.level-body {
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
  padding: 18px 20px;

  h3 {
    margin: 7px 0 4px;
    overflow: hidden;
    color: hsl(var(--foreground));
    font-size: 20px;
    font-weight: 850;
    letter-spacing: -0.02em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  p { margin: 0; color: hsl(var(--muted-foreground)); font-size: 12px; }
}

.level-kicker,
.level-meta {
  display: flex;
  align-items: center;
  gap: 7px;
  color: hsl(var(--muted-foreground));
  font-size: 10px;
  font-weight: 700;
}

.friend-player {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 6px;

  img { width: 20px; height: 20px; border-radius: 50%; object-fit: cover; }
  strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
}

.level-meta {
  gap: 12px;
  margin-top: 12px;
  flex-wrap: wrap;

  span { display: inline-flex; align-items: center; gap: 5px; }
  .accepted { color: hsl(157 64% 39%); }
}

@media (max-width: 560px) {
  .friend-level-card { border-right: 0; border-left: 0; border-radius: 0; }
  .level-link { grid-template-columns: 112px minmax(0, 1fr); min-height: 124px; }
  .level-thumbnail { min-height: 124px; }
  .level-body { padding: 13px 14px; }
  .level-body h3 { margin-top: 5px; font-size: 16px; }
  .level-meta { gap: 8px; margin-top: 9px; }
  .level-meta span:first-child { display: none; }
}
</style>
