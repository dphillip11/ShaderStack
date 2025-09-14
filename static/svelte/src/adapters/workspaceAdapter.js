import { get } from 'svelte/store';
import { activeShader, activeScript, updateScriptRuntime } from '../stores/activeShader.js';
import { ComputeInjectedCode, CompileScript, ExtractErrors } from './shaderTools.js';

// Simple full-screen triangle copy shader with passthrough UVs
const SAMPLE_TEXTURE_SHADER_SCRIPT = `
struct VSOut {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

@vertex
fn vs_main(@builtin(vertex_index) vertex_index: u32) -> VSOut {
  var pos = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 3.0, -1.0),
    vec2<f32>(-1.0,  3.0)
  );
  var uv = array<vec2<f32>, 3>(
    vec2<f32>(0.0, 0.0),
    vec2<f32>(2.0, 0.0),
    vec2<f32>(0.0, 2.0)
  );
  var out: VSOut;
  out.position = vec4<f32>(pos[vertex_index], 0.0, 1.0);
  out.uv = uv[vertex_index];
  return out;
}

@group(0) @binding(0) var sourceTexture: texture_2d<f32>;
@group(0) @binding(1) var sourceSampler: sampler;

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
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

  needsRecompile(scriptId, userCode, availableBuffers) {
    const existing = this.scripts.get(scriptId);
    if (!existing) return true;
    const currentShader = get(activeShader);
    const shaderId = currentShader?.id ?? '__no_shader__';
    // Recompile if shader changed, source changed, or buffer topology changed
    if (existing._shaderId !== shaderId) return true;
    if (existing.sourceCode !== userCode) return true;
    if ((existing._bufferCount ?? 0) !== availableBuffers.size) return true;
    // Also recompile if output buffer spec changed
    const bs = existing.bufferSpec || {};
    const cur = (get(activeShader)?.shader_scripts || []).find(s => s.id === scriptId)?.buffer || {};
    if (bs.width !== cur.width || bs.height !== cur.height || bs.format !== cur.format) return true;
    return false;
  }

  async ensureCompiled(scriptId, userCode, bufferSpec) {
  // Build available buffers map like in createScript
    const shader = get(activeShader);
    const availableBuffers = new Map();
    if (shader && shader.shader_scripts) {
      for (const s of shader.shader_scripts) {
        if (s.id !== scriptId) availableBuffers.set(s.id, s.buffer);
      }
    }
    if (this.needsRecompile(scriptId, userCode, availableBuffers)) {
      await this.createScript(scriptId, userCode, bufferSpec);
      await this.rebuildAllBindGroups();
    }
  }

  async createScript(scriptId, code, bufferSpec) {
    try {
      // Reset runtime errors on (re)compile start
      updateScriptRuntime(scriptId, { errors: [] });

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

      // Detect if user code already defines a vertex shader
      const hasVertex = /@vertex|fn\s+vs_main\s*\(/.test(code);
      const injectedCode = ComputeInjectedCode(availableBuffers, !hasVertex);
      const fullCode = `${injectedCode}\n${code}`;
      const shaderModule = CompileScript(fullCode, this.device);

      // Extract async compilation info errors
      let extractedErrors = [];
      try {
        const msgs = await ExtractErrors(shaderModule);
        extractedErrors = msgs?.map(m => ({
          line: m.lineNum ?? null,
          column: m.linePos ?? null,
          text: m.lineNum != null ? `Line ${m.lineNum}: ${m.message || m.text || ''}`.trim() : (m.message || m.text || `${m}`)
        })) || [];
      } catch (infoErr) {
        // ignore
      }
      updateScriptRuntime(scriptId, { injectedCode, compiledModule: shaderModule, errors: extractedErrors });

      // If there are errors, don't proceed to create pipeline/bindings
      if (extractedErrors.length > 0) {
        throw new Error(extractedErrors[0]?.text || 'Shader compilation error');
      }

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
        code: fullCode,
  sourceCode: code,
  _shaderId: get(activeShader)?.id ?? '__no_shader__',
  _bufferCount: availableBuffers.size
      });

      return true;
    } catch (error) {
      console.error(`Script ${scriptId} compilation failed:`, error.message);
      updateScriptRuntime(scriptId, { compiledModule: null, errors: [{ text: error.message }] });
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

  // Encode a render pass for a script into the provided encoder (no submit)
  encodeScriptPass(scriptId, commandEncoder) {
    const script = this.scripts.get(scriptId);
    if (!script) return;

    // Update uniforms for this script
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

  clearAll() {
    for (const [id, s] of this.scripts) {
      try { s.texture?.destroy(); } catch {}
      try { s.uniformBuffer?.destroy(); } catch {}
    }
    this.scripts.clear();
  }
}

class WebGPUWorkspace {
  constructor() {
    this.device = null;
    this.context = null;
    this.canvas = null;
    this.canvasFormat = null;
    this.scriptEngine = null;
    this.animationId = null;
    this.isRealTimeRunning = false;
    this.copyPipeline = null;
    this.copySampler = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {

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
      this.canvasFormat = navigator.gpu.getPreferredCanvasFormat();
      
      this.context.configure({
        device: this.device,
        format: this.canvasFormat,
        alphaMode: 'premultiplied'
      });

      this.scriptEngine = new ScriptEngine(this.device, /* shaderCompiler */ null);

      this.setupMouseTracking();
      this.isInitialized = true;

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
      
      return true;
    } catch (error) {
      throw error;
    }
  }

  async runAllScripts() {
    try {
      const shader = get(activeShader);
      
      if (!shader || !shader.shader_scripts) {
        return; // Silently return if no scripts
      }

      // Ensure compiled (only when changed)
      for (const s of shader.shader_scripts) {
        await this.scriptEngine.ensureCompiled(s.id, s.code, s.buffer);
      }
      // Rebuild once more in case cross-links changed
      await this.scriptEngine.rebuildAllBindGroups();

      // Execute producers before consumers (simple heuristic: by id asc)
      const ordered = [...shader.shader_scripts].sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
      for (const s of ordered) {
        await this.scriptEngine.executeScript(s.id);
        // Rebuild all bind groups after each script so consumers can sample the fresh texture
        await this.scriptEngine.rebuildAllBindGroups();
      }

      // Draw active script to canvas
      const act = get(activeScript);
      if (act) {
        await this.updatePreview(act.id);
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
      format: this.canvasFormat
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
    
    const animate = async () => {
      if (!this.isRealTimeRunning) return;
      
      try {
  await this.runAllScripts();
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
  }

  dispose() {
    try { this.stopRealTime(); } catch {}
    try { this.scriptEngine?.clearAll(); } catch {}
    this.copyPipeline = null;
    this.copySampler = null;
    this.isInitialized = false;
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

export function resetWorkspace() {
  if (workspace) {
    workspace.dispose();
    workspace = null;
  }
}