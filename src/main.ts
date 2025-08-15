import './style.css';
import { WebGPUUtils } from './utils/webgpu';
import { ShaderCompiler } from './utils/compiler';
import { WebGPURenderer } from './components/renderer/WebGPURenderer';
import { ShaderEditor } from './components/editor/ShaderEditor';
import { Controls } from './components/ui/Controls';
import type { ShaderPass, WebGPUContext } from './types';

class WebGPUShaderApp {
  private canvas!: HTMLCanvasElement;
  private context!: WebGPUContext;
  private renderer!: WebGPURenderer;
  private compiler!: ShaderCompiler;
  private editor!: ShaderEditor;
  private controls!: Controls;
  private animationId: number = 0;
  private compileTimeout: number = 0;

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
        
        <div class="resize-handle" id="resize-handle-1"></div>
        
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
        
        <div class="resize-handle" id="resize-handle-2"></div>
        
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
      
      this.editor = new ShaderEditor(editorContainer, ShaderCompiler.getDefaultFragmentShader());
      this.controls = new Controls(controlsContainer);

      // Set up editor
      this.editor.setCompiler(this.compiler);
      this.setupEventHandlers();

      // Create default shader pass
      const defaultPass: ShaderPass = {
        id: 'main',
        name: 'Main Pass',
        fragmentShader: ShaderCompiler.getDefaultFragmentShader(),
        vertexShader: ShaderCompiler.getDefaultVertexShader(),
        inputs: [],
        outputs: [],
        enabled: true,
      };

      this.controls.addPass(defaultPass);
      this.controls.selectPass('main');
      
      // Compile and add initial pass
      await this.compileAndAddPass(defaultPass);

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
    this.editor.onChange((code) => {
      this.onShaderChange(code);
    });

    this.editor.onCompile((errors) => {
      this.controls.showErrors(errors);
      this.editor.highlightErrors(errors);
    });

    // Control events
    this.controls.onPassSelect((passId) => {
      this.onPassSelect(passId);
    });

    this.controls.onPassAdd(() => {
      this.onAddPass();
    });

    this.controls.onPassRemove((passId) => {
      this.onRemovePass(passId);
    });

    this.controls.onPassToggle((passId, enabled) => {
      this.onTogglePass(passId, enabled);
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

  private async onShaderChange(code: string) {
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

  private updateShaderPass(passId: string, fragmentShader: string) {
    // This would update the existing pass in the renderer
    // For now, we'll just log the update
    console.log(`Updated pass ${passId} with new shader`, { fragmentShader });
  }

  private onPassSelect(passId: string) {
    // Load the shader code for the selected pass into the editor
    const defaultCode = ShaderCompiler.getDefaultFragmentShader();
    this.editor.setValue(defaultCode);
    console.log(`Selected pass: ${passId}`);
  }

  private onAddPass() {
    const newPass: ShaderPass = {
      id: `pass_${Date.now()}`,
      name: `Pass ${(this.controls as any).passes.length + 1}`,
      fragmentShader: ShaderCompiler.getDefaultFragmentShader(),
      vertexShader: ShaderCompiler.getDefaultVertexShader(),
      inputs: [],
      outputs: [{
        name: 'output',
        format: 'rgba8unorm',
      }],
      enabled: true,
    };

    this.controls.addPass(newPass);
    this.compileAndAddPass(newPass);
  }

  private onRemovePass(passId: string) {
    this.controls.removePass(passId);
    this.renderer.removePass(passId);
  }

  private onTogglePass(passId: string, enabled: boolean) {
    // Update pass enabled state in renderer
    console.log(`Toggle pass ${passId}: ${enabled}`);
  }

  private resetShader() {
    this.editor.setValue(ShaderCompiler.getDefaultFragmentShader());
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
    const handle1 = document.querySelector('#resize-handle-1') as HTMLElement;
    const handle2 = document.querySelector('#resize-handle-2') as HTMLElement;

    let isResizing = false;
    let currentHandle: HTMLElement | null = null;

    const startResize = (e: MouseEvent, handle: HTMLElement) => {
      isResizing = true;
      currentHandle = handle;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      
      e.preventDefault();
    };

    const doResize = (e: MouseEvent) => {
      if (!isResizing || !currentHandle) return;

      const rect = shaderEditor.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const totalWidth = rect.width;

      if (currentHandle === handle1) {
        // Resize between editor and preview
        const editorPercent = Math.max(20, Math.min(60, (x / totalWidth) * 100));
        const previewPercent = Math.max(20, Math.min(60, 80 - editorPercent));
        const controlsWidth = 300; // Fixed width for controls
        
        shaderEditor.style.gridTemplateColumns = `${editorPercent}% 4px ${previewPercent}% 4px ${controlsWidth}px`;
      } else if (currentHandle === handle2) {
        // Resize between preview and controls
        const controlsMinWidth = 250;
        const controlsMaxWidth = 500;
        const controlsWidth = Math.max(controlsMinWidth, Math.min(controlsMaxWidth, totalWidth - x));
        const remainingWidth = totalWidth - controlsWidth - 8; // 8px for resize handles
        const editorPercent = 50; // Keep editor at 50% of remaining width
        const previewPercent = 50; // Keep preview at 50% of remaining width
        
        shaderEditor.style.gridTemplateColumns = `${(remainingWidth * editorPercent / 100)}px 4px ${(remainingWidth * previewPercent / 100)}px 4px ${controlsWidth}px`;
      }
    };

    const stopResize = () => {
      isResizing = false;
      currentHandle = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    handle1.addEventListener('mousedown', (e) => startResize(e, handle1));
    handle2.addEventListener('mousedown', (e) => startResize(e, handle2));
    
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
