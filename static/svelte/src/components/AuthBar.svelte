<script>
  import { dataManager, user, logoutUser } from '../stores/dataManager.js';
  import LoginModal from './LoginModal.svelte';
  import { onMount } from 'svelte';
  
  let modal;

  function openLogin(){ 
    console.log('AuthBar openLogin called, modal:', modal);
    if (modal && typeof modal.open === 'function') {
      modal.open(); 
    } else {
      console.error('Modal reference is null or open() not available:', modal);
    }
  }
</script>
<div class="auth-bar">
  {#if $user.is_authenticated}
    <span class="user"><i class="fas fa-user"></i> {$user.username}</span>
    <button class="btn-small" on:click={logoutUser()} aria-label="Logout"><i class="fas fa-sign-out-alt"></i></button>
  {:else}
    <button class="btn-small primary" on:click={openLogin} aria-label="Login"><i class="fas fa-sign-in-alt"></i> Login</button>
  {/if}
  <LoginModal bind:this={modal} />
</div>
<style>
  .auth-bar { display:flex; align-items:center; gap:.5rem; }
  .auth-bar .user { font-size:.85rem; opacity:.85; display:flex; align-items:center; gap:.35rem; }
  .btn-small { background:#374151; color:#e5e7eb; border:none; padding:.45rem .65rem; border-radius:6px; cursor:pointer; font-size:.75rem; display:inline-flex; align-items:center; gap:.35rem; }
  .btn-small.primary { background:#2563eb; color:#fff; }
  .btn-small:hover { filter:brightness(1.15); }
</style>