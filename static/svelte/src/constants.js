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

export const DEFAULT_VERTEX_SHADER = `
@vertex
fn vs_main(@builtin(vertex_index) vertex_index: u32) -> @builtin(position) vec4<f32> {
    var pos = array<vec2<f32>, 3>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>( 3.0, -1.0),
        vec2<f32>(-1.0,  3.0)
    );
    return vec4<f32>(pos[vertex_index], 0.0, 1.0);
}
`

export const DEFAULT_FRAGMENT_SHADER = `
@fragment
fn fs_main(@builtin(position) coord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = coord.xy / u.resolution;
    // Sample from previous scripts if available
    // let previousColor = textureSample(buffer1, buffer1_sampler, uv);
    let color = vec3<f32>(uv, 0.5 + 0.5 * sin(5.0 * u.time));
    return vec4<f32>(color,1.0);
}
`

export const DEFAULT_SCRIPT = {
  id: null,
  code: DEFAULT_FRAGMENT_SHADER,
  buffer: {
    format: "rgba8unorm",
    width: 512,
    height: 512
  }
};
