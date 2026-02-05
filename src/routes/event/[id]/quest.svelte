<script lang="ts">
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import RewardItemDetails from '$lib/components/RewardItemDetails.svelte';
	import { get } from 'svelte/store';
	import { _ } from 'svelte-i18n';
	import { user } from '$lib/client';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { toast } from 'svelte-sonner';

	export let quest: any;
	let claimBtnDisabled = true;
	let loading = true;
	let status = '';

	function rarityColor(r: number) {
		switch (r) {
			case 1:
				return '#3b82f6';
			case 2:
				return '#a855f7';
			case 3:
				return '#ec4899';
			case 4:
				return '#dc2626';
			default:
				return '#9ca3af';
		}
	}

	async function checkQuest() {
		const res = await (
			await fetch(`${import.meta.env.VITE_API_URL}/events/quest/${quest.id}/check`, {
				method: 'GET',
				headers: {
					Authorization: 'Bearer ' + (await $user.token())
				}
			})
		).json();

		return res;
	}

	async function claim() {
		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/events/quest/${quest.id}/claim`, {
				method: 'POST',
				headers: {
					Authorization: 'Bearer ' + (await $user.token())
				}
			}),
			{
				success: () => {
					status = 'claimed';
					claimBtnDisabled = true;

					return get(_)('events.quest.claimed_success');
				},
				loading: get(_)('events.quest.claiming'),
				error: get(_)('events.quest.claim_error')
			}
		);
	}

	onMount(async () => {
		const res = await checkQuest();

		loading = false;
		status = res.status;

		if (res.status == 'claimable') {
			claimBtnDisabled = false;
		}
	});
</script>

<Card.Root>
	<Card.Header>
		<div class="flex w-full items-center">
			<div class="flex flex-col gap-[10px]">
				<Card.Title>{quest.title}</Card.Title>
				<div class="flex gap-[10px]">
					{#each quest.rewards as reward}
						<Popover.Root>
							<Popover.Trigger>
								<button class="clickable">
									<div
										class="flex h-[75px] w-[75px] items-center justify-center overflow-hidden rounded-md bg-neutral-800"
										style="border-bottom: 4px solid {rarityColor(reward.rarity)};"
									>
										<img
											class="max-h-full max-w-full object-contain p-2"
											src={`https://cdn.demonlistvn.com/items/${reward.id}.webp`}
											alt={reward.name}
										/>
									</div>
								</button>
							</Popover.Trigger>
							<Popover.Content>
								<RewardItemDetails itemData={reward} quantity={1} />
							</Popover.Content>
						</Popover.Root>
					{/each}
				</div>
			</div>
			{#if loading}
				<Skeleton class="ml-auto h-[35px] w-[70px]" />
			{:else}
				<Button class="ml-auto" disabled={claimBtnDisabled} on:click={claim}>
					{#if status == 'claimable' || status == 'unclaimable'}
							{get(_)('events.quest.claim_button')}
						{:else if status == 'claimed'}
							{get(_)('events.quest.claimed')}
					{/if}
				</Button>
			{/if}
		</div>
	</Card.Header>
</Card.Root>
