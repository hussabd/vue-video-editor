<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useStudioStore } from '~/composables/useStudioStore';
import {
  Image,
  Video,
  Audio,
  Log,
  Placeholder,
  clipToJSON,
  type IClip as StudioClip,
} from 'openvideo';
import {
  Upload,
  Film,
  Search,
  X,
  HardDrive,
  Trash2,
  Music,
  Loader2,
} from 'lucide-vue-next';
import {
  storageService,
  type StorageStats,
} from '~/lib/storage/storage-service';
import type { MediaFile, MediaType } from '~/types/media';
import { uploadFile } from '~/lib/upload-utils';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Button } from '@/components/ui/button';
import { toast } from 'vue-sonner';

interface VisualAsset {
  id: string;
  type: MediaType;
  src: string;
  name: string;
  preview?: string;
  width?: number;
  height?: number;
  duration?: number;
  size?: number;
}

const STORAGE_KEY = 'designcombo_uploads';
const PROJECT_ID = 'local-uploads';
const { state: studioState } = useStudioStore();

const searchQuery = ref('');
const uploads = ref<VisualAsset[]>([]);
const isUploading = ref(false);
const storageStats = ref<StorageStats | null>(null);
const isLoaded = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

// Detect file type from MIME type and extension
function detectFileType(file: File): MediaType {
  const mime = file.type.toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (
    mime.startsWith('audio/') ||
    ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)
  ) {
    return 'audio';
  }
  if (
    mime.startsWith('video/') ||
    ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)
  ) {
    return 'video';
  }
  return 'image';
}

// Helper to format duration like 00:00
function formatDuration(seconds?: number) {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const getFileMetadata = (fileOrUrl: File | string, type: MediaType): Promise<{ width?: number; height?: number; duration?: number }> => {
  return new Promise((resolve) => {
    const isUrl = typeof fileOrUrl === 'string';
    const url = isUrl ? fileOrUrl : URL.createObjectURL(fileOrUrl);
    
    if (type === 'image') {
      const img = new window.Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        if (!isUrl) URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        resolve({});
        if (!isUrl) URL.revokeObjectURL(url);
      };
      img.src = url;
    } else if (type === 'video' || type === 'audio') {
      const el = document.createElement(type === 'video' ? 'video' : 'audio');
      el.preload = 'metadata';
      el.onloadedmetadata = () => {
        const metadata: any = { duration: el.duration };
        if (type === 'video') {
          metadata.width = (el as HTMLVideoElement).videoWidth;
          metadata.height = (el as HTMLVideoElement).videoHeight;
        }
        resolve(metadata);
        if (!isUrl) URL.revokeObjectURL(url);
      };
      el.onerror = () => {
        resolve({});
        if (!isUrl) URL.revokeObjectURL(url);
      };
      el.src = url;
    } else {
      resolve({});
      if (!isUrl) URL.revokeObjectURL(url);
    }
  });
};

const loadStorageStats = async () => {
  const stats = await storageService.getStorageStats();
  storageStats.value = stats;
};

