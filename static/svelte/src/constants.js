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