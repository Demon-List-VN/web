<script lang="ts">
	import { onMount } from 'svelte';
	import * as Table from '$lib/components/ui/table';
	import { _ } from 'svelte-i18n';

	export let userID: string;

	interface ConvictionData {
		id: number;
		content: string;
		creditReduce: number;
		created_at: string;
	}

	let convictions: ConvictionData[] = [];
	let loading = true;

	onMount(async () => {
		try {
			const response = await fetch(`${import.meta.env.VITE_API_URL}/players/${userID}/convictions`);
			if (response.ok) {
				convictions = await response.json();
			}
		} catch (error) {
			console.error('Failed to fetch convictions:', error);
		} finally {
			loading = false;
		}
	});
</script>

{#if loading}
	<div class="flex justify-center py-10">
		<p>{$_('general.loading')}...</p>
	</div>
{:else if convictions.length === 0}
	<div class="flex flex-col items-center justify-center py-12 text-center">
		<p class="text-muted-foreground">{$_('player.no_convictions')}</p>
	</div>
{:else}
	<Table.Root>
		<Table.Caption>{$_('player.table.total_convictions')}: {convictions.length}</Table.Caption>
		<Table.Header>
			<Table.Row>
				<Table.Head>{$_('player.convictions.content')}</Table.Head>
				<Table.Head class="w-[120px] text-center">{$_('player.convictions.credit_reduce')}</Table.Head>
				<Table.Head class="w-[220px] text-center">{$_('player.convictions.created_at')}</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each convictions as conviction}
				<Table.Row>
					<Table.Cell class="font-medium">{conviction.content}</Table.Cell>
					<Table.Cell class="text-center">{conviction.creditReduce ?? 0}</Table.Cell>
					<Table.Cell class="text-center">
						{new Date(conviction.created_at).toLocaleString('vi-VN')}
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
{/if}
