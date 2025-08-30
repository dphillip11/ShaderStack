<script>
  import { createEventDispatcher } from 'svelte';
  import { login } from '../stores/auth.js';
  const dispatch = createEventDispatcher();
  let username = '';
  let password = '';
  let loading = false;
  let error = '';
  let show = false;
  export function open(){ 
    console.log('LoginModal open() called, current show:', show);
    show = true; 
    console.log('LoginModal show set to:', show);
    error=''; 
    username=''; 
    password=''; 
    // Force a DOM update check
    setTimeout(() => {
      const modalEl = document.querySelector('.modal');
      console.log('Modal DOM element found:', !!modalEl, modalEl);
      if (modalEl) {
        console.log('Modal computed styles:', window.getComputedStyle(modalEl).display, window.getComputedStyle(modalEl).zIndex);
      }
    }, 10);
  }
  function close(){ 
    if(loading)return; 
    console.log('LoginModal close() called');
    show = false; 
    dispatch('close'); 
  }
  async function submit(){
    if(username.length<3||password.length<3) return;
    loading=true; error='';
    try { 
      await login(username.trim(), password); 
      close(); 
      dispatch('loggedIn');
      // Refresh the page to update authentication state throughout the app
      window.location.reload();
    }
    catch(e){ error = e.message || 'Login failed'; }
    loading=false;
  }
  function onKey(e){ if(e.key==='Escape') close(); if(e.key==='Enter') submit(); }
</script>
{#if show}
<div class="modal svelte-modal-overlay" on:keydown|self={onKey} role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <div class="modal-content">
    <div class="modal-header">
      <h2 id="modal-title"><i class="fas fa-sign-in-alt"></i> Login</h2>
      <button type="button" class="modal-close" on:click={close} disabled={loading}>×</button>
    </div>
    {#if error}<div class="error-message">{error}</div>{/if}
    <div class="form-group">
      <label for="username-input">Username</label>
      <input id="username-input" bind:value={username} placeholder="demo" minlength="3" autocomplete="username" disabled={loading} />
    </div>
    <div class="form-group">
      <label for="password-input">Password</label>
      <input id="password-input" type="password" bind:value={password} placeholder="••••" minlength="3" autocomplete="current-password" disabled={loading} />
    </div>
    <div class="form-actions">
      <button class="btn-primary" on:click={submit} disabled={loading || username.length<3 || password.length<3}>
        {#if loading}
          <i class="fas fa-spinner fa-spin"></i> Logging in...
        {:else}
          <i class="fas fa-sign-in-alt"></i> Login
        {/if}
      </button>
      <button type="button" class="btn-secondary" on:click={() => { username='demo'; password='demo123'; submit(); }} disabled={loading}>Demo</button>
    </div>
    <p class="login-help"><small>Demo: demo / demo123</small></p>
  </div>
</div>
{/if}
<style>
  :global(.svelte-modal-overlay) { 
    position: fixed !important; 
    inset: 0 !important; 
    display: flex !important; 
    align-items: center !important; 
    justify-content: center !important; 
    backdrop-filter: blur(3px) !important; 
    background: rgba(0,0,0,.6) !important; 
    z-index: 99999 !important; 
  }
  .modal-content { background:#1e2530; color:#fff; padding:1.25rem 1.5rem; width:340px; border-radius:10px; display:flex; flex-direction:column; gap:.75rem; box-shadow:0 10px 30px rgba(0,0,0,.4); }
  .modal-header { display:flex; justify-content:space-between; align-items:center; }
  .modal-close { background:none; border:none; font-size:1.25rem; color:#ccc; cursor:pointer; }
  .form-group { display:flex; flex-direction:column; gap:.35rem; }
  .form-group input { padding:.55rem .7rem; border-radius:6px; border:1px solid #334; background:#243040; color:#fff; }
  .form-group input:focus { outline:2px solid #3b82f6; }
  .form-actions { display:flex; gap:.5rem; }
  .btn-primary, .btn-secondary { flex:1; display:inline-flex; align-items:center; justify-content:center; gap:.4rem; padding:.6rem .8rem; font-size:.9rem; font-weight:600; border-radius:6px; cursor:pointer; border:none; }
  .btn-primary { background:#2563eb; color:#fff; }
  .btn-primary:disabled { opacity:.6; cursor:not-allowed; }
  .btn-secondary { background:#374151; color:#e5e7eb; }
  .btn-secondary:hover { background:#4b5563; }
  .error-message { background:#7f1d1d; color:#fecaca; padding:.5rem .6rem; border-radius:6px; font-size:.8rem; }
  .login-help { margin:0; text-align:center; opacity:.6; }
</style>