<script lang="ts">
	import Title from '$lib/components/Title.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import Loading from '$lib/components/animation/loading.svelte';
	import CheckCircled from 'svelte-radix/CheckCircled.svelte';
	import CrossCircled from 'svelte-radix/CrossCircled.svelte';

	let submissions: any[] = [];
	let loading = true;
	let selectedSubmission: any = null;
	let dialogOpen = false;
	let rejectReason = '';
	let acceptedFilter: { label: string; value: 'pending' | 'accepted'; } = {
		label: 'Pending Only',
		value: 'pending'
	};

	onMount(async () => {
		await fetchSubmissions();
	});

	function formatDate(dateString: string) {
		return new Date(dateString)
			.toLocaleString();
	}

	function getSubmitterName(submission: any) {
		return submission.players?.name || submission.userId;
	}

	async function fetchSubmissions() {
		loading = true;

		try {
			const params = new URLSearchParams();

			params.set('accepted', acceptedFilter.value === 'accepted' ? 'true' : 'false');
			params.set('end', '10000');

			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/ldm-variant-submissions?${params.toString()}`,
				{
					headers: {
						Authorization: `Bearer ${await $user.token()}`
					}
				}
			);

			if (!res.ok) {
				const error = await res.json()
					.catch(() => null);

				throw new Error(error?.message || 'Failed to fetch LDM submissions');
			}

			submissions = await res.json();
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: 'Failed to fetch LDM submissions'
			);
		} finally {
			loading = false;
		}
	}

	function openDialog(submission: any) {
		selectedSubmission = submission;
		rejectReason = '';
		dialogOpen = true;
	}

	async function sendVerdict(accept: boolean) {
		if (!selectedSubmission) {
			return;
		}

		if (!confirm(accept ? 'Accept this LDM variant?' : 'Reject this LDM variant?')) {
			return;
		}

		toast.loading('Processing verdict...');

		try {
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/ldm-variant-submissions/${selectedSubmission.id}/verdict`,
				{
					method: 'POST',
					body: JSON.stringify({
						accept,
						reason: rejectReason
					}),
					headers: {
						Authorization: `Bearer ${await $user.token()}`,
						'Content-Type': 'application/json'
					}
				}
			);

			if (!res.ok) {
				const error = await res.json()
					.catch(() => null);

				throw new Error(error?.message || 'Failed to process verdict');
			}

			toast.success(accept ? 'LDM variant accepted' : 'LDM variant rejected');
			dialogOpen = false;
			await fetchSubmissions();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'Failed to process verdict'
			);
		}
	}

	function handleFilterChange(selected: any) {
		if (!selected) {
			return;
		}

		acceptedFilter = {
			label: selected.label,
			value: selected.value as 'pending' | 'accepted'
		};
		fetchSubmissions();
	}
</script>

<Title value="LDM Variant Submissions" />

<Dialog.Root bind:open={dialogOpen}>
  <Dialog.Content class="sm:max-w-[560px]">
    <Dialog.Header>
      <Dialog.Title>Review LDM Variant</Dialog.Title>
    </Dialog.Header>
    {#if selectedSubmission}
      <div class="grid gap-4 py-4">
        <div class="grid grid-cols-4 items-center gap-4">
          <Label class="text-right font-bold">Main level</Label>
          <div class="col-span-3">
            <a href={`/level/${selectedSubmission.mainLevelId}`} class="underline">
              {selectedSubmission.mainLevel?.name || selectedSubmission.mainLevelId}
            </a>
            <span class="text-muted-foreground">
              by {selectedSubmission.mainLevel?.creator || 'Unknown'}
            </span>
          </div>
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label class="text-right font-bold">LDM variant</Label>
          <div class="col-span-3">
            <a href={`/level/${selectedSubmission.variantLevelId}`} class="underline">
              {selectedSubmission.variantLevel?.name || selectedSubmission.variantLevelId}
            </a>
            <span class="text-muted-foreground">
              by {selectedSubmission.variantLevel?.creator || 'Unknown'}
            </span>
          </div>
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label class="text-right font-bold">Submitted by</Label>
          <div class="col-span-3">
            <a href={`/player/${selectedSubmission.userId}`} class="underline">
              {getSubmitterName(selectedSubmission)}
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
          <div class="col-span-3 text-sm">
            {formatDate(selectedSubmission.created_at)}
          </div>
        </div>
        <hr />
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
      <Button variant="destructive" on:click={() => sendVerdict(false)}>
        <CrossCircled class="mr-2" size={16} />
        Reject
      </Button>
      <Button variant="default" on:click={() => sendVerdict(true)}>
        <CheckCircled class="mr-2" size={16} />
        Accept
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<div class="wrapper">
  <h1 class="mb-4 text-2xl font-bold">LDM Variant Submissions</h1>
  <p class="mb-4 text-muted-foreground">
    Review submitted LDM variants and link accepted variants to their main level.
  </p>

  <div class="mb-4 flex items-center gap-4">
    <Label class="font-medium">Filter by status:</Label>
    <Select.Root
      onSelectedChange={handleFilterChange}
      selected={acceptedFilter}
    >
      <Select.Trigger class="w-[180px]">
        <Select.Value />
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="pending">Pending Only</Select.Item>
        <Select.Item value="accepted">Accepted Only</Select.Item>
      </Select.Content>
    </Select.Root>
  </div>

  {#if loading}
    <div class="flex justify-center py-8">
      <Loading inverted={true} />
    </div>
  {:else}
    <Table.Root>
      <Table.Caption>Total submissions: {submissions.length}</Table.Caption>
      <Table.Header>
        <Table.Row>
          <Table.Head>Main level</Table.Head>
          <Table.Head>LDM variant</Table.Head>
          <Table.Head class="w-[150px] text-center">Submitted by</Table.Head>
          <Table.Head class="w-[150px] text-center">Submitted at</Table.Head>
          <Table.Head class="w-[100px] text-center">Status</Table.Head>
          <Table.Head class="w-[100px] text-center">Actions</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each submissions as submission}
          <Table.Row>
            <Table.Cell class="font-medium">
              <a href={`/level/${submission.mainLevelId}`}>
                {submission.mainLevel?.name || submission.mainLevelId}
              </a>
              <br />
              <span class="text-xs text-muted-foreground">
                by {submission.mainLevel?.creator || 'Unknown'}
              </span>
            </Table.Cell>
            <Table.Cell class="font-medium">
              <a href={`/level/${submission.variantLevelId}`}>
                {submission.variantLevel?.name || submission.variantLevelId}
              </a>
              <br />
              <span class="text-xs text-muted-foreground">
                by {submission.variantLevel?.creator || 'Unknown'}
              </span>
            </Table.Cell>
            <Table.Cell class="text-center">
              <a href={`/player/${submission.userId}`}>
                {getSubmitterName(submission)}
              </a>
            </Table.Cell>
            <Table.Cell class="text-center text-sm">
              {formatDate(submission.created_at)}
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
                <Button
                  variant="outline"
                  size="sm"
                  on:click={() => openDialog(submission)}
                >
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
