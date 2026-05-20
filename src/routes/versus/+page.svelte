<script lang="ts">
	import { _ } from 'svelte-i18n';
	import {
		ArrowRight,
		BarChart3,
		Gamepad2,
		ShieldCheck,
		Swords,
		Trophy,
		Users
	} from 'lucide-svelte';

	const siteUrl = (import.meta.env.VITE_SITE_URL || 'https://gdvn.net').replace(/\/$/, '');
	const versusUrl = `${siteUrl}/versus`;
	const featureKeys = ['matchmaking', 'elo', 'invites', 'weekly'] as const;
	const featureIcons = [Swords, BarChart3, Users, Trophy] as const;
	const stepKeys = ['install', 'queue', 'play'] as const;
</script>

<svelte:head>
	<title>{$_('pvp.landing.meta_title')}</title>
	<meta name="description" content={$_('pvp.landing.meta_description')} />
	<link rel="canonical" href={versusUrl} />
	<meta property="og:title" content={$_('pvp.landing.meta_title')} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={versusUrl} />
	<meta property="og:description" content={$_('pvp.landing.meta_description')} />
	<meta property="og:site_name" content={$_('head.site_name')} />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={$_('pvp.landing.meta_title')} />
	<meta name="twitter:description" content={$_('pvp.landing.meta_description')} />
</svelte:head>

