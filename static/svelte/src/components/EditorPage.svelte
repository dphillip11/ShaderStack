<script>
  import { onMount } from 'svelte';
  import { editorState, activeScript, addConsoleMessage, setActiveScript, updateScriptCode, updateShaderName } from '../stores/editor.js';
  import { auth } from '../stores/auth.js';
  import { initWorkspace, runAll, saveShader, compileActive, startRealTime, stopRealTime, isRealTimeRunning, startAutoSave, stopAutoSave } from '../adapters/workspaceAdapter.js';
  import ScriptTabs from './editor/ScriptTabs.svelte';
  import CodeEditor from './editor/CodeEditor.svelte';
  import PreviewPanel from './editor/PreviewPanel.svelte';
  import ConsolePanel from './editor/ConsolePanel.svelte';
  import { derived } from 'svelte/store';

  const state = editorState;
  const script = activeScript;
  const saving = derived(state, $s => $s.saving);
  const running = derived(state, $s => $s.running);
  const initializing = derived(state, $s => $s.initializing);
  const realTimeRunning = isRealTimeRunning;

  // Check if user is authenticated and owns the current shader
  $: isAuthenticated = $auth.isAuthenticated;
  $: currentUserId = $auth.user_id; // Assuming username is unique identifier
  $: shaderOwnerId = $state.shader?.user_id || $state.shader?.user_id;
  $: canEdit = isAuthenticated && (currentUserId === shaderOwnerId || !$state.shader?.id); // Can edit if owner or new shader

  let isEditingName = false;
  let editingName = '';

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
      addConsoleMessage('Auto-save enabled', 'info');
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

<div class="svelte-editor" data-initializing={$initializing}>
  <header class="editor-bar">
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
    <div class="actions">
      {#if isAuthenticated && canEdit}
        <button on:click={onSave} disabled={$saving || $initializing}>{$saving ? 'Saving…' : 'Save'}</button>
      {/if}
      <button on:click={onRun} disabled={$running || $initializing}>{$running ? 'Running…' : 'Run'}</button>
      <button on:click={onCompile} disabled={$initializing}>Compile</button>
      <button on:click={onToggleRealTime} disabled={$initializing}>{$realTimeRunning ? 'Pause' : 'Play'}</button>
    </div>
  </header>
  
  <div class="layout" bind:this={layoutRef}>
    <div class="left-pane" style="width: {leftPaneWidth}%;">
      <ScriptTabs />
      <CodeEditor script={$script} on:updateCode={(e)=>updateScriptCode(e.detail.id,e.detail.code)} />
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
</style>