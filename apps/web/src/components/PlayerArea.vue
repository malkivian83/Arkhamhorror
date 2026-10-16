<script setup lang="ts">
import {
  playerCardDef,
  SLOT_CAPACITY,
  type Asset,
  type GameState,
  type Investigator,
  type SlotType,
} from '@lcg/engine'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { cardName, classColor } from '../game/cards'
import { cardBackImage } from '../game/assets'
import { showPile } from '../game/pile'
import GameCard from './GameCard.vue'
import SkillIcon from './SkillIcon.vue'
import SlotIcon from './SlotIcon.vue'
import TokenBadge from './TokenBadge.vue'

const SKILLS = ['willpower', 'intellect', 'combat', 'agility'] as const
import TableTarget from './TableTarget.vue'

const props = defineProps<{ state: GameState; investigator: Investigator; deciding: boolean }>()
const { t } = useI18n()

const i = computed(() => props.investigator)
const playerBack = computed(() => cardBackImage('player'))
const topDiscard = computed(() => i.value.discard.at(-1))

function showDiscard() {
  showPile({
    title: 'table.playerDiscard',
    params: { name: i.value.name },
    cards: i.value.discard.map((code) => ({ code, name: cardName(code) })),
    newestFirst: true,
  })
}
const assets = computed(() =>
  Object.values(props.state.assets).filter((a) => a.owner === i.value.id),
)
const engaged = computed(() =>
  Object.values(props.state.enemies).filter((e) => e.engagedWith === i.value.id),
)
const threats = computed(() =>
  Object.values(props.state.treacheries).filter(
    (tr) => tr.placement.type === 'threatArea' && tr.placement.investigator === i.value.id,
  ),
)
const color = computed(() => classColor(i.value.id))

/** Orden de las ranuras en el tapete del jugador. */
const SLOT_ORDER: SlotType[] = ['hand', 'body', 'ally', 'accessory', 'arcane', 'head']

interface SlotBox {
  type: SlotType
  asset: Asset | null
  /** Ranura ocupada por un apoyo que ya se muestra en otra (p. ej. armas a dos manos). */
  shared: boolean
}

/**
 * RR "Equipment Slots": un hueco por cada ranura del investigador; los apoyos
 * sin ranura van aparte. Si un efecto deja ocupar más ranuras de las normales,
 * se añaden huecos extra junto a los de su tipo.
 */
const slots = computed(() => {
  const boxes: SlotBox[] = SLOT_ORDER.flatMap((type) =>
    Array.from({ length: SLOT_CAPACITY[type] }, () => ({ type, asset: null, shared: false })),
  )
  const free: Asset[] = []
  for (const a of assets.value) {
    const needs = playerCardDef(a.code)?.slots ?? []
    if (!needs.length) free.push(a)
    needs.forEach((type, n) => {
      const box = boxes.find((b) => b.type === type && !b.asset)
      if (box) {
        box.asset = a
        box.shared = n > 0
      } else {
        const last = boxes.findLastIndex((b) => b.type === type)
        boxes.splice(last + 1, 0, { type, asset: a, shared: n > 0 })
      }
    })
  }
  return { boxes, free }
})
</script>

