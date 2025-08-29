/**
 * Script Execution Engine
 * Handles shader execution and render/compute dispatch
 */
class ScriptEngine {
    constructor(webgpuCore, shaderCompiler, bufferManager) {
        this.webgpuCore = webgpuCore;
        this.shaderCompiler = shaderCompiler;
        this.bufferManager = bufferManager;
        this.scripts = new Map(); // scriptId -> script config
        this.pipelines = new Map(); // scriptId -> pipeline
        this.executionOrder = [];
        this.isRealTimeRunning = false;
        this.frameRate = 60;
        this.animationFrame = null;
        this.eventTarget = new EventTarget();
        
        // Enhanced error handling
        this.errorState = new Map(); // scriptId -> error info
        this.retryCount = new Map(); // scriptId -> retry attempts
        this.maxRetries = 3;
        this.fallbackMode = false;
        
        // Uniform system
        this.timeBuffer = null;
        this.mouseBuffer = null;
        this.uniformBindGroupLayout = null;
        this.uniformBindGroup = null;
        this.mousePosition = { x: 0, y: 0 };
        this.initializeUniforms();
    }

    initializeUniforms() {
        const device = this.webgpuCore.getDevice();
        
        // Create separate uniform buffers for time and mouse
        this.timeBuffer = device.createBuffer({
            label: 'Time Uniform',
            size: 16, // f32 with 16-byte alignment
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        
        this.mouseBuffer = device.createBuffer({
            label: 'Mouse Uniform', 
            size: 16, // vec2<f32> with 16-byte alignment
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
    }

    updateUniforms() {
        const device = this.webgpuCore.getDevice();
        
        // Update time buffer (f32)
        const currentTime = Date.now() / 1000.0;
        const timeData = new Float32Array([currentTime]);
        device.queue.writeBuffer(this.timeBuffer, 0, timeData);
        
        // Update mouse buffer (vec2<f32>)
        const mouseData = new Float32Array([this.mousePosition.x, this.mousePosition.y]);
        device.queue.writeBuffer(this.mouseBuffer, 0, mouseData);
    }

    setMousePosition(x, y) {
        this.mousePosition.x = x;
        this.mousePosition.y = y;
    }

    createScript(config) {
        const { id, code, bufferSpec, type = 'fragment' } = config;
        
        try {
            // Validate input parameters
            if (!id || typeof id !== 'string') {
                throw new Error('Script ID must be a non-empty string');
            }
            if (!code || typeof code !== 'string') {
                throw new Error('Script code must be a non-empty string');
            }
            if (this.scripts.has(id)) {
                throw new Error(`Script with ID "${id}" already exists`);
            }
            
            console.log('ScriptEngine.createScript called with:', { id, code: code?.substring(0, 50) + '...', bufferSpec, type });
            
            const script = {
                id,
                code,
                bufferSpec,
                type,
                enabled: true,
                lastExecuted: 0,
                executionCount: 0,
                createdAt: Date.now()
            };

            console.log('Script object created:', script);
            
            console.log('Adding script to scripts map...');
            this.scripts.set(id, script);
            console.log('Script added to map, now calling bufferManager.createScriptBuffer...');
            
            this.bufferManager.createScriptBuffer(id, bufferSpec);
            console.log('Buffer created for script');
            
            // Clear any previous error state
            this.errorState.delete(id);
            this.retryCount.delete(id);
            
            this.dispatchEvent('scriptCreated', { scriptId: id, script });
            console.log('ScriptEngine.createScript completed successfully');
            return script;
            
        } catch (error) {
            console.error(`Failed to create script ${id}:`, error);
            this.handleScriptError(id, error, 'creation');
            throw error;
        }
    }

    updateScript(scriptId, newConfig) {
        const script = this.scripts.get(scriptId);
        if (!script) {
            throw new Error(`Script ${scriptId} not found`);
        }

        // Update script configuration
        Object.assign(script, newConfig);

        // Update buffer if spec changed
        if (newConfig.bufferSpec) {
            this.bufferManager.updateBufferSpec(scriptId, newConfig.bufferSpec);
        }

        // Clear cached pipeline to force recompilation
        this.pipelines.delete(scriptId);

        this.dispatchEvent('scriptUpdated', { scriptId, script });
    }

    destroyScript(scriptId) {
        this.scripts.delete(scriptId);
        this.pipelines.delete(scriptId);
        this.bufferManager.destroyScriptBuffer(scriptId);
        
        // Remove from execution order
        this.executionOrder = this.executionOrder.filter(id => id !== scriptId);
        
        this.dispatchEvent('scriptDestroyed', { scriptId });
    }

    async executeScript(scriptId, inputs = {}) {
        const script = this.scripts.get(scriptId);
        if (!script || !script.enabled) {
            return false;
        }

        // Check if script is in error state and should be retried
        if (this.errorState.has(scriptId)) {
            const errorInfo = this.errorState.get(scriptId);
            const timeSinceError = Date.now() - errorInfo.timestamp;
            
            // Wait at least 1 second before retry
            if (timeSinceError < 1000) {
                console.log(`Script ${scriptId} in cooldown period, skipping execution`);
                return false;
            }
        }

        try {
            const pipeline = await this.getOrCreatePipeline(scriptId);
            if (!pipeline) {
                throw new Error(`Failed to create pipeline for script ${scriptId}`);
            }

            await this.runPipeline(scriptId, pipeline, inputs);
            
            script.lastExecuted = Date.now();
            script.executionCount++;
            
            // Clear error state on successful execution
            this.errorState.delete(scriptId);
            this.retryCount.delete(scriptId);
            
            this.dispatchEvent('scriptExecuted', { scriptId, success: true });
            return true;

        } catch (error) {
            console.error(`Failed to execute script ${scriptId}:`, error);
            this.handleScriptError(scriptId, error, 'execution');
            this.dispatchEvent('scriptExecuted', { scriptId, success: false, error });
            
            // Don't re-throw if we're in fallback mode
            if (!this.fallbackMode) {
                throw error;
            }
            return false;
        }
    }

    async executeAllScripts() {
        console.log('ScriptEngine: executeAllScripts called, execution order:', this.executionOrder);
        const results = [];
        
        for (const scriptId of this.executionOrder) {
            try {
                await this.executeScript(scriptId);
                results.push({ scriptId, success: true });
            } catch (error) {
                results.push({ scriptId, success: false, error });
                console.error(`Script ${scriptId} execution failed:`, error);
            }
        }
        
        console.log('ScriptEngine: All scripts executed, dispatching allScriptsExecuted event');
        this.dispatchEvent('allScriptsExecuted', { results });
        console.log('ScriptEngine: allScriptsExecuted event dispatched');
        return results;
    }

    setExecutionOrder(scriptIds) {
        this.executionOrder = [...scriptIds];
        this.dispatchEvent('executionOrderChanged', { order: this.executionOrder });
    }

    startRealTimeExecution() {
        if (this.isRealTimeRunning) return;
        
        this.isRealTimeRunning = true;
        this.realTimeLoop();
        this.dispatchEvent('realTimeStarted', {});
    }

    stopRealTimeExecution() {
        this.isRealTimeRunning = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        this.dispatchEvent('realTimeStopped', {});
    }

    setFrameRate(fps) {
        this.frameRate = Math.max(1, Math.min(120, fps));
    }

    async getOrCreatePipeline(scriptId) {
        if (this.pipelines.has(scriptId)) {
            return this.pipelines.get(scriptId);
        }

        const script = this.scripts.get(scriptId);
        if (!script) return null;

        try {
            console.log(`Creating pipeline for script ${scriptId}`);
            console.log('Script code being compiled:', script.code);
            
            // Get available buffer bindings from other scripts
            const availableBuffers = this.getAvailableBuffers(scriptId);
            
            // Inject buffer bindings into shader code
            const enhancedCode = this.shaderCompiler.injectBufferBindings(
                script.code, 
                availableBuffers
            );
            
            console.log('Enhanced code for compilation:', enhancedCode);

            // Compile shader
            const compilation = await this.shaderCompiler.compileShader(enhancedCode, script.type);
            console.log('Shader compiled successfully');
            
            // Create pipeline based on shader type
            const pipeline = await this.createPipelineForType(scriptId, compilation, script.type);
            console.log('Pipeline created successfully');
            
            this.pipelines.set(scriptId, pipeline);
            return pipeline;

        } catch (error) {
            console.error(`Failed to create pipeline for script ${scriptId}:`, error);
            return null;
        }
    }

    async createPipelineForType(scriptId, compilation, type) {
        const device = this.webgpuCore.getDevice();
        const bufferInfo = this.bufferManager.getBufferReference(scriptId);

        if (type === 'compute') {
            return device.createComputePipeline({
                label: `Compute pipeline ${scriptId}`,
                layout: 'auto',
                compute: {
                    module: compilation.shaderModule,
                    entryPoint: 'main'
                }
            });
        } else {
            // Fragment/vertex shader pipeline - use buffer's texture format, not canvas format
            const bufferFormat = this.bufferManager.getTextureFormat(bufferInfo.spec.format);
            
            return device.createRenderPipeline({
                label: `Render pipeline ${scriptId}`,
                layout: 'auto',
                vertex: {
                    module: this.getFullscreenVertexShader(),
                    entryPoint: 'main'
                },
                fragment: {
                    module: compilation.shaderModule,
                    entryPoint: 'main',
                    targets: [{
                        format: bufferFormat
                    }]
                },
                primitive: {
                    topology: 'triangle-list',
                    cullMode: 'none'  // Disable face culling
                }
            });
        }
    }

    async runPipeline(scriptId, pipeline, inputs) {
        const device = this.webgpuCore.getDevice();
        const bufferInfo = this.bufferManager.getBufferReference(scriptId);
        const script = this.scripts.get(scriptId);

        if (!bufferInfo) {
            throw new Error(`Buffer not found for script ${scriptId}`);
        }

        if (!bufferInfo.textureView) {
            throw new Error(`TextureView not available for script ${scriptId}`);
        }

        // Update uniforms before execution
        this.updateUniforms();

        // Create bind group with available buffers and uniforms
        const bindGroup = this.createBindGroup(scriptId, pipeline);

        if (!bindGroup) {
            console.warn(`Skipping execution for script ${scriptId} due to invalid bind group`);
            return;
        }

        const encoder = device.createCommandEncoder();

        if (script.type === 'compute') {
            // Compute shader execution
            const computePass = encoder.beginComputePass();
            computePass.setPipeline(pipeline);
            computePass.setBindGroup(0, bindGroup);
            
            const workgroupSize = 8; // Common workgroup size
            const dispatchX = Math.ceil(bufferInfo.spec.width / workgroupSize);
            const dispatchY = Math.ceil(bufferInfo.spec.height / workgroupSize);
            
            computePass.dispatchWorkgroups(dispatchX, dispatchY);
            computePass.end();
        } else {
            // Render shader execution - render to buffer texture with matching format
            const renderPass = encoder.beginRenderPass({
                colorAttachments: [{
                    view: bufferInfo.textureView,
                    clearValue: { r: 0, g: 0, b: 0, a: 1 },
                    loadOp: 'clear',
                    storeOp: 'store'
                }]
            });
            
            renderPass.setPipeline(pipeline);
            renderPass.setBindGroup(0, bindGroup);
            renderPass.draw(6); // Two triangles (6 vertices)
            renderPass.end();
        }

        device.queue.submit([encoder.finish()]);
    }

    createBindGroup(scriptId, pipeline) {
        const device = this.webgpuCore.getDevice();
        
        try {
            const availableBuffers = this.getAvailableBuffers(scriptId);
            
            // Create bind group layout entries that match createPipelineLayout
            const entries = [];
            
            // Add time uniform at binding 0
            entries.push({
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX,
                buffer: { type: 'uniform' },
            });
            
            // Add mouse uniform at binding 1
            entries.push({
                binding: 1,
                visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX,
                buffer: { type: 'uniform' },
            });
            
            // Add texture bindings for other scripts (starting at binding 2)
            let bindingIndex = 2;
            for (const [otherScriptId, bufferSpec] of availableBuffers) {
                const sampleType = this.getTextureSampleType(bufferSpec.format);
                
                entries.push({
                    binding: bindingIndex,
                    visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
                    texture: {
                        sampleType: sampleType,
                        viewDimension: '2d',
                        multisampled: false,
                    },
                });
                bindingIndex++;
            }
            
            const bindGroupLayout = device.createBindGroupLayout({
                label: 'Bind Group Layout',
                entries: entries
            });
            
            // Create bind group entries (resources)
            const bindGroupEntries = [
                {
                    binding: 0,
                    resource: { buffer: this.timeBuffer },
                },
                {
                    binding: 1,
                    resource: { buffer: this.mouseBuffer },
                }
            ];
            
            // Add texture resources for other scripts (starting at binding 2)
            bindingIndex = 2;
            for (const [otherScriptId, bufferSpec] of availableBuffers) {
                const bufferInfo = this.bufferManager.getBufferReference(otherScriptId);
                if (bufferInfo && bufferInfo.textureView) {
                    bindGroupEntries.push({
                        binding: bindingIndex,
                        resource: bufferInfo.textureView
                    });
                } else {
                    console.warn(`Missing buffer or textureView for script ${otherScriptId}`);
                    return null;
                }
                bindingIndex++;
            }
            
            const bindGroup = device.createBindGroup({
                layout: bindGroupLayout,
                entries: bindGroupEntries
            });

            return bindGroup;
        } catch (error) {
            console.error('Failed to create bind group:', error);
            throw error;
        }
    }

    getTextureSampleType(format) {
        // Map buffer formats to WebGPU texture sample types
        if (format.includes('float') || format === 'rgba8unorm' || format === 'bgra8unorm') {
            return 'float';
        } else if (format.includes('uint')) {
            return 'uint';
        } else if (format.includes('sint')) {
            return 'sint';
        } else {
            return 'float'; // Default fallback
        }
    }

    getAvailableBuffers(excludeScriptId) {
        const available = new Map();
        for (const [scriptId, script] of this.scripts) {
            if (scriptId !== excludeScriptId) {
                available.set(scriptId, script.bufferSpec);
            }
        }
        return available;
    }

    getFullscreenVertexShader() {
        const device = this.webgpuCore.getDevice();
        
        // Cache the fullscreen vertex shader
        if (!this.fullscreenVertexShader) {
            this.fullscreenVertexShader = device.createShaderModule({
                code: `
                    @vertex
                    fn main(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4<f32> {
                        // Two triangles forming a quad covering the entire screen
                        // Triangle 1: bottom-left triangle (0,1,2)
                        // Triangle 2: top-right triangle (3,4,5)
                        
                        let positions = array<vec2<f32>, 6>(
                            vec2<f32>(-1.0, -1.0),  // 0: bottom-left
                            vec2<f32>( 1.0, -1.0),  // 1: bottom-right
                            vec2<f32>( 1.0,  1.0),  // 2: top-right
                            vec2<f32>(-1.0, -1.0),  // 3: bottom-left  
                            vec2<f32>( 1.0,  1.0),  // 4: top-right
                            vec2<f32>(-1.0,  1.0)   // 5: top-left
                        );
                        
                        let pos = positions[vertexIndex];
                        return vec4<f32>(pos.x, pos.y, 0.0, 1.0);
                    }
                `
            });
        }
        
        return this.fullscreenVertexShader;
    }

    realTimeLoop() {
        if (!this.isRealTimeRunning) return;

        const frameTime = 1000 / this.frameRate;
        const startTime = performance.now();
        
        // Use requestAnimationFrame instead of setTimeout for better performance
        this.animationFrame = requestAnimationFrame(async () => {
            try {
                // Check if we should skip this frame to maintain target framerate
                const elapsed = performance.now() - startTime;
                if (elapsed < frameTime) {
                    this.realTimeLoop();
                    return;
                }

                await this.executeAllScripts();
                
                // Yield to main thread before next iteration
                setTimeout(() => {
                    this.realTimeLoop();
                }, 0);
                
            } catch (error) {
                console.error('Real-time execution error:', error);
                this.stopRealTimeExecution();
            }
        });
    }

    handleScriptError(scriptId, error, phase) {
        const currentRetries = this.retryCount.get(scriptId) || 0;
        
        this.errorState.set(scriptId, {
            error: error.message,
            phase,
            timestamp: Date.now(),
            retries: currentRetries
        });
        
        if (currentRetries < this.maxRetries) {
            this.retryCount.set(scriptId, currentRetries + 1);
            console.log(`Will retry script ${scriptId} (attempt ${currentRetries + 1}/${this.maxRetries})`);
        } else {
            console.warn(`Script ${scriptId} exceeded max retries, disabling`);
            const script = this.scripts.get(scriptId);
            if (script) {
                script.enabled = false;
            }
        }
        
        this.dispatchEvent('scriptError', { 
            scriptId, 
            error: error.message, 
            phase, 
            retries: currentRetries 
        });
    }

    enableFallbackMode() {
        this.fallbackMode = true;
        console.log('Script engine entered fallback mode - will continue execution despite errors');
    }

    disableFallbackMode() {
        this.fallbackMode = false;
    }

    getErrorState(scriptId) {
        return this.errorState.get(scriptId);
    }

    clearErrors(scriptId = null) {
        if (scriptId) {
            this.errorState.delete(scriptId);
            this.retryCount.delete(scriptId);
            const script = this.scripts.get(scriptId);
            if (script) {
                script.enabled = true;
            }
        } else {
            this.errorState.clear();
            this.retryCount.clear();
            // Re-enable all scripts
            for (const script of this.scripts.values()) {
                script.enabled = true;
            }
        }
    }

    dispatchEvent(type, detail) {
        this.eventTarget.dispatchEvent(new CustomEvent(type, { detail }));
    }

    addEventListener(type, listener) {
        this.eventTarget.addEventListener(type, listener);
    }

    removeEventListener(type, listener) {
        this.eventTarget.removeEventListener(type, listener);
    }

    destroy() {
        this.stopRealTimeExecution();
        this.scripts.clear();
        this.pipelines.clear();
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScriptEngine;
} else {
    window.ScriptEngine = ScriptEngine;
}