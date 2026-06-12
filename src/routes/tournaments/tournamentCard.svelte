<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Users, Trophy, Gauge } from 'lucide-svelte';
	import { badgeVariants } from '$lib/components/ui/badge';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import {
		eloRangeText,
		formatLabelKey,
		rarityColor,
		statusLabelKey
	} from '$lib/client/tournament';

	export let tournament: any;

	$: eloText = eloRangeText(tournament.minElo, tournament.maxElo);
	$: bannerUrl = `https://cdn.gdvn.net/tournament-banner/${tournament.id}.webp?v=${tournament.bannerVersion ?? 0}`;
</script>

<a
  href={`/tournament/${tournament.id}`}
  class="flex flex-col gap-[12px] rounded-[10px] border border-[hsl(var(--border))] p-[12px] transition-colors hover:bg-muted/40 md:flex-row md:items-center"
>
  <div
    class="h-[80px] w-full shrink-0 rounded-[8px] bg-muted bg-cover bg-center md:h-[60px] md:w-[240px]"
    style={`background-image: url('${bannerUrl}'); aspect-ratio: 4 / 1;`}
  ></div>
  <div class="flex min-w-0 flex-1 flex-col gap-[4px]">
    <div class="flex items-center gap-[8px]">
      <span class="truncate text-lg font-bold">{tournament.name}</span>
      <span class={badgeVariants({ variant: 'outline' })}>
        {$_(formatLabelKey(tournament.format))}
      </span>
      <span class={badgeVariants({ variant: 'secondary' })}>
        {$_(statusLabelKey(tournament.status))}
      </span>
    </div>
    {#if tournament.host}
      <div class="flex items-center gap-[6px] text-sm text-muted-foreground">
        <span>{$_('tournament.organizer')}:</span>
        <PlayerLink player={tournament.host} showAvatar avatarSize={20} truncate={24} />
      </div>
    {/if}
    <div class="flex flex-wrap items-center gap-x-[16px] gap-y-[4px] text-sm text-muted-foreground">
      <span class="flex items-center gap-[5px]">
        <Users size={15} />
        {tournament.participantCount}{#if tournament.maxPlayers}/{tournament.maxPlayers}{/if}
      </span>
      {#if eloText}
        <span class="flex items-center gap-[5px]">
          <Gauge size={15} />
          {eloText}
        </span>
      {/if}
      {#if tournament.topRewardRarity !== null && tournament.topRewardRarity !== undefined}
        <span class="flex items-center gap-[5px]" style={`color: ${rarityColor(tournament.topRewardRarity)}`}>
          <Trophy size={15} />
          {$_('tournament.has_reward')}
        </span>
      {/if}
    </div>
  </div>
</a>
