<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { onMount } from 'svelte';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import Lock from 'lucide-svelte/icons/lock';
	import Check from 'lucide-svelte/icons/check';
	import Gift from 'lucide-svelte/icons/gift';

	let loading = true;
	let mounted = false;
	let courseData: any = null;

	async function fetchCourse() {
		loading = true;
		try {
			const token = $user.loggedIn ? await $user.token() : null;
			const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
			const res = await fetch(`${import.meta.env.VITE_API_URL}/battlepass/course`, { headers });
			if (res.ok) {
				courseData = await res.json();
			} else {
				courseData = null;
			}
		} catch (e) {
			console.error('Failed to fetch course:', e);
			courseData = null;
		} finally {
			loading = false;
		}
	}

	async function claimEntry(entryId: number) {
		if (!$user.loggedIn) {
			toast.error('Please login to claim rewards');
			return;
		}

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/battlepass/course/entry/${entryId}/claim`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${await $user.token()}`
				}
			});

			if (!res.ok) {
				const payload = await res.json().catch(() => ({}));
				toast.error(payload.message || 'Failed to claim reward');
				return;
			}

			toast.success('Reward claimed');
			await fetchCourse();
		} catch (e) {
			toast.error('Failed to claim reward');
		}
	}

	onMount(() => {
		mounted = true;
		fetchCourse();

		const unsub = user.subscribe(async () => {
			if (!mounted) return;
			await fetchCourse();
		});

		return () => {
			mounted = false;
			unsub();
		};
	});
</script>

<div class="mb-4 text-center">
	<h2 class="text-2xl font-bold">Course Mode</h2>
	<p class="text-muted-foreground">Clear each unlocked level or map pack to unlock the next one.</p>
</div>

{#if loading}
	<div class="grid gap-4">
		<Skeleton class="h-28 w-full" />
		<Skeleton class="h-28 w-full" />
		<Skeleton class="h-28 w-full" />
	</div>
{:else if !courseData}
	<div class="rounded-lg border p-6 text-center text-muted-foreground">No course linked to this season</div>
{:else}
	<Card.Root class="mb-4">
		<Card.Header>
			<Card.Title>{courseData.course?.title || 'Course'}</Card.Title>
			{#if courseData.course?.description}
				<p class="text-sm text-muted-foreground">{courseData.course.description}</p>
			{/if}
		</Card.Header>
	</Card.Root>

	<div class="flex flex-col gap-3">
		{#each courseData.entries || [] as entry, index}
			<Card.Root class="border-2 {entry.completed ? 'border-green-500/40' : entry.unlocked ? 'border-primary/40' : 'border-border'}">
				<Card.Content class="flex items-center justify-between p-4">
					<div class="flex items-center gap-3">
						<div class="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold">
							{index + 1}
						</div>
						<div>
							<div class="font-semibold">
								{entry.type === 'level' ? 'Level' : 'Map Pack'} #{entry.refId}
							</div>
							<div class="text-xs text-muted-foreground">
								Reward:
								{#if entry.rewardXp > 0}
									+{entry.rewardXp} XP
								{/if}
								{#if entry.rewardXp > 0 && entry.rewardItemId}
									 •
								{/if}
								{#if entry.rewardItemId}
									Item #{entry.rewardItemId} x{entry.rewardQuantity}
								{/if}
							</div>
						</div>
					</div>
					<div class="flex items-center gap-2">
						{#if entry.claimed}
							<div class="flex items-center gap-1 text-sm text-green-500">
								<Check class="h-4 w-4" />
								Claimed
							</div>
						{:else if !entry.unlocked}
							<div class="flex items-center gap-1 text-sm text-muted-foreground">
								<Lock class="h-4 w-4" />
								Locked
							</div>
						{:else if !entry.completed}
							<div class="text-sm text-yellow-500">In Progress</div>
						{:else}
							<Button size="sm" on:click={() => claimEntry(entry.id)}>
								<Gift class="mr-1 h-4 w-4" />
								Claim
							</Button>
						{/if}
					</div>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
{/if}
