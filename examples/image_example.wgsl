// Image Pass Example - Final Composition
struct Uniforms {
  time: f32,
  resolution: vec2<f32>,
  mouse: vec4<f32>,
  frame: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var iChannel0: texture_2d<f32>; // Buffer A (fluid)
@group(0) @binding(2) var iSampler0: sampler;
@group(0) @binding(3) var iChannel1: texture_2d<f32>; // Buffer B (processed)
@group(0) @binding(4) var iSampler1: sampler;

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let t = uniforms.time;
  let res = uniforms.resolution;
  
  // Sample both buffers
  let fluidPattern = textureSample(iChannel0, iSampler0, uv);
  let processedPattern = textureSample(iChannel1, iSampler1, uv);
  
  // Create distortion effect using fluid pattern
  let distortion = (fluidPattern.rg - 0.5) * 0.02 * sin(t * 3.0);
  let distortedUV = uv + distortion;
  
  // Sample with distortion
  let distortedFluid = textureSample(iChannel0, iSampler0, distortedUV);
  let distortedProcessed = textureSample(iChannel1, iSampler1, distortedUV);
  
  // Create depth effect based on distance from center
  let centerDist = length(uv - 0.5);
  let depth = 1.0 - smoothstep(0.0, 0.7, centerDist);
  
  // Blend the two patterns
  let blendFactor = 0.5 + 0.3 * sin(t * 2.0 + centerDist * 8.0);
  let blended = mix(distortedFluid.rgb, distortedProcessed.rgb, blendFactor);
  
  // Add chromatic aberration for style
  let offset = 0.003 * sin(t * 5.0);
  let r = textureSample(iChannel1, iSampler1, uv + vec2<f32>(offset, 0.0)).r;
  let g = blended.g;
  let b = textureSample(iChannel1, iSampler1, uv - vec2<f32>(offset, 0.0)).b;
  
  var finalColor = vec3<f32>(r, g, b);
  
  // Apply depth and enhance colors
  finalColor *= depth;
  finalColor = pow(finalColor, vec3<f32>(0.9)); // Slight gamma correction
  
  // Add subtle vignette
  let vignette = 1.0 - centerDist * 0.8;
  finalColor *= vignette;
  
  // Boost saturation
  let luminance = dot(finalColor, vec3<f32>(0.299, 0.587, 0.114));
  finalColor = mix(vec3<f32>(luminance), finalColor, 1.3);
  
  return vec4<f32>(finalColor, 1.0);
}