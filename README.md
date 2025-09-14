# Shader Stack

Go + Svelte application for browsing and editing WebGPU (WGSL) shaders.

./build_and_run.sh to build and run

This can be done manually:
1. frontend: build svelte files using npm build
2. backend: run server using go run.

Issues
======
* issues with texture dimensions
* buffer controls broken
* git hub action for npm build and host
* add default shader import for offline shaders
* how do compute shaders perform?
* should a wizard be used for creating new buffers, conditional injection based on vertext/fragment/compute?
