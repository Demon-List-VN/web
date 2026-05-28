<script lang="ts">
	import { goto } from '$app/navigation';
	import { user } from '$lib/client';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
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
	};

	let step = 0;
	let levelid = NaN;
	let apiLevel: any = null;
	let level: any = null;
	let levelVariants: any[] = [];
	let selectedVariantId: number | null = null;
	let requestAreas: string[] = ['gameplay'];
	let lengthSeconds = '';
	let submitterNote = '';
	let levelLoading = false;
	let submitting = false;
	let submitted = false;

	$: steps = [
		$_('submit.level_feedback.step_level'),
		$_('submit.level_feedback.step_confirm'),
		$_('submit.level_feedback.step_request')
	];
	$: selectedLevelId = selectedVariantId ?? levelid;
	$: numericLengthSeconds = Number(lengthSeconds);
	$: hasValidLengthSeconds = Number.isInteger(numericLengthSeconds) && numericLengthSeconds > 0;
	$: canSubmitFeedback = requestAreas.length > 0 && hasValidLengthSeconds;
	$: requestAreaOptions = [
		{
			id: 'gameplay',
			label: $_('submit.level_feedback.areas.gameplay.label'),
			description: $_('submit.level_feedback.areas.gameplay.description')
		},
		{
			id: 'deco',
			label: $_('submit.level_feedback.areas.deco.label'),
			description: $_('submit.level_feedback.areas.deco.description')
		}
	] satisfies RequestArea[];

	function setArea(area: string, checked: boolean) {
		if (!checked) {
			requestAreas = requestAreas.filter((item) => item !== area);

			return;
		}

		if (!requestAreas.includes(area)) {
			requestAreas = [...requestAreas, area];
		}
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

		await submitFeedback();
	}

	function back() {
		if (step > 0) {
			step -= 1;
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

		return true;
	}

	async function submitFeedback() {
		if (submitting || !validateRequest()) {
			return;
		}

		submitting = true;

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/level-feedback-submissions`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${await $user.token()}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						levelId: selectedLevelId,
						requestAreas,
						lengthSeconds: numericLengthSeconds,
						submitterNote
					})
				}
			);
			const payload = await response.json()
				.catch(() => null);

			if (!response.ok) {
				throw new Error(payload?.message || $_('submit.level_feedback.errors.submit_failed'));
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
                requestAreas = ['gameplay'];
                lengthSeconds = '';
                submitterNote = '';
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
        {:else}
          <div class="request-step">
            <div class="field">
              <Label>{$_('submit.level_feedback.area_question')}</Label>
              <div class="area-grid">
                {#each requestAreaOptions as area}
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
                min="1"
                inputmode="numeric"
                bind:value={lengthSeconds}
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
          </div>
        {/if}

        <div class="footer-actions">
          <Button variant="outline" disabled={step === 0 || submitting} on:click={back}>
            {$_('submit.back')}
          </Button>
          <Button disabled={submitting || levelLoading || (step === steps.length - 1 && !canSubmitFeedback)} on:click={next}>
            {#if submitting}
              <Loader2 class="mr-2 spin" size={16} />
            {/if}
            {step === steps.length - 1 ? $_('submit.level_feedback.submit_request') : $_('submit.level_feedback.continue')}
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
