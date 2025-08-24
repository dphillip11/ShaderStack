<script>
  import { editorState, setActiveScript, updateScriptBuffer } from '../../stores/editor.js';
  import { addScript } from '../../adapters/workspaceAdapter.js';
  import BufferControls from './BufferControls.svelte';
  
  let state;
  const unsubscribe = editorState.subscribe(s => state = s);
  function select(id){ setActiveScript(id); }
  function add(){ addScript(); }
  
  $: scripts = state?.scripts || [];
  $: active = state?.activeScriptId;
  $: activeScript = scripts.find(sc => sc.id === active);
  
  function handleBufferChange(event) {
    if (activeScript) {
      updateScriptBuffer(activeScript.id, event.detail);
    }
  }
  
  import { onDestroy } from 'svelte';
  onDestroy(unsubscribe);
</script>

<div class="script-tabs-container">
  <div class="script-tabs">
    {#each scripts as sc}
      <button class="tab-btn {active===sc.id ? 'active':''}" on:click={() => select(sc.id)}>
        Script {sc.id}
        <span class="buffer-indicator">{sc.buffer?.width || 512}×{sc.buffer?.height || 512}</span>
      </button>
    {/each}
    <button class="tab-btn add" on:click={add} title="Add script">+</button>
  </div>
  
  {#if activeScript}
    <BufferControls 
      buffer={activeScript.buffer || { format: 'rgba8unorm', width: 512, height: 512 }}
      on:change={handleBufferChange}
    />
  {/if}
</div>

<style>
  .script-tabs-container {
    background-color: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
  }

  .script-tabs {
    display: flex;
    gap: 0.25rem;
    align-items: center;
    padding: 1rem 1.5rem 0.5rem 1.5rem;
  }

  .tab-btn {
    background: none;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 5px 5px 0 0;
    cursor: pointer;
    color: #718096;
    transition: all 0.3s;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.9rem;
  }

  .tab-btn.active,
  .tab-btn:hover {
    background-color: #667eea;
    color: white;
  }

  .buffer-indicator {
    font-size: 0.7rem;
    opacity: 0.7;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  }

  .tab-btn.add {
    border-radius: 5px;
    background-color: #e2e8f0;
    color: #4a5568;
    padding: 0.5rem 0.75rem;
  }

  .tab-btn.add:hover {
    background-color: #cbd5e0;
    color: #2d3748;
  }

  @media (max-width: 768px) {
    .script-tabs {
      flex-wrap: wrap;
      justify-content: flex-start;
    }
    
    .tab-btn {
      font-size: 0.8rem;
      padding: 0.4rem 0.8rem;
    }
    
    .buffer-indicator {
      font-size: 0.6rem;
    }
  }
</style>