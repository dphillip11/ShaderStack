// Buffer A Example - Fluid Simulation
struct Uniforms {
  time: f32,
  resolution: vec2<f32>,
  mouse: vec4<f32>,
  frame: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let t = uniforms.time;
  let res = uniforms.resolution;
  let mouse = uniforms.mouse.xy / res;
  
  // Create a dynamic fluid-like pattern
  var p = uv * 2.0 - 1.0;
  p.x *= res.x / res.y; // Aspect ratio correction
  
  // Multiple rotating waves
  let wave1 = sin(length(p) * 8.0 - t * 3.0);
  let wave2 = sin(atan2(p.y, p.x) * 6.0 + t * 2.0);
  let wave3 = sin(dot(p, vec2<f32>(cos(t * 0.5), sin(t * 0.7))) * 5.0);
  
  // Mouse interaction
  let mouseInfluence = 1.0 - smoothstep(0.0, 0.3, distance(uv, mouse));
  let ripple = sin(distance(uv, mouse) * 20.0 - t * 8.0) * mouseInfluence;
  
  // Combine waves
  let intensity = (wave1 + wave2 + wave3 + ripple) * 0.25;
  
  // Create color based on position and waves
  let r = 0.5 + 0.5 * sin(intensity + t);
  let g = 0.5 + 0.5 * sin(intensity + t + 2.094);
  let b = 0.5 + 0.5 * sin(intensity + t + 4.188);
  
  // Add some turbulence
  let noise = sin(p.x * 10.0) * sin(p.y * 10.0) * 0.1;
  
  return vec4<f32>(r + noise, g + noise, b + noise, 1.0);
}