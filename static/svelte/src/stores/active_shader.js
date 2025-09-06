import { writable, derived } from "svelte/store";
import { shaders } from "../stores/shaders";
import {DEFAULT_SCRIPT} from "../constants.js";

export const activeShaderID = writable(null);
export const activeShader = derived(activeShaderID, $id => $id ? shaders.find(s => s.id === $id) : null);
export const activeScriptIndex = writable(0);
export const activeScript = derived(
    [activeShader, activeScriptIndex],
    ([$activeShader, $activeScriptIndex]) => {
        if (!$activeShader) return null;
        if ($activeShader.scripts.length <= $activeScriptIndex) return null;
        return $activeShader.scripts[$activeScriptIndex];
    }
);

export function addNewScript() {
    if (!$activeShader) return;
    // get next id
    const nextID = Math.max(activeShader.scripts.map(s => s.id)) + 1;
    const newScript = DEFAULT_SCRIPT;
    newScript.id = nextID;
    $activeShader.scripts.push(newScript);
    // set new active script index
    activeScriptIndex.set(Math.max(0, activeScriptIndex - 1));
}

export function deleteActiveScript() {
    if (!$activeShader) return;
    if ($activeShader.scripts.length < $activeScriptIndex) return;
    $activeShader.scripts.splice($activeScriptIndex, 1);
    // set new active script index
    activeScriptIndex.set(Math.max(0, $activeScriptIndex - 1));
}
