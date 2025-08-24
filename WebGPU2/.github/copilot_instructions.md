# WebGPU Shader Editor Frontend Architecture

## Overview
A WebGPU shader editor that allows users to write shaders with configurable buffer outputs and visualize/sample those buffers across scripts with clean separation of concerns.

## Backend Integration Notes

### Data Models
All data models are defined in `/Users/daniel/Repositories/WebGPU/WebGPU2/internal/models/types.go`:
- `User` - User authentication and identification
- `Tag` - Shader categorization tags
- `BufferSpec` - Buffer configuration (format, width, height) per script
- `ShaderScript` - Individual shader code with buffer specification
- `Shader` - Complete shader with multiple scripts, tags, and metadata
- `SearchParams` - Parameters for shader searching and filtering

### API Endpoints
Backend API handlers are in `/Users/daniel/Repositories/WebGPU/WebGPU2/internal/handlers/api.go`:
- `GET /api/shaders` - Get all shaders with optional search parameters
- `GET /api/shaders/{id}` - Get specific shader by ID
- `POST /api/shaders` - Create new shader (requires authentication)
- `PUT /api/shaders/{id}` - Update existing shader (requires authentication)
- `DELETE /api/shaders/{id}` - Delete shader (requires authentication)
- `GET /api/tags` - Get all available tags
- `POST /api/login` - User authentication
- `POST /api/logout` - User logout

### Authentication
- Session-based authentication using HTTP cookies
- `X-User-ID` and `X-Username` headers added by auth middleware
- Login required for create/update/delete operations

### Data Structure Example
```javascript
// Complete shader object structure
{
  "id": 1,
  "user_id": 1,
  "name": "My Shader",
  "author": "username",
  "shader_scripts": [
    {
      "id": 1,
      "code": "// WGSL shader code here",
      "buffer": {
        "format": "rgba8unorm",
        "width": 512,
        "height": 512
      }
    }
  ],
  "tags": [
    { "id": 1, "name": "fragment" },
    { "id": 2, "name": "animation" }
  ]
}
```

## Core Architecture Principles
- **Single Responsibility**: Each module handles one specific concern
- **Dependency Injection**: Pass dependencies explicitly to avoid tight coupling
- **Event-Driven**: Use events for loose coupling between components
- **Immutable State**: Avoid direct state mutation where possible
- **Small Functions**: Keep functions focused and under 20 lines
- **Top-Level API**: Simple interface for page logic to interact with the system

## Module Structure

### 1. WebGPU Core Module (`webgpu-core.js`)
**Responsibility**: Low-level WebGPU device and resource management

```javascript
class WebGPUCore {
  // Device initialization and capability detection
  async initDevice(options = {})
  getDevice()
  getCapabilities()
  
  // Resource creation utilities
  createBuffer(descriptor)
  createTexture(descriptor) 
  createBindGroup(descriptor)
  createRenderPipeline(descriptor)
  createComputePipeline(descriptor)
  
  // Command submission
  submitCommands(commands)
}
```

### 2. Shader Compiler Module (`shader-compiler.js`)
**Responsibility**: WGSL compilation and validation

```javascript
class ShaderCompiler {
  // Compilation and validation
  async compileShader(source, type)
  validateSyntax(source)
  getCompileErrors()
  
  // Preprocessing
  injectBufferBindings(source, bufferSpecs)
  resolveIncludes(source, dependencies)
}
```

### 3. Buffer Manager Module (`buffer-manager.js`)
**Responsibility**: Buffer lifecycle and inter-script sharing

```javascript
class BufferManager {
  // Buffer creation based on script specs
  createScriptBuffer(scriptId, bufferSpec)
  updateBufferSpec(scriptId, newSpec)
  destroyScriptBuffer(scriptId)
  
  // Inter-script buffer access
  getBufferReference(scriptId)
  createBufferBinding(sourceScript, targetScript)
  
  // Buffer operations
  readBuffer(scriptId, callback)
  copyBuffer(sourceId, targetId)
  clearBuffer(scriptId)
}
```

### 4. Script Execution Engine (`script-engine.js`)
**Responsibility**: Shader execution and render/compute dispatch

```javascript
class ScriptEngine {
  // Script lifecycle
  createScript(config)
  updateScript(scriptId, newConfig)
  destroyScript(scriptId)
  
  // Execution control
  executeScript(scriptId, inputs = {})
  executeAllScripts()
  setExecutionOrder(scriptIds)
  
  // Real-time execution
  startRealTimeExecution(scriptId)
  stopRealTimeExecution(scriptId)
  setFrameRate(fps)
}
```

### 5. Visualization Engine (`visualization-engine.js`)
**Responsibility**: Rendering buffers to canvas/UI elements

