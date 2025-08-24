<script>
  import { editorState } from '../../stores/editor.js';
  const state = editorState;
</script>

<div class="preview-panel">
  <div class="panel-header">
    <h3>Preview</h3>
    <div class="preview-status">{#if $state.running}Running…{/if}</div>
  </div>
  <canvas id="webgpu-canvas" width="400" height="400" aria-label="WebGPU preview"></canvas>
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

  .preview-controls {
    display: flex;
    gap: 0.5rem;
  }

  .btn-icon {
    background: none;
    border: none;
    padding: 0.5rem;
    border-radius: 5px;
    cursor: pointer;
    color: #718096;
    transition: all 0.3s;
  }

  .btn-icon:hover {
    background-color: #e2e8f0;
    color: #2d3748;
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
  }

  @media (max-width: 1024px) {
    .preview-panel {
      min-height: 400px;
    }
  }
</style>