<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { toast } from 'svelte-sonner';
	import Title from '$lib/components/Title.svelte';
	import { user } from '$lib/client';
	import ExternalLink from 'svelte-radix/ExternalLink.svelte';
	import CrossCircled from 'svelte-radix/CrossCircled.svelte';
	import { page } from '$app/stores';
	import type { PageData } from './$types';
	import RecordDetail from '$lib/components/recordDetail.svelte';
	import Ads from '$lib/components/ads.svelte';
	import { _ } from 'svelte-i18n';
	import {
		EllipsisIcon,
		Hamburger,
		SkipForward,
		SkipForwardIcon,
		CheckCircle2,
		XCircle
	} from 'lucide-svelte';
	import { HamburgerMenu } from 'svelte-radix';
	import { Ellipsis } from '$lib/components/ui/pagination';

	export let data: PageData;
	let alertOpened = false;
	let lvID: number;
	let userID: string, levelID: number;
	let recordDetailOpened = false;
	let recordDetailTab: string = 'detail';

	function getTimeString(ms: number) {
		const minutes = Math.floor(ms / 60000);
		const seconds = Math.floor((ms % 60000) / 1000);
		const milliseconds = ms % 1000;

		return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds}`;
	}

	async function deleteRecord() {
		const { uid } = $user.data;
		const token = await $user.token();

		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/records/${uid}/${lvID}`, {
				method: 'DELETE',
				headers: {
					Authorization: 'Bearer ' + token
				}
			}),
			{
				loading: $_('toast.submission_cancel.loading'),
				success: () => {
					data.records = data.records.filter((x) => {
						return x.levelid != lvID;
					});

					return $_('toast.submission_cancel.success');
				},
				error: (err) => {
					return $_('toast.submission_cancel.error');
				}
			}
		);
	}

	let boosting: number[] = [];

	function isBoosting(id: number) {
		return boosting.includes(id);
	}

	async function boostSubmission(levelid: number) {
		const { uid } = $user.data;
		const token = await $user.token();

		boosting = [...boosting, levelid];

		try {
			await toast.promise(
				fetch(`${import.meta.env.VITE_API_URL}/records/${uid}/${levelid}/boost`, {
					method: 'POST',
					headers: {
						Authorization: 'Bearer ' + token
					}
				}),
				{
					loading: 'Boosting...',
					success: 'Boost successful',
					error: (err) => 'Boost failed'
				}
			);
		} catch (e) {
			// error handled by toast
		} finally {
			boosting = boosting.filter((x) => x !== levelid);
		}
	}
</script>

<svelte:head>
	<title>Bản nộp của tôi - Geometry Dash VN</title>
</svelte:head>

<Ads unit="leaderboard" />
<RecordDetail bind:open={recordDetailOpened} uid={userID} {levelID} selectedTab={recordDetailTab} />

<AlertDialog.Root bind:open={alertOpened}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{$_('submissions.cancel.title')}</AlertDialog.Title>
			<AlertDialog.Description>{$_('submissions.cancel.description')}</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{$_('general.cancel')}</AlertDialog.Cancel>
			<AlertDialog.Action on:click={deleteRecord}>{$_('general.continue')}</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

