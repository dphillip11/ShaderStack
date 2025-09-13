import { get, writable } from 'svelte/store';
import { filters } from './search.js';
import { isOffline } from './user.js';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api.js';

export const shaders = writable([]);

const STORAGE_KEY = 'webgpu_shaders';

async function loadShadersLocal(){
  // Load shaders from local storage
  const storedShaders = localStorage.getItem(STORAGE_KEY);
  debugger;
  if (storedShaders) {
    shaders.set(JSON.parse(storedShaders));
  }
}

async function loadShadersRemote(){
  const params = new URLSearchParams(get(filters));
  const queryString = params.toString();
  const url = `/api/shaders${queryString ? '?' + queryString : ''}`;
  console.log("Fetching shaders from:", url);
  shaders.set(await apiGet(url));
}

function getNextIdLocal(){
  // Get the next available shader ID
  const existingShaders = get(shaders);
  if (existingShaders.length === 0) {
    return 1;
  }
  const maxId = Math.max(...existingShaders.map(shader => shader.id));
  return maxId + 1;
}

async function updateShaderLocal(shader){
  if (!shader.id)
  {
    debugger;
    const id = getNextIdLocal();
    shader.id = id;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(get(shaders)));
  }
}

async function updateShaderRemote(shader){
  if (!shader.id)
  {
    debugger;
    const response = await apiPost(`/api/shaders`, shader);
    shader.id = response.id;
  }
  else
  {
    await apiPut(`/api/shaders/${shader.id}`, shader);
  }
}

async function deleteShaderLocal(shaderID){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedShaders));
}

async function deleteShaderRemote(shaderID){
  await apiDelete(`/api/shaders/${shaderID}`);
}

export function LoadShaders() {
  console.log("Loading shaders...", get(isOffline));
  if (get(isOffline)) {
    loadShadersLocal();
  } else {
    loadShadersRemote();
  }
}

export function UpdateShader(shader) {
  var updatedShaders = get(shaders);
  const existingShader = updatedShaders.find(s => s.id === shader.id);
  if (existingShader) {
      Object.assign(existingShader, shader);
  } else {
      updatedShaders.push(shader);
  }
  debugger;
  shaders.set(updatedShaders);

  if (get(isOffline)) {
    updateShaderLocal(shader);
  } else {
    updateShaderRemote(shader);
  }
}

export function DeleteShader(shaderID) {
  const shaders = get(shaders);
  const updatedShaders = shaders.filter(shader => shader.id !== shaderID);
  shaders.set(updatedShaders);

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

isOffline.subscribe($isOffline => {
  LoadShaders();
});
