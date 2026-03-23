<script lang="ts">
	import type { CardPreviewData } from '$lib/types/card';

	export let data: CardPreviewData;
	export let size: 'mini' | 'full' = 'full';

	let showModal = false;
</script>

{#if showModal}
	<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
	<div class="modal-backdrop" on:click={() => (showModal = false)}>
		<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
		<div class="modal-card" on:click|stopPropagation>
			<div class="card-wrap" class:dark={data.template === 1} class:light={data.template === 2} class:gold={data.template === 3}>
				<img class="card-bg" src={data.bgImage} alt="" />
				{#if data.template === 3}
					<div class="gold-frame"></div>
				{/if}
				<div class="card-top">
					<img class="gdvn-logo" src="/logo.png" alt="GDVN" />
					{#if data.progress !== null && data.progress !== undefined}
						<span class="progress-badge">{data.progress}%</span>
					{/if}
				</div>
				<div class="card-bottom">
					<div class="player-info">
						<img
							class="avatar"
							src={data.avatarImage || `https://cdn.gdvn.net/avatars/${data.playerUID}.jpg`}
							alt={data.playerName}
							on:error={(e) => {
								if (e.target instanceof HTMLImageElement) e.target.style.visibility = 'hidden';
							}}
						/>
						{#if data.clanTag}
							<span class="clan-tag" style={`background-color: ${data.clanTagBg || '#555'}; color: ${data.clanTagText || '#fff'};`}>
								{data.clanTag}
							</span>
						{/if}
						<span class="player-name">{data.playerName}</span>
					</div>
					<div class="level-info">
						<span class="level-name">{data.levelName}</span>
						{#if data.creator}
							<span class="creator-name">by {data.creator}</span>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div class="card-container {size}" on:click={() => (showModal = true)} style="cursor: pointer;">
	<div class="card-wrap" class:dark={data.template === 1} class:light={data.template === 2} class:gold={data.template === 3}>
		<!-- Background image — no overlay, image shows as-is -->
		<img class="card-bg" src={data.bgImage} alt="" />

		<!-- Gold border frame (template 3 only) -->
		{#if data.template === 3}
			<div class="gold-frame"></div>
		{/if}

		<!-- Top row: GDVN logo (left) + progress (right) -->
		<div class="card-top">
			<img class="gdvn-logo" src="/logo.png" alt="GDVN" />
			{#if data.progress !== null && data.progress !== undefined}
				<span class="progress-badge">{data.progress}%</span>
			{/if}
		</div>

		<!-- Bottom row: player info (left) + level info (right) -->
		<div class="card-bottom">
			<div class="player-info">
				<img
					class="avatar"
					src={data.avatarImage || `https://cdn.gdvn.net/avatars/${data.playerUID}.jpg`}
					alt={data.playerName}
					on:error={(e) => {
						if (e.target instanceof HTMLImageElement) e.target.style.visibility = 'hidden';
					}}
				/>
				{#if data.clanTag}
					<span
						class="clan-tag"
						style={`background-color: ${data.clanTagBg || '#555'}; color: ${data.clanTagText || '#fff'};`}
					>
						{data.clanTag}
					</span>
				{/if}
				<span class="player-name">{data.playerName}</span>
			</div>

			<div class="level-info">
				<span class="level-name">{data.levelName}</span>
				{#if data.creator}
					<span class="creator-name">by {data.creator}</span>
				{/if}
			</div>
		</div>
	</div>
</div>

<style lang="scss">
	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 1000;
		background: rgba(0, 0, 0, 0.75);
		display: flex;
		align-items: center;
		justify-content: center;
		backdrop-filter: blur(4px);
	}

	.modal-card {
		width: min(90vw, 600px);
		container-type: inline-size;

		.card-wrap {
			position: relative;
			aspect-ratio: 245 / 155.48;
			border-radius: 3.7cqw;
			overflow: hidden;
			display: flex;
			flex-direction: column;
			justify-content: space-between;
			padding: 2% 2.4%;
			box-sizing: border-box;
			width: 100%;
			box-shadow: 0 8px 48px rgba(0, 0, 0, 0.6);
		}
	}

	.card-container {
		container-type: inline-size;
		width: 100%;
	}

	.card-wrap {
		position: relative;
		aspect-ratio: 245 / 155.48;
		border-radius: 3.7cqw;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 2% 2.4%;
		box-sizing: border-box;
		width: 100%;
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
		inset: 0.8cqw;
		border-radius: 1.2cqw;
		border: 0.4cqw solid #ffd700;
		box-shadow: inset 0 0 2cqw rgba(255, 215, 0, 0.4);
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
		width: 14.7cqw;
		height: 14.7cqw;
		object-fit: contain;
		flex-shrink: 0;
		opacity: 0.9;
		margin-top: -4.7cqw;
	}

	.dark .gdvn-logo,
	.gold .gdvn-logo {
		filter: invert(1);
	}

	.progress-badge {
		font-size: 3.42cqw;
		font-weight: 800;
		padding: 0.48cqw 1.74cqw;
		border-radius: 1.2cqw;
		line-height: 1.2;
		margin-top: 1.5cqw;
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
		gap: 1.2cqw;
	}

	/* Player info (bottom-left) */
	.player-info {
		display: flex;
		align-items: center;
		gap: 1cqw;
		min-width: 0;
	}

	.avatar {
		width: 7.95cqw;
		height: 7.95cqw;
		border-radius: 50%;
		object-fit: cover;
		border: 0.3cqw solid rgba(255, 255, 255, 0.55);
		flex-shrink: 0;
	}

	.clan-tag {
		font-size: 2.85cqw;
		font-weight: 700;
		padding: 0.4cqw 1.2cqw;
		border-radius: 0.6cqw;
		flex-shrink: 0;
	}

	.player-name {
		font-size: 3.45cqw;
		font-weight: 700;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 53cqw;
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
		gap: 0;
		min-width: 0;
	}

	.level-name {
		font-size: 4.1cqw;
		font-weight: 800;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 65.3cqw;
		line-height: 1;
		text-align: right;
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
		font-size: 2.25cqw;
		font-weight: 500;
		text-align: right;
		line-height: 1.1;
		margin-top: -0.2cqw;
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
