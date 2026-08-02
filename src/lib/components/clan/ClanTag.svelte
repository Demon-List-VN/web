<script lang="ts">
	import { isActive } from '$lib/client/isSupporterActive';

	export let clan: any;
	export let compact = false;

	$: hasCustomColors = isActive(clan?.boostedUntil)
		&& Boolean(clan?.tagBgColor || clan?.tagTextColor);
	$: customStyle = hasCustomColors
		? `background-color: ${clan?.tagBgColor || '#475569'}; color: ${
			clan?.tagTextColor || '#ffffff'
		}; border-color: transparent;`
		: undefined;
</script>

<span class="clan-tag" class:compact style={customStyle}>
  {clan?.tag || clan?.name || '—'}
</span>

<style lang="scss">
.clan-tag {
  display: inline-flex;
  width: fit-content;
  min-height: 24px;
  align-items: center;
  justify-content: center;
  padding: 3px 8px;
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  color: hsl(var(--foreground));
  background: hsl(var(--muted));
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.025em;
  line-height: 1;
  white-space: nowrap;
}

.compact {
  min-height: 20px;
  padding: 2px 6px;
  border-radius: 5px;
  font-size: 10px;
}
</style>
