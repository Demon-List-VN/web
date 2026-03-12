<script lang="ts">
	import * as sdk from '$lib/client/sdk';
	import { user } from '$lib/client';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { toast } from 'svelte-sonner';
	import { Plus } from 'lucide-svelte';

	export let event: any;
	export let onSuccess: () => void;

	let open = false;
	let questData = {
		title: '',
		minPoints: 0
	};

	async function addQuest() {
		if (!questData.title.trim()) {
			toast.error('Title is required');
			return;
		}

		const condition = [
			{
				type: 'min',
				value: Number(questData.minPoints),
				attribute: 'total_point'
			}
		];

		toast.promise(
			sdk.fetch(`/events/${event.id}/quest`, {
				method: 'POST',
				headers: {
					Authorization: 'Bearer ' + (await $user.token()),
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					title: questData.title,
					condition: condition
				})
			}),
			{
				success: () => {
					open = false;
					questData = { title: '', minPoints: 0 };
					onSuccess();
					return 'Quest added!';
				},
				loading: 'Adding quest...',
				error: 'Failed to add quest'
			}
		);
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger class={buttonVariants()}>
		<Plus class="mr-2 h-4 w-4" />
		Add Quest
	</Dialog.Trigger>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Add New Quest</Dialog.Title>
			<Dialog.Description>
				Create a new quest for event #{event.id}
			</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="title" class="text-right">Title</Label>
				<Input
					id="title"
					placeholder="Quest title"
					bind:value={questData.title}
					class="col-span-3"
				/>
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="minPoints" class="text-right">Min Points</Label>
				<Input
					id="minPoints"
					type="number"
					placeholder="Minimum points required"
					bind:value={questData.minPoints}
					class="col-span-3"
				/>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" on:click={() => (open = false)}>Cancel</Button>
			<Button on:click={addQuest}>Add Quest</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
