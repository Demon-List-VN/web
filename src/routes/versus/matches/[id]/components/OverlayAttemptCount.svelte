<script lang="ts">
	export let attempt: number;
</script>

<div class="overlay-attempt-count">Attempt {attempt}</div>

<style>
.overlay-attempt-count {
  background: transparent;
  color: hsl(var(--foreground));
  font-size: 13px;
  font-weight: 750;
  font-variant-numeric: tabular-nums;
  text-align: center;
}
</style>
