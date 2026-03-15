<script lang="ts">
	import * as Carousel from '$lib/components/ui/carousel/index.js';
	import LevelCard from '$lib/components/levelCard.svelte';
	import Ads from '$lib/components/ads.svelte';
	import { _, locale } from 'svelte-i18n';
	import { ArrowRight, Users } from 'lucide-svelte';
	import { user } from '$lib/client';
	import CommunityPostCard from '$lib/components/communityPostCard.svelte';
	import HeroBanner from '$lib/components/homepage/HeroBanner.svelte';
	import ActiveEventsStrip from '$lib/components/homepage/ActiveEventsStrip.svelte';
	import BattlepassHomeWidget from '$lib/components/homepage/BattlepassHomeWidget.svelte';
	import ClanSpotlight from '$lib/components/homepage/ClanSpotlight.svelte';
	import SupporterSocialProof from '$lib/components/homepage/SupporterSocialProof.svelte';
	import FeatureDiscovery from '$lib/components/homepage/FeatureDiscovery.svelte';
	import OnboardingProgress from '$lib/components/homepage/OnboardingProgress.svelte';
	import OnboardingModal from '$lib/components/OnboardingModal.svelte';

	let showOnboardingModal = false;

	let activeTab: 'dl' | 'fl' | 'pl' | 'cl' = 'dl';

	let homeData: any = null;
	let loaded = false;
	$: events = homeData?.events ?? null;
	$: levels = homeData?.levels ?? { dl: null, fl: null, pl: null, cl: null };
	$: communityPosts = homeData?.communityPosts ?? null;
	$: topClans = homeData?.topClans ?? null;
	$: topSupporters = homeData?.topSupporters ?? null;
	$: serverProgress = homeData?.serverProgress ?? null;
	$: activeSeason = homeData?.activeSeason ?? null;
	$: battlepassProgress = homeData?.battlepassProgress ?? null;

	$: if ($user.checked && !loaded) {
		loaded = true;
		loadHomepage();
	}

	async function loadHomepage() {
		const headers: Record<string, string> = {};
		if ($user.loggedIn) {
			try {
				headers['Authorization'] = `Bearer ${await $user.token()}`;
			} catch {}
		}
		fetch(`${import.meta.env.VITE_API_URL}/homepage`, { headers })
			.then((res) => res.json())
			.then((data) => {
				homeData = data;
			})
			.catch(() => {});
	}
</script>

<svelte:head>
	<title>Geometry Dash Việt Nam</title>
	<meta name="description" content="Website dành cho cộng đồng Geometry Dash Việt Nam" />
</svelte:head>

<!-- Active Events Strip -->
<div class="postHeroSpacing">
	<ActiveEventsStrip {events} />
</div>

<Ads dataAdFormat="auto"  />

