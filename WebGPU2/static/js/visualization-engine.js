/**
 * Visualization Engine
 * Handles rendering buffers to canvas/UI elements
 */
class VisualizationEngine {
    constructor(webgpuCore, bufferManager) {
        this.webgpuCore = webgpuCore;
        this.bufferManager = bufferManager;
        this.visualizations = new Map(); // canvas -> visualization config
        this.eventTarget = new EventTarget();
    }

    renderBufferAsTexture(bufferId, canvas, options = {}) {
        const bufferInfo = this.bufferManager.getBufferReference(bufferId);
        if (!bufferInfo) {
            throw new Error(`Buffer ${bufferId} not found`);
        }

        try {
            const device = this.webgpuCore.getDevice();
            const canvasFormat = this.webgpuCore.getCapabilities().preferredCanvasFormat;

            // Use the WebGPU context that was already configured during initialization
            const context = this.webgpuCore.getContext();
            if (!context) {
                throw new Error('WebGPU context not available');
            }

            // Create render pipeline for texture display
            const pipeline = this.getOrCreateDisplayPipeline(canvasFormat);
            
            // Create bind group for the buffer texture
            const bindGroup = device.createBindGroup({
                layout: pipeline.getBindGroupLayout(0),
                entries: [{
                    binding: 0,
                    resource: bufferInfo.textureView
                }]
            });

            // Render to canvas
            const encoder = device.createCommandEncoder();
            const renderPass = encoder.beginRenderPass({
                colorAttachments: [{
                    view: context.getCurrentTexture().createView(),
                    clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
                    loadOp: 'clear',
                    storeOp: 'store'
                }]
            });

            renderPass.setPipeline(pipeline);
            renderPass.setBindGroup(0, bindGroup);
            renderPass.draw(6); // Two triangles for fullscreen quad
            renderPass.end();

            device.queue.submit([encoder.finish()]);

            this.visualizations.set(canvas, {
                type: 'texture',
                bufferId,
                options
            });

            this.dispatchEvent('bufferRendered', { bufferId, canvas, type: 'texture' });

        } catch (error) {
            console.error(`Failed to render buffer ${bufferId} as texture:`, error);
            throw error;
        }
    }

    renderBufferAsGraph(bufferId, canvas, options = {}) {
        const bufferInfo = this.bufferManager.getBufferReference(bufferId);
        if (!bufferInfo) {
            throw new Error(`Buffer ${bufferId} not found`);
        }

        // Use 2D canvas for graph rendering
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get 2D context from canvas');
        }

        // Read buffer data asynchronously
        this.bufferManager.readBuffer(bufferId, (data) => {
            this.drawGraph(ctx, data, bufferInfo.spec, options);
        });

