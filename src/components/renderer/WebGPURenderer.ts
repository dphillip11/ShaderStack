import type { WebGPUContext, ShaderPass, RenderBuffer, ShaderUniforms } from '../../types';
import { ShaderCompiler } from '../../utils/compiler';
import { WebGPUUtils } from '../../utils/webgpu';

export class WebGPURenderer {
  private context: WebGPUContext;
  private buffers: Map<string, RenderBuffer> = new Map();
  private passes: ShaderPass[] = [];
  private pipelines: Map<string, GPURenderPipeline> = new Map();
  private bindGroupLayouts: Map<string, GPUBindGroupLayout> = new Map();
  private samplers: Map<string, GPUSampler> = new Map();
  private uniformBuffer!: GPUBuffer;
  private vertexBuffer!: GPUBuffer;
  private startTime: number;
  private frame: number = 0;
  private mouse: [number, number, number, number] = [0, 0, 0, 0];

  constructor(context: WebGPUContext) {
    this.context = context;
    this.startTime = Date.now();
    this.setupBuffers();
    this.setupMouse();
    this.createSamplers();
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

  private createSamplers() {
    // Create common samplers
    this.samplers.set('linear-repeat', this.context.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      addressModeU: 'repeat',
      addressModeV: 'repeat',
    }));

