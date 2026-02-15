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

	interface ConvictionData {
		id: number;
		content: string;
		creditReduce: number;
		created_at: string;
		isHidden?: boolean;
		createdAtInput?: string;
		saving?: boolean;
	}

	let selectedPlayer: any = null;
	let isLoading = false;
	let loadingList = false;
	let convictions: ConvictionData[] = [];

	let form = {
		content: '',
		creditReduce: 0
	};

	function toDateTimeLocal(isoDate: string) {
		const date = new Date(isoDate);
		return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
			.toISOString()
			.slice(0, 16);
	}

	async function getAuthHeaders(contentType = false) {
		const token = $user ? await $user.token() : null;
		return {
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...(contentType ? { 'Content-Type': 'application/json' } : {})
		};
	}

	$: if (selectedPlayer?.uid) {
		fetchConvictions(selectedPlayer.uid);
	} else {
		convictions = [];
	}

	async function fetchConvictions(uid: string) {
		loadingList = true;
		try {
			const response = await fetch(`${import.meta.env.VITE_API_URL}/players/${uid}/convictions`, {
				headers: await getAuthHeaders()
			});
			if (!response.ok) {
				throw new Error($_('admin_convictions.toast.fetch_error'));
			}

			const data = await response.json();
			convictions = (data ?? []).map((item: ConvictionData) => ({
				...item,
				isHidden: !!item.isHidden,
				createdAtInput: toDateTimeLocal(item.created_at),
				saving: false
			}));
		} catch (error: any) {
			toast.error(error?.message || $_('admin_convictions.toast.fetch_error'));
		} finally {
			loadingList = false;
		}
	}

	async function saveConviction(conviction: ConvictionData) {
		if (!selectedPlayer?.uid || !conviction.id) {
			return;
		}

		conviction.saving = true;
		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/players/${selectedPlayer.uid}/convictions/${conviction.id}`,
				{
					method: 'PATCH',
					headers: await getAuthHeaders(true),
					body: JSON.stringify({
						createdAt: conviction.createdAtInput,
						isHidden: !!conviction.isHidden
					})
				}
			);

			if (!response.ok) {
				throw new Error('Failed to update conviction');
			}

			const updated = await response.json();
			conviction.created_at = updated.created_at;
			conviction.createdAtInput = toDateTimeLocal(updated.created_at);
			conviction.isHidden = !!updated.isHidden;
			toast.success('Conviction updated');
		} catch (error: any) {
			toast.error(error?.message || 'Failed to update conviction');
		} finally {
			conviction.saving = false;
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
					headers: await getAuthHeaders(true),
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
							<Table.Head class="w-[100px] text-center">Hidden</Table.Head>
							<Table.Head class="w-[120px] text-center">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each convictions as conviction}
							<Table.Row>
								<Table.Cell>{conviction.content}</Table.Cell>
								<Table.Cell class="text-center">{conviction.creditReduce ?? 0}</Table.Cell>
								<Table.Cell class="text-center">
									<Input
										type="datetime-local"
										bind:value={conviction.createdAtInput}
										disabled={!!conviction.saving}
									/>
								</Table.Cell>
								<Table.Cell class="text-center">
									<input
										type="checkbox"
										bind:checked={conviction.isHidden}
										disabled={!!conviction.saving}
									/>
								</Table.Cell>
								<Table.Cell class="text-center">
									<Button
										variant="outline"
										size="sm"
										on:click={() => saveConviction(conviction)}
										disabled={!!conviction.saving}
									>
										{conviction.saving ? 'Saving...' : 'Save'}
									</Button>
								</Table.Cell>
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
