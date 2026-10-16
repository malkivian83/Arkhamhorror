<script setup lang="ts">
import { cluesToAdvanceAct, type ChaosToken, type GameState } from '@lcg/engine'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import GameCard from './GameCard.vue'
import TableTarget from './TableTarget.vue'

const props = defineProps<{ state: GameState }>()
const { t } = useI18n()
const showBag = ref(false)

const agenda = computed(() => props.state.agendas[props.state.agendaIndex])
const act = computed(() => props.state.acts[props.state.actIndex])
const topDiscard = computed(() => props.state.encounterDiscard.at(-1))
const actClues = computed(() => cluesToAdvanceAct(props.state))

const SYMBOLS: Record<string, string> = {
  skull: '☠',
  cultist: '⚉',
  tablet: '▤',
  elderThing: '✷',
  elderSign: '✪',
  autoFail: '⊗',
}
const tokenLabel = (token: ChaosToken) =>
  typeof token === 'number' ? (token > 0 ? `+${token}` : `${token}`) : (SYMBOLS[token] ?? token)
const sortedBag = computed(() =>
  [...props.state.chaosBag].sort((a, b) =>
    typeof a === 'number' && typeof b === 'number' ? b - a : typeof a === 'number' ? -1 : 1,
  ),
)
</script>

<template>
  <div class="scenario-row">
    <TableTarget v-if="agenda" target="agenda">
      <div class="slot">
        <GameCard
          :code="agenda.code ?? ''"
          :name="agenda.name"
          :width="150"
          landscape
          color="#7a2c2c"
        >
          <span class="badge doom" :title="t('table.doom')"
            >{{ state.doom }}/{{ agenda.doomThreshold }}</span
          >
        </GameCard>
      </div>
    </TableTarget>

    <TableTarget v-if="act" target="act">
      <div class="slot">
        <GameCard :code="act.code ?? ''" :name="act.name" :width="150" landscape color="#2c5a7a">
          <span v-if="actClues !== null" class="badge clue" :title="t('table.clues')">{{
            actClues
          }}</span>
        </GameCard>
      </div>
    </TableTarget>

    <div class="slot deck" :title="t('table.encounterDeck')">
      <div class="card-back">
        <strong>{{ state.encounterDeck.length }}</strong>
        <small>{{ t('table.encounterDeck') }}</small>
      </div>
    </div>

    <div class="slot" :title="t('table.discard')">
      <GameCard v-if="topDiscard" :code="topDiscard.code" :name="topDiscard.name" :width="72" />
      <div v-else class="card-back empty">
        <small>{{ t('table.discard') }}</small>
      </div>
    </div>

    <button type="button" class="bag" @click="showBag = !showBag">
      <span class="bag-icon">◉</span>
      {{ t('table.chaosBag') }} ({{ state.chaosBag.length }})
    </button>
    <div v-if="showBag" class="bag-tokens">
      <span v-for="(token, i) in sortedBag" :key="i" class="chaos" :class="typeof token">
        {{ tokenLabel(token) }}
      </span>
    </div>

    <div v-if="state.skillTest" class="test">
      <strong>{{ t('table.skillTest') }}</strong>
      <span v-for="(token, i) in state.skillTest.tokens" :key="i" class="chaos">{{
        tokenLabel(token)
      }}</span>
    </div>

    <div v-if="state.victoryDisplay.length" class="victory">
      {{ t('table.victory') }}: {{ state.victoryDisplay.length }}
    </div>
  </div>
</template>

<style scoped>
.scenario-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  padding: 10px 14px;
  background: var(--panel-2);
  border-bottom: 1px solid var(--border);
}
.slot {
  position: relative;
}
.badge {
  position: absolute;
  bottom: -8px;
  right: -8px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 700;
  color: #fff;
  box-shadow: 0 1px 4px rgb(0 0 0 / 60%);
}
.badge.doom {
  background: #8e1c1c;
}
.badge.clue {
  background: #2e8bb8;
}
.card-back {
  width: 72px;
  height: 100px;
  border-radius: 6px;
  background: repeating-linear-gradient(45deg, #2a1f2e, #2a1f2e 6px, #33263a 6px, #33263a 12px);
  border: 2px solid #5b4466;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 0.7rem;
}
.card-back strong {
  font-size: 1.4rem;
}
.card-back.empty {
  background: transparent;
  border-style: dashed;
  opacity: 0.5;
}
.bag {
  display: flex;
  align-items: center;
  gap: 6px;
}
.bag-icon {
  font-size: 1.2rem;
}
.bag-tokens,
.test {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
}
.chaos {
  min-width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #e8e2d0;
  color: #1b1b1b;
  font-weight: 700;
  font-size: 0.8rem;
  border: 2px solid #9a8f6e;
}
.chaos.string {
  background: #2b2440;
  color: #e8d8ff;
  border-color: #6a5a9a;
}
.test {
  padding: 4px 10px;
  border-radius: 8px;
  background: rgb(201 162 39 / 15%);
  border: 1px solid var(--accent);
}
.victory {
  margin-left: auto;
  opacity: 0.8;
}
</style>
