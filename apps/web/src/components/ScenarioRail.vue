<script setup lang="ts">
import { cluesToAdvanceAct, type GameState } from '@lcg/engine'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ScenarioDeckViewer from './ScenarioDeckViewer.vue'
import TableTarget from './TableTarget.vue'
import TokenBadge from './TokenBadge.vue'

const props = defineProps<{ state: GameState }>()
const { t } = useI18n()
const agenda = computed(() => props.state.agendas[props.state.agendaIndex])
const act = computed(() => props.state.acts[props.state.actIndex])
const actClues = computed(() => cluesToAdvanceAct(props.state))
</script>

<template>
  <aside class="scenario-rail" :aria-label="t('table.scenarioProgress')">
    <div v-if="agenda" class="rail-item">
      <ScenarioDeckViewer
        kind="agenda"
        :cards="state.agendas"
        :active-index="state.agendaIndex"
        compact
      />
      <TableTarget target="agenda">
        <span class="rail-metric">
          <span class="metric-value"
            ><TokenBadge kind="doom" value="" :size="18" aria-hidden="true" /><strong
              >{{ state.doom }}/{{ agenda.doomThreshold }}</strong
            ></span
          >
          <span class="metric-label">{{ t('table.doom') }}</span>
        </span>
      </TableTarget>
    </div>
    <div v-if="act" class="rail-item">
      <ScenarioDeckViewer kind="act" :cards="state.acts" :active-index="state.actIndex" compact />
      <TableTarget target="act">
        <span v-if="actClues !== null" class="rail-metric">
          <span class="metric-value"
            ><TokenBadge kind="clue" value="" :size="18" aria-hidden="true" /><strong>{{
              actClues
            }}</strong></span
          >
          <span class="metric-label">{{ t('table.clues') }}</span>
        </span>
        <span v-else class="rail-metric"
          ><span class="metric-label">{{ t('table.actions') }}</span></span
        >
      </TableTarget>
    </div>
  </aside>
</template>

<style scoped>
.scenario-rail {
  --accent: #e5aa8d;
  --eldritch: #e5aa8d;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  padding: 70px 6px 12px;
  background: #121216;
  color: #f4efe7;
  border-right: 1px solid #62585b;
  font-family: 'Source Sans 3', system-ui, sans-serif;
}
.rail-item {
  min-width: 0;
  padding-bottom: 10px;
  border-bottom: 1px solid #4b4246;
}
.rail-item :deep(.table-target) {
  display: block;
  margin-top: 4px;
  border-radius: 3px;
}
.rail-item :deep(.hint) {
  position: static;
  display: block;
  transform: none;
  max-width: none;
  white-space: normal;
  overflow: visible;
  padding: 3px;
  text-align: center;
  font:
    600 0.6875rem/1.3 'Source Sans 3',
    system-ui,
    sans-serif;
}
.rail-metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  gap: 3px;
  padding: 4px 0;
  background: #25252b;
  border-radius: 3px;
}
.metric-value {
  display: flex;
  align-items: center;
  gap: 4px;
}
.metric-value strong {
  font-size: 0.875rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.metric-label {
  font-size: 0.6875rem;
  line-height: 1.2;
  color: #d0c7c1;
}
</style>
