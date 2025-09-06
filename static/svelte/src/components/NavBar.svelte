<script>
    import { user } from '../stores/user.js';
    import { BrowsePage, EditorPage, MyShadersPage } from '../stores/page.js';
    import AuthBar from './AuthBar.svelte';

  $: authenticated = $user.is_authenticated;
  $: username = $user.username;
</script>

<header class="navbar">
  <div class="nav-container">
    <div class="nav-brand">
      <button class="brand-link" on:click={BrowsePage}>
        <i class="fas fa-cube"></i> ShaderStack
      </button>
    </div>
    
    <nav class="nav-menu">
      <button class="nav-link" on:click={BrowsePage}>
        <i class="fas fa-search"></i> Browse
      </button>
      
      {#if authenticated}
        <button class="nav-link" on:click={BrowsePage}>
          <i class="fas fa-user"></i> My Shaders
        </button>
        <button class="nav-link" on:click={EditorPage}>
          <i class="fas fa-plus"></i> New Shader
        </button>
      {/if}
    </nav>
    
    <div class="nav-auth">
      <AuthBar/>
    </div>
  </div>
</header>

<style>
  header{
    margin:-1.0rem;
    margin-bottom:1.0rem;
  }

  .navbar {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 0;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    position: sticky;
    top: 0;
    z-index: 1000;
  }

  .nav-container {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 2rem;
    height: 60px;
  }

  .nav-brand .brand-link {
    background: none;
    border: none;
    color: white;
    font-size: 1.5rem;
    font-weight: bold;
    text-decoration: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: opacity 0.2s;
  }

  .nav-brand .brand-link:hover {
    opacity: 0.8;
  }

  .nav-menu {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .nav-link {
    background: none;
    border: none;
    color: white;
    text-decoration: none;
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    transition: background-color 0.2s;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
  }

  .nav-link:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .nav-auth {
    display: flex;
    align-items: center;
  }

  @media (max-width: 768px) {
    .nav-container {
      padding: 0 1rem;
      flex-wrap: wrap;
      height: auto;
      min-height: 60px;
    }

    .nav-menu {
      order: 3;
      width: 100%;
      justify-content: center;
      padding: 0.5rem 0;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      margin-top: 0.5rem;
    }

    .nav-link {
      font-size: 0.8rem;
      padding: 0.25rem 0.75rem;
    }
  }
</style>