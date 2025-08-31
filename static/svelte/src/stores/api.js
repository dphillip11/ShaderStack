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
 * Get current authentication status
 */
export async function getAuthStatus() {
  try {
    return await apiGet('/api/auth/status');
  } catch (error) {
    // If auth status fails, assume not authenticated
    return {
      isAuthenticated: false,
      user: null,
      username: null,
      user_id: null
    };
  }
}

/**
 * Login with credentials
 */
export async function login(credentials) {
  return apiPost('/api/auth/login', credentials);
}

/**
 * Logout current user
 */
export async function logout() {
  return apiPost('/api/auth/logout', {});
}

// Shader API Functions - using actual backend routes

/**
 * Load a shader project by ID
 */
export async function loadShaderProject(id) {
  return apiGet(`/api/shaders/${id}`);
}

/**
 * Save a complete shader project (all scripts included)
 */
export async function saveShaderProject(shaderId, shaderData) {
  if (shaderId) {
    return apiPut(`/api/shaders/${shaderId}`, shaderData);
  } else {
    return apiPost('/api/shaders', shaderData);
  }
}

/**
 * Delete a shader project
 */
export async function deleteShaderProject(shaderId) {
  return apiDelete(`/api/shaders/${shaderId}`);
}

// Shader Listing API Functions

/**
 * Get all shaders or filter by user
 */
export async function getShaders(filters = {}) {
  let path = '/api/shaders';
  
  // Add query parameters if filters provided
  const params = new URLSearchParams();
  if (filters.user_id) {
    params.append('user_id', filters.user_id);
  }
  if (filters.search) {
    params.append('search', filters.search);
  }
  if (filters.tags && filters.tags.length > 0) {
    params.append('tags', filters.tags.join(','));
  }
  
  if (params.toString()) {
    path += '?' + params.toString();
  }
  
  return apiGet(path);
}

/**
 * Get all available tags
 */
export async function getTags() {
  return apiGet('/api/tags');
}

// Helper functions for editor workflow

/**
 * Create default project structure
 */
export function createDefaultProject(name = 'New Shader Project') {
  return {
    name,
    shader_scripts: [
      {
        id: 1,
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
fn fs_main(@builtin(position) coord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = coord.xy / u.resolution;
    let color = vec3<f32>(uv, 0.5 + 0.5 * sin(u.time));
    return vec4<f32>(color, 1.0);
}`,
        buffer: {
          format: 'rgba8unorm',
          width: 512,
          height: 512
        }
      }
    ],
    tags: []
  };
}

/**
 * Create default script structure
 */
export function createDefaultScript(id) {
  return {
    id,
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
fn fs_main(@builtin(position) coord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = coord.xy / u.resolution;
    // Sample from previous scripts if available
    // let previousColor = textureSample(buffer1, buffer1_sampler, uv);
    let color = vec3<f32>(uv, 0.5 + 0.5 * sin(u.time));
    return vec4<f32>(color, 1.0);
}`,
    buffer: {
      format: 'rgba8unorm',
      width: 512,
      height: 512
    }
  };
}