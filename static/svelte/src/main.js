import App from './App.svelte';

const app = new App({
  target: document.getElementById('svelte-root') || document.body,
  props: {}
});

export default app;