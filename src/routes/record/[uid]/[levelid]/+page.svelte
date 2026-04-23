<script lang="ts">
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import { fly, scale } from 'svelte/transition';
	import { quintOut, elasticOut } from 'svelte/easing';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';
	import { _, locale } from 'svelte-i18n';
	import { get } from 'svelte/store';
	import Chart from 'chart.js/auto';
	import Loading from '$lib/components/animation/loading.svelte';
	import PlayerHoverCard from '$lib/components/playerLink.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import * as Tabs from '$lib/components/ui/tabs';
	import {
		ExternalLink,
		Copy,
		Check,
		Monitor,
		Smartphone,
		Calendar,
		Trophy,
		Star,
		Zap,
		Shield,
		Pencil,
		Trash2,
		Share2,
		Activity,
		User,
		Info,
		SkipForward
	} from 'lucide-svelte';

	export let data: PageData;

	let record: any = null;
	let deathCount: any = null;

	let chart: any = null;
	let activeTab = 'detail';
	let showHero = false;
	let showContent = false;
	let copied = false;

	// Edit state
	let disableBtn = false;
	let open1 = false;

	// Verdict
	let verdict = '';
	let cmt = '';

	// Skip ahead
	let skipAheadState = 0;
	const daysToSkip = [1];
	let estimatedQueueNo: number | null = null;
	let estimatedQueueLoading = false;
	let queueBoostInventory: any[] = [];

	function getTimeString(ms: number) {
		const minutes = Math.floor(ms / 60000);
		const seconds = Math.floor((ms % 60000) / 1000);
		const milliseconds = ms % 1000;
		return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds}`;
	}

	function genPercent() {
		return Array.from({ length: 100 }, (_, i) => `${i}%`);
	}

	function createChart(node: any) {
		if (chart) chart.destroy();
		chart = new Chart(node, {
			type: 'bar',
			data: {
				labels: genPercent(),
				datasets: [
					{
						label: 'Death count',
						data: deathCount?.count ?? [],
						backgroundColor: 'rgba(139, 92, 246, 0.5)',
						borderColor: 'rgba(139, 92, 246, 0.9)',
						borderWidth: 1,
						borderRadius: 2
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				scales: {
					y: {
						beginAtZero: true,
						grid: { color: 'rgba(255,255,255,0.05)' },
						ticks: { color: 'rgba(255,255,255,0.5)' }
					},
					x: {
						grid: { color: 'rgba(255,255,255,0.03)' },
						ticks: { color: 'rgba(255,255,255,0.4)', maxRotation: 0, maxTicksLimit: 10 }
					}
				},
				plugins: {
					legend: { display: false },
					tooltip: {
						backgroundColor: 'rgba(0,0,0,0.8)',
						callbacks: { label: (ctx) => String(ctx.parsed.y) }
					}
				}
			}
		});
	}

	$: bgImage = record?.data?.levels?.id
		? `https://levelthumbs.prevter.me/thumbnail/${record.data.levels.id}/high`
		: '';

	$: progressDisplay = record?.data
		? record.data.levels.isPlatformer
			? getTimeString(record.data.progress)
			: `${record.data.progress}%`
		: '';

	function formatPrice(x: number) {
		return x.toLocaleString('vi-VN');
	}

	async function copyShareLink() {
		await navigator.clipboard.writeText(window.location.href);
		copied = true;
		toast.success('Copied!');
		setTimeout(() => (copied = false), 2000);
	}

	async function change() {
		disableBtn = true;
		toast.promise(
			fetch(
				`${import.meta.env.VITE_API_URL}/records/${record.data.userid}/${record.data.levelid}/changeSuggestedRating/${record.data.suggestedRating}`,
				{
					method: 'PUT',
					headers: { Authorization: 'Bearer ' + (await $user.token())! }
				}
			),
			{
				loading: 'Updating...',
				success: () => { open1 = false; disableBtn = false; return 'Updated!'; },
				error: 'An error occured'
			}
		);
	}

	async function submitVerdict() {
		if (!verdict) { toast.warning('Please select a verdict.'); return; }
		const body = {
			userid: record.data.userid,
			levelid: record.data.levelid,
			id: record.data.id,
			needMod: verdict === 'option-two',
			isChecked: verdict === 'option-one',
			reviewerComment: cmt
		};
		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/submitVerdict`, {
				method: 'PUT',
				body: JSON.stringify(body),
				headers: { Authorization: `Bearer ${await $user.token()}`, 'Content-Type': 'application/json' }
			}),
			{ success: () => { goto(`/level/${record.data.levelid}`); return 'Verdict sent!'; }, loading: 'Sending...', error: 'An error occured.' }
		);
	}

	async function applyEdit() {
		const body = structuredClone(record.data);
		delete body.levels;
		delete body.players;
		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/records`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (await $user.token())! },
				body: JSON.stringify(body)
			}),
			{
				success: () => { goto(`/level/${record.data.levelid}`); return 'Changes applied'; },
				loading: 'Applying changes...',
				error: 'An error occured'
			}
		);
	}

	async function deleteRecord() {
		if (!confirm('Delete this record?')) return;
		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/records/${record.data.userid}/${record.data.levelid}${record.data.id ? `?id=${record.data.id}` : ''}`, {
				method: 'DELETE',
				headers: { Authorization: 'Bearer ' + (await $user.token())! }
			}),
			{
				success: () => { goto(`/level/${record.data.levelid}`); return 'Deleted.'; },
				loading: 'Deleting...',
				error: 'An error occured'
			}
		);
	}

	async function getEstimatedQueueNo(userID: string, levelID: number, prioritizedBy: number) {
		const res = await (
			await fetch(`${import.meta.env.VITE_API_URL}/records/${userID}/${levelID}/getEstimatedQueue/${prioritizedBy}`)
		).json();
		return res.no;
	}

	async function fetchQueueBoostInventory() {
		try {
			const res = await (
				await fetch(`${import.meta.env.VITE_API_URL}/inventory?itemId=15`, {
					headers: { Authorization: 'Bearer ' + (await $user.token()) }
				})
			).json();
			queueBoostInventory = Array.isArray(res) ? res : [];
		} catch { queueBoostInventory = []; }
	}

	async function goToReview() {
		estimatedQueueLoading = true;
		try {
			const ms = daysToSkip[0] * 86400000;
			estimatedQueueNo = await getEstimatedQueueNo(record.data.userid, record.data.levelid, ms);
			skipAheadState = 1;
		} catch { toast.error('Failed to get estimated queue position'); }
		finally { estimatedQueueLoading = false; }
	}

	async function consumeQueueBoost() {
		toast.promise(
			(async () => {
				const res = await fetch(`${import.meta.env.VITE_API_URL}/inventory/item/15/consume`, {
					method: 'DELETE',
					headers: { Authorization: 'Bearer ' + (await $user.token()), 'Content-Type': 'application/json' },
					body: JSON.stringify({ levelID: record.data.levelid, quantity: daysToSkip[0] })
				});
				if (res.ok) { await fetchQueueBoostInventory(); } else { throw new Error(await res.text()); }
			})(),
			{
				loading: get(_)('record_detail.skip_ahead.consuming'),
				success: () => { goto(`/level/${record.data.levelid}`); return get(_)('record_detail.skip_ahead.queue_boost_used'); },
				error: get(_)('record_detail.skip_ahead.queue_boost_error')
			}
		);
	}

	async function purchaseQueueBoost() {
		toast.loading(get(_)('toast.payment.redirect'));
		const res: any = await (
			await fetch(`${import.meta.env.VITE_API_URL}/payment/getPaymentLink/5/${daysToSkip[0]}`, {
				method: 'POST',
				headers: { Authorization: 'Bearer ' + (await $user.token()), 'Content-Type': 'application/json' },
				body: JSON.stringify({ userID: record.data.userid, levelID: record.data.levelid })
			})
		).json();
		window.location.href = res.checkoutUrl;
	}

	$: totalBoosts = queueBoostInventory.reduce((s, i) => s + (i.inventoryQuantity || 1), 0);

	async function fetchData() {
		const API = import.meta.env.VITE_API_URL;
		const uid = (data as any).uid;
		const levelid = (data as any).levelid;
		const recordIdParam = (data as any).recordId;

		const recordUrl = recordIdParam
			? `${API}/records/${uid}/${levelid}?id=${recordIdParam}`
			: `${API}/records/${uid}/${levelid}`;

		const [recordRes, deathCountRes] = await Promise.all([
			fetch(recordUrl),
			fetch(`${API}/deathCount/${uid}/${levelid}`)
		]);

		const recordData = await recordRes.json();
		const deathCountData = await deathCountRes.json().catch(() => ({ count: Array(100).fill(0) }));

		// Mirror the structure from recordDetail.svelte: { data: {...}, deathCount: {...} }
		record = { data: recordData };
		deathCount = deathCountData;
	}

	onMount(async () => {
		const tabParam = $page.url.searchParams.get('tab');
		if (tabParam) activeTab = tabParam;

		const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reduced) { showHero = showContent = true; } else {
			setTimeout(() => (showHero = true), 50);
			setTimeout(() => (showContent = true), 400);
		}

		await fetchData();
		if ($user.loggedIn) fetchQueueBoostInventory();
	});
</script>

<svelte:head>
	{#if record?.data}
		<title>{record.data.players.name} – {record.data.levels.name} · GDVN</title>
	{/if}
</svelte:head>

<div class="page-root">
	<!-- Background hero -->
	{#if bgImage}
		<div class="hero-bg" style="background-image: url('{bgImage}')"></div>
	{/if}
	<div class="hero-overlay"></div>


	<div class="content-root">
		{#if !record?.data}
			<div class="loading-center"><Loading inverted /></div>
		{:else}
			<!-- Hero section -->
			{#if showHero}
				<div class="hero-section" in:fly={{ y: 40, duration: 700, easing: quintOut }}>
					<div class="hero-inner">
						<!-- Player info -->
						<div class="hero-player" in:fly={{ y: 20, duration: 600, delay: 150, easing: quintOut }}>
							<div class="avatar-ring">
								<div class="avatar-placeholder">
									<User size={28} />
								</div>
							</div>
							<div class="hero-names">
								<h1 class="hero-player-name">{record.data.players.name}</h1>
								{#if record.data.players.clans}
									<span
										class="clan-tag"
										style="background: {record.data.players.clans.tagBgColor}; color: {record.data.players.clans.tagTextColor}"
									>
										{record.data.players.clans.tag}
									</span>
								{/if}
							</div>
						</div>

						<!-- Big stat -->
						<div class="hero-stat" in:scale={{ duration: 700, delay: 250, easing: elasticOut, start: 0.7 }}>
							<div class="stat-glow"></div>
							<div class="stat-value">{progressDisplay}</div>
							<div class="stat-label">
								{record.data.levels.isPlatformer ? $_('record_detail.time') : $_('record_detail.progress')}
							</div>
						</div>

						<!-- Level info -->
						<div class="hero-level" in:fly={{ y: 20, duration: 600, delay: 350, easing: quintOut }}>
							<div class="hero-level-name">{record.data.levels.name}</div>
							<div class="hero-level-meta">
								{#if record.data.levels.creator}by {record.data.levels.creator}{/if}
							</div>

							<!-- Points badges -->
							{#if record.data.dlPt || record.data.flPt || record.data.plPt || record.data.clPt}
								<div class="points-row">
									{#if record.data.dlPt}<span class="pt-badge dl"><Trophy size={11} />{record.data.dlPt} DL</span>{/if}
									{#if record.data.flPt}<span class="pt-badge fl"><Star size={11} />{record.data.flPt} FL</span>{/if}
									{#if record.data.plPt}<span class="pt-badge pl"><Zap size={11} />{record.data.plPt} PL</span>{/if}
									{#if record.data.clPt}<span class="pt-badge cl"><Shield size={11} />{record.data.clPt} CL</span>{/if}
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/if}

			<!-- Main content -->
			{#if showContent}
				<div class="main-content" in:fly={{ y: 30, duration: 600, easing: quintOut }}>
					<Tabs.Root bind:value={activeTab}>
						<div class="tabs-bar">
							<div class="custom-tabs" role="tablist">
								<button class="tab-btn" class:active={activeTab === 'detail'} on:click={() => activeTab = 'detail'} role="tab">
									<Info size={14} />
									<span>{$_('record_detail.tabs.detail')}</span>
									{#if activeTab === 'detail'}<div class="tab-glow"></div>{/if}
								</button>
								<button class="tab-btn" class:active={activeTab === 'deathCount'} on:click={() => activeTab = 'deathCount'} role="tab">
									<Activity size={14} />
									<span>{$_('record_detail.tabs.death_count')}</span>
									{#if activeTab === 'deathCount'}<div class="tab-glow"></div>{/if}
								</button>
								<button class="tab-btn" class:active={activeTab === 'share'} on:click={() => activeTab = 'share'} role="tab">
									<Share2 size={14} />
									<span>{$_('record_detail.tabs.share')}</span>
									{#if activeTab === 'share'}<div class="tab-glow"></div>{/if}
								</button>
								{#if !record.data.isChecked && $user.loggedIn && $user.data.uid === record.data.userid}
									<button class="tab-btn" class:active={activeTab === 'skipAhead'} on:click={() => activeTab = 'skipAhead'} role="tab">
										<SkipForward size={14} />
										<span>{$_('record_detail.tabs.skip_ahead')}</span>
										{#if activeTab === 'skipAhead'}<div class="tab-glow"></div>{/if}
									</button>
								{/if}
								{#if record.data.reviewer && $user.loggedIn && record.data.reviewer.uid === $user.data.uid && !record.data.needMod}
									<button class="tab-btn" class:active={activeTab === 'review'} on:click={() => activeTab = 'review'} role="tab">
										<Shield size={14} />
										<span>{$_('record_detail.tabs.review')}</span>
										{#if activeTab === 'review'}<div class="tab-glow"></div>{/if}
									</button>
								{/if}
								{#if $user.loggedIn && $user.data.isAdmin}
									<button class="tab-btn" class:active={activeTab === 'edit'} on:click={() => activeTab = 'edit'} role="tab">
										<Pencil size={14} />
										<span>{$_('record_detail.tabs.edit')}</span>
										{#if activeTab === 'edit'}<div class="tab-glow"></div>{/if}
									</button>
								{/if}
							</div>
						</div>

						<!-- DETAIL TAB -->
						<Tabs.Content value="detail">
							<div class="glass-grid">
								<!-- Links card -->
								<div class="glass-card">
									<div class="card-header">
										<ExternalLink size={15} class="card-icon" />
										<span>Links</span>
									</div>
									<div class="card-rows">
										<div class="info-row">
											<span class="row-label">Video</span>
											<a href={record.data.videoLink} target="_blank" class="row-link">
												{record.data.videoLink.slice(0, 45)}{record.data.videoLink.length > 45 ? '…' : ''}
											</a>
										</div>
										{#if $user.loggedIn && ($user.data.isAdmin || $user.data.isTrusted) && record.data.raw}
											<div class="info-row">
												<span class="row-label">Raw</span>
												<a href={record.data.raw} target="_blank" class="row-link">
													{record.data.raw.slice(0, 45)}{record.data.raw.length > 45 ? '…' : ''}
												</a>
											</div>
										{/if}
										<div class="info-row">
											<span class="row-label">LDM</span>
											<span class="row-value">{record.data.variant_id ?? 'N/a'}</span>
										</div>
									</div>
								</div>

								<!-- Submission card -->
								<div class="glass-card">
									<div class="card-header">
										<Calendar size={15} class="card-icon" />
										<span>{$_('record_detail.submit')}</span>
									</div>
									<div class="card-rows">
										<div class="info-row">
											<span class="row-label">{$_('record_detail.submit')}</span>
											<span class="row-value">{new Date(record.data.timestamp).toLocaleString('vi-VN')}</span>
										</div>
										{#if $user.loggedIn && $user.data.uid === record.data.userid}
											<div class="info-row">
												<span class="row-label">{$_('record_detail.prioritized_by')}</span>
												<span class="row-badge">
													{Math.floor(record.data.prioritizedBy / 86400000)}&nbsp;{$_('general.day')}{Math.floor(record.data.prioritizedBy / 86400000) > 1 && $locale === 'en' ? 's' : ''}
												</span>
											</div>
										{/if}
									</div>
								</div>

								<!-- Performance card -->
								<div class="glass-card">
									<div class="card-header">
										<Activity size={15} class="card-icon" />
										<span>Performance</span>
									</div>
									<div class="card-rows">
										<div class="info-row">
											<span class="row-label">{$_('record_detail.device')}</span>
											<span class="row-value">
												<span class="device-badge {record.data.mobile ? 'mobile' : 'pc'}">
													{#if record.data.mobile}<Smartphone size={11} />{:else}<Monitor size={11} />{/if}
													{record.data.mobile ? 'Mobile' : 'PC'}
												</span>
												{#if record.data.refreshRate}
													<span class="fps-badge">{record.data.refreshRate}fps</span>
												{/if}
											</span>
										</div>
										<div class="info-row">
											<span class="row-label">{$_('record_detail.rating')}</span>
											<span class="row-value row-highlight">
												{record.data.suggestedRating ?? 'N/a'}
												{#if record.data.progress === 100 && $user.loggedIn && $user.data.uid === record.data.players.uid}
													<button class="edit-inline-btn" on:click={() => (open1 = !open1)}>
														<Pencil size={13} />
													</button>
												{/if}
											</span>
										</div>
										{#if open1}
											<div class="inline-edit-row">
												<Input type="number" inputmode="numeric" bind:value={record.data.suggestedRating} class="h-8 w-32" />
												<Button size="sm" disabled={disableBtn} on:click={change}>Save</Button>
											</div>
										{/if}
									</div>
								</div>

								<!-- Review card -->
								<div class="glass-card">
									<div class="card-header">
										<Shield size={15} class="card-icon" />
										<span>{$_('record_detail.reviewed_by')}</span>
									</div>
									<div class="card-rows">
										<div class="info-row">
											<span class="row-label">{$_('record_detail.reviewed_by')}</span>
											<span class="row-value">
												{#if !record.data.isChecked && !record.data.reviewer}
													<span class="row-muted">?</span>
												{:else if record.data.reviewer}
													<PlayerHoverCard player={record.data.reviewer} />
												{:else}
													<span class="mod-badge">Moderator</span>
												{/if}
											</span>
										</div>
										<div class="info-row">
											<span class="row-label">{$_('record_detail.need_mod_inspection')}</span>
											<span class="row-value">
												<span class="status-dot {record.data.needMod ? 'warn' : 'ok'}"></span>
												{record.data.needMod ? $_('general.yes') : $_('general.no')}
											</span>
										</div>
										{#if $user.loggedIn && $user.data.isAdmin && record.data.reviewerComment}
											<div class="comment-block">
												<span class="row-label">{$_('record_detail.reviewer_cmt')}</span>
												<p class="reviewer-comment">{record.data.reviewerComment}</p>
											</div>
										{/if}
									</div>
								</div>

								<!-- Comment card -->
								{#if record.data.comment}
									<div class="glass-card wide">
										<div class="card-header">
											<span>{$_('record_detail.comment')}</span>
										</div>
										<p class="comment-text">{record.data.comment}</p>
									</div>
								{/if}
							</div>
						</Tabs.Content>

						<!-- DEATH COUNT TAB -->
						<Tabs.Content value="deathCount">
							<div class="glass-card chart-card">
								<div class="card-header">
									<Activity size={15} class="card-icon" />
									<span>{$_('record_detail.tabs.death_count')}</span>
								</div>
								<div class="chart-wrapper">
									<canvas use:createChart></canvas>
								</div>
							</div>
						</Tabs.Content>

						<!-- SHARE TAB -->
						<Tabs.Content value="share">
							<div class="glass-card">
								<div class="card-header">
									<Share2 size={15} class="card-icon" />
									<span>{$_('record_detail.tabs.share')}</span>
								</div>
								<div class="share-row">
									<Input value={$page.url.href} readonly class="flex-1" />
									<Button on:click={copyShareLink}>
										{#if copied}<Check size={14} />{:else}<Copy size={14} />{/if}
										&nbsp;Copy
									</Button>
								</div>
							</div>
						</Tabs.Content>

						<!-- SKIP AHEAD TAB -->
						<Tabs.Content value="skipAhead">
							<div class="glass-card">
								{#if skipAheadState === 0}
									<div class="flex flex-col gap-4">
										<ul class="skip-list">
											{#each $_('record_detail.skip_ahead.description') as desc}
												<li>{desc}</li>
											{/each}
										</ul>
										<div class="info-callout yellow">
											<p>{$_('record_detail.skip_ahead.supporter_note')}</p>
										</div>
										{#if totalBoosts > 0}
											<div class="info-callout green">
												<p class="font-medium">
													{$_('record_detail.skip_ahead.inventory_available')}: <b>{totalBoosts}</b>
													{totalBoosts > 1 ? $_('record_detail.skip_ahead.boosts') : $_('record_detail.skip_ahead.boost_singular')}
												</p>
											</div>
										{/if}
										<div>
											<Label for="daysInput" class="mb-2">{$_('record_detail.skip_ahead.days_label')}</Label>
											<div class="flex items-center gap-3">
												<Input id="daysInput" type="number" inputmode="numeric" min="1" bind:value={daysToSkip[0]} class="w-24" />
												<span class="text-sm text-muted-foreground">
													{daysToSkip[0] > 1 && $locale === 'en' ? $_('record_detail.skip_ahead.days') : $_('record_detail.skip_ahead.day')}
												</span>
											</div>
										</div>
										<div class="flex items-center justify-between">
											<p class="font-semibold">{$_('record_detail.skip_ahead.total')}</p>
											<p class="text-lg font-bold neon-text">{formatPrice(5000 * daysToSkip[0])}₫</p>
										</div>
										<Button disabled={estimatedQueueLoading} on:click={goToReview}>
											{estimatedQueueLoading ? 'Loading...' : $_('general.next')}
										</Button>
									</div>
								{:else}
									<div class="flex flex-col gap-4">
										<h3 class="text-lg font-semibold">{$_('payment.review.title')}</h3>
										<div class="flex text-sm">
											<p>{$_('record_detail.skip_ahead.queue_boost')} ({daysToSkip[0]} {daysToSkip[0] > 1 && $locale === 'en' ? $_('record_detail.skip_ahead.days') : $_('record_detail.skip_ahead.day')})</p>
											<p class="ml-auto font-bold">{formatPrice(5000 * daysToSkip[0])}₫</p>
										</div>
										<hr class="border-white/10" />
										<div class="flex text-sm">
											<p>{$_('record_detail.skip_ahead.for_record')}</p>
											<p class="ml-auto font-bold">{record.data.levels.name}</p>
										</div>
										{#if estimatedQueueNo !== null}
											<div class="info-callout blue">
												<p>{$_('record_detail.skip_ahead.estimated_queue')}</p>
												<p class="ml-auto font-bold">#{estimatedQueueNo}</p>
											</div>
										{/if}
										{#if totalBoosts > 0}
											<div class="info-callout green">
												<p class="text-sm font-medium">{$_('record_detail.skip_ahead.inventory_available')}: <b>{totalBoosts}</b></p>
											</div>
										{/if}
										<p class="text-sm italic text-muted-foreground">{$_('payment.review.caution')}</p>
										<div class="flex gap-2">
											<Button variant="outline" on:click={() => (skipAheadState = 0)}>{$_('general.back')}</Button>
											{#if totalBoosts > 0 && totalBoosts >= daysToSkip[0]}
												<Button class="flex-1" variant="secondary" on:click={consumeQueueBoost}>{$_('record_detail.skip_ahead.use_inventory')}</Button>
												<Button class="flex-1" on:click={purchaseQueueBoost}>{$_('record_detail.skip_ahead.purchase')}</Button>
											{:else}
												<Button class="flex-1" on:click={purchaseQueueBoost}>{$_('payment.review.proceed')}</Button>
											{/if}
										</div>
									</div>
								{/if}
							</div>
						</Tabs.Content>

						<!-- REVIEW TAB -->
						<Tabs.Content value="review">
							<div class="glass-card">
								<div class="card-header">
									<Shield size={15} class="card-icon" />
									<span>{$_('record_detail.tabs.review')}</span>
								</div>
								<RadioGroup.Root bind:value={verdict} class="flex flex-col gap-3 mt-2">
									<div class="flex items-center gap-2">
										<RadioGroup.Item value="option-one" id="opt-one" />
										<Label for="opt-one">This record is legitimate.</Label>
									</div>
									<div class="flex items-center gap-2">
										<RadioGroup.Item value="option-two" id="opt-two" />
										<Label for="opt-two">Need further inspection (will be forwarded to a moderator).</Label>
									</div>
									<Textarea bind:value={cmt} placeholder="Additional comment (optional)" />
									<Button on:click={submitVerdict}>Submit verdict</Button>
								</RadioGroup.Root>
							</div>
						</Tabs.Content>

						<!-- EDIT TAB -->
						<Tabs.Content value="edit">
							<div class="glass-card">
								<div class="card-header">
									<Pencil size={15} class="card-icon" />
									<span>{$_('record_detail.tabs.edit')}</span>
								</div>
								<div class="flex flex-col gap-3 mt-2">
									<div class="edit-row">
										<Label class="edit-label">Video Link</Label>
										<Input bind:value={record.data.videoLink} />
									</div>
									<div class="edit-row">
										<Label class="edit-label">Raw</Label>
										<Input bind:value={record.data.raw} />
									</div>
									<div class="edit-row">
										<Label class="edit-label">Refresh Rate</Label>
										<Input type="number" inputmode="numeric" bind:value={record.data.refreshRate} />
									</div>
									<div class="edit-row">
										<Label class="edit-label">Progress</Label>
										<Input type="number" inputmode="numeric" bind:value={record.data.progress} />
									</div>
									<div class="edit-row">
										<Label class="edit-label">Mobile</Label>
										<Switch bind:checked={record.data.mobile} />
									</div>
									<Button class="mt-2" on:click={applyEdit}>Apply</Button>
									<Button variant="destructive" on:click={deleteRecord}>
										<Trash2 size={14} />&nbsp;Delete Record
									</Button>
								</div>
							</div>
						</Tabs.Content>
					</Tabs.Root>
				</div>
			{/if}
		{/if}
	</div>
</div>

<style lang="scss">
	/* ── Page shell ── */
	.page-root {
		min-height: 100vh;
		position: relative;
		background: hsl(var(--background));
	}

	.hero-bg {
		position: fixed;
		inset: 0;
		background-size: cover;
		background-position: center;
		filter: blur(18px) brightness(0.35) saturate(1.4);
		transform: scale(1.05);
		z-index: 0;
	}

	.hero-overlay {
		position: fixed;
		inset: 0;
		background: linear-gradient(
			180deg,
			rgba(0, 0, 0, 0.3) 0%,
			hsl(var(--background) / 0.85) 55%,
			hsl(var(--background)) 100%
		);
		z-index: 1;
	}



	/* ── Content root ── */
	.content-root {
		position: relative;
		z-index: 2;
		max-width: 860px;
		margin: 0 auto;
		padding: 0 16px 60px;
	}

	.loading-center {
		display: flex;
		justify-content: center;
		padding-top: 120px;
	}

	/* ── Hero section ── */
	.hero-section {
		padding-top: 48px;
		padding-bottom: 40px;
	}

	.hero-inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 28px;
		text-align: center;
	}

	.hero-player {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}

	.avatar-ring {
		width: 72px;
		height: 72px;
		border-radius: 50%;
		padding: 3px;
		background: linear-gradient(135deg, #7c3aed, #2563eb, #7c3aed);
		background-size: 200% 200%;
		animation: gradientShift 3s ease infinite;
	}

	.avatar-placeholder {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		background: hsl(var(--background));
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgba(255,255,255,0.5);
	}

	@keyframes gradientShift {
		0%, 100% { background-position: 0% 50%; }
		50%       { background-position: 100% 50%; }
	}

	.hero-names {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
	}

	.hero-player-name {
		font-size: clamp(1.5rem, 4vw, 2.25rem);
		font-weight: 800;
		color: #fff;
		line-height: 1.1;
		letter-spacing: -0.02em;
	}

	.clan-tag {
		display: inline-block;
		padding: 2px 10px;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 700;
	}

	/* ── Big stat ── */
	.hero-stat {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.stat-glow {
		position: absolute;
		width: 220px;
		height: 80px;
		background: radial-gradient(ellipse, rgba(124, 58, 237, 0.4) 0%, transparent 70%);
		filter: blur(20px);
		pointer-events: none;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}

	.stat-value {
		position: relative;
		font-size: clamp(3rem, 10vw, 5.5rem);
		font-weight: 900;
		letter-spacing: -0.04em;
		background: linear-gradient(135deg, #fff 30%, #a78bfa 70%, #60a5fa);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		line-height: 1;
	}

	.stat-label {
		position: relative;
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: rgba(255,255,255,0.4);
		margin-top: 4px;
	}

	/* ── Hero level ── */
	.hero-level {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
	}

	.hero-level-name {
		font-size: clamp(1.1rem, 3vw, 1.5rem);
		font-weight: 700;
		color: rgba(255,255,255,0.85);
	}

	.hero-level-meta {
		font-size: 0.875rem;
		color: rgba(255,255,255,0.4);
	}

	.points-row {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		justify-content: center;
		margin-top: 4px;
	}

	.pt-badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 3px 10px;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 700;

		&.dl { background: rgba(124, 58, 237, 0.25); color: #c4b5fd; border: 1px solid rgba(124,58,237,0.3); }
		&.fl { background: rgba(234, 179, 8, 0.2);   color: #fde047; border: 1px solid rgba(234,179,8,0.3); }
		&.pl { background: rgba(59, 130, 246, 0.2);  color: #93c5fd; border: 1px solid rgba(59,130,246,0.3); }
		&.cl { background: rgba(34, 197, 94, 0.2);   color: #86efac; border: 1px solid rgba(34,197,94,0.3); }
	}

	/* ── Main content / tabs ── */
	.main-content {
		margin-top: 8px;
	}

	.tabs-bar {
		margin-bottom: 20px;
	}

	/* ── Custom tab bar ── */
	.custom-tabs {
		display: flex;
		gap: 4px;
		padding: 5px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 14px;
		backdrop-filter: blur(10px);
		overflow-x: auto;
		scrollbar-width: none;
		width: fit-content;
		margin-inline: auto;

		&::-webkit-scrollbar { display: none; }
	}

	.tab-btn {
		position: relative;
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 16px;
		border-radius: 10px;
		border: none;
		background: transparent;
		color: rgba(255, 255, 255, 0.4);
		font-size: 0.8rem;
		font-weight: 500;
		cursor: pointer;
		white-space: nowrap;
		transition: color 0.2s, background 0.2s;
		flex-shrink: 0;

		&:hover {
			color: rgba(255, 255, 255, 0.75);
			background: rgba(255, 255, 255, 0.06);
		}

		&.active {
			color: #fff;
			background: rgba(124, 58, 237, 0.2);
			border: 1px solid rgba(124, 58, 237, 0.35);
			font-weight: 600;
		}
	}

	.tab-glow {
		position: absolute;
		inset: 0;
		border-radius: 10px;
		background: radial-gradient(ellipse at center, rgba(124, 58, 237, 0.25) 0%, transparent 70%);
		pointer-events: none;
		animation: tabGlowPulse 2s ease-in-out infinite;
	}

	@keyframes tabGlowPulse {
		0%, 100% { opacity: 0.6; }
		50%       { opacity: 1; }
	}

	/* ── Glass cards ── */
	.glass-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
		gap: 14px;
	}

	.glass-card {
		background: rgba(255, 255, 255, 0.04);
		backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 14px;
		padding: 18px 20px;
		transition: border-color 0.2s;

		&:hover { border-color: rgba(255,255,255,0.14); }

		&.wide { grid-column: 1 / -1; }
		&.chart-card { grid-column: 1 / -1; }
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: 7px;
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: rgba(255,255,255,0.4);
		margin-bottom: 14px;
	}

	:global(.card-icon) { opacity: 0.6; }

	.card-rows {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.info-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		min-height: 24px;
	}

	.row-label {
		font-size: 0.8rem;
		font-weight: 600;
		color: rgba(255,255,255,0.5);
		flex-shrink: 0;
	}

	.row-value {
		font-size: 0.875rem;
		color: rgba(255,255,255,0.85);
		text-align: right;
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.row-highlight {
		font-weight: 700;
		font-size: 1rem;
		color: #fff;
	}

	.row-link {
		font-size: 0.8rem;
		color: #a78bfa;
		text-decoration: none;
		word-break: break-all;
		text-align: right;
		transition: color 0.15s;

		&:hover { color: #c4b5fd; text-decoration: underline; }
	}

	.row-badge {
		display: inline-flex;
		align-items: center;
		padding: 2px 10px;
		background: rgba(124,58,237,0.2);
		border: 1px solid rgba(124,58,237,0.3);
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		color: #c4b5fd;
	}

	.row-muted { color: rgba(255,255,255,0.3); }

	.device-badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 8px;
		border-radius: 6px;
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;

		&.mobile { background: rgba(59,130,246,0.2); color: #93c5fd; border: 1px solid rgba(59,130,246,0.3); }
		&.pc     { background: rgba(34,197,94,0.15); color: #86efac; border: 1px solid rgba(34,197,94,0.25); }
	}

	.fps-badge {
		display: inline-flex;
		align-items: center;
		padding: 2px 8px;
		background: rgba(255,255,255,0.08);
		border-radius: 6px;
		font-size: 0.7rem;
		font-weight: 700;
		color: rgba(255,255,255,0.7);
	}

	.mod-badge {
		display: inline-flex;
		padding: 2px 10px;
		background: rgba(255,255,255,0.1);
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.status-dot {
		display: inline-block;
		width: 7px;
		height: 7px;
		border-radius: 50%;
		flex-shrink: 0;

		&.ok   { background: #4ade80; box-shadow: 0 0 6px rgba(74,222,128,0.6); }
		&.warn { background: #fb923c; box-shadow: 0 0 6px rgba(251,146,60,0.6); }
	}

	.comment-block {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.reviewer-comment {
		font-size: 0.85rem;
		line-height: 1.6;
		padding: 10px 14px;
		background: rgba(255,255,255,0.03);
		border-left: 2px solid rgba(167,139,250,0.4);
		border-radius: 0 6px 6px 0;
		font-style: italic;
		color: rgba(255,255,255,0.7);
		margin: 0;
	}

	.comment-text {
		font-size: 0.925rem;
		line-height: 1.6;
		color: rgba(255,255,255,0.75);
	}

	.edit-inline-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border-radius: 6px;
		background: rgba(255,255,255,0.08);
		color: rgba(255,255,255,0.6);
		cursor: pointer;
		transition: all 0.15s;
		border: none;

		&:hover { background: rgba(255,255,255,0.15); color: #fff; }
	}

	.inline-edit-row {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 4px;
	}

	/* ── Chart ── */
	.chart-wrapper {
		height: 240px;
		width: 100%;
	}

	/* ── Share ── */
	.share-row {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	/* ── Skip ahead callouts ── */
	.skip-list {
		list-style: disc;
		list-style-position: inside;
		font-size: 0.875rem;
		display: flex;
		flex-direction: column;
		gap: 6px;
		color: rgba(255,255,255,0.75);
	}

	.info-callout {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		border-radius: 10px;
		font-size: 0.875rem;

		&.yellow { background: rgba(234,179,8,0.1);  border: 1px solid rgba(234,179,8,0.2);  color: #fde047; }
		&.green  { background: rgba(34,197,94,0.1);  border: 1px solid rgba(34,197,94,0.2);  color: #86efac; }
		&.blue   { background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.2); color: #93c5fd; }
	}

	/* ── Edit rows ── */
	.edit-row {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	:global(.edit-label) { width: 110px; flex-shrink: 0; font-size: 0.875rem; }

	/* ── Neon text ── */
	.neon-text {
		background: linear-gradient(135deg, #a78bfa, #60a5fa);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	/* ── Responsive ── */
	@media (max-width: 600px) {
		.glass-grid { grid-template-columns: 1fr; }
	}
</style>
