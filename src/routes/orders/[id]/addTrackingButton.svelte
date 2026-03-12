<script lang="ts">
	import * as sdk from '$lib/client/sdk';
	import { user } from '$lib/client';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { toast } from 'svelte-sonner';

	export let order: any;

	let shippingUnit = '',
		link = '',
		trackingID = '';

	let content: any;

	async function add() {
		toast.promise(
			sdk.orders.merchant.byId(order.id).tracking.request({
				method: 'POST',
				body: JSON.stringify({
					content: content.label,
					link: link ? link : null
				}),
				headers: {
					Authorization: 'Bearer ' + (await $user.token()),
					'Content-Type': 'application/json'
				}
			}),
			{
				success: () => {
					window.location.reload();
					return 'Added!';
				},
				loading: 'Adding...',
				error: 'Failed to add'
			}
		);
	}
</script>

<Dialog.Root>
	<Dialog.Trigger class={buttonVariants()}>Add tracking</Dialog.Trigger>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Add tracking</Dialog.Title>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid grid-cols-4 items-center gap-4">
				<Label class="text-right">Shipping unit</Label>
				<Input bind:value={shippingUnit} placeholder="Optional" class="col-span-3" />
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Label class="text-right">Tracking ID</Label>
				<Input bind:value={trackingID} placeholder="Optional" class="col-span-3" />
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Label class="text-right">Content</Label>
				<Select.Root bind:selected={content}>
					<Select.Trigger class="col-span-3">
						<Select.Value placeholder="Select content" />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value={0}>Your order is being prepared</Select.Item>
						<Select.Item value={1}>Failed to pick up the package</Select.Item>
						<Select.Item value={2} disabled={!shippingUnit}>
							Your order is packed and will be handed over to {shippingUnit} soon
						</Select.Item>
						<Select.Item value={3} disabled={!shippingUnit || !trackingID}>
							Your package is picked up by {shippingUnit} (Tracking ID: {trackingID})
						</Select.Item>
						<Select.Item value={4}>Your package has been delivered!</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>

			<div class="grid grid-cols-4 items-center gap-4">
				<Label class="text-right">Link</Label>
				<Input bind:value={link} placeholder="Optional" class="col-span-3" />
			</div>
		</div>
		<Dialog.Footer>
			<Button type="submit" on:click={add} disabled={!content}>Add</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
