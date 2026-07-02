<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { user } from '$lib/client';
	import { locale, _ } from 'svelte-i18n';
	import { toast } from 'svelte-sonner';
	import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-svelte';

	let mainLevelId = '';
	let variantLevelId = '';
	let comment = '';
	let mainLevel: any = null;
	let variantLevel: any = null;
	let loadingMain = false;
	let loadingVariant = false;
	let submitting = false;
	let submitted = false;

	function t(vi: string, en: string) {
		return $locale == 'vi' ? vi : en;
	}

	function parseLevelId(value: string) {
		const id = Number(value);

		if (!Number.isInteger(id) || id <= 0) {
			return null;
		}

		return id;
	}

	function getLevelName(level: any, fallback: string) {
		return level?.name || fallback;
	}

	function getCreatorName(level: any) {
		return level?.author || level?.creator || 'Unknown';
	}

	async function loadLevelPreview(kind: 'main' | 'variant') {
		const value = kind === 'main' ? mainLevelId : variantLevelId;
		const id = parseLevelId(value);

		if (!id) {
			if (kind === 'main') {
				mainLevel = null;
			} else {
				variantLevel = null;
			}

			return;
		}

		if (kind === 'main') {
			loadingMain = true;
		} else {
			loadingVariant = true;
		}

		try {
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/levels/${id}?fromGD=1`
			);

			if (!res.ok) {
				throw new Error('Failed to load level');
			}

			const level = await res.json();

			if (kind === 'main') {
				mainLevel = level;
			} else {
				variantLevel = level;
			}
		} catch {
			if (kind === 'main') {
				mainLevel = null;
			} else {
				variantLevel = null;
			}

			toast.error(t('Không tải được level này', 'Unable to load this level'));
		} finally {
			if (kind === 'main') {
				loadingMain = false;
			} else {
				loadingVariant = false;
			}
		}
	}

	async function submitLdmVariant() {
		const parsedMainLevelId = parseLevelId(mainLevelId);
		const parsedVariantLevelId = parseLevelId(variantLevelId);

		if (!parsedMainLevelId || !parsedVariantLevelId) {
			toast.error(
				t(
					'Vui lòng nhập ID level gốc và ID level LDM hợp lệ',
					'Please enter valid main and LDM level IDs'
				)
			);

			return;
		}

		if (parsedMainLevelId === parsedVariantLevelId) {
			toast.error(
				t('Level LDM phải khác level gốc', 'LDM variant must be a different level')
			);

			return;
		}

		submitting = true;

		try {
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/ldm-variant-submissions`,
				{
					method: 'POST',
					body: JSON.stringify({
						mainLevelId: parsedMainLevelId,
						variantLevelId: parsedVariantLevelId,
						comment
					}),
					headers: {
						Authorization: `Bearer ${await $user.token()}`,
						'Content-Type': 'application/json'
					}
				}
			);
			const payload = await res.json()
				.catch(() => null);

			if (!res.ok) {
				throw new Error(
					($locale == 'vi' ? payload?.vi : payload?.en)
					|| payload?.message
					|| t('Không thể gửi LDM', 'Failed to submit LDM variant')
				);
			}

			submitted = true;
			toast.success(t('Đã gửi LDM để duyệt', 'LDM variant submitted for review'));
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: t('Không thể gửi LDM', 'Failed to submit LDM variant')
			);
		} finally {
			submitting = false;
		}
	}

	function resetForm() {
		mainLevelId = '';
		variantLevelId = '';
		comment = '';
		mainLevel = null;
		variantLevel = null;
		submitted = false;
	}
</script>

<svelte:head>
  <title>{$_('submit.ldm_variant.title')} | {$_('head.site_short_name')}</title>
</svelte:head>

