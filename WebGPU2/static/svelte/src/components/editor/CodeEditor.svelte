<script>
  import { createEventDispatcher } from 'svelte';
  import { editorState, updateScriptCode } from '../../stores/editor.js';
  export let script = null; // { id, code }
  const dispatch = createEventDispatcher();
  
  // Function to decode JSON-encoded strings
  function decodeCode(rawCode) {
    if (!rawCode) return '';
    
    // If the code looks like a JSON-encoded string (starts and ends with quotes)
    // and contains escaped characters, try to parse it
    if (typeof rawCode === 'string' && 
        rawCode.startsWith('"') && rawCode.endsWith('"') && 
        (rawCode.includes('\\n') || rawCode.includes('\\"'))) {
      try {
        return JSON.parse(rawCode);
      } catch (e) {
        console.warn('Failed to decode JSON string, using raw:', e);
        return rawCode;
      }
    }
    
    return rawCode;
  }
  
  let localCode = '';
  let lastScriptId = null;
  let injectedCode = '';
  let showInjectedCode = false;
  
  // Only update localCode when script changes, not during editing
  $: if (script && script.id !== lastScriptId) {
    localCode = decodeCode(script.code) || '';
    lastScriptId = script.id;
    // Update injected code when script changes
    updateInjectedCodePreview();
  }

  // Function to get the injected code preview
  function updateInjectedCodePreview() {
    if (!script) {
      injectedCode = '';
      return;
    }

    try {
      // Get workspace reference to access the shader compiler
      const workspace = window.__workspaceRef;
      if (!workspace || !workspace.shaderCompiler) {
        injectedCode = '// Workspace not initialized';
        return;
      }

      // Get available buffers (simulate what the script engine does)
      const availableBuffers = new Map();
      if (workspace.scriptEngine && workspace.scriptEngine.scripts) {
        for (const [scriptId, scriptData] of workspace.scriptEngine.scripts) {
          if (scriptId !== script.id) {
            availableBuffers.set(scriptId, scriptData.bufferSpec);
          }
        }
      }

      // Generate the injected code
      injectedCode = workspace.shaderCompiler.injectBufferBindings(localCode, availableBuffers);
    } catch (error) {
      injectedCode = `// Error generating injected code: ${error.message}`;
    }
  }

  // Update injected code when local code changes
  $: if (localCode) {
    updateInjectedCodePreview();
  }

  let timeout;
  function onInput() {
    if (!script) return;
    const { id } = script;
    const code = localCode;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      updateScriptCode(id, code);
      dispatch('updateCode', { id, code });
      // Update injected code preview after a short delay
      setTimeout(updateInjectedCodePreview, 100);
    }, 250);
  }

  function toggleInjectedCode() {
    showInjectedCode = !showInjectedCode;
    if (showInjectedCode) {
      updateInjectedCodePreview();
    }
  }
</script>

<div class="code-editor-container">
  {#if script}
    <div class="code-section">
      <div class="section-header">
        <h4>Your Shader Code</h4>
      </div>
      <textarea 
        class="code-editor" 
        bind:value={localCode} 
        on:input={onInput} 
        spellcheck="false" 
        aria-label="WGSL code editor"
        placeholder="Enter your WGSL shader code here..."></textarea>
    </div>
    
    <div class="injected-section">
      <div class="section-header injected-header" on:click={toggleInjectedCode}>
        <h4>
          <span class="toggle-icon" class:expanded={showInjectedCode}>▶</span>
          Injected Shader Code (Debug)
        </h4>
        <span class="toggle-hint">Click to {showInjectedCode ? 'hide' : 'show'}</span>
      </div>
      
      {#if showInjectedCode}
        <div class="injected-code-container">
          <pre class="injected-code">{injectedCode || '// No injected code available'}</pre>
        </div>
      {/if}
    </div>
  {:else}
    <div class="empty">No script selected</div>
  {/if}
</div>

<style>
  .code-editor-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .code-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 300px;
  }

  .section-header {
    padding: 0.5rem 1rem;
    background-color: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    font-size: 0.9rem;
  }

  .section-header h4 {
    margin: 0;
    color: #2d3748;
    font-weight: 600;
  }

  .injected-header {
    cursor: pointer;
    user-select: none;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #edf2f7;
    border-top: 1px solid #e2e8f0;
  }

  .injected-header:hover {
    background-color: #e2e8f0;
  }

  .injected-header h4 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .toggle-icon {
    font-size: 0.7rem;
    transition: transform 0.2s ease;
    color: #4a5568;
  }

  .toggle-icon.expanded {
    transform: rotate(90deg);
  }

  .toggle-hint {
    font-size: 0.75rem;
    color: #718096;
    font-weight: normal;
  }

  .code-editor {
    flex: 1;
    min-height: 300px;
    resize: none;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 13px;
    line-height: 1.4;
    padding: 0.75rem;
    background: #1a202c;
    color: #e2e8f0;
    border: none;
    outline: none;
  }

  .code-editor:focus {
    background: #2d3748;
  }

  .injected-section {
    flex-shrink: 0;
  }

  .injected-code-container {
    max-height: 200px;
    overflow-y: auto;
    background-color: #f7fafc;
    border-bottom: 1px solid #e2e8f0;
  }

  .injected-code {
    margin: 0;
    padding: 1rem;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 11px;
    line-height: 1.4;
    color: #2d3748;
    background-color: #f7fafc;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .empty {
    padding: 2rem;
    text-align: center;
    opacity: 0.6;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  @media (max-width: 768px) {
    .code-editor {
      font-size: 12px;
    }
    
    .injected-code {
      font-size: 10px;
    }
    
    .injected-code-container {
      max-height: 150px;
    }
  }
</style>