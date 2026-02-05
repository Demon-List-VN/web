<script lang="ts">
	import Title from '$lib/components/Title.svelte';
	import { Button } from '$lib/components/ui/button';
	import RecordDetail from '$lib/components/recordDetail.svelte';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';

	let isOpen = false;
	let userID: any, levelID: any;

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
						throw 429;
					}

					return res.json();
				})
				.then((res) => {
					userID = res.userid;
					levelID = res.levelid;
					isOpen = true;
				}),
			{
				loading: 'Retrieving record...',
				success: 'Retrieved record!',
				error: (err) => {
					if (err == 429) {
						return 'On cooldown. Please try again later.';
					}

					return 'Failed to retrieve';
				}
			}
		);
	}
</script>

<svelte:head>
	<title>Overwatch - Geometry Dash VN</title>
</svelte:head>

<RecordDetail bind:open={isOpen} uid={userID} {levelID} />

{#if $user.loggedIn && ($user.data.isAdmin || $user.data.isTrusted)}
	<Title value="Overwatch" />
	<div class="wrapper">
		<h2>Overview</h2>
		<ul>
			<li>
				Overwatch allows the Geometry Dash VN and Geometry Dash VN community to regulate itself by
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
				After reviewing a record, you have to wait for a cooldown period before reviewing another
				record.
			</li>
			<li>You can only review records which level's rating lower than your rating plus 500.</li>
			<li>After retrieving a record, you must provide a verdict before reviewing other records.</li>
			<li>You cannot review your own record.</li>
			<li>
				A blatant error of judgment will result in a temporary or permanent ban from accessing
				Overwatch.
			</li>
		</ul>
		<br />
		<Button on:click={retrieve}>Retrieve record</Button>
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
	}

	@media screen and (max-width: 900px) {
		.wrapper {
			padding-inline: 15px;
		}
	}
</style>
