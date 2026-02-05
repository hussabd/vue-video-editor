<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { useStudioStore } from '~/composables/useStudioStore';
import { fontManager, jsonToClip, Log } from 'openvideo';
import { generateCaptionClips } from '~/utils/caption-generator';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Loader2, Play, Trash2 } from 'lucide-vue-next';
import { usePlaybackStore } from '~/composables/usePlaybackStore';

const { state: studioState } = useStudioStore();
const { state: playbackState, seek } = usePlaybackStore();

const studio = computed(() => studioState.value.studio);
const mediaItems = ref<any[]>([]);
const captionItems = ref<any[]>([]);
const isGenerating = ref(false);
const activeCaptionId = ref<string | null>(null);

// Format time utility
const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const hh = h > 0 ? `${h.toString().padStart(2, '0')}:` : '';
  const mm = m.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');

  return `${hh}${mm}:${ss}`;
};

const updateClips = () => {
  if (!studio.value) return;
  const tracks = studio.value.getTracks();
  const allClips: any[] = [];
  tracks.forEach((track: any) => {
    track.clipIds.forEach((id: string) => {
      const clip = studio.value?.getClipById(id);
      if (clip) allClips.push(clip);
    });
  });

  const mediaClips = allClips.filter(
    (clip) => clip.type === 'Video' || clip.type === 'Audio'
  );
  mediaItems.value = mediaClips;

  // Find all captions
  const captions = allClips.filter((clip) => clip.type === 'Caption');
  const sorted = captions.sort(
    (a, b) => a.display.from - b.display.from
  );
  captionItems.value = sorted;
};

// Listen for studio events
const startListening = () => {
  if (!studio.value) return;
  const s = studio.value;
  s.on('clip:added', updateClips);
  s.on('clip:removed', updateClips);
  s.on('clip:updated', updateClips);
};

const stopListening = () => {
  if (!studio.value) return;
  const s = studio.value;
  s.off('clip:added', updateClips);
  s.off('clip:removed', updateClips);
  s.off('clip:updated', updateClips);
};

onMounted(() => {
  updateClips();
  startListening();
});

onUnmounted(() => {
  stopListening();
});

watch(() => studio.value, (newStudio, oldStudio) => {
  if (oldStudio) {
    oldStudio.off('clip:added', updateClips);
    oldStudio.off('clip:removed', updateClips);
    oldStudio.off('clip:updated', updateClips);
  }
  if (newStudio) {
    startListening();
    updateClips();
  }
});

// Watch current time to highlight active caption
watch(() => playbackState.value.currentTime, (currentTime) => {
  const currentTimeMs = currentTime * 1_000_000;
  const activeItem = captionItems.value.find(
    (item) =>
      currentTimeMs >= item.display.from && currentTimeMs < item.display.to
  );
  activeCaptionId.value = activeItem ? activeItem.id : null;
});

const handleGenerateCaptions = async () => {
  if (!studio.value || mediaItems.value.length === 0) return;

  isGenerating.value = true;
  try {
    const fontName = 'Bangers-Regular';
    const fontUrl =
      'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf';

    await fontManager.addFont({
      name: fontName,
      url: fontUrl,
    });

    const captionTrackId = `track_captions_${Date.now()}`;
    const clipsToAdd: any[] = [];

    for (const mediaClip of mediaItems.value) {
      try {
        // 1. Get transcription
        const audioUrl = mediaClip.src;
        if (!audioUrl) continue;

        const transcribeResponse = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: audioUrl, model: 'nova-3' }),
        });

        if (!transcribeResponse.ok) {
          Log.error(`Transcription failed for media ${mediaClip.id}`);
          continue;
        }

        const transcriptionData = await transcribeResponse.json();
        if (!transcriptionData) continue;

        const words =
          transcriptionData.results?.main?.words ||
          transcriptionData.words ||
          [];

        // 2. Generate caption JSON
        const captionClipsJSON = await generateCaptionClips({
          videoWidth: studio.value.opts.width,
          videoHeight: studio.value.opts.height,
          words,
        });

        // 3. Prepare clips
        for (const json of captionClipsJSON) {
          const enrichedJson = {
            ...json,
            mediaId: mediaClip.id,
            metadata: {
              ...json.metadata,
              sourceClipId: mediaClip.id,
            },
            display: {
              from: json.display.from + mediaClip.display.from,
              to: json.display.to + mediaClip.display.from,
            },
          };
          const clip = await jsonToClip(enrichedJson);
          clipsToAdd.push(clip);
        }
      } catch (error) {
        Log.error(`Failed to process media ${mediaClip.id}:`, error);
      }
    }

    if (clipsToAdd.length > 0) {
      await studio.value.addClip(clipsToAdd, { trackId: captionTrackId });
      updateClips();
    }
  } catch (error) {
    Log.error('Failed to generate captions:', error);
  } finally {
    isGenerating.value = false;
  }
};

