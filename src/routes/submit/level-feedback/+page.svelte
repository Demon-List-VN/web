<script lang="ts">
	import { goto } from '$app/navigation';
	import { user } from '$lib/client';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import SubmitStepper from '$lib/components/submit/SubmitStepper.svelte';
	import StepLevelId from '$lib/components/submit/StepLevelId.svelte';
	import StepConfirmLevel from '$lib/components/submit/StepConfirmLevel.svelte';
	import { _ } from 'svelte-i18n';
	import { toast } from 'svelte-sonner';
	import { ArrowLeft, CheckCircle2, Loader2, MessageSquareText } from 'lucide-svelte';

	type RequestArea = {
		id: string;
		label: string;
		description: string;
		disabled?: boolean;
		tooltip?: string;
	};

	type Pricing = {
		categoryAmount: number;
		lengthAmount: number;
		grossAmount: number;
		discountAmount: number;
		paidAmount: number;
		platformCutAmount: number;
		reviewerPayoutAmount: number;
	};

	let step = 0;
	let levelid = NaN;
	let apiLevel: any = null;
	let level: any = null;
	let levelVariants: any[] = [];
	let selectedVariantId: number | null = null;
	let requestAreas: string[] = ['deco'];
	let lengthSeconds = '';
	let videoLink = '';
	let submitterNote = '';
	let pricing: Pricing | null = null;
	let levelLoading = false;
	let quoteLoading = false;
	let submitting = false;
	let submitted = false;

	$: steps = [
		$_('submit.level_feedback.step_level'),
		$_('submit.level_feedback.step_confirm'),
		$_('submit.level_feedback.step_request'),
		$_('submit.level_feedback.step_payment')
	];
	$: selectedLevelId = selectedVariantId ?? levelid;
	$: numericLengthSeconds = Number(lengthSeconds);
	$: hasValidLengthSeconds = Number.isInteger(numericLengthSeconds) && numericLengthSeconds >= 30;
	$: canSubmitFeedback = requestAreas.length > 0 && hasValidLengthSeconds;
	$: requestAreaOptions = [
		{
			id: 'gameplay',
			label: $_('submit.level_feedback.areas.gameplay.label'),
			description: $_('submit.level_feedback.areas.gameplay.description'),
			disabled: true,
			tooltip: 'Available soon'
		},
		{
			id: 'deco',
			label: $_('submit.level_feedback.areas.deco.label'),
			description: $_('submit.level_feedback.areas.deco.description')
		}
	] satisfies RequestArea[];

	function setArea(area: string, checked: boolean) {
		pricing = null;

		if (requestAreaOptions.find((option) => option.id === area)?.disabled) {
			requestAreas = requestAreas.filter((item) => item !== area);

			return;
		}

		if (!checked) {
			requestAreas = requestAreas.filter((item) => item !== area);

			return;
		}

		if (!requestAreas.includes(area)) {
			requestAreas = [...requestAreas, area];
		}
	}

	function formatVND(value: number) {
		return new Intl.NumberFormat('vi-VN', {
			style: 'currency',
			currency: 'VND',
			maximumFractionDigits: 0
		})
			.format(value || 0);
	}

	function feedbackPayload() {
		return {
			levelId: selectedLevelId,
			requestAreas,
			lengthSeconds: numericLengthSeconds,
			videoLink,
			submitterNote
		};
	}

	function getYouTubeVideoId(value: string) {
		return value.trim()
			.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([A-Za-z0-9_-]{11})/)?.[1] ?? null;
	}

	async function fetchStoredLevel(levelId: number) {
		const response = await fetch(`${import.meta.env.VITE_API_URL}/levels/${levelId}`);

		if (!response.ok) {
			return null;
		}

		return response.json();
	}

	async function fetchApiLevel(levelId: number) {
		const response = await fetch(`${import.meta.env.VITE_API_URL}/levels/${levelId}?fromGD=1`);

		if (!response.ok) {
			return null;
		}

		return response.json();
	}

	async function loadLevel() {
		levelLoading = true;
		apiLevel = null;
		level = null;
		levelVariants = [];
		selectedVariantId = null;

		try {
			const [storedLevel, gdLevel] = await Promise.all([
				fetchStoredLevel(levelid)
					.catch(() => null),
				fetchApiLevel(levelid)
					.catch(() => null)
			]);

			level = storedLevel;
			apiLevel = gdLevel || storedLevel;

			try {
				const variantsResponse = await fetch(
					`${import.meta.env.VITE_API_URL}/levels/${levelid}/variants`
				);

				if (variantsResponse.ok) {
					levelVariants = await variantsResponse.json();
				}
			} catch {
				levelVariants = [];
			}

			return Boolean(apiLevel);
		} finally {
			levelLoading = false;
		}
	}

	async function next() {
		if (step === 0) {
			if (!Number.isInteger(Number(levelid)) || Number(levelid) <= 0) {
				toast.error($_('submit.level_feedback.errors.invalid_level'));

				return;
			}

			const loaded = await loadLevel();

			if (!loaded) {
				toast.error($_('submit.level_feedback.errors.load_level_failed'));

				return;
			}

			step = 1;

			return;
		}

		if (step === 1) {
			step = 2;

			return;
		}

		if (step === 2) {
			if (!validateRequest()) {
				return;
			}

			await loadPricing();

			if (pricing) {
				step = 3;
			}

			return;
		}

		await submitFeedback();
	}

	function back() {
		if (step > 0) {
			step -= 1;
		}
	}

	async function loadPricing() {
		quoteLoading = true;
		pricing = null;

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/level-feedback-submissions/quote`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${await $user.token()}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(feedbackPayload())
				}
			);
			const payload = await response.json()
				.catch(() => null);

			if (!response.ok) {
				throw new Error(payload?.message || $_('submit.level_feedback.errors.quote_failed'));
			}

			pricing = payload?.pricing ?? null;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('submit.level_feedback.errors.quote_failed'));
		} finally {
			quoteLoading = false;
		}
	}

	function validateRequest() {
		if (!requestAreas.length) {
			toast.error($_('submit.level_feedback.errors.area_required'));

			return false;
		}

		if (
			!hasValidLengthSeconds
		) {
			toast.error($_('submit.level_feedback.errors.length_required'));

			return false;
		}

		if (videoLink.trim() && !getYouTubeVideoId(videoLink)) {
			toast.error($_('submit.level_feedback.errors.video_link_invalid'));

			return false;
		}

		return true;
	}

	async function submitFeedback() {
		if (submitting || !validateRequest()) {
			return;
		}

		submitting = true;

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/level-feedback-submissions/checkout`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${await $user.token()}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(feedbackPayload())
				}
			);
			const payload = await response.json()
				.catch(() => null);

			if (!response.ok) {
				throw new Error(payload?.message || $_('submit.level_feedback.errors.submit_failed'));
			}

			if (payload?.checkoutUrl) {
				window.location.href = payload.checkoutUrl;

				return;
			}

			submitted = true;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('submit.level_feedback.errors.submit_failed'));
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
  <title>{$_('submit.level_feedback.page_title')} | {$_('head.site_short_name')}</title>
