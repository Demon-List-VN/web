<script lang="ts">
	import Title from '$lib/components/Title.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Alert from '$lib/components/ui/alert';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { user } from '$lib/client';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import Crown from 'lucide-svelte/icons/crown';
	import Plus from 'lucide-svelte/icons/plus';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import Edit from 'lucide-svelte/icons/pencil';
	import RefreshCw from 'lucide-svelte/icons/refresh-cw';
	import Info from 'lucide-svelte/icons/info';
	import Gift from 'lucide-svelte/icons/gift';
	import Search from 'lucide-svelte/icons/search';
	import X from 'lucide-svelte/icons/x';
	import {
		MAP_PACK_DIFFICULTY_OPTIONS,
		MISSION_CONDITION_TYPES,
		MISSION_REFRESH_TYPES,
		MAX_TIER,
		XP_PER_TIER
	} from '$lib/battlepass/constants';
	import TierRewardTrack from '$lib/components/TierRewardTrack.svelte';

	// State
	let seasons: any[] = [];
	let selectedSeason: any = null;
	let levels: any[] = [];
	let mapPacks: any[] = [];
	let battlePassMapPacks: any[] = [];
	let rewards: any[] = [];
	let missions: any[] = [];

	// Dialog states
	let showSeasonDialog = false;
	let showLevelDialog = false;
	let showMapPackDialog = false;
	let showRewardDialog = false;
	let showMissionDialog = false;
	let showLinkMapPackDialog = false;
	let showEditMapPackDialog = false;
	let showMissionRewardDialog = false;

	// Form states
	let seasonForm = {
		id: null as number | null,
		title: '',
		description: '',
		start: '',
		end: '',
		primaryColor: '#8b5cf6'
	};

	let levelForm = {
		id: null as number | null,
		levelID: '',
		xp: 1000,
		minProgressXp: 500,
		minProgress: 50
	};

	let mapPackLinkForm = {
		mapPackId: '' as any,
		unlockWeek: 1,
		order: 0
	};

	let mapPackEditForm = {
		id: null as number | null,
		unlockWeek: 1,
		order: 0
	};

	let rewardForm = {
		id: null as number | null,
		tier: 1,
		isPremium: false,
		itemId: '',
		quantity: 1,
		description: ''
	};

	// Item search state
	let itemSearchQuery = '';
	let itemSearchResults: any[] = [];
	let selectedItem: any = null;
	let itemSearchLoading = false;
	let itemSearchTimeout: any;

	let missionForm = {
		id: null as number | null,
		title: '',
		description: '',
		condition: '[]',
		xp: 100,
		order: 0,
		refreshType: 'none' as 'none' | 'daily' | 'weekly'
	};

	let conditionBuilderMode = true; // Toggle between UI builder and raw JSON
	let conditionList: any[] = [];
	let newCondition = {
		type: 'clear_level' as any,
		targetId: null as number | null,
		value: null as number | null
	};

	let missionRewardForm = {
		missionId: null as number | null,
		itemId: '',
		quantity: 1,
		expireAfter: 7
	};

	function convertTime(x: string) {
		if (!x) return '';
		const d = new Date(x);
		d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
		return d.toISOString().slice(0, 16);
	}

	function rarityColor(r: number) {
		switch (r) {
			case 1:
				return '#3b82f6';
			case 2:
				return '#a855f7';
			case 3:
				return '#ec4899';
			case 4:
				return '#dc2626';
			default:
				return '#9ca3af';
		}
	}

	function rarityName(r: number) {
		switch (r) {
			case 1:
				return 'Uncommon';
			case 2:
				return 'Rare';
			case 3:
				return 'Epic';
			case 4:
				return 'Legendary';
			default:
				return 'Common';
		}
	}

	// Fetch functions
	async function fetchSeasons() {
		try {
			const res = await fetch(`${import.meta.env.VITE_API_URL}/battlepass`);
			if (res.ok) {
				const season = await res.json();
				seasons = [season];
				if (!selectedSeason) {
					selectedSeason = season;
					await fetchSeasonData();
				}
			}
		} catch (e) {
			console.error('Failed to fetch seasons:', e);
		}
	}

	async function fetchSeasonData() {
		if (!selectedSeason) return;
		await Promise.all([fetchLevels(), fetchBattlePassMapPacks(), fetchRewards(), fetchMissions()]);
	}

	async function fetchLevels() {
		if (!selectedSeason) return;
		try {
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/battlepass/season/${selectedSeason.id}/levels`
			);
			if (res.ok) levels = await res.json();
		} catch (e) {
			console.error('Failed to fetch levels:', e);
		}
	}

	async function fetchBattlePassMapPacks() {
		if (!selectedSeason) return;
		try {
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/battlepass/season/${selectedSeason.id}/mappacks`,
				{
					headers: { Authorization: `Bearer ${await $user.token()}` }
				}
			);
			if (res.ok) battlePassMapPacks = await res.json();
		} catch (e) {
			console.error('Failed to fetch battle pass map packs:', e);
		}
	}

	async function fetchRewards() {
		if (!selectedSeason) return;
		try {
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/battlepass/season/${selectedSeason.id}/rewards`
			);
			if (res.ok) rewards = await res.json();
		} catch (e) {
			console.error('Failed to fetch rewards:', e);
		}
	}

	function handleAddReward(tier: number, isPremium: boolean) {
		selectedItem = null;
		itemSearchQuery = '';
		itemSearchResults = [];
		showRewardDialog = true;
		rewardForm = {
			id: null,
			tier: tier,
			isPremium: isPremium,
			itemId: '',
			quantity: 1,
			description: ''
		};
	}

	async function fetchMissions() {
		if (!selectedSeason) return;
		try {
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/battlepass/season/${selectedSeason.id}/missions`
			);
			if (res.ok) missions = await res.json();
		} catch (e) {
			console.error('Failed to fetch missions:', e);
		}
	}

	// Season CRUD
	async function saveSeason() {
		const isNew = !seasonForm.id;
		const url = isNew
			? `${import.meta.env.VITE_API_URL}/battlepass/season`
			: `${import.meta.env.VITE_API_URL}/battlepass/season/${seasonForm.id}`;

		const body: any = {
			title: seasonForm.title,
			description: seasonForm.description,
			primaryColor: seasonForm.primaryColor
		};

		if (seasonForm.start) body.start = new Date(seasonForm.start).toISOString();
		if (seasonForm.end) body.end = new Date(seasonForm.end).toISOString();

		toast.promise(
			fetch(url, {
				method: isNew ? 'POST' : 'PATCH',
				body: JSON.stringify(body),
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				}
			}),
			{
				success: () => {
					showSeasonDialog = false;
					fetchSeasons();
					return isNew ? 'Season created!' : 'Season updated!';
				},
				loading: 'Saving...',
				error: 'Failed to save season'
			}
		);
	}

	async function archiveSeason(id: number) {
		if (!confirm('Archive this season?')) return;

		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/battlepass/season/${id}/archive`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${await $user.token()}` }
			}),
			{
				success: () => {
					fetchSeasons();
					return 'Season archived!';
				},
				loading: 'Archiving...',
				error: 'Failed to archive'
			}
		);
	}

	// Level CRUD
	async function saveLevel() {
		if (!selectedSeason) return;

		const isNew = !levelForm.id;
		const url = isNew
			? `${import.meta.env.VITE_API_URL}/battlepass/season/${selectedSeason.id}/levels`
			: `${import.meta.env.VITE_API_URL}/battlepass/level/${levelForm.id}`;

		toast.promise(
			fetch(url, {
				method: isNew ? 'POST' : 'PATCH',
				body: JSON.stringify({
					levelID: Number(levelForm.levelID),
					xp: levelForm.xp,
					minProgressXp: levelForm.minProgressXp,
					minProgress: levelForm.minProgress
				}),
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				}
			}),
			{
				success: () => {
					showLevelDialog = false;
					fetchLevels();
					return isNew ? 'Level added!' : 'Level updated!';
				},
				loading: 'Saving...',
				error: 'Failed to save level'
			}
		);
	}

	async function deleteLevel(id: number) {
		if (!confirm('Delete this level?')) return;

		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/battlepass/level/${id}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${await $user.token()}` }
			}),
			{
				success: () => {
					fetchLevels();
					return 'Level deleted!';
				},
				loading: 'Deleting...',
				error: 'Failed to delete'
			}
		);
	}

	// Map Pack Link
	async function linkMapPack() {
		if (!selectedSeason) return;

		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/battlepass/season/${selectedSeason.id}/mappacks`, {
				method: 'POST',
				body: JSON.stringify({
					mapPackId: Number(mapPackLinkForm.mapPackId),
					unlockWeek: mapPackLinkForm.unlockWeek,
					order: mapPackLinkForm.order
				}),
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				}
			}),
			{
				success: () => {
					showLinkMapPackDialog = false;
					fetchBattlePassMapPacks();
					return 'Map pack linked!';
				},
				loading: 'Linking...',
				error: 'Failed to link map pack'
			}
		);
	}

	async function unlinkMapPack(id: number) {
		if (!confirm('Unlink this map pack?')) return;

		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/battlepass/mappack/${id}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${await $user.token()}` }
			}),
			{
				success: () => {
					fetchBattlePassMapPacks();
					return 'Map pack unlinked!';
				},
				loading: 'Unlinking...',
				error: 'Failed to unlink'
			}
		);
	}

	async function updateMapPack() {
		if (!mapPackEditForm.id) return;

		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/battlepass/mappack/${mapPackEditForm.id}`, {
				method: 'PATCH',
				body: JSON.stringify({
					unlockWeek: mapPackEditForm.unlockWeek,
					order: mapPackEditForm.order
				}),
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				}
			}),
			{
				success: () => {
					showEditMapPackDialog = false;
					fetchBattlePassMapPacks();
					return 'Map pack updated!';
				},
				loading: 'Updating...',
				error: 'Failed to update map pack'
			}
		);
	}

	// Reward CRUD
	async function saveReward() {
		if (!selectedSeason) return;

		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/battlepass/season/${selectedSeason.id}/rewards`, {
				method: 'POST',
				body: JSON.stringify({
					tier: rewardForm.tier,
					isPremium: rewardForm.isPremium,
					itemId: Number(rewardForm.itemId),
					quantity: rewardForm.quantity,
					description: rewardForm.description
				}),
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				}
			}),
			{
				success: () => {
					showRewardDialog = false;
					fetchRewards();
					return 'Reward created!';
				},
				loading: 'Saving...',
				error: 'Failed to save reward'
			}
		);
	}

	async function deleteReward(id: number | null) {
		if (id == null) {
			return;
		}

		if (!confirm('Delete this reward?')) {
			return;
		}

		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/battlepass/reward/${id}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${await $user.token()}` }
			}),
			{
				success: () => {
					fetchRewards();
					return 'Reward deleted!';
				},
				loading: 'Deleting...',
				error: 'Failed to delete'
			}
		);
	}

	// Mission CRUD
	async function saveMission() {
		if (!selectedSeason) return;

		const isNew = !missionForm.id;
		const url = isNew
			? `${import.meta.env.VITE_API_URL}/battlepass/season/${selectedSeason.id}/missions`
			: `${import.meta.env.VITE_API_URL}/battlepass/mission/${missionForm.id}`;

		let condition: any[];
		if (conditionBuilderMode) {
			condition = conditionList;
		} else {
			try {
				const parsed = JSON.parse(missionForm.condition);
				// Ensure condition is always an array
				condition = Array.isArray(parsed) ? parsed : [];
			} catch (e) {
				toast.error('Invalid condition JSON');
				return;
			}
		}

		// Validate that condition is an array
		if (!Array.isArray(condition)) {
			toast.error('Condition must be an array');
			return;
		}

		toast.promise(
			fetch(url, {
				method: isNew ? 'POST' : 'PATCH',
				body: JSON.stringify({
					title: missionForm.title,
					description: missionForm.description,
					condition,
					xp: missionForm.xp,
					order: missionForm.order,
					refreshType: missionForm.refreshType
				}),
				headers: {
					Authorization: `Bearer ${await $user.token()}`,
					'Content-Type': 'application/json'
				}
			}),
			{
				success: () => {
					showMissionDialog = false;
					fetchMissions();
					return isNew ? 'Mission created!' : 'Mission updated!';
				},
				loading: 'Saving...',
				error: 'Failed to save mission'
			}
		);
	}

	async function deleteMission(id: number) {
		if (!confirm('Delete this mission?')) return;

		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/battlepass/mission/${id}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${await $user.token()}` }
			}),
			{
				success: () => {
					fetchMissions();
					return 'Mission deleted!';
				},
				loading: 'Deleting...',
				error: 'Failed to delete'
			}
		);
	}

	// Mission Reward
	async function addMissionReward() {
		if (!missionRewardForm.missionId) return;

		toast.promise(
			fetch(
				`${import.meta.env.VITE_API_URL}/battlepass/mission/${missionRewardForm.missionId}/reward`,
				{
					method: 'POST',
					body: JSON.stringify({
						itemId: Number(missionRewardForm.itemId),
						quantity: missionRewardForm.quantity,
						expireAfter: missionRewardForm.expireAfter
					}),
					headers: {
						Authorization: `Bearer ${await $user.token()}`,
						'Content-Type': 'application/json'
					}
				}
			),
			{
				success: () => {
					showMissionRewardDialog = false;
					fetchMissions();
					return 'Reward added!';
				},
				loading: 'Adding...',
				error: 'Failed to add reward'
			}
		);
	}

	async function deleteMissionReward(missionId: number, rewardId: number) {
		if (!confirm('Delete this reward?')) return;

		toast.promise(
			fetch(`${import.meta.env.VITE_API_URL}/battlepass/mission/${missionId}/reward/${rewardId}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${await $user.token()}` }
			}),
			{
				success: () => {
					fetchMissions();
					return 'Reward deleted!';
				},
				loading: 'Deleting...',
				error: 'Failed to delete'
			}
		);
	}

	// Reset form functions
	function openNewSeason() {
		seasonForm = { id: null, title: '', description: '', start: '', end: '', primaryColor: '#8b5cf6' };
		showSeasonDialog = true;
	}

	function openEditSeason(season: any) {
		seasonForm = {
			id: season.id,
			title: season.title,
			description: season.description,
			start: convertTime(season.start),
			end: convertTime(season.end),
			primaryColor: season.primaryColor || '#8b5cf6'
		};
		showSeasonDialog = true;
	}

	function openNewLevel() {
		levelForm = { id: null, levelID: '', xp: 1000, minProgressXp: 500, minProgress: 50 };
		showLevelDialog = true;
	}

	function openEditLevel(level: any) {
		levelForm = {
			id: level.id,
			levelID: level.levelID,
			xp: level.xp,
			minProgressXp: level.minProgressXp,
			minProgress: level.minProgress
		};
		showLevelDialog = true;
	}

	function openNewReward() {
		rewardForm = { id: null, tier: 1, isPremium: false, itemId: '', quantity: 1, description: '' };
		selectedItem = null;
		itemSearchQuery = '';
		itemSearchResults = [];
		showRewardDialog = true;
	}

	function openEditReward(reward: any) {
		rewardForm = {
			id: reward.id,
			tier: reward.tier,
			isPremium: reward.isPremium,
			itemId: reward.itemId,
			quantity: reward.quantity,
			description: reward.description
		};
		// Set selected item if editing
		if (reward.items) {
			selectedItem = reward.items;
		}
		showRewardDialog = true;
	}

	async function searchItems() {
		if (!itemSearchQuery.trim()) {
			itemSearchResults = [];
			return;
		}

		itemSearchLoading = true;
		try {
			const res = await fetch(
				`${import.meta.env.VITE_API_URL}/item/search?q=${encodeURIComponent(itemSearchQuery)}`,
				{
					method: 'GET',
					headers: {
						Authorization: 'Bearer ' + (await $user.token())
					}
				}
			);
			itemSearchResults = await res.json();
		} catch (e) {
			console.error(e);
			itemSearchResults = [];
		} finally {
			itemSearchLoading = false;
		}
	}

	function handleItemSearchInput() {
		clearTimeout(itemSearchTimeout);
		itemSearchTimeout = setTimeout(() => {
			searchItems();
		}, 300);
	}

	function selectItem(item: any) {
		selectedItem = item;
		rewardForm.itemId = item.id;
		rewardForm.description = item.name;
	}

	function clearItemSelection() {
		selectedItem = null;
		rewardForm.itemId = '';
	}

	function resetRewardDialog() {
		selectedItem = null;
		itemSearchQuery = '';
		itemSearchResults = [];
	}

	function openNewMission() {
		missionForm = { id: null, title: '', description: '', condition: '[]', xp: 100, order: 0, refreshType: 'none' };
		conditionBuilderMode = true;
		conditionList = [];
		newCondition = { type: 'clear_level', targetId: null, value: null };
		showMissionDialog = true;
	}

	function openEditMission(mission: any) {
		// Ensure condition is always an array
		const conditions = Array.isArray(mission.condition) ? mission.condition : [];
		
		missionForm = {
			id: mission.id,
			title: mission.title,
			description: mission.description,
			condition: JSON.stringify(conditions, null, 2),
			xp: mission.xp,
			order: mission.order,
			refreshType: mission.refreshType || 'none'
		};
		conditionBuilderMode = true;
		conditionList = [...conditions];
		newCondition = { type: 'clear_level', targetId: null, value: null };
		showMissionDialog = true;
	}

	function addConditionToList() {
		const cond: any = { type: newCondition.type };
		
		if (newCondition.type === 'clear_level' || newCondition.type === 'clear_mappack') {
			if (!newCondition.targetId) {
				toast.error('Please enter a target ID');
				return;
			}
			cond.targetId = Number(newCondition.targetId);
		} else {
			if (!newCondition.value) {
				toast.error('Please enter a value');
				return;
			}
			cond.value = Number(newCondition.value);
		}

		conditionList = [...conditionList, cond];
		newCondition = { type: newCondition.type, targetId: null, value: null };
	}

	function removeConditionFromList(index: number) {
		conditionList = conditionList.filter((_, i) => i !== index);
	}

	function syncConditionsToJSON() {
		missionForm.condition = JSON.stringify(conditionList, null, 2);
	}

	function syncJSONToConditions() {
		try {
			conditionList = JSON.parse(missionForm.condition);
		} catch (e) {
			toast.error('Invalid JSON format');
		}
	}

	function openLinkMapPack() {
		mapPackLinkForm = { mapPackId: '', unlockWeek: 1, order: 0 };
		showLinkMapPackDialog = true;
	}

	function openEditMapPack(pack: any) {
		mapPackEditForm = {
			id: pack.id,
			unlockWeek: pack.unlockWeek,
			order: pack.order
		};
		showEditMapPackDialog = true;
	}

	function openAddMissionReward(missionId: number) {
		missionRewardForm = { missionId, itemId: '', quantity: 1, expireAfter: 7 };
		showMissionRewardDialog = true;
	}

	function getMapPackRenderData(battlePassMapPacks: any) {
		return Object.entries<any>(
			battlePassMapPacks.reduce((acc: any, pack: any) => {
				if (!acc[pack.unlockWeek]) {
					acc[pack.unlockWeek] = [];
				}

				acc[pack.unlockWeek].push(pack);

				return acc;
			}, {})
		).sort(([a], [b]) => Number(a) - Number(b));
	}

	$: if (selectedSeason) {
		fetchSeasonData();
	}

	onMount(() => {
		fetchSeasons();
	});
</script>

<Title value="Battle Pass Manager" />

<div class="wrapper">
	<div class="mb-6 flex items-center gap-4">
		<Crown class="h-8 w-8 text-yellow-400" />
		<h1 class="text-2xl font-bold">Battle Pass Manager</h1>
		<Button
			variant="outline"
			size="icon"
			on:click={() => {
				fetchSeasons();
				if (selectedSeason) fetchSeasonData();
			}}
		>
			<RefreshCw class="h-4 w-4" />
		</Button>
	</div>

	<!-- Season Selector -->
	<div class="mb-6 flex items-center gap-4">
		<Label>Active Season:</Label>
		{#if selectedSeason}
			<span class="font-bold">{selectedSeason.title}</span>
			<Button variant="outline" size="sm" on:click={() => openEditSeason(selectedSeason)}>
				<Edit class="mr-1 h-4 w-4" />
				Edit
			</Button>
		{:else}
			<span class="text-muted-foreground">No active season</span>
		{/if}
		<Button size="sm" on:click={openNewSeason}>
			<Plus class="mr-1 h-4 w-4" />
			New Season
		</Button>
	</div>

	{#if selectedSeason}
		<Tabs.Root value="levels">
			<Tabs.List class="mb-4">
				<Tabs.Trigger value="levels">Levels</Tabs.Trigger>
				<Tabs.Trigger value="mappacks">Map Packs</Tabs.Trigger>
				<Tabs.Trigger value="rewards">Tier Rewards</Tabs.Trigger>
				<Tabs.Trigger value="missions">Missions</Tabs.Trigger>
			</Tabs.List>

			<!-- Levels Tab -->
			<Tabs.Content value="levels">
				<Card.Root>
					<Card.Header class="flex flex-row items-center justify-between">
						<Card.Title>Battle Pass Levels</Card.Title>
						<Button size="sm" on:click={openNewLevel}>
							<Plus class="mr-1 h-4 w-4" />
							Add Level
						</Button>
					</Card.Header>
					<Card.Content>
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>ID</Table.Head>
									<Table.Head>Level ID</Table.Head>
									<Table.Head>Level Name</Table.Head>
									<Table.Head>XP</Table.Head>
									<Table.Head>Min Progress</Table.Head>
									<Table.Head>Min Progress XP</Table.Head>
									<Table.Head>Actions</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each levels as level}
									<Table.Row>
										<Table.Cell>{level.id}</Table.Cell>
										<Table.Cell>{level.levelID}</Table.Cell>
										<Table.Cell>{level.levels?.name || '-'}</Table.Cell>
										<Table.Cell class="text-yellow-400">{level.xp}</Table.Cell>
										<Table.Cell>{level.minProgress}%</Table.Cell>
										<Table.Cell class="text-blue-400">{level.minProgressXp}</Table.Cell>
										<Table.Cell>
											<div class="flex gap-2">
												<Button variant="outline" size="icon" on:click={() => openEditLevel(level)}>
													<Edit class="h-4 w-4" />
												</Button>
												<Button
													variant="destructive"
													size="icon"
													on:click={() => deleteLevel(level.id)}
												>
													<Trash2 class="h-4 w-4" />
												</Button>
											</div>
										</Table.Cell>
									</Table.Row>
								{:else}
									<Table.Row>
										<Table.Cell colspan={7} class="text-center text-muted-foreground">
											No levels added
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</Card.Content>
				</Card.Root>
			</Tabs.Content>

			<!-- Map Packs Tab -->
			<Tabs.Content value="mappacks">
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-2xl font-bold">Season Map Packs</h2>
					<Button size="sm" on:click={openLinkMapPack}>
						<Plus class="mr-1 h-4 w-4" />
						Link Map Pack
					</Button>
				</div>
				<div class="flex flex-col gap-4">
					{#each getMapPackRenderData(battlePassMapPacks) as [week, packs]}
						<Card.Root>
							<Card.Header>
								<Card.Title>Week {week}</Card.Title>
							</Card.Header>
							<Card.Content>
								<Table.Root>
									<Table.Header>
										<Table.Row>
											<Table.Head class="w-[50px]">ID</Table.Head>
											<Table.Head>Map Pack</Table.Head>
											<Table.Head class="w-[150px]">Difficulty</Table.Head>
											<Table.Head class="w-[100px]">XP</Table.Head>
											<Table.Head class="w-[75px]">Order</Table.Head>
											<Table.Head class="w-[100px]">Actions</Table.Head>
										</Table.Row>
									</Table.Header>
									<Table.Body>
										{#each packs as pack}
											<Table.Row>
												<Table.Cell>{pack.id}</Table.Cell>
												<Table.Cell>{pack.mapPacks?.name || '-'}</Table.Cell>
												<Table.Cell>{pack.mapPacks?.difficulty || '-'}</Table.Cell>
												<Table.Cell class="text-yellow-400">{pack.mapPacks?.xp || 0}</Table.Cell>
												<Table.Cell>{pack.order}</Table.Cell>
												<Table.Cell>
													<div class="flex gap-2">
														<Button
															variant="outline"
															size="icon"
															on:click={() => openEditMapPack(pack)}
														>
															<Edit class="h-4 w-4" />
														</Button>
														<Button
															variant="destructive"
															size="icon"
															on:click={() => unlinkMapPack(pack.id)}
														>
															<Trash2 class="h-4 w-4" />
														</Button>
													</div>
												</Table.Cell>
											</Table.Row>
										{/each}
									</Table.Body>
								</Table.Root>
							</Card.Content>
						</Card.Root>
					{:else}
						<Card.Root>
							<Card.Content class="p-8 text-center text-muted-foreground">
								No map packs linked
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			</Tabs.Content>

			<!-- Tier Rewards Tab -->
			<Tabs.Content value="rewards" class="w-full">
				<div class="mb-4 flex items-center justify-between">
					<div>
						<h2 class="text-2xl font-bold">Tier Rewards</h2>
						<p class="text-sm text-muted-foreground">
							Manage rewards for each tier. Click on a tier slot to edit.
						</p>
					</div>
					<Button size="sm" on:click={openNewReward}>
						<Plus class="mr-1 h-4 w-4" />
						Add Reward
					</Button>
				</div>

				<TierRewardTrack
					bind:rewards
					currentTier={0}
					isPremium={false}
					claimableRewards={[]}
					editable={true}
					onRewardClick={openEditReward}
					onAddRewardClick={handleAddReward}
				/>
			</Tabs.Content>

			<!-- Missions Tab -->
			<Tabs.Content value="missions">
				<Card.Root>
					<Card.Header class="flex flex-row items-center justify-between">
						<Card.Title>Missions</Card.Title>
						<Button size="sm" on:click={openNewMission}>
							<Plus class="mr-1 h-4 w-4" />
							Add Mission
						</Button>
					</Card.Header>
					<Card.Content>
						<div class="flex flex-col gap-4">
							{#each missions as mission}
								<Card.Root class="border">
									<Card.Content class="p-4">
										<div class="flex items-start justify-between">
											<div class="flex-1">
												<h4 class="font-bold">{mission.title}</h4>
												<p class="text-sm text-muted-foreground">{mission.description}</p>
												<div class="mt-2 flex items-center gap-4 text-sm">
													<span class="text-yellow-400">+{mission.xp} XP</span>
													<span class="text-muted-foreground">Order: {mission.order}</span>
													{#if mission.refreshType && mission.refreshType !== 'none'}
														<span class="rounded px-2 py-0.5 text-xs font-medium {mission.refreshType === 'daily' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}">
															{mission.refreshType === 'daily' ? '🔄 Daily' : '📅 Weekly'}
														</span>
													{/if}
												</div>
												<div class="mt-2">
													<code class="rounded bg-muted px-2 py-1 text-xs">
														{JSON.stringify(mission.condition || [])}
													</code>
												</div>
												{#if mission.battlePassMissionRewards?.length}
													<div class="mt-2 flex gap-2">
														{#each mission.battlePassMissionRewards as reward}
															<div
																class="flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs"
															>
																<span>Item: {reward.itemId}</span>
																<span>x{reward.quantity}</span>
																<Button
																	variant="ghost"
																	size="icon"
																	class="h-4 w-4"
																	on:click={() => deleteMissionReward(mission.id, reward.id)}
																>
																	<Trash2 class="h-3 w-3" />
																</Button>
															</div>
														{/each}
													</div>
												{/if}
											</div>
											<div class="flex gap-2">
												<Button
													variant="outline"
													size="sm"
													on:click={() => openAddMissionReward(mission.id)}
												>
													<Plus class="mr-1 h-4 w-4" />
													Reward
												</Button>
												<Button
													variant="outline"
													size="icon"
													on:click={() => openEditMission(mission)}
												>
													<Edit class="h-4 w-4" />
												</Button>
												<Button
													variant="destructive"
													size="icon"
													on:click={() => deleteMission(mission.id)}
												>
													<Trash2 class="h-4 w-4" />
												</Button>
											</div>
										</div>
									</Card.Content>
								</Card.Root>
							{:else}
								<p class="py-8 text-center text-muted-foreground">No missions added</p>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			</Tabs.Content>
		</Tabs.Root>
	{:else}
		<Alert.Root>
			<Alert.Title>No Active Season</Alert.Title>
			<Alert.Description>Create a new season to get started.</Alert.Description>
		</Alert.Root>
	{/if}
</div>

<!-- Season Dialog -->
<Dialog.Root bind:open={showSeasonDialog}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>{seasonForm.id ? 'Edit Season' : 'New Season'}</Dialog.Title>
		</Dialog.Header>
		<div class="flex flex-col gap-4">
			<div>
				<Label for="seasonTitle">Title</Label>
				<Input id="seasonTitle" bind:value={seasonForm.title} placeholder="Season 1: Genesis" />
			</div>
			<div>
				<Label for="seasonDesc">Description</Label>
				<Textarea
					id="seasonDesc"
					bind:value={seasonForm.description}
					placeholder="The first battle pass season"
				/>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<Label for="seasonStart">Start Date</Label>
					<Input id="seasonStart" type="datetime-local" bind:value={seasonForm.start} />
				</div>
				<div>
					<Label for="seasonEnd">End Date</Label>
					<Input id="seasonEnd" type="datetime-local" bind:value={seasonForm.end} />
				</div>
			</div>
			<div>
				<Label for="seasonColor">Primary Color</Label>
				<div class="flex gap-2 items-center">
					<Input
						id="seasonColor"
						type="color"
						bind:value={seasonForm.primaryColor}
						class="h-10 w-20 cursor-pointer"
					/>
					<Input
						type="text"
						bind:value={seasonForm.primaryColor}
						placeholder="#8b5cf6"
						class="flex-1"
					/>
				</div>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" on:click={() => (showSeasonDialog = false)}>Cancel</Button>
			<Button on:click={saveSeason}>Save</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Level Dialog -->
<Dialog.Root bind:open={showLevelDialog}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>{levelForm.id ? 'Edit Level' : 'Add Level'}</Dialog.Title>
		</Dialog.Header>
		<div class="flex flex-col gap-4">
			<div>
				<Label for="levelID">Level ID</Label>
				<Input id="levelID" type="number" bind:value={levelForm.levelID} placeholder="12345678" />
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<Label for="levelXP">Completion XP</Label>
					<Input id="levelXP" type="number" bind:value={levelForm.xp} />
				</div>
				<div>
					<Label for="levelMinXP">Min Progress XP</Label>
					<Input id="levelMinXP" type="number" bind:value={levelForm.minProgressXp} />
				</div>
			</div>
			<div>
				<Label for="levelMinProgress">Min Progress (%)</Label>
				<Input
					id="levelMinProgress"
					type="number"
					bind:value={levelForm.minProgress}
					min="0"
					max="100"
				/>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" on:click={() => (showLevelDialog = false)}>Cancel</Button>
			<Button on:click={saveLevel}>Save</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Link Map Pack Dialog -->
<Dialog.Root bind:open={showLinkMapPackDialog}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Link Map Pack</Dialog.Title>
		</Dialog.Header>
		<div class="flex flex-col gap-4">
			<div>
				<Label for="mapPackId">Map Pack ID</Label>
				<Input
					id="mapPackId"
					type="number"
					bind:value={mapPackLinkForm.mapPackId}
					placeholder="Enter map pack ID"
				/>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<Label for="unlockWeek">Unlock Week</Label>
					<Input id="unlockWeek" type="number" bind:value={mapPackLinkForm.unlockWeek} min="1" />
				</div>
				<div>
					<Label for="packOrder">Order</Label>
					<Input id="packOrder" type="number" bind:value={mapPackLinkForm.order} min="0" />
				</div>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" on:click={() => (showLinkMapPackDialog = false)}>Cancel</Button>
			<Button on:click={linkMapPack}>Link</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Reward Dialog -->
<Dialog.Root bind:open={showRewardDialog} onOpenChange={(open) => !open && resetRewardDialog()}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>{rewardForm.id ? 'Edit' : 'Add'} Tier Reward</Dialog.Title>
		</Dialog.Header>
		<div class="flex flex-col gap-4">
			<div class="grid grid-cols-2 gap-4">
				<div>
					<Label for="rewardTier">Tier</Label>
					<Input id="rewardTier" type="number" bind:value={rewardForm.tier} min="1" max="100" />
				</div>
				<div class="flex items-center gap-2 pt-6">
					<Switch bind:checked={rewardForm.isPremium} />
					<Label>Premium Reward</Label>
				</div>
			</div>

			<!-- Item Selection -->
			{#if selectedItem}
				<div class="flex items-center gap-3 rounded-lg border p-3">
					<div
						class="flex h-[60px] w-[60px] items-center justify-center overflow-hidden rounded-md bg-neutral-800"
						style="border-bottom: 3px solid {rarityColor(selectedItem.rarity)};"
					>
						<img
							class="max-h-full max-w-full object-contain p-1"
							src={`https://cdn.demonlistvn.com/items/${selectedItem.id}.webp`}
							alt={selectedItem.name}
						/>
					</div>
					<div class="flex-1">
						<div class="font-medium">{selectedItem.name}</div>
						<div class="text-sm" style="color: {rarityColor(selectedItem.rarity)}">
							{rarityName(selectedItem.rarity)}
						</div>
					</div>
					<Button variant="ghost" size="sm" on:click={clearItemSelection}>
						<X class="h-4 w-4" />
					</Button>
				</div>
			{:else}
				<div>
					<Label>Search Item</Label>
					<div class="relative mt-2">
						<Search
							class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							placeholder="Search items by name or ID..."
							bind:value={itemSearchQuery}
							on:input={handleItemSearchInput}
							class="pl-9"
						/>
					</div>
				</div>
				{#if itemSearchLoading}
					<p class="text-center text-sm text-muted-foreground">Searching...</p>
				{:else if itemSearchResults.length > 0}
					<ScrollArea class="h-[250px] rounded-md border">
						<div class="p-2">
							{#each itemSearchResults as item}
								<button
									class="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-accent"
									on:click={() => selectItem(item)}
								>
									<div
										class="flex h-[50px] w-[50px] items-center justify-center overflow-hidden rounded-md bg-neutral-800"
										style="border-bottom: 3px solid {rarityColor(item.rarity)};"
									>
										<img
											class="max-h-full max-w-full object-contain p-1"
											src={`https://cdn.demonlistvn.com/items/${item.id}.webp`}
											alt={item.name}
										/>
									</div>
									<div>
										<div class="font-medium">{item.name}</div>
										<div class="text-xs text-muted-foreground">
											ID: {item.id} •
											<span style="color: {rarityColor(item.rarity)}"
												>{rarityName(item.rarity)}</span
											>
										</div>
									</div>
								</button>
							{/each}
						</div>
					</ScrollArea>
				{:else if itemSearchQuery}
					<p class="text-center text-sm text-muted-foreground">No items found</p>
				{:else}
					<p class="text-center text-sm text-muted-foreground">Start typing to search for items</p>
				{/if}
			{/if}

			<div>
				<Label for="rewardQty">Quantity</Label>
				<Input id="rewardQty" type="number" bind:value={rewardForm.quantity} min="1" />
			</div>
		</div>
		<Dialog.Footer>
			<div class="flex w-full items-center justify-between">
				<div>
					{#if rewardForm.id}
						<Button
							variant="destructive"
							on:click={() => {
								deleteReward(rewardForm.id);
								showRewardDialog = false;
							}}
						>
							<Trash2 class="mr-1 h-4 w-4" />
							Delete
						</Button>
					{/if}
				</div>
				<div class="flex gap-2">
					<Button variant="outline" on:click={() => (showRewardDialog = false)}>Cancel</Button>
					<Button on:click={saveReward} disabled={!selectedItem && !rewardForm.itemId}>Save</Button>
				</div>
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Mission Dialog -->
<Dialog.Root bind:open={showMissionDialog}>
	<Dialog.Content class="max-w-2xl max-h-[90vh]">
		<Dialog.Header>
			<Dialog.Title>{missionForm.id ? 'Edit Mission' : 'Add Mission'}</Dialog.Title>
		</Dialog.Header>
		<ScrollArea class="max-h-[calc(90vh-180px)] pr-4">
			<div class="flex flex-col gap-4">
				<div>
					<Label for="missionTitle">Title</Label>
					<Input id="missionTitle" bind:value={missionForm.title} placeholder="Beat Extreme Level" />
				</div>
				<div>
					<Label for="missionDesc">Description</Label>
					<Textarea
						id="missionDesc"
						bind:value={missionForm.description}
						placeholder="Complete the featured extreme demon"
					/>
				</div>

				<!-- Condition Builder Toggle -->
				<div class="flex items-center justify-between rounded-lg border p-3">
					<div class="flex items-center gap-2">
						<Label>Condition Editor Mode</Label>
						<Switch 
							bind:checked={conditionBuilderMode} 
							onCheckedChange={() => {
								if (conditionBuilderMode) {
									syncJSONToConditions();
								} else {
									syncConditionsToJSON();
								}
							}}
						/>
						<span class="text-sm text-muted-foreground">
							{conditionBuilderMode ? 'UI Builder' : 'Raw JSON'}
						</span>
					</div>
				</div>

				{#if conditionBuilderMode}
					<!-- UI Builder Mode -->
					<div class="space-y-4">
						<div>
							<Label>Conditions</Label>
							{#if conditionList.length > 0}
								<div class="mt-2 space-y-2">
									{#each conditionList as cond, index}
										<div class="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
											<div class="flex-1">
												<div class="text-sm font-medium">
													{MISSION_CONDITION_TYPES.find((t) => t.type === cond.type)?.description || cond.type}
												</div>
												<code class="text-xs text-muted-foreground">
													{JSON.stringify(cond)}
												</code>
											</div>
											<Button
												variant="ghost"
												size="icon"
												on:click={() => removeConditionFromList(index)}
											>
												<Trash2 class="h-4 w-4" />
											</Button>
										</div>
									{/each}
								</div>
							{:else}
								<p class="mt-2 text-sm text-muted-foreground">No conditions added yet</p>
							{/if}
						</div>

						<!-- Add New Condition -->
						<div class="rounded-lg border p-4 space-y-3">
							<Label class="text-base font-semibold">Add Condition</Label>
							
							<div>
								<Label for="condType">Condition Type</Label>
								<Select.Root
									selected={{ value: newCondition.type, label: MISSION_CONDITION_TYPES.find(t => t.type === newCondition.type)?.description || newCondition.type }}
									onSelectedChange={(v) => {
										if (v) {
											newCondition.type = v.value;
											newCondition.targetId = null;
											newCondition.value = null;
										}
									}}
								>
									<Select.Trigger id="condType">
										<Select.Value placeholder="Select condition type" />
									</Select.Trigger>
									<Select.Content>
										{#each MISSION_CONDITION_TYPES as condType}
											<Select.Item value={condType.type} label={condType.description}>
												{condType.description}
											</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>

							{#if newCondition.type === 'clear_level' || newCondition.type === 'clear_mappack'}
								<div>
									<Label for="condTarget">
										{newCondition.type === 'clear_level' ? 'Level ID' : 'Map Pack ID'}
									</Label>
									<Input
										id="condTarget"
										type="number"
										bind:value={newCondition.targetId}
										placeholder="Enter ID"
									/>
								</div>
							{:else}
								<div>
									<Label for="condValue">
										{newCondition.type === 'reach_tier' ? 'Tier Number' : 
										 newCondition.type === 'earn_xp' ? 'XP Amount' : 
										 'Count'}
									</Label>
									<Input
										id="condValue"
										type="number"
										bind:value={newCondition.value}
										placeholder="Enter value"
									/>
								</div>
							{/if}

							<Button size="sm" class="w-full" on:click={addConditionToList}>
								<Plus class="mr-1 h-4 w-4" />
								Add Condition
							</Button>

							<div class="rounded bg-muted/50 p-2 text-xs">
								<span class="font-medium">Example: </span>
								<code>{JSON.stringify(MISSION_CONDITION_TYPES.find((t) => t.type === newCondition.type)?.example)}</code>
							</div>
						</div>
					</div>
				{:else}
					<!-- Raw JSON Mode -->
					<div>
						<Label for="missionCondition">Condition (JSON)</Label>
						<Textarea
							id="missionCondition"
							bind:value={missionForm.condition}
							placeholder={'[{"type": "clear_level", "targetId": 123456}]'}
							rows={6}
							class="font-mono text-xs"
						/>
						<div class="mt-2 rounded-lg bg-muted/50 p-3 text-xs">
							<p class="mb-2 font-medium">Available condition types:</p>
							<ul class="space-y-1 text-muted-foreground">
								{#each MISSION_CONDITION_TYPES as condType}
									<li>
										<code class="rounded bg-muted px-1">{condType.type}</code>
										<span class="ml-1">- {condType.description}</span>
									</li>
								{/each}
							</ul>
						</div>
					</div>
				{/if}

				<div class="grid grid-cols-2 gap-4">
					<div>
						<Label for="missionXP">XP Reward</Label>
						<Input id="missionXP" type="number" bind:value={missionForm.xp} />
					</div>
					<div>
						<Label for="missionOrder">Order</Label>
						<Input id="missionOrder" type="number" bind:value={missionForm.order} />
					</div>
				</div>

				<!-- Refresh Type -->
				<div>
					<Label for="missionRefreshType">Refresh Schedule</Label>
					<Select.Root
						selected={{ 
							value: missionForm.refreshType, 
							label: MISSION_REFRESH_TYPES.find(t => t.value === missionForm.refreshType)?.label || 'No Refresh' 
						}}
						onSelectedChange={(v) => {
							if (v) missionForm.refreshType = v.value;
						}}
					>
						<Select.Trigger id="missionRefreshType">
							<Select.Value placeholder="Select refresh schedule" />
						</Select.Trigger>
						<Select.Content>
							{#each MISSION_REFRESH_TYPES as refreshType}
								<Select.Item value={refreshType.value} label={refreshType.label}>
									<div class="flex flex-col">
										<span>{refreshType.label}</span>
										<span class="text-xs text-muted-foreground">{refreshType.description}</span>
									</div>
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<p class="mt-1 text-xs text-muted-foreground">
						{#if missionForm.refreshType === 'daily'}
							Mission progress will reset every day at midnight (UTC+7).
						{:else if missionForm.refreshType === 'weekly'}
							Mission progress will reset every Monday at midnight (UTC+7).
						{:else}
							Mission does not reset automatically. Progress is permanent.
						{/if}
					</p>
				</div>
			</div>
		</ScrollArea>
		<Dialog.Footer>
			<Button variant="outline" on:click={() => (showMissionDialog = false)}>Cancel</Button>
			<Button on:click={saveMission}>Save</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Edit Map Pack Dialog -->
<Dialog.Root bind:open={showEditMapPackDialog}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Edit Map Pack</Dialog.Title>
		</Dialog.Header>
		<div class="flex flex-col gap-4">
			<div>
				<Label for="editUnlockWeek">Unlock Week</Label>
				<Input id="editUnlockWeek" type="number" min="1" bind:value={mapPackEditForm.unlockWeek} />
			</div>
			<div>
				<Label for="editOrder">Order</Label>
				<Input id="editOrder" type="number" min="0" bind:value={mapPackEditForm.order} />
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" on:click={() => (showEditMapPackDialog = false)}>Cancel</Button>
			<Button on:click={updateMapPack}>Update</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Mission Reward Dialog -->
<Dialog.Root bind:open={showMissionRewardDialog}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Add Mission Reward</Dialog.Title>
		</Dialog.Header>
		<div class="flex flex-col gap-4">
			<div>
				<Label for="mRewardItem">Item ID</Label>
				<Input id="mRewardItem" type="number" bind:value={missionRewardForm.itemId} />
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<Label for="mRewardQty">Quantity</Label>
					<Input id="mRewardQty" type="number" bind:value={missionRewardForm.quantity} min="1" />
				</div>
				<div>
					<Label for="mRewardExpire">Expire After (days)</Label>
					<Input id="mRewardExpire" type="number" bind:value={missionRewardForm.expireAfter} />
				</div>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" on:click={() => (showMissionRewardDialog = false)}>Cancel</Button>
			<Button on:click={addMissionReward}>Add</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<style lang="scss">
	.wrapper {
		padding-inline: 75px;
		padding-block: 30px;
	}

	@media screen and (max-width: 768px) {
		.wrapper {
			padding-inline: 15px;
		}
	}
</style>
