<script lang="ts">
	import * as sdk from '$lib/client/sdk';
	import Title from '$lib/components/Title.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { Button } from '$lib/components/ui/button';
	import { user } from '$lib/client';

	const data = {
		userid: '',
		levelid: 0,
		videoLink: '',
		raw: '',
		progress: 0,
		mobile: false,
		isChecked: false
	};

	async function add() {
		sdk.fetch(`/records`, {
			method: 'PUT',
			body: JSON.stringify(data),
			headers: {
				Authorization: 'Bearer ' + (await $user.token()),
				'Content-Type': 'application/json'
			}
		}).then((res) => {
			if (!res.ok) {
				alert('An error occured');
				return;
			}

			alert('Added');
			window.location.reload();
		});
	}
</script>

<Title value="Add record" />

<div class="ml-[50px] flex w-[500px] flex-col gap-[10px]">
	<div class="flex items-center">
		<Label class="w-[150px]">Player's UID</Label>
		<Input bind:value={data.userid} />
	</div>
	<div class="flex items-center">
		<Label class="w-[150px]">Level's ID</Label>
		<Input bind:value={data.levelid} type="number" inputmode="numeric" />
	</div>
	<div class="flex items-center">
		<Label class="w-[150px]">Video's link</Label>
		<Input bind:value={data.videoLink} />
	</div>
	<div class="flex items-center">
		<Label class="w-[150px]">Raw</Label>
		<Input bind:value={data.raw} />
	</div>
	<div class="flex items-center">
		<Label class="w-[150px]">Progress</Label>
		<Input bind:value={data.progress} />
	</div>
	<div class="flex items-center">
		<Label class="w-[110px]">Mobile</Label>
		<Switch bind:checked={data.mobile} />
	</div>
	<div class="flex items-center">
		<Label class="w-[110px]">Accepted</Label>
		<Switch bind:checked={data.isChecked} />
	</div>
	<Button class="w-[100px]" on:click={add}>Add</Button>
</div>
