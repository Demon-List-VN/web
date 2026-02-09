<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Tabs from '$lib/components/ui/tabs';
	import Chart from 'chart.js/auto';
	import Loading from '$lib/components/animation/loading.svelte';
	import DialogDescription from '$lib/components/ui/dialog/dialog-description.svelte';
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
	import { Slider } from '$lib/components/ui/slider';
	import { page } from '$app/stores';
	import { _, locale } from 'svelte-i18n';
	import { get } from 'svelte/store';

	export let uid: string;
	export let levelID: number;
	export let open: boolean;
	export let selectedTab: string = 'detail';

	let record: any = null;
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
	let currentQueuePosition: number | null = null;

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
						data: record.deathCount.count,
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
		if (!open) {
			return;
		}
		record = null;
		let tmp: any = {
			data: null,
			deathCount: null
		};

		tmp.data = await (
			await fetch(`${import.meta.env.VITE_API_URL}/records/${uid}/${levelID}`)
		).json();

		try {
			tmp.deathCount = await (
				await fetch(`${import.meta.env.VITE_API_URL}/deathCount/${uid}/${levelID}`)
			).json();
		} catch {
			tmp.deathCount = Array(100).fill(0);
		}

		//@ts-ignore
		record = tmp;
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
				`${import.meta.env.VITE_API_URL}/records/${uid}/${levelID}/changeSuggestedRating/${record.data.suggestedRating}`,
				{
					method: 'PUT',
					headers: {
						Authorization: 'Bearer ' + (await $user.token())!
					}
				}
			),
			{
				loading: 'Updating...',
				success: (data) => {
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
			userid: record.data.userid,
			levelid: record.data.levelid,
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
					open = false;
					return 'Verdict sent!';
				},
				loading: 'Sending...',
				error: 'An error occured.'
			}
		);
	}

	async function applyEdit() {
		const data = structuredClone(record.data);
		delete data.levels;
		delete data.players;

		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/records`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Bearer ' + (await $user.token())!
				},
				body: JSON.stringify(data)
			}),
			{
				success: () => {
					open = false;
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
			fetch(
				`${import.meta.env.VITE_API_URL}/records/${record.data.userid}/${record.data.levelid}`,
				{
					method: 'DELETE',
					headers: {
						Authorization: 'Bearer ' + (await $user.token())!
					}
				}
			),
			{
				success: () => {
					open = false;
					window.location.reload();
					return 'Deleted. This page will be refreshed';
				},
				loading: 'Deleting...',
				error: 'An error occured'
			}
		);
	}

	function getShareLink() {
		return `${$page.url.origin}/level/${record.data.levelid}?record=${record.data.userid}`;
	}

	function formatPrice(x: number) {
		return x.toLocaleString('vi-VN');
	}

	function resetSkipAhead() {
		skipAheadState = 0;
		daysToSkip = [1];
		estimatedQueueNo = null;
		estimatedQueueLoading = false;
		currentQueuePosition = null;
	}

	async function goToReview() {
		estimatedQueueLoading = true;
		try {
			const prioritizedMs = daysToSkip[0] * 1000 * 60 * 60 * 24;
			estimatedQueueNo = await getEstimatedQueueNo(
				record.data.userid,
				record.data.levelid,
				prioritizedMs
			);
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
						levelID: record.data.levelid,
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
					open = false;
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
					userID: record.data.userid,
					levelID: record.data.levelid
				})
			})
		).json();

		window.location.href = res.checkoutUrl;
	}

	$: (open, fetchData());
	$: if (!open) resetSkipAhead();
	$: if (open && $user.loggedIn) fetchQueueBoostInventory();
</script>

<Dialog.Root
	{open}
	onOpenChange={() => {
		open = false;
	}}
>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{$_('record_detail.title')}</Dialog.Title>
			{#if record}
				<DialogDescription>
					{#if $locale == 'vi'}
						Bản ghi {record.data.levels.name} của {record.data.players.name}
					{:else}
						{record.data.players.name}'s {record.data.levels.name} record
					{/if}
				</DialogDescription>

				<Tabs.Root value={selectedTab} class="w-100">
					<Tabs.List>
						<Tabs.Trigger value="detail">{$_('record_detail.tabs.detail')}</Tabs.Trigger>
						<Tabs.Trigger value="deathCount">{$_('record_detail.tabs.death_count')}</Tabs.Trigger>
						<Tabs.Trigger value="share">{$_('record_detail.tabs.share')}</Tabs.Trigger>
						{#if !record.data.isChecked && $user.loggedIn && $user.data.uid == record.data.userid}
							<Tabs.Trigger value="skipAhead">{$_('record_detail.tabs.skip_ahead')}</Tabs.Trigger>
						{/if}
						{#if record.data.reviewer != null && $user.loggedIn && record.data.reviewer.uid == $user.data.uid && record.data.needMod == false}
							<Tabs.Trigger value="review">{$_('record_detail.tabs.review')}</Tabs.Trigger>
						{/if}
						{#if $user.loggedIn && $user.data.isAdmin}
							<Tabs.Trigger value="edit">{$_('record_detail.tabs.edit')}</Tabs.Trigger>
						{/if}
					</Tabs.List>
					<Tabs.Content value="detail">
						<div class="detail-container">
							<!-- Video Links Section -->
							<div class="detail-section">
								<div class="detail-row">
									<span class="detail-label">Video</span>
									<a href={record.data.videoLink} target="_blank" class="detail-link">
										{record.data.videoLink.slice(0, 40)}...
									</a>
								</div>
								{#if $user.loggedIn && ($user.data.isAdmin || $user.data.isTrusted)}
									<div class="detail-row">
										<span class="detail-label">Raw</span>
										<a href={record.data.raw} target="_blank" class="detail-link">
											{record.data.raw.slice(0, 40)}...
										</a>
									</div>
								{/if}
								<div class="detail-row">
									<span class="detail-label">LDM</span>
									<span class="detail-value">
										{record.data.variant_id ?? 'N/a'}
									</span>
								</div>
							</div>

							<!-- Submission Info Section -->
							<div class="detail-section">
								<div class="detail-row">
									<span class="detail-label">{$_('record_detail.submit')}</span>
									<span class="detail-value"
										>{new Date(record.data.timestamp).toLocaleString('vi-VN')}</span
									>
								</div>
								{#if $user.loggedIn && $user.data.uid == record.data.userid}
									<div class="detail-row">
										<span class="detail-label">{$_('record_detail.prioritized_by')}</span>
										<span class="detail-value detail-badge">
											{Math.floor(record.data.prioritizedBy / (1000 * 60 * 60 * 24))}
											{$_('general.day')}{Math.floor(
												record.data.prioritizedBy / (1000 * 60 * 60 * 24)
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
										<span class="device-badge {record.data.mobile ? 'mobile' : 'pc'}">
											{record.data.mobile ? 'Mobile' : 'PC'}
										</span>
										{#if record.data.refreshRate}
											<span class="fps-badge">{record.data.refreshRate}fps</span>
										{/if}
									</span>
								</div>
								<div class="detail-row">
									<span class="detail-label">
										{#if !record.data.levels.isPlatformer}
											{$_('record_detail.progress')}
										{:else}
											{$_('record_detail.time')}
										{/if}
									</span>
									<span class="detail-value detail-highlight">
										{#if !record.data.levels.isPlatformer}
											{record.data.progress}%
										{:else}
											{getTimeString(record.data.progress)}
										{/if}
									</span>
								</div>
								<div class="detail-row">
									<span class="detail-label">{$_('record_detail.rating')}</span>
									<div class="flex items-center gap-2">
										<span class="detail-value detail-highlight">
											{record.data.suggestedRating ? record.data.suggestedRating : 'N/a'}
										</span>
										{#if record.data.progress == 100 && $user.loggedIn && $user.data.uid == record.data.players.uid}
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
															bind:value={record.data.suggestedRating}
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
							{#if record.data.comment}
								<div class="detail-section comment-section">
									<span class="detail-label">{$_('record_detail.comment')}</span>
									{record.data.comment}
								</div>
							{/if}

							<!-- Review Info Section -->
							<div class="detail-section">
								<div class="detail-row">
									<span class="detail-label">{$_('record_detail.reviewed_by')}</span>
									<div class="detail-value">
										{#if !record.data.isChecked && record.data.reviewer == null}
											?
										{:else if record.data.reviewer != null}
											<PlayerHoverCard player={record.data.reviewer} />
										{:else}
											<span class="moderator-badge">Moderator</span>
										{/if}
									</div>
								</div>
								<div class="detail-row">
									<span class="detail-label">{$_('record_detail.need_mod_inspection')}</span>
									<div class="detail-value">
										{#if record.data.needMod}
											{$_('general.yes')}
										{:else}
											{$_('general.no')}
										{/if}
									</div>
								</div>
								{#if $user.loggedIn && $user.data.isAdmin && record.data.reviewerComment}
									<div class="detail-row">
										<span class="detail-label">{$_('record_detail.reviewer_cmt')}</span>
										<p class="reviewer-comment">{record.data.reviewerComment}</p>
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
										<b>{record.data.levels.name}</b>
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
								<Input id="videoLink" bind:value={record.data.videoLink} />
							</div>
							<div class="flex items-center gap-[10px]">
								<Label for="raw" class="w-[100px]">Raw</Label>
								<Input id="raw" bind:value={record.data.raw} />
							</div>
							<div class="flex items-center gap-[10px]">
								<Label for="refreshRate" class="w-[100px]">Refresh rate</Label>
								<Input
									id="refreshRate"
									type="number"
									inputmode="numeric"
									bind:value={record.data.refreshRate}
								/>
							</div>
							<div class="flex items-center gap-[10px]">
								<Label for="progress" class="w-[100px]">Progress</Label>
								<Input
									id="progress"
									type="number"
									inputmode="numeric"
									bind:value={record.data.progress}
								/>
							</div>
							<div class="flex items-center gap-[10px]">
								<Label for="mobile" class="w-[80px]">Mobile</Label>
								<Switch id="mobile" bind:checked={record.data.mobile} />
							</div>
							<Button class="mt-[10px]" on:click={applyEdit}>Apply</Button>
							<Button class="mt-[10px]" variant="destructive" on:click={deleteRecord}>Delete</Button
							>
						</div>
					</Tabs.Content>
				</Tabs.Root>
			{:else}
				<Loading inverted />
			{/if}
		</Dialog.Header>
	</Dialog.Content>
</Dialog.Root>

<style lang="scss">
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

	.comment-text {
		font-size: 0.875rem;
		line-height: 1.5;
		padding: 0.75rem;
		background: rgba(0, 0, 0, 0.02);
		border-radius: 0.375rem;
		border-left: 3px solid rgba(255, 255, 255, 0.5);
		margin: 0;
		color: rgba(255, 255, 255, 0.9);

		:global(.dark) & {
			background: rgba(255, 255, 255, 0.02);
			border-left-color: rgba(255, 255, 255, 0.5);
			color: rgba(255, 255, 255, 0.9);
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

	.chartWrapper {
		display: flex;
		justify-content: center;
		width: 100%;
		height: 200px;
	}
</style>
