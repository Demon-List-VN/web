<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import {
		Activity,
		ArrowUpRight,
		Bot,
		CheckCircle2,
		ClipboardCheck,
		ExternalLink,
		Link2,
		ListOrdered,
		Radio,
		Search,
		Shuffle,
		Sparkles,
		Trophy,
		UserRound,
		Users
	} from 'lucide-svelte';
	import { _ } from 'svelte-i18n';
	import {
		DISCORD_BOT_INVITE_URL,
		DISCORD_COMMANDS,
		DISCORD_OAUTH_URL,
		DISCORD_SERVER_INVITE_URL,
		type DiscordCommandGroup
	} from '$lib/client/discord';

	const heroImage =
		'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=2070&auto=format&fit=crop';

	const highlights = [
		'discord_bot.highlights.public',
		'discord_bot.highlights.current_api',
		'discord_bot.highlights.custom_lists'
	];

	const audiences = [
		{
			icon: UserRound,
			title: 'discord_bot.audiences.players.title',
			description: 'discord_bot.audiences.players.description'
		},
		{
			icon: ClipboardCheck,
			title: 'discord_bot.audiences.submitters.title',
			description: 'discord_bot.audiences.submitters.description'
		},
		{
			icon: ListOrdered,
			title: 'discord_bot.audiences.managers.title',
			description: 'discord_bot.audiences.managers.description'
		},
		{
			icon: Users,
			title: 'discord_bot.audiences.community.title',
			description: 'discord_bot.audiences.community.description'
		}
	];

	const featureTiles = [
		{
			icon: Search,
			title: 'discord_bot.features.lookup.title',
			description: 'discord_bot.features.lookup.description'
		},
		{
			icon: Trophy,
			title: 'discord_bot.features.leaderboard.title',
			description: 'discord_bot.features.leaderboard.description'
		},
		{
			icon: Radio,
			title: 'discord_bot.features.submissions.title',
			description: 'discord_bot.features.submissions.description'
		},
		{
			icon: Shuffle,
			title: 'discord_bot.features.random.title',
			description: 'discord_bot.features.random.description'
		},
		{
			icon: Link2,
			title: 'discord_bot.features.links.title',
			description: 'discord_bot.features.links.description'
		},
		{
			icon: Activity,
			title: 'discord_bot.features.stats.title',
			description: 'discord_bot.features.stats.description'
		}
	];

	const commandGroups: Array<{
		group: DiscordCommandGroup;
		title: string;
		icon: typeof UserRound;
	}> = [
		{
			group: 'players',
			title: 'discord_bot.command_groups.players',
			icon: UserRound
		},
		{
			group: 'records',
			title: 'discord_bot.command_groups.records',
			icon: ClipboardCheck
		},
		{
			group: 'lists',
			title: 'discord_bot.command_groups.lists',
			icon: ListOrdered
		},
		{ group: 'utility', title: 'discord_bot.command_groups.utility', icon: Bot }
	];

	function commandsFor(group: DiscordCommandGroup) {
		return DISCORD_COMMANDS.filter((command) => command.group === group);
	}
</script>

<svelte:head>
  <title>{$_('discord_bot.page_title')} - {$_('head.site_name')}</title>
  <meta name="description" content={$_('head.descriptions.discord')} />
</svelte:head>

