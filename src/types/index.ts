/// <reference types="@webgpu/types" />

export interface ShaderPass {
  id: string;
  name: string;
  fragmentShader: string;
  vertexShader?: string;
  inputs: ShaderInput[];
  outputs: ShaderOutput[];
  enabled: boolean;
}

export interface ShaderInput {
  type: 'buffer' | 'texture' | 'cubemap';
  name: string;
  source?: string; // Reference to another pass or external resource
  filter: 'linear' | 'nearest';
  wrap: 'clamp' | 'repeat' | 'mirror';
}

export interface ShaderOutput {
  name: string;
  format: GPUTextureFormat;
  size?: [number, number]; // If not specified, uses canvas size
}

export interface RenderBuffer {
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