{#if $user.loggedIn && $user.data.uid == $page.params.uid}
	<Title value={$_('submissions.title')} />
	<div class="wrapper">
		<!-- Level Submissions Table -->
		{#if data.levelSubmissions && data.levelSubmissions.length > 0}
			<div class="section-title">Nộp Level</div>
			<Table.Root>
				<Table.Caption>Tổng số level nộp: {data.levelSubmissions.length}</Table.Caption>
				<Table.Header>
					<Table.Row>
						<Table.Head>{$_('submissions.level')}</Table.Head>
						<Table.Head class="w-[120px] text-center">Ngày nộp</Table.Head>
						<Table.Head class="w-[100px] text-center">Trạng thái</Table.Head>
						<Table.Head class="w-[50px] text-center">Video</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.levelSubmissions as submission}
						<Table.Row>
							<Table.Cell class="font-medium">
								<a href={`/level/${submission.levels.id}`} data-sveltekit-preload-data="tap">
									{submission.levels.name}
								</a>
							</Table.Cell>
							<Table.Cell class="text-center">
								{new Date(submission.created_at).toLocaleString('vi-VN')}
							</Table.Cell>
							<Table.Cell class="text-center">
								<span class="flex items-center justify-center gap-1"> Chờ duyệt </span>
							</Table.Cell>
							<Table.Cell class="text-center">
								<button>
									<a
										href={`https://www.youtube.com/watch?v=${submission.levels.videoID}`}
										target="_blank"
									>
										<ExternalLink size={20} />
									</a>
								</button>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		{/if}

		<!-- Record Submissions Table -->
		<div
			class="section-title"
			style="margin-top: {data.levelSubmissions && data.levelSubmissions.length > 0 ? '40px' : '0'}"
		>
			Bản ghi nộp
		</div>
		<Table.Root>
			<Table.Caption>{$_('submissions.total_record')}: {data.records.length}</Table.Caption>
			<Table.Header>
				<Table.Row>
					<Table.Head>{$_('submissions.level')}</Table.Head>
					<Table.Head class="w-[100px] text-center">{$_('submissions.submitted_on')}</Table.Head>
					<Table.Head class="w-[100px] text-center">{$_('submissions.device')}</Table.Head>
					<Table.Head class="w-[80px] text-center">{$_('submissions.progress')}</Table.Head>
					<Table.Head class="w-[80px] text-center">{$_('submissions.time')}</Table.Head>
					<Table.Head class="w-[80px] text-center">{$_('submissions.queue_no')}</Table.Head>
					<Table.Head class="w-[80px] text-center"
						>{$_('submissions.detail') || 'Detail'}</Table.Head
					>
					<Table.Head class="w-[80px] text-center">{$_('submissions.boost') || 'Boost'}</Table.Head>
					<Table.Head class="w-[0px] text-center"></Table.Head>
					<Table.Head class="w-[0px] text-center"></Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.records as record}
					<Table.Row
						on:click={(e) => {
							// @ts-ignore
							if (e.target.nodeName != 'TD') {
								return;
							}

							userID = record.userid;
							levelID = record.levels.id;
							recordDetailOpened = true;
						}}
					>
						<Table.Cell class="font-medium">
							<a href={`/level/${record.levels.id}`} data-sveltekit-preload-data="tap">
								{record.levels.name}
							</a>
						</Table.Cell>
						<Table.Cell class="text-center"
							>{new Date(record.timestamp).toLocaleString('vi-VN')}</Table.Cell
						>
						<Table.Cell class="text-center">
							{record.mobile ? 'Mobile' : 'PC'}
							{#if record.refreshRate}
								<br />({record.refreshRate}fps)
							{/if}
						</Table.Cell>
						<Table.Cell class="text-center"
							>{!record.levels.isPlatformer ? `${record.progress}%` : '-'}</Table.Cell
						>
						<Table.Cell class="text-center"
							>{record.levels.isPlatformer ? getTimeString(record.progress) : '-'}</Table.Cell
						>
						<Table.Cell class="text-center">
							{#if record.needMod}
								{$_('submissions.forwarded')}
							{:else if !record.queueNo}
								-
							{:else}
								{record.queueNo}
							{/if}
						</Table.Cell>
						<Table.Cell class="text-center">
							<button
								on:click|stopPropagation={() => {
									userID = record.userid;
									levelID = record.levels.id;
									recordDetailOpened = true;
								}}
							>
								<EllipsisIcon size={16} />
							</button>
						</Table.Cell>
						<Table.Cell class="text-center">
							<button
								disabled={isBoosting(record.levelid)}
								on:click|stopPropagation={() => {
									userID = record.userid;
									levelID = record.levels.id;
									recordDetailTab = 'skipAhead';
									recordDetailOpened = true;
								}}
							>
								<SkipForward size={16} />
							</button>
						</Table.Cell>
						<Table.Cell class="text-center">
							<button>
								<a href={record.videoLink} target="_blank">
									<ExternalLink size={20} />
								</a>
							</button>
						</Table.Cell>
						<Table.Cell class="text-center">
							<button
								on:click={() => {
									lvID = record.levelid;
									alertOpened = true;
								}}
							>
								<CrossCircled size={20} />
							</button>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
{/if}

<style lang="scss">
	.wrapper {
		padding-inline: 50px;
	}

	.section-title {
		font-size: 1.25rem;
		font-weight: 600;
		margin-bottom: 20px;
		margin-top: 30px;
	}

	@media screen and (max-width: 900px) {
		.wrapper {
			padding-inline: 10px;
		}
	}
</style>
