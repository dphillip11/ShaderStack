<script>
  import SplitPanel from './SplitPanel.svelte';
  import CodeEditor from './editor/CodeEditor.svelte';
  import ConsolePanel from './editor/ConsolePanel.svelte';
  import PreviewPanel from './editor/PreviewPanel.svelte';
  import ScriptTabs from './editor/ScriptTabs.svelte';
  import {activeShader, AddTag, RemoveTag, SaveActiveShader} from '../stores/activeShader.js';
  import Tags from './Tags.svelte';
  import { user } from '../stores/user';
  import { derived } from 'svelte/store';
  import { initWorkspace } from '../adapters/workspaceAdapter.js';
  import { isInitializing, addConsoleMessage } from '../stores/editor.js';
  import { onMount } from 'svelte';

  let isEditingName = false;
  let ownsShader = derived(
    [user, activeShader],
    ([$user, $activeShader]) => $user.is_authenticated && $activeShader && $activeShader.user_id === $user.user_id
  );

  // Initialize WebGPU workspace when component mounts
  onMount(async () => {
    try {
      isInitializing.set(true);
      await initWorkspace();
      addConsoleMessage('WebGPU workspace initialized successfully', 'success');
    } catch (error) {
      addConsoleMessage(`Failed to initialize WebGPU: ${error.message}`, 'error');
    } finally {
      isInitializing.set(false);
    }
  });
  
</script>
{#if $activeShader}

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
        {#if $ownsShader}
          <button class="edit-btn" on:click={() => isEditingName = true} aria-label="Edit shader name">
            <span class="edit-icon">✏️</span>
          </button>
        {/if}
      </h2>
    </div>
  {/if}
  <Tags create={$ownsShader} edit={$ownsShader} tags={$activeShader.tags?.map(t => t.name) || []} on:add={({ detail }) => AddTag(detail.tag)} on:remove={({ detail }) => RemoveTag(detail.tag)} />
  {#if $ownsShader}
    <button class="btn-confirm btn" id="save-button" on:click={SaveActiveShader}>Save</button>
  {/if}
</div>

{/if}

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
    position: relative;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #e2e8f0;
    background-color: #f8fafc;
  }

  #save-button {
    background-color: #3182ce;
    color: white;
    border: none;
    padding: 0.5rem 0.75rem;
    border-radius: 5px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
    position: absolute;
    top: 0;
    right: 0;
    margin: 1.5rem; /* Add some margin for spacing */
  }

  #save-button:hover {
    background-color: #2c5aa0;
  }

  #save-button:active {
    background-color: #2a4a8b;
    transform: translateY(1px);
  }


</style>