```javascript
class VisualizationEngine {
  // Visualization modes
  renderBufferAsTexture(bufferId, canvas, options)
  renderBufferAsGraph(bufferId, canvas, options)
  renderBufferAsHeatmap(bufferId, canvas, options)
  
  // Sampling and inspection
  sampleBuffer(bufferId, coordinates)
  getBufferStatistics(bufferId)
  createBufferInspector(bufferId, container)
  
  // Export utilities
  exportBufferAsImage(bufferId, format)
  exportBufferAsData(bufferId, format)
}
```

### 6. Code Editor Integration (`editor-integration.js`)
**Responsibility**: Monaco/CodeMirror integration with WebGPU features

```javascript
class EditorIntegration {
  // Editor setup
  initializeEditor(container, options)
  setLanguageSupport(language)
  configureTheme(theme)
  
  // WebGPU-specific features
  addBufferAutocompletion(availableBuffers)
  addSyntaxValidation(validator)
  addErrorHighlighting(errors)
  
  // Code analysis
  findBufferReferences(code)
  suggestOptimizations(code)
  formatCode(code)
}
```

### 7. State Management (`state-manager.js`)
**Responsibility**: Application state and change tracking

```javascript
class StateManager {
  // State operations
  getState()
  setState(newState)
  patchState(changes)
  
  // Change tracking
  subscribe(path, callback)
  unsubscribe(path, callback)
  getHistory()
  
  // Persistence
  saveState()
  loadState()
  resetToDefault()
}
```

### 8. Top-Level API (`shader-workspace.js`)
**Responsibility**: Main interface for page logic

```javascript
class ShaderWorkspace {
  constructor(container, options = {})
  
  // High-level operations
  async createNewShader(name, type)
  async loadShader(shaderId)
  async saveShader()
  
  // Script management
  addScript(type, bufferSpec)
  removeScript(scriptId)
  updateScriptCode(scriptId, code)
  updateScriptBuffer(scriptId, bufferSpec)
  
  // Execution control
  runScript(scriptId)
  runAllScripts()
  stopExecution()
  
  // Visualization
  showBufferVisualization(scriptId, mode)
  hideBufferVisualization(scriptId)
  exportBuffer(scriptId, format)
  
  // Events
  on(event, callback)
  off(event, callback)
}
```

## Data Flow Architecture

### Script Configuration Flow
1. User edits script properties → State Manager
2. State Manager validates changes → Buffer Manager  
3. Buffer Manager updates WebGPU resources → Script Engine
4. Script Engine recompiles if needed → Visualization Engine

### Execution Flow
1. Script Engine dispatches compute/render → WebGPU Core
2. WebGPU Core executes on GPU → Buffer Manager
3. Buffer Manager notifies completion → Visualization Engine
4. Visualization Engine updates displays → UI Components

### Inter-Script Communication
1. Script A writes to buffer → Buffer Manager
2. Buffer Manager makes buffer available → Script B
3. Script B reads buffer as input → Script Engine
4. Changes propagate through dependency graph → All dependent scripts

## Error Handling Strategy

### Compilation Errors
- Catch WGSL compilation errors
- Provide line-by-line error mapping
- Suggest fixes for common issues
- Graceful fallback to previous working version

### Runtime Errors
- WebGPU device lost handling
- Buffer allocation failures
- Shader execution timeouts
- Automatic error reporting to console module

### User Experience
- Non-blocking error notifications
- Detailed error information in console
- Ability to continue working with other scripts
- Auto-save before risky operations

## Performance Considerations

### Memory Management
- Automatic buffer cleanup when scripts are destroyed
- LRU cache for compiled shaders
- Efficient buffer reuse for same dimensions/formats
- Memory usage monitoring and warnings

### Execution Optimization
- Dependency graph analysis to minimize redundant executions
- Batch buffer operations where possible
- Async execution with progress feedback
- Configurable execution limits (time, memory)

### UI Responsiveness
- Worker threads for heavy compilation tasks
- Incremental visualization updates
- Debounced user input handling
- Lazy loading of visualization components

## Testing Strategy

### Unit Tests
- Each module tested in isolation
- Mock WebGPU device for testing
- Buffer operation verification
- State management consistency

### Integration Tests
- End-to-end shader compilation and execution
- Multi-script buffer sharing scenarios
- Error handling across module boundaries
- Performance benchmarks

### User Acceptance Tests
- Common shader development workflows
- Visualization accuracy verification
- Cross-browser compatibility
- Accessibility compliance

## Implementation Guidelines

### Code Style
- Use ES6+ features consistently
- Prefer async/await over promises
- Use TypeScript interfaces for complex objects
- Follow naming conventions: camelCase for functions, PascalCase for classes

### Error Messages
- Provide actionable error messages
- Include context about what the user was trying to do
- Suggest specific fixes when possible
- Link to documentation for complex issues

### Documentation
- JSDoc comments for all public methods
- Usage examples for complex APIs
- Architecture decision records for major choices
- User guides for common workflows