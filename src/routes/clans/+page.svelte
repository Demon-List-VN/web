<script lang="ts">
	import * as sdk from '$lib/client/sdk';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { Badge } from '$lib/components/ui/badge';
	import { Switch } from '$lib/components/ui/switch';
	import { Slider } from '$lib/components/ui/slider';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Separator } from '$lib/components/ui/separator';
	import { toast } from 'svelte-sonner';
	import { user } from '$lib/client';
	import * as Tabs from '$lib/components/ui/tabs';
	import type { PageData } from './$types';
	import PlayerHoverCard from '$lib/components/playerLink.svelte';
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import Ads from '$lib/components/ads.svelte';
	import { _ } from 'svelte-i18n';
	import {
		Search, Globe, Lock, Users, Zap, Crown, ArrowRight,
		MessageSquare, Layout, Palette, BarChart3, Star
	} from 'lucide-svelte';

	export let data: PageData;

	// --- State ---
	const PAGE_SIZE = data.pageSize || 24;
	let clans: any[] = data.data || [];
	let searchQuery = '';
	let loading = false;
	let hasMore = clans.length >= PAGE_SIZE;
	let paginationStart = 0;
	let paginationEnd = PAGE_SIZE - 1;
	let loadMoreObserver: IntersectionObserver;

	// My clan
	let myClan: any = null;
	let myClanLoading = true;

	// Sort
	let selectedSort = { value: 'boostedUntil', label: 'Boosted' };
	let sortAscending = false;
	const sortOptions = [
		{ value: 'boostedUntil', label: 'clans.sort.boosted' },
		{ value: 'rating', label: 'clans.sort.rating' },
		{ value: 'memberCount', label: 'clans.sort.members' },
		{ value: 'name', label: 'clans.sort.name' },
		{ value: 'created_at', label: 'clans.sort.newest' }
	];

	// Create clan
	const newClanData = {
		name: '',
		tag: '',
		memberLimit: NaN,
		isPublic: false
	};

	// Invitations
	let invitations: any = [];

	// Boost CTA
	let boostQuantity = [7];

	// --- Helpers ---
	function isBoostActive(clan: any) {
		return clan?.boostedUntil && new Date(clan.boostedUntil) > new Date();
	}

	function formatPrice(x: number) {
		return x.toLocaleString('vi-VN');
	}

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('vi-VN', {
			year: 'numeric', month: 'short', day: 'numeric'
		});
	}

	$: featuredClans = clans.filter(c => isBoostActive(c));

	// --- API functions ---
	async function fetchClans(append = false) {
		if (loading) return;
		loading = true;

		if (!append) {
			paginationStart = 0;
			paginationEnd = PAGE_SIZE - 1;
		}

		const params = new URLSearchParams({
			start: String(paginationStart),
			end: String(paginationEnd),
			sortBy: selectedSort.value,
			ascending: String(sortAscending)
		});
		if (searchQuery.trim()) {
			params.set('searchQuery', searchQuery.trim());
		}

		try {
			const res = await sdk.fetch(`/clans?${params}`);
			const newClans = await res.json();

			if (append) {
				clans = [...clans, ...newClans];
			} else {
				clans = newClans;
			}

			hasMore = newClans.length >= PAGE_SIZE;
		} catch {
			toast.error('Failed to load clans');
		} finally {
			loading = false;
		}
	}

	function loadMore() {
		if (!hasMore || loading) return;
		paginationStart = paginationEnd + 1;
		paginationEnd = paginationStart + PAGE_SIZE - 1;
		fetchClans(true);
	}

	function handleSearch() {
		hasMore = true;
		fetchClans(false);
	}

	function handleSearchKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') handleSearch();
	}

	function handleSortChange(e: any) {
		if (!e) return;
		selectedSort = e;
		// Set ascending based on sort type
		sortAscending = e.value === 'name';
		hasMore = true;
		fetchClans(false);
	}

	async function fetchMyClan() {
		if (!$user.loggedIn || !$user.data.clan) {
			myClanLoading = false;
			return;
		}
		try {
			const res = await sdk.fetch(`/clans/${$user.data.clan}`);
			myClan = await res.json();
		} catch {
			// silently fail
		} finally {
			myClanLoading = false;
		}
	}

	async function createClan() {
		if (
			!/^[a-zA-Z0-9]*$/gm.test(newClanData.tag) ||
			!(2 <= newClanData.tag.length && newClanData.tag.length <= 6)
		) {
			toast.error('Tag must be alphanumeric, contains no space and must have 2-6 characters.');
			return;
		}

		if (!newClanData.name.length || !newClanData.tag.length) {
			toast.error('Please fill in all fields.');
			return;
		}

		toast.promise(
			sdk.fetch(`/clans`, {
				method: 'POST',
				body: JSON.stringify(newClanData),
				headers: {
					Authorization: 'Bearer ' + (await $user.token()),
					'Content-Type': 'application/json'
				}
			}).then(async (res) => {
				if (res.ok) {
					await $user.refresh();
					goto(`/clan/${$user.data.clan}`);
				} else {
					throw new Error();
				}
			}),
			{
				success: 'Clan created!',
				loading: 'Creating clan...',
				error: 'Failed to create new clan.'
			}
		);
	}

	async function acceptInvitation(clanID: number) {
		sdk.fetch(`/clans/${clanID}/invite`, {
			method: 'PATCH',
			headers: {
				Authorization: 'Bearer ' + (await $user.token())
			}
		}).then(() => window.location.reload());
	}

	async function rejectInvitation(clanID: number) {
		sdk.fetch(`/clans/${clanID}/invite`, {
			method: 'DELETE',
			headers: {
				Authorization: 'Bearer ' + (await $user.token())
			}
		}).then(() => window.location.reload());
	}

	async function boostPurchase() {
		if (!$user.loggedIn || !$user.data.clan) return;
		toast.loading($_('clan.boost.caution'));

		const res: any = await (
			await fetch(
				sdk.url(`/payment/getPaymentLink/3/${boostQuantity[0]}?targetClanID=${$user.data.clan}`),
				{
					method: 'POST',
					headers: {
						Authorization: 'Bearer ' + (await $user.token()),
						'Content-Type': 'application/json'
					}
				}
			)
		).json();

		window.location.href = res.checkoutUrl;
	}

	// --- Infinite Scroll ---
	function setupIntersectionObserver() {
		const sentinel = document.querySelector('#clansLoadMoreSentinel');
		if (!sentinel) return;

		if (loadMoreObserver) {
			loadMoreObserver.disconnect();
		}

		loadMoreObserver = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasMore && !loading) {
					loadMore();
				}
			},
			{ rootMargin: '200px' }
		);

		loadMoreObserver.observe(sentinel);
	}

	$: if (clans.length > 0) {
		setTimeout(setupIntersectionObserver, 100);
	}

	onMount(async () => {
		fetchMyClan();

		if ($user.loggedIn) {
			sdk.fetch(`/clans/invitations`, {
				headers: {
					Authorization: 'Bearer ' + (await $user.token()),
					'Content-Type': 'application/json'
				}
			})
				.then((res) => res.json())
				.then((res) => (invitations = res));
		}
	});

	onDestroy(() => {
		if (loadMoreObserver) {
			loadMoreObserver.disconnect();
		}
	});
