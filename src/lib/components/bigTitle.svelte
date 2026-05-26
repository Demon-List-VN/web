<script lang="ts">
	export let value: string;
	export let description: string = '';
</script>

<div class="title">
  <h1>{value}</h1>
  <p class="text-center">{description}</p>
</div>

<style lang="scss">
h1 {
  font-size: 3.75rem;
  font-weight: 800;
}

p {
  font-size: 1.25rem;
  color: var(--textColor2);
}

.title {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 120px;
  margin-bottom: 50px;
}

@media screen and (max-width: 900px) {
  h1 {
    font-size: 1.875rem;
  }

  .title {
    margin-top: 80px;
  }
}
</style>
