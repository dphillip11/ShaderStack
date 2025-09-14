import { get } from 'svelte/store';
import { activeShader, activeScript, setCompiledInjectedCode } from '../stores/activeShader.js';
import { isRunning } from '../stores/editor.js';
import { addCompileError, clearCompileErrors } from '../stores/logging.js';
import { DEFAULT_VERTEX_SHADER } from '../constants.js';

const SAMPLE_TEXTURE_SHADER_SCRIPT = `
@vertex
fn vs_main(@builtin(vertex_index) vertex_index: u32) -> @builtin(position) vec4<f32> {
    var pos = array<vec2<f32>, 3>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>( 3.0, -1.0),
        vec2<f32>(-1.0,  3.0)
    );
    return vec4<f32>(pos[vertex_index], 0.0, 1.0);
}

@group(0) @binding(0) var sourceTexture: texture_2d<f32>;
@group(0) @binding(1) var sourceSampler: sampler;

@fragment
fn fs_main(@builtin(position) coord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = coord.xy / vec2<f32>(${this.canvas.width}, ${this.canvas.height});
    return textureSample(sourceTexture, sourceSampler, uv);
}`;

class ScriptEngine {
  constructor(device, shaderCompiler) {
    this.device = device;
    this.shaderCompiler = shaderCompiler;
    this.scripts = new Map();
    this.uniformData = new Float32Array(8);
    this.frame = 0;
    this.mousePos = { x: 0, y: 0 };
    this.startTime = performance.now();
  }

