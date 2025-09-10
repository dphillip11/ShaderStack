<script>
  import SplitPanel from './SplitPanel.svelte';
  import CodeEditor from './editor/CodeEditor.svelte';
  import ConsolePanel from './editor/ConsolePanel.svelte';
  import PreviewPanel from './editor/PreviewPanel.svelte';
  import ScriptTabs from './editor/ScriptTabs.svelte';
  import {activeShader} from '../stores/active_shader.js';
  import Tags from './Tags.svelte';

  let isEditingName = false;
  
</script>

<div class="shader-info">
  {#if isEditingName}
    <div class="edit-name-container">
      <input 
        class="h2-input"
        type="text" 
        bind:value={$activeShader.name} 
      />
      <button class="save-btn" on:click={() => isEditingName = false} aria-label="Save shader name">
        <span class="save-icon">✔️</span>
      </button>
    </div>
  {:else}
    <div class="shader-title">
      <h2>{$activeShader.name}
      <button class="edit-btn" on:click={() => isEditingName = true} aria-label="Edit shader name">
        <span class="edit-icon">✏️</span>
      </button></h2>
    </div>
  {/if}
  <Tags tags={$activeShader.tags} create={true} edit={true} field={"name"} tagFactory={tag => ({name:tag, id:null})} />
</div>

<SplitPanel>
  <div slot="left">
      <ScriptTabs/>
      <CodeEditor/>
  </div>
  <div slot="right">
      <PreviewPanel/>
      <ConsolePanel/>
  </div>
</SplitPanel>

<style>
  /* Style the input to match h2 */
  .h2-input {
    font-size: 1.5em;           /* Match h2 font size */
    font-weight: bold;          /* Match h2 font weight */
    font-family: inherit;       /* Match h2 font family */
    color: inherit;             /* Match h2 text color */
    margin: 0;                  /* Match h2 margin */
    padding: 0;                 /* Remove default padding */
    border: none;               /* Remove border */
    border-bottom: 1px dashed #ccc; /* Add subtle indicator that it's editable */
    background: transparent;    /* Make background transparent */
    outline: none;              /* Remove focus outline */
  }
  
  .h2-input:focus {
    border-bottom: 1px solid #666; /* Darker border on focus */
  }

  .shader-info {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #e2e8f0;
    background-color: #f8fafc;
  }
</style>