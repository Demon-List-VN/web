<script lang="ts">
	import PlayerHoverCard from '$lib/components/playerLink.svelte';
	import type { PageData } from './$types';
	import Button from '$lib/components/ui/button/button.svelte';
	import { fade, scale, fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import * as Avatar from '$lib/components/ui/avatar';
	import { isActive } from '$lib/client/isSupporterActive';
	import { _ } from 'svelte-i18n';

	export let data: PageData;

	const banned = Array(data.levels.length)
		.fill(false);
	const order = Array(data.levels.length)
		.fill(0);
	let phase = 0;
	const levels: any[] = [null, null, null];
	const logs: any[] = Array(data.levels.length)
		.fill(null);
	const pickedBy: any[] = [null, null, null];
	let turn = 0;
	let coinFlipped = false;
	let isCoinFlipping = false;
	let isBannerFailedToLoad = [false, false];

	function ban(index: number) {
		banned[index] = true;
		logs[index] = data.players[turn];
		phase++;

		toast.info($_('pvp.ban_pick.player_banned', {
			values: {
				player: data.players[turn].name,
				level: data.levels[index].name
			}
		}));

		turn = 1 - turn;
	}

	function pick(index: number) {
		order[index] = phase - 2;
		levels[phase - 3] = data.levels[index];

		if (phase == 5) {
			logs[index] = {
				name: 'Tiebreaker'
			};
		} else {
			logs[index] = data.players[turn];
		}

		pickedBy[phase - 3] = data.players[turn];

		toast.info($_('pvp.ban_pick.player_picked', {
			values: {
				player: data.players[turn].name,
				level: data.levels[index].name,
				order: formatOrder(phase - 2)
			}
		}));

		turn = 1 - turn;
		phase++;
	}

	function formatOrder(x: number) {
		if (x == 1) {
			return $_('pvp.ban_pick.first');
		}

		if (x == 2) {
			return $_('pvp.ban_pick.second');
		}

		if (x == 3) {
			return $_('pvp.ban_pick.tiebreaker');
		}
	}

	onMount(() => {
		const originalOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		return () => {
			document.body.style.overflow = originalOverflow;
		};
	});
</script>

{#if isActive(data.players[0].supporterUntil) && !isBannerFailedToLoad[0]}
  <img
    on:error={() => {
        isBannerFailedToLoad[0] = true;
        isBannerFailedToLoad = isBannerFailedToLoad;
    }}
    class="bgGradient absolute z-0 mt-[-505x] h-[100vh] w-[850px] object-cover"
    src={`https://cdn.gdvn.net/banners/${data.players[0].uid}${
        data.players[0].isBannerGif ? '.gif' : '.jpg'
    }?version=${data.players[0].bannerVersion}`}
    alt={$_('pvp.ban_pick.player_banner', { values: { player: data.players[0].name } })}
  />
{/if}
{#if isActive(data.players[1].supporterUntil) && !isBannerFailedToLoad[1]}
  <img
    on:error={() => {
        isBannerFailedToLoad[1] = true;
        isBannerFailedToLoad = isBannerFailedToLoad;
    }}
    class="bgGradient1 absolute right-0 z-0 mt-[-55px] h-[100vh] w-[850px] object-cover"
    src={`https://cdn.gdvn.net/banners/${data.players[1].uid}${
        data.players[1].isBannerGif ? '.gif' : '.jpg'
    }?version=${data.players[1].bannerVersion}`}
    alt={$_('pvp.ban_pick.player_banner', { values: { player: data.players[1].name } })}
  />
{/if}

<div
  class="relative z-[1px] flex flex-col items-center gap-[30px] pl-[20px] pr-[20px]"
  in:fade={{ duration: 600, easing: quintOut }}
>
  <div
    class="mt-[50px] flex justify-center gap-[50px]"
    in:fly={{ y: -30, duration: 800, delay: 200, easing: quintOut }}
  >
    <div class="flex items-center gap-[10px]">
      <Avatar.Root class="h-8 w-8">
        <Avatar.Image
          class="object-cover"
          src={`https://cdn.gdvn.net/avatars/${data.players[0].uid}${
              isActive(data.players[0].supporterUntil) && data.players[0].isAvatarGif
                  ? '.gif'
                  : '.jpg'
          }?version=${data.players[0].avatarVersion}`}
          alt=""
        />
        <Avatar.Fallback class="text-sm">{
          data.players[0].name[0]
        }</Avatar.Fallback>
      </Avatar.Root>
      <PlayerHoverCard player={data.players[0]} showTitle={true} />
    </div>
    <span class="animate-pulse font-bold">VS</span>
    <div class="flex items-center gap-[10px]">
      <PlayerHoverCard player={data.players[1]} showTitle={true} />
      <Avatar.Root class="h-8 w-8">
        <Avatar.Image
          class="object-cover"
          src={`https://cdn.gdvn.net/avatars/${data.players[1].uid}${
              isActive(data.players[1].supporterUntil) && data.players[1].isAvatarGif
                  ? '.gif'
                  : '.jpg'
          }?version=${data.players[1].avatarVersion}`}
          alt=""
        />
        <Avatar.Fallback class="text-sm">{
          data.players[1].name[1]
        }</Avatar.Fallback>
      </Avatar.Root>
    </div>
  </div>
  <div
    class="flex gap-[10px]"
    in:fly={{ y: -20, duration: 600, delay: 400, easing: quintOut }}
  >
    {#each levels as level, index}
      <div
        class="flex w-[200px] flex-col items-center gap-[10px] rounded-md border-[1px] p-[10px] text-center transition-all duration-300"
        style="backdrop-filter: blur(10px)"
      >
        <div class="font-bold">{
          $_('pvp.ban_pick.level_order', {
            values: { order: formatOrder(index + 1) }
          })
        }</div>
        <div class="">
          {#if !level}
            <div class="text-bold h-[90px] animate-pulse opacity-50">?</div>
          {:else}
            <div
              class="text-bold"
              in:scale={{ duration: 400, easing: quintOut }}
            >
              <b>{level.name}</b><br />
              <span class="text-sm opacity-50">{
                $_('pvp.ban_pick.by_author', { values: { author: level.author } })
              }</span><br />
              <span class="text-sm">{level.difficulty}</span><br />
              {#if index != 2}
                <span class="text-sm">{
                  $_('pvp.ban_pick.picked_by', {
                    values: { player: pickedBy[index].name }
                  })
                }</span>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>
  {#if coinFlipped}
    <div
      class="flex flex-col items-center gap-[10px]"
      in:fly={{ y: 20, duration: 600, delay: 600, easing: quintOut }}
    >
      {#each data.levels as level, index}
        <div
          class="flex w-[500px] items-center rounded-md border-[1px] p-[10px] transition-all duration-300"
          style={`
                ${banned[index] ? 'opacity: 50%;' : ''}
                backdrop-filter: blur(10px);
            `}
          in:fly={{ x: -50, duration: 400, delay: 100 * index, easing: quintOut }}
        >
          <div class="text-bold">
            <b>{level.name}</b> <span class="text-sm opacity-50">{
                $_('pvp.ban_pick.by_author', { values: { author: level.author } })
              }</span><br />
            <span class="text-sm">{level.difficulty}</span>
          </div>
          {#if banned[index]}
            <Button
              variant="destructive"
              class="ml-auto transition-all duration-200"
              disabled
            >{
              $_('pvp.ban_pick.banned_by', {
                values: { player: logs[index].name }
              })
            }</Button>
          {:else if order[index]}
            <Button class="ml-auto transition-all duration-200" disabled>{
              logs[index].name == 'Tiebreaker'
              ? $_('pvp.ban_pick.tiebreaker')
              : $_('pvp.ban_pick.picked_by', {
                  values: { player: logs[index].name }
                })
            }</Button>
          {:else if phase < 3}
            <Button
              variant="destructive"
              class="ml-auto transition-all duration-200"
              on:click={() => ban(index)}
            >{$_('pvp.ban_pick.ban')}</Button>
          {:else}
            <Button
              class="ml-auto transition-all duration-200"
              on:click={() => pick(index)}
            >{$_('pvp.ban_pick.pick')}</Button>
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    <div
      class="flex flex-col items-center gap-4"
      in:fade={{ duration: 600, easing: quintOut }}
    >
      <div class="mb-4 text-center">
        <h2 class="mb-2 text-xl font-bold">
          {$_('pvp.ban_pick.flip_heading')}
        </h2>
        <p class="text-sm opacity-70">{$_('pvp.ban_pick.flip_hint')}</p>
      </div>
      <div
        class="coin-container"
        style={`
                @keyframes flip {
                    0% {
                        transform: rotateY(0);
                    }
                    100% {
                        transform: rotateY(calc(720deg + 180deg));
                    }
                }`}
      >
        <div
          class="coin"
          class:flipping={isCoinFlipping}
          on:animationend={() => {
              coinFlipped = true;
              toast.info($_('pvp.ban_pick.goes_first', {
                values: { player: data.players[turn].name }
              }));
          }}
        >
          <div class="side front text-black">{data.players[0].name}</div>
          <div class="side back text-black">{data.players[1].name}</div>
        </div>
      </div>
      <Button
        on:click={() => {
            turn = Math.round(Math.random());
            isCoinFlipping = true;
        }}
      >
        {$_('pvp.ban_pick.flip_coin')}
      </Button>
    </div>
    {#if turn == 0}
      <style>
      @keyframes flip {
        0% {
          transform: rotateY(0);
        }
        100% {
          transform: rotateY(calc(900deg + 180deg));
        }
      }
      </style>
    {:else}
      <style>
      @keyframes flip {
        0% {
          transform: rotateY(0);
        }
        100% {
          transform: rotateY(calc(900deg));
        }
      }
      </style>
    {/if}
  {/if}
</div>

<div class="pb-[1000px]" />

<style lang="scss">
.bgGradient {
  mask-image: linear-gradient(90deg, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0) 75%);
}

.bgGradient1 {
  mask-image: linear-gradient(
    -90deg,
    rgba(0, 0, 0, 1) 0%,
    rgba(0, 0, 0, 0) 75%
  );
}

.coin-container {
  perspective: 1000px;
  height: 120px;
  width: 120px;
}

.coin {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.1s;

  &.flipping {
    animation: flip 2s forwards;
  }
}

.side {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  backface-visibility: hidden;
}

.front {
  background: linear-gradient(45deg, #f3f3f3, #ddd);
  border: 3px solid #ccc;
}

.back {
  background: linear-gradient(45deg, #e6e6e6, #ccc);
  border: 3px solid #bbb;
  transform: rotateY(180deg);
}
</style>
