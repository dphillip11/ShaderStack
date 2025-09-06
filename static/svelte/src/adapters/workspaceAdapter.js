// import { 
//   editorState, 
//   setInitializing, 
//   setRunning, 
//   setError, 
//   setWebGPUReady,
//   registerWorkspace
// } from '../stores/editor.js';

// import {  addConsoleMessage,
// } from '../stores/console.js';

// import { get } from 'svelte/store';

// class ShaderCompiler {
//   constructor() {
//     this.uniformsTemplate = `
// // Auto-injected uniforms
// struct Uniforms {
//     time: f32,
//     mouse: vec2<f32>,
//     resolution: vec2<f32>,
//     frame: u32,
// }

// @group(0) @binding(0) var<uniform> u: Uniforms;
// `;

//     this.textureBindingsTemplate = `
// // Auto-injected texture bindings
// {TEXTURE_BINDINGS}
// `;
//   }

//   injectBufferBindings(userCode, availableBuffers) {
//     let injectedCode = this.uniformsTemplate;
    
//     // Add texture bindings for available buffers
//     let textureBindings = '';
//     let bindingIndex = 1;
    
//     for (const [scriptId, bufferSpec] of availableBuffers) {
//       textureBindings += `@group(0) @binding(${bindingIndex}) var buffer${scriptId}: texture_2d<f32>;\n`;
//       textureBindings += `@group(0) @binding(${bindingIndex + 1}) var buffer${scriptId}_sampler: sampler;\n`;
//       bindingIndex += 2;
//     }
    
//     injectedCode += this.textureBindingsTemplate.replace('{TEXTURE_BINDINGS}', textureBindings);
//     injectedCode += '\n// User code begins here\n';
//     injectedCode += userCode;
    
//     return injectedCode;
//   }

//   async compile(code, device) {
//     try {
//       const shaderModule = device.createShaderModule({
//         code: code,
//         label: 'Compiled Shader'
//       });

//       // Check for compilation errors
//       const compilationInfo = await shaderModule.getCompilationInfo();
//       const errors = compilationInfo.messages.filter(msg => msg.type === 'error');
      
//       if (errors.length > 0) {
//         const errorMessages = errors.map(err => 
//           `Line ${err.lineNum}: ${err.message}`
//         ).join('\n');
//         throw new Error(`Shader compilation failed:\n${errorMessages}`);
//       }

//       const warnings = compilationInfo.messages.filter(msg => msg.type === 'warning');
//       if (warnings.length > 0) {
//         warnings.forEach(warn => 
//           addConsoleMessage(`Warning at line ${warn.lineNum}: ${warn.message}`, 'info')
//         );
//       }

//       return shaderModule;
//     } catch (error) {
//       throw new Error(`Shader compilation error: ${error.message}`);
//     }
//   }
// }

// class ScriptEngine {
//   constructor(device, shaderCompiler) {
//     this.device = device;
//     this.shaderCompiler = shaderCompiler;
//     this.scripts = new Map();
//     this.uniformData = new Float32Array(8);
//     this.frame = 0;
//     this.mousePos = { x: 0, y: 0 };
//     this.startTime = performance.now();
//   }

//   async createScript(scriptId, code, bufferSpec) {
//     try {
//       const availableBuffers = new Map();
//       for (const [id, scriptData] of this.scripts) {
//         if (id !== scriptId) {
//           availableBuffers.set(id, scriptData.bufferSpec);
//         }
//       }

//       const fullCode = this.shaderCompiler.injectBufferBindings(code, availableBuffers);
//       const shaderModule = await this.shaderCompiler.compile(fullCode, this.device);

//       const bindGroupLayoutEntries = [
//         {
//           binding: 0,
//           visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
//           buffer: { type: 'uniform' }
//         }
//       ];

