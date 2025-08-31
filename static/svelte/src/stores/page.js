import { writable} from 'svelte/store';

export const pageState = writable({
  page: 'browse', // 'editor' | 'browse'
});

export function BrowsePage() {
  pageState.set({ page: 'browse' });
}

export function EditorPage() {
  pageState.set({ page: 'editor' });
}