<script>
  import { onMount } from 'svelte';
  import { editorState, activeScript, addConsoleMessage, setActiveScript, updateScriptCode } from '../stores/editor.js';
  import { initWorkspace, runAll, saveShader, compileActive } from '../adapters/workspaceAdapter.js';
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

  function onRun(){ runAll().catch(e=>addConsoleMessage(e.message,'error')); }
  function onSave(){ saveShader().catch(e=>addConsoleMessage(e.message,'error')); }
  function onCompile(){ compileActive().catch(e=>addConsoleMessage(e.message,'error')); }

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
    initWorkspace();
    
    // Cleanup on component destroy
    return () => {
      if (isResizing) {
        stopResize();
      }
    };
  });
</script>

<div class="svelte-editor" data-initializing={$initializing}>
  <header class="editor-bar">
    <div class="title-group">
      <h1>{$state.shader?.name || 'New Shader'}</h1>
      {#if $state.shader?.id}<span class="id">#{$state.shader.id}</span>{/if}
    </div>
    <div class="actions">
      <button on:click={onSave} disabled={$saving || $initializing}>{$saving ? 'Saving…' : 'Save'}</button>
      <button on:click={onRun} disabled={$running || $initializing}>{$running ? 'Running…' : 'Run'}</button>
      <button on:click={onCompile} disabled={$initializing}>Compile</button>
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
</style>