<script lang="ts">
	import { isActive } from '$lib/client/isSupporterActive';
	import { createEventDispatcher } from 'svelte';

	export let show = false;
	export let suggestions: any[] = [];
	export let activeIndex = 0;

	const dispatch = createEventDispatcher<{ select: any }>();

	function getAvatarUrl(player: any): string {
		const ext =
			isActive(player.supporterUntil) && player.isAvatarGif ? '.gif' : '.jpg';
		return `https://cdn.gdvn.net/avatars/${player.uid}${ext}?version=${player.avatarVersion || 0}`;
	}
</script>

{#if show && suggestions.length > 0}
	<div class="mentionDropdown">
		{#each suggestions as player, i}
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<!-- svelte-ignore a11y-no-static-element-interactions -->
			<div
				class="mentionOption"
				class:active={i === activeIndex}
				on:click={() => dispatch('select', player)}
			>
				<img src={getAvatarUrl(player)} alt="" class="mentionAvatar" />
				<span class="mentionName">{player.name}</span>
			</div>
		{/each}
	</div>
{/if}

<style lang="scss">
	.mentionDropdown {
		position: absolute;
		bottom: 100%;
		left: 0;
		right: 0;
		max-height: 200px;
		overflow-y: auto;
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		z-index: 50;
		margin-bottom: 4px;
	}

	.mentionOption {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		cursor: pointer;
		transition: background 0.1s;

		&:hover,
		&.active {
			background: hsl(var(--accent));
		}
	}

	.mentionAvatar {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		object-fit: cover;
	}

	.mentionName {
		font-size: 13px;
		font-weight: 500;
	}
</style>
