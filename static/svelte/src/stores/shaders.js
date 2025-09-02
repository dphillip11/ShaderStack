import { get, writable } from 'svelte/store';
import { filters } from './search.js';
import { isOffline } from './user.js';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api.js';

export const shaders = writable([]);

const STORAGE_KEY = 'webgpu_shaders';

async function loadShadersLocal(){
  // Load shaders from local storage
  const storedShaders = localStorage.getItem(STORAGE_KEY);
  if (storedShaders) {
    shaders.set(JSON.parse(storedShaders));
  }
}

async function loadShadersRemote(){
  const params = new URLSearchParams(filters);
  const queryString = params.toString();
  const url = `/api/shaders${queryString ? '?' + queryString : ''}`;
  shaders.set(await apiGet(url));
}

function getNextIdLocal(){
  // Get the next available shader ID
  const shaders = get(shaders);
  if (shaders.length === 0) {
    return 1;
  }
  const maxId = Math.max(...shaders.map(shader => shader.shaderID));
  return maxId + 1;
}

async function updateShaderLocal(shader){
  if (!shader.id)
  {
    const id = getNextIdLocal();
    shader.id = id;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(get(shaders)));
  }
}

async function updateShaderRemote(shader){
  if (!shader.id)
  {
    const response = await apiPost(`/api/shaders`, shader);
    shader.id = response.id;
  }
  else
  {
    await apiPut(`/api/shaders/${shader.id}`, shader);
  }
}

async function deleteShaderLocal(shaderID){
  const shaders = get(shaders);
  const updatedShaders = shaders.filter(shader => shader.id !== shaderID);
  shaders.set(updatedShaders);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedShaders));
}

async function deleteShaderRemote(shaderID){
  await apiDelete(`/api/shaders/${shaderID}`);
  const shaders = get(shaders);
  const updatedShaders = shaders.filter(shader => shader.id !== shaderID);
  shaders.set(updatedShaders);
}

export function LoadShaders() {
  if (get(isOffline)) {
    loadShadersLocal();
  } else {
    loadShadersRemote();
  }
}

export function UpdateShader() {
  if (get(isOffline)) {
    return updateShaderLocal(shader);
  } else {
    return updateShaderRemote(shader);
  }
}

export function DeleteShader(shaderID) {
  if (get(isOffline)) {
    return deleteShaderLocal(shaderID);
  } else {
    return deleteShaderRemote(shaderID);
  }
}

// Auto-fetch shaders when filters change
let searchTimeout;

// dont bother filtering if offline
filters.subscribe($filters => {
  if (get(isOffline)){ return; }
  // Debounce API calls to avoid too many requests during typing
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    LoadShaders();
  }, 300); // 300ms debounce
});