<div class="submit-page">
  {#if !$user.loggedIn}
    <div class="auth-prompt">
      <h2>{$_('submit.ldm_variant.signed_out_title')}</h2>
      <p>{$_('submit.ldm_variant.signed_out_description')}</p>
    </div>
  {:else}
    <div class="submit-container">
      <a href="/submit" class="back-link">
        <ArrowLeft size={16} />
        <span>{$locale == 'vi' ? 'Chọn loại nộp' : 'Choose submission type'}</span>
      </a>

      <div class="submit-card">
        {#if submitted}
          <div class="success-state">
            <CheckCircle2 size={44} />
            <h1>{$_('submit.ldm_variant.success_title')}</h1>
            <p>{$_('submit.ldm_variant.success_description')}</p>
            <Button on:click={resetForm}>
              {$_('submit.ldm_variant.submit_another')}
            </Button>
          </div>
        {:else}
          <div class="form-header">
            <p class="eyebrow">{$_('submit.flow.eyebrow')}</p>
            <h1>{$_('submit.ldm_variant.title')}</h1>
            <p>{$_('submit.ldm_variant.description')}</p>
          </div>

          <div class="fields">
            <div class="field">
              <Label for="main-level-id">
                {$_('submit.ldm_variant.main_level_id')}
              </Label>
              <div class="input-row">
                <Input
                  id="main-level-id"
                  type="number"
                  inputmode="numeric"
                  bind:value={mainLevelId}
                  on:blur={() => loadLevelPreview('main')}
                  placeholder="123456789"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={loadingMain}
                  on:click={() => loadLevelPreview('main')}
                >
                  {#if loadingMain}
                    <Loader2 size={16} class="spin" />
                  {:else}
                    {$_('submit.ldm_variant.preview')}
                  {/if}
                </Button>
              </div>
              {#if mainLevel}
                <div class="level-preview">
                  <a href={`/level/${parseLevelId(mainLevelId)}`}>
                    {getLevelName(mainLevel, mainLevelId)}
                  </a>
                  <span>{$_('head.labels.by')} {getCreatorName(mainLevel)}</span>
                </div>
              {/if}
            </div>

            <div class="field">
              <Label for="variant-level-id">
                {$_('submit.ldm_variant.variant_level_id')}
              </Label>
              <div class="input-row">
                <Input
                  id="variant-level-id"
                  type="number"
                  inputmode="numeric"
                  bind:value={variantLevelId}
                  on:blur={() => loadLevelPreview('variant')}
                  placeholder="123456789"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={loadingVariant}
                  on:click={() => loadLevelPreview('variant')}
                >
                  {#if loadingVariant}
                    <Loader2 size={16} class="spin" />
                  {:else}
                    {$_('submit.ldm_variant.preview')}
                  {/if}
                </Button>
              </div>
              {#if variantLevel}
                <div class="level-preview">
                  <a href={`/level/${parseLevelId(variantLevelId)}`}>
                    {getLevelName(variantLevel, variantLevelId)}
                  </a>
                  <span>{$_('head.labels.by')} {getCreatorName(variantLevel)}</span>
                </div>
              {/if}
            </div>

            <div class="field">
              <Label for="comment">
                {$_('submit.ldm_variant.comment')}
              </Label>
              <Textarea
                id="comment"
                bind:value={comment}
                rows={4}
                placeholder={$_('submit.ldm_variant.comment_placeholder')}
              />
            </div>
          </div>

          <div class="actions">
            <Button
              on:click={submitLdmVariant}
              disabled={submitting}
            >
              {#if submitting}
                <Loader2 size={16} class="spin" />
              {/if}
              {$_('submit.ldm_variant.submit')}
            </Button>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
.submit-page {
  min-height: 60vh;
  padding: 24px 16px;
  display: flex;
  justify-content: center;
}

.auth-prompt,
.success-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
  padding: 56px 20px;
}

.auth-prompt h2,
.success-state h1 {
  font-size: 22px;
  font-weight: 700;
}

.auth-prompt p,
.success-state p {
  max-width: 440px;
  font-size: 14px;
  color: hsl(var(--muted-foreground));
}

.success-state {
  color: hsl(var(--primary));

  p {
    color: hsl(var(--muted-foreground));
  }
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

.form-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 22px;

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

  p {
    font-size: 14px;
    color: hsl(var(--muted-foreground));
  }
}

.fields {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
}

.level-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--muted) / 0.18);
  font-size: 13px;

  a {
    color: hsl(var(--foreground));
    font-weight: 700;
    text-decoration: underline;
  }

  span {
    color: hsl(var(--muted-foreground));
  }
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid hsl(var(--border));
}

:global(.spin) {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
