<script lang="ts">
	import Title from '$lib/components/Title.svelte';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import CrossCircled from 'svelte-radix/CrossCircled.svelte';
	import CheckCircled from 'svelte-radix/CheckCircled.svelte';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import Loading from '$lib/components/animation/loading.svelte';

	let submissions: any[] = [];
	let loading = true;
	let selectedSubmission: any = null;
	let dialogOpen = false;
	let rating: number | null = null;
	let rejectReason = '';

	onMount(async () => {
		await fetchSubmissions();
	});

	async function fetchSubmissions() {
		loading = true;
		try {
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/level-submissions?start=0&end=100`,
				{
					headers: {
						Authorization: `Bearer ${await $user.token()}`
					}
				}
			);

			if (res.ok) {
				submissions = await res.json();
			} else {
				toast.error('Failed to fetch level submissions');
			}
		} catch (err) {
			toast.error('An error occurred while fetching submissions');
		}
		loading = false;
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleString();
	}

	async function acceptSubmission() {
		if (!selectedSubmission) return;

		if (!confirm('Accept this level submission?')) {
			return;
		}

		toast.loading('Processing verdict... This page will be refreshed.');

		try {
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/level-submissions/${selectedSubmission.userId}/${selectedSubmission.levelId}/verdict`,
				{
					method: 'POST',
					body: JSON.stringify({
						accept: true,
						rating: rating
					}),
					headers: {
						Authorization: `Bearer ${await $user.token()}`,
						'Content-Type': 'application/json'
					}
				}
			);

			if (!res.ok) {
				const error = await res.json();
				toast.error(error.message || 'Failed to accept submission');
				return;
			}

			toast.success('Level submission accepted!');
			window.location.reload();
		} catch (err) {
			toast.error('An error occurred');
		}
	}

	async function rejectSubmission() {
		if (!selectedSubmission) return;

		if (!confirm('Reject this level submission?')) {
			return;
		}

		toast.loading('Processing verdict... This page will be refreshed.');

		try {
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/level-submissions/${selectedSubmission.userId}/${selectedSubmission.levelId}/verdict`,
				{
					method: 'POST',
					body: JSON.stringify({
						accept: false,
						reason: rejectReason
					}),
					headers: {
						Authorization: `Bearer ${await $user.token()}`,
						'Content-Type': 'application/json'
					}
				}
			);

			if (!res.ok) {
				const error = await res.json();
				toast.error(error.message || 'Failed to reject submission');
				return;
			}

			toast.success('Level submission rejected!');
			window.location.reload();
		} catch (err) {
			toast.error('An error occurred');
		}
	}

	function openDialog(submission: any) {
		selectedSubmission = submission;
		rating = submission.levels?.rating || null;
		rejectReason = '';
		dialogOpen = true;
	}
</script>

<Title value="Level Submissions" />

<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Content class="sm:max-w-[500px]">
		<Dialog.Header>
			<Dialog.Title>Review Level Submission</Dialog.Title>
		</Dialog.Header>
		{#if selectedSubmission}
			<div class="grid gap-4 py-4">
				<div class="grid grid-cols-4 items-center gap-4">
					<Label class="text-right font-bold">Level</Label>
					<div class="col-span-3">
						<a href={`/level/${selectedSubmission.levelId}`} class="underline">
							{selectedSubmission.levels?.name || selectedSubmission.levelId}
						</a>
						<span class="text-muted-foreground">
							by {selectedSubmission.levels?.creator || 'Unknown'}
						</span>
					</div>
				</div>
				<div class="grid grid-cols-4 items-center gap-4">
					<Label class="text-right font-bold">Submitted by</Label>
					<div class="col-span-3">
						<a href={`/player/${selectedSubmission.userId}`} class="underline">
							{selectedSubmission.players?.name || selectedSubmission.userId}
						</a>
					</div>
				</div>
				{#if selectedSubmission.comment}
					<div class="grid grid-cols-4 items-center gap-4">
						<Label class="text-right font-bold">Comment</Label>
						<div class="col-span-3 text-sm">{selectedSubmission.comment}</div>
					</div>
				{/if}
				<div class="grid grid-cols-4 items-center gap-4">
					<Label class="text-right font-bold">Submitted at</Label>
					<div class="col-span-3 text-sm">{formatDate(selectedSubmission.createdAt)}</div>
				</div>
				<hr />
				<div class="grid grid-cols-4 items-center gap-4">
					<Label for="rating" class="text-right">Rating</Label>
					<Input
						id="rating"
						type="number"
						inputmode="numeric"
						bind:value={rating}
						placeholder="Set rating for the level"
						class="col-span-3"
					/>
				</div>
				<div class="grid grid-cols-4 items-center gap-4">
					<Label for="rejectReason" class="text-right">Reject Reason</Label>
					<Input
						id="rejectReason"
						bind:value={rejectReason}
						placeholder="Reason for rejection (optional)"
						class="col-span-3"
					/>
				</div>
			</div>
		{/if}
		<Dialog.Footer class="gap-2">
			<Button variant="destructive" on:click={rejectSubmission}>
				<CrossCircled class="mr-2" size={16} />
				Reject
			</Button>
			<Button variant="default" on:click={acceptSubmission}>
				<CheckCircled class="mr-2" size={16} />
				Accept
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<div class="wrapper">
	<h1 class="mb-4 text-2xl font-bold">Level Submissions</h1>
	<p class="mb-4 text-muted-foreground">
		Review and approve challenge level submissions from users.
	</p>

	{#if loading}
		<div class="flex justify-center py-8">
			<Loading inverted={true} />
		</div>
	{:else}
		<Table.Root>
			<Table.Caption>Total submissions: {submissions.length}</Table.Caption>
			<Table.Header>
				<Table.Row>
					<Table.Head>Level</Table.Head>
					<Table.Head class="w-[150px] text-center">Submitted by</Table.Head>
					<Table.Head class="w-[150px] text-center">Submitted at</Table.Head>
					<Table.Head class="w-[100px] text-center">Status</Table.Head>
					<Table.Head class="w-[100px] text-center">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each submissions as submission}
					<Table.Row class="cursor-pointer hover:bg-muted/50">
						<Table.Cell class="font-medium">
							<a href={`/level/${submission.levelId}`} data-sveltekit-preload-data="tap">
								{submission.levels?.name || submission.levelId}
							</a>
							<br />
							<span class="text-xs text-muted-foreground">
								by {submission.levels?.creator || 'Unknown'}
							</span>
						</Table.Cell>
						<Table.Cell class="text-center">
							<a href={`/player/${submission.userId}`}>
								{submission.players?.name || 'Unknown'}
							</a>
						</Table.Cell>
						<Table.Cell class="text-center text-sm">
							{formatDate(submission.createdAt)}
						</Table.Cell>
						<Table.Cell class="text-center">
							{#if submission.accepted}
								<span class="text-green-500">Accepted</span>
							{:else}
								<span class="text-yellow-500">Pending</span>
							{/if}
						</Table.Cell>
						<Table.Cell class="text-center">
							{#if !submission.accepted}
								<Button variant="outline" size="sm" on:click={() => openDialog(submission)}>
									Review
								</Button>
							{:else}
								<span class="text-muted-foreground">-</span>
							{/if}
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	{/if}
</div>

<style lang="scss">
	.wrapper {
		padding-inline: 50px;
	}

	@media screen and (max-width: 900px) {
		.wrapper {
			padding-inline: 10px;
		}
	}
</style>