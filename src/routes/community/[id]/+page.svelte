<script lang="ts">
	import { page } from '$app/stores';
	import { _ } from 'svelte-i18n';
	import PostDetail from '$lib/components/community/PostDetail.svelte';

	export let data: any;

	$: post = data.post;

	function getYouTubeId(url: string): string | null {
		if (!url) return null;
		const match = url.match(
			/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
		);
		return match ? match[1] : null;
	}

	$: headPost = post;
	$: headYtId = headPost?.videoUrl ? getYouTubeId(headPost.videoUrl) : null;
</script>

<svelte:head>
	<title>{headPost?.title || $_('head.titles.community')} - {$_('head.titles.community_post')} - {$_('head.site_name')}</title>
	{#if headPost}
		<meta property="og:title" content={`${headPost.title} - ${$_('head.site_name')}`} />
		<meta property="og:type" content="article" />
		<meta
			property="og:url"
			content="{import.meta.env.VITE_SITE_URL || 'https://demonlist.vn'}/community/{headPost.id}"
		/>
		{#if headPost.content}
			<meta property="og:description" content={headPost.content.slice(0, 160)} />
			<meta name="description" content={headPost.content.slice(0, 160)} />
		{/if}
		{#if headPost.imageUrl}
			<meta property="og:image" content={headPost.imageUrl} />
		{:else if headYtId}
			<meta property="og:image" content="https://img.youtube.com/vi/{headYtId}/maxresdefault.jpg" />
		{/if}
		<meta property="og:site_name" content={$_('head.site_name')} />
		<meta property="article:published_time" content={headPost.createdAt} />
		{#if headPost.updatedAt}
			<meta property="article:modified_time" content={headPost.updatedAt} />
		{/if}
		{#if headPost.players}
			<meta property="article:author" content={headPost.players.name} />
		{/if}
		<meta
			name="twitter:card"
			content={headPost.imageUrl || headYtId ? 'summary_large_image' : 'summary'}
		/>
		<meta name="twitter:title" content={`${headPost.title} - ${$_('head.site_name')}`} />
		{#if headPost.content}
			<meta name="twitter:description" content={headPost.content.slice(0, 160)} />
		{/if}
		{#if headPost.imageUrl}
			<meta name="twitter:image" content={headPost.imageUrl} />
		{:else if headYtId}
			<meta
				name="twitter:image"
				content="https://img.youtube.com/vi/{headYtId}/maxresdefault.jpg"
			/>
		{/if}
	{/if}
</svelte:head>

<PostDetail
	postId={$page.params.id || ''}
	initialPost={data.post}
	initialComments={data.comments}
	backLink={data.post?.clanId ? `/clan/${data.post.clanId}` : '/community'}
/>
