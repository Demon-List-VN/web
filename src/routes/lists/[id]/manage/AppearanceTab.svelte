<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import { _ } from 'svelte-i18n';

	type AssetInputMode = 'upload' | 'link';
	const CUSTOM_LIST_CDN_BASE_URL = 'https://cdn.gdvn.net';

	export let editForm: any;
	export let list: any = null;
	export let uploadingThemeAsset: 'banner' | 'favicon' | 'logo' | null = null;
	export let uploadAsset: (asset: 'banner' | 'favicon' | 'logo', file: File) => Promise<string | null | undefined> = async () => null;

	let bannerAssetMode: AssetInputMode = 'upload';
	let faviconAssetMode: AssetInputMode = 'upload';
	let logoAssetMode: AssetInputMode = 'upload';
	let bannerFileInput: HTMLInputElement | null = null;
	let faviconFileInput: HTMLInputElement | null = null;
	let logoFileInput: HTMLInputElement | null = null;

	$: if (list) {
		bannerAssetMode = inferAssetInputMode(list.bannerUrl);
		faviconAssetMode = inferAssetInputMode(list.faviconUrl);
		logoAssetMode = inferAssetInputMode(list.logoUrl);
	}

	function isHexColor(value: string | null | undefined) {
		return typeof value === 'string' && /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value.trim());
	}

	function inferAssetInputMode(value: string | null | undefined): AssetInputMode {
		if (typeof value !== 'string' || !value.trim()) {
			return 'upload';
		}

		return value.startsWith(`${CUSTOM_LIST_CDN_BASE_URL}/custom-lists/`) ? 'upload' : 'link';
	}

	function getColorPickerValue(value: string | null | undefined) {
		if (!isHexColor(value)) {
			return '#000000';
		}

		return (typeof value === 'string' ? value.trim() : '').slice(0, 7);
	}

	function updateThemeColor(field: 'backgroundColor' | 'borderColor', event: Event) {
		const input = event.currentTarget;

		if (!(input instanceof HTMLInputElement)) {
			return;
		}

		editForm = {
			...editForm,
			[field]: input.value
		};
	}

	function resetThemeColor(field: 'backgroundColor' | 'borderColor') {
		editForm = {
			...editForm,
			[field]: ''
		};
	}

	function getAssetModeLabel(mode: AssetInputMode) {
		return mode === 'upload'
			? $_('custom_lists.detail.edit.asset_mode_upload')
			: $_('custom_lists.detail.edit.asset_mode_link');
	}

	function getAssetModeOption(mode: AssetInputMode) {
		return {
			value: mode,
			label: getAssetModeLabel(mode)
		};
	}

	function updateEditFormField(field: 'backgroundColor' | 'borderColor' | 'bannerUrl' | 'faviconUrl' | 'logoUrl', value: string) {
		editForm = {
			...editForm,
			[field]: value
		};
	}

	function getInputValue(event: Event) {
		const target = event.currentTarget;
		return target instanceof HTMLInputElement ? target.value : '';
	}

	function setAssetMode(asset: 'banner' | 'favicon' | 'logo', selected: { value?: string } | undefined) {
		const value = selected?.value;

		if (value !== 'upload' && value !== 'link') {
			return;
		}

		if (asset === 'banner') {
			bannerAssetMode = value;
			return;
		}

		if (asset === 'favicon') {
			faviconAssetMode = value;
			return;
		}

		logoAssetMode = value;
	}

	function getFaviconPreviewUrl() {
		const value = editForm.faviconUrl?.trim();
		return /^https?:\/\//i.test(value) ? value : null;
	}

	function getLogoPreviewUrl() {
		const value = editForm.logoUrl?.trim();
		return /^https?:\/\//i.test(value) ? value : null;
	}

	function openBannerFilePicker() {
		bannerFileInput?.click();
	}

	function openFaviconFilePicker() {
		faviconFileInput?.click();
	}

	function openLogoFilePicker() {
		logoFileInput?.click();
	}

	async function handleAssetSelection(asset: 'banner' | 'favicon' | 'logo', event: Event) {
		const input = event.currentTarget;

		if (!(input instanceof HTMLInputElement)) {
			return;
		}

		const selectedFile = input.files?.[0];

		if (!selectedFile) {
			return;
		}

		const uploadedUrl = await uploadAsset(asset, selectedFile);

		if (uploadedUrl) {
			updateEditFormField(
				asset === 'banner' ? 'bannerUrl' : asset === 'favicon' ? 'faviconUrl' : 'logoUrl',
				uploadedUrl
			);
			if (asset === 'banner') {
				bannerAssetMode = 'upload';
			} else if (asset === 'favicon') {
				faviconAssetMode = 'upload';
			} else {
				logoAssetMode = 'upload';
			}
		}

		input.value = '';
	}
</script>

