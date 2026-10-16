<script setup lang="ts">
import type { SlotType } from '@lcg/engine'

/** Silueta de una ranura de equipo, dibujada a mano (no son los iconos oficiales). */
defineProps<{ type: SlotType }>()
</script>

<template>
  <svg viewBox="0 0 32 32" class="slot-icon" aria-hidden="true">
    <path
      v-if="type === 'hand'"
      d="M9 17V8.5a1.8 1.8 0 0 1 3.6 0V15V5.8a1.8 1.8 0 0 1 3.6 0V15V6.8a1.8 1.8 0 0 1 3.6 0V15.5V9.5a1.8 1.8 0 0 1 3.6 0V19c0 5-3.4 9-8.3 9-3.3 0-5.2-1.6-6.8-4L4.7 19.3a1.9 1.9 0 0 1 3-2.3Z"
    />
    <path
      v-else-if="type === 'body'"
      d="M11 4h3c.5 1.6 1.2 2.4 2 2.4s1.5-.8 2-2.4h3l7 4.5-2.6 5.2-3.4-1.8V28H10V11.9l-3.4 1.8L4 8.5Z"
    />
    <path
      v-else-if="type === 'ally'"
      d="M16 4a6 6 0 1 1 0 12a6 6 0 0 1 0-12Zm-11 24c0-6 4.9-10 11-10s11 4 11 10Z"
    />
    <g v-else-if="type === 'accessory'">
      <path d="M6 4c0 7 4 11 10 11s10-4 10-11" fill="none" stroke="currentColor" stroke-width="2" />
      <path d="M16 15l6 7-6 7-6-7Z" />
    </g>
    <g v-else-if="type === 'arcane'">
      <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" stroke-width="2" />
      <path d="M16 4.5l3.4 10.4H30L21.3 21l3.3 10L16 24.8 7.4 31l3.3-10L2 14.9h10.6Z" />
    </g>
    <path
      v-else
      d="M9 18c.4-6 2.6-11 7-11s6.6 5 7 11c3.6.6 6 1.8 6 3.2 0 2.2-5.8 3.8-13 3.8S3 23.4 3 21.2c0-1.4 2.4-2.6 6-3.2Z"
    />
  </svg>
</template>

<style scoped>
.slot-icon {
  width: 30px;
  height: 30px;
  fill: currentColor;
}
</style>
