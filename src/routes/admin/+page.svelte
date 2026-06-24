<script lang="ts">
	import Title from '$lib/components/Title.svelte';
	import { user } from '$lib/client';
	import { Button } from '$lib/components/ui/button/index.js';
	import { toast } from 'svelte-sonner';

	type AdminItem = {
		name: string;
		action?: () => Promise<void>;
		type?: 'button';
		href?: string;
		managerAccess?: boolean;
	};

	type AdminCategory = {
		title: string;
		icon: string;
		items: AdminItem[];
	};

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

	async function calculateContestRating() {
		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/refresh/contest-rating`, {
				method: 'PATCH',
				headers: {
					Authorization: 'Bearer ' + (await $user.token())
				}
			}),
			{
				success: 'Calculated contest rating!',
				loading: 'Calculating contest rating...',
				error: 'Failed to calculate contest rating.'
			}
		);
	}

	async function testDiscordGeneralMessage() {
		const token = await $user.token();

		toast.promise(
			fetch(
				`${import.meta.env.VITE_API_URL}/notifications/discord/general-test`,
				{
					method: 'POST',
					headers: {
						Authorization: 'Bearer ' + token
					}
				}
			)
				.then((response) => {
					if (!response.ok) {
						throw new Error('Failed to send Discord message.');
					}

					return response;
				}),
			{
				success: 'Sent test message to Discord general!',
				loading: 'Sending Discord test message...',
				error: 'Failed to send Discord test message.'
			}
		);
	}

	$: visibleCategories = $user.data?.isAdmin
		? categories
		: categories
			.map((category) => ({
				...category,
				items: category.items.filter((item) => item.managerAccess)
			}))
			.filter((category) => category.items.length > 0);

	const categories: AdminCategory[] = [
		{
			title: 'Levels & Records',
			icon: '📊',
			items: [
				{ name: 'Level Manager', href: '/admin/level' },
				{ name: 'Level Tags', href: '/admin/level?tab=tags' },
				{ name: 'New Levels', href: '/admin/newLevels' },
				{ name: 'Rating Estimator', href: '/admin/ratingEstimator' },
				{ name: 'Map Pack', href: '/admin/mappack' },
				{ name: 'Submission', href: '/admin/submission' },
				{ name: 'Level Submissions', href: '/admin/levelSubmissions' },
				{ name: 'Add Record', href: '/admin/addRecord' }
			]
		},
		{
			title: 'PvP',
			icon: '⚔️',
			items: [
				{ name: 'PvP Events', href: '/admin/pvpEvents' },
				{ name: 'PvP Reports', href: '/admin/pvpReports' },
				{ name: 'PvP Required Submission', href: '/admin/pvpRequiredSubmission' }
			]
		},
		{
			title: 'Events',
			icon: '🎉',
			items: [
				{ name: 'Event Manager', href: '/admin/event' },
				{ name: 'Event Proofs', href: '/admin/eventProofs' },
				{
					name: 'Calculate Contest Rating',
					action: calculateContestRating,
					type: 'button'
				}
			]
		},
		{
			title: 'Users & Moderation',
			icon: '👥',
			items: [
				{
					name: 'Give Item',
					href: '/admin/giveItem',
					managerAccess: true
				},
				{
					name: 'Player Inventory',
					href: '/admin/inventory',
					managerAccess: true
				},
				{ name: 'Account Merger', href: '/admin/accountMerger' },
				{ name: 'Player Convictions', href: '/admin/convictions' }
			]
		},
		{
			title: 'Items & Progression',
			icon: '✨',
			items: [
				{ name: 'Battlepass', href: '/admin/battlepass' },
				{ name: 'Battlepass Courses', href: '/admin/battlepass/course' },
				{ name: 'Cosmetics', href: '/admin/cosmetics' }
			]
		},
		{
			title: 'Store & Revenue',
			icon: '💰',
			items: [
				{ name: 'Revenue Analytics', href: '/admin/revenue' },
				{
					name: 'Donation Manager',
					href: '/admin/donations',
					managerAccess: true
				}
			]
		},
		{
			title: 'Community & Notifications',
			icon: '💬',
			items: [
				{ name: 'Community Posts', href: '/admin/community' },
				{ name: 'Post Tags', href: '/admin/community?tab=tags' },
				{ name: 'Notification Manager', href: '/admin/notification' }
			]
		},
		{
			title: 'System & Tools',
			icon: '⚙️',
			items: [
				{ name: 'Refresh', action: refresh, type: 'button' },
				{ name: 'Copy Token', action: copyToken, type: 'button' },
				{
					name: 'Test Discord General Message',
					action: testDiscordGeneralMessage,
					type: 'button'
				},
				{ name: 'API Tester', href: '/admin/api' }
			]
		}
	];
</script>

<svelte:head></svelte:head>

<Title value="Admin Dashboard" />

<div class="wrapper">
  <div class="categories-grid">
    {#each visibleCategories as category}
      <div class="category-card">
        <div class="category-header">
          <span class="category-icon">{category.icon}</span>
          <h2 class="category-title">{category.title}</h2>
        </div>
        <div class="category-items">
          {#each category.items as item}
            {#if item.type === 'button'}
              <Button
                on:click={() => item.action?.()}
                class="admin-button"
                variant="outline"
              >
                {item.name}
              </Button>
            {:else}
              <a href={item.href ?? '#'} class="admin-link">
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

  .categories-grid {
    grid-template-columns: 1fr;
  }
}
</style>
