<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
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
	import { EllipsisIcon, SkipForward } from 'lucide-svelte';

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
					loading: $_('toast.boost.loading'),
					success: $_('toast.boost.success'),
					error: (err) => $_('toast.boost.error')
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
	<title>Bản nộp của tôi - Geometry Dash Việt Nam</title>
</svelte:head>

<Ads />
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
		<Tabs.Root value="records">
			<Tabs.List>
				<Tabs.Trigger value="records">
					Bản ghi ({data.records.length})
				</Tabs.Trigger>
				{#if data.levelSubmissions && data.levelSubmissions.length > 0}
					<Tabs.Trigger value="levels">
						Level ({data.levelSubmissions.length})
					</Tabs.Trigger>
				{/if}
			</Tabs.List>

			<!-- Records Tab -->
			<Tabs.Content value="records">
				<Table.Root>
					<Table.Caption>{$_('submissions.total_record')}: {data.records.length}</Table.Caption>
					<Table.Header>
						<Table.Row>
							<Table.Head>{$_('submissions.level')}</Table.Head>
							<Table.Head class="w-[120px] text-center">{$_('submissions.submitted_on')}</Table.Head>
							<Table.Head class="w-[100px] text-center">{$_('submissions.device')}</Table.Head>
							<Table.Head class="w-[90px] text-center">{$_('submissions.progress')}</Table.Head>
							<Table.Head class="w-[100px] text-center">{$_('submissions.queue_no')}</Table.Head>
							<Table.Head class="w-[150px] text-center">{$_('submissions.boost')}</Table.Head>
							<Table.Head class="w-[100px] text-center">Thao tác</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.records as record, index}
							{#if index !== 0 && index % 50 === 0}
								<Table.Row class="hover:bg-transparent">
									<Table.Cell colspan={7} class="p-0">
										<Ads />
									</Table.Cell>
								</Table.Row>
							{/if}
							<Table.Row
								on:click={(e) => {
									// @ts-expect-error
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
								<Table.Cell class="text-center">
									{new Date(record.timestamp).toLocaleString('vi-VN')}
								</Table.Cell>
								<Table.Cell class="text-center">
									<Badge variant="secondary">{record.mobile ? 'Mobile' : 'PC'}</Badge>
									{#if record.refreshRate}
										<span class="fps-text">{record.refreshRate}fps</span>
									{/if}
								</Table.Cell>
								<Table.Cell class="text-center">
									{record.levels.isPlatformer
										? getTimeString(record.progress)
										: `${record.progress}%`}
								</Table.Cell>
								<Table.Cell class="text-center">
									{#if record.needMod}
										<Badge variant="outline">{$_('submissions.forwarded')}</Badge>
									{:else if record.queueNo}
										<Badge>{record.queueNo}</Badge>
									{:else}
										<span class="muted">-</span>
									{/if}
								</Table.Cell>
								<Table.Cell class="text-center">
									<Button
										size="sm"
										variant="default"
										class="boost-btn"
										disabled={isBoosting(record.levelid)}
										on:click={(e) => {
											e.stopPropagation();
											userID = record.userid;
											levelID = record.levels.id;
											recordDetailTab = 'skipAhead';
											recordDetailOpened = true;
										}}
									>
										<SkipForward size={14} />
									</Button>
								</Table.Cell>
								<Table.Cell>
									<div class="actions">
										<Button
											size="icon"
											variant="ghost"
											title="Chi tiết"
											on:click={(e) => {
												e.stopPropagation();
												userID = record.userid;
												levelID = record.levels.id;
												recordDetailOpened = true;
											}}
										>
											<EllipsisIcon size={16} />
										</Button>
										<Button
											size="icon"
											variant="ghost"
											title="Video"
											href={record.videoLink}
											target="_blank"
										>
											<ExternalLink size={16} />
										</Button>
										<Button
											size="icon"
											variant="destructive"
											title="Huỷ nộp"
											on:click={(e) => {
												e.stopPropagation();
												lvID = record.levelid;
												alertOpened = true;
											}}
										>
											<CrossCircled size={16} />
										</Button>
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
				<Ads />
			</Tabs.Content>

			<!-- Level Submissions Tab -->
			{#if data.levelSubmissions && data.levelSubmissions.length > 0}
				<Tabs.Content value="levels">
					<div class="level-grid">
						{#each data.levelSubmissions as submission}
							<Card.Root>
								<Card.Header>
									<Card.Title>
										<a href={`/level/${submission.levels.id}`} data-sveltekit-preload-data="tap">
											{submission.levels.name}
										</a>
									</Card.Title>
									<Card.Description>
										{new Date(submission.created_at).toLocaleString('vi-VN')}
									</Card.Description>
								</Card.Header>
								<Card.Footer class="flex justify-between items-center">
									<Badge variant="outline">Chờ duyệt</Badge>
									<Button
										variant="ghost"
										size="icon"
										href={`https://www.youtube.com/watch?v=${submission.levels.videoID}`}
										target="_blank"
									>
										<ExternalLink size={16} />
									</Button>
								</Card.Footer>
							</Card.Root>
						{/each}
					</div>
				</Tabs.Content>
			{/if}
		</Tabs.Root>
	</div>
{/if}

<style lang="scss">
	.wrapper {
		padding-inline: 50px;
		max-width: 1200px;
		margin-inline: auto;
		padding-block: 16px;
	}

	.level-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 12px;
		padding-block: 16px;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 2px;
	}

	:global(.boost-btn) {
		gap: 4px;
		font-weight: 600;
		background: linear-gradient(135deg, hsl(38 92% 50%), hsl(25 95% 53%));
		border: none;
		color: #fff;
		box-shadow: 0 0 8px hsla(38, 92%, 50%, 0.4);
		transition: box-shadow 0.2s ease, transform 0.15s ease;

		&:hover:not(:disabled) {
			box-shadow: 0 0 16px hsla(38, 92%, 50%, 0.7);
			transform: translateY(-1px);
		}

		&:disabled {
			opacity: 0.5;
		}
	}

	.fps-text {
		font-size: 0.7rem;
		color: hsl(var(--muted-foreground));
		display: block;
	}

	.muted {
		color: hsl(var(--muted-foreground));
	}

	@media screen and (max-width: 900px) {
		.wrapper {
			padding-inline: 10px;
		}
	}
</style>
