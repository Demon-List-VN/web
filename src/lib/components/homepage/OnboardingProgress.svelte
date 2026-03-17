<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Button } from '$lib/components/ui/button/index.js';

	export let step: number = 1;
	export let onResume: () => void;

	const TOTAL = 9;
	$: percent = Math.round((step / TOTAL) * 100);
</script>

<div class="onboarding-progress">
	<div class="content">
		<div class="info">
			<div class="title-row">
				<span class="gift">🎁</span>
				<div>
					<p class="title">{$_('onboarding.progress_title')}</p>
					<p class="desc">{$_('onboarding.progress_desc')}</p>
				</div>
			</div>
			<div class="bar-wrap">
				<div class="bar-track">
					<div class="bar-fill" style="width: {percent}%"></div>
				</div>
				<span class="percent">{step}/{TOTAL}</span>
			</div>
		</div>
		<Button class="resume-btn" on:click={onResume}>
			{$_('onboarding.progress_continue')} →
		</Button>
	</div>
</div>

<style lang="scss">
	.onboarding-progress {
		border: 1px solid rgb(253 224 71 / 0.5);
		background: linear-gradient(135deg, rgb(254 252 232 / 0.6), rgb(253 242 248 / 0.6));
		border-radius: 12px;
		padding: 14px 20px;
		margin-bottom: 20px;

		:global(.dark) & {
			background: linear-gradient(135deg, rgb(113 63 18 / 0.2), rgb(131 24 67 / 0.2));
			border-color: rgb(161 98 7 / 0.4);
		}

		.content {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 16px;
			flex-wrap: wrap;
		}

		.info {
			flex: 1;
			min-width: 0;
		}

		.title-row {
			display: flex;
			align-items: flex-start;
			gap: 10px;
			margin-bottom: 8px;
		}

		.gift {
			font-size: 1.25rem;
			flex-shrink: 0;
			margin-top: 1px;
		}

		.title {
			font-weight: 600;
			font-size: 0.9rem;
			color: var(--textColor);
		}

		.desc {
			font-size: 0.78rem;
			color: var(--textColor2);
		}

		.bar-wrap {
			display: flex;
			align-items: center;
			gap: 8px;
		}

		.bar-track {
			flex: 1;
			height: 6px;
			background-color: rgb(0 0 0 / 0.1);
			border-radius: 999px;
			overflow: hidden;
		}

		.bar-fill {
			height: 100%;
			background: linear-gradient(90deg, #eab308, #ec4899);
			border-radius: 999px;
			transition: width 0.3s ease;
		}

		.percent {
			font-size: 0.75rem;
			color: var(--textColor2);
			white-space: nowrap;
		}

		.resume-btn {
			flex-shrink: 0;
		}
	}
</style>
