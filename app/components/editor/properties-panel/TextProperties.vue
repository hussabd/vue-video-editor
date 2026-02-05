<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { NumberInput } from '@/components/ui/number-input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import {
  IconRotate,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconTextSize,
  IconLineHeight,
  IconBlur,
  IconRuler2,
  IconOverline,
  IconUnderline,
  IconStrikethrough,
  IconCircle,
} from '@tabler/icons-vue'
import { ChromePicker } from 'vue-color'
import { cn } from '@/lib/utils'
import { fontManager } from 'openvideo'
import { getGroupedFonts, getFontByPostScriptName } from '@/utils/font-utils'
import type { IClip } from 'openvideo'

interface TextPropertiesProps {
  clip: IClip
}

const props = defineProps<TextPropertiesProps>()

const GROUPED_FONTS = getGroupedFonts()

const textClip = computed(() => props.clip as any)
const style = computed(() => textClip.value.style || {})

// Local state using reactive
const localState = reactive({
  text: '',
  left: 0,
  top: 0,
  width: 0,
  height: 0,
  angle: 0,
  fontSize: 40,
  opacity: 100,
  strokeWidth: 0,
  shadowDistance: 0,
  shadowAngle: 0,
  shadowBlur: 0,
  fillColor: '#000000',
  strokeColor: '#000000',
  shadowColor: '#000000',
})

// Initialize local state from clip
const syncFromClip = () => {
  if (!textClip.value) return
  
  localState.text = textClip.value.text || ''
  localState.left = Math.round(textClip.value.left || 0)
  localState.top = Math.round(textClip.value.top || 0)
  localState.width = Math.round(textClip.value.width || 0)
  localState.height = Math.round(textClip.value.height || 0)
  localState.angle = Math.round(textClip.value.angle ?? 0)
  localState.fontSize = style.value.fontSize || 40
  localState.opacity = Math.round((textClip.value.opacity ?? 1) * 100)
  localState.strokeWidth = style.value.stroke?.width || 0
  localState.shadowDistance = Math.round(style.value.dropShadow?.distance || 0)
  localState.shadowAngle = Math.round(((style.value.dropShadow?.angle || 0) * 180) / Math.PI)
  localState.shadowBlur = style.value.dropShadow?.blur || 0
  localState.fillColor = style.value.fill || '#000000'
  localState.strokeColor = style.value.stroke?.color || '#000000'
  localState.shadowColor = style.value.dropShadow?.color || '#000000'
}

// Listen to clip events for canvas sync
onMounted(() => {
  if (!textClip.value) return

  // Initialize local state
  syncFromClip()

  const onPropsChange = () => {
    syncFromClip()
  }

  textClip.value.on?.('propsChange', onPropsChange)
  textClip.value.on?.('moving', onPropsChange)
  textClip.value.on?.('scaling', onPropsChange)
  textClip.value.on?.('rotating', onPropsChange)

  onUnmounted(() => {
    textClip.value.off?.('propsChange', onPropsChange)
    textClip.value.off?.('moving', onPropsChange)
    textClip.value.off?.('scaling', onPropsChange)
    textClip.value.off?.('rotating', onPropsChange)
  })
})

// Watch for clip prop changes
watch(() => props.clip, () => {
  syncFromClip()
})

const handleUpdate = (updates: any) => {
  textClip.value.update(updates)
}

const handleStyleUpdate = (styleUpdates: any) => {
  textClip.value.update({
    style: {
      ...style.value,
      ...styleUpdates,
    },
  })
}

const handleFontChange = async (postScriptName: string) => {
  const font = getFontByPostScriptName(postScriptName)
  if (!font) return

  await fontManager.addFont({
    name: font.postScriptName,
    url: font.url,
  })

  handleStyleUpdate({
    fontFamily: font.postScriptName,
    fontUrl: font.url,
  })
}

// Memoize font computations
const currentFont = computed(() =>
  getFontByPostScriptName(style.value.fontFamily) || GROUPED_FONTS[0]?.mainFont || GROUPED_FONTS[0]?.styles[0]
)

const currentFamily = computed(() =>
  GROUPED_FONTS.find((f) => f.family === currentFont.value?.family) || GROUPED_FONTS[0]
)

