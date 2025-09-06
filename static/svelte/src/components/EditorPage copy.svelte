<script>
  import SplitPanel from './SplitPanel.svelte';
  import { onMount } from 'svelte';
  import { user } from '../stores/user.js';
  //import { initWorkspace, runAll, compileActive, startRealTime, stopRealTime, isRealTimeRunning, startAutoSave, stopAutoSave } from '../adapters/workspaceAdapter.js';
  //import ScriptTabs from './editor/ScriptTabs.svelte';
  //import CodeEditor from './editor/CodeEditor.svelte';
  import PreviewPanel from './editor/PreviewPanel.svelte';
  import ConsolePanel from './editor/ConsolePanel.svelte';
  import DeleteConfirmDialog from './DeleteConfirmDialog.svelte';
  import { derived } from 'svelte/store';

  let isEditingName = false;
  let editingName = '';
  let isEditingTags = false;
  let newTagInput = '';
  let showDeleteConfirm = false;

  function startEditingName() {
    isEditingName = true;
    editingName = $state.shader?.name || 'New Shader';
  }

  function saveShaderName() {
    if (editingName.trim() && editingName !== $state.shader?.name) {
      // Update the shader name in the store using the proper function
      updateShaderName(editingName.trim());
      addConsoleMessage(`Shader name updated to "${editingName.trim()}"`, 'info');
    }
    isEditingName = false;
  }

  function cancelEditingName() {
    isEditingName = false;
    editingName = '';
  }

  function handleNameKeydown(e) {
    if (e.key === 'Enter') {
      saveShaderName();
    } else if (e.key === 'Escape') {
      cancelEditingName();
    }
  }

  // Tag editing functions
  function startEditingTags() {
    if (!canEdit) return;
    isEditingTags = true;
    newTagInput = '';
  }

  function stopEditingTags() {
    isEditingTags = false;
    newTagInput = '';
  }

  function addTag() {
    const tagName = newTagInput.trim().toLowerCase();
    if (!tagName) return;

    const currentTags = $state.shader?.tags || [];
    const tagExists = currentTags.some(tag => (tag.name || tag.Name || '').toLowerCase() === tagName);
    
    if (!tagExists) {
      const newTag = { name: tagName };
      const updatedTags = [...currentTags, newTag];
      setShaderTags(updatedTags);
      addConsoleMessage(`Added tag "${tagName}"`, 'info');
    }
    
    newTagInput = '';
  }

  function removeTag(tagToRemove) {
    if (!canEdit) return;
    
    const currentTags = $state.shader?.tags || [];
    const tagName = tagToRemove.name || tagToRemove.Name || '';
    const updatedTags = currentTags.filter(tag => 
      (tag.name || tag.Name || '').toLowerCase() !== tagName.toLowerCase()
    );
    
    setShaderTags(updatedTags);
    addConsoleMessage(`Removed tag "${tagName}"`, 'info');
  }

  function handleTagInputKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Escape') {
      stopEditingTags();
    } else if (e.key === ',' || e.key === ' ') {
      e.preventDefault();
      addTag();
    }
  }

  function onRun(){ runAll().catch(e=>addConsoleMessage(e.message,'error')); }
  function onSave(){ saveShader().catch(e=>addConsoleMessage(e.message,'error')); }
  function onCompile(){ compileActive().catch(e=>addConsoleMessage(e.message,'error')); }
  
  function onToggleRealTime() {
    if ($realTimeRunning) {
      stopRealTime();
    } else {
      startRealTime();
    }
  }

  // Delete functionality
  function showDeleteDialog() {
    if (!canEdit || !$state.shader?.id) return;
    showDeleteConfirm = true;
  }

  function hideDeleteDialog() {
    showDeleteConfirm = false;
  }

  async function confirmDelete() {
    try {
      const { deleteShader } = await import('../adapters/workspaceAdapter.js');
      await deleteShader();
      hideDeleteDialog();
    } catch (error) {
      addConsoleMessage(`Delete failed: ${error.message}`, 'error');
      hideDeleteDialog();
    }
  }

  onMount(() => { 
    initWorkspace().then(() => {
      // Start auto-save once workspace is initialized
      startAutoSave();
      addConsoleMessage('Auto-save enabled', 'info');
    });
    
    // Cleanup on component destroy
    return () => {
      stopAutoSave();
    };
  });
</script>

