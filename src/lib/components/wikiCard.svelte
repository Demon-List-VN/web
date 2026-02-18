<script lang="ts">
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Calendar } from 'svelte-radix';
	import { _ } from 'svelte-i18n';
	import { Skeleton } from '$lib/components/ui/skeleton';

	export let item: any = null;
	export let locale: string;

	$: metadata =
		item?.metadata && locale ? item.metadata[locale] || Object.values(item.metadata)[0] : null;

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString(locale || 'vi-VN');
	}

	function getTitle(item: any, metadata: any) {
		if (metadata?.title) {
			return metadata.title;
		}

		const pathParts = item.path.split('/');
		const name = pathParts[pathParts.length - 1].replace('.md', '');

		return name
			.split('-')
			.map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}
</script>

{#if item}
	<a href={`/wiki/${locale}/${item.path}`}>
		<Card class="h-full hover:border-primary/50 hover:shadow-md">
			{#if metadata?.image}
				<div class="relative overflow-hidden rounded-t-xl">
					<img
						src={metadata.image}
						alt={getTitle(item, metadata)}
						class="aspect-[2/1] w-full object-cover"
						loading="lazy"
					/>
				</div>
			{/if}
			<CardHeader class={metadata?.image ? 'pt-4' : ''}>
				<div class="flex items-start justify-between gap-2">
					<div class="flex-1">
						<CardTitle class="line-clamp-2 text-lg">{getTitle(item, metadata)}</CardTitle>
						{#if metadata?.description}
							<CardDescription class="mt-1 line-clamp-2">{metadata.description}</CardDescription>
						{/if}
					</div>
					{#if metadata?.locale}
						<Badge
							variant="outline"
							class="shrink-0 bg-black uppercase text-white dark:bg-white dark:text-black"
							>{metadata.locale}</Badge
						>
					{/if}
					{#each Object.keys(item.metadata) as loc}
						{#if loc != metadata.locale}
							<Badge variant="outline" class="shrink-0 uppercase">{loc}</Badge>
						{/if}
					{/each}
				</div>
			</CardHeader>
			<CardContent>
				<div class="flex items-center gap-2 text-sm text-foreground/70">
					<Calendar class="h-4 w-4" />
					<span>{formatDate(item.createdAt)}</span>
				</div>
			</CardContent>
		</Card>
	</a>
{:else}
	<Card class="h-full">
		<Skeleton class="aspect-[2/1] w-full rounded-t-xl" />
		<CardHeader class="pt-4">
			<Skeleton class="h-6 w-3/4" />
			<Skeleton class="mt-2 h-4 w-full" />
		</CardHeader>
		<CardContent>
			<Skeleton class="h-4 w-1/3" />
		</CardContent>
	</Card>
{/if}
