<script>
  import SearchBar from './SearchBar.svelte';
  import TagFilters from './TagFilters.svelte';
  import ShaderGrid from './ShaderGrid.svelte';
  import DeleteConfirmDialog from './DeleteConfirmDialog.svelte';
  import { onMount } from 'svelte';
  import { shaders } from '../stores/shaders.js';
  
  let pageTitle = 'Browse Shaders';
  let showDeleteDialog = false;
  let shaderToDelete = null;
  let isDeleting = false;

  // Check if we're on the "My Shaders" page
  if (typeof window !== 'undefined' && window.myShaders) {
    pageTitle = window.myShaders.title || 'My Shaders';
  }

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
      const result = await dataManager.deleteShader(shaderToDelete.id);
      
      if (result.success) {
        console.log(`Shader "${shaderToDelete.name}" deleted successfully`);
        hideDeleteDialog();
      } else {
        console.error('Delete failed:', result.error);
      }
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      isDeleting = false;
    }
  }
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

  <SearchBar />
  <TagFilters />
  
  {#if $shaders}
    <ShaderGrid list={$shaders} on:delete={handleShaderDelete} />
  {/if}
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
  .browse-svelte { 
    display: flex; 
    flex-direction: column; 
    gap: 1rem; 
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

  .loading, .error {
    text-align: center;
    padding: 4rem 2rem;
    font-size: 1.1rem;
  }

  .loading {
    color: #718096;
  }

  .error {
    color: #e53e3e;
    background-color: #fed7d7;
    border-radius: 0.5rem;
    margin: 1rem 0;
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

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @media (max-width: 768px) {
    .page-header h1 {
      font-size: 2rem;
    }
  }
</style>