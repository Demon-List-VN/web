<script lang="ts">
	import { CreditCard, ArrowRight } from 'lucide-svelte';
	import { user } from '$lib/client';

	const GRADIENTS = [
		'linear-gradient(135deg, #667eea, #764ba2)',
		'linear-gradient(135deg, #f093fb, #f5576c)',
		'linear-gradient(135deg, #4facfe, #00f2fe)',
		'linear-gradient(135deg, #43e97b, #38f9d7)',
		'linear-gradient(135deg, #fa709a, #fee140)',
		'linear-gradient(135deg, #a18cd1, #fbc2eb)',
		'linear-gradient(135deg, #ff9a9e, #fad0c4)',
		'linear-gradient(135deg, #a1c4fd, #c2e9fb)',
		'linear-gradient(135deg, #f7971e, #ffd200)',
		'linear-gradient(135deg, #11998e, #38ef7d)',
		'linear-gradient(135deg, #ee0979, #ff6a00)',
		'linear-gradient(135deg, #8e2de2, #4a00e0)',
	];
	const demoBg = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
</script>

<div class="record-card-promo" data-nosnippet>
	<!-- Left: text content -->
	<div class="promo-content">
		<div class="promo-header">
			<CreditCard size={20} class="promo-icon" />
			<h3>Thẻ Bản Ghi</h3>
			<span class="price-badge">Từ 29,000đ</span>
		</div>

		<p class="promo-desc">Lưu giữ bản ghi của bạn dưới dạng thẻ vật lí</p>

		<ul class="feature-list">
			<li>✓ Kích thước chuẩn thẻ tín dụng CR80</li>
			<li>✓ Mã QR dẫn đến trang bản ghi</li>
			<li>✓ Thẻ nhựa có chip NFC (149k)</li>
		</ul>

		<a href="/vending" class="promo-cta">
			Tạo thẻ ngay
			<ArrowRight size={15} />
		</a>
	</div>

	<!-- Right: demo card -->
	<div class="demo-card-wrap">
		<div class="demo-card">
			<div class="demo-bg" style="background: {demoBg};"></div>
			<!-- Top row: logo left, progress right -->
			<div class="demo-top">
				<img src="/logo.png" alt="GDVN" class="demo-logo" />
				<span class="demo-progress">100%</span>
			</div>
			<!-- Bottom row: player left, level right -->
			<div class="demo-bottom">
				<div class="demo-player">
					<div class="demo-avatar-placeholder"></div>
					<span class="demo-name">{$user.loggedIn ? $user.data?.name : 'Tên người chơi'}</span>
				</div>
				<div class="demo-level-info">
					<span class="demo-level">Demon Level</span>
					<span class="demo-creator">by Creator</span>
				</div>
			</div>
		</div>
		<div class="shimmer-overlay"></div>
	</div>
</div>

<style lang="scss">
	.record-card-promo {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 14px;
		padding: 22px 24px;
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 28px;
	}

	/* Left content */
	.promo-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 12px;
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

	.price-badge {
		font-size: 11px;
		font-weight: 700;
		background: hsl(var(--foreground));
		color: hsl(var(--background));
		padding: 2px 8px;
		border-radius: 20px;
		white-space: nowrap;
	}

	.promo-desc {
		font-size: 13px;
		opacity: 0.65;
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
			opacity: 0.65;
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

	/* Right: demo card */
	.demo-card-wrap {
		position: relative;
		border-radius: 8px;
		overflow: hidden;
		width: 280px;
		flex-shrink: 0;
		aspect-ratio: 245 / 155.48;
	}

	.demo-card {
		position: absolute;
		inset: 0;
		border-radius: 8px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 10px 12px;
		box-sizing: border-box;
	}

	.demo-bg {
		position: absolute;
		inset: 0;
		z-index: 0;
	}

	.demo-top,
	.demo-bottom {
		position: relative;
		z-index: 2;
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
	}

	.demo-bottom {
		align-items: flex-end;
	}

	.demo-logo {
		width: 60px;
		height: 60px;
		object-fit: contain;
		opacity: 0.9;
		filter: invert(1);
		flex-shrink: 0;
		margin-top: -23px;
	}

	.demo-progress {
		font-size: 14px;
		font-weight: 800;
		color: #fff;
		background: rgba(0, 0, 0, 0.45);
		padding: 2px 7px;
		border-radius: 5px;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
		line-height: 1.2;
	}

	.demo-player {
		display: flex;
		align-items: center;
		gap: 5px;
	}

	.demo-avatar-placeholder {
		width: 39px;
		height: 39px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.35);
		border: 1.5px solid rgba(255, 255, 255, 0.5);
		flex-shrink: 0;
	}

	.demo-name {
		font-size: 17px;
		font-weight: 700;
		color: #fff;
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 120px;
	}

	.demo-level-info {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 1px;
	}

	.demo-level {
		font-size: 20px;
		font-weight: 800;
		color: #fff;
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
		text-align: right;
		line-height: 1.1;
	}

	.demo-creator {
		font-size: 11px;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.8);
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
		text-align: right;
	}

	/* Shimmer overlay */
	.shimmer-overlay {
		position: absolute;
		inset: 0;
		border-radius: 8px;
		overflow: hidden;
		pointer-events: none;
		z-index: 5;

		&::after {
			content: '';
			position: absolute;
			inset: -50%;
			background: linear-gradient(
				105deg,
				transparent 40%,
				rgba(255, 255, 255, 0.06) 45%,
				rgba(255, 255, 255, 0.12) 50%,
				rgba(255, 255, 255, 0.06) 55%,
				transparent 60%
			);
			animation: shimmer 4s ease-in-out infinite;
		}
	}

	@keyframes shimmer {
		0% { transform: translateX(-100%) rotate(15deg); }
		100% { transform: translateX(100%) rotate(15deg); }
	}

	@media screen and (max-width: 700px) {
		.record-card-promo {
			flex-direction: column;
		}

		.demo-card-wrap {
			width: 100%;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.shimmer-overlay::after {
			animation: none !important;
		}
	}
</style>
