<script setup lang="ts">
import { reactive, computed, onMounted, onUnmounted } from 'vue'
import { Slider } from '@/components/ui/slider'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { NumberInput } from '@/components/ui/number-input'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import {
  IconRotate,
  IconCircle,
  IconLineHeight,
  IconSquare,
  IconBlur,
  IconRuler2,
  IconVolume,
} from '@tabler/icons-vue'
import { ChromePicker } from 'vue-color'
import type { IClip } from 'openvideo'

interface VideoPropertiesProps {
  clip: IClip
}

const props = defineProps<VideoPropertiesProps>()

const videoClip = computed(() => props.clip as any)
const style = computed(() => videoClip.value.style || {})

// Local state using reactive
const localState = reactive({
  left: 0,
  top: 0,
  width: 0,
  height: 0,
  angle: 0,
  volume: 100,
  opacity: 100,
  borderRadius: 0,
  strokeWidth: 0,
  strokeColor: '#000000',
  shadowDistance: 0,
  shadowAngle: 0,
  shadowBlur: 0,
  shadowColor: '#000000',
})

// Initialize local state from clip
const syncFromClip = () => {
  if (!videoClip.value) return
  
  localState.left = Math.round(videoClip.value.left || 0)
  localState.top = Math.round(videoClip.value.top || 0)
  localState.width = Math.round(videoClip.value.width || 0)
  localState.height = Math.round(videoClip.value.height || 0)
  localState.angle = Math.round(videoClip.value.angle ?? 0)
  localState.volume = Math.round((videoClip.value.volume ?? 1) * 100)
  localState.opacity = Math.round((videoClip.value.opacity ?? 1) * 100)
  localState.borderRadius = style.value.borderRadius || 0
  localState.strokeWidth = style.value.stroke?.width || 0
  localState.strokeColor = style.value.stroke?.color || '#000000'
  localState.shadowDistance = Math.round(style.value.dropShadow?.distance || 0)
  localState.shadowAngle = Math.round(((style.value.dropShadow?.angle || 0) * 180) / Math.PI)
  localState.shadowBlur = style.value.dropShadow?.blur || 0
  localState.shadowColor = style.value.dropShadow?.color || '#000000'
}

// Listen to clip events for canvas sync
onMounted(() => {
  if (!videoClip.value) return

  // Initialize local state
  syncFromClip()

  const onPropsChange = () => {
    syncFromClip()
  }

  videoClip.value.on?.('propsChange', onPropsChange)
  videoClip.value.on?.('moving', onPropsChange)
  videoClip.value.on?.('scaling', onPropsChange)
  videoClip.value.on?.('rotating', onPropsChange)

  onUnmounted(() => {
    videoClip.value.off?.('propsChange', onPropsChange)
    videoClip.value.off?.('moving', onPropsChange)
    videoClip.value.off?.('scaling', onPropsChange)
    videoClip.value.off?.('rotating', onPropsChange)
  })
})

const handleUpdate = (updates: any) => {
  videoClip.value.update(updates)
}

const handleStyleUpdate = (styleUpdates: any) => {
  videoClip.value.update({
    style: {
      ...style.value,
      ...styleUpdates,
    },
  })
}

const handleStrokeUpdate = (strokeUpdates: any) => {
  videoClip.value.update({
    style: {
      ...style.value,
      stroke: {
        ...(style.value.stroke || { color: '#ffffff', width: 0 }),
        ...strokeUpdates,
      },
    },
  })
}

const handleShadowUpdate = (shadowUpdates: any) => {
  const currentShadow = style.value.dropShadow || {
    color: '#000000',
    alpha: 1,
    blur: 0,
    distance: 0,
    angle: 0,
  }

  const finalUpdates: any = { ...shadowUpdates }

  if (shadowUpdates.angle !== undefined) {
    finalUpdates.angle = (parseFloat(shadowUpdates.angle) * Math.PI) / 180
  }

  if (shadowUpdates.distance !== undefined) {
    finalUpdates.distance = parseFloat(shadowUpdates.distance) || 0
  }

  videoClip.value.update({
    style: {
      ...style.value,
      dropShadow: {
        ...currentShadow,
        ...finalUpdates,
      },
    },
  })
}

// Computed properties with local state
const left = computed({
  get: () => localState.left,
  set: (value) => {
    localState.left = value
    handleUpdate({ left: value })
  }
})

