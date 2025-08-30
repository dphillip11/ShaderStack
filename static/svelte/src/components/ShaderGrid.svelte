<script>
  import ShaderCard from './ShaderCard.svelte';
  import { createEventDispatcher } from 'svelte';
  
  export let list = [];
  const dispatch = createEventDispatcher();

  function handleDelete(event) {
    dispatch('delete', event.detail);
  }
</script>

<div class="shader-grid">
  {#if list.length === 0}
    <div class="no-shaders">No shaders found</div>
  {:else}
    {#each list as shader (shader.id || shader.ID)}
      <ShaderCard {shader} on:delete={handleDelete} />
    {/each}
  {/if}
</div>

<style>
  .shader-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 2rem;
    margin-bottom: 2rem;
  }

  .no-shaders {
    grid-column: 1 / -1;
    text-align: center;
    padding: 4rem 2rem;
    color: #718096;
  }

  .no-shaders i {
    font-size: 4rem;
    margin-bottom: 1rem;
    color: #cbd5e0;
  }

  @media (max-width: 768px) {
    .shader-grid {
      grid-template-columns: 1fr;
    }
  }
</style>