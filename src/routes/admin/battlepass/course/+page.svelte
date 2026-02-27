<script lang="ts">
	import Title from '$lib/components/Title.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import Crown from 'lucide-svelte/icons/crown';
	import Plus from 'lucide-svelte/icons/plus';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import Edit from 'lucide-svelte/icons/pencil';
	import RefreshCw from 'lucide-svelte/icons/refresh-cw';

	let courses: any[] = [];
	let courseEntries: any[] = [];
	let selectedCourseId: number | null = null;

	let showCourseDialog = false;
	let showCourseEntryDialog = false;

	let courseForm = {
		id: null as number | null,
		title: '',
		description: ''
	};

	let courseEntryForm = {
		id: null as number | null,
		type: 'level' as 'level' | 'mappack',
		refId: '' as any,
		sortOrder: 0,
		rewardItemId: '' as any,
		rewardQuantity: 1
	};

	async function fetchCourses() {
		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/battlepass/courses`, {
				headers: { Authorization: `Bearer ${await $user.token()}` }
			});

			if (!res.ok) {
				throw new Error('Failed to fetch courses');
			}

			courses = await res.json();

			if (!selectedCourseId && courses.length > 0) {
				selectedCourseId = Number(courses[0].id);
			}

			if (selectedCourseId && !courses.find((course) => Number(course.id) === Number(selectedCourseId))) {
				selectedCourseId = courses.length > 0 ? Number(courses[0].id) : null;
			}
		} catch (error) {
			console.error('Failed to fetch courses:', error);
			toast.error('Failed to fetch courses');
		}
	}

	async function fetchCourseEntries(courseId: number) {
		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/battlepass/course/${courseId}/entries`, {
				headers: { Authorization: `Bearer ${await $user.token()}` }
			});

			if (!res.ok) {
				throw new Error('Failed to fetch course entries');
			}

			courseEntries = await res.json();
		} catch (error) {
			console.error('Failed to fetch course entries:', error);
			toast.error('Failed to fetch course entries');
			courseEntries = [];
		}
	}

	async function saveCourse() {
		const isNew = !courseForm.id;
		const url = isNew
			? `${import.meta.env.VITE_API_URL}/battlepass/courses`
			: `${import.meta.env.VITE_API_URL}/battlepass/course/${courseForm.id}`;

		toast.promise(
			(async () => {
				const res = await fetch(url, {
					method: isNew ? 'POST' : 'PATCH',
					body: JSON.stringify({
						title: courseForm.title,
						description: courseForm.description
					}),
					headers: {
						Authorization: `Bearer ${await $user.token()}`,
						'Content-Type': 'application/json'
					}
				});

				if (!res.ok) {
					throw new Error('Failed to save course');
				}

				showCourseDialog = false;
				await fetchCourses();
				if (isNew && courses.length > 0) {
					const latest = courses[0];
					selectedCourseId = Number(latest.id);
				}
			})(),
			{
				success: isNew ? 'Course created!' : 'Course updated!',
				loading: 'Saving...',
				error: 'Failed to save course'
			}
		);
	}

	async function removeCourse(id: number) {
		if (!confirm('Delete this course?')) return;

		toast.promise(
			(async () => {
				const res = await fetch(`${import.meta.env.VITE_API_URL}/battlepass/course/${id}`, {
					method: 'DELETE',
					headers: { Authorization: `Bearer ${await $user.token()}` }
				});

				if (!res.ok) {
					throw new Error('Failed to delete course');
				}

				await fetchCourses();
				if (selectedCourseId === id) {
					selectedCourseId = courses.length > 0 ? Number(courses[0].id) : null;
				}
				if (!selectedCourseId) {
					courseEntries = [];
				}
			})(),
			{
				success: 'Course deleted!',
				loading: 'Deleting...',
				error: 'Failed to delete course'
			}
		);
	}

	async function saveCourseEntry() {
		if (!selectedCourseId) {
			toast.error('Select a course first');
			return;
		}

		const isNew = !courseEntryForm.id;
		const url = isNew
			? `${import.meta.env.VITE_API_URL}/battlepass/course/${selectedCourseId}/entries`
			: `${import.meta.env.VITE_API_URL}/battlepass/course/entry/${courseEntryForm.id}`;

		toast.promise(
			(async () => {
				const res = await fetch(url, {
					method: isNew ? 'POST' : 'PATCH',
					body: JSON.stringify({
						type: courseEntryForm.type,
						refId: Number(courseEntryForm.refId),
						sortOrder: Number(courseEntryForm.sortOrder),
						rewardXp: 100,
						rewardItemId: courseEntryForm.rewardItemId ? Number(courseEntryForm.rewardItemId) : null,
						rewardQuantity: Number(courseEntryForm.rewardQuantity || 1)
					}),
					headers: {
						Authorization: `Bearer ${await $user.token()}`,
						'Content-Type': 'application/json'
					}
				});

				if (!res.ok) {
					throw new Error('Failed to save entry');
				}

				showCourseEntryDialog = false;
				if (selectedCourseId) {
					await fetchCourseEntries(selectedCourseId);
				}
			})(),
			{
				success: isNew ? 'Entry created!' : 'Entry updated!',
				loading: 'Saving...',
				error: 'Failed to save entry'
			}
		);
	}

	async function removeCourseEntry(id: number) {
		if (!selectedCourseId) return;
		if (!confirm('Delete this course entry?')) return;

		toast.promise(
			(async () => {
				const res = await fetch(`${import.meta.env.VITE_API_URL}/battlepass/course/entry/${id}`, {
					method: 'DELETE',
					headers: { Authorization: `Bearer ${await $user.token()}` }
				});

				if (!res.ok) {
					throw new Error('Failed to delete entry');
				}

				if (selectedCourseId) {
					await fetchCourseEntries(selectedCourseId);
				}
			})(),
			{
				success: 'Entry deleted!',
				loading: 'Deleting...',
				error: 'Failed to delete entry'
			}
		);
	}

	function openNewCourse() {
		courseForm = { id: null, title: '', description: '' };
		showCourseDialog = true;
	}

	function openEditCourse(course: any) {
		courseForm = {
			id: course.id,
			title: course.title,
			description: course.description || ''
		};
		showCourseDialog = true;
	}

	function openNewCourseEntry() {
		courseEntryForm = {
			id: null,
			type: 'level',
			refId: '',
			sortOrder: 0,
			rewardItemId: '',
			rewardQuantity: 1
		};
		showCourseEntryDialog = true;
	}

	function openEditCourseEntry(entry: any) {
		courseEntryForm = {
			id: entry.id,
			type: entry.type,
			refId: entry.refId,
			sortOrder: entry.sortOrder,
			rewardItemId: entry.rewardItemId ?? '',
			rewardQuantity: entry.rewardQuantity || 1
		};
		showCourseEntryDialog = true;
	}

	$: if (selectedCourseId) {
		fetchCourseEntries(selectedCourseId);
	} else {
		courseEntries = [];
	}

	onMount(() => {
		fetchCourses();
	});
