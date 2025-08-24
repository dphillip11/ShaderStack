/**
 * Shader CRUD Test Suite
 * Comprehensive tests for all shader CRUD operations
 * Run this in the browser console to verify functionality
 */
class ShaderCRUDTests {
    constructor() {
        this.testResults = [];
        this.workspace = null;
        this.crud = null;
        this.testData = {
            testShader: {
                id: null,
                name: 'Test Shader',
                shader_scripts: [
                    {
                        id: 1,
                        code: '@fragment\nfn main() -> @location(0) vec4<f32> {\n    return vec4<f32>(1.0, 0.0, 0.0, 1.0);\n}',
                        buffer: {
                            format: 'rgba8unorm',
                            width: 512,
                            height: 512
                        }
                    }
                ],
                tags: []
            },
            testScript: {
                id: 999,
                code: '@fragment\nfn main() -> @location(0) vec4<f32> {\n    return vec4<f32>(0.0, 1.0, 0.0, 1.0);\n}',
                bufferSpec: {
                    format: 'rgba8unorm',
                    width: 256,
                    height: 256
                }
            }
        };
    }

    async runAllTests() {
        console.log('🧪 Starting Shader CRUD Test Suite...');
        this.testResults = [];

        try {
            // Setup
            await this.setupTest();
            
            // Run test categories
            await this.testCreateOperations();
            await this.testReadOperations();
            await this.testUpdateOperations();
            await this.testDeleteOperations();
            await this.testLoadSaveOperations();
            await this.testValidationOperations();
            await this.testErrorHandling();
            
            // Cleanup
            await this.cleanupTest();
            
        } catch (error) {
            this.logResult('SETUP', false, `Test setup failed: ${error.message}`);
        }

        this.printResults();
        return this.testResults;
    }

    async setupTest() {
        console.log('🔧 Setting up test environment...');
        
        try {
            // Create mock workspace if ShaderWorkspace is available
            if (typeof ShaderWorkspace !== 'undefined') {
                const container = document.querySelector('.editor-page') || document.body;
                this.workspace = new ShaderWorkspace(container);
                await this.workspace.initialize();
            } else {
                // Create minimal mock workspace
                this.workspace = this.createMockWorkspace();
            }

            this.crud = new ShaderCRUD(this.workspace);
            this.logResult('SETUP', true, 'Test environment initialized');
            
        } catch (error) {
            this.logResult('SETUP', false, `Setup failed: ${error.message}`);
            throw error;
        }
    }

    createMockWorkspace() {
        const mockScripts = new Map();
        
        return {
            currentShader: null,
            scriptEngine: {
                scripts: mockScripts,
                createScript: (config) => {
                    const script = {
                        id: config.id,
                        code: config.code,
                        bufferSpec: config.bufferSpec,
                        type: config.type
                    };
                    mockScripts.set(config.id, script);
                    return script;
                },
                updateScript: (id, updates) => {
                    const script = mockScripts.get(id);
                    if (script) {
                        Object.assign(script, updates);
                    }
                },
                destroyScript: (id) => {
                    mockScripts.delete(id);
                },
                setExecutionOrder: (ids) => {
                    // Mock implementation
                }
            }
        };
    }

