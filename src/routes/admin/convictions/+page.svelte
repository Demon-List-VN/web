<script lang="ts">
	import Title from '$lib/components/Title.svelte';
	import PlayerSelector from '$lib/components/playerSelector.svelte';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';
	import { _ } from 'svelte-i18n';

	let selectedPlayer: any = null;
	let isLoading = false;
	let loadingList = false;
	let convictions: any[] = [];

	let form = {
		content: '',
		creditReduce: 0
	};

	$: if (selectedPlayer?.uid) {
		fetchConvictions(selectedPlayer.uid);
	} else {
		convictions = [];
	}

	async function fetchConvictions(uid: string) {
		loadingList = true;
		try {
			const response = await fetch(`${import.meta.env.VITE_API_URL}/players/${uid}/convictions`);
			if (!response.ok) {
				throw new Error($_('admin_convictions.toast.fetch_error'));
			}

			convictions = await response.json();
		} catch (error: any) {
			toast.error(error?.message || $_('admin_convictions.toast.fetch_error'));
		} finally {
			loadingList = false;
		}
	}

	async function addConviction() {
		if (!selectedPlayer?.uid) {
			toast.error($_('admin_convictions.toast.select_player'));
			return;
		}

		if (!form.content.trim()) {
			toast.error($_('admin_convictions.toast.content_required'));
			return;
		}

		isLoading = true;
		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/players/${selectedPlayer.uid}/convictions`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${await $user.token()}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						content: form.content.trim(),
						creditReduce: Number(form.creditReduce) || 0
					})
				}
			);

			if (!response.ok) {
				throw new Error($_('admin_convictions.toast.add_error'));
			}

			toast.success($_('admin_convictions.toast.add_success'));
			form.content = '';
			form.creditReduce = 0;
			await fetchConvictions(selectedPlayer.uid);
		} catch (error: any) {
			toast.error(error?.message || $_('admin_convictions.toast.add_error'));
		} finally {
			isLoading = false;
		}
	}
</script>

<Title value={$_('admin_convictions.title')} />

<div class="wrapper">
	<div class="form-container">
		<div class="form-group">
			<Label>{$_('admin_convictions.player')}</Label>
			<PlayerSelector bind:value={selectedPlayer} bind:disabled={isLoading} />
		</div>

		<div class="form-group">
			<Label for="content">{$_('admin_convictions.content')}</Label>
			<Textarea
				id="content"
				rows="4"
				bind:value={form.content}
				placeholder={$_('admin_convictions.content_placeholder')}
				disabled={isLoading}
			/>
		</div>

		<div class="form-group">
			<Label for="creditReduce">{$_('admin_convictions.credit_reduce')}</Label>
			<Input
				id="creditReduce"
				type="number"
				inputmode="numeric"
				bind:value={form.creditReduce}
				disabled={isLoading}
			/>
		</div>

		<Button on:click={addConviction} disabled={isLoading}>
			{isLoading ? $_('admin_convictions.submitting') : $_('admin_convictions.submit')}
		</Button>
	</div>

	{#if selectedPlayer?.uid}
		<div class="mt-8">
			{#if loadingList}
				<p>{$_('general.loading')}...</p>
			{:else if convictions.length === 0}
				<p class="text-muted-foreground">{$_('admin_convictions.empty')}</p>
			{:else}
				<Table.Root>
					<Table.Caption>{$_('admin_convictions.total')}: {convictions.length}</Table.Caption>
					<Table.Header>
						<Table.Row>
							<Table.Head>{$_('admin_convictions.content')}</Table.Head>
							<Table.Head class="w-[120px] text-center"
								>{$_('admin_convictions.credit_reduce')}</Table.Head
							>
							<Table.Head class="w-[220px] text-center"
								>{$_('admin_convictions.created_at')}</Table.Head
							>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each convictions as conviction}
							<Table.Row>
								<Table.Cell>{conviction.content}</Table.Cell>
								<Table.Cell class="text-center">{conviction.creditReduce ?? 0}</Table.Cell>
								<Table.Cell class="text-center"
									>{new Date(conviction.created_at).toLocaleString('vi-VN')}</Table.Cell
								>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</div>
	{/if}
</div>

<style lang="scss">
	.wrapper {
		padding-inline: 75px;
		padding-block: 20px;
		max-width: 900px;
	}

	.form-container {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
</style>
