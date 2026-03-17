<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { user } from '$lib/client';
	import { page } from '$app/stores';
	import { _ } from 'svelte-i18n';

	const token = $page.url.searchParams.get('token');

	async function link() {
		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/auth/link/discord`, {
				method: 'PATCH',
				body: JSON.stringify({
					token: token
				}),
				headers: {
					Authorization: 'Bearer ' + (await $user.token())!,
					'Content-Type': 'application/json'
				}
			}).then(async (res) => {
				if (res.ok) {
					await $user.syncRole();
				}
			}),
			{
				loading: $_('discord_link.loading'),
				success: () => {
					window.location.href = '/';
					return $_('discord_link.success');
				},
				error: $_('discord_link.error')
			}
		);
	}
	$: $user.loggedIn && link();
</script>
