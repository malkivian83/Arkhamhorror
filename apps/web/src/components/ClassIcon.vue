<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { CLASS_COLORS } from '../game/cards'

defineProps<{ faction: string }>()
const { t } = useI18n()

// Siluetas propias para identificar las clases sin depender de imágenes externas.
const paths: Record<string, string> = {
  guardian: 'M12 2 20 5v6c0 5-4 8-8 11-4-3-8-6-8-11V5Z M12 6v11M8 10h8',
  seeker: 'M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3Z M12 6v15M6 8h3M15 8h3M6 12h3M15 12h3',
  rogue: 'm12 2 8 10-8 10-8-10Z M12 6v12M8 12h8',
  mystic: 'M2 12Q12-2 22 12 12 26 2 12Z M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  survivor: 'm13 2-2 8H5l5 5-2 7 6-6h6l-4-5 2-7Z',
  neutral: 'M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0 M8 12h8M12 8v8',
}
</script>

<template>
  <svg
    class="class-icon"
    viewBox="0 0 24 24"
    role="img"
    :aria-label="t(`class.${faction}`)"
    :style="{ color: CLASS_COLORS[faction] ?? CLASS_COLORS.neutral }"
  >
    <title>{{ t(`class.${faction}`) }}</title>
    <path :d="paths[faction] ?? paths.neutral" />
  </svg>
</template>

<style scoped>
.class-icon {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linejoin: round;
  stroke-linecap: round;
}
</style>
