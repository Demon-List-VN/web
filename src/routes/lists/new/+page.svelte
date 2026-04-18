<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { goto } from '$app/navigation';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';
	import { ArrowLeft, ListPlus } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';

	const visibilityOptions: Array<'private' | 'unlisted' | 'public'> = [
		'private',
		'unlisted',
		'public'
	];

	const modeOptions: Array<'rating' | 'top'> = ['rating', 'top'];

	let form = {
		title: '',
		description: '',
		visibility: 'private' as 'private' | 'unlisted' | 'public',
		tags: '',
		mode: 'rating' as 'rating' | 'top'
	};

	let creating = false;

	function parseTags(tags: string) {
		return tags
			.split(',')
			.map((tag) => tag.trim())
			.filter(Boolean);
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
					mode: form.mode
				})
			});

			const payload = await res.json();

			if (!res.ok) {
				throw new Error(payload.error || $_('custom_lists.toast.failed_create'));
			}

			toast.success($_('custom_lists.toast.list_created'));
			goto(`/lists/${payload.id}/manage`);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : $_('custom_lists.toast.failed_create'));
		} finally {
			creating = false;
		}
	}
</script>

<svelte:head>
	<title>{$_('custom_lists.new.page_title')} - Geometry Dash Việt Nam</title>
</svelte:head>

<div class="page">
	<Button variant="outline" on:click={() => goto('/lists')}>
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
			<h2>{$_('custom_lists.new.sign_in_title')}</h2>
			<p>{$_('custom_lists.new.sign_in_desc')}</p>
		</div>
	{:else}
		<Card.Root class="formCard">
			<Card.Content class="pt-6">
				<div class="formGrid">
					<div class="field">
						<label for="list-title">{$_('custom_lists.new.title_label')} <span class="required">*</span></label>
						<Input id="list-title" bind:value={form.title} maxlength={100} placeholder={$_('custom_lists.new.title_placeholder')} />
					</div>

					<div class="field">
						<label for="list-description">Description</label>
						<Textarea
							id="list-description"
							bind:value={form.description}
							rows={4}
							placeholder="Describe what levels are in this list…"
						/>
					</div>

					<div class="field">
						<span class="fieldLabel">{$_('custom_lists.new.visibility_label')}</span>
						<div class="visibilityRow">
							{#each visibilityOptions as v}
								<button
									type="button"
									class:selected={form.visibility === v}
									on:click={() => (form.visibility = v)}
								>
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
						<div class="visibilityRow">
							{#each modeOptions as m}
								<button
									type="button"
									class:selected={form.mode === m}
									on:click={() => (form.mode = m)}
								>
									{m === 'rating' ? $_('custom_lists.detail.edit.mode_rating') : $_('custom_lists.detail.edit.mode_top')}
								</button>
							{/each}
						</div>
						<p class="hint">{form.mode === 'rating' ? $_('custom_lists.new.mode_rating_hint') : $_('custom_lists.new.mode_top_hint')}</p>
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
			</Card.Content>
		</Card.Root>
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
		font-size: 1.6rem;
	}

	.pageHeader p {
		margin: 0;
		color: hsl(var(--muted-foreground));
	}

	:global(.formCard) {
		border: 1px solid hsl(var(--border));
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

	label,
	.fieldLabel {
		font-size: 0.95rem;
		font-weight: 500;
	}

	.required {
		color: hsl(var(--destructive));
	}

	.visibilityRow {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.visibilityRow button {
		border: 1px solid hsl(var(--border));
		background: transparent;
		color: hsl(var(--foreground));
		padding: 8px 16px;
		border-radius: 999px;
		cursor: pointer;
		transition: background 0.2s ease, border-color 0.2s ease;
	}

	.visibilityRow button.selected {
		background: hsl(var(--primary) / 0.12);
		border-color: hsl(var(--primary));
	}

	.hint {
		font-size: 0.875rem;
		color: hsl(var(--muted-foreground));
		margin: 0;
	}

	.actionRow {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 24px;
	}

	.emptyState {
		border: 1px dashed hsl(var(--border));
		border-radius: 16px;
		padding: 32px 20px;
		text-align: center;
		background: hsl(var(--muted) / 0.18);
	}

	.emptyState h2,
	.emptyState p {
		margin: 0;
	}

	.emptyState h2 {
		margin-bottom: 6px;
	}

	.emptyState p {
		color: hsl(var(--muted-foreground));
	}
</style>
