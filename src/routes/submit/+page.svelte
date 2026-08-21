<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { user } from '$lib/client';
	import { showXpAwardToast } from '$lib/client/xpToast';
	import StepConfirmLevel from '$lib/components/submit/StepConfirmLevel.svelte';
	import StepLevelDetails from '$lib/components/submit/StepLevelDetails.svelte';
	import StepLevelId from '$lib/components/submit/StepLevelId.svelte';
	import StepOptionalFields from '$lib/components/submit/StepOptionalFields.svelte';
	import StepRequiredFields from '$lib/components/submit/StepRequiredFields.svelte';
	import SubmitStepper from '$lib/components/submit/SubmitStepper.svelte';
	import StepTargetSelect from '$lib/components/submit/StepTargetSelect.svelte';
	import StepTypeSelect from '$lib/components/submit/StepTypeSelect.svelte';
	import UnifiedSubmitResult from '$lib/components/submit/UnifiedSubmitResult.svelte';
	import UnifiedSubmitReview from '$lib/components/submit/UnifiedSubmitReview.svelte';
	import {
		extractYouTubeVideoId,
		getMs,
		isValidYouTubeLink,
		validTime
	} from '$lib/components/submit/submitState';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { _, locale } from 'svelte-i18n';
	import { toast } from 'svelte-sonner';
	import { fly } from 'svelte/transition';
	import { ArrowLeft, BookOpen, Loader2, Search } from 'lucide-svelte';
	import { onMount } from 'svelte';

	type SubmissionType = 'record' | 'level' | 'ldm';
	type StepKey = 'type' | 'targets' | 'details' | 'review' | 'result';
	type TargetList = {
		id: number;
		slug?: string | null;
		title: string;
		description?: string | null;
		isPlatformer?: boolean;
		levelSubmissionEnabled?: boolean;
		nonGlobalRecordsEnabled?: boolean;
		isBanned?: boolean;
		visibility?: string;
	};
	type SubmissionResult = {
		key: string;
		label: string;
		success: boolean;
		error?: string;
	};
	type TargetDefinition = { key: string; label: string; target: number | null; };

	let submissionType: SubmissionType | null = null;
	let currentStep = 0;
	let direction = 1;
	let selectedTargetIds: number[] = [];
	let selectedTargetLists: TargetList[] = [];
	let pinnedLists: TargetList[] = [];
	let recordScope: 'global' | 'lists' = 'global';
	let targetErrors: string[] = [];

	let levelid = NaN;
	let loadedLevelId: number | null = null;
	let apiLevel: any = null;
	let level: any = null;
	let levelVariants: any[] = [];
	let selectedVariantId: number | null = null;
	let detailsBusy = false;
	let progress = NaN;
	let refreshRate = '';
	let videoLink = '';
	let raw = '';
	let mobile: { value: boolean; label: string; } | null = null;
	let suggestedRating = NaN;
	let comment = '';
	let time: { m: number | null; s: number | null; ms: number | null; } = { m: null, s: null, ms: null };

	let mainLevelId = NaN;
	let variantLevelId = NaN;
	let mainLevel: any = null;
	let variantLevel: any = null;
	let loadingMain = false;
	let loadingVariant = false;

	let submitting = false;
	let results: SubmissionResult[] = [];

	function t(vi: string, en: string) {
		return $locale == 'vi' ? vi : en;
	}

	$: stepKeys = (submissionType === 'ldm'
		? ['type', 'details', 'review', 'result']
		: ['type', 'targets', 'details', 'review', 'result']) as StepKey[];
	$: steps = stepKeys.map((step) => ({
		type: t('Loại', 'Type'),
		targets: t('Danh sách', 'Targets'),
		details: t('Chi tiết', 'Details'),
		review: t('Xem lại', 'Review'),
		result: t('Kết quả', 'Result')
	}[step]));
	$: stepKey = stepKeys[currentStep] || 'type';
	$: needsRaw = level ? (!level.flTop || level.rating) && !(level.isChallenge && level.rating < 2600) : true;
	$: selectedTargetLabel = selectedTargetLists.map((list) => list.title)
		.join(', ');

	function parsePositiveInteger(value: unknown) {
		const parsed = Number(value);

		return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
	}

	function chooseType(type: SubmissionType) {
		if (submissionType !== type) {
			selectedTargetIds = [];
			selectedTargetLists = [];
			pinnedLists = [];
			recordScope = 'global';
			targetErrors = [];
			results = [];
			levelid = NaN;
			loadedLevelId = null;
			apiLevel = level = null;
			levelVariants = [];
			selectedVariantId = null;
			progress = suggestedRating = NaN;
			refreshRate = videoLink = raw = comment = '';
			mobile = null;
			time = { m: null, s: null, ms: null };
			mainLevelId = variantLevelId = NaN;
			mainLevel = variantLevel = null;
		}

		submissionType = type;
	}

	async function loadPinnedTargets(ids: number[]) {
		if (!ids.length) {
			return;
		}

		const headers: HeadersInit = {};

		if ($user.loggedIn) {
			headers.Authorization = `Bearer ${await $user.token()}`;
		}

		const loaded = await Promise.all(ids.map(async (id) => {
			try {
				const response = await fetch(`${import.meta.env.VITE_API_URL}/lists/${id}?submitGate=1&cacheBust=${Date.now()}`, { headers, cache: 'no-store' });

				return response.ok ? await response.json() as TargetList : null;
			} catch {
				return null;
			}
		}));
		pinnedLists = loaded.filter((list): list is TargetList => Boolean(list));
		selectedTargetLists = selectedTargetIds.map((id) => pinnedLists.find((list) => list.id === id) || { id, title: `#${id}` });
	}

	function syncUrl() {
		if (!submissionType) {
			return;
		}

		const params = new URLSearchParams($page.url.searchParams);
		params.set('type', submissionType);
		params.delete('target');

		if (submissionType !== 'ldm' && !(submissionType === 'record' && recordScope === 'global')) {
			for (const id of selectedTargetIds) {
				params.append('target', String(id));
			}
		}

		if (Number.isInteger(levelid) && levelid > 0 && submissionType !== 'ldm') {
			params.set('levelId', String(levelid));
		}

		void goto(`/submit?${params.toString()}`, { replaceState: true, noScroll: true, keepFocus: true });
	}

	onMount(() => {
		const params = $page.url.searchParams;
		const queryType = params.get('type');

		if (queryType === 'record' || queryType === 'level' || queryType === 'ldm') {
			submissionType = queryType;
			currentStep = 1;
		} else if (params.has('levelId')) {
			submissionType = 'record';
			currentStep = 1;
		}

		const queryLevelId = parsePositiveInteger(params.get('levelId'));

		if (queryLevelId) {
			levelid = queryLevelId;
		}

		selectedTargetIds = [...new Set(params.getAll('target')
			.map(Number)
			.filter((id) => Number.isInteger(id) && id > 0))];

		if (submissionType === 'record' && selectedTargetIds.length) {
			recordScope = 'lists';
		}

		void loadPinnedTargets(selectedTargetIds);
	});

	async function loadSubmissionLevel(showError = true) {
		const id = parsePositiveInteger(levelid);

		if (!id) {
			if (showError) {
				toast.error(t('Vui lòng nhập Level ID hợp lệ', 'Please enter a valid Level ID'));
			}

			return false;
		}

		detailsBusy = true;
		apiLevel = null;
		level = null;
		levelVariants = [];
		selectedVariantId = null;

		try {
			const [storedResponse, gdResponse] = await Promise.all([
				fetch(`${import.meta.env.VITE_API_URL}/levels/${id}`),
				fetch(`${import.meta.env.VITE_API_URL}/levels/${id}?fromGD=1`)
			]);
			level = storedResponse.ok ? await storedResponse.json() : null;

			if (!gdResponse.ok) {
				throw new Error(t('Không tải được level này', 'Unable to load this level'));
			}

			apiLevel = await gdResponse.json();
			loadedLevelId = id;

			try {
				const variantResponse = await fetch(`${import.meta.env.VITE_API_URL}/levels/${id}/variants`);

				if (variantResponse.ok) {
					levelVariants = await variantResponse.json();
				}
			} catch {
				levelVariants = [];
			}

			return true;
		} catch (error) {
			loadedLevelId = null;

			if (showError) {
				toast.error(error instanceof Error ? error.message : t('Không tải được level này', 'Unable to load this level'));
			}

			return false;
		} finally {
			detailsBusy = false;
		}
	}

	async function loadLdmPreview(kind: 'main' | 'variant') {
		const id = parsePositiveInteger(kind === 'main' ? mainLevelId : variantLevelId);

		if (!id) {
			toast.error(t('Vui lòng nhập Level ID hợp lệ', 'Please enter a valid Level ID'));

			return false;
		}

		if (kind === 'main') {
			loadingMain = true;
		} else {
			loadingVariant = true;
		}

		try {
			const response = await fetch(`${import.meta.env.VITE_API_URL}/levels/${id}?fromGD=1`);

			if (!response.ok) {
				throw new Error(t('Không tải được level này', 'Unable to load this level'));
			}

			const payload = await response.json();

			if (kind === 'main') {
				mainLevel = payload;
			} else {
				variantLevel = payload;
			}

			return true;
		} catch (error) {
			if (kind === 'main') {
				mainLevel = null;
			} else {
				variantLevel = null;
			}

			toast.error(error instanceof Error ? error.message : t('Không tải được level này', 'Unable to load this level'));

			return false;
		} finally {
			if (kind === 'main') {
				loadingMain = false;
			} else {
				loadingVariant = false;
			}
		}
	}

	function targetListName(id: number) {
		return selectedTargetLists.find((list) => list.id === id)?.title || `#${id}`;
	}

	async function validateRecordTargets() {
		if (recordScope === 'global') {
			return true;
		}

		const activeLevelId = selectedVariantId ?? apiLevel?.id ?? levelid;
		const candidateProgress = apiLevel?.length == 5 ? getMs(time) : Number(progress);
		const headers: HeadersInit = {};

		if ($user.loggedIn) {
			headers.Authorization = `Bearer ${await $user.token()}`;
		}

		async function fetchEligible(target?: number) {
			const params = new URLSearchParams({ progress: String(candidateProgress) });

			if (target) {
				params.set('target', String(target));
			}

			const response = await fetch(`${import.meta.env.VITE_API_URL}/lists/levels/${activeLevelId}/eligible?${params}`, { headers });

			if (!response.ok) {
				throw new Error(t('Không thể kiểm tra list đích', 'Unable to validate target lists'));
			}

			const payload = await response.json();

			return Array.isArray(payload) ? payload : [];
		}

		try {
			let eligibleLists = await fetchEligible();
			const missingIds = selectedTargetIds.filter((id) => !eligibleLists.some((list) => list.id === id));

			for (const id of missingIds) {
				eligibleLists = [...eligibleLists, ...await fetchEligible(id)];
			}

			const numericRefreshRate = Number(refreshRate);
			targetErrors = selectedTargetIds.flatMap((id) => {
				const list = eligibleLists.find((entry) => entry.id === id);
				const platformMatches = list?.recordFilterPlatform === 'mobile'
					? mobile?.value === true
					: list?.recordFilterPlatform === 'pc' ? mobile?.value === false : true;
				const fpsMatches = (list?.recordFilterMinRefreshRate == null || numericRefreshRate >= Number(list.recordFilterMinRefreshRate))
					&& (list?.recordFilterMaxRefreshRate == null || numericRefreshRate <= Number(list.recordFilterMaxRefreshRate));

				return list && !list.isBanned && list.nonGlobalRecordsEnabled === true && list.eligible && platformMatches && fpsMatches
					? []
					: [t(`${targetListName(id)} không phù hợp với record này.`, `${targetListName(id)} is not eligible for this record.`)];
			});

			return targetErrors.length === 0;
		} catch (error) {
			targetErrors = [error instanceof Error ? error.message : t('Không thể kiểm tra list đích', 'Unable to validate target lists')];

			return false;
		}
	}

	async function validateDetails() {
		targetErrors = [];

		if (!submissionType) {
			return false;
		}

		if (submissionType === 'ldm') {
			const mainId = parsePositiveInteger(mainLevelId);
			const variantId = parsePositiveInteger(variantLevelId);

			if (!mainId || !variantId || mainId === variantId) {
				toast.error(t('Hai Level ID hợp lệ và khác nhau là bắt buộc', 'Two different valid level IDs are required'));

				return false;
			}

			const loaded = await Promise.all([
				mainLevel?.id === mainId ? true : loadLdmPreview('main'),
				variantLevel?.id === variantId ? true : loadLdmPreview('variant')
			]);

			return loaded.every(Boolean);
		}

		if (loadedLevelId !== Number(levelid) || !apiLevel) {
			if (!await loadSubmissionLevel()) {
				return false;
			}
		}

		if (submissionType === 'level') {
			if (!isValidYouTubeLink(videoLink)) {
				toast.error(t('Vui lòng nhập link YouTube hợp lệ', 'Please enter a valid YouTube link'));

				return false;
			}

			const isPlatformer = apiLevel?.length == 5;
			targetErrors = selectedTargetLists.flatMap((list) => list.isBanned || list.levelSubmissionEnabled !== true || list.isPlatformer !== isPlatformer
				? [t(`${list.title} không nhận loại level này.`, `${list.title} does not accept this level type.`)]
				: []);

			if (targetErrors.length) {
				toast.error(t('Hãy bỏ các list không tương thích', 'Remove incompatible target lists'));

				return false;
			}

			return true;
		}

		const isPlatformer = apiLevel?.length == 5;

		if (isPlatformer ? !validTime(time) : !Number.isFinite(Number(progress)) || Number(progress) <= 0 || Number(progress) > 100) {
			toast.error(isPlatformer ? t('Thời gian không hợp lệ', 'Invalid time') : t('Tiến độ phải từ 1 đến 100', 'Progress must be between 1 and 100'));

			return false;
		}

		if (!refreshRate || !Number.isFinite(Number(refreshRate)) || Number(refreshRate) < 0 || !mobile) {
			toast.error(t('Vui lòng nhập FPS và nền tảng hợp lệ', 'Enter a valid FPS and platform'));

			return false;
		}

		if (!isValidYouTubeLink(videoLink) || (needsRaw && !isValidYouTubeLink(raw))) {
			toast.error(t('Vui lòng nhập các link YouTube bắt buộc', 'Enter the required valid YouTube links'));

			return false;
		}

		if (raw && raw === videoLink) {
			toast.error(t('Video thô không được trùng video hoàn thành', 'Raw footage must differ from the completion video'));

			return false;
		}

		if (!await validateRecordTargets()) {
			toast.error(t('Có list đích không phù hợp', 'Some target lists are not eligible'));

			return false;
		}

		return true;
	}

	function validateTargets() {
		if (!submissionType || submissionType === 'ldm') {
			return true;
		}

		if (submissionType === 'record' && recordScope === 'global') {
			return true;
		}

		if (selectedTargetIds.length === 0) {
			toast.error(t('Vui lòng chọn ít nhất một danh sách', 'Select at least one list'));

			return false;
		}

		return true;
	}

	async function next() {
		if (stepKey === 'type') {
			if (!submissionType) {
				toast.error(t('Vui lòng chọn loại bài nộp', 'Choose a submission type'));

				return;
			}

			syncUrl();
		} else if (stepKey === 'targets') {
			if (!validateTargets()) {
				return;
			}

			syncUrl();
		} else if (stepKey === 'details') {
			if (!await validateDetails()) {
				return;
			}

			syncUrl();
		} else if (stepKey === 'review') {
			await submitAll(results.some((result) => result.success));

			return;
		}

		direction = 1;
		currentStep += 1;
	}

	function back() {
		if (currentStep <= 0 || submitting) {
			return;
		}

		direction = -1;
		currentStep -= 1;
	}

	function getTargetDefinitions(): TargetDefinition[] {
		if (submissionType === 'ldm') {
			return [{ key: 'ldm', label: 'LDM', target: null }];
		}

		if (submissionType === 'record' && recordScope === 'global') {
			return [{ key: 'global', label: 'Global', target: null }];
		}

		return selectedTargetIds.map((target) => ({ key: `list:${target}`, label: targetListName(target), target }));
	}

	async function responsePayload(response: Response) {
		const text = await response.text();

		try {
			return { payload: JSON.parse(text), text };
		} catch {
			return { payload: null, text };
		}
	}

	function responseError(payload: any, text: string) {
		return ($locale == 'vi' ? payload?.vi : payload?.en) || payload?.error || payload?.message || text || t('Không thể gửi bài', 'Unable to submit');
	}

	async function executeSubmission(definition: TargetDefinition): Promise<SubmissionResult> {
		try {
			const headers = { Authorization: `Bearer ${await $user.token()}`, 'Content-Type': 'application/json' };
			let response: Response;

			if (submissionType === 'record') {
				response = await fetch(`${import.meta.env.VITE_API_URL}/submission`, {
					method: 'POST', headers, body: JSON.stringify({
						levelid: selectedVariantId ?? levelid,
						progress: apiLevel?.length == 5 ? getMs(time) : Number(progress),
						refreshRate,
						videoLink,
						raw,
						mobile: mobile?.value ?? null,
						suggestedRating,
						comment,
						target: definition.target
					})
				});
			} else if (submissionType === 'level') {
				response = await fetch(`${import.meta.env.VITE_API_URL}/lists/${definition.target}/submissions`, {
					method: 'POST', headers, body: JSON.stringify({ levelId: selectedVariantId ?? levelid, videoID: extractYouTubeVideoId(videoLink), comment })
				});
			} else {
				response = await fetch(`${import.meta.env.VITE_API_URL}/ldm-variant-submissions`, {
					method: 'POST', headers, body: JSON.stringify({ mainLevelId, variantLevelId, comment })
				});
			}

			const { payload, text } = await responsePayload(response);

			if (!response.ok) {
				throw new Error(responseError(payload, text));
			}

			if (payload?.xpAward) {
				showXpAwardToast(payload.xpAward);
			}

			return { key: definition.key, label: definition.label, success: true };
		} catch (error) {
			return { key: definition.key, label: definition.label, success: false, error: error instanceof Error ? error.message : String(error) };
		}
	}

	async function submitAll(retryFailed: boolean) {
		const definitions = getTargetDefinitions();
		const successfulKeys = new Set(results.filter((result) => result.success)
			.map((result) => result.key));
		const pendingDefinitions = retryFailed ? definitions.filter((definition) => !successfulKeys.has(definition.key)) : definitions;

		if (!retryFailed) {
			results = [];
		}

		currentStep = stepKeys.indexOf('result');
		submitting = true;
		const nextResults = await Promise.all(pendingDefinitions.map(executeSubmission));
		const byKey = new Map([...results.filter((result) => result.success), ...nextResults].map((result) => [result.key, result]));
		results = definitions.map((definition) => byKey.get(definition.key) || { key: definition.key, label: definition.label, success: false, error: t('Chưa gửi', 'Not submitted') });
		submitting = false;
	}

	function editSubmission() {
		currentStep = stepKeys.indexOf('details');
		direction = -1;
	}

	function resetForm() {
		submissionType = null;
		currentStep = 0;
		direction = 1;
		selectedTargetIds = [];
		selectedTargetLists = [];
		pinnedLists = [];
		recordScope = 'global';
		targetErrors = [];
		levelid = NaN;
		loadedLevelId = null;
		apiLevel = level = null;
		levelVariants = [];
		selectedVariantId = null;
		progress = suggestedRating = NaN;
		refreshRate = videoLink = raw = comment = '';
		mobile = null;
		time = { m: null, s: null, ms: null };
		mainLevelId = variantLevelId = NaN;
		mainLevel = variantLevel = null;
		results = [];
		void goto('/submit', { replaceState: true });
	}
