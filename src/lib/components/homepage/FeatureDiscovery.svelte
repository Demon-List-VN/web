<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { user } from '$lib/client';
	import { isActive } from '$lib/client/isSupporterActive';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Shield, Swords, Zap, ArrowRight } from 'lucide-svelte';

	$: isSupporter = $user.loggedIn && isActive($user.data?.supporterUntil);
</script>

{#if !isSupporter}
	<section class="featureDiscovery">
		<h4 class="sectionTitle">{$_('homepage.features.title')}</h4>
		<div class="featuresGrid">
			<!-- Supporter -->
			<Card.Root class="featureCard supporterFeature">
				<Card.Content class="p-5">
					<div class="featureIcon supporterIcon">
						<Shield class="h-6 w-6" />
					</div>
					<h5>{$_('homepage.features.supporter_title')}</h5>
					<p class="featureDesc">{$_('homepage.features.supporter_desc')}</p>
					<ul class="featureBenefits">
						<li>{$_('homepage.features.supporter_b1')}</li>
						<li>{$_('homepage.features.supporter_b2')}</li>
						<li>{$_('homepage.features.supporter_b3')}</li>
					</ul>
					<div class="featureFooter">
						<span class="featurePrice">49.000₫<small>/{$_('homepage.features.month')}</small></span>
						<Button href="/supporter" size="sm" variant="outline">
							{$_('homepage.features.learn_more')}
							<ArrowRight class="ml-1 h-3.5 w-3.5" />
						</Button>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Queue Boost -->
			<Card.Root class="featureCard boostFeature">
				<Card.Content class="p-5">
					<div class="featureIcon boostIcon">
						<Zap class="h-6 w-6" />
					</div>
					<h5>{$_('homepage.features.boost_title')}</h5>
					<p class="featureDesc">{$_('homepage.features.boost_desc')}</p>
					<ul class="featureBenefits">
						<li>{$_('homepage.features.boost_b1')}</li>
						<li>{$_('homepage.features.boost_b2')}</li>
						<li>{$_('homepage.features.boost_b3')}</li>
					</ul>
					<div class="featureFooter">
						<span class="featurePrice">5.000₫<small>/{$_('homepage.features.day')}</small></span>
						<Button href="/store" size="sm" variant="outline">
							{$_('homepage.features.learn_more')}
							<ArrowRight class="ml-1 h-3.5 w-3.5" />
						</Button>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</section>
{/if}

<style lang="scss">
	.featureDiscovery {
		padding: 0 50px;
	}

	.sectionTitle {
		font-weight: 600;
		font-size: 18px;
		margin-bottom: 16px;
	}

	.featuresGrid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
	}

	:global(.featureCard) {
		transition: all 0.25s !important;
		overflow: hidden !important;
		&:hover {
			transform: translateY(-2px);
			box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
		}

		h5 {
			font-size: 16px;
			font-weight: 600;
			margin: 12px 0 6px;
		}
	}

	.featureIcon {
		width: 42px;
		height: 42px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
	}

	.supporterIcon { background: linear-gradient(135deg, #ec4899, #f43f5e); }
	.bpIcon { background: linear-gradient(135deg, #8b5cf6, #6366f1); }
	.boostIcon { background: linear-gradient(135deg, #f59e0b, #f97316); }

	.featureDesc {
		font-size: 13px;
		color: hsl(var(--muted-foreground));
		line-height: 1.5;
		margin-bottom: 10px;
	}

	.featureBenefits {
		list-style: none;
		padding: 0;
		margin: 0 0 14px;
		font-size: 13px;

		li {
			position: relative;
			padding-left: 16px;
			margin-bottom: 4px;
			color: hsl(var(--muted-foreground));
			&::before {
				content: '✓';
				position: absolute;
				left: 0;
				color: hsl(var(--primary));
				font-weight: 600;
			}
		}
	}

	.featureFooter {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 12px;
		border-top: 1px solid hsl(var(--border));
	}

	.featurePrice {
		font-size: 18px;
		font-weight: 700;
		color: hsl(var(--foreground));
		small {
			font-size: 12px;
			font-weight: 400;
			color: hsl(var(--muted-foreground));
		}
	}

	@media screen and (max-width: 1024px) {
		.featuresGrid {
			grid-template-columns: 1fr;
		}
	}

	@media screen and (max-width: 768px) {
		.featureDiscovery {
			padding: 0 16px;
		}
	}
</style>
