<script lang="ts">
	import { locale } from 'svelte-i18n';
	import { FileText, Gauge, Layers } from 'lucide-svelte';

	type SubmissionType = 'record' | 'level' | 'ldm';

	export let submissionType: SubmissionType | null = null;
	export let onSelect: (type: SubmissionType) => void;

	const options: Array<{
		type: SubmissionType;
		icon: typeof FileText;
		title: { vi: string; en: string; };
		description: { vi: string; en: string; };
	}> = [
		{
			type: 'level',
			icon: Layers,
			title: { vi: 'Nộp Level', en: 'Submit Level' },
			description: {
				vi: 'Đề xuất một level cho một hoặc nhiều danh sách đang nhận bài.',
				en: 'Suggest a level to one or more lists accepting submissions.'
			}
		},
		{
			type: 'record',
			icon: FileText,
			title: { vi: 'Nộp Record', en: 'Submit Record' },
			description: {
				vi: 'Gửi record global hoặc đến nhiều custom list.',
				en: 'Send a global record or target multiple custom lists.'
			}
		},
		{
			type: 'ldm',
			icon: Gauge,
			title: { vi: 'Nộp bản LDM', en: 'Submit LDM' },
			description: {
				vi: 'Liên kết một bản Low Detail Mode với level gốc.',
				en: 'Link a Low Detail Mode copy to its original level.'
			}
		}
	];
</script>

<div class="step-content">
  <div class="step-header">
    <p>{$locale == 'vi' ? 'Bước đầu tiên' : 'First step'}</p>
    <h2>{$locale == 'vi' ? 'Bạn muốn nộp gì?' : 'What would you like to submit?'}</h2>
  </div>

  <div class="type-cards">
    {#each options as option}
      <button
        type="button"
        class="type-card"
        class:selected={submissionType === option.type}
        on:click={() => onSelect(option.type)}
      >
        <span class="type-card-icon"><svelte:component this={option.icon} size={24} /></span>
        <span class="type-card-text">
          <strong>{option.title[$locale == 'vi' ? 'vi' : 'en']}</strong>
          <span>{option.description[$locale == 'vi' ? 'vi' : 'en']}</span>
        </span>
      </button>
    {/each}
  </div>
</div>

<style lang="scss">
.step-content { display: grid; gap: 20px; }
.step-header { text-align: center; }
.step-header p { color: hsl(var(--primary)); font-size: 12px; font-weight: 700; text-transform: uppercase; }
.step-header h2 { margin-top: 4px; font-size: 20px; font-weight: 700; }
.type-cards { display: grid; gap: 10px; }
.type-card { display: flex; align-items: center; gap: 14px; width: 100%; padding: 16px; border: 1px solid hsl(var(--border)); border-radius: 12px; background: hsl(var(--background)); color: hsl(var(--foreground)); text-align: left; cursor: pointer; transition: 0.15s ease; }
.type-card:hover, .type-card:focus-visible { border-color: hsl(var(--primary)); background: hsl(var(--accent) / 0.4); outline: none; }
.type-card.selected { border-color: hsl(var(--primary)); box-shadow: 0 0 0 3px hsl(var(--primary) / 0.12); }
.type-card-icon { display: grid; place-items: center; width: 44px; height: 44px; flex: 0 0 auto; border-radius: 10px; background: hsl(var(--primary) / 0.1); color: hsl(var(--primary)); }
.type-card-text { display: grid; gap: 4px; }
.type-card-text strong { font-size: 14px; }
.type-card-text span { color: hsl(var(--muted-foreground)); font-size: 12px; line-height: 1.45; }
</style>
