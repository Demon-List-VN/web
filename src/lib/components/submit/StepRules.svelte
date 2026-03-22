<script lang="ts">
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { locale } from 'svelte-i18n';
	import { BookOpen } from 'lucide-svelte';

	export let submissionType: 'record' | 'level';
</script>

<div class="step-content">
	<div class="hero-section">
		<div class="icon-wrapper">
			<BookOpen size={32} />
		</div>
		<h2>
			{$locale == 'vi' ? 'Lưu ý trước khi nộp' : 'Before you submit'}
		</h2>
		<p class="subtitle">
			{$locale == 'vi'
				? 'Vui lòng đọc kỹ các quy định dưới đây'
				: 'Please read the following guidelines carefully'}
		</p>
	</div>

	<Alert.Root class="rules-alert">
		<Alert.Description>
			{#if submissionType === 'record'}
				{#if $locale == 'vi'}
					- Đọc <a href={`/wiki/${$locale}/rules`}><u>luật</u></a> trước khi nộp.<br />
					- Level phải là Insane Demon trở lên. Level chưa có trong danh sách cũng có thể nộp.<br />
					- Điểm đề xuất là điểm của DLVN, không phải sao hay thứ hạng của level.<br />
					- Video thô là video quay từ lúc bắt đầu đến kết thúc quá trình quay chưa bị chỉnh sửa.<br />
					- Sử dụng
					<a href="https://github.com/NamPE286/DemonListVN-geode-mod/releases">
						<u>Geometry Dash Việt Nam's geode mod</u>
					</a> trong khi chơi level để có cơ hội chấp nhận cao hơn.
				{:else}
					- Read the <a href={`/wiki/${$locale}/rules`}><u>rules</u></a> before submitting.<br />
					- Level must be Insane Demon or above. Levels not yet on the list can also be submitted.<br />
					- Suggested rating is Geometry Dash Viet Nam level's rating, not level's stars or placement.<br />
					- Raw is recording from the beginning to the end of the recording session without editing.<br />
					- Use
					<a href="https://github.com/NamPE286/DemonListVN-geode-mod/releases">
						<u>Geometry Dash Viet Nam's geode mod</u>
					</a> while beating level to have higher chance of acceptance.
				{/if}
			{:else}
				{#if $locale == 'vi'}
					- Nộp challenge level mới để thêm vào Challenge List.<br />
					- Level phải là Extreme hoặc Insane Demon challenge.<br />
					- Level sẽ được kiểm duyệt trước khi thêm vào danh sách.
				{:else}
					- Submit a new challenge level to be added to the Challenge List.<br />
					- Level must be an Extreme or Insane Demon challenge.<br />
					- Level will be reviewed before being added to the list.
				{/if}
			{/if}
		</Alert.Description>
	</Alert.Root>
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

	.rules-alert :global(a) {
		text-decoration: underline;
	}
</style>
