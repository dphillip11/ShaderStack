export class BackendAPI {

  // Shader API Functions
  async getShaders(searchParams = {}) {
    const params = new URLSearchParams(filters);
    
    if (searchParams.query) params.set('query', searchParams.query);
    if (searchParams.user_id) params.set('user_id', searchParams.user_id);
    if (searchParams.tags?.length) {
      searchParams.tags.forEach(tag => params.append('tags', tag));
    }
    if (searchParams.limit) params.set('limit', searchParams.limit);
    if (searchParams.offset) params.set('offset', searchParams.offset);
    
    const queryString = params.toString();
    const url = `/api/shaders${queryString ? '?' + queryString : ''}`;
    
    return apiGet(url);
  }

  async createShader(shaderData) {
    return apiPost('/api/shaders', shaderData);
  }

  async getShader(id) {
    return apiGet(`/api/shaders/${id}`);
  }

  async updateShader(shaderId, shaderData) {
    return apiPut(`/api/shaders/${shaderId}`, shaderData);
  }

  async deleteShader(shaderId) {
    return apiDelete(`/api/shaders/${shaderId}`);
  }

  async updateShaderProperties(shaderId, properties) {
    return apiPut(`/api/shaders/${shaderId}/properties`, properties);
  }

  // Tag API Functions
  async getTags() {
    return apiGet('/api/tags');
  }

  isOnline() {
    return true;
  }

  getDataSource() {
    return 'backend';
  }
}