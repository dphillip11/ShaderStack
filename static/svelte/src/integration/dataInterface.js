/**
 * Abstract base class defining the data interface contract
 */
export class DataInterface {
  constructor() {
    if (this.constructor === DataInterface) {
      throw new Error('Cannot instantiate abstract class DataInterface');
    }
  }

  // Authentication methods - must be implemented by subclasses
  async login(username, password) {
    throw new Error('Method login() must be implemented');
  }

  async register(username, password) {
    throw new Error('Method register() must be implemented');
  }

  async getAuthInfo() {
    throw new Error('Method getAuthInfo() must be implemented');
  }

  async logout() {
    throw new Error('Method logout() must be implemented');
  }

  // Shader methods - must be implemented by subclasses
  async getShaders(searchParams = {}) {
    throw new Error('Method getShaders() must be implemented');
  }

  async getShader(id) {
    throw new Error('Method getShader() must be implemented');
  }

  async createShader(shaderData) {
    throw new Error('Method createShader() must be implemented');
  }

  async updateShader(shaderId, shaderData) {
    throw new Error('Method updateShader() must be implemented');
  }

  async deleteShader(shaderId) {
    throw new Error('Method deleteShader() must be implemented');
  }

  async updateShaderProperties(shaderId, properties) {
    throw new Error('Method updateShaderProperties() must be implemented');
  }

  // Tag methods - must be implemented by subclasses
  async getTags() {
    throw new Error('Method getTags() must be implemented');
  }

  // Optional utility methods with default implementations
  isOnline() {
    return true; // Override in LocalStorageDataInterface
  }

  getDataSource() {
    return 'unknown'; // Override in subclasses
  }
}