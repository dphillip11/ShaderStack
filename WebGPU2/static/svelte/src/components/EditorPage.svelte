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

  onMount(() => { initWorkspace(); });
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
  <div class="layout">
    <div class="left-pane">
      <ScriptTabs />
      <CodeEditor script={$script} on:updateCode={(e)=>updateScriptCode(e.detail.id,e.detail.code)} />
    </div>
    <div class="right-pane">
      <PreviewPanel />
      <ConsolePanel />
    </div>
  </div>
</div>

<style>
  .svelte-editor { display:flex; flex-direction:column; gap:.75rem; }
  .editor-bar { display:flex; justify-content:space-between; align-items:center; }
  .layout { display:flex; gap:1rem; }
  .left-pane { flex:1; display:flex; flex-direction:column; }
  .right-pane { width:420px; display:flex; flex-direction:column; gap:.75rem; }
  textarea { width:100%; height:400px; font-family: monospace; }

  .editor-page {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: white;
    padding: 1.5rem 2rem;
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    margin-bottom: 2rem;
  }

  .shader-title {
    font-size: 1.5rem;
    margin: 0;
    color: #2d3748;
    border: none;
    background: none;
    font-weight: 600;
  }

  .shader-title:focus {
    outline: 2px solid #667eea;
    border-radius: 5px;
    padding: 0.25rem;
  }

  .editor-actions {
    display: flex;
    gap: 1rem;
  }

  .editor-layout {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 2rem;
    margin-bottom: 2rem;
  }

  .editor-main-container {
    background: white;
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    overflow: hidden;
    min-height: 600px;
  }

  @media (max-width: 1024px) {
    .editor-layout {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
  }

  @media (max-width: 768px) {
    .editor-page {
      padding: 0 1rem;
    }
    
    .editor-header {
      flex-direction: column;
      gap: 1rem;
      text-align: center;
    }
    
    .editor-actions {
      justify-content: center;
    }
  }
</style>