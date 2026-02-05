<script lang="ts">
	import { Card, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Folder } from 'lucide-svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { _ } from 'svelte-i18n';
	import { get } from 'svelte/store';

	export let folder: any = null;
	export let locale: string;

	function getFolderName(path: string) {
		const parts = path.split('/');
		const key = get(_)(`wiki.folders.${parts[parts.length - 1]}`);

		if (key == `wiki.folders.${parts[parts.length - 1]}`) {
			return parts[parts.length - 1];
		}

		return get(_)(`wiki.folders.${parts[parts.length - 1]}`);
	}
</script>

{#if folder}
	<a href={`/wiki/${locale}/${folder.path}`}>
		<Card class="transition-all hover:border-primary/50 hover:shadow-md">
			<CardHeader class="flex flex-row items-center gap-4 py-4">
				<div class="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
					<Folder class="h-6 w-6 text-primary" />
				</div>
				<div class="flex-1">
					<CardTitle class="text-base">{$_(getFolderName(folder.path))}</CardTitle>
					<CardDescription>
						{folder.count ?? 0}
						{$_('wiki.items')}
					</CardDescription>
				</div>
			</CardHeader>
		</Card>
	</a>
{:else}
	<Card>
		<CardHeader class="flex flex-row items-center gap-4 py-4">
			<Skeleton class="h-12 w-12 rounded-lg" />
			<div class="flex-1">
				<Skeleton class="h-5 w-32" />
				<Skeleton class="mt-1 h-4 w-20" />
			</div>
		</CardHeader>
	</Card>
{/if}
