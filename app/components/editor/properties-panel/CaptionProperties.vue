<script setup lang="ts">
import { ref, reactive, watch, onMounted, onUnmounted, computed } from 'vue';
import { useStudioStore } from '~/composables/useStudioStore';
// import { useLayoutStore } from '~/stores/use-layout-store';
import {
  Type as IconTextSize,
  RotateCw as IconRotate,
  Circle as IconCircle,
  ChevronDown
} from 'lucide-vue-next';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { Slider } from '~/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '~/components/ui/input-group';
import { ChromePicker } from 'vue-color';
import { fontManager, jsonToClip, Log } from 'openvideo';
import { getGroupedFonts, getFontByPostScriptName } from '~/utils/font-utils';
import { generateCaptionClips } from '~/utils/caption-generator';

const props = defineProps<{
  clip: any;
}>();

const { state: studioState } = useStudioStore();
// const layoutStore = useLayoutStore();
const studio = computed(() => studioState.value.studio);

const GROUPED_FONTS = getGroupedFonts();

// Local Reactive State
const localState = reactive({
  text: '',
  left: 0,
  top: 0,
  width: 0,
  height: 0,
  angle: 0,
  opacity: 1,
  verticalAlign: 'bottom',
  wordsPerLine: 'multiple',
  fontSize: 40,
  fontFamily: '',
  textCase: 'none',
  fill: '#ffffff',
  
  // Caption Colors
  captionColors: {
    appeared: '#ffffff',
    active: '#ffffff',
    activeFill: '#FF5700',
    background: '',
    keyword: '#ffffff',
  }
});

const currentFont = computed(() => 
  getFontByPostScriptName(localState.fontFamily) || GROUPED_FONTS[0].mainFont
);

const currentFamily = computed(() => 
  GROUPED_FONTS.find((f) => f.family === currentFont.value.family) || GROUPED_FONTS[0]
);

// Sync from clip to local state
const syncFromClip = () => {
  const clip = props.clip;
  if (!clip) return;

  localState.text = clip.text || '';
  localState.left = clip.left || 0;
  localState.top = clip.top || 0;
  localState.width = clip.width || 0;
  localState.height = clip.height || 0;
  localState.angle = clip.angle || 0;
  localState.opacity = clip.opacity ?? 1;

  const opts = clip.customOpts || clip.opts || {}; // Handle various prop locations for opts
  const originalOpts = clip.originalOpts || {};

  localState.verticalAlign = opts.verticalAlign || originalOpts.verticalAlign || 'bottom';
  localState.wordsPerLine = clip.wordsPerLine || opts.wordsPerLine || 'multiple';
  localState.fontSize = opts.fontSize || 40;
  localState.fontFamily = opts.fontFamily || 'Bangers-Regular';
  localState.textCase = clip.textCase || 'none';
  localState.fill = (opts.fill as string) || '#ffffff';

  const cColors = opts.caption?.colors || {};
  localState.captionColors = {
    appeared: cColors.appeared || '#ffffff',
    active: cColors.active || '#ffffff',
    activeFill: cColors.activeFill || '#FF5700',
    background: cColors.background || '',
    keyword: cColors.keyword || '#ffffff',
  };
};

const handleUpdate = (updates: any) => {
  if (!studio.value) return;
  const clip = studio.value.getClipById(props.clip.id);
  // If clip is not found directly, use props.clip (might be stale but better than nothing for UI updates)
  const targetClip = clip || props.clip;

  Object.assign(targetClip, updates);
  
  // Also update opts if needed
  if (!targetClip.opts) targetClip.opts = {};
  
  if (updates.fontSize !== undefined) targetClip.opts.fontSize = updates.fontSize;
  if (updates.fill !== undefined) targetClip.opts.fill = updates.fill;
  if (updates.verticalAlign !== undefined) targetClip.opts.verticalAlign = updates.verticalAlign;
  if (updates.fontFamily !== undefined) targetClip.opts.fontFamily = updates.fontFamily;
  
  // Emit event if available
  if (targetClip.emit) {
    targetClip.emit('propsChange', updates);
  } else {
    // If not emittable (e.g. raw object), force sync might be needed or rely on parent update
  }
};

