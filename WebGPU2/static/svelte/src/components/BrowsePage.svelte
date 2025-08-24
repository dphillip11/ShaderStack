<script>
  import SearchBar from './SearchBar.svelte';
  import TagFilters from './TagFilters.svelte';
  import ShaderGrid from './ShaderGrid.svelte';
  import { filteredShaders, availableTags, shaderFilters } from '../stores/shaders.js';
  import { onMount } from 'svelte';

  let list = [];
  let tags = [];
  let filters;

  const unsub = [
    filteredShaders.subscribe(v => list = v),
    availableTags.subscribe(v => tags = v),
    shaderFilters.subscribe(v => filters = v)
  ];

  onMount(() => () => unsub.forEach(u => u()));
</script>

<section class="browse-svelte" aria-label="Browse Shaders">
  <SearchBar {filters} />
  <TagFilters {tags} selected={filters.tags} />
  <ShaderGrid {list} />
</section>

<style>
  .browse-svelte { display: flex; flex-direction: column; gap: 1rem; }

  .browse-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
  }

  .page-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .page-header h1 {
    font-size: 2.5rem;
    margin-bottom: 1rem;
    color: #2d3748;
  }

  .page-description {
    font-size: 1.1rem;
    color: #718096;
  }

  .loading {
    text-align: center;
    padding: 4rem 2rem;
    color: #718096;
    font-size: 1.1rem;
  }

  .loading::after {
    content: '';
    display: inline-block;
    width: 20px;
    height: 20px;
    margin-left: 10px;
    border: 2px solid #cbd5e0;
    border-top: 2px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    padding: 2rem 0;
  }

  .page-info {
    color: #718096;
    font-weight: 500;
  }

  @media (max-width: 768px) {
    .browse-page {
      padding: 0 1rem;
    }
  }
</style>