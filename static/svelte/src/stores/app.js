import { writable } from 'svelte/store';

// Central application state
const initialState = {
  // Authentication state
  auth: {
    isAuthenticated: false,
    user: null,
    username: null,
    user_id: null,
    loading: false,
    error: null
  },
  
  // Navigation state  
  navigation: {
    currentPath: '/',
    currentPage: 'browse',
    params: {}
  },
  
  // Shader data state
  shaders: {
    list: [],
    filteredList: [],
    myShaders: [],
    activeShader: null,
    loading: false,
    error: null,
    tags: []
  },
  
  // Search/filter state
  filters: {
    user_id: null,
    searchQuery: '',
    selectedTags: [],
    userFilter: null
  },
  
  // Editor state
  editor: {
    activeScript: null,
    activeScriptId: null,
    scripts: [],
    shader: null,
    isCompiling: false,
    isRunning: false,
    isSaving: false,
    isInitializing: false,
    webGPUReady: false,
    consoleMessages: [],
    error: null
  },
  
  // UI state
  ui: {
    modals: {
      deleteConfirm: { show: false, shader: null, isDeleting: false },
      login: { show: false }
    },
    notifications: []
  }
};

// Create the central store
export const appState = writable(initialState);

// Helper function to update state immutably
export function updateAppState(updater) {
  appState.update(updater);
  // Temporarily disable debug logging to prevent performance issues during state updates
  // if (DEBUG) {
  //   console.log('State updated:', get(appState));
  // }
}

// Debug helper to log state changes
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  appState.subscribe(state => {
    console.log('App State Updated:', state);
  });
}