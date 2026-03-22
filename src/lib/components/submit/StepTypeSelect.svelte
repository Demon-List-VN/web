<script lang="ts">
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
</style>
