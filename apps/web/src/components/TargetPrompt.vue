<script setup lang="ts">
import type { GameState } from '@lcg/engine'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLabels } from '../game/labels'
import { localName } from '../game/localized'
import { useTableGame } from '../game/tableController'
import GameCard from './GameCard.vue'

/**
 * Elecciones que se hacen pulsando la mesa (un Lugar, un enemigo…): sin
 * ventana, el mapa solo resalta las opciones. Este aviso sobre el tapete dice
 * qué se elige, para qué carta y quién decide; el detalle sigue en el panel.
 */
const props = defineProps<{ state: GameState }>()
const game = useTableGame()
const { t } = useI18n()
const label = useLabels()

const question = computed(() => props.state.pending?.question ?? null)
const show = computed(
  () =>
    !!question.value &&
    !question.value.story &&
    !question.value.mulligan &&
    question.value.prompt !== 'prompt.chooseAction' &&
    !props.state.skillTest &&
    game.choicesByTarget.size > 0,
)
const decider = computed(
  () =>
    props.state.investigators.find((i) => i.id === props.state.pending?.investigator)?.name ?? '',
)
/** Carta de encuentro que se está resolviendo (por ejemplo, la que hay que poner en un Lugar). */
const resolving = computed(() =>
  Object.values(props.state.treacheries).find((tr) => tr.placement.type === 'limbo'),
)
</script>

<template>
  <div v-if="show && question" class="target-prompt" role="status" aria-live="polite">
    <GameCard
      v-if="resolving"
      :code="resolving.code"
      :name="resolving.name"
      :width="56"
      :title="localName(resolving.name)"
    />
    <div class="text">
      <p class="prompt">{{ label(question.prompt, question.promptParams ?? {}) }}</p>
      <p class="hint">
        {{ t('game.waitingFor', { name: decider }) }} · {{ t('table.targetHint') }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.target-prompt {
  grid-column: 1;
  grid-row: 2;
  align-self: start;
  justify-self: center;
  position: relative;
  z-index: 15;
  display: flex;
  align-items: center;
  gap: 12px;
  box-sizing: border-box;
  max-width: min(640px, calc(100% - 24px));
  margin-top: 10px;
  padding: 8px 14px;
  color: var(--parch-ink);
  background: var(--parch);
  border: 1px solid var(--brass);
  border-radius: 8px;
  box-shadow: 0 4px 14px #000a;
  animation: drop 0.2s ease-out;
}
.text {
  min-width: 0;
}
p {
  margin: 0;
}
.prompt {
  font-weight: 600;
  line-height: 1.3;
}
.hint {
  margin-top: 2px;
  font-size: 0.8rem;
  opacity: 0.8;
}
@keyframes drop {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .target-prompt {
    animation: none;
  }
}
</style>
