<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { InputGroupInput } from '@/components/ui/input-group'
import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'vue'

interface NumberInputProps {
  modelValue: number
  class?: HTMLAttributes['class']
  min?: number
  max?: number
  defaultValue?: number
}

const props = withDefaults(defineProps<NumberInputProps>(), {
  defaultValue: 0
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const localValue = ref<string>(props.modelValue?.toString() || '0')
const isFocused = ref(false)
const previousValue = ref<number>(props.modelValue)

// Sync with external value only when not focused
watch(() => props.modelValue, (newValue) => {
  if (!isFocused.value) {
    localValue.value = newValue?.toString() || '0'
    previousValue.value = newValue
  }
})

const applyValue = (inputValue: string) => {
  // If empty, use default value
  if (inputValue.trim() === '') {
    emit('update:modelValue', props.defaultValue)
    localValue.value = props.defaultValue.toString()
    return
  }

  // Parse and validate
  let parsed = parseFloat(inputValue)

  if (isNaN(parsed)) {
    // Invalid input - revert to previous value
    localValue.value = previousValue.value.toString()
    return
  }

  // Apply min/max constraints
  if (props.min !== undefined && parsed < props.min) {
    parsed = props.min
  }
  if (props.max !== undefined && parsed > props.max) {
    parsed = props.max
  }

  // Update if value changed
  if (parsed !== previousValue.value) {
    emit('update:modelValue', parsed)
    previousValue.value = parsed
  }

  localValue.value = parsed.toString()
}

const handleInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  const newValue = target.value

  // Allow empty, numbers, negative sign, and decimal point
  if (newValue === '' || newValue === '-' || /^-?\d*\.?\d*$/.test(newValue)) {
    localValue.value = newValue
  }
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    applyValue(localValue.value)
    ;(e.target as HTMLInputElement).blur()
  } else if (e.key === 'Escape') {
    // Revert to previous value
    localValue.value = previousValue.value.toString()
    ;(e.target as HTMLInputElement).blur()
  }
}

const handleBlur = () => {
  isFocused.value = false
  applyValue(localValue.value)
}

const handleFocus = (e: Event) => {
  isFocused.value = true
  // Select all text on focus for easy editing
  ;(e.target as HTMLInputElement).select()
}
</script>

<template>
  <InputGroupInput
    type="text"
    inputmode="decimal"
    :model-value="localValue"
    @input="handleInput"
    @keydown="handleKeyDown"
    @focus="handleFocus"
    @blur="handleBlur"
    :class="cn('text-sm', props.class)"
  />
</template>
