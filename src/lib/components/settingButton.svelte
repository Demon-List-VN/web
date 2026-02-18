<script lang="ts">
	import { onMount } from 'svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Table from '$lib/components/ui/table';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Switch } from '$lib/components/ui/switch';
	import { user } from '$lib/client';
	import { setMode } from 'mode-watcher';
	import { toast } from 'svelte-sonner';
	import Gear from 'svelte-radix/Gear.svelte';
	import Sun from 'svelte-radix/Sun.svelte';
	import Trash from 'svelte-radix/Trash.svelte';
	import Moon from 'svelte-radix/Moon.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { isActive } from '$lib/client/isSupporterActive';
	import { locale, _ } from 'svelte-i18n';
	import { Input } from '$lib/components/ui/input';
	import { browser } from '$app/environment';

	let token = '';
	let open1 = false;
	let APIKeys: any[] = [];

	async function fetchAPIKeys() {
		if (!$user.loggedIn) {
			return;
		}

		APIKeys = await (
			await fetch(`${import.meta.env.VITE_API_URL}/APIKey`, {
				headers: {
					Authorization: 'Bearer ' + (await $user.token())!
				}
			})
		).json();
	}

	async function copyToClipboard(value: string) {
		await navigator.clipboard.writeText(value);
		toast.success('Copied API key to clipboard!');
	}

	async function createNewKey() {
		await fetch(`${import.meta.env.VITE_API_URL}/APIKey`, {
			method: 'POST',
			headers: {
				Authorization: 'Bearer ' + (await $user.token())!
			}
		});

		toast.success('Created a new API key!');
		fetchAPIKeys();
	}

	async function deleteKey(key: string) {
		await fetch(`${import.meta.env.VITE_API_URL}/APIKey/${key}`, {
			method: 'DELETE',
			headers: {
				Authorization: 'Bearer ' + (await $user.token())!
			}
		});

		toast.success('Key deleted!');
		fetchAPIKeys();
	}

	async function pointercrateLink() {
		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/auth/link/pointercrate`, {
				method: 'PATCH',
				body: JSON.stringify({
					token: token
				}),
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Bearer ' + (await $user.token())!
				}
			}),
			{
				loading: $_('pointercrate_link.loading'),
				success: () => {
					window.location.reload();
					return $_('pointercrate_link.success');
				},
				error: $_('pointercrate_link.error')
			}
		);
	}

	$: ($user, fetchAPIKeys());

	onMount(() => {
		// If the key hasn't been set yet, enable the dashboard by default
		if (browser && localStorage.getItem('settings.dashboardEnabled') === null) {
			localStorage.setItem('settings.dashboardEnabled', 'true');
		}
	});

	function setTheme(theme: string) {
		document.documentElement.setAttribute('data-theme', theme);
		localStorage.setItem('theme', theme);
	}
</script>

<Dialog.Root>
	<Dialog.Trigger let:builder>
		<Button builders={[builder]} variant="outline" size="icon">
			<Gear class="h-[1.2rem] w-[1.2rem]" />
			<span class="sr-only">{$_('settings.title')}</span>
		</Button>
	</Dialog.Trigger>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{$_('settings.title')}</Dialog.Title>
		</Dialog.Header>
		<Tabs.Root value="general">
			<Tabs.List>
				<Tabs.Trigger value="general">{$_('settings.tabs.general')}</Tabs.Trigger>
				<Tabs.Trigger value="api">{$_('settings.tabs.api')}</Tabs.Trigger>
				<Tabs.Trigger value="sub">{$_('settings.tabs.sub')}</Tabs.Trigger>
				<Tabs.Trigger value="discord">Discord</Tabs.Trigger>
				<Tabs.Trigger value="pointercrate">Pointercrate</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="general">
				<div class="setting">
					<Label>{$_('settings.general.theme.title')}</Label>
					<div class="right">
						<Tooltip.Root>
							<Tooltip.Trigger let:builder>
								<Button
									builders={[builder]}
									variant="outline"
									size="icon"
									on:click={() => {
										setMode('light');
										setTheme('light');
									}}
								>
									<Sun class="h-[1.2rem] w-[1.2rem]" />
								</Button>
							</Tooltip.Trigger>
							<Tooltip.Content>
								<p>{$_('settings.general.theme.light')}</p>
							</Tooltip.Content>
						</Tooltip.Root>
						<Tooltip.Root>
							<Tooltip.Trigger let:builder>
								<Button
									builders={[builder]}
									variant="outline"
									size="icon"
									on:click={() => {
										setMode('dark');
										setTheme('dark');
									}}
								>
									<Moon class="h-[1.2rem] w-[1.2rem]" />
								</Button>
							</Tooltip.Trigger>
							<Tooltip.Content>
								<p>{$_('settings.general.theme.dark')}</p>
							</Tooltip.Content>
						</Tooltip.Root>
						{#if $user.loggedIn && isActive($user.data.supporterUntil)}
							<Tooltip.Root>
								<Tooltip.Trigger let:builder>
									<Button
										builders={[builder]}
										variant="outline"
										size="icon"
										on:click={() => {
											setMode('dark');
											setTheme('red');
										}}
									>
										<div class="h-[1.2rem] w-[1.2rem] rounded-full bg-red-500"></div>
									</Button>
								</Tooltip.Trigger>
								<Tooltip.Content>
									<p>{$_('settings.general.theme.red')}</p>
								</Tooltip.Content>
							</Tooltip.Root>
							<Tooltip.Root>
								<Tooltip.Trigger let:builder>
									<Button
										builders={[builder]}
										variant="outline"
										size="icon"
										on:click={() => {
											setMode('dark');
											setTheme('green');
										}}
									>
										<div class="h-[1.2rem] w-[1.2rem] rounded-full bg-green-500"></div>
									</Button>
								</Tooltip.Trigger>
								<Tooltip.Content>
									<p>{$_('settings.general.theme.green')}</p>
								</Tooltip.Content>
							</Tooltip.Root>
							<Tooltip.Root>
								<Tooltip.Trigger let:builder>
									<Button
										builders={[builder]}
										variant="outline"
										size="icon"
										on:click={() => {
											setMode('dark');
											setTheme('blue');
										}}
									>
										<div class="h-[1.2rem] w-[1.2rem] rounded-full bg-blue-500"></div>
									</Button>
								</Tooltip.Trigger>
								<Tooltip.Content>
									<p>{$_('settings.general.theme.blue')}</p>
								</Tooltip.Content>
							</Tooltip.Root>
							<Tooltip.Root>
								<Tooltip.Trigger let:builder>
									<Button
										builders={[builder]}
										variant="outline"
										size="icon"
										on:click={() => {
											setMode('dark');
											setTheme('pink');
										}}
									>
										<div class="h-[1.2rem] w-[1.2rem] rounded-full bg-pink-500"></div>
									</Button>
								</Tooltip.Trigger>
								<Tooltip.Content>
									<p>{$_('settings.general.theme.pink')}</p>
								</Tooltip.Content>
							</Tooltip.Root>
							<Tooltip.Root>
								<Tooltip.Trigger let:builder>
									<Button
										builders={[builder]}
										variant="outline"
										size="icon"
										on:click={() => {
											setMode('dark');
											setTheme('gold');
										}}
									>
										<div class="h-[1.2rem] w-[1.2rem] rounded-full bg-yellow-500"></div>
									</Button>
								</Tooltip.Trigger>
								<Tooltip.Content>
									<p>{$_('settings.general.theme.gold')}</p>
								</Tooltip.Content>
							</Tooltip.Root>
						{/if}
					</div>
				</div>
				<div class="setting">
					<Label>{$_('settings.general.language.title')}</Label>
					<div class="right">
						<Button
							variant="outline"
							size="sm"
							on:click={() => {
								const currentLang = $locale;
								const newLang = currentLang === 'en' ? 'vi' : 'en';
								locale.set(newLang);
							}}
						>
							{$locale === 'vi' ? 'Tiếng Việt' : 'English'}
						</Button>
					</div>
				</div>
			</Tabs.Content>
			<Tabs.Content value="api">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="w-[70px]">{$_('settings.api.key')}</Table.Head>
							<Table.Head>{$_('settings.api.created_at')}</Table.Head>
							<Table.Head class="text-right"></Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each APIKeys as key}
							<Table.Row>
								<Table.Cell class="font-medium" on:click={() => {}}>
									<button on:click={() => copyToClipboard(key.key)} class="w-[50px] truncate">
										{key.key}
									</button>
								</Table.Cell>
								<Table.Cell>{new Date(key.createdAt).toLocaleString('vi-VN')}</Table.Cell>
								<Table.Cell class="text-right">
									<AlertDialog.Root>
										<AlertDialog.Trigger asChild let:builder>
											<Button variant="destructive" size="icon" builders={[builder]}
												><Trash size={20} /></Button
											>
										</AlertDialog.Trigger>
										<AlertDialog.Content>
											<AlertDialog.Header>
												<AlertDialog.Title>{$_('settings.api.delete.title')}</AlertDialog.Title>
												<AlertDialog.Description>
													{$_('settings.api.delete.description')}
												</AlertDialog.Description>
											</AlertDialog.Header>
											<AlertDialog.Footer>
												<AlertDialog.Cancel>{$_('settings.api.delete.cancel')}</AlertDialog.Cancel>
												<AlertDialog.Action on:click={() => deleteKey(key.key)}
													>{$_('settings.api.delete.continue')}</AlertDialog.Action
												>
											</AlertDialog.Footer>
										</AlertDialog.Content>
									</AlertDialog.Root>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
				<AlertDialog.Root>
					<AlertDialog.Trigger asChild let:builder>
						<Button builders={[builder]} class="mt-[10px] w-full" variant="outline"
							>{$_('settings.api.create.button')}</Button
						>
					</AlertDialog.Trigger>
					<AlertDialog.Content>
						<AlertDialog.Header>
							<AlertDialog.Title>{$_('settings.api.create.title')}</AlertDialog.Title>
							<AlertDialog.Description>
								{$_('settings.api.create.description')}
							</AlertDialog.Description>
						</AlertDialog.Header>
						<AlertDialog.Footer>
							<AlertDialog.Cancel>{$_('settings.api.create.cancel')}</AlertDialog.Cancel>
							<AlertDialog.Action on:click={createNewKey}
								>{$_('settings.api.create.continue')}</AlertDialog.Action
							>
						</AlertDialog.Footer>
					</AlertDialog.Content>
				</AlertDialog.Root>
			</Tabs.Content>
			<Tabs.Content value="sub">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="w-[120px]">{$_('settings.subscriptions.name')}</Table.Head>
							<Table.Head>{$_('settings.subscriptions.active_until')}</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						<Table.Row>
							{#if $user.loggedIn}
								<Table.Cell class="font-medium">Supporter Role</Table.Cell>
								{#if $user.data.supporterUntil == null}
									<Table.Cell>Not activated</Table.Cell>
								{:else}
									<Table.Cell
										>{new Date($user.data.supporterUntil).toLocaleString('vi-VN')}
										{isActive($user.data.supporterUntil)
											? ''
											: `(${$_('settings.subscriptions.expired')})`}</Table.Cell
									>
								{/if}
							{/if}
						</Table.Row>
					</Table.Body>
				</Table.Root>
			</Tabs.Content>
			<Tabs.Content value="discord">
				{#if $user.loggedIn}
					{#if $user.data.discord}
						<Button class="w-full" variant="outline" disabled
							>{$_('settings.account.linked')}</Button
						>
					{:else}
						<a
							href="https://discord.com/oauth2/authorize?client_id=1071500325338488843&response_type=code&redirect_uri=https%3A%2F%2Fapi.gdvn.net%2Fauth%2Fcallback%2Fdiscord&scope=identify"
						>
							<Button class="w-full" variant="outline">{$_('settings.account.link')}</Button>
						</a>
					{/if}
				{/if}
			</Tabs.Content>
			<Tabs.Content value="pointercrate">
				{#if $user.loggedIn}
					{#if $user.data.pointercrate}
						<Button class="w-full" variant="outline" disabled
							>{$_('settings.account.linked')}</Button
						>
					{:else}
						<Dialog.Root bind:open={open1}>
							<Dialog.Trigger class="w-full">
								<Button class="w-full" variant="outline">{$_('settings.account.link')}</Button>
							</Dialog.Trigger>
							<Dialog.Content>
								<Dialog.Header>
									<Dialog.Title>{$_('settings.account.pointercrate.title')}</Dialog.Title>
									<Input
										inputmode="numeric"
										placeholder={$_('settings.account.pointercrate.placeholder')}
										bind:value={token}
									/>
								</Dialog.Header>
								<Button on:click={pointercrateLink}>{$_('settings.account.link')}</Button>
							</Dialog.Content>
						</Dialog.Root>
					{/if}
				{/if}
			</Tabs.Content>
		</Tabs.Root>
	</Dialog.Content>
</Dialog.Root>

<style lang="scss">
	.setting {
		display: flex;
		align-items: center;
		margin-top: 10px;
		margin-bottom: 10px;

		.right {
			margin-left: auto;
		}
	}
</style>
