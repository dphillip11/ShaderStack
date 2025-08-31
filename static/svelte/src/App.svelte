<script>
  import { onMount } from 'svelte';
  import BrowsePage from './components/BrowsePage.svelte';
  import EditorPage from './components/EditorPage.svelte';
  import Navbar from './components/Navbar.svelte';
  import AuthBar from './components/AuthBar.svelte';
  import { authActions, navigationActions } from './stores/actions.js';
  import { currentPage, authLoading } from './stores/selectors.js';

  let appLoading = true;

  // Use centralized selectors
  $: page = $currentPage;
  $: authIsLoading = $authLoading;

  onMount(async () => {
    console.log('App.svelte: Starting centralized SPA initialization...');
    
    try {
      // Initialize authentication through centralized actions
      await authActions.initAuth();
      console.log('App.svelte: Auth initialized via centralized store');
      
      // Initialize navigation through centralized actions
      navigationActions.initNavigation();
      console.log('App.svelte: Navigation initialized via centralized store');
      
    } catch (error) {
      console.error('App.svelte: Initialization failed:', error);
    } finally {
      appLoading = false;
    }
  });
</script>

{#if appLoading || authIsLoading}
  <div class="loading-screen">
    <div class="loading-content">
      <h2>WebGPU Shader Editor</h2>
      <div class="loading-spinner"></div>
      <p>Initializing application...</p>
    </div>
  </div>
{:else}
  <div class="app-layout">
    <Navbar>
      <div slot="auth">
        <AuthBar />
      </div>
    </Navbar>
    
    <main class="main-content">
      {#if page === 'browse'}
        <BrowsePage />
      {:else if page === 'editor'}
        <EditorPage />
      {:else}
        <div class="placeholder">Page {page} not yet migrated to Svelte.</div>
      {/if}
    </main>
    
    <footer class="footer">
      <div class="footer-content">
        <p>&copy; 2025 ShaderStack.</p>
      </div>
    </footer>
  </div>
{/if}

<style>
  .app-layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .main-content {
    flex: 1;
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }

  .footer {
    background-color: #f8f9fa;
    border-top: 1px solid #e9ecef;
    padding: 1rem 0;
    margin-top: auto;
  }

  .footer-content {
    max-width: 1200px;
    margin: 0 auto;
    text-align: center;
    color: #6c757d;
    font-size: 0.9rem;
  }

  .loading-screen {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .loading-content {
    text-align: center;
    max-width: 400px;
    padding: 2rem;
  }

  .loading-content h2 {
    margin-bottom: 2rem;
    font-size: 2rem;
    font-weight: 300;
  }

  .loading-spinner {
    width: 50px;
    height: 50px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top: 3px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 1rem auto;
  }

  .loading-content p {
    margin-top: 1rem;
    opacity: 0.8;
    font-size: 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .placeholder { 
    padding: 2rem; 
    font-style: italic; 
    opacity: .7; 
  }

  @media (max-width: 768px) {
    .main-content {
      padding: 1rem;
    }
  }
</style>