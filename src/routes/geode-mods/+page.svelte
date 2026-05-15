<script lang="ts">
	import { buttonVariants } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { cn } from '$lib/utils';
	import { _ } from 'svelte-i18n';
	import {
		ArrowUpRight,
		CheckCircle2,
		Download,
		Gamepad2,
		ListChecks,
		ShieldCheck,
		Sparkles,
		Trophy
	} from 'lucide-svelte';

	const modDownloadUrl =
		'https://github.com/Demon-List-VN/geode-mod/releases/latest/download/nampe.gdvn.geode';
	const geodeInstallUrl = 'https://geode-sdk.org/install';
	const releaseUrl = 'https://github.com/Demon-List-VN/geode-mod/releases/latest';

	let installDialogOpen = false;

	function downloadMod() {
		const iframe = document.createElement('iframe');
		iframe.src = modDownloadUrl;
		iframe.style.display = 'none';
		document.body.appendChild(iframe);

		window.setTimeout(() => {
			iframe.remove();
		}, 30_000);

		installDialogOpen = true;
	}

	const features = [
		{
			icon: Trophy,
			title: 'geode_mods.features.list.title',
			description: 'geode_mods.features.list.description'
		},
		{
			icon: Gamepad2,
			title: 'geode_mods.features.activities.title',
			description: 'geode_mods.features.activities.description'
		},
		{
			icon: ShieldCheck,
			title: 'geode_mods.features.otp.title',
			description: 'geode_mods.features.otp.description'
		}
	];

	const steps = ['geode_mods.steps.1', 'geode_mods.steps.2', 'geode_mods.steps.3'];
</script>

<svelte:head>
	<title>{$_('geode_mods.title')} - GDVN</title>
	<meta name="description" content={$_('geode_mods.description')} />
</svelte:head>

