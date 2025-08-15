import type { WebGPUContext, ShaderPass, RenderBuffer, ShaderUniforms } from '../../types';
import { WebGPUUtils } from '../../utils/webgpu';

export class WebGPURenderer {
  private context: WebGPUContext;
  private buffers: Map<string, RenderBuffer> = new Map();
  private passes: ShaderPass[] = [];
  private pipelines: Map<string, GPURenderPipeline> = new Map();
  private uniformBuffer!: GPUBuffer;
  private uniformBindGroupLayout!: GPUBindGroupLayout;
  private vertexBuffer!: GPUBuffer;
  private startTime: number;
  private frame: number = 0;
  private mouse: [number, number, number, number] = [0, 0, 0, 0];

  constructor(context: WebGPUContext) {
    this.context = context;
    this.startTime = Date.now();
    this.setupBuffers();
    this.setupMouse();
  }

  private setupBuffers() {
    // Create fullscreen quad vertices
    const vertices = new Float32Array([
      -1, -1, 0, 1,  // bottom-left
       1, -1, 1, 1,  // bottom-right
      -1,  1, 0, 0,  // top-left
       1,  1, 1, 0,  // top-right
      -1,  1, 0, 0,  // top-left
       1, -1, 1, 1,  // bottom-right
    ]);

    this.vertexBuffer = WebGPUUtils.createBuffer(
      this.context.device,
      vertices,
      GPUBufferUsage.VERTEX
    );

    // Create uniform buffer
    this.uniformBuffer = this.context.device.createBuffer({
      size: 64, // time(4) + resolution(8) + mouse(16) + frame(4) + padding
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Create bind group layout for uniforms
    this.uniformBindGroupLayout = WebGPUUtils.createBindGroupLayout(
      this.context.device,
      [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
      ]
    );
  }

  private setupMouse() {
    this.context.canvas.addEventListener('mousemove', (e) => {
      const rect = this.context.canvas.getBoundingClientRect();
      this.mouse[0] = e.clientX - rect.left;
      this.mouse[1] = rect.height - (e.clientY - rect.top);
    });

    this.context.canvas.addEventListener('mousedown', () => {
      this.mouse[2] = this.mouse[0];
      this.mouse[3] = this.mouse[1];
    });

    this.context.canvas.addEventListener('mouseup', () => {
      this.mouse[2] = 0;
      this.mouse[3] = 0;
    });
  }

  async addPass(pass: ShaderPass) {
    this.passes.push(pass);
    this.createPassBuffers(pass);
    await this.createRenderPipeline(pass);
  }

  removePass(passId: string) {
    const index = this.passes.findIndex(p => p.id === passId);
    if (index !== -1) {
      this.passes.splice(index, 1);
      this.buffers.delete(passId);
      this.pipelines.delete(passId);
    }
  }

  private createPassBuffers(pass: ShaderPass) {
    for (const output of pass.outputs) {
      const size = output.size || [this.context.canvas.width, this.context.canvas.height];
      const texture = WebGPUUtils.createTexture(
        this.context.device,
        size[0],
        size[1],
        output.format
      );

      this.buffers.set(`${pass.id}_${output.name}`, {
        texture,
        view: texture.createView(),
        format: output.format,
        size,
      });
    }
  }

  private async createRenderPipeline(pass: ShaderPass) {
    try {
      const vertexShader = pass.vertexShader || this.getDefaultVertexShader();
      const fragmentShader = pass.fragmentShader;

      const pipeline = WebGPUUtils.createRenderPipeline(
        this.context.device,
        vertexShader,
        fragmentShader,
        this.context.format,
        this.createPipelineLayout()
      );

      this.pipelines.set(pass.id, pipeline);
      console.log(`Created render pipeline for pass: ${pass.id}`);
    } catch (error) {
      console.error(`Failed to create render pipeline for pass ${pass.id}:`, error);
    }
  }

  private createPipelineLayout(): GPUPipelineLayout {
    return this.context.device.createPipelineLayout({
      bindGroupLayouts: [this.uniformBindGroupLayout],
    });
  }

  private getDefaultVertexShader(): string {
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
}`;
  }

  updateUniforms() {
    const now = Date.now();
    const time = (now - this.startTime) / 1000;
    const resolution = [this.context.canvas.width, this.context.canvas.height];
    const date = new Date();
    
    const uniforms: ShaderUniforms = {
      time,
      resolution: resolution as [number, number],
      mouse: this.mouse,
      frame: this.frame,
      timeDelta: 1 / 60, // Assume 60fps for now
      date: [
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds()
      ],
    };

    // Pack uniforms into buffer
    const uniformData = new Float32Array([
      uniforms.time,
      0, 0, 0, // padding
      uniforms.resolution[0],
      uniforms.resolution[1],
      0, 0, // padding
      uniforms.mouse[0],
      uniforms.mouse[1],
      uniforms.mouse[2],
      uniforms.mouse[3],
      uniforms.frame,
      0, 0, 0, // padding
    ]);

    this.context.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);
  }

  render() {
    this.updateUniforms();

    const commandEncoder = this.context.device.createCommandEncoder();

    // Render each pass
    for (const pass of this.passes) {
      if (!pass.enabled) continue;

      this.renderPass(commandEncoder, pass);
    }

    this.context.device.queue.submit([commandEncoder.finish()]);
    this.frame++;
  }

  private renderPass(commandEncoder: GPUCommandEncoder, pass: ShaderPass) {
    // Get the render pipeline for this pass
    const pipeline = this.pipelines.get(pass.id);
    if (!pipeline) {
      console.warn(`No render pipeline found for pass: ${pass.id}`);
      return;
    }

    // Get render target
    const renderTarget = pass.outputs.length > 0 
      ? this.buffers.get(`${pass.id}_${pass.outputs[0].name}`)?.view
      : this.context.context.getCurrentTexture().createView();

    if (!renderTarget) {
      console.warn(`No render target found for pass: ${pass.id}`);
      return;
    }

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: renderTarget,
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    // Create bind group for uniforms
    const uniformBindGroup = this.context.device.createBindGroup({
      layout: this.uniformBindGroupLayout,
      entries: [{
        binding: 0,
        resource: { buffer: this.uniformBuffer },
      }],
    });

    renderPass.setPipeline(pipeline);
    renderPass.setVertexBuffer(0, this.vertexBuffer);
    renderPass.setBindGroup(0, uniformBindGroup);
    renderPass.draw(6); // Draw fullscreen quad
    renderPass.end();
  }

  resize(width: number, height: number) {
    this.context.canvas.width = width;
    this.context.canvas.height = height;
    
    // Recreate buffers for passes that use canvas size
    for (const pass of this.passes) {
      for (const output of pass.outputs) {
        if (!output.size) {
          this.createPassBuffers(pass);
        }
      }
    }
  }

  getBuffer(name: string): RenderBuffer | undefined {
    return this.buffers.get(name);
  }

  destroy() {
    this.uniformBuffer.destroy();
    this.vertexBuffer.destroy();
    
    for (const buffer of this.buffers.values()) {
      buffer.texture.destroy();
    }
    this.buffers.clear();
    this.pipelines.clear();
  }
}