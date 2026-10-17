<script setup lang="ts">
import type { GameState } from '@lcg/engine'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLabels } from '../game/labels'
import { useGameStore } from '../stores/game'
import GameCard from './GameCard.vue'

/**
 * Elecciones que no se hacen sobre la mesa (efectos de traiciones, elegir
 * habilidad, reacciones, repartir daño…): ventana en el centro con la carta que
 * se está resolviendo y las opciones. Se puede minimizar para mirar la mesa.
 */
const props = defineProps<{ state: GameState }>()
const game = useGameStore()
const { t } = useI18n()
const label = useLabels()
const minimized = ref(false)

const question = computed(() => props.state.pending?.question ?? null)
const show = computed(
  () =>
    !!question.value &&
    !question.value.story &&
    question.value.prompt !== 'prompt.chooseAction' &&
    !props.state.skillTest &&
    game.choicesByTarget.size === 0,
)
const decider = computed(
  () =>
    props.state.investigators.find((i) => i.id === props.state.pending?.investigator)?.name ?? '',
)
/** Cartas de encuentro que se están resolviendo ahora mismo. */
const resolving = computed(() =>
  Object.values(props.state.treacheries).filter((tr) => tr.placement.type === 'limbo'),
)

// Cada pregunta nueva vuelve a abrirse.
watch(question, () => (minimized.value = false))
</script>

<template>
  <template v-if="show && question">
    <div v-if="!minimized" class="overlay">
      <section class="choice">
        <header>
          <div>
            <h2>{{ label(question.prompt, question.promptParams ?? {}) }}</h2>
            <small>{{ t('game.waitingFor', { name: decider }) }}</small>
          </div>
          <button type="button" class="min" :title="t('table.viewTable')" @click="minimized = true">
            —
          </button>
        </header>
        <div v-if="resolving.length" class="cards">
          <GameCard
            v-for="tr in resolving"
            :key="tr.id"
            :code="tr.code"
            :name="tr.name"
            :width="170"
          />
        </div>
        <div class="options">
          <button
            v-for="(choice, i) in question.choices"
            :key="i"
            type="button"
            @click="game.answer(i)"
          >
            <kbd v-if="i < 9">{{ i + 1 }}</kbd>
            {{ label(choice.label, choice.params ?? {}) }}
          </button>
        </div>
      </section>
    </div>
    <button v-else type="button" class="restore" @click="minimized = false">
      {{ t('table.choose') }}: {{ label(question.prompt, question.promptParams ?? {}) }}
    </button>
  </template>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 800;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgb(0 0 0 / 45%);
}
.choice {
  width: min(520px, 100%);
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  padding: 16px 18px 18px;
  border: 1px solid var(--accent);
  border-radius: 10px;
  background: rgb(17 13 20 / 92%);
  box-shadow: 0 12px 40px rgb(0 0 0 / 60%);
}
header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
h2 {
  margin: 0;
  font-size: 1.1rem;
}
small {
  opacity: 0.7;
}
.min {
  padding: 0 10px;
}
.cards {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 14px;
}
.options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.options button {
  text-align: left;
  padding: 9px 12px;
}
kbd {
  display: inline-block;
  min-width: 1.3em;
  margin-right: 6px;
  padding: 0 4px;
  border: 1px solid var(--border);
  border-bottom-width: 2px;
  border-radius: 4px;
  font-size: 0.75em;
  text-align: center;
  opacity: 0.8;
}
.restore {
  position: fixed;
  z-index: 800;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  border: 1px solid var(--accent);
  box-shadow: 0 4px 16px rgb(0 0 0 / 50%);
}
</style>