<main class="versus-landing">
	<section class="versus-hero">
		<div class="hero-copy">
			<div class="eyebrow">
				<Swords class="h-4 w-4" />
				<span>{$_('pvp.landing.eyebrow')}</span>
			</div>
			<h1>{$_('pvp.landing.title')}</h1>
			<p>{$_('pvp.landing.description')}</p>
			<div class="hero-actions">
				<a class="primary-cta" href="/versus/play">
					<Gamepad2 class="h-4 w-4" />
					{$_('pvp.landing.primary_cta')}
				</a>
				<a class="secondary-cta" href="#leaderboard">
					<Trophy class="h-4 w-4" />
					{$_('pvp.landing.secondary_cta')}
				</a>
			</div>
		</div>

		<div class="versus-preview" aria-hidden="true">
			<div class="preview-header">
				<span>1v1</span>
				<strong>VERSUS</strong>
				<span>PvP</span>
			</div>
			<div class="preview-match">
				<div class="preview-player">
					<div>GD</div>
					<strong>{$_('pvp.landing.preview_you')}</strong>
					<span>1478 Elo</span>
				</div>
				<div class="preview-vs">VS</div>
				<div class="preview-player rival">
					<div>VN</div>
					<strong>{$_('pvp.landing.preview_rival')}</strong>
					<span>1492 Elo</span>
				</div>
			</div>
			<div class="preview-level">
				<span>{$_('pvp.landing.preview_level')}</span>
				<strong>Challenge level</strong>
			</div>
			<div class="preview-progress">
				<span style="width: 72%"></span>
			</div>
			<div class="preview-progress rival">
				<span style="width: 64%"></span>
			</div>
		</div>
	</section>

	<section class="versus-features" aria-label={$_('pvp.landing.features_label')}>
		{#each featureKeys as feature, index}
			{@const Icon = featureIcons[index] ?? ShieldCheck}
			<article>
				<Icon class="h-5 w-5" />
				<h2>{$_(`pvp.landing.features.${feature}.title`)}</h2>
				<p>{$_(`pvp.landing.features.${feature}.description`)}</p>
			</article>
		{/each}
	</section>

	<section class="versus-info-band" id="leaderboard">
		<div>
			<span>{$_('pvp.landing.rank_eyebrow')}</span>
			<h2>{$_('pvp.landing.rank_title')}</h2>
			<p>{$_('pvp.landing.rank_description')}</p>
		</div>
		<a href="/versus/play">{$_('pvp.landing.rank_cta')} <ArrowRight class="h-4 w-4" /></a>
	</section>

	<section class="versus-steps">
		<div>
			<span>{$_('pvp.landing.how_eyebrow')}</span>
			<h2>{$_('pvp.landing.how_title')}</h2>
		</div>
		<ol>
			{#each stepKeys as step}
				<li>
					<strong>{$_(`pvp.landing.steps.${step}.title`)}</strong>
					<p>{$_(`pvp.landing.steps.${step}.description`)}</p>
				</li>
			{/each}
		</ol>
	</section>

	<section class="versus-mod">
		<ShieldCheck class="h-5 w-5" />
		<div>
			<h2>{$_('pvp.landing.mod_title')}</h2>
			<p>{$_('pvp.landing.mod_description')}</p>
		</div>
		<a href="/geode-mods">{$_('pvp.geode_alert.release_page')}</a>
	</section>
</main>

<style lang="scss">
	.versus-landing {
		width: min(1180px, calc(100% - 32px));
		margin: 0 auto;
		padding: 24px 0 56px;
		display: flex;
		flex-direction: column;
		gap: 28px;
	}

	.versus-hero {
		min-height: min(620px, calc(100vh - 110px));
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(320px, 460px);
		align-items: center;
		gap: 40px;
		border-bottom: 1px solid hsl(var(--border));
	}

	.hero-copy {
		display: flex;
		flex-direction: column;
		gap: 22px;

		h1 {
			margin: 0;
			font-size: clamp(48px, 8vw, 92px);
			line-height: 0.95;
			font-weight: 900;
		}

		p {
			max-width: 660px;
			margin: 0;
			color: hsl(var(--muted-foreground));
			font-size: 18px;
			line-height: 1.65;
		}
	}

	.eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		color: #0f766e;
		font-size: 13px;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0;
	}

	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}

	.primary-cta,
	.secondary-cta,
	.versus-info-band a,
	.versus-mod a {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		border-radius: 8px;
		font-weight: 800;
		text-decoration: none;
		transition:
			transform 0.15s ease,
			background 0.15s ease,
			border-color 0.15s ease;

		&:hover {
			transform: translateY(-1px);
		}
	}

	.primary-cta {
		background: hsl(var(--foreground));
		color: hsl(var(--background));
		padding: 12px 18px;
	}

	.secondary-cta {
		border: 1px solid hsl(var(--border));
		color: hsl(var(--foreground));
		padding: 12px 18px;

		&:hover {
			background: hsl(var(--muted));
		}
	}

	.versus-preview {
		position: relative;
		padding: 18px;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		background:
			linear-gradient(135deg, rgba(20, 184, 166, 0.92), rgba(15, 23, 42, 0.96)),
			linear-gradient(90deg, rgba(250, 204, 21, 0.32), rgba(244, 63, 94, 0.28));
		color: #fff;
		box-shadow: 0 24px 70px rgba(15, 23, 42, 0.22);
		overflow: hidden;
	}

	.versus-preview::before {
		content: '';
		position: absolute;
		inset: 0;
		background:
			linear-gradient(rgba(255, 255, 255, 0.09) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 255, 255, 0.09) 1px, transparent 1px);
		background-size: 30px 30px;
		mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.9), transparent);
		pointer-events: none;
	}

	.preview-header,
	.preview-match,
	.preview-level,
	.preview-progress {
		position: relative;
		z-index: 1;
	}

	.preview-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 12px;
		font-weight: 900;
		text-transform: uppercase;
		letter-spacing: 0;
	}

	.preview-match {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 14px;
		margin: 34px 0 24px;
	}

	.preview-player {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		text-align: center;

		div {
			width: 62px;
			height: 62px;
			border-radius: 8px;
			display: grid;
			place-items: center;
			background: rgba(255, 255, 255, 0.18);
			border: 1px solid rgba(255, 255, 255, 0.3);
			font-weight: 900;
		}

		span {
			font-size: 12px;
			opacity: 0.75;
		}
	}

	.preview-vs {
		width: 46px;
		height: 46px;
		border-radius: 999px;
		display: grid;
		place-items: center;
		background: rgba(255, 255, 255, 0.95);
		color: #0f172a;
		font-weight: 900;
	}

	.preview-level {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 18px;
		padding: 12px;
		border-radius: 8px;
		background: rgba(15, 23, 42, 0.35);

		span {
			opacity: 0.72;
		}
	}

	.preview-progress {
		height: 9px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.18);
		overflow: hidden;

		span {
			display: block;
			height: 100%;
			border-radius: inherit;
			background: #facc15;
		}

		&.rival {
			margin-top: 8px;

			span {
				background: #fb7185;
			}
		}
	}

	.versus-features {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 14px;

		article {
			padding: 18px;
			border: 1px solid hsl(var(--border));
			border-radius: 8px;
			background: hsl(var(--card));
			display: flex;
			flex-direction: column;
			gap: 10px;
		}

		h2,
		p {
			margin: 0;
		}

		h2 {
			font-size: 16px;
			font-weight: 850;
		}

		p {
			color: hsl(var(--muted-foreground));
			font-size: 14px;
			line-height: 1.55;
		}
	}

	.versus-info-band,
	.versus-mod {
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		background: hsl(var(--muted) / 0.45);
	}

	.versus-info-band {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
		padding: 28px;

		span {
			display: block;
			margin-bottom: 8px;
			color: #0f766e;
			font-size: 12px;
			font-weight: 900;
			text-transform: uppercase;
		}

		h2,
		p {
			margin: 0;
		}

		p {
			margin-top: 10px;
			max-width: 720px;
			color: hsl(var(--muted-foreground));
			line-height: 1.6;
		}

		a {
			flex: 0 0 auto;
			background: hsl(var(--foreground));
			color: hsl(var(--background));
			padding: 11px 16px;
		}
	}

	.versus-steps {
		display: grid;
		grid-template-columns: 0.7fr 1.3fr;
		gap: 24px;
		align-items: start;

		span {
			color: #0f766e;
			font-size: 12px;
			font-weight: 900;
			text-transform: uppercase;
		}

		h2 {
			margin: 8px 0 0;
			font-size: 30px;
		}

		ol {
			margin: 0;
			padding: 0;
			list-style: none;
			display: grid;
			gap: 12px;
		}

		li {
			padding: 18px;
			border-left: 3px solid #14b8a6;
			background: hsl(var(--card));
		}

		p {
			margin: 6px 0 0;
			color: hsl(var(--muted-foreground));
			line-height: 1.55;
		}
	}

	.versus-mod {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 20px;

		h2,
		p {
			margin: 0;
		}

		p {
			margin-top: 4px;
			color: hsl(var(--muted-foreground));
		}

		a {
			margin-left: auto;
			border: 1px solid hsl(var(--border));
			color: hsl(var(--foreground));
			padding: 9px 14px;
			white-space: nowrap;
		}
	}

	@media (max-width: 900px) {
		.versus-hero,
		.versus-steps {
			grid-template-columns: 1fr;
		}

		.versus-hero {
			padding: 28px 0;
		}

		.versus-features {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.versus-info-band,
		.versus-mod {
			align-items: flex-start;
			flex-direction: column;
		}

		.versus-mod a {
			margin-left: 0;
		}
	}

	@media (max-width: 560px) {
		.versus-landing {
			width: min(100% - 20px, 1180px);
			padding-top: 12px;
		}

		.hero-copy h1 {
			font-size: 52px;
		}

		.hero-copy p {
			font-size: 16px;
		}

		.versus-features {
			grid-template-columns: 1fr;
		}

		.preview-match {
			gap: 8px;
		}

		.preview-player div {
			width: 52px;
			height: 52px;
		}
	}
</style>
