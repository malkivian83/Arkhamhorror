<script setup lang="ts">
import { previewToken, skillTestValue, successChance, type GameState } from '@lcg/engine'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { classColor } from '../game/cards'
import { localName } from '../game/localized'
import { useLabels } from '../game/labels'
import { useGameStore } from '../stores/game'
import ChaosTokenView from './ChaosTokenView.vue'
import GameCard from './GameCard.vue'
import SkillIcon from './SkillIcon.vue'
import ScenarioSymbol from './ScenarioSymbol.vue'

/**
 * Panel de la prueba de habilidad (RR "Skill Test Timing"): pasos ST.1–ST.8,
 * carta que la provoca contra el investigador, valor contra dificultad, cartas
 * comprometidas, la ficha revelada y la bolsa del caos con sus modificadores.
 */
const props = defineProps<{ state: GameState }>()
const game = useGameStore()
const { t } = useI18n()
const label = useLabels()
const minimized = ref(false)
const showOdds = ref(false)

const test = computed(() => props.state.skillTest)
const prompt = computed(() => props.state.pending?.question.prompt)
const question = computed(() => props.state.pending?.question)
const canApplyResults = computed(() =>
  question.value?.choices.some((choice) => choice.label === 'choice.applyResults'),
)
// Reacciones y elecciones intermedias también se resuelven dentro de la prueba.
const intermediateQuestion = computed(() =>
  question.value && !committing.value && !canApplyResults.value && !question.value.story
    ? question.value
    : null,
)
watch(prompt, () => (minimized.value = false))
const committing = computed(() => prompt.value === 'prompt.commitCards')
const testAbilities = computed(() =>
  committing.value
    ? (question.value?.choices.flatMap((choice, index) =>
        choice.then.some((message) => message.type === 'UseAbility') ? [{ choice, index }] : [],
      ) ?? [])
    : [],
)
const resolved = computed(
  () => test.value?.succeeded !== null && test.value?.succeeded !== undefined,
)

/** Paso actual del diagrama de temporización del reglamento. */
const step = computed(() => {
  if (committing.value) return 2
  if (resolved.value) return canApplyResults.value ? 7 : 6
  return 3
})
const steps = [1, 2, 3, 4, 5, 6, 7, 8]
const stageLabel = computed(() =>
  t(
    `skillTest.${committing.value ? 'commit' : resolved.value ? (canApplyResults.value ? 'apply' : 'compare') : 'reveal'}`,
  ),
)

const investigator = computed(() =>
  props.state.investigators.find((i) => i.id === test.value?.investigator),
)

/** La carta que provoca la prueba. */
const source = computed(() => {
  const kind = test.value?.kind
  if (!kind) return null
  if (kind.type === 'investigate') {
    const l = props.state.locations[kind.location]
    return l ? { code: l.id, name: l.name, back: !l.revealed } : null
  }
  if (kind.type === 'fight' || kind.type === 'evade') {
    const e = props.state.enemies[kind.enemy]
    return e ? { code: e.code, name: e.name, back: false } : null
  }
  const resolving = Object.values(props.state.treacheries).find(
    (tr) => tr.placement.type === 'limbo',
  )
  if (resolving) return { code: resolving.code, name: resolving.name, back: false }
  const agenda = props.state.agendas[props.state.agendaIndex]
  if (agenda?.name === kind.source && agenda.code)
    return { code: agenda.code, name: agenda.name, back: false }
  return { code: '', name: kind.source, back: false }
})

const value = computed(() => skillTestValue(props.state))
const shownValue = computed(() =>
  resolved.value ? (test.value?.modifiedSkill ?? 0) : value.value.total,
)

const bag = computed(() =>
  [...props.state.chaosBag]
    .map((token) => ({ token, effect: previewToken(props.state, token) }))
    .sort((a, b) => {
      const num = (x: typeof a) => (typeof x.token === 'number' ? 0 : 1)
      return num(a) - num(b) || b.effect.modifier - a.effect.modifier
    }),
)
const odds = computed(() => successChance(props.state))
const fmt = (n: number) => (n > 0 ? `+${n}` : `${n}`)
</script>

