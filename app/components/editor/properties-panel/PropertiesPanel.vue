<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { ScrollArea } from '@/components/ui/scroll-area'
import TextProperties from './TextProperties.vue'
import ImageProperties from './ImageProperties.vue'
import VideoProperties from './VideoProperties.vue'
import AudioProperties from './AudioProperties.vue'
import CaptionProperties from './CaptionProperties.vue'
import type { IClip } from 'openvideo'

interface PropertiesPanelProps {
  selectedClips: any[]
}

const props = defineProps<PropertiesPanelProps>()

const tick = ref(0)

// Listen to clip events for canvas sync
onMounted(() => {
  if (props.selectedClips.length !== 1) return

  const clip = props.selectedClips[0]

  const onPropsChange = () => {
    tick.value++
  }

  clip.on('propsChange', onPropsChange)

  onUnmounted(() => {
    clip.off('propsChange', onPropsChange)
  })
})

const clip = computed(() => props.selectedClips[0])

const isType = (clip: IClip | undefined, type: string) => {
  return clip?.type?.toLowerCase() === type.toLowerCase()
}
</script>

<template>
  <div v-if="selectedClips.length > 1" class="bg-card h-full p-4 flex flex-col items-center justify-center gap-3">
    <div class="text-lg font-medium">Group</div>
  </div>

  <ScrollArea v-else-if="selectedClips.length === 1" class="h-full">
    <div class="flex flex-col gap-4 p-4">
      <!-- Text Properties -->
      <TextProperties v-if="isType(clip, 'text')" :clip="clip!" />
      <ImageProperties v-else-if="isType(clip, 'image')" :clip="clip!" />
      <VideoProperties v-else-if="isType(clip, 'video')" :clip="clip!" />
      <AudioProperties v-else-if="isType(clip, 'audio')" :clip="clip!" />
      <CaptionProperties v-else-if="isType(clip, 'caption')" :clip="clip!" />
      
      <!-- Other properties coming in subsequent phases -->
      <div v-else-if="clip" class="text-muted-foreground text-sm">
        {{ clip.type }} Properties (Coming in Phase 3+)
      </div>
    </div>
  </ScrollArea>

  <div v-else class="h-full w-full flex items-center justify-center text-muted-foreground border-l">
    Select a clip to edit properties
  </div>
</template>

