<script>
  import { availableTags, selectedTags } from '../stores/selectors.js';
  import { filterActions } from '../stores/actions.js';
  
  $: tags = $availableTags;
  $: activeTags = $selectedTags;
  
  // Helper function to get tag name from tag object or string
  function getTagName(tag) {
    return tag?.name || tag?.Name || tag || '';
  }
  
  // Use the centralized selected tags for O(1) lookups
  $: isActive = (tag) => {
    const tagName = getTagName(tag);
    return activeTags.includes(tagName);
  };
  $: selectedCount = activeTags.length;
  
  function handleTagClick(tag) {
    const tagName = getTagName(tag);
    filterActions.toggleTag(tagName);
  }
  
  function clearAllTags() {
    filterActions.clearFilters();
  }
</script>

<div class="tag-filters" aria-label="Tag filters">
  {#each tags as t}
    <button type="button"
            class="tag-filter {isActive(t) ? 'active' : ''}"
            aria-pressed={isActive(t)}
            on:click={() => handleTagClick(t)}>{getTagName(t)}</button>
  {/each}
  {#if selectedCount > 0}
    <button type="button" class="clear-all" on:click={clearAllTags}>Clear Tags</button>
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