</script>

<svelte:head>
	<title>{$_('clans.title')} - Geometry Dash Việt Nam</title>
</svelte:head>

<div class="pageContainer">
	<!-- ═══════════════ HEADER ═══════════════ -->
	<div class="pageHeader">
		<div>
			<h1>{$_('clans.title')}</h1>
			<p class="headerSubtitle">{$_('clans.find_community.description')}</p>
		</div>
		<Dialog.Root>
			{#if $user.loggedIn && !$user.data.clan}
				<Dialog.Trigger>
					{#if $user.data.rating || $user.data.totalFLpt}
						<Button>{$_('clans.create.button')}</Button>
					{:else}
						<Button disabled>{$_('clans.create.button')}</Button>
					{/if}
				</Dialog.Trigger>
			{/if}
			<Dialog.Content>
				<Dialog.Header>
					<Dialog.Title>{$_('clans.create.title')}</Dialog.Title>
					<Dialog.Description>{$_('clans.create.description')}</Dialog.Description>
				</Dialog.Header>
				<div class="grid gap-4 py-4">
					<div class="grid grid-cols-4 items-center gap-4">
						<Label class="text-right">{$_('clans.create.name')}</Label>
						<Input class="col-span-3" bind:value={newClanData.name} />
					</div>
					<div class="grid grid-cols-4 items-center gap-4">
						<Label class="text-right">{$_('clans.create.tag')}</Label>
						<Input
							class="col-span-3"
							placeholder={$_('clans.create.tag_placeholder')}
							bind:value={newClanData.tag}
							maxlength={6}
						/>
					</div>
					<div class="grid grid-cols-4 items-center gap-4">
						<Label class="text-right">{$_('clans.create.member_limit')}</Label>
						<Input
							class="col-span-3"
							bind:value={newClanData.memberLimit}
							type="number"
							inputmode="numeric"
							placeholder={$_('clans.create.member_limit_placeholder')}
						/>
					</div>
					<div class="grid grid-cols-4 items-center gap-4">
						<Label class="text-right">{$_('clans.create.public')}</Label>
						<Switch bind:checked={newClanData.isPublic} />
					</div>
				</div>
				<Dialog.Footer>
					<Button on:click={createClan}>{$_('clans.create.create_button')}</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Root>
	</div>

	<!-- ═══════════════ MY CLAN CARD / FIND COMMUNITY ═══════════════ -->
	{#if $user.loggedIn && $user.data.clan}
		<!-- My Clan Hero Card -->
		{#if myClanLoading}
			<div class="myClanCard">
				<Skeleton class="myClanBanner" />
				<div class="myClanBody">
					<Skeleton class="h-6 w-48" />
					<Skeleton class="h-4 w-32 mt-2" />
				</div>
			</div>
		{:else if myClan}
			<a href={`/clan/${myClan.id}`} class="myClanCard" class:boosted={isBoostActive(myClan)}>
				<div class="myClanBanner">
					<img
						src={`https://cdn.gdvn.net/clan-photos/${myClan.id}.jpg?v=${myClan.imageVersion || 0}`}
						alt={myClan.name}
						loading="eager"
					/>
					<div class="myClanBannerOverlay">
						<Badge variant="secondary" class="myClanTagBadge">
							{$_('clans.my_clan.title')}
						</Badge>
					</div>
				</div>
				<div class="myClanBody">
					<div class="myClanInfo">
						<div class="myClanNameRow">
							<h2>{myClan.name}</h2>
							{#if myClan.tag}
								<span
									class="clanTagBadge"
									style={isBoostActive(myClan) && myClan.tagBgColor
										? `background-color: ${myClan.tagBgColor}; color: ${myClan.tagTextColor}`
										: ''}
								>
									{myClan.tag}
								</span>
							{/if}
							{#if isBoostActive(myClan)}
								<span class="boostBadge">
									<Zap class="h-3.5 w-3.5" />
								</span>
							{/if}
						</div>
						<div class="myClanMeta">
							<span class="metaItem">
								<Users class="h-4 w-4" />
								{myClan.memberCount} {$_('clans.members_count')}
							</span>
							{#if isBoostActive(myClan)}
								<span class="metaItem boostMeta">
									<Zap class="h-4 w-4" />
									{$_('clans.my_clan.boost_active')} {formatDate(myClan.boostedUntil)}
								</span>
							{:else}
								<span class="metaItem mutedMeta">
									{$_('clans.my_clan.not_boosted')}
								</span>
							{/if}
						</div>
					</div>
					<div class="myClanActions">
						<Button variant="outline" size="sm" href={`/clan/${myClan.id}`}>
							{$_('clans.my_clan.view')}
							<ArrowRight class="ml-1 h-4 w-4" />
						</Button>
					</div>
				</div>
			</a>
		{/if}
	{:else}
		<!-- Find Your Community CTA -->
		<div class="findCommunityCard">
			<div class="findCommunityContent">
				<Users class="h-10 w-10 text-indigo-500" />
				<div>
					<h2>{$_('clans.find_community.title')}</h2>
					<p>{$_('clans.find_community.description')}</p>
				</div>
			</div>
			{#if $user.loggedIn && ($user.data.rating || $user.data.totalFLpt)}
				<Dialog.Root>
					<Dialog.Trigger>
						<Button>
							{$_('clans.create.button')}
							<ArrowRight class="ml-1 h-4 w-4" />
						</Button>
					</Dialog.Trigger>
					<Dialog.Content>
						<Dialog.Header>
							<Dialog.Title>{$_('clans.create.title')}</Dialog.Title>
							<Dialog.Description>{$_('clans.create.description')}</Dialog.Description>
						</Dialog.Header>
						<div class="grid gap-4 py-4">
							<div class="grid grid-cols-4 items-center gap-4">
								<Label class="text-right">{$_('clans.create.name')}</Label>
								<Input class="col-span-3" bind:value={newClanData.name} />
							</div>
							<div class="grid grid-cols-4 items-center gap-4">
								<Label class="text-right">{$_('clans.create.tag')}</Label>
								<Input
									class="col-span-3"
									placeholder={$_('clans.create.tag_placeholder')}
									bind:value={newClanData.tag}
									maxlength={6}
								/>
							</div>
							<div class="grid grid-cols-4 items-center gap-4">
								<Label class="text-right">{$_('clans.create.member_limit')}</Label>
								<Input
									class="col-span-3"
									bind:value={newClanData.memberLimit}
									type="number"
									inputmode="numeric"
									placeholder={$_('clans.create.member_limit_placeholder')}
								/>
							</div>
							<div class="grid grid-cols-4 items-center gap-4">
								<Label class="text-right">{$_('clans.create.public')}</Label>
								<Switch bind:checked={newClanData.isPublic} />
							</div>
						</div>
						<Dialog.Footer>
							<Button on:click={createClan}>{$_('clans.create.create_button')}</Button>
						</Dialog.Footer>
					</Dialog.Content>
				</Dialog.Root>
			{/if}
		</div>
	{/if}

	<!-- ═══════════════ BOOST CTA BANNER ═══════════════ -->
	<div class="boostCtaBanner">
		<div class="boostCtaLeft">
			<div class="boostCtaHeader">
				<Zap class="h-6 w-6" />
				<h3>{$_('clans.boost_cta.title')}</h3>
			</div>
			<p class="boostCtaDesc">{$_('clans.boost_cta.description')}</p>
			<div class="boostFeatures">
				<div class="boostFeature">
					<MessageSquare class="h-4 w-4" />
					<span>{$_('clans.boost_cta.feature_community')}</span>
				</div>
				<div class="boostFeature">
					<BarChart3 class="h-4 w-4" />
					<span>{$_('clans.boost_cta.feature_levels')}</span>
				</div>
				<div class="boostFeature">
					<Layout class="h-4 w-4" />
					<span>{$_('clans.boost_cta.feature_home')}</span>
				</div>
				<div class="boostFeature">
					<Palette class="h-4 w-4" />
					<span>{$_('clans.boost_cta.feature_tags')}</span>
				</div>
			</div>
		</div>
		<div class="boostCtaRight">
			{#if $user.loggedIn && $user.data.clan}
				<p class="boostCtaSelectLabel">{$_('clans.boost_cta.select_duration')}</p>
				<div class="boostSliderRow">
					<Slider bind:value={boostQuantity} max={30} min={1} step={1} />
					<span class="boostDays">{boostQuantity[0]} {$_(boostQuantity[0] > 1 ? 'clan.boost.days_plural' : 'clan.boost.days')}</span>
				</div>
				<div class="boostPriceRow">
					<span class="boostPrice">{formatPrice(5000 * boostQuantity[0])}₫</span>
					<span class="boostPriceUnit">({formatPrice(5000)}₫{$_('clans.boost_cta.price_per_day')})</span>
				</div>
				<Button class="boostPurchaseBtn" on:click={boostPurchase}>
					<Zap class="mr-1 h-4 w-4" />
					{$_('clans.boost_cta.proceed')}
				</Button>
			{:else if $user.loggedIn}
				<p class="boostCtaDisabledMsg">{$_('clans.boost_cta.no_clan')}</p>
			{:else}
				<p class="boostCtaDisabledMsg">{$_('clans.boost_cta.login_required')}</p>
			{/if}
		</div>
	</div>

	<Ads dataAdFormat="rectangle" />

	<!-- ═══════════════ TABS ═══════════════ -->
	<Tabs.Root value="clans" class="clansTabsRoot">
		<div class="tabsBar">
			<Tabs.List>
				<Tabs.Trigger value="clans">{$_('clans.tabs.listing')}</Tabs.Trigger>
				{#if $user.loggedIn && !$user.data.clan}
					<Tabs.Trigger value="invitations">{$_('clans.tabs.invitations')}</Tabs.Trigger>
				{/if}
			</Tabs.List>
		</div>

		<!-- ═══════════ CLANS LISTING TAB ═══════════ -->
		<Tabs.Content value="clans" class="w-full">
			<!-- Search & Sort Bar -->
			<div class="searchSortBar">
				<div class="searchInputWrapper">
					<Search class="searchIcon" />
					<Input
						placeholder={$_('clans.search_placeholder')}
						class="searchInput"
						bind:value={searchQuery}
						on:keydown={handleSearchKeydown}
					/>
					<Button variant="ghost" size="sm" on:click={handleSearch}>
						<Search class="h-4 w-4" />
					</Button>
				</div>
				<div class="sortWrapper">
					<Select.Root onSelectedChange={handleSortChange}>
						<Select.Trigger class="w-[180px]">
							<Select.Value placeholder={$_('clans.sort.label')} />
						</Select.Trigger>
						<Select.Content>
							{#each sortOptions as opt}
								<Select.Item value={opt.value} label={$_(opt.label)}>
									{$_(opt.label)}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>

			<!-- Featured Clans (Boosted) -->
			{#if featuredClans.length > 0}
				<div class="featuredSection">
					<div class="featuredHeader">
						<Zap class="h-5 w-5" />
						<h3>{$_('clans.featured')}</h3>
					</div>
					<div class="featuredScroll">
						{#each featuredClans as clan}
							<a href={`/clan/${clan.id}`} class="featuredCard">
								<div class="featuredCardBanner">
									<img
										src={`https://cdn.gdvn.net/clan-photos/${clan.id}.jpg`}
										alt={clan.name}
										loading="lazy"
									/>
									<div class="featuredBadge">
										<Zap class="h-3 w-3" />
									</div>
								</div>
								<div class="featuredCardBody">
									<span class="featuredClanName">{clan.name}</span>
									<span class="featuredClanMeta">
										<Users class="h-3 w-3" />
										{clan.memberCount} {$_('clans.members_count')}
									</span>
								</div>
							</a>
						{/each}
					</div>
				</div>
				<Separator class="my-4" />
			{/if}

			<!-- All Clans Header -->
			<div class="allClansHeader">
				<h3>{$_('clans.all')}</h3>
			</div>

			<!-- Clan Cards Grid -->
			{#if clans.length === 0 && !loading}
				<div class="emptyState">
					<Users class="h-12 w-12 text-muted-foreground" />
					<p>{$_('clans.empty')}</p>
				</div>
			{/if}

			<div class="clansGrid">
				{#each clans as clan (clan.id)}
					<a href={`/clan/${clan.id}`} class="clanCardLink">
						<Card.Root class={`clanCard ${isBoostActive(clan) ? 'clanCardBoosted' : ''}`}>
							<div class="clanCardBanner">
								<img
									src={`https://cdn.gdvn.net/clan-photos/${clan.id}.jpg`}
									alt={clan.name}
									loading="lazy"
								/>
								{#if isBoostActive(clan)}
									<div class="clanBoostIndicator">
										<Zap class="h-3 w-3" />
									</div>
								{/if}
								<div class="clanCardBannerOverlay">
									{#if clan.isPublic}
										<Badge variant="secondary" class="clanStatusBadge">
											<Globe class="mr-1 h-3 w-3" />
											{$_('clan.public')}
										</Badge>
									{:else}
										<Badge variant="outline" class="clanStatusBadge">
											<Lock class="mr-1 h-3 w-3" />
											{$_('clan.invite_only')}
										</Badge>
									{/if}
								</div>
							</div>
							<Card.Content class="clanCardContent">
								<div class="clanCardNameRow">
									<h4>{clan.name}</h4>
									{#if clan.tag}
										<span
											class="clanTagSmall"
											style={isBoostActive(clan) && clan.tagBgColor
												? `background-color: ${clan.tagBgColor}; color: ${clan.tagTextColor}`
												: ''}
										>
											{clan.tag}
										</span>
									{/if}
								</div>
								<div class="clanCardOwner">
									<Crown class="h-3.5 w-3.5 text-yellow-500" />
									<PlayerHoverCard player={clan.players} />
								</div>
								<div class="clanCardFooter">
									<span class="clanMemberCount">
										<Users class="h-3.5 w-3.5" />
										{clan.memberCount}{#if clan.memberLimit}/{clan.memberLimit}{:else}/∞{/if}
									</span>
									{#if clan.rating}
										<span class="clanRating">
											<Star class="h-3.5 w-3.5 text-yellow-500" />
											{clan.rating.toFixed(0)}
										</span>
									{/if}
								</div>
							</Card.Content>
						</Card.Root>
					</a>
				{/each}

				<!-- Skeleton loaders while loading more -->
				{#if loading}
					{#each { length: 6 } as _}
						<Card.Root class="clanCard">
							<Skeleton class="clanCardBannerSkeleton" />
							<Card.Content class="clanCardContent">
								<Skeleton class="h-5 w-3/4" />
								<Skeleton class="h-4 w-1/2 mt-2" />
								<Skeleton class="h-4 w-1/3 mt-2" />
							</Card.Content>
						</Card.Root>
					{/each}
				{/if}
			</div>

			<!-- Infinite scroll sentinel -->
			<div id="clansLoadMoreSentinel" class="loadMoreSentinel">
				{#if !hasMore && clans.length > 0}
					<p class="noMoreText">{$_('clans.no_more')}</p>
				{/if}
			</div>
		</Tabs.Content>

		<!-- ═══════════ INVITATIONS TAB ═══════════ -->
		<Tabs.Content value="invitations" class="w-full">
			{#if invitations.length === 0}
				<div class="emptyState">
					<Users class="h-12 w-12 text-muted-foreground" />
					<p>{$_('clans.empty')}</p>
				</div>
			{/if}
			<div class="invitationsGrid">
				{#each invitations as invitation}
					<Card.Root class="clanCard">
						<div class="clanCardBanner">
							<img
								src={`https://cdn.gdvn.net/clan-photos/${invitation.clans.id}.jpg`}
								alt={invitation.clans.name}
								loading="lazy"
							/>
						</div>
						<Card.Content class="clanCardContent">
							<h4 class="font-semibold">{invitation.clans.name}</h4>
							<div class="clanCardOwner">
								<Crown class="h-3.5 w-3.5 text-yellow-500" />
								<PlayerHoverCard player={invitation.clans.players} />
							</div>
							<div class="invitationActions">
								<Button size="sm" on:click={() => acceptInvitation(invitation.clans.id)}>
									{$_('general.accept')}
								</Button>
								<Button
									size="sm"
									variant="outline"
									on:click={() => rejectInvitation(invitation.clans.id)}
								>
									{$_('general.reject')}
								</Button>
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		</Tabs.Content>
	</Tabs.Root>
</div>

<style lang="scss">
	/* ═══════════ PAGE CONTAINER ═══════════ */
	.pageContainer {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 20px 40px;
	}

	/* ═══════════ HEADER ═══════════ */
	.pageHeader {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 24px 0 16px;
		flex-wrap: wrap;
		gap: 12px;

		h1 {
			font-size: 28px;
			font-weight: 700;
			margin: 0;
		}
	}

	.headerSubtitle {
		font-size: 14px;
		color: hsl(var(--muted-foreground));
		margin: 4px 0 0;
	}

	/* ═══════════ MY CLAN CARD ═══════════ */
	.myClanCard {
		display: flex;
		border-radius: 12px;
		border: 1px solid hsl(var(--border));
		overflow: hidden;
		background: hsl(var(--card));
		margin-bottom: 20px;
		text-decoration: none;
		color: inherit;
		transition: all 0.2s ease;

		&:hover {
			border-color: hsl(var(--primary) / 0.4);
			box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
		}

		&.boosted {
			border-color: hsl(270 70% 60% / 0.4);
			box-shadow: 0 0 20px hsl(270 70% 60% / 0.1);

			&:hover {
				box-shadow: 0 0 24px hsl(270 70% 60% / 0.2);
			}
		}
	}

	.myClanBanner {
		width: 200px;
		min-height: 140px;
		flex-shrink: 0;
		position: relative;

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
	}

	.myClanBannerOverlay {
		position: absolute;
		top: 10px;
		left: 10px;
	}

	.myClanBody {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20px 24px;
		gap: 16px;
		flex-wrap: wrap;
	}

	.myClanInfo {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.myClanNameRow {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;

		h2 {
			font-size: 22px;
			font-weight: 700;
			margin: 0;
		}
	}

	.myClanMeta {
		display: flex;
		align-items: center;
		gap: 16px;
		flex-wrap: wrap;
	}

	.metaItem {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-size: 13px;
		color: hsl(var(--muted-foreground));
	}

	.boostMeta {
		color: hsl(270 70% 60%);
	}

	.mutedMeta {
		color: hsl(var(--muted-foreground));
		font-style: italic;
	}

	.myClanActions {
		flex-shrink: 0;
	}

	/* ═══════════ FIND COMMUNITY CTA ═══════════ */
	.findCommunityCard {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-radius: 12px;
		border: 1px dashed hsl(var(--border));
		padding: 24px;
		margin-bottom: 20px;
		background: hsl(var(--card));
		flex-wrap: wrap;
		gap: 16px;
	}

	.findCommunityContent {
		display: flex;
		align-items: center;
		gap: 16px;

		h2 {
			font-size: 18px;
			font-weight: 600;
			margin: 0;
		}

		p {
			font-size: 14px;
			color: hsl(var(--muted-foreground));
			margin: 4px 0 0;
		}
	}

	/* ═══════════ BOOST CTA BANNER ═══════════ */
	.boostCtaBanner {
		display: flex;
		border-radius: 12px;
		padding: 24px;
		margin-bottom: 20px;
		background: linear-gradient(135deg, hsl(270 60% 16%), hsl(250 50% 20%));
		border: 1px solid hsl(270 70% 60% / 0.3);
		color: white;
		gap: 32px;
		flex-wrap: wrap;
	}

	.boostCtaLeft {
		flex: 1;
		min-width: 260px;
	}

	.boostCtaHeader {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 8px;
		color: hsl(270 70% 75%);

		h3 {
			font-size: 20px;
			font-weight: 700;
			margin: 0;
		}
	}

	.boostCtaDesc {
		font-size: 14px;
		color: hsl(270 30% 80%);
		margin: 0 0 16px;
	}

	.boostFeatures {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}

	.boostFeature {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		color: hsl(270 30% 85%);
	}

	.boostCtaRight {
		flex: 0 0 280px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		background: hsl(270 40% 12% / 0.5);
		border-radius: 10px;
		padding: 20px;
	}

	.boostCtaSelectLabel {
		font-size: 13px;
		font-weight: 500;
		color: hsl(270 30% 80%);
		margin: 0;
	}

	.boostSliderRow {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.boostDays {
		white-space: nowrap;
		font-size: 14px;
		font-weight: 600;
		min-width: 70px;
		text-align: right;
	}

	.boostPriceRow {
		display: flex;
		align-items: baseline;
		gap: 8px;
	}

	.boostPrice {
		font-size: 24px;
		font-weight: 700;
		color: hsl(270 70% 75%);
	}

	.boostPriceUnit {
		font-size: 12px;
		color: hsl(270 30% 70%);
	}

	.boostCtaDisabledMsg {
		font-size: 14px;
		color: hsl(270 30% 70%);
		font-style: italic;
		margin: auto 0;
		text-align: center;
	}

	:global(.boostPurchaseBtn) {
		background: hsl(270 70% 55%) !important;
		color: white !important;
		font-weight: 600 !important;
		&:hover {
			background: hsl(270 70% 60%) !important;
		}
	}

	/* ═══════════ TABS ═══════════ */
	:global(.clansTabsRoot) {
		display: flex;
		flex-direction: column;
		width: 100%;
	}

	.tabsBar {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 16px;
	}

	/* ═══════════ SEARCH & SORT ═══════════ */
	.searchSortBar {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 20px;
		flex-wrap: wrap;
	}

	.searchInputWrapper {
		flex: 1;
		min-width: 200px;
		display: flex;
		align-items: center;
		gap: 8px;
		position: relative;
	}

	:global(.searchIcon) {
		position: absolute;
		left: 12px;
		height: 16px;
		width: 16px;
		color: hsl(var(--muted-foreground));
		pointer-events: none;
	}

	:global(.searchInput) {
		padding-left: 36px !important;
	}

	.sortWrapper {
		flex-shrink: 0;
	}

	/* ═══════════ FEATURED SECTION ═══════════ */
	.featuredSection {
		margin-bottom: 8px;
	}

	.featuredHeader {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 12px;
		color: hsl(270 70% 60%);

		h3 {
			font-size: 16px;
			font-weight: 600;
			margin: 0;
		}
	}

	.featuredScroll {
		display: flex;
		gap: 12px;
		overflow-x: auto;
		padding-bottom: 8px;
		scroll-snap-type: x mandatory;

		&::-webkit-scrollbar {
			height: 6px;
		}
		&::-webkit-scrollbar-thumb {
			background: hsl(var(--muted-foreground) / 0.3);
			border-radius: 3px;
		}
	}

	.featuredCard {
		flex: 0 0 180px;
		scroll-snap-align: start;
		border-radius: 10px;
		overflow: hidden;
		border: 1px solid hsl(270 70% 60% / 0.3);
		background: hsl(var(--card));
		text-decoration: none;
		color: inherit;
		transition: all 0.2s ease;

		&:hover {
			transform: translateY(-2px);
			box-shadow: 0 4px 16px hsl(270 70% 60% / 0.15);
			border-color: hsl(270 70% 60% / 0.5);
		}
	}

	.featuredCardBanner {
		height: 90px;
		position: relative;
		overflow: hidden;

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
	}

	.featuredBadge {
		position: absolute;
		top: 6px;
		right: 6px;
		display: flex;
		align-items: center;
		padding: 2px 6px;
		border-radius: 4px;
		background: hsl(270 70% 60% / 0.9);
		color: white;
	}

	.featuredCardBody {
		padding: 10px 12px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.featuredClanName {
		font-size: 13px;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.featuredClanMeta {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 11px;
		color: hsl(var(--muted-foreground));
	}

	/* ═══════════ ALL CLANS HEADER ═══════════ */
	.allClansHeader {
		display: flex;
		align-items: center;
		margin-bottom: 12px;

		h3 {
			font-size: 16px;
			font-weight: 600;
			margin: 0;
		}
	}

	/* ═══════════ CLAN CARDS GRID ═══════════ */
	.clansGrid, .invitationsGrid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 16px;
	}

	.clanCardLink {
		text-decoration: none;
		color: inherit;
	}

	:global(.clanCard) {
		overflow: hidden !important;
		transition: all 0.2s ease !important;
		border-radius: 10px !important;

		&:hover {
			transform: translateY(-2px);
			box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
		}
	}

	:global(.clanCardBoosted) {
		border-color: hsl(270 70% 60% / 0.4) !important;

		&:hover {
			box-shadow: 0 6px 20px hsl(270 70% 60% / 0.15) !important;
			border-color: hsl(270 70% 60% / 0.6) !important;
		}
	}

	.clanCardBanner {
		height: 140px;
		position: relative;
		overflow: hidden;
		background: hsl(var(--muted));

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
			transition: transform 0.3s ease;
		}
	}

	.clanCardLink:hover .clanCardBanner img {
		transform: scale(1.05);
	}

	:global(.clanCardBannerSkeleton) {
		height: 140px !important;
		width: 100% !important;
		border-radius: 0 !important;
	}

	.clanBoostIndicator {
		position: absolute;
		top: 8px;
		right: 8px;
		display: flex;
		align-items: center;
		padding: 3px 8px;
		border-radius: 6px;
		background: hsl(270 70% 60% / 0.9);
		color: white;
		backdrop-filter: blur(4px);
	}

	.clanCardBannerOverlay {
		position: absolute;
		bottom: 8px;
		left: 8px;
	}

	:global(.clanStatusBadge) {
		font-size: 11px !important;
		backdrop-filter: blur(4px);
	}

	:global(.clanCardContent) {
		padding: 14px !important;
		display: flex !important;
		flex-direction: column !important;
		gap: 8px !important;
	}

	.clanCardNameRow {
		display: flex;
		align-items: center;
		gap: 8px;

		h4 {
			font-size: 15px;
			font-weight: 600;
			margin: 0;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
	}

	.clanTagBadge, .clanTagSmall {
		display: inline-flex;
		align-items: center;
		padding: 1px 7px;
		border-radius: 4px;
		font-size: 11px;
		font-weight: 600;
		background: hsl(var(--muted));
		color: hsl(var(--muted-foreground));
		flex-shrink: 0;
	}

	.boostBadge {
		display: inline-flex;
		align-items: center;
		padding: 2px 6px;
		border-radius: 5px;
		background: hsl(270 70% 60% / 0.15);
		color: hsl(270 70% 60%);
		flex-shrink: 0;
	}

	.clanCardOwner {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		color: hsl(var(--muted-foreground));
	}

	.clanCardFooter {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 4px;
	}

	.clanMemberCount, .clanRating {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 12px;
		color: hsl(var(--muted-foreground));
	}

	/* ═══════════ INVITATION ACTIONS ═══════════ */
	.invitationActions {
		display: flex;
		gap: 8px;
		margin-top: 4px;
	}

	/* ═══════════ EMPTY & LOADING STATES ═══════════ */
	.emptyState {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 48px 20px;
		text-align: center;

		p {
			font-size: 14px;
			color: hsl(var(--muted-foreground));
		}
	}

	.loadMoreSentinel {
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-top: 16px;
	}

	.noMoreText {
		font-size: 13px;
		color: hsl(var(--muted-foreground));
		text-align: center;
	}

	/* ═══════════ RESPONSIVE ═══════════ */
	@media screen and (max-width: 768px) {
		.pageHeader h1 {
			font-size: 22px;
		}

		.myClanCard {
			flex-direction: column;
		}

		.myClanBanner {
			width: 100%;
			min-height: 120px;
			max-height: 160px;
		}

		.myClanBody {
			padding: 16px;
			flex-direction: column;
			align-items: flex-start;
		}

		.boostCtaBanner {
			flex-direction: column;
			padding: 20px;
		}

		.boostCtaRight {
			flex: 1 1 auto;
		}

		.boostFeatures {
			grid-template-columns: 1fr;
		}

		.findCommunityCard {
			flex-direction: column;
			align-items: flex-start;
		}

		.findCommunityContent {
			flex-direction: column;
			gap: 12px;
		}

		.searchSortBar {
			flex-direction: column;
		}

		.searchInputWrapper {
			width: 100%;
		}

		.clansGrid, .invitationsGrid {
			grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
			gap: 12px;
		}

		.featuredCard {
			flex: 0 0 150px;
		}
	}

	@media screen and (max-width: 480px) {
		.pageContainer {
			padding: 0 12px 32px;
		}

		.clansGrid, .invitationsGrid {
			grid-template-columns: 1fr;
		}
	}
</style>
