<script lang="ts">
	import PlayerCard from '$lib/components/playerCard.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Star } from 'svelte-radix';

	export let buyer: any;
	export let rank: number;

	function getRankColor(rank: number): string {
		if (rank === 1) return 'text-yellow-500';
		if (rank === 2) return 'text-gray-400';
		if (rank === 3) return 'text-amber-600';
		return 'text-foreground/60';
	}

	function getRankBadgeVariant(rank: number): 'default' | 'secondary' | 'outline' {
		if (rank === 1) return 'default';
		if (rank === 2) return 'secondary';
		return 'outline';
	}
</script>

<div class="relative">
	<div class="flex items-center gap-2 mb-[10px]">
		<Badge
			variant={getRankBadgeVariant(rank)}
			class={`${getRankColor(rank)} flex items-center gap-1 text-base font-bold`}
		>
			{#if rank <= 3}
				<Star class="h-4 w-4" />
			{/if}
			#{rank}
		</Badge>
	</div>
	<PlayerCard player={buyer.player} />
</div>