const top = computed({
  get: () => localState.top,
  set: (value) => {
    localState.top = value
    handleUpdate({ top: value })
  }
})

const width = computed({
  get: () => localState.width,
  set: (value) => {
    localState.width = value
    handleUpdate({ width: value })
  }
})

const height = computed({
  get: () => localState.height,
  set: (value) => {
    localState.height = value
    handleUpdate({ height: value })
  }
})

const angle = computed({
  get: () => localState.angle,
  set: (value) => {
    localState.angle = value
    handleUpdate({ angle: value })
  }
})

const volume = computed({
  get: () => localState.volume,
  set: (value) => {
    localState.volume = value
    handleUpdate({ volume: value / 100 })
  }
})

const opacity = computed({
  get: () => localState.opacity,
  set: (value) => {
    localState.opacity = value
    handleUpdate({ opacity: value / 100 })
  }
})

const borderRadius = computed({
  get: () => localState.borderRadius,
  set: (value) => {
    localState.borderRadius = value
    handleStyleUpdate({ borderRadius: value })
  }
})

const strokeWidth = computed({
  get: () => localState.strokeWidth,
  set: (value) => {
    localState.strokeWidth = value
    handleStrokeUpdate({ width: value })
  }
})

const shadowDistance = computed({
  get: () => localState.shadowDistance,
  set: (value) => {
    localState.shadowDistance = value
    handleShadowUpdate({ distance: value })
  }
})

const shadowAngle = computed({
  get: () => localState.shadowAngle,
  set: (value) => {
    localState.shadowAngle = value
    handleShadowUpdate({ angle: value })
  }
})

const shadowBlur = computed({
  get: () => localState.shadowBlur,
  set: (value) => {
    localState.shadowBlur = value
    handleShadowUpdate({ blur: value })
  }
})

// Color pickers using reactive state
const strokeColor = computed({
  get: () => localState.strokeColor,
  set: (value: any) => {
    localState.strokeColor = value.hex || value
  }
})

const shadowColor = computed({
  get: () => localState.shadowColor,
  set: (value: any) => {
    localState.shadowColor = value.hex || value
  }
})
</script>

