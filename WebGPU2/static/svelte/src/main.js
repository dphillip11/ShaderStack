import App from './App.svelte';
import AuthBar from './components/AuthBar.svelte';

const app = new App({
  target: document.getElementById('svelte-root') || document.body,
  props: {}
});

if (document.getElementById('auth-root')) {
  new AuthBar({ target: document.getElementById('auth-root') });
}

export default app;