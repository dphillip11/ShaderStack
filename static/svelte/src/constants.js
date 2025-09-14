export const OFFLINE_USER = { 
  is_authenticated: true, 
  username: 'Offline User', 
  user_id: -1
};

export const NO_USER = { 
  is_authenticated: false, 
  username: '', 
  user_id: null
};

export const DEFAULT_FILTERS = {
  query: '',
  tags: [],
  user_id: null,
  limit: 20,
  offset: 0,
}

export const DEFAULT_FRAGMENT_SHADER_0 = `
@fragment
fn fs_main(@builtin(position) coord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = coord.xy / u.resolution;
    let color = vec3<f32>(uv, 0.5 + 0.5 * sin(5.0 * u.time));
    return vec4<f32>(color,1.0);
}
`

export const DEFAULT_FRAGMENT_SHADER_1 = `
@fragment
fn fs_main(@builtin(position) coord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = coord.xy / u.resolution;
    let color = textureSample(buffer0, buffer0_sampler, uv);
    return vec4<f32>(color.r, 1, 1, 1);
}
`

export const DEFAULT_SCRIPT_0 = {
  id: 0,
  code: DEFAULT_FRAGMENT_SHADER_0,
  buffer: {
    format: "rgba8unorm",
    width: 512,
    height: 512
  }
};

export const DEFAULT_SCRIPT_1 = {
  id: 1,
  code: DEFAULT_FRAGMENT_SHADER_1,
  buffer: {
    format: "rgba8unorm",
    width: 512,
    height: 512
  }
};
