<script lang="ts">
	import Title from '$lib/components/Title.svelte';
	import { Button } from '$lib/components/ui/button';
	import RecordDetail from '$lib/components/recordDetail.svelte';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';

	let isOpen = false;
	let userID: any, levelID: any;
	let limitLeft: number | null = null;
	let dailyLimit = 3;

	async function fetchLimit() {
		if (!$user.loggedIn) {
			limitLeft = null;
			return;
		}

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/records/retrieve-limit`, {
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				}
			});

			if (!res.ok) {
				return;
			}

			const data = await res.json();
			dailyLimit = Number(data.limit || 3);
			limitLeft = Number(data.limitLeft || 0);
		} catch (error) {
			// Ignore silently
		}
	}

	async function retrieve() {
		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/records/retrieve`, {
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				}
			})
				.then((res) => {
					if (res.status == 429) {
						return res.json().then((data) => {
							throw data;
						});
					}

					return res.json();
				})
				.then((res) => {
					userID = res.userid;
					levelID = res.levelid;
					dailyLimit = Number(res.limit || dailyLimit);
					if (typeof res.limitLeft === 'number') {
						limitLeft = res.limitLeft;
					}
					isOpen = true;
				}),
			{
				loading: 'Retrieving record...',
				success: 'Retrieved record!',
				error: (err) => {
					if (err && typeof err === 'object' && 'limitLeft' in err) {
						limitLeft = Number((err as any).limitLeft || 0);
						dailyLimit = Number((err as any).limit || dailyLimit);
						return 'Daily limit reached. Please try again tomorrow.';
					}

					return 'Failed to retrieve';
				}
			}
		);
	}

	onMount(() => {
		fetchLimit();

		const unsubscribe = user.subscribe((u) => {
			if (u.loggedIn) {
				fetchLimit();
			}
		});

		return () => unsubscribe();
	});
</script>

<svelte:head>
	<title>Overwatch - Geometry Dash Việt Nam</title>
</svelte:head>

<RecordDetail bind:open={isOpen} uid={userID} {levelID} />

{#if $user.loggedIn && ($user.data.isAdmin || $user.data.isTrusted)}
	<Title value="Overwatch" />
	<div class="wrapper">
		<h2>Overview</h2>
		<ul>
			<li>
				Overwatch allows the Geometry Dash Việt Nam and Geometry Dash Việt Nam community to regulate itself by
				providing method for qualified and experienced members of community to review submitted
				records.
			</li>
		</ul>
		<h2>Instruction</h2>
		<ul>
			<li>
				Step 1: Click on the <b>Retrieve Record</b> button. A record detail window will appear.
			</li>
			<li>
				Step 2: After reviewed the record, go to <b>Review</b> tab and provide appropriate verdict for
				the reviewed record.
			</li>
			<li>Step 3: You are done!</li>
		</ul>
		<h2>Note</h2>
		<ul>
			<li>
				You can review up to 3 records per day.
			</li>
			<li>You can only review records which level's rating lower than your rating plus 500.</li>
			<li>After retrieving a record, you must provide a verdict before reviewing other records.</li>
			<li>You cannot review your own record.</li>
			<li>
				A blatant error of judgment will result in a temporary or permanent ban from accessing
				Overwatch.
			</li>
		</ul>
		{#if limitLeft !== null}
			<p class="limitText">Daily limit left: {limitLeft}/{dailyLimit}</p>
		{/if}
		<br />
		<Button on:click={retrieve} disabled={limitLeft !== null && limitLeft <= 0}>Retrieve record</Button>
	</div>
{/if}

<style lang="scss">
	.wrapper {
		padding-inline: 100px;

		h2 {
			display: block;
			font-size: 1.5em;
			margin-top: 0.83em;
			margin-bottom: 0.83em;
			margin-left: 0;
			margin-right: 0;
			font-weight: bold;
		}

		ul {
			list-style: initial;
			margin: initial;
			padding: 0 0 0 40px;
		}

		li {
			display: list-item;
		}

		.limitText {
			margin-top: 12px;
			font-weight: 600;
		}
	}

	@media screen and (max-width: 900px) {
		.wrapper {
			padding-inline: 15px;
		}
	}
</style>
