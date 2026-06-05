<script lang="ts">
	import Title from '$lib/components/Title.svelte';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import Loading from '$lib/components/animation/loading.svelte';
	import { user } from '$lib/client';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	type DonationPlayer = {
		uid: string;
		name: string;
		avatarVersion?: number | null;
		isAvatarGif?: boolean | null;
		supporterUntil?: string | null;
		bgColor?: string | null;
		borderColor?: string | null;
		clan?: number | null;
		clans?: {
			tag?: string | null;
			boostedUntil?: string | null;
			tagBgColor?: string | null;
			tagTextColor?: string | null;
		} | null;
	};

	type ManagedDonation = {
		id: number;
		createdAt: string;
		userID: string;
		amount: number;
		currency: string;
		state: string;
		delivered: boolean;
		paymentMethod: string;
		message: string | null;
		invalidatedAt: string | null;
		invalidatedBy: string | null;
		invalidReason: string | null;
		player: DonationPlayer | null;
	};

	const stateOptions = [
		{ value: 'ALL', label: 'All donations' },
		{ value: 'PAID', label: 'Paid' },
		{ value: 'PENDING', label: 'Pending' },
		{ value: 'INVALID', label: 'Invalid' }
	];
	const pageSize = 50;

	let donations: ManagedDonation[] = [];
	let loading = true;
	let removingId: number | null = null;
	let selectedState = 'ALL';
	let offset = 0;
	let total = 0;

	$: canPrevious = offset > 0;
	$: canNext = offset + pageSize < total;

	onMount(async () => {
		await fetchDonations();
	});

	function formatVND(amount: number) {
		return new Intl.NumberFormat('vi-VN')
			.format(amount) + ' VND';
	}

	function formatDate(value: string | null) {
		if (!value) {
			return '-';
		}

		return new Intl.DateTimeFormat(
			'vi-VN',
			{
				dateStyle: 'short',
				timeStyle: 'short'
			}
		)
			.format(new Date(value));
	}

	function getStateClass(state: string) {
		return state.toLowerCase()
			.replace(/[^a-z0-9_-]/g, '');
	}

	async function fetchDonations(nextOffset = offset) {
		loading = true;

		try {
			const params = new URLSearchParams({
				limit: String(pageSize),
				offset: String(nextOffset),
				state: selectedState
			});
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/donations/manage?${params}`,
				{
					headers: {
						Authorization: `Bearer ${await $user.token()}`
					}
				}
			);
			const data = await res.json();

			if (!res.ok) {
				throw new Error(data?.message || 'Failed to load donations');
			}

			donations = data.donations || [];
			total = data.total || 0;
			offset = data.offset || nextOffset;
		} catch (error: any) {
			toast.error(error?.message || 'Failed to load donations');
		} finally {
			loading = false;
		}
	}

	async function handleStateChange(value: any) {
		selectedState = value?.value || 'ALL';
		await fetchDonations(0);
	}

	async function invalidateDonation(donation: ManagedDonation) {
		if (
			!confirm(
				`Remove donation #${donation.id} from overlay and donation totals? This will mark it INVALID.`
			)
		) {
			return;
		}

		removingId = donation.id;

		try {
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/donations/manage/${donation.id}/invalidate`,
				{
					method: 'PATCH',
					headers: {
						Authorization: `Bearer ${await $user.token()}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						reason: 'Removed from donation manager'
					})
				}
			);
			const data = await res.json();

			if (!res.ok) {
				throw new Error(data?.message || 'Failed to remove donation');
			}

			donations = donations
				.map((item) => item.id === donation.id ? data : item)
				.filter((item) => selectedState === 'ALL' || item.state === selectedState);
			toast.success('Donation marked invalid');
		} catch (error: any) {
			toast.error(error?.message || 'Failed to remove donation');
		} finally {
			removingId = null;
		}
	}
</script>

<Title value="Donation Manager" />

