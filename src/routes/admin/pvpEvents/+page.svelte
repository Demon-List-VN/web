<script lang="ts">
	import { onMount } from 'svelte';
	import Title from '$lib/components/Title.svelte';
	import { user } from '$lib/client';
	import {
		createAdminPvpEvent,
		deleteAdminPvpEvent,
		getAdminPvpEvents,
		updateAdminPvpEvent,
		type AdminPvpEventPayload,
		type PvpEvent
	} from '$lib/client/pvp';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { toast } from 'svelte-sonner';
	import { CalendarDays, Loader2, Plus, RefreshCw, Save, Trash2, X } from 'lucide-svelte';

	type CompletionRuleType = 'count' | 'percentage';
	type ScoringMode = 'progress' | 'score' | 'hp';
	type LevelSelectionMode = 'random' | 'sbmm';
	type PvpEventForm = {
		title: string;
		description: string;
		bannerUrl: string;
		listId: string;
		startsAt: string;
		endsAt: string;
		enabled: boolean;
		levelSelectionMode: LevelSelectionMode;
		ranked: boolean;
		startTimeLimitMinutes: number;
		startTimeLimitSeconds: number;
		completionRuleType: CompletionRuleType;
		completionRuleValue: number;
		scoringMode: ScoringMode;
		targetScoreEnabled: boolean;
		targetScore: number;
		startingHp: number;
		finalizeAliveCount: number;
	};

	const emptyForm: PvpEventForm = {
		title: '',
		description: '',
		bannerUrl: '',
		listId: '',
		startsAt: '',
		endsAt: '',
		enabled: true,
		levelSelectionMode: 'random',
		ranked: true,
		startTimeLimitMinutes: 15,
		startTimeLimitSeconds: 0,
		completionRuleType: 'count',
		completionRuleValue: 1,
		scoringMode: 'progress',
		targetScoreEnabled: false,
		targetScore: 1000,
		startingHp: 200,
		finalizeAliveCount: 1
	};

	let events: PvpEvent[] = [];
	let form: PvpEventForm = { ...emptyForm };
	let editingId: number | string | null = null;
	let loading = false;
	let saving = false;
	let actionKey = '';
	let initialized = false;

	$: sortedEvents = [...events].sort(compareEvents);
	$: formListId = Number(form.listId);
	$: canSave = form.title.trim().length > 0
		&& Number.isInteger(formListId)
		&& formListId > 0
		&& Boolean(form.startsAt)
		&& !saving;

	$: if ($user.data?.isAdmin && !initialized) {
		initialized = true;
		void loadEvents();
	}

	onMount(() => {
		if ($user.data?.isAdmin && !initialized) {
			initialized = true;
			void loadEvents();
		}
	});

	function compareEvents(a: PvpEvent, b: PvpEvent) {
		return dateMs(b.startsAt ?? b.starts_at) - dateMs(a.startsAt ?? a.starts_at);
	}

	function dateMs(value: unknown) {
		const ms = new Date(String(value || ''))
			.getTime();

		return Number.isFinite(ms) ? ms : 0;
	}

	function toDatetimeLocal(value: unknown) {
		const ms = dateMs(value);

		if (!ms) {
			return '';
		}

		const date = new Date(ms);
		const offsetMs = date.getTimezoneOffset() * 60 * 1000;

		return new Date(date.getTime() - offsetMs)
			.toISOString()
			.slice(0, 16);
	}

	function toIso(value: string) {
		if (!value) {
			return null;
		}

		const ms = new Date(value)
			.getTime();

		return Number.isFinite(ms)
			? new Date(ms)
				.toISOString()
			: null;
	}

	function formatDate(value: unknown) {
		const ms = dateMs(value);

		return ms ? new Date(ms)
			.toLocaleString() : 'Not set';
	}

	function eventId(event: PvpEvent) {
		return event.id ?? '';
	}

	function eventListId(event: PvpEvent) {
		return event.listId ?? event.list_id ?? (event.list as any)?.id ?? '';
	}

	function eventListTitle(event: PvpEvent) {
		return (event.list as any)?.title ?? (event.lists as any)?.title ?? `List #${eventListId(event)}`;
	}

	function eventMode(event: PvpEvent) {
		return event.mode === 'platformer' || event.baseMode === 'platformer'
			|| event.base_mode === 'platformer'
			? 'Platformer'
			: 'Classic';
	}

	function eventScoringMode(event: PvpEvent): ScoringMode {
		const value = event.scoringMode ?? event.scoring_mode;

		return value === 'score'
			? 'score'
			: value === 'hp'
			? 'hp'
			: 'progress';
	}

	function eventRanked(event: PvpEvent) {
		return Boolean(event.ranked ?? event.isRanked ?? event.is_ranked ?? true);
	}

	function eventLevelSelectionMode(event: PvpEvent): LevelSelectionMode {
		const value = event.levelSelectionMode ?? event.level_selection_mode;

		return value === 'sbmm' ? 'sbmm' : 'random';
	}

	function eventLevelSelectionLabel(event: PvpEvent) {
		return eventLevelSelectionMode(event) === 'sbmm' ? 'SBMM' : 'Random';
	}

	function eventTimeLimitSeconds(event: PvpEvent) {
		return normalizedInteger(event.timeLimitSeconds ?? event.time_limit_seconds, 1, 7200, 900);
	}

	function eventConfigSummary(event: PvpEvent) {
		const scoringMode = eventScoringMode(event);
		const timeLimitSeconds = eventTimeLimitSeconds(event);
		const minutes = Math.floor(timeLimitSeconds / 60);
		const seconds = timeLimitSeconds % 60;
		const timeLabel = seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;

		if (scoringMode === 'score') {
			const target = event.targetScore ?? event.target_score;

			return `Score - ${timeLabel}${target ? ` - target ${target}` : ' - unlimited'}`;
		}

		if (scoringMode === 'hp') {
			const hp = event.startingHp ?? event.starting_hp ?? 200;
			const alive = event.finalizeAliveCount ?? event.finalize_alive_count ?? 1;

			return `HP - ${timeLabel} - ${hp} HP - finalize ${alive} alive`;
		}

		const ruleType = event.completionRuleType ?? event.completion_rule_type;
		const ruleValue = event.completionRuleValue ?? event.completion_rule_value ?? 1;
		const ruleLabel = ruleType === 'percentage' ? `${ruleValue}%` : `${ruleValue} player`;

		return `Progress - ${timeLabel} - ${ruleLabel}`;
	}

	function eventStatus(event: PvpEvent) {
		if (!event.enabled) {
			return 'Disabled';
		}

		const now = Date.now();
		const starts = dateMs(event.startsAt ?? event.starts_at);
		const ends = dateMs(event.endsAt ?? event.ends_at);

		if (starts && starts > now) {
			return 'Upcoming';
		}

		if (ends && ends <= now) {
			return 'Ended';
		}

		return 'Active';
	}

	function statusVariant(status: string) {
		return status === 'Active'
			? 'default'
			: status === 'Disabled'
			? 'secondary'
			: 'outline';
	}

	function buildPayload(): AdminPvpEventPayload {
		const startsAt = toIso(form.startsAt);
		const endsAt = toIso(form.endsAt);
		const scoringMode = normalizedScoringMode();

		if (!startsAt) {
			throw new Error('Start time is required.');
		}

		return {
			title: form.title.trim(),
			description: form.description.trim(),
			bannerUrl: form.bannerUrl.trim() || null,
			listId: formListId,
			startsAt,
			endsAt,
			enabled: form.enabled,
			levelSelectionMode: form.levelSelectionMode,
			ranked: form.ranked,
			timeLimitSeconds: totalStartTimeLimitSeconds(),
			completionRuleType: scoringMode === 'hp' ? null : form.completionRuleType,
			completionRuleValue: scoringMode === 'hp' ? null : normalizedCompletionRuleValue(),
			scoringMode,
			targetScore: scoringMode === 'score' && form.targetScoreEnabled ? normalizedTargetScore() : null,
			startingHp: scoringMode === 'hp' ? normalizedStartingHp() : null,
			finalizeAliveCount: scoringMode === 'hp' ? normalizedFinalizeAliveCount() : null
		};
	}

	function resetForm() {
		form = { ...emptyForm };
		editingId = null;
	}

	function editEvent(event: PvpEvent) {
		editingId = eventId(event);
		form = {
			title: event.title ?? '',
			description: event.description ?? '',
			bannerUrl: event.bannerUrl ?? event.banner_url ?? '',
			listId: String(eventListId(event) || ''),
			startsAt: toDatetimeLocal(event.startsAt ?? event.starts_at),
			endsAt: toDatetimeLocal(event.endsAt ?? event.ends_at),
			enabled: event.enabled !== false,
			levelSelectionMode: eventLevelSelectionMode(event),
			ranked: eventRanked(event),
			...formMatchConfigFromEvent(event)
		};
	}

	function resetMatchConfig() {
		form = {
			...form,
			startTimeLimitMinutes: emptyForm.startTimeLimitMinutes,
			startTimeLimitSeconds: emptyForm.startTimeLimitSeconds,
			levelSelectionMode: emptyForm.levelSelectionMode,
			ranked: emptyForm.ranked,
			completionRuleType: emptyForm.completionRuleType,
			completionRuleValue: emptyForm.completionRuleValue,
			scoringMode: emptyForm.scoringMode,
			targetScoreEnabled: emptyForm.targetScoreEnabled,
			targetScore: emptyForm.targetScore,
			startingHp: emptyForm.startingHp,
			finalizeAliveCount: emptyForm.finalizeAliveCount
		};
	}

	function formMatchConfigFromEvent(event: PvpEvent): Pick<
		PvpEventForm,
		| 'startTimeLimitMinutes'
		| 'startTimeLimitSeconds'
		| 'completionRuleType'
		| 'completionRuleValue'
		| 'scoringMode'
		| 'targetScoreEnabled'
		| 'targetScore'
		| 'startingHp'
		| 'finalizeAliveCount'
	> {
		const timeLimitSeconds = eventTimeLimitSeconds(event);
		const completionRuleType = event.completionRuleType === 'percentage'
			|| event.completion_rule_type === 'percentage'
			? 'percentage'
			: 'count';
		const scoringMode = eventScoringMode(event);
		const targetScore = event.targetScore ?? event.target_score;

		return {
			startTimeLimitMinutes: Math.floor(timeLimitSeconds / 60),
			startTimeLimitSeconds: timeLimitSeconds % 60,
			completionRuleType,
			completionRuleValue: normalizedCompletionRuleValue(
				completionRuleType,
				event.completionRuleValue ?? event.completion_rule_value
			),
			scoringMode,
			targetScoreEnabled: targetScore !== null && targetScore !== undefined,
			targetScore: normalizedTargetScore(targetScore),
			startingHp: normalizedStartingHp(event.startingHp ?? event.starting_hp),
			finalizeAliveCount: normalizedFinalizeAliveCount(
				event.finalizeAliveCount ?? event.finalize_alive_count
			)
		};
	}

	function setCompletionRule(nextType: CompletionRuleType) {
		form = {
			...form,
			completionRuleType: nextType,
			completionRuleValue: nextType === 'percentage' ? 100 : 1
		};
	}

	function setScoringMode(nextMode: ScoringMode) {
		form = {
			...form,
			scoringMode: nextMode
		};
	}

	function setLevelSelectionMode(nextMode: LevelSelectionMode) {
		form = {
			...form,
			levelSelectionMode: nextMode
		};
	}

	function totalStartTimeLimitSeconds() {
		return Math.max(
			1,
			(normalizedInteger(form.startTimeLimitMinutes, 0, 120, 15) * 60)
				+ normalizedInteger(form.startTimeLimitSeconds, 0, 59, 0)
		);
	}

	function normalizedScoringMode(): ScoringMode {
		return form.scoringMode === 'score'
			? 'score'
			: form.scoringMode === 'hp'
			? 'hp'
			: 'progress';
	}

	function normalizedCompletionRuleValue(
		type: CompletionRuleType = form.completionRuleType,
		value: unknown = form.completionRuleValue
	) {
		const numberValue = Number(value);
		const fallback = type === 'percentage' ? 100 : 1;
		const rounded = Number.isFinite(numberValue) ? Math.floor(numberValue) : fallback;
		const upperBound = type === 'percentage' ? 100 : 2;

		return Math.max(1, Math.min(upperBound, rounded));
	}

	function normalizedInteger(value: unknown, min: number, max: number, fallback: number) {
		const numberValue = Number(value);

		if (!Number.isFinite(numberValue)) {
			return fallback;
		}

		return Math.max(min, Math.min(max, Math.floor(numberValue)));
	}

	function normalizedTargetScore(value: unknown = form.targetScore) {
		const numberValue = Number(value);

		return Math.max(
			1,
			Math.min(100000, Number.isFinite(numberValue) ? Math.floor(numberValue) : 1000)
		);
	}

	function normalizedStartingHp(value: unknown = form.startingHp) {
		const numberValue = Number(value);

		return Math.max(
			1,
			Math.min(100000, Number.isFinite(numberValue) ? Math.floor(numberValue) : 200)
		);
	}

	function normalizedFinalizeAliveCount(value: unknown = form.finalizeAliveCount) {
		const numberValue = Number(value);

		return Math.max(
			1,
			Math.min(100, Number.isFinite(numberValue) ? Math.floor(numberValue) : 1)
		);
	}

	async function loadEvents() {
		loading = true;

		try {
			events = await getAdminPvpEvents(await $user.token());
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to load PvP events');
		} finally {
			loading = false;
		}
	}

	async function saveEvent() {
		if (!canSave) {
			return;
		}

		saving = true;

		try {
			const payload = buildPayload();
			const wasEditing = Boolean(editingId);
			const saved = editingId
				? await updateAdminPvpEvent(await $user.token(), editingId, payload)
				: await createAdminPvpEvent(await $user.token(), payload);
			const id = String(eventId(saved));
			const index = events.findIndex((event) => String(eventId(event)) === id);

			if (index >= 0) {
				events = events.map((event, eventIndex) => eventIndex === index ? saved : event);
			} else {
				events = [saved, ...events];
			}

			resetForm();
			toast.success(wasEditing ? 'PvP event updated.' : 'PvP event created.');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to save PvP event');
		} finally {
			saving = false;
		}
	}

	async function toggleEvent(event: PvpEvent) {
		const id = eventId(event);

		if (!id) {
			return;
		}

		actionKey = `toggle-${id}`;

		try {
			const saved = await updateAdminPvpEvent(await $user.token(), id, {
				enabled: event.enabled === false
			});
			events = events.map((item) => String(eventId(item)) === String(id) ? saved : item);
			toast.success(saved.enabled === false ? 'PvP event disabled.' : 'PvP event enabled.');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update PvP event');
		} finally {
			actionKey = '';
		}
	}

	async function removeEvent(event: PvpEvent) {
		const id = eventId(event);

		if (!id || !confirm(`Delete PvP event "${event.title}"?`)) {
			return;
		}

		actionKey = `delete-${id}`;

		try {
			await deleteAdminPvpEvent(await $user.token(), id);
			events = events.filter((item) => String(eventId(item)) !== String(id));

			if (String(editingId) === String(id)) {
				resetForm();
			}

			toast.success('PvP event deleted.');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to delete PvP event');
		} finally {
			actionKey = '';
		}
	}
