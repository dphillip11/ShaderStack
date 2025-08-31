import { writable } from 'svelte/store';

export const auth = writable({ isAuthenticated: false, username: '', user_id: null });

export async function getAuth() {
  const res = await fetch('/api/auth', {
    method: 'GET',
    credentials: 'include'
  });
  if (!res.ok) throw new Error(await res.text() || 'Get Auth data failed');
  const data = await res.json();
  auth.set({ isAuthenticated: data.isAuthenticated, username: data.username, user_id: data.user_id });
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
