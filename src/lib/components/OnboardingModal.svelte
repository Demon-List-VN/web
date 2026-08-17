<script lang="ts">
	import { _ } from 'svelte-i18n';
	import {
		BadgeCheck,
		Check,
		Gamepad2,
		Home,
		ListPlus,
		Loader2,
		MessageSquareText,
		Sparkles,
		Star,
		Trophy,
		UserRound
	} from 'lucide-svelte';
	import { user } from '$lib/client';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';

	export let open = false;

	type VerifiedList = {
		id: number;
		title: string;
		description?: string | null;
		levelCount?: number;
		starred?: boolean;
	};

	const TOTAL_STEPS = 7;

	let step = 1;
	let name = '';
	let nameError = '';
	let flowError = '';
	let loading = false;
	let initializedForOpen = false;
	let verifiedLists: VerifiedList[] = [];
	let verifiedListsLoaded = false;
	let verifiedListsLoading = false;
	let verifiedListsError = '';
	let selectedListId: number | null = null;

	$: uid = $user.data?.uid;
	$: skipName = $user.data?.renameCooldown != null;
	$: visibleTotal = skipName ? TOTAL_STEPS - 1 : TOTAL_STEPS;
	$: visibleStep = Math.min(
		visibleTotal,
		skipName && step >= 3 ? step - 1 : step
	);

	$: if (!open) {
		initializedForOpen = false;
	}

	$: if (open && !initializedForOpen && $user.data) {
		const savedStep = normalizeStep($user.data.onboarding_step);
		step = skipName && savedStep === 2 ? 3 : savedStep;
		name = '';
		initializedForOpen = true;

		if (skipName && savedStep === 2) {
			void patchOnboarding({ onboarding_step: 3 });
		}

		if (step === 3) {
			void loadVerifiedLists();
		}
	}

	function normalizeStep(value: unknown) {
		const parsed = Number(value);

		if (!Number.isInteger(parsed)) {
			return 1;
		}

		return Math.min(TOTAL_STEPS, Math.max(1, parsed));
	}

	async function patchOnboarding(body: Record<string, unknown>) {
		const token = await $user.token();

		return fetch(`${import.meta.env.VITE_API_URL}/players/${uid}/onboarding`, {
			method: 'PATCH',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(body)
		});
	}

	async function persistStep(nextStep: number) {
		const response = await patchOnboarding({ onboarding_step: nextStep });

		if (!response.ok) {
			throw new Error($_('onboarding.error_generic'));
		}

		step = nextStep;

		if (nextStep === 3) {
			void loadVerifiedLists();
		}
	}

	async function goToStep(nextStep: number) {
		if (loading) {
			return;
		}

		loading = true;
		flowError = '';

		try {
			await persistStep(nextStep);
		} catch (error) {
			flowError = error instanceof Error ? error.message : $_('onboarding.error_generic');
		} finally {
			loading = false;
		}
	}

	async function handleNameNext() {
		nameError = '';
		flowError = '';

		if (!/^[A-Za-z0-9]{3,30}$/.test(name)) {
			nameError = $_('onboarding.name_error_format');

			return;
		}

		loading = true;

		try {
			const response = await patchOnboarding({ name, onboarding_step: 3 });

			if (response.status === 409) {
				nameError = $_('onboarding.name_error_taken');

				return;
			}

			if (response.status === 400) {
				const body = await response.json()
					.catch(() => ({}));

				if (body.message?.includes('cooldown')) {
					nameError = $_('onboarding.name_error_cooldown');
				} else if (body.message?.includes('khóa')) {
					nameError = $_('onboarding.name_error_locked');
				} else {
					nameError = body.message || $_('onboarding.error_generic');
				}

				return;
			}

			if (!response.ok) {
				throw new Error($_('onboarding.error_generic'));
			}

			step = 3;
			void loadVerifiedLists();
		} catch (error) {
			flowError = error instanceof Error ? error.message : $_('onboarding.error_generic');
		} finally {
			loading = false;
		}
	}

	async function loadVerifiedLists(force = false) {
		if (verifiedListsLoading || (verifiedListsLoaded && !force)) {
			return;
		}

		verifiedListsLoading = true;
		verifiedListsError = '';

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/lists?kind=verified&limit=50&offset=0`,
				{
					headers: {
						Authorization: `Bearer ${await $user.token()}`
					}
				}
			);

			if (!response.ok) {
				throw new Error($_('onboarding.lists_error'));
			}

			const payload = await response.json();
			verifiedLists = Array.isArray(payload?.data) ? payload.data : [];
			verifiedListsLoaded = true;
		} catch (error) {
			verifiedListsError = error instanceof Error
				? error.message
				: $_('onboarding.lists_error');
		} finally {
			verifiedListsLoading = false;
		}
	}

	async function handleListNext() {
		if (loading || selectedListId == null) {
			return;
		}

		const selectedList = verifiedLists.find((list) => list.id === selectedListId);

		if (!selectedList) {
			return;
		}

		loading = true;
		flowError = '';

		try {
			if (!selectedList.starred) {
				const response = await fetch(
					`${import.meta.env.VITE_API_URL}/lists/${selectedList.id}/star`,
					{
						method: 'POST',
						headers: {
							Authorization: `Bearer ${await $user.token()}`
						}
					}
				);
				const payload = await response.json()
					.catch(() => null);

				if (!response.ok || payload?.starred !== true) {
					throw new Error(payload?.error || $_('onboarding.lists_star_error'));
				}

				verifiedLists = verifiedLists.map((list) => list.id === selectedList.id
					? { ...list, starred: true }
					: list);
			}

			await persistStep(4);
		} catch (error) {
			flowError = error instanceof Error ? error.message : $_('onboarding.error_generic');
		} finally {
			loading = false;
		}
	}

	async function handleComplete() {
		if (loading) {
			return;
		}

		loading = true;
		flowError = '';

		try {
			const response = await patchOnboarding({ onboarding_done: true });

			if (!response.ok) {
				throw new Error($_('onboarding.error_generic'));
			}

			open = false;
			await $user.refresh();
		} catch (error) {
			flowError = error instanceof Error ? error.message : $_('onboarding.error_generic');
		} finally {
			loading = false;
		}
	}

	function preventClose(event: Event) {
		event.stopPropagation();
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
		on:click={preventClose}
		role="presentation"
	></div>

	<div class="fixed inset-0 z-[9999] flex items-center justify-center p-4" role="presentation">
		<div
			class="onboarding-modal relative max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-2xl"
			role="dialog"
			aria-modal="true"
			aria-label={$_('onboarding.dialog_label')}
		>
			<div class="mb-6">
				<div class="mb-2 flex items-center justify-between text-xs text-muted-foreground">
					<span>{$_('onboarding.step_of', {
						values: { step: visibleStep, total: visibleTotal }
					})}</span>
					<span>{Math.round((visibleStep / visibleTotal) * 100)}%</span>
				</div>
				<div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
					<div
						class="h-full rounded-full bg-primary transition-all duration-300"
						style="width: {(visibleStep / visibleTotal) * 100}%"
					></div>
				</div>
			</div>

			{#if step === 1}
				<div class="space-y-5 text-center">
					<div class="step-icon mx-auto">
						<Sparkles class="h-8 w-8" />
					</div>
					<div>
						<h2 class="text-2xl font-bold">{$_('onboarding.welcome_title')}</h2>
						<p class="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
							{$_('onboarding.welcome_desc')}
						</p>
					</div>
					<div class="rounded-xl border border-border bg-muted/35 p-4 text-left">
						<p class="text-sm font-medium">{$_('onboarding.welcome_hint')}</p>
					</div>
					<Button class="w-full" on:click={() => goToStep(skipName ? 3 : 2)} disabled={loading}>
						{loading ? $_('onboarding.saving') : $_('onboarding.get_started')}
					</Button>
				</div>
			{:else if step === 2}
				<div class="space-y-5">
					<div class="step-icon">
						<UserRound class="h-7 w-7" />
					</div>
					<div>
						<h2 class="text-xl font-bold">{$_('onboarding.name_title')}</h2>
						<p class="mt-1 text-sm leading-6 text-muted-foreground">{$_('onboarding.name_desc')}</p>
					</div>
					<div class="space-y-2">
						<Input
							bind:value={name}
							placeholder={$_('onboarding.name_placeholder')}
							class={nameError ? 'border-red-500' : ''}
							on:keydown={(event) => event.key === 'Enter' && handleNameNext()}
						/>
						{#if nameError}
							<p class="text-sm text-red-500">{nameError}</p>
						{/if}
					</div>
					<div class="flex gap-2">
						<Button variant="outline" class="flex-1" on:click={() => goToStep(1)} disabled={loading}>
							{$_('onboarding.back')}
						</Button>
						<Button class="flex-1" on:click={handleNameNext} disabled={loading || !name}>
							{loading ? $_('onboarding.saving') : $_('onboarding.next')}
						</Button>
					</div>
				</div>
			{:else if step === 3}
				<div class="space-y-5">
					<div class="step-icon">
						<Star class="h-7 w-7" />
					</div>
					<div>
						<h2 class="text-xl font-bold">{$_('onboarding.lists_title')}</h2>
						<p class="mt-1 text-sm leading-6 text-muted-foreground">{$_('onboarding.lists_desc')}</p>
					</div>

					{#if verifiedListsLoading}
						<div class="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
							<Loader2 class="h-5 w-5 animate-spin" />
							{$_('onboarding.lists_loading')}
						</div>
					{:else if verifiedListsError}
						<div class="rounded-xl border border-red-300 bg-red-50 p-4 text-center dark:border-red-900 dark:bg-red-950/30">
							<p class="text-sm text-red-700 dark:text-red-300">{verifiedListsError}</p>
							<Button class="mt-3" variant="outline" on:click={() => loadVerifiedLists(true)}>
								{$_('onboarding.lists_retry')}
							</Button>
						</div>
					{:else if verifiedLists.length === 0}
						<div class="rounded-xl border border-border bg-muted/30 p-5 text-center">
							<p class="font-medium">{$_('onboarding.lists_empty_title')}</p>
							<p class="mt-1 text-sm text-muted-foreground">{$_('onboarding.lists_empty_desc')}</p>
						</div>
					{:else}
						<ScrollArea class="h-64 pr-3">
							<div class="space-y-2">
								{#each verifiedLists as list}
									<button
										type="button"
										class:selected={selectedListId === list.id}
										class="list-choice w-full rounded-xl border border-border p-4 text-left transition-colors hover:border-primary/60 hover:bg-muted/45"
										on:click={() => (selectedListId = list.id)}
										aria-pressed={selectedListId === list.id}
									>
										<div class="flex items-start gap-3">
											<div class="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
												<Trophy class="h-5 w-5" />
											</div>
											<div class="min-w-0 flex-1">
												<div class="flex flex-wrap items-center gap-2">
													<p class="font-semibold">{list.title}</p>
													<span class="verified-badge">
														<BadgeCheck class="h-3.5 w-3.5" />
														{$_('onboarding.lists_verified')}
													</span>
												</div>
												{#if list.description}
													<p class="mt-1 text-xs leading-5 text-muted-foreground">{list.description}</p>
												{/if}
												<div class="mt-2 flex gap-3 text-xs text-muted-foreground">
													<span>{$_('onboarding.lists_levels', { values: { count: list.levelCount ?? 0 } })}</span>
													{#if list.starred}
														<span class="flex items-center gap-1 text-amber-600 dark:text-amber-400">
															<Star class="h-3.5 w-3.5 fill-current" />
															{$_('onboarding.lists_starred')}
														</span>
													{/if}
												</div>
											</div>
											<div class="selection-mark">
												{#if selectedListId === list.id}
													<Check class="h-4 w-4" />
												{/if}
											</div>
										</div>
									</button>
								{/each}
							</div>
						</ScrollArea>
					{/if}

					<div class="flex gap-2">
						<Button
							variant="outline"
							class="flex-1"
							on:click={() => goToStep(skipName ? 1 : 2)}
							disabled={loading}
						>
							{$_('onboarding.back')}
						</Button>
						<Button
							class="flex-1"
							on:click={handleListNext}
							disabled={loading || selectedListId == null}
						>
							{loading ? $_('onboarding.saving') : $_('onboarding.star_and_continue')}
						</Button>
					</div>
				</div>
			{:else if step === 4}
				<div class="space-y-5">
					<div class="step-icon">
						<Gamepad2 class="h-7 w-7" />
					</div>
					<div>
						<h2 class="text-xl font-bold">{$_('onboarding.pvp_title')}</h2>
						<p class="mt-1 text-sm leading-6 text-muted-foreground">{$_('onboarding.pvp_desc')}</p>
					</div>
					<div class="intro-grid">
						<div class="intro-card">
							<Trophy class="h-5 w-5 text-primary" />
							<p>{$_('onboarding.pvp_ranked')}</p>
						</div>
						<div class="intro-card">
							<Gamepad2 class="h-5 w-5 text-primary" />
							<p>{$_('onboarding.pvp_missions')}</p>
						</div>
					</div>
					<div class="flex gap-2">
						<Button variant="outline" class="flex-1" on:click={() => goToStep(3)} disabled={loading}>
							{$_('onboarding.back')}
						</Button>
						<Button class="flex-1" on:click={() => goToStep(5)} disabled={loading}>
							{$_('onboarding.next')}
						</Button>
					</div>
				</div>
			{:else if step === 5}
				<div class="space-y-5">
					<div class="step-icon">
						<ListPlus class="h-7 w-7" />
					</div>
					<div>
						<h2 class="text-xl font-bold">{$_('onboarding.create_list_title')}</h2>
						<p class="mt-1 text-sm leading-6 text-muted-foreground">{$_('onboarding.create_list_desc')}</p>
					</div>
					<div class="rounded-xl border border-border bg-muted/30 p-4">
						<ul class="space-y-3 text-sm">
							<li class="flex items-start gap-2">
								<Check class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
								<span>{$_('onboarding.create_list_collect')}</span>
							</li>
							<li class="flex items-start gap-2">
								<Check class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
								<span>{$_('onboarding.create_list_share')}</span>
							</li>
						</ul>
					</div>
					<div class="flex gap-2">
						<Button variant="outline" class="flex-1" on:click={() => goToStep(4)} disabled={loading}>
							{$_('onboarding.back')}
						</Button>
						<Button class="flex-1" on:click={() => goToStep(6)} disabled={loading}>
							{$_('onboarding.next')}
						</Button>
					</div>
				</div>
			{:else if step === 6}
				<div class="space-y-5">
					<div class="step-icon">
						<MessageSquareText class="h-7 w-7" />
					</div>
					<div>
						<h2 class="text-xl font-bold">{$_('onboarding.community_title')}</h2>
						<p class="mt-1 text-sm leading-6 text-muted-foreground">{$_('onboarding.community_desc')}</p>
					</div>
					<div class="intro-grid">
						<div class="intro-card items-start">
							<MessageSquareText class="h-5 w-5 shrink-0 text-primary" />
							<div>
								<p class="font-semibold">{$_('onboarding.community_posts_title')}</p>
								<p class="mt-1 text-xs leading-5 text-muted-foreground">{$_('onboarding.community_posts_desc')}</p>
							</div>
						</div>
						<div class="intro-card items-start">
							<Home class="h-5 w-5 shrink-0 text-primary" />
							<div>
								<p class="font-semibold">{$_('onboarding.home_feed_title')}</p>
								<p class="mt-1 text-xs leading-5 text-muted-foreground">{$_('onboarding.home_feed_desc')}</p>
							</div>
						</div>
					</div>
					<div class="flex gap-2">
						<Button variant="outline" class="flex-1" on:click={() => goToStep(5)} disabled={loading}>
							{$_('onboarding.back')}
						</Button>
						<Button class="flex-1" on:click={() => goToStep(7)} disabled={loading}>
							{$_('onboarding.next')}
						</Button>
					</div>
				</div>
			{:else}
				<div class="space-y-5 text-center">
					<div class="step-icon mx-auto">
						<Check class="h-8 w-8" />
					</div>
					<div>
						<h2 class="text-2xl font-bold">{$_('onboarding.done_title')}</h2>
						<p class="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
							{$_('onboarding.done_desc')}
						</p>
					</div>
					<div class="rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm">
						{$_('onboarding.done_hint')}
					</div>
					<div class="flex gap-2">
						<Button variant="outline" class="flex-1" on:click={() => goToStep(6)} disabled={loading}>
							{$_('onboarding.back')}
						</Button>
						<Button class="flex-1" on:click={handleComplete} disabled={loading}>
							{loading ? $_('onboarding.saving') : $_('onboarding.done_close')}
						</Button>
					</div>
				</div>
			{/if}

			{#if flowError}
				<p class="mt-4 text-center text-sm text-red-500">{flowError}</p>
			{/if}
		</div>
	</div>
{/if}

<style lang="scss">
	.onboarding-modal {
		animation: modal-in 180ms ease-out;
	}

	.step-icon {
		display: flex;
		height: 3.5rem;
		width: 3.5rem;
		align-items: center;
		justify-content: center;
		border-radius: 1rem;
		background: hsl(var(--primary) / 0.1);
		color: hsl(var(--primary));
	}

	.list-choice.selected {
		border-color: hsl(var(--primary));
		background: hsl(var(--primary) / 0.07);
	}

	.verified-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		border-radius: 9999px;
		background: hsl(var(--primary) / 0.1);
		padding: 0.125rem 0.5rem;
		font-size: 0.7rem;
		font-weight: 600;
		color: hsl(var(--primary));
	}

	.selection-mark {
		display: flex;
		height: 1.25rem;
		width: 1.25rem;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		border: 1px solid hsl(var(--border));
		border-radius: 9999px;
		color: white;
	}

	.list-choice.selected .selection-mark {
		border-color: hsl(var(--primary));
		background: hsl(var(--primary));
	}

	.intro-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.intro-card {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		border: 1px solid hsl(var(--border));
		border-radius: 0.75rem;
		padding: 1rem;
		font-size: 0.875rem;
	}

	@keyframes modal-in {
		from {
			opacity: 0;
			transform: translateY(8px) scale(0.985);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	@media (max-width: 520px) {
		.intro-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.onboarding-modal {
			animation: none;
		}
	}
</style>
