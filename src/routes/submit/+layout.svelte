<script lang="ts">
	import { goto } from '$app/navigation';
	import { user } from '$lib/client';

	$: if ($user.checked && $user.data?.isOrganization) {
		goto(`/org/${encodeURIComponent($user.data.name)}`);
	}
</script>

{#if !$user.checked || !$user.data?.isOrganization}
  <slot />
{/if}
