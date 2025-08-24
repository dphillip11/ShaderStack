<script>
  import { editorState, setActiveScript } from '../../stores/editor.js';
  import { addScript } from '../../adapters/workspaceAdapter.js';
  let state;
  const unsubscribe = editorState.subscribe(s => state = s);
  function select(id){ setActiveScript(id); }
  function add(){ addScript(); }
  $: scripts = state?.scripts || [];
  $: active = state?.activeScriptId;
  import { onDestroy } from 'svelte';
  onDestroy(unsubscribe);
</script>

<div class="script-tabs">
  {#each scripts as sc}
    <button class="tab-btn {active===sc.id ? 'active':''}" on:click={() => select(sc.id)}>Script {sc.id}</button>
  {/each}
  <button class="tab-btn add" on:click={add} title="Add script">+</button>
</div>

<style>
  .script-tabs {
    display: flex;
    gap: 0.25rem;
    align-items: center;
    padding: 1rem 1.5rem;
    background-color: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
  }

  .tab-btn {
    background: none;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 5px;
    cursor: pointer;
    color: #718096;
    transition: all 0.3s;
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
  }

  .tab-btn.active,
  .tab-btn:hover {
    background-color: #667eea;
    color: white;
  }

  .tab-btn.add-tab {
    background-color: #e2e8f0;
    color: #4a5568;
    padding: 0.5rem 0.75rem;
  }

  .tab-btn.add-tab:hover {
    background-color: #cbd5e0;
    color: #2d3748;
  }

  .tab-close {
    margin-left: 0.25rem;
    font-size: 1.1rem;
    opacity: 0.7;
    cursor: pointer;
  }

  .tab-close:hover {
    opacity: 1;
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
  }
</style>