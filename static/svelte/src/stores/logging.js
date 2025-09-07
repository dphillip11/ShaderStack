import { writable, get } from "svelte/store";

export const consoleMessages = writable([]);
export const compileErrorsByScript = writable({});

// Append console message (pure helper)
export function AddConsoleMessage(text, type = 'info') {
  consoleMessages.set([...get(consoleMessages).slice(-99), { time: new Date(), type, text }]);
}

export function ClearConsole() {
  consoleMessages.set([]);
};