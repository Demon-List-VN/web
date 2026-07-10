<script lang="ts">
	import { onMount } from 'svelte';
	import Chart from 'chart.js/auto';
	import { _ } from 'svelte-i18n';
	import { toast } from 'svelte-sonner';
	import { Copy, Send, Trash2 } from 'lucide-svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { user } from '$lib/client';
	import { tournamentFetch } from '$lib/client/tournament';

	export let level: any;
	export let index: number;
	export let showDeathCount = true;
	export let tournament: any = null;
	export let onSubmitted: (() => void | Promise<void>) | null = null;

	let deathCount: number[] = [];
	let chartDialogOpen = false;
	let submitDialogOpen = false;
	let submitting = false;
	let cancelling = false;
	let submitProgress: number | string = '';
	let submitVideoLink = '';
	let submitRaw = '';
	let submitComment = '';

	$: levelId = Number(level.levelId);
	$: levelName = level.name || `Level ${levelId}`;
	$: requireRaw = level.requireRaw === true || level.needRaw === true;
	$: manualSubmission = level.viewerManualSubmission ?? null;
	$: canManualSubmit = Boolean(
		tournament?.contestConfig?.allowManualSubmit === true
		&& tournament?.status === 'ongoing'
		&& $user?.loggedIn
		&& tournament?.viewerParticipant?.status === 'active'
	);
	$: thumbnailUrl = level.videoID
		? `https://img.youtube.com/vi/${level.videoID}/0.jpg`
		: `https://levelthumbs.prevter.me/thumbnail/${levelId}/small`;

	function indexToRoman(value: number) {
		const numerals: Array<[number, string]> = [
			[1000, 'M'],
			[900, 'CM'],
			[500, 'D'],
			[400, 'CD'],
			[100, 'C'],
			[90, 'XC'],
			[50, 'L'],
			[40, 'XL'],
			[10, 'X'],
			[9, 'IX'],
			[5, 'V'],
			[4, 'IV'],
			[1, 'I']
		];
		let remaining = value;
		let result = '';

		for (const [amount, numeral] of numerals) {
			while (remaining >= amount) {
				result += numeral;
				remaining -= amount;
			}
		}

		return result;
	}

	async function copyId() {
		try {
			await navigator.clipboard.writeText(String(levelId));
			toast.success($_('toast.clipboard'));
		} catch {
			toast.error($_('tournament.levels.copy_failed'));
		}
	}

	async function loadDeathCount() {
		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/levels/${levelId}/deathCount`
			);

			if (!response.ok) {
				throw new Error('Failed to load death count');
			}

			const payload = await response.json();
			deathCount = Array.isArray(payload?.count) ? payload.count : [];
		} catch {
			deathCount = [];
		}
	}

	function resetSubmitForm() {
		submitProgress = '';
		submitVideoLink = '';
		submitRaw = '';
		submitComment = '';
	}

	async function submitManualProgress() {
		const progress = Number(submitProgress);

		if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
			toast.error($_('tournament.manual_submit.invalid_progress'));

			return;
		}

		if (!submitVideoLink.trim() || (requireRaw && !submitRaw.trim())) {
			toast.error($_('tournament.manual_submit.fill_required'));

			return;
		}

		submitting = true;

		try {
			await tournamentFetch(`/${tournament.id}/levels/${levelId}/submit`, {
				method: 'POST',
				body: JSON.stringify({
					progress,
					videoLink: submitVideoLink,
					raw: submitRaw,
					comment: submitComment
				})
			});
			toast.success($_('tournament.manual_submit.success'));
			submitDialogOpen = false;
			resetSubmitForm();
			await onSubmitted?.();
		} catch (error: any) {
			toast.error(error?.message || $_('tournament.manual_submit.error'));
		} finally {
			submitting = false;
		}
	}

	async function cancelManualProgress() {
		if (!confirm($_('tournament.manual_submit.cancel_confirm'))) {
			return;
		}

		cancelling = true;

		try {
			await tournamentFetch(`/${tournament.id}/levels/${levelId}/submit`, {
				method: 'DELETE'
			});
			toast.success($_('tournament.manual_submit.cancel_success'));
			await onSubmitted?.();
		} catch (error: any) {
			toast.error(error?.message || $_('tournament.manual_submit.cancel_error'));
		} finally {
			cancelling = false;
		}
	}

	function createChart(node: HTMLCanvasElement, expanded = false) {
		const chart = new Chart(node, {
			type: 'bar',
			data: {
				labels: Array.from({ length: 100 }, (_, progress) => `${progress + 1}%`),
				datasets: [
					{
						label: $_('record_detail.tabs.death_count'),
						data: deathCount,
						borderWidth: 1,
						backgroundColor: 'rgba(75, 192, 192, 0.6)',
						borderColor: 'rgba(75, 192, 192, 1)'
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				scales: {
					x: {
						display: expanded,
						title: expanded
							? { display: true, text: $_('record_detail.tabs.progress') }
							: undefined
					},
					y: {
						display: expanded,
						beginAtZero: true,
						ticks: { precision: 0 },
						title: expanded
							? { display: true, text: $_('contest.deaths') }
							: undefined
					}
				},
				plugins: {
					tooltip: {
						callbacks: {
							label: (context) => `${$_('contest.deaths')}: ${context.parsed.y}`
						}
					},
					legend: { display: expanded },
					title: {
						display: expanded,
						text: expanded
							? `${$_('record_detail.tabs.death_count')} - ${levelName}`
							: ''
					}
				}
			}
		});

		return {
			destroy() {
				chart.destroy();
			}
		};
	}

	onMount(loadDeathCount);
</script>

<Card.Root class="flex flex-col p-2">
  <div class="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
    <div class="flex min-w-0 flex-1 items-center gap-4">
      <a href={`/level/${levelId}`} data-sveltekit-preload-data="tap" class="shrink-0">
        <img
          src={thumbnailUrl}
          alt={levelName}
          class="h-[100px] w-[177px] rounded-xl object-cover"
        />
      </a>
      <Card.Content class="min-w-0 p-0">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="truncate text-xl font-bold">
            {indexToRoman(index + 1)}. {levelName}
          </h2>
          <span class="rounded-sm bg-foreground px-[5px] text-[12px] font-semibold text-background">
            {level.maxPoints}pt
          </span>
          {#if requireRaw}
            <span class="rounded-sm bg-foreground px-[5px] text-[12px] font-semibold text-background">
              {$_('tournament.levels.raw_required')}
            </span>
          {/if}
        </div>
        <div class="mt-1 flex flex-col text-sm text-muted-foreground">
          {#if level.creator}
            <span>{$_('tournament.levels.by_creator', { values: { creator: level.creator } })}</span>
          {/if}
          <button
            type="button"
            class="flex w-fit items-center gap-[5px] hover:text-foreground"
            on:click={copyId}
          >
            ID: {levelId}
            <Copy size={15} />
          </button>
        </div>
      </Card.Content>
    </div>

    {#if deathCount.length > 0 && showDeathCount}
      <button
        class="h-[150px] w-full cursor-pointer md:max-w-[300px] lg:h-[115px]"
        on:click={() => (chartDialogOpen = true)}
        type="button"
        aria-label={$_('tournament.levels.open_death_count', { values: { level: levelName } })}
      >
        <canvas use:createChart></canvas>
      </button>
    {/if}

    {#if canManualSubmit}
      <div class="flex flex-col items-start gap-2 md:items-end">
        {#if manualSubmission}
          <span class="text-sm text-muted-foreground">
            {$_('tournament.manual_submit.submitted_progress', {
              values: { progress: manualSubmission.progress }
            })}
          </span>
          <Button
            type="button"
            variant="destructive"
            on:click={cancelManualProgress}
            disabled={cancelling}
          >
            <Trash2 size={15} class="mr-[6px]" />
            {cancelling
              ? $_('tournament.manual_submit.cancelling')
              : $_('tournament.manual_submit.cancel_submission')}
          </Button>
        {:else}
          <Button
            type="button"
            variant="outline"
            on:click={() => (submitDialogOpen = true)}
          >
            <Send size={15} class="mr-[6px]" />
            {$_('tournament.manual_submit.submit')}
          </Button>
        {/if}
      </div>
    {/if}
  </div>
</Card.Root>

<Dialog.Root bind:open={chartDialogOpen}>
  <Dialog.Content class="max-w-4xl">
    <div class="h-[500px] w-full">
      <canvas use:createChart={true}></canvas>
    </div>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={submitDialogOpen}>
  <Dialog.Content class="max-w-lg">
    <Dialog.Header>
      <Dialog.Title>{$_('tournament.manual_submit.title')}</Dialog.Title>
      <Dialog.Description>{levelName}</Dialog.Description>
    </Dialog.Header>
    <div class="grid gap-4 py-2">
      <div class="grid gap-2">
        <Label for={`contest-progress-${levelId}`}>{$_('tournament.manual_submit.progress')}</Label>
        <Input
          id={`contest-progress-${levelId}`}
          type="number"
          min="0"
          max="100"
          step="0.01"
          bind:value={submitProgress}
          disabled={submitting}
        />
      </div>
      <div class="grid gap-2">
        <Label for={`contest-video-${levelId}`}>{$_('tournament.manual_submit.video_link')}</Label>
        <Input
          id={`contest-video-${levelId}`}
          bind:value={submitVideoLink}
          disabled={submitting}
          placeholder="https://youtube.com/watch?v=..."
        />
      </div>
      {#if requireRaw}
        <div class="grid gap-2">
          <Label for={`contest-raw-${levelId}`}>{$_('tournament.manual_submit.raw')}</Label>
          <Input
            id={`contest-raw-${levelId}`}
            bind:value={submitRaw}
            disabled={submitting}
            placeholder="https://youtube.com/watch?v=..."
          />
        </div>
      {/if}
      <div class="grid gap-2">
        <Label for={`contest-comment-${levelId}`}>{$_('tournament.manual_submit.comment')}</Label>
        <Textarea
          id={`contest-comment-${levelId}`}
          bind:value={submitComment}
          disabled={submitting}
        />
      </div>
    </div>
    <Dialog.Footer>
      <Button variant="outline" on:click={() => (submitDialogOpen = false)} disabled={submitting}>
        {$_('tournament.manual_submit.cancel')}
      </Button>
      <Button on:click={submitManualProgress} disabled={submitting}>
        {submitting ? $_('tournament.manual_submit.submitting') : $_('tournament.manual_submit.submit')}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
