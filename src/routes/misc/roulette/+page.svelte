<script lang="ts">
import {onMount} from 'svelte';
import {Input} from '$lib/components/ui/input';
import {Button} from '$lib/components/ui/button';
import {Card, CardContent} from '$lib/components/ui/card';
import {Label} from '$lib/components/ui/label';
import LevelCard from '$lib/components/levelCard.svelte';

interface Level {
  readonly id?: number;
  readonly name?: string;
  readonly dlTop?: number | null;
  readonly flTop?: number | null;
  readonly plTop?: number | null;
  readonly isPlatformer?: boolean;
  readonly [key: string]: unknown;
}

// State variables
let currentLevel: Level | null = null;
let currentType: 'dl' | 'fl' | 'pl' = 'dl';
let finished = false;
let message = '';
let listType: 'all' | 'dl' | 'fl' | 'pl' = 'all';
let inputValue = '';
let targetPercent = 2;
let inputError = '';
let loading = false;
let playedLevels: number[] = [];

// Range filter state
let rangeStart: number | '' = '';
let rangeEnd: number | '' = '';
let pendingRangeStart: number | '' = '';
let pendingRangeEnd: number | '' = '';

// Cache for max values (fetched once)
let maxDlTop = 0;
let maxFlTop = 0;
let isMaxValuesLoaded = false;

const MAX_RETRY_ATTEMPTS = 50;
const CACHE_BUSTER_PARAM = '_';

/**
 * Extracts level data from various API response formats.
 */
function extractLevelFromRandomResponse(json: unknown): Level | null {
  if (!json) return null;
  
  const jsonObj = json as Record<string, unknown>;
  
  if (jsonObj.data && !Array.isArray(jsonObj.data) && typeof jsonObj.data === 'object') {
    return jsonObj.data as Level;
  }
  
  if (jsonObj.data && Array.isArray(jsonObj.data) && jsonObj.data.length > 0) {
    return jsonObj.data[0] as Level;
  }
  
  if (typeof json === 'object' && !Array.isArray(json)) {
    return json as Level;
  }
  
  return null;
}

/**
 * Safely parses JSON response with fallback error handling.
 */
async function safeJsonParse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    try {
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  }
}

/**
 * Fetches max values for range display from API endpoints.
 */
async function fetchMaxValues(): Promise<void> {
  if (isMaxValuesLoaded) return;
  
  try {
    const [dlResponse, flResponse] = await Promise.all([
      fetch('https://api.gdvn.net/list/dl?start=0&end=0&sortBy=dlTop&ascending=false'),
      fetch('https://api.gdvn.net/list/fl?start=0&end=0&sortBy=flTop&ascending=false'),
    ]);

    const [dlData, flData] = await Promise.all([
      safeJsonParse(dlResponse),
      safeJsonParse(flResponse),
    ]);

    const dlLevels = Array.isArray(dlData) ? dlData : ((dlData as {data?: Level[]})?.data ?? []);
    const flLevels = Array.isArray(flData) ? flData : ((flData as {data?: Level[]})?.data ?? []);

    maxDlTop = dlLevels.length > 0 ? (dlLevels[0].dlTop ?? 1000) : 1000;
    maxFlTop = flLevels.length > 0 ? (flLevels[0].flTop ?? 1000) : 1000;
    
    isMaxValuesLoaded = true;
  } catch (error) {
    console.error('Error fetching max values:', error);
    // Set fallback values
    maxDlTop = 1000;
    maxFlTop = 1000;
    isMaxValuesLoaded = true;
  }
}

/**
 * Resets all roulette state to initial values.
 */
function resetRoulette(): void {
  currentLevel = null;
  inputValue = '';
  targetPercent = 2;
  finished = false;
  message = '';
  inputError = '';
  playedLevels = [];
  void fetchRandomLevel();
}

/**
 * Determines the list type for random selection based on current settings.
 */
function determineRandomListType(): 'dl' | 'fl' {
  if (listType === 'dl') return 'dl';
  if (listType === 'fl') return 'fl';
  
  // For 'all' or 'pl', randomly choose between dl and fl
  const choices: readonly ('dl' | 'fl')[] = ['dl', 'fl'] as const;
  return choices[Math.floor(Math.random() * choices.length)];
}

/**
 * Checks if a level meets the specified range criteria.
 */
function isLevelInRange(level: Level, type: 'dl' | 'fl' | 'pl'): boolean {
  const topValue = type === 'dl' ? level.dlTop : 
                   type === 'fl' ? level.flTop : 
                   level.dlTop;
  
  if (rangeStart !== '' && (typeof topValue !== 'number' || topValue < Number(rangeStart))) {
    return false;
  }
  
  if (rangeEnd !== '' && (typeof topValue !== 'number' || topValue > Number(rangeEnd))) {
    return false;
  }
  
  return true;
}

/**
 * Fetches a random level from the API with retry logic for filtering.
 */
