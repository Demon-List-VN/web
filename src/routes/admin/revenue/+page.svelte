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
	let analyticsData: any = null;

	const PERIOD_OPTIONS = [
		{ value: '7d', label: 'Last 7 days' },
		{ value: '30d', label: 'Last 30 days' },
		{ value: '90d', label: 'Last 90 days' },
		{ value: 'all', label: 'All time' }
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
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/analytics/revenue?period=${period}`,
				{
					headers: {
						Authorization: `Bearer ${await $user.token()}`
					}
				}
			);

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
			fetchAnalytics();
		}
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
						time: { unit: period === '7d' ? 'day' : period === '90d' || period === 'all' ? 'month' : 'week', tooltipFormat: 'PP' },
						grid: { display: false }
					},
					y: {
						beginAtZero: true,
						ticks: {
							callback: (val: any) => new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(val)
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
						backgroundColor: data.map((_: any, i: number) => PRODUCT_COLORS[i % PRODUCT_COLORS.length]),
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
						backgroundColor: data.map((d: any) => METHOD_COLORS[d.method] || 'rgba(107, 114, 128, 0.8)'),
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
						backgroundColor: data.map((d: any) => STATUS_COLORS[d.state] || 'rgba(107, 114, 128, 0.8)'),
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

<Title value="Revenue Analytics" />

<div class="wrapper">
	<div class="header">
		<h1>Revenue Analytics</h1>
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
					<Card.Title class="text-sm font-medium text-muted-foreground"
						>Total Revenue</Card.Title
					>
				</Card.Header>
				<Card.Content>
					<p class="stat">{formatVND(analyticsData.summary.totalRevenue)}</p>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header class="pb-2">
					<Card.Title class="text-sm font-medium text-muted-foreground"
						>Paid Orders</Card.Title
					>
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
					<Card.Title class="text-sm font-medium text-muted-foreground"
						>Total Fees</Card.Title
					>
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
										<Table.Cell class="text-right"
											>{formatVND(product.revenue)}</Table.Cell
										>
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
	{/if}
</div>

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

		h1 {
			font-size: 1.5rem;
			font-weight: 700;
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
