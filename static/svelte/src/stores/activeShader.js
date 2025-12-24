import { user } from "./user.js";
import { writable, derived, get } from "svelte/store";
import { UpdateShader } from "./shaders.js";
import { DEFAULT_SCRIPT_0, DEFAULT_SCRIPT_1, DEFAULT_COMPUTE_SCRIPT } from "../constants.js";

export const activeShader = writable(null);
export const activeScriptIndex = writable(0);
export const isEditingCommonScript = writable(false);

export const activeScript = derived(
    [activeShader, activeScriptIndex, isEditingCommonScript],
    ([shader, scriptIndex, editingCommon]) => {
        if (!shader) return null;
        
        // If editing common script, return a special object
        if (editingCommon) {
            return {
                id: 'common',
                code: shader.common_script || '',
                isCommonScript: true
            };
        }
        
        if (!shader.shader_scripts) return null;
        if (shader.shader_scripts.length <= scriptIndex) return null;
        return shader.shader_scripts[scriptIndex];
    }
);

// Runtime data per scriptId: { [id: number]: { injectedCode?: string, compiledModule?: GPUShaderModule|null, errors?: Array<any> } }
export const scriptRuntimeData = writable({});

// Helper to get runtime data for a script id
export function getScriptRuntime(scriptId) {
    return get(scriptRuntimeData)[scriptId] || null;
}

// Upsert runtime data for a script
export function updateScriptRuntime(scriptId, partial) {
    scriptRuntimeData.update(map => {
        const prev = map[scriptId] || {};
        const next = { ...prev, ...partial };
        const out = { ...map, [scriptId]: next };
        return out;
    });
}

// Clear runtime data for a script
export function clearScriptRuntime(scriptId) {
    scriptRuntimeData.update(map => {
        if (!map[scriptId]) return map;
        const out = { ...map };
        delete out[scriptId];
        return out;
    });
}

// Current script's runtime convenience derived
export const currentScriptRuntime = derived(
    [scriptRuntimeData, activeScript],
    ([$runtime, $activeScript]) => {
        if (!$activeScript) return null;
        return $runtime[$activeScript.id] || null;
    }
);

export function NewShader(){
    return {
        id: null,
        name: 'New Shader',
        description: '',
        tags: [],
        common_script: '',
        shader_scripts: [DEFAULT_SCRIPT_0, DEFAULT_SCRIPT_1],
        user_id: get(user)?.user_id,
    };
}

export function SaveActiveShader() {
    const shader = get(activeShader);
    if (!shader) return;
    UpdateShader(shader);
}

export function AddTag(tagString) {
    debugger;
    const currentShader = get(activeShader);
    if (!currentShader.tags) {
        currentShader.tags = [];
    }
    if (currentShader.tags.map(t => t.name).includes(tagString)) return;
    currentShader.tags.push({ name: tagString, id: null });
    activeShader.set(currentShader);
}

export function RemoveTag(tagString) {
    debugger;
    const currentShader = get(activeShader);
    if (!currentShader.tags.map(t => t.name).includes(tagString)) return;
    currentShader.tags = currentShader.tags.filter(t => t.name !== tagString);
    activeShader.set(currentShader);
}

export function addNewScript(kind = 'fragment') {
    const currentShader = get(activeShader);
    if (!currentShader) return;
    
    // get next id
    let nextID = 1;
    if (currentShader.shader_scripts && currentShader.shader_scripts.length > 0) {
        nextID = Math.max(...currentShader.shader_scripts.map(s => s.id || 0)) + 1;
    }
    // Choose a sensible default per kind
    let tpl;
    if (kind === 'compute') {
        tpl = DEFAULT_COMPUTE_SCRIPT;
    } else {
        tpl = (currentShader.shader_scripts?.length ?? 0) === 0 ? DEFAULT_SCRIPT_0 : DEFAULT_SCRIPT_1;
    }
    const newScript = { ...tpl, id: nextID };
    
    // Make sure scripts array exists
    if (!currentShader.shader_scripts) {
        currentShader.shader_scripts = [];
    }
    
    // Update the shader
    currentShader.shader_scripts.push(newScript);
    
    // set new active script index to the newly added script
    activeScriptIndex.set(currentShader.shader_scripts.length - 1);
    
    // Update the store
    activeShader.set(currentShader);
}

export function deleteScript(index) {
    const currentShader = get(activeShader);
    if (!currentShader) return;
    if (!currentShader.shader_scripts || currentShader.shader_scripts.length <= index) return;

    const removed = currentShader.shader_scripts.splice(index, 1);
    // also clear runtime for removed script id
    if (removed && removed[0] && removed[0].id != null) {
        clearScriptRuntime(removed[0].id);
    }

    // set new active script index
    const newIndex = Math.min(index, currentShader.shader_scripts.length - 1);
    activeScriptIndex.set(Math.max(0, newIndex));
    
    // Update the store
    activeShader.set(currentShader);
}
