<script>
  export let shader;
  const id = shader.id ?? shader.ID;
  const name = shader.name ?? shader.Name;
  const author = shader.author ?? shader.Author;
  const scripts = shader.shader_scripts ?? shader.ShaderScripts ?? [];
  const firstCode = scripts[0]?.code ?? scripts[0]?.Code ?? '';
  const tagObjs = shader.tags ?? shader.Tags ?? [];
  const tagNames = tagObjs.map(t => t.name || t.Name);
</script>

<div class="shader-card" data-shader-id={id}>
  <div class="shader-header">
    <h3 class="shader-title"><a href="/{id}">{name}</a></h3>
    <div class="shader-meta">
      {#if author}<span class="author">by {author}</span>{/if}
      <span class="shader-id">#{id}</span>
    </div>
  </div>
  <div class="shader-preview"><pre><code class="language-wgsl">{firstCode}</code></pre></div>
  {#if tagNames.length}
    <div class="shader-tags">
      {#each tagNames as t}<span class="tag">{t}</span>{/each}
    </div>
  {/if}
  <div class="shader-actions">
    <a href="/{id}" class="btn-secondary"><i class="fas fa-eye"></i> View</a>
  </div>
</div>

<style>
  .shader-card {
    background: white;
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    overflow: hidden;
    transition: transform 0.3s, box-shadow 0.3s;
  }

  .shader-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 20px rgba(0,0,0,0.15);
  }

  .shader-header {
    padding: 1.5rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .shader-title a {
    color: #2d3748;
    text-decoration: none;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .shader-title a:hover {
    color: #667eea;
  }

  .shader-meta {
    margin-top: 0.5rem;
    display: flex;
    justify-content: space-between;
    color: #718096;
    font-size: 0.9rem;
  }

  .shader-preview {
    padding: 1rem;
    background-color: #f7fafc;
    max-height: 200px;
    overflow: hidden;
  }

  .shader-preview pre {
    margin: 0;
    font-size: 0.8rem;
    line-height: 1.4;
  }

  .shader-preview code {
    background: none;
    padding: 0;
  }

  .shader-tags {
    padding: 1rem 1.5rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tag {
    background-color: #667eea;
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 15px;
    font-size: 0.85rem;
    font-weight: 500;
  }

  .shader-actions {
    padding: 1rem 1.5rem;
    display: flex;
    gap: 0.5rem;
    background-color: #f8fafc;
  }
</style>
