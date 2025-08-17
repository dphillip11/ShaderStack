# Frontend MVC Refactoring Guidelines - Copilot Instructions

## Project Overview
This WebGPU shader application needs to be refactored from a monolithic frontend structure into a clean MVC-style component architecture. The goal is to improve maintainability, testability, and reusability without adding new features.

## Current Architecture Issues
- Monolithic `app.js` with mixed responsibilities
- HTML templates tightly coupled with JavaScript
- Direct DOM manipulation scattered throughout code
- No separation between data access, business logic, and presentation
- Global variables and functions creating namespace pollution

## Target Architecture: MVC Components

### Directory Structure
```
static/js/
├── services/          # API layer (Model)
│   ├── api.js        # Base API utilities
│   ├── ShaderAPI.js  # Shader-specific API calls
│   ├── TagAPI.js     # Tag-specific API calls
│   └── UserAPI.js    # User/auth API calls
├── models/           # Data models
│   ├── Shader.js     # Shader data model
│   ├── User.js       # User data model
│   └── Tag.js        # Tag data model
├── components/       # View Components
│   ├── BaseComponent.js
│   ├── NotificationComponent.js
│   ├── BrowsePageComponent.js
│   ├── SearchComponent.js
│   ├── EditorPageComponent.js
│   ├── CodeEditorComponent.js
│   ├── ShaderPropertiesComponent.js
│   ├── PreviewComponent.js
│   └── LoginComponent.js
├── controllers/      # Controllers
│   ├── AppController.js
│   └── Router.js
└── utils/           # Utilities
    ├── dom.js       # DOM manipulation helpers
    └── validation.js # Form validation utilities

templates/components/ # Component HTML templates
├── search-component.html
├── browse-page.html
├── editor-page.html
├── code-editor.html
├── shader-properties.html
├── preview-panel.html
└── login-modal.html
```

## Phase 1: API Service Layer (Model)

### Create Base API Service
**File**: `static/js/services/api.js`

```javascript
class APIService {
    constructor(baseURL = '/api') {
        this.baseURL = baseURL;
    }

    async request(endpoint, options = {}) {
        // Handle authentication, error responses, loading states
        // Return consistent data structures
        // Log API calls for debugging
    }

    async get(endpoint, params = {}) { }
    async post(endpoint, data) { }
    async put(endpoint, data) { }
    async delete(endpoint) { }
}
```

**Guidelines**:
- All fetch operations must go through API services
- Handle authentication automatically
- Standardize error responses
- Include loading states
- Add request/response logging
- Use consistent naming conventions

### Create Specialized API Services
**Files**: `ShaderAPI.js`, `TagAPI.js`, `UserAPI.js`

```javascript
class ShaderAPI extends APIService {
    async getShaders(params = {}) { }
    async getShader(id) { }
    async createShader(shaderData) { }
    async updateShader(id, shaderData) { }
    async deleteShader(id) { }
    async updateShaderProperties(id, properties) { }
}
```

**Guidelines**:
- One API class per domain entity
- Methods should match backend endpoints
- Include parameter validation
- Handle specific error cases
- Return domain-specific data models

## Phase 2: Data Models

### Create Data Models
**Files**: `models/Shader.js`, `models/User.js`, `models/Tag.js`

```javascript
class Shader {
    constructor(data = {}) {
        this.id = data.id || null;
        this.name = data.name || '';
        this.shaderScripts = data.shaderScripts || [];
        this.tags = data.tags || [];
        this.userId = data.userId || null;
        this.createdAt = data.createdAt || null;
    }

    validate() { }
    toJSON() { }
    static fromJSON(json) { }
}
```

**Guidelines**:
- Include data validation
- Provide serialization methods
- Add business logic methods
- Use immutable patterns where possible
- Include type checking

## Phase 3: Component Architecture (View)

### Base Component Class
**File**: `components/BaseComponent.js`

```javascript
class BaseComponent {
    constructor(container, options = {}) {
        this.container = container;
        this.options = options;
        this.state = {};
        this.eventListeners = [];
    }

    init() { }
    render() { }
    destroy() { }
    setState(newState) { }
    addEventListener(element, event, handler) { }
    removeAllEventListeners() { }
}
```

**Guidelines**:
- All components extend BaseComponent
- Use consistent lifecycle methods
- Manage event listeners properly
- Implement state management
- Provide cleanup methods

### Component Development Rules

#### 1. Single Responsibility Principle
Each component should handle ONE specific concern:
- `SearchComponent`: Only search functionality
- `CodeEditorComponent`: Only code editing
- `NotificationComponent`: Only notifications

#### 2. Component Communication
```javascript
// Good: Event-driven communication
this.emit('shader-saved', { shader: shaderData });

// Bad: Direct method calls between components
otherComponent.updateData(data);
```

#### 3. State Management
```javascript
// Good: Centralized state
class EditorPageComponent extends BaseComponent {
    constructor(container, options) {
        super(container, options);
        this.state = {
            currentShader: null,
            isDirty: false,
            activeTab: 0
        };
    }
}

// Bad: Global variables
window.currentShader = shader;
```

#### 4. Template Integration
```javascript
// Good: Use data attributes for component initialization
<div class="shader-editor" data-component="editor" data-shader-id="123">

// JavaScript
document.querySelectorAll('[data-component="editor"]').forEach(el => {
    new EditorComponent(el, { shaderId: el.dataset.shaderId });
});
```

### Specific Component Guidelines

#### SearchComponent
- Make it reusable across browse and my-shaders pages
- Support different search configurations
- Emit events for search state changes
- Handle URL parameter synchronization