// Recover uploads from OPFS on mount
onMounted(() => {
  const recoverFromOPFS = async () => {
    try {
      if (!storageService.isOPFSSupported()) {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          uploads.value = JSON.parse(stored);
        }
        isLoaded.value = true;
        return;
      }

      const opfsFiles = await storageService.loadAllMediaFiles({
        projectId: PROJECT_ID,
      });

      if (opfsFiles.length === 0) {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          uploads.value = JSON.parse(stored);
        }
        isLoaded.value = true;
        await loadStorageStats();
        return;
      }

      const oldEntries: VisualAsset[] = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || '[]'
      );
      const urlMapping: Record<string, string> = {};

      const recoveredAssets: VisualAsset[] = opfsFiles.map((file) => {
        const newBlobUrl = file.url || URL.createObjectURL(file.file);
        const oldEntry = oldEntries.find(
          (e) => e.id === file.id || e.name === file.name
        );

        if (oldEntry?.src && oldEntry.src !== newBlobUrl) {
          urlMapping[oldEntry.src] = newBlobUrl;
        }

        const isR2Url = oldEntry?.src && !oldEntry.src.startsWith('blob:');
        const finalUrl = isR2Url ? oldEntry.src! : newBlobUrl;

        return {
          id: file.id,
          name: file.name,
          src: finalUrl,
          type: file.type,
          width: file.width,
          height: file.height,
          duration: file.duration,
        };
      });

      // Update studio clips with new blob URLs
      const studio = studioState.value.studio;
      if (Object.keys(urlMapping).length > 0 && studio) {
        try {
          const serializedClips = studio.clips.map((clip) =>
            clipToJSON(clip as unknown as StudioClip)
          );
          
          let updatedJson = JSON.stringify(serializedClips);
          let hasChanges = false;
          for (const [oldUrl, newUrl] of Object.entries(urlMapping)) {
            if (updatedJson.includes(oldUrl)) {
              updatedJson = updatedJson.split(oldUrl).join(newUrl);
              hasChanges = true;
            }
          }

          if (hasChanges) {
            const updatedClips = JSON.parse(updatedJson);
            await studio.loadFromJSON({ clips: updatedClips });
            Log.info('Updated studio clips with new blob URLs');
          }
        } catch (error) {
          Log.warn('Failed to update timeline URLs:', error);
        }
      }

      uploads.value = recoveredAssets;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recoveredAssets));
      await loadStorageStats();
    } catch (error) {
      console.error('Failed to recover uploads from OPFS:', error);
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        uploads.value = JSON.parse(stored);
      }
    } finally {
      isLoaded.value = true;
    }
  };

  recoverFromOPFS();
});

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (!files || files.length === 0) return;

  isUploading.value = true;
  const newAssets: VisualAsset[] = [];

  try {
    for (const file of Array.from(files)) {
      const id = crypto.randomUUID();
      const type = detectFileType(file);

      // 0. Get metadata
      const metadata = await getFileMetadata(file, type);

      // 1. Upload to R2
      let uploadResult;
      try {
        uploadResult = await uploadFile(file);
      } catch (error) {
        console.error('R2 upload failed, falling back to local only:', error);
      }

      const src = uploadResult?.url || URL.createObjectURL(file);

      // 2. Save to OPFS if supported
      if (storageService.isOPFSSupported()) {
        const mediaFile: MediaFile = {
          id,
          file,
          name: file.name,
          type,
          url: src,
          ...metadata,
        };
        await storageService.saveMediaFile({
          projectId: PROJECT_ID,
          mediaItem: mediaFile,
        });
      }

      newAssets.push({
        id,
        name: file.name,
        src: src,
        type,
        size: file.size,
        ...metadata,
      });
    }

    const updated = [...newAssets, ...uploads.value];
    uploads.value = updated;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    await loadStorageStats();
    toast.success(`Successfully uploaded ${newAssets.length} file(s)`);
  } catch (error) {
    console.error('Upload failed:', error);
    toast.error('Upload failed. Please try again.');
  } finally {
    isUploading.value = false;
    if (fileInput.value) {
      fileInput.value.value = '';
    }
  }
};

const handleDelete = async (id: string) => {
  try {
    if (storageService.isOPFSSupported()) {
      await storageService.deleteMediaFile({
        projectId: PROJECT_ID,
        id,
      });
    }

    const updated = uploads.value.filter((a) => a.id !== id);
    uploads.value = updated;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    await loadStorageStats();
    toast.success('File deleted');
  } catch (error) {
    console.error('Failed to delete upload:', error);
    toast.error('Failed to delete file');
  }
};

const addItemToCanvas = async (asset: VisualAsset) => {
  const studio = studioState.value.studio;
  if (!studio) return;

  try {
    const src = asset.src;
    const clipName = asset.name;

    // Use current asset metadata or try to extract it from URL
    let width = asset.width;
    let height = asset.height;
    let duration = asset.duration;

    if (!width || !height || !duration) {
      const meta = await getFileMetadata(src, asset.type);
      width = width || meta.width;
      height = height || meta.height;
      duration = duration || meta.duration;
    }

    // 1. Create and add placeholder immediately
    const placeholder = new Placeholder(
      src,
      {
        width: width || 1280,
        height: height || 720,
        duration: (duration || 5) * 1e6,
      },
      asset.type === 'image' ? 'Image' : asset.type === 'audio' ? 'Audio' : 'Video'
    );
    placeholder.name = clipName;

    await studio.addClip(placeholder);

    if (asset.type !== 'audio') {
      await studio.scaleToFit(placeholder);
      await studio.centerClip(placeholder);
    }

    // 2. Load the real clip in the background
    let loader;
    if (asset.type === 'image') {
      loader = Image.fromUrl(src);
    } else if (asset.type === 'audio') {
      loader = Audio.fromUrl(src);
    } else {
      loader = Video.fromUrl(src);
    }

    loader
      .then(async (realClip: any) => {
        realClip.name = clipName;

        // 3. Replace all placeholders with this source once loaded
        await (studio.timeline as any).replaceClipsBySource(src, async (oldClip: any) => {
          const clone = await realClip.clone();
          clone.id = oldClip.id;
          clone.name = oldClip.name;
          clone.left = oldClip.left;
          clone.top = oldClip.top;
          clone.width = oldClip.width;
          clone.height = oldClip.height;
          clone.display = { ...oldClip.display };
          clone.zIndex = oldClip.zIndex;

          if (asset.type === 'audio' || asset.type === 'video') {
            const realDuration = realClip.meta.duration;
            const newTrim = { ...oldClip.trim };
            newTrim.to = Math.max(newTrim.to, realDuration);
            newTrim.from = Math.min(newTrim.from, newTrim.to);
            clone.trim = newTrim;
            clone.duration = (newTrim.to - newTrim.from) / clone.playbackRate;
            clone.display.to = clone.display.from + clone.duration;
          }

          return clone;
        });
      })
      .catch((err) => {
        Log.error('Failed to load asset in background:', err);
      });

  } catch (error) {
    Log.error(`Failed to add ${asset.type}:`, error);
    toast.error(`Failed to add ${asset.type} to canvas`);
  }
};

