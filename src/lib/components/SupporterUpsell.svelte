<script lang="ts">
	import { ArrowRight, Heart } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';
	import { user } from '$lib/client';
	import { isActive } from '$lib/client/isSupporterActive';

	// Mirror the exact gating used by the AdSense slot (ads.svelte): show only to
	// the people who currently see ads (logged-out or non-supporter). Active
	// supporters never see this strip.
	$: hidden = $user.checked
		? $user.loggedIn && isActive($user.data?.supporterUntil)
		: true;
</script>

{#if !hidden}
  <a class="supporter-upsell" href="/supporter" data-nosnippet>
    <span class="supporter-upsell-icon" aria-hidden="true">
      <Heart class="h-4 w-4" />
    </span>
    <span class="supporter-upsell-text">{$_('pvp.supporter_strip.text')}</span>
    <span class="supporter-upsell-cta">
      {$_('pvp.supporter_strip.cta')}
      <ArrowRight class="h-3.5 w-3.5" />
    </span>
  </a>
{/if}

<style lang="scss">
.supporter-upsell {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding: 10px 14px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--muted) / 0.45);
  color: hsl(var(--foreground));
  text-decoration: none;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
}

.supporter-upsell:hover {
  background: hsl(var(--muted) / 0.7);
  border-color: hsl(var(--ring) / 0.4);
}

.supporter-upsell-icon {
  display: inline-flex;
  flex-shrink: 0;
  color: #e0245e;
}

.supporter-upsell-text {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  line-height: 1.4;
  color: hsl(var(--muted-foreground));
}

.supporter-upsell-cta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 800;
  color: hsl(var(--foreground));
}

@media (max-width: 560px) {
  .supporter-upsell {
    flex-wrap: wrap;
  }

  .supporter-upsell-text {
    flex-basis: 100%;
  }
}
</style>
