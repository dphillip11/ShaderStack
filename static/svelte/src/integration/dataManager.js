import { BackendAPI } from './backendAPI.js';
import { LocalStorage } from './localStorage.js';
import { get } from 'svelte/store';
import { isOffline } from '../stores/user.js';

class DataManager {
  constructor() {
    this.backendAPI = new BackendAPI();
    this.localStorage = new LocalStorage();
  }

  getCurrentInterface() {
    return get(isOffline) ? this.localStorage : this.backendAPI;
  }

  // Proxy all methods to the current interface
  async login(username, password) {
    return this.getCurrentInterface().login(username, password);
  }

  async register(username, password) {
    return this.getCurrentInterface().register(username, password);
  }

  async getAuthInfo() {
    return this.getCurrentInterface().getAuthInfo();
  }

  async logout() {
    return this.getCurrentInterface().logout();
  }

  async getShaders(searchParams = {}) {
    return this.getCurrentInterface().getShaders(searchParams);
  }

  async getShader(id) {
    return this.getCurrentInterface().getShader(id);
  }

  async createShader(shaderData) {
    return this.getCurrentInterface().createShader(shaderData);
  }

  async updateShader(shaderId, shaderData) {
    return this.getCurrentInterface().updateShader(shaderId, shaderData);
  }

  async deleteShader(shaderId) {
    return this.getCurrentInterface().deleteShader(shaderId);
  }

  async updateShaderProperties(shaderId, properties) {
    return this.getCurrentInterface().updateShaderProperties(shaderId, properties);
  }

  async getTags() {
    return this.getCurrentInterface().getTags();
  }

  isOnline() {
    return this.getCurrentInterface().isOnline();
  }

  getDataSource() {
    return this.getCurrentInterface().getDataSource();
  }

  // Offline-specific utility methods
  clearOfflineData() {
    if (get(isOffline)) {
      return this.localStorage.clearShaders();
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

  importDemoData(jsonShaders) {
    if (get(isOffline)) {
      return this.localStorage.importShaders(jsonShaders);
    }
    console.warn('Demo data import only available in offline mode');
    return false;
  }

  exportOfflineData() {
    if (get(isOffline)) {
      return this.localStorage.exportShaders();
    }
    console.warn('Data export only available in offline mode');
    return '';
  }
}

// Export singleton instance
export const dataManager = new DataManager();