  async createScript(scriptId, code, bufferSpec) {
    try {
      // Clear any previous compilation errors for this script
      clearCompileErrors(scriptId);
      
      const availableBuffers = new Map();
      
      // Get available buffers from all scripts in the current shader
      const shader = get(activeShader);
      if (shader && shader.shader_scripts) {
        for (const script of shader.shader_scripts) {
          if (script.id !== scriptId) {
            availableBuffers.set(script.id, script.buffer);
          }
        }
      }

      console.log(`Creating script ${scriptId} with available buffers:`, Array.from(availableBuffers.keys()));
      const fullCode = this.shaderCompiler.injectBufferBindings(code, availableBuffers);
      const shaderModule = await this.shaderCompiler.compile(fullCode, this.device);

      const bindGroupLayoutEntries = [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' }
        }
      ];

      let bindingIndex = 1;
      for (const [id, bufferData] of availableBuffers) {
        bindGroupLayoutEntries.push(
          {
            binding: bindingIndex,
            visibility: GPUShaderStage.FRAGMENT,
            texture: { sampleType: 'float' }
          },
          {
            binding: bindingIndex + 1,
            visibility: GPUShaderStage.FRAGMENT,
            sampler: {}
          }
        );
        bindingIndex += 2;
      }

      const bindGroupLayout = this.device.createBindGroupLayout({
        label: `Script ${scriptId} Bind Group Layout`,
        entries: bindGroupLayoutEntries
      });

      const pipelineLayout = this.device.createPipelineLayout({
        label: `Script ${scriptId} Pipeline Layout`,
        bindGroupLayouts: [bindGroupLayout]
      });

      const renderPipeline = this.device.createRenderPipeline({
        label: `Script ${scriptId} Pipeline`,
        layout: pipelineLayout,
        vertex: {
          module: shaderModule,
          entryPoint: 'vs_main'
        },
        fragment: {
          module: shaderModule,
          entryPoint: 'fs_main',
          targets: [{
            format: bufferSpec.format || 'rgba8unorm'
          }]
        },
        primitive: {
          topology: 'triangle-list'
        }
      });

      const texture = this.device.createTexture({
        label: `Script ${scriptId} Output`,
        size: [bufferSpec.width || 512, bufferSpec.height || 512],
        format: bufferSpec.format || 'rgba8unorm',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
      });

      const uniformBuffer = this.device.createBuffer({
        label: `Script ${scriptId} Uniforms`,
        size: this.uniformData.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      });

      const sampler = this.device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
        wrapS: 'clamp-to-edge',
        wrapT: 'clamp-to-edge'
      });

      const bindGroupEntries = [
        { binding: 0, resource: { buffer: uniformBuffer } }
      ];

      bindingIndex = 1;
      // Add texture bindings for scripts that are actually compiled
      for (const [id, bufferData] of availableBuffers) {
        const compiledScript = this.scripts.get(id);
        if (compiledScript && compiledScript.texture) {
          bindGroupEntries.push(
            { binding: bindingIndex, resource: compiledScript.texture.createView() },
            { binding: bindingIndex + 1, resource: sampler }
          );
        } else {
          // Create placeholder bindings for scripts that aren't compiled yet
          // We'll need to rebuild this bind group when those scripts are compiled
          bindGroupEntries.push(
            { binding: bindingIndex, resource: texture.createView() }, // Use own texture as placeholder
            { binding: bindingIndex + 1, resource: sampler }
          );
        }
        bindingIndex += 2;
      }

      const bindGroup = this.device.createBindGroup({
        label: `Script ${scriptId} Bind Group`,
        layout: bindGroupLayout,
        entries: bindGroupEntries
      });

      this.scripts.set(scriptId, {
        bufferSpec,
        renderPipeline,
        texture,
        uniformBuffer,
        bindGroup,
        bindGroupLayout,
        sampler,
        code: fullCode
      });

      console.log(`Script ${scriptId} compiled successfully`);
      return true;
    } catch (error) {
      console.error(`Script ${scriptId} compilation failed:`, error.message);
      console.log('Adding compile error to store for script:', scriptId, error.message);
      addCompileError(scriptId, error.message);
      throw error;
    }
  }

  async executeScript(scriptId) {
    const script = this.scripts.get(scriptId);
    if (!script) {
      throw new Error(`Script ${scriptId} not found`);
    }

    try {
      const currentTime = (performance.now() - this.startTime) / 1000;

      this.uniformData[0] = currentTime;
      this.uniformData[1] = 0;
      this.uniformData[2] = this.mousePos.x;
      this.uniformData[3] = this.mousePos.y;
      this.uniformData[4] = script.bufferSpec.width || 512;
      this.uniformData[5] = script.bufferSpec.height || 512;
      this.uniformData[6] = this.frame;
      this.uniformData[7] = 0;

      this.device.queue.writeBuffer(script.uniformBuffer, 0, this.uniformData);

      const commandEncoder = this.device.createCommandEncoder({
        label: `Script ${scriptId} Commands`
      });

      const renderPass = commandEncoder.beginRenderPass({
        label: `Script ${scriptId} Render Pass`,
        colorAttachments: [{
          view: script.texture.createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: 'clear',
          storeOp: 'store'
        }]
      });

      renderPass.setPipeline(script.renderPipeline);
      renderPass.setBindGroup(0, script.bindGroup);
      renderPass.draw(3);
      renderPass.end();

      this.device.queue.submit([commandEncoder.finish()]);

      return script.texture;
    } catch (error) {
      console.error(`Script ${scriptId} execution failed:`, error.message);
      throw error;
    }
  }

  updateMousePosition(x, y) {
    this.mousePos = { x, y };
  }

  incrementFrame() {
    this.frame++;
  }

  deleteScript(scriptId) {
    const script = this.scripts.get(scriptId);
    if (script) {
      script.texture?.destroy();
      script.uniformBuffer?.destroy();
      this.scripts.delete(scriptId);
    }
  }

  async rebuildAllBindGroups() {
    for (const [scriptId, scriptData] of this.scripts) {
      await this.rebuildBindGroup(scriptId);
    }
  }

  async rebuildBindGroup(scriptId) {
    const script = this.scripts.get(scriptId);
    if (!script || !script.bindGroupLayout) return;

    const bindGroupEntries = [
      { binding: 0, resource: { buffer: script.uniformBuffer } }
    ];

    // Get available buffers from the current shader
    const shader = get(activeShader);
    let bindingIndex = 1;
    
    if (shader && shader.shader_scripts) {
      for (const shaderScript of shader.shader_scripts) {
        if (shaderScript.id !== scriptId) {
          const compiledScript = this.scripts.get(shaderScript.id);
          if (compiledScript && compiledScript.texture) {
            bindGroupEntries.push(
              { binding: bindingIndex, resource: compiledScript.texture.createView() },
              { binding: bindingIndex + 1, resource: script.sampler }
            );
          } else {
            // Use placeholder if script not compiled yet
            bindGroupEntries.push(
              { binding: bindingIndex, resource: script.texture.createView() },
              { binding: bindingIndex + 1, resource: script.sampler }
            );
          }
          bindingIndex += 2;
        }
      }
    }

    script.bindGroup = this.device.createBindGroup({
      label: `Script ${scriptId} Bind Group`,
      layout: script.bindGroupLayout,
      entries: bindGroupEntries
    });
  }
}

