<script lang="ts">
	import { page } from '$app/stores';
	import { user } from '$lib/client';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import SubmitStepper from '$lib/components/submit/SubmitStepper.svelte';
	import StepLevelId from '$lib/components/submit/StepLevelId.svelte';
	import StepConfirmLevel from '$lib/components/submit/StepConfirmLevel.svelte';
	import StepLevelDetails from '$lib/components/submit/StepLevelDetails.svelte';
	import { extractYouTubeVideoId, isValidYouTubeLink } from '$lib/components/submit/submitState';
	import { locale } from 'svelte-i18n';
	import { toast } from 'svelte-sonner';
	import { fly } from 'svelte/transition';
	import { ArrowLeft, Layers, ListOrdered, Star } from 'lucide-svelte';
	import { onMount } from 'svelte';

	export let data: any;

	let list = data?.list ?? null;
	let loadingError = data?.error ?? '';
	let requiresAuthRecovery = Boolean(data?.requiresAuthRecovery);
	let step = 0;
	let direction = 1;
	let levelid = NaN;
	let apiLevel: any = null;
	let level: any = null;
	let levelVariants: any[] = [];
	let selectedVariantId: number | null = null;
	let videoLink = '';
	let comment = '';
	let levelLoading = false;
	let submitting = false;
	let submitted = false;
	let submissionResult: { levelId: number; levelName: string; creator: string | null; videoID: string | null; comment: string } | null = null;

	$: steps = [
		$locale == 'vi' ? 'Level ID' : 'Level ID',
		$locale == 'vi' ? 'Xác nhận' : 'Confirm',
		$locale == 'vi' ? 'Chi tiết' : 'Details'
	];
	$: isLastStep = step === 2;

	function t(vi: string, en: string) {
		return $locale == 'vi' ? vi : en;
	}

	onMount(() => {
		const levelId = $page.url.searchParams.get('levelId');

		if (levelId) {
			const parsed = Number.parseInt(levelId, 10);
			if (Number.isInteger(parsed) && parsed > 0) {
				levelid = parsed;
			}
		}
	});

	async function loadLevel() {
		levelLoading = true;
		apiLevel = null;
		level = null;
		levelVariants = [];
		selectedVariantId = null;

		try {
			const levelRes = await fetch(`${import.meta.env.VITE_API_URL}/levels/${levelid}`);
			const levelPayload = await levelRes.json().catch(() => null);

			if (!levelRes.ok || !levelPayload) {
				return false;
			}

			level = levelPayload;

			const apiRes = await fetch(`${import.meta.env.VITE_API_URL}/levels/${levelid}?fromGD=1`);
			const apiPayload = await apiRes.json().catch(() => null);

			if (!apiRes.ok || !apiPayload) {
				return false;
			}

			apiLevel = apiPayload;

			try {
				const variantsRes = await fetch(`${import.meta.env.VITE_API_URL}/levels/${levelid}/variants`);
				if (variantsRes.ok) {
					levelVariants = await variantsRes.json();
				}
			} catch {
				levelVariants = [];
			}

			return true;
		} catch {
			return false;
		} finally {
			levelLoading = false;
		}
	}

	async function next() {
		if (step === 0) {
			if (!levelid || !Number.isInteger(levelid)) {
				toast.error(t('Vui lòng nhập Level ID hợp lệ', 'Please enter a valid Level ID'));
				return;
			}

			const loaded = await loadLevel();

			if (!loaded) {
				toast.error(t('Level ID không hợp lệ', 'Invalid level ID'));
				return;
			}

			direction = 1;
			step = 1;
			return;
		}

		if (step === 1) {
			direction = 1;
			step = 2;
			return;
		}

		if (step === 2) {
			await submitSubmission();
		}
	}

	function back() {
		if (step <= 0) return;

		direction = -1;
		step -= 1;
	}

	async function submitSubmission() {
		if (!list || submitting) return;

		if (!videoLink) {
			toast.error(t('Vui lòng nhập link video YouTube', 'Please enter a YouTube video link'));
			return;
		}

		if (!isValidYouTubeLink(videoLink)) {
			toast.error(t('Link video không hợp lệ', 'Invalid video link. Please enter a valid YouTube link.'));
			return;
		}

		submitting = true;

		try {
			const response = await fetch(`${import.meta.env.VITE_API_URL}/lists/${list.id}/submissions`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					levelId: selectedVariantId ?? levelid,
					videoID: extractYouTubeVideoId(videoLink),
					comment
				})
			});

			const payload = await response.json().catch(() => null);

			if (!response.ok) {
				throw new Error(payload?.error || t('Không thể gửi level', 'Failed to submit level'));
			}

			submissionResult = payload;
			submitted = true;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : t('Không thể gửi level', 'Failed to submit level'));
		} finally {
			submitting = false;
		}
	}

	function resetForm() {
		step = 0;
		direction = 1;
		levelid = NaN;
		apiLevel = null;
		level = null;
		levelVariants = [];
		selectedVariantId = null;
		videoLink = '';
		comment = '';
		levelLoading = false;
		submitting = false;
		submitted = false;
		submissionResult = null;
	}

	// ── theming helpers ──────────────────────────────────────────────────────────
	function isHexColor(value: unknown): value is string {
		return typeof value === 'string' && /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value.trim());
	}

	function withHexAlpha(color: string, alpha: string) {
		const normalized = color.trim();
		return normalized.length === 9 ? `${normalized.slice(0, 7)}${alpha}` : `${normalized}${alpha}`;
	}

	function hexToRgb(color: string) {
		const normalized = color.trim().slice(1, 7);
		return {
			r: Number.parseInt(normalized.slice(0, 2), 16),
			g: Number.parseInt(normalized.slice(2, 4), 16),
			b: Number.parseInt(normalized.slice(4, 6), 16)
		};
	}

	function isLightColor(color: string) {
		const { r, g, b } = hexToRgb(color);
		const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
		return luminance >= 0.62;
	}

	function getHeroStyle(currentList: typeof list) {
		if (!currentList) return undefined;
		const styles: string[] = [];
		const bg = isHexColor(currentList.backgroundColor) ? String(currentList.backgroundColor).trim() : null;
		const border = isHexColor(currentList.borderColor) ? String(currentList.borderColor).trim() : null;

		if (bg) {
			const light = isLightColor(bg);
			styles.push(
				`background: ${bg}; --custom-surface-foreground: ${light ? '#0f172a' : '#f8fafc'}; --custom-surface-muted: ${light ? 'rgba(15,23,42,0.72)' : 'rgba(248,250,252,0.78)'};`
			);
		}

		if (border) {
			styles.push(`border-color: ${border};`);
			styles.push(`box-shadow: 0 0 0 1px ${withHexAlpha(border, '22')};`);
		}

		return styles.length ? styles.join(' ') : undefined;
	}

	function getBannerBorderStyle(currentList: typeof list) {
		if (!currentList) return undefined;
		const border = isHexColor(currentList.borderColor) ? String(currentList.borderColor).trim() : null;
		return border ? `border-bottom-color: ${border};` : undefined;
	}
