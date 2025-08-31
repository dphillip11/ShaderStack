import { derived } from 'svelte/store';
import { tags } from './dataManager.js';

// Derived: available tags as sorted array of names
export const availableTags = derived(tags, $tags => 
  $tags.map(t => t.name || t.Name).sort()
);