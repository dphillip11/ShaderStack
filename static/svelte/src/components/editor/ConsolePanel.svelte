<script>
  import { ClearConsole, consoleMessages } from '../../stores/logging.js';
  import {get} from 'svelte/store';
</script>

<div class="console-panel">
  <div class="console-header">
    <span>Console</span>
    <button on:click={ClearConsole} aria-label="Clear console" class="clear-btn">✕</button>
  </div>
  <div class="console-content" >
    {#each $consoleMessages as m (m.time)}
      <div class="console-message {m.type}">[{m.time.toLocaleTimeString()}] {m.text}</div>
    {/each}
    {#if !$consoleMessages.length}
      <div class="empty">No messages</div>
    {/if}
  </div>
</div>

<style>
  .console-panel {
    border: 1px solid #e2e8f0;
    border-radius: 5px;
    overflow: hidden;
    max-height: 200px;
    flex-shrink: 0;
    background: white;
  }

  .console-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.75rem;
    background-color: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
  }

  .console-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: #4a5568;
  }

  .console-content {
    height: calc(100% - 40px);
    max-height: 160px;
    overflow-y: auto;
    padding: 0.5rem;
    background-color: #1a202c;
    color: #e2e8f0;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.8rem;
    line-height: 1.4;
  }

  .console-message {
    margin-bottom: 0.25rem;
    padding: 0.25rem;
    border-radius: 3px;
  }

  .console-message.info {
    background-color: rgba(66, 153, 225, 0.1);
    border-left: 3px solid #4299e1;
  }

  .console-message.error {
    background-color: rgba(245, 101, 101, 0.1);
    border-left: 3px solid #f56565;
  }

  .console-message.success {
    background-color: rgba(72, 187, 120, 0.1);
    border-left: 3px solid #48bb78;
  }

  .clear-btn {
    background: none;
    border: none;
    color: #718096;
    cursor: pointer;
    font-size: 0.8rem;
    padding: 0.25rem 0.5rem;
    border-radius: 3px;
  }

  .clear-btn:hover {
    background-color: #e2e8f0;
    color: #2d3748;
  }
</style>