</script>

<svelte:head>
	<title>
		{list ? `${list.title} | ${$locale == 'vi' ? 'Nộp level' : 'Submit level'}` : 'Submit level'}
	</title>
</svelte:head>

<div class="submit-page">
	{#if !$user.loggedIn}
		<div class="state-card">
			<div class="state-icon-wrap">
				<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
			</div>
			<h2>{$locale == 'vi' ? 'Đăng nhập để nộp level' : 'Sign in to submit a level'}</h2>
			<p class="state-hint">
				{$locale == 'vi'
					? `Bạn cần đăng nhập để nộp level vào ${list?.title || 'danh sách này'}.`
					: `You need to sign in to submit a level to ${list?.title || 'this list'}.`}
			</p>
		</div>
	{:else if !list}
		<div class="state-card">
			<div class="state-icon-wrap error">
				<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
			</div>
			<h2>{$locale == 'vi' ? 'Không thể tải danh sách' : 'Unable to load list'}</h2>
			<p class="state-hint">
				{loadingError || ($locale == 'vi' ? 'Vui lòng thử lại sau.' : 'Please try again later.')}
			</p>
			{#if requiresAuthRecovery}
				<p class="state-hint">
					{$locale == 'vi'
						? 'Bạn cần đăng nhập để truy cập danh sách này.'
						: 'You need to sign in to access this list.'}
				</p>
			{/if}
		</div>
	{:else if list.isOfficial}
		<div class="state-card">
			<div class="state-icon-wrap warning">
				<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
			</div>
			<h2>{$locale == 'vi' ? 'Không áp dụng cho danh sách chính thức' : 'Not available for official lists'}</h2>
			<p class="state-hint">
				{$locale == 'vi'
					? 'Luồng nộp level này chỉ dành cho custom list.'
					: 'This submission flow is only available for custom lists.'}
			</p>
			<Button href={`/lists/${list.id}`} size="sm">
				{$locale == 'vi' ? 'Quay lại danh sách' : 'Back to list'}
			</Button>
		</div>
	{:else}
		<div class="submit-layout">
			<!-- Hero / list info -->
			<div class="hero-card" style={getHeroStyle(list)}>
				{#if list.bannerUrl}
					<div class="hero-banner" style={getBannerBorderStyle(list)}>
						<img src={list.bannerUrl} alt="" />
					</div>
				{/if}

				<div class="hero-body">
					<a href={`/lists/${list.id}`} class="back-link">
						<ArrowLeft size={14} />
						{$locale == 'vi' ? 'Quay lại danh sách' : 'Back to list'}
					</a>

					<div class="hero-identity">
						{#if list.logoUrl}
							<img src={list.logoUrl} alt="" class="list-logo" />
						{/if}
						<div>
							<p class="eyebrow">{$locale == 'vi' ? 'Nộp level' : 'Submit a level'}</p>
							<h1>{list.title}</h1>
						</div>
					</div>

					{#if list.description}
						<p class="hero-desc">{list.description}</p>
					{/if}

					<div class="hero-chips">
						<span class="chip">
							<Layers size={12} />
							{list.isPlatformer
								? ($locale == 'vi' ? 'Platformer' : 'Platformer')
								: ($locale == 'vi' ? 'Classic' : 'Classic')}
						</span>
						<span class="chip">
							<ListOrdered size={12} />
							{list.mode === 'top'
								? ($locale == 'vi' ? 'Top list' : 'Top list')
								: ($locale == 'vi' ? 'Rating list' : 'Rating list')}
						</span>
						{#if list.levelCount != null}
							<span class="chip">
								<Star size={12} />
								{list.levelCount} levels
							</span>
						{/if}
					</div>
				</div>
			</div>

			<!-- Form card -->
			<div class="form-card">
				{#if submitted}
					<div class="success-state">
						<div class="success-ring">
							<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
						</div>
						<div class="success-text">
							<h2>{$locale == 'vi' ? 'Level đã được gửi!' : 'Level submitted!'}</h2>
							<p class="text-muted">
								{$locale == 'vi'
									? `${submissionResult?.levelName || 'Level'} đã vào hàng đợi duyệt của ${list.title}.`
									: `${submissionResult?.levelName || 'The level'} is now in the review queue for ${list.title}.`}
							</p>
						</div>

						{#if submissionResult?.videoID || submissionResult?.comment}
							<div class="success-details">
								{#if submissionResult?.videoID}
									<div class="detail-row">
										<span class="detail-label">Video</span>
										<a href={`https://youtu.be/${submissionResult.videoID}`} target="_blank" rel="noreferrer" class="detail-value link">
											{submissionResult.videoID}
										</a>
									</div>
								{/if}
								{#if submissionResult?.comment}
									<div class="detail-row">
										<span class="detail-label">{$locale == 'vi' ? 'Ghi chú' : 'Note'}</span>
										<span class="detail-value">{submissionResult.comment}</span>
									</div>
								{/if}
							</div>
						{/if}

						<div class="success-actions">
							<Button variant="outline" on:click={resetForm}>
								{$locale == 'vi' ? 'Nộp level khác' : 'Submit another'}
							</Button>
							<Button href={`/lists/${list.id}`}>
								{$locale == 'vi' ? 'Quay lại danh sách' : 'Back to list'}
							</Button>
						</div>
					</div>
				{:else}
					<SubmitStepper {steps} currentStep={step} />

					<div class="step-wrapper">
						{#key step}
							<div
								class="step-animate"
								in:fly={{ x: direction * 40, duration: 250, delay: 100 }}
								out:fly={{ x: direction * -40, duration: 150 }}
							>
								{#if step === 0}
									<StepLevelId bind:levelId={levelid} submissionType="level" targetLabel={list.title} />
								{:else if step === 1}
									<StepConfirmLevel
										apiLevel={apiLevel}
										level={level}
										levelVariants={levelVariants}
										bind:selectedVariantId={selectedVariantId}
										targetLabel={list.title}
									/>
								{:else if step === 2}
									<StepLevelDetails
										apiLevel={apiLevel}
										bind:videoLink={videoLink}
										bind:comment={comment}
										targetLabel={list.title}
									/>
								{/if}
							</div>
						{/key}
					</div>

					<div class="step-footer">
						{#if step > 0}
							<Button variant="outline" on:click={back} disabled={levelLoading || submitting}>
								{$locale == 'vi' ? 'Quay lại' : 'Back'}
							</Button>
						{:else}
							<div />
						{/if}
						<Button on:click={next} disabled={levelLoading || submitting}>
							{#if levelLoading}
								{$locale == 'vi' ? 'Đang tải...' : 'Loading...'}
							{:else if submitting}
								{$locale == 'vi' ? 'Đang gửi...' : 'Submitting...'}
							{:else if isLastStep}
								{$locale == 'vi' ? 'Gửi' : 'Submit'}
							{:else}
								{$locale == 'vi' ? 'Tiếp theo' : 'Next'}
							{/if}
						</Button>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style lang="scss">
	.submit-page {
		min-height: 60vh;
		padding: 0 0 48px;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	/* state cards */
	.state-card {
		margin-top: 48px;
		width: 100%;
		max-width: 480px;
		padding: 32px 28px;
		border: 1px solid hsl(var(--border));
		border-radius: 20px;
		background: hsl(var(--card));
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		text-align: center;

		h2 {
			font-size: 18px;
			font-weight: 700;
		}
	}

	.state-icon-wrap {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: hsl(var(--muted) / 0.5);
		color: hsl(var(--muted-foreground));
		margin-bottom: 4px;

		&.error {
			background: hsl(var(--destructive) / 0.1);
			color: hsl(var(--destructive));
		}

		&.warning {
			background: hsl(40deg 100% 60% / 0.12);
			color: hsl(40deg 80% 45%);
		}
	}

	.state-hint {
		font-size: 14px;
		line-height: 1.6;
		color: hsl(var(--muted-foreground));
	}

	/* main layout */
	.submit-layout {
		width: 100%;
		max-width: 680px;
		display: flex;
		flex-direction: column;
	}

	/* hero card */
	.hero-card {
		width: 100%;
		border: 1px solid hsl(var(--border));
		border-bottom: none;
		border-radius: 20px 20px 0 0;
		background: linear-gradient(160deg, hsl(var(--muted) / 0.22), hsl(var(--card)) 80%);
		overflow: hidden;
		color: var(--custom-surface-foreground, hsl(var(--foreground)));
	}

	.hero-banner {
		width: 100%;
		height: 120px;
		overflow: hidden;
		border-bottom: 1px solid hsl(var(--border));

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
			object-position: center;
		}
	}

	.hero-body {
		padding: 20px 24px 22px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		width: fit-content;
		font-size: 13px;
		color: var(--custom-surface-muted, hsl(var(--muted-foreground)));
		text-decoration: none;
		transition: opacity 0.15s;

		&:hover {
			opacity: 0.75;
		}
	}

	.hero-identity {
		display: flex;
		align-items: center;
		gap: 14px;
		margin-top: 4px;
	}

	.list-logo {
		width: 48px;
		height: 48px;
		border-radius: 10px;
		object-fit: cover;
		flex-shrink: 0;
		border: 1px solid hsl(var(--border) / 0.6);
	}

	.eyebrow {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--custom-surface-muted, hsl(var(--muted-foreground)));
	}

	h1 {
		font-size: 22px;
		font-weight: 700;
		line-height: 1.25;
		margin-top: 2px;
		color: var(--custom-surface-foreground, hsl(var(--foreground)));
	}

	.hero-desc {
		font-size: 13px;
		line-height: 1.6;
		color: var(--custom-surface-muted, hsl(var(--muted-foreground)));
	}

	.hero-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 2px;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-size: 12px;
		font-weight: 500;
		padding: 4px 10px;
		border-radius: 999px;
		background: var(--custom-surface-chip-background, hsl(var(--muted) / 0.5));
		color: var(--custom-surface-foreground, hsl(var(--foreground)));
		border: 1px solid hsl(var(--border) / 0.5);
	}

	/* form card */
	.form-card {
		border: 1px solid hsl(var(--border));
		border-top: none;
		border-radius: 0 0 20px 20px;
		background: hsl(var(--card));
		padding: 24px;
	}

	.step-wrapper {
		margin-top: 4px;
	}

	.step-animate {
		min-height: 220px;
	}

	.step-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
		margin-top: 24px;
		padding-top: 20px;
		border-top: 1px solid hsl(var(--border));
	}

	/* success state */
	.success-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		text-align: center;
		padding: 16px 0 8px;
	}

	.success-ring {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: hsl(var(--primary) / 0.1);
		color: hsl(var(--primary));
		border: 2px solid hsl(var(--primary) / 0.25);
	}

	.success-text {
		display: flex;
		flex-direction: column;
		gap: 6px;

		h2 {
			font-size: 20px;
			font-weight: 700;
		}
	}

	.text-muted {
		font-size: 14px;
		line-height: 1.6;
		color: hsl(var(--muted-foreground));
	}

	.success-details {
		width: 100%;
		max-width: 440px;
		display: flex;
		flex-direction: column;
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		overflow: hidden;
	}

	.detail-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
		padding: 10px 14px;
		font-size: 13px;

		& + .detail-row {
			border-top: 1px solid hsl(var(--border));
		}
	}

	.detail-label {
		color: hsl(var(--muted-foreground));
		white-space: nowrap;
	}

	.detail-value {
		color: hsl(var(--foreground));
		text-align: right;
		word-break: break-word;
		font-weight: 500;

		&.link {
			color: hsl(var(--primary));
			text-decoration: underline;
			text-underline-offset: 2px;
		}
	}

	.success-actions {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
		justify-content: center;
	}

	/* responsive */
	@media (max-width: 720px) {
		.submit-layout {
			padding: 0 12px;
		}

		.hero-body {
			padding: 16px 18px 18px;
		}

		.form-card {
			padding: 18px;
		}

		h1 {
			font-size: 19px;
		}

		.hero-banner {
			height: 90px;
		}
	}

	@media (min-width: 721px) {
		.submit-page {
			padding-top: 32px;
		}
	}
</style>
