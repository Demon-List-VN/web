<script lang="ts">
	import { ArrowRight, Swords } from 'lucide-svelte';
	import { user } from '$lib/client';

	$: playerLabel = $user.loggedIn ? $user.data?.name || 'Bạn' : 'Bạn';
	$: playerInitials = getInitials(playerLabel);

	function getInitials(value: string) {
		const initials = value
			.trim()
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0])
			.join('')
			.toUpperCase();

		return initials || 'GD';
	}
</script>

<div class="pvp-one-v-one-promo" data-nosnippet>
	<div class="promo-content">
		<div class="promo-header">
			<Swords size={20} color="#0ea5e9" />
			<h3>1v1 Versus</h3>
			<span class="badge">Realtime</span>
		</div>

		<p class="promo-desc">
			Đấu versus 1v1 PvP trên cùng một level, ghép trận xếp hạng hoặc mời thẳng người chơi bạn muốn
			thử sức.
		</p>

		<ul class="feature-list">
			<li>✓ Ghép trận PvP theo Elo</li>
			<li>✓ Mời người chơi và nhận lời realtime</li>
			<li>✓ Ẩn danh, chat và rematch sau trận</li>
		</ul>

		<a href="/versus" class="promo-cta">
			Vào 1v1 Versus
			<ArrowRight size={15} />
		</a>
	</div>

	<div class="arena-preview" aria-hidden="true">
		<div class="arena-surface">
			<div class="arena-top">
				<span class="arena-chip">1v1</span>
				<span class="arena-chip arena-chip-muted">Versus</span>
			</div>

			<div class="versus-grid">
				<div class="fighter">
					<div class="player-avatar player-avatar-you">{playerInitials}</div>
					<strong>{playerLabel}</strong>
					<span>Sẵn sàng</span>
				</div>

				<div class="versus-mark">VS</div>

				<div class="fighter">
					<div class="player-avatar player-avatar-rival">ĐT</div>
					<strong>Đối thủ</strong>
					<span>Đang tìm</span>
				</div>
			</div>

			<div class="level-strip">
				<div>
					<span>Level chung</span>
					<strong>Challenge level</strong>
				</div>
				<small>03:00</small>
			</div>

			<div class="match-bars">
				<div class="match-bar">
					<span></span>
				</div>
				<div class="match-bar match-bar-rival">
					<span></span>
				</div>
			</div>
		</div>
		<div class="scanline"></div>
	</div>
</div>

<style lang="scss">
	.pvp-one-v-one-promo {
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
		gap: 16px;
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
		background: color-mix(in srgb, #14b8a6 22%, hsl(var(--card)));
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

	.arena-preview {
		position: relative;
		width: 280px;
		flex-shrink: 0;
		border-radius: 12px;
		overflow: hidden;
	}

	.arena-surface {
		position: relative;
		min-height: 180px;
		padding: 14px;
		display: flex;
		flex-direction: column;
		gap: 14px;
		border-radius: 12px;
		overflow: hidden;
		background:
			linear-gradient(135deg, rgba(20, 184, 166, 0.9), rgba(15, 23, 42, 0.92)),
			linear-gradient(90deg, rgba(250, 204, 21, 0.3), rgba(244, 63, 94, 0.25));
		color: #fff;
	}

	.arena-surface::before {
		content: '';
		position: absolute;
		inset: 0;
		background:
			linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
		background-size: 26px 26px;
		mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.88), transparent);
		pointer-events: none;
	}

	.arena-top,
	.versus-grid,
	.level-strip,
	.match-bars {
		position: relative;
		z-index: 1;
	}

	.arena-top {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		flex-wrap: wrap;
	}

	.arena-chip {
		display: inline-flex;
		align-items: center;
		padding: 4px 9px;
		border-radius: 999px;
		font-size: 11px;
		font-weight: 800;
		color: #fff;
		background: rgba(15, 23, 42, 0.3);
		backdrop-filter: blur(8px);
	}

	.arena-chip-muted {
		background: rgba(255, 255, 255, 0.16);
	}

	.versus-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
		align-items: center;
		gap: 10px;
	}

	.fighter {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		min-width: 0;
		padding: 10px 8px;
		border-radius: 10px;
		background: rgba(15, 23, 42, 0.24);
		backdrop-filter: blur(8px);
		text-align: center;

		strong {
			width: 100%;
			font-size: 12px;
			line-height: 1.1;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		span {
			font-size: 10px;
			font-weight: 700;
			color: rgba(255, 255, 255, 0.72);
		}
	}

	.player-avatar {
		width: 42px;
		height: 42px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 12px;
		font-weight: 900;
		border: 2px solid rgba(255, 255, 255, 0.44);
		box-shadow: 0 8px 20px rgba(15, 23, 42, 0.26);
	}

	.player-avatar-you {
		background: linear-gradient(135deg, #22c55e, #06b6d4);
	}

	.player-avatar-rival {
		background: linear-gradient(135deg, #f43f5e, #f59e0b);
	}

	.versus-mark {
		width: 38px;
		height: 38px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 11px;
		font-weight: 900;
		color: #0f172a;
		background: #facc15;
		box-shadow: 0 8px 20px rgba(15, 23, 42, 0.28);
	}

	.level-strip {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		padding: 9px 10px;
		border-radius: 10px;
		background: rgba(15, 23, 42, 0.28);
		backdrop-filter: blur(8px);

		div {
			display: flex;
			flex-direction: column;
			gap: 2px;
			min-width: 0;
		}

		span,
		small {
			font-size: 10px;
			font-weight: 800;
			color: rgba(255, 255, 255, 0.66);
		}

		strong {
			font-size: 13px;
			line-height: 1.1;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		small {
			font-size: 12px;
			color: #facc15;
			flex-shrink: 0;
		}
	}

	.match-bars {
		display: flex;
		gap: 8px;
	}

	.match-bar {
		flex: 1;
		height: 7px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.2);
		overflow: hidden;

		span {
			display: block;
			width: 78%;
			height: 100%;
			border-radius: inherit;
			background: #22c55e;
		}
	}

	.match-bar-rival span {
		width: 64%;
		background: #f43f5e;
	}

	.scanline {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.scanline::after {
		content: '';
		position: absolute;
		inset: -45%;
		background: linear-gradient(
			110deg,
			transparent 40%,
			rgba(255, 255, 255, 0.05) 46%,
			rgba(255, 255, 255, 0.14) 50%,
			rgba(255, 255, 255, 0.05) 54%,
			transparent 60%
		);
		animation: scanline 4.2s ease-in-out infinite;
	}

	@keyframes scanline {
		0% {
			transform: translateX(-100%) rotate(16deg);
		}
		100% {
			transform: translateX(100%) rotate(16deg);
		}
	}

	@media screen and (max-width: 700px) {
		.pvp-one-v-one-promo {
			flex-direction: column;
		}

		.arena-preview {
			width: 100%;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.scanline::after {
			animation: none !important;
		}
	}
</style>
