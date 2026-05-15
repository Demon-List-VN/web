<script lang="ts">
	import {
		getSupporterTierColor,
		getSupporterTierInfo,
		getSupporterTierStyle
	} from '$lib/client/supporterTier';
	import { _ } from 'svelte-i18n';

	export let supporterUntil: string | null | undefined = null;
	export let preview = false;
	export let compact = false;

	$: tierInfo = getSupporterTierInfo(supporterUntil);
	$: previewTier = 1;
	$: activeTier = tierInfo?.tier ?? previewTier;
	$: label = $_(getTierNameKey(activeTier), { values: { tier: activeTier } });
	$: daysLeft = tierInfo?.daysLeft ?? 0;
	$: progress = tierInfo?.progress ?? 0;
	$: nextTierDays = tierInfo?.nextTierDays ?? 30;
	$: nextTierLabel = $_(getTierNameKey(activeTier + 1), { values: { tier: activeTier + 1 } });
	$: tierStyle = getSupporterTierStyle(activeTier);
	$: fillStyle = `width: ${Math.max(0, Math.min(100, progress))}%; --supporter-tier-color: ${getSupporterTierColor(activeTier)};`;
	$: daysLeftText = $_(
		daysLeft === 1 ? 'supporter.tiers.day_left' : 'supporter.tiers.days_left',
		{ values: { days: daysLeft } }
	);

	function getTierNameKey(tier: number) {
		if (tier <= 5) {
			return `supporter.tiers.names.tier_${tier}`;
		}

		return 'supporter.tiers.names.tier_6_plus';
	}
</script>

{#if tierInfo || preview}
	<a
		href="/supporter"
		class:compact
		class="supporter-tier-card"
		style={tierStyle}
		aria-label={$_('supporter.tiers.open_supporter_page')}
	>
		<div class="tier-header">
			<div>
				<div class="tier-kicker">{$_('supporter.tiers.title')}</div>
				<div class="tier-name supporter-tier-text">{label}</div>
			</div>
			<div class="tier-pill">T{activeTier}</div>
		</div>

		<div class="tier-progress">
			<div class="tier-progress-fill" style={fillStyle}></div>
		</div>

		<div class="tier-footer">
			{#if tierInfo}
				<span>{daysLeftText}</span>
				<span
					>{$_('supporter.tiers.next_tier_at', {
						values: { days: nextTierDays, tier: nextTierLabel }
					})}</span
				>
			{:else}
				<span>{$_('supporter.tiers.preview_start')}</span>
				<span>{$_('supporter.tiers.preview_complete')}</span>
			{/if}
		</div>
	</a>
{/if}

<style lang="scss">
	.supporter-tier-card {
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		background: hsl(var(--card) / 0.78);
		color: inherit;
		cursor: pointer;
		display: block;
		padding: 12px;
		text-decoration: none;
		transition:
			border-color 0.15s ease,
			background-color 0.15s ease,
			transform 0.15s ease;
		width: 100%;
	}

	.supporter-tier-card:hover {
		background: hsl(var(--accent) / 0.5);
		border-color: hsl(var(--ring) / 0.45);
		transform: translateY(-1px);
	}

	.supporter-tier-card.compact {
		padding: 10px;
	}

	.tier-header,
	.tier-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.tier-kicker {
		color: hsl(var(--muted-foreground));
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	.tier-name {
		font-size: 18px;
		font-weight: 800;
		line-height: 1.2;
	}

	.compact .tier-name {
		font-size: 15px;
	}

	.tier-pill {
		border-radius: 999px;
		background: hsl(var(--muted));
		color: hsl(var(--foreground));
		flex: 0 0 auto;
		font-size: 12px;
		font-weight: 800;
		line-height: 1;
		padding: 7px 9px;
	}

	.tier-progress {
		background: hsl(var(--muted));
		border-radius: 999px;
		height: 10px;
		margin-top: 12px;
		overflow: hidden;
		width: 100%;
	}

	.tier-progress-fill {
		background: var(--supporter-tier-color);
		border-radius: inherit;
		height: 100%;
		transition: width 0.25s ease;
	}

	.tier-footer {
		color: hsl(var(--muted-foreground));
		font-size: 12px;
		line-height: 1.35;
		margin-top: 8px;
	}

	.tier-footer span:last-child {
		text-align: right;
	}
</style>
