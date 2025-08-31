// Central API helper - single responsibility: HTTP requests & response shaping
export async function apiGet(path) {
  const res = await fetch(path, { credentials: 'include' });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPost(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPut(path, body) {
  const res = await fetch(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiDelete(path) {
  const res = await fetch(path, {
    method: 'DELETE',
    credentials: 'include'
  });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
  return res.json();
}

// Authentication API Functions

/**
 * Login user
 */
export async function login(username, password) {
  return apiPost('/api/login', { username, password });
}

/**
 * Register new user
 */
export async function register(username, password) {
  return apiPost('/api/register', { username, password });
}

/**
 * Get current authentication info
 */
export async function getAuthInfo() {
  return apiGet('/api/auth');
}

/**
 * Logout current user
 */
export async function logout() {
  return apiPost('/api/logout', {});
}

// Shader API Functions

/**
 * Get all shaders with optional search/filter parameters
 */
export async function getShaders(searchParams = {}) {
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

/**
 * Create a new shader project
 */
export async function createShader(shaderData) {
  return apiPost('/api/shaders', shaderData);
}

/**
 * Load a shader project by ID
 */
export async function getShader(id) {
  return apiGet(`/api/shaders/${id}`);
}

/**
 * Update a complete shader project (all scripts included)
 */
export async function updateShader(shaderId, shaderData) {
  return apiPut(`/api/shaders/${shaderId}`, shaderData);
}

/**
 * Delete a shader project
 */
export async function deleteShader(shaderId) {
  return apiDelete(`/api/shaders/${shaderId}`);
}

/**
 * Update only shader properties (name, tags, etc.) without scripts
 */
export async function updateShaderProperties(shaderId, properties) {
  return apiPut(`/api/shaders/${shaderId}/properties`, properties);
}

// Tag API Functions

/**
 * Get all available tags
 */
export async function getTags() {
  return apiGet('/api/tags');
}