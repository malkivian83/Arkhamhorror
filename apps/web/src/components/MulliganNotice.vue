<script setup lang="ts">
import type { GameState } from '@lcg/engine'
import { computed, onMounted, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { cardName } from '../game/cards'
import { inspected } from '../game/inspect'
import GameCard from './GameCard.vue'
import { startingMulligan } from '../game/mulligan'
import { useTableGame } from '../game/tableController'

/** Aviso al empezar la partida: cada investigador puede cambiar su mano inicial una vez. */
const props = defineProps<{ state: GameState }>()
const game = useTableGame()
const { t } = useI18n()
const dialog = ref<HTMLDialogElement>()
const titleId = useId()
/** Avisos ya leídos, por escenario e investigador. */
const seen = ref(new Set<string>())

const who = computed(() => startingMulligan(props.state))
const key = computed(() => (who.value ? `${props.state.scenarioId}:${who.value.id}` : ''))
const show = computed(
  () =>
    !!who.value &&
    (!game.online || who.value.id === game.ownInvestigator) &&
    !seen.value.has(key.value),
)
const hand = computed(
  () => props.state.investigators.find((i) => i.id === who.value?.id)?.hand ?? [],
)

function inspectCard(code: string) {
  inspected.value = {
    card: { code, name: cardName(code), back: false, landscape: false },
    target: '',
  }
}

function dismiss() {
  if (key.value) seen.value = new Set(seen.value).add(key.value)
}
function keep() {
  dismiss()
  game.answerLabel('choice.keepHand')
}
function sync() {
  if (show.value && !dialog.value?.open) dialog.value?.showModal()
  if (!show.value && dialog.value?.open) dialog.value.close()
}
watch(show, sync, { flush: 'post' })
onMounted(sync)
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="mulligan-notice"
      :aria-labelledby="titleId"
      @close="dismiss"
      @keydown.stop
    >
      <template v-if="who">
        <p class="eyebrow">{{ who.name }}</p>
        <h2 :id="titleId">{{ t('table.mulliganNotice.title') }}</h2>
        <p>{{ t('table.mulliganNotice.body') }}</p>
        <p class="once">{{ t('table.mulliganNotice.once') }}</p>
        <div class="opening-hand" :aria-label="t('table.hand')">
          <button
            v-for="(code, index) in hand"
            :key="index"
            type="button"
            class="hand-card"
            @click="inspectCard(code)"
          >
            <GameCard :code="code" :name="cardName(code)" :width="150" no-zoom />
          </button>
        </div>
        <footer>
          <button type="button" class="table-action" autofocus @click="dismiss">
            {{ t('table.mulliganNotice.choose') }}
          </button>
          <button type="button" class="table-action secondary" @click="keep">
            {{ t('choice.keepHand') }}
          </button>
        </footer>
      </template>
    </dialog>
  </Teleport>
</template>

<style scoped>
.mulligan-notice {
  width: min(900px, calc(100vw - 24px));
  max-height: calc(100dvh - 24px);
  overflow-y: auto;
  max-width: none;
  box-sizing: border-box;
  margin: auto;
  padding: 20px;
  color: #f4efe7;
  background: #19191d;
  border: 1px solid var(--accent);
  border-radius: 10px;
  font-family: 'Source Sans 3', system-ui, sans-serif;
  text-align: center;
  box-shadow: 0 16px 56px #0009;
}
.mulligan-notice::backdrop {
  background: rgb(0 0 0 / 70%);
}
.opening-hand {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 16px;
}
.hand-card {
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  cursor: zoom-in;
}
.hand-card:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 3px;
}
@media (max-width: 400px) {
  .mulligan-notice {
    padding: 12px;
  }
  .hand-card :deep(.game-card) {
    width: 120px !important;
    height: 168px !important;
  }
}
.eyebrow {
  margin: 0;
  color: var(--accent);
}
h2 {
  margin: 6px 0 12px;
}
p {
  line-height: 1.5;
}
.once {
  color: #d0c7c1;
  font-size: 0.9rem;
}
footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
}
footer button {
  flex: 1 1 180px;
  min-height: 48px;
}
</style>
