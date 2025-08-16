import './style.css';
import { WebGPUUtils } from './utils/webgpu';
import { ShaderCompiler } from './utils/compiler';
import { WebGPURenderer } from './components/renderer/WebGPURenderer';
import { ShaderEditor } from './components/editor/ShaderEditor';
import { Controls } from './components/ui/Controls';
import type { ShaderPass, WebGPUContext, PassType } from './types';

class WebGPUShaderApp {
  private canvas!: HTMLCanvasElement;
  private context!: WebGPUContext;
  private renderer!: WebGPURenderer;
  private compiler!: ShaderCompiler;
  private editor!: ShaderEditor;
  private controls!: Controls;
  private animationId: number = 0;
  private compileTimeout: number = 0;
  private passes: ShaderPass[] = [];
  private currentEditingPassId: string | null = null; // Track which pass is currently being edited

  constructor() {
    this.setupHTML();
    this.init();
  }

  private setupHTML() {
    document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
      <div class="shader-editor">
        <div class="editor-panel">
          <div class="editor-header">
            <h2>Fragment Shader</h2>
            <div class="editor-controls">
              <button id="compile-btn" class="btn btn-primary">Compile</button>
              <button id="reset-btn" class="btn btn-secondary">Reset</button>
            </div>
          </div>
          <div id="editor-container" class="editor-container"></div>
        </div>
        
        <div class="resize-handle vertical" id="resize-handle-vertical"></div>
        
        <div class="preview-panel">
          <div class="preview-header">
            <h2>Preview</h2>
            <div class="preview-controls">
              <button id="play-btn" class="btn btn-success">▶ Play</button>
              <button id="pause-btn" class="btn btn-warning">⏸ Pause</button>
            </div>
          </div>
          <canvas id="webgpu-canvas" class="preview-canvas"></canvas>
        </div>
        
        <div class="resize-handle horizontal" id="resize-handle-horizontal"></div>
        
        <div class="controls-panel">
          <div id="controls-container" class="controls-container"></div>
        </div>
      </div>
    `;

    // Get canvas and set initial size
    this.canvas = document.querySelector('#webgpu-canvas') as HTMLCanvasElement;
    this.canvas.width = 800;
    this.canvas.height = 600;
    
    // Set up resize functionality
    this.setupResizeHandles();
  }

  private async init() {
    try {
      // Initialize WebGPU
      this.context = await WebGPUUtils.initWebGPU(this.canvas);
      this.compiler = new ShaderCompiler(this.context.device);
      this.renderer = new WebGPURenderer(this.context);

      // Initialize UI components
      const editorContainer = document.querySelector('#editor-container') as HTMLElement;
      const controlsContainer = document.querySelector('#controls-container') as HTMLElement;
      
      this.editor = new ShaderEditor(editorContainer, await ShaderCompiler.getDefaultFragmentShader());
      this.controls = new Controls(controlsContainer);

      // Set up editor
      this.editor.setCompiler(this.compiler);
      this.setupEventHandlers();

      // Create default Image pass (always renders to canvas)
      const imagePass: ShaderPass = {
        id: 'image',
        name: 'Image',
        type: 'image',
        fragmentShader: await ShaderCompiler.getDefaultFragmentShader(),
        vertexShader: await ShaderCompiler.getDefaultVertexShader(),
        channels: [
          { index: 0, filter: 'linear', wrap: 'clamp' },
          { index: 1, filter: 'linear', wrap: 'clamp' },
          { index: 2, filter: 'linear', wrap: 'clamp' },
          { index: 3, filter: 'linear', wrap: 'clamp' },
        ],
        enabled: true,
        renderOrder: 1000, // Image always renders last
      };

      this.passes.push(imagePass);
      this.controls.addPass(imagePass);
      this.controls.selectPass('image');
      this.currentEditingPassId = 'image'; // Set the initial editing pass
      
      // Compile and add initial pass
      await this.compileAndAddPass(imagePass);

      // Start render loop
      this.startRenderLoop();

      console.log('WebGPU Shader Editor initialized successfully!');
    } catch (error) {
      console.error('Failed to initialize WebGPU:', error);
      this.showError('WebGPU is not supported in this browser or failed to initialize.');
    }
  }

  private setupEventHandlers() {
    // Editor events
    this.editor.onChange((_code) => {
      this.onShaderChange();
    });

    this.editor.onCompile((errors) => {
      this.controls.showErrors(errors);
      this.editor.highlightErrors(errors);
    });

    // Control events
    this.controls.onPassSelect((passId) => {
      this.onPassSelect(passId);
    });

    this.controls.onPassAdd((type) => {
      this.onAddPass(type);
    });

    this.controls.onPassRemove((passId) => {
      this.onRemovePass(passId);
    });

    this.controls.onChannelUpdate((passId, channelIndex, source) => {
      this.onChannelUpdate(passId, channelIndex, source);
    });

    // Button events
    document.querySelector('#compile-btn')?.addEventListener('click', () => {
      this.compileCurrentShader();
    });

    document.querySelector('#reset-btn')?.addEventListener('click', () => {
      this.resetShader();
    });

    document.querySelector('#play-btn')?.addEventListener('click', () => {
      this.startRenderLoop();
    });

    document.querySelector('#pause-btn')?.addEventListener('click', () => {
      this.stopRenderLoop();
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }

  private async onShaderChange() {
    const activePassId = this.controls.getActivePassId();
    if (activePassId) {
      // Auto-compile on change with debouncing
      clearTimeout(this.compileTimeout);
      this.compileTimeout = setTimeout(() => {
        this.compileCurrentShader();
      }, 500);
    }
  }

  private async compileCurrentShader() {
    const activePassId = this.controls.getActivePassId();
    if (!activePassId) return;

    const code = this.editor.getValue();
    const result = await this.compiler.compileShader(code, 'fragment');
    
    if (result.module && result.errors.filter(e => e.type === 'error').length === 0) {
      // Update the pass and recompile pipeline
      this.updateShaderPass(activePassId, code);
    }

    this.controls.showErrors(result.errors);
    this.editor.highlightErrors(result.errors);
  }

  private async compileAndAddPass(pass: ShaderPass) {
    try {
      await this.renderer.addPass(pass);
    } catch (error) {
      console.error('Failed to add shader pass:', error);
    }
  }

  private async updateShaderPass(passId: string, fragmentShader: string) {
    // Update the pass object with new shader code
    const pass = this.passes.find(p => p.id === passId);
    if (!pass) {
      console.error(`Pass not found: ${passId}`);
      return;
    }

    // Update the shader code
    pass.fragmentShader = fragmentShader;
    
    // Tell the renderer to recreate the pipeline with new shader
    try {
      await this.renderer.updatePassShader(passId, fragmentShader);
      console.log(`Successfully updated shader for pass: ${passId}`);
    } catch (error) {
      console.error(`Failed to update shader for pass ${passId}:`, error);
    }
  }

  private onPassSelect(passId: string) {
    console.log(`onPassSelect called with passId: ${passId}`);
    console.log(`Currently editing pass: ${this.currentEditingPassId}`);
    
    // Find the pass we're switching to
    const targetPass = this.passes.find(p => p.id === passId);
    if (!targetPass) {
      console.error(`Target pass not found: ${passId}`);
      console.log('Available passes:', this.passes.map(p => ({ id: p.id, name: p.name })));
      return;
    }
    
    // Save current editor content to the pass that was being edited
    this.saveCurrentShaderToEditingPass();
    
    // Update which pass is now being edited
    this.currentEditingPassId = passId;
    
    // Load the shader code for the selected pass into the editor
    console.log(`Loading shader for pass ${passId}:`, targetPass.fragmentShader.substring(0, 100) + '...');
    this.editor.setValue(targetPass.fragmentShader);
    
    console.log(`Successfully switched to editing pass: ${passId}`);
  }

  private saveCurrentShaderToEditingPass() {
    if (!this.currentEditingPassId) {
      console.log('No pass currently being edited');
      return;
    }

    const currentCode = this.editor.getValue();
    const pass = this.passes.find(p => p.id === this.currentEditingPassId);
    if (pass && pass.fragmentShader !== currentCode) {
      console.log(`Saving shader code to pass: ${this.currentEditingPassId}`);
      console.log(`Code length: ${currentCode.length} characters`);
      pass.fragmentShader = currentCode;
      console.log(`Saved shader code to pass: ${this.currentEditingPassId}`);
    } else if (!pass) {
      console.error(`Pass not found for saving: ${this.currentEditingPassId}`);
    } else {
      console.log(`No changes to save for pass: ${this.currentEditingPassId}`);
    }
  }

  private async onAddPass(_type: PassType) {
    // Save current shader before adding new pass
    this.saveCurrentShaderToEditingPass();
    
    const bufferCount = this.passes.filter(p => p.type === 'buffer').length;
    const bufferName = `Buffer ${String.fromCharCode(65 + bufferCount)}`; // A, B, C, D
    
    const newPass: ShaderPass = {
      id: `buffer_${Date.now()}`,
      name: bufferName,
      type: 'buffer',
      fragmentShader: await this.getExampleBufferShader(),
      vertexShader: await ShaderCompiler.getDefaultVertexShader(),
      channels: [
        { index: 0, filter: 'linear', wrap: 'clamp' },
        { index: 1, filter: 'linear', wrap: 'clamp' },
        { index: 2, filter: 'linear', wrap: 'clamp' },
        { index: 3, filter: 'linear', wrap: 'clamp' },
      ],
      enabled: true,
      renderOrder: bufferCount,
    };

    this.passes.push(newPass);
    this.controls.addPass(newPass);
    this.compileAndAddPass(newPass);
  }

  private async getExampleBufferShader(): Promise<string> {
    return await fetch('/src/shaders/fragment.wgsl').then(response => response.text());
  }

  private onChannelUpdate(passId: string, channelIndex: number, source: string) {
    const pass = this.passes.find(p => p.id === passId);
    if (pass) {
      const channel = pass.channels.find(c => c.index === channelIndex);
      if (channel) {
        channel.source = source || undefined;
        // Recreate the pipeline with updated bindings
        this.renderer.updatePassChannels(passId, pass.channels);
        console.log(`Connected ${source} to ${passId}.iChannel${channelIndex}`);
      }
    }
  }

  private onRemovePass(passId: string) {
    this.controls.removePass(passId);
    this.renderer.removePass(passId);
  }

  private async resetShader() {
    this.editor.setValue(await ShaderCompiler.getDefaultFragmentShader());
    this.compileCurrentShader();
  }

  private startRenderLoop() {
    if (this.animationId) return;

    const render = () => {
      this.renderer.render();
      this.animationId = requestAnimationFrame(render);
    };

    this.animationId = requestAnimationFrame(render);
  }

  private stopRenderLoop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }

  private handleResize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * devicePixelRatio;
    this.canvas.height = rect.height * devicePixelRatio;
    this.renderer.resize(this.canvas.width, this.canvas.height);
  }

  private showError(message: string) {
    document.querySelector('#app')!.innerHTML = `
      <div class="error-container">
        <h2>Error</h2>
        <p>${message}</p>
        <p>Please make sure you're using a WebGPU-compatible browser (Chrome 113+, Edge 113+).</p>
      </div>
    `;
  }

  private setupResizeHandles() {
    const shaderEditor = document.querySelector('.shader-editor') as HTMLElement;
    const handleVertical = document.querySelector('#resize-handle-vertical') as HTMLElement;
    const handleHorizontal = document.querySelector('#resize-handle-horizontal') as HTMLElement;

    let isResizing = false;
    let currentHandle: HTMLElement | null = null;

    const startResize = (e: MouseEvent, handle: HTMLElement) => {
      isResizing = true;
      currentHandle = handle;
      document.body.style.cursor = handle.classList.contains('vertical') ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
      
      e.preventDefault();
    };

    const doResize = (e: MouseEvent) => {
      if (!isResizing || !currentHandle) return;

      const rect = shaderEditor.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const totalWidth = rect.width;
      const totalHeight = rect.height;

      if (currentHandle === handleVertical) {
        // Resize between editor and preview (vertical split)
        const editorPercent = Math.max(20, Math.min(80, (x / totalWidth) * 100));
        const previewPercent = 100 - editorPercent;
        
        shaderEditor.style.gridTemplateColumns = `${editorPercent}% 4px ${previewPercent}%`;
      } else if (currentHandle === handleHorizontal) {
        // Resize between top (editor/preview) and bottom (controls)
        const topPercent = Math.max(30, Math.min(80, (y / totalHeight) * 100));
        const bottomPercent = 100 - topPercent;
        
        shaderEditor.style.gridTemplateRows = `${topPercent}% 4px ${bottomPercent}%`;
      }
    };

    const stopResize = () => {
      isResizing = false;
      currentHandle = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    handleVertical.addEventListener('mousedown', (e) => startResize(e, handleVertical));
    handleHorizontal.addEventListener('mousedown', (e) => startResize(e, handleHorizontal));
    
    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', stopResize);
    
    // Prevent text selection during resize
    document.addEventListener('selectstart', (e) => {
      if (isResizing) e.preventDefault();
    });
  }
}

// Initialize the app
new WebGPUShaderApp();
