<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface WebCodecsUnsupportedModalProps {
  open: boolean;
}

defineProps<WebCodecsUnsupportedModalProps>();
</script>

<template>
  <Dialog :open="open">
    <DialogContent :show-close-button="false" class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Browser Not Supported</DialogTitle>
      </DialogHeader>
      <div class="space-y-3">
        <p class="text-sm text-muted-foreground">
          Your browser doesn't support WebCodecs, which is required for this
          video editor.
        </p>
        <div>
          <p class="font-medium text-sm mb-2">
            Please use one of the following browsers:
          </p>
          <ul class="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Google Chrome (version 94+)</li>
            <li>Microsoft Edge (version 94+)</li>
            <li>Opera (version 80+)</li>
          </ul>
        </div>
        <p class="text-xs text-muted-foreground">
          Note: Safari and Firefox do not currently support WebCodecs.
        </p>
      </div>
    </DialogContent>
  </Dialog>
</template>
