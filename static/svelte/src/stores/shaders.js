import { writable, derived } from 'svelte/store';
import { apiGet } from './api.js';

// Raw shaders collection
export const shaders = writable([]); // [{ id, name, author, shader_scripts:[{code}], tags:[{name}] }]
// Tag list (canonical)
export const tags = writable([]);
// Filter criteria (single source of truth for browse page state)
export const shaderFilters = writable({ name: '', tags: [] });

// Derived: filtered shaders applying current filters
export const filteredShaders = derived([shaders, shaderFilters], ([all, f]) => {
  const nameQ = f.name.trim().toLowerCase();
  return all.filter(s => {
    if (nameQ) {
      const codeSample = s.shader_scripts?.[0]?.code || '';
      if (!s.name.toLowerCase().includes(nameQ) && !codeSample.toLowerCase().includes(nameQ)) return false;
    }
    if (f.tags.length) {
      const shaderTagNames = (s.tags || s.Tags || []).map(t => t.name || t.Name);
      if (!f.tags.every(t => shaderTagNames.includes(t))) return false;
    }
    return true;
  });
});

// Derived: unique tags from server (fallback to aggregating shader tags)
export const availableTags = derived([tags, shaders], ([explicit, all]) => {
  if (explicit.length) return explicit.map(t => t.name || t.Name);
  const set = new Set();
  all.forEach(s => (s.tags || s.Tags || []).forEach(t => set.add(t.name || t.Name)));
  return Array.from(set).sort();
});

let loaded = false;
export async function loadInitialShaders() {
  if (loaded) return;
  
  // Check if we're on the "My Shaders" page with pre-loaded data
  if (typeof window !== 'undefined' && window.myShaders) {
    const myData = window.myShaders;
    shaders.set(myData.shaders || []);
    // For "My Shaders" page, we don't need to load all tags from API
    // Just extract tags from the user's shaders
    const userTags = new Set();
    myData.shaders.forEach(shader => {
      (shader.tags || shader.Tags || []).forEach(tag => {
        userTags.add(tag.name || tag.Name);
      });
    });
    tags.set(Array.from(userTags).sort().map(name => ({ name })));
    syncFiltersFromURL();
    loaded = true;
    return;
  }
  
  try {
    const [shaderData, tagData] = await Promise.all([
      apiGet('/api/shaders'),
      apiGet('/api/tags').catch(() => [])
    ]);
    shaders.set(shaderData || []);
    tags.set(tagData || []);
    syncFiltersFromURL();
    loaded = true;
  } catch (e) {
    console.error('Failed loading shaders:', e);
  }
}

// URL sync (separate pure helpers)
function parseURLFilters() {
  const p = new URLSearchParams(location.search);
  return {
    name: p.get('name') || '',
    tags: p.getAll('tags')
  };
}

export function syncFiltersFromURL() {
  shaderFilters.update(f => ({ ...f, ...parseURLFilters() }));
}

export function applyFilters(partial) {
  shaderFilters.update(f => ({ ...f, ...partial }));
  const f = parseCurrentFilters();
  const params = new URLSearchParams();
  if (f.name) params.set('name', f.name);
  f.tags.forEach(t => params.append('tags', t));
  const qs = params.toString();
  const newURL = location.pathname + (qs ? '?' + qs : '');
  history.replaceState(null, '', newURL);
}

function parseCurrentFilters() {
  let value; shaderFilters.subscribe(v => value = v)();
  return value;
}

export function toggleTag(tag) {
  shaderFilters.update(f => {
    const exists = f.tags.includes(tag);
    const tags = exists ? f.tags.filter(t => t !== tag) : [...f.tags, tag];
    return { ...f, tags };
  });
  applyFilters({});
}

export function clearSearch() { applyFilters({ name: '' }); }
export function clearAllFilters() { applyFilters({ name: '', tags: [] }); }