const handleCaptionColorUpdate = (colorUpdates: any) => {
  if (!studio.value) return;
  const clip = studio.value.getClipById(props.clip.id) || props.clip;
  
  if (!clip.opts) clip.opts = {};
  if (!clip.opts.caption) clip.opts.caption = {};
  if (!clip.opts.caption.colors) clip.opts.caption.colors = {};
  
  Object.assign(clip.opts.caption.colors, colorUpdates);

  // Sync originalOpts as well for serialization
  if (clip.originalOpts) {
     if (!clip.originalOpts.caption) clip.originalOpts.caption = {};
     if (!clip.originalOpts.caption.colors) clip.originalOpts.caption.colors = {};
     Object.assign(clip.originalOpts.caption.colors, colorUpdates);
  }

  if (clip.emit) clip.emit('propsChange', {});
  // Update local state
  Object.assign(localState.captionColors, colorUpdates);
};

const handleFontChange = async (postScriptName: string) => {
  const font = getFontByPostScriptName(postScriptName);
  if (!font) return;

  await fontManager.addFont({
    name: font.postScriptName,
    url: font.url,
  });

  handleUpdate({ 
    fontFamily: font.postScriptName, 
    fontUrl: font.url 
  });
  
  // Also update originalOpts
  const clip = studio.value?.getClipById(props.clip.id) || props.clip;
  if (clip.originalOpts) {
    clip.originalOpts.fontFamily = font.postScriptName;
    clip.originalOpts.fontUrl = font.url;
  }
};

const updateVerticalAlign = (v: string) => {
  if (!studio.value) return;
  const videoHeight = studio.value.opts.height || 1080;
  const mediaId = props.clip.mediaId;

  // Find siblings if part of a group
  let clipsToUpdate: any[] = [props.clip];

  if (mediaId && studio.value) {
    const tracks = studio.value.getTracks();
    const siblingClips: any[] = [];
    tracks.forEach((track: any) => {
      track.clipIds.forEach((id: string) => {
        const c = studio.value?.getClipById(id);
        if (c && c.type === 'Caption' && (c as any).opts.mediaId === mediaId) {
          siblingClips.push(c);
        }
      });
    });
    if (siblingClips.length > 0) {
      clipsToUpdate = siblingClips;
    }
  }

  clipsToUpdate.forEach((clip) => {
    // If we're updating 'clip', we need the real studio reference if possible
    const sClip = studio.value?.getClipById(clip.id) || clip;
    const clipHeight = sClip.height || 0;
    let newTop = sClip.top;

    if (v === 'top') {
      newTop = 80;
    } else if (v === 'center') {
      newTop = (videoHeight - clipHeight) / 2;
    } else if (v === 'bottom') {
      newTop = videoHeight - clipHeight - 80;
    }

    sClip.top = newTop;
    if (sClip.opts) sClip.opts.verticalAlign = v;
    if (sClip.originalOpts) sClip.originalOpts.verticalAlign = v;
    
    if (sClip.emit) sClip.emit('propsChange', { top: newTop });
  });
  
  localState.verticalAlign = v;
};

