<script lang="ts">
	import supabase from '$lib/client/supabase';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import Pencil1 from 'svelte-radix/Pencil1.svelte';
	import imageCompression from 'browser-image-compression';
	import { user } from '$lib/client';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { isActive } from '$lib/client/isSupporterActive';
	import { upload } from '$lib/client/storage';
	import type { PlayerRankedListSummary } from '$lib/types/playerRankedList';
	import {
		buildPlayerCardStatLineOptions,
		normalizePlayerCardStatLines,
		PLAYER_CARD_STAT_LINE_COUNT
	} from '$lib/utils/playerCardStatLines';
	import { _ } from 'svelte-i18n';

	export let data: any;
	export let open = false;

	let player = structuredClone(data);
	let fileinput: any;
	let fileinput1: any;
	let provinces: any = {};
	let provinceItem = {
		disabled: false,
		label: player.province,
		value: player.province
	};
	let cityItem = {
		disabled: false,
		label: player.city,
		value: player.city
	};
	let playerCardListSummaries: PlayerRankedListSummary[] = [];
	let playerCardStatLinesLoadedForUid: string | null = null;
	let isLoadingPlayerCardStatLines = false;

	$: (open, reset());
	$: legacyPlayerCardStatLineLabels = {
		dl: $_('player_card.rating'),
		pl: $_('player_card.plat_rating'),
		fl: $_('player_card.featured'),
		cl: $_('player_card.challenge_rating')
	};
	$: playerCardStatLineOptions = buildPlayerCardStatLineOptions(
		playerCardListSummaries,
		legacyPlayerCardStatLineLabels
	);
	$: playerCardStatLineIdentifiers = normalizePlayerCardStatLines(player?.overviewData?.playerCardStatLines);
	$: if (open && player?.uid && playerCardStatLinesLoadedForUid !== player.uid && !isLoadingPlayerCardStatLines) {
		void loadPlayerCardStatLines(player.uid);
	}

	function reset() {
		player = structuredClone(data);
		provinceItem = {
			disabled: false,
			label: player.province,
			value: player.province
		};
		cityItem = {
			disabled: false,
			label: player.city,
			value: player.city
		};
	}

	$: renameCooldownActive =
		!player.isAdmin &&
		(player.nameLocked || (player.renameCooldown && new Date(player.renameCooldown) > new Date()));

	$: renameCooldownMessage = player.nameLocked
		? $_('profile_edit.rename_locked')
		: $_('profile_edit.rename_cooldown', {
				values: { date: new Date(player.renameCooldown).toLocaleDateString() }
		  });

	async function loadPlayerCardStatLines(uid: string) {
		isLoadingPlayerCardStatLines = true;

		try {
			const response = await fetch(`${import.meta.env.VITE_API_URL}/players/${uid}/lists`);
			playerCardListSummaries = await response.json();
			playerCardStatLinesLoadedForUid = uid;
		} catch {
			playerCardListSummaries = [];
		} finally {
			isLoadingPlayerCardStatLines = false;
		}
	}

	function updatePlayerCardStatLine(index: number, value: string | undefined) {
		const nextStatLines = normalizePlayerCardStatLines(player?.overviewData?.playerCardStatLines);
		nextStatLines[index] = value || nextStatLines[index];
		player = {
			...player,
			overviewData: {
				...(player.overviewData || {}),
				playerCardStatLines: nextStatLines
			}
		};
	}

	function getPlayerCardStatLineSelection(index: number) {
		const identifier = playerCardStatLineIdentifiers[index];
		return playerCardStatLineOptions.find((option) => option.value === identifier)
			|| playerCardStatLineOptions[index]
			|| undefined;
	}

	async function getAvatar(e: any) {
		if (player.isBanned) {
			return;
		}

		const image = e.target.files[0];

		if (image.name.endsWith('.gif')) {
			const handleUpload = async () => {
				await upload(`avatars/${$user.data.uid}.gif`, image, (await $user.token())!);

				player.isAvatarGif = true;
				player.avatarVersion++;

				await fetch(`${import.meta.env.VITE_API_URL}/players`, {
					method: 'PUT',
					headers: {
						Authorization: 'Bearer ' + (await $user.token()),
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(player)
				});
			};

			toast.promise(handleUpload, {
				loading: $_('toast.player_edit.uploading'),
				success: $_('toast.player_edit.success'),
				error: $_('toast.player_edit.error')
			});
		} else {
			const cImg = await imageCompression(image, {
				maxSizeMB: 0.035,
				maxWidthOrHeight: 480,
				useWebWorker: true
			});
			const handleUpload = async () => {
				await upload(`avatars/${$user.data.uid}.jpg`, cImg, (await $user.token())!);

				player.isAvatarGif = false;
				player.avatarVersion++;

				await fetch(`${import.meta.env.VITE_API_URL}/players`, {
					method: 'PUT',
					headers: {
						Authorization: 'Bearer ' + (await $user.token()),
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(player)
				});
			};

			toast.promise(handleUpload, {
				loading: $_('toast.player_edit.uploading'),
				success: $_('toast.player_edit.success'),
				error: $_('toast.player_edit.error')
			});
		}
	}

	async function getBanner(e: any) {
		if (player.isBanned) {
			return;
		}

		const image = e.target.files[0];

		if (image.name.endsWith('.gif')) {
			const handleUpload = async () => {
				await upload(`banners/${$user.data.uid}.gif`, image, (await $user.token())!);

				player.isBannerGif = true;
				player.bannerVersion++;

				await fetch(`${import.meta.env.VITE_API_URL}/players`, {
					method: 'PUT',
					headers: {
						Authorization: 'Bearer ' + (await $user.token()),
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(player)
				});
			};

			toast.promise(handleUpload, {
				loading: $_('toast.player_edit.uploading'),
				success: $_('toast.player_edit.success'),
				error: $_('toast.player_edit.error')
			});
		} else {
			const options = {
				maxSizeMB: 4.5,
				maxWidthOrHeight: 1920,
				useWebWorker: true
			};

			const cImg = await imageCompression(image, options);
			const handleUpload = async () => {
				await upload(`banners/${$user.data.uid}.jpg`, cImg, (await $user.token())!);

				player.isBannerGif = false;
				player.bannerVersion++;

				await fetch(`${import.meta.env.VITE_API_URL}/players`, {
					method: 'PUT',
					headers: {
						Authorization: 'Bearer ' + (await $user.token()),
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(player)
				});
			};

			toast.promise(handleUpload, {
				loading: $_('toast.player_edit.uploading'),
				success: $_('toast.player_edit.success'),
				error: $_('toast.player_edit.error')
			});
		}
	}

	async function saveChanges() {
		player.province = provinceItem.value;
		player.city = cityItem.value;

		if (!/^[A-Za-z0-9]+$/.test(player.name)) {
			toast.error($_('toast.player_edit.name'));
			return;
		}

		const token = await $user.token();
		const promise = fetch(`${import.meta.env.VITE_API_URL}/players`, {
			method: 'PUT',
			headers: {
				Authorization: 'Bearer ' + token,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(player)
		});
		toast.promise(promise, {
			loading: $_('toast.player_edit.save.loading'),
			success: $_('toast.player_edit.save.success'),
			error: $_('toast.player_edit.save.error')
		});

		data = player;
		open = false;
	}

	onMount(() => {
		fetch(`${import.meta.env.VITE_API_URL}/provinces`)
			.then((res) => res.json())
			.then((res) => {
				provinces = res;
			});
	});
</script>

<input
	style="display:none"
	type="file"
	accept={isActive($user.data.supporterUntil) ? '.jpg, .jpeg, .gif' : '.jpg, .jpeg'}
	on:change={(e) => getAvatar(e)}
	bind:this={fileinput}
/>

<input
	style="display:none"
	type="file"
	accept={'.jpg, .jpeg, .gif'}
	on:change={(e) => getBanner(e)}
	bind:this={fileinput1}
/>

<Dialog.Root bind:open>
	<Dialog.Trigger class={buttonVariants({ variant: 'outline' })}><Pencil1 /></Dialog.Trigger>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{$_('profile_edit.title')}</Dialog.Title>
			<Dialog.Description>
				{$_('profile_edit.description')}
			</Dialog.Description>
			<div class="grid gap-4 py-4">
				<div class="grid grid-cols-4 items-center gap-4">
					<Label for="name" class="text-right">{$_('profile_edit.name')}</Label>
					<div class="col-span-3 flex flex-col gap-1">
						<Input
							id="name"
							bind:value={player.name}
							disabled={renameCooldownActive}
						/>
						{#if renameCooldownActive}
							<p class="text-muted-foreground text-xs">{renameCooldownMessage}</p>
						{/if}
					</div>
				</div>
				<div class="flex gap-[10px]">
					<Button
						class="w-full"
						variant="outline"
						id="avatar"
						placeholder="Avatar"
						on:click={() => {
							fileinput.click();
						}}>{$_('profile_edit.upload_avatar')}</Button
					>
					<Button
						class="w-full"
						variant="outline"
						id="avatar"
						placeholder="Avatar"
						disabled={!isActive(player.supporterUntil)}
						on:click={() => {
							fileinput1.click();
						}}>{$_('profile_edit.upload_banner')}</Button
					>
				</div>
				{#if isActive(player.supporterUntil)}
					<div class="mb-[10px] flex items-center gap-[10px] text-sm">
						{$_('profile_edit.border')}
						<Input type="color" bind:value={player.borderColor} />
						{$_('profile_edit.background')}
						<Input type="color" bind:value={player.bgColor} />
						<Button
							variant="outline"
							on:click={() => {
								player.borderColor = player.bgColor = null;
							}}>{$_('profile_edit.reset')}</Button
						>
					</div>
				{/if}
				<div class="grid grid-cols-4 items-center gap-4">
					<Label for="youtube" class="text-right">YouTube</Label>
					<Input id="youtube" bind:value={player.youtube} class="col-span-3" />
				</div>
				<div class="grid grid-cols-4 items-center gap-4">
					<Label for="facebook" class="text-right">Facebook</Label>
					<Input id="facebook" bind:value={player.facebook} class="col-span-3" />
				</div>
				<div class="grid grid-cols-4 items-center gap-4">
					<Label for="province" class="text-right">{$_('profile_edit.province')}</Label>
					<Select.Root bind:selected={provinceItem}>
						<Select.Trigger class="col-span-3">
							<Select.Value placeholder="Province" />
						</Select.Trigger>
						<Select.Content>
							<ScrollArea class="h-72">
								{#each Object.keys(provinces)
									.map((key) => provinces[key])
									.sort((a, b) => {
										return a.name > b.name ? 1 : -1;
									}) as province}
									<Select.Item
										value={province.name}
										on:click={() => {
											cityItem.value = cityItem.label = null;
										}}>{province.name}</Select.Item
									>
								{/each}
							</ScrollArea>
						</Select.Content>
					</Select.Root>
				</div>
				<div class="grid grid-cols-4 items-center gap-4">
					<Label for="province" class="text-right">{$_('profile_edit.city')}</Label>
					<Select.Root bind:selected={cityItem} disabled={provinceItem.value == null}>
						<Select.Trigger class="col-span-3">
							<Select.Value placeholder={$_('profile_edit.city')} />
						</Select.Trigger>
						<Select.Content>
							<ScrollArea class="h-72">
								{#each provinces[provinceItem.value].wards as ward}
									<Select.Item value={ward}>{ward}</Select.Item>
								{/each}
							</ScrollArea>
						</Select.Content>
					</Select.Root>
				</div>
				<div class="grid grid-cols-4 items-center gap-4">
					<Label for="airplane-mode" class="text-right">{$_('profile_edit.hide_profile')}</Label>
					<Switch id="airplane-mode" class="col-span-3" bind:checked={player.isHidden} />
				</div>
				<div class="grid gap-3 rounded-md border p-4">
					<div class="space-y-1">
						<p class="text-sm font-semibold">{$_('profile_edit.player_card_stat_lines')}</p>
						<p class="text-xs text-muted-foreground">{$_('profile_edit.player_card_stat_lines_description')}</p>
					</div>
					{#each playerCardStatLineIdentifiers as _identifier, index}
						<div class="grid grid-cols-4 items-center gap-4">
							<Label class="text-right">
								{$_('profile_edit.player_card_stat_line', { values: { index: index + 1 } })}
							</Label>
							<Select.Root
								selected={getPlayerCardStatLineSelection(index)}
								onSelectedChange={(option) => updatePlayerCardStatLine(index, option?.value)}
							>
								<Select.Trigger class="col-span-3">
									<Select.Value placeholder={$_('general.select')} />
								</Select.Trigger>
								<Select.Content>
									{#each playerCardStatLineOptions as option}
										<Select.Item value={option.value}>{option.label}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>
					{/each}
					{#if isLoadingPlayerCardStatLines}
						<p class="text-xs text-muted-foreground">{$_('general.loading')}...</p>
					{/if}
				</div>
			</div>
			<Dialog.Footer>
				<Button type="submit" on:click={saveChanges}>{$_('profile_edit.save')}</Button>
			</Dialog.Footer>
		</Dialog.Header>
	</Dialog.Content>
</Dialog.Root>

<style lang="scss">
</style>
