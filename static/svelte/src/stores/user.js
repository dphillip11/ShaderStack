import { derived, writable } from 'svelte/store';
import { login, register, logout, getAuthInfo } from '../repository/backend_api.js';

export const user = writable({ 
  is_authenticated: false, 
  username: '', 
  user_id: null 
});

export const loginError = writable('');
export const loading = writable(false);

export const OFFLINE_USER = { 
  is_authenticated: true, 
  username: 'Offline User', 
  user_id: -1
};

export const isOffline = derived(user, $user => $user.user_id === OFFLINE_USER.user_id);

// Authentication methods
export async function loginUser(username, password) {
  loading.set(true);
  loginError.set('');
  
  try {
    const data = await login(username, password);
    
    // Handle both online and offline responses
    user.set({
      is_authenticated: true,
      username: data.username || data.Username,
      user_id: data.user_id || data.UserID
    });
    
    return { success: true };
    
  } catch (error) {
    loginError.set(error.message || 'Login failed');
    return { success: false, error: error.message };
  } finally {
    loading.set(false);
  }
}

export async function registerUser(username, password) {
  loading.set(true);
  loginError.set('');
  
  try {
    const data = await register(username, password);
    
    user.set({
      is_authenticated: true,
      username: data.username || data.Username,
      user_id: data.user_id || data.UserID
    });
    
    return { success: true };
    
  } catch (error) {
    loginError.set(error.message || 'Registration failed');
    return { success: false, error: error.message };
  } finally {
    loading.set(false);
  }
}

export async function logoutUser() {
  loading.set(true);
  
  try {
    await logout();
    user.set({ 
      is_authenticated: false, 
      username: '', 
      user_id: null 
    });
    
    return { success: true };
    
  } catch (error) {
    console.warn('Logout failed:', error);
    // Still clear user data even if API fails
    user.set({ 
      is_authenticated: false, 
      username: '', 
      user_id: null 
    });
    return { success: true }; // Always succeed for logout
  } finally {
    loading.set(false);
  }
}

export async function getAuth() {
  try {
    const data = await getAuthInfo();
    
    user.set({
      is_authenticated: data.IsAuthenticated,
      username: data.Username,
      user_id: data.UserID
    });
    
  } catch (error) {
    console.warn('Auth check failed:', error);
    user.set({ 
      is_authenticated: false, 
      username: '', 
      user_id: null 
    });
  }
}

export function setOfflineMode(offline) {
  if (offline) {
    user.set(OFFLINE_USER);
  } else {
    user.set({ 
      is_authenticated: false, 
      username: '', 
      user_id: null 
    });
  }
}