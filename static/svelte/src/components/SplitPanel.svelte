<script>
  import { onMount } from 'svelte';
  // Resizable panes functionality
  let leftPaneWidth = 60; // percentage
  let isResizing = false;
  let layoutRef;

  function startResize(e) {
    isResizing = true;
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  }

  function handleResize(e) {
    if (!isResizing || !layoutRef) return;
    
    const rect = layoutRef.getBoundingClientRect();
    const newLeftWidth = ((e.clientX - rect.left) / rect.width) * 100;
    
    // Constrain between 20% and 80%
    leftPaneWidth = Math.max(20, Math.min(80, newLeftWidth));
  }

  function stopResize() {
    isResizing = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  onMount(() => {     
    // Cleanup on component destroy
    return () => {
      if (isResizing) {
        stopResize();
      }
    };
  });
</script>

<div class="layout" bind:this={layoutRef}>
  <div class="left-pane" style="width: {leftPaneWidth}%;">
    <slot name="left"></slot>
  </div>
  
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="resize-handle" 
       on:mousedown={startResize}
       aria-roledescription="separator"
       class:resizing={isResizing}>
    <div class="resize-line"></div>
  </div>
  
  <div class="right-pane" style="width: {100 - leftPaneWidth}%;">
    <slot name="right"></slot>
  </div>
</div>

<style>
.layout { 
    display: flex; 
    flex: 1;
    min-height: 400;
    position: relative;
  }
  
  .left-pane { 
    display: flex; 
    flex-direction: column;
    min-width: 300px;
    height: 600px;
    overflow: hidden;
  }
  
  .right-pane { 
    display: flex; 
    flex-direction: column; 
    gap: .75rem;
    height: 600px;
    min-width: 300px;
    overflow: hidden;
  }

  /* Resizable handle styles */
  .resize-handle {
    width: 8px;
    background-color: #e2e8f0;
    cursor: col-resize;
    position: relative;
    display: flex;
    margin: 10px 0;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
    flex-shrink: 0;
  }

  .resize-handle:hover,
  .resize-handle.resizing {
    background-color: #cbd5e0;
  }

  .resize-line {
    width: 2px;
    height: 30px;
    background-color: #a0aec0;
    border-radius: 1px;
  }

  /* Responsive design - disable resizing on smaller screens */
  @media (max-width: 765px) {
    .layout {
      flex-direction: column;
    }
    
    .left-pane,
    .right-pane {
      width: 100% !important;
    }
    
    .resize-handle {
      display: none;
    }
  }
</style>