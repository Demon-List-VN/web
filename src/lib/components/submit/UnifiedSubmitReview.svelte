<script lang="ts">
	import { locale } from 'svelte-i18n';
	import { ExternalLink, Globe2 } from 'lucide-svelte';

	export let submissionType: 'record' | 'level' | 'ldm';
	export let targetLists: Array<{ id: number; title: string; }> = [];
	export let recordScope: 'global' | 'lists' = 'global';
	export let details: any;

	function t(vi: string, en: string) {
		return $locale == 'vi' ? vi : en;
	}

	function formatTime(time: any) {
		return `${time?.m ?? 0}:${String(time?.s ?? 0)
			.padStart(2, '0')}.${String(time?.ms ?? 0)
			.padStart(3, '0')}`;
	}

	function typeLabel() {
		if (submissionType === 'ldm') {
			return 'LDM';
		}

		if (submissionType === 'level') {
			return t('Level', 'Level');
		}

		return t('Record', 'Record');
	}
</script>

<div class="review-step">
  <header>
    <p>{t('Sẵn sàng gửi', 'Ready to submit')}</p>
    <h2>{t('Xem lại bài nộp', 'Review your submission')}</h2>
  </header>

  <section>
    <h3>{t('Loại', 'Type')}</h3>
    <div class="value strong">{typeLabel()}</div>
  </section>

  {#if submissionType !== 'ldm'}
    <section>
      <h3>{t('Nơi nhận', 'Targets')}</h3>
      {#if submissionType === 'record' && recordScope === 'global'}
        <div class="target"><Globe2 size={16} /><span><strong>Global</strong><small>{t('Hợp lệ trên mọi list', 'Valid across every list')}</small></span></div>
      {:else}
        <div class="targets">
          {#each targetLists as list}
            <div class="target"><span><strong>{list.title}</strong><small>#{list.id}</small></span></div>
          {/each}
        </div>
      {/if}
    </section>
  {/if}

  <section>
    <h3>{t('Chi tiết', 'Details')}</h3>
    <dl>
      {#if submissionType === 'ldm'}
        <div><dt>{t('Level gốc', 'Original level')}</dt><dd>{details.mainLevel?.name || `#${details.mainLevelId}`}</dd></div>
        <div><dt>{t('Bản LDM', 'LDM level')}</dt><dd>{details.variantLevel?.name || `#${details.variantLevelId}`}</dd></div>
      {:else}
        <div><dt>Level</dt><dd>{details.apiLevel?.name || `#${details.selectedVariantId ?? details.levelid}`}</dd></div>
        <div><dt>Level ID</dt><dd>{details.selectedVariantId ?? details.levelid}</dd></div>
      {/if}

      {#if submissionType === 'record'}
        <div><dt>{details.apiLevel?.length == 5 ? t('Thời gian', 'Time') : t('Tiến độ', 'Progress')}</dt><dd>{details.apiLevel?.length == 5 ? formatTime(details.time) : `${details.progress}%`}</dd></div>
        <div><dt>{t('Nền tảng', 'Platform')}</dt><dd>{details.mobile?.label || '—'}</dd></div>
        <div><dt>FPS</dt><dd>{details.refreshRate}</dd></div>
        <div class="wide"><dt>{t('Video hoàn thành', 'Completion video')}</dt><dd><a href={details.videoLink} target="_blank" rel="noreferrer">{details.videoLink}<ExternalLink size={12} /></a></dd></div>
        {#if details.raw}<div class="wide"><dt>{t('Video thô', 'Raw video')}</dt><dd><a href={details.raw} target="_blank" rel="noreferrer">{details.raw}<ExternalLink size={12} /></a></dd></div>{/if}
        {#if Number.isFinite(details.suggestedRating)}<div><dt>{t('Điểm đề xuất', 'Suggested rating')}</dt><dd>{details.suggestedRating}</dd></div>{/if}
      {:else if submissionType === 'level'}
        <div class="wide"><dt>Video</dt><dd><a href={details.videoLink} target="_blank" rel="noreferrer">{details.videoLink}<ExternalLink size={12} /></a></dd></div>
      {/if}

      {#if details.comment}<div class="wide"><dt>{t('Ghi chú', 'Comment')}</dt><dd>{details.comment}</dd></div>{/if}
    </dl>
  </section>
</div>

<style lang="scss">
.review-step { display: grid; gap: 14px; }
header { text-align: center; margin-bottom: 4px; } header p { color: hsl(var(--primary)); font-size: 11px; font-weight: 700; text-transform: uppercase; } header h2 { margin-top: 4px; font-size: 20px; font-weight: 700; }
section { display: grid; gap: 9px; padding: 14px; border: 1px solid hsl(var(--border)); border-radius: 12px; background: hsl(var(--muted) / 0.04); }
section h3, dt { color: hsl(var(--muted-foreground)); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
.value { font-size: 14px; } .strong { font-weight: 700; }
.targets { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.target { display: flex; align-items: center; gap: 9px; min-width: 0; padding: 10px; border-radius: 9px; background: hsl(var(--background)); border: 1px solid hsl(var(--border)); }
.target span { display: grid; min-width: 0; } .target strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; } .target small { color: hsl(var(--muted-foreground)); font-size: 11px; }
dl { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; } dl > div { min-width: 0; padding: 10px; border-radius: 9px; background: hsl(var(--background)); border: 1px solid hsl(var(--border)); } dl .wide { grid-column: 1 / -1; }
dd { margin-top: 5px; font-size: 13px; overflow-wrap: anywhere; } dd a { display: inline-flex; align-items: center; gap: 5px; color: hsl(var(--primary)); }
@media (max-width: 560px) { .targets, dl { grid-template-columns: 1fr; } dl .wide { grid-column: auto; } }
</style>
