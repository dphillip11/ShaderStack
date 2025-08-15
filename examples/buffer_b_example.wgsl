// Buffer B Example - Reaction-Diffusion Pattern
struct Uniforms {
  time: f32,
  resolution: vec2<f32>,
  mouse: vec4<f32>,
  frame: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var iChannel0: texture_2d<f32>; // Buffer A
@group(0) @binding(2) var iSampler0: sampler;

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let t = uniforms.time;
  let res = uniforms.resolution;
  let texel = 1.0 / res;
  
  // Sample Buffer A (the fluid pattern)
  let center = textureSample(iChannel0, iSampler0, uv);
  
  // Sample neighboring pixels for edge detection
  let left = textureSample(iChannel0, iSampler0, uv + vec2<f32>(-texel.x, 0.0));
  let right = textureSample(iChannel0, iSampler0, uv + vec2<f32>(texel.x, 0.0));
  let up = textureSample(iChannel0, iSampler0, uv + vec2<f32>(0.0, -texel.y));
  let down = textureSample(iChannel0, iSampler0, uv + vec2<f32>(0.0, texel.y));
  
  // Calculate edge detection (Sobel-like)
  let edgeX = (right.rgb - left.rgb) * 0.5;
  let edgeY = (down.rgb - up.rgb) * 0.5;
  let edgeMagnitude = length(edgeX) + length(edgeY);
  
  // Create animated cellular automata pattern
  let cellSize = 20.0;
  let cell = floor(uv * cellSize) / cellSize;
  let cellNoise = sin(cell.x * 43.0 + cell.y * 17.0 + t * 2.0);
  
  // Combine edge detection with cellular pattern
  let pattern = smoothstep(0.1, 0.3, edgeMagnitude) * (0.5 + 0.5 * cellNoise);
  
  // Add pulsing effect
  let pulse = 0.5 + 0.5 * sin(t * 4.0 + length(uv - 0.5) * 10.0);
  
  // Create final color with enhanced contrast
  let finalColor = center.rgb * (1.0 + pattern * pulse);
  finalColor = pow(finalColor, vec3<f32>(0.8)); // Gamma correction
  
  return vec4<f32>(finalColor, 1.0);
}