/**
 * ShaderPropertiesManager - Manages shader properties editing functionality
 * Follows Single Responsibility Principle by handling only property-related operations
 */
class ShaderPropertiesManager {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId) || document.querySelector('.shader-properties-component');
        this.options = {
            autoSave: options.autoSave || false,
            autoSaveDelay: options.autoSaveDelay || 2000,
            onSave: options.onSave || null,
            onRevert: options.onRevert || null,
            onNameChange: options.onNameChange || null,
            onTagsChange: options.onTagsChange || null,
            onBufferChange: options.onBufferChange || null,
            onScriptAdd: options.onScriptAdd || null,
            onScriptDelete: options.onScriptDelete || null,
            ...options
        };
        
        this.shaderId = this.container?.dataset.shaderId;
        this.originalData = null;
        this.isDirty = false;
        this.autoSaveTimeout = null;
        this.availableTags = [];
        this.activeScriptId = 0;
        this.workspace = null; // Will be set by the workspace
        
        this.init();
    }

    init() {
        if (!this.container) {
            console.error('ShaderPropertiesManager: Container not found');
            return;
        }

        this.bindElements();
        this.loadAvailableTags();
        this.setupEventListeners();
        this.storeOriginalData();
        this.updateStatus('saved');
        this.updateBufferDisplay();
    }

    bindElements() {
        this.nameInput = this.container.querySelector('#shader-name');
        this.tagInput = this.container.querySelector('#tag-input');
        this.addTagBtn = this.container.querySelector('#add-tag-btn');
        this.currentTagsContainer = this.container.querySelector('#current-tags');
        this.tagSuggestions = this.container.querySelector('#tag-suggestions');
        this.saveBtn = this.container.querySelector('#save-properties');
        this.revertBtn = this.container.querySelector('#revert-properties');
        this.statusIndicator = this.container.querySelector('#save-status');
        this.statusText = this.container.querySelector('.status-text');
        this.lastModified = this.container.querySelector('#last-modified');
        this.nameFeedback = this.container.querySelector('#name-feedback');
        
        // Active script configuration elements
        this.activeScriptIdDisplay = this.container.querySelector('#active-script-id');
        this.addScriptBtn = this.container.querySelector('#add-script-btn');
        this.deleteScriptBtn = this.container.querySelector('#delete-script-btn');
        this.activeBufferFormat = this.container.querySelector('#active-buffer-format');
        this.activeBufferWidth = this.container.querySelector('#active-buffer-width');
        this.activeBufferHeight = this.container.querySelector('#active-buffer-height');
        this.bufferSizeDisplay = this.container.querySelector('#buffer-size-display');
        this.bufferMemoryDisplay = this.container.querySelector('#buffer-memory-display');
    }

    setupEventListeners() {
        // Name input
        if (this.nameInput) {
            this.nameInput.addEventListener('input', this.handleNameInput.bind(this));
            this.nameInput.addEventListener('blur', this.validateName.bind(this));
        }

        // Tag input
        if (this.tagInput) {
            this.tagInput.addEventListener('input', this.handleTagInput.bind(this));
            this.tagInput.addEventListener('keydown', this.handleTagKeydown.bind(this));
            this.tagInput.addEventListener('blur', this.hideSuggestions.bind(this));
        }

        // Add tag button
        if (this.addTagBtn) {
            this.addTagBtn.addEventListener('click', this.addCurrentTag.bind(this));
        }

        // Save and revert buttons
        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', this.save.bind(this));
        }
        if (this.revertBtn) {
            this.revertBtn.addEventListener('click', this.revert.bind(this));
        }

        // Script management buttons
        if (this.addScriptBtn) {
            this.addScriptBtn.addEventListener('click', this.addScript.bind(this));
        }
        if (this.deleteScriptBtn) {
            this.deleteScriptBtn.addEventListener('click', this.deleteScript.bind(this));
        }

        // Tag removal (delegated event handling)
        if (this.currentTagsContainer) {
            this.currentTagsContainer.addEventListener('click', this.handleTagRemoval.bind(this));
        }

        // Tag suggestions clicks
        if (this.tagSuggestions) {
            this.tagSuggestions.addEventListener('click', this.handleSuggestionClick.bind(this));
        }

        // Active script buffer configuration
        if (this.activeBufferFormat) {
            this.activeBufferFormat.addEventListener('change', this.handleActiveBufferChange.bind(this));
        }
        if (this.activeBufferWidth) {
            this.activeBufferWidth.addEventListener('input', this.handleActiveBufferChange.bind(this));
            this.activeBufferWidth.addEventListener('blur', this.validateActiveBufferDimensions.bind(this));
        }
        if (this.activeBufferHeight) {
            this.activeBufferHeight.addEventListener('input', this.handleActiveBufferChange.bind(this));
            this.activeBufferHeight.addEventListener('blur', this.validateActiveBufferDimensions.bind(this));
        }
    }

    handleNameInput(event) {
        this.markDirty();
        this.clearNameFeedback();
        
        if (this.options.autoSave) {
            this.scheduleAutoSave();
        }
        
        if (this.options.onNameChange) {
            this.options.onNameChange(event.target.value);
        }
    }

    validateName() {
        const name = this.nameInput.value.trim();
        
        if (!name) {
            this.showNameFeedback('Name is required', 'error');
            return false;
        }
        
        if (name.length < 3) {
            this.showNameFeedback('Name must be at least 3 characters', 'warning');
            return false;
        }
        
        if (name.length > 100) {
            this.showNameFeedback('Name must be less than 100 characters', 'error');
            return false;
        }
        
        this.clearNameFeedback();
        return true;
    }

    handleTagInput(event) {
        const value = event.target.value;
        this.showSuggestions(value);
    }

    handleTagKeydown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.addCurrentTag();
        } else if (event.key === 'Escape') {
            this.hideSuggestions();
        }
    }

    handleBufferChange(event) {
        this.markDirty();
        
        if (this.options.autoSave) {
            this.scheduleAutoSave();
        }
        
        if (this.options.onBufferChange) {
            this.options.onBufferChange(this.getCurrentBufferSpec());
        }
    }

    validateBufferDimensions(event, scriptIndex) {
        const scriptConfig = this.scriptBufferConfigs[scriptIndex];
        const widthInput = scriptConfig.querySelector(`#buffer-width-${scriptIndex}`);
        const heightInput = scriptConfig.querySelector(`#buffer-height-${scriptIndex}`);
        
        const width = parseInt(widthInput?.value) || 0;
        const height = parseInt(heightInput?.value) || 0;
        
        if (width < 1 || width > 4096) {
            this.showNotification(`Script ${scriptIndex} width must be between 1 and 4096`, 'warning');
            if (widthInput) widthInput.value = Math.max(1, Math.min(4096, width));
        }
        
        if (height < 1 || height > 4096) {
            this.showNotification(`Script ${scriptIndex} height must be between 1 and 4096`, 'warning');
            if (heightInput) heightInput.value = Math.max(1, Math.min(4096, height));
        }
        
        return width >= 1 && width <= 4096 && height >= 1 && height <= 4096;
    }

    addCurrentTag() {
        const tagName = this.tagInput.value.trim();
        if (tagName && this.addTag(tagName)) {
            this.tagInput.value = '';
            this.hideSuggestions();
        }
    }

    addTag(tagName) {
        if (!tagName || this.hasTag(tagName)) {
            return false;
        }

        const tagElement = this.createTagElement(tagName);
        this.currentTagsContainer.appendChild(tagElement);
        this.markDirty();
        
        if (this.options.autoSave) {
            this.scheduleAutoSave();
        }
        
        if (this.options.onTagsChange) {
            this.options.onTagsChange(this.getCurrentTags());
        }
        
        return true;
    }

    removeTag(tagName) {
        const tagElement = this.currentTagsContainer.querySelector(`[data-tag-name="${tagName}"]`);
        if (tagElement) {
            tagElement.remove();
            this.markDirty();
            
            if (this.options.autoSave) {
                this.scheduleAutoSave();
            }
            
            if (this.options.onTagsChange) {
                this.options.onTagsChange(this.getCurrentTags());
            }
        }
    }

    createTagElement(tagName) {
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.dataset.tagName = tagName;
        tag.innerHTML = `
            ${tagName}
            <button type="button" class="remove-tag" data-tag="${tagName}">×</button>
        `;
        return tag;
    }

    handleTagRemoval(event) {
        if (event.target.classList.contains('remove-tag')) {
            const tagName = event.target.dataset.tag;
            this.removeTag(tagName);
        }
    }

    handleSuggestionClick(event) {
        if (event.target.classList.contains('tag-suggestion')) {
            const tagName = event.target.textContent;
            this.addTag(tagName);
            this.tagInput.value = '';
            this.hideSuggestions();
        }
    }

    showSuggestions(input) {
        if (!input || input.length < 2) {
            this.hideSuggestions();
            return;
        }

        const suggestions = this.availableTags
            .filter(tag => 
                tag.toLowerCase().includes(input.toLowerCase()) && 
                !this.hasTag(tag)
            )
            .slice(0, 5);

        if (suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }

        this.tagSuggestions.innerHTML = suggestions
            .map(tag => `<div class="tag-suggestion">${tag}</div>`)
            .join('');
        this.tagSuggestions.style.display = 'block';
    }

    hideSuggestions() {
        setTimeout(() => {
            this.tagSuggestions.style.display = 'none';
        }, 150);
    }

    async loadAvailableTags() {
        try {
            const response = await fetch('/api/tags');
            if (response.ok) {
                const tags = await response.json();
                this.availableTags = tags.map(tag => tag.name);
            }
        } catch (error) {
            console.error('Error loading available tags:', error);
        }
    }

    hasTag(tagName) {
        return this.currentTagsContainer.querySelector(`[data-tag-name="${tagName}"]`) !== null;
    }

    getCurrentTags() {
        return Array.from(this.currentTagsContainer.querySelectorAll('.tag'))
            .map(tag => ({ name: tag.dataset.tagName }));
    }

    getCurrentBufferSpec() {
        const bufferSpecs = [];
        
        this.scriptBufferConfigs.forEach((scriptConfig, index) => {
            const formatSelect = scriptConfig.querySelector(`#buffer-format-${index}`);
            const widthInput = scriptConfig.querySelector(`#buffer-width-${index}`);
            const heightInput = scriptConfig.querySelector(`#buffer-height-${index}`);
            
            bufferSpecs.push({
                format: formatSelect?.value || 'rgba8unorm',
                width: parseInt(widthInput?.value) || 512,
                height: parseInt(heightInput?.value) || 512
            });
        });
        
        return bufferSpecs;
    }

    getCurrentData() {
        const shaderScripts = [];
        
        this.scriptBufferConfigs.forEach((scriptConfig, index) => {
            const formatSelect = scriptConfig.querySelector(`#buffer-format-${index}`);
            const widthInput = scriptConfig.querySelector(`#buffer-width-${index}`);
            const heightInput = scriptConfig.querySelector(`#buffer-height-${index}`);
            
            shaderScripts.push({
                id: index,
                code: '', // Code will be handled by the shader editor
                buffer: {
                    format: formatSelect?.value || 'rgba8unorm',
                    width: parseInt(widthInput?.value) || 512,
                    height: parseInt(heightInput?.value) || 512
                }
            });
        });
        
        return {
            name: this.nameInput?.value?.trim() || '',
            tags: this.getCurrentTags(),
            shaderScripts: shaderScripts
        };
    }

    storeOriginalData() {
        this.originalData = this.getCurrentData();
    }

    markDirty() {
        this.isDirty = true;
        this.updateStatus('dirty');
    }

    markClean() {
        this.isDirty = false;
        this.updateStatus('saved');
        this.storeOriginalData();
    }

    updateStatus(status) {
        const statusIcon = this.statusIndicator?.querySelector('i');
        
        switch (status) {
            case 'saved':
                if (statusIcon) statusIcon.className = 'fas fa-circle';
                if (this.statusText) this.statusText.textContent = 'Saved';
                if (this.statusIndicator) this.statusIndicator.className = 'status-indicator saved';
                break;
            case 'dirty':
                if (statusIcon) statusIcon.className = 'fas fa-circle';
                if (this.statusText) this.statusText.textContent = 'Unsaved changes';
                if (this.statusIndicator) this.statusIndicator.className = 'status-indicator dirty';
                break;
            case 'saving':
                if (statusIcon) statusIcon.className = 'fas fa-spinner fa-spin';
                if (this.statusText) this.statusText.textContent = 'Saving...';
                if (this.statusIndicator) this.statusIndicator.className = 'status-indicator saving';
                break;
            case 'error':
                if (statusIcon) statusIcon.className = 'fas fa-exclamation-triangle';
                if (this.statusText) this.statusText.textContent = 'Save failed';
                if (this.statusIndicator) this.statusIndicator.className = 'status-indicator error';
                break;
        }
    }

    scheduleAutoSave() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        
        this.autoSaveTimeout = setTimeout(() => {
            this.save();
        }, this.options.autoSaveDelay);
    }

    async save() {
        if (!this.validateName()) {
            return false;
        }

        const data = this.getCurrentData();
        this.updateStatus('saving');

        try {
            if (this.options.onSave) {
                await this.options.onSave(data);
            } else {
                await this.defaultSave(data);
            }
            
            this.markClean();
            this.updateLastModified();
            return true;
        } catch (error) {
            this.updateStatus('error');
            this.showNotification('Error saving properties: ' + error.message, 'error');
            return false;
        }
    }

    async defaultSave(data) {
        if (!this.shaderId) {
            throw new Error('No shader ID found');
        }

        const response = await fetch(`/api/shaders/${this.shaderId}/properties`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || 'Failed to save properties');
        }
    }

    revert() {
        if (this.originalData) {
            this.nameInput.value = this.originalData.name;
            
            // Clear current tags
            this.currentTagsContainer.innerHTML = '';
            
            // Restore original tags
            this.originalData.tags.forEach(tag => {
                const tagElement = this.createTagElement(tag.name);
                this.currentTagsContainer.appendChild(tagElement);
            });
            
            // Restore buffer configuration for all scripts
            if (this.originalData.shaderScripts) {
                this.scriptBufferConfigs.forEach((scriptConfig, index) => {
                    const originalScript = this.originalData.shaderScripts[index];
                    if (originalScript && originalScript.buffer) {
                        const formatSelect = scriptConfig.querySelector(`#buffer-format-${index}`);
                        const widthInput = scriptConfig.querySelector(`#buffer-width-${index}`);
                        const heightInput = scriptConfig.querySelector(`#buffer-height-${index}`);
                        
                        if (formatSelect) {
                            formatSelect.value = originalScript.buffer.format || 'rgba8unorm';
                        }
                        if (widthInput) {
                            widthInput.value = originalScript.buffer.width || 512;
                        }
                        if (heightInput) {
                            heightInput.value = originalScript.buffer.height || 512;
                        }
                    }
                });
            }
            
            this.markClean();
            this.clearNameFeedback();
            
            if (this.options.onRevert) {
                this.options.onRevert(this.originalData);
            }
        }
    }

    updateLastModified() {
        if (this.lastModified) {
            this.lastModified.textContent = new Date().toLocaleString();
        }
    }

    showNameFeedback(message, type) {
        if (this.nameFeedback) {
            this.nameFeedback.textContent = message;
            this.nameFeedback.className = `input-feedback ${type}`;
            this.nameFeedback.style.display = 'block';
        }
    }

    clearNameFeedback() {
        if (this.nameFeedback) {
            this.nameFeedback.style.display = 'none';
        }
    }

    showNotification(message, type = 'info') {
        // Create or update notification element
        let notification = document.querySelector('.notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.className = 'notification';
            document.body.appendChild(notification);
        }
        
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    // New script management methods
    handleActiveBufferChange(event) {
        this.markDirty();
        this.updateBufferDisplay();
        
        if (this.workspace) {
            const bufferSpec = this.getActiveBufferSpec();
            this.workspace.updateScriptBuffer(this.activeScriptId, bufferSpec);
        }
        
        if (this.options.autoSave) {
            this.scheduleAutoSave();
        }
        
        if (this.options.onBufferChange) {
            this.options.onBufferChange(this.getActiveBufferSpec());
        }
    }

    validateActiveBufferDimensions() {
        const width = parseInt(this.activeBufferWidth?.value) || 0;
        const height = parseInt(this.activeBufferHeight?.value) || 0;
        
        if (width < 1 || width > 4096) {
            this.showNotification('Width must be between 1 and 4096', 'warning');
            if (this.activeBufferWidth) this.activeBufferWidth.value = Math.max(1, Math.min(4096, width));
        }
        
        if (height < 1 || height > 4096) {
            this.showNotification('Height must be between 1 and 4096', 'warning');
            if (this.activeBufferHeight) this.activeBufferHeight.value = Math.max(1, Math.min(4096, height));
        }
        
        this.updateBufferDisplay();
        return width >= 1 && width <= 4096 && height >= 1 && height <= 4096;
    }

    async addScript() {
        try {
            if (this.workspace) {
                const newScriptId = await this.workspace.createNewScript();
                this.setActiveScript(newScriptId);
                this.markDirty();
                
                if (this.options.onScriptAdd) {
                    this.options.onScriptAdd(newScriptId);
                }
                
                this.showNotification(`Script ${newScriptId} created`, 'success');
            } else {
                this.showNotification('Workspace not available', 'error');
            }
        } catch (error) {
            console.error('Error adding script:', error);
            this.showNotification('Failed to add script: ' + error.message, 'error');
        }
    }

    async deleteScript() {
        if (this.workspace && this.workspace.getScriptCount() <= 1) {
            this.showNotification('Cannot delete the last script', 'warning');
            return;
        }

        const confirmed = confirm(`Are you sure you want to delete Script ${this.activeScriptId}?`);
        if (!confirmed) return;

        try {
            if (this.workspace) {
                await this.workspace.deleteScript(this.activeScriptId);
                
                // Switch to the first available script
                const availableScripts = this.workspace.getAvailableScriptIds();
                if (availableScripts.length > 0) {
                    this.setActiveScript(availableScripts[0]);
                }
                
                this.markDirty();
                
                if (this.options.onScriptDelete) {
                    this.options.onScriptDelete(this.activeScriptId);
                }
                
                this.showNotification(`Script ${this.activeScriptId} deleted`, 'success');
            } else {
                this.showNotification('Workspace not available', 'error');
            }
        } catch (error) {
            console.error('Error deleting script:', error);
            this.showNotification('Failed to delete script: ' + error.message, 'error');
        }
    }

    setActiveScript(scriptId) {
        this.activeScriptId = scriptId;
        
        // Update UI
        if (this.activeScriptIdDisplay) {
            this.activeScriptIdDisplay.textContent = scriptId;
        }
        
        // Load script's buffer configuration
        if (this.workspace) {
            const script = this.workspace.getScript(scriptId);
            if (script && script.bufferSpec) {
                this.loadActiveBufferConfig(script.bufferSpec);
            }
        }
        
        this.updateDeleteButtonState();
    }

    updateDeleteButtonState() {
        if (this.deleteScriptBtn && this.workspace) {
            const scriptCount = this.workspace.getScriptCount();
            this.deleteScriptBtn.disabled = scriptCount <= 1;
            this.deleteScriptBtn.title = scriptCount <= 1 ? 
                'Cannot delete the last script' : 
                'Delete current script';
        }
    }

    loadActiveBufferConfig(bufferSpec) {
        if (this.activeBufferFormat) {
            this.activeBufferFormat.value = bufferSpec.format || 'rgba8unorm';
        }
        if (this.activeBufferWidth) {
            this.activeBufferWidth.value = bufferSpec.width || 512;
        }
        if (this.activeBufferHeight) {
            this.activeBufferHeight.value = bufferSpec.height || 512;
        }
        
        this.updateBufferDisplay();
    }

    getActiveBufferSpec() {
        return {
            format: this.activeBufferFormat?.value || 'rgba8unorm',
            width: parseInt(this.activeBufferWidth?.value) || 512,
            height: parseInt(this.activeBufferHeight?.value) || 512
        };
    }

    updateBufferDisplay() {
        const spec = this.getActiveBufferSpec();
        
        if (this.bufferSizeDisplay) {
            this.bufferSizeDisplay.textContent = `${spec.width}×${spec.height}`;
        }
        
        if (this.bufferMemoryDisplay) {
            const bytesPerPixel = this.getBytesPerPixelForFormat(spec.format);
            const totalBytes = spec.width * spec.height * bytesPerPixel;
            const mb = (totalBytes / (1024 * 1024)).toFixed(1);
            this.bufferMemoryDisplay.textContent = `${mb} MB`;
        }
    }

    getBytesPerPixelForFormat(format) {
        const formatMap = {
            'rgba8unorm': 4,
            'rgba16float': 8,
            'rgba32float': 16,
            'r32float': 4,
            'rg32float': 8
        };
        return formatMap[format] || 4;
    }

    // Integration with workspace
    setWorkspace(workspace) {
        this.workspace = workspace;
        
        // Listen for workspace events
        if (workspace) {
            workspace.addEventListener('scriptCreated', (event) => {
                this.updateDeleteButtonState();
            });
            
            workspace.addEventListener('scriptDeleted', (event) => {
                this.updateDeleteButtonState();
            });
            
            workspace.addEventListener('activeScriptChanged', (event) => {
                this.setActiveScript(event.detail.scriptId);
            });
        }
    }

    // Public API methods
    getName() {
        return this.nameInput?.value?.trim() || '';
    }

    setName(name) {
        if (this.nameInput) {
            this.nameInput.value = name;
            this.markDirty();
        }
    }

    getTags() {
        return this.getCurrentTags();
    }

    setTags(tags) {
        this.currentTagsContainer.innerHTML = '';
        tags.forEach(tag => {
            const tagElement = this.createTagElement(typeof tag === 'string' ? tag : tag.name);
            this.currentTagsContainer.appendChild(tagElement);
        });
        this.markDirty();
    }

    isDirtyState() {
        return this.isDirty;
    }

    destroy() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
    }
}

// Initialize ShaderPropertiesManager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const shaderPropertiesContainer = document.querySelector('.shader-properties-component');
    if (shaderPropertiesContainer) {
        window.shaderPropertiesManager = new ShaderPropertiesManager();
    }
});

// Also initialize if script is loaded after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        const shaderPropertiesContainer = document.querySelector('.shader-properties-component');
        if (shaderPropertiesContainer) {
            window.shaderPropertiesManager = new ShaderPropertiesManager();
        }
    });
} else {
    // DOM is already loaded
    const shaderPropertiesContainer = document.querySelector('.shader-properties-component');
    if (shaderPropertiesContainer) {
        window.shaderPropertiesManager = new ShaderPropertiesManager();
    }
}

// Export for module usage or make globally available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShaderPropertiesManager;
} else {
    window.ShaderPropertiesManager = ShaderPropertiesManager;
}