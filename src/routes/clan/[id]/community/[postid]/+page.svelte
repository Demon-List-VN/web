<script lang="ts">
	import { page } from '$app/stores';
	import PostDetail from '$lib/components/community/PostDetail.svelte';

	$: clanId = $page.params.id;
	$: postId = $page.params.postid;
</script>

<PostDetail
	postId={postId || ''}
	apiPrefix={`${import.meta.env.VITE_API_URL}/clans/${clanId}/community`}
	backLink={`/clan/${clanId}`}
/>
