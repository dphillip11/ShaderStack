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
            ...options
        };
        
        this.shaderId = this.container?.dataset.shaderId;
        this.originalData = null;
        this.isDirty = false;
        this.autoSaveTimeout = null;
        this.availableTags = [];
        
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

        // Tag removal (delegated event handling)
        if (this.currentTagsContainer) {
            this.currentTagsContainer.addEventListener('click', this.handleTagRemoval.bind(this));
        }

        // Tag suggestions clicks
        if (this.tagSuggestions) {
            this.tagSuggestions.addEventListener('click', this.handleSuggestionClick.bind(this));
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

    getCurrentData() {
        return {
            name: this.nameInput?.value?.trim() || '',
            tags: this.getCurrentTags()
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