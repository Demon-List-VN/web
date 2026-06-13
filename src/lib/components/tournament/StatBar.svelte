<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Swords, Users, Gauge, Gamepad2, Clock, Trophy } from 'lucide-svelte';
	import PlayerLink from '$lib/components/playerLink.svelte';
	import { eloRangeText, formatLabelKey, rarityColor } from '$lib/client/tournament';

	export let tournament: any;

	$: eloText = eloRangeText(tournament.minElo, tournament.maxElo);
	$: durationHours = tournament.contestConfig
		? Math.round(tournament.contestConfig.durationSeconds / 3600)
		: null;
	$: topRarity = (() => {
		if (tournament.topRewardRarity !== null && tournament.topRewardRarity !== undefined) {
			return tournament.topRewardRarity;
		}

		const rarities = (tournament.rewards ?? [])
			.map((reward: any) => reward.item?.rarity)
			.filter((rarity: any) => rarity !== null && rarity !== undefined);

		return rarities.length ? Math.max(...rarities) : null;
	})();
</script>

<div
	class="flex flex-wrap items-center gap-x-[22px] gap-y-[10px] rounded-[12px] border border-[hsl(var(--border))] bg-card/40 px-[16px] py-[12px]"
>
	<div class="flex items-center gap-[8px]">
		<Swords size={18} class="text-muted-foreground" />
		<div class="flex flex-col leading-tight">
			<span class="text-[11px] text-muted-foreground">{$_('tournament.overview.format')}</span>
			<span class="text-sm font-semibold">{$_(formatLabelKey(tournament.format))}</span>
		</div>
	</div>

	<div class="flex items-center gap-[8px]">
		<Users size={18} class="text-muted-foreground" />
		<div class="flex flex-col leading-tight">
			<span class="text-[11px] text-muted-foreground">{$_('tournament.overview.players')}</span>
			<span class="text-sm font-semibold tabular-nums">
				{tournament.participantCount}{#if tournament.maxPlayers}/{tournament.maxPlayers}{/if}
			</span>
		</div>
	</div>

	{#if eloText}
		<div class="flex items-center gap-[8px]">
			<Gauge size={18} class="text-muted-foreground" />
			<div class="flex flex-col leading-tight">
				<span class="text-[11px] text-muted-foreground">{$_('tournament.overview.skill_range')}</span>
				<span class="text-sm font-semibold tabular-nums">{eloText}</span>
			</div>
		</div>
	{/if}

	{#if tournament.format === 'single_elimination' && tournament.pvpFormat}
		<div class="flex items-center gap-[8px]">
			<Gamepad2 size={18} class="text-muted-foreground" />
			<div class="flex flex-col leading-tight">
				<span class="text-[11px] text-muted-foreground">{$_('tournament.overview.mode')}</span>
				<span class="text-sm font-semibold capitalize">{tournament.pvpFormat.mode}</span>
			</div>
		</div>
	{/if}

	{#if durationHours !== null}
		<div class="flex items-center gap-[8px]">
			<Clock size={18} class="text-muted-foreground" />
			<div class="flex flex-col leading-tight">
				<span class="text-[11px] text-muted-foreground">{$_('tournament.overview.duration')}</span>
				<span class="text-sm font-semibold tabular-nums">{durationHours}h</span>
			</div>
		</div>
	{/if}

	{#if topRarity !== null}
		<div class="flex items-center gap-[8px]">
			<Trophy size={18} style={`color: ${rarityColor(topRarity)}`} />
			<div class="flex flex-col leading-tight">
				<span class="text-[11px] text-muted-foreground">{$_('tournament.overview.rewards')}</span>
				<span class="text-sm font-semibold" style={`color: ${rarityColor(topRarity)}`}>
					{$_('tournament.has_reward')}
				</span>
			</div>
		</div>
	{/if}

	{#if tournament.host}
		<div class="flex items-center gap-[8px]">
			<div class="flex flex-col leading-tight">
				<span class="text-[11px] text-muted-foreground">{$_('tournament.organizer')}</span>
				<PlayerLink player={tournament.host} showAvatar avatarSize={20} truncate={20} />
			</div>
		</div>
	{/if}
</div>
