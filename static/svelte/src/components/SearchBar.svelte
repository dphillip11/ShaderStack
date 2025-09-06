<script>
  import { filters, setQuery, clearFilters } from '../stores/search.js';
  
  function submit(e){ 
    e.preventDefault(); 
  }
  
  function onInput(e) {
    setQuery( e.target.value );
    console.log(e);
  }
</script>

<form class="search-bar" on:submit={submit} role="search" aria-label="Shader search">
  <input 
    placeholder="Search by name, author, tags" 
    value={$filters.query}
    on:input={onInput}
    aria-label="Search term" 
  />
  <button type="submit">Search</button>
  {#if $filters.query}
    <button type="button" on:click={clearFilters} aria-label="Clear search">×</button>
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