<script lang="ts">
	export let playerUID: string;
	export let playerName: string;
	export let clanTag: string | null = null;
	export let clanTagBg: string | null = null;
	export let clanTagText: string | null = null;
	export let levelName: string;
	export let creator: string | null = null;
	export let progress: number | null = null;
	export let bgImage: string;
	export let template: 1 | 2 | 3 = 1; // 1=Tối, 2=Sáng, 3=Vàng
	export let size: 'mini' | 'full' = 'full';
</script>

<div class="card-wrap {size}" class:dark={template === 1} class:light={template === 2} class:gold={template === 3}>
	<!-- Background image — no overlay, image shows as-is -->
	<img class="card-bg" src={bgImage} alt="" />

	<!-- Gold border frame (template 3 only) -->
	{#if template === 3}
		<div class="gold-frame"></div>
	{/if}

	<!-- Top row: GDVN logo (left) + progress (right) -->
	<div class="card-top">
		<img class="gdvn-logo" src="/logo.png" alt="GDVN" />
		{#if progress !== null && progress !== undefined}
			<span class="progress-badge">{progress}%</span>
		{/if}
	</div>

	<!-- Bottom row: player info (left) + level info (right) -->
	<div class="card-bottom">
		<div class="player-info">
			<img
				class="avatar"
				src={`https://cdn.gdvn.net/avatars/${playerUID}.jpg`}
				alt={playerName}
				on:error={(e) => {
					if (e.target instanceof HTMLImageElement) e.target.style.display = 'none';
				}}
			/>
			{#if clanTag}
				<span
					class="clan-tag"
					style={`background-color: ${clanTagBg || '#555'}; color: ${clanTagText || '#fff'};`}
				>
					{clanTag}
				</span>
			{/if}
			<span class="player-name">{playerName}</span>
		</div>

		<div class="level-info">
			<span class="level-name">{levelName}</span>
			{#if creator}
				<span class="creator-name">by {creator}</span>
			{/if}
		</div>
	</div>
</div>

<style lang="scss">
	.card-wrap {
		position: relative;
		aspect-ratio: 245 / 155.48;
		border-radius: 8px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 10px 12px;
		box-sizing: border-box;
		width: 100%;

		&.mini {
			border-radius: 5px;
			padding: 5px 7px;
		}
	}

	.card-bg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		z-index: 0;
	}

	.gold-frame {
		position: absolute;
		inset: 4px;
		border-radius: 6px;
		border: 2px solid #ffd700;
		box-shadow: inset 0 0 10px rgba(255, 215, 0, 0.4);
		z-index: 2;
		pointer-events: none;
	}

	/* Top row */
	.card-top {
		position: relative;
		z-index: 3;
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
	}

	.gdvn-logo {
		width: 60px;
		height: 60px;
		object-fit: contain;
		flex-shrink: 0;
		opacity: 0.9;
		margin-top: -23px;

		.mini & {
			width: 36px;
			height: 36px;
			margin-top: -14px;
		}
	}

	.dark .gdvn-logo,
	.gold .gdvn-logo {
		filter: invert(1);
	}

	.progress-badge {
		font-size: 14px;
		font-weight: 800;
		padding: 2px 7px;
		border-radius: 5px;
		line-height: 1.2;

		.mini & {
			font-size: 9px;
			padding: 1px 4px;
		}
	}

	.dark .progress-badge,
	.gold .progress-badge {
		color: #fff;
		background: rgba(0, 0, 0, 0.45);
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
	}

	.gold .progress-badge {
		color: #ffe87a;
	}

	.light .progress-badge {
		color: #1a1a1a;
		background: rgba(255, 255, 255, 0.55);
		text-shadow: 0 1px 2px rgba(255, 255, 255, 0.9);
	}

	/* Bottom row */
	.card-bottom {
		position: relative;
		z-index: 3;
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 6px;
	}

	/* Player info (bottom-left) */
	.player-info {
		display: flex;
		align-items: center;
		gap: 5px;
		min-width: 0;
	}

	.avatar {
		width: 39px;
		height: 39px;
		border-radius: 50%;
		object-fit: cover;
		border: 1.5px solid rgba(255, 255, 255, 0.55);
		flex-shrink: 0;

		.mini & {
			width: 24px;
			height: 24px;
		}
	}

	.clan-tag {
		font-size: 14px;
		font-weight: 700;
		padding: 2px 6px;
		border-radius: 3px;
		flex-shrink: 0;

		.mini & {
			font-size: 8px;
			padding: 1px 3px;
		}
	}

	.player-name {
		font-size: 17px;
		font-weight: 700;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 130px;

		.mini & {
			font-size: 10px;
			max-width: 75px;
		}
	}

	.dark .player-name,
	.gold .player-name {
		color: #fff;
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
	}

	.gold .player-name {
		color: #ffd700;
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
	}

	.light .player-name {
		color: #1a1a1a;
		text-shadow: 0 1px 3px rgba(255, 255, 255, 0.9);
	}

	/* Level info (bottom-right) */
	.level-info {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 1px;
		min-width: 0;
	}

	.level-name {
		font-size: 20px;
		font-weight: 800;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 160px;
		line-height: 1.1;
		text-align: right;

		.mini & {
			font-size: 12px;
			max-width: 90px;
		}
	}

	.dark .level-name,
	.gold .level-name {
		color: #fff;
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
	}

	.gold .level-name {
		color: #ffe87a;
	}

	.light .level-name {
		color: #1a1a1a;
		text-shadow: 0 1px 3px rgba(255, 255, 255, 0.9);
	}

	.creator-name {
		font-size: 11px;
		font-weight: 500;
		text-align: right;

		.mini & {
			font-size: 7px;
		}
	}

	.dark .creator-name,
	.gold .creator-name {
		color: rgba(255, 255, 255, 0.8);
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
	}

	.light .creator-name {
		color: rgba(0, 0, 0, 0.65);
		text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
	}
</style>
