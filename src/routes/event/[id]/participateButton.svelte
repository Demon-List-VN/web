<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { onMount } from 'svelte';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';
	import { isActive } from '$lib/client/isSupporterActive';
	import { Textarea } from '$lib/components/ui/textarea';
	import { _ } from 'svelte-i18n';

	export let data: any;

	let rewardState = 0;
	let proof = '';
	let claimOpened = false;
	let cancelOpened = false;

	function isEventEnded() {
		return new Date(data.end) < new Date();
	}

	function canCancelParticipation() {
		if (data.type === 'basic') {
			return true;
		}

		if (data.type === 'contest' || data.type === 'raid') {
			return new Date(data.start) > new Date();
		}

		return false;
	}

	function getRewardState() {
		if (data.end && new Date().getTime() > new Date(data.end).getTime()) {
			rewardState = 4;
			return;
		}

		if (!$user.loggedIn) {
			return;
		}

		fetch(`${import.meta.env.VITE_API_URL}/events/${data.id}/proofs/${$user.data.uid}`)
			.then((res) => {
				if (!res.ok) {
					rewardState = 4;
				}

				return res.json();
			})
			.then((res: any) => {
				if (res.accepted) {
					rewardState = 1;
				} else {
					rewardState = 2;
				}
			});
	}

	async function claimReward() {
		claimOpened = false;

		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/events/proofs`, {
				method: 'POST',
				body: JSON.stringify({
					eventID: data.id,
					content: proof
				}),
				headers: {
					Authorization: 'Bearer ' + (await $user.token())!,
					'Content-Type': 'application/json'
				}
			}),
			{
				success: () => {
					rewardState = 2;
					proof = '';

					return $_('contest.participate.toast.sent');
				},
				loading: $_('contest.participate.toast.sending'),
				error: $_('contest.participate.toast.error')
			}
		);
	}

	async function cancelProof() {
		cancelOpened = false;

		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/events/${data.id}/proofs/${$user.data.uid}`, {
				method: 'DELETE',
				headers: {
					Authorization: 'Bearer ' + (await $user.token())!
				}
			}),
			{
				success: () => {
					rewardState = 4;

					return $_('contest.participate.toast.cancelled');
				},
				loading: $_('contest.participate.toast.cancelling'),
				error: $_('contest.participate.toast.error')
			}
		);
	}

	$: $user.loggedIn && getRewardState();

	onMount(() => {
		getRewardState();
	});
</script>

{#if $user.loggedIn}
	{#if !data.supporterOnly || isActive($user.data.supporterUntil)}
		<div class="md-[15px] mb-[15px] mt-[15px] flex justify-center">
			{#if rewardState == 0}
				<Skeleton class="h-[35px] w-[200px]" />
			{:else if rewardState == 1}
				<Button class="w-[200px]" disabled>{$_('contest.participate.reward_claimed')}</Button>
			{:else if rewardState == 2}
				{#if canCancelParticipation()}
					<Dialog.Root bind:open={cancelOpened}>
						<Dialog.Trigger>
							<Button class="w-[200px]" variant="destructive">{$_('contest.participate.cancel_participation')}</Button>
						</Dialog.Trigger>
						<Dialog.Content>
							<Dialog.Header>
								<Dialog.Title>{$_('contest.participate.cancel_confirm.title')}</Dialog.Title>
								<Dialog.Description>{$_('contest.participate.cancel_confirm.description')}</Dialog.Description>
							</Dialog.Header>
							<Button variant="destructive" on:click={cancelProof}>{$_('contest.participate.cancel_confirm.proceed')}</Button>
						</Dialog.Content>
					</Dialog.Root>
				{:else}
					<Button class="w-[200px]" disabled>{$_('contest.participate.participated')}</Button>
				{/if}
			{:else if rewardState == 3}
				<Button class="w-[200px]" disabled>{$_('contest.participate.event_ended')}</Button>
			{:else if rewardState == 4}
				{#if $user.data.exp < data.minExp}
					<Button class="w-[300px]" disabled>{$_('contest.participate.not_enough_exp', { values: { minExp: data.minExp } })}</Button>
				{:else if !$user.data.discord}
					<Button class="w-[300px]" disabled>{$_('contest.participate.discord_required')}</Button>
				{:else if isEventEnded()}
					<Button class="w-[200px]" disabled>{$_('contest.participate.event_ended')}</Button>
				{:else}
					<Dialog.Root bind:open={claimOpened}>
						<Dialog.Trigger>
							<Button class="w-[200px]">{$_('contest.participate.participate')}</Button>
						</Dialog.Trigger>
						<Dialog.Content>
							<Dialog.Header>
								<Dialog.Title>{$_('contest.participate.participate_dialog.title')}</Dialog.Title>
							</Dialog.Header>
							{#if data.needProof}
								<Textarea class="h-[125px]" placeholder={$_('contest.participate.participate_dialog.proof_placeholder')} bind:value={proof} />
							{:else}
								<Textarea class="h-[125px]" placeholder={$_('contest.participate.participate_dialog.message_placeholder')} bind:value={proof} />
							{/if}
							<Button on:click={claimReward}>{$_('contest.participate.participate_dialog.continue')}</Button>
						</Dialog.Content>
					</Dialog.Root>
				{/if}
			{/if}
		</div>
	{:else}
		<div class="md-[15px] mb-[15px] mt-[15px] flex justify-center">
			<Button class="w-[200px]" disabled>{$_('contest.participate.not_eligible')}</Button>
		</div>
	{/if}
{/if}
