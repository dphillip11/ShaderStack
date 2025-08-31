import { writable, derived, get } from 'svelte/store';
import { BackendAPI } from '../integration/backendAPI.js';
import { LocalStorage } from '../integration/localStorage.js';

// Centralized state managed by DataManager
export const shaders = writable([]);
export const tags = writable([]);
export const loading = writable(false);
export const error = writable(null);

// User authentication state
export const user = writable({ 
  is_authenticated: false, 
  username: '', 
  user_id: null 
});

export const OFFLINE_USER = { 
  is_authenticated: true, 
  username: 'Offline User', 
  user_id: 0
};

// Derived: offline mode detection
export const isOffline = derived(user, $user => $user.user_id === OFFLINE_USER.user_id);

class DataManager {
  constructor() {
    this.backendAPI = new BackendAPI();
    this.localStorage = new LocalStorage();
  }

  getCurrentInterface() {
    return get(isOffline) ? this.localStorage : this.backendAPI;
  }

  // Helper to handle async operations with loading/error states
  async executeAction(actionName, asyncFn) {
    loading.set(true);
    error.set(null);
    
    try {
      const result = await asyncFn();
      return result;
    } catch (err) {
      console.error(`${actionName} failed:`, err);
      error.set(err.message);
      throw err;
    } finally {
      loading.set(false);
    }
  }

  // Authentication Actions - these update user state
  async login(username, password) {
    return this.executeAction('Login', async () => {
      const data = await this.getCurrentInterface().login(username, password);
      
      // Update user state
      user.set({
        is_authenticated: true,
        username: data.username || data.Username,
        user_id: data.user_id || data.UserID
      });
      
      return data;
    });
  }

  async register(username, password) {
    return this.executeAction('Register', async () => {
      const data = await this.getCurrentInterface().register(username, password);
      
      // Update user state
      user.set({
        is_authenticated: true,
        username: data.username || data.Username,
        user_id: data.user_id || data.UserID
      });
      
      return data;
    });
  }

  async getAuthInfo() {
    return this.executeAction('GetAuthInfo', async () => {
      const data = await this.getCurrentInterface().getAuthInfo();
      
      // Update user state
      user.set({
        is_authenticated: data.IsAuthenticated,
        username: data.Username || '',
        user_id: data.UserID || null
      });
      
      return data;
    });
  }

  async logout() {
    return this.executeAction('Logout', async () => {
      const result = await this.getCurrentInterface().logout();
      
      // Clear user state
      user.set({ 
        is_authenticated: false, 
        username: '', 
        user_id: null 
      });
      
      return result;
    });
  }

  // Manual offline mode toggle
  setisOffline(offline) {
    if (offline) {
      user.set(OFFLINE_USER);
    } else {
      user.set({ 
        is_authenticated: false, 
        username: '', 
        user_id: null 
      });
    }
  }

  // Shader Actions - these mutate state instead of returning values
  async loadShaders(searchParams = {}) {
    await this.executeAction('LoadShaders', async () => {
      const shaderData = await this.getCurrentInterface().getShaders(searchParams);
      shaders.set(shaderData || []);
    });
  }

  async loadShader(id) {
    return this.executeAction('LoadShader', async () => {
      const shader = await this.getCurrentInterface().getShader(id);
      return shader; // Still return for editor loading
    });
  }

  async createShader(shaderData) {
    await this.executeAction('CreateShader', async () => {
      const newShader = await this.getCurrentInterface().createShader(shaderData);
      
      // Optimistically add to local state
      shaders.update(currentShaders => [newShader, ...currentShaders]);
      
      return newShader;
    });
  }

  async updateShader(shaderId, shaderData) {
    await this.executeAction('UpdateShader', async () => {
      const updatedShader = await this.getCurrentInterface().updateShader(shaderId, shaderData);
      
      // Update in local state
      shaders.update(currentShaders => 
        currentShaders.map(shader => 
          shader.id === shaderId ? updatedShader : shader
        )
      );
      
      return updatedShader;
    });
  }

  async updateShaderProperties(shaderId, properties) {
    await this.executeAction('UpdateShaderProperties', async () => {
      const updatedShader = await this.getCurrentInterface().updateShaderProperties(shaderId, properties);
      
      // Update in local state
      shaders.update(currentShaders => 
        currentShaders.map(shader => 
          shader.id === shaderId ? { ...shader, ...properties } : shader
        )
      );
      
      return updatedShader;
    });
  }

  async deleteShader(shaderId) {
    await this.executeAction('DeleteShader', async () => {
      await this.getCurrentInterface().deleteShader(shaderId);
      
      // Remove from local state
      shaders.update(currentShaders => 
        currentShaders.filter(shader => shader.id !== shaderId)
      );
    });
  }

  // Tag Actions - mutate state
  async loadTags() {
    await this.executeAction('LoadTags', async () => {
      const tagData = await this.getCurrentInterface().getTags();
      tags.set(tagData || []);
    });
  }

  // Utility methods
  isOnline() {
    return this.getCurrentInterface().isOnline();
  }

  getDataSource() {
    return this.getCurrentInterface().getDataSource();
  }

  // Offline-specific actions
  clearOfflineData() {
    if (get(isOffline)) {
      const success = this.localStorage.clearShaders();
      if (success) {
        shaders.set([]);
        tags.set([]);
      }
      return success;
    }
    console.warn('Clear data only available in offline mode');
    return false;
  }

  getStorageInfo() {
    if (get(isOffline)) {
      return this.localStorage.getStorageInfo();
    }
    return { hasData: false, message: 'Online mode - no local storage' };
  }

  async importDemoData(jsonShaders) {
    if (get(isOffline)) {
      await this.executeAction('ImportDemoData', async () => {
        const success = this.localStorage.importShaders(jsonShaders);
        if (success) {
          // Refresh the shader and tag lists
          await this.loadShaders();
          await this.loadTags();
        }
        return success;
      });
    } else {
      console.warn('Demo data import only available in offline mode');
    }
  }

  exportOfflineData() {
    if (get(isOffline)) {
      return this.localStorage.exportShaders();
    }
    console.warn('Data export only available in offline mode');
    return '';
  }

  // Initialization action
  async initialize() {
    await this.loadTags();
    // Initial shader load will be triggered by filter changes
  }
}

// Export singleton instance
export const dataManager = new DataManager();