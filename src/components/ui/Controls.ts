import type { ShaderPass, CompilationError } from '../../types';

export class Controls {
  private container: HTMLElement;
  private passes: ShaderPass[] = [];
  private activePassId: string | null = null;
  private onPassSelectCallback?: (passId: string) => void;
  private onPassAddCallback?: () => void;
  private onPassRemoveCallback?: (passId: string) => void;
  private onPassToggleCallback?: (passId: string, enabled: boolean) => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.setupUI();
  }

  private setupUI() {
    this.container.innerHTML = `
      <div class="controls">
        <div class="controls-header">
          <h3>Shader Passes</h3>
          <button id="add-pass" class="btn btn-primary">+ Add Pass</button>
        </div>
        <div id="pass-list" class="pass-list"></div>
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
              <option value="custom">Custom</option>
            </select>
          </label>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents() {
    const addPassBtn = this.container.querySelector('#add-pass') as HTMLButtonElement;
    addPassBtn?.addEventListener('click', () => {
      this.onPassAddCallback?.();
    });

    const autoCompileCheckbox = this.container.querySelector('#auto-compile') as HTMLInputElement;
    autoCompileCheckbox?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      this.setAutoCompile(target.checked);
    });
  }

  addPass(pass: ShaderPass) {
    this.passes.push(pass);
    this.updatePassList();
  }

  removePass(passId: string) {
    const index = this.passes.findIndex(p => p.id === passId);
    if (index !== -1) {
      this.passes.splice(index, 1);
      if (this.activePassId === passId) {
        this.activePassId = null;
      }
      this.updatePassList();
    }
  }

  private updatePassList() {
    const passList = this.container.querySelector('#pass-list');
    if (!passList) return;

    passList.innerHTML = this.passes.map(pass => `
      <div class="pass-item ${this.activePassId === pass.id ? 'active' : ''}" data-pass-id="${pass.id}">
        <div class="pass-header">
          <span class="pass-name">${pass.name}</span>
          <div class="pass-controls">
            <label class="toggle">
              <input type="checkbox" ${pass.enabled ? 'checked' : ''} 
                     onchange="this.dispatchEvent(new CustomEvent('pass-toggle', {bubbles: true, detail: {passId: '${pass.id}', enabled: this.checked}}))">
              <span class="toggle-slider"></span>
            </label>
            <button class="btn btn-danger btn-sm" 
                    onclick="this.dispatchEvent(new CustomEvent('pass-remove', {bubbles: true, detail: {passId: '${pass.id}'}}))">
              ×
            </button>
          </div>
        </div>
        <div class="pass-info">
          <small>Inputs: ${pass.inputs.length} | Outputs: ${pass.outputs.length}</small>
        </div>
      </div>
    `).join('');

    // Bind pass selection events
    passList.addEventListener('click', (e) => {
      const passItem = (e.target as HTMLElement).closest('.pass-item');
      if (passItem && !(e.target as HTMLElement).closest('.pass-controls')) {
        const passId = passItem.getAttribute('data-pass-id');
        if (passId) {
          this.selectPass(passId);
        }
      }
    });

    // Bind pass toggle events
    passList.addEventListener('pass-toggle', (e: any) => {
      const { passId, enabled } = e.detail;
      this.onPassToggleCallback?.(passId, enabled);
    });

    // Bind pass remove events
    passList.addEventListener('pass-remove', (e: any) => {
      const { passId } = e.detail;
      this.onPassRemoveCallback?.(passId);
    });
  }

  selectPass(passId: string) {
    this.activePassId = passId;
    this.updatePassList();
    this.onPassSelectCallback?.(passId);
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

  private setAutoCompile(enabled: boolean) {
    // This would be handled by the main application
    console.log('Auto-compile:', enabled);
  }

  onPassSelect(callback: (passId: string) => void) {
    this.onPassSelectCallback = callback;
  }

  onPassAdd(callback: () => void) {
    this.onPassAddCallback = callback;
  }

  onPassRemove(callback: (passId: string) => void) {
    this.onPassRemoveCallback = callback;
  }

  onPassToggle(callback: (passId: string, enabled: boolean) => void) {
    this.onPassToggleCallback = callback;
  }

  getActivePassId(): string | null {
    return this.activePassId;
  }
}