//       let bindingIndex = 1;
//       for (const [id, bufferData] of availableBuffers) {
//         bindGroupLayoutEntries.push(
//           {
//             binding: bindingIndex,
//             visibility: GPUShaderStage.FRAGMENT,
//             texture: { sampleType: 'float' }
//           },
//           {
//             binding: bindingIndex + 1,
//             visibility: GPUShaderStage.FRAGMENT,
//             sampler: {}
//           }
//         );
//         bindingIndex += 2;
//       }

//       const bindGroupLayout = this.device.createBindGroupLayout({
//         label: `Script ${scriptId} Bind Group Layout`,
//         entries: bindGroupLayoutEntries
//       });

//       const pipelineLayout = this.device.createPipelineLayout({
//         label: `Script ${scriptId} Pipeline Layout`,
//         bindGroupLayouts: [bindGroupLayout]
//       });

//       const renderPipeline = this.device.createRenderPipeline({
//         label: `Script ${scriptId} Pipeline`,
//         layout: pipelineLayout,
//         vertex: {
//           module: shaderModule,
//           entryPoint: 'vs_main'
//         },
//         fragment: {
//           module: shaderModule,
//           entryPoint: 'fs_main',
//           targets: [{
//             format: bufferSpec.format || 'rgba8unorm'
//           }]
//         },
//         primitive: {
//           topology: 'triangle-list'
//         }
//       });

//       const texture = this.device.createTexture({
//         label: `Script ${scriptId} Output`,
//         size: [bufferSpec.width || 512, bufferSpec.height || 512],
//         format: bufferSpec.format || 'rgba8unorm',
//         usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
//       });

//       const uniformBuffer = this.device.createBuffer({
//         label: `Script ${scriptId} Uniforms`,
//         size: this.uniformData.byteLength,
//         usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
//       });

//       const sampler = this.device.createSampler({
//         magFilter: 'linear',
//         minFilter: 'linear',
//         wrapS: 'clamp-to-edge',
//         wrapT: 'clamp-to-edge'
//       });

//       const bindGroupEntries = [
//         { binding: 0, resource: { buffer: uniformBuffer } }
//       ];

//       bindingIndex = 1;
//       for (const [id, scriptData] of this.scripts) {
//         if (id !== scriptId && scriptData.texture) {
//           bindGroupEntries.push(
//             { binding: bindingIndex, resource: scriptData.texture.createView() },
//             { binding: bindingIndex + 1, resource: sampler }
//           );
//           bindingIndex += 2;
//         }
//       }

//       const bindGroup = this.device.createBindGroup({
//         label: `Script ${scriptId} Bind Group`,
//         layout: bindGroupLayout,
//         entries: bindGroupEntries
//       });

//       this.scripts.set(scriptId, {
//         bufferSpec,
//         renderPipeline,
//         texture,
//         uniformBuffer,
//         bindGroup,
//         bindGroupLayout,
//         sampler,
//         code: fullCode
//       });

//       addConsoleMessage(`Script ${scriptId} compiled successfully`, 'success');
//       return true;
//     } catch (error) {
//       addConsoleMessage(`Script ${scriptId} compilation failed: ${error.message}`, 'error');
//       throw error;
//     }
//   }

//   async executeScript(scriptId) {
//     const script = this.scripts.get(scriptId);
//     if (!script) {
//       throw new Error(`Script ${scriptId} not found`);
//     }

//     try {
//       const currentTime = (performance.now() - this.startTime) / 1000;

//       this.uniformData[0] = currentTime;
//       this.uniformData[1] = 0;
//       this.uniformData[2] = this.mousePos.x;
//       this.uniformData[3] = this.mousePos.y;
//       this.uniformData[4] = script.bufferSpec.width || 512;
//       this.uniformData[5] = script.bufferSpec.height || 512;
//       this.uniformData[6] = this.frame;
//       this.uniformData[7] = 0;

//       this.device.queue.writeBuffer(script.uniformBuffer, 0, this.uniformData);

