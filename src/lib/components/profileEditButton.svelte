<script lang="ts">
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
	import {
		bannerImageUrl,
		equipCosmetic,
		frameImageUrl,
		type Cosmetic,
		type CosmeticType
	} from '$lib/client/cosmetics';
	import ListSelector, {
		type ListSelectorOption
	} from '$lib/components/listSelector.svelte';
	import { clearPlayerCardSettingsCache } from '$lib/components/playerCard.svelte';
	import type { PlayerRankedListSummary } from '$lib/types/playerRankedList';
	import {
		normalizePlayerCardStatLines,
		PLAYER_CARD_STAT_LINE_COUNT,
		setPlayerCardEloStatVisibility,
		setPlayerCardPvpEloStatVisibility,
		shouldShowPlayerCardEloStat,
		shouldShowPlayerCardPvpEloStat
	} from '$lib/utils/playerCardStatLines';
	import { _ } from 'svelte-i18n';

	export let data: any;
	export let open = false;

	let player = structuredClone(data);
	let fileinput: any;
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
	let playerCardShowEloStat = false;
	let playerCardShowPvpEloStat = true;

	type OwnedCosmetic = {
		itemId: number;
		name: string;
	};

	let ownedFrames: OwnedCosmetic[] = [];
	let ownedThemes: OwnedCosmetic[] = [];
	let cosmeticsLoadedForUid: string | null = null;
	let isLoadingCosmetics = false;

	$: (open, reset());
	$: listSearchUrl = `${import.meta.env.VITE_API_URL}/lists`;
	$: playerCardStatLineOptions = getPlayerCardStatLineOptions(
		playerCardListSummaries
	);
	$: playerCardStatLineIds = normalizePlayerCardStatLines(
		player?.playerCardStatLines
	);
	$: if (
		open
		&& player?.uid
		&& playerCardStatLinesLoadedForUid !== player.uid
		&& !isLoadingPlayerCardStatLines
	) {
		void loadPlayerCardStatLines(player.uid);
	}
	$: if (
		open
		&& player?.uid
		&& cosmeticsLoadedForUid !== player.uid
		&& !isLoadingCosmetics
	) {
		void loadOwnedCosmetics(player.uid);
	}
	$: equippedFrameItem = {
		value: player?.equippedFrame ?? null,
		label: ownedFrames.find((frame) => frame.itemId === player?.equippedFrame)
			?.name ?? $_('profile_edit.none')
	};
	$: equippedThemeItem = {
		value: player?.equippedTheme ?? null,
		label: ownedThemes.find((theme) => theme.itemId === player?.equippedTheme)
			?.name ?? $_('profile_edit.none')
	};
	$: equippedFrameData = (player?.equippedFrameData ?? null) as Cosmetic | null;
	$: equippedThemeData = (player?.equippedThemeData ?? null) as Cosmetic | null;

	function reset() {
		player = structuredClone(data);
		playerCardShowEloStat = shouldShowPlayerCardEloStat(player?.overviewData);
		playerCardShowPvpEloStat = shouldShowPlayerCardPvpEloStat(
			player?.overviewData
		);
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

	$: renameCooldownActive = !player.isAdmin
		&& (player.nameLocked
			|| (player.renameCooldown
				&& new Date(player.renameCooldown) > new Date()));

	$: renameCooldownMessage = player.nameLocked
		? $_('profile_edit.rename_locked')
		: $_('profile_edit.rename_cooldown', {
			values: { date: new Date(player.renameCooldown)
				.toLocaleDateString() }
		});

	async function loadPlayerCardStatLines(uid: string) {
		isLoadingPlayerCardStatLines = true;

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/players/${uid}/lists`
			);
			playerCardListSummaries = await response.json();
			playerCardStatLinesLoadedForUid = uid;
		} catch {
			playerCardListSummaries = [];
		} finally {
			isLoadingPlayerCardStatLines = false;
		}
	}

	async function loadOwnedCosmetics(uid: string) {
		isLoadingCosmetics = true;

		try {
			const token = await $user.token();
			const headers = { Authorization: `Bearer ${token}` };
			const [framesResponse, themesResponse] = await Promise.all([
				fetch(
					`${import.meta.env.VITE_API_URL}/inventory?itemType=avatarFrame`,
					{ headers }
				),
				fetch(
					`${import.meta.env.VITE_API_URL}/inventory?itemType=profileTheme`,
					{ headers }
				)
			]);
			const frames = await framesResponse.json();
			const themes = await themesResponse.json();
			ownedFrames = (Array.isArray(frames) ? frames : []).map(
				(item: any) => ({ itemId: item.itemId, name: item.name })
			);
			ownedThemes = (Array.isArray(themes) ? themes : []).map(
				(item: any) => ({ itemId: item.itemId, name: item.name })
			);
			cosmeticsLoadedForUid = uid;
		} catch {
			ownedFrames = [];
			ownedThemes = [];
		} finally {
			isLoadingCosmetics = false;
		}
	}

	async function equip(type: CosmeticType, itemId: number | null) {
		const currentItemId = type === 'avatarFrame'
			? player?.equippedFrame ?? null
			: player?.equippedTheme ?? null;

		if (itemId === currentItemId) {
			return;
		}

		const request = (async () => {
			const updatedPlayer = await equipCosmetic(
				(await $user.token())!,
				type,
				itemId
			);
			const equipUpdate = {
				equippedFrame: updatedPlayer.equippedFrame ?? null,
				equippedTheme: updatedPlayer.equippedTheme ?? null,
				equippedFrameData: updatedPlayer.equippedFrameData ?? null,
				equippedThemeData: updatedPlayer.equippedThemeData ?? null
			};
			data = { ...data, ...equipUpdate };
			player = { ...player, ...equipUpdate };
			clearPlayerCardSettingsCache(player.uid);
		})();

		toast.promise(request, {
			loading: $_('inventory.equipping'),
			success: $_('inventory.equip_success'),
			error: (e) =>
				(e instanceof Error ? e.message : $_('inventory.equip_error'))
		});
	}

	function getPlayerCardStatLineOptions(
		listSummaries: PlayerRankedListSummary[]
	): ListSelectorOption[] {
		return listSummaries.map((summary) => ({
			id: summary.id,
			title: summary.title,
			identifier: summary.identifier,
			subtitle: summary.isOfficial
				? 'Official'
				: summary.isVerified
				? 'Verified'
				: null
		}));
	}

	function updatePlayerCardStatLine(index: number, value: number | undefined) {
		const current = normalizePlayerCardStatLines(player?.playerCardStatLines);
		const next = [...current];

		while (next.length <= index) {
			next.push(0);
		}

		if (typeof value === 'number') {
			next[index] = value;
		}

		const deduped: number[] = [];
		const seen = new Set<number>();

		for (const id of next) {
			if (
				typeof id !== 'number' || !Number.isFinite(id) || id === 0
				|| seen.has(id)
			) {
				continue;
			}

			deduped.push(id);
			seen.add(id);
		}

		player = {
			...player,
			playerCardStatLines: deduped
		};
	}

	async function savePlayerCardStatLines() {
		const token = await $user.token();
		const overviewData = setPlayerCardPvpEloStatVisibility(
			setPlayerCardEloStatVisibility(
				player?.overviewData ?? data?.overviewData,
				playerCardShowEloStat
			),
			playerCardShowPvpEloStat
		);
		const promise = fetch(`${import.meta.env.VITE_API_URL}/players`, {
			method: 'PUT',
			headers: {
				Authorization: 'Bearer ' + token,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				...data,
				overviewData,
				playerCardStatLines: playerCardStatLineIds
			})
		});
		toast.promise(promise, {
			loading: $_('toast.player_edit.save.loading'),
			success: $_('toast.player_edit.save.success'),
			error: $_('toast.player_edit.save.error')
		});

		try {
			await promise;
			clearPlayerCardSettingsCache(player.uid);
			data = {
				...data,
				overviewData,
				playerCardStatLines: playerCardStatLineIds
			};
			player = {
				...player,
				overviewData,
				playerCardStatLines: playerCardStatLineIds
			};
		} catch {
		// handled by toast
		}
	}

	async function getAvatar(e: any) {
		if (player.isBanned) {
			return;
		}

		const image = e.target.files[0];

		if (image.name.endsWith('.gif')) {
			const handleUpload = async () => {
				await upload(
					`avatars/${$user.data.uid}.gif`,
					image,
					(await $user.token())!
				);

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
				await upload(
					`avatars/${$user.data.uid}.jpg`,
					cImg,
					(await $user.token())!
				);

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

	async function saveChanges() {
		player.province = provinceItem.value;
		player.city = cityItem.value;

		if (!/^[A-Za-z0-9]+$/.test(player.name)) {
			toast.error($_('toast.player_edit.name'));

			return;
		}

		const playerToSave = {
			...player,
			overviewData: setPlayerCardPvpEloStatVisibility(
				setPlayerCardEloStatVisibility(
					player?.overviewData,
					playerCardShowEloStat
				),
				playerCardShowPvpEloStat
			)
		};

		const token = await $user.token();
		const promise = fetch(`${import.meta.env.VITE_API_URL}/players`, {
			method: 'PUT',
			headers: {
				Authorization: 'Bearer ' + token,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(playerToSave)
		});
		toast.promise(promise, {
			loading: $_('toast.player_edit.save.loading'),
			success: $_('toast.player_edit.save.success'),
			error: $_('toast.player_edit.save.error')
		});

		clearPlayerCardSettingsCache(playerToSave.uid);
		data = playerToSave;
		player = playerToSave;
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
  style="display: none"
  type="file"
  accept={isActive($user.data.supporterUntil) ? '.jpg, .jpeg, .gif' : '.jpg, .jpeg'}
  on:change={(e) => getAvatar(e)}
  bind:this={fileinput}
/>

<Dialog.Root bind:open>
  <Dialog.Trigger
    class={buttonVariants({ variant: 'outline' })}
  ><Pencil1 /></Dialog.Trigger>
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
              <p class="text-xs text-muted-foreground">
                {renameCooldownMessage}
              </p>
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
            }}
          >{$_('profile_edit.upload_avatar')}</Button>
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="youtube" class="text-right">YouTube</Label>
          <Input id="youtube" bind:value={player.youtube} class="col-span-3" />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="facebook" class="text-right">Facebook</Label>
          <Input
            id="facebook"
            bind:value={player.facebook}
            class="col-span-3"
          />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="province" class="text-right">{
            $_('profile_edit.province')
          }</Label>
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
                    }}
                  >{province.name}</Select.Item>
                {/each}
              </ScrollArea>
            </Select.Content>
          </Select.Root>
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="province" class="text-right">{
            $_('profile_edit.city')
          }</Label>
          <Select.Root
            bind:selected={cityItem}
            disabled={provinceItem.value == null}
          >
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
          <Label for="airplane-mode" class="text-right">{
            $_('profile_edit.hide_profile')
          }</Label>
          <Switch
            id="airplane-mode"
            class="col-span-3"
            bind:checked={player.isHidden}
          />
        </div>
        <div class="grid gap-3 rounded-md border p-4">
          <div class="space-y-1">
            <p class="text-sm font-semibold">
              {$_('profile_edit.player_card_stat_lines')}
            </p>
            <p class="text-xs text-muted-foreground">
              {$_('profile_edit.player_card_stat_lines_description')}
            </p>
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="show-player-card-elo" class="text-right">
              {$_('profile_edit.show_elo_stat')}
            </Label>
            <Switch
              id="show-player-card-elo"
              class="col-span-3"
              bind:checked={playerCardShowEloStat}
            />
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="show-player-card-pvp-elo" class="text-right">
              {$_('profile_edit.show_pvp_elo_stat')}
            </Label>
            <Switch
              id="show-player-card-pvp-elo"
              class="col-span-3"
              bind:checked={playerCardShowPvpEloStat}
            />
          </div>
          {#each Array(PLAYER_CARD_STAT_LINE_COUNT) as _slot, index}
            <div class="grid grid-cols-4 items-center gap-4">
              <Label class="text-right">
                {
                  $_('profile_edit.player_card_stat_line', { values: { index: index + 1 } })
                }
              </Label>
              {#key `${playerCardStatLineOptions.length}:${playerCardStatLineIds[index] ?? ''}`}
                <ListSelector
                  selectedId={playerCardStatLineIds[index] ?? null}
                  options={playerCardStatLineOptions}
                  searchUrl={listSearchUrl}
                  placeholder={$_('general.select')}
                  searchPlaceholder={$_('list_selector.search_placeholder')}
                  emptyLabel={$_('list_selector.no_results')}
                  loadingLabel={`${$_('general.loading')}...`}
                  disabled={isLoadingPlayerCardStatLines}
                  triggerClass="col-span-3"
                  on:select={(event) => updatePlayerCardStatLine(index, event.detail?.id)}
                />
              {/key}
            </div>
          {/each}
          {#if isLoadingPlayerCardStatLines}
            <p class="text-xs text-muted-foreground">
              {$_('general.loading')}...
            </p>
          {/if}
          <div class="flex justify-end">
            <Button
              variant="outline"
              on:click={savePlayerCardStatLines}
              disabled={isLoadingPlayerCardStatLines}
            >
              {$_('profile_edit.save_stat_lines')}
            </Button>
          </div>
        </div>
        <div class="grid gap-3 rounded-md border p-4">
          <div class="space-y-1">
            <p class="text-sm font-semibold">
              {$_('profile_edit.collection')}
            </p>
            <p class="text-xs text-muted-foreground">
              {$_('profile_edit.collection_description')}
            </p>
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label class="text-right">{$_('profile_edit.avatar_frame')}</Label>
            <div class="col-span-3 flex items-center gap-3">
              <Select.Root
                selected={equippedFrameItem}
                onSelectedChange={(selected) => {
                    if (selected) {
                        void equip('avatarFrame', selected.value);
                    }
                }}
                disabled={isLoadingCosmetics}
              >
                <Select.Trigger class="flex-1">
                  <Select.Value placeholder={$_('profile_edit.none')} />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value={null}>{
                    $_('profile_edit.none')
                  }</Select.Item>
                  {#each ownedFrames as frame (frame.itemId)}
                    <Select.Item value={frame.itemId}>{
                      frame.name
                    }</Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
              {#if equippedFrameData}
                <img
                  class="h-9 w-9 object-contain"
                  src={frameImageUrl(equippedFrameData)}
                  alt=""
                />
              {/if}
            </div>
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label class="text-right">{$_('profile_edit.profile_theme')}</Label>
            <div class="col-span-3 flex items-center gap-3">
              <Select.Root
                selected={equippedThemeItem}
                onSelectedChange={(selected) => {
                    if (selected) {
                        void equip('profileTheme', selected.value);
                    }
                }}
                disabled={isLoadingCosmetics}
              >
                <Select.Trigger class="flex-1">
                  <Select.Value placeholder={$_('profile_edit.none')} />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value={null}>{
                    $_('profile_edit.none')
                  }</Select.Item>
                  {#each ownedThemes as theme (theme.itemId)}
                    <Select.Item value={theme.itemId}>{
                      theme.name
                    }</Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
              {#if equippedThemeData}
                <img
                  class="h-9 w-16 rounded border object-cover"
                  style={`border-color: ${equippedThemeData.borderColor};`}
                  src={bannerImageUrl(equippedThemeData)}
                  alt=""
                />
              {/if}
            </div>
          </div>
          {#if isLoadingCosmetics}
            <p class="text-xs text-muted-foreground">
              {$_('general.loading')}...
            </p>
          {/if}
        </div>
      </div>
      <Dialog.Footer>
        <Button type="submit" on:click={saveChanges}>{
          $_('profile_edit.save')
        }</Button>
      </Dialog.Footer>
    </Dialog.Header>
  </Dialog.Content>
</Dialog.Root>

<style lang="scss">
</style>
