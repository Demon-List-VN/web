<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { user } from '$lib/client';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { onMount } from 'svelte';

	export let open = false;

	const TOTAL = 9;
	const GEODE_URL = 'https://github.com/NamPE286/DemonListVN-geode-mod/releases';
	const DISCORD_URL = 'https://discord.gg/fybxJ9Y344';
	const DISCORD_OAUTH_URL =
		'https://discord.com/oauth2/authorize?client_id=1071500325338488843&response_type=code&redirect_uri=https%3A%2F%2Fapi.gdvn.net%2Fauth%2Fcallback%2Fdiscord&scope=identify';

	let step = 1;
	let name = '';
	let nameError = '';
	let youtube = '';
	let facebook = '';
	let loading = false;
	let provinces: Record<string, any> = {};
	let provinceItem: { value: string | null; label?: string } = { value: null };
	let cityItem: { value: string | null; label?: string } = { value: null };

	$: uid = $user.data?.uid;

	// Resume from saved step
	$: if (open && $user.data?.onboarding_step) {
		step = $user.data.onboarding_step;
	}

	onMount(() => {
		fetch(`${import.meta.env.VITE_API_URL}/provinces`)
			.then((res) => res.json())
			.then((res) => {
				provinces = res;
			});
	});

	async function patchOnboarding(body: Record<string, any>) {
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

	async function goToStep(n: number) {
		await patchOnboarding({ onboarding_step: n });
		step = n;
	}

	async function handleNameNext() {
		nameError = '';
		if (!/^[A-Za-z0-9]{3,30}$/.test(name)) {
			nameError = $_('onboarding.name_error_format');
			return;
		}
		loading = true;
		try {
			const res = await patchOnboarding({ name });
			if (res.status === 409) {
				nameError = $_('onboarding.name_error_taken');
				return;
			}
			if (res.status === 400) {
				const body = await res.json();
				if (body.message?.includes('cooldown')) nameError = $_('onboarding.name_error_cooldown');
				else if (body.message?.includes('khóa')) nameError = $_('onboarding.name_error_locked');
				else nameError = body.message;
				return;
			}
			if (!res.ok) {
				nameError = 'Lỗi không xác định. Vui lòng thử lại.';
				return;
			}
			await goToStep(3);
		} finally {
			loading = false;
		}
	}

	async function handleLocationNext() {
		loading = true;
		try {
			if (provinceItem.value) {
				await patchOnboarding({
					province: provinceItem.value,
					city: cityItem.value ?? undefined
				});
			}
			await goToStep(4);
		} finally {
			loading = false;
		}
	}

	async function handleSocialNext() {
		loading = true;
		try {
			const body: Record<string, any> = {};
			if (youtube.trim()) body.youtube = youtube.trim();
			if (facebook.trim()) body.facebook = facebook.trim();
			if (Object.keys(body).length) await patchOnboarding(body);
			await goToStep(5);
		} finally {
			loading = false;
		}
	}

	async function handleComplete() {
		loading = true;
		try {
			await patchOnboarding({ onboarding_done: true });
			open = false;
			await $user.refresh();
		} finally {
			loading = false;
		}
	}

	function preventClose(e: Event) {
		e.stopPropagation();
	}
</script>

{#if open}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
		on:click={preventClose}
		role="presentation"
	></div>

	<!-- Modal -->
	<div
		class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
		role="presentation"
	>
		<div
			class="onboarding-modal relative w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-2xl"
			role="dialog"
			aria-modal="true"
		>
			<!-- Progress bar -->
			<div class="mb-6">
				<div class="mb-1 flex justify-between text-xs text-muted-foreground">
					<span>{$_('onboarding.step_of', { values: { step, total: TOTAL } })}</span>
				</div>
				<div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
					<div
						class="h-full rounded-full bg-primary transition-all duration-300"
						style="width: {(step / TOTAL) * 100}%"
					></div>
				</div>
			</div>

			<!-- Step content -->
			{#if step === 1}
				<!-- Welcome -->
				<div class="space-y-4 text-center">
					<img src="/logo.png" alt="GDVN" class="mx-auto h-16 invert-0 dark:invert" />
					<h2 class="text-2xl font-bold">{$_('onboarding.welcome_title')}</h2>
					<p class="text-muted-foreground">{$_('onboarding.welcome_desc')}</p>
					<Button class="w-full" on:click={() => goToStep(2)}>
						{$_('onboarding.next')} →
					</Button>
				</div>

			{:else if step === 2}
				<!-- Set name -->
				<div class="space-y-4">
					<div>
						<h2 class="text-xl font-bold">{$_('onboarding.name_title')}</h2>
						<p class="mt-1 text-sm text-muted-foreground">{$_('onboarding.name_desc')}</p>
					</div>
					<div class="space-y-2">
						<Input
							bind:value={name}
							placeholder={$_('onboarding.name_placeholder')}
							class={nameError ? 'border-red-500' : ''}
							on:keydown={(e) => e.key === 'Enter' && handleNameNext()}
						/>
						{#if nameError}
							<p class="text-sm text-red-500">{nameError}</p>
						{/if}
					</div>
					<div class="flex gap-2">
						<Button variant="outline" class="flex-1" on:click={() => goToStep(1)}>
							{$_('onboarding.back')}
						</Button>
						<Button class="flex-1" on:click={handleNameNext} disabled={loading || !name}>
							{loading ? $_('onboarding.saving') : $_('onboarding.next')}
						</Button>
					</div>
				</div>

			{:else if step === 3}
				<!-- Location -->
				<div class="space-y-4">
					<div>
						<h2 class="text-xl font-bold">{$_('onboarding.location_title')}</h2>
						<p class="mt-1 text-sm text-muted-foreground">{$_('onboarding.location_desc')}</p>
					</div>
					<div class="space-y-3">
						<div>
							<p class="mb-1 text-sm font-medium">{$_('onboarding.location_province')}</p>
							<Select.Root bind:selected={provinceItem}>
								<Select.Trigger class="w-full">
									<Select.Value placeholder={$_('onboarding.location_province')} />
								</Select.Trigger>
								<Select.Content class="z-[10000]">
									<ScrollArea class="h-60">
										{#each Object.keys(provinces)
											.map((k) => provinces[k])
											.sort((a, b) => (a.name > b.name ? 1 : -1)) as province}
											<Select.Item
												value={province.name}
												on:click={() => { cityItem = { value: null }; }}
											>{province.name}</Select.Item>
										{/each}
									</ScrollArea>
								</Select.Content>
							</Select.Root>
						</div>
						{#if provinceItem.value && provinces[provinceItem.value]?.wards?.length}
							<div>
								<p class="mb-1 text-sm font-medium">{$_('onboarding.location_city')}</p>
								<Select.Root bind:selected={cityItem}>
									<Select.Trigger class="w-full">
										<Select.Value placeholder={$_('onboarding.location_city')} />
									</Select.Trigger>
									<Select.Content class="z-[10000]">
										<ScrollArea class="h-60">
											{#each provinces[provinceItem.value].wards as ward}
												<Select.Item value={ward}>{ward}</Select.Item>
											{/each}
										</ScrollArea>
									</Select.Content>
								</Select.Root>
							</div>
						{/if}
					</div>
					<div class="flex gap-2">
						<Button variant="outline" class="flex-1" on:click={() => goToStep(2)}>
							{$_('onboarding.back')}
						</Button>
						<Button variant="ghost" on:click={() => goToStep(4)}>
							{$_('onboarding.skip')}
						</Button>
						<Button class="flex-1" on:click={handleLocationNext} disabled={loading}>
							{loading ? $_('onboarding.saving') : $_('onboarding.next')}
						</Button>
					</div>
				</div>

			{:else if step === 4}
				<!-- Social links -->
				<div class="space-y-4">
					<div>
						<h2 class="text-xl font-bold">{$_('onboarding.social_title')}</h2>
						<p class="mt-1 text-sm text-muted-foreground">{$_('onboarding.social_desc')}</p>
					</div>
					<div class="space-y-3">
						<div class="flex items-center gap-3">
							<svg class="h-5 w-5 shrink-0 text-red-500" viewBox="0 0 24 24" fill="currentColor">
								<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
							</svg>
							<Input bind:value={youtube} placeholder={$_('onboarding.social_youtube_placeholder')} />
						</div>
						<div class="flex items-center gap-3">
							<svg class="h-5 w-5 shrink-0 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
								<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
							</svg>
							<Input bind:value={facebook} placeholder={$_('onboarding.social_facebook_placeholder')} />
						</div>
					</div>
					<div class="flex gap-2">
						<Button variant="outline" class="flex-1" on:click={() => goToStep(3)}>
							{$_('onboarding.back')}
						</Button>
						<Button variant="ghost" on:click={() => goToStep(5)}>
							{$_('onboarding.skip')}
						</Button>
						<Button class="flex-1" on:click={handleSocialNext} disabled={loading}>
							{loading ? $_('onboarding.saving') : $_('onboarding.next')}
						</Button>
					</div>
				</div>

			{:else if step === 5}
				<!-- Core features -->
				<div class="space-y-4">
					<h2 class="text-xl font-bold">{$_('onboarding.features_title')}</h2>
					<div class="grid grid-cols-2 gap-3">
						<div class="rounded-xl border border-border p-4">
							<div class="mb-2 text-2xl">🏆</div>
							<p class="font-semibold">{$_('onboarding.feature_list')}</p>
							<p class="mt-1 text-xs text-muted-foreground">{$_('onboarding.feature_list_desc')}</p>
						</div>
						<div class="rounded-xl border border-border p-4">
							<div class="mb-2 text-2xl">✅</div>
							<p class="font-semibold">{$_('onboarding.feature_submit')}</p>
							<p class="mt-1 text-xs text-muted-foreground">{$_('onboarding.feature_submit_desc')}</p>
						</div>
						<div class="rounded-xl border border-border p-4">
							<div class="mb-2 text-2xl">💬</div>
							<p class="font-semibold">{$_('onboarding.feature_community')}</p>
							<p class="mt-1 text-xs text-muted-foreground">{$_('onboarding.feature_community_desc')}</p>
						</div>
						<div class="relative rounded-xl border-2 border-purple-400 bg-purple-50 p-4 dark:bg-purple-950/40">
							<span class="absolute right-2 top-2 rounded-full bg-purple-500 px-2 py-0.5 text-[10px] font-bold text-white">Phổ biến</span>
							<div class="mb-2 text-2xl">🎮</div>
							<p class="font-semibold">{$_('onboarding.feature_battlepass')}</p>
							<p class="mt-1 text-xs text-muted-foreground">{$_('onboarding.feature_battlepass_desc')}</p>
							<a
								href="/battlepass"
								target="_blank"
								class="mt-2 inline-block text-xs font-medium text-purple-600 underline dark:text-purple-400"
							>
								{$_('onboarding.feature_battlepass_try')} →
							</a>
						</div>
					</div>
					<div class="flex gap-2">
						<Button variant="outline" class="flex-1" on:click={() => goToStep(4)}>
							{$_('onboarding.back')}
						</Button>
						<Button class="flex-1" on:click={() => goToStep(6)}>
							{$_('onboarding.next')}
						</Button>
					</div>
				</div>

			{:else if step === 6}
				<!-- Discord -->
				<div class="space-y-4 text-center">
					<div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950">
						<svg class="h-9 w-9 text-indigo-500" viewBox="0 0 24 24" fill="currentColor">
							<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
						</svg>
					</div>
					<div>
						<h2 class="text-xl font-bold">{$_('onboarding.discord_title')}</h2>
						<p class="mt-1 text-sm text-muted-foreground">{$_('onboarding.discord_desc')}</p>
					</div>
					<a href={DISCORD_URL} target="_blank" rel="noopener noreferrer">
						<Button class="w-full bg-indigo-600 text-white hover:bg-indigo-700">
							{$_('onboarding.discord_join')}
						</Button>
					</a>
					<div class="flex gap-2">
						<Button variant="outline" class="flex-1" on:click={() => goToStep(5)}>
							{$_('onboarding.back')}
						</Button>
						<Button variant="ghost" class="flex-1" on:click={() => goToStep(7)}>
							{$_('onboarding.skip')}
						</Button>
						<Button class="flex-1" on:click={() => goToStep(7)}>
							{$_('onboarding.next')}
						</Button>
					</div>
				</div>

			{:else if step === 7}
				<!-- Geode mod -->
				<div class="space-y-4">
					<div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
						<span class="text-3xl">🟢</span>
					</div>
					<div class="text-center">
						<h2 class="text-xl font-bold">{$_('onboarding.geode_title')}</h2>
						<p class="mt-1 text-sm text-muted-foreground">{$_('onboarding.geode_desc')}</p>
					</div>
					<div class="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
						{$_('onboarding.geode_required')}
					</div>
					<ul class="space-y-2">
						{#each ['geode_feature_rank', 'geode_feature_events', 'geode_feature_bp'] as key}
							<li class="flex items-start gap-2 text-sm">
								<span class="mt-0.5 text-green-500">✓</span>
								<span>{$_(`onboarding.${key}`)}</span>
							</li>
						{/each}
					</ul>
					<a href={GEODE_URL} target="_blank" rel="noopener noreferrer">
						<Button class="w-full bg-green-600 text-white hover:bg-green-700">
							{$_('onboarding.geode_download')}
						</Button>
					</a>
					<div class="flex gap-2">
						<Button variant="outline" class="flex-1" on:click={() => goToStep(6)}>
							{$_('onboarding.back')}
						</Button>
						<Button variant="ghost" class="flex-1" on:click={() => goToStep(8)}>
							{$_('onboarding.skip')}
						</Button>
						<Button class="flex-1" on:click={() => goToStep(8)}>
							{$_('onboarding.next')}
						</Button>
					</div>
				</div>

			{:else if step === 8}
				<!-- Support -->
				<div class="space-y-4">
					<div class="text-center">
						<h2 class="text-xl font-bold">{$_('onboarding.support_title')}</h2>
						<p class="mt-1 text-sm text-muted-foreground">{$_('onboarding.support_desc')}</p>
					</div>
					<!-- Supporter card -->
					<div class="rounded-xl border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-pink-50 p-4 dark:from-yellow-950/30 dark:to-pink-950/30">
						<div class="flex items-start justify-between">
							<div>
								<p class="font-bold text-yellow-700 dark:text-yellow-300">{$_('onboarding.support_supporter_title')}</p>
								<p class="text-xs text-muted-foreground">{$_('onboarding.support_supporter_price')}</p>
							</div>
							<span class="text-2xl">⭐</span>
						</div>
						<ul class="mt-3 space-y-1 text-xs text-muted-foreground">
							<li>✨ Tên nổi bật trên bảng xếp hạng</li>
							<li>🎭 Avatar/banner GIF động</li>
							<li>⚡ Ưu tiên duyệt bản ghi</li>
							<li>🔕 Không quảng cáo</li>
							<li>🔗 URL hồ sơ ngắn /@tên</li>
							<li class="text-muted-foreground/70">+ 8 đặc quyền khác</li>
						</ul>
						<a href="/supporter" target="_blank" rel="noopener noreferrer" class="mt-3 block">
							<Button class="w-full bg-yellow-500 text-white hover:bg-yellow-600">
								{$_('onboarding.support_supporter_cta')}
							</Button>
						</a>
					</div>
					<!-- Queue + Clan Boost -->
					<div class="grid grid-cols-2 gap-3">
						<div class="rounded-xl border border-border p-3">
							<p class="text-sm font-semibold">{$_('onboarding.support_queue_title')}</p>
							<p class="text-xs text-yellow-600 dark:text-yellow-400">{$_('onboarding.support_queue_price')}</p>
							<p class="mt-1 text-xs text-muted-foreground">{$_('onboarding.support_queue_desc')}</p>
							<a href="/store" target="_blank" class="mt-2 block text-xs text-primary underline">
								{$_('onboarding.support_learn_more')}
							</a>
						</div>
						<div class="rounded-xl border border-border p-3">
							<p class="text-sm font-semibold">{$_('onboarding.support_clan_title')}</p>
							<p class="text-xs text-yellow-600 dark:text-yellow-400">{$_('onboarding.support_clan_price')}</p>
							<p class="mt-1 text-xs text-muted-foreground">{$_('onboarding.support_clan_desc')}</p>
							<a href="/store" target="_blank" class="mt-2 block text-xs text-primary underline">
								{$_('onboarding.support_learn_more')}
							</a>
						</div>
					</div>
					<div class="flex gap-2">
						<Button variant="outline" class="flex-1" on:click={() => goToStep(7)}>
							{$_('onboarding.back')}
						</Button>
						<Button variant="ghost" on:click={() => goToStep(9)}>
							{$_('onboarding.skip_later')}
						</Button>
						<Button class="flex-1" on:click={() => goToStep(9)}>
							{$_('onboarding.next')}
						</Button>
					</div>
				</div>

			{:else}
				<!-- Done - step 9 -->
				<div class="space-y-4 text-center">
					<div class="text-5xl">🎉</div>
					<div>
						<h2 class="text-2xl font-bold">{$_('onboarding.done_title')}</h2>
						<p class="mt-1 text-muted-foreground">{$_('onboarding.done_desc')}</p>
					</div>
					<!-- Discord account linking -->
					<div class="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-left dark:border-indigo-800 dark:bg-indigo-950/30">
						<div class="mb-2 flex items-center gap-2">
							<svg class="h-5 w-5 text-indigo-500" viewBox="0 0 24 24" fill="currentColor">
								<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
							</svg>
							<p class="text-sm font-semibold text-indigo-800 dark:text-indigo-200">{$_('onboarding.done_discord_title')}</p>
						</div>
						<p class="mb-3 text-xs text-muted-foreground">{$_('onboarding.done_discord_desc')}</p>
						{#if $user.data?.discord}
							<Button class="w-full" variant="outline" disabled>
								{$_('onboarding.done_discord_linked')}
							</Button>
						{:else}
							<a href={DISCORD_OAUTH_URL}>
								<Button class="w-full bg-indigo-600 text-white hover:bg-indigo-700">
									{$_('onboarding.done_discord_link')}
								</Button>
							</a>
						{/if}
					</div>
					<Button class="w-full" on:click={handleComplete} disabled={loading}>
						{loading ? $_('onboarding.saving') : $_('onboarding.done_close')}
					</Button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style lang="scss">
	.onboarding-modal {
		max-height: 90vh;
		overflow-y: auto;
	}
</style>
