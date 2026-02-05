<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import RecordDetail from '$lib/components/recordDetail.svelte';
	import type { PageData } from './$types';
	import PlayerHoverCard from '$lib/components/playerLink.svelte';
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import Loading from '$lib/components/animation/loading.svelte';
	import Chart from 'chart.js/auto';
	import Ads from '$lib/components/ads.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import { goto } from '$app/navigation';
	import { _ } from 'svelte-i18n';

	export let data: PageData;
	let levelAPI: any = null;
	let records: any[] = [];
	let deathCount: any[] = [];
	let chart: any = null;
	let loaded = false;
	let recordDetailOpened = false;
	let selectedRecord: any = null;

	function getTimeString(ms: number) {
		const minutes = Math.floor(ms / 60000);
		const seconds = Math.floor((ms % 60000) / 1000);
		const milliseconds = ms % 1000;

		return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds}`;
	}

	function genPercent() {
		const res = Array(100);

		for (let i = 0; i < 100; i++) {
			res[i] = `${i}%`;
		}

		return res;
	}

	function createChart(node: any) {
		if (chart != null) {
			chart.destroy();
		}

		chart = new Chart(node, {
			type: 'bar',
			data: {
				labels: genPercent(),
				datasets: [
					{
						label: 'Death count',
						data: deathCount,
						borderWidth: 1
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				scales: {
					y: {
						beginAtZero: true
					}
				},
				plugins: {
					tooltip: {
						callbacks: {
							label: function (context) {
								return String(context.parsed.y);
							}
						}
					}
				}
			}
		});
	}

	async function fetchData() {
		if (!loaded) {
			return;
		}

		levelAPI = null;
		records = [];
		deathCount = [];

		fetch(`${import.meta.env.VITE_API_URL}/levels/${$page.params.id}?fromGD=1`)
			.then((res) => res.json())
			.then((res) => (levelAPI = res));

		fetch(`${import.meta.env.VITE_API_URL}/levels/${$page.params.id}/records?end=500`)
			.then((res) => res.json())
			.then((res: any) => (records = res));

		fetch(`${import.meta.env.VITE_API_URL}/levels/${$page.params.id}/deathCount`)
			.then((res) => res.json())
			.then((res: any) => {
				deathCount = res.count;
			});
	}

	function getList() {
		console.log(data.level)
		if(data.level.isChallenge) {
			return $_('level.challenge_rating')
		}

		return data.level.isPlatformer ? $_('level.platformer_rating') : $_('level.classic_rating')
	}

	$: ($page.params.id, fetchData());

	onMount(() => {
		loaded = true;
		fetchData();

		if ($page.url.searchParams.get('record')) {
			recordDetailOpened = true;
			selectedRecord = {
				userid: $page.url.searchParams.get('record'),
				levelid: $page.params.id
			};
		}
	});
</script>

<svelte:head>
	{#if 'gdbrowser' in data}
		<title>{data.gdbrowser.name} by {data.gdbrowser.author} - Geometry Dash VN</title>
		<meta
			property="og:title"
			content={`${data.gdbrowser.name} by {data.gdbrowser.author} - Geometry Dash VN`}
		/>
		<meta property="og:description" content={data.gdbrowser.description} />
	{:else}
		<title>{data.level.name} by {data.level.creator} - Geometry Dash VN</title>
		<meta
			property="og:title"
			content={`${data.level.name} by ${data.level.creator} - Geometry Dash VN`}
		/>
		<meta
			property="og:description"
			content={`${data.level.isPlatformer ? 'Điểm Platformer' : 'Điểm Classic'}: ${data.level.rating} #${data.level.dlTop}\n Điểm Featured List: ${data.level.flPt} #${data.level.flTop}`}
		/>
	{/if}
	<meta
		property="og:image"
		content={'pointercrate' in data
			? `https://img.youtube.com/vi/${new URL(
					// @ts-ignore
					data.pointercrate.video
				).searchParams.get('v')}/0.jpg`
			: `https://img.youtube.com/vi/${data.level.videoID}/mqdefault.jpg`}
	/>
</svelte:head>

