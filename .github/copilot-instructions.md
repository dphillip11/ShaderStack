<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# WebGPU Shader Editor Instructions

This is a WebGPU shader editor project similar to Shadertoy. The project includes:

- WebGPU-based rendering engine
- Shader code editor with syntax highlighting
- Multipass rendering support with buffers and textures
- Real-time compilation and preview

## Key Technologies
- TypeScript with Vite for build tooling
- WebGPU API for GPU computation and rendering
- CodeMirror for shader code editing
- WGSL (WebGPU Shading Language) for shaders

## Project Structure
- `src/components/` - Core components (editor, renderer, UI)
- `src/shaders/` - WGSL shader files
- `src/utils/` - WebGPU utilities and helpers
- `src/types/` - TypeScript type definitions

## Development Guidelines
- Use modern WebGPU APIs and follow best practices
- Implement proper error handling for shader compilation
- Support multiple render passes and buffer management
- Focus on performance and real-time rendering