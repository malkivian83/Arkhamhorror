<script setup lang="ts">
import { demoInvestigators, demoScenario } from '@lcg/cards'
import { applyInput, cluesToAdvanceAct, createGame, type GameState } from '@lcg/engine'
import type { HealthResponse } from '@lcg/shared'
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const online = ref<boolean | null>(null)
const players = ref(1)
const game = shallowRef<GameState | null>(null)

onMounted(async () => {
  try {
    const res = await fetch('/api/health')
    online.value = res.ok && ((await res.json()) as HealthResponse).status === 'ok'
  } catch {
    online.value = false
  }
})

function start() {
  game.value = createGame({
    seed: Math.floor(Math.random() * 2 ** 32),
    scenario: demoScenario,
    investigators: demoInvestigators.slice(0, players.value),
  })
}

function answer(choice: number) {
  const state = game.value
  if (!state?.pending) return
  game.value = applyInput(state, { investigator: state.pending.investigator, choice })
}

const nameOf = (id: string | null) => game.value?.investigators.find((i) => i.id === id)?.name ?? ''

const agenda = computed(() => game.value?.agendas[game.value.agendaIndex])
const act = computed(() => game.value?.acts[game.value.actIndex])
const locations = computed(() => Object.values(game.value?.locations ?? {}))
const enemiesAt = (location: string) =>
  Object.values(game.value?.enemies ?? {}).filter((e) => e.location === location)
</script>

<template>
  <section>
    <p>
      {{ t('home.serverStatus') }}:
      <strong v-if="online !== null">{{ online ? t('home.online') : t('home.offline') }}</strong>
    </p>

    <h2>{{ t('home.demo') }}</h2>
    <p>
      <label>
        {{ t('home.players') }}
        <select v-model.number="players">
          <option :value="1">1</option>
          <option :value="2">2</option>
        </select>
      </label>
      <button @click="start">{{ game ? t('home.restart') : t('home.start') }}</button>
    </p>

    <template v-if="game">
      <p class="status">
        <strong>{{ t('game.round', { round: game.round }) }}</strong> ·
        {{ t(`phase.${game.phase}`) }}
      </p>
      <p v-if="agenda">
        {{
          t('game.agenda', { name: agenda.name, doom: game.doom, threshold: agenda.doomThreshold })
        }}
      </p>
      <p v-if="act">{{ t('game.act', { name: act.name, clues: cluesToAdvanceAct(game) ?? 0 }) }}</p>

      <div v-if="game.outcome" class="outcome">
        {{
          game.outcome.type === 'resolution'
            ? t('game.won', { n: game.outcome.resolution })
            : t('game.lost')
        }}
      </div>

      <div v-else-if="game.pending" class="question">
        <p>
          <strong>{{ t(game.pending.question.prompt) }}</strong>
          — {{ t('game.waitingFor', { name: nameOf(game.pending.investigator) }) }}
        </p>
        <button
          v-for="(choice, index) in game.pending.question.choices"
          :key="index"
          @click="answer(index)"
        >
          {{ t(choice.label, choice.params ?? {}) }}
        </button>
      </div>

      <div class="grid">
        <article v-for="i in game.investigators" :key="i.id" class="card">
          <h3>{{ i.name }}</h3>
          <p v-if="i.eliminated">{{ t('game.eliminated') }}</p>
          <template v-else>
            <p>
              {{ t('game.damage', { n: i.damage, max: i.health }) }} ·
              {{ t('game.horror', { n: i.horror, max: i.sanity }) }}
            </p>
            <p>
              {{ t('game.resources', { n: i.resources }) }} ·
              {{ t('game.clues', { n: i.clues }) }} ·
              {{ t('game.hand', { n: i.hand.length }) }}
            </p>
            <p v-if="i.actionsRemaining > 0">
              {{ t('game.actionsLeft', { n: i.actionsRemaining }) }}
            </p>
          </template>
        </article>
      </div>

      <div class="grid">
        <article v-for="l in locations" :key="l.id" class="card">
          <h3>{{ l.name }}</h3>
          <p v-if="l.revealed">
            {{ t('game.shroud', { n: l.shroud }) }} · {{ t('game.clues', { n: l.clues }) }}
          </p>
          <p v-else>{{ t('game.unrevealed') }}</p>
          <p v-for="i in game.investigators.filter((x) => x.location === l.id)" :key="i.id">
            ★ {{ i.name }}
          </p>
          <p v-for="e in enemiesAt(l.id)" :key="e.id" class="enemy">
            ☠ {{ e.name }} ({{ e.fight }}/{{ e.maxHealth - e.damageTaken }}/{{ e.evade }})
            <span v-if="e.engagedWith">
              — {{ t('game.engagedWith', { name: nameOf(e.engagedWith) }) }}</span
            >
            <span v-if="e.exhausted"> — {{ t('game.exhausted') }}</span>
          </p>
        </article>
      </div>
    </template>
  </section>
</template>

<style scoped>
button {
  margin: 0.25rem;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
}
.card {
  border: 1px solid #3a3f4b;
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
}
.card h3 {
  margin: 0.25rem 0;
}
.card p {
  margin: 0.25rem 0;
}
.enemy {
  color: #e57373;
}
.question {
  border: 1px solid #c9a227;
  border-radius: 6px;
  padding: 0.5rem;
}
.outcome {
  font-size: 1.3rem;
  font-weight: bold;
}
</style>
