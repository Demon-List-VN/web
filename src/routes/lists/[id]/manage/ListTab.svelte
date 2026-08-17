<script lang="ts">
	import { Switch } from '$lib/components/ui/switch';
	import {
		ArrowDown,
		ArrowUp,
		Hammer,
		ListOrdered,
		Star,
		Users
	} from 'lucide-svelte';
	import { _ } from 'svelte-i18n';

	export let editForm: any;
	export let updateItemSort: (
		itemSort: 'mode_default' | 'created_at'
	) => void | Promise<void> = async () => {};

	function formatListType(isPlatformer: boolean) {
		return isPlatformer
			? $_('custom_lists.type.platformer')
			: $_('custom_lists.type.classic');
	}
</script>

<div class="tabContent">
  <div class="toolCard">
    <h2 class="toolHeading">{$_('custom_lists.manage.tabs.list')}</h2>
    <div class="formGrid">
      <div class="field">
        <span class="fieldLabel">{
          $_('custom_lists.detail.edit.leaderboard_mode_label')
        }</span>
        <div class="optionRow">
          <button
            type="button"
            class="optionBtn"
            class:selected={editForm.leaderboardMode === 'player'}
            on:click={() => (editForm.leaderboardMode = 'player')}
          >
            <Users class="h-3.5 w-3.5" />
            {$_('custom_lists.detail.edit.leaderboard_mode_player')}
          </button>
          <button
            type="button"
            class="optionBtn"
            class:selected={editForm.leaderboardMode === 'creator'}
            on:click={() => (editForm.leaderboardMode = 'creator')}
          >
            <Hammer class="h-3.5 w-3.5" />
            {$_('custom_lists.detail.edit.leaderboard_mode_creator')}
          </button>
        </div>
        <p class="hint">
          {editForm.leaderboardMode === 'creator'
            ? $_('custom_lists.detail.edit.leaderboard_mode_creator_hint')
            : $_('custom_lists.detail.edit.leaderboard_mode_player_hint')}
        </p>
      </div>
      <div class="field">
        <div class="switchRow">
          <div>
            <label for="list-platformer">{
              $_('custom_lists.detail.edit.type_label')
            }</label>
            <p class="hint">{$_('custom_lists.detail.edit.type_hint')}</p>
          </div>
          <div class="switchControl">
            <span class="switchLabel">{
              formatListType(editForm.isPlatformer)
            }</span>
            <Switch id="list-platformer" bind:checked={editForm.isPlatformer} />
          </div>
        </div>
      </div>
      <div class="field">
        <div class="switchRow">
          <div>
            <label for="list-community-enabled">{
              $_('custom_lists.detail.edit.community_label')
            }</label>
            <p class="hint">{$_('custom_lists.detail.edit.community_hint')}</p>
          </div>
          <div class="switchControl">
            <span class="switchLabel">{
              editForm.communityEnabled ? $_('general.yes') : $_('general.no')
            }</span>
            <Switch
              id="list-community-enabled"
              bind:checked={editForm.communityEnabled}
            />
          </div>
        </div>
      </div>
      <div class="field">
        <div class="switchRow">
          <div>
            <label for="list-leaderboard-enabled">{
              $_('custom_lists.detail.edit.leaderboard_enabled_label')
            }</label>
            <p class="hint">
              {editForm.leaderboardMode === 'creator'
                ? $_('custom_lists.detail.edit.leaderboard_enabled_creator_hint')
                : $_('custom_lists.detail.edit.leaderboard_enabled_hint')}
            </p>
          </div>
          <div class="switchControl">
            <span class="switchLabel">{
              editForm.leaderboardEnabled ? $_('general.yes') : $_('general.no')
            }</span>
            <Switch
              id="list-leaderboard-enabled"
              bind:checked={editForm.leaderboardEnabled}
            />
          </div>
        </div>
      </div>
      <div class="field">
        <div class="switchRow">
          <div>
            <label for="list-staff-list-enabled">{
              $_('custom_lists.detail.edit.staff_list_label')
            }</label>
            <p class="hint">{$_('custom_lists.detail.edit.staff_list_hint')}</p>
          </div>
          <div class="switchControl">
            <span class="switchLabel">{
              editForm.staffListEnabled ? $_('general.yes') : $_('general.no')
            }</span>
            <Switch
              id="list-staff-list-enabled"
              bind:checked={editForm.staffListEnabled}
            />
          </div>
        </div>
      </div>
      <div class="field">
        <span class="fieldLabel">{
          $_('custom_lists.detail.edit.mode_label')
        }</span>
        <div class="optionRow">
          {#each ['rating', 'top'] as mode}
            <button
              type="button"
              class="optionBtn"
              class:selected={editForm.mode === mode}
              on:click={() => (editForm.mode = mode === 'rating' ? 'rating' : 'top')}
            >
              {#if mode === 'rating'}
                <Star class="h-3.5 w-3.5" />
              {:else}
                <ListOrdered class="h-3.5 w-3.5" />
              {/if}
              {
                mode === 'rating'
                ? $_('custom_lists.detail.edit.mode_rating')
                : $_('custom_lists.detail.edit.mode_top')
              }
            </button>
          {/each}
        </div>
        <p class="hint">
          {
            editForm.mode === 'rating'
            ? $_('custom_lists.detail.edit.mode_rating_hint')
            : $_('custom_lists.detail.edit.mode_top_hint')
          }
        </p>
      </div>
      <div class="field">
        <span class="fieldLabel">{
          $_('custom_lists.detail.edit.item_sort_label')
        }</span>
        <div class="optionRow">
          {#each ['mode_default', 'created_at'] as itemSort}
            <button
              type="button"
              class="optionBtn"
              class:selected={editForm.itemSort === itemSort}
              on:click={() =>
              void updateItemSort(
                  itemSort === 'created_at' ? 'created_at' : 'mode_default'
              )}
            >
              {
                itemSort === 'created_at'
                ? $_('custom_lists.detail.edit.item_sort_created_at')
                : $_('custom_lists.detail.edit.item_sort_mode_default')
              }
            </button>
          {/each}
        </div>
        <p class="hint">{$_('custom_lists.detail.edit.item_sort_hint')}</p>
      </div>
      <div class="field">
        <span class="fieldLabel">{
          $_('custom_lists.detail.edit.item_sort_direction_label')
        }</span>
        <div class="optionRow">
          <button
            type="button"
            class="optionBtn"
            class:selected={editForm.itemSortAscending === true}
            on:click={() => (editForm.itemSortAscending = true)}
          >
            <ArrowUp class="h-3.5 w-3.5" />
            {$_('custom_lists.detail.edit.item_sort_ascending')}
          </button>
          <button
            type="button"
            class="optionBtn"
            class:selected={editForm.itemSortAscending === false}
            on:click={() => (editForm.itemSortAscending = false)}
          >
            <ArrowDown class="h-3.5 w-3.5" />
            {$_('custom_lists.detail.edit.item_sort_descending')}
          </button>
        </div>
        <p class="hint">
          {$_('custom_lists.detail.edit.item_sort_direction_hint')}
        </p>
      </div>
      <div class="field">
        <div class="switchRow">
          <div>
            <label for="list-top-enabled">{
              $_('custom_lists.detail.edit.top_enabled_label')
            }</label>
            <p class="hint">
              {$_('custom_lists.detail.edit.top_enabled_hint')}
            </p>
          </div>
          <div class="switchControl">
            <span class="switchLabel">{
              editForm.topEnabled ? $_('general.yes') : $_('general.no')
            }</span>
            <Switch id="list-top-enabled" bind:checked={editForm.topEnabled} />
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
.tabContent {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
}

.toolCard {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolHeading {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.formGrid {
  display: grid;
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

label,
.fieldLabel {
  font-size: 0.9rem;
  font-weight: 500;
}

.hint {
  font-size: 0.8rem;
  color: hsl(var(--muted-foreground));
  margin: 0;
}

.optionRow {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.optionBtn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid hsl(var(--border));
  background: transparent;
  color: hsl(var(--foreground));
  padding: 7px 14px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.optionBtn:hover {
  background: hsl(var(--muted) / 0.5);
}

.optionBtn.selected {
  background: hsl(var(--primary) / 0.12);
  border-color: hsl(var(--primary));
}

.switchRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.switchControl {
  display: flex;
  align-items: center;
  gap: 10px;
}

.switchLabel {
  font-size: 0.9rem;
  font-weight: 500;
}
</style>
