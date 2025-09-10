<script>
    // props include current tags, options, edit, create
    export let tags = [];
    export let options = [];
    export let edit = false;
    export let create = false;
    export let tagFactory = null;
    export let field = "";

    // Component methods to modify the tags
    function addTag(tag) {
        let newTag = tagFactory ? tagFactory(tag) : tag;
        if (tags.includes(newTag)) return;
        tags = [...tags, newTag];
    }
    
    function removeTag(tag) {
        tags = tags.filter(t => t !== tag);
    }

    function toggleTag(tag) {
        if (tags.includes(tag)) {
            removeTag(tag);
        } else {
            addTag(tag);
        }
    }
</script>

<div class="tags">
  {#if create}
    <input
      class="tag-input"
      placeholder="Add tag"
      on:keydown={(e) => e.key === 'Enter' && addTag(e.target.value) && (e.target.value = '')}
    />
  {/if}

  {#each tags as tag, i}
    {#if !options.includes(tag)}
        <button class="tag {tags.includes(tag) ? 'active' : ''}" on:click={() =>{if (edit){toggleTag(tag)}}}>{field ? tag[field] : tag}</button>
    {/if}
  {/each}

  {#each options as tag}
    <button class="tag {tags.includes(tag) ? 'active' : ''}" on:click={() =>{if (edit){toggleTag(tag)}}}>{field ? tag[field] : tag}</button>
  {/each}
</div>

<style>
    .tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.5rem;
    }

.tag{
    cursor: pointer;
    transition: all 0.2s ease;
    background-color: #f7fafc;
    color: #718096;
    padding: 0.5rem 1rem;
    border: 2px solid #e2e8f0;
    border-radius: 20px;
    font-size: 0.875rem;
    font-weight: 500;
    user-select: none;
  }

  .tag-input {
    padding: 0.5rem 1rem;
    border: 2px solid #e2e8f0;
    border-radius: 20px;
    font-size: 0.875rem;
    font-weight: 500;
    color: #718096;
    background-color: #f7fafc;
    transition: all 0.2s ease;
  }

  .tag:hover {
    background-color: #edf2f7;
    border-color: #cbd5e0;
    transform: translateY(-1px);
  }

  .tag.active {
    background-color: #3182ce;
    color: white;
    border-color: #2c5aa0;
    box-shadow: 0 4px 12px rgba(49, 130, 206, 0.3);
    transform: translateY(-1px);
  }

  .tag.active:hover {
    background-color: #2c5aa0;
    border-color: #2a4a8b;
  }
</style>