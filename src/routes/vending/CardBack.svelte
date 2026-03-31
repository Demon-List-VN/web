<script lang="ts">
	import { onMount } from 'svelte';
	import QRCode from 'qrcode';
	import { Nfc } from 'lucide-svelte';

	export let cardID: string | undefined = undefined;
	export let scale: number = 1;
	export let fillContainer: boolean = false;
	export let hasNFC: boolean = false;

	let qrDataUrl = '';

	const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 'https://gdvn.net';

	onMount(async () => {
		if (cardID) {
			qrDataUrl = await QRCode.toDataURL(`${FRONTEND_URL}/record-card/${cardID}`, {
				width: 200,
				margin: 1,
				color: { dark: '#1a1a1a', light: '#ffffff' }
			});
		}
	});
</script>

<div class="card-back-container" class:fill={fillContainer} style={scale !== 1 ? `aspect-ratio: 245 / 155.48;` : ''}>
<div
	class="card-back-scaler"
	style={scale !== 1 ? `width: ${100 / scale}%; transform: scale(${scale}); transform-origin: top left;` : ''}
>
<div class="card-back">
	<!-- Header row -->
	<div class="header-row">
		<div class="nfc-slot">
			{#if hasNFC}
				<Nfc class="nfc-icon" strokeWidth={2} color="#111" />
			{/if}
		</div>
		<img src="/logo.png" alt="GDVN" class="gdvn-logo" />
	</div>

	<!-- Main content -->
	<div class="main-content">
		<div class="top-sections">
			<div class="section">
				<p><strong>Kích hoạt thẻ</strong><br />
				Truy cập vào www.gdvn.net, đăng nhập và quét thẻ này. Thông báo liên kết thẻ sẽ hiển thị trên màn hình và thực hiện theo hướng dẫn. Hoặc vào Settings &gt; Card và nhập ID của thẻ để liên kết.</p>
			</div>
			<div class="section">
				<p><strong>Sử dụng thẻ</strong><br />
				Quét thẻ này thông qua giao thức NFC hoặc quét mã QR bằng camera.</p>
			</div>
			<div class="section">
				<p><strong>Điều kiện sử dụng</strong><br />
				Thẻ này không có giá trị quy đổi thành tiền mặt • Thẻ này có giá trị sử dụng tại các ứng dụng và sự kiện do Geometry Dash VN quản lí • Geometry Dash VN không chịu trách nhiệm các sự cố do thẻ bị mất cắp hoặc hư hỏng.</p>
			</div>
		</div>

		<div class="bottom-sections">
			<div class="section support">
				<p><strong>Hỗ trợ khách hàng</strong><br />
				Email: support@gdvn.net<br />
				Website: www.gdvn.net</p>
			</div>

			<!-- Right: QR code -->
			<div class="qr-column">
				<div class="qr-box">
					{#if qrDataUrl}
						<img src={qrDataUrl} alt="QR Code" class="qr-code" />
					{:else}
						<span class="qr-placeholder-text">QR code here</span>
					{/if}
				</div>
				<p class="card-id">ID: {cardID || '00000000-0000-0000-0000-000000000000'}</p>
			</div>
		</div>
	</div>
</div>
</div>
</div>

<style lang="scss">
	.card-back-container {
		width: 100%;
	}

	.card-back-container.fill {
		height: 100%;
		width: 100%;
		container-type: size;
	}

	.card-back-container.fill .card-back-scaler,
	.card-back-container.fill .card-back {
		aspect-ratio: unset;
		height: 100%;
		width: 100%;
	}

	/* Scale elements by cqmin (min of width/height) so they stay proportional
	   regardless of card shape. Values = original cqw × 1.576 (CR80 ratio),
	   so CR80 looks identical to non-fill mode. */
	.card-back-container.fill .card-back {
		padding: 4.73cqmin 6.3cqmin;
		gap: 1.58cqmin;
	}
	.card-back-container.fill .header-row {
		margin-bottom: 1.58cqmin;
	}
	.card-back-container.fill .nfc-slot {
		width: 15.76cqmin;
		height: 11.03cqmin;
		margin-left: 26.8cqmin;
	}
	.card-back-container.fill :global(.nfc-icon) {
		width: 9.46cqmin;
		height: 9.46cqmin;
	}
	.card-back-container.fill .gdvn-logo {
		width: 23.64cqmin;
	}
	.card-back-container.fill .main-content {
		gap: 3.15cqmin;
	}
	.card-back-container.fill .top-sections {
		gap: 1.26cqmin;
	}
	.card-back-container.fill .bottom-sections {
		gap: 3.15cqmin;
	}
	.card-back-container.fill .section p {
		font-size: 3.15cqmin;
	}
	.card-back-container.fill .qr-column {
		gap: 1.26cqmin;
	}
	.card-back-container.fill .qr-box {
		width: 25.2cqmin;
		height: 25.2cqmin;
	}
	.card-back-container.fill .qr-placeholder-text {
		font-size: 3.15cqmin;
	}
	.card-back-container.fill .card-id {
		font-size: 2.36cqmin;
	}

	.card-back {
		container-type: inline-size;
		aspect-ratio: 245 / 155.48;
		border-radius: 8px;
		background: #fff;
		border: 1px solid #e5e5e5;
		display: flex;
		flex-direction: column;
		padding: 3cqw 4cqw 3cqw 4cqw;
		box-sizing: border-box;
		width: 100%;
		overflow: hidden;
		gap: 1cqw;
		font-family: sans-serif;
		color: #111;
	}

	.header-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		flex-shrink: 0;
		margin-bottom: 1cqw;
	}

	.nfc-slot {
		width: 10cqw;
		height: 7cqw;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-left: 17cqw;

		:global(.nfc-icon) {
			width: 6cqw;
			height: 6cqw;
			color: #111 !important;
			stroke: #111 !important;
			print-color-adjust: exact;
			-webkit-print-color-adjust: exact;
		}
	}

	.gdvn-logo {
		width: 15cqw;
		height: auto;
		object-fit: contain;
	}

	.main-content {
		display: flex;
		flex-direction: column;
		flex: 1;
		gap: 2cqw;
		min-height: 0;
	}

	.top-sections {
		display: flex;
		flex-direction: column;
		gap: 0.8cqw;
		min-width: 0;
	}

	.bottom-sections {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: auto;
		gap: 2cqw;
	}

	.section p {
		margin: 0;
		font-size: 2cqw;
		line-height: 1.3;
		color: #111;

		strong {
			color: #111;
			font-weight: 700;
		}
	}

	.section.support {
		flex: 1;
	}

	.qr-column {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		gap: 0.8cqw;
		flex-shrink: 0;
	}

	.qr-box {
		width: 16cqw;
		height: 16cqw;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		background: #fff;
	}

	.qr-code {
		width: 100%;
		height: 100%;
		image-rendering: auto;
	}

	.qr-placeholder-text {
		font-size: 2cqw;
		color: #888;
		font-style: italic;
		text-align: center;
	}

	.card-id {
		font-size: 1.5cqw;
		color: #444;
		margin: 0;
		text-align: center;
		white-space: nowrap;
	}
</style>
