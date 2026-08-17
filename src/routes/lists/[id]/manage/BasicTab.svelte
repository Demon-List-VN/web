<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { EyeOff, Globe2, Lock } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';

	export let editForm: any;
	export let list: any = null;

	const visibilityOptions: Array<'private' | 'unlisted' | 'public'> = [
		'private',
		'unlisted',
		'public'
	];

	function formatVisibility(visibility: string) {
		if (visibility === 'public') {
			return $_(
				'custom_lists.visibility.public'
			);
		}

		if (visibility === 'unlisted') {
			return $_('custom_lists.visibility.unlisted');
		}

		return $_('custom_lists.visibility.private');
	}

	function getVisibilityIcon(visibility: string) {
		if (visibility === 'public') {
			return Globe2;
		}

		if (visibility === 'unlisted') {
			return EyeOff;
		}

		return Lock;
	}
</script>

<div class="tabContent">
  <div class="toolCard">
    <h2 class="toolHeading">{$_('custom_lists.detail.edit.heading')}</h2>
    <div class="formGrid">
      <div class="field">
        <label for="list-title">{
          $_('custom_lists.detail.edit.title_label')
        }</label>
        <Input id="list-title" bind:value={editForm.title} maxlength={100} />
      </div>
      <div class="field">
        <label for="list-description">{
          $_('custom_lists.detail.edit.description_label')
        }</label>
        <Textarea
          id="list-description"
          bind:value={editForm.description}
          rows={3}
          maxlength={2000}
        />
        <p class="hint">{$_('custom_lists.detail.edit.description_hint')}</p>
      </div>
      <div class="field">
        <label for="list-overview">{
          $_('custom_lists.detail.edit.overview_label')
        }</label>
        <Textarea
          id="list-overview"
          bind:value={editForm.overview}
          rows={8}
          maxlength={2000}
        />
        <p class="hint">{$_('custom_lists.detail.edit.overview_hint')}</p>
      </div>
      <div class="field">
        <span class="fieldLabel">{
          $_('custom_lists.detail.edit.visibility_label')
        }</span>
        <div class="optionRow">
          {#each visibilityOptions as visibility}
            <button
              type="button"
              class="optionBtn"
              class:selected={editForm.visibility === visibility}
              disabled={list?.isBanned}
              on:click={() => (editForm.visibility = visibility)}
            >
              <svelte:component
                this={getVisibilityIcon(visibility)}
                class="h-3.5 w-3.5"
              />
              {formatVisibility(visibility)}
            </button>
          {/each}
        </div>
      </div>
      <div class="field">
        <label for="list-tags">{
          $_('custom_lists.detail.edit.tags_label')
        }</label>
        <Input
          id="list-tags"
          bind:value={editForm.tags}
          placeholder="challenge, favorite"
        />
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

.optionBtn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

</style>
