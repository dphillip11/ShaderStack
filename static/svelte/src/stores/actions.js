import { get } from 'svelte/store';
import { updateAppState, appState } from './app.js';
import * as api from './api.js';

// Utility function to derive page from path
function derivePage(path) {
  if (path === '/' || path === '') return 'browse';
  if (path === '/my') return 'browse';
  if (path === '/new') return 'editor';
  if (/^\/\d+$/.test(path)) return 'editor';
  return 'browse';
}

// Utility function to extract shader ID from path
function extractShaderIdFromPath(path) {
  const match = path.match(/^\/(\d+)$/);
  return match ? parseInt(match[1]) : null;
}

// Auth Actions
export const authActions = {
  async initAuth() {
    updateAppState(state => ({
      ...state,
      auth: { ...state.auth, loading: true, error: null }
    }));

    try {
      const authInfo = await api.getAuthStatus();
      updateAppState(state => ({
        ...state,
        auth: {
          isAuthenticated: authInfo.isAuthenticated,
          user: authInfo.user || null,
          username: authInfo.username || null,
          user_id: authInfo.user_id || null,
          loading: false,
          error: null
        }
      }));

      console.log('Auth initialized:', authInfo);
    } catch (error) {
      console.error('Auth initialization failed:', error);
      updateAppState(state => ({
        ...state,
        auth: {
          ...state.auth,
          loading: false,
          error: error.message
        }
      }));
    }
  },

  async login(credentials) {
    updateAppState(state => ({
      ...state,
      auth: { ...state.auth, loading: true, error: null }
    }));

    try {
      const result = await api.login(credentials);
      updateAppState(state => ({
        ...state,
        auth: {
          isAuthenticated: true,
          user: result.user,
          username: result.username,
          user_id: result.user_id,
          loading: false,
          error: null
        },
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            login: { show: false }
          }
        }
      }));

      // Add success notification
      uiActions.addNotification('Login successful!', 'success');
    } catch (error) {
      updateAppState(state => ({
        ...state,
        auth: {
          ...state.auth,
          loading: false,
          error: error.message
        }
      }));
    }
  },

  async logout() {
    try {
      await api.logout();
      updateAppState(state => ({
        ...state,
        auth: {
          isAuthenticated: false,
          user: null,
          username: null,
          user_id: null,
          loading: false,
          error: null
        },
        shaders: {
          ...state.shaders,
          myShaders: []
        }
      }));

      uiActions.addNotification('Logged out successfully', 'info');
      
      // Navigate to home if on My Shaders page
      const currentState = get(appState);
      if (currentState.navigation.currentPath === '/my') {
        navigationActions.navigate('/');
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }
};

// Navigation Actions
export const navigationActions = {
  navigate(path) {
    const page = derivePage(path);
    const params = {};
    
    // Extract shader ID for editor routes
    if (page === 'editor') {
      const shaderId = extractShaderIdFromPath(path);
      if (shaderId) {
        params.shaderId = shaderId;
      }
    }

    updateAppState(state => ({
      ...state,
      navigation: {
        currentPath: path,
        currentPage: page,
        params
      }
    }));

    // Update browser URL
    history.pushState(null, '', path);

    // Trigger appropriate data loading based on route
    if (page === 'browse' && path === '/my') {
      shaderActions.loadMyShaders();
    } else if (page === 'browse') {
      shaderActions.loadAllShaders();
    } else if (page === 'editor') {
      if (params.shaderId) {
        editorActions.loadShader(params.shaderId);
      } else {
        editorActions.createNewShader();
      }
    }

    console.log('Navigation: navigated to', { path, page, params });
  },

  initNavigation() {
    const path = window.location.pathname;
    this.navigate(path);

    // Listen for browser back/forward
    window.addEventListener('popstate', () => {
      const currentPath = window.location.pathname;
      this.navigate(currentPath);
    });
  }
};

// Shader Actions
export const shaderActions = {
  async loadAllShaders() {
    updateAppState(state => ({
      ...state,
      shaders: { ...state.shaders, loading: true, error: null }
    }));

    try {
      // Load both shaders and tags in parallel
      const [shaders, tagsFromAPI] = await Promise.all([
        api.getShaders(),
        api.getTags().catch(() => []) // Fallback to empty array if tags API fails
      ]);
      
      // Use tags from API if available, otherwise extract from shaders
      const tags = tagsFromAPI.length > 0 ? tagsFromAPI : this.extractTags(shaders);
      
      updateAppState(state => ({
        ...state,
        shaders: {
          ...state.shaders,
          list: shaders,
          tags: tags,
          loading: false,
          error: null
        }
      }));

      // Apply current filters
      filterActions.applyFilters();
    } catch (error) {
      updateAppState(state => ({
        ...state,
        shaders: {
          ...state.shaders,
          loading: false,
          error: error.message
        }
      }));
    }
  },

  async loadMyShaders() {
    const currentState = get(appState);
    if (!currentState.auth.isAuthenticated) {
      console.log('Not authenticated, cannot load my shaders');
      return;
    }

    updateAppState(state => ({
      ...state,
      shaders: { ...state.shaders, loading: true, error: null }
    }));

    try {
      // Load both user shaders and tags in parallel
      const [shaders, tagsFromAPI] = await Promise.all([
        api.getShaders({ user_id: currentState.auth.user_id }),
        api.getTags().catch(() => []) // Fallback to empty array if tags API fails
      ]);
      
      // Use tags from API if available, otherwise extract from shaders
      const tags = tagsFromAPI.length > 0 ? tagsFromAPI : this.extractTags(shaders);
      
      updateAppState(state => ({
        ...state,
        shaders: {
          ...state.shaders,
          myShaders: shaders,
          list: shaders, // Update main list for current view
          tags: tags, // Update tags as well
          loading: false,
          error: null
        }
      }));

      // Apply current filters
      filterActions.applyFilters();
    } catch (error) {
      updateAppState(state => ({
        ...state,
        shaders: {
          ...state.shaders,
          loading: false,
          error: error.message
        }
      }));
    }
  },

  async deleteShader(shaderId) {
    updateAppState(state => ({
      ...state,
      ui: {
        ...state.ui,
        modals: {
          ...state.ui.modals,
          deleteConfirm: { ...state.ui.modals.deleteConfirm, isDeleting: true }
        }
      }
    }));

    try {
      await api.deleteShaderProject(shaderId);
      
      // Remove from all shader lists
      updateAppState(state => ({
        ...state,
        shaders: {
          ...state.shaders,
          list: state.shaders.list.filter(s => s.id !== shaderId),
          myShaders: state.shaders.myShaders.filter(s => s.id !== shaderId)
        },
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            deleteConfirm: { show: false, shader: null, isDeleting: false }
          }
        }
      }));

      // Reapply filters
      filterActions.applyFilters();
      
      uiActions.addNotification('Shader deleted successfully', 'success');
    } catch (error) {
      updateAppState(state => ({
        ...state,
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            deleteConfirm: { ...state.ui.modals.deleteConfirm, isDeleting: false }
          }
        }
      }));
      
      uiActions.addNotification(`Delete failed: ${error.message}`, 'error');
    }
  },

  extractTags(shaders) {
    const tagMap = new Map();
    
    shaders.forEach(shader => {
      if (shader.tags && Array.isArray(shader.tags)) {
        shader.tags.forEach(tag => {
          const tagName = tag.name || tag.Name || '';
          if (tagName) {
            tagMap.set(tagName.toLowerCase(), {
              name: tagName,
              count: (tagMap.get(tagName.toLowerCase())?.count || 0) + 1
            });
          }
        });
      }
    });

    return Array.from(tagMap.values()).sort((a, b) => b.count - a.count);
  }
};

