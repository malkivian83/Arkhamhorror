<script setup lang="ts">
import type { PlayerCardDef } from '@lcg/engine'
import CopperIcon from './CopperIcon.vue'

/** Decorativo: acompaña siempre al nombre traducido del tipo de carta. */
defineProps<{ type: PlayerCardDef['type'] }>()
</script>

<template>
  <CopperIcon :symbol="type" class="card-type-icon" />
</template>
