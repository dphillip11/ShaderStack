<script>
  import { createEventDispatcher } from 'svelte';
  import { editorState, updateScriptCode } from '../../stores/editor.js';
  export let script = null; // { id, code }
  const dispatch = createEventDispatcher();
  let localCode = script?.code || '';
  $: if (script && script.code !== localCode) localCode = script.code;

  let timeout;
  function onInput() {
    if (!script) return;
    const { id } = script;
    const code = localCode;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      updateScriptCode(id, code);
      dispatch('updateCode', { id, code });
    }, 250);
  }
</script>

{#if script}
  <textarea class="code-editor" bind:value={localCode} on:input={onInput} spellcheck="false" aria-label="WGSL code editor"></textarea>
{:else}
  <div class="empty">No script selected</div>
{/if}

<style>
  .code-editor { flex:1; min-height:400px; resize:vertical; font-family: var(--mono, monospace); font-size:13px; line-height:1.4; padding:.75rem; background:#111; color:#eee; border:1px solid #333; }
  .code-editor:focus { outline:2px solid #555; }
  .empty { padding:2rem; text-align:center; opacity:.6; }

  .code-editor-container {
    flex: 1;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .code-editor-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .shader-code {
    width: 100%;
    height: 100%;
    border: none;
    padding: 1rem;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.9rem;
    line-height: 1.5;
    background-color: #2d3748;
    color: #e2e8f0;
    resize: none;
    outline: none;
    flex: 1;
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
</style>