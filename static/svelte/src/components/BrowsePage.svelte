<script>
  import SearchBar from './SearchBar.svelte';
  import TagFilters from './TagFilters.svelte';
  import ShaderGrid from './ShaderGrid.svelte';
  import DeleteConfirmDialog from './DeleteConfirmDialog.svelte';
  import { filteredShaders, availableTags, shaderFilters, refreshShaders } from '../stores/shaders.js';
  import { deleteShaderProject } from '../stores/api.js';
  import { onMount } from 'svelte';

  let list = [];
  let tags = [];
  let filters;
  let pageTitle = 'Browse Shaders';
  let showDeleteDialog = false;
  let shaderToDelete = null;
  let isDeleting = false;

  // Check if we're on the "My Shaders" page
  if (typeof window !== 'undefined' && window.myShaders) {
    pageTitle = window.myShaders.title || 'My Shaders';
  }

  const unsub = [
    filteredShaders.subscribe(v => list = v),
    availableTags.subscribe(v => tags = v),
    shaderFilters.subscribe(v => filters = v)
  ];

  function handleShaderDelete(event) {
    const { shader, id, name } = event.detail;
    shaderToDelete = { shader, id, name };
    showDeleteDialog = true;
  }

  function hideDeleteDialog() {
    if (isDeleting) return;
    showDeleteDialog = false;
    shaderToDelete = null;
  }

  async function confirmDelete() {
    if (!shaderToDelete || isDeleting) return;
    
    try {
      isDeleting = true;
      await deleteShaderProject(shaderToDelete.id);
      
      // Refresh the shader list to remove the deleted shader
      await refreshShaders();
      
      // Hide dialog and reset state
      hideDeleteDialog();
      
      console.log(`Shader "${shaderToDelete.name}" deleted successfully`);
    } catch (error) {
      console.error('Delete failed:', error);
      isDeleting = false; // Re-enable UI on error
    }
  }

  onMount(() => () => unsub.forEach(u => u()));
</script>

<section class="browse-svelte" aria-label="{pageTitle}">
  <div class="page-header">
    <h1>{pageTitle}</h1>
    {#if pageTitle === 'My Shaders'}
      <p class="page-description">Your personal shader collection</p>
    {:else}
      <p class="page-description">Discover and explore community shaders</p>
    {/if}
  </div>
  <SearchBar {filters} />
  <TagFilters {tags} />
  <ShaderGrid {list} on:delete={handleShaderDelete} />
</section>

<!-- Delete Confirmation Dialog -->
<DeleteConfirmDialog 
  show={showDeleteDialog}
  shaderName={shaderToDelete?.name || ''}
  isDeleting={isDeleting}
  on:confirm={confirmDelete}
  on:cancel={hideDeleteDialog}
/>

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