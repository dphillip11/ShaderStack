# WebGPU Shader Editor

A modern WebGPU-based shader editor similar to Shadertoy, featuring real-time WGSL shader compilation, multipass rendering, and an intuitive code editor interface.

## Features

- 🎨 **Real-time Shader Editor** - CodeMirror-based editor with syntax highlighting
- ⚡ **WebGPU Rendering** - High-performance GPU-accelerated rendering
- 🔄 **Multipass Support** - Configure multiple render passes with buffers and textures
- 🛠️ **WGSL Compilation** - Real-time shader compilation with error reporting
- 📱 **Responsive Design** - Works on desktop and mobile devices
- 🎮 **Interactive Controls** - Mouse input and animation controls

## Prerequisites

- A WebGPU-compatible browser (Chrome 113+, Edge 113+, Firefox with WebGPU enabled)
- Modern browser with ES2020+ support

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser** to the URL shown in the terminal (typically `http://localhost:5173`)

## Project Structure

```
src/
├── components/
│   ├── editor/           # Shader code editor components
│   ├── renderer/         # WebGPU rendering engine
│   └── ui/              # User interface controls
├── shaders/             # Default WGSL shader files
├── types/               # TypeScript type definitions
├── utils/               # WebGPU utilities and compiler
└── main.ts              # Main application entry point
```

## Usage

### Basic Shader Editing

1. The editor loads with a default animated shader
2. Modify the WGSL fragment shader code in the left panel
3. The preview updates in real-time as you type
4. Compilation errors are shown in the controls panel

### Multipass Rendering

1. Click "Add Pass" to create additional render passes
2. Configure inputs and outputs for each pass
3. Toggle passes on/off to see the effect
4. Use outputs from one pass as inputs to another

### Shader Uniforms

The following uniforms are automatically provided to your shaders:

```wgsl
struct Uniforms {
  time: f32,           // Time in seconds since start
  resolution: vec2<f32>, // Canvas resolution
  mouse: vec4<f32>,    // Mouse position (xy: current, zw: click)
  frame: f32,          // Frame counter
}
```

### Example Shader

```wgsl
@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let fragCoord = uv * uniforms.resolution;
  
  // Simple animated gradient
  let col = 0.5 + 0.5 * cos(uniforms.time + uv.xyx + vec3<f32>(0.0, 2.0, 4.0));
  
  return vec4<f32>(col, 1.0);
}
```

## WebGPU Support

This project requires WebGPU support. Check browser compatibility:

- **Chrome/Edge 113+**: Enabled by default
- **Firefox**: Enable `dom.webgpu.enabled` in `about:config`
- **Safari**: WebGPU support coming soon

## Development

### Building for Production

```bash
npm run build
```

### Type Checking

```bash
npm run tsc
```

### Preview Production Build

```bash
npm run preview
```

## Technical Details

### WebGPU Pipeline

1. **Initialization**: Set up WebGPU device and canvas context
2. **Shader Compilation**: Compile WGSL shaders with error handling
3. **Buffer Management**: Create and manage vertex/uniform buffers
4. **Render Loop**: Execute render passes and present to canvas

### Architecture

- **Modular Design**: Separate components for editing, rendering, and UI
- **Type Safety**: Full TypeScript support with comprehensive types
- **Error Handling**: Robust error reporting for shader compilation
- **Performance**: Optimized rendering loop with proper resource management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Resources

- [WebGPU Specification](https://gpuweb.github.io/gpuweb/)
- [WGSL Language Specification](https://gpuweb.github.io/gpuweb/wgsl/)
- [Shadertoy](https://www.shadertoy.com/) - Inspiration for this project