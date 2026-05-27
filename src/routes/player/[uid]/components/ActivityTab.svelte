<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs';
	import CommunityPostsTab from '../tabs/CommunityPostsTab.svelte';
	import CreatedChallengesTab from '../tabs/CreatedChallengesTab.svelte';
	import ConvictionsTab from '../tabs/ConvictionsTab.svelte';
	import PvpMatchesTab from '../tabs/PvpMatchesTab.svelte';
	import XpLogTab from '../tabs/XpLogTab.svelte';
	import { _ } from 'svelte-i18n';

	export let userID: string;
</script>

<Tabs.Root value="posts">
  <div class="flex flex-col items-center gap-3">
    <Tabs.List class="flex h-fit w-fit flex-wrap">
      <Tabs.Trigger value="posts">{
        $_('player.tabs.community_posts')
      }</Tabs.Trigger>
      <Tabs.Trigger value="pvp">{$_('player.tabs.pvp_matches')}</Tabs.Trigger>
      <Tabs.Trigger value="xp">{$_('player.tabs.xp_log')}</Tabs.Trigger>
      <Tabs.Trigger value="challenges">{
        $_('player.tabs.created_challenges')
      }</Tabs.Trigger>
      <Tabs.Trigger value="convictions">{
        $_('player.tabs.convictions')
      }</Tabs.Trigger>
    </Tabs.List>
    <Tabs.Content value="posts" class="w-full">
      <CommunityPostsTab {userID} />
    </Tabs.Content>
    <Tabs.Content value="pvp" class="w-full">
      <PvpMatchesTab {userID} />
    </Tabs.Content>
    <Tabs.Content value="xp" class="w-full">
      <XpLogTab {userID} />
    </Tabs.Content>
    <Tabs.Content value="challenges" class="w-full">
      <CreatedChallengesTab {userID} />
    </Tabs.Content>
    <Tabs.Content value="convictions" class="w-full">
      <ConvictionsTab {userID} />
    </Tabs.Content>
  </div>
</Tabs.Root>
