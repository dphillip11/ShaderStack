<script>
  import { createEventDispatcher } from 'svelte';
  import { login, register } from '../stores/user.js';

  const dispatch = createEventDispatcher();

  export let show = false;
  let username = '';
  let password = '';
  let confirmPassword = '';
  let loading = false;
  let error = '';
  let mode = 'login'; // 'login' | 'register'

  export function open() {
    show = true;
    error = '';
    username = '';
    password = '';
    confirmPassword = '';
    mode = 'login';
  }

  function close() {
    show = false;
    dispatch('close');
  }

  async function submit() {
    error = '';
    if (!username || username.trim().length < 3) {
      error = 'Username must be at least 3 characters';
      return;
    }
    if (!password || password.length < 3) {
      error = 'Password must be at least 3 characters';
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      error = 'Passwords do not match';
      return;
    }

    loading = true;
    try {
      if (mode === 'login') {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password);
      }
      dispatch('success', { mode, username: username.trim() });
      close();
    } catch (e) {
      error = e && e.message ? e.message : String(e);
    } finally {
      loading = false;
    }
  }
</script>

{#if show}
  <div class="svelte-modal-overlay" on:click={close} role="button" tabindex="0" on:keydown={(e) => e.key === 'Escape' && close()}>
    <div class="modal-content" on:click|stopPropagation role="dialog" aria-modal="true" aria-label="Authentication">
      <div class="modal-header" role="tablist" aria-label="Authentication tabs">
        <div style="display:flex;gap:.5rem;align-items:center;">
          <button type="button" class="tab-btn" class:active={mode === 'login'} on:click={() => { mode = 'login'; error = ''; }}>Login</button>
          <button type="button" class="tab-btn" class:active={mode === 'register'} on:click={() => { mode = 'register'; error = ''; }}>Register</button>
        </div>
        <button class="modal-close" on:click={close} aria-label="Close">✕</button>
      </div>

      {#if error}
        <div class="error-message">{error}</div>
      {/if}

      <div class="form-group">
        <label for="login-username">Username</label>
        <input id="login-username" type="text" bind:value={username} placeholder="username" />
      </div>

      <div class="form-group">
        <label for="password-input">Password</label>
        <input id="password-input" type="password" bind:value={password} placeholder="••••" minlength="3" autocomplete="current-password" disabled={loading} />
      </div>

      {#if mode === 'register'}
        <div class="form-group">
          <label for="login-confirm">Confirm password</label>
          <input id="login-confirm" type="password" bind:value={confirmPassword} placeholder="confirm password" />
        </div>
      {/if}

      <div class="form-actions">
        <button class="btn-primary" on:click={submit} disabled={loading} aria-disabled={loading}>
          {#if loading}Working...{:else}{mode === 'login' ? 'Login' : 'Register'}{/if}
        </button>
        <button class="btn-secondary" on:click={close} disabled={loading}>Cancel</button>
      </div>

      <p class="login-help"><small>Demo: demo / demo123</small></p>
    </div>
  </div>
{/if}

<style>
  :global(.svelte-modal-overlay) {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100vw !important;
    min-height: 100vh !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 1rem;
    box-sizing: border-box;
    backdrop-filter: blur(3px) !important;
    background: rgba(0,0,0,.6) !important;
    z-index: 99999 !important;
    overflow-y: auto !important;
  }

  .modal-content {
    margin: auto;
    max-width: 90vw;
    width: 340px;
    background: #1e2530;
    color: #fff;
    padding: 1.25rem 1.5rem;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    gap: .75rem;
    box-shadow: 0 10px 30px rgba(0,0,0,.4);
  }
  .modal-header { display: flex; justify-content: space-between; align-items: center; }
  .modal-close { background: none; border: none; font-size: 1.25rem; color: #ccc; cursor: pointer; }
  .form-group { display: flex; flex-direction: column; gap: .35rem; }
  .form-group input { padding: .55rem .7rem; border-radius: 6px; border: 1px solid #334; background: #243040; color: #fff; }
  .form-group input:focus { outline: 2px solid #3b82f6; }
  .form-actions { display: flex; gap: .5rem; }
  .btn-primary, .btn-secondary { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: .4rem; padding: .6rem .8rem; font-size: .9rem; font-weight: 600; border-radius: 6px; cursor: pointer; border: none; }
  .btn-primary { background: #2563eb; color: #fff; }
  .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
  .btn-secondary { background: #374151; color: #e5e7eb; }
  .btn-secondary:hover { background: #4b5563; }
  .error-message { background: #7f1d1d; color: #fecaca; padding: .5rem .6rem; border-radius: 6px; font-size: .8rem; }
  .login-help { margin: 0; text-align: center; opacity: .6; }
  .tab-btn { background: transparent; border: none; color: #cbd5e1; padding: .35rem .6rem; border-radius: 6px; cursor: pointer; }
  .tab-btn.active { background: rgba(255,255,255,0.04); color: #fff; }
</style>