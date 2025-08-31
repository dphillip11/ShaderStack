import { DataInterface } from './dataInterface.js';
import { OFFLINE_USER } from '../stores/user.js';

const STORAGE_KEY = 'webgpu_shaders';

export class LocalStorage extends DataInterface {
  constructor() {
    super();
  }

  // Authentication methods - offline mode always succeeds with offline user
  async login(username, password) {
    return OFFLINE_USER;
  }

  async register(username, password) {
    return OFFLINE_USER;
  }

  async getAuthInfo() {
    return OFFLINE_USER;
  }

  async logout() {
    return { success: true };
  }

  // Shader methods
  async getShaders(searchParams = {}) {
    return this.searchShaders(searchParams);
  }

  async getShader(id) {
    const shader = this.fetchShader(id);
    if (!shader) {
      throw new Error(`Shader with id ${id} not found`);
    }
    return shader;
  }

  async createShader(shaderData) {
    const newShader = {
      ...shaderData,
      id: this.generateTempId(),
      user_id: OFFLINE_USER.user_id
    };
    
    const success = this.saveShader(newShader);
    if (!success) {
      throw new Error('Failed to save shader to local storage');
    }
    
    return newShader;
  }

  async updateShader(shaderId, shaderData) {
    const updatedShader = {
      ...shaderData,
      id: shaderId,
      user_id: OFFLINE_USER.user_id
    };
    
    const success = this.saveShader(updatedShader);
    if (!success) {
      throw new Error('Failed to update shader in local storage');
    }
    
    return updatedShader;
  }

  async deleteShader(shaderId) {
    const success = this.deleteShaderFromStorage(shaderId);
    if (!success) {
      throw new Error('Failed to delete shader from local storage');
    }
    
    return { success: true };
  }

  async updateShaderProperties(shaderId, properties) {
    const existingShader = this.fetchShader(shaderId);
    if (!existingShader) {
      throw new Error('Shader not found');
    }
    
    const updatedShader = {
      ...existingShader,
      ...properties,
      id: shaderId,
      user_id: OFFLINE_USER.user_id
    };
    
    const success = this.saveShader(updatedShader);
    if (!success) {
      throw new Error('Failed to update shader properties');
    }
    
    return updatedShader;
  }

  async getTags() {
    return this.fetchTags();
  }

  isOnline() {
    return false;
  }

  getDataSource() {
    return 'localStorage';
  }

  // Internal storage methods
  fetchShaders() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return [];
      }
      
      const data = JSON.parse(stored);
      return data.shaders || [];
      
    } catch (error) {
      console.error('Failed to fetch shaders from localStorage:', error);
      return [];
    }
  }

  saveShaders(shaders) {
    try {
      const shadersToSave = shaders.map(shader => ({
        ...shader,
        user_id: OFFLINE_USER.user_id
      }));

      const data = {
        shaders: shadersToSave,
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
      
    } catch (error) {
      console.error('Failed to save shaders to localStorage:', error);
      
      // Handle quota exceeded error
      if (error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, attempting cleanup');
        return false;
      }
      
      return false;
    }
  }

  saveShader(shader) {
    const shaders = this.fetchShaders();

    const shaderToSave = {
      ...shader,
      user_id: OFFLINE_USER.user_id
    };
    const existingIndex = shaders.findIndex(s => s.id === shader.id);
    
    if (existingIndex >= 0) {
      // Update existing shader
      shaders[existingIndex] = shaderToSave;
    } else {
      // Add new shader
      shaders.push(shaderToSave);
    }
    
    return this.saveShaders(shaders);
  }

  deleteShaderFromStorage(shaderId) {
    const shaders = this.fetchShaders();
    const filteredShaders = shaders.filter(s => s.id !== shaderId);
    return this.saveShaders(filteredShaders);
  }

  fetchShader(shaderId) {
    const shaders = this.fetchShaders();
    return shaders.find(s => s.id === shaderId) || null;
  }

  searchShaders(searchParams = {}) {
    let shaders = this.fetchShaders();
    
    // Filter by query (shader name)
    if (searchParams.query) {
      const query = searchParams.query.toLowerCase();
      shaders = shaders.filter(shader => 
        shader.name?.toLowerCase().includes(query)
      );
    }
    
    // Filter by user ID
    if (searchParams.user_id) {
      shaders = shaders.filter(shader => 
        shader.user_id === searchParams.user_id
      );
    }
    
    // Filter by tags
    if (searchParams.tags && searchParams.tags.length > 0) {
      shaders = shaders.filter(shader => {
        if (!shader.tags) return false;
        
        // Check if shader has ALL specified tags
        return searchParams.tags.every(tagName => 
          shader.tags.some(tag => 
            tag.name?.toLowerCase() === tagName.toLowerCase()
          )
        );
      });
    }
    
    // Apply pagination
    const offset = searchParams.offset || 0;
    const limit = searchParams.limit || shaders.length;
    
    return shaders.slice(offset, offset + limit);
  }

  fetchTags() {
    const shaders = this.fetchShaders();
    const tagMap = new Map();
    
    shaders.forEach(shader => {
      if (shader.tags) {
        shader.tags.forEach(tag => {
          if (tag.name && !tagMap.has(tag.name)) {
            tagMap.set(tag.name, {
              id: tag.id || tagMap.size + 1,
              name: tag.name
            });
          }
        });
      }
    });
    
    return Array.from(tagMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  generateTempId() {
    return -Date.now();
  }

  // Utility methods
  clearShaders() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Failed to clear shaders from localStorage:', error);
      return false;
    }
  }

  getStorageInfo() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const shaders = this.fetchShaders();
      
      return {
        hasData: !!stored,
        shaderCount: shaders.length,
        storageSize: stored ? stored.length : 0,
      };
    } catch (error) {
      return {
        hasData: false,
        shaderCount: 0,
        storageSize: 0,
        error: error.message
      };
    }
  }

  importShaders(jsonShaders) {
    try {
      // Validate the input
      if (!Array.isArray(jsonShaders)) {
        throw new Error('Input must be an array of shaders');
      }
      
      return this.saveShaders(jsonShaders);
    } catch (error) {
      console.error('Failed to import shaders:', error);
      return false;
    }
  }

  exportShaders() {
    const shaders = this.fetchShaders();
    return JSON.stringify(shaders, null, 2);
  }
}