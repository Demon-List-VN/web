<script lang="ts">
	import { locale } from 'svelte-i18n';
	import { CheckCircle2, CircleSlash, ExternalLink } from 'lucide-svelte';

	type RecordFilterPlatform = 'any' | 'pc' | 'mobile';
	type RecordFilterAcceptanceStatus = 'manual' | 'auto' | 'any';
	type SubmitMobileOption = { value: boolean; label: string } | null;
	type SubmitTime = { m: number | null; s: number | null; ms: number | null };
	type ReviewFilterCheck = {
		label: string;
		matched: boolean;
	};
	type ReviewListEntry = {
		id: number;
		slug?: string | null;
		title: string;
		description?: string;
		mode: 'rating' | 'top';
		isPlatformer: boolean;
		isOfficial?: boolean;
		ownerData?: any | null;
		eligible?: boolean | null;
		recordFilterPlatform?: RecordFilterPlatform | null;
		recordFilterMinRefreshRate?: number | null;
		recordFilterMaxRefreshRate?: number | null;
		recordFilterAcceptanceStatus?: RecordFilterAcceptanceStatus | null;
		recordFilterManualAcceptanceOnly?: boolean | null;
		item?: {
			position?: number | null;
			rating?: number | null;
			minProgress?: number | null;
		} | null;
	};
	type ReviewedListEntry = ReviewListEntry & {
		filterChecks: ReviewFilterCheck[];
		acceptanceStatus: RecordFilterAcceptanceStatus;
	};

	export let levelId: number;
	export let selectedVariantId: number | null = null;
	export let apiLevel: any = null;
	export let level: any = null;
	export let progress: number = NaN;
	export let refreshRate = '';
	export let videoLink = '';
	export let raw = '';
	export let mobile: SubmitMobileOption = null;
	export let time: SubmitTime = { m: null, s: null, ms: null };
	export let suggestedRating: number = NaN;
	export let comment = '';
	export let lists: ReviewListEntry[] = [];
	export let loading = false;
	export let errorMessage = '';

	function t(vi: string, en: string) {
		return $locale == 'vi' ? vi : en;
	}

	function getListHref(list: ReviewListEntry) {
		return `/lists/${list.slug || list.id}`;
	}

	function getOwnerName(list: ReviewListEntry) {
		return list.ownerData?.name || null;
	}

	function getListTypeLabel(list: ReviewListEntry) {
		return list.isPlatformer ? 'Platformer' : 'Classic';
	}

	function getSubmissionPlatformLabel() {
		if (!mobile) {
			return t('Chưa chọn', 'Not selected');
		}

		return mobile.value ? 'Mobile' : 'PC';
	}

	function formatVideoLabel(url: string) {
		if (!url) {
			return t('Chưa có', 'Not provided');
		}

		try {
			const parsed = new URL(url);
			return `${parsed.hostname}${parsed.pathname}`;
		} catch {
			return url;
		}
	}

	function formatTimeValue(value: number | null, length: number) {
		return String(value ?? 0).padStart(length, '0');
	}

	function formatCompletionValue() {
		if (apiLevel?.length == 5) {
			if (time.m == null || time.s == null || time.ms == null) {
				return t('Chưa có', 'Not provided');
			}

			return `${time.m}:${formatTimeValue(time.s, 2)}.${formatTimeValue(time.ms, 3)}`;
		}

		const numericProgress = Number(progress);

		return Number.isFinite(numericProgress)
			? `${numericProgress}%`
			: t('Chưa có', 'Not provided');
	}

	function getDisplayLevelName() {
		return apiLevel?.name || level?.name || `#${selectedVariantId ?? levelId}`;
	}

	function getActiveSubmissionLevelId() {
		return selectedVariantId ?? levelId;
	}

	function getAcceptanceStatus(list: ReviewListEntry): RecordFilterAcceptanceStatus {
		const status = list.recordFilterAcceptanceStatus;

		if (status === 'auto' || status === 'any' || status === 'manual') {
			return status;
		}

		return list.recordFilterManualAcceptanceOnly === false ? 'any' : 'manual';
	}

	function formatAcceptanceStatus(status: RecordFilterAcceptanceStatus) {
		if (status === 'auto') {
			return t('Chưa xác minh', 'Unverified only');
		}

		if (status === 'any') {
			return t('Đã xác minh hoặc chưa xác minh', 'Verified or unverified');
		}

		return t('Đã xác minh', 'Verified only');
	}

	function formatPlatformFilter(platform: RecordFilterPlatform) {
		if (platform === 'mobile') {
			return t('Chỉ Mobile', 'Mobile only');
		}

		if (platform === 'pc') {
			return t('Chỉ PC', 'PC only');
		}

		return t('Mọi nền tảng', 'Any platform');
	}

	function buildFilterChecks(list: ReviewListEntry) {
		const checks: ReviewFilterCheck[] = [];
		const platform = list.recordFilterPlatform;
		const numericRefreshRate = Number(refreshRate);
		const hasRefreshRate = Number.isFinite(numericRefreshRate);

		if (platform === 'pc' || platform === 'mobile') {
			checks.push({
				label: formatPlatformFilter(platform),
				matched: mobile != null ? platform === 'mobile' ? mobile.value : !mobile.value : false
			});
		}

		if (Number.isInteger(list.recordFilterMinRefreshRate) && Number(list.recordFilterMinRefreshRate) > 0) {
			const minRefreshRate = Number(list.recordFilterMinRefreshRate);
			checks.push({
				label: `${t('Tối thiểu', 'Min')} ${minRefreshRate} FPS`,
				matched: hasRefreshRate ? numericRefreshRate >= minRefreshRate : false
			});
		}

		if (Number.isInteger(list.recordFilterMaxRefreshRate) && Number(list.recordFilterMaxRefreshRate) > 0) {
			const maxRefreshRate = Number(list.recordFilterMaxRefreshRate);
			checks.push({
				label: `${t('Tối đa', 'Max')} ${maxRefreshRate} FPS`,
				matched: hasRefreshRate ? numericRefreshRate <= maxRefreshRate : false
			});
		}

		return checks;
	}

	$: reviewedLists = [...lists]
		.map((list) => ({
			...list,
			filterChecks: buildFilterChecks(list),
			acceptanceStatus: getAcceptanceStatus(list)
		}))
		.sort((left, right) => {
			const rightEligible = right.eligible ? 1 : 0;
			const leftEligible = left.eligible ? 1 : 0;

			if (rightEligible !== leftEligible) {
				return rightEligible - leftEligible;
			}

			return left.title.localeCompare(right.title);
		}) as ReviewedListEntry[];