<template>
  <div class="flex flex-col gap-5">
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
          <NumberInput v-model="left" class="p-0" />
        </InputGroup>
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <span class="text-[10px] font-medium text-muted-foreground">Y</span>
          </InputGroupAddon>
          <NumberInput v-model="top" class="p-0" />
        </InputGroup>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <span class="text-[10px] font-medium text-muted-foreground">W</span>
          </InputGroupAddon>
          <NumberInput v-model="width" class="p-0" />
        </InputGroup>
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <span class="text-[10px] font-medium text-muted-foreground">H</span>
          </InputGroupAddon>
          <NumberInput v-model="height" class="p-0" />
        </InputGroup>
      </div>
    </div>

    <!-- Rotation Section -->
    <div class="flex flex-col gap-2">
      <label class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Rotation
      </label>
      <div class="flex items-center gap-4">
        <IconRotate class="size-4 text-muted-foreground" />
        <Slider
          :model-value="[angle ?? 0]"
          @update:model-value="(v) => v && v[0] !== undefined && (angle = v[0])"
          :max="360"
          :step="1"
          class="flex-1"
        />
        <InputGroup class="w-20">
          <NumberInput v-model="angle" class="p-0 text-center" />
          <InputGroupAddon align="inline-end" class="p-0 pr-2">
            <span class="text-[10px] text-muted-foreground">°</span>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>

    <!-- Audio Section -->
    <div class="flex flex-col gap-2">
      <label class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Volume
      </label>
      <div class="flex items-center gap-4">
        <IconVolume class="size-4 text-muted-foreground" />
        <Slider
          :model-value="[volume ?? 100]"
          @update:model-value="(v) => v && v[0] !== undefined && (volume = v[0])"
          :max="100"
          :step="1"
          class="flex-1"
        />
        <InputGroup class="w-20">
          <NumberInput v-model="volume" class="p-0 text-center" />
          <InputGroupAddon align="inline-end" class="p-0 pr-2">
            <span class="text-[10px] text-muted-foreground">%</span>
          </InputGroupAddon>
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
          :model-value="[opacity ?? 0]"
          @update:model-value="(v) => v && v[0] !== undefined && (opacity = v[0])"
          :max="100"
          :step="1"
          class="flex-1"
        />
        <InputGroup class="w-20">
          <NumberInput v-model="opacity" class="p-0 text-center" />
          <InputGroupAddon align="inline-end" class="p-0 pr-2">
            <span class="text-[10px] text-muted-foreground">%</span>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>

    <!-- Radius Section -->
    <div class="flex flex-col gap-2">
      <label class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Corner Radius
      </label>
      <div class="flex items-center gap-4">
        <IconSquare class="size-4 text-muted-foreground" />
        <Slider
          :model-value="[borderRadius ?? 0]"
          @update:model-value="(v) => v && v[0] !== undefined && (borderRadius = v[0])"
          :max="500"
          :step="1"
          class="flex-1"
        />
        <InputGroup class="w-20">
          <NumberInput v-model="borderRadius" class="p-0 text-center" />
          <InputGroupAddon align="inline-end" class="p-0 pr-2">
            <span class="text-[10px] text-muted-foreground">px</span>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>

    <!-- Stroke Section -->
    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <label class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Stroke
        </label>
      </div>

      <div class="flex gap-2">
        <!-- Stroke Color -->
        <InputGroup class="flex-2">
          <InputGroupAddon align="inline-start" class="relative p-0">
            <Popover>
              <PopoverTrigger as-child>
                <button class="h-full w-8 flex items-center justify-center hover:bg-white/5">
                  <div
                    class="h-4 w-4 rounded-full border border-white/10 shadow-sm"
                    :style="{ backgroundColor: style.stroke?.color || '#000000' }"
                  />
                </button>
              </PopoverTrigger>
              <PopoverContent class="w-auto p-3" align="start">
                <ChromePicker
                  v-model="strokeColor"
                  @update:model-value="(color: any) => handleStrokeUpdate({ color: color.hex })"
                />
              </PopoverContent>
            </Popover>
          </InputGroupAddon>
          <InputGroupInput
            :value="(style.stroke?.color || '#000000').toUpperCase()"
            @input="(e: Event) => handleStrokeUpdate({ color: (e.target as HTMLInputElement).value })"
            class="text-sm p-0 text-[10px] font-mono"
          />
          <InputGroupAddon align="inline-end" class="border-l border-white/5 pl-2">
            <span class="text-[10px]">100%</span>
          </InputGroupAddon>
        </InputGroup>

        <!-- Stroke Width -->
        <InputGroup class="flex-1">
          <InputGroupAddon align="inline-start">
            <IconLineHeight class="size-3.5" />
          </InputGroupAddon>
          <NumberInput v-model="strokeWidth" />
        </InputGroup>
      </div>
    </div>

    <!-- Shadow Section -->
    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <label class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Shadow
        </label>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <!-- Distance -->
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <IconRuler2 class="size-3.5" />
          </InputGroupAddon>
          <NumberInput v-model="shadowDistance" />
        </InputGroup>

        <!-- Angle -->
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <IconRotate class="size-3.5" />
          </InputGroupAddon>
          <NumberInput v-model="shadowAngle" />
        </InputGroup>
      </div>

      <div class="flex gap-2">
        <!-- Blur -->
        <InputGroup class="flex-1">
          <InputGroupAddon align="inline-start">
            <IconBlur class="size-3.5" />
          </InputGroupAddon>
          <NumberInput v-model="shadowBlur" />
        </InputGroup>

        <!-- Shadow Color -->
        <InputGroup class="flex-1">
          <InputGroupAddon align="inline-start" class="relative p-0">
            <Popover>
              <PopoverTrigger as-child>
                <button class="h-full w-8 flex items-center justify-center hover:bg-white/5">
                  <div
                    class="h-4 w-4 border border-white/10 shadow-sm"
                    :style="{ backgroundColor: style.dropShadow?.color || '#000000' }"
                  />
                </button>
              </PopoverTrigger>
              <PopoverContent class="w-auto p-3" align="start">
                <ChromePicker
                  v-model="shadowColor"
                  @update:model-value="(color: any) => handleShadowUpdate({ color: color.hex })"
                />
              </PopoverContent>
            </Popover>
          </InputGroupAddon>
          <InputGroupInput
            :value="(style.dropShadow?.color || '#000000').toUpperCase()"
            @input="(e: Event) => handleShadowUpdate({ color: (e.target as HTMLInputElement).value })"
            class="text-sm p-0 text-[10px] font-mono"
          />
        </InputGroup>
      </div>
    </div>
  </div>
</template>
