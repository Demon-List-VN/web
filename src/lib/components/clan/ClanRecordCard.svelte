<script lang="ts">
	import {
		BadgeCheck,
		Gamepad2,
		Monitor,
		Smartphone,
		Timer,
		Trophy
	} from 'lucide-svelte';
	import { locale } from 'svelte-i18n';

	export let record: any;
	export let clan: any = null;
	export let compact = false;

	$: player = record?.players ?? record?.player ?? null;
	$: level = record?.levels ?? record?.level ?? null;
	$: recordHref = record?.id
		? `/record/${player?.uid}/${level?.id}?id=${record.id}`
		: `/record/${player?.uid}/${level?.id}`;
	$: thumbnail = level?.videoID
		? `https://img.youtube.com/vi/${level.videoID}/mqdefault.jpg`
		: `https://levelthumbs.prevter.me/thumbnail/${level?.id}/small`;

	function tr(english: string, vietnamese: string) {
		return $locale === 'vi' ? vietnamese : english;
	}

	function timeAgo(value: string | number | null | undefined) {
		if (!value) {
			return tr('Recently', 'Gần đây');
		}

		const raw = Number(value);
		const date = Number.isFinite(raw)
			? new Date(raw < 10_000_000_000 ? raw * 1000 : raw)
			: new Date(value);
		const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

		if (!Number.isFinite(seconds) || seconds < 60) {
			return tr('Just now', 'Vừa xong');
		}

		if (seconds < 3600) {
			return `${Math.floor(seconds / 60)}m`;
		}

		if (seconds < 86400) {
			return `${Math.floor(seconds / 3600)}h`;
		}

		return `${Math.floor(seconds / 86400)}d`;
	}

	function formatProgress() {
		const progress = Number(record?.progress ?? 0);

		if (level?.isPlatformer) {
			const minutes = Math.floor(progress / 60_000);
			const seconds = Math.floor((progress % 60_000) / 1000);

			return `${minutes}:${String(seconds)
				.padStart(2, '0')}`;
		}

		return `${Math.round(progress)}%`;
	}

	function handleImageError(event: Event) {
		const image = event.currentTarget as HTMLImageElement;
		const fallback = `https://levelthumbs.prevter.me/thumbnail/${level?.id}/small`;

		if (image.src !== fallback) {
			image.src = fallback;
		}
	}
</script>

{#if record && player && level}
  <article class:compact class="clan-record-card">
    <a class="record-link" href={recordHref} aria-label={`${player.name} — ${level.name}`}>
      <div class="record-thumbnail">
        <img src={thumbnail} alt="" loading="lazy" on:error={handleImageError} />
        <span class="progress-pill">
          {#if level.isPlatformer}<Timer size={13} />{:else}<Trophy size={13} />{/if}
          {formatProgress()}
        </span>
      </div>

      <div class="record-body">
        <div class="record-kicker">
          {#if clan}
            <span class="clan-tag">c/{clan.tag || clan.name}</span>
          {/if}
          <span>{tr('new record', 'kỷ lục mới')}</span>
          <span>·</span>
          <time>{timeAgo(record.timestamp ?? record.createdAt)}</time>
        </div>
        <h3>{level.name}</h3>
        <p>
          <strong>{player.name}</strong>
          {tr('completed a new run', 'vừa hoàn thành một lượt chơi mới')}
        </p>
        <div class="record-meta">
          <span><Gamepad2 size={14} /> {level.creator || tr('Unknown creator', 'Chưa rõ tác giả')}</span>
          <span>
            {#if record.mobile}<Smartphone size={14} /> Mobile{:else}<Monitor size={14} /> PC{/if}
            {#if record.refreshRate} · {record.refreshRate}fps{/if}
          </span>
          {#if record.acceptedManually}
            <span class="accepted"><BadgeCheck size={14} /> {tr('Verified', 'Đã duyệt')}</span>
          {/if}
        </div>
      </div>
    </a>
  </article>
{/if}

<style lang="scss">
.clan-record-card {
  border: 1px solid var(--feed-border, hsl(var(--border)));
  border-radius: 14px;
  background: hsl(var(--card));
  box-shadow: 0 4px 18px hsl(222 40% 2% / 0.035);
  overflow: hidden;
}

.record-link {
  display: grid;
  grid-template-columns: 188px minmax(0, 1fr);
  min-height: 148px;
  color: inherit;
  text-decoration: none;
}

.record-thumbnail {
  position: relative;
  min-height: 148px;
  background: hsl(var(--muted));
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(3, 7, 16, 0.5), transparent 65%);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 180ms ease;
  }
}

.record-link:hover .record-thumbnail img { transform: scale(1.025); }

.progress-pill {
  position: absolute;
  z-index: 1;
  right: 10px;
  bottom: 10px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 9px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 999px;
  color: white;
  background: rgba(5, 8, 16, 0.68);
  backdrop-filter: blur(10px);
  font-size: 12px;
  font-weight: 850;
}

.record-body {
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
  padding: 18px 20px;

  h3 {
    margin: 6px 0 4px;
    overflow: hidden;
    color: hsl(var(--foreground));
    font-size: 20px;
    font-weight: 850;
    letter-spacing: -0.02em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  p {
    margin: 0;
    color: hsl(var(--muted-foreground));
    font-size: 12px;
    line-height: 1.45;
  }
}

.record-kicker,
.record-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  color: hsl(var(--muted-foreground));
  font-size: 10px;
  font-weight: 700;
}

.clan-tag {
  color: hsl(199 89% 43%);
  font-weight: 850;
}

.record-meta {
  gap: 12px;
  margin-top: 12px;
  flex-wrap: wrap;

  span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .accepted { color: hsl(157 64% 39%); }
}

.compact .record-link {
  grid-template-columns: 142px minmax(0, 1fr);
  min-height: 118px;
}

.compact .record-thumbnail { min-height: 118px; }
.compact .record-body { padding: 14px 16px; }
.compact .record-body h3 { font-size: 17px; }

@media (max-width: 560px) {
  .record-link,
  .compact .record-link {
    grid-template-columns: 112px minmax(0, 1fr);
    min-height: 124px;
  }

  .record-thumbnail,
  .compact .record-thumbnail { min-height: 124px; }
  .record-body,
  .compact .record-body { padding: 13px 14px; }
  .record-body h3,
  .compact .record-body h3 { margin-top: 5px; font-size: 16px; }
  .record-meta { gap: 8px; margin-top: 9px; }
  .record-meta span:first-child { display: none; }
}
</style>
