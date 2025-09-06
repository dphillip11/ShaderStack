import { writable, derived } from 'svelte/store';

// Core reactive state for editor
export const editorState = writable({
  initializing: true,
  loading: false,
  saving: false,
  running: false,
  error: null,
  activeScriptId: null,
  webgpuReady: false,
});

export function setInitializing(v) { editorState.update(s => ({ ...s, initializing: v })); }
export function setSaving(v) { editorState.update(s => ({ ...s, saving: v })); }
export function setRunning(v) { editorState.update(s => ({ ...s, running: v })); }
export function setError(e) { editorState.update(s => ({ ...s, error: e })); }
export function setWebGPUReady(v) { editorState.update(s => ({ ...s, webgpuReady: v })); }
