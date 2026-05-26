<script lang="ts">
	import { page } from '$app/stores';
	import { _ } from 'svelte-i18n';
	import OtpGrantCard from '../OtpGrantCard.svelte';
</script>

<svelte:head>
  <title>{$_('otp.title')}</title>
</svelte:head>

<OtpGrantCard initialCode={$page.params.code} />
