<script lang="ts">
	import * as sdk from '$lib/client/sdk';
	import { user } from '$lib/client';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { toast } from 'svelte-sonner';

	export let event: any;
	export let title: string;
	export let data: any = {
		eventID: event.id,
		levelID: NaN,
		point: 0,
		needRaw: false
	};

	async function save() {
		toast.promise(
			sdk.fetch(`/events/${event.id}/levels`, {
				method: 'PUT',
				headers: {
					Authorization: 'Bearer ' + (await $user.token()),
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(data)
			}),
			{
				success: 'Saved!',
				loading: 'Saving...',
				error: 'Failed to save'
			}
		);
	}
</script>

<Dialog.Root>
	<Dialog.Trigger class={`${buttonVariants()} w-[50px]`}>{title}</Dialog.Trigger>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="level" class="text-right">Level ID</Label>
				<Input
					placeholder="Add level via Level Manager first"
					id="point"
					type="number"
					bind:value={data.levelID}
					class="col-span-3"
				/>
			</div>

			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="point" class="text-right">Point</Label>
				<Input id="point" type="number" bind:value={data.point} class="col-span-3" />
			</div>

			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="needRaw" class="text-right">Need raw</Label>
				<Switch bind:checked={data.needRaw} id="split" />
			</div>
		</div>
		<Dialog.Footer>
			<Button type="submit" on:click={save}>Save</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
