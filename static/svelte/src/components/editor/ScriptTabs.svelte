<script>
  import { editorState, setActiveScript, updateScriptBuffer, deleteScript } from '../../stores/editor.js';
  import { updatePreview } from '../../adapters/workspaceAdapter.js';
  import BufferControls from './BufferControls.svelte';
  
  let state;
  const unsubscribe = editorState.subscribe(s => state = s);
  
  async function select(id) { 
    setActiveScript(id);
    // Compile and execute the script when switching tabs, then update preview
    try {
      const workspace = window.__workspaceRef;
      if (workspace && workspace.scriptEngine) {
        const script = state?.scripts?.find(s => s.id === id);
        
        if (script) {
          // Check if script is already compiled
          if (!workspace.scriptEngine.scripts.has(id)) {
            // Compile the script first
            await workspace.compileScript(id, script.code, script.buffer);
          }
          
          // Execute the script to generate fresh output
          await workspace.scriptEngine.executeScript(id);
          
          // Update preview
          await updatePreview();
        }
      }
    } catch (error) {
      console.warn('Failed to compile/execute script when switching tabs:', error);
    }
  }
  
  function add(){ dataManager.addScript(); }
  
  $: scripts = state?.scripts || [];
  $: active = state?.activeScriptId;
  $: activeScript = scripts.find(sc => sc.id === active);
  
  function handleBufferChange(event) {
    if (activeScript) {
      updateScriptBuffer(activeScript.id, event.detail);
    }
  }
  
  function deleteScriptHandler(scriptId, event) {
    event.stopPropagation(); // Prevent tab selection when clicking X
    
    // Don't allow deleting the last script
    if (scripts.length <= 1) {
      return;
    }
    
    deleteScript(scriptId);
  }
  
  import { onDestroy } from 'svelte';
  onDestroy(unsubscribe);
</script>

<div class="script-tabs-container">
  <div class="script-tabs">
    {#each scripts as sc}
      <div class="tab-wrapper">
        <button class="tab-btn {active===sc.id ? 'active':''}" on:click={() => select(sc.id)}>
          <span class="tab-content">
            Script {sc.id}
            <span class="buffer-indicator">{sc.buffer?.width || 512}×{sc.buffer?.height || 512}</span>
          </span>
          {#if scripts.length > 1}
            <button 
              class="tab-close" 
              on:click={(e) => deleteScriptHandler(sc.id, e)}
              title="Delete script"
              aria-label="Delete script {sc.id}"
            >×</button>
          {/if}
        </button>
      </div>
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

  .tab-wrapper {
    position: relative;
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
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    min-width: 0;
  }

  .tab-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .tab-btn.active,
  .tab-btn:hover {
    background-color: #667eea;
    color: white;
  }

  .tab-close {
    background: none;
    border: none;
    color: inherit;
    font-size: 1.1rem;
    line-height: 1;
    cursor: pointer;
    padding: 0.2rem;
    border-radius: 3px;
    opacity: 0.6;
    transition: all 0.2s;
    margin-left: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
  }

  .tab-close:hover {
    opacity: 1;
    background-color: rgba(255, 255, 255, 0.2);
  }

  .tab-btn.active .tab-close:hover {
    background-color: rgba(255, 255, 255, 0.3);
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
    
    .tab-close {
      width: 16px;
      height: 16px;
      font-size: 1rem;
    }
  }
</style>