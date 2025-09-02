<script>
  import BrowsePage from './components/BrowsePage.svelte';
  //import EditorPage from './components/EditorPage.svelte';
  import { pageState } from './stores/page.js';
  import NavBar from './components/NavBar.svelte';
</script>

<NavBar/>
{#if $pageState.page === 'browse'}  <!-- Fixed: Added $ for reactive store -->
  <BrowsePage />
{:else if $pageState.page === 'editor'}  <!-- Fixed: Added $ for reactive store -->
  <EditorPage />
{:else}
  <h3>404 : Page not found</h3>
{/if}