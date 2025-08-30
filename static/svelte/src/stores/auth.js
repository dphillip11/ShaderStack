import { writable } from 'svelte/store';

export const auth = writable({ isAuthenticated: false, username: '' });

export function initAuth() {
  console.log('initAuth called - window.__AUTH__:', window.__AUTH__);
  if (typeof window !== 'undefined' && window.__AUTH__) {
    const authData = {
      isAuthenticated: !!window.__AUTH__.isAuthenticated,
      username: window.__AUTH__.username || ''
    };
    console.log('Setting auth data:', authData);
    auth.set(authData);
  } else {
    console.log('No window.__AUTH__ found, setting unauthenticated');
    auth.set({ isAuthenticated: false, username: '' });
  }
}

export async function login(username, password) {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) throw new Error(await res.text() || 'Login failed');
  const data = await res.json();
  auth.set({ isAuthenticated: true, username: data.username });
  return data;
}

export async function logout() {
  await fetch('/api/logout', { method: 'POST', credentials: 'include' });
  auth.set({ isAuthenticated: false, username: '' });
  window.location.href = '/';
}
