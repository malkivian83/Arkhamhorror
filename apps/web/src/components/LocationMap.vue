<script setup lang="ts">
import { useTableGame } from '../game/tableController'
import { shroudOf, type GameState, type Location } from '@lcg/engine'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { cardBackImage } from '../game/assets'
import GameCard from './GameCard.vue'
import InvestigatorMini from './InvestigatorMini.vue'
import TokenBadge from './TokenBadge.vue'
import TableTarget from './TableTarget.vue'

const props = defineProps<{ state: GameState }>()
const game = useTableGame()
const { t } = useI18n()

const CELL_W = 190
const CELL_H = 250
const CARD_W = 120
const MINI_W = 50

/** Posiciones: las del escenario o, si no hay, por distancia a la primera localización. */
const positions = computed(() => {
  const locations = Object.values(props.state.locations)
  const result = new Map<string, [number, number]>()
  const fallback: Location[] = []
  for (const l of locations) {
    const p = l.position
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
  const left = all.length ? Math.min(...all.map(([c]) => c)) : 0
  const top = all.length ? Math.min(...all.map(([, r]) => r)) : 0
  const cols = Math.max(1, ...all.map(([c]) => c - left + 1))
  const rows = Math.max(1, ...all.map(([, r]) => r - top + 1))
  return { width: cols * CELL_W, height: rows * CELL_H, left, top }
})

/** Chincheta en lo alto de la carta; el hilo cuelga un poco entre dos chinchetas. */
const pin = (id: string) => {
  const [c, r] = positions.value.get(id) ?? [0, 0]
  return {
    x: (c - size.value.left) * CELL_W + CELL_W / 2,
    y: (r - size.value.top) * CELL_H + 8 + 6,
  }
}
function string(from: string, to: string) {
  const a = pin(from)
  const b = pin(to)
  const sag = Math.min(40, Math.hypot(b.x - a.x, b.y - a.y) / 6)
  return `M${a.x} ${a.y}Q${(a.x + b.x) / 2} ${(a.y + b.y) / 2 + sag} ${b.x} ${b.y}`
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
/** Apoyos sin dueño en la localización (Invitados, Joya…). */
const placedAt = (id: string) =>
  Object.values(props.state.placedAssets ?? {}).filter(
    (p) => p.placement.type === 'location' && p.placement.location === id,
  )
/** Apoyos vinculados a un enemigo (La Lámpara Mortecina, la Joya). */
const attachedTo = (enemy: string) =>
  Object.values(props.state.placedAssets ?? {}).filter(
    (p) => p.placement.type === 'enemy' && p.placement.enemy === enemy,
  )
const playerBack = computed(() => cardBackImage('player'))
const treacheriesOn = (enemy: string) =>
  Object.values(props.state.treacheries).filter(
    (tr) => tr.placement.type === 'enemy' && tr.placement.enemy === enemy,
  )
const treacheriesAt = (id: string) =>
  Object.values(props.state.treacheries).filter(
    (tr) => tr.placement.type === 'location' && tr.placement.location === id,
  )
</script>

<template>
  <div class="map" :style="{ width: `${size.width}px`, height: `${size.height}px` }">
    <svg class="edges" :width="size.width" :height="size.height">
      <!-- Hilo rojo de investigador entre chinchetas, algo combado. -->
      <path v-for="e in edges" :key="`${e.from}-${e.to}`" :d="string(e.from, e.to)" />
    </svg>

    <div
      v-for="l in Object.values(state.locations)"
      :key="l.id"
      class="location"
      :style="{
        left: `${((positions.get(l.id)?.[0] ?? 0) - size.left) * CELL_W + (CELL_W - CARD_W) / 2}px`,
        top: `${((positions.get(l.id)?.[1] ?? 0) - size.top) * CELL_H + 8}px`,
      }"
    >
      <TableTarget :target="`location:${l.id}`">
        <GameCard
          :code="l.id"
          :name="l.revealed ? l.name : (l.unrevealedName ?? l.name)"
          :back="!l.revealed"
          :width="CARD_W"
        >
          <span class="pin" aria-hidden="true" />
          <!-- Carta de encuentro boca abajo debajo de la localización (Smoke and Mirrors). -->
          <span
            v-if="l.beneath?.length"
            class="beneath"
            :title="t('table.cardBeneath')"
            :aria-label="t('table.cardBeneath')"
          />
          <TokenBadge
            v-if="l.revealed && l.clues > 0"
            class="loc-clue"
            kind="clue"
            :value="l.clues"
            :size="34"
            :title="t('table.clues')"
          />
          <!-- Horror y perdición sobre el Lugar (Se cierra el telón, Torres de Carcosa). -->
          <TokenBadge
            v-if="l.horror"
            class="loc-horror"
            kind="horror"
            :value="l.horror"
            :size="30"
            :title="t('table.horror')"
          />
          <TokenBadge
            v-if="l.doom"
            class="loc-doom"
            kind="doom"
            :value="l.doom"
            :size="30"
            :title="t('table.doom')"
          />
          <!-- Velo cambiado hasta el final de la ronda (p. ej. Hand-Crank Flashlight). -->
          <span
            v-if="l.shroudModifier"
            class="shroud-mod"
            :title="t('table.shroudUntilEndOfRound')"
          >
            {{ t('game.shroud', { n: game.stats?.shroud[l.id] ?? shroudOf(state, l.id) }) }}
            ({{ l.shroudModifier > 0 ? '+' : '−' }}{{ Math.abs(l.shroudModifier) }})
          </span>
        </GameCard>
      </TableTarget>

      <!-- Minis de los investigadores, a la izquierda de la localización. -->
      <div class="investigators">
        <TableTarget
          v-for="i in investigatorsAt(l.id)"
          :key="i.id"
          :target="`investigator:${i.id}`"
        >
          <InvestigatorMini :code="i.id" :name="i.name" :width="MINI_W" />
        </TableTarget>
      </div>

      <div class="attachments">
        <TableTarget v-for="p in placedAt(l.id)" :key="p.id" :target="`placed:${p.id}`">
          <!-- Un Invitado hechizado está boca abajo. -->
          <div
            v-if="p.faceDown"
            class="spellbound"
            :title="t('table.spellbound')"
            :style="playerBack ? { backgroundImage: `url(${playerBack})` } : {}"
          />
          <GameCard
            v-else
            :code="p.code"
            :name="p.name"
            :width="54"
            :exhausted="p.exhausted"
            color="#3f6b4a"
          >
            <TokenBadge
              v-if="p.damage > 0"
              class="enemy-damage"
              kind="damage"
              :value="p.damage"
              :size="20"
            />
            <TokenBadge
              v-if="p.horror > 0"
              class="placed-horror"
              kind="horror"
              :value="p.horror"
              :size="20"
            />
            <TokenBadge v-if="p.doom" class="placed-doom" kind="doom" :value="p.doom" :size="20" />
            <!-- Pistas sobre un Transeúnte (El Último Rey). -->
            <TokenBadge
              v-if="p.clues"
              class="placed-clues"
              kind="clue"
              :value="p.clues"
              :size="20"
              :title="t('table.clues')"
            />
          </GameCard>
        </TableTarget>
        <TableTarget v-for="tr in treacheriesAt(l.id)" :key="tr.id" :target="`treachery:${tr.id}`">
          <GameCard :code="tr.code" :name="tr.name" :width="54" color="#b5462f">
            <!-- Fichas sobre la traición (Cerebro extraído). -->
            <TokenBadge
              v-if="tr.horror"
              class="placed-horror"
              kind="horror"
              :value="tr.horror"
              :size="20"
            />
            <TokenBadge
              v-if="tr.clues"
              class="placed-doom"
              kind="clue"
              :value="tr.clues"
              :size="20"
              :title="t('table.clues')"
            />
          </GameCard>
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
            <TokenBadge
              v-if="e.damageTaken > 0"
              class="enemy-damage"
              kind="damage"
              :value="e.damageTaken"
              :size="24"
            />
            <TokenBadge v-if="e.doom" class="placed-doom" kind="doom" :value="e.doom" :size="22" />
            <TokenBadge
              v-if="e.clues"
              class="placed-horror"
              kind="clue"
              :value="e.clues"
              :size="22"
              :title="t('table.clues')"
            />
          </GameCard>
          <TableTarget v-for="p in attachedTo(e.id)" :key="p.id" :target="`placed:${p.id}`">
            <GameCard :code="p.code" :name="p.name" :width="40" class="attached" color="#3f6b4a">
              <TokenBadge
                v-if="p.damage > 0"
                class="enemy-damage"
                kind="damage"
                :value="p.damage"
                :size="16"
              />
              <TokenBadge
                v-if="p.doom"
                class="placed-doom"
                kind="doom"
                :value="p.doom"
                :size="16"
              />
            </GameCard>
          </TableTarget>
          <!-- Traiciones vinculadas al enemigo (Llevado a la locura). -->
          <TableTarget
            v-for="tr in treacheriesOn(e.id)"
            :key="tr.id"
            :target="`treachery:${tr.id}`"
          >
            <GameCard
              :code="tr.code"
              :name="tr.name"
              :width="40"
              class="attached"
              color="#b5462f"
            />
          </TableTarget>
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
.spellbound {
  width: 54px;
  height: 76px;
  border-radius: 4px;
  background: #2a2f3a center / cover;
  box-shadow:
    0 0 0 2px #8a5cc4,
    0 4px 8px rgb(0 0 0 / 60%);
}
.attached {
  margin-top: -18px;
  margin-left: 14px;
}
.placed-horror {
  position: absolute;
  right: -6px;
  bottom: 14px;
}
.placed-doom {
  position: absolute;
  left: -6px;
  bottom: -4px;
}
.placed-clues {
  position: absolute;
  right: -6px;
  top: -4px;
}
.edges {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.edges {
  /* El hilo pasa por debajo de las cartas; solo las chinchetas quedan encima. */
  z-index: 0;
}
.edges path {
  fill: none;
  stroke: #b02a22;
  stroke-width: 2.5;
  filter: drop-shadow(0 3px 2px rgb(0 0 0 / 70%));
}
.location :deep(.game-card img) {
  box-shadow: 0 10px 18px rgb(0 0 0 / 65%);
}
.pin {
  position: absolute;
  z-index: 3;
  top: -7px;
  left: 50%;
  width: 14px;
  height: 14px;
  margin-left: -7px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #ff7a6a, #b02a22 55%, #5a0e0a);
  box-shadow: 0 3px 3px rgb(0 0 0 / 70%);
}
.location {
  position: absolute;
  z-index: 1;
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
  z-index: 4;
  top: 18px;
  left: -34px;
  display: flex;
  flex-direction: column;
}
/* Varias minis se solapan en columna, como en la mesa del ejemplo. */
.investigators > * + * {
  margin-top: -44px;
}
.investigators > *:hover {
  z-index: 1;
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
  background: radial-gradient(circle at 35% 30%, #9fe0c8, #2f7a62);
  color: #06261c;
  border: 1px solid #0c3a2c;
}
.token.damage {
  background: #b3261e;
  color: #fff;
  top: -6px;
  right: -6px;
}
.shroud-mod {
  position: absolute;
  left: 50%;
  bottom: 30%;
  z-index: 2;
  transform: translateX(-50%);
  padding: 1px 8px;
  border-radius: 3px;
  white-space: nowrap;
  background: var(--eldritch);
  color: #0c241c;
  font-family: var(--fell);
  font-size: 0.8rem;
  box-shadow: 0 2px 6px rgb(0 0 0 / 60%);
}
.beneath {
  position: absolute;
  left: -12px;
  bottom: 18px;
  z-index: 2;
  width: 26px;
  height: 36px;
  border-radius: 3px;
  border: 1px solid #3d6b5e;
  background: repeating-linear-gradient(45deg, #1f3a33 0 4px, #183029 4px 8px);
  box-shadow: 0 2px 5px rgb(0 0 0 / 70%);
  transform: rotate(-8deg);
}
.loc-clue {
  position: absolute;
  top: 6px;
  right: -10px;
  z-index: 2;
}
.loc-horror,
.loc-doom {
  position: absolute;
  left: -10px;
  z-index: 2;
}
.loc-horror {
  top: 6px;
}
.loc-doom {
  top: 42px;
}
.enemy-damage {
  position: absolute;
  top: -8px;
  right: -8px;
  z-index: 2;
}
</style>
