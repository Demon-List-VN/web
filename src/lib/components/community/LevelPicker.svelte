<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Search, Gamepad2 } from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';

	export let show = false;

	const dispatch = createEventDispatcher<{ select: any }>();

	let levelSearchQuery = '';
	let levelSearchResults: any[] = [];
	let levelSearchTimer: ReturnType<typeof setTimeout>;

	function searchLevels() {
		clearTimeout(levelSearchTimer);
		levelSearchTimer = setTimeout(async () => {
			if (!levelSearchQuery.trim()) {
				levelSearchResults = [];
				return;
			}
			try {
				const res = await fetch(
					`https://gdbrowser.com/api/search/${encodeURIComponent(levelSearchQuery)}?page=0&count=5&diff=-2`
				);
				if (!res.ok) throw new Error();
				levelSearchResults = await res.json();
			} catch {
				levelSearchResults = [];
			}
		}, 400);
	}

	function selectLevel(level: any) {
		dispatch('select', {
			id: level.id || level.levelID,
			name: level.name,
			creator: level.author || level.creator,
			isPlatformer: level.platformer === true
		});
		show = false;
		levelSearchQuery = '';
		levelSearchResults = [];
	}

	$: if (!show) {
		levelSearchQuery = '';
		levelSearchResults = [];
	}
</script>

{#if show}
	<div class="levelPickerDropdown">
		<div class="levelPickerSearch">
			<Search class="h-4 w-4 text-muted-foreground" />
			<input
				type="text"
				bind:value={levelSearchQuery}
				on:input={searchLevels}
				placeholder={$_('community.comment.search_levels')}
				class="levelPickerInput"
			/>
		</div>
		{#if levelSearchResults.length > 0}
			<div class="levelPickerResults">
				{#each levelSearchResults as level}
					<!-- svelte-ignore a11y-click-events-have-key-events -->
					<!-- svelte-ignore a11y-no-static-element-interactions -->
					<div class="levelPickerOption" on:click={() => selectLevel(level)}>
						<Gamepad2 class="h-4 w-4 text-emerald-500" />
						<div class="levelPickerInfo">
							<span class="levelPickerName">{level.name}</span>
							<span class="levelPickerCreator">{level.author || level.creator}</span>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<style lang="scss">
	.levelPickerDropdown {
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		background: hsl(var(--card));
		overflow: hidden;
	}

	.levelPickerSearch {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		border-bottom: 1px solid hsl(var(--border));
	}

	.levelPickerInput {
		flex: 1;
		border: none;
		background: transparent;
		font-size: 13px;
		color: hsl(var(--foreground));
		outline: none;
	}

	.levelPickerResults {
		max-height: 200px;
		overflow-y: auto;
	}

	.levelPickerOption {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 12px;
		cursor: pointer;
		transition: background 0.1s;

		&:hover {
			background: hsl(var(--accent));
		}
	}

	.levelPickerInfo {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.levelPickerName {
		font-size: 13px;
		font-weight: 500;
	}

	.levelPickerCreator {
		font-size: 11px;
		color: hsl(var(--muted-foreground));
	}
</style>