const handleStrokeUpdate = (strokeUpdates: any) => {
  textClip.value.update({
    style: {
      ...style.value,
      stroke: {
        ...(style.value.stroke || { color: '#ffffff', width: 0 }),
        ...strokeUpdates,
      },
    },
  })
}

const handleBlurUpdate = (blurUpdates: any) => {
  const currentShadow = style.value.dropShadow || {
    color: '#000000',
    alpha: 1,
    blur: 0,
    distance: 0,
    angle: 0,
  }

  const finalUpdates: any = { ...blurUpdates }

  if (blurUpdates.angle !== undefined) {
    finalUpdates.angle = (parseFloat(blurUpdates.angle) * Math.PI) / 180
  }

  if (blurUpdates.distance !== undefined) {
    finalUpdates.distance = parseFloat(blurUpdates.distance) || 0
  }

  textClip.value.update({
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
const text = computed({
  get: () => localState.text,
  set: (value) => {
    localState.text = value
    handleUpdate({ text: value })
  }
})

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

const fontSize = computed({
  get: () => localState.fontSize,
  set: (value) => {
    localState.fontSize = value
    handleStyleUpdate({ fontSize: value })
  }
})

const opacity = computed({
  get: () => localState.opacity,
  set: (value) => {
    localState.opacity = value
    handleUpdate({ opacity: value / 100 })
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
    handleBlurUpdate({ distance: value })
  }
})

const shadowAngle = computed({
  get: () => localState.shadowAngle,
  set: (value) => {
    localState.shadowAngle = value
    handleBlurUpdate({ angle: value })
  }
})

const shadowBlur = computed({
  get: () => localState.shadowBlur,
  set: (value) => {
    localState.shadowBlur = value
    handleBlurUpdate({ blur: value })
  }
})

// Color pickers using reactive state
const fillColor = computed({
  get: () => localState.fillColor,
  set: (value: any) => {
    localState.fillColor = value.hex || value
  }
})

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

// Font picker open state for lazy loading
const isFontPickerOpen = ref(false)

// Alignment options
const alignmentOptions = [
  { icon: IconAlignLeft, value: 'left' },
  { icon: IconAlignCenter, value: 'center' },
  { icon: IconAlignRight, value: 'right' },
]

const verticalAlignOptions = [
  { icon: IconUnderline, value: 'underline' },
  { icon: IconOverline, value: 'overline' },
  { icon: IconStrikethrough, value: 'strikethrough' },
]

const textCaseOptions = [
  { label: 'aA', value: 'none' },
  { label: 'AA', value: 'uppercase' },
  { label: 'aa', value: 'lowercase' },
]
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Content -->
    <div class="flex flex-col gap-2">
      <label class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Content
      </label>
      <Textarea
        v-model="text"
        class="resize-none text-sm"
        placeholder="Enter text..."
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

    <!-- Font Section -->
    <div class="flex flex-col gap-2">
      <label class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Font
      </label>

      <!-- Font Family Picker -->
      <Select
        :model-value="currentFamily?.family || ''"
        @update:model-value="(v) => {
          const family = GROUPED_FONTS.find((f) => f.family === v)
          if (family) handleFontChange(family.mainFont.postScriptName)
        }"
        @update:open="(open) => isFontPickerOpen = open"
      >
        <SelectTrigger class="w-full h-12">
          <SelectValue :placeholder="currentFamily?.family || 'Select font'">
            <div class="flex items-center h-full">
              {{ currentFamily?.family || 'Select font' }}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent class="max-h-75">
          <SelectItem
            v-for="family in isFontPickerOpen ? GROUPED_FONTS : []"
            :key="family.family"
            :value="family.family"
          >
            <div class="flex items-center py-1">
              <img
                :src="family.mainFont.preview"
                :alt="family.family"
                class="h-6 invert object-contain"
                loading="lazy"
              />
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      <div class="grid grid-cols-2 gap-2">
        <!-- Font Style Selector -->
        <Select
          :model-value="currentFont?.postScriptName || ''"
          @update:model-value="(v) => typeof v === 'string' && v && handleFontChange(v)"
        >
          <SelectTrigger class="bg-input border h-9 w-full overflow-hidden">
            <SelectValue placeholder="Style" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
            v-for="styleItem in currentFamily?.styles || []"
            :key="styleItem.id"
            :value="styleItem.postScriptName"
          >
            {{ styleItem.fullName.replace(currentFamily?.family || '', '').trim() || 'Regular' }}
          </SelectItem>
          </SelectContent>
        </Select>

        <!-- Font Size -->
        <InputGroup>
          <NumberInput v-model="fontSize" class="pl-2" />
          <InputGroupAddon align="inline-end">
            <IconTextSize class="size-4" />
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>

    <!-- Alignment Section -->
    <div class="grid grid-cols-2 gap-2">
      <!-- Text Alignment -->
      <div class="flex bg-input/30 rounded-md p-1 gap-1">
        <button
          v-for="item in alignmentOptions"
          :key="item.value"
          @click="handleUpdate({ textAlign: item.value })"
          :class="cn(
            'flex-1 flex items-center justify-center rounded-sm py-1 transition-colors',
            textClip.textAlign === item.value
              ? 'bg-white/10 text-white'
              : 'text-muted-foreground hover:bg-white/5'
          )"
        >
          <component :is="item.icon" class="size-3.5" />
        </button>
      </div>

      <!-- Vertical Alignment -->
      <div class="flex bg-input/30 rounded-md p-1 gap-1">
        <button
          v-for="item in verticalAlignOptions"
          :key="item.value"
          @click="handleUpdate({ verticalAlign: item.value })"
          :class="cn(
            'flex-1 flex items-center justify-center rounded-sm py-1 transition-colors',
            textClip.verticalAlign === item.value
              ? 'bg-white/10 text-white'
              : 'text-muted-foreground hover:bg-white/5'
          )"
        >
          <component :is="item.icon" class="size-3.5" />
        </button>
      </div>
    </div>

    <!-- Case & Color Section -->
    <div class="grid grid-cols-2 gap-2">
      <!-- Text Case -->
      <div class="flex bg-secondary/30 rounded-md p-1 gap-1">
        <button
          v-for="item in textCaseOptions"
          :key="item.value"
          @click="handleUpdate({ textCase: item.value })"
          :class="cn(
            'flex-1 text-[10px] font-medium flex items-center justify-center rounded-sm py-1 transition-colors',
            (textClip.textCase || 'none') === item.value
              ? 'bg-white/10 text-white'
              : 'text-muted-foreground hover:bg-white/5'
          )"
        >
          {{ item.label }}
        </button>
      </div>

      <!-- Fill Color -->
      <InputGroup class="flex-1">
        <InputGroupAddon align="inline-start" class="relative p-0">
          <Popover>
            <PopoverTrigger as-child>
              <button class="h-full w-8 flex items-center justify-center hover:bg-white/5">
                <div
                  class="h-4 w-4 border border-white/10 shadow-sm"
                  :style="{ backgroundColor: style.fill || '#000000' }"
                />
              </button>
            </PopoverTrigger>
            <PopoverContent class="w-auto p-3" align="start">
              <ChromePicker
                v-model="fillColor"
                @update:model-value="(color: any) => handleStyleUpdate({ fill: color.hex })"
              />
            </PopoverContent>
          </Popover>
        </InputGroupAddon>
        <InputGroupInput
          :value="(style.fill || '#000000').toUpperCase()"
          @input="(e: Event) => handleStyleUpdate({ fill: (e.target as HTMLInputElement).value })"
          class="text-sm p-0 text-[10px] font-mono"
        />
        <InputGroupAddon align="inline-end" class="border-l border-white/5 pl-2">
          <span class="text-[10px]">100%</span>
        </InputGroupAddon>
      </InputGroup>
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
                  @update:model-value="(color: any) => handleBlurUpdate({ color: color.hex })"
                />
              </PopoverContent>
            </Popover>
          </InputGroupAddon>
          <InputGroupInput
            :value="(style.dropShadow?.color || '#000000').toUpperCase()"
            @input="(e: Event) => handleBlurUpdate({ color: (e.target as HTMLInputElement).value })"
            class="text-sm p-0 text-[10px] font-mono"
          />
        </InputGroup>
      </div>
    </div>
  </div>
</template>
