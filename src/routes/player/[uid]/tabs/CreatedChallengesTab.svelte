<script lang="ts">
	import { onMount } from 'svelte';
	import * as Table from '$lib/components/ui/table';
	import { _ } from 'svelte-i18n';

	export let userID: string;

	interface LevelData {
		id: number;
		name: string;
		creator: string;
		videoID: string;
		dlTop: number | null;
		rating: number | null;
		isChallenge: boolean;
	}

	let levels: LevelData[] = [];
	let loading = true;

	onMount(async () => {
		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/players/${userID}/created-challenges`
			);
			levels = await response.json();
		} catch (error) {
			console.error('Failed to fetch created challenges:', error);
		} finally {
			loading = false;
		}
	});
</script>

{#if loading}
	<div class="flex justify-center py-10">
		<p>Loading...</p>
	</div>
{:else if levels.length === 0}
	<div class="flex flex-col items-center justify-center py-12 text-center">
		<p class="text-muted-foreground">{$_('player.no_created_challenges')}</p>
	</div>
{:else}
	<Table.Root>
		<Table.Caption
			>{$_('player.table.total_created_challenges')}: {levels.length}</Table.Caption
		>
		<Table.Header>
			<Table.Row>
				<Table.Head class="w-[60px] text-center">#</Table.Head>
				<Table.Head>{$_('player.table.level')}</Table.Head>
				<Table.Head class="w-[100px] text-center">{$_('player.table.point')}</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each levels as level}
				<Table.Row>
					<Table.Cell class="text-center">{level.dlTop}</Table.Cell>
					<Table.Cell class="font-medium">
						<div class="relative flex h-[38px]">
							<img
								class="levelBG absolute ml-[-18px] mt-[-8px] box-border h-[53.5px] w-[350px] max-w-full object-cover"
								src={`https://img.youtube.com/vi/${level.videoID}/0.jpg`}
								alt="bg"
							/>
							<a
								class="levelName z-10 mt-[10px]"
								href={`/level/${level.id}`}
								data-sveltekit-preload-data="tap"
							>
								{level.name}
							</a>
						</div>
					</Table.Cell>
					<Table.Cell class="text-center">
						{level.rating ? Math.round(level.rating * 10) / 10 : '-'}
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
{/if}

<style lang="scss">
	.levelBG {
		padding-right: 10px;
		mask-image: linear-gradient(
			90deg,
			rgba(0, 0, 0, 0) 0%,
			rgba(0, 0, 0, 1) 20%,
			rgba(0, 0, 0, 1) 50%,
			rgba(0, 0, 0, 0) 90%,
			rgba(0, 0, 0, 0) 100%
		);
		opacity: 0.5;
		transition: opacity 0.3s;
	}

	.levelBG:hover {
		opacity: 1;
	}

	.levelName {
		text-shadow: 0px 1px 2px var(--textColorInverted);
	}
</style>
