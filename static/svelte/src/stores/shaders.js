import { writable, derived, get } from 'svelte/store';
import { filters } from './search.js';
import { offlineMode } from './user.js';
import { dataManager } from '../integration/dataManager.js';

// Raw shaders collection from API
export const shaders = writable([]);
// Loading state
export const loading = writable(false);
// Error state
export const error = writable(null);

// Auto-fetch shaders when filters change
let searchTimeout;
filters.subscribe($filters => {
  // Debounce API calls to avoid too many requests during typing
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    fetchShaders($filters);
  }, 300); // 300ms debounce
});

// Fetch shaders using DataManager
async function fetchShaders(filterParams) {
  loading.set(true);
  error.set(null);
  
  try {
    const shaderData = await dataManager.getShaders(filterParams);
    shaders.set(shaderData || []);
    
  } catch (e) {
    console.error('Failed loading shaders:', e);
    error.set(e.message);
    shaders.set([]);
  } finally {
    loading.set(false);
  }
}

// Shader CRUD operations using DataManager
export async function createShader(shaderData) {
  loading.set(true);
  error.set(null);
  
  try {
    const newShader = await dataManager.createShader(shaderData);
    
    // Add to local store immediately for responsive UI
    shaders.update(currentShaders => [newShader, ...currentShaders]);
    
    return { success: true, shader: newShader };
    
  } catch (e) {
    console.error('Failed to create shader:', e);
    error.set(e.message);
    return { success: false, error: e.message };
  } finally {
    loading.set(false);
  }
}

export async function updateShader(id, shaderData) {
  loading.set(true);
  error.set(null);
  
  try {
    const updatedShader = await dataManager.updateShader(id, shaderData);
    
    // Update in local store
    shaders.update(currentShaders => 
      currentShaders.map(shader => 
        shader.id === id ? updatedShader : shader
      )
    );
    
    return { success: true, shader: updatedShader };
    
  } catch (e) {
    console.error('Failed to update shader:', e);
    error.set(e.message);
    return { success: false, error: e.message };
  } finally {
    loading.set(false);
  }
}

export async function updateShaderProperties(id, properties) {
  loading.set(true);
  error.set(null);
  
  try {
    const updatedShader = await dataManager.updateShaderProperties(id, properties);
    
    // Update in local store
    shaders.update(currentShaders => 
      currentShaders.map(shader => 
        shader.id === id ? { ...shader, ...properties } : shader
      )
    );
    
    return { success: true, shader: updatedShader };
    
  } catch (e) {
    console.error('Failed to update shader properties:', e);
    error.set(e.message);
    return { success: false, error: e.message };
  } finally {
    loading.set(false);
  }
}

export async function deleteShader(id) {
  loading.set(true);
  error.set(null);
  
  try {
    await dataManager.deleteShader(id);
    
    // Remove from local store
    shaders.update(currentShaders => 
      currentShaders.filter(shader => shader.id !== id)
    );
    
    return { success: true };
    
  } catch (e) {
    console.error('Failed to delete shader:', e);
    error.set(e.message);
    return { success: false, error: e.message };
  } finally {
    loading.set(false);
  }
}

export async function getShader(id) {
  loading.set(true);
  error.set(null);
  
  try {
    const shader = await dataManager.getShader(id);
    return { success: true, shader };
    
  } catch (e) {
    console.error('Failed to get shader:', e);
    error.set(e.message);
    return { success: false, error: e.message };
  } finally {
    loading.set(false);
  }
}

// Force refresh
export async function refreshShaders() {
  const currentFilters = get(filters);
  await fetchShaders(currentFilters);
}

// Offline-specific operations
export function importDemoData(jsonShaders) {
  if (get(offlineMode)) {
    const success = dataManager.importDemoData(jsonShaders);
    if (success) {
      // Refresh the shader list
      refreshShaders();
    }
    return success;
  }
  return false;
}

export function exportOfflineData() {
  return dataManager.exportOfflineData();
}

export function clearOfflineData() {
  if (get(offlineMode)) {
    const success = dataManager.clearOfflineData();
    if (success) {
      shaders.set([]);
    }
    return success;
  }
  return false;
}

export function getStorageInfo() {
  return dataManager.getStorageInfo();
}

// Utility functions
export const isOnline = derived(offlineMode, $offline => !$offline);
export const dataSource = derived(offlineMode, $offline => $offline ? 'localStorage' : 'backend');