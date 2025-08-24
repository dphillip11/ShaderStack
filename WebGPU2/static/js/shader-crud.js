/**
 * Shader CRUD Operations
 * Dedicated module for all shader Create, Read, Update, Delete operations
 * with clear separation of concerns and testable methods
 */
class ShaderCRUD {
    constructor(workspace) {
        this.workspace = workspace;
        this.eventTarget = new EventTarget();
    }

    /**
     * CREATE Operations
     */
    
    async createShader(name = 'New Shader', type = 'fragment') {
        try {
            console.log(`[CRUD] Creating shader: ${name} (${type})`);
            
            const defaultCode = this.getDefaultShaderCode(type);
            const defaultBufferSpec = {
                format: 'rgba8unorm',
                width: 512,
                height: 512
            };

            const shader = {
                id: null,
                name: name,
                shader_scripts: [{
                    id: 0,
                    code: defaultCode,
                    buffer: defaultBufferSpec
                }],
                tags: []
            };

            console.log(`[CRUD] Shader object created:`, shader);
            this.dispatchEvent('shaderCreated', { shader });
            return shader;

        } catch (error) {
            console.error('[CRUD] Create shader failed:', error);
            this.dispatchEvent('createError', { error });
            throw error;
        }
    }

    async createScript(code = '', bufferSpec = null, scriptId = null) {
        try {
            const id = scriptId || Date.now();
            console.log(`[CRUD] Creating script with ID: ${id}`);

            const defaultBufferSpec = {
                format: 'rgba8unorm',
                width: 512,
                height: 512
            };

            const scriptConfig = {
                id,
                code: code || this.getDefaultShaderCode('fragment'),
                bufferSpec: bufferSpec || defaultBufferSpec,
                type: 'fragment'
            };

            console.log(`[CRUD] Script config:`, scriptConfig);

            // Verify workspace is available
            if (!this.workspace || !this.workspace.scriptEngine) {
                throw new Error('Workspace or script engine not available');
            }

            const script = this.workspace.scriptEngine.createScript(scriptConfig);
            console.log(`[CRUD] Script created successfully:`, script);

            // Add to current shader if exists
            if (this.workspace.currentShader) {
                this.workspace.currentShader.shader_scripts.push({
                    id,
                    code: script.code,
                    buffer: script.bufferSpec
                });
                console.log(`[CRUD] Script added to current shader`);
            }

            this.dispatchEvent('scriptCreated', { scriptId: id, script });
            return id;

        } catch (error) {
            console.error('[CRUD] Create script failed:', error);
            this.dispatchEvent('createScriptError', { error });
            throw error;
        }
    }

    /**
     * READ Operations
     */

    getShader() {
        try {
            const shader = this.workspace?.currentShader;
            console.log(`[CRUD] Getting current shader:`, shader);
            return shader;
        } catch (error) {
            console.error('[CRUD] Get shader failed:', error);
            throw error;
        }
    }

    getScript(scriptId) {
        try {
            const script = this.workspace?.scriptEngine?.scripts?.get(scriptId);
            console.log(`[CRUD] Getting script ${scriptId}:`, script);
            return script;
        } catch (error) {
            console.error(`[CRUD] Get script ${scriptId} failed:`, error);
            throw error;
        }
    }

    getAllScripts() {
        try {
            const scripts = Array.from(this.workspace?.scriptEngine?.scripts?.entries() || []);
            console.log(`[CRUD] Getting all scripts:`, scripts);
            return scripts;
        } catch (error) {
            console.error('[CRUD] Get all scripts failed:', error);
            throw error;
        }
    }

    getScriptCount() {
        try {
            const count = this.workspace?.scriptEngine?.scripts?.size || 0;
            console.log(`[CRUD] Script count: ${count}`);
            return count;
        } catch (error) {
            console.error('[CRUD] Get script count failed:', error);
            return 0;
        }
    }

    /**
     * UPDATE Operations
     */

    async updateShader(shaderData) {
        try {
            console.log(`[CRUD] Updating shader:`, shaderData);
            
            if (!this.workspace) {
                throw new Error('Workspace not available');
            }

            this.workspace.currentShader = { ...shaderData };
            console.log(`[CRUD] Shader updated successfully`);
            
            this.dispatchEvent('shaderUpdated', { shader: shaderData });
            return true;

        } catch (error) {
            console.error('[CRUD] Update shader failed:', error);
            this.dispatchEvent('updateError', { error });
            throw error;
        }
    }

