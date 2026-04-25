<script lang="ts">
	import Title from '$lib/components/Title.svelte';
	import { Button } from '$lib/components/ui/button';
	import RecordDetail from '$lib/components/recordDetail.svelte';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';

	type RetrieveType = 'official' | 'nonOfficial';

	let isOpen = false;
	let userID: any, levelID: any;
	let recordID: number | null = null;
	let officialLimitLeft: number | null = null;
	let officialDailyLimit = 3;
	let nonOfficialLimitLeft: number | null = null;
	let nonOfficialDailyLimit = 5;

	function applyLimitData(data: any) {
		if (data?.limits?.official) {
			officialDailyLimit = Number(data.limits.official.limit || officialDailyLimit);
			officialLimitLeft = Number(data.limits.official.limitLeft || 0);
		}

		if (data?.limits?.nonOfficial) {
			nonOfficialDailyLimit = Number(data.limits.nonOfficial.limit || nonOfficialDailyLimit);
			nonOfficialLimitLeft = Number(data.limits.nonOfficial.limitLeft || 0);
		}

		if (!data?.limits && typeof data?.limitLeft === 'number') {
			officialDailyLimit = Number(data.limit || officialDailyLimit);
			officialLimitLeft = Number(data.limitLeft || 0);
		}
	}

	function isLimitReached(type: RetrieveType) {
		const limitLeft = type === 'official' ? officialLimitLeft : nonOfficialLimitLeft;

		return limitLeft !== null && limitLeft <= 0;
	}

	async function fetchLimit() {
		if (!$user.loggedIn) {
			officialLimitLeft = null;
			nonOfficialLimitLeft = null;
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
			applyLimitData(data);
		} catch {
			// Ignore silently
		}
	}

	async function retrieve(type: RetrieveType) {
		const label = type === 'official' ? 'official list' : 'non official list';

		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/records/retrieve?type=${type}`, {
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				}
			})
				.then(async (res) => {
					const data = await res.json().catch(() => ({}));

					if (!res.ok) {
						throw data;
					}

					return data;
				})
				.then((res) => {
					userID = res.userid;
					levelID = res.levelid;
					recordID = typeof res.id === 'number' ? res.id : null;
					applyLimitData(res);
					isOpen = true;
				}),
			{
				loading: `Retrieving ${label} record...`,
				success: `Retrieved ${label} record!`,
				error: (err) => {
					applyLimitData(err);

					if (err && typeof err === 'object' && 'limitLeft' in err) {
						if (type === 'official') {
							officialLimitLeft = Number((err as any).limitLeft || 0);
							officialDailyLimit = Number((err as any).limit || officialDailyLimit);
						} else {
							nonOfficialLimitLeft = Number((err as any).limitLeft || 0);
							nonOfficialDailyLimit = Number((err as any).limit || nonOfficialDailyLimit);
						}

						return 'Daily limit reached. Please try again tomorrow.';
					}

					return `Failed to retrieve ${label} record`;
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
	<title>{$_('head.titles.overwatch')} - {$_('head.site_name')}</title>
</svelte:head>

<RecordDetail bind:open={isOpen} uid={userID} {levelID} recordId={recordID} />

{#if $user.loggedIn && ($user.data.isAdmin || $user.data.isTrusted)}
	<Title value="Overwatch" />
	<div class="wrapper">
		<h2>Overview</h2>
		<ul>
			<li>
				Overwatch allows the Geometry Dash Việt Nam and Geometry Dash Việt Nam community to regulate
				itself by providing method for qualified and experienced members of community to review
				submitted records.
			</li>
		</ul>
		<h2>Instruction</h2>
		<ul>
			<li>
				Step 1: Click on the <b>Retrieve from official list</b> or
				<b>Retrieve from non official list</b> button. A record detail window will appear.
			</li>
			<li>
				Step 2: After reviewed the record, go to <b>Review</b> tab and provide appropriate verdict for
				the reviewed record.
			</li>
			<li>Step 3: You are done!</li>
		</ul>
		<h2>Note</h2>
		<ul>
			<li>You can review up to 3 official list records and 5 non official list records per day.</li>
			<li>After retrieving a record, you must provide a verdict before reviewing other records.</li>
			<li>You cannot review your own record.</li>
			<li>
				A blatant error of judgment will result in a temporary or permanent ban from accessing
				Overwatch.
			</li>
		</ul>
		{#if officialLimitLeft !== null || nonOfficialLimitLeft !== null}
			<div class="limitGrid">
				<p class="limitText">
					Official list daily limit left: {officialLimitLeft ?? '-'}/{officialDailyLimit}
				</p>
				<p class="limitText">
					Non official list daily limit left: {nonOfficialLimitLeft ?? '-'}/{nonOfficialDailyLimit}
				</p>
			</div>
		{/if}
		<br />
		<div class="buttonRow">
			<Button on:click={() => retrieve('official')} disabled={isLimitReached('official')}
				>Retrieve from official list</Button
			>
			<Button on:click={() => retrieve('nonOfficial')} disabled={isLimitReached('nonOfficial')}
				>Retrieve from non official list</Button
			>
		</div>
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

		.limitGrid {
			display: grid;
			gap: 4px;
			margin-top: 12px;
		}

		.limitText {
			margin: 0;
			font-weight: 600;
		}

		.buttonRow {
			display: flex;
			flex-wrap: wrap;
			gap: 12px;
		}
	}

	@media screen and (max-width: 900px) {
		.wrapper {
			padding-inline: 15px;
		}
	}
</style>