<div class="wrapper">
	<!-- Onboarding progress banner (new users only) -->
	{#if $user.loggedIn && $user.data && $user.data.onboarding_done === false}
		<div class="onboardingWrap">
			<OnboardingProgress
				step={$user.data.onboarding_step ?? 1}
				onResume={() => (showOnboardingModal = true)}
			/>
		</div>
		<OnboardingModal bind:open={showOnboardingModal} />
	{/if}

	<!-- Full-width top: Battlepass + Supporter -->
	<div class="topRow">
		<BattlepassHomeWidget {activeSeason} {battlepassProgress} />
		<SupporterSocialProof {topSupporters} {serverProgress} />
	</div>

	<!-- 2-Column Desktop Layout: Community+Levels | Clans -->
	<div class="twoColGrid">
		<!-- Main Column: Community + Levels -->
		<div class="mainCol">
			<!-- Community Hub -->
			<section class="section">
				<div class="sectionHeader">
					<div class="flex items-center gap-2">
						<Users class="h-5 w-5 text-indigo-500" />
						<h4>{$_('community.hub_title')}</h4>
					</div>
					<a href="/community" class="viewAllBtn">
						{$_('community.view_all')}
						<ArrowRight class="ml-1 h-4 w-4" />
					</a>
				</div>
				<div class="communityGrid">
					{#if communityPosts}
						{#if communityPosts.length > 0}
							{#each communityPosts as post}
								<CommunityPostCard {post} compact={true} />
							{/each}
						{:else}
							<div class="communityEmpty">
								<p>{$_('community.no_posts')}</p>
							</div>
						{/if}
					{:else}
						{#each { length: 3 } as _}
							<CommunityPostCard post={null} />
						{/each}
					{/if}
				</div>
			</section>

			<!-- Latest Levels with Tabs -->
			<section class="section">
				<div class="sectionHeader">
					<h4>{$_('home.latest_levels')}</h4>
					<div class="tabGroup">
						<button
							class="tab"
							class:tabActive={activeTab === 'dl'}
							on:click={() => (activeTab = 'dl')}
						>
							Demon List
						</button>
						<button
							class="tab"
							class:tabActive={activeTab === 'fl'}
							on:click={() => (activeTab = 'fl')}
						>
							Featured List
						</button>
						<button
							class="tab"
							class:tabActive={activeTab === 'pl'}
							on:click={() => (activeTab = 'pl')}
						>
							Platformer List
						</button>
					</div>
				</div>

				<div class="carouselWrapper">
					{#key activeTab}
						{#if levels[activeTab]}
							<Carousel.Root>
								<Carousel.Content>
									{#each levels[activeTab] as level}
										<Carousel.Item class="sm:basis-1/1 md:basis-1/2 lg:basis-1/3">
											<LevelCard {level} type={activeTab} />
										</Carousel.Item>
									{/each}
								</Carousel.Content>
							</Carousel.Root>
						{:else}
							<Carousel.Root>
								<Carousel.Content>
									{#each { length: 4 } as _}
										<Carousel.Item class="sm:basis-1/1 md:basis-1/2 lg:basis-1/3">
											<LevelCard level={null} type={activeTab} />
										</Carousel.Item>
									{/each}
								</Carousel.Content>
							</Carousel.Root>
						{/if}
					{/key}
				</div>

				<div class="viewAllLink">
					<a href="/list/{activeTab}" class="viewAllBtn">
						{$_('home.view_all')}
						<ArrowRight class="ml-1 h-4 w-4" />
					</a>
				</div>
			</section>
		</div>

		<!-- Side Column: Clans -->
		<div class="sideCol">
			<ClanSpotlight {topClans} />
		</div>
	</div>

	<!-- Feature Discovery (non-supporters only) — full width -->
	<section class="section fullWidthSection">
		<FeatureDiscovery />
	</section>
</div>

<style lang="scss">
	.postHeroSpacing {
		padding-top: 20px;
	}

	.onboardingWrap {
		padding: 20px 50px 0;

		@media screen and (max-width: 900px) {
			padding: 20px 16px 0;
		}
	}

	.wrapper {
		position: relative;
		z-index: 1;
		background-color: hsl(var(--background));
	}

	.section {
		padding-top: 30px;
	}

	/* Full-width top row: BP + Supporter side by side */
	.topRow {
		display: flex;
		gap: 24px;
		padding: 20px 50px 0;
	}

	.topRow :global(.bpWidget),
	.topRow :global(.supporterProof) {
		flex: 1;
		padding: 0 !important;
		min-width: 0;
	}

	/* 2-Column Desktop Grid */
	.twoColGrid {
		display: grid;
		grid-template-columns: 1fr 360px;
		gap: 0 24px;
		padding: 0 50px;
	}

	.mainCol {
		min-width: 0;

		.sectionHeader {
			padding-inline: 0;
		}
		.carouselWrapper {
			padding-inline: 0;
		}
		.viewAllLink {
			padding-inline: 0;
		}
		.communityGrid {
			padding-inline: 0;
		}
	}

	.sideCol {
		display: flex;
		flex-direction: column;
		gap: 24px;
		padding-top: 30px;
	}

	.sideCol :global(.clanSpotlight) {
		padding: 0 !important;
	}

	.sideCol :global(.clanGrid) {
		grid-template-columns: 1fr !important;
	}

	.fullWidthSection {
		padding-bottom: 30px;
	}

	.sectionHeader {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-inline: 50px;
		flex-wrap: wrap;
		gap: 12px;
	}

	.sectionHeader h4 {
		font-weight: 600;
		font-size: 18px;
		margin: 0;
	}

	.tabGroup {
		display: flex;
		gap: 4px;
		background: hsl(var(--muted));
		border-radius: 8px;
		padding: 4px;
	}

	.tab {
		padding: 6px 16px;
		border-radius: 6px;
		font-size: 13px;
		font-weight: 500;
		color: hsl(var(--muted-foreground));
		background: transparent;
		border: none;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;

		&:hover {
			color: hsl(var(--foreground));
		}
	}

	.tabActive {
		background: hsl(var(--background));
		color: hsl(var(--foreground));
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.carouselWrapper {
		margin-top: 20px;
		max-width: 100%;
		padding-inline: 50px;
		display: flex;
		flex-direction: column;
	}

	.viewAllLink {
		display: flex;
		justify-content: flex-end;
		padding-inline: 50px;
		margin-top: 16px;
	}

	.viewAllBtn {
		display: inline-flex;
		align-items: center;
		font-size: 14px;
		font-weight: 500;
		color: hsl(var(--muted-foreground));
		transition: color 0.2s ease;

		&:hover {
			color: hsl(var(--foreground));
		}
	}

	/* Community Hub */
	.communityGrid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 14px;
		padding-inline: 50px;
		margin-top: 20px;
	}

	.communityEmpty {
		grid-column: 1 / -1;
		text-align: center;
		padding: 40px 0;
		color: hsl(var(--muted-foreground));
		font-size: 14px;
	}

	@media screen and (max-width: 1100px) {
		.topRow {
			flex-direction: column;
			padding: 20px 50px 0;
		}

		.twoColGrid {
			grid-template-columns: 1fr;
			padding: 0;
		}

		.mainCol {
			.sectionHeader {
				padding-inline: 50px;
			}
			.carouselWrapper {
				padding-inline: 50px;
			}
			.viewAllLink {
				padding-inline: 50px;
			}
			.communityGrid {
				grid-template-columns: repeat(2, 1fr);
				padding-inline: 50px;
			}
		}

		.sideCol {
			padding: 0;
		}

		.sideCol :global(.clanSpotlight) {
			padding: 0 50px !important;
		}

		.sideCol :global(.clanGrid) {
			grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)) !important;
		}
	}

	@media screen and (max-width: 900px) {
		.topRow {
			padding: 20px 16px 0;
		}

		.topRow :global(.topSupportersSection) {
			grid-template-columns: 1fr !important;
		}

		.twoColGrid {
			padding: 0;
		}

		.mainCol {
			.sectionHeader {
				padding-inline: 16px;
			}
			.carouselWrapper {
				padding-inline: 16px;
			}
			.viewAllLink {
				padding-inline: 16px;
			}
			.communityGrid {
				grid-template-columns: 1fr;
				padding-inline: 16px;
			}

		}

		.sideCol :global(.clanSpotlight) {
			padding: 0 16px !important;
		}

		.sideCol :global(.clanGrid) {
			grid-template-columns: 1fr !important;
		}

		.sectionHeader {
			padding-inline: 16px;
		}

		.carouselWrapper {
			padding-inline: 16px;
		}

		.viewAllLink {
			padding-inline: 16px;
		}

		.communityGrid {
			grid-template-columns: 1fr;
			padding-inline: 16px;
		}

		.tabGroup {
			width: 100%;
			overflow-x: auto;
		}
	}
</style>
