<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
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
		Layers,
		Clock,
		Gamepad2,
		Footprints
	} from 'lucide-svelte';
	import { _ } from 'svelte-i18n';

	type Visibility = 'public' | 'unlisted' | 'private';
	type Mode = 'rating' | 'top';
	type ItemSort = 'mode_default' | 'created_at';
	type ListType = 'classic' | 'platformer';

	let form: {
		title: string;
		description: string;
		visibility: Visibility | null;
		mode: Mode | null;
		itemSort: ItemSort | null;
		listType: ListType | null;
		tagsInput: string;
	} = {
		title: '',
		description: '',
		visibility: null,
		mode: null,
		itemSort: null,
		listType: null,
		tagsInput: ''
	};

	let creating = false;

	function getQuickLevelId() {
		const raw = $page.url.searchParams.get('levelId');
		const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
		return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
	}

	$: quickLevelId = getQuickLevelId();

	function parseTags(value: string) {
		return value
			.split(',')
			.map((t) => t.trim())
			.filter((t) => t.length > 0);
	}

	async function createList() {
		if (!form.title.trim()) {
			toast.error($_('custom_lists.toast.title_required'));
			return;
		}

		if (!form.visibility) {
			toast.error('Please choose a visibility');
			return;
		}

		if (!form.mode) {
			toast.error('Please choose a mode');
			return;
		}

		if (!form.itemSort) {
			toast.error('Please choose a sort type');
			return;
		}

		if (!form.listType) {
			toast.error('Please choose a list type');
			return;
		}

		creating = true;

		try {
			const body: Record<string, unknown> = {
				title: form.title,
				description: form.description,
				visibility: form.visibility,
				mode: form.mode,
				itemSort: form.itemSort,
				isPlatformer: form.listType === 'platformer'
			};

			const tags = parseTags(form.tagsInput);
			if (tags.length > 0) {
				body.tags = tags;
			}

			const res = await fetch(`${import.meta.env.VITE_API_URL}/lists`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(body)
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
	<title>{$_('head.titles.new_list')} - {$_('head.site_name')}</title>
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
					<span class="fieldLabel">Visibility <span class="required">*</span></span>
					<div class="optionRow">
						<button
							type="button"
							class="optionBtn"
							class:selected={form.visibility === 'public'}
							on:click={() => (form.visibility = 'public')}
						>
							<Globe2 size={16} /> Public
						</button>
						<button
							type="button"
							class="optionBtn"
							class:selected={form.visibility === 'unlisted'}
							on:click={() => (form.visibility = 'unlisted')}
						>
							<EyeOff size={16} /> Unlisted
						</button>
						<button
							type="button"
							class="optionBtn"
							class:selected={form.visibility === 'private'}
							on:click={() => (form.visibility = 'private')}
						>
							<Lock size={16} /> Private
						</button>
					</div>
				</div>

				<div class="field">
					<span class="fieldLabel">Mode <span class="required">*</span></span>
					<div class="optionRow">
						<button
							type="button"
							class="optionBtn"
							class:selected={form.mode === 'rating'}
							on:click={() => (form.mode = 'rating')}
						>
							<Star size={16} /> Rating
						</button>
						<button
							type="button"
							class="optionBtn"
							class:selected={form.mode === 'top'}
							on:click={() => (form.mode = 'top')}
						>
							<ListOrdered size={16} /> Top
						</button>
					</div>
				</div>

				<div class="field">
					<span class="fieldLabel">Sort <span class="required">*</span></span>
					<div class="optionRow">
						<button
							type="button"
							class="optionBtn"
							class:selected={form.itemSort === 'mode_default'}
							on:click={() => (form.itemSort = 'mode_default')}
						>
							<Layers size={16} /> Mode default
						</button>
						<button
							type="button"
							class="optionBtn"
							class:selected={form.itemSort === 'created_at'}
							on:click={() => (form.itemSort = 'created_at')}
						>
							<Clock size={16} /> Date added
						</button>
					</div>
				</div>

				<div class="field">
					<span class="fieldLabel">List type <span class="required">*</span></span>
					<div class="optionRow">
						<button
							type="button"
							class="optionBtn"
							class:selected={form.listType === 'classic'}
							on:click={() => (form.listType = 'classic')}
						>
							<Gamepad2 size={16} /> Classic
						</button>
						<button
							type="button"
							class="optionBtn"
							class:selected={form.listType === 'platformer'}
							on:click={() => (form.listType = 'platformer')}
						>
							<Footprints size={16} /> Platformer
						</button>
					</div>
				</div>

				<div class="field">
					<label for="list-tags">Tags</label>
					<Input
						id="list-tags"
						bind:value={form.tagsInput}
						maxlength={300}
						placeholder="Comma-separated, e.g. speedrun, memory, duo"
					/>
					<p class="hint">Up to 10 tags, 30 characters each.</p>
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

	label {
		font-size: 0.9rem;
		font-weight: 500;
	}

	.fieldLabel {
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
