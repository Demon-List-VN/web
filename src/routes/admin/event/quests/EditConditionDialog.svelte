<script lang="ts">
	import * as sdk from '$lib/client/sdk';
	import { user } from '$lib/client';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { toast } from 'svelte-sonner';
	import { Settings } from 'lucide-svelte';

	export let event: any;
	export let quest: any;
	export let onSuccess: () => void;

	let open = false;
	let minPoints = 0;

	function initializeFromQuest() {
		if (quest.condition && quest.condition.length > 0) {
			const minCondition = quest.condition.find(
				(c: any) => c.type === 'min' && c.attribute === 'total_point'
			);
			if (minCondition) {
				minPoints = minCondition.value;
			}
		}
	}

	async function saveCondition() {
		const condition = [
			{
				type: 'min',
				value: Number(minPoints),
				attribute: 'total_point'
			}
		];

		toast.promise(
			sdk.eventsApi
				.byId(event.id)
				.quest.byId(quest.id)
				.request({
					method: 'PATCH',
					headers: {
						Authorization: 'Bearer ' + (await $user.token()),
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						condition: condition
					})
				}),
			{
				success: () => {
					open = false;
					onSuccess();
					return 'Condition updated!';
				},
				loading: 'Updating...',
				error: 'Failed to update condition'
			}
		);
	}

	$: if (open) {
		initializeFromQuest();
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger class={buttonVariants({ variant: 'ghost', size: 'sm' })}>
		<Settings class="h-4 w-4" />
	</Dialog.Trigger>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Edit Quest Condition</Dialog.Title>
			<Dialog.Description>
				Update condition for quest: {quest.title || 'Untitled'}
			</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="minPoints" class="text-right">Min Points</Label>
				<Input
					id="minPoints"
					type="number"
					placeholder="Minimum total points required"
					bind:value={minPoints}
					class="col-span-3"
				/>
			</div>
			<p class="text-sm text-muted-foreground">
				The quest will be completable when the user reaches at least {minPoints} total points in the
				event.
			</p>
		</div>
		<Dialog.Footer>
			<Button variant="outline" on:click={() => (open = false)}>Cancel</Button>
			<Button on:click={saveCondition}>Save</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
