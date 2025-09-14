<script>
  import { isInitializing, addConsoleMessage } from '../../stores/editor.js';
  import { activeScript } from '../../stores/active_shader.js';
  import { startRealTime, stopRealTime, isRealTimeRunning } from '../../adapters/workspaceAdapter.js';
  import { onMount } from 'svelte';

  let realTimeMode = false;

  function handleRealTimeToggle() {
    realTimeMode = !realTimeMode;
    if (realTimeMode) {
      startRealTime();
      addConsoleMessage('Real-time mode started', 'info');
    } else {
      stopRealTime();
      addConsoleMessage('Real-time mode stopped', 'info');
    }
  }

  // Sync real-time state
  onMount(() => {
    const interval = setInterval(() => {
      const wsRealTime = isRealTimeRunning();
      if (wsRealTime !== realTimeMode) {
        realTimeMode = wsRealTime;
      }
    }, 100);
    
    return () => clearInterval(interval);
  });
</script>

<div class="preview-panel">
  <div class="panel-header">
    <h3>Preview</h3>
    <div class="preview-info">
      {#if $activeScript}
        <span class="active-script">Script {$activeScript.id}</span>
      {/if}
      <div class="preview-status">
        <button 
          class="btn-primary" 
          on:click={handleRealTimeToggle}
          disabled={$isInitializing}
        >
          {realTimeMode ? 'Stop' : 'Run'}
        </button>
      </div>
    </div>
  </div>
  <div class="preview-content">
    <div class="webgpu-canvas-container">
      <canvas id="webgpu-canvas" width="512" height="512" aria-label="WebGPU preview"></canvas>
      {#if !$activeScript}
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
    border-top-right-radius: 10px;
    border-bottom-right-radius: 10px;
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
    display: flex;
    gap: 0.5rem;
  }

  .btn-primary {
    background-color: #3182ce;
    color: white;
    border: none;
    padding: 0.5rem 0.75rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
    transition: background-color 0.2s;
    min-width: 60px;
  }

  .btn-primary:hover:not(:disabled) {
    background-color: #2c5aa0;
  }

  .btn-primary:disabled {
    background-color: #a0aec0;
    cursor: not-allowed;
  }

  .running-indicator {
    background-color: rgba(26, 32, 44, 0.7);
    color: #68d391;
    font-weight: 600;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.7; }
    50% { opacity: 1; }
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