const normalizeWordTimings = (words: any[]) => {
  let currentTime = 0;
  return words.map((word) => {
    const duration = word.to - word.from;
    const newWord = {
      ...word,
      from: currentTime,
      to: currentTime + duration,
    };
    currentTime += duration;
    return newWord;
  });
};

const handleSplitCaption = async (id: string, cursorPosition: number, fullText: string) => {
  if (!studio.value) return;

  const clip = studio.value.getClipById(id);
  if (!clip) return;

  const trackId = studio.value.findTrackIdByClipId(id);
  if (!trackId) return;

  const wordsInText: { text: string; start: number; end: number }[] = [];
  const regex = /\S+/g;
  let match;
  while ((match = regex.exec(fullText)) !== null) {
    wordsInText.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  let splitWordIndex = -1;
  for (let i = 0; i < wordsInText.length; i++) {
    if (cursorPosition <= wordsInText[i].start) {
      splitWordIndex = i;
      break;
    }
    if (cursorPosition < wordsInText[i].end) {
      splitWordIndex = i;
      break;
    }
  }

  if (splitWordIndex <= 0) return;

  const part1Text = wordsInText
    .slice(0, splitWordIndex)
    .map((w) => w.text)
    .join(' ');
  const part2Text = wordsInText
    .slice(splitWordIndex)
    .map((w) => w.text)
    .join(' ');

  const clipJson = (clip as any).toJSON
    ? (clip as any).toJSON()
    : { ...clip };
  const caption = clipJson.caption || {};
  const words = caption.words || [];

  const part1Words = words.slice(0, splitWordIndex);
  const part2Words = words.slice(splitWordIndex);

  if (part1Words.length === 0 || part2Words.length === 0) return;
  const lastWordPart1 = part1Words[part1Words.length - 1];

  const clip1Json = {
    ...clipJson,
    id: undefined,
    text: part1Text,
    width: 0,
    height: 0,
    wordWrapWidth: 0,
    caption: {
      ...caption,
      words: part1Words,
    },
    display: {
      from: clipJson.display.from,
      to: lastWordPart1.to * 1000 + clipJson.display.from,
    },
    duration: lastWordPart1.to * 1000,
  };

  const clip2Json = {
    ...clipJson,
    id: undefined,
    text: part2Text,
    width: 0,
    height: 0,
    wordWrapWidth: 0,
    caption: {
      ...caption,
      words: normalizeWordTimings(part2Words),
    },
    display: {
      from: lastWordPart1.to * 1000 + clipJson.display.from,
      to: clipJson.display.to,
    },
    duration:
      clipJson.display.to - lastWordPart1.to * 1000 - clipJson.display.from,
  };

  try {
    const clip1 = await jsonToClip(clip1Json);
    const clip2 = await jsonToClip(clip2Json);

    const videoWidth = studio.value.opts.width || 1080;

    // Center clip 1
    if (clip1.width > 0) {
      clip1.left = (videoWidth - clip1.width) / 2;
    }

    // Center clip 2
    if (clip2.width > 0) {
      clip2.left = (videoWidth - clip2.width) / 2;
    }

    await studio.value.addClip([clip1, clip2], { trackId });
    studio.value.removeClipById(id);
  } catch (error) {
    Log.error('Failed to split caption clip:', error);
  }
};

const handleUpdateCaption = async (id: string, text: string, fullUpdate = false) => {
  if (!studio.value) return;

  const clip = studio.value.getClipById(id);
  if (!clip) return;

  const tracks = studio.value.getTracks();
  const track = tracks.find((t: any) => t.clipIds.includes(id));
  if (!track) return;

  if (!fullUpdate) {
    // Fast mode: just update text property
    const captionClip = clip as any;
    captionClip.text = text;
    captionClip.emit('propsChange', { text });
    return;
  }

  // Full mode: recalculate words and timings (onBlur)
  const newWordsText = text.trim().split(/\s+/).filter(Boolean);
  const clipJson = (clip as any).toJSON
    ? (clip as any).toJSON()
    : { ...clip };
  const caption = clipJson.caption || {};
  const oldWords = caption.words || [];
  const paragraphIndex = oldWords[0]?.paragraphIndex ?? '';

  const isNewWordAdded = newWordsText.length > oldWords.length;
  let updatedWords;

  if (isNewWordAdded) {
    const totalDurationMs =
      (clipJson.display.to - clipJson.display.from) / 1000;
    const totalChars = newWordsText.reduce((acc: number, w: string) => acc + w.length, 0);
    const durationPerChar = totalChars > 0 ? totalDurationMs / totalChars : 0;

    let currentShift = 0;
    updatedWords = newWordsText.map((wordText: string, index: number) => {
      const wordDuration = wordText.length * durationPerChar;
      const word = {
        ...(oldWords[index] || { isKeyWord: false, paragraphIndex }),
        text: wordText,
        from: currentShift,
        to: currentShift + wordDuration,
      };
      currentShift += wordDuration;
      return word;
    });
  } else {
    updatedWords = newWordsText.map((wordText: string, index: number) => {
      if (oldWords[index]) {
        return {
          ...oldWords[index],
          text: wordText,
        };
      }
      return {
        text: wordText,
        from: 0,
        to: 0,
        isKeyWord: false,
      };
    });
  }

  const newClipJson = {
    ...clipJson,
    text,
    caption: {
      ...caption,
      words: updatedWords,
    },
    id: undefined,
  };

  try {
    const newClip = await jsonToClip(newClipJson);
    await studio.value.addClip([newClip], { trackId: track.id });
    studio.value.removeClipById(id);
  } catch (error) {
    Log.error('Failed to update caption clip:', error);
  }
};

const handleDeleteCaption = (id: string) => {
  if (!studio.value) return;
  studio.value.removeClipById(id);
};

const handleSeek = (time: number) => {
  seek(time / 1_000_000);
};

// Caption Item Component Logic
const getCaptionText = (item: any) => item.text || '';

const handleKeyDown = (e: KeyboardEvent, item: any, currentText: string) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const target = e.target as HTMLTextAreaElement;
    const cursorPosition = target.selectionStart || 0;
    handleSplitCaption(item.id, cursorPosition, currentText);
  }
};

