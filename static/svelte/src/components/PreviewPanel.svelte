const updatePreviewForActiveScript = (scriptId) => {
    console.log('PreviewPanel: updatePreviewForActiveScript called with scriptId:', scriptId);
    
    if (!scriptId || !workspace) {
      console.warn('PreviewPanel: No scriptId or workspace available');
      return;
    }

    console.log('PreviewPanel: About to call showBufferVisualization...');
    workspace.showBufferVisualization(scriptId, 'texture');
    console.log('PreviewPanel: showBufferVisualization called');
  };

const handleAllScriptsExecuted = () => {
    console.log('PreviewPanel: handleAllScriptsExecuted fired');
    // After all scripts run, show the active script's output in the preview
    const currentState = $editorState;
    console.log('PreviewPanel: Current editor state:', currentState);
    console.log('PreviewPanel: Active script ID:', currentState.activeScriptId);
    
    if (currentState.activeScriptId) {
      console.log('PreviewPanel: Scheduling preview update in 100ms...');
      setTimeout(() => updatePreviewForActiveScript(currentState.activeScriptId), 100);
    } else {
      console.warn('PreviewPanel: No active script ID found');
    }
  };