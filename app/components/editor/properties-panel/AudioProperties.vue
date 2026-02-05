<script setup lang="ts">
import { ref } from 'vue'
import { Slider } from '@/components/ui/slider'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { IconVolume, IconGauge, IconMusic } from '@tabler/icons-vue'
import type { IClip } from 'openvideo'

interface AudioPropertiesProps {
  clip: IClip
}

const props = defineProps<AudioPropertiesProps>()

const audioClip = ref(props.clip as any)

const handleUpdate = (updates: any) => {
  audioClip.value.update(updates)
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Volume Section -->
    <div class="flex flex-col gap-2">
      <label class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Volume
      </label>
      <div class="flex items-center gap-4">
        <IconVolume class="size-4 text-muted-foreground" />
        <Slider
          :model-value="[Math.round((audioClip.volume ?? 1) * 100)]"
          @update:model-value="(v) => v && v[0] !== undefined && handleUpdate({ volume: v[0] / 100 })"
          :max="100"
          :step="1"
          class="flex-1"
        />
        <InputGroup class="w-20">
          <InputGroupInput
            type="number"
            :value="Math.round((audioClip.volume ?? 1) * 100)"
            @input="(e: Event) => handleUpdate({ volume: (parseInt((e.target as HTMLInputElement).value) || 0) / 100 })"
            class="text-sm p-0 text-center"
          />
          <InputGroupAddon align="inline-end" class="p-0 pr-2">
            <span class="text-[10px] text-muted-foreground">%</span>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>

    <!-- Pitch Section (UI Only) -->
    <div class="flex flex-col gap-2">
      <label class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Pitch
      </label>
      <div class="flex items-center gap-4">
        <IconMusic class="size-4 text-muted-foreground" />
        <Slider
          :model-value="[0]"
          :min="-12"
          :max="12"
          :step="1"
          class="flex-1"
          disabled
        />
        <InputGroup class="w-20">
          <InputGroupInput
            type="number"
            :value="0"
            disabled
            class="text-sm p-0 text-center"
          />
          <InputGroupAddon align="inline-end" class="p-0 pr-2">
            <span class="text-[10px] text-muted-foreground">st</span>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>

    <!-- Speed Section (UI Only) -->
    <div class="flex flex-col gap-2">
      <label class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Speed
      </label>
      <div class="flex items-center gap-4">
        <IconGauge class="size-4 text-muted-foreground" />
        <Slider
          :model-value="[100]"
          :min="25"
          :max="400"
          :step="5"
          class="flex-1"
          disabled
        />
        <InputGroup class="w-20">
          <InputGroupInput
            type="number"
            :value="100"
            disabled
            class="text-sm p-0 text-center"
          />
          <InputGroupAddon align="inline-end" class="p-0 pr-2">
            <span class="text-[10px] text-muted-foreground">%</span>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  </div>
</template>