//       const commandEncoder = this.device.createCommandEncoder({
//         label: `Script ${scriptId} Commands`
//       });

//       const renderPass = commandEncoder.beginRenderPass({
//         label: `Script ${scriptId} Render Pass`,
//         colorAttachments: [{
//           view: script.texture.createView(),
//           clearValue: { r: 0, g: 0, b: 0, a: 1 },
//           loadOp: 'clear',
//           storeOp: 'store'
//         }]
//       });

//       renderPass.setPipeline(script.renderPipeline);
//       renderPass.setBindGroup(0, script.bindGroup);
//       renderPass.draw(3);
//       renderPass.end();

//       this.device.queue.submit([commandEncoder.finish()]);

//       return script.texture;
//     } catch (error) {
//       addConsoleMessage(`Script ${scriptId} execution failed: ${error.message}`, 'error');
//       throw error;
//     }
//   }

//   updateMousePosition(x, y) {
//     this.mousePos = { x, y };
//   }

//   incrementFrame() {
//     this.frame++;
//   }

//   deleteScript(scriptId) {
//     const script = this.scripts.get(scriptId);
//     if (script) {
//       script.texture?.destroy();
//       script.uniformBuffer?.destroy();
//       this.scripts.delete(scriptId);
//     }
//   }

//   async rebuildAllBindGroups() {
//     for (const [scriptId, scriptData] of this.scripts) {
//       await this.rebuildBindGroup(scriptId);
//     }
//   }

//   async rebuildBindGroup(scriptId) {
//     const script = this.scripts.get(scriptId);
//     if (!script || !script.bindGroupLayout) return;

//     const bindGroupEntries = [
//       { binding: 0, resource: { buffer: script.uniformBuffer } }
//     ];

//     let bindingIndex = 1;
//     for (const [id, scriptData] of this.scripts) {
//       if (id !== scriptId && scriptData.texture) {
//         bindGroupEntries.push(
//           { binding: bindingIndex, resource: scriptData.texture.createView() },
//           { binding: bindingIndex + 1, resource: script.sampler }
//         );
//         bindingIndex += 2;
//       }
//     }

//     script.bindGroup = this.device.createBindGroup({
//       label: `Script ${scriptId} Bind Group`,
//       layout: script.bindGroupLayout,
//       entries: bindGroupEntries
//     });
//   }
// }

// class WebGPUWorkspace {
//   constructor() {
//     this.device = null;
//     this.context = null;
//     this.canvas = null;
//     this.shaderCompiler = new ShaderCompiler();
//     this.scriptEngine = null;
//     this.animationId = null;
//     this.isRealTimeRunning = false;
//   }

//   async initialize() {
//     try {
//       setInitializing(true);
//       addConsoleMessage('Initializing WebGPU workspace...', 'info');

//       if (!navigator.gpu) {
//         throw new Error('WebGPU not supported in this browser');
//       }

//       const adapter = await navigator.gpu.requestAdapter();
//       if (!adapter) {
//         throw new Error('No WebGPU adapter found');
//       }

//       this.device = await adapter.requestDevice();
      
//       this.canvas = document.getElementById('webgpu-canvas');
//       if (!this.canvas) {
//         throw new Error('WebGPU canvas not found');
//       }

//       this.context = this.canvas.getContext('webgpu');
//       const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
      
//       this.context.configure({
//         device: this.device,
//         format: canvasFormat,
//         alphaMode: 'premultiplied'
//       });

//       this.scriptEngine = new ScriptEngine(this.device, this.shaderCompiler);

//       this.setupMouseTracking();

//       setWebGPUReady(true);
//       addConsoleMessage('WebGPU workspace initialized successfully', 'success');
//     } catch (error) {
//       setError(error.message);
//       addConsoleMessage(`Initialization failed: ${error.message}`, 'error');
//       throw error;
//     } finally {
//       setInitializing(false);
//     }
//   }

