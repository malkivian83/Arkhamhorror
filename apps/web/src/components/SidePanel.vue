<script setup lang="ts">
import type { GameState } from '@lcg/engine'
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useLabels } from '../game/labels'
import type { UndoKind } from '../game/undo'
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

const UNDO_KINDS: UndoKind[] = ['step', 'action', 'turn', 'round']

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
  <aside class="side" :aria-label="t('table.journal')">
    <div class="phase">
      <strong>{{ t('game.round', { round: state.round }) }}</strong>
      <span>{{ t(`phase.${state.phase}`) }}</span>
      <button type="button" class="quit" :title="t('setup.quit')" @click="quit">✕</button>
    </div>

    <div class="undo">
      <span>↶ {{ t('undo.title') }}</span>
      <button
        v-for="kind in UNDO_KINDS"
        :key="kind"
        type="button"
        :disabled="game.undoTargets[kind] === null"
        :title="t(`undo.hint.${kind}`)"
        @click="game.undo(kind)"
      >
        {{ t(`undo.${kind}`) }}
      </button>
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

    <div v-else-if="state.pending" class="question" aria-live="polite">
      <p class="prompt">{{ t(state.pending.question.prompt) }}</p>
      <p class="who">{{ t('game.waitingFor', { name: decider }) }}</p>
      <p v-if="game.choicesByTarget.size" class="hint">↖ {{ t('table.clickHighlighted') }}</p>
      <div class="buttons">
        <button
          v-for="(o, n) in game.untargetedChoices"
          :key="o.index"
          type="button"
          @click="game.answer(o.index)"
        >
          <kbd v-if="n < 9">{{ n + 1 }}</kbd>
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

    <details class="keys">
      <summary>⌨ {{ t('shortcuts.title') }}</summary>
      <dl>
        <dt><kbd>D</kbd></dt>
        <dd>{{ t('action.draw') }}</dd>
        <dt><kbd>R</kbd></dt>
        <dd>{{ t('action.resource') }}</dd>
        <dt><kbd>E</kbd></dt>
        <dd>{{ t('action.endTurn') }}</dd>
        <dt><kbd>1</kbd>–<kbd>9</kbd></dt>
        <dd>{{ t('shortcuts.option') }}</dd>
        <dt>
          <kbd>{{ t('shortcuts.enter') }}</kbd>
        </dt>
        <dd>{{ t('shortcuts.confirm') }}</dd>
        <dt><kbd>U</kbd></dt>
        <dd>{{ t('undo.hint.step') }}</dd>
        <dt><kbd>Ctrl</kbd>+<kbd>Z</kbd></dt>
        <dd>{{ t('undo.hint.action') }}</dd>
        <dt><kbd>Ctrl</kbd>+<kbd>⇧</kbd>+<kbd>Z</kbd></dt>
        <dd>{{ t('undo.hint.turn') }}</dd>
      </dl>
    </details>

    <h4>{{ t('table.journal') }}</h4>
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
  /* Diario del caso: papel pautado con el registro mecanografiado. */
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  min-height: 0;
  color: var(--parch-ink);
  background:
    repeating-linear-gradient(transparent 0 23px, rgb(90 62 28 / 20%) 23px 24px),
    linear-gradient(90deg, rgb(110 86 49 / 25%), transparent 18px), var(--parch);
  border-left: 4px double #6e5631;
}
.side button {
  color: var(--parch-ink);
  background: #e2d3ab;
  border-color: #8a6c3c;
  border-radius: 3px;
}
.side button:hover:not(:disabled) {
  background: #efe3c2;
  border-color: var(--parch-ink);
}
.resolving {
  display: flex;
  justify-content: center;
  gap: 8px;
}
.quit {
  padding: 0 8px;
  margin-left: 8px;
}
.phase {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  white-space: nowrap;
  font-family: var(--fell);
  font-size: 1.05rem;
  border-bottom: 1px solid #8a6c3c;
  padding-bottom: 6px;
}
.phase strong {
  font-family: var(--display);
  font-size: 0.95rem;
}
.question {
  /* La decisión llega como un telegrama. */
  padding: 10px;
  background: #f3ead2;
  border: 1px solid #6e5631;
  box-shadow: 2px 3px 0 rgb(60 40 15 / 25%);
  font-family: var(--type);
}
.prompt {
  margin: 0;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.prompt::after {
  content: ' STOP';
  color: #7a5a2a;
}
.who,
.hint {
  margin: 4px 0;
  font-size: 0.8rem;
  color: #5a3e1c;
}
.buttons {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}
.buttons button {
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
  font-family: var(--fell);
  font-size: 0.98rem;
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
  font-family: var(--fell);
}
.error {
  color: #9a1c12;
  font-size: 0.85rem;
}
.outcome {
  font-family: var(--display);
  font-size: 1.1rem;
  padding: 12px;
  background: #f3ead2;
  border: 1px solid #6e5631;
}
h4 {
  margin: 4px 0 0;
  font-family: var(--display);
  font-size: 0.85rem;
  color: #5a3e1c;
}
.log {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex: 1;
  min-height: 120px;
  font-family: var(--type);
  font-size: 0.82rem;
  line-height: 24px;
}
.log li::before {
  content: '— ';
  color: #8a6c3c;
}
.log li.heading {
  font-family: var(--fell);
  font-style: italic;
  font-size: 0.95rem;
  color: #7a3a14;
}
.log li.heading::before {
  content: '';
}
.undo {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  font-family: var(--fell);
  font-size: 0.85rem;
  color: #5a3e1c;
}
.undo span {
  margin-right: 2px;
}
.undo button {
  padding: 2px 8px;
  font-size: 0.85rem;
  font-family: var(--fell);
}
.undo button:disabled {
  opacity: 0.4;
  cursor: default;
}
kbd {
  display: inline-block;
  min-width: 1.3em;
  padding: 0 4px;
  border: 1px solid #8a6c3c;
  border-bottom-width: 2px;
  border-radius: 2px;
  background: #f3ead2;
  font-family: var(--type);
  font-size: 0.75rem;
  text-align: center;
}
.keys {
  font-size: 0.85rem;
  font-family: var(--fell);
}
.keys summary {
  cursor: pointer;
  color: #5a3e1c;
}
.keys dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 10px;
  margin: 8px 0 0;
}
.keys dd {
  margin: 0;
}
</style>