    async updateScriptCode(scriptId, code) {
        try {
            console.log(`[CRUD] Updating script ${scriptId} code`);

            if (!this.workspace?.scriptEngine) {
                throw new Error('Script engine not available');
            }

            this.workspace.scriptEngine.updateScript(scriptId, { code });

            // Update current shader
            if (this.workspace.currentShader) {
                const script = this.workspace.currentShader.shader_scripts.find(s => s.id === scriptId);
                if (script) {
                    script.code = code;
                    console.log(`[CRUD] Script code updated in current shader`);
                }
            }

            this.dispatchEvent('scriptCodeUpdated', { scriptId, code });
            return true;

        } catch (error) {
            console.error(`[CRUD] Update script ${scriptId} code failed:`, error);
            this.dispatchEvent('updateScriptError', { scriptId, error });
            throw error;
        }
    }

    async updateScriptBuffer(scriptId, bufferSpec) {
        try {
            console.log(`[CRUD] Updating script ${scriptId} buffer:`, bufferSpec);

            if (!this.workspace?.scriptEngine) {
                throw new Error('Script engine not available');
            }

            this.workspace.scriptEngine.updateScript(scriptId, { bufferSpec });

            // Update current shader
            if (this.workspace.currentShader) {
                const script = this.workspace.currentShader.shader_scripts.find(s => s.id === scriptId);
                if (script) {
                    script.buffer = bufferSpec;
                    console.log(`[CRUD] Script buffer updated in current shader`);
                }
            }

            this.dispatchEvent('scriptBufferUpdated', { scriptId, bufferSpec });
            return true;

        } catch (error) {
            console.error(`[CRUD] Update script ${scriptId} buffer failed:`, error);
            this.dispatchEvent('updateScriptBufferError', { scriptId, error });
            throw error;
        }
    }

    /**
     * DELETE Operations
     */

    async deleteScript(scriptId) {
        try {
            console.log(`[CRUD] Deleting script: ${scriptId}`);

            if (this.getScriptCount() <= 1) {
                throw new Error('Cannot delete the last script');
            }

            if (!this.workspace?.scriptEngine) {
                throw new Error('Script engine not available');
            }

            this.workspace.scriptEngine.destroyScript(scriptId);

            // Remove from current shader
            if (this.workspace.currentShader) {
                this.workspace.currentShader.shader_scripts = 
                    this.workspace.currentShader.shader_scripts.filter(s => s.id !== scriptId);
                console.log(`[CRUD] Script removed from current shader`);
            }

            this.dispatchEvent('scriptDeleted', { scriptId });
            return true;

        } catch (error) {
            console.error(`[CRUD] Delete script ${scriptId} failed:`, error);
            this.dispatchEvent('deleteScriptError', { scriptId, error });
            throw error;
        }
    }

    async clearAllScripts() {
        try {
            console.log(`[CRUD] Clearing all scripts`);

            if (!this.workspace?.scriptEngine) {
                throw new Error('Script engine not available');
            }

            const scripts = Array.from(this.workspace.scriptEngine.scripts.keys());
            for (const scriptId of scripts) {
                this.workspace.scriptEngine.destroyScript(scriptId);
            }

            // Clear from current shader
            if (this.workspace.currentShader) {
                this.workspace.currentShader.shader_scripts = [];
            }

            console.log(`[CRUD] All scripts cleared`);
            this.dispatchEvent('allScriptsCleared', {});
            return true;

        } catch (error) {
            console.error('[CRUD] Clear all scripts failed:', error);
            this.dispatchEvent('clearAllScriptsError', { error });
            throw error;
        }
    }

    /**
     * LOAD/SAVE Operations
     */

    async loadShader(shaderData) {
        try {
            console.log(`[CRUD] Loading shader:`, shaderData);

            // Clear existing scripts first
            await this.clearAllScripts();

            // Set current shader
            this.workspace.currentShader = {
                ...shaderData,
                shader_scripts: [] // Start with empty array
            };

            // Create scripts from shader data
            for (let i = 0; i < shaderData.shader_scripts.length; i++) {
                const scriptData = shaderData.shader_scripts[i];
                console.log(`[CRUD] Loading script ${i}:`, scriptData);
                
                // Create script directly in engine
                const script = this.workspace.scriptEngine.createScript({
                    id: scriptData.id,
                    code: scriptData.code,
                    bufferSpec: scriptData.buffer,
                    type: 'fragment'
                });
                
                // Add to currentShader
                this.workspace.currentShader.shader_scripts.push({
                    id: scriptData.id,
                    code: scriptData.code,
                    buffer: scriptData.buffer
                });
                
                console.log(`[CRUD] Script ${i} loaded successfully`);
            }

            // Set execution order
            const scriptIds = shaderData.shader_scripts.map(s => s.id);
            this.workspace.scriptEngine.setExecutionOrder(scriptIds);

            console.log(`[CRUD] Shader loaded successfully`);
            this.dispatchEvent('shaderLoaded', { shader: shaderData });
            return true;

        } catch (error) {
            console.error('[CRUD] Load shader failed:', error);
            this.dispatchEvent('loadShaderError', { error });
            throw error;
        }
    }