#### EditorPageComponent
- Coordinate between sub-components (code editor, properties, preview)
- Manage overall editor state
- Handle save/create operations
- Warn about unsaved changes

#### CodeEditorComponent
- Manage multiple shader script tabs
- Handle syntax highlighting
- Provide auto-save functionality
- Emit code change events

#### ShaderPropertiesComponent
- Enhance existing component with better architecture
- Make it more reusable
- Improve state management
- Add better validation

## Phase 4: Controllers

### Application Controller
**File**: `controllers/AppController.js`

```javascript
class AppController {
    constructor() {
        this.router = new Router();
        this.components = new Map();
        this.services = {
            shader: new ShaderAPI(),
            tag: new TagAPI(),
            user: new UserAPI()
        };
    }

    init() {
        this.setupRoutes();
        this.initializeGlobalComponents();
        this.router.start();
    }
}
```

**Guidelines**:
- Centralize application initialization
- Manage component lifecycle
- Handle global state
- Coordinate between services and components

### Router
**File**: `controllers/Router.js`

```javascript
class Router {
    constructor() {
        this.routes = new Map();
    }

    addRoute(pattern, handler) { }
    navigate(path) { }
    start() { }
}
```

## Phase 5: Implementation Strategy

### Step-by-Step Refactoring Order

1. **Start with API Services**
   - Extract all fetch calls from `app.js`
   - Create `APIService` base class
   - Create specialized services
   - Test API integration

2. **Create Data Models**
   - Extract data structures
   - Add validation logic
   - Test model functionality

3. **Extract Notification System**
   - Move from `app.js` to `NotificationComponent`
   - Make it globally accessible
   - Test notification display

4. **Refactor Authentication**
   - Move login.js to `LoginComponent`
   - Integrate with API services
   - Test login/logout flow

5. **Extract Search Functionality**
   - Enhance existing `search.js`
   - Make it more reusable
   - Test search functionality

6. **Create Page Components**
   - Extract browse page logic
   - Extract editor page logic
   - Test page functionality

7. **Create Editor Sub-components**
   - Code editor component
   - Properties component (enhance existing)
   - Preview component
   - Test editor functionality

8. **Create Application Controller**
   - Replace main `app.js` logic
   - Implement routing
   - Test overall application

### Migration Guidelines

#### Before Starting Any Component
```javascript
// 1. Identify current functionality
// 2. List all dependencies
// 3. Plan component interface
// 4. Write component tests
// 5. Implement component
// 6. Replace old code
// 7. Test integration
```

#### Code Quality Standards
```javascript
// Good: Descriptive names
class ShaderCodeEditorComponent extends BaseComponent {
    handleTabSwitch(activeTabIndex) { }
}

// Bad: Generic names
class Editor {
    switch(index) { }
}
```

#### Error Handling
```javascript
// Good: Specific error handling
try {
    const shader = await this.shaderAPI.getShader(id);
    this.setState({ shader });
} catch (error) {
    if (error.status === 404) {
        this.showError('Shader not found');
    } else {
        this.showError('Failed to load shader');
    }
}

// Bad: Generic error handling
try {
    // operation
} catch (error) {
    console.log(error);
}
```

#### Event Naming Convention
```javascript
// Good: Descriptive event names
this.emit('shader:saved', { id, name });
this.emit('editor:code-changed', { tabIndex, code });
this.emit('search:filters-applied', { query, tags });

// Bad: Generic event names
this.emit('save', data);
this.emit('change', value);
```

## Phase 6: Testing Strategy

### Component Testing
```javascript
// Each component should have tests
describe('SearchComponent', () => {
    let component;
    
    beforeEach(() => {
        const container = document.createElement('div');
        component = new SearchComponent(container);
    });
    
    afterEach(() => {
        component.destroy();
    });
    
    it('should emit search event when form is submitted', () => {
        // Test implementation
    });
});
```

### Integration Testing
- Test component communication
- Test API service integration
- Test state management

## Phase 7: Documentation Requirements

### Component Documentation
Each component must include:
```javascript
/**
 * SearchComponent - Handles shader search functionality
 * 
 * @class SearchComponent
 * @extends BaseComponent
 * 
 * Events Emitted:
 * - search:query-changed - When search query changes
 * - search:filters-applied - When filters are applied
 * 
 * Required DOM Structure:
 * <div class="search-component">
 *   <form class="search-form">
 *     <input class="search-input" />
 *   </form>
 * </div>
 */
```

### API Documentation
```javascript
/**
 * Get shaders with optional filtering
 * @param {Object} params - Query parameters
 * @param {string} params.name - Name filter
 * @param {string[]} params.tags - Tag filters
 * @param {number} params.page - Page number
 * @returns {Promise<{shaders: Shader[], total: number}>}
 */
async getShaders(params = {}) { }
```

## Implementation Notes

### Priority Rules
1. **No new features** - Only refactoring existing functionality
2. **Preserve all current behavior** - Users should notice no difference
3. **Improve code organization** - Make it easier to maintain and extend
4. **Add proper error handling** - Better user experience
5. **Make components reusable** - Prepare for future features

### Performance Considerations
- Lazy load components when possible
- Use event delegation for dynamic content
- Minimize DOM queries
- Cache API responses appropriately
- Implement proper cleanup to prevent memory leaks

### Browser Compatibility
- Support modern browsers (ES6+)
- Use standard Web APIs
- Avoid experimental features
- Test in multiple browsers

This refactoring will result in a much more maintainable, testable, and scalable frontend architecture while preserving all existing functionality.