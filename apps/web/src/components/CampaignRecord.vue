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
const total = computed(() => remembered.value.length + (log.value?.notes.length ?? 0))
</script>

<template>
  <details class="record">
    <summary>
      <span class="seal" aria-hidden="true">✒</span>
      <span class="title">{{ t('record.title') }}</span>
      <span v-if="total" class="count">{{ total }}</span>
      <span class="chevron" aria-hidden="true">▾</span>
    </summary>
    <div class="sheet">
      <section>
        <h5>{{ t('record.scenario') }}</h5>
        <ul v-if="remembered.length">
          <li v-for="key in remembered" :key="key">{{ t(`record.${key}`) }}</li>
        </ul>
        <p v-else class="empty">{{ t('record.noScenario') }}</p>
      </section>
      <section>
        <h5>{{ t('campaign.notes') }}</h5>
        <ul v-if="log?.notes.length">
          <li
            v-for="note in log.notes"
            :key="note"
            :class="{ crossed: log.crossedOut.includes(note) }"
          >
            {{ t(`story.note.${note}`) }}
            <template v-if="log.values[note]">: {{ log.values[note] }}</template>
          </li>
        </ul>
        <p v-else class="empty">{{ t('campaign.noNotes') }}</p>
      </section>
    </div>
  </details>
</template>

<style scoped>
.record {
  /* Ficha del archivo de la campaña, grapada al diario. */
  position: relative;
  color: var(--parch-ink);
  background: linear-gradient(170deg, #efe2bd, #e2cf9f);
  border: 1px solid #8a6c3c;
  border-left: 4px solid #7a2e22;
  border-radius: 2px 6px 6px 2px;
  box-shadow:
    inset 0 0 0 2px rgb(255 248 224 / 40%),
    2px 3px 0 rgb(60 40 15 / 22%);
}
summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  cursor: pointer;
  list-style: none;
  user-select: none;
}
summary::-webkit-details-marker {
  display: none;
}
summary:hover {
  background: rgb(255 248 224 / 35%);
}
summary:focus-visible {
  outline: 2px solid #7a2e22;
  outline-offset: 2px;
}
.seal {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  flex: none;
  border-radius: 50%;
  color: #f6e7c4;
  background: radial-gradient(circle at 35% 30%, #a8483a, #6d2219);
  box-shadow: 0 1px 2px rgb(0 0 0 / 35%);
  font-size: 0.8rem;
}
.title {
  flex: 1;
  font-family: var(--display);
  font-size: 0.85rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #5a3e1c;
}
.count {
  min-width: 20px;
  padding: 0 6px;
  border-radius: 10px;
  text-align: center;
  font-family: var(--type);
  font-size: 0.75rem;
  line-height: 20px;
  color: #f6e7c4;
  background: #6e5631;
}
.chevron {
  color: #6e5631;
  transition: transform 0.15s ease;
}
.record:not([open]) .chevron {
  transform: rotate(-90deg);
}
.sheet {
  padding: 2px 12px 10px;
  border-top: 1px dashed #a8895a;
}
h5 {
  margin: 10px 0 4px;
  font-family: var(--type);
  font-size: 0.72rem;
  font-weight: normal;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7a5b30;
}
ul {
  margin: 0;
  padding: 0;
  list-style: none;
}
li {
  position: relative;
  padding: 3px 0 3px 18px;
  font-family: var(--fell);
  font-size: 0.95rem;
  line-height: 1.35;
  border-bottom: 1px solid rgb(110 86 49 / 18%);
}
li:last-child {
  border-bottom: 0;
}
li::before {
  content: '✓';
  position: absolute;
  left: 2px;
  color: #7a2e22;
  font-weight: 700;
}
li.crossed {
  text-decoration: line-through;
  text-decoration-color: #7a2e22;
  opacity: 0.6;
}
li.crossed::before {
  content: '✗';
}
.empty {
  margin: 0;
  font-family: var(--fell);
  font-style: italic;
  font-size: 0.9rem;
  opacity: 0.65;
}
@media (prefers-reduced-motion: reduce) {
  .chevron {
    transition: none;
  }
}
</style>
