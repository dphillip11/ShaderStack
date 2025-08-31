import { derived } from 'svelte/store';
import { appState } from './app.js';

// Auth selectors
export const isAuthenticated = derived(
  appState, 
  $state => $state.auth.isAuthenticated
);

export const currentUser = derived(
  appState, 
  $state => $state.auth.user
);

export const authUsername = derived(
  appState, 
  $state => $state.auth.username
);

export const authUserId = derived(
  appState, 
  $state => $state.auth.user_id
);

export const authLoading = derived(
  appState, 
  $state => $state.auth.loading
);

export const authError = derived(
  appState, 
  $state => $state.auth.error
);

// Navigation selectors
export const currentRoute = derived(
  appState, 
  $state => ({
    path: $state.navigation.currentPath,
    page: $state.navigation.currentPage,
    params: $state.navigation.params
  })
);

export const currentPage = derived(
  appState, 
  $state => $state.navigation.currentPage
);

export const isMyShaders = derived(
  appState, 
  $state => $state.navigation.currentPath === '/my'
);

// Shader selectors
export const shadersList = derived(
  appState, 
  $state => $state.shaders.list
);

export const filteredShaders = derived(
  appState, 
  $state => $state.shaders.filteredList
);

export const myShaders = derived(
  appState, 
  $state => $state.shaders.myShaders
);

export const activeShader = derived(
  appState, 
  $state => $state.shaders.activeShader
);

export const shadersLoading = derived(
  appState, 
  $state => $state.shaders.loading
);

export const shadersError = derived(
  appState, 
  $state => $state.shaders.error
);

export const availableTags = derived(
  appState, 
  $state => $state.shaders.tags
);

// Filter selectors
export const searchQuery = derived(
  appState, 
  $state => $state.filters.searchQuery
);

export const selectedTags = derived(
  appState, 
  $state => $state.filters.selectedTags
);

export const shaderFilters = derived(
  appState, 
  $state => ({
    searchQuery: $state.filters.searchQuery,
    selectedTags: $state.filters.selectedTags,
    userFilter: $state.filters.userFilter
  })
);

// Editor selectors
export const editorState = derived(
  appState, 
  $state => ({
    activeScript: $state.editor.activeScript,
    activeScriptId: $state.editor.activeScriptId,
    scripts: $state.editor.scripts,
    shader: $state.editor.shader,
    isCompiling: $state.editor.isCompiling,
    isRunning: $state.editor.isRunning,
    isSaving: $state.editor.isSaving,
    isInitializing: $state.editor.isInitializing,
    webGPUReady: $state.editor.webGPUReady,
    error: $state.editor.error
  })
);

export const activeScript = derived(
  appState, 
  $state => $state.editor.activeScript
);

export const editorScripts = derived(
  appState, 
  $state => $state.editor.scripts
);

export const editorShader = derived(
  appState, 
  $state => $state.editor.shader
);

export const consoleMessages = derived(
  appState, 
  $state => $state.editor.consoleMessages
);

export const isCompiling = derived(
  appState, 
  $state => $state.editor.isCompiling
);

export const isRunning = derived(
  appState, 
  $state => $state.editor.isRunning
);

export const isSaving = derived(
  appState, 
  $state => $state.editor.isSaving
);

export const isInitializing = derived(
  appState, 
  $state => $state.editor.isInitializing
);

export const webGPUReady = derived(
  appState, 
  $state => $state.editor.webGPUReady
);

export const editorActiveScript = derived(
  appState, 
  $state => $state.editor.activeScript
);

export const editorActiveScriptId = derived(
  appState, 
  $state => $state.editor.activeScriptId
);

export const editorConsole = derived(
  appState, 
  $state => $state.editor.consoleMessages
);

export const editorRunning = derived(
  appState, 
  $state => $state.editor.isRunning
);

export const editorInitializing = derived(
  appState, 
  $state => $state.editor.isInitializing
);

export const editorSaving = derived(
  appState, 
  $state => $state.editor.isSaving
);

export const currentShader = derived(
  appState, 
  $state => $state.editor.shader
);

// UI selectors
export const deleteConfirmModal = derived(
  appState, 
  $state => $state.ui.modals.deleteConfirm
);

export const loginModal = derived(
  appState, 
  $state => $state.ui.modals.login
);

export const notifications = derived(
  appState, 
  $state => $state.ui.notifications
);

// Complex derived selectors
export const pageTitle = derived(
  [currentPage, isMyShaders],
  ([$page, $isMyShaders]) => {
    if ($page === 'browse') {
      return $isMyShaders ? 'My Shaders' : 'Browse Shaders';
    } else if ($page === 'editor') {
      return 'Shader Editor';
    }
    return 'WebGPU Shader Editor';
  }
);

export const canEditShader = derived(
  [isAuthenticated, authUserId, editorShader],
  ([$authenticated, $userId, $shader]) => {
    if (!$authenticated) return false;
    if (!$shader || !$shader.id) return true; // New shader
    return $shader.user_id === $userId;
  }
);

export const displayShaders = derived(
  [filteredShaders, isMyShaders, myShaders],
  ([$filtered, $isMyShaders, $myShaders]) => {
    return $isMyShaders ? $myShaders : $filtered;
  }
);