import { writable, derived } from 'svelte/store';

export const isRunning = writable(false);
export const isInitializing = writable(false);
export const webgpuReady = writable(false);
export const lastError = writable(null);
export const consoleMessages = writable([]);

export function addConsoleMessage(message, type = 'info') {
  consoleMessages.update(messages => [
    ...messages,
    {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
}

export function clearConsole() {
  consoleMessages.set([]);
}