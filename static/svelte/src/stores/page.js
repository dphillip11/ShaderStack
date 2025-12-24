import { writable, get} from 'svelte/store';
import {filters, clearFilters} from '../stores/search.js';
import {user} from '../stores/user.js';
import { NewShader, activeShader } from '../stores/activeShader.js';
import { resetWorkspace } from '../adapters/workspaceAdapter.js';
import { DEFAULT_FILTERS } from '../constants.js';

export const pageState = writable({
  page: 'browse', // 'editor' | 'browse'
});

export function BrowsePage() {
  // Tear down any active WebGPU workspace when leaving editor
  try { resetWorkspace(); } catch {}
  pageState.set({ page: 'browse' });
  clearFilters();
}

export function EditorPage(shader) {
  // If switching shaders while in editor, reset GPU state to avoid stale pipelines
  try { resetWorkspace(); } catch {}
  activeShader.set(shader);
  pageState.set({ page: 'editor' });
}

export function NewShaderPage() {
  try { resetWorkspace(); } catch {}
  activeShader.set(NewShader());
  pageState.set({ page: 'editor' });
}

export function MyShadersPage() {
  try { resetWorkspace(); } catch {}
  const user_id = get(user).user_id;
  filters.update(currentFilters => ({ ...currentFilters, user_id }));
  pageState.set({ page: 'browse' });
}