//   setupMouseTracking() {
//     this.canvas.addEventListener('mousemove', (e) => {
//       const rect = this.canvas.getBoundingClientRect();
//       const x = (e.clientX - rect.left) / rect.width;
//       const y = 1.0 - (e.clientY - rect.top) / rect.height;
//       this.scriptEngine.updateMousePosition(x, y);
//     });
//   }

//   async compileScript(scriptId, code, bufferSpec) {
//     try {
//       await this.scriptEngine.createScript(scriptId, code, bufferSpec);
//       await this.scriptEngine.rebuildAllBindGroups();
//       return true;
//     } catch (error) {
//       throw error;
//     }
//   }

//   async runAllScripts() {
//     try {
//       setRunning(true);
//       const state = get(editorState);
      
//       addConsoleMessage('Running all scripts...', 'info');

//       for (const script of state.scripts) {
//         await this.compileScript(script.id, script.code, script.buffer);
//       }

//       for (const script of state.scripts) {
//         await this.scriptEngine.executeScript(script.id);
//       }

//       await this.updatePreview();

//       this.scriptEngine.incrementFrame();
//       addConsoleMessage('All scripts executed successfully', 'success');
//     } catch (error) {
//       addConsoleMessage(`Execution failed: ${error.message}`, 'error');
//       throw error;
//     } finally {
//       setRunning(false);
//     }
//   }

//   async compileActiveScript() {
//     try {
//       const state = get(editorState);
//       const activeScript = state.scripts.find(s => s.id === state.activeScriptId);
      
//       if (!activeScript) {
//         throw new Error('No active script to compile');
//       }

//       addConsoleMessage(`Compiling script ${activeScript.id}...`, 'info');
//       await this.compileScript(activeScript.id, activeScript.code, activeScript.buffer);
//       addConsoleMessage(`Script ${activeScript.id} compiled successfully`, 'success');
//     } catch (error) {
//       addConsoleMessage(`Compilation failed: ${error.message}`, 'error');
//       throw error;
//     }
//   }

//   async updatePreview() {
//     const state = get(editorState);
//     const activeScript = this.scriptEngine.scripts.get(state.activeScriptId);
    
//     if (!activeScript || !activeScript.texture) {
//       const commandEncoder = this.device.createCommandEncoder();
//       const canvasTexture = this.context.getCurrentTexture();
      
//       const renderPass = commandEncoder.beginRenderPass({
//         colorAttachments: [{
//           view: canvasTexture.createView(),
//           clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1 },
//           loadOp: 'clear',
//           storeOp: 'store'
//         }]
//       });
//       renderPass.end();
      
//       this.device.queue.submit([commandEncoder.finish()]);
//       return;
//     }

//     const commandEncoder = this.device.createCommandEncoder();
//     const canvasTexture = this.context.getCurrentTexture();
    
//     const copyShaderCode = `
// @vertex
// fn vs_main(@builtin(vertex_index) vertex_index: u32) -> @builtin(position) vec4<f32> {
//     var pos = array<vec2<f32>, 3>(
//         vec2<f32>(-1.0, -1.0),
//         vec2<f32>( 3.0, -1.0),
//         vec2<f32>(-1.0,  3.0)
//     );
//     return vec4<f32>(pos[vertex_index], 0.0, 1.0);
// }

// @group(0) @binding(0) var sourceTexture: texture_2d<f32>;
// @group(0) @binding(1) var sourceSampler: sampler;

// @fragment
// fn fs_main(@builtin(position) coord: vec4<f32>) -> @location(0) vec4<f32> {
//     let uv = coord.xy / vec2<f32>(${this.canvas.width}, ${this.canvas.height});
//     return textureSample(sourceTexture, sourceSampler, uv);
// }`;

//     if (!this.copyPipeline) {
//       const copyShaderModule = this.device.createShaderModule({
//         code: copyShaderCode
//       });

