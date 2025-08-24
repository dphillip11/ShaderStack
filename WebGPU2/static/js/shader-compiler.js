/**
 * Shader Compiler Module
 * Handles WGSL compilation and validation
 */
class ShaderCompiler {
    constructor(webgpuCore) {
        this.webgpuCore = webgpuCore;
        this.compilationCache = new Map();
    }

    async compileShader(source, type = 'fragment') {
        const cacheKey = `${type}:${source}`;
        
        if (this.compilationCache.has(cacheKey)) {
            return this.compilationCache.get(cacheKey);
        }

        try {
            const device = this.webgpuCore.getDevice();
            
            // Create shader module to validate compilation
            const shaderModule = device.createShaderModule({
                label: `${type} shader`,
                code: source
            });

            // Check for compilation errors
            const compilationInfo = await shaderModule.getCompilationInfo();
            const errors = compilationInfo.messages.filter(msg => msg.type === 'error');
            
            if (errors.length > 0) {
                const compilationError = new Error('Shader compilation failed');
                compilationError.details = errors.map(error => ({
                    line: error.lineNum,
                    column: error.linePos,
                    message: error.message,
                    type: error.type
                }));
                throw compilationError;
            }

            const result = {
                shaderModule,
                source,
                type,
                warnings: compilationInfo.messages.filter(msg => msg.type === 'warning')
            };

            this.compilationCache.set(cacheKey, result);
            return result;
            
        } catch (error) {
            console.error('Shader compilation error:', error);
            throw error;
        }
    }

    validateSyntax(source) {
        // Basic WGSL syntax validation patterns
        const patterns = {
            invalidChars: /[^\w\s\[\](){}.,;:@<>!&|+\-*/=]/g,
            missingMain: !source.includes('fn main'),
            malformedFunction: /fn\s+\w+\s*\([^)]*\)\s*(?:->.*?)?\s*(?!{)/g
        };

        const issues = [];

        if (patterns.invalidChars.test(source)) {
            issues.push({
                type: 'warning',
                message: 'Contains potentially invalid characters',
                line: 0
            });
        }

        if (patterns.missingMain) {
            issues.push({
                type: 'error',
                message: 'Missing main function',
                line: 0
            });
        }

        return issues;
    }

    getCompileErrors() {
        // Return cached compilation errors if any
        return this.lastCompilationErrors || [];
    }

    injectBufferBindings(source, bufferSpecs) {
        // Inject buffer bindings based on available buffers from other scripts
        let injectedSource = source;
        let bindingIndex = 0;

        for (const [scriptId, bufferSpec] of bufferSpecs) {
            const bindingCode = this.generateBufferBinding(scriptId, bufferSpec, bindingIndex);
            injectedSource = bindingCode + '\n' + injectedSource;
            bindingIndex++;
        }

        return injectedSource;
    }

    generateBufferBinding(scriptId, bufferSpec, bindingIndex) {
        const { format, width, height } = bufferSpec;
        
        // Generate appropriate binding based on buffer format
        if (format.includes('texture') || format.includes('rgba')) {
            return `@group(0) @binding(${bindingIndex}) var script${scriptId}_output: texture_2d<f32>;`;
        } else {
            return `@group(0) @binding(${bindingIndex}) var<storage, read> script${scriptId}_output: array<f32>;`;
        }
    }

    resolveIncludes(source, dependencies = {}) {
        // Simple include resolution for common WebGPU utilities
        let resolvedSource = source;

        // Replace common include patterns
        const includePattern = /#include\s+"([^"]+)"/g;
        resolvedSource = resolvedSource.replace(includePattern, (match, includePath) => {
            if (dependencies[includePath]) {
                return dependencies[includePath];
            }
            console.warn(`Include not found: ${includePath}`);
            return `// Include not found: ${includePath}`;
        });

        return resolvedSource;
    }

    clearCache() {
        this.compilationCache.clear();
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShaderCompiler;
} else {
    window.ShaderCompiler = ShaderCompiler;
}