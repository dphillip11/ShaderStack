<script>
  import { onMount } from 'svelte';
  import { 
    currentShader, 
    editorActiveScript, 
    editorScripts,
    editorConsole,
    isAuthenticated, 
    authUserId,
    editorSaving,
    editorRunning,
    editorInitializing 
  } from '../stores/selectors.js';
  import { 
    editorActions, 
    authActions,
    uiActions 
  } from '../stores/actions.js';
  import { initWorkspace, runAll, saveShader, compileActive, startRealTime, stopRealTime, isRealTimeRunning, startAutoSave, stopAutoSave } from '../adapters/workspaceAdapter.js';
  import ScriptTabs from './editor/ScriptTabs.svelte';
  import CodeEditor from './editor/CodeEditor.svelte';
  import PreviewPanel from './editor/PreviewPanel.svelte';
  import ConsolePanel from './editor/ConsolePanel.svelte';
  import DeleteConfirmDialog from './DeleteConfirmDialog.svelte';
  import { derived } from 'svelte/store';

  // Use centralized selectors
  $: shader = $currentShader;
  $: script = $editorActiveScript;
  $: saving = $editorSaving;
  $: running = $editorRunning;
  $: initializing = $editorInitializing;
  $: authenticated = $isAuthenticated;
  $: currentUserId = $authUserId;
  
  // Check permissions
  $: shaderOwnerId = shader?.user_id || shader?.UserID;
  $: canEdit = authenticated && (currentUserId === shaderOwnerId || !shader?.id);

  let isEditingName = false;
  let editingName = '';
  let isEditingTags = false;
  let newTagInput = '';
  let showDeleteConfirm = false;

  function startEditingName() {
    isEditingName = true;
    editingName = shader?.name || 'New Shader';
  }

  function saveShaderName() {
    if (editingName.trim() && editingName !== shader?.name) {
      editorActions.updateShaderName(editingName.trim());
      editorActions.addConsoleMessage(`Shader name updated to "${editingName.trim()}"`, 'info');
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

    const currentTags = shader?.tags || [];
    const tagExists = currentTags.some(tag => (tag.name || tag.Name || '').toLowerCase() === tagName);
    
    if (!tagExists) {
      const newTag = { name: tagName };
      const updatedTags = [...currentTags, newTag];
      editorActions.setShaderTags(updatedTags);
      editorActions.addConsoleMessage(`Added tag "${tagName}"`, 'info');
    }
    
    newTagInput = '';
  }

  function removeTag(tagToRemove) {
    if (!canEdit) return;
    
    const currentTags = shader?.tags || [];
    const tagName = tagToRemove.name || tagToRemove.Name || '';
    const updatedTags = currentTags.filter(tag => 
      (tag.name || tag.Name || '').toLowerCase() !== tagName.toLowerCase()
    );
    
    editorActions.setShaderTags(updatedTags);
    editorActions.addConsoleMessage(`Removed tag "${tagName}"`, 'info');
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

  function onRun(){ 
    runAll().catch(e => editorActions.addConsoleMessage(e.message,'error')); 
  }
  
  function onSave(){ 
    saveShader().catch(e => editorActions.addConsoleMessage(e.message,'error')); 
  }
  
  function onCompile(){ 
    compileActive().catch(e => editorActions.addConsoleMessage(e.message,'error')); 
  }
  
  function onToggleRealTime() {
    if ($isRealTimeRunning) {
      stopRealTime();
    } else {
      startRealTime();
    }
  }

  // Delete functionality
  function showDeleteDialog() {
    if (!canEdit || !shader?.id) return;
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
      editorActions.addConsoleMessage(`Delete failed: ${error.message}`, 'error');
      hideDeleteDialog();
    }
  }

  // Resizable panes functionality
  let leftPaneWidth = 60; // percentage
  let isResizing = false;
  let layoutRef;

  function startResize(e) {
    isResizing = true;
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  }

  function handleResize(e) {
    if (!isResizing || !layoutRef) return;
    
    const rect = layoutRef.getBoundingClientRect();
    const newLeftWidth = ((e.clientX - rect.left) / rect.width) * 100;
    
    // Constrain between 20% and 80%
    leftPaneWidth = Math.max(20, Math.min(80, newLeftWidth));
  }

  function stopResize() {
    isResizing = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  onMount(() => { 
    initWorkspace().then(() => {
      // Start auto-save once workspace is initialized
      startAutoSave();
      editorActions.addConsoleMessage('Auto-save enabled', 'info');
    });
    
    // Cleanup on component destroy
    return () => {
      if (isResizing) {
        stopResize();
      }
      stopAutoSave();
    };
  });
</script>

<div class="svelte-editor" data-initializing={initializing}>
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
            {shader?.name || 'New Shader'}
            {#if canEdit}<i class="fas fa-edit edit-icon"></i>{/if}
          </h1>
        {/if}
        {#if !canEdit && shader?.id}<span class="read-only-badge">Read Only</span>{/if}
      </div>

      <!-- Tags Section -->
      <div class="tags-section">
        <div class="tags-container">
          {#if shader?.tags && shader.tags.length > 0}
            {#each shader.tags as tag}
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
      {#if authenticated && canEdit}
        <button on:click={onSave} disabled={saving || initializing}>{saving ? 'Saving…' : 'Save'}</button>
      {/if}
      <button on:click={onRun} disabled={running || initializing}>{running ? 'Running…' : 'Run'}</button>
      <button on:click={onCompile} disabled={initializing}>Compile</button>
      <button on:click={onToggleRealTime} disabled={initializing}>{$isRealTimeRunning ? 'Pause' : 'Play'}</button>
      {#if authenticated && canEdit && shader?.id}
        <button 
          class="delete-btn" 
          on:click={showDeleteDialog} 
          disabled={saving || initializing}
          title="Delete shader"
        >
          <i class="fas fa-trash"></i> Delete
        </button>
      {/if}
    </div>
  </header>
  
  <div class="layout" bind:this={layoutRef}>
    <div class="left-pane" style="width: {leftPaneWidth}%;">
      <ScriptTabs />
      <CodeEditor script={script} on:updateCode={(e)=>editorActions.updateScriptCode(e.detail.id,e.detail.code)} />
    </div>
    
    <div class="resize-handle" 
         on:mousedown={startResize}
         class:resizing={isResizing}>
      <div class="resize-line"></div>
    </div>
    
    <div class="right-pane" style="width: {100 - leftPaneWidth}%;">
      <PreviewPanel />
      <ConsolePanel />
    </div>
  </div>
</div>

<!-- Delete Confirmation Dialog -->
<DeleteConfirmDialog 
  show={showDeleteConfirm}
  shaderName={shader?.name || ''}
  isDeleting={saving}
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
  
  .layout { 
    display: flex; 
    flex: 1;
    min-height: 400;
    position: relative;
  }
  
  .left-pane { 
    display: flex; 
    flex-direction: column;
    min-width: 300px;
    overflow: hidden;
  }
  
  .right-pane { 
    display: flex; 
    flex-direction: column; 
    gap: .75rem;
    min-width: 300px;
    overflow: hidden;
  }

  /* Resizable handle styles */
  .resize-handle {
    width: 8px;
    background-color: #e2e8f0;
    cursor: col-resize;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
    flex-shrink: 0;
  }

  .resize-handle:hover,
  .resize-handle.resizing {
    background-color: #cbd5e0;
  }

  .resize-line {
    width: 2px;
    height: 30px;
    background-color: #a0aec0;
    border-radius: 1px;
  }

  /* Responsive design - disable resizing on smaller screens */
  @media (max-width: 1024px) {
    .layout {
      flex-direction: column;
    }
    
    .left-pane,
    .right-pane {
      width: 100% !important;
    }
    
    .resize-handle {
      display: none;
    }
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