<script>
  import { onMount } from 'svelte';
  import BrowsePage from './components/BrowsePage.svelte';
  import EditorPage from './components/EditorPage.svelte';
  import { shaders, loadInitialShaders } from './stores/shaders.js';

  let page = 'browse';

  function derivePage(path){
    if(path === '/' || path === '') return 'browse';
    if(path === '/my') return 'browse';
    if(path === '/new') return 'editor';
    if(/^\/[0-9]+$/.test(path)) return 'editor';
    return 'browse';
  }

  function setPageFromLocation(){
    const p = derivePage(window.location.pathname);
    if(page !== p){ page = p; }
  }

  onMount(() => {
    console.log('App.svelte onMount - window.__AUTH__:', window.__AUTH__);
    console.log('App.svelte onMount - window.__PAGE__:', window.__PAGE__);
    console.log('App.svelte onMount - window.shaderData:', window.shaderData);
    
    if (window.__PAGE__) page = window.__PAGE__;
    else setPageFromLocation();
    if (page === 'browse') loadInitialShaders();
    window.addEventListener('popstate', setPageFromLocation);
    // Removed click interception for now to allow full page loads (ensures shaderData + auth state)
  });

  $: if (page === 'browse') { /* ensure shaders loaded when returning */ loadInitialShaders(); }
</script>

{#if page === 'browse'}
  <BrowsePage />
{:else if page === 'editor'}
  <EditorPage />
{:else}
  <div class="placeholder">Page {page} not yet migrated to Svelte.</div>
{/if}

<style>
  .placeholder { padding: 2rem; font-style: italic; opacity: .7; }
</style>