{#if selectedRecord}
	<RecordDetail
		bind:open={recordDetailOpened}
		bind:uid={selectedRecord.userid}
		bind:levelID={selectedRecord.levelid}
	/>
{/if}

<img
	in:fade={{ delay: 500, duration: 300 }}
	class="bg"
	src={'pointercrate' in data
		? `https://img.youtube.com/vi/${new URL(data.pointercrate.video).searchParams.get('v')}/0.jpg`
		: `https://img.youtube.com/vi/${data.level.videoID}/0.jpg`}
	alt="thumbnail"
/>

<div class="head">
	<div class="cardWrapper">
		<Card.Root>
			<Card.Content>
				<div class="content">
					<div class="levelName">
						{#if 'gdbrowser' in data}
							<h2>{data.gdbrowser.name}</h2>
							<span class="creator">by {data.gdbrowser.author}</span>
						{:else}
							<h2>{data.level.name}</h2>
							<span class="creator">by {data.level.creator}</span>
						{/if}
					</div>
				</div>
			</Card.Content>
		</Card.Root>
		<Tabs.Root value={'gdbrowser' in data ? 'other' : 'dlvn'} class="mt-[20px]">
			<Tabs.List class="grid h-[50px] w-full grid-cols-2">
				<Tabs.Trigger
					class="h-[40px]"
					value="dlvn"
					on:click={() => goto(`/level/${$page.params.id}`)}>Geometry Dash VN</Tabs.Trigger
				>
				<Tabs.Trigger
					class="h-[40px]"
					value="other"
					on:click={() => goto(`/level/${$page.params.id}?list=other`)}>Other lists</Tabs.Trigger
				>
			</Tabs.List>
		</Tabs.Root>
	</div>
</div>
<div class="detailWrapper">
	<div class="cardWrapper1 point">
		<Card.Root>
			<Card.Content>
				<div class="content">
					{#if 'level' in data}
						<div class="pointLabel">
							{getList()}: {data.level
								.rating}
							<div class="top">#{data.level.dlTop}</div>
						</div>
						<div class="pointLabel">
							{$_('level.featured_list_point')}: {data.level.flPt}
							<div class="top">#{data.level.flTop}</div>
						</div>
					{:else if 'pointercrate' in data && data.pointercrate.requirement != -1}
						<div class="pointLabel">
							Pointercrate:
							<div class="top">
								#{data.pointercrate.position}
								{#if 150 <= data.pointercrate.position && data.pointercrate.position < 75}
									(Extended)
								{:else if data.pointercrate.position > 150}
									(Legacy)
								{/if}
							</div>
						</div>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>
	</div>
	<div class="cardWrapper1 detail">
		<Card.Root>
			<Card.Content>
				{#if !('pointercrate' in data)}
					<iframe
						src={`https://www.youtube.com/embed/${data.level.videoID}?si=3M9vP_nLFlxX-0hE`}
						title="YouTube video player"
						frameborder="0"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
						referrerpolicy="strict-origin-when-cross-origin"
						allowfullscreen
					></iframe>
				{/if}
				{#if 'pointercrate' in data}
					<iframe
						src={`https://www.youtube.com/embed/${new URL(data.pointercrate.video).searchParams.get('v')}?si=3M9vP_nLFlxX-0hE`}
						title="YouTube video player"
						frameborder="0"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
						referrerpolicy="strict-origin-when-cross-origin"
						allowfullscreen
					></iframe>
				{/if}
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content>
				<div class="content">
					{#if levelAPI}
						<p><b>{$_('level.description')}:</b> <span>{levelAPI.description}</span></p>
						{#if 'pointercrate' in data && data.pointercrate.requirement != -1}
							<p>
								<b>{$_('level.minimum_progress')}:</b>
								<span>{data.pointercrate.requirement}% (Pointercrate)</span>
							</p>
						{:else if 'level' in data && data.level.rating}
							<p>
								<b>{data.level.isPlatformer ? $_('level.base_time') : $_('level.minimum_progress')}:</b>
								<span>
									{data.level.isPlatformer
										? getTimeString(data.level.minProgress)
										: `${data.level.minProgress}%`}
								</span>
							</p>
						{/if}
						<p><b>{$_('level.difficulty')}: </b><span>{levelAPI.difficulty}</span></p>
						<p><b>{$_('level.id')}: </b><span>{levelAPI.id}</span></p>
					{:else}
						<Loading inverted />
					{/if}
				</div>
			</Card.Content>
		</Card.Root>
	</div>
	<Ads />
	{#if 'level' in data && !data.level.isPlatformer}
		<div class="chartWrapper cardWrapper1">
			{#if !deathCount.length}
				<Loading inverted />
			{:else}
				<canvas id="chart" use:createChart />
			{/if}
		</div>
	{/if}
	<div class="cardWrapper1 table">
		<Table.Root>
			{#if records}
				<Table.Caption>{$_('level.total_records')}: {records.length}</Table.Caption>
			{/if}
			<Table.Header>
				<Table.Row>
					<Table.Head class="w-[35px]">{$_('level.no')}</Table.Head>
					<Table.Head>Player</Table.Head>
					<Table.Head class="w-[100px] text-center">{$_('level.submitted_on')}</Table.Head>
					<Table.Head class="w-[100px] text-center">{$_('level.device')}</Table.Head>
					<Table.Head class="w-[80px] text-center"
						>{data.level && data.level.isPlatformer ? $_('level.time') : $_('level.progress')}</Table.Head
					>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#if records}
					{#each records as record, index}
						<Table.Row
							on:click={(e) => {
								// @ts-ignore
								if (e.target.nodeName == 'A') {
									return;
								}

								selectedRecord = record;
								recordDetailOpened = true;
							}}
						>
							<Table.Cell class="font-medium">
								#{index + 1}
							</Table.Cell>
							<Table.Cell>
								<PlayerHoverCard player={record.players} />
							</Table.Cell>
							<Table.Cell class="text-center">
								{new Date(record.timestamp).toLocaleString('vi-VN')}
							</Table.Cell>
							<Table.Cell class="text-center">
								{record.mobile ? $_('level.mobile') : $_('level.pc')}
								{#if record.refreshRate}
									<br />({record.refreshRate}{$_('level.fps')})
								{/if}
							</Table.Cell>
							<Table.Cell class="text-center">
								{data.level && data.level.isPlatformer
									? getTimeString(record.progress)
									: `${record.progress}%`}
							</Table.Cell>
						</Table.Row>
					{/each}
				{/if}
			</Table.Body>
		</Table.Root>
	</div>
</div>

{#if !records}
	<Loading inverted />
{/if}

<style lang="scss">
	.table {
		padding-bottom: 20px;
	}

	.chartWrapper {
		height: 200px;
		display: flex;
		justify-content: center;
		margin-top: 20px;
		width: 100%;
	}

	.detail {
		display: grid;
		grid-template-columns: calc(50% - 10px) calc(50% - 10px);
		gap: 20px;

		iframe {
			width: 100%;
			height: 280px;
			margin-top: 20px;
			border-radius: var(--radius);
		}

		.content {
			p {
				line-height: 20px;
				margin-bottom: 5px;
			}
			span {
				color: var(--textColor2);
			}
		}
	}

	h2 {
		font-weight: bold;
		font-size: 30px;
	}

	.creator {
		color: var(--textColor2);
	}

	.bg {
		width: 100%;
		height: 38vw;
		max-height: 500px;
		min-height: 400px;
		object-fit: cover;
		position: fixed;
		z-index: 0;
		top: 0;
	}

	.detailWrapper {
		background-color: hsl(var(--background));
		position: relative;
		z-index: 1;
	}

	.cardWrapper {
		width: 1200px;
		max-width: 100%;
		margin-inline: auto;
		margin-top: auto;
		padding-inline: 10px;

		.content {
			padding-top: 20px;
		}
	}

	.cardWrapper1 {
		width: 1200px;
		max-width: 100%;
		margin-inline: auto;
		padding-inline: 10px;
		padding-top: 20px;
		position: relative;
		z-index: 2;

		.content {
			padding-top: 20px;
		}
	}

	.point {
		.content {
			display: flex;
			justify-content: space-evenly;

			.pointLabel {
				display: flex;
				gap: 10px;
				font-weight: 600;

				.top {
					background-color: var(--textColor);
					color: var(--textColorInverted);
					padding-inline: 10px;
					border-radius: 4px;
				}
			}
		}
	}

	.head {
		position: relative;
		background: linear-gradient(rgba(0, 0, 0, 0) 10%, hsl(var(--background)) 400px);
		height: 33vw;
		max-height: 500px;
		min-height: 300px;
		z-index: 10;
		display: flex;
		flex-direction: column;
	}

	@media screen and (max-width: 900px) {
		.point {
			.content {
				flex-direction: column;
			}
		}

		.detail {
			grid-template-columns: 100%;
		}
	}
</style>
