<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import WeightFormulaPreview from '$lib/components/custom-lists/WeightFormulaPreview.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import { Textarea } from '$lib/components/ui/textarea';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';
	import {
		ArrowLeft,
		ListPlus,
		Globe2,
		EyeOff,
		Lock,
		Star,
		ListOrdered,
		Layers
	} from 'lucide-svelte';
	import { _ } from 'svelte-i18n';

	const visibilityOptions: Array<'private' | 'unlisted' | 'public'> = ['private', 'unlisted', 'public'];
	const modeOptions: Array<'rating' | 'top'> = ['rating', 'top'];

	let form = {
		title: '',
		description: '',
		visibility: 'private' as 'private' | 'unlisted' | 'public',
		tags: '',
		mode: 'rating' as 'rating' | 'top',
		isPlatformer: false,
		communityEnabled: true,
		weightFormula: '1'
	};

	let creating = false;

	function getQuickLevelId() {
		const raw = $page.url.searchParams.get('levelId');
		const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
		return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
	}

	$: quickLevelId = getQuickLevelId();

	function parseTags(tags: string) {
		return tags.split(',').map((tag) => tag.trim()).filter(Boolean);
	}

	function getVisibilityIcon(v: string) {
		if (v === 'public') return Globe2;
		if (v === 'unlisted') return EyeOff;
		return Lock;
	}

	async function createList() {
		if (!form.title.trim()) {
			toast.error($_('custom_lists.toast.title_required'));
			return;
		}

		creating = true;

		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					title: form.title,
					description: form.description,
					visibility: form.visibility,
					tags: parseTags(form.tags),
					mode: form.mode,
					isPlatformer: form.isPlatformer,
					communityEnabled: form.communityEnabled,
					weightFormula: form.weightFormula
				})
			});

			const payload = await res.json();

			if (!res.ok) {
				throw new Error(payload.error || $_('custom_lists.toast.failed_create'));
			}

			toast.success($_('custom_lists.toast.list_created'));

			const targetUrl = quickLevelId
				? `/lists/${payload.id}/manage?levelId=${quickLevelId}`
				: `/lists/${payload.id}/manage`;
			goto(targetUrl);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_create'));
		} finally {
			creating = false;
		}
	}
</script>

<svelte:head>
	<title>Danh sách mới - Geometry Dash Việt Nam</title>
</svelte:head>

