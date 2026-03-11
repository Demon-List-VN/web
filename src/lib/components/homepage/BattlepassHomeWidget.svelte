<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Zap, ArrowRight, Lock, Gift, Calendar, Check } from 'lucide-svelte';
	import { user } from '$lib/client';
	import { XP_PER_TIER, MAX_TIER } from '$lib/battlepass/constants';

	export let activeSeason: any = null;
	export let battlepassProgress: any = null;

	$: isPremium = battlepassProgress?.isPremium ?? false;
	$: currentTier = battlepassProgress ? Math.min(Math.floor(battlepassProgress.xp / XP_PER_TIER), MAX_TIER) : 0;
	$: tierProgress = battlepassProgress ? Math.round((battlepassProgress.xp % XP_PER_TIER) / XP_PER_TIER * 100) : 0;

	// Show tiers around the user's current tier for a meaningful preview
	$: previewStart = Math.max(0, currentTier > 5 ? currentTier - 3 : 0);
	$: previewTiers = Array.from({ length: 10 }, (_, i) => previewStart + i);
</script>

<section class="bpWidget" style={`--bp-color: ${activeSeason?.primaryColor || '#6366f1'}`}>
	<div class="bpHeader">
		<div class="flex items-center gap-2">
			<Zap class="h-5 w-5" style="color: var(--bp-color)" />
			<h4>{activeSeason ? `Pass — ${activeSeason.title}` : 'Pass'}</h4>
		</div>
		<a href="/battlepass" class="viewAllBtn">
			{$_('homepage.battlepass.go_to_pass')}
			<ArrowRight class="ml-1 h-4 w-4" />
		</a>
	</div>

	<div class="bpBody">
		{#if activeSeason}
			<!-- Season banner background with tier track + progress -->
			<div
				class="bpBanner"
				style="background-image: url('{activeSeason.backgroundUrl || `https://cdn.gdvn.net/battlepasses/${activeSeason.id}.webp`}')"
			>
				<div class="bpBannerOverlay"></div>
				<div class="bpBannerContent">
					<!-- Tier track showing progress -->
					<div class="tierTrack">
						{#each previewTiers as tier, i}
							{@const tierNum = tier + 1}
							{@const completed = tier < currentTier}
							{@const isCurrent = tier === currentTier}
							{@const isFree = tier % 2 === 0}
							<div
								class="tierNode"
								class:free={isFree}
								class:premium={!isFree}
								class:completed
								class:current={isCurrent}
							>
								{#if completed}
									<Check class="h-3 w-3" />
								{:else if !isFree && !isPremium}
									<Lock class="h-3 w-3" />
								{:else}
									<Gift class="h-3 w-3" />
								{/if}
								<span class="tierNum">{tierNum}</span>
							</div>
							{#if i < 9}
								<div class="tierConnector" class:connectorDone={completed}></div>
							{/if}
						{/each}
						<div class="tierFade"></div>
					</div>

					<!-- Progress bar for current tier -->
					{#if $user.loggedIn && currentTier < MAX_TIER}
						<div class="progressRow">
							<span class="progressLabel">Tier {currentTier + 1}</span>
							<div class="progressBar">
								<div class="progressFill" style="width: {tierProgress}%; background: var(--bp-color)"></div>
							</div>
							<span class="progressLabel">{tierProgress}%</span>
						</div>
					{/if}
				</div>
			</div>

			<div class="bpInfo">
				<div class="bpInfoText">
					<p>{$_('homepage.battlepass.description')}</p>
					<div class="bpFeatures">
						<span class="bpFeature">
							<Gift class="h-3.5 w-3.5" />
							{$_('homepage.battlepass.exclusive_rewards')}
						</span>
						<span class="bpFeature">
							<Calendar class="h-3.5 w-3.5" />
							{$_('homepage.battlepass.weekly_challenges')}
						</span>
					</div>
				</div>
				<Button href="/battlepass" class="bpCta" style="background: var(--bp-color); color: white;">
					{#if isPremium}
						{$_('homepage.battlepass.go_to_pass')}
						<ArrowRight class="h-4 w-4 ml-2" />
					{:else}
						<Zap class="h-4 w-4 mr-2" />
						{$_('homepage.battlepass.get_premium')} — 149.000₫
					{/if}
				</Button>
			</div>
		{:else}
			<div class="bpInfo">
				<div class="bpInfoText">
					<p>{$_('homepage.battlepass.description')}</p>
				</div>
				<Button href="/battlepass" class="bpCta" style="background: var(--bp-color); color: white;">
					{$_('homepage.battlepass.go_to_pass')}
					<ArrowRight class="h-4 w-4 ml-2" />
				</Button>
			</div>
		{/if}
	</div>
</section>

<style lang="scss">
	.bpWidget {
		padding: 0 50px;
	}

	.bpHeader {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16px;
		flex-wrap: wrap;
		gap: 8px;

		h4 {
			font-weight: 600;
			font-size: 18px;
			margin: 0;
		}
	}

	.viewAllBtn {
		display: inline-flex;
		align-items: center;
		font-size: 14px;
		font-weight: 500;
		color: hsl(var(--muted-foreground));
		transition: color 0.2s;
		&:hover { color: hsl(var(--foreground)); }
	}

	.bpBody {
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		background: hsl(var(--card));
		overflow: hidden;
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.bpBanner {
		position: relative;
		background-size: cover;
		background-position: center;
		background-color: hsl(var(--muted));
		border-radius: 12px 12px 0 0;
		overflow: hidden;
	}

	.bpBannerOverlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			to bottom,
			rgba(0, 0, 0, 0.45) 0%,
			rgba(0, 0, 0, 0.6) 100%
		);
		backdrop-filter: blur(1px);
	}

	.bpBannerContent {
		position: relative;
		z-index: 1;
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.tierTrack {
		display: flex;
		align-items: center;
		gap: 0;
		overflow: hidden;
		position: relative;
		padding: 8px 0;
	}

	.tierNode {
		flex-shrink: 0;
		width: 40px;
		height: 40px;
		border-radius: 10px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		font-size: 10px;
		font-weight: 600;
		position: relative;
		transition: all 0.2s;

		&.free {
			background: hsl(var(--primary) / 0.12);
			color: hsl(var(--primary));
			border: 1px solid hsl(var(--primary) / 0.25);
		}

		&.premium {
			background: var(--bp-color, #6366f1)15;
			color: var(--bp-color, #6366f1);
			border: 1px solid var(--bp-color, #6366f1)30;
		}

		&.completed {
			background: var(--bp-color, #6366f1);
			color: white;
			border-color: var(--bp-color, #6366f1);
		}

		&.current {
			border-width: 2px;
			border-color: var(--bp-color, #6366f1);
			box-shadow: 0 0 8px var(--bp-color, #6366f1)40;
		}
	}

	.tierNum {
		font-size: 9px;
		line-height: 1;
	}

	.tierConnector {
		flex: 1;
		height: 2px;
		min-width: 12px;
		background: hsl(var(--border));
		transition: background 0.2s;

		&.connectorDone {
			background: var(--bp-color, #6366f1);
		}
	}

	.progressRow {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.progressLabel {
		font-size: 12px;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.85);
		white-space: nowrap;
	}

	.progressBar {
		flex: 1;
		height: 6px;
		border-radius: 3px;
		background: hsl(var(--muted) / 0.5);
		overflow: hidden;
	}

	.progressFill {
		height: 100%;
		border-radius: 3px;
		transition: width 0.4s ease;
	}

	.tierFade {
		position: absolute;
		right: 0;
		top: 0;
		bottom: 0;
		width: 60px;
		background: linear-gradient(to right, transparent, rgba(0, 0, 0, 0.55));
		pointer-events: none;
	}

	.bpInfo {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		flex-wrap: wrap;
		padding: 20px;
	}

	.bpInfoText {
		display: flex;
		flex-direction: column;
		gap: 10px;

		p {
			font-size: 14px;
			color: hsl(var(--muted-foreground));
			margin: 0;
			max-width: 450px;
		}
	}

	.bpFeatures {
		display: flex;
		gap: 16px;
		flex-wrap: wrap;
	}

	.bpFeature {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-size: 12px;
		font-weight: 500;
		color: hsl(var(--foreground) / 0.7);
	}

	:global(.bpCta) {
		border-radius: 10px !important;
		font-weight: 600 !important;
		white-space: nowrap;
		&:hover {
			opacity: 0.9;
		}
	}

	@media screen and (max-width: 768px) {
		.bpWidget {
			padding: 0 16px;
		}
		.bpInfo {
			flex-direction: column;
			align-items: flex-start;
		}
		.bpBannerContent {
			padding: 16px;
		}
	}
</style>
