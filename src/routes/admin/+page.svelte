<script lang="ts">
	import Title from '$lib/components/Title.svelte';
	import { user } from '$lib/client';
	import { Button } from '$lib/components/ui/button/index.js';
	import { toast } from 'svelte-sonner';

	async function copyToken() {
		await navigator.clipboard.writeText((await $user.token())!);
		toast('Copied to clipboard!');
	}

	async function refresh() {
		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/refresh`, {
				method: 'PATCH',
				headers: {
					Authorization: 'Bearer ' + (await $user.token())
				}
			}),
			{
				success: 'Refreshed!',
				loading: 'Refreshing...',
				error: 'Failed to refresh.'
			}
		);
	}

	const categories = [
		{
			title: 'System',
			icon: '⚙️',
			items: [
				{ name: 'Refresh', action: refresh, type: 'button' },
				{ name: 'Copy Token', action: copyToken, type: 'button' },
				{ name: 'API Tester', href: '/admin/api' },
				{ name: 'Send Notification', href: '/admin/notification' }
			]
		},
		{
			title: 'Content Management',
			icon: '📝',
			items: [
				{ name: 'Level Manager', href: '/admin/level' },
				{ name: 'New Levels', href: '/admin/newLevels' },
				{ name: 'Rating Estimator', href: '/admin/ratingEstimator' },
				{ name: 'Map Pack', href: '/admin/mappack' }
			]
		},
		{
			title: 'Submissions & Records',
			icon: '📋',
			items: [
				{ name: 'Submission', href: '/admin/submission' },
				{ name: 'Add Record', href: '/admin/addRecord' }
			]
		},
		{
			title: 'Events',
			icon: '🎉',
			items: [
				{ name: 'Event Manager', href: '/admin/event' },
				{ name: 'Event Proofs', href: '/admin/eventProofs' }
			]
		},
		{
			title: 'User Management',
			icon: '👥',
			items: [{ name: 'Account Merger', href: '/admin/accountMerger' }]
		},
		{
			title: 'Features',
			icon: '✨',
			items: [{ name: 'Battlepass', href: '/admin/battlepass' }]
		}
	];
</script>

<svelte:head></svelte:head>

<Title value="Admin Dashboard" />

<div class="wrapper">
	<div class="categories-grid">
		{#each categories as category}
			<div class="category-card">
				<div class="category-header">
					<span class="category-icon">{category.icon}</span>
					<h2 class="category-title">{category.title}</h2>
				</div>
				<div class="category-items">
					{#each category.items as item}
						{#if item.type === 'button'}
							<Button on:click={item.action} class="admin-button" variant="outline">
								{item.name}
							</Button>
						{:else}
							<a href={item.href} class="admin-link">
								<span class="link-arrow">→</span>
								{item.name}
							</a>
						{/if}
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>

<style lang="scss">
	.wrapper {
		padding: 2rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	.header {
		margin-bottom: 3rem;
		text-align: center;

		h1 {
			font-size: 2.5rem;
			font-weight: 700;
			margin-bottom: 0.5rem;
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			-webkit-background-clip: text;
			-webkit-text-fill-color: transparent;
			background-clip: text;
		}

		.subtitle {
			font-size: 1.1rem;
			color: #888;
		}
	}

	.categories-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 1.5rem;
	}

	.category-card {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		padding: 1.5rem;
		transition: all 0.3s ease;

	}

	.category-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.category-icon {
		font-size: 1.75rem;
	}

	.category-title {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0;
	}

	.category-items {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	:global(.admin-button) {
		width: 100%;
		justify-content: flex-start;
		padding: 0.75rem 1rem;
		height: auto;
		font-size: 0.95rem;
		transition: all 0.2s ease;


	}

	.admin-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		color: #7cb4f8;
		text-decoration: none;
		border-radius: 6px;
		transition: all 0.2s ease;
		font-size: 0.95rem;
		border: 1px solid transparent;

		.link-arrow {
			opacity: 0;
			transform: translateX(-4px);
			transition: all 0.2s ease;
		}

	}

	@media (max-width: 768px) {
		.wrapper {
			padding: 1rem;
		}

		.header h1 {
			font-size: 2rem;
		}

		.categories-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