<main class="geodePage">
	<section class="hero">
		<div class="heroCopy">
			<div class="kicker">
				<Sparkles size={16} />
				<span>{$_('geode_mods.kicker')}</span>
			</div>
			<h1>{$_('geode_mods.title')}</h1>
			<p>{$_('geode_mods.description')}</p>
			<div class="actions">
				<a
					class={cn(buttonVariants({ size: 'lg' }), 'primaryAction')}
					href={modDownloadUrl}
					rel="noopener noreferrer"
					on:click|preventDefault={downloadMod}
				>
					<Download size={18} />
					<span>{$_('geode_mods.download')}</span>
				</a>
				<a
					class={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'secondaryAction')}
					href={geodeInstallUrl}
					target="_blank"
					rel="noopener noreferrer"
				>
					<ArrowUpRight size={18} />
					<span>{$_('geode_mods.geode')}</span>
				</a>
			</div>
			<div class="downloadNote">
				<CheckCircle2 size={16} />
				<span>{$_('geode_mods.version_note')}</span>
			</div>
		</div>

		<div class="packagePanel" aria-label="GDVN Geode package">
			<img src="/logo.png" alt="GDVN logo" />
			<div>
				<span>nampe.gdvn.geode</span>
				<strong>GDVN</strong>
			</div>
			<a href={releaseUrl} target="_blank" rel="noopener noreferrer">
				{$_('geode_mods.release_link')}
				<ArrowUpRight size={14} />
			</a>
		</div>
	</section>

	<section class="contentGrid">
		<div class="sectionHeader">
			<ListChecks size={20} />
			<h2>{$_('geode_mods.features_title')}</h2>
		</div>
		<div class="featureGrid">
			{#each features as feature}
				<article class="featureCard">
					<svelte:component this={feature.icon} class="featureIcon" size={22} />
					<h3>{$_(feature.title)}</h3>
					<p>{$_(feature.description)}</p>
				</article>
			{/each}
		</div>
	</section>

	<section class="installSection">
		<div class="sectionHeader">
			<Download size={20} />
			<h2>{$_('geode_mods.install_title')}</h2>
		</div>
		<ol class="stepList">
			{#each steps as step, index}
				<li>
					<span class="stepNumber">{index + 1}</span>
					<span>{$_(step)}</span>
				</li>
			{/each}
		</ol>
		<p>{$_('geode_mods.install_hint')}</p>
	</section>
</main>

<Dialog.Root bind:open={installDialogOpen}>
	<Dialog.Content class="installDialog">
		<Dialog.Header>
			<Dialog.Title>{$_('geode_mods.popup_title')}</Dialog.Title>
			<Dialog.Description>{$_('geode_mods.popup_description')}</Dialog.Description>
		</Dialog.Header>

		<ol class="stepList dialogSteps">
			{#each steps as step, index}
				<li>
					<span class="stepNumber">{index + 1}</span>
					<span>{$_(step)}</span>
				</li>
			{/each}
		</ol>

		<p class="dialogHint">{$_('geode_mods.install_hint')}</p>

		<Dialog.Footer class="dialogActions">
			<button
				type="button"
				class={cn(buttonVariants({ variant: 'outline' }), 'dialogButton')}
				on:click={() => (installDialogOpen = false)}
			>
				{$_('geode_mods.close')}
			</button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<style lang="scss">
	.geodePage {
		width: min(1120px, calc(100vw - 32px));
		margin: 0 auto;
		padding: 32px 0 72px;
		color: var(--textColor);
	}

	.hero {
		display: grid;
		grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.75fr);
		gap: 28px;
		align-items: stretch;
		min-height: 360px;
	}

	.heroCopy,
	.packagePanel,
	.contentGrid,
	.installSection {
		border: 1px solid var(--border1);
		background:
			linear-gradient(135deg, hsl(var(--primary) / 0.08), transparent 42%), hsl(var(--card));
		border-radius: 8px;
	}

	.heroCopy {
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding: clamp(28px, 6vw, 56px);
	}

	.kicker,
	.downloadNote,
	.sectionHeader {
		display: flex;
		align-items: center;
		gap: 8px;
		color: var(--textColor2);
	}

	.kicker {
		font-size: 13px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0;
	}

	h1 {
		margin: 14px 0 12px;
		font-size: clamp(38px, 7vw, 72px);
		line-height: 0.95;
		font-weight: 850;
		letter-spacing: 0;
	}

	.heroCopy > p {
		max-width: 640px;
		margin: 0;
		color: var(--textColor2);
		font-size: 18px;
		line-height: 1.6;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin-top: 28px;
	}

	.primaryAction,
	.secondaryAction {
		gap: 9px;
		text-decoration: none;
	}

	.downloadNote {
		margin-top: 16px;
		font-size: 14px;
	}

	.packagePanel {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 28px;
		overflow: hidden;
	}

	.packagePanel img {
		width: 124px;
		height: auto;
		filter: invert(var(--inverted));
	}

	.packagePanel div {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.packagePanel span {
		color: var(--textColor2);
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 13px;
	}

	.packagePanel strong {
		font-size: 34px;
		line-height: 1;
	}

	.packagePanel a {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		width: fit-content;
		color: hsl(var(--primary));
		font-weight: 650;
		text-decoration: none;
	}

	.contentGrid,
	.installSection {
		margin-top: 24px;
		padding: 28px;
	}

	.sectionHeader h2 {
		margin: 0;
		color: var(--textColor);
		font-size: 24px;
		line-height: 1.2;
	}

	.featureGrid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 14px;
		margin-top: 18px;
	}

	.featureCard {
		min-height: 156px;
		border: 1px solid var(--border1);
		border-radius: 8px;
		padding: 18px;
		background: hsl(var(--background));
	}

	.featureIcon {
		color: hsl(var(--primary));
	}

	.featureCard h3 {
		margin: 14px 0 8px;
		font-size: 17px;
		line-height: 1.25;
	}

	.featureCard p,
	.installSection p {
		margin: 0;
		color: var(--textColor2);
		line-height: 1.55;
	}

	.stepList {
		display: grid;
		gap: 12px;
		margin: 18px 0;
		padding: 0;
		list-style: none;
	}

	.stepList li {
		display: grid;
		grid-template-columns: 32px minmax(0, 1fr);
		gap: 12px;
		align-items: start;
		line-height: 1.55;
		color: var(--textColor);
	}

	.stepNumber {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 999px;
		background: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
		font-size: 14px;
		font-weight: 800;
		line-height: 1;
	}

	:global(.installDialog) {
		max-width: 560px;
	}

	.dialogSteps {
		gap: 10px;
		margin: 4px 0 0;
	}

	.dialogSteps li {
		grid-template-columns: 28px minmax(0, 1fr);
		line-height: 1.5;
	}

	.dialogSteps .stepNumber {
		width: 28px;
		height: 28px;
		font-size: 13px;
	}

	.dialogHint {
		margin: 0;
		color: var(--textColor2);
		font-size: 14px;
		line-height: 1.5;
	}

	.dialogActions {
		gap: 10px;
	}

	.dialogButton {
		gap: 8px;
		text-decoration: none;
	}

	@media screen and (max-width: 860px) {
		.hero,
		.featureGrid {
			grid-template-columns: 1fr;
		}

		.hero {
			min-height: 0;
		}

		.packagePanel {
			gap: 28px;
		}
	}
</style>
