<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';
	import { Switch } from '$lib/components/ui/switch';
	import { createEventDispatcher } from 'svelte';
	import { Pin, ChevronDown, ChevronUp, Lock, Filter, Funnel } from 'lucide-svelte';
	import { browser } from '$app/environment';
	import { user } from '$lib/client';
	import { isActive } from '$lib/client/isSupporterActive';
	import { toast } from 'svelte-sonner';
	import { _ } from 'svelte-i18n';

	export let listType: 'dl' | 'pl' | 'fl' | 'cl' = 'dl';

	let topStart = '';
	let topEnd = '';
	let ratingMin = '';
	let ratingMax = '';
	let nameSearch = '';
	let creatorSearch = '';
	let sortBy = '';
	let isPinned = false;
	let isCollapsed = true;
	let ascending = listType !== 'cl';

	$: defaultTopColumn =
		listType === 'fl' ? 'flTop' : listType === 'cl' ? 'created_at' : 'dlTop';

	const dispatch = createEventDispatcher();

	function togglePin() {
		isPinned = !isPinned;
	}

	function toggleCollapse() {
		if (isCollapsed && (!$user.loggedIn || !isActive($user.data?.supporterUntil))) {
			toast.error($_('list_filter.supporter_only'));
			return;
		}

		isCollapsed = !isCollapsed;
	}

	function handleApplyFilters() {
		dispatch('filter', {
			topStart: topStart.trim() === '' ? null : topStart,
			topEnd: topEnd.trim() === '' ? null : topEnd,
			ratingMin: ratingMin.trim() === '' ? null : ratingMin,
			ratingMax: ratingMax.trim() === '' ? null : ratingMax,
			nameSearch: nameSearch.trim(),
			creatorSearch: creatorSearch.trim(),
			sortBy: sortBy.trim() === '' ? null : sortBy,
			ascending: ascending
		});
	}

	function handleClearFilters() {
		topStart = '';
		topEnd = '';
		ratingMin = '';
		ratingMax = '';
		nameSearch = '';
		creatorSearch = '';
		sortBy = '';
		ascending = listType !== 'cl';

		dispatch('filter', {
			topStart: null,
			topEnd: null,
			ratingMin: null,
			ratingMax: null,
			nameSearch: '',
			creatorSearch: '',
			sortBy: defaultTopColumn,
			ascending
		});
	}
</script>

