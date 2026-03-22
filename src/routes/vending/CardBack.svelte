<script lang="ts">
	import { onMount } from 'svelte';
	import QRCode from 'qrcode';

	export let cardID: string | undefined = undefined;
	export let scale: number = 1;

	let qrDataUrl = '';

	const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 'https://gdvn.net';

	onMount(async () => {
		if (cardID) {
			qrDataUrl = await QRCode.toDataURL(`${FRONTEND_URL}/record-card/${cardID}`, {
				width: 120,
				margin: 1,
				color: { dark: '#1a1a1a', light: '#ffffff' }
			});
		}
	});
</script>

<div class="card-back-container" style={scale !== 1 ? `aspect-ratio: 245 / 155.48;` : ''}>
<div
	class="card-back-scaler"
	style={scale !== 1 ? `width: ${100 / scale}%; transform: scale(${scale}); transform-origin: top left;` : ''}
>
<div class="card-back">
	<!-- QR Code -->
	<div class="qr-section">
		{#if qrDataUrl}
			<img src={qrDataUrl} alt="QR Code" class="qr-code" />
		{:else}
			<div class="qr-placeholder">
				<div class="qr-icon">
					<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<rect x="3" y="3" width="7" height="7" rx="1" />
						<rect x="14" y="3" width="7" height="7" rx="1" />
						<rect x="3" y="14" width="7" height="7" rx="1" />
						<rect x="5" y="5" width="3" height="3" fill="currentColor" />
						<rect x="16" y="5" width="3" height="3" fill="currentColor" />
						<rect x="5" y="16" width="3" height="3" fill="currentColor" />
						<path d="M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" fill="currentColor" />
					</svg>
				</div>
				<p class="placeholder-text">QR sẽ được tạo<br />sau khi đặt hàng</p>
			</div>
		{/if}
	</div>
</div>
</div>
</div>

<style lang="scss">
	.card-back {
		aspect-ratio: 245 / 155.48;
		border-radius: 8px;
		background: #fff;
		border: 1px solid #e5e5e5;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-between;
		padding: 8px 10px;
		box-sizing: border-box;
		width: 100%;
		overflow: hidden;
	}

	.logo-section {
		display: flex;
		align-items: center;
		gap: 5px;
	}

	.gdvn-logo {
		width: 54px;
		height: 54px;
		object-fit: contain;
	}

	.brand {
		font-size: 8px;
		font-weight: 700;
		color: #333;
		letter-spacing: 0.3px;
	}

	.qr-section {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: 1;
	}

	.qr-code {
		width: 70px;
		height: 70px;
		image-rendering: pixelated;
	}

	.qr-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
		color: #aaa;
	}

	.placeholder-text {
		font-size: 7px;
		text-align: center;
		color: #bbb;
		margin: 0;
		line-height: 1.4;
	}

	.scan-text {
		p {
			font-size: 7px;
			color: #666;
			margin: 0;
			text-align: center;
		}
	}

	.bottom-bar {
		font-size: 7px;
		color: #999;
		font-weight: 600;
		letter-spacing: 0.5px;
	}
</style>
