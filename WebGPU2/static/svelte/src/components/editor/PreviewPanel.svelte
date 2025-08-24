<script>
  import { editorState } from '../../stores/editor.js';
  import { onMount, onDestroy } from 'svelte';
  
  let workspace = null;
  let lastActiveScriptId = null;
  let unsubscribe;
  
  // Subscribe to editor state to watch for active script changes
  unsubscribe = editorState.subscribe(state => {
    // When active script changes, update the preview to show that script's output
    if (state.activeScriptId !== lastActiveScriptId) {
      updatePreviewForActiveScript(state.activeScriptId);
      lastActiveScriptId = state.activeScriptId;
    }
  });
  
  // Get workspace reference
  function getWorkspace() {
    return window.__workspaceRef;
  }
  
  // Update preview to show the active script's buffer output
  function updatePreviewForActiveScript(scriptId) {
    const currentWorkspace = getWorkspace();
    
    if (currentWorkspace && scriptId) {
      console.log('Updating preview to show script:', scriptId);
      try {
        // Show the buffer output for the specified script in the preview canvas
        currentWorkspace.showBufferVisualization(scriptId, 'texture');
      } catch (error) {
        console.warn('Failed to update preview for script', scriptId, ':', error);
      }
    }
  }
  
  onMount(() => {
    workspace = getWorkspace();
    
    // Listen for script execution events
    if (workspace && workspace.scriptEngine) {
      const handleAllScriptsExecuted = () => {
        // After all scripts run, show the active script's output in the preview
        const currentState = $editorState;
        if (currentState.activeScriptId) {
          setTimeout(() => updatePreviewForActiveScript(currentState.activeScriptId), 100);
        }
      };
      
      workspace.scriptEngine.addEventListener('allScriptsExecuted', handleAllScriptsExecuted);
      
      // Initial preview update
      const currentState = $editorState;
      if (currentState.activeScriptId) {
        updatePreviewForActiveScript(currentState.activeScriptId);
      }
      
      // Store cleanup function
      return () => {
        if (workspace && workspace.scriptEngine) {
          workspace.scriptEngine.removeEventListener('allScriptsExecuted', handleAllScriptsExecuted);
        }
      };
    }
  });
  
  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });
</script>

<div class="preview-panel">
  <div class="panel-header">
    <h3>Preview</h3>
    <div class="preview-info">
      {#if $editorState.activeScriptId}
        <span class="active-script">Script {$editorState.activeScriptId}</span>
      {/if}
      <div class="preview-status">
        {#if $editorState.running}Running…{/if}
      </div>
    </div>
  </div>
  <div class="preview-content">
    <div class="webgpu-canvas-container">
      <canvas id="webgpu-canvas" width="400" height="400" aria-label="WebGPU preview"></canvas>
      {#if !$editorState.activeScriptId}
        <div id="canvas-overlay">
          <div>No script selected</div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .preview-panel {
    display: flex;
    flex-direction: column;
    min-width: 300px;
    background: white;
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    background-color: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
  }

  .panel-header h3 {
    margin: 0;
    color: #2d3748;
    font-size: 1.1rem;
  }

  .preview-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .active-script {
    font-size: 0.8rem;
    color: #667eea;
    font-weight: 600;
    background: #edf2f7;
    padding: 0.25rem 0.5rem;
    border-radius: 3px;
  }

  .preview-status {
    font-size: 0.8rem;
    color: #4a5568;
  }

  .preview-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 1rem;
  }

  .webgpu-canvas-container {
    position: relative;
    height: 300px;
    background-color: #1a202c;
    border-radius: 5px;
    overflow: hidden;
  }

  #webgpu-canvas {
    width: 100%;
    height: 100%;
    display: block;
  }

  #canvas-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(26, 32, 44, 0.9);
    color: white;
    text-align: center;
    font-size: 0.9rem;
  }

  @media (max-width: 1024px) {
    .preview-panel {
      min-height: 400px;
    }
  }
</style>