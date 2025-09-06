<script>
  import { tags, LoadTags } from '../stores/tags.js';
  import { filters, clearFilters, filterByTag } from '../stores/search.js';
  
  // Use the Set-based store for O(1) lookups and better reactivity
  $: isActive = (tag) => $filters.tags.includes(tag);
  $: selectedCount = $filters.tags.length;
  LoadTags();

</script>

<div class="tag-filters" aria-label="Tag filters">
  {#each $tags as t}
    <button type="button"
            class="tag-filter {isActive(t.name) ? 'active' : ''}"
            aria-pressed={isActive(t.name)}
            on:click={() => filterByTag(t.name)}>{t.name}</button>
  {/each}
  {#if selectedCount > 0}
    <button type="button" class="clear-all" on:click={clearFilters}>Clear Tags</button>
  {/if}
</div>

<style>
  .tag-filters { 
    display: flex; 
    flex-wrap: wrap; 
    gap: 0.5rem; 
    margin-bottom: 1.5rem;
  }

  .tag-filter {
    cursor: pointer;
    transition: all 0.2s ease;
    background-color: #f7fafc;
    color: #718096;
    padding: 0.5rem 1rem;
    border: 2px solid #e2e8f0;
    border-radius: 20px;
    font-size: 0.875rem;
    font-weight: 500;
    user-select: none;
  }

  .tag-filter:hover {
    background-color: #edf2f7;
    border-color: #cbd5e0;
    transform: translateY(-1px);
  }

  .tag-filter.active {
    background-color: #3182ce;
    color: white;
    border-color: #2c5aa0;
    box-shadow: 0 4px 12px rgba(49, 130, 206, 0.3);
    transform: translateY(-1px);
  }

  .tag-filter.active:hover {
    background-color: #2c5aa0;
    border-color: #2a4a8b;
  }

  .clear-all { 
    margin-left: auto; 
    font-size: 0.8rem;
    background-color: #fed7d7;
    color: #c53030;
    padding: 0.25rem 0.75rem;
    border: 1px solid #feb2b2;
    border-radius: 15px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .clear-all:hover {
    background-color: #fbb6ce;
    border-color: #f687b3;
  }
</style>