import { writable } from 'svelte/store';

// list of all tags
export const tags = writable([]);

export async function fetchTags() {
  try {
    // Load tags list first
    const tagData = await apiGet('/api/tags');
    tags.set(tagData || []);
  } catch (e) {
    console.error('Failed to fetch tags:', e);
  }
}