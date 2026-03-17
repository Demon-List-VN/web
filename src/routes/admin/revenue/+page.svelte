<script lang="ts">
	import Title from '$lib/components/Title.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import Loading from '$lib/components/animation/loading.svelte';
	import Chart from 'chart.js/auto';
	import 'chartjs-adapter-date-fns';

	let loading = true;
	let period = '30d';
	let dateFrom = '';
	let dateTo = '';
	let analyticsData: any = null;

	const PERIOD_OPTIONS = [
		{ value: '7d', label: 'Last 7 days' },
		{ value: '30d', label: 'Last 30 days' },
		{ value: '90d', label: 'Last 90 days' },
		{ value: 'all', label: 'All time' },
		{ value: 'custom', label: 'Custom range' }
	];

	const PRODUCT_COLORS = [
		'rgba(59, 130, 246, 0.8)',
		'rgba(16, 185, 129, 0.8)',
		'rgba(245, 158, 11, 0.8)',
		'rgba(239, 68, 68, 0.8)',
		'rgba(139, 92, 246, 0.8)',
		'rgba(236, 72, 153, 0.8)',
		'rgba(6, 182, 212, 0.8)',
		'rgba(251, 146, 60, 0.8)'
	];

	const STATUS_COLORS: Record<string, string> = {
		PAID: 'rgba(16, 185, 129, 0.8)',
		PENDING: 'rgba(245, 158, 11, 0.8)',
		CANCELLED: 'rgba(239, 68, 68, 0.8)',
		EXPIRED: 'rgba(107, 114, 128, 0.8)'
	};

	const METHOD_COLORS: Record<string, string> = {
		'Bank Transfer': 'rgba(59, 130, 246, 0.8)',
		COD: 'rgba(16, 185, 129, 0.8)',
		Coupon: 'rgba(139, 92, 246, 0.8)'
	};

	onMount(async () => {
		await fetchAnalytics();
	});

	async function fetchAnalytics() {
		loading = true;
		try {
			const params =
				period === 'custom' && dateFrom && dateTo
					? `from=${dateFrom}&to=${dateTo}`
					: `period=${period}`;

			const res = await fetch(`${import.meta.env.VITE_API_URL}/analytics/revenue?${params}`, {
				headers: {
					Authorization: `Bearer ${await $user.token()}`
				}
			});

			if (res.ok) {
				analyticsData = await res.json();
			} else {
				toast.error('Failed to fetch analytics data');
			}
		} catch (err) {
			toast.error('An error occurred while fetching analytics');
		}
		loading = false;
	}

	function formatVND(amount: number) {
		return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
	}

	function handlePeriodChange(v: any) {
		if (v) {
			period = v.value;
			if (period !== 'custom') {
				fetchAnalytics();
			}
		}
	}

	function getTimeUnit() {
		if (period === 'custom' && dateFrom && dateTo) {
			const days = (new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / 86400000;
			if (days <= 14) return 'day';
			if (days <= 90) return 'week';
			return 'month';
		}
		return period === '7d' ? 'day' : period === '90d' || period === 'all' ? 'month' : 'week';
	}

	function createRevenueChart(node: HTMLCanvasElement) {
		if (!analyticsData?.revenueOverTime?.length) return;

		const data = analyticsData.revenueOverTime;

		new Chart(node, {
			type: 'bar',
			data: {
				labels: data.map((d: any) => d.date),
				datasets: [
					{
						label: 'Revenue (VND)',
						data: data.map((d: any) => d.revenue),
						backgroundColor: 'rgba(59, 130, 246, 0.6)',
						borderColor: 'rgba(59, 130, 246, 1)',
						borderWidth: 1,
						borderRadius: 4
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				scales: {
					x: {
						type: 'time',
						time: { unit: getTimeUnit(), tooltipFormat: 'PP' },
						grid: { display: false }
					},
					y: {
						beginAtZero: true,
						ticks: {
							callback: (val: any) =>
								new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(val)
						}
					}
				},
				plugins: {
					tooltip: {
						callbacks: {
							label: (ctx: any) => formatVND(ctx.parsed.y)
						}
					}
				}
			}
		});
	}

	function createProductChart(node: HTMLCanvasElement) {
		if (!analyticsData?.revenueByProduct?.length) return;

		const data = analyticsData.revenueByProduct;

		new Chart(node, {
			type: 'doughnut',
			data: {
				labels: data.map((d: any) => d.productName),
				datasets: [
					{
						data: data.map((d: any) => d.revenue),
						backgroundColor: data.map(
							(_: any, i: number) => PRODUCT_COLORS[i % PRODUCT_COLORS.length]
						),
						borderWidth: 2,
						borderColor: 'rgba(0, 0, 0, 0.1)'
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					tooltip: {
						callbacks: {
							label: (ctx: any) => `${ctx.label}: ${formatVND(ctx.parsed)}`
						}
					}
				}
			}
		});
	}

	function createPaymentChart(node: HTMLCanvasElement) {
		if (!analyticsData?.revenueByPaymentMethod?.length) return;

		const data = analyticsData.revenueByPaymentMethod;

		new Chart(node, {
			type: 'doughnut',
			data: {
				labels: data.map((d: any) => d.method),
				datasets: [
					{
						data: data.map((d: any) => d.revenue),
						backgroundColor: data.map(
							(d: any) => METHOD_COLORS[d.method] || 'rgba(107, 114, 128, 0.8)'
						),
						borderWidth: 2,
						borderColor: 'rgba(0, 0, 0, 0.1)'
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					tooltip: {
						callbacks: {
							label: (ctx: any) => `${ctx.label}: ${formatVND(ctx.parsed)}`
						}
					}
				}
			}
		});
	}

	function createStatusChart(node: HTMLCanvasElement) {
		if (!analyticsData?.orderStatusDistribution?.length) return;

		const data = analyticsData.orderStatusDistribution;

		new Chart(node, {
			type: 'doughnut',
			data: {
				labels: data.map((d: any) => d.state),
				datasets: [
					{
						data: data.map((d: any) => d.count),
						backgroundColor: data.map(
							(d: any) => STATUS_COLORS[d.state] || 'rgba(107, 114, 128, 0.8)'
						),
						borderWidth: 2,
						borderColor: 'rgba(0, 0, 0, 0.1)'
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					tooltip: {
						callbacks: {
							label: (ctx: any) => `${ctx.label}: ${ctx.parsed} orders`
						}
					}
				}
			}
		});
	}
</script>

<svelte:head></svelte:head>

{#if $user.data.isManager}
	<Title value="Revenue Analytics" />

	<div class="wrapper">
		<div class="header">
			<h1>Revenue Analytics</h1>
			<div class="header-controls">
				<Select.Root
					selected={{
						value: period,
						label: PERIOD_OPTIONS.find((o) => o.value === period)?.label || 'Last 30 days'
					}}
					onSelectedChange={handlePeriodChange}
				>
					<Select.Trigger class="w-[180px]">
						<Select.Value placeholder="Select period" />
					</Select.Trigger>
					<Select.Content>
						{#each PERIOD_OPTIONS as opt}
							<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
				{#if period === 'custom'}
					<div class="date-range">
						<input type="date" bind:value={dateFrom} class="date-input" />
						<span class="date-separator">to</span>
						<input type="date" bind:value={dateTo} class="date-input" />
						<button class="apply-btn" on:click={fetchAnalytics} disabled={!dateFrom || !dateTo}>
							Apply
						</button>
					</div>
				{/if}
			</div>
		</div>

		{#if loading}
			<div class="flex justify-center py-12">
				<Loading inverted={true} />
			</div>
		{:else if analyticsData}
			<!-- Summary Cards -->
			<div class="summary-grid">
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium text-muted-foreground">Total Revenue</Card.Title>
					</Card.Header>
					<Card.Content>
						<p class="stat">{formatVND(analyticsData.summary.totalRevenue)}</p>
					</Card.Content>
				</Card.Root>
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium text-muted-foreground">Paid Orders</Card.Title>
					</Card.Header>
					<Card.Content>
						<p class="stat">{analyticsData.summary.orderCount}</p>
					</Card.Content>
				</Card.Root>
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium text-muted-foreground"
							>Avg Order Value</Card.Title
						>
					</Card.Header>
					<Card.Content>
						<p class="stat">{formatVND(analyticsData.summary.averageOrderValue)}</p>
					</Card.Content>
				</Card.Root>
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium text-muted-foreground">Total Fees</Card.Title>
					</Card.Header>
					<Card.Content>
						<p class="stat">{formatVND(analyticsData.summary.totalFees)}</p>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Revenue Over Time -->
			<Card.Root class="mt-6">
				<Card.Header>
					<Card.Title>Revenue Over Time</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="chart-container">
						{#key analyticsData}
							<canvas use:createRevenueChart />
						{/key}
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Product Breakdown + Payment Methods -->
			<div class="charts-row">
				<Card.Root>
					<Card.Header>
						<Card.Title>Revenue by Product</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="chart-container-sm">
							{#key analyticsData}
								<canvas use:createProductChart />
							{/key}
						</div>
						{#if analyticsData.revenueByProduct?.length}
							<Table.Root class="mt-4">
								<Table.Header>
									<Table.Row>
										<Table.Head>Product</Table.Head>
										<Table.Head class="text-right">Revenue</Table.Head>
										<Table.Head class="text-right">Orders</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each analyticsData.revenueByProduct as product}
										<Table.Row>
											<Table.Cell class="font-medium">{product.productName}</Table.Cell>
											<Table.Cell class="text-right">{formatVND(product.revenue)}</Table.Cell>
											<Table.Cell class="text-right">{product.orderCount}</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						{/if}
					</Card.Content>
				</Card.Root>

				<div class="charts-col">
					<Card.Root>
						<Card.Header>
							<Card.Title>Payment Methods</Card.Title>
						</Card.Header>
						<Card.Content>
							<div class="chart-container-sm">
								{#key analyticsData}
									<canvas use:createPaymentChart />
								{/key}
							</div>
						</Card.Content>
					</Card.Root>

					<Card.Root>
						<Card.Header>
							<Card.Title>Order Status</Card.Title>
						</Card.Header>
						<Card.Content>
							<div class="chart-container-sm">
								{#key analyticsData}
									<canvas use:createStatusChart />
								{/key}
							</div>
						</Card.Content>
					</Card.Root>
				</div>
			</div>

			<!-- Revenue by User -->
			{#if analyticsData.revenueByUser?.length}
				<Card.Root class="mt-6">
					<Card.Header>
						<Card.Title>Revenue by User</Card.Title>
					</Card.Header>
					<Card.Content>
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head class="w-[50px]">#</Table.Head>
									<Table.Head>User</Table.Head>
									<Table.Head class="text-right">Total Spent</Table.Head>
									<Table.Head class="text-right">% of Total</Table.Head>
									<Table.Head class="text-right">Orders</Table.Head>
									<Table.Head class="text-right">Avg Order</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each analyticsData.revenueByUser as u, i}
									<Table.Row>
										<Table.Cell>{i + 1}</Table.Cell>
										<Table.Cell class="font-medium">
											<a href="/player/{u.userID}" class="user-link">
												{u.userName}
											</a>
										</Table.Cell>
										<Table.Cell class="text-right">{formatVND(u.revenue)}</Table.Cell>
										<Table.Cell class="text-right">
												{analyticsData.summary.totalRevenue > 0
													? ((u.revenue / analyticsData.summary.totalRevenue) * 100).toFixed(1)
													: '0.0'}%
											</Table.Cell>
										<Table.Cell class="text-right">{u.orderCount}</Table.Cell>
										<Table.Cell class="text-right">
											{formatVND(Math.round(u.revenue / u.orderCount))}
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</Card.Content>
				</Card.Root>
			{/if}
		{/if}
	</div>
{/if}

<style lang="scss">
	.wrapper {
		padding: 2rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
		gap: 1rem;

		h1 {
			font-size: 1.5rem;
			font-weight: 700;
		}
	}

	.header-controls {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.date-range {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.date-input {
		padding: 0.4rem 0.6rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.05);
		color: inherit;
		font-size: 0.875rem;

		&::-webkit-calendar-picker-indicator {
			filter: invert(1);
		}
	}

	.date-separator {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.apply-btn {
		padding: 0.4rem 1rem;
		border: 1px solid rgba(59, 130, 246, 0.5);
		border-radius: 6px;
		background: rgba(59, 130, 246, 0.15);
		color: rgb(147, 197, 253);
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s ease;

		&:hover:not(:disabled) {
			background: rgba(59, 130, 246, 0.3);
		}

		&:disabled {
			opacity: 0.4;
			cursor: not-allowed;
		}
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
	}

	.stat {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.chart-container {
		width: 100%;
		height: 350px;
		position: relative;
	}

	.chart-container-sm {
		width: 100%;
		height: 250px;
		position: relative;
	}

	.charts-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
		margin-top: 1.5rem;
	}

	.charts-col {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.user-link {
		color: #7cb4f8;
		text-decoration: none;

		&:hover {
			text-decoration: underline;
		}
	}

	@media (max-width: 900px) {
		.wrapper {
			padding: 1rem;
		}

		.summary-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.charts-row {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 500px) {
		.summary-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