const changeWordsPerLine = async (v: string) => {
  if (!studio.value || !props.clip.mediaId) return;
  
  const val = v as 'single' | 'multiple';
  const mediaId = props.clip.mediaId;
  const tracks = studio.value.getTracks();
  const siblingClips: any[] = [];

  tracks.forEach((track: any) => {
    track.clipIds.forEach((id: string) => {
      const c = studio.value?.getClipById(id);
      if (c && c.type === 'Caption' && (c as any).opts.mediaId === mediaId) {
        siblingClips.push(c);
      }
    });
  });

  siblingClips.sort((a, b) => a.display.from - b.display.from);
  if (siblingClips.length === 0) return;

  const uniformTop = props.clip.top ?? 0;
  const mediaClip = studio.value.getClipById(mediaId);
  if (!mediaClip) return;

  const mediaStartUs = mediaClip.display.from;
  const allWords: any[] = [];

  siblingClips.forEach((c) => {
      const clipStartUs = c.display.from;
      const words = c.words || [];
      words.forEach((w: any) => {
        allWords.push({
          ...w,
          start: (clipStartUs + w.from * 1000 - mediaStartUs) / 1000000,
          end: (clipStartUs + w.to * 1000 - mediaStartUs) / 1000000,
        });
      });
  });

  if (allWords.length === 0) return;

  try {
     const newClipsJSON = await generateCaptionClips({
      videoWidth: studio.value.opts.width,
      videoHeight: studio.value.opts.height,
      words: allWords,
      mode: val,
      fontSize: localState.fontSize || 80,
      fontFamily: localState.fontFamily || 'Bangers-Regular',
      fontUrl: (props.clip.opts || props.clip.customOpts || {}).fontUrl,
      style: props.clip.style,
    });

    const trackId = studio.value.findTrackIdByClipId(props.clip.id);
    if (!trackId) return;
    
    const clipsToAdd: any[] = [];
    for (const json of newClipsJSON) {
       const enrichedJson = {
        ...json,
        mediaId,
        wordsPerLine: val,
        top: uniformTop,
        originalOpts: {
          ...(json.originalOpts || {}),
          wordsPerLine: val,
        },
        opts: {
          ...(json.opts || {}),
          wordsPerLine: val,
        },
        display: {
          from: json.display.from + mediaStartUs,
          to: json.display.to + mediaStartUs,
        },
      };
      const clip = await jsonToClip(enrichedJson);
      clipsToAdd.push(clip);
    }
    
    // Remove old clips and add new ones
    siblingClips.forEach((c) => studio.value?.removeClipById(c.id));
    await studio.value.addClip(clipsToAdd, { trackId });
    
  } catch (e) {
      Log.error('Failed to change words per line', e);
  }
};


// Watchers and Lifecycle
watch(() => props.clip, (newClip) => {
  syncFromClip();
  // Re-bind listeners if clip ID changed? 
  // Ideally implementation handles re-bind automatically if using 'prop.clip' in listeners
  // But we need to listen to dynamic events on the specific clip instance
}, { immediate: true, deep: true });

// Listen for updates from Canvas
const onPropsChange = (e: any) => {
  syncFromClip();
};

const onMoving = (e: any) => {
  localState.left = e.target.left;
  localState.top = e.target.top;
};
const onScaling = (e: any) => {
  localState.width = e.target.width;
  localState.height = e.target.height;
  localState.left = e.target.left;
  localState.top = e.target.top;
};
const onRotating = (e: any) => {
  localState.angle = e.target.angle;
};

const bindListeners = (clip: any) => {
  if (!clip || !clip.on) return;
  clip.on('propsChange', onPropsChange);
  clip.on('moving', onMoving);
  clip.on('scaling', onScaling);
  clip.on('rotating', onRotating);
};

const unbindListeners = (clip: any) => {
  if (!clip || !clip.off) return;
  clip.off('propsChange', onPropsChange);
  clip.off('moving', onMoving);
  clip.off('scaling', onScaling);
  clip.off('rotating', onRotating);
};

watch(() => props.clip, (newClip, oldClip) => {
  if (oldClip) unbindListeners(oldClip);
  if (newClip) bindListeners(newClip);
}, { immediate: true });

onUnmounted(() => {
  if (props.clip) unbindListeners(props.clip);
});


