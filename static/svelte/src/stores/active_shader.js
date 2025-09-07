import { writable, derived, get } from "svelte/store";
import { shaders } from "../stores/shaders";
import {DEFAULT_SCRIPT} from "../constants.js";

export const activeShaderID = writable(null);
export const activeShader = derived(activeShaderID, id => id ? get(shaders).find(s => s.id === id) : null);
export const activeScriptIndex = writable(0);
export const injectedCode = writable("");
export const activeScript = derived(
    [activeShader, activeScriptIndex],
    ([shader, scriptIndex]) => {
        if (!shader) return null;
        if (!shader.shader_scripts) return null;
        if (shader.shader_scripts.length <= scriptIndex) return null;
        return shader.shader_scripts[scriptIndex];
    }
);

export function addNewScript() {
    console.log("Adding new script", get(activeShader));
    const currentShader = get(activeShader);
    if (!currentShader) return;
    
    // get next id
    let nextID = 1;
    if (currentShader.shader_scripts && currentShader.shader_scripts.length > 0) {
        nextID = Math.max(...currentShader.shader_scripts.map(s => s.id || 0)) + 1;
    }
    const newScript = {...DEFAULT_SCRIPT, id: nextID};
    
    // Make sure scripts array exists
    if (!currentShader.shader_scripts) {
        currentShader.shader_scripts = [];
    }
    
    // Update the shader
    currentShader.shader_scripts.push(newScript);
    
    // set new active script index
    activeScriptIndex.set(Math.max(0, get(activeScriptIndex) - 1));
}

export function deleteScript(index) {
    const currentShader = get(activeShader);
    if (!currentShader) return;
    if (currentShader.shader_scripts?.length < index) return;

    currentShader.shader_scripts.splice(index, 1);

    // set new active script index
    activeScriptIndex.set(Math.max(0, index - 1));
}
