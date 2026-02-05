<script lang="ts">
	import { onMount } from 'svelte';
	import SvelteMarkdown from 'svelte-markdown';

	export let content: string;

	function updateMarkdownStyle() {
		const elem = document.getElementsByClassName('markdown')[0];

		if (elem) {
			const links = elem.getElementsByTagName('a');
			for (const link of links) {
				link.style.color = '#98c2fe';
			}
		}
	}

	onMount(() => {
		updateMarkdownStyle();
	});
</script>

{#if content}
	<div class="markdown">
		<SvelteMarkdown source={content} />
	</div>
{/if}

<style>
	.markdown :global(img) {
		width: 100%;
		border-radius: 8px;
	}
	.markdown :global(h1) {
		font-size: 2em;
		margin-bottom: 0.5em;
	}
	.markdown :global(h2) {
		font-size: 1.5em;
		margin-bottom: 0.5em;
	}
	.markdown :global(p) {
		margin-bottom: 1em;
		line-height: 1.6;
	}
	.markdown :global(ul),
	.markdown :global(ol) {
		margin-bottom: 1em;
		padding-left: 2em;
	}
	.markdown :global(li) {
		margin-bottom: 0.5em;
	}
	.markdown :global(a) {
		text-decoration: underline;
	}
	.markdown :global(code) {
		padding: 0.2em 0.4em;
		border-radius: 3px;
	}
</style>
