<script>
  import { addNewScript, deleteScript, activeShader, activeScriptIndex, activeScript } from '../../stores/activeShader.js';
  import BufferControls from './BufferControls.svelte';
</script>

<div class="script-tabs-container">
  <div class="script-tabs">
    {#if $activeShader && $activeShader.shader_scripts && $activeShader.shader_scripts.length > 1}
    {#each $activeShader?.shader_scripts as sc, index}
      <div class="tab-wrapper">
        <button class="tab-btn {$activeScriptIndex === index ? 'active':''}" on:click={() => activeScriptIndex.set(index)}>
          <span class="tab-content">
            Script {sc.id}
            <span class="buffer-indicator">{sc.buffer?.width || 512}×{sc.buffer?.height || 512}</span>
          </span>
          {#if $activeShader.shader_scripts.length > 1}
            <button 
              class="tab-close" 
              on:click={(e) => deleteScript(index)}
              title="Delete script"
              aria-label="Delete script {index}"
            >×</button>
          {/if}
        </button>
      </div>
    {/each}
    {/if}
    <button class="tab-btn add" on:click={addNewScript} title="Add script">+</button>
  </div>
  
  {#if $activeScript}
    {#key $activeScript.id}
      <BufferControls 
        buffer={{ ...($activeScript.buffer || { format: 'rgba8unorm', width: 512, height: 512 }) }}
        kind={$activeScript.kind || 'fragment'}
        compute={{ workgroupSize: { ...($activeScript.compute?.workgroupSize || { x: 16, y: 16, z: 1 }) } }}
        on:change={(e) => {
          const { buffer, kind, compute } = e.detail;
          activeShader.update(shader => {
            if (!(shader && shader.shader_scripts && shader.shader_scripts[$activeScriptIndex])) return shader;
            // Immutable updates to trigger reactivity
            const idx = $activeScriptIndex;
            const nextScripts = shader.shader_scripts.slice();
            const prev = nextScripts[idx] || {};
            nextScripts[idx] = {
              ...prev,
              buffer: { ...buffer },
              kind,
              compute: kind === 'compute' ? { ...(compute || {}), workgroupSize: { ...(compute?.workgroupSize || { x:16,y:16,z:1 }) } } : null,
            };
            return { ...shader, shader_scripts: nextScripts };
          });
        }}
      />
    {/key}
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