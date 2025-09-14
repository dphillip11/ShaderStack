import { writable } from 'svelte/store';

export const isRunning = writable(false);
export const isInitializing = writable(false);
export const webgpuReady = writable(false);
export const lastError = writable(null);

export const consoleMessages = writable([]);

// Append console message (pure helper)
export function AddConsoleMessage(text, type = 'info') {
  consoleMessages.set([...get(consoleMessages).slice(-99), { time: new Date(), type, text }]);
}

export function ClearConsole() {
  consoleMessages.set([]);
}