<template>
  <section v-if="test" class="skill-test" :class="{ minimized }" :aria-label="t('table.skillTest')">
    <header>
      <img src="/local-assets/home/icon-decks.webp" alt="" width="36" height="36" />
      <h3>{{ t('table.skillTest') }}</h3>
      <button
        type="button"
        class="min"
        :aria-label="t(minimized ? 'skillTest.expand' : 'skillTest.minimize')"
        :aria-expanded="!minimized"
        @click="minimized = !minimized"
      >
        {{ minimized ? '+' : '—' }}
      </button>
    </header>

    <template v-if="!minimized">
      <div class="progress-copy">
        <strong>{{ stageLabel }}</strong
        ><span>{{ t('skillTest.progress', { n: step }) }}</span>
      </div>
      <ol class="steps" :aria-label="t('skillTest.progress', { n: step })">
        <li
          v-for="n in steps"
          :key="n"
          :class="{ current: n === step, done: n < step }"
          :aria-current="n === step ? 'step' : undefined"
        >
          <span class="sr-only">ST.{{ n }}</span>
        </li>
      </ol>

      <div class="duel">
        <GameCard
          v-if="investigator"
          class="investigator-card"
          :code="investigator.id"
          :name="investigator.name"
          :width="70"
          :color="classColor(investigator.id)"
          landscape
        />
        <div class="number-block">
          <span class="number-label">{{ t('skillTest.value') }}</span>
          <span class="value" :title="t('skillTest.value')">{{ shownValue }}</span>
        </div>
        <div class="vs">
          <span class="skill"
            ><SkillIcon :skill="test.skill" /> {{ t(`skill.${test.skill}`) }}</span
          >
          <span aria-hidden="true">→</span>
        </div>
        <div class="number-block">
          <span class="number-label">{{ t('skillTest.difficulty') }}</span>
          <span class="difficulty" :title="t('skillTest.difficulty')">{{ test.difficulty }}</span>
        </div>
        <GameCard
          v-if="source && source.code"
          class="source-card"
          :code="source.code"
          :name="source.name"
          :back="source.back"
          :width="70"
        />
        <span v-else-if="source" class="source-name">{{ localName(source.name) }}</span>
      </div>

      <p class="breakdown">
        {{ t(`skill.${test.skill}`) }} {{ value.base }}
        <template v-if="value.modifier">
          · {{ t('skillTest.effect') }} {{ fmt(value.modifier) }}</template
        >
        <template v-if="value.icons">
          · {{ t('skillTest.committed') }} {{ fmt(value.icons) }}</template
        >
        <template v-if="value.passive">
          · {{ t('skillTest.assets') }} {{ fmt(value.passive) }}</template
        >
        <template v-if="resolved">
          · {{ t('skillTest.tokens') }} {{ fmt(test.tokenModifier) }}</template
        >
      </p>

      <ul v-if="value.sources.length" class="modifier-sources">
        <li v-for="(sourceEntry, n) in value.sources" :key="n">
          {{ localName(sourceEntry.name) }}: {{ fmt(sourceEntry.amount) }}
        </li>
      </ul>

      <div v-if="test.committed.length" class="committed">
        <GameCard
          v-for="(c, n) in test.committed"
          :key="n"
          :code="c.code"
          :name="c.code"
          :width="52"
        />
      </div>

      <div class="reveal">
        <template v-if="test.tokens.length">
          <span
            v-for="(token, n) in test.tokens"
            :key="n"
            class="drawn-token"
            :style="{ animationDelay: `${n * 0.35}s` }"
          >
            <ChaosTokenView :token="token" :size="76" />
          </span>
        </template>
        <button
          v-else
          type="button"
          class="bag-button"
          :disabled="!committing"
          :title="t('choice.revealToken')"
          @click="game.answerLabel('choice.revealToken')"
        >
          <ScenarioSymbol kind="bag" />
          <span>{{ t('choice.revealToken') }}</span>
        </button>
      </div>
      <section v-if="testAbilities.length" class="test-abilities">
        <h4>{{ t('skillTest.availableAbilities') }}</h4>
        <button
          v-for="option in testAbilities"
          :key="option.index"
          type="button"
          @click="game.answer(option.index)"
        >
          {{ label(option.choice.label, option.choice.params ?? {}) }}
        </button>
      </section>

      <div v-if="resolved" class="result" :class="test.succeeded ? 'success' : 'failure'">
        <strong
          ><span aria-hidden="true">{{ test.succeeded ? '✓' : '×' }}</span>
          {{ test.succeeded ? t('skillTest.success') : t('skillTest.failure') }}</strong
        >
        <span>{{ test.modifiedSkill }} / {{ test.difficulty }}</span>
        <button
          v-if="canApplyResults"
          type="button"
          class="primary"
          @click="game.answerLabel('choice.applyResults')"
        >
          {{ t('choice.applyResults') }}
        </button>
      </div>
      <div v-if="intermediateQuestion" class="pending-choice" aria-live="polite">
        <p>{{ label(intermediateQuestion.prompt, intermediateQuestion.promptParams ?? {}) }}</p>
        <button
          v-for="(choice, index) in intermediateQuestion.choices"
          :key="index"
          type="button"
          @click="game.answer(index)"
        >
          {{ label(choice.label, choice.params ?? {}) }}
        </button>
      </div>
      <p v-if="game.error" class="error" role="alert">{{ game.error }}</p>
      <p v-else-if="committing" class="hint">{{ t('skillTest.commitHint') }}</p>

      <footer>
        <details class="bag-details">
          <summary>
            <ScenarioSymbol kind="bag" />{{ t('table.chaosBag') }} ·
            {{ t('skillTest.tokensInBag', { n: state.chaosBag.length }) }}
          </summary>
          <div class="bag">
            <span v-for="(b, n) in bag" :key="n" class="bag-token">
              <small v-if="typeof b.token !== 'number'" class="mod">{{
                b.effect.autoFail ? '✗' : fmt(b.effect.modifier)
              }}</small>
              <ChaosTokenView :token="b.token" :size="30" />
            </span>
          </div>
        </details>
        <div class="footer-row">
          <button
            v-if="!resolved"
            type="button"
            class="odds"
            :aria-expanded="showOdds"
            :title="t('skillTest.oddsHint')"
            @click="showOdds = !showOdds"
          >
            {{ showOdds && odds !== null ? `${Math.round(odds * 100)}%` : t('skillTest.showOdds') }}
          </button>
        </div>
        <p v-if="showOdds && !resolved" class="odds-hint">{{ t('skillTest.oddsHint') }}</p>
      </footer>
    </template>
  </section>
