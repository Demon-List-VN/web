<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs';
	import CommunityPostsTab from '../tabs/CommunityPostsTab.svelte';
	import CreatedChallengesTab from '../tabs/CreatedChallengesTab.svelte';
	import ConvictionsTab from '../tabs/ConvictionsTab.svelte';
	import { _ } from 'svelte-i18n';

	export let userID: string;
</script>

<Tabs.Root value="posts">
	<div class="flex flex-col items-center gap-3">
		<Tabs.List class="flex h-fit w-fit flex-wrap">
			<Tabs.Trigger value="posts">{$_('player.tabs.community_posts')}</Tabs.Trigger>
			<Tabs.Trigger value="challenges">{$_('player.tabs.created_challenges')}</Tabs.Trigger>
			<Tabs.Trigger value="convictions">{$_('player.tabs.convictions')}</Tabs.Trigger>
		</Tabs.List>
		<Tabs.Content value="posts" class="w-full">
			<CommunityPostsTab {userID} />
		</Tabs.Content>
		<Tabs.Content value="challenges" class="w-full">
			<CreatedChallengesTab {userID} />
		</Tabs.Content>
		<Tabs.Content value="convictions" class="w-full">
			<ConvictionsTab {userID} />
		</Tabs.Content>
	</div>
</Tabs.Root>
