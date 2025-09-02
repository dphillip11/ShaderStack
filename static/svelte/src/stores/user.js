
import { NO_USER, OFFLINE_USER } from "../constants";
import {writable, derived} from 'svelte/store';
import { apiGet, apiPost } from '../utils/api.js';

export const user = writable(NO_USER);
export const isOffline = derived(user, $user => $user.is_authenticated);

export function workOffline()
{
    user.set(OFFLINE_USER);
}

export async function login(username, password) {
    user.set(await apiPost('/api/login', { username, password }));
}

export async function register(username, password) {
    user.set(await apiPost('/api/register', { username, password }));
}

export async function getAuthInfo() {
    try {
        user.set(await apiGet('/api/auth'));
    } catch (error) {
        user.set(OFFLINE_USER);
    }
}

export async function logout() {
    user.set(NO_USER);
    return apiPost('/api/logout', {});
}