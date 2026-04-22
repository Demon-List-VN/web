<script lang="ts">
	import { locale } from 'svelte-i18n';
	import { BadgeCheck, ExternalLink, ListChecks } from 'lucide-svelte';

	export let lists: any[] = [];
	export let loading = false;
	export let errorMessage = '';
	export let mode: 'preview' | 'eligible' = 'preview';

	function t(vi: string, en: string) {
		return $locale == 'vi' ? vi : en;
	}

	function formatTime(ms: number | null | undefined) {
		if (ms == null || !Number.isFinite(ms)) {
			return '--';
		}

		const minutes = Math.floor(ms / 60000);
		const seconds = Math.floor((ms % 60000) / 1000);
		const milliseconds = ms % 1000;

		return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds
			.toString()
			.padStart(3, '0')}`;
	}

	function getListHref(list: any) {
		return `/lists/${list.slug || list.id}`;
	}

	function getOwnerName(list: any) {
		return list.ownerData?.name || null;
	}

	function getRequirementLabel(list: any) {
		const minProgress = list.item?.minProgress;

		if (minProgress == null) {
			return t('Không có mốc tối thiểu', 'No minimum threshold');
		}

		if (list.isPlatformer) {
			return t(
				`Mốc thời gian: ${formatTime(minProgress)}`,
				`Base time: ${formatTime(minProgress)}`
			);
		}

		return t(`Tối thiểu ${minProgress}%`, `Minimum ${minProgress}%`);
	}

	function getListTypeLabel(list: any) {
		return list.isPlatformer ? 'Platformer' : 'Classic';
	}

	$: visibleLists = mode === 'eligible' ? lists.filter((list) => Boolean(list.eligible)) : lists;
	$: panelTitle =
		mode === 'eligible'
			? t('Danh sách đủ điều kiện', 'Eligible lists')
			: t('Các list có level này', 'Lists containing this level');
	$: panelDescription =
		mode === 'eligible'
			? t(
				'Dưới đây là các list mà record hiện tại đạt mốc tối thiểu',
				'These are the lists whose minimum threshold is met by the current record'
			)
			: t(
				'Các list công khai đang chứa level này. Mỗi card hiển thị mốc tối thiểu để bạn biết record cần đạt gì',
				'These public lists currently contain this level. Each card shows the minimum threshold so you can see what the record needs'
			);
	$: loadingMessage =
		mode === 'eligible'
			? t('Đang kiểm tra list phù hợp...', 'Checking eligible lists...')
			: t('Đang tải các list chứa level này...', 'Loading lists containing this level...');
	$: emptyMessage =
		mode === 'eligible'
			? t(
				'Chưa có list nào phù hợp với progress hoặc thời gian hiện tại.',
				'No lists match the current progress or time yet.'
			)
			: t('Level này chưa nằm trong list công khai nào.', 'This level is not in any public list yet.');
</script>

<div class="eligible-lists-panel">
	<div class="eligible-lists-header">
		<h3>{panelTitle}</h3>
		<p>{panelDescription}</p>
	</div>

	{#if loading}
		<p class="eligible-lists-status">{loadingMessage}</p>
	{:else if errorMessage}
		<p class="eligible-lists-status error">{errorMessage}</p>
	{:else if visibleLists.length > 0}
		<div class="eligible-list-grid">
			{#each visibleLists as list}
				<a class="eligible-list-card" href={getListHref(list)} target="_blank" rel="noreferrer">
					<div class="eligible-list-top">
						<div>
							<div class="eligible-list-title-row">
								<h4>{list.title}</h4>
								{#if list.isOfficial}
									<span class="list-chip official">{t('Chính thức', 'Official')}</span>
								{/if}
							</div>
							<p class="eligible-list-meta">
								{getListTypeLabel(list)}
								{#if getOwnerName(list)}
									<span>{t(' · tạo bởi ', ' · by ')}{getOwnerName(list)}</span>
								{/if}
							</p>
						</div>
						<span class="eligible-list-link-icon"><ExternalLink size={14} /></span>
					</div>

					{#if list.description}
						<p class="eligible-list-description">{list.description}</p>
					{/if}

					<div class="eligible-list-chips">
						{#if list.item?.position != null}
							<span class="list-chip">#{list.item.position}</span>
						{/if}
						{#if list.item?.rating != null}
							<span class="list-chip">{list.item.rating}pt</span>
						{/if}
						<span class="list-chip requirement">{getRequirementLabel(list)}</span>
					</div>
				</a>
			{/each}
		</div>
	{:else}
		<p class="eligible-lists-status">{emptyMessage}</p>
	{/if}
</div>

<style lang="scss">
	.eligible-lists-panel {
		margin-top: 12px;
		padding: 14px 16px;
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		background: hsl(var(--muted) / 0.04);
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.eligible-lists-header {
		h3 {
			font-size: 14px;
			font-weight: 600;
		}

		p {
			margin-top: 4px;
			font-size: 12px;
			line-height: 1.4;
			color: hsl(var(--muted-foreground));
		}
	}

	.eligible-lists-status {
		font-size: 13px;
		line-height: 1.4;
		color: hsl(var(--muted-foreground));
	}

	.eligible-lists-status.error {
		color: hsl(var(--destructive));
	}

	.eligible-list-grid {
		display: grid;
		gap: 10px;
	}

	.eligible-list-card {
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

	.eligible-list-top {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		align-items: flex-start;
	}

	.eligible-list-title-row {
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

	.eligible-list-meta {
		margin-top: 2px;
		font-size: 12px;
		color: hsl(var(--muted-foreground));
		line-height: 1.4;
	}

	.eligible-list-link-icon {
		display: inline-flex;
		color: hsl(var(--muted-foreground));
		flex-shrink: 0;
		margin-top: 2px;
	}

	.eligible-list-description {
		font-size: 12px;
		line-height: 1.45;
		color: hsl(var(--muted-foreground));
		display: -webkit-box;
		line-clamp: 2;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.eligible-list-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.eligible-list-footer {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: hsl(var(--primary));
		font-weight: 500;
	}

	.list-chip {
		display: inline-flex;
		align-items: center;
		padding: 4px 8px;
		border-radius: 999px;
		border: 1px solid hsl(var(--border));
		font-size: 11px;
		font-weight: 600;
		background: hsl(var(--muted) / 0.25);
		color: hsl(var(--foreground));
	}

	.list-chip.official {
		border-color: hsl(var(--primary) / 0.35);
		background: hsl(var(--primary) / 0.1);
		color: hsl(var(--primary));
	}

	.list-chip.requirement {
		background: hsl(var(--accent) / 0.08);
	}
</style>