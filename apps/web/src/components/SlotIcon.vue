<script setup lang="ts">
import type { SlotType } from '@lcg/engine'
import CopperIcon from './CopperIcon.vue'

/** Símbolo propio de equipo, con el mismo acabado que los tipos de carta. */
defineProps<{ type: SlotType }>()
</script>

<template>
  <CopperIcon :symbol="type" class="slot-icon" />
</template>

<style scoped>
.slot-icon {
  width: 30px;
  height: 30px;
}
</style>
