<script setup lang="ts">
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Download,
  Upload,
  FilePlus,
  Keyboard,
  Share2,
} from 'lucide-vue-next';
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { Icons } from '../shared/icons';
import { LogoIcons } from '../shared/logos';
import { useStudioStore } from '~/composables/useStudioStore';
import ExportModal from './ExportModal.vue';
import { Log, type IClip } from 'openvideo';
import { toast } from 'vue-sonner';
import ShortcutsModal from './ShortcutsModal.vue';

const { state: studioState } = useStudioStore();
const studio = computed(() => studioState.value.studio);

const canUndo = ref(false);
const canRedo = ref(false);
const isExportModalOpen = ref(false);
const isShortcutsModalOpen = ref(false);

// Update undo/redo state
const updateHistoryState = () => {
  if (!studio.value) return;
  // Note: studio.history might not be reactive effectively, so we force update on history events
  canUndo.value = studio.value.history.canUndo();
  canRedo.value = studio.value.history.canRedo();
};

onMounted(() => {
  if (studio.value) {
    updateHistoryState();
    studio.value.on('history:changed', updateHistoryState);
  }
  
  // Also watch for studio changes in case it initializes later
  const unwatch = useStudioStore().state.value.studio ? null : 
    (useStudioStore().state).value ? null : null; // simplified watch
});

// Since studio is a computed ref, we can watch it or just rely on the onMounted if it's already there. 
// Better approach for Vue + studio events:
const setupListeners = () => {
  if (!studio.value) return;
  studio.value.on('history:changed', updateHistoryState);
  updateHistoryState();
};

const cleanupListeners = () => {
  if (!studio.value) return;
  studio.value.off('history:changed', updateHistoryState);
};

// Watch for studio availability
import { watch } from 'vue';
watch(studio, (newStudio, oldStudio) => {
  if (oldStudio) oldStudio.off('history:changed', updateHistoryState);
  if (newStudio) {
    newStudio.on('history:changed', updateHistoryState);
    updateHistoryState();
  }
}, { immediate: true });

onUnmounted(() => {
  cleanupListeners();
});

const handleNew = () => {
  if (!studio.value) return;
  const confirmed = window.confirm(
    'Are you sure you want to start a new project? Unsaved changes will be lost.'
  );
  if (confirmed) {
    studio.value.clear();
  }
};

const handleExportJSON = () => {
  if (!studio.value) return;

  try {
    const json = studio.value.exportToJSON();
    
    // Check if there are clips
    if (!json.clips || json.clips.length === 0) {
      toast.warning('No clips to export');
      return;
    }

    const jsonString = JSON.stringify(json, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const aEl = document.createElement('a');
    document.body.appendChild(aEl);
    aEl.href = url;
    aEl.download = `project-${Date.now()}.json`;
    aEl.click();

    setTimeout(() => {
      if (document.body.contains(aEl)) {
        document.body.removeChild(aEl);
      }
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('Export to JSON error:', error);
    toast.error('Failed to export to JSON');
  }
};

const handleImportJSON = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.style.display = 'none';

  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      if (!json.clips || !Array.isArray(json.clips)) {
        throw new Error('Invalid JSON format: missing clips array');
      }

      if (!studio.value) {
        throw new Error('Studio not initialized');
      }

      // Filter out invalid clips
      const validClips = json.clips.filter((clipJSON: any) => {
        if (
          ['Text', 'Caption', 'Effect', 'Transition'].includes(clipJSON.type)
        ) {
          return true;
        }
        return clipJSON.src && clipJSON.src.trim() !== '';
      });

      if (validClips.length === 0) {
        throw new Error('No valid clips found in JSON');
      }

      const validJson = { ...json, clips: validClips };
      await studio.value.loadFromJSON(validJson);
      toast.success('Project loaded successfully');
    } catch (error) {
      console.error('Load from JSON error:', error);
      toast.error('Failed to load from JSON: ' + (error as Error).message);
    } finally {
      document.body.removeChild(input);
    }
  };

  document.body.appendChild(input);
  input.click();
};

const handleUndo = () => {
  studio.value?.undo();
};

const handleRedo = () => {
  studio.value?.redo();
};
</script>

<template>
  <header class="relative flex h-[52px] w-full shrink-0 items-center justify-between px-4 bg-card z-10 border-b">
    <!-- Left Section -->
    <div class="flex items-center gap-2">
      <div class="pointer-events-auto flex h-9 w-9 bg-primary/20 items-center justify-center rounded-md">
        <!-- Logo -->
        <LogoIcons.scenify class="w-6 h-6" />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost">File</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="w-48">
          <DropdownMenuItem @click="handleExportJSON">
            <Download class="mr-2 h-4 w-4" />
            <span>Export (to JSON)</span>
          </DropdownMenuItem>
          <DropdownMenuItem @click="handleImportJSON">
            <Upload class="mr-2 h-4 w-4" />
            <span>Import from JSON</span>
          </DropdownMenuItem>
          <DropdownMenuItem @click="handleNew">
            <FilePlus class="mr-2 h-4 w-4" />
            <span>Clear or New project</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div class="pointer-events-auto flex h-10 items-center px-1.5">
        <Button
          variant="ghost"
          size="icon"
          :disabled="!canUndo"
          @click="handleUndo"
        >
          <Icons.undo class="size-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          :disabled="!canRedo"
          @click="handleRedo"
          class="text-muted-foreground"
        >
          <Icons.redo class="size-5" />
        </Button>
      </div>
    </div>

    <!-- Center Section -->
    <div class="absolute text-sm font-medium left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      Untitled video
    </div>

    <!-- Right Section -->
    <div class="flex items-center gap-2">
      <div class="flex items-center mr-2">
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8 text-muted-foreground hover:text-foreground"
          @click="isShortcutsModalOpen = true"
        >
          <Keyboard class="size-5" />
        </Button>
      </div>
      
      <a href="https://discord.gg/SCfMrQx8kr" target="_blank">
        <Button class="h-7 rounded-lg" variant="outline">
          <LogoIcons.discord class="w-6 h-6 mr-2" />
          <span class="hidden md:block">Join Us</span>
        </Button>
      </a>

      <Button
        class="flex h-7 gap-1 border border-border"
        variant="outline"
        size="sm"
      >
        <Share2 class="w-4 h-4 mr-1" />
        <span class="hidden md:block">Share</span>
      </Button>
      <Button
        size="sm"
        class="gap-2 rounded-full"
        @click="isExportModalOpen = true"
      >
        Download
      </Button>

      <ExportModal :open="isExportModalOpen" @update:open="isExportModalOpen = $event" />
      <ShortcutsModal :open="isShortcutsModalOpen" @update:open="isShortcutsModalOpen = $event" />
    </div>
  </header>
</template>
