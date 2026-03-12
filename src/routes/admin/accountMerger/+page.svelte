<script lang="ts">
	import * as sdk from '$lib/client/sdk';
	import Title from '$lib/components/Title.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { user } from '$lib/client';

	let uidA = '',
		uidB = '';

	async function merge() {
		if (!confirm('Proceed?')) {
			return;
		}

		sdk
			.mergeAccounts(uidA, uidB)
			.request({
				method: 'PATCH',
				headers: {
					Authorization: 'Bearer ' + (await $user.token())!
				}
			})
			.then((res) => {
				if (!res.ok) {
					alert('An error occured');
					return;
				}

				alert('Merged');
				window.location.reload();
			});
	}
</script>

<Title value="Account merger" />
<div class="wrapper">
	<div class="input">
		<Label for="from" class="w-[150px]">From <br />(will be deleted)</Label>
		<Input id="from" class="w-[300px]" placeholder="UID" bind:value={uidA} />
	</div>
	<div class="input">
		<Label for="to" class="w-[150px]">To</Label>
		<Input id="to" class="w-[300px]" placeholder="UID" bind:value={uidB} />
	</div>

	<Button class="w-[100px]" on:click={merge}>Merge</Button>
</div>

<style lang="scss">
	.wrapper {
		padding-inline: 75px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.input {
		display: flex;
		align-items: center;
		gap: 10px;
	}
</style>
