<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Users, Trophy, Gauge, ShieldCheck } from 'lucide-svelte';
	import { badgeVariants } from '$lib/components/ui/badge';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import TournamentStatusBadge from '$lib/components/tournament/TournamentStatusBadge.svelte';
	import Countdown from '$lib/components/tournament/Countdown.svelte';
	import { eloRangeText, formatLabelKey, rarityColor, nextMilestone } from '$lib/client/tournament';

	export let tournament: any;

	$: eloText = eloRangeText(tournament.minElo, tournament.maxElo);
	$: bannerUrl = `https://cdn.gdvn.net/tournament-banner/${tournament.id}.webp?v=${tournament.bannerVersion ?? 0}`;
	$: milestone = nextMilestone(tournament);
	$: hasReward = tournament.topRewardRarity !== null && tournament.topRewardRarity !== undefined;
	$: inviteOnlyUpcoming = tournament.registrationMode === 'invite_only'
		&& ['draft', 'registration_open', 'registration_closed', 'ready'].includes(tournament.status);
</script>

<a
  href={`/tournament/${tournament.id}`}
  class="group flex flex-col overflow-hidden rounded-[12px] border border-[hsl(var(--border))] bg-card/40 transition-colors hover:border-primary/40 hover:bg-muted/40"
>
  <div
    class="relative aspect-[4/1] w-full bg-muted bg-cover bg-center"
    style={`background-image: linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0.05)), url('${bannerUrl}');`}
  >
    <div class="absolute left-[10px] top-[10px]">
      <TournamentStatusBadge
        status={inviteOnlyUpcoming ? 'ready' : tournament.status}
        labelKey={inviteOnlyUpcoming ? 'tournament.list.group.upcoming' : undefined}
        class="bg-black/40 backdrop-blur"
      />
    </div>
    {#if hasReward}
      <div
        class="absolute right-[10px] top-[10px] flex h-[26px] w-[26px] items-center justify-center rounded-full bg-black/40 backdrop-blur"
        style={`color: ${rarityColor(tournament.topRewardRarity)}`}
        title={$_('tournament.has_reward')}
      >
        <Trophy size={15} />
      </div>
    {/if}
  </div>

  <div class="flex min-w-0 flex-1 flex-col gap-[8px] p-[12px]">
    <div class="flex items-start gap-[8px]">
      <span class="line-clamp-2 flex-1 font-bold leading-tight">{tournament.name}</span>
      {#if tournament.isOfficial}
        <span
          class="inline-flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary"
          title={$_('tournament.official')}
        >
          <ShieldCheck size={15} />
        </span>
      {/if}
      <span class={badgeVariants({ variant: 'outline' })}>
        {$_(formatLabelKey(tournament.format))}
      </span>
    </div>

    {#if tournament.host}
      <div class="flex items-center gap-[6px] text-sm text-muted-foreground">
        <span>{$_('tournament.organizer')}:</span>
        <PlayerLink player={tournament.host} showAvatar avatarSize={18} truncate={20} />
      </div>
    {/if}

    <div class="mt-auto flex flex-wrap items-center gap-x-[14px] gap-y-[4px] text-sm text-muted-foreground">
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
    </div>

    {#if milestone}
      <div class="flex items-center gap-[6px] rounded-[8px] bg-muted/60 px-[8px] py-[5px] text-xs">
        <span class="text-muted-foreground">{$_(milestone.labelKey)}</span>
        <Countdown to={milestone.at} compact class="text-foreground" />
      </div>
    {/if}
  </div>
</a>
