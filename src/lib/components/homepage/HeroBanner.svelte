<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { isActive } from '$lib/client/isSupporterActive';
	import { user } from '$lib/client';
	import { _ } from 'svelte-i18n';
	import { Sparkles, Crown, ArrowRight } from 'lucide-svelte';

	$: isSupporter = $user.loggedIn && isActive($user.data.supporterUntil);
	$: isLoggedIn = $user.loggedIn;
	$: profileBannerUrl = $user.loggedIn && $user.data?.uid
		? `https://cdn.gdvn.net/banners/${$user.data.uid}${$user.data.isBannerGif ? '.gif' : '.jpg'}?version=${$user.data.bannerVersion || 0}`
		: null;
</script>

<div class="heroBanner" class:hasBannerBg={!!profileBannerUrl}>
	{#if profileBannerUrl}
		<img class="heroBannerBg" src={profileBannerUrl} alt="" />
	{/if}
	<div class="heroOverlay"></div>
	<div class="heroContent">
		{#if !isLoggedIn || !isSupporter}
			<!-- Anonymous / Free users -->
			<div class="heroBadge supporterBadge">
				<Crown class="h-4 w-4" />
				<span>{$_('homepage.hero.supporter_badge')}</span>
			</div>
			<h1 class="heroTitle">{$_('homepage.hero.supporter_title')}</h1>
			<p class="heroSubtitle">{$_('homepage.hero.supporter_subtitle')}</p>
			<div class="heroCtas">
				<Button href="/supporter" class="heroBtn supporterPrimaryBtn">
					<Sparkles class="h-4 w-4 mr-2" />
					{$_('homepage.hero.become_supporter')} — 49.000₫/{$_('homepage.hero.month')}
				</Button>
				<Button href="/store" variant="outline" class="heroBtn secondaryBtn">
					{$_('homepage.hero.visit_store')}
					<ArrowRight class="h-4 w-4 ml-2" />
				</Button>
			</div>
		{:else}
			<!-- Supporter users -->
			<div class="heroBadge supporterBadge">
				<Crown class="h-4 w-4" />
				<span>{$_('homepage.hero.active_supporter')}</span>
			</div>
			<h1 class="heroTitle">{$_('homepage.hero.welcome_back', { values: { name: $user.data.name } })} 💖</h1>
			<p class="heroSubtitle">{$_('homepage.hero.supporter_welcome_subtitle')}</p>
			<div class="heroCtas">
				<Button href={`/@${$user.data.name}`} variant="outline" class="heroBtn secondaryBtn">
					{$_('homepage.hero.my_profile')}
				</Button>
				<Button href="/inventory" variant="outline" class="heroBtn secondaryBtn">
					{$_('homepage.hero.inventory')}
				</Button>
				<Button href={`/mySubmission/${$user.data.uid}`} variant="outline" class="heroBtn secondaryBtn">
					{$_('homepage.hero.submissions')}
				</Button>
			</div>
		{/if}
	</div>
</div>

<style lang="scss">
	.heroBanner {
		position: relative;
		width: 100%;
		min-height: 280px;
		display: flex;
		align-items: center;
		background: linear-gradient(135deg, hsl(var(--primary) / 0.15) 0%, hsl(var(--primary) / 0.05) 50%, transparent 100%);
		overflow: hidden;

		&.hasBannerBg {
			background: transparent;
		}

		&::before {
			content: '';
			position: absolute;
			top: -50%;
			right: -20%;
			width: 600px;
			height: 600px;
			border-radius: 50%;
			background: radial-gradient(circle, hsl(var(--primary) / 0.08) 0%, transparent 70%);
			pointer-events: none;
		}
	}

	.heroBannerBg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
		pointer-events: none;
	}

	.heroOverlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, hsl(var(--background) / 0.4) 0%, hsl(var(--background) / 0.6) 50%, hsl(var(--background)) 100%);
		pointer-events: none;
	}

	.heroContent {
		position: relative;
		z-index: 1;
		padding: 50px;
		max-width: 700px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.heroBadge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 12px;
		border-radius: 20px;
		font-size: 12px;
		font-weight: 600;
		width: fit-content;
		text-transform: uppercase;
		letter-spacing: 0.5px;

		&.supporterBadge {
			background: hsl(45 90% 50% / 0.15);
			color: hsl(45 90% 50%);
		}
	}

	.heroTitle {
		font-size: 32px;
		font-weight: 800;
		line-height: 1.2;
		margin: 0;
		letter-spacing: -0.5px;
	}

	.heroSubtitle {
		font-size: 16px;
		color: hsl(var(--muted-foreground));
		line-height: 1.5;
		margin: 0;
		max-width: 550px;
	}

	.heroCtas {
		display: flex;
		gap: 10px;
		margin-top: 8px;
		flex-wrap: wrap;
	}

	:global(.heroBtn) {
		font-weight: 600 !important;
		border-radius: 10px !important;
	}

	:global(.supporterPrimaryBtn) {
		background: hsl(45 90% 50%) !important;
		color: hsl(0 0% 10%) !important;
		&:hover {
			background: hsl(45 90% 45%) !important;
		}
	}

	:global(.secondaryBtn) {
		border-color: hsl(var(--border)) !important;
	}

	@media screen and (max-width: 768px) {
		.heroContent {
			padding: 30px 20px;
		}
		.heroTitle {
			font-size: 24px;
		}
		.heroSubtitle {
			font-size: 14px;
		}
	}
</style>
