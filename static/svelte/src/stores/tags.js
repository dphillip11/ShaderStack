import { derived, writable } from 'svelte/store';
import { isOffline } from './user';

export const tags = writable([]);

export async function loadTags() {
  if (isOffline()) {
    tags.set([]);
  } else {
    tags.set(await apiGet('/api/tags'));
  }
}

export const availableTags = derived(tags, $tags => 
  $tags.map(t => t.name || t.Name).sort()
);

