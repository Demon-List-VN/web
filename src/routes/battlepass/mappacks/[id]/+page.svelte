<script lang="ts">
  import { onMount } from 'svelte';
  import { _ } from 'svelte-i18n';
  import { page } from '$app/stores';
  import { user } from '$lib/client';
  import { toast } from 'svelte-sonner';
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card/index.js';
  import { Skeleton } from '$lib/components/ui/skeleton/index.js';
  import Map from 'lucide-svelte/icons/map';
  import Lock from 'lucide-svelte/icons/lock';
  import Check from 'lucide-svelte/icons/check';
  import { DIFFICULTY_COLORS, DIFFICULTY_NAMES } from '$lib/battlepass/constants';
  import type { PageData } from './$types';

  export let data: PageData;
  export let primaryColor: string = '#8b5cf6';

  let loading = false;
  let mounted = false;

  let localMapPackWrapper: any = null;
  $: mapPackWrapper = localMapPackWrapper || data.mapPackWrapper;

  $: mapPackProgress = mapPackWrapper?.progress || null;
  $: mapPackLevelProgress = mapPackWrapper?.levelProgress || {};

  $: mapPack = mapPackWrapper?.mapPacks;

  $: completedLevelsCount = mapPack?.mapPackLevels?.filter((level: any) => 
    (mapPackLevelProgress[level?.levelID] ?? 0) >= 100
  ).length || 0;

  $: totalLevelsCount = mapPack?.mapPackLevels?.length || 0;

  // Generate CSS variable strings for primary color rgba
  $: cssVars = (() => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(primaryColor);
    if (!result) return '';
    const rgb = {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    };
    return `--primary-color: ${rgb.r}, ${rgb.g}, ${rgb.b};`;
  })();

  function getDifficultyColor(difficulty: string): string {
    return DIFFICULTY_COLORS[difficulty?.toLowerCase()] || '#6b7280';
  }

  function getDifficultyName(difficulty: string): string {
    return DIFFICULTY_NAMES[difficulty?.toLowerCase()] || difficulty || 'Unknown';
  }

  function getMapPackLevelProgress(levelID: number): number {
    return mapPackLevelProgress[levelID] ?? 0;
  }

  function isLevelCompleted(levelID: number): boolean {
    return (mapPackLevelProgress[levelID] ?? 0) >= 100;
  }

  function isMapPackCompleted(): boolean {
    const p = mapPackProgress?.progress ?? 0;
    if (p >= 100) return true;
    return totalLevelsCount > 0 && completedLevelsCount === totalLevelsCount;
  }

  function isMapPackClaimed(): boolean {
    return mapPackProgress?.claimed ?? false;
  }

  async function fetchMapPackData() {
    if (!mapPackWrapper?.id) return;
    const token = $user.loggedIn ? await $user.token() : null;
    if (!token) {
        localMapPackWrapper = null; // Revert to data.mapPackWrapper (which likely has no progress)
        return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/battlepass/mappack/${mapPackWrapper.id}`, {
          headers: {
              Authorization: `Bearer ${token}`
          }
      });
      if (res.ok) {
          localMapPackWrapper = await res.json();
      }
    } catch (e) {
      console.error(e);
    }
  }

  onMount(() => {
    mounted = true;
    
    if ($user.loggedIn && mapPackWrapper?.id) {
      fetchMapPackData();
    }
    
    const unsub = user.subscribe(async (value) => {
      if (!mounted) return;
      if (value.loggedIn && mapPackWrapper?.id) {
        await fetchMapPackData();
      } else if (!value.loggedIn) {
        localMapPackWrapper = null;
      }
    });
    return () => { mounted = false; unsub(); };
  });
</script>

<div class="mx-auto max-w-6xl mt-10">
  {#if mapPackWrapper && mapPack}
    <div style={cssVars} class="space-y-8">
      <!-- Hero Header Card -->
      <div class="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-background via-background to-muted/20 shadow-xl">
        <div class="absolute inset-0 opacity-10" style="background: linear-gradient(135deg, {getDifficultyColor(mapPack?.difficulty)}40 0%, transparent 50%);" />
        
        <div class="relative p-8 md:p-10">
          <div class="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <!-- Left Section -->
            <div class="flex flex-1 items-start gap-6">
              <div class="relative">
                <div class="absolute -inset-2 rounded-2xl bg-gradient-to-br opacity-20 blur-xl" style="background: linear-gradient(135deg, {getDifficultyColor(mapPack?.difficulty)}, {primaryColor});" />
                <div class="relative flex h-20 w-20 items-center justify-center rounded-2xl border-2 shadow-lg" style="background: linear-gradient(135deg, {getDifficultyColor(mapPack?.difficulty)}30, {getDifficultyColor(mapPack?.difficulty)}10); border-color: {getDifficultyColor(mapPack?.difficulty)};">
                  <Map class="h-10 w-10" style="color: {getDifficultyColor(mapPack?.difficulty)};" />
                </div>
              </div>

              <div class="flex-1 space-y-2">
                <div class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style="background-color: {getDifficultyColor(mapPack?.difficulty)}20; color: {getDifficultyColor(mapPack?.difficulty)};">
                  {getDifficultyName(mapPack?.difficulty)}
                </div>
                <h1 class="text-3xl font-bold tracking-tight md:text-4xl">{mapPack?.name || 'Map Pack'}</h1>
                {#if mapPack?.description}
                  <p class="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">{mapPack.description}</p>
                {/if}
              </div>
            </div>

            <!-- Right Section - XP Badge -->
            <div class="flex flex-col items-end gap-3">
              <div class="relative">
                <div class="absolute -inset-2 animate-pulse rounded-2xl bg-gradient-to-r opacity-30 blur" style="background: linear-gradient(135deg, {primaryColor}, {getDifficultyColor(mapPack?.difficulty)});" />
                <div class="relative rounded-2xl border-2 px-6 py-4 shadow-lg backdrop-blur" style="background: linear-gradient(135deg, rgba(var(--primary-color), 0.15), rgba(var(--primary-color), 0.05)); border-color: {primaryColor}40;">
                  <div class="text-center">
                    <div class="text-3xl font-black" style="color: {primaryColor};">+{mapPack?.xp || 0}</div>
                    <div class="text-xs font-medium uppercase tracking-wider opacity-60">XP Reward</div>
                  </div>
                </div>
              </div>
              
              <div class="flex items-center gap-4 text-sm">
                <div class="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5">
                  <Map class="h-4 w-4 text-muted-foreground" />
                  <span class="font-medium">{mapPack?.mapPackLevels?.length || 0}</span>
                  <span class="text-muted-foreground">{$_('battlepass.levels_in_pack')}</span>
                </div>
                {#if mapPackWrapper.unlockWeek > 1}
                  <div class="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5">
                    <Lock class="h-4 w-4 text-muted-foreground" />
                    <span class="text-muted-foreground">{$_('battlepass.unlocks_week', { values: { week: mapPackWrapper.unlockWeek } })}</span>
                  </div>
                {/if}
              </div>
            </div>
          </div>

          <!-- Progress Bar (if logged in) -->
          {#if $user.loggedIn}
            <div class="mt-8 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium">{$_('battlepass.progress')}</span>
                <span class="text-2xl font-bold" style="color: {getDifficultyColor(mapPack?.difficulty)};">{localMapPackWrapper?.progress?.progress ?? 0}%</span>
              </div>
              <div class="relative h-4 overflow-hidden rounded-full bg-muted/50 shadow-inner">
                <div class="h-full rounded-full shadow-lg transition-all duration-700 ease-out" style="width: {localMapPackWrapper?.progress?.progress ?? 0}%; background: linear-gradient(90deg, {getDifficultyColor(mapPack?.difficulty)}, {primaryColor});" />
              </div>
              <div class="flex items-center justify-between text-xs text-muted-foreground">
                <span>{completedLevelsCount} / {totalLevelsCount} {$_('battlepass.levels_in_pack')}</span>
                {#if isMapPackCompleted() && !isMapPackClaimed()}
                  <span class="font-semibold text-green-500">Ready to claim!</span>
                {/if}
              </div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Levels Grid -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold">{$_('battlepass.levels_list')}</h2>
          {#if $user.loggedIn}
            <div class="rounded-full bg-muted px-4 py-1.5 text-sm font-medium">
              <span class="text-muted-foreground">Completed:</span>
              <span class="ml-2 font-bold">{completedLevelsCount}/{totalLevelsCount}</span>
            </div>
          {/if}
        </div>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {#each mapPack?.mapPackLevels || [] as level, i}
            {@const levelCompleted = isLevelCompleted(level.levelID)}
            {@const levelProg = getMapPackLevelProgress(level.levelID)}
            <div class="group relative overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-xl {levelCompleted ? 'border-green-500/50 bg-gradient-to-br from-green-500/5 to-green-500/0' : ''}">
              {#if levelCompleted}
                <div class="absolute right-0 top-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full bg-gradient-to-br from-green-500/30 to-green-500/0 blur-2xl" />
              {/if}

              <div class="relative p-5">
                <div class="mb-4 flex items-start justify-between">
                  <div class="flex items-start gap-3">
                    <div class="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold transition-transform duration-300 group-hover:scale-110 {levelCompleted ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/50' : 'bg-muted text-muted-foreground'}">
                      {#if levelCompleted}
                        <Check class="h-6 w-6" />
                        <div class="absolute -inset-1 animate-pulse rounded-xl bg-green-500/30 blur" />
                      {:else}
                        <span>{i + 1}</span>
                      {/if}
                    </div>
                    <div class="min-w-0 flex-1">
                      <h3 class="truncate font-semibold leading-tight">{level.levels?.name || `Level ${level.levelID}`}</h3>
                      <p class="mt-0.5 text-xs text-muted-foreground">ID: {level.levelID}</p>
                    </div>
                  </div>
                  
                  {#if levelCompleted}
                    <div class="rounded-full bg-green-500/20 px-2 py-1 text-xs font-semibold text-green-600">
                      ✓ Done
                    </div>
                  {/if}
                </div>

                {#if $user.loggedIn}
                  <div class="space-y-2">
                    <div class="flex items-center justify-between text-xs">
                      <span class="text-muted-foreground">Progress</span>
                      <span class="font-semibold">{levelProg}%</span>
                    </div>
                    <div class="h-2 overflow-hidden rounded-full bg-muted">
                      <div class="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 shadow-lg transition-all duration-500" style="width: {levelProg}%" />
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>

    </div>
  {:else}
    <div class="flex min-h-[400px] items-center justify-center rounded-2xl border border-dashed">
      <div class="text-center">
        <Map class="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
        <p class="text-lg text-muted-foreground">{$_('battlepass.no_map_packs')}</p>
      </div>
    </div>
  {/if}
</div>
