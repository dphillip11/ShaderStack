// this handles data fetching from backend and allows fallback to local storage
import { apiGet, apiPost, apiPut, apiDelete } from './backend_api.js';


/**
 * Create default project structure
 */
export function createDefaultProject(name = 'New Shader Project') {
    return {
      name,
      shader_scripts: [
        {
          id: 1,
          code: `@vertex
  fn vs_main(@builtin(vertex_index) vertex_index: u32) -> @builtin(position) vec4<f32> {
      var pos = array<vec2<f32>, 3>(
          vec2<f32>(-1.0, -1.0),
          vec2<f32>( 3.0, -1.0),
          vec2<f32>(-1.0,  3.0)
      );
      return vec4<f32>(pos[vertex_index], 0.0, 1.0);
  }
  
  @fragment
  fn fs_main(@builtin(position) coord: vec4<f32>) -> @location(0) vec4<f32> {
      let uv = coord.xy / u.resolution;
      let color = vec3<f32>(uv, 0.5 + 0.5 * sin(u.time));
      return vec4<f32>(color, 1.0);
  }`,
          buffer: {
            format: 'rgba8unorm',
            width: 512,
            height: 512
          }
        }
      ],
      tags: []
    };
  }
  
  /**
   * Create default script structure
   */
  export function createDefaultScript(id) {
    return {
      id,
      code: `@vertex
  fn vs_main(@builtin(vertex_index) vertex_index: u32) -> @builtin(position) vec4<f32> {
      var pos = array<vec2<f32>, 3>(
          vec2<f32>(-1.0, -1.0),
          vec2<f32>( 3.0, -1.0),
          vec2<f32>(-1.0,  3.0)
      );
      return vec4<f32>(pos[vertex_index], 0.0, 1.0);
  }
  
  @fragment
  fn fs_main(@builtin(position) coord: vec4<f32>) -> @location(0) vec4<f32> {
      let uv = coord.xy / u.resolution;
      // Sample from previous scripts if available
      // let previousColor = textureSample(buffer1, buffer1_sampler, uv);
      let color = vec3<f32>(uv, 0.5 + 0.5 * sin(u.time));
      return vec4<f32>(color, 1.0);
  }`,
      buffer: {
        format: 'rgba8unorm',
        width: 512,
        height: 512
      }
    };
  }