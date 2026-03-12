<script lang="ts">
	import * as sdk from '$lib/client/sdk';
	import { user } from '$lib/client';
	import { Button } from '$lib/components/ui/button/index.js';
	import { toast } from 'svelte-sonner';

	export let eventID: number;
	export let levelID: number;

	async function f() {
		if (!confirm(`Delete ${levelID}?`)) {
			return;
		}

		toast.promise(
			sdk.fetch(`/events/${eventID}/level/${levelID}`, {
				method: 'DELETE',
				headers: {
					Authorization: 'Bearer ' + (await $user.token())
				}
			}),
			{
				success: 'Deleted!',
				loading: 'Deleting...',
				error: 'Failed to delete'
			}
		);
	}
</script>

<Button variant="destructive" on:click={f}>Delete</Button>