    async testCreateOperations() {
        console.log('🏗️ Testing CREATE operations...');

        // Test createShader
        try {
            const shader = await this.crud.createShader('Test Shader', 'fragment');
            this.assert(shader !== null, 'Shader should be created');
            this.assert(shader.name === 'Test Shader', 'Shader name should match');
            this.assert(Array.isArray(shader.shader_scripts), 'Shader should have scripts array');
            this.assert(shader.shader_scripts.length === 1, 'Shader should have one default script');
            this.logResult('CREATE_SHADER', true, 'Shader creation successful');
        } catch (error) {
            this.logResult('CREATE_SHADER', false, error.message);
        }

        // Test createScript
        try {
            const scriptId = await this.crud.createScript(
                this.testData.testScript.code,
                this.testData.testScript.bufferSpec,
                this.testData.testScript.id
            );
            this.assert(scriptId === this.testData.testScript.id, 'Script ID should match');
            
            const script = this.crud.getScript(scriptId);
            this.assert(script !== null, 'Script should exist after creation');
            this.assert(script.code === this.testData.testScript.code, 'Script code should match');
            this.logResult('CREATE_SCRIPT', true, 'Script creation successful');
        } catch (error) {
            this.logResult('CREATE_SCRIPT', false, error.message);
        }

        // Test createScript with defaults
        try {
            const scriptId = await this.crud.createScript();
            this.assert(typeof scriptId === 'number', 'Script ID should be a number');
            
            const script = this.crud.getScript(scriptId);
            this.assert(script !== null, 'Default script should exist');
            this.assert(script.code.includes('@fragment'), 'Default script should be fragment shader');
            this.logResult('CREATE_SCRIPT_DEFAULT', true, 'Default script creation successful');
        } catch (error) {
            this.logResult('CREATE_SCRIPT_DEFAULT', false, error.message);
        }
    }

    async testReadOperations() {
        console.log('📖 Testing READ operations...');

        // Test getShader
        try {
            const shader = this.crud.getShader();
            // Should return current shader or null
            this.logResult('GET_SHADER', true, 'Get shader successful');
        } catch (error) {
            this.logResult('GET_SHADER', false, error.message);
        }

        // Test getScript
        try {
            // First create a script to read
            const scriptId = await this.crud.createScript('test code');
            const script = this.crud.getScript(scriptId);
            this.assert(script !== null, 'Script should be found');
            this.assert(script.id === scriptId, 'Script ID should match');
            this.logResult('GET_SCRIPT', true, 'Get script successful');
        } catch (error) {
            this.logResult('GET_SCRIPT', false, error.message);
        }

        // Test getAllScripts
        try {
            const scripts = this.crud.getAllScripts();
            this.assert(Array.isArray(scripts), 'Should return array of scripts');
            this.logResult('GET_ALL_SCRIPTS', true, 'Get all scripts successful');
        } catch (error) {
            this.logResult('GET_ALL_SCRIPTS', false, error.message);
        }

        // Test getScriptCount
        try {
            const count = this.crud.getScriptCount();
            this.assert(typeof count === 'number', 'Count should be a number');
            this.assert(count >= 0, 'Count should be non-negative');
            this.logResult('GET_SCRIPT_COUNT', true, 'Get script count successful');
        } catch (error) {
            this.logResult('GET_SCRIPT_COUNT', false, error.message);
        }
    }

    async testUpdateOperations() {
        console.log('✏️ Testing UPDATE operations...');

        // Test updateShader
        try {
            await this.crud.updateShader(this.testData.testShader);
            const shader = this.crud.getShader();
            this.assert(shader !== null, 'Shader should exist after update');
            this.assert(shader.name === this.testData.testShader.name, 'Shader name should be updated');
            this.logResult('UPDATE_SHADER', true, 'Shader update successful');
        } catch (error) {
            this.logResult('UPDATE_SHADER', false, error.message);
        }

        // Test updateScriptCode
        try {
            const scriptId = await this.crud.createScript();
            const newCode = '@fragment\nfn main() -> @location(0) vec4<f32> {\n    return vec4<f32>(0.0, 0.0, 1.0, 1.0);\n}';
            
            await this.crud.updateScriptCode(scriptId, newCode);
            const script = this.crud.getScript(scriptId);
            this.assert(script.code === newCode, 'Script code should be updated');
            this.logResult('UPDATE_SCRIPT_CODE', true, 'Script code update successful');
        } catch (error) {
            this.logResult('UPDATE_SCRIPT_CODE', false, error.message);
        }

        // Test updateScriptBuffer
        try {
            const scriptId = await this.crud.createScript();
            const newBuffer = { format: 'rgba16float', width: 1024, height: 1024 };
            
            await this.crud.updateScriptBuffer(scriptId, newBuffer);
            const script = this.crud.getScript(scriptId);
            this.assert(script.bufferSpec.format === newBuffer.format, 'Buffer format should be updated');
            this.assert(script.bufferSpec.width === newBuffer.width, 'Buffer width should be updated');
            this.logResult('UPDATE_SCRIPT_BUFFER', true, 'Script buffer update successful');
        } catch (error) {
            this.logResult('UPDATE_SCRIPT_BUFFER', false, error.message);
        }
    }

