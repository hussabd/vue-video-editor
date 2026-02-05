<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import { useStudioStore } from '~/composables/useStudioStore';
import { Compositor, Log } from 'openvideo';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-vue-next';
import { toast } from 'vue-sonner';


interface ExportModalProps {
  open: boolean;
}

const props = defineProps<ExportModalProps>();
const emit = defineEmits(['update:open']);

const { state: studioState } = useStudioStore();
const studio = computed(() => studioState.value.studio);

const isExporting = ref(false);
const exportProgress = ref(0);
const exportBlobUrl = ref<string | null>(null);
const exportStartTime = ref<number | null>(null);
const exportCombinator = ref<Compositor | null>(null);

const maxDuration = computed(() => studio.value?.getMaxDuration() || 0);

const resetState = () => {
  if (exportCombinator.value) {
    exportCombinator.value.destroy();
    exportCombinator.value = null;
  }
  if (exportBlobUrl.value) {
    URL.revokeObjectURL(exportBlobUrl.value);
    exportBlobUrl.value = null;
  }
  exportStartTime.value = null;
  isExporting.value = false;
  exportProgress.value = 0;
};

const handleClose = () => {
  emit('update:open', false);
  resetState();
};

watch(() => props.open, (isOpen) => {
  if (!isOpen) {
    resetState();
  } else if (!isExporting.value && !exportBlobUrl.value) {
    // Auto-start export when modal opens
    startExport();
  }
});

const startExport = async () => {
  if (!studio.value) return;

  try {
    isExporting.value = true;
    exportProgress.value = 0;
    exportBlobUrl.value = null;
    exportStartTime.value = Date.now();

    // Export current studio to JSON
    const json = studio.value.exportToJSON();

    if (!json.clips || json.clips.length === 0) {
      throw new Error('No clips to export');
    }

    // Filter out clips with empty sources (except Text, Caption, and Effect)
    const validClips = json.clips.filter((clipJSON: any) => {
      if (
        clipJSON.type === 'Text' ||
        clipJSON.type === 'Caption' ||
        clipJSON.type === 'Effect' ||
        clipJSON.type === 'Transition'
      ) {
        return true;
      }
      return clipJSON.src && clipJSON.src.trim() !== '';
    });

    if (validClips.length === 0) {
      throw new Error('No valid clips to export');
    }

    // Use default settings
    const settings = json.settings || {};
    const combinatorOpts: any = {
      width: settings.width || 1920,
      height: settings.height || 1080,
      fps: settings.fps || 30,
      bgColor: settings.bgColor || '#000000',
      videoCodec: 'avc1.42E032',
      bitrate: 10e6, // default to high
      audio: true,
    };

    const com = new Compositor(combinatorOpts);
    await com.initPixiApp();
    exportCombinator.value = com;

    com.on('OutputProgress', (v) => {
      exportProgress.value = v;
    });

    const validJson = { ...json, clips: validClips };
    await com.loadFromJSON(validJson);

    const stream = com.output();
    const blob = await new Response(stream).blob();
    const blobUrl = URL.createObjectURL(blob);
    exportBlobUrl.value = blobUrl;
    isExporting.value = false;

    // Automated completion flow
    setTimeout(() => {
      handleDownload(blobUrl);
      toast.success('Rendering complete! Your download has started.');
      setTimeout(() => {
        handleClose();
      }, 1500);
    }, 500);
  } catch (error) {
    console.error('Export error:', error);
    toast.error('Failed to export: ' + (error as Error).message);
    isExporting.value = false;
  }
};

const handleDownload = (url?: string) => {
  const downloadUrl = url || exportBlobUrl.value;
  if (!downloadUrl) return;
  
  const aEl = document.createElement('a');
  document.body.appendChild(aEl);
  aEl.setAttribute('href', downloadUrl);
  aEl.setAttribute('download', `designcombo-export-${Date.now()}.mp4`);
  aEl.setAttribute('target', '_self');
  aEl.click();
  
  setTimeout(() => {
    if (document.body.contains(aEl)) {
      document.body.removeChild(aEl);
    }
  }, 100);
};

onUnmounted(() => {
  resetState();
});

// Format helpers
const formatTime = (timeInSeconds: number) => {
  const mins = Math.floor(timeInSeconds / 60);
  const secs = Math.floor(timeInSeconds % 60);
  return `${mins}min ${secs}s`;
};

const remainingTime = computed(() => {
  if (exportProgress.value <= 0 || !exportStartTime.value) return 'preparing...';
  
  const elapsed = Date.now() - exportStartTime.value;
  const remaining = (elapsed / exportProgress.value - elapsed) / 1000;
  return formatTime(remaining);
});

const durationSec = computed(() => (maxDuration.value / 1e6).toFixed(2));
const resolution = computed(() => {
  const opts = studio.value?.getOptions();
  return opts ? `${opts.width} x ${opts.height}` : '1920 x 1080';
});
</script>

<template>
  <Dialog :open="open" @update:open="(val) => emit('update:open', val)">
    <DialogContent
      class="max-w-[480px] border-zinc-800 bg-[#0c0c0e]/95 p-0 text-white backdrop-blur-xl gap-0"
    >
      <DialogHeader class="p-8 pb-0 pt-10">
        <DialogTitle class="text-xl font-medium tracking-tight text-center">
          Exporting Composition
        </DialogTitle>
      </DialogHeader>

      <div class="flex flex-col items-center p-8 pt-6">
        <div class="mb-8 w-full rounded-2xl border border-white/5 bg-white/5 p-5 shadow-2xl backdrop-blur-md">
          <div class="grid grid-cols-2 gap-x-8 gap-y-3">
            <div class="flex justify-between text-xs">
              <span class="text-zinc-500">Duration</span>
              <span class="font-medium">{{ durationSec }}s</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-zinc-500">Video Codec</span>
              <span class="font-medium">avc</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-zinc-500">Resolution</span>
              <span class="font-medium">{{ resolution }}</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-zinc-500">Container</span>
              <span class="font-medium">MP4</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-zinc-500">Bitrate</span>
              <span class="font-medium">high</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-zinc-500">Audio Codec</span>
              <span class="font-medium">aac</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-zinc-500">Frame rate</span>
              <span class="font-medium">30 FPS</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-zinc-500">Sample Rate</span>
              <span class="font-medium">48 KHz</span>
            </div>
          </div>
        </div>

        <div class="w-full px-1">
          <div class="mb-3 flex items-center justify-between text-[13px]">
            <span class="font-medium text-zinc-300">Progress</span>
            <span class="font-mono text-zinc-400">
              {{ Math.round(exportProgress * 100) }}% • {{ remainingTime }}
            </span>
          </div>
          <div class="relative h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              class="absolute bottom-0 left-0 top-0 bg-white transition-all duration-300 ease-out"
              :style="{ width: `${exportProgress * 100}%` }"
            />
          </div>
        </div>

        <div class="mt-8 flex w-full justify-center">
          <Button
            variant="outline"
            @click="handleClose"
            class="flex h-11 items-center gap-2.5 rounded-xl border-zinc-800 bg-zinc-900/50 px-8 text-[13px] font-medium text-white transition-all hover:bg-zinc-800 hover:text-white"
          >
            <Loader2 v-if="isExporting" class="h-4 w-4 animate-spin text-zinc-400" />
            Cancel
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