</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Content -->
    <div class="flex flex-col gap-2">
      <label class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Content
      </label>
      <Textarea
        :model-value="localState.text"
        @update:model-value="(val) => handleUpdate({ text: String(val) })"
        class="resize-none text-sm"
        placeholder="Enter caption text..."
      />
    </div>

    <!-- Transform Section -->
    <div class="flex flex-col gap-2">
      <label class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Transform
      </label>
      <div class="grid grid-cols-2 gap-2">
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <span class="text-[10px] font-medium text-muted-foreground">X</span>
          </InputGroupAddon>
          <InputGroupInput
            type="number"
            :model-value="Math.round(localState.left)"
            @update:model-value="(val) => handleUpdate({ left: val })"
            class="text-sm p-0"
          />
        </InputGroup>
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <span class="text-[10px] font-medium text-muted-foreground">Y</span>
          </InputGroupAddon>
          <InputGroupInput
            type="number"
            :model-value="Math.round(localState.top)"
            @update:model-value="(val) => handleUpdate({ top: val })"
            class="text-sm p-0"
          />
        </InputGroup>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <InputGroup>
           <InputGroupAddon align="inline-start">
            <span class="text-[10px] font-medium text-muted-foreground">W</span>
          </InputGroupAddon>
          <InputGroupInput
            type="number"
            :model-value="Math.round(localState.width)"
            @update:model-value="(val) => handleUpdate({ width: val })"
            class="text-sm p-0"
          />
        </InputGroup>
         <InputGroup>
           <InputGroupAddon align="inline-start">
            <span class="text-[10px] font-medium text-muted-foreground">H</span>
          </InputGroupAddon>
          <InputGroupInput
            type="number"
            :model-value="Math.round(localState.height)"
            @update:model-value="(val) => handleUpdate({ height: val })"
            class="text-sm p-0"
          />
        </InputGroup>
      </div>
    </div>

    <!-- Position Section -->
    <div class="flex flex-col gap-2">
      <label class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Position
      </label>
      <Select
        :model-value="localState.verticalAlign"
        @update:model-value="updateVerticalAlign"
      >
        <SelectTrigger class="w-full h-9">
          <SelectValue placeholder="Vertical Position" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="top">Top</SelectItem>
          <SelectItem value="center">Center</SelectItem>
          <SelectItem value="bottom">Bottom</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <!-- Words per line Section -->
    <div class="flex flex-col gap-2">
      <label class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Words per line
      </label>
      <Select
        :model-value="localState.wordsPerLine"
        @update:model-value="changeWordsPerLine"
      >
        <SelectTrigger class="w-full h-9">
          <SelectValue placeholder="Words per line" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="single">Single</SelectItem>
          <SelectItem value="multiple">Multiple</SelectItem>
        </SelectContent>
      </Select>
    </div>


    <!-- Rotation Section -->
    <div class="flex flex-col gap-2">
      <label class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Rotation
      </label>
      <div class="flex items-center gap-4">
        <IconRotate class="size-4 text-muted-foreground" />
        <Slider
          :model-value="[Math.round(localState.angle)]"
          @update:model-value="(val) => handleUpdate({ angle: val[0] })"
          :max="360"
          :step="1"
          class="flex-1"
        />
        <InputGroup class="w-20">
          <InputGroupInput
            type="number"
            :model-value="Math.round(localState.angle)"
             @update:model-value="(val) => handleUpdate({ angle: val })"
            class="text-sm p-0 text-center"
          />
          <InputGroupAddon align="inline-end" class="p-0 pr-2">
            <span class="text-[10px] text-muted-foreground">°</span>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>

    <!-- Font Section -->
    <div class="flex flex-col gap-2">
      <label class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Font
      </label>
      
      <!-- Font Family Picker -->
      <Select
        :model-value="currentFamily?.family"
        @update:model-value="(val: string) => {
           const family = GROUPED_FONTS.find((f) => f.family === val);
           if (family) handleFontChange(family.mainFont.postScriptName);
        }"
      >
        <SelectTrigger class="w-full h-12">
          <SelectValue placeholder="Select font">
             <div class="flex items-center h-full">
               {{ currentFamily?.family }}
             </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent class="max-h-[300px]">
          <SelectItem 
            v-for="family in GROUPED_FONTS" 
            :key="family.family" 
            :value="family.family"
          >
             <div class="flex items-center py-1">
                <img
                  :src="family.mainFont.preview"
                  :alt="family.family"
                  class="h-6 invert object-contain"
                />
             </div>
          </SelectItem>
        </SelectContent>
      </Select>
      
      <div class="grid grid-cols-2 gap-2">
        <Select
          :model-value="currentFont?.postScriptName"
          @update:model-value="handleFontChange"
        >
          <SelectTrigger class="bg-input border h-9 w-full overflow-hidden">
             <SelectValue placeholder="Style" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem 
               v-for="style in currentFamily?.styles"
               :key="style.id" 
               :value="style.postScriptName"
            >
              {{ style.fullName.replace(currentFamily?.family || '', '').trim() || 'Regular' }}
            </SelectItem>
          </SelectContent>
        </Select>

        <InputGroup>
          <InputGroupInput
             type="number"
             :model-value="localState.fontSize"
             @update:model-value="(val: any) => handleUpdate({ fontSize: val })"
             class="text-sm"
          />
          <InputGroupAddon align="inline-end">
             <IconTextSize class="size-4" />
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
    
    <!-- Style Section -->
    <div class="flex flex-col gap-2">
        <label class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Style
        </label>
        <div class="grid grid-cols-2 gap-2">
          <div class="flex bg-secondary/30 rounded-md p-1 gap-1">
             <button
               v-for="item in [
                 { label: 'aA', value: 'none' },
                 { label: 'AA', value: 'uppercase' },
                 { label: 'aa', value: 'lowercase' },
               ]"
               :key="item.value"
               @click="handleUpdate({ textCase: item.value })"
               class="flex-1 text-[10px] font-medium flex items-center justify-center rounded-sm py-1 transition-colors"
               :class="localState.textCase === item.value ? 'bg-white/10 text-white' : 'text-muted-foreground hover:bg-white/5'"
             >
               {{ item.label }}
             </button>
          </div>
          
          <InputGroup class="flex-1">
            <InputGroupAddon align="inline-start" class="relative p-0">
               <Popover>
                 <PopoverTrigger as-child>
                    <InputGroupButton variant="ghost" size="icon-xs" class="h-full w-8">
                       <div 
                         class="h-4 w-4 border border-white/10 shadow-sm"
                         :style="{ backgroundColor: localState.fill.toUpperCase() }"
                       />
                    </InputGroupButton>
                 </PopoverTrigger>
                 <PopoverContent class="w-64 p-3" align="start">
                    <ChromePicker 
                      :model-value="localState.fill"
                      @update:model-value="(c: any) => handleUpdate({ fill: c.hex })"
                      disableAlpha
                      disableFields
                    />
                 </PopoverContent>
               </Popover>
            </InputGroupAddon>
          <InputGroupInput
            :model-value="localState.fill.toUpperCase()"
            @update:model-value="(val: any) => handleUpdate({ fill: String(val) })"
            class="text-sm p-0 text-[10px] font-mono"
          />
          </InputGroup>
        </div>
    </div>
    

    <!-- Opacity Section -->
    <div class="flex flex-col gap-2">
      <label class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Opacity
      </label>
      <div class="flex items-center gap-4">
        <IconCircle class="size-4 text-muted-foreground" />
        <Slider
          :model-value="[Math.round(localState.opacity * 100)]"
          @update:model-value="(val) => handleUpdate({ opacity: val[0] / 100 })"
          :max="100"
          :step="1"
          class="flex-1"
        />
        <InputGroup class="w-20">
          <InputGroupInput
            type="number"
            :model-value="Math.round(localState.opacity * 100)"
            @update:model-value="(val) => handleUpdate({ opacity: Number(val) / 100 })"
            class="text-sm p-0 text-center"
          />
          <InputGroupAddon align="inline-end" class="p-0 pr-2">
             <span class="text-[10px] text-muted-foreground">%</span>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
    
     <!-- Caption Colors Section -->
    <div class="flex flex-col gap-2">
        <label class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Caption Colors
        </label>
        
        <!-- Appeared -->
        <div class="flex flex-col gap-1">
           <span class="text-[9px] text-muted-foreground">Appeared</span>
           <InputGroup>
              <InputGroupAddon align="inline-start" class="relative p-0">
                 <Popover>
                    <PopoverTrigger as-child>
                       <InputGroupButton variant="ghost" size="icon-xs" class="h-full w-8">
                         <div 
                           class="h-4 w-4 border border-white/10 shadow-sm"
                           :style="{ backgroundColor: localState.captionColors.appeared.toUpperCase() }"
                         />
                       </InputGroupButton>
                    </PopoverTrigger>
                    <PopoverContent class="w-64 p-3" align="start">
                        <ChromePicker 
                          :model-value="localState.captionColors.appeared"
                          @update:model-value="(c: any) => handleCaptionColorUpdate({ appeared: c.hex })"
                          disableAlpha
                          disableFields
                        />
                    </PopoverContent>
                 </Popover>
              </InputGroupAddon>
               <InputGroupInput
                 :model-value="localState.captionColors.appeared.toUpperCase()"
                 @update:model-value="(val: any) => handleCaptionColorUpdate({ appeared: String(val) })"
                 class="text-sm p-0 text-[10px] font-mono"
               />
           </InputGroup>
        </div>
        
         <!-- Active -->
        <div class="flex flex-col gap-1">
           <span class="text-[9px] text-muted-foreground">Active</span>
           <InputGroup>
              <InputGroupAddon align="inline-start" class="relative p-0">
                 <Popover>
                    <PopoverTrigger as-child>
                       <InputGroupButton variant="ghost" size="icon-xs" class="h-full w-8">
                         <div 
                           class="h-4 w-4 border border-white/10 shadow-sm"
                           :style="{ backgroundColor: localState.captionColors.active.toUpperCase() }"
                         />
                       </InputGroupButton>
                    </PopoverTrigger>
                    <PopoverContent class="w-64 p-3" align="start">
                        <ChromePicker 
                          :model-value="localState.captionColors.active"
                          @update:model-value="(c: any) => handleCaptionColorUpdate({ active: c.hex })"
                          disableAlpha
                          disableFields
                        />
                    </PopoverContent>
                 </Popover>
              </InputGroupAddon>
               <InputGroupInput
                 :model-value="localState.captionColors.active.toUpperCase()"
                 @update:model-value="(val: any) => handleCaptionColorUpdate({ active: String(val) })"
                 class="text-sm p-0 text-[10px] font-mono"
               />
           </InputGroup>
        </div>
        
         <!-- Active Fill -->
        <div class="flex flex-col gap-1">
           <span class="text-[9px] text-muted-foreground">Active Fill</span>
           <InputGroup>
              <InputGroupAddon align="inline-start" class="relative p-0">
                 <Popover>
                    <PopoverTrigger as-child>
                       <InputGroupButton variant="ghost" size="icon-xs" class="h-full w-8">
                         <div 
                           class="h-4 w-4 border border-white/10 shadow-sm"
                           :style="{ backgroundColor: localState.captionColors.activeFill.toUpperCase() }"
                         />
                       </InputGroupButton>
                    </PopoverTrigger>
                    <PopoverContent class="w-64 p-3" align="start">
                        <ChromePicker 
                          :model-value="localState.captionColors.activeFill"
                          @update:model-value="(c: any) => handleCaptionColorUpdate({ activeFill: c.hex })"
                          disableAlpha
                          disableFields
                        />
                    </PopoverContent>
                 </Popover>
              </InputGroupAddon>
               <InputGroupInput
                 :model-value="localState.captionColors.activeFill.toUpperCase()"
                 @update:model-value="(val: any) => handleCaptionColorUpdate({ activeFill: String(val) })"
                 class="text-sm p-0 text-[10px] font-mono"
               />
           </InputGroup>
        </div>
        
    </div>

  </div>
</template>
