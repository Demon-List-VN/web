<script lang="ts">
	import * as Command from '$lib/components/ui/command';
	import * as Avatar from '$lib/components/ui/avatar';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import Loading from '$lib/components/animation/loading.svelte';
	import * as ContextMenu from '$lib/components/ui/context-menu';
	import { toast } from 'svelte-sonner';
	import { isActive } from '$lib/client/isSupporterActive';
	import { user } from '$lib/client';
	import { _ } from 'svelte-i18n';

	export let open: boolean;
	export let value: string = '';

	let result: any = {
		levels: [],
		gdBrowserLevels: [],
		players: []
	};

	let state = 0;

	$: $page.url, close();
	$: open && onChange();

	function close() {
		open = false;
	}

	function onChange() {
		result = {
			levels: [],
			gdBrowserLevels: [],
			players: []
		};

		value = '';
		state = 0;
	}

	async function getSearchAuthHeaders(): Promise<Record<string, string>> {
		const token = $user ? await $user.token() : null;
		const headers: Record<string, string> = {};

		if (token) {
			headers.Authorization = `Bearer ${token}`;
		}

		return headers;
	}

	async function search() {
		if (value == '') {
			return;
		}

		const promises = [
			fetch(`${import.meta.env.VITE_API_URL}/search/${value}`, {
				headers: await getSearchAuthHeaders()
			}).then((res) => res.json()),
			fetch(`https://gdbrowser.com/api/search/${value}?page=0&count=5&diff=-2`) // TODO: Migrate to own GD API
				.then((res) => res.json())
				.catch((err) => [])
		];

		if (value.startsWith('discord:')) {
			promises[1] = Promise.resolve([]);
		}

		state = 1;

		Promise.all(promises)
			.then((res: any[]) => {
				if (!res[0] || !res[1]) {
					return;
				}

				result = {
					levels: res[0].levels,
					gdBrowserLevels: [],
					players: res[0].players
				};

				for (let i of res[1]) {
					result.gdBrowserLevels.push({
						id: i.id,
						name: i.name,
						creator: i.author,
						other: true
					});
				}

				value = '';
				state = 2;
			})
			.catch((err) => {
				state = 2;
			});
	}

	onMount(() => {
		function handleKeydown(e: KeyboardEvent) {
			if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				open = !open;
			}
		}

		document.addEventListener('keydown', handleKeydown);
		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

<svelte:window
	on:keydown={(e) => {
		if (!open) {
			return;
		}

		if (e.key == 'Enter') {
			if (state == 0) {
				search();
			}
		}
	}}
/>

<Command.Dialog bind:open>
	<Command.Input bind:value placeholder={$_("search.placeholder")} disabled={state != 0} />
	<Command.List>
		{#if state != 0}
			{#if state != 1}
				<Command.Empty>{$_("search.no_result")}</Command.Empty>
			{:else}
				<Command.Empty>
					<Loading inverted={true} />
				</Command.Empty>
			{/if}
			{#if result.levels.length}
				<Command.Group heading={$_("search.dlvn")}>
					{#each result.levels as item}
						<ContextMenu.Root>
							<ContextMenu.Trigger>
								<!--View levels rank-->
								{#if 'other' in item}
									<a href={`/level/${item.id}?list=other`} data-sveltekit-preload-data="tap">
										<Command.Item>
											{#if item.dlTop}
												<span class="mr-1 font-bold text-white">#{item.dlTop} DL</span>
											{:else if item.flTop}
												<span class="mr-1 font-bold text-white">#{item.flTop} FL</span>
											{/if}
											{item.name} by {item.creator} ({item.id}) (Not added)
										</Command.Item>
									</a>
								{:else}
									<a href={`/level/${item.id}`} data-sveltekit-preload-data="tap">
										<Command.Item>
											{#if item.dlTop}
												<span class="mr-1 font-bold text-white">#{item.dlTop} DL</span>
											{:else if item.flTop}
												<span class="mr-1 font-bold text-white">#{item.flTop} FL</span>
											{/if}
											{item.name} by {item.creator} ({item.id})
										</Command.Item>
									</a>
								{/if}
							</ContextMenu.Trigger>
							<ContextMenu.Content>
								<ContextMenu.Item
									on:click={async () => {
										await navigator.clipboard.writeText(item.id);
										toast.success('Copied to clipboard!');
									}}>Copy level's ID</ContextMenu.Item
								>
							</ContextMenu.Content>
						</ContextMenu.Root>
					{/each}
				</Command.Group>
			{/if}
			{#if result.gdBrowserLevels.length}
				<Command.Group heading={$_("search.gd")}>
					{#each result.gdBrowserLevels as item}
						<ContextMenu.Root>
							<ContextMenu.Trigger>
								{#if 'other' in item}
									<a href={`/level/${item.id}?list=other`} data-sveltekit-preload-data="tap">
										<Command.Item>{item.name} by {item.creator} ({item.id})</Command.Item>
									</a>
								{:else}
									<a href={`/level/${item.id}`} data-sveltekit-preload-data="tap">
										<Command.Item>{item.name} by {item.creator} ({item.id})</Command.Item>
									</a>
								{/if}
							</ContextMenu.Trigger>
							<ContextMenu.Content>
								<ContextMenu.Item
									on:click={async () => {
										await navigator.clipboard.writeText(item.id);
										toast.success('Copied to clipboard!');
									}}>{$_("context.copy_level_id")}</ContextMenu.Item
								>
							</ContextMenu.Content>
						</ContextMenu.Root>
					{/each}
				</Command.Group>
			{/if}
			{#if result.players.length}
				<Command.Group heading={$_("search.players")}>
					{#each result.players as item}
						<a href={`/player/${item.uid}`} data-sveltekit-preload-data="tap">
							<Command.Item>
								<Avatar.Root>
									<Avatar.Image
										class="object-cover"
										src={`https://cdn.gdvn.net/avatars/${item.uid}${
											isActive(item.supporterUntil) && item.isAvatarGif ? '.gif' : '.jpg'
										}`}
										alt="@shadcn"
									/>
									<Avatar.Fallback>{item.name[0]}</Avatar.Fallback>
								</Avatar.Root>
								{#if isActive(item.supporterUntil)}
									<span class="ml-[10px] text-yellow-500">{item.name}</span>
								{:else}
									<span class="ml-[10px]">{item.name}</span>
								{/if}
							</Command.Item>
						</a>
					{/each}
				</Command.Group>
			{/if}
		{/if}
	</Command.List>
</Command.Dialog>
