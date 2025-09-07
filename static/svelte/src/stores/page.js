import { writable, get} from 'svelte/store';
import {filters, clearFilters} from '../stores/search.js';
import {user} from '../stores/user.js';
import {activeShaderID} from '../stores/active_shader.js';
import { DEFAULT_FILTERS } from '../constants.js';

export const pageState = writable({
  page: 'browse', // 'editor' | 'browse'
});

export function BrowsePage() {
  pageState.set({ page: 'browse' });
  clearFilters();
}

export function EditorPage(shaderId) {
  activeShaderID.set(shaderId);
  pageState.set({ page: 'editor' });
}

export function MyShadersPage() {
  const user_id = get(user).user_id;
  filters.update(currentFilters => ({ ...currentFilters, user_id }));
  pageState.set({ page: 'browse' });
}