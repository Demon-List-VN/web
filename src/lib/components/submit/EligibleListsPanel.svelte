<script lang="ts">
	import { locale } from 'svelte-i18n';
	import { ExternalLink } from 'lucide-svelte';

	export let lists: any[] = [];
	export let loading = false;
	export let errorMessage = '';
	export let mode: 'preview' | 'eligible' = 'preview';

	function t(vi: string, en: string) {
		return $locale == 'vi' ? vi : en;
	}

	function getListHref(list: any) {
		return `/lists/${list.slug || list.id}`;
	}

	function getOwnerName(list: any) {
		return list.ownerData?.name || null;
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
				'Dưới đây là các list mà record hiện tại đủ điều kiện',
				'These are the lists your current record qualifies for'
			)
			: t(
				'Các list công khai đang chứa level này.',
				'These public lists currently contain this level.'
			);
	$: loadingMessage =
		mode === 'eligible'
			? t('Đang kiểm tra list phù hợp...', 'Checking eligible lists...')
			: t('Đang tải các list chứa level này...', 'Loading lists containing this level...');
	$: emptyMessage =
		mode === 'eligible'
			? t(
				'Chưa có list nào phù hợp với record hiện tại.',
				'No lists match the current record yet.'
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
</style>