</script>

<Title value="PvP Events - Admin" />

{#if $user.data?.isAdmin}
<div class="page">
  <div class="page-header">
    <div>
      <h1>PvP Events</h1>
      <p>Manage the active Versus event mode and its linked custom list pool.</p>
    </div>
    <Button variant="outline" disabled={loading} on:click={loadEvents}>
      <RefreshCw class={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      Refresh
    </Button>
  </div>

  <div class="layout">
    <Card.Root>
      <Card.Header>
        <Card.Title>{editingId ? 'Edit PvP event' : 'Create PvP event'}</Card.Title>
        <Card.Description>
          The linked list decides whether the event plays Classic or Platformer.
        </Card.Description>
      </Card.Header>
      <Card.Content class="event-form">
        <div class="field">
          <Label for="pvp-event-title">Title</Label>
          <Input id="pvp-event-title" bind:value={form.title} maxlength="100" />
        </div>

        <div class="field">
          <Label for="pvp-event-list">Custom list ID</Label>
          <Input
            id="pvp-event-list"
            bind:value={form.listId}
            type="number"
            min="1"
            inputmode="numeric"
            placeholder="159"
          />
        </div>

        <div class="field two-col">
          <div>
            <Label for="pvp-event-start">Starts at</Label>
            <Input id="pvp-event-start" bind:value={form.startsAt} type="datetime-local" />
          </div>
          <div>
            <Label for="pvp-event-end">Ends at</Label>
            <Input id="pvp-event-end" bind:value={form.endsAt} type="datetime-local" />
          </div>
        </div>

        <div class="field">
          <Label for="pvp-event-banner">Banner URL</Label>
          <Input id="pvp-event-banner" bind:value={form.bannerUrl} placeholder="https://..." />
        </div>

        <div class="field">
          <Label for="pvp-event-description">Description</Label>
          <Textarea id="pvp-event-description" bind:value={form.description} rows={4} />
        </div>

        <label class="check-row">
          <input type="checkbox" bind:checked={form.enabled} />
          <span>Enabled</span>
        </label>

        <div class="match-config-panel">
          <div class="section-head">
            <div>
              <h3>Match config</h3>
              <p>Matches created from this event queue will use these rules.</p>
            </div>
            <Button variant="outline" size="sm" on:click={resetMatchConfig}>
              Reset to Classic
            </Button>
          </div>

          <div class="field">
            <Label>Match length</Label>
            <div class="time-grid">
              <div class="input-with-unit">
                <Input
                  bind:value={form.startTimeLimitMinutes}
                  min="0"
                  max="120"
                  type="number"
                  aria-label="Minutes"
                />
                <span>min</span>
              </div>
              <div class="input-with-unit">
                <Input
                  bind:value={form.startTimeLimitSeconds}
                  min="0"
                  max="59"
                  type="number"
                  aria-label="Seconds"
                />
                <span>sec</span>
              </div>
            </div>
          </div>

          <div class="field">
            <Label>Level selection</Label>
            <div class="segmented-control two-option">
              <button
                type="button"
                class:active={form.levelSelectionMode === 'random'}
                on:click={() => setLevelSelectionMode('random')}
              >
                Random
              </button>
              <button
                type="button"
                class:active={form.levelSelectionMode === 'sbmm'}
                on:click={() => setLevelSelectionMode('sbmm')}
              >
                SBMM
              </button>
            </div>
          </div>

          <div class="field">
            <Label>Rating</Label>
            <div class="segmented-control two-option">
              <button
                type="button"
                class:active={form.ranked}
                on:click={() => (form.ranked = true)}
              >
                Ranked
              </button>
              <button
                type="button"
                class:active={!form.ranked}
                on:click={() => (form.ranked = false)}
              >
                Unranked
              </button>
            </div>
          </div>

          <div class="field">
            <Label>Scoring mode</Label>
            <div class="segmented-control">
              <button
                type="button"
                class:active={form.scoringMode === 'progress'}
                on:click={() => setScoringMode('progress')}
              >
                Progress
              </button>
              <button
                type="button"
                class:active={form.scoringMode === 'score'}
                on:click={() => setScoringMode('score')}
              >
                Score
              </button>
              <button
                type="button"
                class:active={form.scoringMode === 'hp'}
                on:click={() => setScoringMode('hp')}
              >
                HP
              </button>
            </div>
          </div>

          {#if form.scoringMode !== 'hp'}
            <div class="field">
              <Label>Completion rule</Label>
              <div class="segmented-control">
                <button
                  type="button"
                  class:active={form.completionRuleType === 'count'}
                  on:click={() => setCompletionRule('count')}
                >
                  Count
                </button>
                <button
                  type="button"
                  class:active={form.completionRuleType === 'percentage'}
                  on:click={() => setCompletionRule('percentage')}
                >
                  Percentage
                </button>
              </div>
            </div>
            <div class="field">
              <Label for="pvp-event-completion-value">Completion value</Label>
              <div class="input-with-unit">
                <Input
                  id="pvp-event-completion-value"
                  bind:value={form.completionRuleValue}
                  min="1"
                  max={form.completionRuleType === 'percentage' ? 100 : 2}
                  type="number"
                />
                <span>{form.completionRuleType === 'percentage' ? '%' : 'players'}</span>
              </div>
            </div>
          {/if}

          {#if form.scoringMode === 'score'}
            <div class="field">
              <Label>Target score</Label>
              <div class="segmented-control">
                <button
                  type="button"
                  class:active={!form.targetScoreEnabled}
                  on:click={() => (form.targetScoreEnabled = false)}
                >
                  Unlimited
                </button>
                <button
                  type="button"
                  class:active={form.targetScoreEnabled}
                  on:click={() => (form.targetScoreEnabled = true)}
                >
                  Target
                </button>
              </div>
              {#if form.targetScoreEnabled}
                <Input
                  bind:value={form.targetScore}
                  min="1"
                  max="100000"
                  type="number"
                  aria-label="Target score"
                />
              {/if}
            </div>
          {/if}

          {#if form.scoringMode === 'hp'}
            <div class="field two-col">
              <div>
                <Label for="pvp-event-starting-hp">Starting HP</Label>
                <Input
                  id="pvp-event-starting-hp"
                  bind:value={form.startingHp}
                  min="1"
                  max="100000"
                  type="number"
                />
              </div>
              <div>
                <Label for="pvp-event-finalize-alive">Finalize alive count</Label>
                <Input
                  id="pvp-event-finalize-alive"
                  bind:value={form.finalizeAliveCount}
                  min="1"
                  max="100"
                  type="number"
                />
              </div>
            </div>
          {/if}
        </div>

        <div class="form-actions">
          <Button disabled={!canSave} on:click={saveEvent}>
            {#if saving}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            {:else if editingId}
              <Save class="mr-2 h-4 w-4" />
            {:else}
              <Plus class="mr-2 h-4 w-4" />
            {/if}
            {editingId ? 'Save event' : 'Create event'}
          </Button>
          {#if editingId}
            <Button variant="outline" on:click={resetForm}>
              <X class="mr-2 h-4 w-4" />
              Cancel
            </Button>
          {/if}
        </div>
      </Card.Content>
    </Card.Root>

    <section class="event-list">
      {#if loading}
        <Card.Root>
          <Card.Content class="state">
            <Loader2 class="h-5 w-5 animate-spin" />
            <span>Loading PvP events...</span>
          </Card.Content>
        </Card.Root>
      {:else if sortedEvents.length === 0}
        <Card.Root>
          <Card.Content class="state">No PvP events have been created.</Card.Content>
        </Card.Root>
      {:else}
        {#each sortedEvents as event}
          {@const status = eventStatus(event)}
          {@const id = eventId(event)}
          <Card.Root class="event-card">
            <Card.Header>
              <div class="event-card-head">
                <div>
                  <Card.Title>{event.title}</Card.Title>
                  <Card.Description>
                    #{id} - {eventListTitle(event)} - {eventMode(event)}
                  </Card.Description>
                </div>
                <div class="badges">
                  <Badge variant={statusVariant(status)}>{status}</Badge>
                  <Badge variant="outline">{eventMode(event)}</Badge>
                  <Badge variant={eventRanked(event) ? 'default' : 'secondary'}>
                    {eventRanked(event) ? 'Ranked' : 'Unranked'}
                  </Badge>
                  <Badge variant="outline">{eventLevelSelectionLabel(event)}</Badge>
                </div>
              </div>
            </Card.Header>
            <Card.Content class="event-card-content">
              {#if event.description}
                <p>{event.description}</p>
              {/if}
              <div class="event-meta">
                <span>
                  <CalendarDays class="h-4 w-4" />
                  {formatDate(event.startsAt ?? event.starts_at)}
                </span>
                <span>Ends: {formatDate(event.endsAt ?? event.ends_at)}</span>
                <span>List ID: {eventListId(event)}</span>
                <span>{eventRanked(event) ? 'Ranked' : 'Unranked'}</span>
                <span>Level selection: {eventLevelSelectionLabel(event)}</span>
                <span>Config: {eventConfigSummary(event)}</span>
              </div>
              {#if event.bannerUrl || event.banner_url}
                <a href={event.bannerUrl ?? event.banner_url} target="_blank" rel="noreferrer">
                  Banner image
                </a>
              {/if}
              <div class="event-actions">
                <Button variant="outline" size="sm" on:click={() => editEvent(event)}>
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={Boolean(actionKey)}
                  on:click={() => toggleEvent(event)}
                >
                  {#if actionKey === `toggle-${id}`}
                    <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                  {/if}
                  {event.enabled === false ? 'Enable' : 'Disable'}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={Boolean(actionKey)}
                  on:click={() => removeEvent(event)}
                >
                  {#if actionKey === `delete-${id}`}
                    <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                  {:else}
                    <Trash2 class="mr-2 h-4 w-4" />
                  {/if}
                  Delete
                </Button>
              </div>
            </Card.Content>
          </Card.Root>
        {/each}
      {/if}
    </section>
  </div>
</div>
{:else}
<div class="page">
  <Card.Root>
    <Card.Content class="state">Admin access required.</Card.Content>
  </Card.Root>
</div>
{/if}

<style lang="scss">
.page {
  width: min(100vw - 32px, 1180px);
  margin: 0 auto;
  padding: 32px 0;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 800;
}

.page-header p {
  margin: 6px 0 0;
  color: hsl(var(--muted-foreground));
}

.layout {
  display: grid;
  grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

:global(.event-form),
.event-list {
  display: grid;
  gap: 14px;
}

.field {
  display: grid;
  gap: 8px;
}

.match-config-panel {
  display: grid;
  gap: 14px;
  padding: 14px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.section-head h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
}

.section-head p {
  margin: 4px 0 0;
  color: hsl(var(--muted-foreground));
  font-size: 13px;
  line-height: 1.4;
}

.two-col {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.two-col > div {
  display: grid;
  gap: 8px;
}

.check-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
}

.form-actions,
.event-actions,
.badges,
.event-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.time-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.input-with-unit {
  display: flex;
  align-items: center;
  gap: 8px;
}

.input-with-unit span {
  color: hsl(var(--muted-foreground));
  font-size: 13px;
  white-space: nowrap;
}

.segmented-control {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.segmented-control.two-option {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.segmented-control button {
  min-height: 36px;
  padding: 0 10px;
  background: transparent;
  border: 0;
  border-right: 1px solid hsl(var(--border));
  color: hsl(var(--muted-foreground));
  font-weight: 700;
}

.segmented-control button:last-child {
  border-right: 0;
}

.segmented-control button.active {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

.event-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

:global(.event-card-content) {
  display: grid;
  gap: 12px;
}

:global(.event-card-content) p {
  margin: 0;
  color: hsl(var(--muted-foreground));
  line-height: 1.45;
}

.event-meta {
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}

.event-meta span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

:global(.state) {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 96px;
  color: hsl(var(--muted-foreground));
}

@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .page-header,
  .event-card-head {
    align-items: stretch;
    flex-direction: column;
  }
}

@media (max-width: 640px) {
  .two-col,
  .time-grid,
  .section-head {
    grid-template-columns: 1fr;
  }

  .section-head {
    display: grid;
  }
}
</style>
