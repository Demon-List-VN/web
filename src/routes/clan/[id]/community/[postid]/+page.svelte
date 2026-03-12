<script lang="ts">
	import * as sdk from '$lib/client/sdk';
	import { page } from '$app/stores';
	import PostDetail from '$lib/components/community/PostDetail.svelte';

	$: clanId = $page.params.id;
	$: postId = $page.params.postid;
</script>

<PostDetail
	postId={postId || ''}
	apiPrefix={sdk.url(`/clans/${clanId}/community`)}
	backLink={`/clan/${clanId}`}
/>
