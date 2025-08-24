import { editorState, setInitializing, setRunning, setSaving, setError, setShader, replaceAllScripts, setActiveScript, addConsoleMessage, updateScriptCode, registerWorkspace } from '../stores/editor.js';
import { writable } from 'svelte/store';

// Real-time execution state
export const isRealTimeRunning = writable(false);

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
    
    // Function to decode JSON-encoded strings
    function decodeCodeStrings(scripts) {
      return scripts.map(script => ({
        ...script,
        code: typeof script.code === 'string' && 
              script.code.startsWith('"') && script.code.endsWith('"') && 
              (script.code.includes('\\n') || script.code.includes('\\"'))
              ? JSON.parse(script.code) 
              : script.code
      }));
    }
    
    // Function to ensure script has valid code
    function ensureValidCode(script) {
      if (!script.code || typeof script.code !== 'string' || script.code.trim() === '') {
        return {
          ...script,
          code: "@fragment\nfn main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {\n    let uv = fragCoord.xy / vec2<f32>(512.0, 512.0);\n    return vec4<f32>(uv, 0.5, 1.0);\n}"
        };
      }
      return script;
    }
    
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
      
      // Decode JSON-encoded code strings, ensure valid code, and convert numeric IDs to strings
      shaderData.shader_scripts = decodeCodeStrings(shaderData.shader_scripts)
        .map(ensureValidCode)
        .map(script => ({
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

export async function runActiveScript() {
  const ws = getWorkspace();
  if (!ws) return;
  try {
    setRunning(true);
    const s = getSnapshot();
    const activeScript = s.scripts.find(sc => sc.id === s.activeScriptId);
    if (!activeScript) {
      addConsoleMessage('No active script to run', 'warning');
      return;
    }
    
    // Update the script code before running
    ws.updateScriptCode(activeScript.id, activeScript.code);
    await ws.runScript(activeScript.id);
    addConsoleMessage(`Script ${activeScript.id} executed successfully`, 'success');
  } catch (e) {
    addConsoleMessage('Script execution failed: ' + e.message, 'error');
  } finally { setRunning(false); }
}

export async function saveShader() {
  const ws = getWorkspace(); if (!ws) return;
  try {
    setSaving(true);
    const s = getSnapshot();
    s.scripts.forEach(sc => ws.updateScriptCode(sc.id, sc.code));
    // Build full payload with proper data types for Go backend
    const payload = {
      id: s.shader?.id,
      name: s.shader?.name || 'Untitled Shader',
      shader_scripts: s.scripts.map(sc => ({ 
        id: parseInt(sc.id, 10), // Convert string ID back to integer
        code: sc.code, 
        buffer: sc.buffer 
      })),
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
    
    // Use the same injection process as the script engine
    const availableBuffers = new Map();
    if (ws.scriptEngine && ws.scriptEngine.scripts) {
      for (const [scriptId, scriptData] of ws.scriptEngine.scripts) {
        if (scriptId !== script.id) {
          availableBuffers.set(scriptId, scriptData.bufferSpec);
        }
      }
    }
    
    // Inject uniforms and buffer bindings like the script engine does
    const enhancedCode = ws.shaderCompiler.injectBufferBindings(script.code, availableBuffers);
    await ws.shaderCompiler.compileShader(enhancedCode);
    
    addConsoleMessage('Compilation successful', 'success');
  } catch (e) { addConsoleMessage('Compilation failed: ' + e.message, 'error'); }
}

export function addScript() {
  const ws = getWorkspace(); if (!ws) return;
  
  // Provide default shader code instead of empty string
  const defaultCode = "@fragment\nfn main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {\n    let uv = fragCoord.xy / vec2<f32>(512.0, 512.0);\n    return vec4<f32>(uv, 0.25, 1.0);\n}";
  
  ws.addScript(defaultCode).then(id => {
    const currentScripts = getSnapshot().scripts;
    const newScript = { id, code: defaultCode, buffer: { format: 'rgba8unorm', width:512, height:512 } };
    replaceAllScripts([...currentScripts, newScript]);
    setActiveScript(id);
    console.log('addScript completed, set active script to:', id);
  }).catch(e => {
    console.error('addScript failed:', e);
    addConsoleMessage('Failed to add script: ' + e.message, 'error');
  });
}

// Real-time execution functions
export function startRealTime() {
  const ws = getWorkspace();
  if (!ws || !ws.scriptEngine) return;
  
  try {
    // Sync script code before starting real-time execution
    const s = getSnapshot();
    s.scripts.forEach(sc => ws.updateScriptCode(sc.id, sc.code));
    
    ws.scriptEngine.startRealTimeExecution();
    isRealTimeRunning.set(true);
    addConsoleMessage('Real-time execution started', 'success');
  } catch (e) {
    addConsoleMessage('Failed to start real-time execution: ' + e.message, 'error');
  }
}

export function stopRealTime() {
  const ws = getWorkspace();
  if (!ws || !ws.scriptEngine) return;
  
  try {
    ws.scriptEngine.stopRealTimeExecution();
    isRealTimeRunning.set(false);
    addConsoleMessage('Real-time execution stopped', 'info');
  } catch (e) {
    addConsoleMessage('Failed to stop real-time execution: ' + e.message, 'error');
  }
}

export function getWorkspace() { return window.__workspaceRef || registerGlobal(); }
function registerGlobal() { /* no-op placeholder; registerWorkspace handles storage */ return null; }
