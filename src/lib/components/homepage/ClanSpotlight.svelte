<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { user } from '$lib/client';
	import { isActive } from '$lib/client/isSupporterActive';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Avatar from '$lib/components/ui/avatar';

	import { Users, Zap, ArrowRight } from 'lucide-svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';

	export let topClans: any[] | null = null;

	$: isLoggedIn = $user.loggedIn;
	$: userClanId = isLoggedIn ? $user.data.clan : null;

	function isBoostActive(clan: any) {
		return clan.boostedUntil && new Date(clan.boostedUntil) > new Date();
	}
</script>

<section class="clanSpotlight">
	<div class="spotlightHeader">
		<div class="flex items-center gap-2">
			<Users class="h-5 w-5 text-indigo-500" />
			<h4>{$_('homepage.clans.title')}</h4>
		</div>
		<a href="/clans" class="viewAllBtn">
			{$_('homepage.clans.view_all')}
			<ArrowRight class="ml-1 h-4 w-4" />
		</a>
	</div>

	<div class="clanGrid">
		{#if topClans === null}
			{#each { length: 4 } as _}
				<Card.Root class="clanCard">
					<Card.Content class="p-4">
						<Skeleton class="h-10 w-10 rounded-full" />
						<Skeleton class="h-4 w-24 mt-2" />
						<Skeleton class="h-3 w-16 mt-1" />
					</Card.Content>
				</Card.Root>
			{/each}
		{:else}
			{#each topClans as clan, index}
				<a href={`/clan/${clan.id}`} class="clanCardLink">
					<Card.Root class="clanCard" style={isBoostActive(clan) ? 'border-color: hsl(270 70% 60% / 0.4)' : ''}>
						<Card.Content class="clanCardInner">
							<div class="clanRank" class:gold={index === 0} class:silver={index === 1} class:bronze={index === 2}>
								#{index + 1}
							</div>
							<div class="clanInfo">
								<div class="clanNameRow">
									<span class="clanName">{clan.name}</span>
									{#if isBoostActive(clan)}
										<span class="boostBadge">
											<Zap class="h-3 w-3" />
										</span>
									{/if}
								</div>
								<div class="clanMeta">
									<Users class="h-3 w-3" />
									<span>{clan.memberCount} {$_('homepage.clans.members')}</span>
								</div>
							</div>
							{#if clan.players}
								<Avatar.Root class="h-8 w-8 ml-auto">
									<Avatar.Image
										class="object-cover"
										loading="lazy"
										decoding="async"
										src={`https://cdn.gdvn.net/avatars/${clan.players.uid}${isActive(clan.players.supporterUntil) && clan.players.isAvatarGif ? '.gif' : '.jpg'}?version=${clan.players.avatarVersion}`}
										alt={clan.players.name}
									/>
									<Avatar.Fallback>{clan.players.name?.[0] || '?'}</Avatar.Fallback>
								</Avatar.Root>
							{/if}
						</Card.Content>
					</Card.Root>
				</a>
			{/each}
		{/if}
	</div>

	{#if !isLoggedIn || !userClanId}
		<div class="clanCta">
			<p>{$_('homepage.clans.join_prompt')}</p>
			<Button href="/clans" variant="outline" size="sm">
				{$_('homepage.clans.browse_clans')}
				<ArrowRight class="ml-1 h-3.5 w-3.5" />
			</Button>
		</div>
	{:else}
		<div class="clanCta">
			<Button href={`/clan/${userClanId}`} variant="outline" size="sm">
				{$_('homepage.clans.my_clan')}
				<ArrowRight class="ml-1 h-3.5 w-3.5" />
			</Button>
		</div>
	{/if}
</section>

<style lang="scss">
	.clanSpotlight {
		padding: 0 50px;
	}

	.spotlightHeader {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16px;
		flex-wrap: wrap;
		gap: 8px;

		h4 {
			font-weight: 600;
			font-size: 18px;
			margin: 0;
		}
	}

	.viewAllBtn {
		display: inline-flex;
		align-items: center;
		font-size: 14px;
		font-weight: 500;
		color: hsl(var(--muted-foreground));
		transition: color 0.2s;
		&:hover { color: hsl(var(--foreground)); }
	}

	.clanGrid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 12px;
	}

	.clanCardLink {
		text-decoration: none;
		color: inherit;
	}

	:global(.clanCard) {
		transition: all 0.2s !important;
		&:hover {
			transform: translateY(-1px);
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		}
	}

	:global(.clanCardInner) {
		display: flex !important;
		align-items: center !important;
		gap: 12px !important;
		padding: 14px !important;
	}

	.clanRank {
		font-size: 18px;
		font-weight: 700;
		min-width: 32px;
		text-align: center;
		color: hsl(var(--muted-foreground));

		&.gold { color: #eab308; }
		&.silver { color: #9ca3af; }
		&.bronze { color: #d97706; }
	}

	.clanInfo {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.clanNameRow {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.clanName {
		font-weight: 600;
		font-size: 14px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.boostBadge {
		display: inline-flex;
		align-items: center;
		padding: 1px 4px;
		border-radius: 4px;
		background: hsl(270 70% 60% / 0.15);
		color: hsl(270 70% 60%);
	}

	.clanMeta {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 12px;
		color: hsl(var(--muted-foreground));
	}

	.clanCta {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-top: 14px;
		flex-wrap: wrap;

		p {
			font-size: 13px;
			color: hsl(var(--muted-foreground));
			margin: 0;
		}
	}

	@media screen and (max-width: 768px) {
		.clanSpotlight {
			padding: 0 16px;
		}
		.clanGrid {
			grid-template-columns: 1fr;
		}
	}
</style>