</svelte:head>

<div class="feedback-page">
  <div class="feedback-container">
    <a href="/submit" class="back-link">
      <ArrowLeft size={16} />
      <span>{$_('submit.back')}</span>
    </a>

    <div class="feedback-card">
      {#if !$user.loggedIn}
        <div class="empty-state">
          <MessageSquareText size={28} />
          <h1>{$_('submit.level_feedback.signed_out_title')}</h1>
          <p>{$_('submit.level_feedback.signed_out_description')}</p>
        </div>
      {:else if submitted}
        <div class="success-state">
          <CheckCircle2 size={34} />
          <h1>{$_('submit.level_feedback.success_title')}</h1>
          <p>
            {$_('submit.level_feedback.success_description')}
          </p>
          <div class="success-actions">
            <Button on:click={() => goto(`/mySubmission/${$user.data.uid}`)}>
              {$_('submit.level_feedback.view_submissions')}
            </Button>
            <Button variant="outline" on:click={() => {
                step = 0;
                levelid = NaN;
                apiLevel = null;
                level = null;
                levelVariants = [];
                selectedVariantId = null;
                requestAreas = ['deco'];
                lengthSeconds = '';
                videoLink = '';
                submitterNote = '';
                pricing = null;
                submitted = false;
            }}>
              {$_('submit.level_feedback.submit_another')}
            </Button>
          </div>
        </div>
      {:else}
        <div class="feedback-header">
          <p class="eyebrow">{$_('submit.level_feedback.title')}</p>
          <h1>{$_('submit.level_feedback.headline')}</h1>
        </div>

        <SubmitStepper {steps} currentStep={step} />

        {#if step === 0}
          <StepLevelId
            bind:levelId={levelid}
            submissionType="level"
            targetLabel={$_('submit.level_feedback.target_label')}
          />
        {:else if step === 1}
          {#if levelLoading}
            <div class="loading-state">
              <Loader2 class="spin" size={24} />
              <span>{$_('submit.level_feedback.loading_level')}</span>
            </div>
          {:else}
            <StepConfirmLevel
              {apiLevel}
              {level}
              {levelVariants}
              bind:selectedVariantId
              targetLabel={$_('submit.level_feedback.target_label')}
            />
          {/if}
        {:else if step === 2}
          <div class="request-step">
            <div class="field">
              <Label>{$_('submit.level_feedback.area_question')}</Label>
              <div class="area-grid">
                {#each requestAreaOptions as area}
                  {#if area.disabled}
                    <Tooltip.Root>
                      <Tooltip.Trigger>
                        <label
                          class="area-option disabled"
                          title={area.tooltip}
                          aria-disabled="true"
                        >
                          <input
                            type="checkbox"
                            checked={false}
                            disabled
                            on:change={(event) => setArea(area.id, event.currentTarget.checked)}
                          />
                          <span class="area-copy">
                            <span>{area.label}</span>
                            <small>{area.description}</small>
                          </span>
                        </label>
                      </Tooltip.Trigger>
                      <Tooltip.Content>{area.tooltip}</Tooltip.Content>
                    </Tooltip.Root>
                  {:else}
                    <label
                      class="area-option"
                      class:selected={requestAreas.includes(area.id)}
                    >
                      <input
                        type="checkbox"
                        checked={requestAreas.includes(area.id)}
                        on:change={(event) => setArea(area.id, event.currentTarget.checked)}
                      />
                      <span class="area-copy">
                        <span>{area.label}</span>
                        <small>{area.description}</small>
                      </span>
                    </label>
                  {/if}
                {/each}
              </div>
            </div>

            <div class="field">
              <Label for="length-seconds">
                {$_('submit.level_feedback.length_seconds')}
              </Label>
              <Input
                id="length-seconds"
                type="number"
                min="30"
                inputmode="numeric"
                bind:value={lengthSeconds}
                on:input={() => (pricing = null)}
                placeholder="90"
              />
            </div>

            <div class="field">
              <Label for="submitter-note">{$_('submit.level_feedback.note')}</Label>
              <Textarea
                id="submitter-note"
                bind:value={submitterNote}
                rows={4}
                maxlength={1000}
                placeholder={$_('submit.level_feedback.note_placeholder')}
              />
            </div>

            <div class="field">
              <Label for="video-link">{$_('submit.level_feedback.video_link')}</Label>
              <Input
                id="video-link"
                type="url"
                bind:value={videoLink}
                maxlength={500}
                placeholder={$_('submit.level_feedback.video_link_placeholder')}
              />
            </div>
          </div>
        {:else}
          <div class="payment-step">
            <div class="payment-card">
              <div>
                <p class="eyebrow">{$_('submit.level_feedback.payment_title')}</p>
                <h2>{$_('submit.level_feedback.payment_heading')}</h2>
              </div>

              {#if quoteLoading}
                <div class="loading-inline">
                  <Loader2 class="spin" size={18} />
                  <span>{$_('submit.level_feedback.loading_price')}</span>
                </div>
              {:else if pricing}
                <div class="price-list">
                  <div class="price-row">
                    <span>{$_('submit.level_feedback.price_categories')}</span>
                    <b>{formatVND(pricing.categoryAmount)}</b>
                  </div>
                  <div class="price-row">
                    <span>{$_('submit.level_feedback.price_length')}</span>
                    <b>{formatVND(pricing.lengthAmount)}</b>
                  </div>
                  {#if pricing.discountAmount > 0}
                    <div class="price-row muted">
                      <span>{$_('submit.level_feedback.price_discount')}</span>
                      <b>-{formatVND(pricing.discountAmount)}</b>
                    </div>
                  {/if}
                  <div class="price-row total">
                    <span>{$_('submit.level_feedback.price_total')}</span>
                    <b>{formatVND(pricing.paidAmount)}</b>
                  </div>
                </div>
              {:else}
                <Button variant="outline" disabled={quoteLoading} on:click={loadPricing}>
                  {$_('submit.level_feedback.refresh_price')}
                </Button>
              {/if}
            </div>
          </div>
        {/if}

        <div class="footer-actions">
          <Button variant="outline" disabled={step === 0 || submitting || quoteLoading} on:click={back}>
            {$_('submit.back')}
          </Button>
          <Button disabled={submitting || levelLoading || quoteLoading || (step === 2 && !canSubmitFeedback) || (step === steps.length - 1 && !pricing)} on:click={next}>
            {#if submitting || quoteLoading}
              <Loader2 class="mr-2 spin" size={16} />
            {/if}
            {step === steps.length - 1 ? $_('submit.level_feedback.pay_and_submit') : $_('submit.level_feedback.continue')}
          </Button>
        </div>
      {/if}
    </div>
  </div>
</div>

<style lang="scss">
.feedback-page {
  min-height: 60vh;
  padding: 24px 16px;
  display: flex;
  justify-content: center;
}

.feedback-container {
  width: 100%;
  max-width: 760px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  color: hsl(var(--muted-foreground));
  font-size: 13px;
  text-decoration: none;
}

.feedback-card {
  border: 1px solid hsl(var(--border));
  border-radius: 14px;
  background: hsl(var(--card, var(--background)));
  padding: 24px;
}

.feedback-header {
  display: grid;
  gap: 6px;
  margin-bottom: 12px;
}

.eyebrow {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: hsl(var(--muted-foreground));
  text-transform: uppercase;
}

h1 {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
}

.loading-state,
.empty-state,
.success-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  padding: 32px 12px;
}

.empty-state p,
.success-state p {
  max-width: 520px;
  color: hsl(var(--muted-foreground));
  line-height: 1.6;
}

:global(.success-state svg) {
  color: hsl(142 70% 45%);
}

.success-actions,
.footer-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
}

.request-step {
  display: grid;
  gap: 18px;
}

.payment-step {
  display: grid;
  gap: 16px;
}

.payment-card {
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  padding: 16px;
  display: grid;
  gap: 16px;

  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
  }
}

.loading-inline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: hsl(var(--muted-foreground));
}

.price-list {
  display: grid;
  gap: 10px;
}

.price-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 14px;

  span {
    color: hsl(var(--muted-foreground));
  }

  &.muted {
    font-size: 13px;
  }

  &.total {
    border-top: 1px solid hsl(var(--border));
    padding-top: 12px;
    font-size: 16px;

    span,
    b {
      color: hsl(var(--foreground));
    }
  }
}

.field {
  display: grid;
  gap: 8px;
}

.area-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.area-option {
  min-height: 92px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  padding: 12px;
  text-align: left;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;

  input {
    width: 16px;
    height: 16px;
    margin-top: 2px;
    accent-color: hsl(var(--primary));
    flex: 0 0 auto;
  }

  .area-copy {
    display: grid;
    gap: 6px;
  }

  .area-copy > span {
    font-weight: 700;
    font-size: 14px;
  }

  small {
    color: hsl(var(--muted-foreground));
    line-height: 1.4;
  }

  &:hover,
  &.selected {
    border-color: hsl(var(--primary));
    background: hsl(var(--primary) / 0.08);
  }

  &.selected {
    box-shadow: 0 0 0 3px hsl(var(--primary) / 0.12);
  }

  &.disabled {
    cursor: not-allowed;
    opacity: 0.58;

    input {
      cursor: not-allowed;
    }

    &:hover {
      border-color: hsl(var(--border));
      background: hsl(var(--background));
      box-shadow: none;
    }
  }
}

.footer-actions {
  margin-top: 24px;
}

:global(.spin) {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .feedback-card {
    padding: 16px;
  }

  .area-grid {
    grid-template-columns: 1fr;
  }
}
</style>
