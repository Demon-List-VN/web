<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import Chart from 'chart.js/auto';
	import Loading from '$lib/components/animation/loading.svelte';
	import { Label } from '$lib/components/ui/label';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { Input } from '$lib/components/ui/input';
	import { Pencil1 } from 'svelte-radix';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Switch } from '$lib/components/ui/switch';
	import PlayerHoverCard from '$lib/components/playerLink.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { page } from '$app/stores';
	import { _, locale } from 'svelte-i18n';
	import { get } from 'svelte/store';
	import { fade } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	export let data: PageData;

	let chart: any = null;
	let open1 = false;
	let disableBtn = false;
	let verdict = '';
	let cmt = '';
	let skipAheadState = 0;
	let daysToSkip = [1];
	let estimatedQueueNo: number | null = null;
	let estimatedQueueLoading = false;
	let queueBoostInventory: any[] = [];
	let loadingInventory = false;

	$: record = data.record;
	$: deathCount = data.deathCount;

	function extractYouTubeVideoId(url: string): string | null {
		if (!url) return null;
		try {
			const urlObj = new URL(url);
			// Handle youtu.be short URLs
			if (urlObj.hostname === 'youtu.be') {
				return urlObj.pathname.slice(1);
			}
			// Handle youtube.com URLs
			if (urlObj.hostname.includes('youtube.com')) {
				return urlObj.searchParams.get('v');
			}
		} catch {
			// If URL parsing fails, try regex patterns
			const patterns = [
				/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
				/^([a-zA-Z0-9_-]{11})$/
			];
			for (const pattern of patterns) {
				const match = url.match(pattern);
				if (match) return match[1];
			}
		}
		return null;
	}

	$: videoId = extractYouTubeVideoId(record?.videoLink || '');

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

	async function getEstimatedQueueNo(
		userID: string,
		levelID: number,
		prioritizedBy: number
	): Promise<number> {
		const res = await (
			await fetch(
				`${import.meta.env.VITE_API_URL}/records/${userID}/${levelID}/getEstimatedQueue/${prioritizedBy}`,
				{
					method: 'GET',
					headers: {
						'Content-Type': 'application/json'
					}
				}
			)
		).json();

		return res.no;
	}

	async function fetchQueueBoostInventory() {
		loadingInventory = true;
		try {
			const res = await (
				await fetch(`${import.meta.env.VITE_API_URL}/inventory?itemId=15`, {
					method: 'GET',
					headers: {
						Authorization: 'Bearer ' + (await $user.token())
					}
				})
			).json();

			queueBoostInventory = Array.isArray(res) ? res : [];
		} catch (error) {
			console.error('Error fetching inventory:', error);
			queueBoostInventory = [];
		} finally {
			loadingInventory = false;
		}
	}

	async function change() {
		disableBtn = true;
		toast.promise(
			fetch(
				`${import.meta.env.VITE_API_URL}/records/${record.userid}/${record.levelid}/changeSuggestedRating/${record.suggestedRating}`,
				{
					method: 'PUT',
					headers: {
						Authorization: 'Bearer ' + (await $user.token())!
					}
				}
			),
			{
				loading: 'Updating...',
				success: () => {
					open1 = false;
					disableBtn = false;
					return 'Updated!';
				},
				error: 'An error occured'
			}
		);
	}

	async function submitVerdict() {
		if (verdict == '') {
			toast.warning('Please select a verdict.');
			return;
		}

		const data = {
			userid: record.userid,
			levelid: record.levelid,
			needMod: verdict == 'option-two',
			isChecked: verdict == 'option-one',
			reviewerComment: cmt
		};

		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/submitVerdict`, {
				method: 'PUT',
				body: JSON.stringify(data),
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				}
			}),
			{
				success: () => {
					goto(`/level/${record.levelid}`);
					return 'Verdict sent!';
				},
				loading: 'Sending...',
				error: 'An error occured.'
			}
		);
	}

	async function applyEdit() {
		const editData = structuredClone(record);
		delete editData.levels;
		delete editData.players;

		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/records`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Bearer ' + (await $user.token())!
				},
				body: JSON.stringify(editData)
			}),
			{
				success: () => {
					window.location.reload();
					return 'Changed applied. This page will be refreshed';
				},
				loading: 'Applying changes...',
				error: 'An error occured'
			}
		);
	}

	async function deleteRecord() {
		if (!confirm('Delete this record?')) {
			return;
		}

		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/records/${record.userid}/${record.levelid}`, {
				method: 'DELETE',
				headers: {
					Authorization: 'Bearer ' + (await $user.token())!
				}
			}),
			{
				success: () => {
					goto(`/level/${record.levelid}`);
					return 'Deleted.';
				},
				loading: 'Deleting...',
				error: 'An error occured'
			}
		);
	}

	function getShareLink() {
		return `${$page.url.origin}/records/${record.userid}/${record.levelid}`;
	}

	function formatPrice(x: number) {
		return x.toLocaleString('vi-VN');
	}

	function resetSkipAhead() {
		skipAheadState = 0;
		daysToSkip = [1];
		estimatedQueueNo = null;
		estimatedQueueLoading = false;
	}

	async function goToReview() {
		estimatedQueueLoading = true;
		try {
			const prioritizedMs = daysToSkip[0] * 1000 * 60 * 60 * 24;
			estimatedQueueNo = await getEstimatedQueueNo(record.userid, record.levelid, prioritizedMs);
			skipAheadState = 1;
			estimatedQueueLoading = false;
		} catch (error) {
			toast.error('Failed to get estimated queue position');
			estimatedQueueLoading = false;
		}
	}

	async function consumeQueueBoost() {
		toast.promise(
			(async () => {
				const res = await fetch(`${import.meta.env.VITE_API_URL}/inventory/item/15/consume`, {
					method: 'DELETE',
					headers: {
						Authorization: 'Bearer ' + (await $user.token()),
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						levelID: record.levelid,
						quantity: daysToSkip[0]
					})
				});

				if (res.ok) {
					await fetchQueueBoostInventory();
				} else {
					const error = await res.text();
					throw new Error(error);
				}
			})(),
			{
				loading: get(_)('record_detail.skip_ahead.consuming'),
				success: () => {
					goto(`/level/${record.levelid}`);
					return get(_)('record_detail.skip_ahead.queue_boost_used');
				},
				error: get(_)('record_detail.skip_ahead.queue_boost_error')
			}
		);
	}

	async function purchaseQueueBoost() {
		toast.loading(get(_)('toast.payment.redirect'));

		const res: any = await (
			await fetch(`${import.meta.env.VITE_API_URL}/payment/getPaymentLink/5/${daysToSkip[0]}`, {
				method: 'POST',
				headers: {
					Authorization: 'Bearer ' + (await $user.token()),
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					userID: record.userid,
					levelID: record.levelid
				})
			})
		).json();

		window.location.href = res.checkoutUrl;
	}

	$: if ($user.loggedIn) fetchQueueBoostInventory();
</script>

<svelte:head>
	{#if record}
		<title
			>{record.players?.name}'s {record.levels?.name} record - Demon List VN</title
		>
		<meta
			property="og:title"
			content="{record.players?.name}'s {record.levels?.name} record - Demon List VN"
		/>
		<meta
			property="og:description"
			content="Record submission for {record.levels?.name}"
		/>
		{#if videoId}
			<meta property="og:image" content="https://img.youtube.com/vi/{videoId}/mqdefault.jpg" />
		{/if}
	{/if}
</svelte:head>

{#if videoId}
	<img
		in:fade={{ delay: 500, duration: 300 }}
		class="bg"
		src="https://img.youtube.com/vi/{videoId}/0.jpg"
		alt="thumbnail"
	/>
{/if}

<div class="head">
	<div class="cardWrapper">
		<Card.Root>
			<Card.Content>
				<div class="content">
					<div class="levelName">
						{#if record}
							<h2>{record.levels?.name}</h2>
							<span class="creator"
								>{$_('record_detail.title')} - <PlayerHoverCard player={record.players} /></span
							>
						{/if}
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>

<div class="detailWrapper">
	{#if record}
		<div class="mainContent">
			<!-- Video Section (Left) -->
			<div class="videoSection">
				<Card.Root>
					<Card.Content>
						{#if videoId}
							<iframe
								src="https://www.youtube.com/embed/{videoId}?si=3M9vP_nLFlxX-0hE"
								title="YouTube video player"
								frameborder="0"
								allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
								referrerpolicy="strict-origin-when-cross-origin"
								allowfullscreen
							></iframe>
						{:else}
							<div class="no-video">
								<p>{$_('record_detail.no_video')}</p>
								<a href={record.videoLink} target="_blank" class="detail-link">
									{record.videoLink}
								</a>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Info Section (Right) -->
			<div class="infoSection">
				<Tabs.Root value="detail" class="w-100">
					<Tabs.List class="flex-wrap">
						<Tabs.Trigger value="detail">{$_('record_detail.tabs.detail')}</Tabs.Trigger>
						<Tabs.Trigger value="deathCount">{$_('record_detail.tabs.death_count')}</Tabs.Trigger>
						<Tabs.Trigger value="share">{$_('record_detail.tabs.share')}</Tabs.Trigger>
						{#if !record.isChecked && $user.loggedIn && $user.data.uid == record.userid}
							<Tabs.Trigger value="skipAhead">{$_('record_detail.tabs.skip_ahead')}</Tabs.Trigger>
						{/if}
						{#if record.reviewer != null && $user.loggedIn && record.reviewer.uid == $user.data.uid && record.needMod == false}
							<Tabs.Trigger value="review">{$_('record_detail.tabs.review')}</Tabs.Trigger>
						{/if}
						{#if $user.loggedIn && $user.data.isAdmin}
							<Tabs.Trigger value="edit">{$_('record_detail.tabs.edit')}</Tabs.Trigger>
						{/if}
					</Tabs.List>
					<Card.Root class="mt-[15px]">
						<Card.Content class="pt-[20px]">
							<Tabs.Content value="detail">
								<div class="detail-container">
									<!-- Video Links Section -->
									<div class="detail-section">
										<div class="detail-row">
											<span class="detail-label">{$_('record_detail.title')}</span>
											<a href={record.videoLink} target="_blank" class="detail-link">
												{record.videoLink?.slice(0, 40)}...
											</a>
										</div>
										{#if $user.loggedIn && ($user.data.isAdmin || $user.data.isTrusted)}
											<div class="detail-row">
												<span class="detail-label">Raw</span>
												<a href={record.raw} target="_blank" class="detail-link">
													{record.raw?.slice(0, 40)}...
												</a>
											</div>
										{/if}
									</div>

									<!-- Submission Info Section -->
									<div class="detail-section">
										<div class="detail-row">
											<span class="detail-label">{$_('record_detail.submit')}</span>
											<span class="detail-value"
												>{new Date(record.timestamp).toLocaleString('vi-VN')}</span
											>
										</div>
										{#if $user.loggedIn && $user.data.uid == record.userid}
											<div class="detail-row">
												<span class="detail-label">{$_('record_detail.prioritized_by')}</span>
												<span class="detail-value detail-badge">
													{Math.floor(record.prioritizedBy / (1000 * 60 * 60 * 24))}
													{$_('general.day')}{Math.floor(
														record.prioritizedBy / (1000 * 60 * 60 * 24)
													) > 1 && $locale == 'en'
														? 's'
														: ''}
												</span>
											</div>
										{/if}
									</div>

									<!-- Performance Details Section -->
									<div class="detail-section">
										<div class="detail-row">
											<span class="detail-label">{$_('record_detail.device')}</span>
											<span class="detail-value">
												<span class="device-badge {record.mobile ? 'mobile' : 'pc'}">
													{record.mobile ? 'Mobile' : 'PC'}
												</span>
												{#if record.refreshRate}
													<span class="fps-badge">{record.refreshRate}fps</span>
												{/if}
											</span>
										</div>
										<div class="detail-row">
											<span class="detail-label">
												{#if !record.levels?.isPlatformer}
													{$_('record_detail.progress')}
												{:else}
													{$_('record_detail.time')}
												{/if}
											</span>
											<span class="detail-value detail-highlight">
												{#if !record.levels?.isPlatformer}
													{record.progress}%
												{:else}
													{getTimeString(record.progress)}
												{/if}
											</span>
										</div>
										<div class="detail-row">
											<span class="detail-label">{$_('record_detail.rating')}</span>
											<div class="flex items-center gap-2">
												<span class="detail-value detail-highlight">
													{record.suggestedRating ? record.suggestedRating : 'N/a'}
												</span>
												{#if record.progress == 100 && $user.loggedIn && $user.data.uid == record.players?.uid}
													<Dialog.Root bind:open={open1}>
														<Dialog.Trigger>
															<Button variant="outline" size="icon" class="h-[28px] w-[28px]">
																<Pencil1 size={16} />
															</Button>
														</Dialog.Trigger>
														<Dialog.Content>
															<Dialog.Header>
																<Dialog.Title>{$_('record_detail.rating_change')}</Dialog.Title>
																<Input
																	type="number"
																	inputmode="numeric"
																	bind:value={record.suggestedRating}
																/>
															</Dialog.Header>
															<Button bind:disable={disableBtn} on:click={change}>Change</Button>
														</Dialog.Content>
													</Dialog.Root>
												{/if}
											</div>
										</div>
									</div>

									<!-- Comment Section -->
									{#if record.comment}
										<div class="detail-section comment-section">
											<span class="detail-label">{$_('record_detail.comment')}</span>
											{record.comment}
										</div>
									{/if}

									<!-- Review Info Section -->
									<div class="detail-section">
										<div class="detail-row">
											<span class="detail-label">{$_('record_detail.reviewed_by')}</span>
											<div class="detail-value">
												{#if !record.isChecked && record.reviewer == null}
													?
												{:else if record.reviewer != null}
													<PlayerHoverCard player={record.reviewer} />
												{:else}
													<span class="moderator-badge">Moderator</span>
												{/if}
											</div>
										</div>
										<div class="detail-row">
											<span class="detail-label">{$_('record_detail.need_mod_inspection')}</span>
											<div class="detail-value">
												{#if record.needMod}
													{$_('general.yes')}
												{:else}
													{$_('general.no')}
												{/if}
											</div>
										</div>
										{#if $user.loggedIn && $user.data.isAdmin && record.reviewerComment}
											<div class="detail-row">
												<span class="detail-label">{$_('record_detail.reviewer_cmt')}</span>
												<p class="reviewer-comment">{record.reviewerComment}</p>
											</div>
										{/if}
									</div>
								</div>
							</Tabs.Content>
							<Tabs.Content value="deathCount">
								<div class="chartWrapper">
									<canvas id="chart" use:createChart />
								</div>
							</Tabs.Content>
							<Tabs.Content value="share">
								<div class="flex gap-[10px]">
									<Input value={getShareLink()} readonly />
									<Button
										on:click={async () => {
											await navigator.clipboard.writeText(getShareLink());
											toast.success('Copied to clipboard!');
										}}>Copy</Button
									>
								</div>
							</Tabs.Content>
							<Tabs.Content value="skipAhead">
								{#if skipAheadState == 0}
									<div class="flex flex-col gap-[15px]">
										<ul class="list-inside list-disc space-y-2 text-sm">
											<li>{$_('record_detail.skip_ahead.description')[0]}</li>
											<li>{$_('record_detail.skip_ahead.description')[1]}</li>
											<li>{$_('record_detail.skip_ahead.description')[2]}</li>
											<li>{$_('record_detail.skip_ahead.description')[3]}</li>
										</ul>
										<div class="flex rounded bg-yellow-50 p-3 text-sm dark:bg-pink-950">
											<p>{$_('record_detail.skip_ahead.supporter_note')}</p>
										</div>
										{#if queueBoostInventory.length > 0}
											<div class="rounded bg-green-50 p-3 dark:bg-green-950">
												<p class="text-sm font-medium text-green-700 dark:text-green-300">
													{$_('record_detail.skip_ahead.inventory_available')}:
													<b
														>{queueBoostInventory.reduce(
															(sum, item) => sum + (item.inventoryQuantity || 1),
															0
														)}</b
													>
													{queueBoostInventory.reduce(
														(sum, item) => sum + (item.inventoryQuantity || 1),
														0
													) > 1
														? $_('record_detail.skip_ahead.boosts')
														: $_('record_detail.skip_ahead.boost_singular')}
												</p>
											</div>
										{/if}
										<div>
											<Label for="daysInput" class="mb-2">
												{$_('record_detail.skip_ahead.days_label')}
											</Label>
											<div class="flex items-center gap-[10px]">
												<Input
													id="daysInput"
													type="number"
													inputmode="numeric"
													min="1"
													bind:value={daysToSkip[0]}
													class="w-[100px]"
												/>
												<span class="text-sm">
													{daysToSkip[0] > 1 && $locale == 'en'
														? $_('record_detail.skip_ahead.days')
														: $_('record_detail.skip_ahead.day')}
												</span>
											</div>
										</div>
										<div class="flex items-center justify-between">
											<p class="text-lg"><b>{$_('record_detail.skip_ahead.total')}</b></p>
											<p class="text-lg"><b>{formatPrice(5000 * daysToSkip[0])}₫</b></p>
										</div>
										<Button disabled={estimatedQueueLoading} on:click={goToReview}
											>{estimatedQueueLoading ? 'Loading...' : $_('general.next')}</Button
										>
									</div>
								{:else if skipAheadState == 1}
									<div class="flex flex-col gap-[15px]">
										<h3 class="text-lg font-semibold">{$_('payment.review.title')}</h3>
										<div class="flex text-sm">
											<p>
												{$_('record_detail.skip_ahead.queue_boost')} ({daysToSkip[0]}
												{daysToSkip[0] > 1 && $locale == 'en'
													? $_('record_detail.skip_ahead.days')
													: $_('record_detail.skip_ahead.day')})
											</p>
											<p class="ml-auto"><b>{formatPrice(5000 * daysToSkip[0])}₫</b></p>
										</div>
										<hr />
										<div class="flex text-sm">
											<p>{$_('record_detail.skip_ahead.for_record')}</p>
											<p class="ml-auto">
												<b>{record.levels?.name}</b>
											</p>
										</div>
										{#if estimatedQueueNo !== null}
											<div class="flex rounded bg-blue-50 p-3 text-sm dark:bg-blue-950">
												<p>{$_('record_detail.skip_ahead.estimated_queue')}</p>
												<p class="ml-auto"><b>#{estimatedQueueNo}</b></p>
											</div>
										{/if}
										<p class="text-sm italic text-gray-500">
											{$_('payment.review.caution')}
										</p>

										{#if queueBoostInventory.length > 0}
											<div class="rounded bg-green-50 p-3 dark:bg-green-950">
												<p class="text-sm font-medium text-green-700 dark:text-green-300">
													{$_('record_detail.skip_ahead.inventory_available')}:
													<b
														>{queueBoostInventory.reduce(
															(sum, item) => sum + (item.inventoryQuantity || 1),
															0
														)}</b
													>
													{queueBoostInventory.reduce(
														(sum, item) => sum + (item.inventoryQuantity || 1),
														0
													) > 1
														? $_('record_detail.skip_ahead.boosts')
														: $_('record_detail.skip_ahead.boost_singular')}
												</p>
											</div>
										{/if}

										<div class="flex gap-[10px]">
											<Button
												variant="outline"
												on:click={() => {
													skipAheadState = 0;
												}}>{$_('general.back')}</Button
											>
											{#if queueBoostInventory.length > 0 && queueBoostInventory.reduce((sum, item) => sum + (item.inventoryQuantity || 1), 0) >= daysToSkip[0]}
												<Button class="flex-1" variant="secondary" on:click={consumeQueueBoost}>
													{$_('record_detail.skip_ahead.use_inventory')}
												</Button>
												<Button class="flex-1" on:click={purchaseQueueBoost}
													>{$_('record_detail.skip_ahead.purchase')}</Button
												>
											{:else}
												<Button class="flex-1" on:click={purchaseQueueBoost}
													>{$_('payment.review.proceed')}</Button
												>
											{/if}
										</div>
									</div>
								{/if}
							</Tabs.Content>
							<Tabs.Content value="review">
								<RadioGroup.Root bind:value={verdict}>
									<div class="flex items-center space-x-2">
										<RadioGroup.Item value="option-one" id="option-one" />
										<Label for="option-one">This record is legitimate.</Label>
									</div>
									<div class="flex items-center space-x-2">
										<RadioGroup.Item value="option-two" id="option-two" />
										<Label for="option-two"
											>Need further inspection (This record will be forwarded to a moderator).</Label
										>
									</div>
									<Textarea bind:value={cmt} placeholder="Additional comment (optional)" />
									<Button on:click={submitVerdict}>Submit verdict</Button>
								</RadioGroup.Root>
							</Tabs.Content>
							<Tabs.Content value="edit">
								<div class="flex flex-col gap-[10px]">
									<div class="flex items-center gap-[10px]">
										<Label for="videoLink" class="w-[100px]">Video's Link</Label>
										<Input id="videoLink" bind:value={record.videoLink} />
									</div>
									<div class="flex items-center gap-[10px]">
										<Label for="raw" class="w-[100px]">Raw</Label>
										<Input id="raw" bind:value={record.raw} />
									</div>
									<div class="flex items-center gap-[10px]">
										<Label for="refreshRate" class="w-[100px]">Refresh rate</Label>
										<Input
											id="refreshRate"
											type="number"
											inputmode="numeric"
											bind:value={record.refreshRate}
										/>
									</div>
									<div class="flex items-center gap-[10px]">
										<Label for="progress" class="w-[100px]">Progress</Label>
										<Input
											id="progress"
											type="number"
											inputmode="numeric"
											bind:value={record.progress}
										/>
									</div>
									<div class="flex items-center gap-[10px]">
										<Label for="mobile" class="w-[80px]">Mobile</Label>
										<Switch id="mobile" bind:checked={record.mobile} />
									</div>
									<Button class="mt-[10px]" on:click={applyEdit}>Apply</Button>
									<Button class="mt-[10px]" variant="destructive" on:click={deleteRecord}
										>Delete</Button
									>
								</div>
							</Tabs.Content>
						</Card.Content>
					</Card.Root>
				</Tabs.Root>
			</div>
		</div>
	{:else}
		<div class="loadingWrapper">
			<Loading inverted />
		</div>
	{/if}
</div>

<style lang="scss">
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

	.levelName {
		h2 {
			font-weight: bold;
			font-size: 30px;
		}

		.creator {
			color: var(--textColor2);
		}
	}

	.detailWrapper {
		background-color: hsl(var(--background));
		position: relative;
		z-index: 1;
		padding-bottom: 40px;
	}

	.mainContent {
		width: 1200px;
		max-width: 100%;
		margin-inline: auto;
		padding-inline: 10px;
		padding-top: 20px;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
	}

	.videoSection {
		iframe {
			width: 100%;
			aspect-ratio: 16/9;
			margin-top: 20px;
			border-radius: var(--radius);
		}

		.no-video {
			padding: 40px 20px;
			text-align: center;
			color: var(--textColor2);
		}
	}

	.infoSection {
		.chartWrapper {
			display: flex;
			justify-content: center;
			width: 100%;
			height: 200px;
		}
	}

	.loadingWrapper {
		display: flex;
		justify-content: center;
		padding: 40px;
	}

	.detail-container {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		width: 100%;
	}

	.detail-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		background: rgba(0, 0, 0, 0.02);
		border-radius: 0.5rem;
		border: 1px solid rgba(0, 0, 0, 0.05);

		:global(.dark) & {
			background: rgba(255, 255, 255, 0.02);
			border-color: rgba(255, 255, 255, 0.05);
		}
	}

	.detail-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		min-height: 1.5rem;
	}

	.detail-label {
		font-weight: 600;
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.9);
		min-width: 120px;
		flex-shrink: 0;

		:global(.dark) & {
			color: rgba(255, 255, 255, 0.9);
		}
	}

	.detail-value {
		font-size: 0.875rem;
		text-align: right;
		word-break: break-word;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		justify-content: flex-end;
		color: rgba(255, 255, 255, 0.95);
	}

	.detail-link {
		text-decoration: none;
		color: rgba(255, 255, 255, 0.85);
		font-size: 0.875rem;
		word-break: break-all;
		transition: all 0.2s;

		&:hover {
			color: rgba(255, 255, 255, 1);
			text-decoration: underline;
		}

		:global(.dark) & {
			color: rgba(255, 255, 255, 0.85);

			&:hover {
				color: rgba(255, 255, 255, 1);
			}
		}
	}

	.detail-highlight {
		font-weight: 600;
		font-size: 1rem;
		color: rgba(255, 255, 255, 1);

		:global(.dark) & {
			color: rgba(255, 255, 255, 1);
		}
	}

	.detail-badge {
		display: inline-flex;
		align-items: center;
		padding: 0.25rem 0.75rem;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 9999px;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.95);

		:global(.dark) & {
			background: rgba(255, 255, 255, 0.15);
			color: rgba(255, 255, 255, 0.95);
		}
	}

	.device-badge {
		display: inline-flex;
		align-items: center;
		padding: 0.25rem 0.625rem;
		border-radius: 0.375rem;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.025em;

		&.mobile {
			background: rgba(255, 255, 255, 0.15);
			color: rgba(255, 255, 255, 0.95);

			:global(.dark) & {
				background: rgba(255, 255, 255, 0.15);
				color: rgba(255, 255, 255, 0.95);
			}
		}

		&.pc {
			background: rgba(255, 255, 255, 0.15);
			color: rgba(255, 255, 255, 0.95);

			:global(.dark) & {
				background: rgba(255, 255, 255, 0.15);
				color: rgba(255, 255, 255, 0.95);
			}
		}
	}

	.fps-badge {
		display: inline-flex;
		align-items: center;
		padding: 0.25rem 0.625rem;
		background: rgba(255, 255, 255, 0.15);
		border-radius: 0.375rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.95);

		:global(.dark) & {
			background: rgba(255, 255, 255, 0.15);
			color: rgba(255, 255, 255, 0.95);
		}
	}

	.moderator-badge {
		display: inline-flex;
		align-items: center;
		padding: 0.25rem 0.75rem;
		background: rgba(255, 255, 255, 0.15);
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.95);

		:global(.dark) & {
			background: rgba(255, 255, 255, 0.15);
			color: rgba(255, 255, 255, 0.95);
		}
	}

	.comment-section {
		flex-direction: column;
		gap: 0.5rem;

		.detail-label {
			min-width: auto;
		}
	}

	.reviewer-comment {
		font-size: 0.875rem;
		line-height: 1.5;
		padding: 0.75rem;
		background: rgba(0, 0, 0, 0.02);
		border-radius: 0.375rem;
		margin: 0;
		font-style: italic;
		color: rgba(255, 255, 255, 0.85);

		:global(.dark) & {
			background: rgba(255, 255, 255, 0.02);
			color: rgba(255, 255, 255, 0.85);
		}
	}

	@media screen and (max-width: 900px) {
		.mainContent {
			grid-template-columns: 1fr;
		}
	}
</style>
