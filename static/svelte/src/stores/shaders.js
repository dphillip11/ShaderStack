import { get } from 'svelte/store';
import { filters } from './search.js';
import { dataManager} from './dataManager.js';

// Auto-fetch shaders when filters change
let searchTimeout;
filters.subscribe($filters => {
  // Debounce API calls to avoid too many requests during typing
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    dataManager.loadShaders($filters);
  }, 300); // 300ms debounce
});

// Force refresh
export async function refreshShaders() {
  const currentFilters = get(filters);
  await dataManager.loadShaders(currentFilters);
}