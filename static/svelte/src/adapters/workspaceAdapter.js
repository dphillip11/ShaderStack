import { 
  editorState, 
  setInitializing, 
  setSaving, 
  setRunning, 
  setError, 
  setWebGPUReady,
  addConsoleMessage,
  replaceAllScripts,
  setShader,
  registerWorkspace
} from '../stores/editor.js';

import { 
  saveShaderProject,
  loadShaderProject,
  createDefaultProject,
  createDefaultScript
} from '../stores/api.js';

import { get } from 'svelte/store';

class ShaderCompiler {
  constructor() {
    this.uniformsTemplate = `
// Auto-injected uniforms
struct Uniforms {
    time: f32,
    mouse: vec2<f32>,
    resolution: vec2<f32>,
    frame: u32,
}

@group(0) @binding(0) var<uniform> u: Uniforms;
`;

    this.textureBindingsTemplate = `
// Auto-injected texture bindings
{TEXTURE_BINDINGS}
`;
  }

  injectBufferBindings(userCode, availableBuffers) {
    let injectedCode = this.uniformsTemplate;
    
    // Add texture bindings for available buffers
    let textureBindings = '';
    let bindingIndex = 1;
    
    for (const [scriptId, bufferSpec] of availableBuffers) {
      textureBindings += `@group(0) @binding(${bindingIndex}) var buffer${scriptId}: texture_2d<f32>;\n`;
      textureBindings += `@group(0) @binding(${bindingIndex + 1}) var buffer${scriptId}_sampler: sampler;\n`;
      bindingIndex += 2;
    }
    
    injectedCode += this.textureBindingsTemplate.replace('{TEXTURE_BINDINGS}', textureBindings);
    injectedCode += '\n// User code begins here\n';
    injectedCode += userCode;
    
    return injectedCode;
  }

  async compile(code, device) {
    try {
      const shaderModule = device.createShaderModule({
        code: code,
        label: 'Compiled Shader'
      });

      // Check for compilation errors
      const compilationInfo = await shaderModule.getCompilationInfo();
      const errors = compilationInfo.messages.filter(msg => msg.type === 'error');
      
      if (errors.length > 0) {
        const errorMessages = errors.map(err => 
          `Line ${err.lineNum}: ${err.message}`
        ).join('\n');
        throw new Error(`Shader compilation failed:\n${errorMessages}`);
      }

      const warnings = compilationInfo.messages.filter(msg => msg.type === 'warning');
      if (warnings.length > 0) {
        warnings.forEach(warn => 
          addConsoleMessage(`Warning at line ${warn.lineNum}: ${warn.message}`, 'info')
        );
      }

      return shaderModule;
    } catch (error) {
      throw new Error(`Shader compilation error: ${error.message}`);
    }
  }
}

class ScriptEngine {
  constructor(device, shaderCompiler) {
    this.device = device;
    this.shaderCompiler = shaderCompiler;
    this.scripts = new Map(); // scriptId -> { bufferSpec, renderPipeline, buffer, uniformBuffer, bindGroup }
    
    // Fix uniform buffer alignment for WebGPU
    // struct Uniforms {
    //     time: f32,           // offset 0,  size 4
    //     mouse: vec2<f32>,    // offset 8,  size 8 (requires 8-byte alignment)
    //     resolution: vec2<f32>, // offset 16, size 8 (requires 8-byte alignment)  
    //     frame: u32,          // offset 24, size 4
    // }
    // Total size: 28 bytes, but we need to pad to 32 bytes (16-byte alignment for uniform buffers)
    this.uniformData = new Float32Array(8); // 32 bytes total
    this.frame = 0;
    this.mousePos = { x: 0, y: 0 };
    this.startTime = performance.now();
  }

