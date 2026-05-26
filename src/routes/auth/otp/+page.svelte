<script lang="ts">
	import { _ } from 'svelte-i18n';
	import OtpGrantCard from './OtpGrantCard.svelte';
</script>

<svelte:head>
  <title>{$_('otp.title')}</title>
</svelte:head>

<OtpGrantCard />