<div class="page">
	<Button variant="ghost" size="sm" on:click={() => goto('/lists')}>
		<ArrowLeft class="mr-2 h-4 w-4" />
		{$_('custom_lists.back')}
	</Button>

	<div class="pageHeader">
		<h1>{$_('custom_lists.new.heading')}</h1>
		<p>{$_('custom_lists.new.subtitle')}</p>
	</div>

	{#if !$user.checked}
		<div class="emptyState">{$_('custom_lists.new.loading')}</div>
	{:else if !$user.loggedIn}
		<div class="emptyState">
			<h3>{$_('custom_lists.new.sign_in_title')}</h3>
			<p>{$_('custom_lists.new.sign_in_desc')}</p>
		</div>
	{:else}
		<div class="formCard">
			<div class="formGrid">
				<div class="field">
					<label for="list-title">{$_('custom_lists.new.title_label')} <span class="required">*</span></label>
					<Input id="list-title" bind:value={form.title} maxlength={100} placeholder={$_('custom_lists.new.title_placeholder')} />
				</div>

				<div class="field">
					<label for="list-description">{$_('custom_lists.new.description_label')}</label>
					<Textarea
						id="list-description"
						bind:value={form.description}
						rows={3}
						placeholder={$_('custom_lists.new.description_placeholder')}
					/>
				</div>

				<div class="field">
					<span class="fieldLabel">{$_('custom_lists.new.visibility_label')}</span>
					<div class="optionRow">
						{#each visibilityOptions as v}
							<button
								type="button"
								class="optionBtn"
								class:selected={form.visibility === v}
								on:click={() => (form.visibility = v)}
							>
								<svelte:component this={getVisibilityIcon(v)} class="h-3.5 w-3.5" />
								{#if v === 'public'}{$_('custom_lists.visibility.public')}{:else if v === 'unlisted'}{$_('custom_lists.visibility.unlisted')}{:else}{$_('custom_lists.visibility.private')}{/if}
							</button>
						{/each}
					</div>
					<p class="hint">
						{#if form.visibility === 'public'}
							{$_('custom_lists.new.visibility_public_hint')}
						{:else if form.visibility === 'unlisted'}
							{$_('custom_lists.new.visibility_unlisted_hint')}
						{:else}
							{$_('custom_lists.new.visibility_private_hint')}
						{/if}
					</p>
				</div>

				<div class="field">
					<span class="fieldLabel">{$_('custom_lists.new.mode_label')}</span>
					<div class="optionRow">
						{#each modeOptions as m}
							<button
								type="button"
								class="optionBtn"
								class:selected={form.mode === m}
								on:click={() => (form.mode = m)}
							>
								{#if m === 'rating'}<Star class="h-3.5 w-3.5" />{:else}<ListOrdered class="h-3.5 w-3.5" />{/if}
								{m === 'rating' ? $_('custom_lists.detail.edit.mode_rating') : $_('custom_lists.detail.edit.mode_top')}
							</button>
						{/each}
					</div>
					<p class="hint">{form.mode === 'rating' ? $_('custom_lists.new.mode_rating_hint') : $_('custom_lists.new.mode_top_hint')}</p>
				</div>

				<div class="field">
					<div class="switchRow">
						<div>
							<label for="list-platformer">{$_('custom_lists.new.type_label')}</label>
							<p class="hint">{$_('custom_lists.new.type_hint')}</p>
						</div>
						<div class="switchControl">
							<span class="switchLabel">{form.isPlatformer ? $_('custom_lists.type.platformer') : $_('custom_lists.type.classic')}</span>
							<Switch id="list-platformer" bind:checked={form.isPlatformer} />
						</div>
					</div>
				</div>

				<div class="field">
					<div class="switchRow">
						<div>
							<label for="list-community-enabled">{$_('custom_lists.new.community_label')}</label>
							<p class="hint">{$_('custom_lists.new.community_hint')}</p>
						</div>
						<div class="switchControl">
							<span class="switchLabel">{form.communityEnabled ? $_('general.yes') : $_('general.no')}</span>
							<Switch id="list-community-enabled" bind:checked={form.communityEnabled} />
						</div>
					</div>
				</div>

				<div class="field">
					<label for="list-tags">{$_('custom_lists.new.tags_label')}</label>
					<Input
						id="list-tags"
						bind:value={form.tags}
						placeholder={$_('custom_lists.new.tags_placeholder')}
					/>
					<p class="hint">{$_('custom_lists.new.tags_hint')}</p>
				</div>

				<div class="field">
					<label for="list-weight-formula">{$_('custom_lists.formula.label')}</label>
					<Textarea
						id="list-weight-formula"
						bind:value={form.weightFormula}
						placeholder={$_('custom_lists.formula.placeholder')}
						rows={5}
					/>
					<p class="hint">{$_('custom_lists.formula.hint')}</p>
					<WeightFormulaPreview formula={form.weightFormula} isPlatformer={form.isPlatformer} mode={form.mode} />
				</div>
			</div>

			<div class="actionRow">
				<Button on:click={createList} disabled={creating}>
					<ListPlus class="mr-2 h-4 w-4" />
					{creating ? $_('custom_lists.new.creating') : $_('custom_lists.new.create_button')}
				</Button>
				<Button variant="outline" on:click={() => goto('/lists')} disabled={creating}>
					{$_('custom_lists.new.cancel')}
				</Button>
			</div>
		</div>
	{/if}
</div>

<style lang="scss">
	.page {
		max-width: 680px;
		margin: 0 auto;
		padding: 24px 16px 48px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.pageHeader h1 {
		margin: 0 0 4px;
		font-size: 1.5rem;
		font-weight: 700;
		letter-spacing: -0.01em;
	}

	.pageHeader p {
		margin: 0;
		color: hsl(var(--muted-foreground));
		font-size: 0.9rem;
	}

	.formCard {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.formGrid {
		display: grid;
		gap: 18px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	label, .fieldLabel {
		font-size: 0.9rem;
		font-weight: 500;
	}

	.required {
		color: hsl(var(--destructive));
	}

	.optionRow {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.optionBtn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		border: 1px solid hsl(var(--border));
		background: transparent;
		color: hsl(var(--foreground));
		padding: 8px 16px;
		border-radius: 999px;
		cursor: pointer;
		font-size: 0.85rem;
		transition: background 0.15s ease, border-color 0.15s ease;
	}

	.optionBtn:hover {
		background: hsl(var(--muted) / 0.5);
	}

	.optionBtn.selected {
		background: hsl(var(--primary) / 0.12);
		border-color: hsl(var(--primary));
	}

	.switchRow {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}

	.switchControl {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.switchLabel {
		font-size: 0.9rem;
		font-weight: 500;
	}

	.hint {
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
		margin: 0;
	}

	.actionRow {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 10px;
	}

	.emptyState {
		border: 1px dashed hsl(var(--border));
		border-radius: 12px;
		padding: 40px 24px;
		text-align: center;
		background: hsl(var(--muted) / 0.12);
	}

	.emptyState h3 {
		margin: 0 0 6px;
		font-size: 1.05rem;
		font-weight: 600;
	}

	.emptyState p {
		margin: 0;
		color: hsl(var(--muted-foreground));
		font-size: 0.9rem;
	}

	@media (max-width: 480px) {
		.formCard {
			padding: 18px 16px;
		}

		.pageHeader h1 {
			font-size: 1.25rem;
		}

		.optionBtn {
			padding: 6px 12px;
			font-size: 0.8rem;
		}
	}
</style>
