<script>
  import { toggleTag, clearAllFilters } from '../stores/shaders.js';
  export let tags = [];
  export let selected = [];
  function isActive(t){ return selected.includes(t); }
</script>

<div class="tag-filters" aria-label="Tag filters">
  {#each tags as t}
    <button type="button"
            class="tag tag-filter {isActive(t) ? 'active' : ''}"
            aria-pressed={isActive(t)}
            on:click={() => toggleTag(t)}>{t}</button>
  {/each}
  {#if selected.length}
    <button type="button" class="clear-all" on:click={clearAllFilters}>Clear Tags</button>
  {/if}
</div>

<style>
  .tag-filters { display:flex; flex-wrap:wrap; gap:.5rem; }
  .tag-filter { cursor:pointer; }
  .tag-filter.active { background: var(--accent, #444); color:#fff; }
  .clear-all { margin-left:auto; font-size:.8rem; }

  .filter-section {
    margin-bottom: 1.5rem;
  }

  .filter-section label {
    display: block;
    margin-bottom: 0.75rem;
    font-weight: 600;
    color: #2d3748;
  }

  .tag-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tag-filter {
    cursor: pointer;
    transition: all 0.3s;
    background-color: #e2e8f0;
    color: #4a5568;
    padding: 0.25rem 0.75rem;
    border-radius: 15px;
    font-size: 0.85rem;
    font-weight: 500;
  }

  .tag-filter:hover {
    transform: scale(1.05);
    background-color: #cbd5e0;
  }

  .tag-filter.active {
    background-color: #667eea;
    color: white;
    transform: scale(1.05);
  }
</style>