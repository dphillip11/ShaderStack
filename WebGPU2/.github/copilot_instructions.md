examine the repo and try to understand the functionality, there is a go backend that serves shaders and a svelte frontend /Users/daniel/Repositories/WebGPU/WebGPU2/static/svelte.

I am now focussing on the editor page /Users/daniel/Repositories/WebGPU/WebGPU2/static/svelte/src/components/EditorPage.svelte

The goal is to be able to write multiple shader scripts in a tabbed editor and visualise or sample their buffer outputs

A preview panel should show a visualisation of the active buffer based on the active script/tab.

Each script should be able to sample from any buffer.

When compile is pressed any compilation errors should be output to the console element. Any errors on the current script should be visible in the code editor.

When play is pressed each of the scripts should be run sequentially and the preview panel should be updated based on the active tab/script.

Some code should be injected so the user does not have to write boilerplate code including the uniforms for mouse position and time and the textures/buffers and samplers for each of the scripts.

The uniforms should be updated per frame as should the buffers ased on their scripts.

We should maintain clean abstractions and responsibilities for each script or component.