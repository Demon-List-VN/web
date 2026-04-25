<script lang="ts">
	import type { PageData } from './$types';
	import type { CardPreviewData } from '$lib/types/card';
	import { onMount } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import CardPreview from '../../vending/CardPreview.svelte';
	import CardBack from '../../vending/CardBack.svelte';
	import { ExternalLink, Calendar, Trophy, Video, Copy, Check, RotateCw } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';

	export let data: PageData;

	// Animation state
	let showCard = false;
	let showId = false;
	let showInfo = false;
	let showRecord = false;

	// Card flip
	let isFlipped = false;

	// Share
	let copied = false;

	// 3D tilt
	let tiltX = 0;
	let tiltY = 0;
	let isHovering = false;

	$: card = data as any;
	$: record = card?.record;
	$: level = record?.levels;
	$: player = card?.players;

	$: bgImage = card?.img
		? card.img
		: level?.id
			? `https://levelthumbs.prevter.me/thumbnail/${level.id}/high`
			: '';

	$: template = (card?.template ?? 1) as 1 | 2 | 3;

	$: cardPreviewData = {
		playerUID: player?.uid ?? '',
		playerName: player?.name ?? '',
		clanTag: player?.clans?.tag ?? null,
		clanTagBg: player?.clans?.tagBgColor ?? null,
		clanTagText: player?.clans?.tagTextColor ?? null,
		levelName: level?.name ?? '',
		creator: level?.creator ?? null,
		progress: record?.progress ?? null,
		bgImage,
		avatarImage: card?.avatar ?? null,
		template
	} satisfies CardPreviewData;

	// Points array for badge rendering
	$: points = [
		record?.dlPt ? { label: 'DL', value: record.dlPt } : null,
		record?.flPt ? { label: 'FL', value: record.flPt } : null,
		record?.plPt ? { label: 'PL', value: record.plPt } : null,
		record?.clPt ? { label: 'CL', value: record.clPt } : null
	].filter(Boolean) as { label: string; value: number }[];

	onMount(() => {
		if (data.notFound) return;

		const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (prefersReduced) {
			showCard = showId = showInfo = showRecord = true;
			return;
		}

		setTimeout(() => (showCard = true), 100);
		setTimeout(() => (showId = true), 700);
		setTimeout(() => (showInfo = true), 1000);
		setTimeout(() => (showRecord = true), 1300);
	});

	function handleTiltMove(e: MouseEvent) {
		const el = e.currentTarget as HTMLElement;
		const rect = el.getBoundingClientRect();
		const x = (e.clientX - rect.left) / rect.width;
		const y = (e.clientY - rect.top) / rect.height;
		tiltX = (y - 0.5) * -12;
		tiltY = (x - 0.5) * 12;
		isHovering = true;
	}

	function handleTiltLeave() {
		tiltX = 0;
		tiltY = 0;
		isHovering = false;
	}

	async function copyLink() {
		await navigator.clipboard.writeText(window.location.href);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<svelte:head>
	{#if !data.notFound && level}
		<title>{$_('head.titles.record_card')}: {level.name} - {$_('head.site_name')}</title>
	{:else}
		<title>{$_('head.titles.record_card')} - {$_('head.site_name')}</title>
	{/if}
</svelte:head>

{#if data.notFound}
	<div class="not-found">
		<p>Không tìm thấy thẻ bản ghi này.</p>
	</div>
{:else}
	<div class="wrapper">
		<!-- Card with 3D tilt + flip -->
		{#if showCard}
			<div class="card-display" in:fly={{ y: 60, duration: 500, easing: quintOut }}>
				<!-- svelte-ignore a11y-no-static-element-interactions -->
				<div
					class="card-perspective"
					on:mousemove={handleTiltMove}
					on:mouseleave={handleTiltLeave}
				>
					<div
						class="card-flip-container"
						class:flipped={isFlipped}
						style="transform: perspective(800px) rotateX({tiltX}deg) rotateY({isFlipped ? 180 + tiltY : tiltY}deg); {isHovering ? '' : 'transition: transform 0.4s ease;'}"
					>
						<div class="card-face card-front">
							<CardPreview data={cardPreviewData} size="full" />
							<div class="holographic-overlay"></div>
							<div class="card-glow"></div>
						</div>
						<div class="card-face card-back-face">
							<CardBack cardID={card?.id} scale={2} />
						</div>
					</div>
				</div>

				<div class="card-actions">
					<button class="action-btn" on:click={() => (isFlipped = !isFlipped)} type="button">
						<RotateCw size={14} />
						{isFlipped ? 'Mặt trước' : 'Mặt sau'}
					</button>
					<button class="action-btn" on:click={copyLink} type="button">
						{#if copied}
							<Check size={14} />
							Đã sao chép
						{:else}
							<Copy size={14} />
							Chia sẻ
						{/if}
					</button>
				</div>
			</div>
		{/if}

		<!-- Card ID -->
		{#if showId}
			<p class="card-id" in:fade={{ duration: 300 }}>ID: {data.id}</p>
		{/if}

		<!-- Player info -->
		{#if showInfo && player}
			<div class="player-section" in:fly={{ y: 15, duration: 400, easing: quintOut }}>
				<img
					class="player-avatar"
					src={`https://cdn.gdvn.net/avatars/${player.uid}.jpg`}
					alt={player.name}
				/>
				<div class="player-details">
					{#if player.clans?.tag}
						<span
							class="clan-badge"
							style={`background-color: ${player.clans.tagBgColor}; color: ${player.clans.tagTextColor};`}
						>
							{player.clans.tag}
						</span>
					{/if}
					<a href={`/player/${player.uid}`} class="player-name">{player.name}</a>
				</div>
			</div>
		{/if}

		<!-- Record detail -->
		{#if showRecord && record && level}
			<div class="record-detail" in:fly={{ y: 20, duration: 500, easing: quintOut }}>
				<h2 class="section-title">Thông tin bản ghi</h2>

				<div class="detail-rows">
					<!-- Level -->
					<div class="detail-row">
						<Trophy size={15} class="detail-icon" />
						<span class="detail-label">Level:</span>
						<a href={`/level/${level.id}`} class="detail-value link">{level.name}</a>
					</div>

					<!-- Progress -->
					<div class="detail-row">
						<span class="detail-label">Tiến độ:</span>
						<span class="detail-value">{record.progress}%</span>
					</div>

					<!-- Points as badges -->
					{#if points.length > 0}
						<div class="detail-row">
							<span class="detail-label">Điểm:</span>
							<div class="point-badges">
								{#each points as pt}
									<span class="point-badge">
										<span class="point-label">{pt.label}</span>
										{pt.value.toFixed(2)}
									</span>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Date -->
					{#if record.timestamp}
						<div class="detail-row">
							<Calendar size={15} class="detail-icon" />
							<span class="detail-label">Ngày:</span>
							<span class="detail-value">
								{new Date(record.timestamp).toLocaleDateString('vi-VN')}
							</span>
						</div>
					{/if}

					<!-- Video -->
					{#if record.videoLink}
						<div class="detail-row">
							<Video size={15} class="detail-icon" />
							<span class="detail-label">Video:</span>
							<a
								href={record.videoLink}
								target="_blank"
								rel="noopener noreferrer"
								class="detail-value link"
							>
								Xem video
								<ExternalLink size={11} class="inline-icon" />
							</a>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
{/if}

<style lang="scss">
	.wrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		margin-top: 50px;
		padding-inline: 16px;
		max-width: 500px;
		margin-left: auto;
		margin-right: auto;
		padding-bottom: 60px;
	}

	.not-found {
		text-align: center;
		padding: 80px 20px;
		opacity: 0.5;
		font-size: 15px;
	}

	/* ===== Card Display ===== */
	.card-display {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
	}

	.card-perspective {
		width: 100%;
	}

	.card-flip-container {
		position: relative;
		width: 100%;
		transform-style: preserve-3d;
		will-change: transform;
	}

	.card-face {
		width: 100%;
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
	}

	.card-front {
		position: relative;
	}

	.card-back-face {
		position: absolute;
		inset: 0;
		transform: rotateY(180deg);
	}

	/* ===== Holographic Shimmer ===== */
	.holographic-overlay {
		position: absolute;
		inset: 0;
		border-radius: 8px;
		overflow: hidden;
		pointer-events: none;
		z-index: 15;

		&::after {
			content: '';
			position: absolute;
			inset: -50%;
			background: linear-gradient(
				105deg,
				transparent 40%,
				rgba(255, 255, 255, 0.08) 45%,
				rgba(255, 255, 255, 0.15) 50%,
				rgba(255, 255, 255, 0.08) 55%,
				transparent 60%
			);
			animation: holoShimmer 3s ease-in-out infinite;
			animation-delay: 0.5s;
		}
	}

	@keyframes holoShimmer {
		0% { transform: translateX(-100%) rotate(15deg); }
		100% { transform: translateX(100%) rotate(15deg); }
	}

	/* ===== Glow Pulse ===== */
	.card-glow {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 120%;
		height: 120%;
		background: radial-gradient(ellipse, hsl(var(--ring) / 0.3) 0%, transparent 70%);
		animation: glowPulse 1.2s ease-out forwards;
		z-index: 5;
		pointer-events: none;
	}

	@keyframes glowPulse {
		0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
		40% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
		100% { opacity: 0; transform: translate(-50%, -50%) scale(1.1); }
	}

	/* ===== Card Actions ===== */
	.card-actions {
		display: flex;
		gap: 8px;
	}

	.action-btn {
		display: flex;
		align-items: center;
		gap: 5px;
		background: hsl(var(--muted));
		border: 1px solid hsl(var(--border));
		border-radius: 6px;
		padding: 6px 14px;
		font-size: 12px;
		cursor: pointer;
		color: hsl(var(--foreground));
		transition: background 0.15s ease;

		&:hover {
			background: hsl(var(--accent));
		}
	}

	/* ===== Card ID ===== */
	.card-id {
		font-size: 11px;
		opacity: 0.4;
		margin: 0;
	}

	/* ===== Player Section ===== */
	.player-section {
		display: flex;
		align-items: center;
		gap: 10px;
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 10px;
		padding: 10px 14px;
		width: 100%;
		box-sizing: border-box;
	}

	.player-avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		object-fit: cover;
		border: 1px solid hsl(var(--border));
		flex-shrink: 0;
	}

	.player-details {
		display: flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
	}

	.clan-badge {
		font-size: 10px;
		font-weight: 700;
		padding: 1px 6px;
		border-radius: 4px;
		flex-shrink: 0;
	}

	.player-name {
		font-size: 14px;
		font-weight: 700;
		color: hsl(var(--foreground));
		text-decoration: none;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;

		&:hover {
			text-decoration: underline;
		}
	}

	/* ===== Record Detail ===== */
	.record-detail {
		width: 100%;
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		padding: 16px;
		box-sizing: border-box;
	}

	.section-title {
		font-size: 14px;
		font-weight: 700;
		margin: 0 0 14px;
	}

	.detail-rows {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.detail-row {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
	}

	.detail-label {
		opacity: 0.55;
		font-weight: 500;
		white-space: nowrap;
	}

	.detail-value {
		font-weight: 600;

		&.link {
			color: hsl(var(--foreground));
			text-decoration: underline;
			text-underline-offset: 2px;
		}
	}

	/* ===== Point Badges ===== */
	.point-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}

	.point-badge {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		font-size: 12px;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: 6px;
		background: hsl(var(--muted));
		border: 1px solid hsl(var(--border));
	}

	.point-label {
		font-size: 10px;
		font-weight: 700;
		opacity: 0.6;
	}

	/* ===== Global Icon Styles ===== */
	:global(.detail-icon) {
		opacity: 0.5;
		flex-shrink: 0;
	}

	:global(.inline-icon) {
		vertical-align: middle;
		margin-left: 2px;
	}

	/* ===== Reduced Motion ===== */
	@media (prefers-reduced-motion: reduce) {
		.card-glow { animation: none !important; display: none; }
		.holographic-overlay::after { animation: none !important; }
		.card-flip-container { transition: none !important; }
	}
</style>
