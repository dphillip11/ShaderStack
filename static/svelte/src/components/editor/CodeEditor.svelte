<script>
    import { writable, derived } from "svelte/store";
  import { activeScript, displayedInjectedCode, scriptRuntimeData } from "../../stores/activeShader";

  let showInjectedCode = false;
  let textareaElement;
  let localCode = derived(activeScript, $activeScript => $activeScript ? decodeCode($activeScript.code) : '');
  let errors = [];

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

  // Listen for compilation errors from the runtime store
  $: if ($scriptRuntimeData && $activeScript) {
    const runtime = $scriptRuntimeData[$activeScript.id];
    const latestErrors = runtime?.errors || [];
    errors = extractLineNumbers(latestErrors);
  }

  function extractLineNumbers(errorMessages) {
    const lineErrors = [];
    errorMessages.forEach(msg => {
      const lineMatch = msg.text.match(/Line (\d+):/);
      if (lineMatch) {
        lineErrors.push({
          line: parseInt(lineMatch[1]),
          message: msg.text
        });
      }
    });
    return lineErrors;
  }

  function highlightErrorLines() {
    if (!textareaElement || errors.length === 0) return;

    // This is a basic implementation - in a real editor you'd want syntax highlighting
  const lines = (typeof localCode === 'string' ? localCode : '').split('\n');
    errors.forEach(error => {
      if (error.line > 0 && error.line <= lines.length) {
        // Add error indication - could be enhanced with line highlighting
        console.log(`Error at line ${error.line}: ${error.message}`);
      }
    });
  }

  function toggleInjectedCode() {
    showInjectedCode = !showInjectedCode;
  }

  // Re-highlight when errors change
  $: if (errors.length > 0) {
    highlightErrorLines();
  }
</script>

<div class="code-editor-container">
  {#if activeScript}
    <div class="code-section">
      <div class="section-header">
        <h4>Your Shader Code</h4>
        <div class="editor-hints">
          {#if errors.length > 0}
            <span class="error-count">{errors.length} error{errors.length > 1 ? 's' : ''}</span>
          {/if}
        </div>
      </div>

      {#if errors.length > 0}
        <div class="error-summary">
          {#each errors as error}
            <div class="error-item">
              <span class="error-line">Line {error.line}:</span>
              <span class="error-message">{error.message.split(':').slice(1).join(':').trim()}</span>
            </div>
          {/each}
        </div>
      {/if}
      
      <textarea 
        bind:this={textareaElement}
        class="code-editor"
        class:has-errors={errors.length > 0}
        bind:value={$activeScript.code} 
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
          <pre class="injected-code">{$displayedInjectedCode || '// No injected code available'}</pre>
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
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .section-header h4 {
    margin: 0;
    color: #2d3748;
    font-weight: 600;
  }

  .editor-hints {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .hint {
    font-size: 0.75rem;
    color: #718096;
    background: #edf2f7;
    padding: 0.25rem 0.5rem;
    border-radius: 3px;
  }

  .error-count {
    font-size: 0.75rem;
    color: #e53e3e;
    background: #fed7d7;
    padding: 0.25rem 0.5rem;
    border-radius: 3px;
    font-weight: 600;
  }

  .error-summary {
    background-color: #fed7d7;
    border-bottom: 1px solid #e53e3e;
    max-height: 120px;
    overflow-y: auto;
  }

  .error-item {
    padding: 0.5rem 1rem;
    border-bottom: 1px solid #feb2b2;
    font-size: 0.8rem;
  }

  .error-item:last-child {
    border-bottom: none;
  }

  .error-line {
    color: #c53030;
    font-weight: 600;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  }

  .error-message {
    color: #742a2a;
    margin-left: 0.5rem;
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
    transition: border-left 0.2s ease;
  }

  .code-editor:focus {
    background: #2d3748;
  }

  .code-editor.has-errors {
    border-left: 4px solid #e53e3e;
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

    .editor-hints {
      flex-direction: column;
      gap: 0.5rem;
      align-items: flex-end;
    }
  }
</style>