        this.visualizations.set(canvas, {
            type: 'graph',
            bufferId,
            options
        });
    }

    renderBufferAsHeatmap(bufferId, canvas, options = {}) {
        const bufferInfo = this.bufferManager.getBufferReference(bufferId);
        if (!bufferInfo) {
            throw new Error(`Buffer ${bufferId} not found`);
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get 2D context from canvas');
        }

        this.bufferManager.readBuffer(bufferId, (data) => {
            this.drawHeatmap(ctx, data, bufferInfo.spec, options);
        });

        this.visualizations.set(canvas, {
            type: 'heatmap',
            bufferId,
            options
        });
    }

    sampleBuffer(bufferId, coordinates) {
        const bufferInfo = this.bufferManager.getBufferReference(bufferId);
        if (!bufferInfo) {
            throw new Error(`Buffer ${bufferId} not found`);
        }

        const { x, y } = coordinates;
        const { width, height, format } = bufferInfo.spec;

        if (x < 0 || x >= width || y < 0 || y >= height) {
            throw new Error('Coordinates out of bounds');
        }

        return new Promise((resolve, reject) => {
            this.bufferManager.readBuffer(bufferId, (data) => {
                try {
                    const bytesPerPixel = this.bufferManager.getBytesPerPixel(format);
                    const index = (y * width + x) * bytesPerPixel;
                    
                    const sample = this.extractPixelData(data, index, format);
                    resolve(sample);
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    getBufferStatistics(bufferId) {
        const bufferInfo = this.bufferManager.getBufferReference(bufferId);
        if (!bufferInfo) {
            throw new Error(`Buffer ${bufferId} not found`);
        }

        return new Promise((resolve, reject) => {
            this.bufferManager.readBuffer(bufferId, (data) => {
                try {
                    const stats = this.calculateStatistics(data, bufferInfo.spec);
                    resolve(stats);
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    createBufferInspector(bufferId, container) {
        const bufferInfo = this.bufferManager.getBufferReference(bufferId);
        if (!bufferInfo) {
            throw new Error(`Buffer ${bufferId} not found`);
        }

        const inspector = document.createElement('div');
        inspector.className = 'buffer-inspector';
        inspector.innerHTML = `
            <div class="inspector-header">
                <h4>Buffer ${bufferId} Inspector</h4>
                <button class="close-inspector">×</button>
            </div>
            <div class="inspector-content">
                <div class="buffer-info">
                    <p><strong>Format:</strong> ${bufferInfo.spec.format}</p>
                    <p><strong>Size:</strong> ${bufferInfo.spec.width}×${bufferInfo.spec.height}</p>
                    <p><strong>Last Updated:</strong> ${new Date(bufferInfo.lastUpdated).toLocaleTimeString()}</p>
                </div>
                <div class="sampling-controls">
                    <label>Sample Position:</label>
                    <input type="number" class="sample-x" placeholder="X" min="0" max="${bufferInfo.spec.width-1}">
                    <input type="number" class="sample-y" placeholder="Y" min="0" max="${bufferInfo.spec.height-1}">
                    <button class="sample-btn">Sample</button>
                </div>
                <div class="sample-result"></div>
                <div class="statistics-section">
                    <button class="calculate-stats">Calculate Statistics</button>
                    <div class="stats-result"></div>
                </div>
            </div>
        `;

        this.setupInspectorEvents(inspector, bufferId);
        container.appendChild(inspector);

        return inspector;
    }

    exportBufferAsImage(bufferId, format = 'png') {
        const bufferInfo = this.bufferManager.getBufferReference(bufferId);
        if (!bufferInfo) {
            throw new Error(`Buffer ${bufferId} not found`);
        }

        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            canvas.width = bufferInfo.spec.width;
            canvas.height = bufferInfo.spec.height;

            try {
                this.renderBufferAsTexture(bufferId, canvas);
                
                // Convert canvas to blob
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to create image blob'));
                    }
                }, `image/${format}`);
            } catch (error) {
                reject(error);
            }
        });
    }

    exportBufferAsData(bufferId, format = 'json') {
        const bufferInfo = this.bufferManager.getBufferReference(bufferId);
        if (!bufferInfo) {
            throw new Error(`Buffer ${bufferId} not found`);
        }

        return new Promise((resolve, reject) => {
            this.bufferManager.readBuffer(bufferId, (data) => {
                try {
                    let exportData;
                    
                    if (format === 'json') {
                        exportData = {
                            metadata: {
                                width: bufferInfo.spec.width,
                                height: bufferInfo.spec.height,
                                format: bufferInfo.spec.format,
                                timestamp: bufferInfo.lastUpdated
                            },
                            data: Array.from(data)
                        };
                    } else if (format === 'csv') {
                        const rows = [];
                        const { width, height } = bufferInfo.spec;
                        const bytesPerPixel = this.bufferManager.getBytesPerPixel(bufferInfo.spec.format);
                        
                        for (let y = 0; y < height; y++) {
                            for (let x = 0; x < width; x++) {
                                const index = (y * width + x) * bytesPerPixel;
                                const pixel = this.extractPixelData(data, index, bufferInfo.spec.format);
                                rows.push(`${x},${y},${pixel.join(',')}`);
                            }
                        }
                        exportData = 'x,y,r,g,b,a\n' + rows.join('\n');
                    }
                    
                    resolve(exportData);
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    // Private helper methods

    getOrCreateDisplayPipeline(canvasFormat) {
        if (!this.displayPipeline) {
            const device = this.webgpuCore.getDevice();
            
            const vertexShader = device.createShaderModule({
                code: `
                    @vertex
                    fn main(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4<f32> {
                        // Two triangles forming a quad covering the entire screen
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

            const fragmentShader = device.createShaderModule({
                code: `
                    @group(0) @binding(0) var inputTexture: texture_2d<f32>;
                    
                    @fragment
                    fn main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
                        let texCoord = vec2<u32>(u32(fragCoord.x), u32(fragCoord.y));
                        return textureLoad(inputTexture, texCoord, 0);
                    }
                `
            });

            this.displayPipeline = device.createRenderPipeline({
                label: 'Display pipeline',
                layout: 'auto',
                vertex: {
                    module: vertexShader,
                    entryPoint: 'main'
                },
                fragment: {
                    module: fragmentShader,
                    entryPoint: 'main',
                    targets: [{ format: canvasFormat }]
                }
            });
        }

        return this.displayPipeline;
    }

    drawGraph(ctx, data, bufferSpec, options) {
        const { width, height } = ctx.canvas;
        ctx.clearRect(0, 0, width, height);

        // Sample data points for graph
        const samples = options.samples || 100;
        const stride = Math.max(1, Math.floor(data.length / samples));
        const values = [];

        for (let i = 0; i < data.length; i += stride) {
            values.push(data[i]);
        }

        if (values.length === 0) return;

        const minVal = Math.min(...values);
        const maxVal = Math.max(...values);
        const range = maxVal - minVal || 1;

        // Draw graph
        ctx.strokeStyle = options.color || '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();

        for (let i = 0; i < values.length; i++) {
            const x = (i / (values.length - 1)) * width;
            const y = height - ((values[i] - minVal) / range) * height;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.stroke();
    }

    drawHeatmap(ctx, data, bufferSpec, options) {
        const { width, height } = bufferSpec;
        const { width: canvasWidth, height: canvasHeight } = ctx.canvas;
        
        const imageData = ctx.createImageData(canvasWidth, canvasHeight);
        const scaleX = width / canvasWidth;
        const scaleY = height / canvasHeight;

        for (let y = 0; y < canvasHeight; y++) {
            for (let x = 0; x < canvasWidth; x++) {
                const srcX = Math.floor(x * scaleX);
                const srcY = Math.floor(y * scaleY);
                const srcIndex = (srcY * width + srcX) * 4;
                
                const intensity = data[srcIndex] / 255; // Normalize to 0-1
                const color = this.getHeatmapColor(intensity);
                
                const dstIndex = (y * canvasWidth + x) * 4;
                imageData.data[dstIndex] = color.r;
                imageData.data[dstIndex + 1] = color.g;
                imageData.data[dstIndex + 2] = color.b;
                imageData.data[dstIndex + 3] = 255;
            }
        }

        ctx.putImageData(imageData, 0, 0);
    }

    getHeatmapColor(intensity) {
        // Simple blue-to-red heatmap
        const r = Math.floor(intensity * 255);
        const g = Math.floor((1 - Math.abs(intensity - 0.5) * 2) * 255);
        const b = Math.floor((1 - intensity) * 255);
        return { r, g, b };
    }

    extractPixelData(data, index, format) {
        const bytesPerPixel = this.bufferManager.getBytesPerPixel(format);
        const pixel = [];
        
        for (let i = 0; i < bytesPerPixel; i++) {
            pixel.push(data[index + i]);
        }
        
        return pixel;
    }

    calculateStatistics(data, bufferSpec) {
        const values = Array.from(data);
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);

        return {
            mean,
            min,
            max,
            variance,
            stdDev,
            count: values.length
        };
    }

    setupInspectorEvents(inspector, bufferId) {
        const sampleBtn = inspector.querySelector('.sample-btn');
        const xInput = inspector.querySelector('.sample-x');
        const yInput = inspector.querySelector('.sample-y');
        const sampleResult = inspector.querySelector('.sample-result');
        const statsBtn = inspector.querySelector('.calculate-stats');
        const statsResult = inspector.querySelector('.stats-result');
        const closeBtn = inspector.querySelector('.close-inspector');

        sampleBtn.addEventListener('click', async () => {
            const x = parseInt(xInput.value);
            const y = parseInt(yInput.value);
            
            if (isNaN(x) || isNaN(y)) {
                sampleResult.textContent = 'Please enter valid coordinates';
                return;
            }

            try {
                const sample = await this.sampleBuffer(bufferId, { x, y });
                sampleResult.innerHTML = `<strong>Sample at (${x}, ${y}):</strong> [${sample.join(', ')}]`;
            } catch (error) {
                sampleResult.textContent = `Error: ${error.message}`;
            }
        });

        statsBtn.addEventListener('click', async () => {
            try {
                const stats = await this.getBufferStatistics(bufferId);
                statsResult.innerHTML = `
                    <strong>Statistics:</strong><br>
                    Mean: ${stats.mean.toFixed(3)}<br>
                    Min: ${stats.min}<br>
                    Max: ${stats.max}<br>
                    Std Dev: ${stats.stdDev.toFixed(3)}
                `;
            } catch (error) {
                statsResult.textContent = `Error: ${error.message}`;
            }
        });

        closeBtn.addEventListener('click', () => {
            inspector.remove();
        });
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
        this.visualizations.clear();
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VisualizationEngine;
} else {
    window.VisualizationEngine = VisualizationEngine;
}