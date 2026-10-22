<script setup lang="ts">
import type { GameState } from '@lcg/engine'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * Registro de campaña durante la partida: lo que el escenario pide recordar
 * ("recuerda que los investigadores han limpiado la sangre") y las notas de
 * campaña ya ganadas.
 */
const props = defineProps<{ state: GameState }>()
const { t, te } = useI18n()

// Solo las claves con texto en `record` son acontecimientos; el resto de
// scenarioMeta son contadores internos del escenario.
const remembered = computed(() =>
  Object.entries(props.state.scenarioMeta ?? {})
    .filter(([key, value]) => value === 1 && te(`record.${key}`))
    .map(([key]) => key),
)
const log = computed(() => props.state.campaignLog)
</script>

<template>
  <details class="record">
    <summary>📜 {{ t('record.title') }}</summary>
    <h5>{{ t('record.scenario') }}</h5>
    <ul v-if="remembered.length">
      <li v-for="key in remembered" :key="key">{{ t(`record.${key}`) }}</li>
    </ul>
    <p v-else class="empty">{{ t('record.noScenario') }}</p>
    <h5>{{ t('campaign.notes') }}</h5>
    <ul v-if="log?.notes.length">
      <li v-for="note in log.notes" :key="note" :class="{ crossed: log.crossedOut.includes(note) }">
        {{ t(`story.note.${note}`) }}
        <template v-if="log.values[note]">: {{ log.values[note] }}</template>
      </li>
    </ul>
    <p v-else class="empty">{{ t('campaign.noNotes') }}</p>
  </details>
</template>

<style scoped>
.record {
  margin: 8px 0;
  font-size: 0.85rem;
}
summary {
  cursor: pointer;
  font-weight: 600;
}
h5 {
  margin: 8px 0 2px;
  font-size: 0.8rem;
}
ul {
  margin: 0;
  padding-left: 18px;
}
li {
  line-height: 1.4;
}
.crossed {
  text-decoration: line-through;
  opacity: 0.6;
}
.empty {
  margin: 0;
  opacity: 0.7;
}
</style>
