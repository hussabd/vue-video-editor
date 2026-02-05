import hotkeys from 'hotkeys-js';
import { onMounted, onUnmounted, computed, type Ref } from 'vue';
import { usePlaybackStore } from './usePlaybackStore';
import { useStudioStore } from './useStudioStore';
import { useTimelineStore } from './useTimelineStore';

interface UseEditorHotkeysOptions {
  timelineCanvas?: Ref<any>;
  zoomLevel?: Ref<number>;
}

export function useEditorHotkeys(options: UseEditorHotkeysOptions = {}) {
  const { toggle, state: playbackState } = usePlaybackStore();
  const { state: studioState } = useStudioStore();
  const { state: timelineState } = useTimelineStore();

  const studio = computed(() => studioState.value.studio);
  const currentTime = computed(() => playbackState.value.currentTime);

  const setupHotkeys = () => {
    // Play/Pause
    hotkeys('space', (event) => {
      // Don't toggle if we're in an input
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      event.preventDefault();
      toggle();
    });

    // Split
    hotkeys('command+b, ctrl+b', (event) => {
      event.preventDefault();
      if (studio.value) {
        // Studio expects microseconds
        const splitTime = currentTime.value * 1_000_000;
        studio.value.splitSelected(splitTime);
      }
    });

    // Delete
    hotkeys('backspace, delete', (event) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      )
        return;

      if (studio.value) {
        studio.value.deleteSelected();
      }
    });

    // Select All
    hotkeys('command+a, ctrl+a', (event) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      event.preventDefault();
      if (options.timelineCanvas?.value) {
        options.timelineCanvas.value.selectClips(
          Object.keys(timelineState.value.clips)
        );
      }
    });

    // Zoom In
    hotkeys('command+=, ctrl+=', (event) => {
      event.preventDefault();
      if (options.zoomLevel) {
        options.zoomLevel.value = Math.min(10, options.zoomLevel.value + 0.15);
      }
    });

    // Zoom Out
    hotkeys('command+-, ctrl+-', (event) => {
      event.preventDefault();
      if (options.zoomLevel) {
        options.zoomLevel.value = Math.max(0.1, options.zoomLevel.value - 0.15);
      }
    });

    // Undo
    hotkeys('command+z, ctrl+z', (event) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      event.preventDefault();
      studio.value?.undo();
    });

    // Redo
    hotkeys('command+shift+z, ctrl+shift+z, command+y, ctrl+y', (event) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      event.preventDefault();
      studio.value?.redo();
    });

    // Move Up
    hotkeys('up, shift+up', (event) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;
      event.preventDefault();
      const step = event.shiftKey ? 5 : 1;
      studio.value?.selection.move(0, -step);
    });

    // Move Down
    hotkeys('down, shift+down', (event) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;
      event.preventDefault();
      const step = event.shiftKey ? 5 : 1;
      studio.value?.selection.move(0, step);
    });

    // Move Left
    hotkeys('left, shift+left', (event) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;
      event.preventDefault();
      const step = event.shiftKey ? 5 : 1;
      studio.value?.selection.move(-step, 0);
    });

    // Move Right
    hotkeys('right, shift+right', (event) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;
      event.preventDefault();
      const step = event.shiftKey ? 5 : 1;
      studio.value?.selection.move(step, 0);
    });

    // Last Frame
    hotkeys('command+left, ctrl+left', (event) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      event.preventDefault();
      studio.value?.framePrev();
    });

    // Next Frame
    hotkeys('command+right, ctrl+right', (event) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      event.preventDefault();
      studio.value?.frameNext();
    });
  };

  const cleanupHotkeys = () => {
    hotkeys.unbind('space');
    hotkeys.unbind('command+b, ctrl+b');
    hotkeys.unbind('backspace, delete');
    hotkeys.unbind('command+a, ctrl+a');
    hotkeys.unbind('command+=, ctrl+=');
    hotkeys.unbind('command+-, ctrl+-');
    hotkeys.unbind('command+z, ctrl+z');
    hotkeys.unbind('command+shift+z, ctrl+shift+z, command+y, ctrl+y');
    hotkeys.unbind('up, shift+up');
    hotkeys.unbind('down, shift+down');
    hotkeys.unbind('left, shift+left');
    hotkeys.unbind('right, shift+right');
    hotkeys.unbind('command+left, ctrl+left');
    hotkeys.unbind('command+right, ctrl+right');
  };

  onMounted(() => {
    setupHotkeys();
  });

  onUnmounted(() => {
    cleanupHotkeys();
  });
}