<section class="discordHero">
  <img class="heroImage" src={heroImage} alt="Discord community workspace" />
  <div class="heroScrim"></div>
  <div class="heroContent">
    <Badge class="heroBadge">
      <Sparkles class="h-3.5 w-3.5" />
      {$_('discord_bot.hero_badge')}
    </Badge>
    <h1>{$_('discord_bot.hero_title')}</h1>
    <p>{$_('discord_bot.hero_description')}</p>
    <div class="heroActions">
      <a
        href={DISCORD_SERVER_INVITE_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Button class="heroPrimary">
          <Users class="h-5 w-5" />
          {$_('discord_bot.join_server')}
        </Button>
      </a>
      <a
        href={DISCORD_BOT_INVITE_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Button variant="outline" class="heroSecondary">
          <Bot class="h-5 w-5" />
          {$_('discord_bot.add_button')}
        </Button>
      </a>
    </div>
    <div class="heroHighlights">
      {#each highlights as highlight}
        <span>
          <CheckCircle2 class="h-4 w-4" />
          {$_(highlight)}
        </span>
      {/each}
    </div>
  </div>
</section>

<main class="discordPage">
  <section class="quickLinks">
    <a href={DISCORD_OAUTH_URL} class="quickLink">
      <Link2 class="h-5 w-5" />
      <span>
        <strong>{$_('discord_bot.quick.link_account.title')}</strong>
        <small>{$_('discord_bot.quick.link_account.description')}</small>
      </span>
      <ArrowUpRight class="h-4 w-4" />
    </a>
    <a href="/submit/record" class="quickLink">
      <ClipboardCheck class="h-5 w-5" />
      <span>
        <strong>{$_('discord_bot.quick.submit.title')}</strong>
        <small>{$_('discord_bot.quick.submit.description')}</small>
      </span>
      <ArrowUpRight class="h-4 w-4" />
    </a>
    <a href="/lists" class="quickLink">
      <ListOrdered class="h-5 w-5" />
      <span>
        <strong>{$_('discord_bot.quick.lists.title')}</strong>
        <small>{$_('discord_bot.quick.lists.description')}</small>
      </span>
      <ArrowUpRight class="h-4 w-4" />
    </a>
  </section>

  <section class="sectionBlock">
    <div class="sectionHeader">
      <p>{$_('discord_bot.audiences_eyebrow')}</p>
      <h2>{$_('discord_bot.audiences_title')}</h2>
    </div>
    <div class="audienceGrid">
      {#each audiences as audience}
        <Card.Root class="audienceCard">
          <Card.Header>
            <svelte:component this={audience.icon} class="h-6 w-6" />
            <Card.Title>{$_(audience.title)}</Card.Title>
            <Card.Description>{$_(audience.description)}</Card.Description>
          </Card.Header>
        </Card.Root>
      {/each}
    </div>
  </section>

  <section class="sectionBlock featureBand">
    <div class="sectionHeader">
      <p>{$_('discord_bot.features_eyebrow')}</p>
      <h2>{$_('discord_bot.features_title')}</h2>
    </div>
    <div class="featureGrid">
      {#each featureTiles as feature}
        <div class="featureTile">
          <svelte:component this={feature.icon} class="featureIcon h-5 w-5" />
          <div>
            <h3>{$_(feature.title)}</h3>
            <p>{$_(feature.description)}</p>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <section class="sectionBlock commandSection">
    <div class="sectionHeader">
      <p>{$_('discord_bot.commands_eyebrow')}</p>
      <h2>{$_('discord_bot.commands_title')}</h2>
      <span>{$_('discord_bot.commands_subtitle')}</span>
    </div>

    <div class="commandGroups">
      {#each commandGroups as group}
        <div class="commandGroup">
          <div class="commandGroupHeader">
            <svelte:component this={group.icon} class="h-5 w-5" />
            <h3>{$_(group.title)}</h3>
          </div>
          <div class="commandList">
            {#each commandsFor(group.group) as command}
              <Card.Root class="commandCard">
                <Card.Header>
                  <div class="commandTopline">
                    <code>{command.name}</code>
                    <Badge variant="secondary">{
                      $_('discord_bot.public_badge')
                    }</Badge>
                  </div>
                  <Card.Description>{
                    $_(command.descriptionKey)
                  }</Card.Description>
                </Card.Header>
                {#if command.params.length}
                  <Card.Content>
                    <div class="paramList">
                      {#each command.params as param}
                        <span class="paramChip" class:required={param.required}>
                          <code>{param.name}</code>
                          <small>{$_(param.descriptionKey)}</small>
                          <em>
                            {
                              param.required
                              ? $_('discord_bot.param_required')
                              : $_('discord_bot.param_optional')
                            }
                          </em>
                        </span>
                      {/each}
                    </div>
                  </Card.Content>
                {/if}
              </Card.Root>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </section>

  <section class="finalBand">
    <div>
      <Bot class="h-8 w-8" />
      <h2>{$_('discord_bot.final_title')}</h2>
      <p>{$_('discord_bot.final_description')}</p>
    </div>
    <div class="finalActions">
      <a
        href={DISCORD_BOT_INVITE_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Button>
          <ExternalLink class="h-4 w-4" />
          {$_('discord_bot.add_button')}
        </Button>
      </a>
      <a
        href={DISCORD_SERVER_INVITE_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Button variant="outline">
          <Users class="h-4 w-4" />
          {$_('discord_bot.join_server')}
        </Button>
      </a>
    </div>
  </section>
</main>

<style lang="scss">
.discordHero {
  position: relative;
  min-height: min(620px, calc(100vh - 72px));
  overflow: hidden;
  display: flex;
  align-items: center;
  padding: 96px 24px 72px;
}

.heroImage,
.heroScrim {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.heroImage {
  object-fit: cover;
}

.heroScrim {
  background:
    linear-gradient(
      90deg,
      hsl(var(--background)) 0%,
      hsl(var(--background) / 0.84) 44%,
      hsl(var(--background) / 0.2) 100%
    ),
    linear-gradient(0deg, hsl(var(--background)) 0%, transparent 34%);
}

.heroContent {
  position: relative;
  z-index: 1;
  width: min(760px, 100%);
  margin: 0 auto;
  margin-left: max(24px, calc((100vw - 1160px) / 2));
}

:global(.heroBadge) {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 20px;
  border-color: hsl(var(--primary) / 0.25);
  background: hsl(var(--primary) / 0.12);
  color: hsl(var(--foreground));
}

.heroContent h1 {
  max-width: 760px;
  font-size: clamp(3rem, 8vw, 6.25rem);
  line-height: 0.94;
  font-weight: 900;
  letter-spacing: 0;
}

.heroContent p {
  max-width: 620px;
  margin-top: 22px;
  font-size: 1.125rem;
  line-height: 1.7;
  color: hsl(var(--muted-foreground));
}

.heroActions,
.finalActions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}

:global(.heroPrimary),
:global(.heroSecondary) {
  gap: 10px;
  min-height: 46px;
}

.heroHighlights {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 28px;
}

.heroHighlights span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid hsl(var(--border));
  border-radius: 999px;
  padding: 8px 12px;
  background: hsl(var(--background) / 0.72);
  font-size: 0.875rem;
  color: hsl(var(--foreground));
  backdrop-filter: blur(12px);
}

.discordPage {
  position: relative;
  z-index: 2;
  padding: 0 20px 96px;
}

.quickLinks {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  width: min(1120px, 100%);
  margin: -26px auto 72px;
}

.quickLink {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 14px;
  min-height: 82px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  padding: 16px;
  background: hsl(var(--card));
  color: hsl(var(--card-foreground));
  box-shadow: 0 12px 32px hsl(var(--foreground) / 0.08);
}

.quickLink strong,
.quickLink small {
  display: block;
}

.quickLink small {
  margin-top: 3px;
  color: hsl(var(--muted-foreground));
  line-height: 1.35;
}

.sectionBlock {
  width: min(1120px, 100%);
  margin: 0 auto 80px;
}

.sectionHeader {
  margin-bottom: 24px;
}

.sectionHeader p {
  margin-bottom: 8px;
  text-transform: uppercase;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: hsl(var(--primary));
}

.sectionHeader h2 {
  font-size: clamp(2rem, 5vw, 3.35rem);
  line-height: 1.04;
  font-weight: 850;
  letter-spacing: 0;
}

.sectionHeader span {
  display: block;
  max-width: 700px;
  margin-top: 12px;
  color: hsl(var(--muted-foreground));
  line-height: 1.7;
}

.audienceGrid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

:global(.audienceCard) {
  border-radius: 8px;
}

:global(.audienceCard svg) {
  color: hsl(var(--primary));
  margin-bottom: 12px;
}

.featureBand {
  padding: 40px 0;
  border-top: 1px solid hsl(var(--border));
  border-bottom: 1px solid hsl(var(--border));
}

.featureGrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.featureTile {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 14px;
  padding: 18px;
  border-radius: 8px;
  background: hsl(var(--muted) / 0.42);
  border: 1px solid hsl(var(--border));
}

:global(.featureIcon) {
  color: hsl(var(--primary));
  margin-top: 2px;
}

.featureTile h3 {
  font-size: 1rem;
  font-weight: 800;
  margin-bottom: 4px;
}

.featureTile p {
  color: hsl(var(--muted-foreground));
  line-height: 1.55;
  font-size: 0.925rem;
}

.commandGroups {
  display: grid;
  gap: 28px;
}

.commandGroupHeader {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.commandGroupHeader h3 {
  font-size: 1.15rem;
  font-weight: 850;
}

.commandList {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

:global(.commandCard) {
  border-radius: 8px;
}

.commandTopline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.commandTopline code {
  color: hsl(var(--primary));
  font-size: 1rem;
  font-weight: 800;
}

.paramList {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.paramChip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  max-width: 100%;
  border: 1px solid hsl(var(--border));
  border-radius: 999px;
  padding: 6px 9px;
  background: hsl(var(--muted) / 0.4);
  font-size: 0.78rem;
}

.paramChip.required {
  border-color: hsl(var(--primary) / 0.45);
}

.paramChip code {
  font-weight: 800;
}

.paramChip small {
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.paramChip em {
  font-style: normal;
  color: hsl(var(--primary));
}

.finalBand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: 30px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--muted) / 0.35);
}

.finalBand h2 {
  margin-top: 12px;
  font-size: 1.65rem;
  font-weight: 850;
}

.finalBand p {
  max-width: 620px;
  margin-top: 6px;
  color: hsl(var(--muted-foreground));
  line-height: 1.6;
}

@media (max-width: 900px) {
  .discordHero {
    min-height: 560px;
    padding-top: 84px;
  }

  .heroScrim {
    background: linear-gradient(
      0deg,
      hsl(var(--background)) 0%,
      hsl(var(--background) / 0.76) 42%,
      hsl(var(--background) / 0.48) 100%
    );
  }

  .heroContent {
    margin-inline: auto;
  }

  .quickLinks,
  .audienceGrid,
  .featureGrid,
  .commandList {
    grid-template-columns: 1fr;
  }

  .finalBand {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 560px) {
  .discordPage {
    padding-inline: 12px;
  }

  .discordHero {
    padding-inline: 16px;
  }

  .heroActions,
  .heroActions a,
  .finalActions,
  .finalActions a {
    width: 100%;
  }

  :global(.heroPrimary),
  :global(.heroSecondary),
  .finalActions :global(button) {
    width: 100%;
  }

  .paramChip {
    border-radius: 8px;
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
