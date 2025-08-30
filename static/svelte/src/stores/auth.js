import { writable } from 'svelte/store';

export const auth = writable({ isAuthenticated: false, username: '', user_id: null });

export function initAuth() {
  console.log('initAuth called - window.__AUTH__:', window.__AUTH__);
  if (typeof window !== 'undefined' && window.__AUTH__) {
    const authData = {
      isAuthenticated: !!window.__AUTH__.isAuthenticated,
      username: window.__AUTH__.username || '',
      user_id: window.__AUTH__.user_id || null
    };
    console.log('Setting auth data:', authData);
    auth.set(authData);
  } else {
    console.log('No window.__AUTH__ found, setting unauthenticated');
    auth.set({ isAuthenticated: false, username: '', user_id: null });
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
  console.log('Login successful, setting auth data:', data);
  auth.set({ isAuthenticated: true, username: data.username, user_id: data.user_id });
  return data;
}

export async function logout() {
  await fetch('/api/logout', { method: 'POST', credentials: 'include' });
  auth.set({ isAuthenticated: false, username: '', user_id: null });
  window.location.href = '/';
}
