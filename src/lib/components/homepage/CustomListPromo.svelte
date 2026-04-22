<script lang="ts">
	import { onMount } from 'svelte';
	import { ArrowRight, ListPlus } from 'lucide-svelte';
	import { user } from '$lib/client';

	const PREVIEW_GRADIENT = 'linear-gradient(135deg, #0f766e 0%, #1d4ed8 55%, #7c3aed 100%)';

	type PreviewLevel = {
		name: string;
		top: number;
		points: number;
		faded: boolean;
	};

	const LEVEL_POOL = [
		'Aerial Gleam',
		'Neon Harbor',
		'Clockwork Tide',
		'Midnight Relay',
		'Crystal Axis',
		'Pixel Bloom',
		'Nova Garden',
		'Prism Circuit',
		'Aurora Flux',
		'Gravity Echo'
	];

	const DEFAULT_PREVIEW_LEVELS: PreviewLevel[] = [
		{ name: 'Aerial Gleam', top: 7, points: 548, faded: false },
		{ name: 'Neon Harbor', top: 16, points: 431, faded: true },
		{ name: 'Clockwork Tide', top: 29, points: 362, faded: true }
	];

	let previewLevels = DEFAULT_PREVIEW_LEVELS;

	function buildRandomPreviewLevels(): PreviewLevel[] {
		const remainingNames = [...LEVEL_POOL];
		const levels: PreviewLevel[] = [];

		for (let index = 0; index < 3; index += 1) {
			const randomIndex = Math.floor(Math.random() * remainingNames.length);
			const name = remainingNames.splice(randomIndex, 1)[0];
			levels.push({
				name,
				top: Math.floor(Math.random() * 85) + 1,
				points: Math.floor(Math.random() * 550) + 180,
				faded: index > 0
			});
		}

		return levels.sort((left, right) => left.top - right.top).map((level, index) => ({
			...level,
			faded: index > 0
		}));
	}

	onMount(() => {
		previewLevels = buildRandomPreviewLevels();
	});
</script>

