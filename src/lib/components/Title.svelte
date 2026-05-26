<script lang="ts">
	export let value: string;
</script>

<div class="title">
  <h2>{value}</h2>
</div>

<style lang="scss">
h2 {
  font-size: 2.2rem;
  font-weight: 800;
}

.title {
  display: flex;
  flex-direction: column;
  margin-top: 40px;
  margin-bottom: 30px;
  padding-left: 75px;
}

@media screen and (max-width: 900px) {
  h2 {
    font-size: 1.875rem;
  }

  .title {
    padding-left: 20px;
  }
}
</style>
