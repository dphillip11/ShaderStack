// Global initialization
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    setupLoginModal(); // This function is now imported from login.js
});

// Page-specific initialization
function initializePage() {
    const path = window.location.pathname;
    
    if (path === '/' || path === '/my') {
        initializeBrowsePage();
    } else 
    {
        initializeEditorPage();
    }
}

// Browse page functionality
function initializeBrowsePage() {
    setupSearchComponent(); // This function is now imported from search.js
    setupShaderActions();
}

// Editor page functionality  
function initializeEditorPage() {
    setupCodeEditor();
    setupShaderProperties();
    setupShaderActions();
}

// Shader actions (delete functionality)
function setupShaderActions() {
    console.log('Setting up shader actions...');
    
    document.querySelectorAll('.delete-shader').forEach(btn => {
        btn.addEventListener('click', function() {
            const shaderId = this.dataset.shaderId;
            if (confirm('Are you sure you want to delete this shader?')) {
                deleteShader(shaderId);
            }
        });
    });

    const saveBtn = document.getElementById('save-shader');
    const createBtn = document.getElementById('create-shader');
    
    console.log('Save button found:', saveBtn);
    console.log('Create button found:', createBtn);
    
    if (saveBtn) {
        saveBtn.addEventListener('click', saveShader);
        console.log('Save button event listener attached');
    }
    
    if (createBtn) {
        createBtn.addEventListener('click', function(e) {
            console.log('Create button clicked!');
            createShader();
        });
        console.log('Create button event listener attached');
    } else {
        console.error('Create button with ID "create-shader" not found in DOM');
    }
}

// Delete shader function
async function deleteShader(shaderId) {
    try {
        const response = await fetch(`/api/shaders/${shaderId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.ok) {
            showNotification('Shader deleted successfully', 'success');
            // Remove the shader card from the DOM
            const shaderCard = document.querySelector(`[data-shader-id="${shaderId}"]`);
            if (shaderCard) {
                shaderCard.remove();
            }
        } else {
            throw new Error('Failed to delete shader');
        }
    } catch (error) {
        showNotification('Error deleting shader: ' + error.message, 'error');
    }
}

// Create new shader
async function createShader() {
    try {
        const shaderData = collectShaderData();
        
        const response = await fetch('/api/shaders/new', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(shaderData)
        });

        if (response.ok) {
            const result = await response.json();
            showNotification('Shader created successfully!', 'success');
            // Redirect to the new shader's editor page
            window.location.href = `/${result.id}`;
        } else {
            const error = await response.text();
            throw new Error(error || 'Failed to create shader');
        }
    } catch (error) {
        showNotification('Error creating shader: ' + error.message, 'error');
    }
}

// Save existing shader
async function saveShader() {
    try {
        const shaderData = collectShaderData();
        const shaderId = window.shaderData?.id;
        
        if (!shaderId) {
            throw new Error('No shader ID found');
        }
        
        const response = await fetch(`/api/shaders/${shaderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(shaderData)
        });

        if (response.ok) {
            showNotification('Shader saved successfully!', 'success');
        } else {
            const error = await response.text();
            throw new Error(error || 'Failed to save shader');
        }
    } catch (error) {
        showNotification('Error saving shader: ' + error.message, 'error');
    }
}

// Collect shader data from the editor
function collectShaderData() {
    const nameInput = document.getElementById('shader-name');
    const tagElements = document.querySelectorAll('#current-tags .tag');
    const codeEditors = document.querySelectorAll('.code-editor');
    
    const scripts = Array.from(codeEditors).map((editor, index) => ({
        id: editor.dataset.scriptId ? parseInt(editor.dataset.scriptId) : index + 1,
        code: editor.value || editor.textContent
    }));
    
    const tags = Array.from(tagElements).map(tag => ({
        name: tag.textContent.replace('×', '').trim()
    }));
    
    return {
        name: nameInput ? nameInput.value : 'New Shader',
        shaderScripts: scripts,
        tags: tags
    };
}

// Code editor functionality
function setupCodeEditor() {
    const tabs = document.querySelectorAll('.tab-btn');
    const editors = document.querySelectorAll('.code-editor');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and editors
            tabs.forEach(t => t.classList.remove('active'));
            editors.forEach(e => e.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Show corresponding editor
            const targetEditor = document.getElementById(tab.dataset.target);
            if (targetEditor) {
                targetEditor.classList.add('active');
            }
        });
    });
}

// Shader properties functionality
function setupShaderProperties() {
    const tagInput = document.getElementById('tag-input');
    const currentTags = document.getElementById('current-tags');
    
    if (tagInput) {
        tagInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addTag(this.value.trim());
                this.value = '';
            }
        });
    }
}

// Tag management
function addTag(tagName) {
    if (!tagName) return;
    
    const currentTags = document.getElementById('current-tags');
    if (!currentTags) return;
    
    // Check if tag already exists
    const existingTags = Array.from(currentTags.children).map(tag => tag.textContent.replace('×', '').trim());
    if (existingTags.includes(tagName)) return;
    
    const tagElement = document.createElement('span');
    tagElement.className = 'tag removable';
    tagElement.innerHTML = `${tagName} <span onclick="removeTag(this)" style="cursor: pointer;">×</span>`;
    currentTags.appendChild(tagElement);
}

function removeTag(element) {
    element.parentElement.remove();
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button class="notification-close">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
    
    // Close button functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    });
}