// Filter Actions
export const filterActions = {
  setSearchQuery(query) {
    updateAppState(state => ({
      ...state,
      filters: { ...state.filters, searchQuery: query }
    }));
    
    this.applyFilters();
  },

  toggleTag(tagName) {
    updateAppState(state => {
      const selectedTags = state.filters.selectedTags.includes(tagName)
        ? state.filters.selectedTags.filter(t => t !== tagName)
        : [...state.filters.selectedTags, tagName];
      
      return {
        ...state,
        filters: { ...state.filters, selectedTags }
      };
    });
    
    this.applyFilters();
  },

  clearFilters() {
    updateAppState(state => ({
      ...state,
      filters: {
        searchQuery: '',
        selectedTags: [],
        userFilter: null
      }
    }));
    
    this.applyFilters();
  },

  applyFilters() {
    updateAppState(state => {
      const { searchQuery, selectedTags } = state.filters;
      const shaders = state.shaders.list;
      
      let filtered = shaders;

      // Apply search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(shader => 
          shader.name?.toLowerCase().includes(query) ||
          shader.description?.toLowerCase().includes(query) ||
          shader.tags?.some(tag => 
            (tag.name || tag.Name || '').toLowerCase().includes(query)
          )
        );
      }

      // Apply tag filters
      if (selectedTags.length > 0) {
        filtered = filtered.filter(shader =>
          selectedTags.every(selectedTag =>
            shader.tags?.some(tag =>
              (tag.name || tag.Name || '').toLowerCase() === selectedTag.toLowerCase()
            )
          )
        );
      }

      return {
        ...state,
        shaders: { ...state.shaders, filteredList: filtered }
      };
    });
  }
};

