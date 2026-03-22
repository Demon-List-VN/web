<script lang="ts">
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { locale, _ } from 'svelte-i18n';
	import { FileText, Trophy } from 'lucide-svelte';

	export let submissionType: 'record' | 'level';
	export let onSelect: (type: 'record' | 'level') => void;
</script>

<div class="step-content">
	<h2 class="step-heading">
		{$locale == 'vi' ? 'Bạn muốn nộp gì?' : 'What would you like to submit?'}
	</h2>

	<div class="type-cards">
		<button
			class="type-card"
			class:selected={submissionType === 'record'}
			on:click={() => onSelect('record')}
		>
			<div class="type-card-icon">
				<FileText size={28} />
			</div>
			<div class="type-card-text">
				<h3>{$locale == 'vi' ? 'Nộp Record' : 'Submit Record'}</h3>
				<p>
					{$locale == 'vi'
						? 'Nộp kết quả chơi level Insane Demon trở lên'
						: 'Submit your completion of an Insane Demon or above level'}
				</p>
			</div>
		</button>

		<button
			class="type-card"
			class:selected={submissionType === 'level'}
			on:click={() => onSelect('level')}
		>
			<div class="type-card-icon">
				<Trophy size={28} />
			</div>
			<div class="type-card-text">
				<h3>{$locale == 'vi' ? 'Nộp Challenge Level' : 'Submit Challenge Level'}</h3>
				<p>
					{$locale == 'vi'
						? 'Đề xuất thêm challenge level mới vào danh sách'
						: 'Suggest a new challenge level to be added to the list'}
				</p>
			</div>
		</button>
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
		gap: 20px;
	}

	.step-heading {
		font-size: 16px;
		font-weight: 600;
		color: hsl(var(--foreground));
		text-align: center;
	}

	.type-cards {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;

		@media (max-width: 540px) {
			grid-template-columns: 1fr;
		}
	}

	.type-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		padding: 24px 16px;
		border: 2px solid hsl(var(--border));
		border-radius: 12px;
		background: transparent;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: center;

		&:hover {
			background: hsl(var(--muted) / 0.3);
			transform: translateY(-2px);
			box-shadow: 0 4px 12px hsl(var(--foreground) / 0.06);
		}

		&.selected {
			border-color: hsl(var(--primary));
			background: hsl(var(--primary) / 0.06);

			.type-card-icon {
				color: hsl(var(--primary));
			}
		}
	}

	.type-card-icon {
		color: hsl(var(--muted-foreground));
		transition: color 0.2s ease;
	}

	.type-card-text {
		h3 {
			font-size: 14px;
			font-weight: 600;
			color: hsl(var(--foreground));
			margin-bottom: 4px;
		}

		p {
			font-size: 12px;
			color: hsl(var(--muted-foreground));
			line-height: 1.4;
		}
	}

	.rules-alert :global(a) {
		text-decoration: underline;
	}
</style>