</script>

<div class="review-layout">
	<section class="review-panel">
		<div class="review-header">
			<h3>{t('Xem lại thông tin submit', 'Review submission details')}</h3>
			<p>
				{t(
					'Kiểm tra lại thông tin trước khi gửi để tránh thiếu sót.',
					'Review your submission details before sending to avoid mistakes.'
				)}
			</p>
		</div>

		<dl class="review-summary-grid">
			<div>
				<dt>{t('Level', 'Level')}</dt>
				<dd>{getDisplayLevelName()}</dd>
			</div>
			<div>
				<dt>{t('Level ID dùng để submit', 'Submission level ID')}</dt>
				<dd>{getActiveSubmissionLevelId()}</dd>
			</div>
			<div>
				<dt>{apiLevel?.length == 5 ? t('Thời gian', 'Time') : t('Tiến trình', 'Progress')}</dt>
				<dd>{formatCompletionValue()}</dd>
			</div>
			<div>
				<dt>{t('Thiết bị', 'Platform')}</dt>
				<dd>{getSubmissionPlatformLabel()}</dd>
			</div>
			<div>
				<dt>{t('FPS', 'FPS')}</dt>
				<dd>{refreshRate ? `${refreshRate} FPS` : t('Chưa có', 'Not provided')}</dd>
			</div>
			<div>
				<dt>{t('Suggested rating', 'Suggested rating')}</dt>
				<dd>
					{Number.isFinite(suggestedRating)
						? suggestedRating
						: t('Không đề xuất', 'No suggestion')}
				</dd>
			</div>
			<div class="summary-span">
				<dt>{t('Video hoàn thành', 'Completion video')}</dt>
				<dd>
					{#if videoLink}
						<a href={videoLink} target="_blank" rel="noreferrer">{formatVideoLabel(videoLink)}</a>
					{:else}
						{t('Chưa có', 'Not provided')}
					{/if}
				</dd>
			</div>
			<div class="summary-span">
				<dt>{t('Video thô', 'Raw video')}</dt>
				<dd>
					{#if raw}
						<a href={raw} target="_blank" rel="noreferrer">{formatVideoLabel(raw)}</a>
					{:else}
						{t('Chưa có', 'Not provided')}
					{/if}
				</dd>
			</div>
			<div class="summary-span">
				<dt>{t('Ghi chú', 'Comment')}</dt>
				<dd>{comment || t('Không có ghi chú', 'No comment added')}</dd>
			</div>
		</dl>
	</section>

	<section class="review-panel">
		<div class="review-header">
			<h3>{t('Đối chiếu bộ lọc record', 'Record filter review')}</h3>
			<p>
				{t(
					'Các bộ lọc nền tảng và FPS được đối chiếu trực tiếp từ thông tin submit. Bộ lọc chấp nhận sẽ áp dụng sau khi record được duyệt.',
					'Platform and FPS filters are checked directly against your submit details. Acceptance filters apply after the record is reviewed.'
				)}
			</p>
		</div>

		{#if loading}
			<p class="review-status">{t('Đang tải các list liên quan...', 'Loading matching lists...')}</p>
		{:else if errorMessage}
			<p class="review-status error">{errorMessage}</p>
		{:else if reviewedLists.length > 0}
			<div class="review-list-grid">
				{#each reviewedLists as list}
					<a class="review-list-card" href={getListHref(list)} target="_blank" rel="noreferrer">
						<div class="review-list-top">
							<div>
								<div class="review-list-title-row">
									<h4>{list.title}</h4>
									{#if list.isOfficial}
										<span class="list-chip official">{t('Chính thức', 'Official')}</span>
									{/if}
									<span class="list-chip" class:matched={Boolean(list.eligible)} class:unmatched={!list.eligible}>
										{list.eligible ? t('Đạt ngưỡng list', 'List threshold met') : t('Chưa đạt ngưỡng list', 'List threshold not met')}
									</span>
								</div>
								<p class="review-list-meta">
									{getListTypeLabel(list)}
									{#if getOwnerName(list)}
										<span>{t(' · tạo bởi ', ' · by ')}{getOwnerName(list)}</span>
									{/if}
								</p>
							</div>
							<span class="review-list-link-icon"><ExternalLink size={14} /></span>
						</div>

						{#if list.description}
							<p class="review-list-description">{list.description}</p>
						{/if}

						<div class="filter-block">
							<p class="filter-label">{t('Bộ lọc khớp với thông tin submit', 'Filters checked against your submit')}</p>
							{#if list.filterChecks.length > 0}
								<div class="filter-chip-row">
									{#each list.filterChecks as filter}
										<span class="filter-chip" class:matched={filter.matched} class:unmatched={!filter.matched}>
											{#if filter.matched}
												<CheckCircle2 size={12} />
											{:else}
												<CircleSlash size={12} />
											{/if}
											{filter.label}
										</span>
									{/each}
								</div>
							{:else}
								<p class="filter-empty">
									{t(
										'List này không có bộ lọc riêng về nền tảng hoặc FPS.',
										'This list has no platform- or FPS-specific filters.'
									)}
								</p>
							{/if}
						</div>

						<p class="acceptance-note">
							{t('Chế độ chấp nhận', 'Acceptance mode')}: {formatAcceptanceStatus(list.acceptanceStatus)}
						</p>

						<div class="review-list-chips">
							{#if list.item?.position != null}
								<span class="list-chip">#{list.item.position}</span>
							{/if}
							{#if list.item?.rating != null}
								<span class="list-chip">{list.item.rating}pt</span>
							{/if}
						</div>
					</a>
				{/each}
			</div>
		{:else}
			<p class="review-status">
				{t('Không tìm thấy list công khai nào chứa level này.', 'No public lists currently contain this level.')}
			</p>
		{/if}
	</section>
</div>

<style lang="scss">
	.review-layout {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.review-panel {
		padding: 14px 16px;
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		background: hsl(var(--muted) / 0.04);
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.review-header {
		h3 {
			font-size: 14px;
			font-weight: 600;
		}

		p {
			margin-top: 4px;
			font-size: 12px;
			line-height: 1.45;
			color: hsl(var(--muted-foreground));
		}
	}

	.review-summary-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;

		div {
			padding: 10px 12px;
			border-radius: 10px;
			background: hsl(var(--background));
			border: 1px solid hsl(var(--border));
		}

		dt {
			font-size: 11px;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.04em;
			color: hsl(var(--muted-foreground));
		}

		dd {
			margin-top: 6px;
			font-size: 13px;
			line-height: 1.45;
			word-break: break-word;
		}

		a {
			color: hsl(var(--primary));
			text-decoration: none;

			&:hover {
				text-decoration: underline;
			}
		}
	}

	.summary-span {
		grid-column: 1 / -1;
	}

	.review-status {
		font-size: 13px;
		line-height: 1.45;
		color: hsl(var(--muted-foreground));
	}

	.review-status.error {
		color: hsl(var(--destructive));
	}

	.review-list-grid {
		display: grid;
		gap: 10px;
	}

	.review-list-card {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 12px;
		border-radius: 12px;
		border: 1px solid hsl(var(--border));
		background: hsl(var(--background));
		text-decoration: none;
		color: inherit;
		transition:
			border-color 0.15s ease,
			transform 0.15s ease,
			background 0.15s ease;

		&:hover {
			border-color: hsl(var(--primary) / 0.4);
			background: hsl(var(--primary) / 0.04);
			transform: translateY(-1px);
		}
	}

	.review-list-top {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		align-items: flex-start;
	}

	.review-list-title-row {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;

		h4 {
			font-size: 14px;
			font-weight: 600;
			line-height: 1.3;
		}
	}

	.review-list-meta,
	.review-list-description,
	.acceptance-note,
	.filter-empty {
		font-size: 12px;
		line-height: 1.45;
		color: hsl(var(--muted-foreground));
	}

	.review-list-link-icon {
		display: inline-flex;
		color: hsl(var(--muted-foreground));
		flex-shrink: 0;
		margin-top: 2px;
	}

	.filter-block {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.filter-label {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: hsl(var(--muted-foreground));
	}

	.filter-chip-row,
	.review-list-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.filter-chip,
	.list-chip {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 4px 8px;
		border-radius: 999px;
		border: 1px solid hsl(var(--border));
		font-size: 11px;
		font-weight: 600;
		background: hsl(var(--muted) / 0.25);
		color: hsl(var(--foreground));
	}

	.filter-chip.matched,
	.list-chip.matched,
	.list-chip.official {
		border-color: hsl(var(--primary) / 0.35);
		background: hsl(var(--primary) / 0.1);
		color: hsl(var(--primary));
	}

	.filter-chip.unmatched,
	.list-chip.unmatched {
		border-color: hsl(var(--destructive) / 0.3);
		background: hsl(var(--destructive) / 0.08);
		color: hsl(var(--destructive));
	}

	@media (max-width: 640px) {
		.review-summary-grid {
			grid-template-columns: 1fr;
		}

		.summary-span {
			grid-column: auto;
		}
	}
</style>