<template>
  <section
    class="player"
    :class="{ deciding, eliminated: i.eliminated }"
    :style="{ '--class': color }"
    :aria-label="t('table.investigatorArea', { name: i.name })"
  >
    <header>
      <h3>{{ i.name }}</h3>
      <span v-if="deciding" class="turn"
        >{{ t('table.decides') }} · {{ t('table.actionsLeft', { n: i.actionsRemaining }) }}</span
      >
      <span v-if="i.eliminated" class="tag">{{
        i.resigned ? t('log.resigned', { name: '' }) : t('game.eliminated')
      }}</span>
    </header>

    <div class="row">
      <TableTarget :target="`investigator:${i.id}`">
        <GameCard :code="i.id" :name="i.name" :width="150" landscape :color="color" />
      </TableTarget>

      <div class="stats">
        <ul class="tokens">
          <li><TokenBadge kind="resource" :value="i.resources" />{{ t('table.resources') }}</li>
          <li><TokenBadge kind="clue" :value="i.clues" />{{ t('table.clues') }}</li>
          <li :title="t('game.damage', { n: i.damage, max: i.health })">
            <TokenBadge kind="damage" :value="i.damage" />{{ t('table.damage') }}
          </li>
          <li :title="t('game.horror', { n: i.horror, max: i.sanity })">
            <TokenBadge kind="horror" :value="i.horror" />{{ t('table.horror') }}
          </li>
        </ul>
        <div class="meta">
          <span :title="t('table.actions')">➤ {{ i.actionsRemaining }}</span>
          <span :title="t('table.health')">♥ {{ i.health - i.damage }}/{{ i.health }}</span>
          <span :title="t('table.sanity')">✦ {{ i.sanity - i.horror }}/{{ i.sanity }}</span>
          <span :title="t('table.deck')">▤ {{ i.deck.length }}</span>
        </div>
        <div class="skills">
          <template v-for="skill in SKILLS" :key="skill">
            <SkillIcon :skill="skill" :title="t(`skill.${skill}`)" />{{ i.skills[skill] }}
          </template>
        </div>
      </div>

      <div class="piles">
        <div class="pile mat-slot" :title="t('table.deck')">
          <span class="mat-label">{{ t('table.deck') }}</span>
          <div
            class="player-back"
            :class="{ official: playerBack }"
            :style="
              playerBack
                ? { backgroundImage: `url(${playerBack})` }
                : { '--depth': Math.min(i.deck.length, 6) }
            "
          >
            <strong>{{ i.deck.length }}</strong>
          </div>
        </div>
        <button
          type="button"
          class="pile mat-slot discard"
          :title="t('table.viewPile')"
          @click="showDiscard"
        >
          <span class="mat-label">{{ t('table.discard') }}</span>
          <GameCard
            v-if="topDiscard"
            :code="topDiscard"
            :name="cardName(topDiscard)"
            :width="72"
            :color="classColor(topDiscard)"
          />
          <div v-else class="player-back empty" />
          <span v-if="i.discard.length" class="count">{{ i.discard.length }}</span>
        </button>
      </div>

      <div v-if="engaged.length || threats.length" class="zone threat mat-slot">
        <h4 class="mat-label">{{ t('table.threatArea') }}</h4>
        <div class="cards">
          <TableTarget v-for="e in engaged" :key="e.id" :target="`enemy:${e.id}`">
            <GameCard
              :code="e.code"
              :name="e.name"
              :width="78"
              :exhausted="e.exhausted"
              color="#7a2c2c"
            >
              <TokenBadge
                v-if="e.damageTaken > 0"
                class="corner tr"
                kind="damage"
                :value="e.damageTaken"
                :size="26"
              />
            </GameCard>
          </TableTarget>
          <TableTarget v-for="tr in threats" :key="tr.id" :target="`treachery:${tr.id}`">
            <GameCard :code="tr.code" :name="tr.name" :width="78" color="#b5462f" />
          </TableTarget>
        </div>
      </div>

      <div class="zone play mat-slot">
        <h4 class="mat-label">{{ t('table.inPlay') }}</h4>
        <div class="slots">
          <div
            v-for="(box, n) in slots.boxes"
            :key="n"
            class="slot"
            :class="{ filled: box.asset, shared: box.shared }"
            :title="t(`slot.${box.type}`)"
          >
            <TableTarget v-if="box.asset && !box.shared" :target="`asset:${box.asset.id}`">
              <GameCard
                :code="box.asset.code"
                :name="cardName(box.asset.code)"
                :width="78"
                :exhausted="box.asset.exhausted"
                :color="classColor(box.asset.code)"
              >
                <TokenBadge
                  v-if="playerCardDef(box.asset.code)?.uses"
                  class="corner tl"
                  kind="resource"
                  :value="box.asset.uses"
                  :size="26"
                />
                <TokenBadge
                  v-if="box.asset.damage"
                  class="corner tr"
                  kind="damage"
                  :value="box.asset.damage"
                  :size="26"
                />
                <TokenBadge
                  v-if="box.asset.horror"
                  class="corner br"
                  kind="horror"
                  :value="box.asset.horror"
                  :size="26"
                />
              </GameCard>
            </TableTarget>
            <template v-else>
              <SlotIcon :type="box.type" />
              <span class="slot-name">{{
                box.asset ? cardName(box.asset.code) : t(`slot.${box.type}`)
              }}</span>
            </template>
          </div>
        </div>
        <div v-if="slots.free.length" class="cards free">
          <TableTarget v-for="a in slots.free" :key="a.id" :target="`asset:${a.id}`">
            <GameCard
              :code="a.code"
              :name="cardName(a.code)"
              :width="78"
              :exhausted="a.exhausted"
              :color="classColor(a.code)"
            >
              <TokenBadge
                v-if="playerCardDef(a.code)?.uses"
                class="corner tl"
                kind="resource"
                :value="a.uses"
                :size="26"
              />
              <TokenBadge
                v-if="a.damage"
                class="corner tr"
                kind="damage"
                :value="a.damage"
                :size="26"
              />
              <TokenBadge
                v-if="a.horror"
                class="corner br"
                kind="horror"
                :value="a.horror"
                :size="26"
              />
            </GameCard>
          </TableTarget>
        </div>
      </div>
    </div>

    <div class="zone hand">
      <h4 class="mat-label">{{ t('table.hand') }} ({{ i.hand.length }})</h4>
      <div class="cards">
        <TableTarget
          v-for="(code, n) in i.hand"
          :key="`${code}-${n}`"
          :target="`hand:${code}`"
          class="in-hand"
        >
          <GameCard :code="code" :name="cardName(code)" :width="92" :color="classColor(code)" />
        </TableTarget>
      </div>
    </div>
  </section>
