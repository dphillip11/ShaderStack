import { writable, derived } from 'svelte/store';

// Core reactive state for editor
export const editorState = writable({
  initializing: true,
  loading: false,
  saving: false,
  running: false,
  error: null,
  shader: null,          // { id, name, shader_scripts: [...] }
  scripts: [],           // normalized [{ id, code, buffer }]
  activeScriptId: null,
  webgpuReady: false,
  consoleMessages: []    // { time, type, text }
});

// Derived helpers
export const activeScript = derived(editorState, $s => $s.scripts.find(sc => sc.id === $s.activeScriptId));

// Append console message (pure helper)
export function addConsoleMessage(text, type = 'info') {
  editorState.update(s => ({
    ...s,
    consoleMessages: [...s.consoleMessages.slice(-99), { time: new Date(), type, text }]
  }));
}

export function setActiveScript(id) {
  editorState.update(s => ({ ...s, activeScriptId: id }));
}

export function updateScriptCode(id, code) {
  editorState.update(s => ({
    ...s,
    scripts: s.scripts.map(sc => sc.id === id ? { ...sc, code } : sc)
  }));
}

export function updateScriptBuffer(id, buffer) {
  editorState.update(s => ({
    ...s,
    scripts: s.scripts.map(sc => sc.id === id ? { ...sc, buffer } : sc)
  }));
}

export function replaceAllScripts(list) {
  editorState.update(s => ({ ...s, scripts: list, activeScriptId: list[0]?.id ?? null }));
}

export function setShader(shader) {
  editorState.update(s => ({ ...s, shader }));
}

export function updateShaderName(name){
  editorState.update(s => ({ ...s, shader: s.shader ? { ...s.shader, name } : { name } }));
}

export function setShaderTags(tags){
  editorState.update(s => ({ ...s, shader: s.shader ? { ...s.shader, tags } : { tags } }));
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
