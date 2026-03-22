<script lang="ts">
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import CardPreview from '../../vending/CardPreview.svelte';
	import CardBack from '../../vending/CardBack.svelte';
	import { ExternalLink, Calendar, Trophy, Video } from 'lucide-svelte';

	export let data: PageData;

	let showCard = false;
	let showId = false;
	let showInfo = false;
	let showRecord = false;
	let showBack = false;

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
</script>

<svelte:head>
	{#if !data.notFound && level}
		<title>Thẻ Bản Ghi: {level.name} - Geometry Dash Việt Nam</title>
	{:else}
		<title>Thẻ Bản Ghi - Geometry Dash Việt Nam</title>
	{/if}
</svelte:head>

{#if data.notFound}
	<div class="not-found">
		<p>Không tìm thấy thẻ bản ghi này.</p>
	</div>
{:else}
	<div class="wrapper">
		<!-- Card visual -->
		{#if showCard}
			<div class="card-display" in:fly={{ y: 60, duration: 500, easing: quintOut }}>
				<div class="card-flip-wrap">
					{#if !showBack}
						<div class="card-image-wrapper">
							<CardPreview
								playerUID={player?.uid ?? ''}
								playerName={player?.name ?? ''}
								clanTag={player?.clans?.tag ?? null}
								clanTagBg={player?.clans?.tagBgColor ?? null}
								clanTagText={player?.clans?.tagTextColor ?? null}
								levelName={level?.name ?? ''}
								creator={level?.creator ?? null}
								progress={record?.progress ?? null}
								{bgImage}
								{template}
								size="full"
							/>
							<div class="holographic-overlay"></div>
							<div class="card-glow"></div>
						</div>
					{:else}
						<CardBack cardID={card?.id} scale={2} />
					{/if}
				</div>
				<button class="flip-btn" on:click={() => (showBack = !showBack)} type="button">
					{showBack ? 'Xem mặt trước' : 'Xem mặt sau'}
				</button>
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
				<div>
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

				<div class="record-card-detail">
					<!-- Level name -->
					<div class="detail-row">
						<Trophy size={15} class="detail-icon" />
						<span class="detail-label">Level:</span>
						<a href={`/level/${level.id}`} class="detail-value link">{level.name}</a>
					</div>

					<!-- Progress -->
					<div class="detail-row">
						<span class="detail-label">Tiến độ:</span>
						<span class="detail-value">
							{record.progress}%
						</span>
					</div>

					<!-- Points -->
					{#if record.dlPt || record.flPt || record.plPt || record.clPt}
						<div class="detail-row">
							<span class="detail-label">Điểm:</span>
							<span class="detail-value">
								{#if record.dlPt}DL: {record.dlPt?.toFixed(2)}pt{/if}
								{#if record.flPt}{record.dlPt ? ' · ' : ''}FL: {record.flPt?.toFixed(2)}pt{/if}
								{#if record.plPt}{(record.dlPt || record.flPt) ? ' · ' : ''}PL: {record.plPt?.toFixed(2)}pt{/if}
								{#if record.clPt}{(record.dlPt || record.flPt || record.plPt) ? ' · ' : ''}CL: {record.clPt?.toFixed(2)}pt{/if}
							</span>
						</div>
					{/if}

					<!-- Date -->
					{#if record.timestamp}
						<div class="detail-row">
							<Calendar size={15} class="detail-icon" />
							<span class="detail-label">Ngày hoàn thành:</span>
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
							<a href={record.videoLink} target="_blank" rel="noopener noreferrer" class="detail-value link">
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

	.card-display {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
	}

	.card-flip-wrap {
		position: relative;
		width: 100%;
	}

	.card-image-wrapper {
		position: relative;
		width: 100%;
	}

	/* Holographic shimmer — same as /card/[id]/scan */
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

	.flip-btn {
		background: hsl(var(--muted));
		border: 1px solid hsl(var(--border));
		border-radius: 6px;
		padding: 6px 14px;
		font-size: 12px;
		cursor: pointer;
		color: hsl(var(--foreground));
		transition: background 0.15s ease;
		align-self: center;

		&:hover {
			background: hsl(var(--accent));
		}
	}

	.card-id {
		font-size: 11px;
		opacity: 0.4;
		margin: 0;
	}

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

	.clan-badge {
		font-size: 10px;
		font-weight: 700;
		padding: 1px 6px;
		border-radius: 4px;
		margin-right: 6px;
	}

	.player-name {
		font-size: 14px;
		font-weight: 700;
		color: hsl(var(--foreground));
		text-decoration: none;

		&:hover {
			text-decoration: underline;
		}
	}

	/* Record detail */
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

	.record-card-detail {
		display: flex;
		flex-direction: column;
		gap: 8px;
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

	:global(.detail-icon) {
		opacity: 0.5;
		flex-shrink: 0;
	}

	:global(.inline-icon) {
		vertical-align: middle;
		margin-left: 2px;
	}

	@media (prefers-reduced-motion: reduce) {
		.card-glow { animation: none !important; display: none; }
		.holographic-overlay::after { animation: none !important; }
	}
</style>
