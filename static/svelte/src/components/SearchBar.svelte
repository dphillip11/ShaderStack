<script>
  import { searchQuery } from '../stores/selectors.js';
  import { filterActions } from '../stores/actions.js';
  
  $: q = $searchQuery;
  
  function submit(e){ 
    e.preventDefault(); 
    filterActions.setSearchQuery(q); 
  }
  
  function onClear(){ 
    filterActions.setSearchQuery('');
  }
  
  function onInput(e) {
    // Update local value for immediate UI feedback
    q = e.target.value;
    // Debounce the actual filter update
    clearTimeout(onInput.timeout);
    onInput.timeout = setTimeout(() => {
      filterActions.setSearchQuery(e.target.value);
    }, 300);
  }
</script>

<form class="search-bar" on:submit={submit} role="search" aria-label="Shader search">
  <input 
    placeholder="Search by name, author, tags, or code..." 
    value={q}
    on:input={onInput}
    aria-label="Search term" 
  />
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

  .search-bar button[type="submit"] {
    background-color: #3182ce;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 5px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .search-bar button[type="submit"]:hover {
    background-color: #2c5aa0;
  }

  .search-bar button[type="submit"]:active {
    background-color: #2a4a8b;
    transform: translateY(1px);
  }

  .search-bar button[type="button"] {
    background-color: #e53e3e;
    color: white;
    border: none;
    padding: 0.5rem 0.75rem;
    border-radius: 5px;
    font-size: 1.2rem;
    cursor: pointer;
    transition: background-color 0.2s;
    line-height: 1;
  }

  .search-bar button[type="button"]:hover {
    background-color: #c53030;
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