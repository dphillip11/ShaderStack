/**
 * WebGPU Core Module
 * Handles low-level WebGPU device and resource management
 */
class WebGPUCore {
    constructor() {
        this.device = null;
        this.adapter = null;
        this.canvas = null;
        this.context = null;
        this.capabilities = null;
    }

    async initDevice(canvas, options = {}) {
        try {
            console.log('Starting WebGPU initialization...');
            
            if (!navigator.gpu) {
                throw new Error('WebGPU not supported in this browser');
            }

            this.canvas = canvas;
            console.log('Canvas found:', canvas);
            
            // Simple adapter request without complex retry logic
            console.log('Requesting GPU adapter...');
            this.adapter = await navigator.gpu.requestAdapter();

            if (!this.adapter) {
                throw new Error('No appropriate GPUAdapter found');
            }

            console.log('GPU adapter obtained:', this.adapter);
            
            // Simple device request
            console.log('Requesting GPU device...');
            this.device = await this.adapter.requestDevice();
            console.log('GPU device obtained:', this.device);

            // Initialize canvas context
            console.log('Getting WebGPU context...');
            this.context = canvas.getContext('webgpu');
            if (!this.context) {
                throw new Error('Failed to get WebGPU context from canvas');
            }

            console.log('Configuring canvas context...');
            const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
            
            this.context.configure({
                device: this.device,
                format: canvasFormat,
                alphaMode: 'premultiplied'
            });

            this.capabilities = {
                maxBufferSize: this.device.limits.maxBufferSize,
                maxTextureSize: this.device.limits.maxTextureDimension2D,
                maxComputeWorkgroupSize: this.device.limits.maxComputeWorkgroupSizeX,
                preferredCanvasFormat: canvasFormat
            };

            console.log('WebGPU initialized successfully', this.capabilities);
            return true;
        } catch (error) {
            console.error('Failed to initialize WebGPU:', error);
            throw error;
        }
    }

    getDevice() {
        if (!this.device) {
            throw new Error('WebGPU device not initialized');
        }
        return this.device;
    }

    getContext() {
        return this.context;
    }

    getCapabilities() {
        return this.capabilities;
    }

    createBuffer(descriptor) {
        return this.device.createBuffer(descriptor);
    }

    createTexture(descriptor) {
        return this.device.createTexture(descriptor);
    }

    createBindGroup(descriptor) {
        return this.device.createBindGroup(descriptor);
    }

    createRenderPipeline(descriptor) {
        return this.device.createRenderPipeline(descriptor);
    }

    createComputePipeline(descriptor) {
        return this.device.createComputePipeline(descriptor);
    }

    submitCommands(commands) {
        this.device.queue.submit(commands);
    }

    destroy() {
        if (this.device) {
            this.device.destroy();
            this.device = null;
        }
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebGPUCore;
} else {
    window.WebGPUCore = WebGPUCore;
}