<div class="svelte-editor" data-initializing={$initializing}>
  <header class="editor-bar">
    <div class="title-and-meta">
      <div class="title-group">
        {#if isEditingName && canEdit}
          <input 
            type="text" 
            bind:value={editingName}
            on:blur={saveShaderName}
            on:keydown={handleNameKeydown}
            class="name-input"
            autofocus
            placeholder="Shader name"
          />
        {:else}
          <h1 on:click={canEdit ? startEditingName : null} 
              class="editable-title" 
              class:read-only={!canEdit}
              title={canEdit ? "Click to edit name" : "Read-only (not your shader)"}>
            {$state.shader?.name || 'New Shader'}
            {#if canEdit}<i class="fas fa-edit edit-icon"></i>{/if}
          </h1>
        {/if}
        {#if !canEdit && $state.shader?.id}<span class="read-only-badge">Read Only</span>{/if}
      </div>

      <!-- Tags Section -->
      <div class="tags-section">
        <div class="tags-container">
          {#if $state.shader?.tags && $state.shader.tags.length > 0}
            {#each $state.shader.tags as tag}
              <span class="tag-pill">
                {tag.name || tag.Name}
                {#if canEdit}
                  <button 
                    class="tag-remove" 
                    on:click={() => removeTag(tag)}
                    title="Remove tag"
                    aria-label="Remove {tag.name || tag.Name} tag"
                  >
                    ×
                  </button>
                {/if}
              </span>
            {/each}
          {/if}
          
          {#if canEdit}
            {#if isEditingTags}
              <input 
                type="text" 
                bind:value={newTagInput}
                on:blur={stopEditingTags}
                on:keydown={handleTagInputKeydown}
                class="tag-input"
                placeholder="Add tag..."
                autofocus
              />
            {:else}
              <button 
                class="add-tag-btn" 
                on:click={startEditingTags}
                title="Add new tag"
              >
                <i class="fas fa-plus"></i> Add tag
              </button>
            {/if}
          {/if}
        </div>
      </div>
    </div>

    <div class="actions">
      {#if isAuthenticated && canEdit}
        <button on:click={onSave} disabled={$saving || $initializing}>{$saving ? 'Saving…' : 'Save'}</button>
      {/if}
      <button on:click={onRun} disabled={$running || $initializing}>{$running ? 'Running…' : 'Run'}</button>
      <button on:click={onCompile} disabled={$initializing}>Compile</button>
      <button on:click={onToggleRealTime} disabled={$initializing}>{$realTimeRunning ? 'Pause' : 'Play'}</button>
      {#if isAuthenticated && canEdit && $state.shader?.id}
        <button 
          class="delete-btn" 
          on:click={showDeleteDialog} 
          disabled={$saving || $initializing}
          title="Delete shader"
        >
          <i class="fas fa-trash"></i> Delete
        </button>
      {/if}
    </div>
  </header>

  <SplitPanel>
    <div slot="left">
    <h1>Left Content</h1>
      //<ScriptTabs />
      //<CodeEditor script={$script} on:updateCode={(e)=>updateScriptCode(e.detail.id,e.detail.code)} />
    </div>
    <div slot="right">
        <h1>Right Content</h1>

    //  <PreviewPanel />
     // <ConsolePanel />
    </div>
  </SplitPanel>
</div>
  
<!-- Delete Confirmation Dialog -->
<DeleteConfirmDialog 
  show={showDeleteConfirm}
  shaderName={$state.shader?.name || ''}
  isDeleting={$saving}
  on:confirm={confirmDelete}
  on:cancel={hideDeleteDialog}
/>

<style>
  .svelte-editor { 
    display: flex; 
    flex-direction: column; 
    gap: .75rem; 
    height: 100vh;
    max-height: calc(100vh - 200px);
  }
  
  .editor-bar { 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    flex-shrink: 0;
  }

  @media (max-width: 768px) {
    .svelte-editor {
      gap: 0.5rem;
    }
    
    .editor-bar {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }
  }

  .editable-title {
    cursor: pointer;
    display: flex;
    align-items: center;
  }

  .editable-title .edit-icon {
    margin-left: 0.5rem;
    font-size: 0.75rem;
    color: #718096;
  }

  .editable-title.read-only {
    cursor: default;
    opacity: 0.7;
  }

  .read-only-badge {
    background-color: #f56565;
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
    margin-left: 0.5rem;
  }

  .title-group {
    display: flex;
    align-items: center;
  }

  .name-input {
    font-size: 1.5rem;
    padding: 0.25rem;
    border: 1px solid #cbd5e0;
    border-radius: 0.25rem;
    width: 100%;
  }

  .tags-section {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .tags-container {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tag-pill {
    background-color: #edf2f7;
    color: #2d3748;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .tag-remove {
    background: none;
    border: none;
    color: #e53e3e;
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
  }

  .tag-input {
    font-size: 1rem;
    padding: 0.25rem;
    border: 1px solid #cbd5e0;
    border-radius: 0.25rem;
  }

  .add-tag-btn {
    background-color: #3182ce;
    color: white;
    padding: 0.25rem 0.5rem;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .add-tag-btn i {
    font-size: 0.75rem;
  }

  /* Delete button styling */
  .delete-btn {
    background-color: #e53e3e;
    color: white;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.875rem;
    transition: background-color 0.2s;
  }

  .delete-btn:hover:not(:disabled) {
    background-color: #c53030;
  }

  .delete-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .delete-btn i {
    font-size: 0.75rem;
  }

  /* Responsive design for tags */
  @media (max-width: 768px) {
    .title-and-meta {
      gap: 0.75rem;
    }
    
    .editor-bar {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }
    
    .tags-container {
      justify-content: flex-start;
    }
    
    .actions {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
    }
  }

  @media (max-width: 480px) {
    .tag-pill {
      font-size: 0.75rem;
      padding: 0.2rem 0.5rem;
    }
    
    .add-tag-btn {
      font-size: 0.75rem;
      padding: 0.2rem 0.5rem;
    }
  }
</style>