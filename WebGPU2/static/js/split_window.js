document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-controller="split-window"]').forEach(container => {
      const vertical = container.classList.contains('vertical');
      const handle = container.querySelector('[data-resize-handle]');
      const paneA = container.querySelector('[data-pane="left"]');
      const paneB = container.querySelector('[data-pane="right"]');
  
      let isDragging = false;
  
      const startDrag = () => {
        isDragging = true;
        document.body.style.cursor = vertical ? 'row-resize' : 'col-resize';
      };
  
      const stopDrag = () => {
        isDragging = false;
        document.body.style.cursor = '';
      };
  
      const onDrag = (e) => {
        if (!isDragging) return;
        const rect = container.getBoundingClientRect();
        if (vertical) {
          const offset = e.clientY - rect.top;
          const total = rect.height;
          const percent = (offset / total) * 100;
          paneA.style.height = `${percent}%`;
          paneB.style.height = `${100 - percent}%`;
        } else {
          const offset = e.clientX - rect.left;
          const total = rect.width;
          const percent = (offset / total) * 100;
          paneA.style.width = `${percent}%`;
          paneB.style.width = `${100 - percent}%`;
        }
      };
  
      handle.addEventListener('mousedown', startDrag);
      window.addEventListener('mousemove', onDrag);
      window.addEventListener('mouseup', stopDrag);
    });
  });
  