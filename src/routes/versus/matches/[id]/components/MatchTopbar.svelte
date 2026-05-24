<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		ArrowLeft,
		Eye,
		EyeOff,
		Flag,
		Loader2,
		RefreshCw,
		Send
	} from 'lucide-svelte';
	import { _ } from 'svelte-i18n';

	export let title = '';
	export let loggedIn = false;
	export let loading = false;
	export let actionLoading = '';
	export let hideOpponentInfo = false;
	export let canRematch = false;
	export let canResign = false;

	export let onToggleOpponentInfo: () => void = () => {};
	export let onRequestRematch: () => void = () => {};
	export let onResign: () => void = () => {};
	export let onRefresh: () => void = () => {};
</script>

<section class="match-topbar">
	<div>
		<a class="back-link" href="/versus/matches">
			<ArrowLeft class="h-4 w-4" />
			{$_('pvp.matches_title')}
		</a>
		<h1>{title}</h1>
	</div>

	{#if loggedIn}
		<div class="topbar-actions">
			<Button variant="outline" aria-pressed={hideOpponentInfo} on:click={onToggleOpponentInfo}>
				{#if hideOpponentInfo}
					<Eye class="mr-2 h-4 w-4" />
					{$_('pvp.show_opponent_info')}
				{:else}
					<EyeOff class="mr-2 h-4 w-4" />
					{$_('pvp.hide_opponent_info')}
				{/if}
			</Button>

			{#if canRematch}
				<Button disabled={Boolean(actionLoading) || loading} on:click={onRequestRematch}>
					{#if actionLoading === 'rematch'}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{:else}
						<Send class="mr-2 h-4 w-4" />
					{/if}
					{$_('pvp.rematch')}
				</Button>
			{/if}

			{#if canResign}
				<Button
					variant="destructive"
					disabled={Boolean(actionLoading) || loading}
					on:click={onResign}
				>
					{#if actionLoading === 'resign-match'}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{:else}
						<Flag class="mr-2 h-4 w-4" />
					{/if}
					{$_('pvp.resign')}
				</Button>
			{/if}

			<Button variant="outline" disabled={loading} on:click={onRefresh}>
				<RefreshCw class={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
				{$_('pvp.refresh')}
			</Button>
		</div>
	{/if}
</section>

<style lang="scss">
	.match-topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 24px;
	}

	.topbar-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 10px;
	}

	h1 {
		margin: 6px 0 0;
		font-size: clamp(2rem, 4vw, 3.25rem);
		font-weight: 800;
		letter-spacing: 0;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		color: hsl(var(--primary));
		font-size: 14px;
		font-weight: 700;
		text-decoration: none;
	}

	.back-link:hover {
		text-decoration: underline;
	}

	@media (max-width: 640px) {
		.match-topbar {
			align-items: stretch;
			flex-direction: column;
		}

		.topbar-actions {
			justify-content: stretch;
		}

		.topbar-actions :global(button) {
			width: 100%;
		}
	}
</style>
