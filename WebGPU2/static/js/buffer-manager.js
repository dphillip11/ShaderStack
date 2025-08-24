/**
 * Buffer Manager Module
 * Handles buffer lifecycle and inter-script sharing
 */
class BufferManager {
    constructor(webgpuCore) {
        this.webgpuCore = webgpuCore;
        this.buffers = new Map(); // scriptId -> buffer info
        this.references = new Map(); // scriptId -> Set of dependent scripts
        this.eventTarget = new EventTarget();
    }

    createScriptBuffer(scriptId, bufferSpec) {
        try {
            const device = this.webgpuCore.getDevice();
            const { format, width, height } = bufferSpec;

            // Calculate buffer size based on format
            const bytesPerPixel = this.getBytesPerPixel(format);
            const size = width * height * bytesPerPixel;

            // Create buffer for compute operations
            const buffer = device.createBuffer({
                label: `Script ${scriptId} buffer`,
                size: size,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
            });

            // Create texture for rendering operations
            const texture = device.createTexture({
                label: `Script ${scriptId} texture`,
                size: { width, height },
                format: this.getTextureFormat(format),
                usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
            });

            const bufferInfo = {
                scriptId,
                spec: bufferSpec,
                buffer,
                texture,
                textureView: texture.createView(),
                size,
                lastUpdated: Date.now()
            };

            this.buffers.set(scriptId, bufferInfo);
            this.references.set(scriptId, new Set());

            this.dispatchEvent('bufferCreated', { scriptId, bufferInfo });
            return bufferInfo;

        } catch (error) {
            console.error(`Failed to create buffer for script ${scriptId}:`, error);
            throw error;
        }
    }

    updateBufferSpec(scriptId, newSpec) {
        const existing = this.buffers.get(scriptId);
        if (!existing) {
            return this.createScriptBuffer(scriptId, newSpec);
        }

        const { format, width, height } = newSpec;
        const oldSpec = existing.spec;

        // Check if we need to recreate the buffer
        if (oldSpec.format !== format || oldSpec.width !== width || oldSpec.height !== height) {
            this.destroyScriptBuffer(scriptId);
            return this.createScriptBuffer(scriptId, newSpec);
        }

        return existing;
    }

    destroyScriptBuffer(scriptId) {
        const bufferInfo = this.buffers.get(scriptId);
        if (!bufferInfo) return;

        // Clean up WebGPU resources
        bufferInfo.buffer.destroy();
        bufferInfo.texture.destroy();

        // Remove references
        this.buffers.delete(scriptId);
        this.references.delete(scriptId);

        // Notify dependent scripts
        this.dispatchEvent('bufferDestroyed', { scriptId });
    }

    getBufferReference(scriptId) {
        return this.buffers.get(scriptId);
    }

    createBufferBinding(sourceScript, targetScript) {
        if (!this.references.has(sourceScript)) {
            this.references.set(sourceScript, new Set());
        }
        this.references.get(sourceScript).add(targetScript);

        this.dispatchEvent('bindingCreated', { sourceScript, targetScript });
    }

    async readBuffer(scriptId, callback) {
        const bufferInfo = this.buffers.get(scriptId);
        if (!bufferInfo) {
            throw new Error(`Buffer for script ${scriptId} not found`);
        }

        try {
            const device = this.webgpuCore.getDevice();
            
            // Create staging buffer for reading
            const stagingBuffer = device.createBuffer({
                size: bufferInfo.size,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
            });

            // Copy data to staging buffer
            const encoder = device.createCommandEncoder();
            encoder.copyBufferToBuffer(
                bufferInfo.buffer, 0,
                stagingBuffer, 0,
                bufferInfo.size
            );
            device.queue.submit([encoder.finish()]);

            // Wait for GPU operations to complete
            await device.queue.onSubmittedWorkDone();

            // Map and read data asynchronously
            await stagingBuffer.mapAsync(GPUMapMode.READ);
            
            // Yield to main thread before processing large data
            await new Promise(resolve => setTimeout(resolve, 0));
            
            const data = new Uint8Array(stagingBuffer.getMappedRange());
            const dataCopy = new Uint8Array(data); // Create copy before unmapping
            
            stagingBuffer.unmap();
            stagingBuffer.destroy();

            // Process callback asynchronously to avoid blocking
            if (callback) {
                setTimeout(() => callback(dataCopy), 0);
            }

            return dataCopy;

        } catch (error) {
            console.error(`Failed to read buffer for script ${scriptId}:`, error);
            throw error;
        }
    }

    copyBuffer(sourceId, targetId) {
        const source = this.buffers.get(sourceId);
        const target = this.buffers.get(targetId);

        if (!source || !target) {
            throw new Error('Source or target buffer not found');
        }

        const device = this.webgpuCore.getDevice();
        const encoder = device.createCommandEncoder();

        // Copy buffer data
        encoder.copyBufferToBuffer(
            source.buffer, 0,
            target.buffer, 0,
            Math.min(source.size, target.size)
        );

        // Copy texture data
        encoder.copyTextureToTexture(
            { texture: source.texture },
            { texture: target.texture },
            { 
                width: Math.min(source.spec.width, target.spec.width),
                height: Math.min(source.spec.height, target.spec.height)
            }
        );

        device.queue.submit([encoder.finish()]);
        target.lastUpdated = Date.now();

        this.dispatchEvent('bufferCopied', { sourceId, targetId });
    }

    clearBuffer(scriptId) {
        const bufferInfo = this.buffers.get(scriptId);
        if (!bufferInfo) return;

        const device = this.webgpuCore.getDevice();
        const encoder = device.createCommandEncoder();

        // Clear buffer to zero
        encoder.clearBuffer(bufferInfo.buffer);
        device.queue.submit([encoder.finish()]);

        bufferInfo.lastUpdated = Date.now();
        this.dispatchEvent('bufferCleared', { scriptId });
    }

    getAllBuffers() {
        return new Map(this.buffers);
    }

    getBufferDependencies(scriptId) {
        return this.references.get(scriptId) || new Set();
    }

    getBytesPerPixel(format) {
        const formatMap = {
            'rgba8unorm': 4,
            'rgba16float': 8,
            'rgba32float': 16,
            'r32float': 4,
            'rg32float': 8
        };
        return formatMap[format] || 4;
    }

    getTextureFormat(format) {
        const formatMap = {
            'rgba8unorm': 'rgba8unorm',
            'rgba16float': 'rgba16float',
            'rgba32float': 'rgba32float',
            'r32float': 'r32float',
            'rg32float': 'rg32float'
        };
        return formatMap[format] || 'rgba8unorm';
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
        // Clean up all buffers
        for (const scriptId of this.buffers.keys()) {
            this.destroyScriptBuffer(scriptId);
        }
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BufferManager;
} else {
    window.BufferManager = BufferManager;
}