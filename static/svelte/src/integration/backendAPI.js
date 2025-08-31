import { DataInterface } from './dataInterface.js';

// Central API helper functions
async function apiGet(path) {
  const res = await fetch(path, { credentials: 'include' });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

async function apiPut(path, body) {
  const res = await fetch(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`);
  return res.json();
}

async function apiDelete(path) {
  const res = await fetch(path, {
    method: 'DELETE',
    credentials: 'include'
  });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
  return res.json();
}

export class BackendAPI extends DataInterface {
  constructor() {
    super();
  }

  // Authentication API Functions
  async login(username, password) {
    return apiPost('/api/login', { username, password });
  }

  async register(username, password) {
    return apiPost('/api/register', { username, password });
  }

  async getAuthInfo() {
    return apiGet('/api/auth');
  }

  async logout() {
    return apiPost('/api/logout', {});
  }

  // Shader API Functions
  async getShaders(searchParams = {}) {
    const params = new URLSearchParams();
    
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