<script lang="ts">
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import Gear from 'svelte-radix/Gear.svelte';
	import { _ } from 'svelte-i18n';
</script>

<a
  href="/settings"
  class={`${buttonVariants({ variant: 'ghost', size: 'icon' })} rounded-full text-[var(--textColor2)] hover:text-[var(--textColor1)]`}
  aria-label={$_('settings.title')}
  title={$_('settings.title')}
>
  <Gear class="h-[18px] w-[18px]" />
</a>
