<script lang="ts">
	import { _ } from 'svelte-i18n';
</script>

<svelte:head>
	<title>{$_('head.titles.misc')} - {$_('head.site_name')}</title>
</svelte:head>

<slot />
