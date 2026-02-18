<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Switch } from '$lib/components/ui/switch';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';

	export let event: any;
	export let state: number;
	export let addEvent: () => void;
	export let editEvent: () => void;
	export let handleUpload: (e: any) => void;

	$: event.isContest = event.type === 'contest' || event.type === 'raid';

	const State = {
		DEFAULT: 0,
		NO_EVENT: 1,
		NEW_EVENT: 2,
		EDIT_EVENT: 3
	};
</script>

<div class="flex flex-col gap-[10px]">
	<div class="input mt-[50px]">
		<Label for="title" class="w-[100px]">Title</Label>
		<Input id="title" class="w-[300px]" placeholder="Required" bind:value={event.title} />
	</div>
	<div class="input">
		<Label for="created_at" class="w-[100px]">Created at</Label>
		<Input
			id="created_at"
			type="datetime-local"
			class="w-[300px]"
			placeholder="Required"
			bind:value={event.createdAt}
		/>
		<span class="text-xs">default to now</span>
	</div>
	<div class="input">
		<Label for="start" class="w-[100px]">Start</Label>
		<Input
			id="start"
			type="datetime-local"
			class="w-[300px]"
			placeholder="Required"
			bind:value={event.start}
		/>
		<span class="text-xs">default to now</span>
	</div>
	<div class="input">
		<Label for="end" class="w-[100px]">End</Label>
		<Input id="end" type="datetime-local" class="w-[300px]" bind:value={event.end} />
		<span class="text-xs">null for permanent</span>
	</div>
	<div class="input">
		<Label for="description" class="w-[100px]">Description</Label>
		<Textarea
			id="description"
			class="w-[300px] rounded p-2"
			rows="3"
			placeholder="Required"
			bind:value={event.description}
		/>
	</div>
	<div class="input">
		<Label for="imgUrl" class="w-[100px]">Banner</Label>
		<Input id="imgUrl" class="w-[195px]" placeholder="image URL" bind:value={event.imgUrl} />
		or
		<input
			disabled={event.id === undefined}
			type="file"
			id="avatar"
			name="avatar"
			accept="image/webp"
			on:change={handleUpload}
		/>
		{#if event.id === undefined}
			<span class="text-xs">can be uploaded after the event is added</span>
		{/if}
	</div>
	<div class="input">
		<Label for="exp" class="w-[100px]">EXP</Label>
		<Input id="exp" type="number" step="1" class="w-[300px]" bind:value={event.exp} />
	</div>
	<div class="input">
		<Label for="minExp" class="w-[100px]">Min EXP</Label>
		<Input
			id="minExp"
			type="number"
			step="1"
			class="w-[300px]"
			placeholder="Required"
			bind:value={event.minExp}
		/>
	</div>
	<div class="input">
		<Label for="priority" class="w-[100px]">Priority</Label>
		<Input
			id="priority"
			type="number"
			step="1"
			class="w-[300px]"
			placeholder="Required"
			bind:value={event.priority}
		/>
	</div>
	<div class="input">
		<Label for="content" class="w-[100px]">Content</Label>
		<Textarea id="content" class="w-[300px] rounded p-2" rows="4" bind:value={event.content} />
	</div>
	<div class="input">
		<Label for="redirect" class="w-[100px]">Redirect</Label>
		<Input id="redirect" class="w-[300px]" placeholder="optional URL" bind:value={event.redirect} />
	</div>

	<div class="input">
		<Label for="data" class="w-[100px]">Data (JSON)</Label>
		<Textarea id="data" class="w-[300px] rounded p-2" rows="4" bind:value={event.data} />
	</div>
	<div class="input">
		<Label class="w-[100px]">Need proof</Label>
		<Switch bind:checked={event.needProof} />
	</div>
	<div class="input">
		<Label class="w-[100px]">Supporter only</Label>
		<Switch bind:checked={event.isSupporterOnly} />
	</div>

	<div class="input">
		<Label class="w-[100px]">Hidden</Label>
		<Switch bind:checked={event.hidden} />
	</div>
	<div class="input">
		<Label class="w-[100px]">External</Label>
		<Switch bind:checked={event.isExternal} />
	</div>

	<div class="input">
		<Label class="w-[100px]">Event Type</Label>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger asChild let:builder>
				<Button builders={[builder]} variant="outline" class="w-[200px] justify-start">
					{event.type.charAt(0).toUpperCase() + event.type.slice(1)}
				</Button>
			</DropdownMenu.Trigger>
			<DropdownMenu.Content class="w-[200px]">
				<DropdownMenu.RadioGroup bind:value={event.type}>
					<DropdownMenu.RadioItem value="basic">Basic</DropdownMenu.RadioItem>
					<DropdownMenu.RadioItem value="contest">Contest</DropdownMenu.RadioItem>
					<DropdownMenu.RadioItem value="raid">Raid</DropdownMenu.RadioItem>
				</DropdownMenu.RadioGroup>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>
	<div class="input mt-[20px]">
		{#if state == State.NEW_EVENT}
			<Button on:click={addEvent}>Add</Button>
		{:else if state == State.EDIT_EVENT}
			<Button on:click={editEvent}>Edit</Button>
		{/if}
	</div>
</div>

<style lang="scss">
	.input {
		display: flex;
		align-items: center;
		gap: 10px;
	}
</style>
