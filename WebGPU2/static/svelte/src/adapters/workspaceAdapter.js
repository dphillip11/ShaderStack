import { editorState, setInitializing, setRunning, setSaving, setError, setShader, replaceAllScripts, setActiveScript, addConsoleMessage, updateScriptCode, registerWorkspace } from '../stores/editor.js';

// Helper to access current state snapshot
function getSnapshot() { let v; editorState.subscribe(s=>v=s)(); return v; }

export async function initWorkspace() {
  if (typeof window === 'undefined') return;
  if (!window.ShaderWorkspace) { addConsoleMessage('ShaderWorkspace not loaded', 'error'); return; }
  try {
    setInitializing(true);
    const container = document.getElementById('svelte-root') || document.body;
    const ws = new window.ShaderWorkspace(container, { autoSave: false, realTimeExecution: false });
    await ws.initialize();
    registerWorkspace(ws);

    let shaderData = window.shaderData;
    console.log('initWorkspace shaderData:', shaderData);
    
    if (shaderData && shaderData.id) {
      // Ensure shader_scripts is valid array
      if (!shaderData.shader_scripts || !Array.isArray(shaderData.shader_scripts)) {
        console.log('Shader has null/invalid shader_scripts, creating default');
        shaderData.shader_scripts = [{
          id: 0,
          code: "@fragment\nfn main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {\n    let uv = fragCoord.xy / vec2<f32>(512.0, 512.0);\n    return vec4<f32>(uv, 0.5, 1.0);\n}",
          buffer: { format: "rgba8unorm", width: 512, height: 512 }
        }];
      }
      
      // Convert numeric IDs to strings for script engine compatibility
      shaderData.shader_scripts = shaderData.shader_scripts.map(script => ({
        ...script,
        id: String(script.id)
      }));
      
      await ws.loadShader(shaderData);
      setShader({ id: shaderData.id, name: shaderData.name, tags: shaderData.tags || [] });
      replaceAllScripts(shaderData.shader_scripts.map(s => ({ id: s.id, code: s.code, buffer: s.buffer })));
    } else {
      console.log('No valid shaderData, creating new shader');
      const newShader = await ws.createNewShader('New Shader');
      setShader({ id: newShader.id, name: newShader.name, tags: [] });
      replaceAllScripts(newShader.shader_scripts.map(s => ({ id: s.id, code: s.code, buffer: s.buffer })));
    }
    setActiveScript(getSnapshot().scripts[0]?.id ?? "0");
    addConsoleMessage('Workspace initialized', 'success');
  } catch (e) {
    console.error('Workspace init error:', e);
    setError(e.message);
    addConsoleMessage('Initialization failed: ' + e.message, 'error');
  } finally {
    setInitializing(false);
  }
}

export async function runAll() {
  const ws = getWorkspace();
  if (!ws) return;
  try {
    setRunning(true);
    // sync active script code before run
    const s = getSnapshot();
    s.scripts.forEach(sc => ws.updateScriptCode(sc.id, sc.code));
    await ws.runAllScripts();
    addConsoleMessage('Execution complete', 'success');
  } catch (e) {
    addConsoleMessage('Run failed: ' + e.message, 'error');
  } finally { setRunning(false); }
}

export async function saveShader() {
  const ws = getWorkspace(); if (!ws) return;
  try {
    setSaving(true);
    const s = getSnapshot();
    s.scripts.forEach(sc => ws.updateScriptCode(sc.id, sc.code));
    // Build full payload
    const payload = {
      id: s.shader?.id,
      name: s.shader?.name || 'Untitled Shader',
      shader_scripts: s.scripts.map(sc => ({ id: sc.id, code: sc.code, buffer: sc.buffer })),
      tags: (s.shader?.tags || []).map(t => typeof t === 'string' ? { name: t } : t)
    };
    // Direct save via workspace (fallback) or API if needed
    const isUpdate = !!payload.id;
    const endpoint = isUpdate ? `/api/shaders/${payload.id}` : '/api/shaders';
    const method = isUpdate ? 'PUT' : 'POST';
    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    if (!payload.id && result.id) setShader({ ...s.shader, id: result.id });
    addConsoleMessage('Saved successfully', 'success');
  } catch (e) {
    addConsoleMessage('Save failed: ' + e.message, 'error');
  } finally { setSaving(false); }
}

export async function compileActive() {
  const ws = getWorkspace(); if (!ws) return;
  const s = getSnapshot();
  const script = s.scripts.find(sc => sc.id === s.activeScriptId);
  if (!script) return;
  try {
    ws.updateScriptCode(script.id, script.code);
    await ws.shaderCompiler.compileShader(script.code);
    addConsoleMessage('Compilation successful', 'success');
  } catch (e) { addConsoleMessage('Compilation failed: ' + e.message, 'error'); }
}

export function addScript() {
  const ws = getWorkspace(); if (!ws) return;
  ws.addScript('').then(id => {
    const currentScripts = getSnapshot().scripts;
    const newScript = { id, code: '', buffer: { format: 'rgba8unorm', width:512, height:512 } };
    replaceAllScripts([...currentScripts, newScript]);
    setActiveScript(id);
    console.log('addScript completed, set active script to:', id);
  }).catch(e => {
    console.error('addScript failed:', e);
    addConsoleMessage('Failed to add script: ' + e.message, 'error');
  });
}

export function getWorkspace() { return window.__workspaceRef || registerGlobal(); }
function registerGlobal() { /* no-op placeholder; registerWorkspace handles storage */ return null; }
