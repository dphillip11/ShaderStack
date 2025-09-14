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

// options: {
//   withVertexShader?: boolean,
//   kind?: 'fragment' | 'compute',
//   storageFormat?: string,
// }
export function ComputeInjectedCode(availableBuffers, options = {}) {
  const { withVertexShader = true, kind = 'fragment', storageFormat = null } = options;
  let injectedCode = INJECTED_SCRIPT_TEMPLATE;

  // Add texture bindings for available buffers
  let bindings = '';
  let bindingIndex = 1;

  for (const [scriptId, _bufferSpec] of availableBuffers) {
    bindings += `@group(0) @binding(${bindingIndex}) var buffer${scriptId}: texture_2d<f32>;\n`;
    bindings += `@group(0) @binding(${bindingIndex + 1}) var buffer${scriptId}_sampler: sampler;\n`;
    bindingIndex += 2;
  }

  // For compute, add the storage texture binding for output
  if (kind === 'compute') {
    const fmt = storageFormat || 'rgba8unorm';
    bindings += `@group(0) @binding(${bindingIndex}) var outTex: texture_storage_2d<${fmt}, write>;\n`;
  }

  injectedCode += bindings;
  injectedCode += '\n// User code begins here\n';

  if (withVertexShader && kind !== 'compute') {
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


