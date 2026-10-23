<script setup lang="ts">
import {
  playerCardDef,
  assetVitals,
  effectiveVitals,
  slotCapacity,
  assetSlots,
  type Asset,
  type GameState,
  type Investigator,
  type SlotType,
} from '@lcg/engine'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { cardName, classColor } from '../game/cards'
import { cardBackImage, ICON_GLYPHS, tokenImage, type TokenKind } from '../game/assets'
import { showPile } from '../game/pile'
import GameCard from './GameCard.vue'
import SkillIcon from './SkillIcon.vue'
import SlotIcon from './SlotIcon.vue'
import TokenBadge from './TokenBadge.vue'

const SKILLS = ['willpower', 'intellect', 'combat', 'agility'] as const
import TableTarget from './TableTarget.vue'

const props = defineProps<{
  state: GameState
  investigator: Investigator
  deciding: boolean
  privateHand?: boolean
  handCount?: number | undefined
}>()
const { t } = useI18n()

const i = computed(() => props.investigator)
const playerBack = computed(() => cardBackImage('player'))
const topDiscard = computed(() => i.value.discard.at(-1))

function showHand() {
  showPile({
    title: 'table.hand',
    cards: i.value.hand.map((code) => ({ code, name: cardName(code) })),
  })
}

function showUpgrades(asset: Asset) {
  showPile({
    title: 'table.assetUpgrades',
    params: { card: cardName(asset.code) },
    cards: (asset.upgrades ?? []).map((u) => ({ code: u.code, name: cardName(u.code) })),
  })
}
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
    (tr) =>
      (tr.placement.type === 'threatArea' && tr.placement.investigator === i.value.id) ||
      // Vinculadas a un enemigo enfrentado contigo (Llevado a la locura).
      (tr.placement.type === 'enemy' &&
        props.state.enemies[tr.placement.enemy]?.engagedWith === i.value.id),
  ),
)
const color = computed(() => classColor(i.value.id))
const tokens = computed((): { kind: TokenKind; value: number; label: string; title?: string }[] => {
  const vitals = effectiveVitals(props.state, i.value)
  return [
    { kind: 'resource', value: i.value.resources, label: 'table.resources' },
    { kind: 'clue', value: i.value.clues, label: 'table.clues' },
    {
      kind: 'damage',
      value: i.value.damage,
      label: 'table.damage',
      title: t('game.damage', { n: i.value.damage, max: vitals.health }),
    },
    {
      kind: 'horror',
      value: i.value.horror,
      label: 'table.horror',
      title: t('game.horror', { n: i.value.horror, max: vitals.sanity }),
    },
  ]
})

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
    Array.from({ length: slotCapacity(props.state, i.value.id, type) }, () => ({
      type,
      asset: null,
      shared: false,
    })),
  )
  const free: Asset[] = []
  for (const a of assets.value) {
    const needs = assetSlots(a)
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
    <div class="player-desk">
      <div class="investigator-summary">
        <header>
          <slot name="name"
            ><h3>{{ i.name }}</h3></slot
          >
          <span v-if="deciding" class="turn">
            {{ t('table.decides') }}
            <template v-if="state.phase !== 'setup'">
              · {{ t('table.actionsLeft', { n: i.actionsRemaining }) }}
            </template>
          </span>
          <span v-if="i.eliminated" class="tag">{{
            i.resigned ? t('log.resigned', { name: '' }) : t('game.eliminated')
          }}</span>
          <slot name="controls" />
        </header>
        <div class="identity">
          <TableTarget class="investigator-card" :target="`investigator:${i.id}`">
            <GameCard :code="i.id" :name="i.name" :width="110" landscape :color="color" />
          </TableTarget>

          <div class="stats">
            <!-- El número va en una pastilla oscura junto a la ficha: sobre la imagen no se leía. -->
            <ul class="tokens">
              <li v-for="token in tokens" :key="token.kind" :title="token.title">
                <span class="token-icon"
                  ><TokenBadge :kind="token.kind" value="" :size="26" aria-hidden="true" /><strong
                    class="token-count"
                    >{{ token.value }}</strong
                  ></span
                ><span class="token-label">{{ t(token.label) }}</span>
              </li>
            </ul>
            <div class="meta">
              <span :title="t('table.actions')"
                ><i class="ahi">{{ ICON_GLYPHS.action }}</i
                ><b class="fb">➤</b> {{ i.actionsRemaining }}</span
              >
              <span :title="t('table.health')">
                <img
                  v-if="tokenImage('damage')"
                  class="stat-token"
                  :src="tokenImage('damage')!"
                  alt=""
                />
                <template v-else>♥</template>
                {{ effectiveVitals(state, i).health - i.damage }}/{{
                  effectiveVitals(state, i).health
                }}
              </span>
              <span :title="t('table.sanity')">
                <img
                  v-if="tokenImage('horror')"
                  class="stat-token"
                  :src="tokenImage('horror')!"
                  alt=""
                />
                <template v-else>✦</template>
                {{ effectiveVitals(state, i).sanity - i.horror }}/{{
                  effectiveVitals(state, i).sanity
                }}
              </span>
              <span :title="t('table.deck')">▤ {{ i.deck.length }}</span>
            </div>
            <div class="skills">
              <span v-for="skill in SKILLS" :key="skill" class="skill-stat">
                <SkillIcon :skill="skill" :title="t(`skill.${skill}`)" />{{ i.skills[skill] }}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div class="zone hand">
        <div class="hand-heading">
          <h4 class="mat-label">{{ t('table.hand') }} ({{ handCount ?? i.hand.length }})</h4>
          <button
            v-if="!privateHand"
            type="button"
            class="view-hand"
            :aria-label="t('table.viewHand')"
            :title="t('table.viewHand')"
            @click="showHand"
          >
            <SlotIcon type="hand" />
          </button>
        </div>
        <div class="cards">
          <div
            v-for="n in privateHand ? handCount : 0"
            :key="`back-${n}`"
            class="private-card"
            :aria-label="t('online.play.privateHand')"
          >
            <img v-if="playerBack" :src="playerBack" alt="" width="80" />
          </div>
          <TableTarget
            v-for="(code, n) in privateHand ? [] : i.hand"
            :key="`${code}-${n}`"
            :target="deciding ? `hand:${code}` : ''"
            class="in-hand"
          >
            <GameCard
              :code="code"
              :name="cardName(code)"
              :width="80"
              :color="classColor(code)"
              thumbnail
            />
          </TableTarget>
        </div>
      </div>
    </div>
    <div class="equipment-row">
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
            :width="48"
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
              :width="42"
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
              <TokenBadge v-if="e.doom" class="corner bl" kind="doom" :value="e.doom" :size="26" />
              <TokenBadge
                v-if="e.clues"
                class="corner br"
                kind="clue"
                :value="e.clues"
                :size="26"
                :title="t('table.clues')"
              />
            </GameCard>
          </TableTarget>
          <TableTarget v-for="tr in threats" :key="tr.id" :target="`treachery:${tr.id}`">
            <GameCard :code="tr.code" :name="tr.name" :width="42" color="#b5462f" />
          </TableTarget>
        </div>
      </div>

      <div class="zone play mat-slot">
        <h4 class="mat-label">{{ t('table.inPlay') }}</h4>
        <div
          v-for="asset in assets.filter((a) => a.upgrades?.length)"
          :key="asset.id"
          class="asset-upgrades"
        >
          <button type="button" @click="showUpgrades(asset)">
            {{ t('table.assetUpgrades', { card: cardName(asset.code) }) }} ({{
              asset.upgrades!.length
            }})
          </button>
          <span v-if="assetVitals(asset).health !== undefined" :title="t('table.health')"
            >♥ {{ assetVitals(asset).health }}</span
          >
          <span v-if="assetVitals(asset).sanity !== undefined" :title="t('table.sanity')"
            >✦ {{ assetVitals(asset).sanity }}</span
          >
          <span v-if="asset.upgrades!.some((u) => u.exhausted)">{{
            t('table.exhaustedUpgrades', {
              count: asset.upgrades!.filter((u) => u.exhausted).length,
            })
          }}</span>
          <span v-if="asset.nextFightBonus">{{
            t('table.nextFightBonus', { amount: asset.nextFightBonus })
          }}</span>
        </div>
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
                :width="42"
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
                <TokenBadge
                  v-if="box.asset.clues"
                  class="corner bl"
                  kind="clue"
                  :value="box.asset.clues"
                  :size="26"
                  :title="t('table.clues')"
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
              :width="42"
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
              <TokenBadge
                v-if="a.clues"
                class="corner bl"
                kind="clue"
                :value="a.clues"
                :size="26"
                :title="t('table.clues')"
              />
            </GameCard>
          </TableTarget>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.private-card {
  flex: 0 0 80px;
  min-height: 112px;
  background: #282433;
  border: 1px solid #9c8054;
  border-radius: 5px;
}
.private-card img {
  display: block;
  border-radius: inherit;
}
.asset-upgrades {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  margin-bottom: 0.3rem;
}
.asset-upgrades button {
  color: inherit;
  background: #ffffff10;
  border: 1px solid #ffffff30;
  border-radius: 4px;
  padding: 0.2rem 0.4rem;
  cursor: pointer;
}
.stat-token {
  width: 1.1em;
  height: 1.1em;
  vertical-align: -0.2em;
  object-fit: contain;
}
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
  width: 48px;
  height: 67px;
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
  font-size: 1.1rem;
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
  padding: 6px 12px max(8px, env(safe-area-inset-bottom));
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
  padding: 4px 8px;
  min-width: 0;
  min-height: 0;
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
  width: 54px;
  height: 64px;
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
  max-width: 54px;
  font-family: var(--fell);
  font-size: 0.65rem;
  letter-spacing: 0.02em;
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
  transform: translateY(-4px);
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
.corner.bl {
  bottom: -8px;
  left: -8px;
}
.player {
  display: grid;
  grid-template-rows: auto auto;
  gap: 6px;
  min-width: 0;
}
.investigator-summary {
  min-width: 0;
  display: grid;
  gap: 6px;
}
header {
  flex-wrap: wrap;
  gap: 4px 8px;
  align-items: baseline;
}
header h3 {
  font-size: 0.85rem;
  overflow-wrap: anywhere;
}
header .turn {
  font-size: 0.75rem;
  padding: 0;
  border: 0;
  animation: none;
}
.piles .mat-label {
  position: static;
  transform: none;
  padding: 0;
  background: none;
  font-size: 0.6rem;
  letter-spacing: 0.02em;
  line-height: 1.2;
}
.piles .pile {
  padding: 4px;
  min-width: 60px;
}
.slot-name {
  max-width: 100%;
  font-size: 0.58rem;
  letter-spacing: 0;
  overflow-wrap: anywhere;
  white-space: normal;
  line-height: 1.1;
}
.skill-stat {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  white-space: nowrap;
}
.meta > span {
  white-space: nowrap;
}

h3,
.turn {
  margin-bottom: 0;
}
.player-desk {
  grid-row: 2;
  display: grid;
  grid-template-columns: 290px minmax(0, 1fr);
  align-items: start;
  gap: 16px;
  min-width: 0;
}
.identity {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 0;
}
.stats {
  flex: 1;
  gap: 4px;
  min-width: 0;
}
.tokens {
  justify-content: space-between;
  gap: 4px;
}
.tokens li {
  gap: 2px;
}
.token-icon {
  position: relative;
  display: block;
  margin-right: 8px;
}
.token-count {
  position: absolute;
  right: -9px;
  bottom: -3px;
  min-width: 18px;
  height: 18px;
  box-sizing: border-box;
  padding: 0 4px;
  border: 1px solid #807574;
  border-radius: 9px;
  background: #121216;
  color: #fff;
  font:
    700 0.75rem/16px 'Source Sans 3',
    system-ui,
    sans-serif;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.token-label {
  color: #d0c7c1;
  font:
    600 0.625rem/1.2 'Source Sans 3',
    system-ui,
    sans-serif;
  white-space: nowrap;
}
.meta {
  gap: 6px;
  flex-wrap: wrap;
  font-size: 0.72rem;
}
.skills {
  font-size: 0.75rem;
}
.equipment-row {
  grid-row: 1;
  display: flex;
  align-items: start;
  gap: 12px;
  min-width: 0;
  max-height: 116px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 6px 2px;
  scrollbar-width: none;
}
.equipment-row::-webkit-scrollbar {
  display: none;
}
.zone.play {
  display: grid;
  grid-template-columns: auto auto;
  gap: 4px 8px;
}
.zone.play > h4 {
  grid-column: 1 / -1;
  margin: 0;
  line-height: 1.2;
  font-size: 0.7rem;
}
.zone.play > .free {
  margin: 0;
}
.equipment-row > * {
  flex: none;
}
.equipment-row .cards,
.slots {
  flex-wrap: nowrap;
  gap: 6px;
}
.piles {
  gap: 8px;
}
.slot {
  flex: none;
}
.slot :deep(.slot-icon) {
  width: 26px;
  height: 26px;
}
.hand {
  min-width: 0;
  margin: 0;
}
.hand-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.hand-heading h4 {
  margin: 0;
}
.view-hand {
  display: grid;
  place-items: center;
  width: 32px;
  min-height: 32px;
  padding: 0;
  color: var(--parch);
  background: #21190e;
  border-color: var(--brass-dark);
}
.view-hand :deep(.slot-icon) {
  width: 20px;
  height: 20px;
}
.hand .cards {
  display: flex;
  flex-wrap: nowrap;
  align-items: start;
  gap: 8px;
  overflow-x: auto;
  padding: 8px 4px;
}
.in-hand {
  flex: 0 0 80px;
}
.in-hand :deep(.hint) {
  display: none;
}
@media (max-width: 1100px) {
  .player-desk {
    grid-template-columns: 250px minmax(0, 1fr);
    gap: 10px;
  }
  .identity {
    gap: 8px;
  }
  .token-label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
}
@media (max-width: 600px) {
  .player {
    gap: 4px;
    padding: 6px 8px max(6px, env(safe-area-inset-bottom));
  }
  header {
    gap: 6px;
    min-height: 24px;
  }
  h3 {
    font-size: 0.82rem;
  }
  .turn {
    font-size: 0.72rem;
    padding: 1px 6px;
  }
  .equipment-row {
    max-height: 56px;
    padding: 4px 2px;
    gap: 8px;
  }
  .zone.mat-slot {
    padding: 0 4px;
  }
  .equipment-row h4,
  .slot-name {
    display: none;
  }
  .slot {
    width: 40px;
    height: 44px;
  }
  .equipment-row :deep(.game-card),
  .player-back {
    width: 30px !important;
    height: 42px !important;
  }
  .player-back strong {
    font-size: 0.85rem;
  }
  .piles .mat-label {
    display: none;
  }
  .player-desk {
    grid-template-columns: 1fr;
    gap: 4px;
  }
  .identity {
    padding-top: 0;
    gap: 8px;
  }
  .investigator-card :deep(.game-card) {
    width: 62px !important;
    height: 44px !important;
  }
  .stats {
    flex: 1;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 3px 8px;
  }
  .tokens {
    gap: 3px;
  }
  .tokens :deep(.token-badge) {
    width: 24px !important;
    height: 24px !important;
    font-size: 12px !important;
  }
  .meta {
    grid-row: 2;
    grid-column: 1 / -1;
  }
  .skills {
    gap: 2px;
    font-size: 0.7rem;
  }
  .skills :deep(.ci) {
    margin-left: 2px;
    width: 13px;
    height: 13px;
  }
  .hand-heading h4 {
    font-size: 0.7rem;
  }
  .view-hand {
    width: 44px;
    min-height: 44px;
    margin-top: -8px;
  }
  .view-hand :deep(.slot-icon) {
    width: 24px;
    height: 24px;
  }
  .hand .cards {
    gap: 4px;
    padding-top: 4px;
  }
  /* Solo la mitad superior (nombre e ilustración): al tocarla se abre entera. */
  .in-hand {
    height: 56px;
    overflow: hidden;
  }
}
</style>
