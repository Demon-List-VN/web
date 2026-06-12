<script lang="ts">
	import { frameImageUrl, type Cosmetic } from '$lib/client/cosmetics';

	export let frame: Cosmetic | null = null;
	export let srcOverride: string | null = null;

	$: frameSrc = srcOverride ?? (frame ? frameImageUrl(frame) : null);
	$: avatarScale = frame?.avatarWidth ?? 1;
</script>

<span class="avatar-frame" style={`--avatar-scale: ${frameSrc ? avatarScale : 1};`}>
  <span class="avatar-frame-scale"><slot /></span>
  {#if frameSrc}
    <img
      class="avatar-frame-img"
      src={frameSrc}
      alt=""
      draggable="false"
    />
  {/if}
</span>

<style lang="scss">
.avatar-frame {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-frame-scale {
  display: inline-flex;
  transform: scale(var(--avatar-scale));
  transform-origin: center;
}

.avatar-frame-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  z-index: 2;
}
</style>