async function fetchRandomLevel(): Promise<void> {
  if (finished) return;
  
  loading = true;
  let attempts = 0;
  
  try {
    while (attempts < MAX_RETRY_ATTEMPTS) {
      attempts++;
      
      const type = determineRandomListType();
      currentType = type;
      
      const url = `https://api.gdvn.net/list/${type}/random?${CACHE_BUSTER_PARAM}=${Date.now()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Random API returned ${response.status}`);
      }
      
      const jsonData = await safeJsonParse(response);
      const level = extractLevelFromRandomResponse(jsonData);

      // Skip platformer levels
      if (level?.isPlatformer) {
        console.log('Skipped platformer level:', level.name);
        continue;
      }

      // Skip already played levels
      if (level?.id && playedLevels.includes(level.id)) {
        console.log('Skipped already played level:', level.name);
        continue;
      }

      // Check range criteria
      if (level && !isLevelInRange(level, type)) {
        console.log('Skipped level outside range:', level.name);
        continue;
      }

      if (!level) {
        message = 'No level returned from random API.';
        finished = true;
        currentLevel = null;
        return;
      }

      // Valid level found
      currentLevel = level;
      finished = false;
      message = '';
      return;
    }
    
    // Exceeded max attempts
    message = 'No suitable levels found. Try adjusting your range or reset.';
    finished = true;
    currentLevel = null;
    
  } catch (error) {
    console.error('fetchRandomLevel error:', error);
    message = 'Error loading random level. Try again.';
    finished = false;
    currentLevel = null;
  } finally {
    loading = false;
  }
}

/**
 * Validates percentage input according to roulette rules.
 */
function validateInput(value: string): boolean {
  if (targetPercent > 100) return false;
  
  if (value.trim() === '') {
    inputError = '';
    return false;
  }
  
  const numericValue = Number(value);
  
  if (!/^[0-9]+$/.test(value) || isNaN(numericValue) || !Number.isInteger(numericValue)) {
    inputError = 'Please enter a valid integer.';
    return false;
  }
  
  if (targetPercent === 100 && numericValue !== 100) {
    inputError = 'You must enter exactly 100% to finish!';
    return false;
  }
  
  if (targetPercent < 100 && numericValue < targetPercent) {
    inputError = `You must enter at least ${targetPercent}%`;
    return false;
  }
  
  if (numericValue > 100) {
    inputError = 'Maximum is 100%';
    return false;
  }
  
  inputError = '';
  return true;
}

/**
 * Handles input events for percentage field.
 */
function onInput(event: Event): void {
  const target = event.target as HTMLInputElement;
  inputValue = target.value;
  validateInput(inputValue);
}

/**
 * Processes completion of current roulette step.
 */
async function doneRoulette(): Promise<void> {
  if (!validateInput(inputValue)) return;
  
  const percentValue = Number(inputValue);

  // Add current level to played levels
  if (currentLevel?.id) {
    playedLevels = [...playedLevels, currentLevel.id];
  }

  if (percentValue >= 100) {
    finished = true;
    currentLevel = null;
    message = '🎉 Congratulations! You have completed the Roulette!';
    return;
  }
  
  targetPercent = percentValue + 1;
  inputValue = '';
  inputError = '';
  await fetchRandomLevel();
}

/**
 * Skip current level without changing the target percent.
 */
function skipLevel(): void {
  if (!currentLevel) return;

  if (currentLevel?.id) {
    playedLevels = [...playedLevels, currentLevel.id];
  }

  // Clear current level and fetch a new one
  currentLevel = null;
  void fetchRandomLevel();
}

/**
 * Applies pending range values and resets roulette.
 */
function applyRange(): void {
  rangeStart = pendingRangeStart;
  rangeEnd = pendingRangeEnd;
  resetRoulette();
}

/**
 * Handles list type selection changes.
 */
function handleListTypeChange(newType: 'all' | 'dl' | 'fl'): void {
  listType = newType;
  resetRoulette();
}

/**
 * Gets the maximum range value for display based on current list type.
 */
function getMaxRangeValue(): number {
  switch (listType) {
    case 'dl':
      return maxDlTop;
    case 'fl':
      return maxFlTop;
    case 'all':
    default:
      return Math.max(maxDlTop, maxFlTop);
  }
}

onMount(() => {
  void fetchMaxValues().then(() => {
    resetRoulette();
  });
});
</script>

