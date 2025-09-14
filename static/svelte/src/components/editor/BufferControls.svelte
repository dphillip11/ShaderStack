<script>
  import { createEventDispatcher } from 'svelte';
  
  export let buffer = { format: 'rgba8unorm', width: 512, height: 512 };
  export let kind = 'fragment'; // 'fragment' | 'compute'
  export let compute = { workgroupSize: { x: 16, y: 16, z: 1 } };

  // Ensure internal state follows prop changes
  $: buffer;
  $: kind;
  $: compute;
  
  const dispatch = createEventDispatcher();
  
  const formats = [
    'rgba8unorm',
    'bgra8unorm', 
    'rgba16float',
    'rgba32float',
    'r8unorm',
    'rg8unorm'
  ];
  
  function updateBuffer() { dispatch('change', { buffer: { ...buffer }, kind, compute: { ...compute, workgroupSize: { ...compute.workgroupSize } } }); }
  function updateKind(e) { kind = e.target.value; updateBuffer(); }
  function updateWG() { updateBuffer(); }
</script>

<div class="buffer-controls">
  <div class="buffer-field">
    <label for="kind">Type</label>
    <select id="kind" bind:value={kind} on:change={updateKind}>
      <option value="fragment">Fragment</option>
      <option value="compute">Compute</option>
    </select>
  </div>
  <div class="buffer-field">
    <label for="format">Format</label>
    <select id="format" bind:value={buffer.format} on:change={updateBuffer}>
      {#each formats as fmt}
        <option value={fmt}>{fmt}</option>
      {/each}
    </select>
  </div>
  
  <div class="buffer-field">
    <label for="width">Width</label>
    <input id="width" type="number" min="1" max="4096" 
           bind:value={buffer.width} on:input={updateBuffer} />
  </div>
  
  <div class="buffer-field">
    <label for="height">Height</label>
    <input id="height" type="number" min="1" max="4096" 
           bind:value={buffer.height} on:input={updateBuffer} />
  </div>
  
  <div class="buffer-info">
    <span class="buffer-size">{buffer.width}×{buffer.height}</span>
  </div>

  {#if kind === 'compute'}
    <div class="buffer-field">
      <label>Workgroup</label>
      <div class="wg-row">
        <input type="number" min="1" max="1024" bind:value={compute.workgroupSize.x} on:input={updateWG} aria-label="wg x" />
        <span>×</span>
        <input type="number" min="1" max="1024" bind:value={compute.workgroupSize.y} on:input={updateWG} aria-label="wg y" />
        <span>×</span>
        <input type="number" min="1" max="64" bind:value={compute.workgroupSize.z} on:input={updateWG} aria-label="wg z" />
      </div>
    </div>
  {/if}
</div>

<style>
  .buffer-controls {
    display: flex;
    gap: 1rem;
    align-items: end;
    padding: 0.75rem 1rem;
    background-color: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    font-size: 0.8rem;
  }
  
  .buffer-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .buffer-field label {
    font-weight: 600;
    color: #4a5568;
    text-transform: uppercase;
    font-size: 0.7rem;
  }
  
  .buffer-field select,
  .buffer-field input {
    padding: 0.4rem 0.6rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: white;
    color: #374151;
    font-size: 0.8rem;
    min-width: 80px;
  }

  .wg-row { display: flex; align-items: center; gap: 0.25rem; }
  .wg-row input { width: 70px; }
  
  .buffer-field select:focus,
  .buffer-field input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
  }
  
  .buffer-info {
    display: flex;
    align-items: center;
    color: #6b7280;
  }
  
  .buffer-size {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.75rem;
    background: #e5e7eb;
    padding: 0.25rem 0.5rem;
    border-radius: 3px;
  }
  
  @media (max-width: 768px) {
    .buffer-controls {
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    
    .buffer-field {
      min-width: 70px;
    }
  }
</style>