</template>

<style scoped>
.piles {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.pile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.player-back {
  /* Reverso de jugador dibujado: cuero con sello dorado (si no hay reverso oficial). */
  position: relative;
  width: 72px;
  height: 100px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  border: 2px solid #8a6a3a;
  background:
    radial-gradient(circle, rgb(201 162 39 / 25%), transparent 65%),
    linear-gradient(160deg, #3e2a18, #1a1009);
  box-shadow:
    1px 1px 0 #4a3420,
    calc(var(--depth, 0) * 1px) calc(var(--depth, 0) * 1px) 0 #24170c,
    0 6px 14px rgb(0 0 0 / 60%);
}
.player-back::before {
  content: '';
  position: absolute;
  inset: 8px;
  background: #e0c48a;
  opacity: 0.35;
  mask: var(--tex-sigil) center / contain no-repeat;
}
.player-back.official {
  background-size: cover;
  background-position: center;
  border-color: #222;
}
.player-back.official::before {
  display: none;
}
.player-back strong {
  position: relative;
  font-family: var(--display);
  font-size: 1.6rem;
  text-shadow: 0 2px 4px #000;
}
.player-back.empty {
  background: transparent;
  border: 1px dashed color-mix(in srgb, var(--trim) 40%, transparent);
  box-shadow: none;
}
.player-back.empty::before {
  opacity: 0.08;
  background: var(--trim);
}
.discard {
  position: relative;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}
.discard:hover {
  filter: brightness(1.15);
}
.count {
  position: absolute;
  right: -6px;
  bottom: -6px;
  z-index: 2;
  min-width: 22px;
  padding: 1px 6px;
  border-radius: 11px;
  background: #111;
  border: 1px solid var(--border);
  font-size: 0.75rem;
  font-weight: 700;
}
.player {
  /* Escritorio del investigador: madera oscura con un filo de latón y el tono de su clase. */
  --trim: var(--brass);
  border-top: 3px solid var(--brass-dark);
  padding: 12px 20px 20px;
  background: var(--tex-wood), linear-gradient(180deg, #3a2616, #24170d);
  box-shadow:
    inset 0 50px 60px -45px color-mix(in srgb, var(--class) 40%, transparent),
    inset 0 0 40px rgb(0 0 0 / 60%);
}
.player.deciding {
  border-top-color: var(--brass);
}
.player.eliminated {
  opacity: 0.5;
}
header {
  display: flex;
  align-items: center;
  gap: 10px;
}
h3 {
  margin: 0 0 8px;
  font-size: 1.1rem;
  color: var(--brass);
  text-shadow: 0 1px 3px rgb(0 0 0 / 80%);
}
h4 {
  margin: 0 0 6px;
}
.turn {
  margin-bottom: 8px;
  padding: 1px 10px;
  border-radius: 10px;
  border: 1px solid var(--brass);
  color: var(--brass);
  font-family: var(--fell);
  animation: pulse 1.6s ease-in-out infinite;
}
@keyframes pulse {
  50% {
    box-shadow: 0 0 10px var(--accent-glow);
  }
}
.tag {
  font-size: 0.75rem;
  padding: 1px 8px;
  border-radius: 10px;
  background: #4a1e1e;
}
.row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  flex-wrap: wrap;
}
.stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tokens {
  display: flex;
  gap: 10px;
  list-style: none;
  margin: 0;
  padding: 0;
}
.tokens li {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  font-family: var(--fell);
  font-size: 0.78rem;
  color: #e6d6b0;
}
.tok {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 1.15rem;
  color: #fff;
  text-shadow: 0 1px 2px rgb(0 0 0 / 80%);
  border-radius: 50%;
  border: 2px solid rgb(255 255 255 / 25%);
  box-shadow:
    inset 0 -3px 6px rgb(0 0 0 / 35%),
    0 2px 5px rgb(0 0 0 / 55%);
}
.tok.resource {
  /* Recursos: ficha hexagonal de latón. */
  border-radius: 8px;
  clip-path: polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0 50%);
  background: radial-gradient(circle at 40% 35%, #8d6a3f, #4a3420 75%);
  border: none;
}
.tok.clue {
  background: radial-gradient(circle at 40% 35%, #5fb89a, #1d4d3e 75%);
}
.tok.damage {
  background: radial-gradient(circle at 40% 35%, #c2453a, #5c1610 75%);
}
.tok.horror {
  background: radial-gradient(circle at 40% 35%, #4d79c9, #172b57 75%);
}
.meta {
  display: flex;
  gap: 12px;
  font-weight: 600;
  font-size: 0.9rem;
  opacity: 0.9;
}
.skills {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 700;
}
.skills .ci {
  margin-left: 6px;
}
.zone.mat-slot {
  padding: 8px 12px 14px;
  min-width: 140px;
  min-height: 150px;
}
.zone.mat-slot > h4 {
  position: static;
  transform: none;
  background: none;
  padding: 0;
}
.zone.threat {
  border-color: rgb(200 60 50 / 55%);
  background: rgb(90 10 10 / 25%);
}
.zone .cards {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.slots {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.slot {
  position: relative;
  width: 90px;
  height: 120px;
  border-radius: 3px;
  border: 1px solid var(--brass-dark);
  background: rgb(0 0 0 / 30%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #d8c49a;
}
.slot::before,
.slot::after {
  /* Esquinas art déco del marco de latón. */
  content: '';
  position: absolute;
  width: 10px;
  height: 10px;
  border: 1.5px solid var(--brass);
  pointer-events: none;
}
.slot::before {
  top: 3px;
  left: 3px;
  border-right: 0;
  border-bottom: 0;
}
.slot::after {
  right: 3px;
  bottom: 3px;
  border-left: 0;
  border-top: 0;
}
.slot.filled {
  border-color: var(--brass);
}
.slot.shared {
  border-style: dashed;
}
.slot-name {
  max-width: 80px;
  font-family: var(--fell);
  font-size: 0.8rem;
  letter-spacing: 0.04em;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.free {
  margin-top: 8px;
}
.hand {
  margin-top: 14px;
}
.hand .cards {
  gap: 10px;
}
.in-hand {
  transition: transform 0.15s ease;
}
.in-hand:hover {
  transform: translateY(-10px);
  z-index: 2;
}
.in-hand :deep(img) {
  box-shadow: 0 6px 14px rgb(0 0 0 / 60%);
}
.token {
  position: absolute;
  min-width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 0.75rem;
  color: #fff;
  box-shadow: 0 1px 4px rgb(0 0 0 / 60%);
}
.token.uses {
  top: -6px;
  left: -6px;
  background: #6d5a1f;
}
.token.damage {
  top: -6px;
  right: -6px;
  background: #b3261e;
}
.token.horror {
  bottom: -6px;
  right: -6px;
  background: #1e4fb3;
}
.corner {
  position: absolute;
  z-index: 2;
}
.corner.tl {
  top: -8px;
  left: -8px;
}
.corner.tr {
  top: -8px;
  right: -8px;
}
.corner.br {
  bottom: -8px;
  right: -8px;
}
</style>
