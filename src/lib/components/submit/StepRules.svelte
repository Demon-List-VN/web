<script lang="ts">
	import { locale } from 'svelte-i18n';
	import {
		BookOpen,
		ScrollText,
		Gauge,
		Star,
		Film,
		Gamepad2,
		Trophy,
		Shield,
		Search
	} from 'lucide-svelte';

	export let submissionType: 'record' | 'level';

	function t(vi: string, en: string) {
		return $locale == 'vi' ? vi : en;
	}
</script>

<div class="step-content">
	<div class="hero-section">
		<div class="icon-wrapper">
			<BookOpen size={32} />
		</div>
		<h2>
			{t('Lưu ý trước khi nộp', 'Before you submit')}
		</h2>
		<p class="subtitle">
			{t('Vui lòng đọc kỹ các quy định dưới đây', 'Please read the following guidelines carefully')}
		</p>
	</div>

	{#if submissionType === 'record'}
		<div class="rules-grid">
			<a href={`/wiki/${$locale}/rules`} class="rule-card accent">
				<div class="rule-icon">
					<ScrollText size={20} />
				</div>
				<div class="rule-text">
					<h3>{t('Đọc luật', 'Read the rules')}</h3>
					<p>{t('Đọc kỹ luật trước khi nộp record', 'Read the rules carefully before submitting a record')}</p>
				</div>
				<span class="rule-link">{t('Xem luật →', 'View rules →')}</span>
			</a>

			<div class="rule-card">
				<div class="rule-icon">
					<Gauge size={20} />
				</div>
				<div class="rule-text">
					<h3>{t('Insane Demon trở lên', 'Insane Demon or above')}</h3>
					<p>{t('Level phải là Insane Demon trở lên. Level chưa có trong danh sách cũng có thể nộp.', 'Level must be Insane Demon or above. Levels not yet on the list can also be submitted.')}</p>
				</div>
			</div>

			<div class="rule-card">
				<div class="rule-icon">
					<Star size={20} />
				</div>
				<div class="rule-text">
					<h3>{t('Điểm đề xuất', 'Suggested rating')}</h3>
					<p>{t('Điểm đề xuất là điểm của DLVN, không phải sao hay thứ hạng của level.', 'Suggested rating is DLVN\'s rating, not level\'s stars or placement.')}</p>
				</div>
			</div>

			<div class="rule-card">
				<div class="rule-icon">
					<Trophy size={20} />
				</div>
				<div class="rule-text">
					<h3>{t('Record tốt hơn', 'Better record')}</h3>
					<p>{t(
						'Nếu bạn đã có record đã được duyệt ở level này, bạn chỉ có thể gửi record tốt hơn. Thứ tự ưu tiên: (1) progress cao hơn, (2) refresh rate thấp hơn, (3) mobile được coi là tốt hơn PC. Record auto-accepted chưa xác minh sẽ không chặn việc gửi record mới; cả hai bản sẽ được giữ cho tới khi moderator đưa ra quyết định. Nếu record mới được duyệt, bản auto-accepted cũ sẽ bị xóa.',
						'If you already have a verified record on this level, you can only submit a better one. Priority: (1) higher progress, (2) lower refresh rate, (3) mobile is considered better than PC. Unverified auto-accepted records do not block a new submission; both versions are kept until a moderator decides. If the new submission is accepted, the old auto-accepted version is removed.'
					)}</p>
				</div>
			</div>

			<div class="rule-card">
				<div class="rule-icon">
					<Film size={20} />
				</div>
				<div class="rule-text">
					<h3>{t('Video thô (Raw)', 'Raw footage')}</h3>
					<p>{t('Video quay từ lúc bắt đầu đến kết thúc quá trình quay chưa bị chỉnh sửa.', 'Recording from the beginning to the end of the session without editing.')}</p>
				</div>
			</div>

			<a
				href="https://github.com/NamPE286/DemonListVN-geode-mod/releases"
				target="_blank"
				rel="noopener"
				class="rule-card highlight"
			>
				<div class="rule-icon">
					<Gamepad2 size={20} />
				</div>
				<div class="rule-text">
					<h3>{t('Geode Mod', 'Geode Mod')}</h3>
					<p>{t('Sử dụng Geometry Dash Việt Nam\'s geode mod trong khi chơi level để có cơ hội chấp nhận cao hơn.', 'Use Geometry Dash Viet Nam\'s geode mod while playing to have higher chance of acceptance.')}</p>
				</div>
				<span class="rule-link">{t('Tải mod →', 'Download →')}</span>
			</a>
		</div>
	{:else}
		<div class="rules-grid">
			<div class="rule-card">
				<div class="rule-icon">
					<Trophy size={20} />
				</div>
				<div class="rule-text">
					<h3>{t('Challenge List', 'Challenge List')}</h3>
					<p>{t('Nộp challenge level mới để thêm vào Challenge List.', 'Submit a new challenge level to be added to the Challenge List.')}</p>
				</div>
			</div>

			<div class="rule-card">
				<div class="rule-icon">
					<Gauge size={20} />
				</div>
				<div class="rule-text">
					<h3>{t('Extreme / Insane Demon', 'Extreme / Insane Demon')}</h3>
					<p>{t('Level phải là Extreme hoặc Insane Demon challenge.', 'Level must be an Extreme or Insane Demon challenge.')}</p>
				</div>
			</div>

			<div class="rule-card">
				<div class="rule-icon">
					<Search size={20} />
				</div>
				<div class="rule-text">
					<h3>{t('Kiểm duyệt', 'Review process')}</h3>
					<p>{t('Level sẽ được kiểm duyệt trước khi thêm vào danh sách.', 'Level will be reviewed before being added to the list.')}</p>
				</div>
			</div>
		</div>
	{/if}
</div>

<style lang="scss">
	.step-content {
		display: flex;
		flex-direction: column;
		gap: 24px;
		padding: 8px 0;
	}

	.hero-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 8px;
	}

	.icon-wrapper {
		width: 56px;
		height: 56px;
		border-radius: 14px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: hsl(var(--primary) / 0.08);
		color: hsl(var(--primary));
		margin-bottom: 4px;
	}

	h2 {
		font-size: 18px;
		font-weight: 600;
		color: hsl(var(--foreground));
	}

	.subtitle {
		font-size: 13px;
		color: hsl(var(--muted-foreground));
		line-height: 1.5;
	}

	.rules-grid {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.rule-card {
		display: flex;
		align-items: flex-start;
		gap: 14px;
		padding: 14px 16px;
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		background: hsl(var(--card, var(--background)));
		transition: all 0.15s ease;
		text-decoration: none;
		color: inherit;

		&:hover {
			background: hsl(var(--muted) / 0.3);
		}

		&.accent {
			border-color: hsl(var(--primary) / 0.3);
			background: hsl(var(--primary) / 0.04);

			.rule-icon {
				background: hsl(var(--primary) / 0.12);
				color: hsl(var(--primary));
			}

			&:hover {
				background: hsl(var(--primary) / 0.08);
			}
		}

		&.highlight {
			border-color: hsl(142 71% 45% / 0.3);
			background: hsl(142 71% 45% / 0.04);

			.rule-icon {
				background: hsl(142 71% 45% / 0.12);
				color: hsl(142 71% 45%);
			}

			&:hover {
				background: hsl(142 71% 45% / 0.08);
			}
		}
	}

	.rule-icon {
		width: 40px;
		height: 40px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: hsl(var(--muted) / 0.5);
		color: hsl(var(--muted-foreground));
		flex-shrink: 0;
	}

	.rule-text {
		flex: 1;
		min-width: 0;

		h3 {
			font-size: 13px;
			font-weight: 600;
			color: hsl(var(--foreground));
			margin-bottom: 2px;
		}

		p {
			font-size: 12px;
			color: hsl(var(--muted-foreground));
			line-height: 1.5;
		}
	}

	.rule-link {
		font-size: 12px;
		font-weight: 500;
		color: hsl(var(--primary));
		white-space: nowrap;
		align-self: center;
	}

	.highlight .rule-link {
		color: hsl(142 71% 45%);
	}
</style>
