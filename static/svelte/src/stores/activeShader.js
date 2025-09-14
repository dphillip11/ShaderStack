import {user} from "./user.js";
import { writable, derived, get } from "svelte/store";
import { UpdateShader } from "./shaders.js";
import {DEFAULT_SCRIPT} from "../constants.js";

export const activeShader = writable(null);
export const activeScriptIndex = writable(0);
export const activeScript = derived(
    [activeShader, activeScriptIndex],
    ([shader, scriptIndex]) => {
        if (!shader) return null;
        if (!shader.shader_scripts) return null;
        if (shader.shader_scripts.length <= scriptIndex) return null;
        return shader.shader_scripts[scriptIndex];
    }
);

export const scriptRuntimeData = writable([
    // injectedCode: '', compiledModule: ShaderModule, errors: []
]);

export function NewShader(){
    return {
        id: null,
        name: 'New Shader',
        description: '',
        tags: [{ name: 'Shader', id: null }],
        shader_scripts: [DEFAULT_SCRIPT],
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
    
    // set new active script index to the newly added script
    activeScriptIndex.set(currentShader.shader_scripts.length - 1);
    
    // Update the store
    activeShader.set(currentShader);
}

export function deleteScript(index) {
    const currentShader = get(activeShader);
    if (!currentShader) return;
    if (!currentShader.shader_scripts || currentShader.shader_scripts.length <= index) return;

    currentShader.shader_scripts.splice(index, 1);

    // set new active script index
    const newIndex = Math.min(index, currentShader.shader_scripts.length - 1);
    activeScriptIndex.set(Math.max(0, newIndex));
    
    // Update the store
    activeShader.set(currentShader);
}
