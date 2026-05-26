<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Switch } from '$lib/components/ui/switch';
	import LevelCard from '../../event/[id]/levelCard.svelte';
	import PutLevelDialog from './putLevelDialog.svelte';
	import DeleteLevelDialog from './deleteLevelDialog.svelte';

	export let event: any;
	export let levels: any[];
	export let editEvent: () => void;
</script>

<div class="flex flex-col gap-[10px]">
  {#if event.id === undefined}
    Need to be added first
  {:else if !event.isContest}
    Event is not contest
  {:else}
    <div class="input">
      <Label class="w-[100px]">Ranked</Label>
      <Switch bind:checked={event.isRanked} />
    </div>
    <div class="input">
      <Label for="freeze" class="w-[100px]">Freeze</Label>
      <Input
        id="freeze"
        type="datetime-local"
        class="w-[300px]"
        bind:value={event.freeze}
      />
    </div>
    <Button class="w-[100px]" on:click={editEvent}>Save</Button>
    {#each levels as level, index}
      {#if level}
        <div class="flex items-center gap-[10px]">
          <div class="w-[700px]">
            <LevelCard
              {level}
              {index}
              {event}
              type={event.type === 'raid' ? 'raid' : 'basic'}
            />
          </div>
          <div class="flex flex-col gap-[10px]">
            <PutLevelDialog
              {event}
              data={{
                  id: level.id,
                  eventID: event.id,
                  levelID: level.levelID,
                  point: level.point,
                  needRaw: level.needRaw
              }}
              title="Edit"
            />
            <DeleteLevelDialog eventID={event.id} levelID={level.levelID} />
          </div>
        </div>
      {/if}
    {/each}
    <PutLevelDialog {event} title="Add" />
  {/if}
</div>

<style lang="scss">
.input {
  display: flex;
  align-items: center;
  gap: 10px;
}
</style>
