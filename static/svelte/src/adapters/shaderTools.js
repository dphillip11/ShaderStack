const INJECTED_SCRIPT_TEMPLATE =  `
// Auto-injected uniforms
struct Uniforms {
    time: f32,
    mouse: vec2<f32>,
    resolution: vec2<f32>,
    frame: u32,
}

@group(0) @binding(0) var<uniform> u: Uniforms;
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
//   bufferWidth?: number,
//   bufferHeight?: number,
// }
export function ComputeInjectedCode(availableScripts, options = {}, commonScript) {
  const { 
    withVertexShader = true, 
    kind = 'fragment', 
    storageFormat = null,
    bufferWidth = 32,
    bufferHeight = 32
  } = options;
  let injectedCode = INJECTED_SCRIPT_TEMPLATE;

  // inject common script
  injectedCode += `\n// Common Script\n${commonScript}\n\n// Auto-injected texture bindings\n`;

  // Add bindings for available scripts (texture for fragment, storage buffer for compute)
  let bindings = '';
  let bindingIndex = 1;

  console.log(`ComputeInjectedCode for ${kind} shader, available scripts:`, Array.from(availableScripts.keys()));

  for (const [scriptId, scriptInfo] of availableScripts) {
    const scriptKind = scriptInfo.kind || 'fragment';
    console.log(`  Script ${scriptId}: kind=${scriptKind}, binding=${bindingIndex}`);
    
    if (scriptKind === 'compute') {
      // Storage buffer binding for compute scripts (read-write access)
      const width = scriptInfo.buffer?.width || 32;
      const height = scriptInfo.buffer?.height || 32;
      bindings += `@group(0) @binding(${bindingIndex}) var<storage, read_write> buffer${scriptId}: array<vec4<f32>, ${width * height}>;\n`;
      bindingIndex += 1;
    } else {
      // Texture bindings for fragment scripts
      bindings += `@group(0) @binding(${bindingIndex}) var buffer${scriptId}: texture_2d<f32>;\n`;
      bindings += `@group(0) @binding(${bindingIndex + 1}) var buffer${scriptId}_sampler: sampler;\n`;
      bindingIndex += 2;
    }
  }

  // For compute shaders, always use storage buffer (better performance than storage textures)
  if (kind === 'compute') {
    // Create a 2D storage buffer using width and height
    bindings += `// 2D Storage Buffer: ${bufferWidth}x${bufferHeight}\n`;
    bindings += `@group(0) @binding(${bindingIndex}) var<storage, read_write> outBuffer: array<vec4<f32>, ${bufferWidth * bufferHeight}>;\n`;
  }

  injectedCode += bindings;
  injectedCode += '\n// User code begins here\n';

  console.log(`Generated injected code:\n${injectedCode}`);

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


