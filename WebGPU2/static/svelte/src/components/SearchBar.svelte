<script>
  import { applyFilters, clearSearch } from '../stores/shaders.js';
  export let filters = { name: '' };
  let q = filters.name;
  $: if (filters.name !== q) q = filters.name;
  function submit(e){ e.preventDefault(); applyFilters({ name: q }); }
  function onClear(){ clearSearch(); }
</script>

<form class="search-bar" on:submit={submit} role="search" aria-label="Shader search">
  <input placeholder="Search shaders" bind:value={q} aria-label="Search term" />
  <button type="submit">Search</button>
  {#if q}
    <button type="button" on:click={onClear} aria-label="Clear search">×</button>
  {/if}
</form>

<style>
  .search-component {
    background: white;
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    margin-bottom: 2rem;
    overflow: hidden;
  }

  .search-filters {
    padding: 2rem;
  }

  .search-bar {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
    align-items: center;
  }

  .search-bar input {
    flex: 1;
    padding: 0.75rem;
    border: 2px solid #e2e8f0;
    border-radius: 5px;
    font-size: 1rem;
  }

  .search-bar input:focus {
    outline: none;
    border-color: #667eea;
  }

  .search-results-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 0;
    border-top: 1px solid #e2e8f0;
    margin-top: 1rem;
  }

  .search-results-info span {
    color: #718096;
    font-weight: 500;
  }
</style>