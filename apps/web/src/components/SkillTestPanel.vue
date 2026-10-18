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
      <ol class="steps">
        <li v-for="n in steps" :key="n" :class="{ current: n === step, done: n < step }">
          ST.{{ n }}
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
          <span>VS</span>
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
          <span>◉</span>
          <small>{{ t('choice.revealToken') }}</small>
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
        <strong>{{ test.succeeded ? t('skillTest.success') : t('skillTest.failure') }}</strong>
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
        <div class="bag">
          <span v-for="(b, n) in bag" :key="n" class="bag-token">
            <small v-if="typeof b.token !== 'number'" class="mod">{{
              b.effect.autoFail ? '✗' : fmt(b.effect.modifier)
            }}</small>
            <ChaosTokenView :token="b.token" :size="30" />
          </span>
        </div>
        <div class="footer-row">
          <span>{{ t('skillTest.tokensInBag', { n: state.chaosBag.length }) }}</span>
          <button
            v-if="!resolved"
            type="button"
            class="odds"
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
  /* Dentro del área superior de la mesa: nunca queda detrás de la mano. */
  position: relative;
  grid-column: 1;
  grid-row: 1 / 3;
  align-self: start;
  justify-self: center;
  margin: 8px 0;
  min-height: 0;
  max-height: calc(100% - 16px);
  overflow-y: auto;
  z-index: 40;
  width: min(580px, calc(100% - 32px));
  border-radius: 14px;
  background: #26302b;
  border: 1px solid #6b7a70;
  box-shadow: 0 10px 30px rgb(0 0 0 / 60%);
}
header {
  position: sticky;
  top: 0;
  z-index: 3;
  padding: 12px 52px 12px 12px;
  min-height: 48px;
  text-align: center;
  background: #1d2521;
}
h3 {
  margin: 0;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 0.95rem;
}
.min {
  position: absolute;
  right: 8px;
  top: 2px;
  border-radius: 50%;
  width: 44px;
  height: 44px;
  padding: 0;
}
.steps {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  background: #33403a;
}
.steps li {
  flex: 1;
  text-align: center;
  padding: 4px 0;
  font-size: 0.8rem;
  opacity: 0.6;
}
.steps li.done {
  opacity: 0.85;
}
.steps li.current {
  background: #a42fa0;
  opacity: 1;
  font-weight: 700;
}
.duel {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 8px;
  background: #1f2824;
}
.source-name {
  max-width: 120px;
  font-style: italic;
}
.value,
.difficulty {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 1.3rem;
  font-weight: 800;
  color: #fff;
}
.value {
  background: #2f6f2f;
}
.number-block {
  display: grid;
  justify-items: center;
  gap: 4px;
}
.number-label {
  font-size: 0.65rem;
  text-align: center;
}
.test-abilities {
  padding: 8px 12px;
  display: grid;
  gap: 8px;
}
.test-abilities h4 {
  margin: 0;
  font-size: 0.85rem;
}
.test-abilities button {
  text-align: left;
  min-height: 44px;
}
.difficulty {
  background: #8e1c1c;
}
.vs {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-weight: 700;
}
.skill {
  font-size: 0.75rem;
  opacity: 0.85;
}
.breakdown {
  margin: 6px 12px 0;
  text-align: center;
  font-size: 0.8rem;
  opacity: 0.8;
}
.committed {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 8px;
}
.reveal {
  display: flex;
  justify-content: center;
  gap: 10px;
  padding: 8px;
  min-height: 86px;
  align-items: center;
}
.bag-button {
  width: 92px;
  height: 92px;
  border-radius: 50%;
  border: 4px solid #d24bd2;
  background: radial-gradient(circle at 35% 30%, #4a3b55, #1c1522 70%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  box-shadow: 0 0 16px rgb(210 75 210 / 50%);
}
.bag-button span {
  font-size: 1.8rem;
}
.bag-button small {
  font-size: 0.65rem;
  line-height: 1.1;
}
.result {
  position: sticky;
  bottom: 0;
  z-index: 2;
  background: #26302b;
  flex-wrap: wrap;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 8px;
}
.result.success strong {
  color: #7fd67f;
}
.result.failure strong {
  color: #ff8a80;
}
.pending-choice {
  display: grid;
  gap: 8px;
  padding: 8px 12px;
  background: #1d2521;
}
.pending-choice p {
  margin: 0;
  line-height: 1.4;
}
.pending-choice button {
  min-height: 44px;
  white-space: normal;
}
.error {
  color: #ffb4a9;
  padding: 8px 12px;
  overflow-wrap: anywhere;
}
.hint {
  margin: 0 12px 8px;
  text-align: center;
  font-size: 0.8rem;
  opacity: 0.8;
}
footer {
  padding: 8px 10px;
  background: #1d2521;
}
.bag {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
  align-items: flex-end;
}
.bag-token {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.mod {
  font-size: 0.65rem;
  padding: 0 4px;
  border-radius: 6px;
  background: #11161a;
}
.footer-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-top: 6px;
  font-size: 0.8rem;
}
.odds {
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
}
/* La ficha sale de la bolsa: sube, gira y se asienta. */
.drawn-token {
  display: inline-block;
  animation: token-draw 0.7s cubic-bezier(0.2, 0.9, 0.3, 1.2) both;
}
@keyframes token-draw {
  0% {
    opacity: 0;
    transform: translateY(70px) scale(0.3) rotateY(0deg);
  }
  60% {
    opacity: 1;
    transform: translateY(-12px) scale(1.15) rotateY(540deg);
  }
  100% {
    transform: translateY(0) scale(1) rotateY(720deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .drawn-token {
    animation: none;
  }
}
@media (max-width: 900px) {
  .skill-test {
    width: calc(100% - 16px);
  }
}
@media (max-width: 600px) {
  .duel {
    gap: 4px;
    flex-wrap: nowrap;
    padding: 8px 4px;
  }
  .duel .source-card {
    width: 48px !important;
    height: 67px !important;
    flex: none;
  }
  .duel .investigator-card {
    width: 48px !important;
    height: 34px !important;
    flex: none;
  }
  .value,
  .difficulty {
    width: 32px;
    height: 32px;
    font-size: 1rem;
    flex: none;
  }
  .vs {
    min-width: 0;
  }
  .skill {
    font-size: 0.65rem;
  }
  .committed,
  .result {
    position: sticky;
    bottom: 0;
    z-index: 2;
    background: #26302b;
    flex-wrap: wrap;
    flex-wrap: wrap;
    gap: 8px;
  }
  header {
    min-height: 52px;
    padding-right: 52px;
  }
  .min {
    width: 44px;
    height: 44px;
    top: 4px;
    right: 4px;
  }
}
</style>
