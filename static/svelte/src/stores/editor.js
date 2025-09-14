import { writable, get } from 'svelte/store';

export const isRunning = writable(false);
export const isInitializing = writable(false);
export const webgpuReady = writable(false);
export const lastError = writable(null);

export const consoleMessages = writable([]);

// Append console message
export function addConsoleMessage(message, type = 'info') {
  const entry = {
    id: Date.now() + Math.random(),
    timestamp: new Date().toLocaleTimeString(),
    type,
    message
  };
  const prev = get(consoleMessages);
  consoleMessages.set([...prev.slice(-99), entry]);
}

export function clearConsole() {
  consoleMessages.set([]);
}