</script>

<template>
  <div class="h-full flex flex-col">
    <div class="flex flex-1 flex-col gap-4 overflow-hidden min-w-0">
      <div v-if="mediaItems.length === 0" class="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground p-8">
        Add video or audio to the timeline to generate captions.
      </div>
      
      <div v-else-if="captionItems.length > 0" class="flex-1 overflow-hidden">
        <ScrollArea class="h-full px-4">
          <div class="flex flex-col gap-2 pb-4">
            <div
              v-for="item in captionItems"
              :key="item.id"
              class="group relative flex flex-col gap-2 rounded-md p-3 transition-colors border-l-2"
              :class="item.id === activeCaptionId ? 'bg-zinc-700/10 border-zinc-300 border' : 'hover:bg-zinc-700/10 border'"
            >
              <div class="flex items-center justify-between">
                <div
                  class="text-[10px] font-mono text-muted-foreground cursor-pointer hover:text-white transition-colors"
                  @click="handleSeek(item.display.from)"
                >
                  {{ formatTime(item.display.from / 1_000_000) }} - {{ formatTime(item.display.to / 1_000_000) }}
                </div>

                <div
                  class="flex items-center gap-1 opacity-0 transition-opacity"
                  :class="{ 'opacity-100': item.id === activeCaptionId || 'group-hover:opacity-100' }"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    class="h-5 w-5 text-muted-foreground hover:text-white"
                    @click.stop="handleSeek(item.display.from)"
                  >
                    <Play class="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="h-5 w-5 text-muted-foreground hover:text-red-400"
                    @click.stop="handleDeleteCaption(item.id)"
                  >
                    <Trash2 class="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <!-- Textarea for editing -->
              <!-- Using simple v-model lazy or handling update on blur/input manually -->
              <Textarea
                :model-value="item.text"
                @update:model-value="(val) => handleUpdateCaption(item.id, String(val), false)"
                @blur="(e: any) => handleUpdateCaption(item.id, e.target.value, true)"
                @keydown="(e: any) => handleKeyDown(e, item, e.target.value)"
                class="min-h-[20px] p-0 resize-none border-none focus-visible:ring-0 bg-transparent text-sm leading-relaxed text-zinc-300 focus:text-white placeholder:text-zinc-600"
                :rows="Math.max(1, Math.ceil((item.text?.length || 0) / 40))"
              />
            </div>
          </div>
        </ScrollArea>
      </div>

      <div v-else class="flex flex-col gap-6 p-4 py-6 items-center text-center">
        <div class="text-sm text-muted-foreground">
          Recognize speech in the selected media and generate captions automatically.
        </div>
        <Button
          @click="handleGenerateCaptions"
          variant="default"
          class="w-full"
          :disabled="isGenerating"
        >
          <template v-if="isGenerating">
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </template>
          <template v-else>
            Generate Captions
          </template>
        </Button>
      </div>
    </div>
  </div>
</template>
