<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as ContextMenu from '$lib/components/ui/context-menu';
	import { toast } from 'svelte-sonner';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import Check from 'svelte-radix/Check.svelte';
	import Clock from 'svelte-radix/Clock.svelte';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { user } from '$lib/client';
	import { calcRating } from '$lib/client/rating';
	import { isActive } from '$lib/client/isSupporterActive';
	import { _ } from 'svelte-i18n';
	import { get } from 'svelte/store';
	import PlayerLink from '$lib/components/playerLink.svelte';

	let failedToLoad = false;

	function getTimeString(ms: number) {
		const minutes = Math.floor(ms / 60000);
		const seconds = Math.floor((ms % 60000) / 1000);
		const milliseconds = ms % 1000;

		return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds}`;
	}

	export let level: any;
	export let type: string;
	export let top: number | null = null;
	export let hideTop: boolean = false;

	$: levelTags = (level?.levels_tags || []).map((lt: any) => lt.level_tags).filter(Boolean);
</script>

{#if level}
	<div class="level">
		<Card.Root>
			<Card.Content>
				<ContextMenu.Root>
					<ContextMenu.Trigger>
						<a href={`/level/${level.id}`} data-sveltekit-preload-data="tap">
							<div class="relative flex h-[235px] justify-center">
								<img
									src={`https://img.youtube.com/vi/${level.videoID}/0.jpg`}
									alt=""
									loading="lazy"
									class="thumbnail absolute"
								/>
								{#if !failedToLoad}
									<img
										src={`https://levelthumbs.prevter.me/thumbnail/${level.id}/small`}
										alt=""
										loading="lazy"
										class="thumbnail z-1 absolute translate-x-4 opacity-0 transition-all duration-300 ease-in-out hover:translate-x-0 hover:opacity-100"
										on:error={() => {
											failedToLoad = true;
										}}
									/>
								{/if}
							</div>
						</a>
						<div class="levelInfo relative h-[60px]">
							<a
								href={`/level/${level.id}`}
								class="absolute inset-0 z-10"
								data-sveltekit-preload-data="tap"
							></a>
								{#if !hideTop}
									{#if top}
										<div class="top">#{top}</div>
									{:else}
										<div class="top">#{level[`${type == 'fl' ? 'fl' : 'dl'}Top`]}</div>
									{/if}
								{/if}
								<div class="info">
									<div class="levelName">
										<div class="name">
											{#if top && !hideTop}
												#{level[`${type == 'fl' ? 'fl' : 'dl'}Top`]}
											{/if}
											{level.name}
										</div>
										<div class="pt">
											{#if type == 'fl'}
												{level.flPt}pt
											{:else}
												{level.rating}pt
											{/if}
										</div>
										{#key $user}
											{#if $user.loggedIn && isActive($user.data.supporterUntil) && type == 'dl'}
												{#if !level.record}
													<Tooltip.Root>
														<div class="relative z-20">
															<Tooltip.Trigger>
																<div class="pt">
																	+{calcRating($user.ratings, level.rating) - $user.data.rating}
																</div>
															</Tooltip.Trigger>
														</div>
														<Tooltip.Content>
															<p>
																{$user.data.rating} -> {calcRating($user.ratings, level.rating)}
															</p>
														</Tooltip.Content>
													</Tooltip.Root>
												{/if}
											{/if}
										{/key}
										{#if level.minProgress}
											{#if type == 'dl' && level.minProgress != 100}
												<div class="pt">
													{level.minProgress}% Min
												</div>
											{:else if type == 'pl'}
												<div class="pt">
													{getTimeString(level.minProgress)} Base
												</div>
											{/if}
										{/if}
									</div>
									<div class="creator flex gap-[5px]">
										by
										{#if level.creatorId}
											<div class="relative z-20">
												<PlayerLink player={level.creatorData} />
											</div>
										{:else}
											{level.creator}
										{/if}
									</div>
									{#if levelTags.length > 0}
										<div class="levelTags">
											{#each levelTags as tag}
												<span class="levelTag" style="background: {tag.color || '#666'}18; color: {tag.color || '#666'}; border-color: {tag.color || '#666'}30">
													{tag.name}
												</span>
											{/each}
										</div>
									{/if}
								</div>
								{#if level.record}
									<div class="progress">
										{#if level.record.isChecked}
											{#if !level.isPlatformer}
												{#if level.record.progress == 100}
													<Check />
												{:else}
													{level.record.progress}%
												{/if}
											{:else}
												{getTimeString(level.record.progress)}
											{/if}
										{:else}
											<Clock />
										{/if}
									</div>
								{/if}
							</div>
					</ContextMenu.Trigger>
					<ContextMenu.Content class="w-64">
						<ContextMenu.Item
							inset
							on:click={async () => {
								await navigator.clipboard.writeText(String(level.id));
								toast.success($_('toast.clipboard'));
							}}>{$_('context.copy_level_id')}</ContextMenu.Item
						>
						<ContextMenu.Item
							inset
							on:click={async () => {
								await navigator.clipboard.writeText(
									`https://img.youtube.com/vi/${level.videoID}/0.jpg`
								);
								toast.success($_('toast.clipboard'));
							}}>{$_('context.copy_thumbnail')}</ContextMenu.Item
						>
					</ContextMenu.Content>
				</ContextMenu.Root>
			</Card.Content>
		</Card.Root>
	</div>
{:else}
	<div class="level">
		<Card.Root>
			<Card.Content>
				<ContextMenu.Root>
					<ContextMenu.Trigger>
						<a href="#!" data-sveltekit-preload-data="tap">
							<Skeleton class="mb-[15px] mt-[20px] h-[200px] w-full" />
						</a>
						<a href="#!" data-sveltekit-preload-data="tap">
							<div class="levelInfo">
								<div class="top"><Skeleton class="mb-[10px] mt-[10px] h-[60px] w-[60px]" /></div>
								<div class="info">
									<div class="levelName">
										<div class="name"><Skeleton class="mb-[10px] h-[30px] w-[200px]" /></div>
									</div>
									<div class="creator"><Skeleton class="h-[20px] w-[100px]" /></div>
								</div>
							</div></a
						>
					</ContextMenu.Trigger>
				</ContextMenu.Root>
			</Card.Content>
		</Card.Root>
	</div>
{/if}

<style lang="scss">
	.name {
		margin-right: 3px;
	}
	.thumbnail {
		height: 200px;
		width: 500px;
		object-fit: cover;
		margin-top: 20px;
		border-radius: var(--radius);
		border: 1px solid var(--border1);
		margin-bottom: 15px;
		margin-inline: auto;
	}

	.level {
		overflow: hidden;

		.levelInfo {
			margin-top: -5px;
			margin-bottom: -15px;
			display: flex;
			gap: 15px;
			align-items: center;

			.top {
				font-size: 44px;
				font-weight: 600;
			}

			.info {
				display: flex;
				flex-direction: column;
				line-height: 20px;

				.levelName {
					font-size: 18px;
					font-weight: 500;
					display: flex;
					flex-wrap: wrap;
					align-items: center;
					gap: 5px;

					.pt {
						background-color: var(--textColor);
						color: var(--textColorInverted);
						padding: 4px;
						font-size: 11px;
						border-radius: var(--radius);
						line-height: 18px;
					}
				}

				.creator {
					color: var(--textColor2);
				}

				.levelTags {
					display: flex;
					flex-wrap: wrap;
					gap: 3px;
					margin-top: 2px;
				}

				.levelTag {
					display: inline-flex;
					padding: 1px 6px;
					border-radius: 8px;
					font-size: 10px;
					font-weight: 600;
					line-height: 1.3;
					border: 1px solid;
				}
			}

			.progress {
				margin-left: auto;
				font-weight: 500;
			}
		}
	}
</style>