    this.samplers.set('linear-clamp', this.context.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge',
    }));

    this.samplers.set('nearest-repeat', this.context.device.createSampler({
      magFilter: 'nearest',
      minFilter: 'nearest',
      addressModeU: 'repeat',
      addressModeV: 'repeat',
    }));

    this.samplers.set('nearest-clamp', this.context.device.createSampler({
      magFilter: 'nearest',
      minFilter: 'nearest',
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge',
    }));
  }

  private getSampler(filter: string, wrap: string): GPUSampler {
    const key = `${filter}-${wrap === 'clamp' ? 'clamp' : 'repeat'}`;
    return this.samplers.get(key) || this.samplers.get('linear-clamp')!;
  }

  async addPass(pass: ShaderPass) {
    this.passes.push(pass);
    this.sortPassesByRenderOrder();
    this.createPassBuffers(pass);
    await this.createRenderPipeline(pass);
  }

  removePass(passId: string) {
    const index = this.passes.findIndex(p => p.id === passId);
    if (index !== -1) {
      this.passes.splice(index, 1);
      
      // Clean up resources for this pass
      this.pipelines.delete(passId);
      this.bindGroupLayouts.delete(passId);
      
      // Remove associated buffers
      const buffersToRemove = [];
      for (const [key, buffer] of this.buffers.entries()) {
        if (buffer.passId === passId) {
          buffer.texture.destroy();
          buffersToRemove.push(key);
        }
      }
      
      for (const key of buffersToRemove) {
        this.buffers.delete(key);
      }
      
      console.log(`Removed pass: ${passId}`);
    }
  }

  private sortPassesByRenderOrder() {
    this.passes.sort((a, b) => a.renderOrder - b.renderOrder);
  }

  private createPassBuffers(pass: ShaderPass) {
    // For buffer passes, create a render target texture
    if (pass.type === 'buffer') {
      const size = [this.context.canvas.width, this.context.canvas.height];
      const texture = WebGPUUtils.createTexture(
        this.context.device,
        size[0],
        size[1],
        'rgba8unorm'
      );

      this.buffers.set(pass.id, {
        texture,
        view: texture.createView(),
        format: 'rgba8unorm',
        size: size as [number, number],
        passId: pass.id,
        outputName: 'output',
      });
    }
  }

  private async createRenderPipeline(pass: ShaderPass) {
    try {
      const vertexShader = pass.vertexShader || await ShaderCompiler.getDefaultVertexShader();
      const fragmentShader = pass.fragmentShader;

      // Create bind group layout for this pass
      const bindGroupLayout = this.createBindGroupLayoutForPass(pass);
      this.bindGroupLayouts.set(pass.id, bindGroupLayout);

      const pipelineLayout = this.context.device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      });

      const pipeline = WebGPUUtils.createRenderPipeline(
        this.context.device,
        vertexShader,
        fragmentShader,
        this.getPassOutputFormat(pass),
        pipelineLayout
      );

      this.pipelines.set(pass.id, pipeline);
      console.log(`Created render pipeline for pass: ${pass.id}`);
    } catch (error) {
      console.error(`Failed to create render pipeline for pass ${pass.id}:`, error);
    }
  }

  private createBindGroupLayoutForPass(pass: ShaderPass): GPUBindGroupLayout {
    const entries: GPUBindGroupLayoutEntry[] = [];

    // Uniforms (always binding 0)
    entries.push({
      binding: 0,
      visibility: GPUShaderStage.FRAGMENT,
      buffer: { type: 'uniform' },
    });

    // Add texture inputs for each channel that has a source
    for (const channel of pass.channels) {
      if (channel.source) {
        // Texture binding (binding = channel.index * 2 + 1)
        entries.push({
          binding: channel.index * 2 + 1,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: 'float' },
        });

        // Sampler binding (binding = channel.index * 2 + 2)
        entries.push({
          binding: channel.index * 2 + 2,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {},
        });
      }
    }

    return this.context.device.createBindGroupLayout({ entries });
  }

  private getPassOutputFormat(pass: ShaderPass): GPUTextureFormat {
    if (pass.type === 'buffer') {
      return 'rgba8unorm';
    }
    return this.context.format; // Image pass renders to canvas
  }

  private createBindGroupForPass(pass: ShaderPass): GPUBindGroup {
    const layout = this.bindGroupLayouts.get(pass.id);
    if (!layout) {
      throw new Error(`No bind group layout found for pass: ${pass.id}`);
    }

    const entries: GPUBindGroupEntry[] = [];

    // Uniforms (always binding 0)
    entries.push({
      binding: 0,
      resource: { buffer: this.uniformBuffer },
    });

    // Add texture inputs for each channel that has a source
    for (const channel of pass.channels) {
      if (channel.source) {
        const buffer = this.buffers.get(channel.source);
        if (buffer) {
          // Texture binding
          entries.push({
            binding: channel.index * 2 + 1,
            resource: buffer.view,
          });

          // Sampler binding
          const sampler = this.getSampler(channel.filter, channel.wrap);
          entries.push({
            binding: channel.index * 2 + 2,
            resource: sampler,
          });
        } else {
          console.warn(`Channel texture not found: ${channel.source} for pass ${pass.id}`);
        }
      }
    }

    return this.context.device.createBindGroup({
      layout,
      entries,
    });
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

    // Render passes in order
    for (const pass of this.passes) {
      if (!pass.enabled) continue;
      this.renderPass(commandEncoder, pass);
    }

    this.context.device.queue.submit([commandEncoder.finish()]);
    this.frame++;
  }

  private renderPass(commandEncoder: GPUCommandEncoder, pass: ShaderPass) {
    const pipeline = this.pipelines.get(pass.id);
    if (!pipeline) {
      console.warn(`No render pipeline found for pass: ${pass.id}`);
      return;
    }

    // Get render target
    let renderTarget: GPUTextureView;
    if (pass.type === 'buffer') {
      const buffer = this.buffers.get(pass.id);
      if (!buffer) {
        console.warn(`No render target found for pass: ${pass.id}`);
        return;
      }
      renderTarget = buffer.view;
    } else {
      // Render to canvas
      renderTarget = this.context.context.getCurrentTexture().createView();
    }

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: renderTarget,
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: pass.type === 'buffer' ? 'clear' : 'load',
        storeOp: 'store',
      }],
    });

    // Create bind group with all inputs for this pass
    const bindGroup = this.createBindGroupForPass(pass);

    renderPass.setPipeline(pipeline);
    renderPass.setVertexBuffer(0, this.vertexBuffer);
    renderPass.setBindGroup(0, bindGroup);
    renderPass.draw(6);
    renderPass.end();
  }

  resize(width: number, height: number) {
    this.context.canvas.width = width;
    this.context.canvas.height = height;
    
    // Recreate buffers for passes that use canvas size
    for (const pass of this.passes) {
      if (pass.type === 'buffer') {
        this.createPassBuffers(pass);
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

  // Helper method to get available outputs for connecting to inputs
  getAvailableOutputs(): Array<{ passId: string, outputName: string, format: GPUTextureFormat }> {
    const outputs: Array<{ passId: string, outputName: string, format: GPUTextureFormat }> = [];
    
    for (const pass of this.passes) {
      if (pass.type === 'buffer') {
        outputs.push({
          passId: pass.id,
          outputName: 'output',
          format: 'rgba8unorm',
        });
      }
    }
    
    return outputs;
  }

  // Helper method to connect pass outputs to inputs
  connectPassOutput(sourcePassId: string, outputName: string, targetPassId: string, channelIndex: number) {
    const targetPass = this.passes.find(p => p.id === targetPassId);
    if (!targetPass) {
      console.error(`Target pass not found: ${targetPassId}`);
      return;
    }

    const channel = targetPass.channels[channelIndex];
    if (!channel) {
      console.error(`Channel not found: ${channelIndex} in pass ${targetPassId}`);
      return;
    }

    // Set the source reference
    channel.source = sourcePassId;
    
    // Recreate the pipeline with updated bindings
    this.createRenderPipeline(targetPass);
    
    console.log(`Connected ${sourcePassId}.${outputName} to ${targetPassId}.channel${channelIndex}`);
  }

  updatePassChannels(passId: string, channels: any[]) {
    const pass = this.passes.find(p => p.id === passId);
    if (!pass) {
      console.error(`Pass not found: ${passId}`);
      return;
    }

    // Update the pass channels
    pass.channels = channels;
    
    // Recreate the pipeline with updated bindings
    this.createRenderPipeline(pass);
    
    console.log(`Updated channels for pass: ${passId}`);
  }

  async updatePassShader(passId: string, fragmentShader: string) {
    const pass = this.passes.find(p => p.id === passId);
    if (!pass) {
      console.error(`Pass not found: ${passId}`);
      return;
    }

    // Update the shader code
    pass.fragmentShader = fragmentShader;
    
    // Recreate the render pipeline with new shader
    await this.createRenderPipeline(pass);
    
    console.log(`Updated shader for pass: ${passId}`);
  }
}