# Shader Stack

Go + Svelte application for browsing and editing WebGPU (WGSL) shaders.

./build_and_run.sh to build and run

This can be done manually:
1. frontend: build svelte files using npm build
2. backend: run server using go run.

Issues
======
* delete on browse page does not refresh screen
* no registration option on login dialog
* could be made to work with local storage when backend connection not available
* why do the texture dimensions not affect the output
* how do compute shaders perform
* back and and front end mixing responsibility
* should a wizard be used for creating new buffers, conditional injection based on vertext/fragment/compute
