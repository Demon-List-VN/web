<script lang="ts">
	import { createEventDispatcher, onMount, tick } from 'svelte';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Input } from '$lib/components/ui/input';
	import Loading from '$lib/components/animation/loading.svelte';
	import { user } from '$lib/client';
	import { isActive } from '$lib/client/isSupporterActive';
	import { Search, X, ChevronDown } from 'lucide-svelte';
	import { t } from 'svelte-i18n';

	export let placeholder = $t('playerSelector.search_placeholder');
	export let value: any = null;
	export let disabled = false;

	let searchValue = '';
	let searchResults: any[] = [];
	let isSearching = false;
	let searchTimeout: any = null;
	let showDropdown = false;
	let containerElement: HTMLDivElement;
	let dropdownElement: HTMLDivElement;

	const dispatch = createEventDispatcher();

	async function getSearchAuthHeaders(): Promise<Record<string, string>> {
		const token = $user ? await $user.token() : null;
		const headers: Record<string, string> = {};

		if (token) {
			headers.Authorization = `Bearer ${token}`;
		}

		return headers;
	}

	async function searchPlayers() {
		if (searchValue.length < 2) {
			searchResults = [];
			return;
		}

		isSearching = true;
		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/search/${searchValue}`, {
				headers: await getSearchAuthHeaders()
			});
			const data = await res.json();
			searchResults = data.players || [];
		} catch (err) {
			searchResults = [];
		}
		isSearching = false;
	}

	function handleSearchInput() {
		clearTimeout(searchTimeout);
		showDropdown = true;
		searchTimeout = setTimeout(() => {
			searchPlayers();
		}, 300);
	}

	async function selectPlayer(player: any) {
		value = player;
		searchValue = player.name;
		// Blur the input to prevent focus from reopening dropdown
		const inputEl = containerElement?.querySelector('input');
		if (inputEl) inputEl.blur();
		await tick();
		showDropdown = false;
		dispatch('select', player);
	}

	function clearSelection() {
		value = null;
		searchValue = '';
		searchResults = [];
		showDropdown = false;
		dispatch('clear');
	}

	function handleClickOutside(event: MouseEvent) {
		if (containerElement && !containerElement.contains(event.target as Node)) {
			showDropdown = false;
		}
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});

	$: (searchValue, handleSearchInput());
	$: if (value) {
		searchValue = value.name;
	}
</script>

<div class="player-selector" bind:this={containerElement}>
	<div class="input-wrapper">
		<Search class="absolute top-[7px] left-[10px]" size={18} />
		<Input
			bind:value={searchValue}
			{placeholder}
			{disabled}
			class="pl-10 pr-20"
			on:focus={() => (showDropdown = true)}
		/>
		<div class="input-actions">
			{#if searchValue}
				<button on:click={clearSelection} class="action-button" type="button" {disabled}>
					<X class="h-4 w-4" />
				</button>
			{/if}
			<button
				on:click={() => (showDropdown = !showDropdown)}
				class="action-button"
				type="button"
				{disabled}
			>
				<ChevronDown class="h-4 w-4" />
			</button>
		</div>
	</div>

	{#if showDropdown}
		<div bind:this={dropdownElement} class="dropdown">
			{#if isSearching}
				<div class="dropdown-loading">
					<Loading inverted={true} />
				</div>
			{:else if searchValue.length < 2}
				<div class="dropdown-empty">
					<Search class="h-8 w-8 text-muted-foreground opacity-50" />
					<p class="text-sm text-muted-foreground">{$t('playerSelector.type_to_search')}</p>
				</div>
			{:else if searchResults.length === 0}
				<div class="dropdown-empty">
					<p class="text-sm text-muted-foreground">{$t('playerSelector.no_players_found')}</p>
					<p class="text-xs text-muted-foreground">
						{$t('playerSelector.try_different_name')} <code>discord:USER_ID</code>
					</p>
				</div>
			{:else}
				<div class="dropdown-list">
					{#each searchResults as player}
						<button class="dropdown-item" on:click={() => selectPlayer(player)} type="button">
							<Avatar.Root class="h-10 w-10">
								<Avatar.Image
									class="object-cover"
									src={`https://cdn.gdvn.net/avatars/${player.uid}${
										isActive(player.supporterUntil) && player.isAvatarGif ? '.gif' : '.jpg'
									}`}
									alt={player.name}
								/>
								<Avatar.Fallback>{player.name[0]}</Avatar.Fallback>
							</Avatar.Root>
							<div class="player-info">
								<h4 class={isActive(player.supporterUntil) ? 'text-yellow-500' : ''}>
									{player.name}
									{#if player.clan && player.clans}
										<span class="clan-tag">[{player.clans.tag}]</span>
									{/if}
								</h4>
								<div class="player-stats">
									{#if player.rating}
										<span class="stat">{$t('playerSelector.rating')}: {player.rating}</span>
									{/if}
									{#if player.overallRank}
										<span class="stat">{$t('playerSelector.rank')}: #{player.overallRank}</span>
									{/if}
									{#if player.province}
										<span class="stat">{player.province}</span>
									{/if}
								</div>
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style lang="scss">
	.player-selector {
		position: relative;
		width: 100%;
	}

	.input-wrapper {
		position: relative;
		width: 100%;

		.input-actions {
			position: absolute;
			right: 0.75rem;
			top: 50%;
			transform: translateY(-50%);
			display: flex;
			gap: 0.25rem;
		}

		.action-button {
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 0.25rem;
			border-radius: 0.25rem;
			background: transparent;
			border: none;
			color: hsl(var(--muted-foreground));
			cursor: pointer;
			transition: all 0.2s;

			&:hover:not(:disabled) {
				color: hsl(var(--foreground));
				background-color: hsl(var(--muted) / 0.5);
			}

			&:disabled {
				opacity: 0.5;
				cursor: not-allowed;
			}
		}
	}

	.dropdown {
		position: absolute;
		top: calc(100% + 0.25rem);
		left: 0;
		right: 0;
		background-color: hsl(var(--popover));
		border: 1px solid hsl(var(--border));
		border-radius: 0.5rem;
		box-shadow:
			0 10px 15px -3px rgb(0 0 0 / 0.1),
			0 4px 6px -4px rgb(0 0 0 / 0.1);
		z-index: 50;
		max-height: 400px;
		overflow: hidden;
	}

	.dropdown-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 3rem;
	}

	.dropdown-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		gap: 0.5rem;
		text-align: center;

		code {
			background-color: hsl(var(--muted));
			padding: 0.125rem 0.375rem;
			border-radius: 0.25rem;
			font-size: 0.875rem;
			font-family: monospace;
		}
	}

	.dropdown-list {
		max-height: 400px;
		overflow-y: auto;
		padding: 0.25rem;
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		border-radius: 0.375rem;
		border: 1px solid transparent;
		background-color: transparent;
		cursor: pointer;
		transition: all 0.2s;
		width: 100%;
		text-align: left;

		&:hover {
			background-color: hsl(var(--muted) / 0.5);
			border-color: hsl(var(--border));
		}

		&:active {
			background-color: hsl(var(--muted));
		}
	}

	.player-info {
		flex: 1;
		min-width: 0;

		h4 {
			font-weight: 600;
			font-size: 0.875rem;
			margin-bottom: 0.25rem;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;

			.clan-tag {
				color: hsl(var(--muted-foreground));
				font-weight: 500;
				margin-left: 0.25rem;
			}
		}
	}

	.player-stats {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;

		.stat {
			font-size: 0.75rem;
			color: hsl(var(--muted-foreground));
			white-space: nowrap;
		}
	}

	@media screen and (max-width: 640px) {
		.dropdown-item {
			gap: 0.5rem;
			padding: 0.5rem;
		}

		.player-info h4 {
			font-size: 0.8125rem;
		}

		.player-stats {
			gap: 0.375rem;

			.stat {
				font-size: 0.6875rem;
			}
		}
	}
</style>