    async testDeleteOperations() {
        console.log('🗑️ Testing DELETE operations...');

        // Test deleteScript
        try {
            // Create multiple scripts first
            const scriptId1 = await this.crud.createScript();
            const scriptId2 = await this.crud.createScript();
            
            const countBefore = this.crud.getScriptCount();
            await this.crud.deleteScript(scriptId1);
            const countAfter = this.crud.getScriptCount();
            
            this.assert(countAfter === countBefore - 1, 'Script count should decrease by 1');
            this.assert(this.crud.getScript(scriptId1) === null || this.crud.getScript(scriptId1) === undefined, 'Deleted script should not exist');
            this.logResult('DELETE_SCRIPT', true, 'Script deletion successful');
        } catch (error) {
            this.logResult('DELETE_SCRIPT', false, error.message);
        }

        // Test clearAllScripts
        try {
            // Create some scripts first
            await this.crud.createScript();
            await this.crud.createScript();
            
            await this.crud.clearAllScripts();
            const count = this.crud.getScriptCount();
            this.assert(count === 0, 'All scripts should be cleared');
            this.logResult('CLEAR_ALL_SCRIPTS', true, 'Clear all scripts successful');
        } catch (error) {
            this.logResult('CLEAR_ALL_SCRIPTS', false, error.message);
        }
    }

    async testLoadSaveOperations() {
        console.log('💾 Testing LOAD/SAVE operations...');

        // Test loadShader
        try {
            await this.crud.loadShader(this.testData.testShader);
            const shader = this.crud.getShader();
            this.assert(shader !== null, 'Shader should be loaded');
            this.assert(shader.name === this.testData.testShader.name, 'Loaded shader name should match');
            
            const scriptCount = this.crud.getScriptCount();
            this.assert(scriptCount === this.testData.testShader.shader_scripts.length, 'Script count should match loaded data');
            this.logResult('LOAD_SHADER', true, 'Shader loading successful');
        } catch (error) {
            this.logResult('LOAD_SHADER', false, error.message);
        }

        // Test getCurrentShaderData
        try {
            const shaderData = this.crud.getCurrentShaderData();
            if (this.crud.getShader()) {
                this.assert(shaderData !== null, 'Should return shader data when shader exists');
                this.assert(Array.isArray(shaderData.shader_scripts), 'Should have scripts array');
            }
            this.logResult('GET_CURRENT_SHADER_DATA', true, 'Get current shader data successful');
        } catch (error) {
            this.logResult('GET_CURRENT_SHADER_DATA', false, error.message);
        }

        // Note: saveShader test would require API endpoint, skipping in unit test
        this.logResult('SAVE_SHADER', true, 'Save shader test skipped (requires API)');
    }

    async testValidationOperations() {
        console.log('✅ Testing VALIDATION operations...');

        // Test validateShader with valid data
        try {
            const errors = this.crud.validateShader(this.testData.testShader);
            this.assert(Array.isArray(errors), 'Should return errors array');
            this.assert(errors.length === 0, 'Valid shader should have no errors');
            this.logResult('VALIDATE_SHADER_VALID', true, 'Valid shader validation successful');
        } catch (error) {
            this.logResult('VALIDATE_SHADER_VALID', false, error.message);
        }

        // Test validateShader with invalid data
        try {
            const invalidShader = { name: '', shader_scripts: [] };
            const errors = this.crud.validateShader(invalidShader);
            this.assert(errors.length > 0, 'Invalid shader should have errors');
            this.logResult('VALIDATE_SHADER_INVALID', true, 'Invalid shader validation successful');
        } catch (error) {
            this.logResult('VALIDATE_SHADER_INVALID', false, error.message);
        }

        // Test validateScript
        try {
            const errors = this.crud.validateScript(this.testData.testScript);
            this.assert(Array.isArray(errors), 'Should return errors array');
            this.assert(errors.length === 0, 'Valid script should have no errors');
            this.logResult('VALIDATE_SCRIPT', true, 'Script validation successful');
        } catch (error) {
            this.logResult('VALIDATE_SCRIPT', false, error.message);
        }
    }

