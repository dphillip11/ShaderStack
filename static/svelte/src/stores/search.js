import { writable, get } from 'svelte/store';

export const filters = writable({
    query: '',
    tags: [],
    user_id: null,
    limit: 20,
    offset: 0,
});

export function clearFilters() {
    filters.set({
        query: '',
        tags: [],
        user_id: null,
        limit: 20,
        offset: 0,
    });
}

export function setQuery(query) {
  filters.update(f => ({ ...f, query }));
  console.log("Filters updated:", get(filters));
}

export function filterByUserId(user_id) {
    filters.update(f => ({ ...f, user_id }));
    console.log("Filters updated:", get(filters));
}

export function removeUserIdFilter() {
    filters.update(f => ({ ...f, user_id: null }));
}

export function filterByTag(tag) {
    filters.update(f => {
        const tags = f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag];
        return { ...f, tags};
    });
}

export function removeTagFilter(tag) {
    filters.update(f => {
        const tags = f.tags.filter(t => t !== tag);
        return { ...f, tags };
    });
}

export function toggleTagFilter(tag) {
  if (tag in filters.tags) {
    removeTagFilter(tag);
  } else {
    filterByTag(tag);
  }
}

// Pagination helpers
export function nextPage() {
  filters.update(f => ({
    ...f,
    offset: f.offset + f.limit
  }));
}

export function prevPage() {
  filters.update(f => ({
    ...f,
    offset: Math.max(0, f.offset - f.limit)
  }));
}

export function resetPagination() {
  filters.update(f => ({
    ...f,
    offset: 0
  }));
}