</template>

<style scoped>
.skill-test {
  --accent: #e5aa8d;
  --ink: #f4efe7;
  --panel-2: #303037;
  --border: #807574;
  position: relative;
  grid-column: 1 / -2;
  grid-row: 1 / 3;
  align-self: start;
  justify-self: center;
  margin: 12px 0;
  min-height: 0;
  max-height: calc(100% - 24px);
  overflow-y: auto;
  overscroll-behavior: contain;
  z-index: 40;
  width: min(560px, calc(100% - 32px));
  border-radius: 5px;
  background: #19191d;
  color: var(--ink);
  border: 1px solid var(--border);
  box-shadow: 0 16px 48px #0009;
  font:
    400 0.9375rem/1.5 'Source Sans 3',
    system-ui,
    sans-serif;
}
header {
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: #25252b;
  border-bottom: 1px solid #62585b;
}
header img {
  object-fit: contain;
  flex: none;
}
h3 {
  flex: 1;
  margin: 0;
  font:
    700 1rem/1.5 'Libre Baskerville',
    Georgia,
    serif;
  letter-spacing: 0;
}
button {
  min-height: 44px;
  border-radius: 3px;
  color: var(--ink);
  background: #303037;
  border-color: var(--border);
}
button.primary {
  background: var(--accent);
  color: #19191d;
  border-color: var(--accent);
}
button:hover:not(:disabled) {
  border-color: var(--accent);
  background: #37303a;
}
button.primary:hover:not(:disabled) {
  background: #f0c2a8;
}
.min {
  flex: none;
  width: 44px;
  height: 44px;
  padding: 0;
}
.progress-copy {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 4px 12px;
  padding: 14px 20px 8px;
  font-size: 0.8125rem;
}
.progress-copy strong {
  color: var(--accent);
  font-weight: 600;
}
.progress-copy > span {
  color: #c3bbb4;
  font-size: 0.75rem;
}
.steps {
  display: flex;
  gap: 4px;
  list-style: none;
  margin: 0;
  padding: 0 20px 16px;
}
.steps li {
  flex: 1;
  height: 4px;
  background: #4b4246;
  border-radius: 2px;
}
.steps li.done {
  background: #ad806b;
}
.steps li.current {
  background: #f4efe7;
  box-shadow: 0 0 0 1px #e5aa8d;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.duel {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 16px;
  margin: 0 20px;
  background: #25252b;
  border: 1px solid #62585b;
  border-radius: 4px;
}
.source-name {
  max-width: 110px;
  font-size: 0.8125rem;
  overflow-wrap: anywhere;
}
.number-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.number-label {
  color: #d0c7c1;
  font-size: 0.6875rem;
  text-align: center;
}
.value,
.difficulty {
  font-size: 2rem;
  line-height: 1.2;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.value {
  color: #f4efe7;
}
.difficulty {
  color: #e5aa8d;
}
.vs {
  display: grid;
  justify-items: center;
  gap: 4px;
  color: #c3bbb4;
}
.vs > span:last-child {
  color: #e5aa8d;
  font-size: 1.25rem;
}
.skill {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
}
.breakdown {
  margin: 10px 20px 0;
  text-align: center;
  font-size: 0.8125rem;
  color: #c3bbb4;
}
.modifier-sources {
  padding: 0 24px 0 40px;
  margin: 8px 0;
  font-size: 0.8125rem;
  color: #c3bbb4;
}
.committed {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px;
  margin: 12px 20px 0;
}
.reveal {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 16px 20px;
  min-height: 80px;
  align-items: center;
}
.bag-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  min-height: 56px;
  background: #e5aa8d;
  color: #19191d;
  border: 1px solid #e5aa8d;
  font-weight: 600;
}
.bag-button :deep(.scenario-symbol) {
  color: currentColor;
  width: 28px;
  height: 28px;
}
.bag-button:hover:not(:disabled) {
  background: #f0c2a8;
}
.test-abilities {
  padding: 8px 20px 16px;
  display: grid;
  gap: 8px;
}
.test-abilities h4 {
  margin: 0;
  color: #c3bbb4;
  font-size: 0.8125rem;
  font-weight: 600;
}
.test-abilities button {
  text-align: left;
}
.result {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 14px 20px;
  background: #25252b;
  border-block: 1px solid #62585b;
}
.result.success strong {
  color: #a8d8c0;
}
.result.failure strong {
  color: #ffb4a9;
}
.result strong > span {
  font-size: 1.25rem;
}
.pending-choice {
  display: grid;
  gap: 8px;
  padding: 14px 20px;
  background: #25252b;
}
.pending-choice p {
  margin: 0;
}
.pending-choice button {
  white-space: normal;
}
.error {
  color: #ffb4a9;
  padding: 8px 20px;
  overflow-wrap: anywhere;
}
.hint {
  margin: 0 20px 16px;
  color: #c3bbb4;
  font-size: 0.8125rem;
  text-align: center;
}
footer {
  padding: 8px 20px 16px;
  border-top: 1px solid #62585b;
}
.bag-details summary {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  cursor: pointer;
  list-style: none;
  color: #d0c7c1;
  font-size: 0.8125rem;
}
.bag-details summary::-webkit-details-marker {
  display: none;
}
.bag-details summary::after {
  content: '+';
  margin-left: auto;
  color: #e5aa8d;
  font-size: 1.25rem;
}
.bag-details[open] summary::after {
  content: '−';
}
.bag-details summary :deep(.scenario-symbol) {
  width: 20px;
  height: 20px;
}
.bag {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
  align-items: flex-end;
  padding: 12px 0;
}
.bag-token {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.mod {
  color: #f4efe7;
  font-size: 0.6875rem;
  padding: 0 4px;
  border-radius: 3px;
  background: #303037;
}
.footer-row {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-top: 6px;
}
.odds {
  font-size: 0.8125rem;
  width: 100%;
}
.odds-hint {
  color: #c3bbb4;
  font-size: 0.8125rem;
  margin-bottom: 0;
}
.drawn-token {
  display: inline-block;
  animation: token-draw 0.4s ease-out both;
}
@keyframes token-draw {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.8);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .drawn-token {
    animation: none;
  }
}
@media (max-width: 900px) {
  .skill-test {
    grid-column: 1 / -1;
    width: min(560px, calc(100% - 24px));
    margin-top: 72px;
    max-height: calc(100% - 84px);
  }
}
@media (max-width: 600px) {
  header {
    padding: 8px 10px;
    gap: 8px;
  }
  header img {
    width: 28px;
    height: 28px;
  }
  h3 {
    font-size: 0.9375rem;
  }
  .progress-copy {
    padding-inline: 14px;
  }
  .steps {
    padding-inline: 14px;
  }
  .duel {
    margin-inline: 14px;
    padding: 12px 8px;
    gap: 8px;
    flex-wrap: wrap;
  }
  .duel .investigator-card {
    width: 48px !important;
    height: 34px !important;
  }
  .duel .source-card {
    width: 44px !important;
    height: 62px !important;
  }
  .skill {
    font-size: 0.6875rem;
  }
  .number-label {
    max-width: 60px;
  }
  .value,
  .difficulty {
    font-size: 1.625rem;
  }
  .reveal,
  .test-abilities,
  .pending-choice,
  footer {
    padding-inline: 14px;
  }
  .hint {
    margin-inline: 14px;
  }
}
</style>
