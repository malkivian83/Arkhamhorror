<script setup lang="ts">
import { computed } from 'vue'
import { iconParts } from '../game/cardText'

/** Icono dentro de un texto de historia: símbolo oficial o letra de respaldo. */
const props = defineProps<{ name: string }>()
const parts = computed(() => iconParts(props.name))
</script>

<template>
  <span v-if="parts" class="story-icon" :class="parts.cls"
    ><i v-if="parts.glyph" class="ahi">{{ parts.glyph }}</i
    ><b class="fb">{{ parts.text }}</b></span
  >
</template>

<style scoped>
.story-icon {
  display: inline-block;
  margin: 0 0.1em;
  font-style: normal;
  font-weight: normal;
}
</style>
