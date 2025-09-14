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
    return vec4<f32>(color.b, 0.1, 0.25, 1);
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

// Compute defaults: we reuse buffer.width/height as the logical output size
// and derive dispatch counts from workgroupSize. Adapter/UI can override later if needed.
export const DEFAULT_WORKGROUP_SIZE = { x: 16, y: 16, z: 1 };

export const DEFAULT_COMPUTE_SHADER = `
// Writes a simple gradient to a storage texture. The workspace will inject bindings for:
// - outTex: texture_storage_2d<rgba8unorm, write>
// - u: uniforms with resolution (vec2<f32>) and time (f32)
@compute @workgroup_size(16, 16, 1)
fn cs_main(@builtin(global_invocation_id) gid: vec3<u32>) {
    // Guard against out-of-bounds invocations
    if (gid.x >= u32(u.resolution.x) || gid.y >= u32(u.resolution.y)) { return; }

    let uv = vec2<f32>(gid.xy) / u.resolution;
    let color = vec4<f32>(uv, 0.5 + 0.5 * sin(u.time), 1.0);
    textureStore(outTex, vec2<i32>(gid.xy), color);
}
`;

export const DEFAULT_COMPUTE_SCRIPT = {
  id: 2,
  kind: 'compute',
  code: DEFAULT_COMPUTE_SHADER,
  buffer: {
    // Storage-capable format; adapter should validate/adjust if unsupported
    format: 'rgba8unorm',
    width: 512,
    height: 512,
  },
  compute: {
    workgroupSize: { ...DEFAULT_WORKGROUP_SIZE },
    // dispatch is derived as ceil(width/x), ceil(height/y), z=1 by the adapter
  },
};