// Editor Actions
export const editorActions = {
  async loadShader(shaderId) {
    updateAppState(state => ({
      ...state,
      editor: { 
        ...state.editor, 
        isInitializing: true, 
        error: null 
      }
    }));

    try {
      const shader = await api.loadShaderProject(shaderId);
      
      updateAppState(state => ({
        ...state,
        editor: {
          ...state.editor,
          shader: shader,
          scripts: shader.shader_scripts || [],
          activeScriptId: shader.shader_scripts?.[0]?.id || null,
          activeScript: shader.shader_scripts?.[0] || null,
          isInitializing: false
        }
      }));

      console.log('Shader loaded:', shader);
    } catch (error) {
      updateAppState(state => ({
        ...state,
        editor: {
          ...state.editor,
          isInitializing: false,
          error: error.message
        }
      }));
    }
  },

  createNewShader() {
    const defaultScript = {
      id: 0,
      code: `@vertex
fn vs_main(@builtin(vertex_index) vertex_index: u32) -> @builtin(position) vec4<f32> {
    var pos = array<vec2<f32>, 3>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>( 3.0, -1.0),
        vec2<f32>(-1.0,  3.0)
    );
    return vec4<f32>(pos[vertex_index], 0.0, 1.0);
}

@fragment
fn fs_main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = fragCoord.xy / u.resolution;
    return vec4<f32>(uv, 0.5, 1.0);
}`,
      buffer: {
        format: "rgba8unorm",
        width: 512,
        height: 512
      }
    };

    const newShader = {
      id: null,
      name: "New Shader",
      description: "",
      tags: [],
      shader_scripts: [defaultScript]
    };

    updateAppState(state => ({
      ...state,
      editor: {
        ...state.editor,
        shader: newShader,
        scripts: [defaultScript],
        activeScriptId: 0,
        activeScript: defaultScript,
        isInitializing: false,
        error: null
      }
    }));
  },

  setActiveScript(scriptId) {
    updateAppState(state => {
      const script = state.editor.scripts.find(s => s.id === scriptId);
      return {
        ...state,
        editor: {
          ...state.editor,
          activeScriptId: scriptId,
          activeScript: script || null
        }
      };
    });
  },

  updateScriptCode(scriptId, code) {
    updateAppState(state => ({
      ...state,
      editor: {
        ...state.editor,
        scripts: state.editor.scripts.map(script =>
          script.id === scriptId ? { ...script, code } : script
        ),
        activeScript: state.editor.activeScript?.id === scriptId 
          ? { ...state.editor.activeScript, code }
          : state.editor.activeScript
      }
    }));
  },

  updateShaderName(name) {
    updateAppState(state => ({
      ...state,
      editor: {
        ...state.editor,
        shader: state.editor.shader 
          ? { ...state.editor.shader, name }
          : null
      }
    }));
  },

  addConsoleMessage(message, type = 'info') {
    updateAppState(state => ({
      ...state,
      editor: {
        ...state.editor,
        consoleMessages: [
          ...state.editor.consoleMessages,
          {
            id: Date.now(),
            message,
            type,
            timestamp: new Date().toLocaleTimeString()
          }
        ]
      }
    }));
  },

  clearConsole() {
    updateAppState(state => ({
      ...state,
      editor: {
        ...state.editor,
        consoleMessages: []
      }
    }));
  },

  setCompiling(isCompiling) {
    updateAppState(state => ({
      ...state,
      editor: { ...state.editor, isCompiling }
    }));
  },

  setRunning(isRunning) {
    updateAppState(state => ({
      ...state,
      editor: { ...state.editor, isRunning }
    }));
  },

  setSaving(isSaving) {
    updateAppState(state => ({
      ...state,
      editor: { ...state.editor, isSaving }
    }));
  },

  setWebGPUReady(ready) {
    updateAppState(state => ({
      ...state,
      editor: { ...state.editor, webGPUReady: ready }
    }));
  }
};

// UI Actions
export const uiActions = {
  showDeleteConfirm(shader) {
    updateAppState(state => ({
      ...state,
      ui: {
        ...state.ui,
        modals: {
          ...state.ui.modals,
          deleteConfirm: {
            show: true,
            shader: shader,
            isDeleting: false
          }
        }
      }
    }));
  },

  hideDeleteConfirm() {
    updateAppState(state => ({
      ...state,
      ui: {
        ...state.ui,
        modals: {
          ...state.ui.modals,
          deleteConfirm: {
            show: false,
            shader: null,
            isDeleting: false
          }
        }
      }
    }));
  },

  showLoginModal() {
    updateAppState(state => ({
      ...state,
      ui: {
        ...state.ui,
        modals: {
          ...state.ui.modals,
          login: { show: true }
        }
      }
    }));
  },

  hideLoginModal() {
    updateAppState(state => ({
      ...state,
      ui: {
        ...state.ui,
        modals: {
          ...state.ui.modals,
          login: { show: false }
        }
      }
    }));
  },

  addNotification(message, type = 'info') {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: Date.now()
    };

    updateAppState(state => ({
      ...state,
      ui: {
        ...state.ui,
        notifications: [...state.ui.notifications, notification]
      }
    }));

    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      this.removeNotification(notification.id);
    }, 5000);
  },

  removeNotification(id) {
    updateAppState(state => ({
      ...state,
      ui: {
        ...state.ui,
        notifications: state.ui.notifications.filter(n => n.id !== id)
      }
    }));
  }
};