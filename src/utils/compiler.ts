import type { CompilationError } from '../types';

export class ShaderCompiler {
  private device: GPUDevice;

  constructor(device: GPUDevice) {
    this.device = device;
  }

  async compileShader(source: string, _type: 'vertex' | 'fragment'): Promise<{
    module: GPUShaderModule | null;
    errors: CompilationError[];
  }> {
    const errors: CompilationError[] = [];

    try {
      const module = this.device.createShaderModule({
        code: source,
      });

      // Check for compilation errors
      const info = await module.getCompilationInfo();
      
      for (const message of info.messages) {
        errors.push({
          line: message.lineNum || 0,
          column: message.linePos || 0,
          message: message.message,
          type: message.type === 'error' ? 'error' : 'warning',
        });
      }

      if (errors.some(e => e.type === 'error')) {
        return { module: null, errors };
      }

      return { module, errors };
    } catch (error) {
      errors.push({
        line: 0,
        column: 0,
        message: error instanceof Error ? error.message : 'Unknown compilation error',
        type: 'error',
      });
      return { module: null, errors };
    }
  }

  static getDefaultVertexShader(): string {
    return `
struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

@vertex
fn vs_main(@location(0) position: vec2<f32>, @location(1) uv: vec2<f32>) -> VertexOutput {
  var output: VertexOutput;
  output.position = vec4<f32>(position, 0.0, 1.0);
  output.uv = uv;
  return output;
}
`;
  }

  static getDefaultFragmentShader(): string {
    return `
struct Uniforms {
  time: f32,
  resolution: vec2<f32>,
  mouse: vec4<f32>,
  frame: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  // Simple animated gradient that should be visible
  let col = 0.5 + 0.5 * cos(uniforms.time + uv.xyx + vec3<f32>(0.0, 2.0, 4.0));
  
  return vec4<f32>(col, 1.0);
}
`;
  }

  static validateWGSL(source: string): CompilationError[] {
    const errors: CompilationError[] = [];
    const lines = source.split('\n');

    // Basic syntax validation
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNum = i + 1;

      // Check for common WGSL syntax errors
      if (line.includes('gl_') && !line.includes('//')) {
        errors.push({
          line: lineNum,
          column: line.indexOf('gl_'),
          message: 'OpenGL built-ins (gl_*) are not supported in WGSL. Use @builtin() attributes instead.',
          type: 'error',
        });
      }

      if (line.includes('texture2D') && !line.includes('//')) {
        errors.push({
          line: lineNum,
          column: line.indexOf('texture2D'),
          message: 'texture2D is not supported in WGSL. Use textureSample() instead.',
          type: 'error',
        });
      }

      if (line.includes('varying') && !line.includes('//')) {
        errors.push({
          line: lineNum,
          column: line.indexOf('varying'),
          message: 'varying is not supported in WGSL. Use @location() attributes instead.',
          type: 'error',
        });
      }
    }

    return errors;
  }
}