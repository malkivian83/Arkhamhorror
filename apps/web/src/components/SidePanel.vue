<script setup lang="ts">
import type { GameState } from '@lcg/engine'
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useLabels } from '../game/labels'
import { useGameStore } from '../stores/game'
import GameCard from './GameCard.vue'

const props = defineProps<{ state: GameState }>()
const game = useGameStore()
const { t } = useI18n()
const label = useLabels()
const logEl = ref<HTMLElement | null>(null)

const decider = computed(
  () =>
    props.state.investigators.find((i) => i.id === props.state.pending?.investigator)?.name ?? '',
)
const entries = computed(() => props.state.log.slice(-120))
const router = useRouter()
/** Cartas de encuentro que se están resolviendo ahora mismo. */
const resolving = computed(() =>
  Object.values(props.state.treacheries).filter((tr) => tr.placement.type === 'limbo'),
)

function quit() {
  if (!window.confirm(t('setup.confirmQuit'))) return
  game.quit()
  void router.push('/')
}

watch(
  () => props.state.log.length,
  async () => {
    await nextTick()
    logEl.value?.scrollTo({ top: logEl.value.scrollHeight })
  },
)
</script>

<template>
  <aside class="side">
    <div class="phase">
      <strong>{{ t('game.round', { round: state.round }) }}</strong>
      <span>{{ t(`phase.${state.phase}`) }}</span>
      <button type="button" class="quit" :title="t('setup.quit')" @click="quit">✕</button>
    </div>

    <div v-if="resolving.length" class="resolving">
      <GameCard v-for="tr in resolving" :key="tr.id" :code="tr.code" :name="tr.name" :width="150" />
    </div>

    <div v-if="state.outcome" class="outcome">
      {{
        state.outcome.type === 'resolution'
          ? t('game.won', { n: state.outcome.resolution })
          : t('game.lost')
      }}
    </div>

    <div v-else-if="state.pending" class="question">
      <p class="prompt">{{ t(state.pending.question.prompt) }}</p>
      <p class="who">{{ t('game.waitingFor', { name: decider }) }}</p>
      <p v-if="game.choicesByTarget.size" class="hint">↖ {{ t('table.clickHighlighted') }}</p>
      <div class="buttons">
        <button
          v-for="o in game.untargetedChoices"
          :key="o.index"
          type="button"
          @click="game.answer(o.index)"
        >
          {{ label(o.choice.label, o.choice.params ?? {}) }}
        </button>
      </div>
      <details v-if="game.choicesByTarget.size" class="all">
        <summary>{{ t('table.otherChoices') }}</summary>
        <button
          v-for="(choice, index) in state.pending.question.choices.filter((c) => c.target)"
          :key="index"
          type="button"
          @click="game.answer(state.pending.question.choices.indexOf(choice))"
        >
          {{ label(choice.label, choice.params ?? {}) }}
        </button>
      </details>
      <p v-if="game.error" class="error">{{ game.error }}</p>
    </div>

    <h4>{{ t('table.log') }}</h4>
    <ol ref="logEl" class="log">
      <li
        v-for="(entry, n) in entries"
        :key="n"
        :class="{ heading: entry.key === 'log.round' || entry.key === 'log.phase' }"
      >
        {{ label(entry.key, entry.params ?? {}) }}
      </li>
    </ol>
  </aside>
</template>

<style scoped>
.side {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  background: var(--panel);
  border-left: 1px solid var(--border);
  min-height: 0;
}
.resolving {
  display: flex;
  justify-content: center;
  gap: 8px;
}
.quit {
  padding: 0 8px;
  margin-left: 8px;
  opacity: 0.6;
}
.phase {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-radius: 6px;
  background: var(--panel-2);
}
.question {
  border: 1px solid var(--accent);
  border-radius: 8px;
  padding: 10px;
  background: rgb(201 162 39 / 8%);
}
.prompt {
  margin: 0;
  font-weight: 700;
}
.who,
.hint {
  margin: 4px 0;
  font-size: 0.8rem;
  opacity: 0.8;
}
.buttons {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}
.all {
  margin-top: 8px;
  font-size: 0.85rem;
}
.all button {
  display: block;
  width: 100%;
  margin-top: 4px;
  text-align: left;
}
.error {
  color: #ff8a80;
  font-size: 0.8rem;
}
.outcome {
  font-size: 1.1rem;
  font-weight: 700;
  padding: 12px;
  border-radius: 8px;
  background: var(--panel-2);
  border: 1px solid var(--accent);
}
h4 {
  margin: 4px 0 0;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.7;
}
.log {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex: 1;
  min-height: 120px;
  font-size: 0.82rem;
}
.log li {
  padding: 3px 4px;
  border-bottom: 1px solid var(--border);
}
.log li.heading {
  font-weight: 700;
  color: var(--accent);
}
</style>
