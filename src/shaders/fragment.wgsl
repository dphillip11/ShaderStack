struct Uniforms {
  time: f32,
  resolution: vec2<f32>,
  mouse: vec4<f32>,
  frame: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let fragCoord = uv * uniforms.resolution;
  
  // Animated rainbow spiral
  let center = uniforms.resolution * 0.5;
  let pos = fragCoord - center;
  let dist = length(pos);
  let angle = atan2(pos.y, pos.x);
  
  let spiral = sin(dist * 0.05 - uniforms.time * 2.0 + angle * 3.0) * 0.5 + 0.5;
  let rainbow = 0.5 + 0.5 * cos(uniforms.time + uv.xyx + vec3<f32>(0.0, 2.0, 4.0));
  
  let col = mix(rainbow, vec3<f32>(spiral), 0.3);
  
  return vec4<f32>(col, 1.0);
}