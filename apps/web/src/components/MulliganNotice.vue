<script setup lang="ts">
import type { GameState } from '@lcg/engine'
import { computed, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { startingMulligan } from '../game/mulligan'
import { useTableGame } from '../game/tableController'

/** Aviso al empezar la partida: cada investigador puede cambiar su mano inicial una vez. */
const props = defineProps<{ state: GameState }>()
const game = useTableGame()
const { t } = useI18n()
const titleId = useId()
/** Avisos ya leídos, por escenario e investigador. */
const seen = ref(new Set<string>())

const who = computed(() => startingMulligan(props.state))
const key = computed(() => (who.value ? `${props.state.scenarioId}:${who.value.id}` : ''))
const show = computed(() => !!who.value && !seen.value.has(key.value))

function dismiss() {
  if (key.value) seen.value = new Set(seen.value).add(key.value)
}
function keep() {
  dismiss()
  game.answerLabel('choice.keepHand')
}
</script>

<template>
  <section v-if="show && who" class="mulligan-notice" :aria-labelledby="titleId">
    <p class="eyebrow">{{ who.name }}</p>
    <h2 :id="titleId">{{ t('table.mulliganNotice.title') }}</h2>
    <p>{{ t('table.mulliganNotice.body') }}</p>
    <p class="once">{{ t('table.mulliganNotice.once') }}</p>
    <footer>
      <button type="button" class="table-action" @click="dismiss">
        {{ t('table.mulliganNotice.choose') }}
      </button>
      <button type="button" class="table-action secondary" @click="keep">
        {{ t('choice.keepHand') }}
      </button>
    </footer>
  </section>
</template>

<style scoped>
.mulligan-notice {
  width: 100%;
  box-sizing: border-box;
  margin: 0 0 12px;
  padding: 12px;
  color: #f4efe7;
  background: #19191d;
  border: 1px solid var(--accent);
  border-radius: 10px;
  font-family: 'Source Sans 3', system-ui, sans-serif;
  text-align: center;
  box-shadow: 0 16px 56px #0009;
}
.eyebrow {
  margin: 0;
  color: var(--accent);
}
h2 {
  margin: 4px 0 6px;
  font-size: 1.1rem;
}
p {
  margin: 4px 0;
  font-size: 0.85rem;
  line-height: 1.35;
}
.once {
  color: #d0c7c1;
  font-size: 0.8rem;
}
footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
}
footer button {
  flex: 1 1 140px;
  min-height: 48px;
}
</style>
