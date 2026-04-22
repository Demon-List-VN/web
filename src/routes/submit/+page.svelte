<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { user } from '$lib/client';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { locale, _ } from 'svelte-i18n';
	import { toast } from 'svelte-sonner';
	import { fly } from 'svelte/transition';
	import { ArrowLeft } from 'lucide-svelte';

	import SubmitStepper from '$lib/components/submit/SubmitStepper.svelte';
	import StepRules from '$lib/components/submit/StepRules.svelte';
	import StepLevelId from '$lib/components/submit/StepLevelId.svelte';
	import StepConfirmLevel from '$lib/components/submit/StepConfirmLevel.svelte';
	import EligibleListsPanel from '$lib/components/submit/EligibleListsPanel.svelte';
	import StepRequiredFields from '$lib/components/submit/StepRequiredFields.svelte';
	import StepOptionalFields from '$lib/components/submit/StepOptionalFields.svelte';
	import SubmitResult from '$lib/components/submit/SubmitResult.svelte';
	import {
		createDefaultState,
		getSteps,
		getMs,
		validTime,
		type SubmitState
	} from '$lib/components/submit/submitState';

	let state: SubmitState = createDefaultState($user.data?.uid || '');
	let submitted = false;
	let direction = 1;
	type EligibleListEntry = {
		id: number;
		slug?: string | null;
		title: string;
		description: string;
		mode: 'rating' | 'top';
		isPlatformer: boolean;
		isOfficial?: boolean;
		topEnabled?: boolean;
		ownerData?: any | null;
		eligible?: boolean | null;
		item?: {
			created_at?: string;
			rating?: number | null;
			position?: number | null;
			minProgress?: number | null;
			videoID?: string | null;
		} | null;
	};
	let eligibleLists: EligibleListEntry[] = [];
	let eligibleListsLoading = false;
	let eligibleListsError = '';
	let eligibleListsRequestKey = '';
	let eligibleListsRequestToken = 0;
	let eligibleListPanelMode: 'preview' | 'eligible' = 'preview';

	$: steps = getSteps(state.type).map((s) => {
		const labels: Record<string, { vi: string; en: string }> = {
			Rules: { vi: 'Lưu ý', en: 'Rules' },
			Level: { vi: 'Level', en: 'Level' },
			Confirm: { vi: 'Xác nhận', en: 'Confirm' },
			Details: { vi: 'Chi tiết', en: 'Details' },
			Optional: { vi: 'Tùy chọn', en: 'Optional' }
		};
		return labels[s] ? ($locale == 'vi' ? labels[s].vi : labels[s].en) : s;
	});
	// Record: last step = 4 (with apiLevel loaded)
	$: isLastStep = state.step === 4;

	function t(vi: string, en: string) {
		return $locale == 'vi' ? vi : en;
	}

	function getEligibleProgress(
		type: SubmitState['type'],
		apiLevel: any,
		time: SubmitState['time'],
		progress: number
	) {
		if (type !== 'record') {
			return null;
		}

		if (apiLevel?.length == 5) {
			return validTime(time) ? getMs(time) : null;
		}

		const progressValue = Number(progress);
		return Number.isFinite(progressValue) ? progressValue : null;
	}

	function getActiveEligibleLevelId(
		type: SubmitState['type'],
		selectedVariantId: number | null,
		apiLevel: any,
		levelid: number
	) {
		if (type !== 'record') {
			return null;
		}

		const candidateLevelId = selectedVariantId ?? apiLevel?.id ?? levelid;
		const levelId = Number(candidateLevelId);

		if (!Number.isInteger(levelId) || levelId <= 0) {
			return null;
		}

		return levelId;
	}

	async function loadEligibleLists(levelId: number, progress: number | null, requestKey: string) {
		const requestToken = ++eligibleListsRequestToken;
		eligibleListsLoading = true;
		eligibleListsError = '';

		try {
			const headers: HeadersInit = {};

			if ($user.loggedIn) {
				headers.Authorization = `Bearer ${await $user.token()}`;
			}

			const params = new URLSearchParams();

			if (progress != null) {
				params.set('progress', String(progress));
			}

			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/lists/levels/${levelId}/eligible${params.size ? `?${params.toString()}` : ''}`,
				{ headers }
			);
			const payload = await res.json().catch(() => null);

			if (requestToken !== eligibleListsRequestToken || eligibleListsRequestKey !== requestKey) {
				return;
			}

			if (!res.ok) {
				throw new Error(
					payload?.error ||
						t('Không thể tải danh sách đủ điều kiện', 'Failed to load eligible lists')
				);
			}

			eligibleLists = Array.isArray(payload) ? payload : [];
		} catch (error) {
			if (requestToken !== eligibleListsRequestToken || eligibleListsRequestKey !== requestKey) {
				return;
			}

			eligibleLists = [];
			eligibleListsError =
				error instanceof Error
					? error.message
					: t('Không thể tải danh sách đủ điều kiện', 'Failed to load eligible lists');
		} finally {
			if (requestToken === eligibleListsRequestToken && eligibleListsRequestKey === requestKey) {
				eligibleListsLoading = false;
			}
		}
	}

	$: activeEligibleProgress = getEligibleProgress(
		state.type,
		state.apiLevel,
		state.time,
		state.progress
	);
	$: activeEligibleLevelId = getActiveEligibleLevelId(
		state.type,
		state.selectedVariantId,
		state.apiLevel,
		state.levelid
	);
	$: showEligibleListsPanel =
		state.type === 'record' &&
		(state.step === 2 || state.step === 3) &&
		activeEligibleLevelId !== null;
	$: eligibleListPanelMode =
		state.step === 3 && activeEligibleProgress != null ? 'eligible' : 'preview';

	$: {
		const progress = activeEligibleProgress;
		const levelId = activeEligibleLevelId;
		const canLoadEligibleLists =
			state.type === 'record' && (state.step === 2 || state.step === 3) && levelId !== null;

		if (!canLoadEligibleLists) {
			eligibleLists = [];
			eligibleListsLoading = false;
			eligibleListsError = '';
			eligibleListsRequestKey = '';
		} else {
			const requestKey = `${levelId}:${progress ?? 'preview'}`;

			if (eligibleListsRequestKey !== requestKey) {
				eligibleListsRequestKey = requestKey;
				eligibleLists = [];
				eligibleListsError = '';
				loadEligibleLists(levelId, progress, requestKey);
			}
		}
	}

	onMount(() => {
		const params = $page.url.searchParams;
		const levelId = params.get('levelId');

		if (levelId) {
			const id = parseInt(levelId);
			if (!isNaN(id)) {
				state.levelid = id;
				state.step = 1;
			}
		}
	});

	async function fetchLevel() {
		const levelId = state.levelid;

		try {
			state.level = await (await fetch(`${import.meta.env.VITE_API_URL}/levels/${levelId}`)).json();
		} catch {
			state.level = null;
		}

		state.apiLevel = await (
			await fetch(`${import.meta.env.VITE_API_URL}/levels/${levelId}?fromGD=1`)
		).json();

		state.levelVariants = [];
		state.selectedVariantId = null;
		try {
			const varRes = await fetch(`${import.meta.env.VITE_API_URL}/levels/${levelId}/variants`);
			if (varRes.ok) {
				state.levelVariants = await varRes.json();
			}
		} catch {}
	}

	function next() {
		if (state.step === 1) {
			const levelId = state.levelid;
			if (!levelId || isNaN(levelId)) {
				toast.error(t('Vui lòng nhập Level ID hợp lệ', 'Please enter a valid Level ID'));
				return;
			}
			state.apiLevel = null;
			fetchLevel().catch(() => {
				toast.error(t('Level ID không hợp lệ', 'Invalid level ID'));
				state.step--;
				state = state;
			});
		}

		// Record: validate step 3 (required fields)
		if (state.step === 3) {
			const isPlatformer = state.apiLevel?.length == 5;

			if (isPlatformer) {
				if (!validTime(state.time)) {
					toast.error(t('Thời gian không hợp lệ', 'Invalid time'));
					return;
				}
			} else {
				if (!state.progress) {
					toast.error(
						t('Vui lòng điền đầy đủ các trường bắt buộc', 'Please fill in all required fields')
					);
					return;
				}
			}

			if (!state.refreshRate || !state.videoLink || !state.mobile) {
				toast.error(
					t('Vui lòng điền đầy đủ các trường bắt buộc', 'Please fill in all required fields')
				);
				return;
			}

			if (state.level) {
				const needsRaw =
					(!state.level.flTop || state.level.rating) &&
					!(state.level.isChallenge && state.level.rating < 2600);
				if (needsRaw && !state.raw) {
					toast.error(
						t('Vui lòng điền đầy đủ các trường bắt buộc', 'Please fill in all required fields')
					);
					return;
				}
			} else if (!state.raw) {
				toast.error(
					t('Vui lòng điền đầy đủ các trường bắt buộc', 'Please fill in all required fields')
				);
				return;
			}

			if (state.raw && state.raw === state.videoLink) {
				toast.error(
					t('Video thô không được trùng với video hoàn thành', 'Raw is not completion video.')
				);
				return;
			}

			if (state.level && state.progress < state.level.minProgress) {
				toast.error(t('Progress chưa đủ', 'Not enough progress'));
				return;
			}
		}

		// Record: step 5 (optional) → submit
		// Record: step 4 (optional) → submit
		if (state.step === 4) {
			submitRecord();
			return;
		}

		direction = 1;
		state.step++;
		state = state;
	}

	function back() {
		if (state.step > 0) {
			direction = -1;
			state.step--;
			state = state;
		}
	}

	async function submitRecord() {
		submitted = true;
		state.sendStatus = 0;
		state = state;

		const submitData: any = {
			levelid: state.levelid,
			userid: $user.data.uid,
			progress: state.apiLevel?.length == 5 ? getMs(state.time) : state.progress,
			refreshRate: state.refreshRate,
			videoLink: state.videoLink,
			raw: state.raw,
			mobile: state.mobile?.value ?? null,
			suggestedRating: state.suggestedRating,
			comment: state.comment
		};

		if (state.selectedVariantId) {
			submitData.levelid = state.selectedVariantId;
		}

		state.submitId = new Date().getTime();

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/submission?id=${state.submitId}`, {
				method: 'POST',
				body: JSON.stringify(submitData),
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				}
			});

			state.sendStatus = res.ok ? 1 : 2;

			const responseText = await res.text();
			state.errorResponse = responseText;
			try {
				const resJson = JSON.parse(responseText);
				state.submitLog = resJson.logs || [];
				state.errorMessage = $locale == 'vi' ? resJson.vi : resJson.en;
			} catch {
				state.errorMessage = responseText;
			}
		} catch (err) {
			state.sendStatus = 2;
			state.errorMessage = String(err);
		}

		state = state;
	}

	function resetForm() {
		state = createDefaultState($user.data?.uid || '');
		submitted = false;
		direction = 1;
		eligibleLists = [];
		eligibleListsLoading = false;
		eligibleListsError = '';
		eligibleListsRequestKey = '';
	}