</script>

<svelte:head><title>{$_('submit.button')} | {$_('head.site_short_name')}</title></svelte:head>

<div class="submit-page">
  {#if !$user.loggedIn}
    <div class="auth-prompt"><h1>{t('Đăng nhập để nộp bài', 'Sign in to submit')}</h1><p>{t('Bạn cần đăng nhập để sử dụng luồng nộp bài.', 'You need to sign in to use the submission wizard.')}</p></div>
  {:else}
    <div class="submit-container">
      <a href="/" class="back-link"><ArrowLeft size={16} />{t('Trang chủ', 'Home')}</a>
      <div class="submit-card">
        <SubmitStepper {steps} {currentStep} />
        <div class="step-wrapper">
          {#key `${submissionType || 'none'}:${currentStep}`}
            <div class="step-animate" in:fly={{ x: direction * 36, duration: 220 }}>
              {#if stepKey === 'type'}
                <StepTypeSelect {submissionType} onSelect={chooseType} />
              {:else if stepKey === 'targets' && submissionType !== 'ldm' && submissionType}
                <StepTargetSelect submissionType={submissionType} bind:selectedIds={selectedTargetIds} bind:recordScope {pinnedLists} bind:selectedLists={selectedTargetLists} />
              {:else if stepKey === 'details'}
                {#if submissionType === 'ldm'}
                  <div class="details-step">
                    <header><h2>{t('Chi tiết bản LDM', 'LDM details')}</h2><p>{t('Nhập level gốc và bản Low Detail Mode.', 'Enter the original level and its Low Detail Mode copy.')}</p></header>
                    <div class="field-card"><Label for="main-level">{t('ID level gốc', 'Original level ID')}</Label><div class="input-action"><Input id="main-level" type="number" inputmode="numeric" bind:value={mainLevelId} /><Button variant="outline" disabled={loadingMain} on:click={() => loadLdmPreview('main')}>{#if loadingMain}<Loader2 size={15} class="spin" />{:else}<Search size={15} />{/if}{t('Xem', 'Preview')}</Button></div>{#if mainLevel}<p class="preview"><strong>{mainLevel.name}</strong> · {mainLevel.author}</p>{/if}</div>
                    <div class="field-card"><Label for="variant-level">{t('ID level LDM', 'LDM level ID')}</Label><div class="input-action"><Input id="variant-level" type="number" inputmode="numeric" bind:value={variantLevelId} /><Button variant="outline" disabled={loadingVariant} on:click={() => loadLdmPreview('variant')}>{#if loadingVariant}<Loader2 size={15} class="spin" />{:else}<Search size={15} />{/if}{t('Xem', 'Preview')}</Button></div>{#if variantLevel}<p class="preview"><strong>{variantLevel.name}</strong> · {variantLevel.author}</p>{/if}</div>
                    <div class="field-card"><Label for="ldm-comment">{t('Ghi chú (không bắt buộc)', 'Comment (optional)')}</Label><Textarea id="ldm-comment" bind:value={comment} rows={4} /></div>
                  </div>
                {:else if submissionType}
                  <div class="details-step">
                    <header><h2>{submissionType === 'record' ? t('Chi tiết record', 'Record details') : t('Chi tiết level', 'Level details')}</h2><p>{t('Thông tin này được dùng chung cho mọi list đã chọn.', 'These details are shared by every selected list.')}</p></header>
                    {#if submissionType === 'record'}<a class="rules-callout" href="/wiki"><BookOpen size={18} /><span><strong>{t('Đọc luật nộp record', 'Read the record rules')}</strong><small>{t('Kiểm tra yêu cầu video và tính hợp lệ trước khi gửi.', 'Review video and eligibility requirements before submitting.')}</small></span></a>{/if}
                    <StepLevelId bind:levelId={levelid} submissionType={submissionType} targetLabel={selectedTargetLabel} />
                    <div class="load-action"><Button variant="outline" disabled={detailsBusy} on:click={() => loadSubmissionLevel()}>{#if detailsBusy}<Loader2 size={16} class="spin" />{/if}{loadedLevelId === Number(levelid) && apiLevel ? t('Tải lại level', 'Reload level') : t('Tải level', 'Load level')}</Button></div>
                    {#if loadedLevelId === Number(levelid) && apiLevel}
                      <StepConfirmLevel {apiLevel} {level} {levelVariants} bind:selectedVariantId targetLabel={selectedTargetLabel} />
                      {#if submissionType === 'record'}
                        <StepRequiredFields {apiLevel} {level} bind:progress bind:refreshRate bind:videoLink bind:raw bind:mobile bind:time />
                        <StepOptionalFields {apiLevel} {progress} bind:suggestedRating bind:comment />
                      {:else}
                        <StepLevelDetails {apiLevel} bind:videoLink bind:comment targetLabel={selectedTargetLabel} />
                      {/if}
                    {/if}
                    {#if targetErrors.length}<div class="target-errors"><strong>{t('List cần chỉnh sửa', 'Targets need attention')}</strong>{#each targetErrors as error}<p>{error}</p>{/each}<Button variant="outline" on:click={() => {
 currentStep = stepKeys.indexOf('targets'); direction = -1;
}}>{t('Quay lại chọn list', 'Back to targets')}</Button></div>{/if}
                  </div>
                {/if}
              {:else if stepKey === 'review' && submissionType}
                <UnifiedSubmitReview {submissionType} targetLists={selectedTargetLists} {recordScope} details={{ levelid, selectedVariantId, apiLevel, progress, refreshRate, videoLink, raw, mobile, time, suggestedRating, comment, mainLevelId, variantLevelId, mainLevel, variantLevel }} />
              {:else if stepKey === 'result'}
                <UnifiedSubmitResult loading={submitting} {results} onRetry={() => submitAll(true)} onEdit={editSubmission} onReset={resetForm} />
              {/if}
            </div>
          {/key}
        </div>

        {#if stepKey !== 'result'}
          <footer>
            {#if currentStep > 0}<Button variant="outline" on:click={back} disabled={detailsBusy || submitting}>{t('Quay lại', 'Back')}</Button>{:else}<span />{/if}
            <Button on:click={next} disabled={detailsBusy || submitting}>{stepKey === 'review' ? t('Nộp bài', 'Submit') : t('Tiếp tục', 'Continue')}</Button>
          </footer>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
.submit-page { min-height: 60vh; padding: 24px 16px 52px; display: flex; justify-content: center; }
.submit-container { width: 100%; max-width: 720px; display: grid; gap: 14px; align-content: start; }
.back-link { display: inline-flex; align-items: center; gap: 6px; width: fit-content; color: hsl(var(--muted-foreground)); font-size: 13px; text-decoration: none; }
.submit-card { padding: 24px; border: 1px solid hsl(var(--border)); border-radius: 16px; background: hsl(var(--card, var(--background))); }
.step-wrapper { min-height: 260px; overflow: hidden; } .step-animate { width: 100%; }
footer { display: flex; justify-content: space-between; gap: 10px; margin-top: 22px; padding-top: 16px; border-top: 1px solid hsl(var(--border)); }
.auth-prompt { display: grid; place-items: center; align-content: center; gap: 7px; padding: 70px 20px; text-align: center; } .auth-prompt h1 { font-size: 21px; font-weight: 700; } .auth-prompt p { color: hsl(var(--muted-foreground)); font-size: 13px; }
.details-step { display: grid; gap: 14px; } .details-step > header { text-align: center; } .details-step > header h2 { font-size: 19px; font-weight: 700; } .details-step > header p { margin-top: 4px; color: hsl(var(--muted-foreground)); font-size: 13px; }
.field-card { display: grid; gap: 8px; padding: 14px; border: 1px solid hsl(var(--border)); border-radius: 11px; }
.input-action { display: flex; gap: 8px; } .input-action :global(input) { flex: 1; } .input-action :global(button) { display: inline-flex; gap: 6px; }
.preview { color: hsl(var(--muted-foreground)); font-size: 12px; }
.load-action { display: flex; justify-content: center; } .load-action :global(button) { display: inline-flex; gap: 7px; }
.rules-callout { display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: 10px; background: hsl(var(--primary) / 0.07); color: hsl(var(--primary)); text-decoration: none; } .rules-callout span { display: grid; } .rules-callout strong { font-size: 13px; } .rules-callout small { color: hsl(var(--muted-foreground)); font-size: 11px; }
.target-errors { display: grid; gap: 7px; padding: 13px; border: 1px solid hsl(var(--destructive) / 0.35); border-radius: 10px; background: hsl(var(--destructive) / 0.06); color: hsl(var(--destructive)); } .target-errors strong { font-size: 13px; } .target-errors p { font-size: 12px; }
:global(.spin) { animation: spin 0.8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 560px) { .submit-card { padding: 16px; border-radius: 12px; } .input-action { align-items: stretch; } }
</style>