<div class="custom-list-promo" data-nosnippet>
	<div class="promo-content">
		<div class="promo-header">
			<ListPlus size={20} class="promo-icon" />
			<h3>Custom List</h3>
			<span class="badge">Cộng tác</span>
		</div>

		<p class="promo-desc">Tạo bảng xếp hạng level của riêng bạn, thêm cộng tác viên và chia sẻ giao diện riêng cho cộng đồng.</p>

		<ul class="feature-list">
			<li>✓ Tạo list Classic hoặc Platformer</li>
			<li>✓ Mời admin và helper cùng quản lý</li>
			<li>✓ Tuỳ chỉnh banner, màu sắc và top riêng</li>
		</ul>

		<a href="/lists/new" class="promo-cta">
			Tạo list ngay
			<ArrowRight size={15} />
		</a>
	</div>

	<div class="preview-wrap" aria-hidden="true">
		<div class="preview-card">
			<div class="preview-bg" style="background: {PREVIEW_GRADIENT};"></div>
			<div class="preview-top">
				<span class="preview-chip">Public</span>
				<span class="preview-chip preview-chip-muted">Classic</span>
			</div>

			<div class="preview-body">
				<div class="preview-title">
					{$user.loggedIn ? `List của ${$user.data?.name || 'bạn'}` : 'List của bạn'}
				</div>
				<p class="preview-subtitle">12 level • 3 cộng tác viên</p>

				<div class="preview-levels">
					{#each previewLevels as level}
						<div class:preview-level-row-faded={level.faded} class="preview-level-row">
							<span class="preview-rank">Top {level.top}</span>
							<span class="preview-level-name">{level.name}</span>
							<span class="preview-score">{level.points} pt</span>
						</div>
					{/each}
				</div>
			</div>

			<div class="preview-footer">
				<span class="preview-pill">Theme custom</span>
				<span class="preview-pill">Top enabled</span>
			</div>
		</div>
		<div class="shine"></div>
	</div>
</div>

<style lang="scss">
	.custom-list-promo {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 14px;
		padding: 22px 24px;
		display: flex;
		align-items: center;
		gap: 28px;
		min-width: 0;
	}

	.promo-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 18px;
		min-width: 0;
	}

	.promo-header {
		display: flex;
		align-items: center;
		gap: 10px;

		h3 {
			font-size: 18px;
			font-weight: 800;
			margin: 0;
			flex: 1;
		}
	}

	.badge {
		font-size: 11px;
		font-weight: 700;
		background: color-mix(in srgb, #0f766e 22%, hsl(var(--card)));
		color: #0f766e;
		padding: 2px 8px;
		border-radius: 999px;
		white-space: nowrap;
	}

	.promo-desc {
		font-size: 13px;
		opacity: 0.72;
		margin: 0;
		line-height: 1.5;
	}

	.feature-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;

		li {
			font-size: 12px;
			opacity: 0.72;
		}
	}

	.promo-cta {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-size: 13px;
		font-weight: 700;
		color: hsl(var(--foreground));
		background: hsl(var(--muted));
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		padding: 8px 16px;
		text-decoration: none;
		transition: background 0.15s ease;
		align-self: flex-start;

		&:hover {
			background: hsl(var(--accent));
		}
	}

	.preview-wrap {
		position: relative;
		width: 280px;
		flex-shrink: 0;
		border-radius: 12px;
		overflow: hidden;
	}

	.preview-card {
		position: relative;
		min-height: 180px;
		padding: 14px;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		gap: 18px;
		border-radius: 12px;
		overflow: hidden;
	}

	.preview-bg {
		position: absolute;
		inset: 0;
		z-index: 0;
	}

	.preview-top,
	.preview-body,
	.preview-footer {
		position: relative;
		z-index: 1;
	}

	.preview-top,
	.preview-footer {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		flex-wrap: wrap;
	}

	.preview-chip,
	.preview-pill {
		display: inline-flex;
		align-items: center;
		padding: 4px 9px;
		border-radius: 999px;
		font-size: 11px;
		font-weight: 700;
		color: #fff;
		background: rgba(15, 23, 42, 0.28);
		backdrop-filter: blur(8px);
	}

	.preview-chip-muted,
	.preview-pill {
		background: rgba(255, 255, 255, 0.14);
	}

	.preview-body {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.preview-title {
		font-size: 20px;
		font-weight: 800;
		line-height: 1.1;
		color: #fff;
		text-shadow: 0 2px 10px rgba(15, 23, 42, 0.4);
	}

	.preview-subtitle {
		margin: 0;
		font-size: 12px;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.82);
	}

	.preview-levels {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.preview-level-row {
		display: grid;
		grid-template-columns: 52px 1fr auto;
		gap: 8px;
		align-items: center;
		padding: 7px 9px;
		border-radius: 10px;
		background: rgba(15, 23, 42, 0.26);
		backdrop-filter: blur(8px);
		color: #fff;
	}

	.preview-level-row-faded {
		background: rgba(15, 23, 42, 0.18);
	}

	.preview-rank,
	.preview-score {
		font-size: 11px;
		font-weight: 800;
	}

	.preview-rank {
		line-height: 1.1;
	}

	.preview-level-name {
		font-size: 12px;
		font-weight: 700;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.shine {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.shine::after {
		content: '';
		position: absolute;
		inset: -45%;
		background: linear-gradient(
			110deg,
			transparent 40%,
			rgba(255, 255, 255, 0.06) 46%,
			rgba(255, 255, 255, 0.16) 50%,
			rgba(255, 255, 255, 0.06) 54%,
			transparent 60%
		);
		animation: shine 4.2s ease-in-out infinite;
	}

	@keyframes shine {
		0% {
			transform: translateX(-100%) rotate(16deg);
		}
		100% {
			transform: translateX(100%) rotate(16deg);
		}
	}

	@media screen and (max-width: 700px) {
		.custom-list-promo {
			flex-direction: column;
		}

		.preview-wrap {
			width: 100%;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.shine::after {
			animation: none !important;
		}
	}
</style>