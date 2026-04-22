<script lang="ts">
	import { page } from '$app/stores';
	import { user } from '$lib/client';
	import { Button } from '$lib/components/ui/button/index.js';
	import SubmitStepper from '$lib/components/submit/SubmitStepper.svelte';
	import StepLevelId from '$lib/components/submit/StepLevelId.svelte';
	import StepConfirmLevel from '$lib/components/submit/StepConfirmLevel.svelte';
	import StepLevelDetails from '$lib/components/submit/StepLevelDetails.svelte';
	import { extractYouTubeVideoId, isValidYouTubeLink } from '$lib/components/submit/submitState';
	import { locale } from 'svelte-i18n';
	import { toast } from 'svelte-sonner';
	import { fly } from 'svelte/transition';
	import { ArrowLeft } from 'lucide-svelte';
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
</script>

<svelte:head>
	<title>
		{list ? `${list.title} | ${$locale == 'vi' ? 'Nộp level' : 'Submit level'}` : 'Submit level'}
	</title>
</svelte:head>

<div class="submit-page">
	{#if !$user.loggedIn}
		<div class="auth-prompt">
			<h2>{$locale == 'vi' ? 'Đăng nhập để nộp level' : 'Sign in to submit a level'}</h2>
			<p class="text-muted">
				{$locale == 'vi'
					? `Bạn cần đăng nhập để nộp level vào ${list?.title || 'danh sách này'}.`
					: `You need to sign in to submit a level to ${list?.title || 'this list'}.`}
			</p>
		</div>
	{:else if !list}
		<div class="auth-prompt">
			<h2>{$locale == 'vi' ? 'Không thể tải danh sách' : 'Unable to load list'}</h2>
			<p class="text-muted">{loadingError || ($locale == 'vi' ? 'Vui lòng thử lại sau.' : 'Please try again later.')}</p>
			{#if requiresAuthRecovery}
				<p class="text-muted">
					{$locale == 'vi'
						? 'Bạn cần đăng nhập để truy cập danh sách này.'
						: 'You need to sign in to access this list.'}
				</p>
			{/if}
		</div>
	{:else if list.isOfficial}
		<div class="auth-prompt">
			<h2>{$locale == 'vi' ? 'Không áp dụng cho danh sách chính thức' : 'Not available for official lists'}</h2>
			<p class="text-muted">
				{$locale == 'vi'
					? 'Luồng nộp level này chỉ dành cho custom list.'
					: 'This submission flow is only available for custom lists.'}
			</p>
			<div class="result-actions">
				<Button href={`/lists/${list.id}`}>
					{$locale == 'vi' ? 'Quay lại danh sách' : 'Back to list'}
				</Button>
			</div>
		</div>
	{:else}
		<div class="submit-container">
			<a href={`/lists/${list.id}`} class="back-link">
				<ArrowLeft size={16} />
				<span>{$locale == 'vi' ? 'Quay lại danh sách' : 'Back to list'}</span>
			</a>

			<div class="hero-card">
				<p class="eyebrow">{$locale == 'vi' ? 'Custom list submission' : 'Custom list submission'}</p>
				<h1>{list.title}</h1>
				<p class="hero-description">
					{$locale == 'vi'
						? 'Gửi level của bạn vào hàng đợi duyệt của danh sách này. Level sẽ được kiểm tra trước khi xuất hiện công khai.'
						: 'Send a level into this list’s review queue. It will be checked before it appears publicly.'}
				</p>
			</div>

			<div class="submit-card">
				{#if submitted}
					<div class="success-state">
						<div class="success-badge">{ $locale == 'vi' ? 'Đã gửi' : 'Submitted' }</div>
						<h2>{$locale == 'vi' ? 'Level đã được đưa vào hàng đợi' : 'Your level is now in the review queue'}</h2>
						<p class="text-muted">
							{$locale == 'vi'
								? `${submissionResult?.levelName || 'Level'} đã được gửi tới ${list.title}.`
								: `${submissionResult?.levelName || 'The level'} has been sent to ${list.title}.`}
						</p>
						{#if submissionResult?.videoID}
							<p class="detail-line">
								<span>Video ID</span>
								<strong>{submissionResult.videoID}</strong>
							</p>
						{/if}
						{#if submissionResult?.comment}
							<p class="detail-line">
								<span>{$locale == 'vi' ? 'Ghi chú' : 'Comment'}</span>
								<strong>{submissionResult.comment}</strong>
							</p>
						{/if}
						<div class="result-actions">
							<Button variant="outline" on:click={resetForm}>
								{$locale == 'vi' ? 'Nộp thêm' : 'Submit another'}
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
							{#if submitting}
								{$locale == 'vi' ? 'Đang gửi...' : 'Submitting...'}
							{:else if isLastStep}
								{t('Gửi', 'Submit')}
							{:else}
								{t('Tiếp', 'Next')}
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
		padding: 24px 16px 40px;
		display: flex;
		justify-content: center;
	}

	.submit-container {
		width: 100%;
		max-width: 840px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		width: fit-content;
		font-size: 14px;
		color: hsl(var(--muted-foreground));
		text-decoration: none;
	}

	.hero-card,
	.submit-card,
	.auth-prompt {
		border: 1px solid hsl(var(--border));
		border-radius: 18px;
		background: hsl(var(--card));
		box-shadow: 0 16px 48px hsl(var(--foreground) / 0.06);
	}

	.hero-card {
		padding: 22px 24px;
		background: linear-gradient(135deg, hsl(var(--muted) / 0.28), hsl(var(--card)) 70%);
	}

	h1 {
		font-size: 24px;
		font-weight: 700;
		margin-top: 4px;
	}

	.eyebrow {
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: hsl(var(--muted-foreground));
	}

	.hero-description,
	.text-muted {
		font-size: 14px;
		line-height: 1.6;
		color: hsl(var(--muted-foreground));
	}

	.submit-card,
	.auth-prompt {
		padding: 24px;
	}

	.auth-prompt {
		max-width: 640px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		align-items: flex-start;
	}

	.step-wrapper {
		margin-top: 4px;
	}

	.step-animate {
		min-height: 220px;
	}

	.step-footer,
	.result-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}

	.step-footer {
		margin-top: 24px;
	}
	.success-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14px;
		text-align: center;
		padding: 12px 0 4px;
	}

	.success-badge {
		font-size: 12px;
		font-weight: 600;
		padding: 5px 10px;
		border-radius: 999px;
		background: hsl(var(--primary) / 0.1);
		color: hsl(var(--primary));
	}

	.detail-line {
		width: 100%;
		max-width: 520px;
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
		padding: 12px 14px;
		border-radius: 12px;
		background: hsl(var(--muted) / 0.08);
		font-size: 13px;
	}

	.detail-line span {
		color: hsl(var(--muted-foreground));
	}

	.detail-line strong {
		color: hsl(var(--foreground));
		text-align: right;
		word-break: break-word;
	}

	@media (max-width: 640px) {
		.submit-page {
			padding-inline: 12px;
		}

		.hero-card,
		.submit-card,
		.auth-prompt {
			padding: 18px;
		}

		h1 {
			font-size: 21px;
		}
	}
</style>