    async saveShader() {
        try {
            console.log(`[CRUD] Saving shader`);

            if (!this.workspace?.currentShader) {
                throw new Error('No shader to save');
            }

            const shaderData = this.getCurrentShaderData();
            console.log(`[CRUD] Shader data to save:`, shaderData);

            const isUpdate = shaderData.id && shaderData.id !== null;
            const endpoint = isUpdate ? `/api/shaders/${shaderData.id}` : '/api/shaders/new';
            const method = isUpdate ? 'PUT' : 'POST';

            console.log(`[CRUD] ${method} ${endpoint}`);

            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(shaderData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log(`[CRUD] Save response:`, result);

            // Update shader ID if it was a new shader
            if (!isUpdate && result.id) {
                this.workspace.currentShader.id = result.id;
            }

            this.dispatchEvent('shaderSaved', { shader: shaderData, result });
            return result;

        } catch (error) {
            console.error('[CRUD] Save shader failed:', error);
            this.dispatchEvent('saveShaderError', { error });
            throw error;
        }
    }

    /**
     * VALIDATION Operations
     */

    validateShader(shaderData) {
        const errors = [];

        if (!shaderData) {
            errors.push('Shader data is required');
            return errors;
        }

        if (!shaderData.name || shaderData.name.trim() === '') {
            errors.push('Shader name is required');
        }

        if (!shaderData.shader_scripts || !Array.isArray(shaderData.shader_scripts)) {
            errors.push('Shader scripts must be an array');
        } else if (shaderData.shader_scripts.length === 0) {
            errors.push('At least one script is required');
        }

        // Validate each script
        shaderData.shader_scripts.forEach((script, index) => {
            if (script.id === undefined || script.id === null) {
                errors.push(`Script ${index} is missing ID`);
            }
            if (!script.code || script.code.trim() === '') {
                errors.push(`Script ${index} is missing code`);
            }
            if (!script.buffer) {
                errors.push(`Script ${index} is missing buffer specification`);
            }
        });

        return errors;
    }

    validateScript(scriptData) {
        const errors = [];

        if (!scriptData) {
            errors.push('Script data is required');
            return errors;
        }

        if (scriptData.id === undefined || scriptData.id === null) {
            errors.push('Script ID is required');
        }

        if (!scriptData.code || scriptData.code.trim() === '') {
            errors.push('Script code is required');
        }

        if (!scriptData.bufferSpec) {
            errors.push('Script buffer specification is required');
        } else {
            if (!scriptData.bufferSpec.format) {
                errors.push('Buffer format is required');
            }
            if (!scriptData.bufferSpec.width || scriptData.bufferSpec.width <= 0) {
                errors.push('Buffer width must be positive');
            }
            if (!scriptData.bufferSpec.height || scriptData.bufferSpec.height <= 0) {
                errors.push('Buffer height must be positive');
            }
        }

        return errors;
    }

    /**
     * UTILITY Methods
     */

    getCurrentShaderData() {
        if (!this.workspace?.currentShader) return null;

        // Sync script data from engine
        const engineScripts = this.workspace.scriptEngine?.scripts || new Map();
        const shaderScripts = [];

        for (const [scriptId, script] of engineScripts) {
            shaderScripts.push({
                id: scriptId,
                code: script.code,
                buffer: script.bufferSpec
            });
        }

        return {
            ...this.workspace.currentShader,
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

    /**
     * EVENT System
     */

    addEventListener(type, listener) {
        this.eventTarget.addEventListener(type, listener);
    }

    removeEventListener(type, listener) {
        this.eventTarget.removeEventListener(type, listener);
    }

    dispatchEvent(type, detail) {
        console.log(`[CRUD] Event: ${type}`, detail);
        this.eventTarget.dispatchEvent(new CustomEvent(type, { detail }));
    }

    /**
     * DEBUG Methods
     */

    getDebugInfo() {
        return {
            hasWorkspace: !!this.workspace,
            hasScriptEngine: !!this.workspace?.scriptEngine,
            currentShader: this.workspace?.currentShader,
            scriptCount: this.getScriptCount(),
            scripts: this.getAllScripts()
        };
    }

    logState() {
        console.log('[CRUD] Current State:', this.getDebugInfo());
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShaderCRUD;
} else {
    window.ShaderCRUD = ShaderCRUD;
}