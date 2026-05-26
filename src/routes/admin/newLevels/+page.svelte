<script lang="ts">
	import Title from '$lib/components/Title.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<Title value="New levels" />

<div class="wrapper">
  {#each data.data as level}
    <p>{level.id} - {level.name}</p>
  {/each}
</div>

<style lang="scss">
.wrapper {
  padding-inline: 75px;
}

@media screen and (max-width: 900px) {
  .wrapper {
    padding-inline: 10px;
  }
}
</style>
