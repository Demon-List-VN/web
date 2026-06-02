<script lang="ts">
	import {
		getExpLevelColor,
		getLevelBadgeIcons,
		getPlayerExpLevel,
		type PlayerLevelBadgeIcon
	} from '$lib/client/getExpLevel';
	import { Crown, Diamond, Star } from 'lucide-svelte';

	export let player: { exp?: unknown; extraExp?: unknown; } | null | undefined = null;
	export let level: number | null = null;
	export let color: string | null = null;
	export let size: 'sm' | 'md' | 'lg' = 'md';
	export let iconSize: number | null = null;
	export let showAllTiers = false;
	let className = '';
	export { className as class };

	$: playerExpLevel = getPlayerExpLevel(player);
	$: resolvedLevel = normalizeLevel(level ?? playerExpLevel?.level ?? 0);
	$: resolvedColor = color
		?? playerExpLevel?.color
		?? (resolvedLevel > 0 ? getExpLevelColor(resolvedLevel).color : '');
	$: icons = getLevelBadgeIcons(resolvedLevel, showAllTiers);
	$: rows = chunkIcons(icons, 5);
	$: visible = rows.length > 0 && Boolean(resolvedColor);
	$: badgeIconSize = iconSize ?? getBadgeIconSize(size);
	$: starColor = 'hsl(var(--foreground))';

	function normalizeLevel(value: unknown) {
		const parsed = Number(value);

		return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
	}

	function chunkIcons(icons: PlayerLevelBadgeIcon[], rowSize: number) {
		const rows: PlayerLevelBadgeIcon[][] = [];

		for (let index = 0; index < icons.length; index += rowSize) {
			rows.push(icons.slice(index, index + rowSize));
		}

		return rows;
	}

	function getBadgeIconSize(size: 'sm' | 'md' | 'lg') {
		if (size === 'lg') {
			return 7.5;
		}

		return size === 'sm' ? 6 : 7.5;
	}
</script>

{#if visible}
  <span
    class={`player-level-badge player-level-badge--${size} ${className}`}
    style={`--player-level-color: ${resolvedColor}; --badge-icon-size: ${badgeIconSize}px;`}
    aria-label={`Level ${resolvedLevel} badge`}
  >
    {#each rows as row}
      <span class="badge-row">
        {#each row as icon}
          {#if icon === 'crown'}
            <Crown
              class="badge-icon badge-icon--crown"
              size={badgeIconSize}
              color="#f5c542"
              fill="#f5c542"
              strokeWidth={2.3}
              aria-hidden="true"
            />
          {:else if icon === 'diamond'}
            <Diamond
              class="badge-icon badge-icon--diamond"
              size={badgeIconSize}
              color="#38bdf8"
              fill="#38bdf8"
              strokeWidth={2.3}
              aria-hidden="true"
            />
          {:else}
            <Star
              class="badge-icon badge-icon--star"
              size={badgeIconSize}
              color={starColor}
              fill={starColor}
              strokeWidth={2.3}
              aria-hidden="true"
            />
          {/if}
        {/each}
      </span>
    {/each}
  </span>
{/if}

<style lang="scss">
.player-level-badge {
  --badge-icon-size: 12px;
  position: absolute;
  left: 50%;
  bottom: -7px;
  z-index: 5;
  display: grid;
  justify-items: center;
  gap: 1px;
  width: max-content;
  min-width: max-content;
  padding: 2px 4px;
  border: 1px solid hsl(var(--border));
  border-radius: 999px;
  background: hsl(var(--background) / 0.9);
  color: hsl(var(--foreground));
  overflow: visible;
  pointer-events: none;
  transform: translateX(-50%);
}

.badge-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1px;
  width: max-content;
  min-width: max-content;
}

.badge-icon {
  width: var(--badge-icon-size);
  height: var(--badge-icon-size);
  flex: 0 0 auto;
  color: inherit;
  overflow: visible;
}

.badge-icon--crown {
  color: #f5c542;
}

.badge-icon--diamond {
  color: #7dd3fc;
}

.badge-icon--star {
  color: hsl(var(--foreground));
}

.player-level-badge--sm {
  bottom: -5px;
  padding: 1px 3px;
}

.player-level-badge--lg {
  bottom: -9px;
  gap: 2px;
  padding: 3px 6px;
}
</style>
