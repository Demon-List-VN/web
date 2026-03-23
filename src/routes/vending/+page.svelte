<script lang="ts">
	import { user } from '$lib/client';
	import { cart } from '$lib/client/cart';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import CardPreview from './CardPreview.svelte';
	import CardBack from './CardBack.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { CreditCard, ChevronRight, ChevronLeft, Upload, X } from 'lucide-svelte';

	// --- State ---
	let step = 1;
	let records: any[] = [];
	let loadingRecords = false;

	// Step 1
	let selectedRecord: any = null;

	// Step 2
	let customImageDataUrl: string | null = null;
	let customAvatarDataUrl: string | null = null;
	let isDragging = false;
	let isDraggingAvatar = false;
	let showBack = false;

	// Step 3
	let selectedMaterial: 'paper' | 'plastic' | null = null;

	let hasFetchedRecords = false;

	const MATERIALS = [
		{
			id: 'paper' as const,
			label: 'Giấy',
			price: '12,000đ',
			priceNum: 12000,
			features: ['In mã QR', 'Giấy mờ chất lượng cao', 'Kích thước chuẩn CR80']
		},
		{
			id: 'plastic' as const,
			label: 'Nhựa',
			price: '149,000đ',
			priceNum: 149000,
			features: ['Chip NFC', 'In mã QR', 'Thẻ nhựa bóng cao cấp', 'Kích thước chuẩn CR80']
		}
	];

	$: bgImage =
		customImageDataUrl ||
		(selectedRecord ? `https://levelthumbs.prevter.me/thumbnail/${selectedRecord.levelid}/high` : '');

	$: playerUID = $user.data?.uid ?? '';
	$: playerName = $user.data?.name ?? '';
	$: clanTag = $user.data?.clans?.tag ?? null;
	$: clanTagBg = $user.data?.clans?.tagBgColor ?? null;
	$: clanTagText = $user.data?.clans?.tagTextColor ?? null;
	$: levelName = selectedRecord?.levels?.name ?? '';
	$: creator = selectedRecord?.levels?.creator ?? null;
	$: progress = selectedRecord?.progress ?? null;

	onMount(() => {});

	$: if ($user.checked && !$user.loggedIn) {
		toast.error('Bạn cần đăng nhập để sử dụng tính năng này');
		goto('/');
	}

	$: if ($user.checked && $user.loggedIn && !hasFetchedRecords) {
		hasFetchedRecords = true;
		fetchRecords();
	}

	async function fetchRecords() {
		loadingRecords = true;
		try {
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/players/${$user.data?.uid}/records?isChecked=true`,
				{
					headers: { Authorization: `Bearer ${await $user.token()}` }
				}
			);
			const data = await res.json();
			// Flatten all records from dl/fl/pl/cl arrays
			records = [
				...(data.dl ?? []),
				...(data.fl ?? []),
				...(data.pl ?? []),
				...(data.cl ?? [])
			].filter((r: any) => r.levelid);
			// Deduplicate by `levelid`
			const seen = new Set();
			records = records.filter((r: any) => {
				if (seen.has(r.levelid)) return false;
				seen.add(r.levelid);
				return true;
			});
		} catch {
			toast.error('Không thể tải danh sách bản ghi');
		} finally {
			loadingRecords = false;
		}
	}

	function handleImageUpload(file: File) {
		if (!file.type.startsWith('image/')) {
			toast.error('Chỉ chấp nhận file ảnh');
			return;
		}
		const reader = new FileReader();
		reader.onload = (e) => {
			customImageDataUrl = e.target?.result as string;
		};
		reader.readAsDataURL(file);
	}

	function onFileInput(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (file) handleImageUpload(file);
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		const file = e.dataTransfer?.files?.[0];
		if (file) handleImageUpload(file);
	}

	function handleAvatarUpload(file: File) {
		if (!file.type.startsWith('image/')) {
			toast.error('Chỉ chấp nhận file ảnh');
			return;
		}
		const reader = new FileReader();
		reader.onload = (e) => {
			customAvatarDataUrl = e.target?.result as string;
		};
		reader.readAsDataURL(file);
	}

	function onAvatarFileInput(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (file) handleAvatarUpload(file);
	}

	function onAvatarDrop(e: DragEvent) {
		e.preventDefault();
		isDraggingAvatar = false;
		const file = e.dataTransfer?.files?.[0];
		if (file) handleAvatarUpload(file);
	}

	function addToCart() {
		if (!selectedRecord || !selectedMaterial) {
			toast.error('Vui lòng chọn chất liệu');
			return;
		}
		$cart.addRecordCard({
			type: 'record-card',
			recordNo: selectedRecord.no,
			levelID: selectedRecord.levelid,
			template: 1,
			material: selectedMaterial,
			customImageDataUrl: customImageDataUrl ?? undefined,
			customAvatarDataUrl: customAvatarDataUrl ?? undefined,
			levelName: selectedRecord.levels?.name ?? ''
		});
		toast.success('Đã thêm vào giỏ hàng!');
		goto('/store/cart');
	}

	function nextStep() {
		if (step === 1 && !selectedRecord) {
			toast.error('Vui lòng chọn một bản ghi');
			return;
		}
		step++;
		showBack = false;
	}

	function prevStep() {
		step--;
		showBack = false;
	}
</script>

<svelte:head>
	<title>Máy Tạo Thẻ Bản Ghi - Geometry Dash Việt Nam</title>
</svelte:head>

<div class="vending-wrap">
	<!-- Header -->
	<div class="vending-header">
		<CreditCard class="header-icon" size={28} />
		<div>
			<h1>Máy Tạo Thẻ Bản Ghi</h1>
			<p>Lưu giữ kỷ lục của bạn dưới dạng thẻ vật lý CR80</p>
		</div>
	</div>

	<!-- Step progress -->
	<div class="step-bar">
		{#each [1, 2, 3] as s}
			<div class="step-item" class:active={step === s} class:done={step > s}>
				<span class="step-num">{step > s ? '✓' : s}</span>
				<span class="step-label">
					{#if s === 1}Chọn bản ghi
					{:else if s === 2}Tùy chỉnh & Xem trước
					{:else}Đặt hàng{/if}
				</span>
			</div>
			{#if s < 3}
				<div class="step-line" class:done={step > s}></div>
			{/if}
		{/each}
	</div>

	<!-- Step content -->
	<div class="step-content">
		<!-- Step 1: Select record -->
		{#if step === 1}
			<h2 class="step-title">① Chọn bản ghi của bạn</h2>
			{#if loadingRecords}
				<div class="loading-grid">
					{#each { length: 6 } as _}
						<div class="record-skeleton"></div>
					{/each}
				</div>
			{:else if records.length === 0}
				<div class="empty-state">
					<p>Bạn chưa có bản ghi nào được chấp nhận.</p>
					<p class="hint">Hoàn thành một level và gửi bản ghi để bắt đầu!</p>
				</div>
			{:else}
				<div class="records-grid">
					{#each records as record}
						<button
							class="record-card"
							class:selected={selectedRecord?.no === record.no}
							on:click={() => (selectedRecord = record)}
							type="button"
						>
							<div class="record-thumb">
								<img
									src={`https://levelthumbs.prevter.me/thumbnail/${record.levelid}/high`}
									alt={record.levels?.name}
								/>
								<div class="record-overlay">
									<span class="record-progress">{record.progress}%</span>
								</div>
							</div>
							<div class="record-info">
								<span class="record-level-name">{record.levels?.name}</span>
								<span class="record-pts">
									{#if record.dlPt}DL: {record.dlPt?.toFixed(0)}pt{:else if record.flPt}FL: {record.flPt?.toFixed(0)}pt{:else if record.plPt}PL: {record.plPt?.toFixed(0)}pt{/if}
								</span>
							</div>
						</button>
					{/each}
				</div>
			{/if}

		<!-- Step 2: Customize & Preview -->
		{:else if step === 2}
			<h2 class="step-title">② Tùy chỉnh & Xem trước</h2>

			<!-- Preview (full width) -->
			<div class="preview-wrap">
				{#if !showBack}
					<CardPreview
						{playerUID}
						{playerName}
						{clanTag}
						{clanTagBg}
						{clanTagText}
						{levelName}
						{creator}
						{progress}
						{bgImage}
						avatarImage={customAvatarDataUrl}
						template={1}
						size="full"
					/>
				{:else}
					<CardBack scale={2} />
				{/if}
			</div>
			<div class="flip-btn-wrap">
				<Button variant="outline" on:click={() => (showBack = !showBack)}>
					{showBack ? 'Xem mặt trước' : 'Xem mặt sau'}
				</Button>
			</div>

			<!-- Upload row -->
			<div class="upload-row">
				<div class="upload-col">
					<div class="section-label">Ảnh nền (tùy chọn)</div>
					<div
						class="upload-zone"
						class:dragging={isDragging}
						on:dragover|preventDefault={() => (isDragging = true)}
						on:dragleave={() => (isDragging = false)}
						on:drop={onDrop}
						role="button"
						tabindex="0"
					>
						{#if customImageDataUrl}
							<div class="upload-preview">
								<img src={customImageDataUrl} alt="preview" />
								<button class="remove-img" on:click={() => (customImageDataUrl = null)} type="button">
									<X size={14} />
								</button>
							</div>
						{:else}
							<Upload size={24} class="upload-icon" />
							<p>Kéo thả hoặc <label class="upload-link">chọn ảnh<input type="file" accept="image/*" on:change={onFileInput} hidden /></label></p>
							<p class="upload-hint">Mặc định: ảnh thumbnail YouTube của level</p>
						{/if}
					</div>
				</div>

				<div class="upload-col">
					<div class="section-label">Ảnh đại diện (tùy chọn)</div>
					<div
						class="upload-zone"
						class:dragging={isDraggingAvatar}
						on:dragover|preventDefault={() => (isDraggingAvatar = true)}
						on:dragleave={() => (isDraggingAvatar = false)}
						on:drop={onAvatarDrop}
						role="button"
						tabindex="0"
					>
						{#if customAvatarDataUrl}
							<div class="upload-preview avatar-preview">
								<img src={customAvatarDataUrl} alt="avatar preview" />
								<button class="remove-img" on:click={() => (customAvatarDataUrl = null)} type="button">
									<X size={14} />
								</button>
							</div>
						{:else}
							<Upload size={24} class="upload-icon" />
							<p>Kéo thả hoặc <label class="upload-link">chọn ảnh<input type="file" accept="image/*" on:change={onAvatarFileInput} hidden /></label></p>
							<p class="upload-hint">Mặc định: ảnh đại diện tài khoản của bạn</p>
						{/if}
					</div>
				</div>
			</div>

		<!-- Step 3: Material & Order -->
		{:else if step === 3}
			<h2 class="step-title">③ Chọn chất liệu & Đặt hàng</h2>

			<div class="material-grid">
				{#each MATERIALS as mat}
					<button
						class="material-btn"
						class:selected={selectedMaterial === mat.id}
						on:click={() => (selectedMaterial = mat.id)}
						type="button"
					>
						<div class="mat-header">
							<span class="mat-label">{mat.label}</span>
							<span class="mat-price">{mat.price}</span>
						</div>
						<ul class="mat-features">
							{#each mat.features as feat}
								<li>✓ {feat}</li>
							{/each}
						</ul>
					</button>
				{/each}
			</div>

			<!-- Order summary -->
			{#if selectedMaterial}
				<div class="order-summary">
					<div class="summary-row">
						<span>Thẻ Bản Ghi ({selectedMaterial === 'paper' ? 'Giấy' : 'Nhựa'})</span>
						<span>{MATERIALS.find((m) => m.id === selectedMaterial)?.price}</span>
					</div>
					<div class="summary-row fee">
						<span>Phí giao hàng</span>
						<span>25,000đ</span>
					</div>
					<div class="summary-row total">
						<span>Tổng cộng</span>
						<span>
							{(
								(MATERIALS.find((m) => m.id === selectedMaterial)?.priceNum ?? 0) + 25000
							).toLocaleString('vi-VN')}đ
						</span>
					</div>
				</div>
			{/if}
		{/if}
	</div>

	<!-- Navigation buttons -->
	<div class="nav-buttons">
		{#if step > 1}
			<Button variant="outline" on:click={prevStep}>
				<ChevronLeft size={16} />
				Quay lại
			</Button>
		{:else}
			<div></div>
		{/if}

		{#if step < 3}
			<Button on:click={nextStep} disabled={step === 1 && !selectedRecord}>
				Tiếp theo
				<ChevronRight size={16} />
			</Button>
		{:else}
			<Button on:click={addToCart} disabled={!selectedMaterial}>
				Thêm vào giỏ hàng
				<CreditCard size={16} />
			</Button>
		{/if}
	</div>
</div>

<style lang="scss">
	.vending-wrap {
		max-width: 760px;
		margin: 0 auto;
		padding: 30px 20px 60px;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.vending-header {
		display: flex;
		align-items: center;
		gap: 14px;

		h1 {
			font-size: 22px;
			font-weight: 800;
			margin: 0;
		}

		p {
			font-size: 13px;
			opacity: 0.6;
			margin: 4px 0 0;
		}
	}

	/* Step bar */
	.step-bar {
		display: flex;
		align-items: center;
		gap: 0;
		background: hsl(var(--muted));
		border-radius: 10px;
		padding: 12px 16px;
		overflow-x: auto;
	}

	.step-item {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-shrink: 0;

		&.active .step-num {
			background: hsl(var(--foreground));
			color: hsl(var(--background));
		}

		&.done .step-num {
			background: #22c55e;
			color: #fff;
		}
	}

	.step-num {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: hsl(var(--border));
		color: hsl(var(--muted-foreground));
		font-size: 11px;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.step-label {
		font-size: 12px;
		font-weight: 500;
		white-space: nowrap;
	}

	.step-line {
		flex: 1;
		height: 1px;
		background: hsl(var(--border));
		margin: 0 8px;
		min-width: 20px;

		&.done {
			background: #22c55e;
		}
	}

	.step-content {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		padding: 24px;
		min-height: 300px;
	}

	.step-title {
		font-size: 16px;
		font-weight: 700;
		margin: 0 0 20px;
	}

	/* Step 1: Records grid */
	.records-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: 12px;
	}

	.loading-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: 12px;
	}

	.record-skeleton {
		aspect-ratio: 16/11;
		background: hsl(var(--muted));
		border-radius: 8px;
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}

	.record-card {
		border: 2px solid hsl(var(--border));
		border-radius: 8px;
		overflow: hidden;
		cursor: pointer;
		background: transparent;
		text-align: left;
		padding: 0;
		transition: border-color 0.15s ease, transform 0.1s ease;

		&:hover {
			border-color: hsl(var(--foreground) / 0.4);
			transform: translateY(-2px);
		}

		&.selected {
			border-color: hsl(var(--foreground));
			box-shadow: 0 0 0 2px hsl(var(--foreground) / 0.2);
		}
	}

	.record-thumb {
		position: relative;
		aspect-ratio: 16/9;

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
			display: block;
		}
	}

	.record-overlay {
		position: absolute;
		bottom: 4px;
		right: 6px;
	}

	.record-progress {
		font-size: 10px;
		font-weight: 700;
		background: rgba(0, 0, 0, 0.65);
		color: #fff;
		padding: 1px 5px;
		border-radius: 4px;
	}

	.record-info {
		padding: 6px 8px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.record-level-name {
		font-size: 11px;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.record-pts {
		font-size: 10px;
		opacity: 0.55;
	}

	.empty-state {
		text-align: center;
		padding: 40px 20px;
		opacity: 0.6;

		p {
			margin: 0 0 6px;
			font-size: 14px;
		}

		.hint {
			font-size: 12px;
			opacity: 0.7;
		}
	}

	/* Step 2: Upload */
	.section-label {
		font-size: 13px;
		font-weight: 600;
		margin-bottom: 8px;
	}

	.upload-zone {
		border: 2px dashed hsl(var(--border));
		border-radius: 10px;
		padding: 20px;
		text-align: center;
		cursor: pointer;
		transition: border-color 0.15s ease;

		&.dragging {
			border-color: hsl(var(--foreground));
			background: hsl(var(--muted));
		}

		p {
			margin: 6px 0 0;
			font-size: 13px;
		}

		.upload-hint {
			font-size: 11px;
			opacity: 0.5;
			margin-top: 4px;
		}
	}

	.upload-link {
		color: hsl(var(--foreground));
		text-decoration: underline;
		cursor: pointer;
	}

	.upload-preview {
		position: relative;
		display: inline-block;

		img {
			max-height: 100px;
			border-radius: 6px;
		}

		&.avatar-preview img {
			width: 64px;
			height: 64px;
			border-radius: 50%;
			object-fit: cover;
		}
	}

	/* Upload row */
	.upload-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
		margin-top: 20px;
	}

	.upload-col {
		min-width: 0;
	}

	.remove-img {
		position: absolute;
		top: -6px;
		right: -6px;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: hsl(var(--destructive));
		color: #fff;
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.template-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 14px;
	}

	.template-btn {
		border: 2px solid hsl(var(--border));
		border-radius: 10px;
		padding: 10px;
		cursor: pointer;
		background: hsl(var(--card));
		text-align: center;
		transition: border-color 0.15s ease;
		display: flex;
		flex-direction: column;
		gap: 6px;

		&:hover {
			border-color: hsl(var(--foreground) / 0.4);
		}

		&.selected {
			border-color: hsl(var(--foreground));
		}
	}

	.template-preview {
		width: 100%;
	}

	.tmpl-label {
		font-size: 12px;
		font-weight: 700;
	}

	.tmpl-desc {
		font-size: 10px;
		opacity: 0.55;
	}

	.preview-wrap {
		margin: 0 auto;
	}

	.flip-btn-wrap {
		display: flex;
		justify-content: center;
		margin-top: 16px;
	}

	/* Step 4: Material */
	.material-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
		margin-bottom: 24px;
	}

	.material-btn {
		border: 2px solid hsl(var(--border));
		border-radius: 12px;
		padding: 16px;
		cursor: pointer;
		background: hsl(var(--card));
		text-align: left;
		transition: border-color 0.15s ease, background 0.15s ease;

		&:hover {
			border-color: hsl(var(--foreground) / 0.4);
		}

		&.selected {
			border-color: hsl(var(--foreground));
			background: hsl(var(--muted));
		}
	}

	.mat-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 10px;
	}

	.mat-label {
		font-size: 16px;
		font-weight: 800;
	}

	.mat-price {
		font-size: 15px;
		font-weight: 700;
		color: hsl(var(--foreground));
	}

	.mat-features {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;

		li {
			font-size: 12px;
			opacity: 0.7;
		}
	}

	/* Delivery form */
	.delivery-form {
		h3 {
			font-size: 14px;
			font-weight: 700;
			margin: 0 0 12px;
		}
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-bottom: 12px;

		label {
			font-size: 12px;
			font-weight: 600;
			opacity: 0.7;
		}

		input {
			padding: 8px 10px;
			border: 1px solid hsl(var(--border));
			border-radius: 6px;
			background: hsl(var(--background));
			color: hsl(var(--foreground));
			font-size: 13px;
			outline: none;

			&:focus {
				border-color: hsl(var(--foreground) / 0.5);
			}
		}
	}

	/* Order summary */
	.order-summary {
		background: hsl(var(--muted));
		border-radius: 10px;
		padding: 14px 16px;
		margin-top: 20px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.summary-row {
		display: flex;
		justify-content: space-between;
		font-size: 13px;

		&.fee {
			opacity: 0.6;
		}

		&.total {
			font-weight: 700;
			font-size: 14px;
			border-top: 1px solid hsl(var(--border));
			padding-top: 8px;
			margin-top: 2px;
		}
	}

	/* Nav buttons */
	.nav-buttons {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	@media (max-width: 600px) {
		.template-grid {
			grid-template-columns: repeat(3, 1fr);
			gap: 8px;
		}

		.material-grid {
			grid-template-columns: 1fr;
		}

		.records-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.step-label {
			display: none;
		}

		.upload-row {
			grid-template-columns: 1fr;
		}
	}
</style>