<div class="flex flex-col items-center min-h-screen dark:text-white text-black pb-10 px-2">
  <h1 class="text-5xl font-bold mt-16 mb-2 text-center">Roulette</h1>
  <div class="dark:text-zinc-300 text-zinc-700 text-lg text-center mb-8">
    A roulette will select any Extreme Demon for you to try with increasing minimum percentages<br />
    If you reach 100% minimum percentages then you have completed roulette
  </div>

  <div class="flex flex-col md:flex-row gap-6 md:gap-10 mt-6 items-start w-full max-w-5xl">
    <Card class="rounded-2xl shadow-xl min-w-[0] w-full md:max-w-[520px] flex flex-col items-center dark:bg-black bg-white mb-6 md:mb-0">
      <CardContent class="w-full flex-col items-center p-4 sm:p-8">
        {#if loading}
          <div class="h-[120px] sm:h-[220px] flex items-center justify-center text-base sm:text-xl mb-4 text-zinc-500 dark:text-zinc-400">
            Loading...
          </div>
        {:else if currentLevel}
          <LevelCard level={currentLevel} type={currentType} />
        {:else if !finished}
          <div class="h-[120px] sm:h-[220px] flex items-center justify-center text-base sm:text-xl mb-4 text-zinc-500 dark:text-zinc-400">
            No level loaded
          </div>
        {/if}

        {#if finished}
          <div class="text-green-500 text-lg sm:text-xl font-bold my-4 sm:my-8 text-center">
            {message}
          </div>
        {/if}

        {#if !finished && currentLevel && targetPercent <= 100}
          <div class="flex flex-col items-center gap-2 mt-6 w-full">
            <Label for="percent" class="font-light text-base sm:text-lg dark:text-white text-black">
              Fill in the number in the box below
            </Label>
            <Input
              id="percent"
              class="w-28 sm:w-40 text-center text-base font-medium sm:text-lg dark:bg-black bg-white placeholder:dark:text-zinc-600 placeholder:text-zinc-400 dark:text-white text-black"
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              placeholder={`At least ${targetPercent}%`}
              value={inputValue}
              on:input={onInput}
              autocomplete="off"
            />
            {#if inputError}
              <div class="text-red-500 text-xs sm:text-sm text-center mt-2">
                {inputError}
              </div>
            {/if}
          </div>
        {/if}
      </CardContent>
    </Card>

    <Card class="rounded-2xl shadow-xl min-w-[0] w-full md:max-w-[350px] flex flex-col items-center dark:bg-black bg-white">
      <CardContent class="w-full flex flex-col items-center p-4 sm:p-8 gap-3 sm:gap-5">
        {#if isMaxValuesLoaded}
          <div class="dark:text-zinc-300 text-zinc-700 text-sm sm:text-base mb-1 text-center">
            Range: <strong>#{1} to #{getMaxRangeValue()}</strong>
          </div>
        {/if}
        
        <div class="flex items-center gap-2 mb-2 w-full justify-center">
          <Input 
            class="w-24 sm:w-24 text-left text-sm sm:text-base dark:bg-black bg-white dark:text-white text-black" 
            placeholder="From" 
            type="number" 
            min="1" 
            bind:value={pendingRangeStart} 
          />
          <span class="dark:text-zinc-400 text-zinc-500 text-lg">-</span>
          <Input 
            class="w-24 sm:w-24 text-left text-sm sm:text-base dark:bg-black bg-white dark:text-white text-black" 
            placeholder="To" 
            type="number" 
            min="1" 
            bind:value={pendingRangeEnd} 
          />
        </div>

        <div class="flex gap-2 mb-2 w-full justify-center flex-wrap">
          <Button 
            variant={listType === 'all' ? 'default' : 'secondary'} 
            class={listType === 'all' ? 'dark:bg-white bg-black dark:text-black text-white' : 'dark:bg-black bg-white dark:text-white text-black'}
            on:click={() => handleListTypeChange('all')}
          >
            All
          </Button>
          <Button 
            variant={listType === 'dl' ? 'default' : 'secondary'} 
            class={listType === 'dl' ? 'dark:bg-white bg-black dark:text-black text-white' : 'dark:bg-black bg-white dark:text-white text-black'}
            on:click={() => handleListTypeChange('dl')}
          >
            Classic
          </Button>
          <Button 
            variant={listType === 'fl' ? 'default' : 'secondary'} 
            class={listType === 'fl' ? 'dark:bg-white bg-black dark:text-black text-white' : 'dark:bg-black bg-white dark:text-white text-black'}
            on:click={() => handleListTypeChange('fl')}
          >
            Featured
          </Button>
        </div>

        <Button 
          variant="secondary" 
          class="w-full py-2 text-sm sm:text-base font-normal dark:bg-black bg-white dark:text-white text-black" 
          on:click={applyRange} 
        >
          Apply
        </Button>

        <Button 
          class="w-full py-2 sm:py-3 text-base sm:text-lg font-normal mb-2 dark:bg-white bg-black dark:text-black text-white" 
          on:click={doneRoulette} 
          disabled={finished || targetPercent > 100 || !validateInput(inputValue)}
        >
          Start
        </Button>

        <div class="flex gap-2 w-full">
          <Button 
            variant="secondary" 
            class="flex-1 py-2 mt-2 text-sm sm:text-base font-normal border dark:bg-black bg-white dark:text-white text-black flex justify-center" 
            on:click={resetRoulette}
          >
            Reset
          </Button>

          <Button
            variant="secondary"
            class="flex-1 mt-2 py-2 text-sm sm:text-base font-normal border dark:bg-black bg-white dark:text-white text-black flex justify-center"
            on:click={skipLevel}
            disabled={!currentLevel || loading || finished}
          >
            Skip
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</div>

<p class="text-lg font-medium text-center text-zinc-700">Created by vradient</p>