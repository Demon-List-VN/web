<script lang="ts">
	import { locale } from 'svelte-i18n';
	import FolderView from './FolderView.svelte';
	import FileView from './FileView.svelte';

	export let data: any;

	$: isFolder = data.type === 'folder';
	$: metadata = !isFolder && data.metadata && $locale 
		? data.metadata[$locale] || Object.values(data.metadata)[0] 
		: null;
	$: breadcrumbs = getBreadcrumbs(data) ?? [];
	$: folderTitle = isFolder ? getFolderTitle(data.path) : '';

	function getBreadcrumbs(data: any) {
		let path = data.path;
		if (!path) return [];

		let parts: string[] = path.split('/');

		// Remove .md extension if it's a file
		if (parts.at(-1)?.endsWith('.md')) {
			parts[parts.length - 1] = parts[parts.length - 1].replace('.md', '');
		}

		let res = [
			{
				title: 'Wiki',
				link: '/wiki'
			}
		];

		for (let i = 0; i < parts.length; i++) {
			let part = parts[i];
			part = part.split('-').join(' ');
			part = part.charAt(0).toUpperCase() + part.slice(1);

			res.push({
				title: part,
				link: '/wiki/' + parts.slice(0, i + 1).join('/')
			});
		}

		return res;
	}

	function getFolderTitle(path: string) {
		const parts = path.split('/');
		const name = parts[parts.length - 1];
		return name.split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
	}
</script>

{#if isFolder}
	<FolderView {data} {breadcrumbs} {folderTitle} />
{:else if metadata}
	<FileView {metadata} {breadcrumbs} />
{/if}