<input
	hidden
	type="file"
	accept="image/png,image/jpeg,image/webp,image/gif"
	on:change={(event) => handleAssetSelection('banner', event)}
	bind:this={bannerFileInput}
/>

<input
	hidden
	type="file"
	accept="image/png,image/jpeg,image/webp,image/gif,image/x-icon,.ico"
	on:change={(event) => handleAssetSelection('favicon', event)}
	bind:this={faviconFileInput}
/>

<input
	hidden
	type="file"
	accept="image/png,image/jpeg,image/webp,image/gif"
	on:change={(event) => handleAssetSelection('logo', event)}
	bind:this={logoFileInput}
/>

<div class="tabContent">
	<div class="toolCard">
		<h2 class="toolHeading">{$_('custom_lists.detail.edit.appearance_heading')}</h2>
		<div class="formGrid">
			<div class="field">
				<span class="fieldLabel">{$_('custom_lists.detail.edit.appearance_heading')}</span>
				<p class="hint">{$_('custom_lists.detail.edit.appearance_hint')}</p>
			</div>
			<div class="field">
				<label for="list-background-color">{$_('custom_lists.detail.edit.background_color_label')}</label>
				<div class="colorFieldRow">
					<input
						class="nativeColorInput"
						type="color"
						value={getColorPickerValue(editForm.backgroundColor)}
						on:input={(event) => updateThemeColor('backgroundColor', event)}
						aria-label={$_('custom_lists.detail.edit.background_color_label')}
					/>
					<Button variant="ghost" size="sm" on:click={() => resetThemeColor('backgroundColor')}>
						{$_('general.reset')}
					</Button>
				</div>
				<p class="hint">{$_('custom_lists.detail.edit.background_color_hint')}</p>
			</div>
			<div class="field">
				<label for="list-border-color">{$_('custom_lists.detail.edit.border_color_label')}</label>
				<div class="colorFieldRow">
					<input
						class="nativeColorInput"
						type="color"
						value={getColorPickerValue(editForm.borderColor)}
						on:input={(event) => updateThemeColor('borderColor', event)}
						aria-label={$_('custom_lists.detail.edit.border_color_label')}
					/>
					<Button variant="ghost" size="sm" on:click={() => resetThemeColor('borderColor')}>
						{$_('general.reset')}
					</Button>
				</div>
				<p class="hint">{$_('custom_lists.detail.edit.border_color_hint')}</p>
			</div>
			<div class="field">
				<label for="list-banner-asset-mode">{$_('custom_lists.detail.edit.banner_url_label')}</label>
				<div class="assetControlRow">
					<div class="assetModeTrigger">
						<Select.Root
							selected={getAssetModeOption(bannerAssetMode)}
							onSelectedChange={(selected) => setAssetMode('banner', selected)}
						>
							<Select.Trigger aria-label={$_('custom_lists.detail.edit.banner_url_label')}>
								<Select.Value placeholder={getAssetModeLabel(bannerAssetMode)} />
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="upload">{$_('custom_lists.detail.edit.asset_mode_upload')}</Select.Item>
								<Select.Item value="link">{$_('custom_lists.detail.edit.asset_mode_link')}</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
					{#if bannerAssetMode === 'upload'}
						<div class="assetAction">
							<Button variant="outline" size="sm" on:click={openBannerFilePicker} disabled={uploadingThemeAsset === 'banner'}>
								{uploadingThemeAsset === 'banner'
									? `${$_('general.loading')}...`
									: $_('custom_lists.detail.edit.banner_upload_button')}
							</Button>
						</div>
					{:else}
						<div class="assetFieldInput">
							<Input
								id="list-banner-url"
								value={editForm.bannerUrl}
								placeholder={$_('custom_lists.detail.edit.banner_url_placeholder')}
								on:input={(event) => updateEditFormField('bannerUrl', getInputValue(event))}
							/>
						</div>
					{/if}
				</div>
				<p class="hint">{bannerAssetMode === 'upload' ? $_('custom_lists.detail.edit.asset_upload_hint') : $_('custom_lists.detail.edit.banner_url_hint')}</p>
			</div>
			<div class="field">
				<label for="list-favicon-asset-mode">{$_('custom_lists.detail.edit.favicon_url_label')}</label>
				<div class="assetControlRow">
					<div class="assetModeTrigger">
						<Select.Root
							selected={getAssetModeOption(faviconAssetMode)}
							onSelectedChange={(selected) => setAssetMode('favicon', selected)}
						>
							<Select.Trigger aria-label={$_('custom_lists.detail.edit.favicon_url_label')}>
								<Select.Value placeholder={getAssetModeLabel(faviconAssetMode)} />
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="upload">{$_('custom_lists.detail.edit.asset_mode_upload')}</Select.Item>
								<Select.Item value="link">{$_('custom_lists.detail.edit.asset_mode_link')}</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
					{#if faviconAssetMode === 'upload'}
						<div class="assetAction">
							<Button variant="outline" size="sm" on:click={openFaviconFilePicker} disabled={uploadingThemeAsset === 'favicon'}>
								{uploadingThemeAsset === 'favicon'
									? `${$_('general.loading')}...`
									: $_('custom_lists.detail.edit.favicon_upload_button')}
							</Button>
						</div>
					{:else}
						<div class="assetFieldInput">
							<Input
								id="list-favicon-url"
								value={editForm.faviconUrl}
								placeholder={$_('custom_lists.detail.edit.favicon_url_placeholder')}
								on:input={(event) => updateEditFormField('faviconUrl', getInputValue(event))}
							/>
						</div>
					{/if}
				</div>
				<p class="hint">{faviconAssetMode === 'upload' ? $_('custom_lists.detail.edit.asset_upload_hint') : $_('custom_lists.detail.edit.favicon_url_hint')}</p>
				{#if getFaviconPreviewUrl()}
					<div class="assetPreview assetPreviewFavicon">
						<img src={getFaviconPreviewUrl()} alt="" loading="lazy" decoding="async" />
					</div>
				{/if}
			</div>
			<div class="field">
				<label for="list-logo-asset-mode">{$_('custom_lists.detail.edit.logo_url_label')}</label>
				<div class="assetControlRow">
					<div class="assetModeTrigger">
						<Select.Root
							selected={getAssetModeOption(logoAssetMode)}
							onSelectedChange={(selected) => setAssetMode('logo', selected)}
						>
							<Select.Trigger aria-label={$_('custom_lists.detail.edit.logo_url_label')}>
								<Select.Value placeholder={getAssetModeLabel(logoAssetMode)} />
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="upload">{$_('custom_lists.detail.edit.asset_mode_upload')}</Select.Item>
								<Select.Item value="link">{$_('custom_lists.detail.edit.asset_mode_link')}</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
					{#if logoAssetMode === 'upload'}
						<div class="assetAction">
							<Button variant="outline" size="sm" on:click={openLogoFilePicker} disabled={uploadingThemeAsset === 'logo'}>
								{uploadingThemeAsset === 'logo'
									? `${$_('general.loading')}...`
									: $_('custom_lists.detail.edit.logo_upload_button')}
							</Button>
						</div>
					{:else}
						<div class="assetFieldInput">
							<Input
								id="list-logo-url"
								value={editForm.logoUrl}
								placeholder={$_('custom_lists.detail.edit.logo_url_placeholder')}
								on:input={(event) => updateEditFormField('logoUrl', getInputValue(event))}
							/>
						</div>
					{/if}
				</div>
				<p class="hint">{logoAssetMode === 'upload' ? $_('custom_lists.detail.edit.asset_upload_hint') : $_('custom_lists.detail.edit.logo_url_hint')}</p>
				{#if getLogoPreviewUrl()}
					<div class="assetPreview assetPreviewLogo">
						<img src={getLogoPreviewUrl()} alt="" loading="lazy" decoding="async" />
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style lang="scss">
	.tabContent {
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin-top: 16px;
	}

	.toolCard {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		padding: 22px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.toolHeading {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
	}

	.formGrid {
		display: grid;
		gap: 14px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	label,
	.fieldLabel {
		font-size: 0.9rem;
		font-weight: 500;
	}

	.hint {
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
		margin: 0;
	}

	.assetControlRow {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.assetModeTrigger {
		min-width: 180px;
	}

	.assetAction {
		flex-shrink: 0;
	}

	.assetFieldInput {
		flex: 1 1 240px;
		min-width: min(100%, 240px);
	}

	.colorFieldRow {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.nativeColorInput {
		width: 42px;
		height: 42px;
		padding: 0;
		border: 1px solid hsl(var(--border));
		border-radius: 10px;
		background: transparent;
		cursor: pointer;
		flex-shrink: 0;
	}

	.nativeColorInput::-webkit-color-swatch-wrapper {
		padding: 4px;
	}

	.nativeColorInput::-webkit-color-swatch {
		border: none;
		border-radius: 8px;
	}

	.nativeColorInput::-moz-color-swatch {
		border: none;
		border-radius: 8px;
	}

	.assetPreview {
		width: fit-content;
		padding: 10px;
		border: 1px solid hsl(var(--border));
		border-radius: 10px;
		background: hsl(var(--muted) / 0.12);
	}

	.assetPreview img {
		display: block;
		max-width: 100%;
	}

	.assetPreviewLogo img {
		width: 56px;
		height: 56px;
		object-fit: contain;
	}

	.assetPreviewFavicon img {
		width: 32px;
		height: 32px;
		object-fit: contain;
	}

	@media (max-width: 760px) {
		.toolCard {
			padding: 16px;
		}
	}
</style>