<div class="filterWrapper" class:pinned={isPinned}>
	<Card.Root class="filterCard">
		<Card.Header>
			<div class="headerContent">
				<div class="headerTitle">
					<span>{$_('list_filter.title')}</span>
				</div>
				<div class="headerButtons">
					<button
						class="iconButton"
						class:active={isPinned}
						on:click={togglePin}
						title={isPinned ? $_('list_filter.unpin') : $_('list_filter.pin')}
					>
						<div class="pinIcon" class:pinned={isPinned}>
							<Pin size={18} />
						</div>
					</button>
					<button
						class="iconButton collapseButton"
						class:locked={isCollapsed && (!$user.loggedIn || !isActive($user.data?.supporterUntil))}
						class:expanded={!isCollapsed}
						on:click={toggleCollapse}
						title={isCollapsed
							? !$user.loggedIn || !isActive($user.data?.supporterUntil)
								? $_('list_filter.supporter_exclusive')
								: $_('list_filter.expand')
							: $_('list_filter.collapse')}
					>
						{#if isCollapsed}
							{#if !$user.loggedIn || !isActive($user.data?.supporterUntil)}
								<Lock size={18} />
							{:else}
								<ChevronDown size={18} />
							{/if}
						{:else}
							<ChevronUp size={18} />
						{/if}
					</button>
				</div>
			</div>
		</Card.Header>
		{#if !isCollapsed}
			<Card.Content>
				<div class="filterGrid">
					<div class="filterRow">
						<div class="filterGroup">
							<Label for="topStart">{$_('list_filter.top_range')}</Label>
							<div class="rangeInputs">
								<Input
									id="topStart"
									type="number"
									placeholder={$_('list_filter.from')}
									bind:value={topStart}
									on:keypress={(e) => e.key === 'Enter' && handleApplyFilters()}
								/>
								<span class="rangeSeparator">-</span>
								<Input
									id="topEnd"
									type="number"
									placeholder={$_('list_filter.to')}
									bind:value={topEnd}
									on:keypress={(e) => e.key === 'Enter' && handleApplyFilters()}
								/>
							</div>
						</div>
						<div class="filterGroup">
							<Label for="ratingMin">{$_('list_filter.rating_range')}</Label>
							<div class="rangeInputs">
								<Input
									id="ratingMin"
									type="number"
									placeholder={$_('list_filter.min')}
									bind:value={ratingMin}
									on:keypress={(e) => e.key === 'Enter' && handleApplyFilters()}
								/>
								<span class="rangeSeparator">-</span>
								<Input
									id="ratingMax"
									type="number"
									placeholder={$_('list_filter.max')}
									bind:value={ratingMax}
									on:keypress={(e) => e.key === 'Enter' && handleApplyFilters()}
								/>
							</div>
						</div>
					</div>
					<div class="filterRow">
						<div class="filterGroup">
							<Label for="nameSearch">{$_('list_filter.level_name')}</Label>
							<Input
								id="nameSearch"
								type="text"
								placeholder={$_('list_filter.search_by_name')}
								bind:value={nameSearch}
								on:keypress={(e) => e.key === 'Enter' && handleApplyFilters()}
							/>
						</div>
						<div class="filterGroup">
							<Label for="creatorSearch">{$_('list_filter.creator_name')}</Label>
							<Input
								id="creatorSearch"
								type="text"
								placeholder={$_('list_filter.search_by_creator')}
								bind:value={creatorSearch}
								on:keypress={(e) => e.key === 'Enter' && handleApplyFilters()}
							/>
						</div>
					</div>
					<div class="filterRow">
						<div class="filterGroup">
							<Label for="sortBy">{$_('list_filter.sort_by')}</Label>
							<Select.Root
								onSelectedChange={(v) => {
									sortBy = v?.value ? String(v.value) : '';
								}}
							>
								<Select.Trigger class="w-full">
									<Select.Value placeholder={$_('list_filter.sort_by_date')} />
								</Select.Trigger>
								<Select.Content>
									<Select.Item value={defaultTopColumn}>{$_('list_filter.sort_by_top')}</Select.Item
									>
									<Select.Item value="created_at">{$_('list_filter.sort_by_date')}</Select.Item>
								</Select.Content>
							</Select.Root>
						</div>
						<div class="filterGroup">
							<Label for="ascending">{$_('list_filter.ascending')}</Label>
							<div class="flex h-10 items-center">
								<Switch id="ascending" bind:checked={ascending} />
							</div>
						</div>
					</div>
				</div>
				<div class="filterActions">
					<Button on:click={handleApplyFilters}>{$_('list_filter.apply')}</Button>
					<Button variant="outline" on:click={handleClearFilters}>{$_('list_filter.clear')}</Button>
				</div>
			</Card.Content>
		{/if}
	</Card.Root>
</div>

<style lang="scss">
	.filterWrapper {
		margin-bottom: 20px;
		max-width: 1010px;
		width: 100%;
		margin-inline: auto;
		transition: all 0.3s ease;
	}

	.filterWrapper.pinned {
		position: sticky;
		top: 80px;
		z-index: 100;
		margin-bottom: 20px;
	}

	:global(.filterCard) {
		width: 100%;
	}

	.headerContent {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.headerTitle {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 1.125rem;
		font-weight: 600;
	}

	.headerButtons {
		display: flex;
		gap: 8px;
	}

	.iconButton {
		background: none;
		border: none;
		cursor: pointer;
		padding: 4px;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--muted-foreground);
		transition: all 0.2s ease;
	}

	.iconButton:hover {
		background: var(--accent);
		color: var(--accent-foreground);
	}

	.iconButton.active {
		color: var(--primary);
		background: var(--accent);
	}

	.iconButton.locked {
		color: var(--muted-foreground);
		opacity: 0.6;
	}

	.iconButton.locked:hover {
		color: var(--destructive);
		opacity: 1;
	}

	.pinIcon {
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.3s ease;
	}

	.pinIcon.pinned {
		transform: rotate(90deg);
	}

	.collapseButton {
		transition:
			transform 0.3s ease,
			all 0.2s ease;
	}

	.collapseButton.expanded {
		transform: rotate(180deg);
	}

	.filterGrid {
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin-bottom: 16px;
	}

	.filterRow {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}

	.filterGroup {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.rangeInputs {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.rangeSeparator {
		font-weight: bold;
		color: var(--muted-foreground);
	}

	.filterActions {
		display: flex;
		gap: 8px;
		justify-content: flex-end;
	}

	@media screen and (max-width: 768px) {
		.filterRow {
			grid-template-columns: 1fr;
		}

		.filterActions {
			justify-content: stretch;
			flex-direction: column;
		}
	}
</style>
