<script>
  import { createEventDispatcher } from 'svelte';

  export let show = false;
  export let shaderName = '';
  export let isDeleting = false;

  const dispatch = createEventDispatcher();

  function hideDialog() {
    if (isDeleting) return; // Prevent closing while deleting
    dispatch('cancel');
  }

  function confirmDelete() {
    dispatch('confirm');
  }

  // Close on escape key
  function handleKeydown(event) {
    if (event.key === 'Escape' && !isDeleting) {
      hideDialog();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if show}
  <div class="modal-overlay" on:click={hideDialog}>
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h3>Delete Shader</h3>
        <button class="modal-close" on:click={hideDialog} disabled={isDeleting}>×</button>
      </div>
      <div class="modal-body">
        <p>Are you sure you want to delete <strong>"{shaderName}"</strong>?</p>
        <p class="warning-text">This action cannot be undone.</p>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" on:click={hideDialog} disabled={isDeleting}>Cancel</button>
        <button class="btn-delete" on:click={confirmDelete} disabled={isDeleting}>
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background-color: white;
    border-radius: 0.5rem;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    width: 90%;
    max-width: 500px;
    padding: 1.5rem;
    position: relative;
    animation: modalEnter 0.15s ease-out;
  }

  @keyframes modalEnter {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 1rem;
    margin-bottom: 1rem;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #1a202c;
  }

  .modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #718096;
    padding: 0.25rem;
    border-radius: 0.25rem;
    transition: all 0.15s ease;
  }

  .modal-close:hover:not(:disabled) {
    background-color: #f7fafc;
    color: #4a5568;
  }

  .modal-close:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .modal-body {
    padding: 0.5rem 0;
  }

  .modal-body p {
    margin: 0.75rem 0;
    color: #4a5568;
    line-height: 1.5;
  }

  .modal-body p:first-child {
    margin-top: 0;
  }

  .modal-body p:last-child {
    margin-bottom: 0;
  }

  .warning-text {
    color: #e53e3e;
    font-weight: 600;
    font-size: 0.875rem;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    border-top: 1px solid #e2e8f0;
    padding-top: 1rem;
    margin-top: 1rem;
  }

  .btn-cancel,
  .btn-delete {
    padding: 0.5rem 1.25rem;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    font-weight: 500;
    font-size: 0.875rem;
    transition: all 0.15s ease;
    min-width: 80px;
  }

  .btn-cancel {
    background-color: #edf2f7;
    color: #4a5568;
    border: 1px solid #e2e8f0;
  }

  .btn-cancel:hover:not(:disabled) {
    background-color: #e2e8f0;
    border-color: #cbd5e0;
  }

  .btn-delete {
    background-color: #e53e3e;
    color: white;
  }

  .btn-delete:hover:not(:disabled) {
    background-color: #c53030;
  }

  .btn-cancel:disabled,
  .btn-delete:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Dark overlay animation */
  .modal-overlay {
    animation: overlayEnter 0.15s ease-out;
  }

  @keyframes overlayEnter {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>