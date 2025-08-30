# WebGPU Shader Hub

Modernized Go + Svelte application for browsing and editing WebGPU (WGSL) shaders.

## Current Architecture
- Backend: Go HTTP server (mux) serving API + HTML templates.
- Frontend: Svelte 5 single-page segments mounted into base layout (#svelte-root).
  - Browse page: dynamic search/filter (replaces legacy search.js).
  - Editor page: Svelte editor (replaces legacy editor inline logic / app.js) using legacy WebGPU core modules via an adapter.
- Legacy engine modules retained: webgpu-core.js, shader-compiler.js, buffer-manager.js, script-engine.js, visualization-engine.js, shader-workspace.js.
- Adapter layer: static/svelte/src/adapters/workspaceAdapter.js bridges legacy ShaderWorkspace to Svelte stores.

## Migration Status
Removed from layout:
- static/js/app.js
- static/js/search.js
- inline editor initialization logic

Still present (kept for incremental migration, not loaded by pages):
- shader_properties.js
- split_window.js
- state-manager.js
- ui-manager.js
- shader-crud*.js

## Building Frontend
```
cd static/svelte
npm install
npm run build   # outputs to static/svelte/dist
```
The built bundle is referenced at /static/svelte/dist/assets/app.js.

For dev hot-reload (separate port 5173):
```
npm run dev
```
(Adjust server / template if you want to load from dev origin instead of built assets.)

## Running Server
```
go run cmd/server/main.go
```
Visit:
- Browse: http://localhost:8080/
- New Shader: http://localhost:8080/new
- Existing Shader: http://localhost:8080/{id}

## Adding Features
- Add new Svelte stores/components under static/svelte/src.
- Keep separation: stores = state, adapters = legacy bridge, components = UI.

## TODO / Cleanup
- Migrate shader_properties (tags/name editing) into Svelte.
- Remove unused legacy JS once feature parity complete.
- Add syntax highlighting (e.g. use Shiki or Prism lazy load).
- Implement local draft persistence (localStorage) in editor store.

## License
MIT