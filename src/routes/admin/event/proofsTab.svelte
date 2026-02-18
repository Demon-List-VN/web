<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import PlayerLink from '$lib/components/playerLink.svelte';

	export let event: any;
	export let proofs: any[];
	export let fetchProofs: () => void;
	export let acceptProof: (userid: string) => void;
	export let rejectProof: (userid: string) => void;
	export let exportToCSV: () => void;
</script>

<div class="flex flex-col gap-[10px]">
	{#if event.id === undefined}
		Need to be added first
	{:else}
		<div class="flex gap-[10px]">
			<Button class="w-[150px]" on:click={fetchProofs}>Load Proofs</Button>
			<Button class="w-[150px]" on:click={exportToCSV} disabled={proofs.length === 0}>
				Export to CSV
			</Button>
		</div>
		{#if proofs.length > 0}
			<div class="proofs-table">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Created</Table.Head>
							<Table.Head>Player</Table.Head>
							<Table.Head>Content</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head>Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each proofs as proof}
							<Table.Row>
								<Table.Cell>{new Date(proof.createdAt).toLocaleString()}</Table.Cell>
								<Table.Cell>
									<a href={`/players/${proof.players.name}`}>{proof.players.name}</a>
								</Table.Cell>
								<Table.Cell class="content-cell">
									{#if proof.content.startsWith('http')}
										<a href={proof.content} target="_blank" rel="noopener noreferrer">
											{proof.content}
										</a>
									{:else}
										{proof.content}
									{/if}
								</Table.Cell>
								<Table.Cell>
									<span class="status-badge" class:status-accepted={proof.accepted}>
										{proof.accepted ? 'Accepted' : 'Pending'}
									</span>
								</Table.Cell>
								<Table.Cell>
									<div class="action-buttons">
										<Button
											size="sm"
											on:click={() => acceptProof(proof.userid)}
											disabled={proof.accepted}
										>
											Accept
										</Button>
										<Button
											size="sm"
											variant="destructive"
											on:click={() => rejectProof(proof.userid)}
											disabled={!proof.accepted}
										>
											Reject
										</Button>
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		{:else}
			<p class="text-muted-foreground">No proofs loaded. Click "Load Proofs" to fetch.</p>
		{/if}
	{/if}
</div>

<style lang="scss">
	.proofs-table {
		margin-top: 20px;
		overflow-x: auto;
	}

	.proofs-table :global(tr.accepted) {
		background-color: rgba(34, 197, 94, 0.1);
	}

	.content-cell {
		max-width: 400px;
		word-break: break-word;
	}

	.content-cell a {
		color: var(--primary);
		text-decoration: underline;
	}

	.status-badge {
		padding: 4px 12px;
		border-radius: 12px;
		font-size: 12px;
		font-weight: 500;
		background-color: var(--muted);
	}

	.status-badge.status-accepted {
		background-color: rgb(34, 197, 94);
		color: white;
	}

	.action-buttons {
		display: flex;
		gap: 8px;
	}
</style>