{#if $user.loggedIn && ($user.data?.isAdmin || $user.data?.isManager)}
  <main class="page">
    <header class="pageHeader">
      <div>
        <h1>Donation Manager</h1>
        <p>View SePay donations and remove invalid entries from overlay totals.</p>
      </div>

      <div class="toolbar">
        <Select.Root
          selected={stateOptions.find((option) => option.value === selectedState)}
          onSelectedChange={handleStateChange}
        >
          <Select.Trigger class="stateSelect">
            <Select.Value placeholder="Filter state" />
          </Select.Trigger>
          <Select.Content>
            {#each stateOptions as option}
              <Select.Item value={option.value}>{option.label}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>

        <Button variant="outline" on:click={() => fetchDonations()}>
          Refresh
        </Button>
      </div>
    </header>

    {#if loading}
      <div class="loading">
        <Loading />
      </div>
    {:else}
      <section class="tableWrap">
        <Table.Root>
          <Table.Caption>
            Showing {donations.length} of {total} donation orders
          </Table.Caption>
          <Table.Header>
            <Table.Row>
              <Table.Head>Order</Table.Head>
              <Table.Head>Time</Table.Head>
              <Table.Head>Player</Table.Head>
              <Table.Head class="amountHead">Amount</Table.Head>
              <Table.Head>Message</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head>Removed</Table.Head>
              <Table.Head class="actionHead">Action</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#if donations.length === 0}
              <Table.Row>
                <Table.Cell colspan={8} class="empty">
                  No donations found.
                </Table.Cell>
              </Table.Row>
            {:else}
              {#each donations as donation}
                <Table.Row>
                  <Table.Cell>
                    <span class="orderId">#{donation.id}</span>
                  </Table.Cell>
                  <Table.Cell>{formatDate(donation.createdAt)}</Table.Cell>
                  <Table.Cell>
                    {#if donation.player}
                      <PlayerLink player={donation.player} showAvatar truncate={18} />
                    {:else}
                      <span class="muted">{donation.userID}</span>
                    {/if}
                  </Table.Cell>
                  <Table.Cell class="amountCell">
                    {formatVND(donation.amount)}
                  </Table.Cell>
                  <Table.Cell>
                    <span class="message">{donation.message || '-'}</span>
                  </Table.Cell>
                  <Table.Cell>
                    <span class:delivered={donation.delivered} class="state {getStateClass(donation.state)}">
                      {donation.state}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    {#if donation.invalidatedAt}
                      <span title={donation.invalidReason || undefined}>
                        {formatDate(donation.invalidatedAt)}
                      </span>
                    {:else}
                      <span class="muted">-</span>
                    {/if}
                  </Table.Cell>
                  <Table.Cell class="actionCell">
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={donation.state === 'INVALID' || removingId === donation.id}
                      on:click={() => invalidateDonation(donation)}
                    >
                      {removingId === donation.id ? 'Removing...' : 'Remove'}
                    </Button>
                  </Table.Cell>
                </Table.Row>
              {/each}
            {/if}
          </Table.Body>
        </Table.Root>
      </section>

      <footer class="pager">
        <Button
          variant="outline"
          disabled={!canPrevious || loading}
          on:click={() => fetchDonations(Math.max(offset - pageSize, 0))}
        >
          Previous
        </Button>
        <span>{offset + 1}-{Math.min(offset + pageSize, total)} / {total}</span>
        <Button
          variant="outline"
          disabled={!canNext || loading}
          on:click={() => fetchDonations(offset + pageSize)}
        >
          Next
        </Button>
      </footer>
    {/if}
  </main>
{/if}

<style lang="scss">
	.page {
		width: min(1280px, calc(100vw - 32px));
		margin: 0 auto;
		padding: 32px 0;
	}

	.pageHeader {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 20px;

		h1 {
			margin: 0;
			font-size: 2rem;
			font-weight: 800;
		}

		p {
			margin: 6px 0 0;
			color: hsl(var(--muted-foreground));
		}
	}

	.toolbar {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	:global(.stateSelect) {
		width: 180px;
	}

	.loading {
		display: grid;
		min-height: 240px;
		place-items: center;
	}

	.tableWrap {
		overflow-x: auto;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
	}

	.amountHead,
	.actionHead,
	.amountCell,
	.actionCell {
		text-align: right;
	}

	.orderId,
	.amountCell {
		font-weight: 700;
	}

	.message {
		display: inline-block;
		max-width: 320px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		vertical-align: bottom;
	}

	.muted {
		color: hsl(var(--muted-foreground));
	}

	.state {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 74px;
		border-radius: 999px;
		padding: 3px 8px;
		background: rgba(107, 114, 128, 0.16);
		color: rgb(209, 213, 219);
		font-size: 0.75rem;
		font-weight: 800;
		letter-spacing: 0;
	}

	.state.paid.delivered {
		background: rgba(22, 163, 74, 0.16);
		color: rgb(134, 239, 172);
	}

	.state.pending {
		background: rgba(234, 179, 8, 0.16);
		color: rgb(253, 224, 71);
	}

	.state.invalid {
		background: rgba(220, 38, 38, 0.16);
		color: rgb(252, 165, 165);
	}

	.empty {
		height: 120px;
		text-align: center;
		color: hsl(var(--muted-foreground));
	}

	.pager {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 12px;
		margin-top: 16px;
		color: hsl(var(--muted-foreground));
		font-size: 0.9rem;
	}

	@media (max-width: 720px) {
		.pageHeader {
			align-items: stretch;
			flex-direction: column;
		}

		.toolbar {
			align-items: stretch;
			flex-direction: column;
		}

		:global(.stateSelect) {
			width: 100%;
		}
	}
</style>
