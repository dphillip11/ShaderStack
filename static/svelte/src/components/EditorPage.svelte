<script>
  import SplitPanel from './SplitPanel.svelte';
  import ConsolePanel from './editor/ConsolePanel.svelte';
  import PreviewPanel from './editor/PreviewPanel.svelte';
</script>

<SplitPanel>
  <div slot="left" style="height:200px; margin:10px; border: solid 1px; margin-right:none; padding: 10px;">
      <h1>Left Content</h1>
  </div>
  <div slot="right">
      <PreviewPanel/>
      <ConsolePanel/>
  </div>
</SplitPanel>