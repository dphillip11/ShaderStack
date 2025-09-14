const INJECTED_SCRIPT_TEMPLATE =  `
// Auto-injected uniforms
struct Uniforms {
    time: f32,
    mouse: vec2<f32>,
    resolution: vec2<f32>,
    frame: u32,
}

@group(0) @binding(0) var<uniform> u: Uniforms;

// Auto-injected texture bindings
`;

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

export function ComputeInjectedCode(availableBuffers, withVertexShader = true) {
  let injectedCode = INJECTED_SCRIPT_TEMPLATE;
  
  // Add texture bindings for available buffers
  let textureBindings = '';
  let bindingIndex = 1;
  
  for (const [scriptId, bufferSpec] of availableBuffers) {
    textureBindings += `@group(0) @binding(${bindingIndex}) var buffer${scriptId}: texture_2d<f32>;\n`;
    textureBindings += `@group(0) @binding(${bindingIndex + 1}) var buffer${scriptId}_sampler: sampler;\n`;
    bindingIndex += 2;
  }

  injectedCode += textureBindings;
  injectedCode += '\n// User code begins here\n';

  if (withVertexShader) {
    injectedCode = DEFAULT_VERTEX_SHADER + '\n' + injectedCode;
  }

  return injectedCode;
}

export function CompileScript(script, device) {
  try {
    const shaderModule = device.createShaderModule({
      code: script,
      label: 'Compiled Shader'
    });
    
    return shaderModule;
  } catch (error) {
    throw new Error(`Shader compilation error: ${error.message}`);
  }
}

export function ExtractErrors(shaderModule) {
  return shaderModule.getCompilationInfo().then(info => {
    return info.messages.filter(msg => msg.type === 'error');
  });
}


