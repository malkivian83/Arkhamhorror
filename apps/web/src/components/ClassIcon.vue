<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CLASS_COLORS } from '../game/cards'
import CopperIcon from './CopperIcon.vue'

const props = defineProps<{ faction: string }>()
const { t } = useI18n()
const factions = ['guardian', 'seeker', 'rogue', 'mystic', 'survivor', 'neutral'] as const
const factionName = computed(
  () => factions.find((faction) => faction === props.faction) ?? 'neutral',
)
</script>

<template>
  <span
    class="class-icon"
    role="img"
    :aria-label="t(`class.${factionName}`)"
    :title="t(`class.${factionName}`)"
  >
    <CopperIcon :symbol="factionName" :accent="CLASS_COLORS[factionName] ?? '#8a8a8a'" />
  </span>
</template>

<style scoped>
.class-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  vertical-align: middle;
}
.class-icon :deep(svg) {
  width: 100%;
  height: 100%;
}
</style>
