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