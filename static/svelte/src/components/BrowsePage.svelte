<script>
  import SearchBar from './SearchBar.svelte';
  import TagFilters from './TagFilters.svelte';
  import ShaderGrid from './ShaderGrid.svelte';
  import DeleteConfirmDialog from './DeleteConfirmDialog.svelte';
  import { 
    displayShaders, 
    availableTags, 
    shaderFilters, 
    shadersLoading,
    pageTitle,
    deleteConfirmModal
  } from '../stores/selectors.js';
  import { 
    shaderActions, 
    filterActions, 
    uiActions 
  } from '../stores/actions.js';
  import { onMount } from 'svelte';

  // Use centralized selectors - no local state needed
  $: shaders = $displayShaders;
  $: tags = $availableTags;
  $: filters = $shaderFilters;
  $: loading = $shadersLoading;
  $: title = $pageTitle;
  $: deleteDialog = $deleteConfirmModal;

  function handleShaderDelete(event) {
    const { shader } = event.detail;
    uiActions.showDeleteConfirm(shader);
  }

  function hideDeleteDialog() {
    if (deleteDialog.isDeleting) return;
    uiActions.hideDeleteConfirm();
  }

  async function confirmDelete() {
    if (!deleteDialog.shader || deleteDialog.isDeleting) return;
    await shaderActions.deleteShader(deleteDialog.shader.id);
  }

  // No need for onMount - navigation actions handle data loading
</script>

<div class="browse-page">
  <div class="page-header">
    <h1>{title}</h1>
    <div class="page-stats">
      {#if loading}
        <span class="loading-text">Loading...</span>
      {:else}
        <span class="shader-count">{shaders.length} shader{shaders.length !== 1 ? 's' : ''}</span>
      {/if}
    </div>
  </div>

  <div class="controls-section">
    <SearchBar />
    <TagFilters />
  </div>

  <div class="content-section">
    {#if loading}
      <div class="loading-grid">
        {#each Array(6) as _, i}
          <div class="shader-card-skeleton" />
        {/each}
      </div>
    {:else}
      <ShaderGrid on:delete={handleShaderDelete} />
    {/if}
  </div>

  {#if deleteDialog.show}
    <DeleteConfirmDialog
      shader={deleteDialog.shader}
      isDeleting={deleteDialog.isDeleting}
      on:confirm={confirmDelete}
      on:cancel={hideDeleteDialog}
    />
  {/if}
</div>

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