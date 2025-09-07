<script>
  import SplitPanel from './SplitPanel.svelte';
  import CodeEditor from './editor/CodeEditor.svelte';
  import ConsolePanel from './editor/ConsolePanel.svelte';
  import PreviewPanel from './editor/PreviewPanel.svelte';
  import ScriptTabs from './editor/ScriptTabs.svelte';
</script>

<SplitPanel>
  <div slot="left">
      <ScriptTabs/>
      <CodeEditor/>
  </div>
  <div slot="right">
      <PreviewPanel/>
      <ConsolePanel/>
  </div>
</SplitPanel>