  async createScript(scriptId, code, bufferSpec) {
    try {
      // Get available buffers from other scripts
      const availableBuffers = new Map();
      for (const [id, scriptData] of this.scripts) {
        if (id !== scriptId) {
          availableBuffers.set(id, scriptData.bufferSpec);
        }
      }

      // Inject buffer bindings and compile
      const fullCode = this.shaderCompiler.injectBufferBindings(code, availableBuffers);
      const shaderModule = await this.shaderCompiler.compile(fullCode, this.device);

      // Create explicit bind group layout to match what we're actually binding
      const bindGroupLayoutEntries = [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' }
        }
      ];

      // Add texture binding entries for each available buffer
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

      // Create render pipeline with explicit layout
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

      // Create output buffer/texture
      const texture = this.device.createTexture({
        label: `Script ${scriptId} Output`,
        size: [bufferSpec.width || 512, bufferSpec.height || 512],
        format: bufferSpec.format || 'rgba8unorm',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
      });

      // Create uniform buffer
      const uniformBuffer = this.device.createBuffer({
        label: `Script ${scriptId} Uniforms`,
        size: this.uniformData.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      });

      // Create sampler
      const sampler = this.device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
        wrapS: 'clamp-to-edge',
        wrapT: 'clamp-to-edge'
      });

      // Create bind group with matching entries
      const bindGroupEntries = [
        { binding: 0, resource: { buffer: uniformBuffer } }
      ];

      bindingIndex = 1;
      for (const [id, scriptData] of this.scripts) {
        if (id !== scriptId && scriptData.texture) {
          bindGroupEntries.push(
            { binding: bindingIndex, resource: scriptData.texture.createView() },
            { binding: bindingIndex + 1, resource: sampler }
          );
          bindingIndex += 2;
        }
      }

      const bindGroup = this.device.createBindGroup({
        label: `Script ${scriptId} Bind Group`,
        layout: bindGroupLayout,
        entries: bindGroupEntries
      });

      // Store script data
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

      addConsoleMessage(`Script ${scriptId} compiled successfully`, 'success');
      return true;
    } catch (error) {
      addConsoleMessage(`Script ${scriptId} compilation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async executeScript(scriptId) {
    const script = this.scripts.get(scriptId);
    if (!script) {
      throw new Error(`Script ${scriptId} not found`);
    }

    try {
      // Update uniforms with correct alignment
      const currentTime = (performance.now() - this.startTime) / 1000;
      
      // Properly aligned uniform data:
      this.uniformData[0] = currentTime;                    // time: f32 at offset 0
      this.uniformData[1] = 0;                             // padding to align mouse to 8-byte boundary
      this.uniformData[2] = this.mousePos.x;              // mouse.x: f32 at offset 8
      this.uniformData[3] = this.mousePos.y;              // mouse.y: f32 at offset 12
      this.uniformData[4] = script.bufferSpec.width || 512;  // resolution.x: f32 at offset 16
      this.uniformData[5] = script.bufferSpec.height || 512; // resolution.y: f32 at offset 20
      this.uniformData[6] = this.frame;                    // frame: u32 at offset 24
      this.uniformData[7] = 0;                             // padding to 32 bytes

      this.device.queue.writeBuffer(script.uniformBuffer, 0, this.uniformData);

      // Create render pass
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
      renderPass.draw(3); // Full-screen triangle
      renderPass.end();

      this.device.queue.submit([commandEncoder.finish()]);

      return script.texture;
    } catch (error) {
      addConsoleMessage(`Script ${scriptId} execution failed: ${error.message}`, 'error');
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
    // Rebuild all bind groups when scripts change
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

    let bindingIndex = 1;
    for (const [id, scriptData] of this.scripts) {
      if (id !== scriptId && scriptData.texture) {
        bindGroupEntries.push(
          { binding: bindingIndex, resource: scriptData.texture.createView() },
          { binding: bindingIndex + 1, resource: script.sampler }
        );
        bindingIndex += 2;
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
    this.currentProjectId = null;
    this.autoSaveTimeout = null;
    this.autoSaveInterval = null;
  }

  async initialize() {
    try {
      setInitializing(true);
      addConsoleMessage('Initializing WebGPU workspace...', 'info');

      // Check WebGPU support
      if (!navigator.gpu) {
        throw new Error('WebGPU not supported in this browser');
      }

      // Request adapter and device
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        throw new Error('No WebGPU adapter found');
      }

      this.device = await adapter.requestDevice();
      
      // Setup canvas
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

      // Initialize script engine
      this.scriptEngine = new ScriptEngine(this.device, this.shaderCompiler);

      // Setup mouse tracking
      this.setupMouseTracking();

      // Load initial scripts
      await this.loadInitialScripts();

      setWebGPUReady(true);
      addConsoleMessage('WebGPU workspace initialized successfully', 'success');
    } catch (error) {
      setError(error.message);
      addConsoleMessage(`Initialization failed: ${error.message}`, 'error');
      throw error;
    } finally {
      setInitializing(false);
    }
  }

  setupMouseTracking() {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height; // Flip Y
      this.scriptEngine.updateMousePosition(x, y);
    });
  }

  async loadInitialScripts() {
    const state = get(editorState);
    console.log('loadInitialScripts: Current state:', state);
    
    // If we already have scripts loaded (from window.shaderData), use them
    if (state.scripts && state.scripts.length > 0) {
      console.log(`loadInitialScripts: Using existing shader data with ${state.scripts.length} scripts`);
      addConsoleMessage(`Using existing shader data with ${state.scripts.length} scripts`, 'info');
      
      // Set the current project ID if we have a shader with an ID
      if (state.shader?.id) {
        this.currentProjectId = state.shader.id;
        addConsoleMessage(`Loaded shader project: ${state.shader.name} (ID: ${state.shader.id})`, 'success');
      }
      
      console.log('loadInitialScripts: Current activeScriptId:', state.activeScriptId);
      
      // Ensure we have an active script set
      if (!state.activeScriptId && state.scripts.length > 0) {
        console.log('loadInitialScripts: Setting active script to:', state.scripts[0].id);
        const { setActiveScript } = await import('../stores/editor.js');
        setActiveScript(state.scripts[0].id);
        addConsoleMessage(`Set active script to ${state.scripts[0].id}`, 'info');
        
        // Wait a bit for the state to update, then try to compile and show preview
        setTimeout(async () => {
          console.log('loadInitialScripts: Starting compileAndShowInitialPreview');
          try {
            await this.compileAndShowInitialPreview();
          } catch (error) {
            console.error('Failed to show initial preview:', error);
          }
        }, 100);
      } else if (state.activeScriptId) {
        console.log('loadInitialScripts: Active script already set:', state.activeScriptId);
        // Still try to compile and show preview for the active script
        setTimeout(async () => {
          console.log('loadInitialScripts: Starting compileAndShowInitialPreview for existing active script');
          try {
            await this.compileAndShowInitialPreview();
          } catch (error) {
            console.error('Failed to show initial preview:', error);
          }
        }, 100);
      }
      
      return;
    }
    
    // If we have a shader ID from the editor state, load it from the backend
    if (state.shader?.id) {
      try {
        const projectData = await loadShaderProject(state.shader.id);
        this.currentProjectId = projectData.id;
        
        // Update the editor state with loaded data
        setShader(projectData);
        replaceAllScripts(projectData.shader_scripts || []);
        
        addConsoleMessage(`Loaded shader project: ${projectData.name}`, 'success');
        
        // Wait for scripts to be loaded, then show initial preview
        setTimeout(async () => {
          console.log('loadInitialScripts: Starting compileAndShowInitialPreview for loaded project');
          try {
            await this.compileAndShowInitialPreview();
          } catch (error) {
            console.error('Failed to show initial preview:', error);
          }
        }, 100);
        
        return;
      } catch (error) {
        addConsoleMessage(`Failed to load shader project: ${error.message}`, 'error');
      }
    }
    
    // Create default project if no shader exists or loading failed
    await this.createNewProject();
  }

  async compileAndShowInitialPreview() {
    const state = get(editorState);
    console.log('compileAndShowInitialPreview: Current state:', state);
    
    if (!state.activeScriptId || !state.scripts.length) {
      console.log('compileAndShowInitialPreview: No active script or scripts available');
      return;
    }
    
    const activeScript = state.scripts.find(s => s.id === state.activeScriptId);
    if (!activeScript) {
      console.log('compileAndShowInitialPreview: Active script not found in scripts array');
      return;
    }
    
    console.log('compileAndShowInitialPreview: Found active script:', activeScript);
    
    try {
      console.log('compileAndShowInitialPreview: Starting compilation...');
      // Compile the active script
      await this.compileScript(activeScript.id, activeScript.code, activeScript.buffer);
      
      console.log('compileAndShowInitialPreview: Starting execution...');
      // Execute it to generate output
      await this.scriptEngine.executeScript(activeScript.id);
      
      console.log('compileAndShowInitialPreview: Updating preview...');
      // Update the preview
      await this.updatePreview();
      
      addConsoleMessage(`Initial preview showing script ${activeScript.id}`, 'info');
      console.log('compileAndShowInitialPreview: Success!');
    } catch (error) {
      console.error('compileAndShowInitialPreview: Error:', error);
      addConsoleMessage(`Failed to show initial preview: ${error.message}`, 'warning');
    }
  }

  async createNewProject() {
    try {
      const defaultProject = createDefaultProject('New Shader Project');
      const savedProject = await saveShaderProject(null, defaultProject);
      
      this.currentProjectId = savedProject.id;
      setShader(savedProject);
      replaceAllScripts(savedProject.shader_scripts || []);
      
      addConsoleMessage(`Created new shader project: ${savedProject.name}`, 'success');
    } catch (error) {
      // Fallback to local-only mode if backend save fails
      addConsoleMessage(`Backend unavailable, working in local mode`, 'warning');
      const defaultProject = createDefaultProject('Local Shader Project');
      setShader(defaultProject);
      replaceAllScripts(defaultProject.shader_scripts || []);
    }
  }

  async addScript() {
    const state = get(editorState);
    const newId = Math.max(0, ...state.scripts.map(s => s.id)) + 1;
    
    const newScript = createDefaultScript(newId);
    
    // Update local state immediately
    const updatedScripts = [...state.scripts, newScript];
    replaceAllScripts(updatedScripts);
    
    // Save entire project to backend
    await this.saveCurrentProject();
    
    addConsoleMessage(`Added new script ${newId}`, 'success');
  }

  async compileScript(scriptId, code, bufferSpec) {
    try {
      await this.scriptEngine.createScript(scriptId, code, bufferSpec);
      // Rebuild bind groups for all scripts since buffer dependencies changed
      await this.scriptEngine.rebuildAllBindGroups();
      return true;
    } catch (error) {
      throw error;
    }
  }

  async runAllScripts() {
    try {
      setRunning(true);
      const state = get(editorState);
      
      addConsoleMessage('Running all scripts...', 'info');

      // Compile all scripts first
      for (const script of state.scripts) {
        await this.compileScript(script.id, script.code, script.buffer);
      }

      // Execute all scripts sequentially
      for (const script of state.scripts) {
        await this.scriptEngine.executeScript(script.id);
      }

      // Update preview with active script output
      await this.updatePreview();

      this.scriptEngine.incrementFrame();
      addConsoleMessage('All scripts executed successfully', 'success');
    } catch (error) {
      addConsoleMessage(`Execution failed: ${error.message}`, 'error');
      throw error;
    } finally {
      setRunning(false);
    }
  }

  async compileActiveScript() {
    try {
      const state = get(editorState);
      const activeScript = state.scripts.find(s => s.id === state.activeScriptId);
      
      if (!activeScript) {
        throw new Error('No active script to compile');
      }

      addConsoleMessage(`Compiling script ${activeScript.id}...`, 'info');
      await this.compileScript(activeScript.id, activeScript.code, activeScript.buffer);
      addConsoleMessage(`Script ${activeScript.id} compiled successfully`, 'success');
    } catch (error) {
      addConsoleMessage(`Compilation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async updatePreview() {
    const state = get(editorState);
    const activeScript = this.scriptEngine.scripts.get(state.activeScriptId);
    
    if (!activeScript || !activeScript.texture) {
      // Clear canvas if no active script
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

    // Create a simple copy pipeline for texture to canvas
    const commandEncoder = this.device.createCommandEncoder();
    const canvasTexture = this.context.getCurrentTexture();
    
    // Create a simple full-screen copy shader
    const copyShaderCode = `
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

    // Create or reuse copy pipeline
    if (!this.copyPipeline) {
      const copyShaderModule = this.device.createShaderModule({
        code: copyShaderCode
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

    // Create bind group for copy operation
    const copyBindGroup = this.device.createBindGroup({
      layout: this.copyPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: activeScript.texture.createView() },
        { binding: 1, resource: this.copySampler }
      ]
    });

    // Render to canvas
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

  // Method to manually update preview for the current active script
  async updatePreviewForActiveScript() {
    await this.updatePreview();
  }

  startRealTime() {
    if (this.isRealTimeRunning) return;
    
    this.isRealTimeRunning = true;
    addConsoleMessage('Starting real-time mode...', 'info');
    
    const animate = async () => {
      if (!this.isRealTimeRunning) return;
      
      try {
        await this.runAllScripts();
      } catch (error) {
        addConsoleMessage(`Real-time execution error: ${error.message}`, 'error');
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
    addConsoleMessage('Stopped real-time mode', 'info');
  }

  async saveShader() {
    try {
      setSaving(true);
      const state = get(editorState);
      
      if (!state.shader) {
        throw new Error('No shader data to save');
      }

      // Prepare complete shader data for saving
      const shaderData = {
        ...state.shader,
        shader_scripts: state.scripts || []
      };

      let savedProject;
      if (this.currentProjectId) {
        // Update existing project
        savedProject = await saveShaderProject(this.currentProjectId, shaderData);
        addConsoleMessage('Shader project saved successfully', 'success');
      } else {
        // Create new project
        savedProject = await saveShaderProject(null, shaderData);
        this.currentProjectId = savedProject.id;
        addConsoleMessage('Shader project created successfully', 'success');
      }

      // Preserve the current local name when updating from backend response
      const currentName = state.shader.name;
      setShader({
        ...savedProject,
        name: currentName || savedProject.name
      });
      
    } catch (error) {
      addConsoleMessage(`Save failed: ${error.message}`, 'error');
      throw error;
    } finally {
      setSaving(false);
    }
  }

  async saveCurrentProject() {
    if (!this.currentProjectId) return;

    try {
      const state = get(editorState);
      if (!state.shader) return;

      const shaderData = {
        ...state.shader,
        shader_scripts: state.scripts || []
      };

      await saveShaderProject(this.currentProjectId, shaderData);
    } catch (error) {
      addConsoleMessage(`Failed to sync to backend: ${error.message}`, 'warning');
    }
  }

  async deleteScriptFromProject(scriptId) {
    const state = get(editorState);
    
    // Remove from local state
    const updatedScripts = state.scripts.filter(s => s.id !== scriptId);
    replaceAllScripts(updatedScripts);
    
    // Remove from WebGPU engine
    this.scriptEngine.deleteScript(scriptId);
    
    // Save entire project to backend
    await this.saveCurrentProject();
    
    addConsoleMessage(`Deleted script ${scriptId}`, 'success');
  }

  // Auto-save functionality for better UX
  async autoSave() {
    if (!this.currentProjectId) return;

    try {
      const state = get(editorState);
      if (!state.shader) return;

      const shaderData = {
        ...state.shader,
        shader_scripts: state.scripts || []
      };

      await saveShaderProject(this.currentProjectId, shaderData);
      // Silent auto-save, don't show success message
    } catch (error) {
      // Silent failure for auto-save, but log for debugging
      console.warn('Auto-save failed:', error);
    }
  }

  async deleteShader() {
    try {
      setSaving(true);
      const state = get(editorState);
      
      if (!state.shader?.id) {
        throw new Error('Cannot delete unsaved shader');
      }

      if (!this.currentProjectId) {
        throw new Error('No project ID available for deletion');
      }

      // Import the delete function
      const { deleteShaderProject } = await import('../stores/api.js');
      
      // Delete from backend
      await deleteShaderProject(this.currentProjectId);
      
      addConsoleMessage('Shader deleted successfully', 'success');
      
      // Redirect to home page after successful deletion
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
      
    } catch (error) {
      addConsoleMessage(`Delete failed: ${error.message}`, 'error');
      throw error;
    } finally {
      setSaving(false);
    }
  }
}

// Global workspace instance
let workspace = null;

// Exported functions
export async function initWorkspace() {
  if (!workspace) {
    workspace = new WebGPUWorkspace();
    registerWorkspace(workspace);
    // Make workspace available globally for CodeEditor
    window.__workspaceRef = workspace;
  }
  await workspace.initialize();
}

export async function runAll() {
  if (!workspace) throw new Error('Workspace not initialized');
  await workspace.runAllScripts();
}

export async function compileActive() {
  if (!workspace) throw new Error('Workspace not initialized');
  await workspace.compileActiveScript();
}

export async function saveShader() {
  if (!workspace) throw new Error('Workspace not initialized');
  await workspace.saveShader();
}

export function startRealTime() {
  if (!workspace) throw new Error('Workspace not initialized');
  workspace.startRealTime();
}

export function stopRealTime() {
  if (!workspace) throw new Error('Workspace not initialized');
  workspace.stopRealTime();
}

export async function addScript() {
  if (!workspace) throw new Error('Workspace not initialized');
  await workspace.addScript();
}

export async function deleteScript(scriptId) {
  if (!workspace) throw new Error('Workspace not initialized');
  await workspace.deleteScriptFromProject(scriptId);
}

// Auto-save with debouncing - saves complete project after code changes
export async function updateScriptCode(scriptId, code) {
  if (!workspace) return;
  
  // Debounced auto-save to backend - saves entire project
  clearTimeout(workspace.autoSaveTimeout);
  workspace.autoSaveTimeout = setTimeout(async () => {
    await workspace.saveCurrentProject();
  }, 2000); // Auto-save after 2 seconds of inactivity
}

// Auto-save interval for periodic saves
export function startAutoSave() {
  if (!workspace) return;
  
  workspace.autoSaveInterval = setInterval(async () => {
    await workspace.autoSave();
  }, 30000); // Auto-save every 30 seconds
}

export function stopAutoSave() {
  if (!workspace) return;
  
  if (workspace.autoSaveInterval) {
    clearInterval(workspace.autoSaveInterval);
    workspace.autoSaveInterval = null;
  }
  
  if (workspace.autoSaveTimeout) {
    clearTimeout(workspace.autoSaveTimeout);
    workspace.autoSaveTimeout = null;
  }
}

// Store for real-time running state
import { writable } from 'svelte/store';
export const isRealTimeRunning = writable(false);

// Update the store when real-time state changes
if (typeof window !== 'undefined') {
  let lastRealTimeState = false;
  setInterval(() => {
    const currentState = workspace?.isRealTimeRunning || false;
    if (currentState !== lastRealTimeState) {
      isRealTimeRunning.set(currentState);
      lastRealTimeState = currentState;
    }
  }, 100);
}

export async function updatePreview() {
  if (!workspace) throw new Error('Workspace not initialized');
  await workspace.updatePreviewForActiveScript();
}

export async function deleteShader() {
  if (!workspace) throw new Error('Workspace not initialized');
  await workspace.deleteShader();
}