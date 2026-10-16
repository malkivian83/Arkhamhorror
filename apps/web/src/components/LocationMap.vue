<script setup lang="ts">
import { SPREADING_FLAMES_LAYOUT } from '@lcg/cards'
import type { GameState, Location } from '@lcg/engine'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { classColor, cardImage } from '../game/cards'
import GameCard from './GameCard.vue'
import TableTarget from './TableTarget.vue'

const props = defineProps<{ state: GameState }>()
const { t } = useI18n()

const CELL_W = 190
const CELL_H = 250
const CARD_W = 120

/** Posiciones: las del escenario o, si no hay, por distancia a la primera localización. */
const positions = computed(() => {
  const locations = Object.values(props.state.locations)
  const result = new Map<string, [number, number]>()
  const fallback: Location[] = []
  for (const l of locations) {
    const p = SPREADING_FLAMES_LAYOUT[l.id]
    if (p) result.set(l.id, p)
    else fallback.push(l)
  }
  let column = Math.max(-1, ...[...result.values()].map(([c]) => c)) + 1
  fallback.forEach((l, i) => result.set(l.id, [column + Math.floor(i / 3), i % 3]))
  column += 1
  return result
})

const size = computed(() => {
  const all = [...positions.value.values()]
  const cols = Math.max(1, ...all.map(([c]) => c + 1))
  const rows = Math.max(1, ...all.map(([, r]) => r + 1))
  return { width: cols * CELL_W, height: rows * CELL_H }
})

const center = (id: string) => {
  const [c, r] = positions.value.get(id) ?? [0, 0]
  return { x: c * CELL_W + CELL_W / 2, y: r * CELL_H + CELL_H / 2 - 10 }
}

const edges = computed(() => {
  const seen = new Set<string>()
  const result: { from: string; to: string }[] = []
  for (const l of Object.values(props.state.locations)) {
    for (const to of l.connections) {
      if (!props.state.locations[to]) continue
      const key = [l.id, to].sort().join('|')
      if (seen.has(key)) continue
      seen.add(key)
      result.push({ from: l.id, to })
    }
  }
  return result
})

const investigatorsAt = (id: string) =>
  props.state.investigators.filter((i) => !i.eliminated && i.location === id)
const enemiesAt = (id: string) =>
  Object.values(props.state.enemies).filter((e) => e.location === id)
const treacheriesAt = (id: string) =>
  Object.values(props.state.treacheries).filter(
    (tr) => tr.placement.type === 'location' && tr.placement.location === id,
  )
</script>

<template>
  <div class="map" :style="{ width: `${size.width}px`, height: `${size.height}px` }">
    <svg class="edges" :width="size.width" :height="size.height">
      <line
        v-for="e in edges"
        :key="`${e.from}-${e.to}`"
        :x1="center(e.from).x"
        :y1="center(e.from).y"
        :x2="center(e.to).x"
        :y2="center(e.to).y"
      />
    </svg>

    <div
      v-for="l in Object.values(state.locations)"
      :key="l.id"
      class="location"
      :style="{
        left: `${(positions.get(l.id)?.[0] ?? 0) * CELL_W + (CELL_W - CARD_W) / 2}px`,
        top: `${(positions.get(l.id)?.[1] ?? 0) * CELL_H + 8}px`,
      }"
    >
      <TableTarget :target="`location:${l.id}`">
        <GameCard :code="l.id" :name="l.name" :back="!l.revealed" :width="CARD_W">
          <span v-if="l.revealed && l.clues > 0" class="token clue" :title="t('table.clues')">
            {{ l.clues }}
          </span>
          <div class="investigators">
            <span
              v-for="i in investigatorsAt(l.id)"
              :key="i.id"
              class="pawn"
              :style="{ background: classColor(i.id) }"
              :title="i.name"
            >
              <img v-if="cardImage(i.id)" :src="cardImage(i.id) ?? ''" :alt="i.name" />
            </span>
          </div>
        </GameCard>
      </TableTarget>

      <div class="attachments">
        <TableTarget v-for="tr in treacheriesAt(l.id)" :key="tr.id" :target="`treachery:${tr.id}`">
          <GameCard :code="tr.code" :name="tr.name" :width="54" color="#b5462f" />
        </TableTarget>
        <TableTarget
          v-for="e in enemiesAt(l.id).filter((x) => !x.engagedWith)"
          :key="e.id"
          :target="`enemy:${e.id}`"
        >
          <GameCard
            :code="e.code"
            :name="e.name"
            :width="62"
            :exhausted="e.exhausted"
            color="#7a2c2c"
          >
            <span v-if="e.damageTaken > 0" class="token damage">{{ e.damageTaken }}</span>
          </GameCard>
        </TableTarget>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map {
  position: relative;
  margin: 0 auto;
}
.edges {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.edges line {
  stroke: var(--line);
  stroke-width: 4;
  stroke-dasharray: 8 6;
}
.location {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.attachments {
  display: flex;
  gap: 4px;
  min-height: 10px;
}
.investigators {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 2px;
}
.pawn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 2px solid #fff;
  overflow: hidden;
  box-shadow: 0 1px 4px rgb(0 0 0 / 60%);
}
.pawn img {
  width: 180%;
  margin: -12% 0 0 -40%;
}
.token {
  position: absolute;
  top: 6px;
  right: -8px;
  min-width: 26px;
  height: 26px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 0.85rem;
  box-shadow: 0 1px 4px rgb(0 0 0 / 60%);
}
.token.clue {
  background: #2e8bb8;
  color: #fff;
}
.token.damage {
  background: #b3261e;
  color: #fff;
  top: -6px;
  right: -6px;
}
</style>