//       this.copyPipeline = this.device.createRenderPipeline({
//         label: 'Canvas Copy Pipeline',
//         layout: 'auto',
//         vertex: {
//           module: copyShaderModule,
//           entryPoint: 'vs_main'
//         },
//         fragment: {
//           module: copyShaderModule,
//           entryPoint: 'fs_main',
//           targets: [{
//             format: this.context.getPreferredFormat ? this.context.getPreferredFormat() : 'bgra8unorm'
//           }]
//         },
//         primitive: {
//           topology: 'triangle-list'
//         }
//       });

//       this.copySampler = this.device.createSampler({
//         magFilter: 'linear',
//         minFilter: 'linear'
//       });
//     }

//     const copyBindGroup = this.device.createBindGroup({
//       layout: this.copyPipeline.getBindGroupLayout(0),
//       entries: [
//         { binding: 0, resource: activeScript.texture.createView() },
//         { binding: 1, resource: this.copySampler }
//       ]
//     });

//     const renderPass = commandEncoder.beginRenderPass({
//       colorAttachments: [{
//         view: canvasTexture.createView(),
//         clearValue: { r: 0, g: 0, b: 0, a: 1 },
//         loadOp: 'clear',
//         storeOp: 'store'
//       }]
//     });

//     renderPass.setPipeline(this.copyPipeline);
//     renderPass.setBindGroup(0, copyBindGroup);
//     renderPass.draw(3);
//     renderPass.end();

//     this.device.queue.submit([commandEncoder.finish()]);
//   }

//   startRealTime() {
//     if (this.isRealTimeRunning) return;
    
//     this.isRealTimeRunning = true;
//     addConsoleMessage('Starting real-time mode...', 'info');
    
//     const animate = async () => {
//       if (!this.isRealTimeRunning) return;
      
//       try {
//         await this.runAllScripts();
//       } catch (error) {
//         addConsoleMessage(`Real-time execution error: ${error.message}`, 'error');
//       }
      
//       this.animationId = requestAnimationFrame(animate);
//     };
    
//     animate();
//   }

//   stopRealTime() {
//     this.isRealTimeRunning = false;
//     if (this.animationId) {
//       cancelAnimationFrame(this.animationId);
//       this.animationId = null;
//     }
//     addConsoleMessage('Stopped real-time mode', 'info');
//   }

//   deleteScript(scriptId) {
//     this.scriptEngine.deleteScript(scriptId);
//   }
// }

// let workspace = null;

// export async function initWorkspace() {
//   if (!workspace) {
//     workspace = new WebGPUWorkspace();
//     registerWorkspace(workspace);
//     window.__workspaceRef = workspace;
//   }
//   await workspace.initialize();
// }

// export async function runAll() {
//   if (!workspace) throw new Error('Workspace not initialized');
//   await workspace.runAllScripts();
// }

// export async function compileActive() {
//   if (!workspace) throw new Error('Workspace not initialized');
//   await workspace.compileActiveScript();
// }

// export function startRealTime() {
//   if (!workspace) throw new Error('Workspace not initialized');
//   workspace.startRealTime();
// }

// export function stopRealTime() {
//   if (!workspace) throw new Error('Workspace not initialized');
//   workspace.stopRealTime();
// }

// export async function updatePreview() {
//   if (!workspace) throw new Error('Workspace not initialized');
//   await workspace.updatePreview();
// }

// export function deleteScriptFromWorkspace(scriptId) {
//   if (!workspace) throw new Error('Workspace not initialized');
//   workspace.deleteScript(scriptId);
// }

// import { writable } from 'svelte/store';
// export const isRealTimeRunning = writable(false);

// if (typeof window !== 'undefined') {
//   let lastRealTimeState = false;
//   setInterval(() => {
//     const currentState = workspace?.isRealTimeRunning || false;
//     if (currentState !== lastRealTimeState) {
//       isRealTimeRunning.set(currentState);
//       lastRealTimeState = currentState;
//     }
//   }, 100);
// }