const filteredAssets = computed(() =>
  uploads.value.filter((asset) =>
    asset.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
);

const onFileClick = () => {
  fileInput.value?.click();
};
</script>

<template>
  <div class="h-full flex flex-col">
    <input
      type="file"
      ref="fileInput"
      class="hidden"
      accept="image/*,video/*,audio/*"
      multiple
      @change="handleFileUpload"
    />

    <div v-if="uploads.length > 0">
      <div class="flex-1 p-4 flex gap-2">
        <InputGroup>
          <InputGroupAddon class="bg-secondary/30 pointer-events-none text-muted-foreground w-8 justify-center">
            <Search :size="14" />
          </InputGroupAddon>
          <InputGroupInput
            v-model="searchQuery"
            placeholder="Search uploads..."
            class="bg-secondary/30 border-0 h-full text-xs box-border pl-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </InputGroup>
        <Button
          @click="onFileClick"
          :disabled="isUploading"
          variant="outline"
        >
          <Loader2 v-if="isUploading" class="animate-spin size-4" />
          <Upload v-else :size="14" />
        </Button>
      </div>
    </div>
    <div v-else>
      <div class="flex-1 p-4 flex gap-2">
        <Button
          @click="onFileClick"
          :disabled="isUploading"
          variant="outline"
          class="w-full"
        >
          <Loader2 v-if="isUploading" class="animate-spin size-4 mr-2" />
          <Upload v-else :size="14" class="mr-2" />
          Upload
        </Button>
      </div>
    </div>

    <div class="flex-1 px-4 overflow-y-auto min-h-0">
      <div v-if="!isLoaded" class="h-full flex items-center justify-center">
        <div class="flex flex-col items-center gap-2">
          <Loader2 class="animate-spin text-muted-foreground" :size="24" />
          <span class="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>

      <div v-else-if="filteredAssets.length === 0" class="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
        <Upload :size="32" class="opacity-50" />
        <span class="text-sm">
          {{ uploads.length === 0 ? 'No uploads yet' : 'No matches found' }}
        </span>
      </div>

      <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-x-3 gap-y-4">
        <div
          v-for="asset in filteredAssets"
          :key="asset.id"
          class="flex flex-col gap-1.5 group cursor-pointer"
          @click="addItemToCanvas(asset)"
        >
          <div class="relative aspect-square rounded-sm overflow-hidden bg-foreground/20 border border-transparent group-hover:border-primary/50 transition-all flex items-center justify-center">
            <img v-if="asset.type === 'image'"
              :src="asset.src"
              :alt="asset.name"
              class="max-w-full max-h-full object-contain"
            />
            <div v-else-if="asset.type === 'audio'" class="w-full h-full flex items-center justify-center relative">
              <Music
                class="text-[#2dc28c]"
                :size="32"
                fill="#2dc28c"
                :fill-opacity="0.2"
              />
            </div>
            <div v-else class="w-full h-full flex items-center justify-center bg-black/40 relative">
              <video
                :src="asset.src"
                class="max-w-full max-h-full object-contain pointer-events-none"
                muted
                @mouseover="(e) => (e.currentTarget as HTMLVideoElement).play()"
                @mouseout="(e) => {
                  (e.currentTarget as HTMLVideoElement).pause();
                  (e.currentTarget as HTMLVideoElement).currentTime = 0;
                }"
              />
            </div>

            <div v-if="asset.duration" class="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-white font-medium">
              {{ formatDuration(asset.duration) }}
            </div>

            <button
              type="button"
              class="absolute top-1 right-1 p-1 rounded bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
              @click.stop="handleDelete(asset.id)"
            >
              <Trash2 :size="12" class="text-white" />
            </button>
          </div>
          <p class="text-[10px] text-muted-foreground group-hover:text-foreground truncate transition-colors px-0.5">
            {{ asset.name }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
