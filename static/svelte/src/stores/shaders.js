import { writable, derived } from 'svelte/store';
import { apiGet } from '../repository/backend_api.js';
import { filters } from './search.js';

// Raw shaders collection from API
export const shaders = writable([]);

// Loading state
export const loading = writable(false);

// Auto-fetch shaders when filters change
let searchTimeout;

filters.subscribe($filters => {
  // Debounce API calls to avoid too many requests during typing
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    fetchShaders($filters);
  }, 300); // 300ms debounce
});

// Fetch shaders from API with current filters
async function fetchShaders(filterParams) {
  loading.set(true);
  
  try {
    const params = new URLSearchParams();
    
    // Build query parameters
    if (filterParams.query) params.set('query', filterParams.query);
    if (filterParams.user_id) params.set('user_id', filterParams.user_id);
    if (filterParams.tags?.length) {
      filterParams.tags.forEach(tag => params.append('tags', tag));
    }
    if (filterParams.limit) params.set('limit', filterParams.limit);
    if (filterParams.offset) params.set('offset', filterParams.offset);
    
    const queryString = params.toString();
    const url = `/api/shaders${queryString ? '?' + queryString : ''}`;
    
    const shaderData = await apiGet(url);
    shaders.set(shaderData || []);
    
  } catch (e) {
    console.error('Failed loading shaders:', e);
    shaders.set([]);
  } finally {
    loading.set(false);
  }
}

// Force refresh
export async function refreshShaders() {
  const currentFilters = get(filters);
  await fetchShaders(currentFilters);
}