import { writable, derived } from 'svelte/store';

export const consoleMessages = writable([]);

// Append console message (pure helper)
export function addConsoleMessage(text, type = 'info') {
  consoleMessages.update(s => [...s.slice(-99), { time: new Date(), type, text }]);
}

export const injectedCode = writable("");
export const activeScript = writable(null);
export const compileErrorsByLine = writable({});

// Core reactive state for editor
export const editorState = writable({
  initializing: true,
  loading: false,
  saving: false,
  running: false,
  error: null,
  shader: null,          // { id, name, shader_scripts: [...] }
  webgpuReady: false,
});

export function deleteScript(id) {
  editorState.update(s => {
    const newScripts = s.shader.scripts.filter(sc => sc.id !== id);
    
    // If we're deleting the active script, switch to another one
    let newActiveId = s.activeScriptId;
    if (s.activeScriptId === id) {
      newActiveId = newScripts.length > 0 ? newScripts[0].id : null;
    }
    
    return {
      ...s,
      scripts: newScripts,
      activeScriptId: newActiveId
    };
  });
}

export function setInitializing(v) { editorState.update(s => ({ ...s, initializing: v })); }
export function setSaving(v) { editorState.update(s => ({ ...s, saving: v })); }
export function setRunning(v) { editorState.update(s => ({ ...s, running: v })); }
export function setError(e) { editorState.update(s => ({ ...s, error: e })); }
export function setWebGPUReady(v) { editorState.update(s => ({ ...s, webgpuReady: v })); }

// Adapter registration (kept minimal)
let workspaceRef = null;
export function registerWorkspace(ws) { window.__workspaceRef = ws; workspaceRef = ws; }
export function getWorkspace() { return workspaceRef; }
