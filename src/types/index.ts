/// <reference types="@webgpu/types" />

export type PassType = 'image' | 'buffer';

export interface ShaderPass {
  id: string;
  name: string;
  type: PassType; // 'image' renders to canvas, 'buffer' creates texture
  fragmentShader: string;
  vertexShader?: string;
  channels: ShaderChannel[]; // What this pass samples from
  enabled: boolean;
  renderOrder: number;
}

export interface ShaderChannel {
  index: number; // 0-3 for iChannel0-3
  source?: string; // Buffer pass ID or external resource
  filter: 'linear' | 'nearest';
  wrap: 'clamp' | 'repeat' | 'mirror';
}

export interface RenderBuffer {
  texture: GPUTexture;
  view: GPUTextureView;
  format: GPUTextureFormat;
  size: [number, number];
  passId: string; // Which pass owns this buffer
  outputName: string; // Name of the output that created this buffer
}

export interface BufferPass {
  id: string;
  name: string;
  texture: GPUTexture;
  view: GPUTextureView;
  format: GPUTextureFormat;
  size: [number, number];
}

export interface ShaderUniforms {
  time: number;
  resolution: [number, number];
  mouse: [number, number, number, number];
  frame: number;
  timeDelta: number;
  date: [number, number, number, number]; // year, month, day, seconds
}

export interface WebGPUContext {
  device: GPUDevice;
  canvas: HTMLCanvasElement;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
}

export interface CompilationError {
  line: number;
  column: number;
  message: string;
  type: 'error' | 'warning';
}