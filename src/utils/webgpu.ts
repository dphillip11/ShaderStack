import type { WebGPUContext } from '../types';

export class WebGPUUtils {
  static async initWebGPU(canvas: HTMLCanvasElement): Promise<WebGPUContext> {
    if (!navigator.gpu) {
      throw new Error('WebGPU is not supported in this browser');
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error('Failed to get WebGPU adapter');
    }

    const device = await adapter.requestDevice();
    const context = canvas.getContext('webgpu') as GPUCanvasContext;
    if (!context) {
      throw new Error('Failed to get WebGPU context');
    }

    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
      device,
      format,
    });

    return { device, canvas, context, format };
  }

  static createBuffer(
    device: GPUDevice,
    data: Float32Array | Uint32Array,
    usage: GPUBufferUsageFlags
  ): GPUBuffer {
    const buffer = device.createBuffer({
      size: data.byteLength,
      usage,
      mappedAtCreation: true,
    });

    new (data.constructor as any)(buffer.getMappedRange()).set(data);
    buffer.unmap();
    return buffer;
  }

  static createTexture(
    device: GPUDevice,
    width: number,
    height: number,
    format: GPUTextureFormat = 'rgba8unorm',
    usage: GPUTextureUsageFlags = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
  ): GPUTexture {
    return device.createTexture({
      size: { width, height },
      format,
      usage,
    });
  }

  static createBindGroupLayout(
    device: GPUDevice,
    entries: GPUBindGroupLayoutEntry[]
  ): GPUBindGroupLayout {
    return device.createBindGroupLayout({ entries });
  }

  static createRenderPipeline(
    device: GPUDevice,
    vertexShader: string,
    fragmentShader: string,
    format: GPUTextureFormat,
    layout?: GPUPipelineLayout
  ): GPURenderPipeline {
    const vertexModule = device.createShaderModule({ code: vertexShader });
    const fragmentModule = device.createShaderModule({ code: fragmentShader });

    return device.createRenderPipeline({
      layout: layout || 'auto',
      vertex: {
        module: vertexModule,
        entryPoint: 'vs_main',
        buffers: [{
          arrayStride: 4 * 4, // 4 floats per vertex (x, y, u, v)
          attributes: [
            { format: 'float32x2', offset: 0, shaderLocation: 0 }, // position
            { format: 'float32x2', offset: 8, shaderLocation: 1 }, // uv
          ],
        }],
      },
      fragment: {
        module: fragmentModule,
        entryPoint: 'fs_main',
        targets: [{ format }],
      },
      primitive: {
        topology: 'triangle-list',
      },
    });
  }
}