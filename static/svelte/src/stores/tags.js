import { derived, writable, get } from 'svelte/store';
import { isOffline } from './user';
import { apiGet } from '../utils/api.js';

export const tags = writable([]);

export async function LoadTags() {
  if (get(isOffline)) {
    tags.set([]);
  } else {
    tags.set(await apiGet('/api/tags'));
  }
}

export const availableTags = derived(tags, $tags => 
  $tags.map(t => t.name || t.Name).sort()
);
