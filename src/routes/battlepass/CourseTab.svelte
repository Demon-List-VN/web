<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { onMount } from 'svelte';
	import { user } from '$lib/client';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import Lock from 'lucide-svelte/icons/lock';
	import Check from 'lucide-svelte/icons/check';

	let loading = true;
	let mounted = false;
	let courseData: any = null;
	const COURSE_CLEAR_XP = 100;

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
	<h2 class="text-2xl font-bold">{$_('battlepass.course.title')}</h2>
	<p class="text-muted-foreground">{$_('battlepass.course.description')}</p>
</div>

{#if loading}
	<div class="grid gap-4">
		<Skeleton class="h-28 w-full" />
		<Skeleton class="h-28 w-full" />
		<Skeleton class="h-28 w-full" />
	</div>
{:else if !courseData}
	<div class="rounded-lg border p-6 text-center text-muted-foreground">{$_('battlepass.course.no_course')}</div>
{:else}
	<Card.Root class="mb-4">
		<Card.Header>
			<Card.Title>{courseData.course?.title || $_('battlepass.course.fallback_name')}</Card.Title>
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
								{entry.type === 'level' ? $_('battlepass.course.entry_level') : $_('battlepass.course.entry_mappack')} #{entry.refId}
							</div>
							<div class="text-xs text-muted-foreground">
								{$_('battlepass.course.on_clear', { values: { xp: COURSE_CLEAR_XP } })}
								{#if entry.rewardItemId}
									 •
								{/if}
								{#if entry.rewardItemId}
									{$_('battlepass.course.bonus_item', { values: { itemId: entry.rewardItemId, quantity: entry.rewardQuantity } })}
								{/if}
							</div>
						</div>
					</div>
					<div class="flex items-center gap-2">
						{#if entry.completed}
							<div class="flex items-center gap-1 text-sm text-green-500">
								<Check class="h-4 w-4" />
								{$_('battlepass.course.completed', { values: { xp: COURSE_CLEAR_XP } })}
							</div>
						{:else if !entry.unlocked}
							<div class="flex items-center gap-1 text-sm text-muted-foreground">
								<Lock class="h-4 w-4" />
								{$_('battlepass.locked')}
							</div>
						{:else if !entry.completed}
							<div class="text-sm text-yellow-500">{$_('battlepass.course.in_progress')}</div>
						{/if}
					</div>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
{/if}