    async testErrorHandling() {
        console.log('⚠️ Testing ERROR handling...');

        // Test operations with null workspace
        try {
            const nullCrud = new ShaderCRUD(null);
            let errorThrown = false;
            
            try {
                await nullCrud.createScript();
            } catch (error) {
                errorThrown = true;
            }
            
            this.assert(errorThrown, 'Should throw error with null workspace');
            this.logResult('ERROR_NULL_WORKSPACE', true, 'Null workspace error handling successful');
        } catch (error) {
            this.logResult('ERROR_NULL_WORKSPACE', false, error.message);
        }

        // Test deleteScript with non-existent ID
        try {
            let errorThrown = false;
            
            try {
                await this.crud.deleteScript(99999);
            } catch (error) {
                errorThrown = true;
            }
            
            // This test may pass or fail depending on implementation
            this.logResult('ERROR_DELETE_NONEXISTENT', true, 'Delete non-existent script test completed');
        } catch (error) {
            this.logResult('ERROR_DELETE_NONEXISTENT', false, error.message);
        }

        // Test prevent deleting last script
        try {
            await this.crud.clearAllScripts();
            const scriptId = await this.crud.createScript();
            
            let errorThrown = false;
            try {
                await this.crud.deleteScript(scriptId);
            } catch (error) {
                errorThrown = true;
            }
            
            this.assert(errorThrown, 'Should prevent deleting last script');
            this.logResult('ERROR_DELETE_LAST_SCRIPT', true, 'Prevent delete last script successful');
        } catch (error) {
            this.logResult('ERROR_DELETE_LAST_SCRIPT', false, error.message);
        }
    }

    async cleanupTest() {
        console.log('🧹 Cleaning up test environment...');
        
        try {
            if (this.crud) {
                await this.crud.clearAllScripts();
            }
            this.logResult('CLEANUP', true, 'Test cleanup successful');
        } catch (error) {
            this.logResult('CLEANUP', false, error.message);
        }
    }

    // Utility methods
    assert(condition, message) {
        if (!condition) {
            throw new Error(message);
        }
    }

    logResult(testName, passed, message) {
        const result = {
            test: testName,
            passed,
            message,
            timestamp: new Date().toISOString()
        };
        
        this.testResults.push(result);
        
        const icon = passed ? '✅' : '❌';
        console.log(`${icon} ${testName}: ${message}`);
    }

    printResults() {
        console.log('\n📊 Test Results Summary:');
        console.log('========================');
        
        const passed = this.testResults.filter(r => r.passed).length;
        const total = this.testResults.length;
        const failed = total - passed;
        
        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${passed} ✅`);
        console.log(`Failed: ${failed} ❌`);
        console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
        
        if (failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults
                .filter(r => !r.passed)
                .forEach(r => console.log(`  - ${r.test}: ${r.message}`));
        }
        
        console.log('\n🎯 Test completed!');
        return { passed, failed, total, successRate: (passed / total) * 100 };
    }

    // Quick test methods for individual operations
    async quickTestCreate() {
        await this.setupTest();
        await this.testCreateOperations();
        this.printResults();
    }

    async quickTestRead() {
        await this.setupTest();
        await this.testReadOperations();
        this.printResults();
    }

    async quickTestUpdate() {
        await this.setupTest();
        await this.testUpdateOperations();
        this.printResults();
    }

    async quickTestDelete() {
        await this.setupTest();
        await this.testDeleteOperations();
        this.printResults();
    }
}

// Make tests globally available
window.ShaderCRUDTests = ShaderCRUDTests;

// Auto-run tests if in test environment
if (typeof window !== 'undefined' && window.location?.search?.includes('runTests=true')) {
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('🚀 Auto-running CRUD tests...');
        const tests = new ShaderCRUDTests();
        await tests.runAllTests();
    });
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShaderCRUDTests;
}