class WebGPUWorkspace {
  constructor() {
    this.device = null;
    this.context = null;
    this.canvas = null;
    this.shaderCompiler = new ShaderCompiler();
    this.scriptEngine = null;
    this.animationId = null;
    this.isRealTimeRunning = false;
    this.copyPipeline = null;
    this.copySampler = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      console.log('Initializing WebGPU workspace...');

      if (!navigator.gpu) {
        throw new Error('WebGPU not supported in this browser');
      }

      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        throw new Error('No WebGPU adapter found');
      }

      this.device = await adapter.requestDevice();
      
      this.canvas = document.getElementById('webgpu-canvas');
      if (!this.canvas) {
        throw new Error('WebGPU canvas not found');
      }

      this.context = this.canvas.getContext('webgpu');
      const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
      
      this.context.configure({
        device: this.device,
        format: canvasFormat,
        alphaMode: 'premultiplied'
      });

      this.scriptEngine = new ScriptEngine(this.device, this.shaderCompiler);

      this.setupMouseTracking();
      this.isInitialized = true;

      console.log('WebGPU workspace initialized successfully');
    } catch (error) {
      console.error(`Initialization failed: ${error.message}`);
      throw error;
    }
  }

  setupMouseTracking() {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      this.scriptEngine.updateMousePosition(x, y);
    });
  }

  async compileScript(scriptId, code, bufferSpec) {
    try {
      await this.scriptEngine.createScript(scriptId, code, bufferSpec);
      await this.scriptEngine.rebuildAllBindGroups();
      
      // Clear any compilation errors on successful compilation
      clearCompileErrors(scriptId);
      
      // Update the injected code store with the compiled version
      const compiledScript = this.scriptEngine.scripts.get(scriptId);
      if (compiledScript && compiledScript.code) {
        setCompiledInjectedCode(scriptId, compiledScript.code);
      }
      
      return true;
    } catch (error) {
      throw error;
    }
  }

  async runCurrentScript() {
    try {
      const shader = get(activeShader);
      const script = get(activeScript);
      
      if (!shader || !script) {
        return; // Silently return if no script to run
      }

      await this.compileScript(script.id, script.code, script.buffer);
      await this.scriptEngine.executeScript(script.id);
      await this.updatePreview(script.id);
      this.scriptEngine.incrementFrame();
    } catch (error) {
      console.error(`Execution failed: ${error.message}`);
      throw error;
    }
  }

  async runAllScripts() {
    try {
      const shader = get(activeShader);
      
      if (!shader || !shader.shader_scripts) {
        return; // Silently return if no scripts
      }

      // Compile all scripts first
      for (const script of shader.shader_scripts) {
        await this.compileScript(script.id, script.code, script.buffer);
      }

      // Execute all scripts
      for (const script of shader.shader_scripts) {
        await this.scriptEngine.executeScript(script.id);
      }

      // Update preview with the active script
      const activeScriptData = get(activeScript);
      if (activeScriptData) {
        await this.updatePreview(activeScriptData.id);
      }

      this.scriptEngine.incrementFrame();
    } catch (error) {
      console.error(`Execution failed: ${error.message}`);
      throw error;
    }
  }

  async updatePreview(scriptId) {
    if (!scriptId) {
      const script = get(activeScript);
      scriptId = script?.id;
    }

    const activeScriptData = this.scriptEngine.scripts.get(scriptId);
    
    if (!activeScriptData || !activeScriptData.texture) {
      // Clear canvas if no script
      const commandEncoder = this.device.createCommandEncoder();
      const canvasTexture = this.context.getCurrentTexture();
      
      const renderPass = commandEncoder.beginRenderPass({
        colorAttachments: [{
          view: canvasTexture.createView(),
          clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1 },
          loadOp: 'clear',
          storeOp: 'store'
        }]
      });
      renderPass.end();
      
      this.device.queue.submit([commandEncoder.finish()]);
      return;
    }

    const commandEncoder = this.device.createCommandEncoder();
    const canvasTexture = this.context.getCurrentTexture();

    if (!this.copyPipeline) {
      const copyShaderModule = this.device.createShaderModule({
        code: SAMPLE_TEXTURE_SHADER_SCRIPT
      });

      this.copyPipeline = this.device.createRenderPipeline({
        label: 'Canvas Copy Pipeline',
        layout: 'auto',
        vertex: {
          module: copyShaderModule,
          entryPoint: 'vs_main'
        },
        fragment: {
          module: copyShaderModule,
          entryPoint: 'fs_main',
          targets: [{
            format: this.context.getPreferredFormat ? this.context.getPreferredFormat() : 'bgra8unorm'
          }]
        },
        primitive: {
          topology: 'triangle-list'
        }
      });

      this.copySampler = this.device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear'
      });
    }

    const copyBindGroup = this.device.createBindGroup({
      layout: this.copyPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: activeScriptData.texture.createView() },
        { binding: 1, resource: this.copySampler }
      ]
    });

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: canvasTexture.createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store'
      }]
    });

    renderPass.setPipeline(this.copyPipeline);
    renderPass.setBindGroup(0, copyBindGroup);
    renderPass.draw(3);
    renderPass.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }

  startRealTime() {
    if (this.isRealTimeRunning) return;
    
    this.isRealTimeRunning = true;
    console.log('Starting real-time mode...');
    
    const animate = async () => {
      if (!this.isRealTimeRunning) return;
      
      try {
        await this.runCurrentScript();
      } catch (error) {
        // Only log significant errors, not missing scripts
      }
      
      this.animationId = requestAnimationFrame(animate);
    };
    
    animate();
  }

  stopRealTime() {
    this.isRealTimeRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    console.log('Stopped real-time mode');
  }

  deleteScript(scriptId) {
    this.scriptEngine.deleteScript(scriptId);
  }
}

let workspace = null;

export async function initWorkspace() {
  if (!workspace) {
    workspace = new WebGPUWorkspace();
    window.__workspaceRef = workspace;
  }
  await workspace.initialize();
  return workspace;
}

export function startRealTime() {
  if (!workspace || !workspace.isInitialized) {
    throw new Error('Workspace not initialized');
  }
  workspace.startRealTime();
}

export function stopRealTime() {
  if (!workspace || !workspace.isInitialized) {
    throw new Error('Workspace not initialized');
  }
  workspace.stopRealTime();
}

export async function updatePreview() {
  if (!workspace || !workspace.isInitialized) {
    await initWorkspace();
  }
  await workspace.updatePreview();
}

export function deleteScriptFromWorkspace(scriptId) {
  if (!workspace) return;
  workspace.deleteScript(scriptId);
}

export function getWorkspace() {
  return workspace;
}

// Keep track of real-time state
export function isRealTimeRunning() {
  return workspace?.isRealTimeRunning || false;
}