</script>

<svelte:head>
	<title>{$_('submit.button')} | DLVN</title>
</svelte:head>

<div class="submit-page">
	{#if !$user.loggedIn}
		<div class="auth-prompt">
			<h2>{$locale == 'vi' ? 'Đăng nhập để nộp' : 'Sign in to submit'}</h2>
			<p class="text-muted">
				{$locale == 'vi'
					? 'Bạn cần đăng nhập để nộp record.'
					: 'You need to sign in to submit a record.'}
			</p>
		</div>
	{:else}
		<div class="submit-container">
			<a href="/" class="back-link">
				<ArrowLeft size={16} />
				<span>{$locale == 'vi' ? 'Trang chủ' : 'Home'}</span>
			</a>

			<div class="submit-card">
				{#if !submitted}
					<SubmitStepper {steps} currentStep={state.step} />

					<div class="step-wrapper">
						{#key state.step}
							<div
								class="step-animate"
								in:fly={{ x: direction * 40, duration: 250, delay: 100 }}
								out:fly={{ x: direction * -40, duration: 150 }}
							>
									{#if state.step === 0}
										<StepRules submissionType={state.type} />
									{:else if state.step === 1}
										<StepLevelId bind:levelId={state.levelid} submissionType="record" />
									{:else if state.step === 2}
										<StepConfirmLevel
											apiLevel={state.apiLevel}
											level={state.level}
											levelVariants={state.levelVariants}
											bind:selectedVariantId={state.selectedVariantId}
										/>
										{#if showEligibleListsPanel}
											<EligibleListsPanel
												lists={eligibleLists}
												loading={eligibleListsLoading}
												errorMessage={eligibleListsError}
												mode={eligibleListPanelMode}
											/>
										{/if}
									{:else if state.step === 3}
									<StepRequiredFields
										apiLevel={state.apiLevel}
										level={state.level}
										bind:progress={state.progress}
										bind:refreshRate={state.refreshRate}
										bind:videoLink={state.videoLink}
										bind:raw={state.raw}
										bind:mobile={state.mobile}
										bind:time={state.time}
									/>
									{:else if state.step === 4}
									<StepOptionalFields
										apiLevel={state.apiLevel}
										progress={state.progress}
										bind:suggestedRating={state.suggestedRating}
										bind:comment={state.comment}
									/>
								{/if}
							</div>
						{/key}
					</div>

					<div class="step-footer">
						{#if state.step > 0}
							<Button variant="outline" class="footer-btn" on:click={back}>
								{$_('submit.back')}
							</Button>
						{:else}
							<div />
						{/if}
						<Button class="footer-btn" on:click={next}>
							{#if isLastStep}
								{$_('submit.button')}
							{:else}
								{$_('submit.next')}
							{/if}
						</Button>
					</div>
				{:else}
					<SubmitResult
						sendStatus={state.sendStatus}
						errorMessage={state.errorMessage}
						errorResponse={state.errorResponse}
						submitLog={state.submitLog}
						submitId={state.submitId}
						submission={{
							levelid: state.levelid,
							progress: state.progress,
							refreshRate: state.refreshRate,
							videoLink: state.videoLink,
							raw: state.raw,
							mobile: state.mobile,
							suggestedRating: state.suggestedRating,
							comment: state.comment
						}}
						apiLevel={state.apiLevel}
						time={state.time}
						onReset={resetForm}
					/>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style lang="scss">
	.submit-page {
		min-height: 60vh;
		padding: 24px 16px;
		display: flex;
		justify-content: center;
	}

	.auth-prompt {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		text-align: center;
		padding: 60px 20px;

		h2 {
			font-size: 20px;
			font-weight: 600;
		}

		.text-muted {
			font-size: 14px;
			color: hsl(var(--muted-foreground));
		}
	}

	.submit-container {
		width: 100%;
		max-width: 672px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.back-link {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		color: hsl(var(--muted-foreground));
		text-decoration: none;
		transition: color 0.15s ease;
		width: fit-content;

		&:hover {
			color: hsl(var(--foreground));
		}
	}

	.submit-card {
		border: 1px solid hsl(var(--border));
		border-radius: 16px;
		padding: 24px;
		background: hsl(var(--card, var(--background)));

		@media (max-width: 480px) {
			padding: 16px;
			border-radius: 12px;
		}
	}

	.step-wrapper {
		position: relative;
		min-height: 200px;
		overflow: hidden;
	}

	.step-animate {
		width: 100%;
	}

	.step-footer {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		margin-top: 24px;
		padding-top: 16px;
		border-top: 1px solid hsl(var(--border));
	}

	.step-footer :global(.footer-btn) {
		min-width: 100px;
	}

	@media (max-width: 480px) {
		.step-footer :global(.footer-btn) {
			flex: 1;
		}
	}
</style>
