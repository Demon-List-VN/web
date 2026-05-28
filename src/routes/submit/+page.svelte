<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { locale, _ } from 'svelte-i18n';
	import { ArrowLeft, ClipboardCheck, ListPlus } from 'lucide-svelte';

	function preserveSearch(path: string) {
		const search = $page.url.search;

		return search ? `${path}${search}` : path;
	}

	onMount(() => {
		const params = $page.url.searchParams;

		if (params.get('type') === 'record' || params.has('levelId')) {
			void goto(preserveSearch('/submit/record'), { replaceState: true });
		}
	});

	function chooseRecordFlow() {
		void goto('/submit/record');
	}

	function chooseChallengeListFlow() {
		void goto('/lists/cl/submit');
	}
</script>

<svelte:head>
  <title>{$_('submit.button')} | {$_('head.site_short_name')}</title>
</svelte:head>

<div class="submit-page">
  <div class="submit-container">
    <a href="/" class="back-link">
      <ArrowLeft size={16} />
      <span>{$locale == 'vi' ? 'Trang chủ' : 'Home'}</span>
    </a>

    <div class="submit-card">
      <div class="flow-select">
        <div class="flow-select-header">
          <p class="eyebrow">
            {$locale == 'vi' ? 'Nộp bài' : 'Submit'}
          </p>
          <h1>
            {
              $locale == 'vi'
              ? 'Bạn muốn nộp gì?'
              : 'What do you want to submit?'
            }
          </h1>
        </div>

        <div class="flow-options">
          <button
            type="button"
            class="flow-option"
            on:click={chooseRecordFlow}
          >
            <span class="option-icon">
              <ClipboardCheck size={22} />
            </span>
            <span class="option-copy">
              <span class="option-title">
                {$locale == 'vi' ? 'Nộp record' : 'Submit record'}
              </span>
              <span class="option-description">
                {
                  $locale == 'vi'
                  ? 'Gửi record hoàn thành hoặc progress cho một level.'
                  : 'Send a completion or progress record for a level.'
                }
              </span>
            </span>
          </button>

          <button
            type="button"
            class="flow-option"
            on:click={chooseChallengeListFlow}
          >
            <span class="option-icon">
              <ListPlus size={22} />
            </span>
            <span class="option-copy">
              <span class="option-title">
                {
                  $locale == 'vi'
                  ? 'Nộp level cho Challenge List'
                  : 'Submit challenge list level'
                }
              </span>
              <span class="option-description">
                {
                  $locale == 'vi'
                  ? 'Gửi level vào luồng duyệt của Challenge List.'
                  : 'Send a level to the Challenge List submission flow.'
                }
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
.submit-page {
  min-height: 60vh;
  padding: 24px 16px;
  display: flex;
  justify-content: center;
}

.submit-container {
  width: 100%;
  max-width: 672px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.back-link {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
  text-decoration: none;
  transition: color 0.15s ease;
  width: fit-content;

  &:hover {
    color: hsl(var(--foreground));
  }
}

.submit-card {
  border: 1px solid hsl(var(--border));
  border-radius: 16px;
  padding: 24px;
  background: hsl(var(--card, var(--background)));

  @media (max-width: 480px) {
    padding: 16px;
    border-radius: 12px;
  }
}

.flow-select {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.flow-select-header {
  display: flex;
  flex-direction: column;
  gap: 6px;

  .eyebrow {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0;
    color: hsl(var(--muted-foreground));
    text-transform: uppercase;
  }

  h1 {
    font-size: 24px;
    font-weight: 700;
    line-height: 1.2;
  }
}

.flow-options {
  display: grid;
  gap: 12px;
}

.flow-option {
  width: 100%;
  min-height: 92px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease;

  &:hover,
  &:focus-visible {
    border-color: hsl(var(--primary));
    background: hsl(var(--accent) / 0.45);
    box-shadow: 0 0 0 3px hsl(var(--primary) / 0.12);
    outline: none;
  }
}

.option-icon {
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.option-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.option-title {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.25;
}

.option-description {
  font-size: 13px;
  line-height: 1.45;
  color: hsl(var(--muted-foreground));
}

@media (max-width: 480px) {
  .flow-select-header h1 {
    font-size: 21px;
  }

  .flow-option {
    align-items: flex-start;
    min-height: 0;
  }
}
</style>
