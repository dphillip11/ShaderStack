import { writable, get} from 'svelte/store';
import {filters} from '../stores/search.js';
import {user} from '../stores/user.js';
import {activeShaderID} from '../stores/active_shader.js';

export const pageState = writable({
  page: 'browse', // 'editor' | 'browse'
});

export function BrowsePage() {
  pageState.set({ page: 'browse' });
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