</script>

<Title value="Battle Pass Course Manager" />

<div class="wrapper">
	<div class="mb-6 flex items-center gap-4">
		<Crown class="h-8 w-8 text-yellow-400" />
		<h1 class="text-2xl font-bold">Battle Pass Course Manager</h1>
		<Button variant="outline" size="icon" on:click={fetchCourses}>
			<RefreshCw class="h-4 w-4" />
		</Button>
		<a href="/admin/battlepass" class="ml-auto">
			<Button variant="outline" size="sm">Back to Battle Pass</Button>
		</a>
	</div>

	<div class="grid gap-4 lg:grid-cols-[380px,1fr]">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between">
				<Card.Title>Courses</Card.Title>
				<Button size="sm" on:click={openNewCourse}>
					<Plus class="mr-1 h-4 w-4" />
					New
				</Button>
			</Card.Header>
			<Card.Content class="space-y-2">
				{#each courses as course}
					<div
						class={`rounded border p-3 ${selectedCourseId === course.id ? 'border-primary bg-muted/40' : ''}`}
					>
						<div class="flex items-start justify-between gap-2">
							<button
								type="button"
								class="min-w-0 flex-1 text-left"
								on:click={() => {
									selectedCourseId = Number(course.id);
								}}
							>
								<div class="font-semibold">{course.title}</div>
								{#if course.description}
									<div class="text-xs text-muted-foreground">{course.description}</div>
								{/if}
							</button>
							<div class="flex shrink-0 gap-2">
								<Button variant="outline" size="icon" on:click={() => openEditCourse(course)}>
									<Edit class="h-4 w-4" />
								</Button>
								<Button variant="destructive" size="icon" on:click={() => removeCourse(course.id)}>
									<Trash2 class="h-4 w-4" />
								</Button>
							</div>
						</div>
					</div>
				{:else}
					<div class="rounded border border-dashed p-4 text-sm text-muted-foreground">No courses</div>
				{/each}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between">
				<div>
					<Card.Title>Course Entries</Card.Title>
					{#if selectedCourseId}
						<p class="text-sm text-muted-foreground">Course #{selectedCourseId}</p>
					{/if}
				</div>
				<Button size="sm" on:click={openNewCourseEntry} disabled={!selectedCourseId}>
					<Plus class="mr-1 h-4 w-4" />
					Add Entry
				</Button>
			</Card.Header>
			<Card.Content>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Order</Table.Head>
							<Table.Head>Type</Table.Head>
							<Table.Head>Reference</Table.Head>
							<Table.Head>Reward</Table.Head>
							<Table.Head>Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each courseEntries as entry}
							<Table.Row>
								<Table.Cell>{entry.sortOrder}</Table.Cell>
								<Table.Cell>{entry.type}</Table.Cell>
								<Table.Cell>{entry.refId}</Table.Cell>
								<Table.Cell>
									+100 XP
									{#if entry.rewardItemId}
										 • Item #{entry.rewardItemId} x{entry.rewardQuantity}
									{/if}
								</Table.Cell>
								<Table.Cell>
									<div class="flex gap-2">
										<Button variant="outline" size="icon" on:click={() => openEditCourseEntry(entry)}>
											<Edit class="h-4 w-4" />
										</Button>
										<Button variant="destructive" size="icon" on:click={() => removeCourseEntry(entry.id)}>
											<Trash2 class="h-4 w-4" />
										</Button>
									</div>
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell colspan={5} class="text-center text-muted-foreground">
									{selectedCourseId ? 'No course entries' : 'Select a course first'}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Content>
		</Card.Root>
	</div>
</div>

<Dialog.Root bind:open={showCourseDialog}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>{courseForm.id ? 'Edit Course' : 'New Course'}</Dialog.Title>
		</Dialog.Header>
		<div class="flex flex-col gap-4">
			<div>
				<Label for="courseTitle">Title</Label>
				<Input id="courseTitle" bind:value={courseForm.title} placeholder="Starter Course" />
			</div>
			<div>
				<Label for="courseDesc">Description</Label>
				<Textarea id="courseDesc" bind:value={courseForm.description} placeholder="Course mode description" />
			</div>
		</div>
		<Dialog.Footer>
			<div class="flex w-full items-center justify-between">
				<div>
					{#if courseForm.id}
						<Button variant="destructive" on:click={() => removeCourse(Number(courseForm.id))}>
							<Trash2 class="mr-1 h-4 w-4" />
							Delete
						</Button>
					{/if}
				</div>
				<div class="flex gap-2">
					<Button variant="outline" on:click={() => (showCourseDialog = false)}>Cancel</Button>
					<Button on:click={saveCourse}>Save</Button>
				</div>
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={showCourseEntryDialog}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>{courseEntryForm.id ? 'Edit Course Entry' : 'Add Course Entry'}</Dialog.Title>
		</Dialog.Header>
		<div class="flex flex-col gap-4">
			<div class="grid grid-cols-2 gap-4">
				<div>
					<Label for="entryType">Type</Label>
					<Select.Root
						selected={{ value: courseEntryForm.type, label: courseEntryForm.type }}
						onSelectedChange={(v) => {
							if (v) courseEntryForm.type = v.value;
						}}
					>
						<Select.Trigger id="entryType"><Select.Value placeholder="Type" /></Select.Trigger>
						<Select.Content>
							<Select.Item value="level" label="level">level</Select.Item>
							<Select.Item value="mappack" label="mappack">mappack</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
				<div>
					<Label for="entryRef">Reference ID</Label>
					<Input id="entryRef" type="number" bind:value={courseEntryForm.refId} />
				</div>
			</div>
			<div>
				<Label for="entryOrder">Sort Order</Label>
				<Input id="entryOrder" type="number" bind:value={courseEntryForm.sortOrder} />
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<Label for="entryRewardItem">Reward Item ID</Label>
					<Input id="entryRewardItem" type="number" bind:value={courseEntryForm.rewardItemId} />
				</div>
				<div>
					<Label for="entryRewardQty">Item Qty</Label>
					<Input id="entryRewardQty" type="number" min="1" bind:value={courseEntryForm.rewardQuantity} />
				</div>
			</div>
			<div class="text-xs text-muted-foreground">XP reward is fixed: +100 XP when this entry is cleared.</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" on:click={() => (showCourseEntryDialog = false)}>Cancel</Button>
			<Button on:click={saveCourseEntry}>Save</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<style lang="scss">
	.wrapper {
		padding-inline: 75px;
		padding-block: 30px;
	}

	@media screen and (max-width: 768px) {
		.wrapper {
			padding-inline: 15px;
		}
	}
</style>
