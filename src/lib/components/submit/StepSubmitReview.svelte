<script lang="ts">
	import { locale } from 'svelte-i18n';

	type SubmitMobileOption = { value: boolean; label: string; } | null;
	type SubmitTime = { m: number | null; s: number | null; ms: number | null; };
	type ReviewListEntry = {
		id: number;
		title: string;
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
	export let target: number | null = null;
	export let lists: ReviewListEntry[] = [];

	function t(vi: string, en: string) {
		return $locale == 'vi' ? vi : en;
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
		return String(value ?? 0)
			.padStart(length, '0');
	}

	function formatCompletionValue() {
		if (apiLevel?.length == 5) {
			if (time.m == null || time.s == null || time.ms == null) {
				return t('Chưa có', 'Not provided');
			}

			return `${time.m}:${formatTimeValue(time.s, 2)}.${
				formatTimeValue(time.ms, 3)
			}`;
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

	$: selectedTargetList = lists.find((list) => list.id === target) ?? null;
</script>

<section class="review-panel">
  <div class="review-header">
    <h3>{t('Xem lại thông tin submit', 'Review submission details')}</h3>
    <p>
      {
        t(
            'Kiểm tra lại thông tin và phạm vi record trước khi gửi.',
            'Review the submission details and record scope before sending.'
        )
      }
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
      <dt>
        {apiLevel?.length == 5 ? t('Thời gian', 'Time') : t('Tiến trình', 'Progress')}
      </dt>
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
      <dt>{t('Phạm vi record', 'Record scope')}</dt>
      <dd>
        {selectedTargetList
          ? selectedTargetList.title
          : t('Global — áp dụng cho mọi list', 'Global — valid for every list')}
      </dd>
    </div>
    <div class="summary-span">
      <dt>{t('Video hoàn thành', 'Completion video')}</dt>
      <dd>
        {#if videoLink}
          <a href={videoLink} target="_blank" rel="noreferrer">{
            formatVideoLabel(videoLink)
          }</a>
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

<style lang="scss">
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

@media (max-width: 640px) {
  .review-summary-grid {
    grid-template-columns: 1fr;
  }

  .summary-span {
    grid-column: auto;
  }
}
</style>
