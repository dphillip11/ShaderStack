import type { ShaderPass, CompilationError, PassType } from '../../types';

export class Controls {
  private container: HTMLElement;
  private passes: ShaderPass[] = [];
  private activePassId: string | null = null;
  private onPassSelectCallback?: (passId: string) => void;
  private onPassAddCallback?: (type: PassType) => void;
  private onPassRemoveCallback?: (passId: string) => void;
  private onPassToggleCallback?: (passId: string, enabled: boolean) => void;
  private onChannelUpdateCallback?: (passId: string, channelIndex: number, source: string) => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.setupUI();
  }

  private setupUI() {
    this.container.innerHTML = `
      <div class="controls">
        <div class="controls-header">
          <h3>Shader Passes</h3>
          <div class="pass-controls">
            <button id="add-buffer" class="btn btn-primary btn-sm">+ Buffer</button>
          </div>
        </div>
        
        <div class="pass-tabs">
          <div id="pass-tabs-list" class="tabs-list"></div>
        </div>
        
        <div id="active-pass-info" class="active-pass-info">
          <div class="pass-channels">
            <h4>Input Channels</h4>
            <div id="channels-list" class="channels-list">
              <div class="channel-item">
                <label>iChannel0: <select class="channel-select" data-channel="0">
                  <option value="">None</option>
                </select></label>
              </div>
              <div class="channel-item">
                <label>iChannel1: <select class="channel-select" data-channel="1">
                  <option value="">None</option>
                </select></label>
              </div>
              <div class="channel-item">
                <label>iChannel2: <select class="channel-select" data-channel="2">
                  <option value="">None</option>
                </select></label>
              </div>
              <div class="channel-item">
                <label>iChannel3: <select class="channel-select" data-channel="3">
                  <option value="">None</option>
                </select></label>
              </div>
            </div>
          </div>
        </div>
        
        <div class="controls-section">
          <h4>Available Buffers</h4>
          <div id="buffer-preview" class="buffer-preview">
            <div class="no-buffers">No buffer passes created</div>
          </div>
        </div>
        
        <div class="controls-section">
          <h4>Compilation Errors</h4>
          <div id="error-list" class="error-list"></div>
        </div>
        
        <div class="controls-section">
          <h4>Render Settings</h4>
          <label>
            <input type="checkbox" id="auto-compile" checked> Auto-compile
          </label>
          <label>
            Resolution: 
            <select id="resolution">
              <option value="512x512">512x512</option>
              <option value="1024x1024" selected>1024x1024</option>
              <option value="1920x1080">1920x1080</option>
            </select>
          </label>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents() {
    // Add buffer button
    const addBufferBtn = this.container.querySelector('#add-buffer') as HTMLButtonElement;
    addBufferBtn?.addEventListener('click', () => {
      this.onPassAddCallback?.('buffer');
    });

    // Channel selects
    const channelSelects = this.container.querySelectorAll('.channel-select') as NodeListOf<HTMLSelectElement>;
    channelSelects.forEach(select => {
      select.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        const channelIndex = parseInt(target.dataset.channel || '0');
        const source = target.value;
        
        if (this.activePassId) {
          this.onChannelUpdateCallback?.(this.activePassId, channelIndex, source);
        }
      });
    });

    // Auto-compile checkbox
    const autoCompileCheckbox = this.container.querySelector('#auto-compile') as HTMLInputElement;
    autoCompileCheckbox?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      console.log('Auto-compile:', target.checked);
    });
  }

  addPass(pass: ShaderPass) {
    // Ensure Image pass is always first
    if (pass.type === 'image') {
      // Remove existing image pass if any
      const existingImageIndex = this.passes.findIndex(p => p.type === 'image');
      if (existingImageIndex !== -1) {
        this.passes.splice(existingImageIndex, 1);
      }
      this.passes.unshift(pass);
    } else {
      this.passes.push(pass);
    }
    
    this.updatePassTabs();
    this.updateChannelOptions();
    this.updateBufferPreview();
    
    // Auto-select the new pass
    this.selectPass(pass.id);
  }

  removePass(passId: string) {
    const index = this.passes.findIndex(p => p.id === passId);
    if (index !== -1) {
      const pass = this.passes[index];
      
      // Don't allow removing the Image pass
      if (pass.type === 'image') {
        console.warn('Cannot remove Image pass');
        return;
      }
      
      this.passes.splice(index, 1);
      
      if (this.activePassId === passId) {
        this.activePassId = this.passes.find(p => p.type === 'image')?.id || null;
      }
      
      this.updatePassTabs();
      this.updateChannelOptions();
      this.updateBufferPreview();
      
      // Clear references to this pass from other passes
      this.passes.forEach(p => {
        p.channels.forEach(channel => {
          if (channel.source === passId) {
            channel.source = undefined;
          }
        });
      });
    }
  }

  private updatePassTabs() {
    const tabsList = this.container.querySelector('#pass-tabs-list');
    if (!tabsList) return;

    const sortedPasses = [...this.passes].sort((a, b) => {
      if (a.type === 'image') return -1;
      if (b.type === 'image') return 1;
      return a.name.localeCompare(b.name);
    });

    tabsList.innerHTML = sortedPasses.map(pass => `
      <div class="pass-tab ${this.activePassId === pass.id ? 'active' : ''} ${pass.type}" 
           data-pass-id="${pass.id}">
        <span class="tab-name">${pass.name}</span>
        ${pass.type === 'buffer' ? `
          <button class="tab-remove" data-pass-id="${pass.id}">×</button>
        ` : ''}
        <div class="tab-indicator ${pass.enabled ? 'enabled' : 'disabled'}"></div>
      </div>
    `).join('');

    // Remove existing event listener and add new one
    tabsList.removeEventListener('click', this.handleTabClick);
    tabsList.addEventListener('click', this.handleTabClick);
  }

  private handleTabClick = (e: Event) => {
    const target = e.target as HTMLElement;
    
    if (target.classList.contains('tab-remove')) {
      const passId = target.dataset.passId;
      if (passId) {
        this.onPassRemoveCallback?.(passId);
      }
      e.stopPropagation();
    } else {
      const tab = target.closest('.pass-tab') as HTMLElement;
      if (tab) {
        const passId = tab.dataset.passId;
        if (passId && passId !== this.activePassId) {
          console.log(`Switching to pass: ${passId}`);
          this.selectPass(passId);
        }
      }
    }
  }

  private updateChannelOptions() {
    const channelSelects = this.container.querySelectorAll('.channel-select') as NodeListOf<HTMLSelectElement>;
    const bufferPasses = this.passes.filter(p => p.type === 'buffer');

    channelSelects.forEach(select => {
      const currentValue = select.value;
      select.innerHTML = '<option value="">None</option>';
      
      bufferPasses.forEach(pass => {
        const option = document.createElement('option');
        option.value = pass.id;
        option.textContent = pass.name;
        select.appendChild(option);
      });
      
      // Restore selection if still valid
      if (currentValue && bufferPasses.some(p => p.id === currentValue)) {
        select.value = currentValue;
      }
    });
  }

  private updateBufferPreview() {
    const bufferPreview = this.container.querySelector('#buffer-preview');
    if (!bufferPreview) return;

    const bufferPasses = this.passes.filter(p => p.type === 'buffer');
    
    if (bufferPasses.length === 0) {
      bufferPreview.innerHTML = '<div class="no-buffers">No buffer passes created</div>';
    } else {
      bufferPreview.innerHTML = bufferPasses.map(pass => `
        <div class="buffer-item" data-pass-id="${pass.id}">
          <div class="buffer-info">
            <strong>${pass.name}</strong>
            <div class="buffer-status ${pass.enabled ? 'enabled' : 'disabled'}">
              ${pass.enabled ? 'Active' : 'Disabled'}
            </div>
          </div>
          <div class="buffer-preview-texture">
            <!-- Texture preview would go here -->
            <div class="texture-placeholder">Texture Output</div>
          </div>
        </div>
      `).join('');
    }
  }

  selectPass(passId: string) {
    console.log(`selectPass called with: ${passId}, current active: ${this.activePassId}`);
    
    // Only proceed if this is actually a different pass
    if (this.activePassId === passId) {
      console.log(`Pass ${passId} is already active, skipping`);
      return;
    }
    
    // Update the active pass ID BEFORE calling the callback
    this.activePassId = passId;
    console.log(`Updated activePassId to: ${this.activePassId}`);
    
    // Update UI to reflect the new active pass
    this.updatePassTabs();
    this.updateActivePassInfo();
    
    // Now trigger the callback with the new pass ID
    console.log(`Calling onPassSelectCallback with: ${passId}`);
    this.onPassSelectCallback?.(passId);
  }

  private updateActivePassInfo() {
    const activePass = this.passes.find(p => p.id === this.activePassId);
    if (!activePass) return;

    // Update channel selects to reflect current pass channels
    const channelSelects = this.container.querySelectorAll('.channel-select') as NodeListOf<HTMLSelectElement>;
    channelSelects.forEach((select, index) => {
      const channel = activePass.channels.find(c => c.index === index);
      select.value = channel?.source || '';
    });
  }

  showErrors(errors: CompilationError[]) {
    const errorList = this.container.querySelector('#error-list');
    if (!errorList) return;

    if (errors.length === 0) {
      errorList.innerHTML = '<div class="no-errors">No compilation errors</div>';
      return;
    }

    errorList.innerHTML = errors.map(error => `
      <div class="error-item ${error.type}">
        <div class="error-location">Line ${error.line}, Column ${error.column}</div>
        <div class="error-message">${error.message}</div>
      </div>
    `).join('');
  }

  onPassSelect(callback: (passId: string) => void) {
    this.onPassSelectCallback = callback;
  }

  onPassRemove(callback: (passId: string) => void) {
    this.onPassRemoveCallback = callback;
  }

  onPassToggle(callback: (passId: string, enabled: boolean) => void) {
    this.onPassToggleCallback = callback;
  }

  onPassAdd(callback: (type: PassType) => void) {
    this.onPassAddCallback = callback;
  }

  onChannelUpdate(callback: (passId: string, channelIndex: number, source: string) => void) {
    this.onChannelUpdateCallback = callback;
  }

  getActivePassId(): string | null {
    return this.activePassId;
  }
}