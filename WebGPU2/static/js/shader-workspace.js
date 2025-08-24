/**
 * Shader Workspace - Top-Level API
 * Main interface for page logic to interact with the WebGPU shader system
 */
class ShaderWorkspace {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            autoSave: options.autoSave || false,
            autoSaveDelay: options.autoSaveDelay || 2000,
            realTimeExecution: options.realTimeExecution || false,
            ...options
        };

        // Core modules
        this.webgpuCore = null;
        this.shaderCompiler = null;
        this.bufferManager = null;
        this.scriptEngine = null;
        this.visualizationEngine = null;

        // State
        this.currentShader = null;
        this.isInitialized = false;
        this.eventTarget = new EventTarget();

        // Auto-save timer
        this.autoSaveTimer = null;
    }

    async initialize() {
        try {
            // Find WebGPU canvas
            const canvas = this.container.querySelector('#webgpu-canvas');
            if (!canvas) {
                throw new Error('WebGPU canvas not found');
            }

            // Initialize WebGPU core
            this.webgpuCore = new WebGPUCore();
            await this.webgpuCore.initDevice(canvas);

            // Initialize other modules
            this.shaderCompiler = new ShaderCompiler(this.webgpuCore);
            this.bufferManager = new BufferManager(this.webgpuCore);
            this.scriptEngine = new ScriptEngine(this.webgpuCore, this.shaderCompiler, this.bufferManager);
            this.visualizationEngine = new VisualizationEngine(this.webgpuCore, this.bufferManager);

            // Setup event listeners
            this.setupEventListeners();

            this.isInitialized = true;
            this.dispatchEvent('initialized', { workspace: this });

            console.log('Shader Workspace initialized successfully');
            return true;

        } catch (error) {
            console.error('Failed to initialize Shader Workspace:', error);
            this.dispatchEvent('initError', { error });
            throw error;
        }
    }

    async createNewShader(name, type = 'fragment') {
        if (!this.isInitialized) {
            throw new Error('Workspace not initialized');
        }

        console.log('createNewShader called with:', name, type);

        const defaultCode = this.getDefaultShaderCode(type);
        console.log('Default shader code generated:', defaultCode.substring(0, 50) + '...');

        const defaultBufferSpec = {
            format: 'rgba8unorm',
            width: 512,
            height: 512
        };
        console.log('Default buffer spec:', defaultBufferSpec);

        const shader = {
            id: null,
            name: name || 'New Shader',
            shader_scripts: [{
                id: 0,
                code: defaultCode,
                buffer: defaultBufferSpec
            }],
            tags: []
        };
        console.log('Shader object created:', shader);

        console.log('About to call loadShader...');
        await this.loadShader(shader);
        console.log('loadShader completed');
        
        // Remove the automatic execution for now to prevent blocking
        // try {
        //     await this.runScript(0);
        //     console.log('Default shader executed for preview');
        // } catch (error) {
        //     console.warn('Failed to run default shader:', error);
        // }
        
        this.dispatchEvent('shaderCreated', { shader });
        console.log('createNewShader completed successfully');
        return shader;
    }

    async loadShader(shaderData) {
        if (!this.isInitialized) {
            throw new Error('Workspace not initialized');
        }

        try {
            console.log('loadShader called with:', shaderData);
            
            // Clear existing scripts
            console.log('Clearing existing scripts...');
            this.clearAllScripts();
            console.log('Existing scripts cleared');

            // Set current shader
            console.log('Setting current shader...');
            this.currentShader = {
                ...shaderData,
                shader_scripts: [] // Start with empty array to prevent loop
            };
            console.log('Current shader set');

            // Create scripts from shader data (use original data, not currentShader)
            console.log('Creating scripts from shader data...');
            for (let i = 0; i < shaderData.shader_scripts.length; i++) {
                const scriptData = shaderData.shader_scripts[i];
                console.log(`Creating script ${i}:`, scriptData);
                
                // Create script directly without using addScript to avoid array modification
                const script = this.scriptEngine.createScript({
                    id: scriptData.id,
                    code: scriptData.code,
                    bufferSpec: scriptData.buffer,
                    type: 'fragment'
                });
                
                // Add to currentShader after creation
                this.currentShader.shader_scripts.push({
                    id: scriptData.id,
                    code: scriptData.code,
                    buffer: scriptData.buffer
                });
                
                console.log(`Script ${i} created successfully`);
            }
            console.log('All scripts created');

            // Set execution order
            console.log('Setting execution order...');
            const scriptIds = shaderData.shader_scripts.map(s => s.id);
            console.log('Script IDs:', scriptIds);
            this.scriptEngine.setExecutionOrder(scriptIds);
            console.log('Execution order set');

            this.dispatchEvent('shaderLoaded', { shader: shaderData });
            console.log('loadShader completed successfully');
            return true;

        } catch (error) {
            console.error('Failed to load shader:', error);
            this.dispatchEvent('loadError', { error });
            throw error;
        }
    }

    async saveShader() {
        if (!this.currentShader) {
            throw new Error('No shader to save');
        }

        try {
            const shaderData = this.getCurrentShaderData();
            
            const endpoint = shaderData.id 
                ? `/api/shaders/${shaderData.id}` 
                : '/api/shaders';
            
            const method = shaderData.id ? 'PUT' : 'POST';

            const response = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(shaderData)
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(error || 'Failed to save shader');
            }

            const result = await response.json();
            
            // Update shader ID if it was a new shader
            if (!shaderData.id) {
                this.currentShader.id = result.id;
            }

            this.dispatchEvent('shaderSaved', { shader: shaderData, result });
            return result;

        } catch (error) {
            console.error('Failed to save shader:', error);
            this.dispatchEvent('saveError', { error });
            throw error;
        }
    }

    async addScript(code = '', bufferSpec = null, scriptId = null) {
        if (!this.isInitialized) {
            throw new Error('Workspace not initialized');
        }

        console.log('addScript called with:', { code: code?.substring(0, 50) + '...', bufferSpec, scriptId });

        const id = scriptId || Date.now();
        console.log('Using script ID:', id);

        const defaultBufferSpec = {
            format: 'rgba8unorm',
            width: 512,
            height: 512
        };

        console.log('About to call scriptEngine.createScript...');
        const script = this.scriptEngine.createScript({
            id,
            code: code || this.getDefaultShaderCode('fragment'),
            bufferSpec: bufferSpec || defaultBufferSpec,
            type: 'fragment'
        });
        console.log('scriptEngine.createScript completed:', script);

        // Add to current shader if exists
        if (this.currentShader) {
            console.log('Adding script to current shader...');
            this.currentShader.shader_scripts.push({
                id,
                code: script.code,
                buffer: script.bufferSpec
            });
            console.log('Script added to current shader');
        }

        this.scheduleAutoSave();
        this.dispatchEvent('scriptAdded', { scriptId: id, script });
        console.log('addScript completed successfully, returning ID:', id);
        return id;
    }

    removeScript(scriptId) {
        if (!this.isInitialized) return;

        this.scriptEngine.destroyScript(scriptId);

        // Remove from current shader
        if (this.currentShader) {
            this.currentShader.shader_scripts = this.currentShader.shader_scripts
                .filter(s => s.id !== scriptId);
        }

        this.scheduleAutoSave();
        this.dispatchEvent('scriptRemoved', { scriptId });
    }

    updateScriptCode(scriptId, code) {
        if (!this.isInitialized) return;

        this.scriptEngine.updateScript(scriptId, { code });

        // Update current shader
        if (this.currentShader) {
            const script = this.currentShader.shader_scripts.find(s => s.id === scriptId);
            if (script) {
                script.code = code;
            }
        }

        this.scheduleAutoSave();
        this.dispatchEvent('scriptCodeUpdated', { scriptId, code });
    }

    updateScriptBuffer(scriptId, bufferSpec) {
        if (!this.isInitialized) return;

        this.scriptEngine.updateScript(scriptId, { bufferSpec });

        // Update current shader
        if (this.currentShader) {
            const script = this.currentShader.shader_scripts.find(s => s.id === scriptId);
            if (script) {
                script.buffer = bufferSpec;
            }
        }

        this.scheduleAutoSave();
        this.dispatchEvent('scriptBufferUpdated', { scriptId, bufferSpec });
    }

    async runScript(scriptId) {
        if (!this.isInitialized) return;

        try {
            await this.scriptEngine.executeScript(scriptId);
            
            // Update visualization
            const canvas = this.container.querySelector('#webgpu-canvas');
            if (canvas) {
                this.visualizationEngine.renderBufferAsTexture(scriptId, canvas);
            }

            this.dispatchEvent('scriptExecuted', { scriptId });
            return true;

        } catch (error) {
            this.dispatchEvent('scriptError', { scriptId, error });
            throw error;
        }
    }

    async runAllScripts() {
        if (!this.isInitialized) return;

        try {
            await this.scriptEngine.executeAllScripts();

            // Update main visualization with the last script
            const scripts = this.currentShader?.shader_scripts || [];
            if (scripts.length > 0) {
                const lastScriptId = scripts[scripts.length - 1].id;
                const canvas = this.container.querySelector('#webgpu-canvas');
                if (canvas) {
                    this.visualizationEngine.renderBufferAsTexture(lastScriptId, canvas);
                }
            }

            this.dispatchEvent('allScriptsExecuted', {});
            return true;

        } catch (error) {
            this.dispatchEvent('executionError', { error });
            throw error;
        }
    }

    stopExecution() {
        if (this.scriptEngine) {
            this.scriptEngine.stopRealTimeExecution();
        }
        this.dispatchEvent('executionStopped', {});
    }

    showBufferVisualization(scriptId, mode = 'texture') {
        if (!this.isInitialized) return;

        const canvas = this.container.querySelector('#webgpu-canvas');
        if (!canvas) return;

        try {
            switch (mode) {
                case 'texture':
                    this.visualizationEngine.renderBufferAsTexture(scriptId, canvas);
                    break;
                case 'graph':
                    this.visualizationEngine.renderBufferAsGraph(scriptId, canvas);
                    break;
                case 'heatmap':
                    this.visualizationEngine.renderBufferAsHeatmap(scriptId, canvas);
                    break;
            }

            this.dispatchEvent('visualizationUpdated', { scriptId, mode });

        } catch (error) {
            console.error('Failed to show visualization:', error);
            this.dispatchEvent('visualizationError', { scriptId, mode, error });
        }
    }

    hideBufferVisualization(scriptId) {
        // Clear the canvas
        const canvas = this.container.querySelector('#webgpu-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }

        this.dispatchEvent('visualizationHidden', { scriptId });
    }

    async exportBuffer(scriptId, format = 'png') {
        if (!this.isInitialized) {
            throw new Error('Workspace not initialized');
        }

        try {
            let result;
            
            if (format === 'png' || format === 'jpg') {
                result = await this.visualizationEngine.exportBufferAsImage(scriptId, format);
            } else {
                result = await this.visualizationEngine.exportBufferAsData(scriptId, format);
            }

            this.dispatchEvent('bufferExported', { scriptId, format, result });
            return result;

        } catch (error) {
            console.error('Failed to export buffer:', error);
            this.dispatchEvent('exportError', { scriptId, format, error });
            throw error;
        }
    }

    // Private helper methods

    getCurrentShaderData() {
        if (!this.currentShader) return null;

        // Sync script data from engine
        const engineScripts = this.scriptEngine.scripts;
        const shaderScripts = [];

        for (const [scriptId, script] of engineScripts) {
            shaderScripts.push({
                id: scriptId,
                code: script.code,
                buffer: script.bufferSpec
            });
        }

        return {
            ...this.currentShader,
            shader_scripts: shaderScripts
        };
    }

    getDefaultShaderCode(type) {
        const templates = {
            fragment: `@fragment
fn main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = fragCoord.xy / vec2<f32>(512.0, 512.0);
    return vec4<f32>(uv, 0.5, 1.0);
}`,
            vertex: `@vertex
fn main(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4<f32> {
    let x = f32((vertexIndex << 1u) & 2u) - 1.0;
    let y = f32(vertexIndex & 2u) - 1.0;
    return vec4<f32>(x, y, 0.0, 1.0);
}`,
            compute: `@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    // Compute shader code here
}`
        };

        return templates[type] || templates.fragment;
    }

    clearAllScripts() {
        if (!this.scriptEngine) return;

        const scripts = Array.from(this.scriptEngine.scripts.keys());
        for (const scriptId of scripts) {
            this.scriptEngine.destroyScript(scriptId);
        }
    }

    setupEventListeners() {
        // Auto-save on script updates
        this.scriptEngine.addEventListener('scriptUpdated', () => {
            this.scheduleAutoSave();
        });

        // Log events for debugging
        this.scriptEngine.addEventListener('scriptExecuted', (event) => {
            const { detail } = event;
            if (detail.success) {
                console.log(`Script ${detail.scriptId} executed successfully`);
            } else {
                console.error(`Script ${detail.scriptId} execution failed:`, detail.error);
                this.showConsoleMessage(`Error in script ${detail.scriptId}: ${detail.error.message}`, 'error');
            }
        });

        this.visualizationEngine.addEventListener('bufferRendered', (event) => {
            console.log(`Buffer ${event.detail.bufferId} rendered as ${event.detail.type}`);
        });
    }

    scheduleAutoSave() {
        if (!this.options.autoSave) return;

        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }

        this.autoSaveTimer = setTimeout(() => {
            this.saveShader().catch(error => {
                console.error('Auto-save failed:', error);
            });
        }, this.options.autoSaveDelay);
    }

    showConsoleMessage(message, type = 'info') {
        const console = this.container.querySelector('#shader-errors');
        if (console) {
            const messageElement = document.createElement('div');
            messageElement.className = `console-message ${type}`;
            messageElement.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            console.appendChild(messageElement);
            console.scrollTop = console.scrollHeight;
        }
    }

    // Event system

    on(event, callback) {
        this.addEventListener(event, callback);
    }

    off(event, callback) {
        this.removeEventListener(event, callback);
    }

    addEventListener(type, listener) {
        this.eventTarget.addEventListener(type, listener);
    }

    removeEventListener(type, listener) {
        this.eventTarget.removeEventListener(type, listener);
    }

    dispatchEvent(type, detail) {
        this.eventTarget.dispatchEvent(new CustomEvent(type, { detail }));
    }

    // Cleanup

    destroy() {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }

        if (this.scriptEngine) {
            this.scriptEngine.destroy();
        }

        if (this.bufferManager) {
            this.bufferManager.destroy();
        }

        if (this.visualizationEngine) {
            this.visualizationEngine.destroy();
        }

        if (this.webgpuCore) {
            this.webgpuCore.destroy();
        }

        this.isInitialized = false;
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShaderWorkspace;
} else {
    window.ShaderWorkspace = ShaderWorkspace;
}