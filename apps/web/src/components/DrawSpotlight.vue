<script setup lang="ts">
import type { GameState } from '@lcg/engine'
import { needsSpotlight, type CardEntry } from '@lcg/shared'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { cardBackImage } from '../game/assets'
import { localName } from '../game/localized'
import GameCard from './GameCard.vue'
import CardTranslation from './CardTranslation.vue'
import { useTableGame } from '../game/tableController'
import { useLabels } from '../game/labels'

/**
 * Carta robada, descubierta o que entra directamente: se presenta antes de
 * mostrar su destino. Es solo presentación; el motor conserva su secuencia.
 */
const props = defineProps<{ state: GameState }>()
const emit = defineEmits<{ dismissed: [card: CardEntry, source: DOMRect | undefined] }>()
const face = ref<HTMLElement | null>(null)
const imageLanguage = ref('unknown')
const { t } = useI18n()
const game = useTableGame()
const label = useLabels()

const dialog = ref<HTMLDialogElement>()
const queue = computed(() => game.cardEntries)
const current = computed(() => (game.advanceReview.length ? null : (queue.value[0] ?? null)))
/** Own assets, locations, acts and agendas: a brief notice instead of a modal (doc 100, D1). */
const modal = computed(() => !!current.value && needsSpotlight(current.value))
const QUIET_MS = 1500
const back = computed(() => cardBackImage('encounter'))
const viewportWidth = ref(typeof window === 'undefined' ? 432 : window.innerWidth)
const cardWidth = computed(() =>
  Math.max(120, Math.min(current.value?.landscape ? 400 : 280, viewportWidth.value - 32)),
)
function resize() {
  viewportWidth.value = window.innerWidth
}
/** Dónde ha acabado la carta, si es la única copia en la mesa (traición en un Lugar o enemigo). */
const placed = computed(() => {
  const c = current.value
  if (!c) return null
  const at = (id: string) => props.state.locations[id]?.name ?? id
  const treacheries = Object.values(props.state.treacheries).filter((tr) => tr.code === c.code)
  const enemies = Object.values(props.state.enemies).filter((e) => e.code === c.code)
  const [treachery] = treacheries
  if (treacheries.length === 1 && !enemies.length && treachery!.placement.type === 'location')
    return { key: 'table.placedAt', location: at(treachery!.placement.location) }
  const [enemy] = enemies
  if (enemies.length === 1 && !treacheries.length && !enemy!.global)
    return { key: 'table.spawnedAt', location: at(enemy!.location) }
  return null
})

function syncDialog() {
  if (modal.value && !dialog.value?.open) dialog.value?.showModal()
}
watch(current, syncDialog, { flush: 'post' })
let quietTimer: ReturnType<typeof setTimeout> | undefined
watch(
  current,
  (entry) => {
    clearTimeout(quietTimer)
    if (!entry || modal.value) return
    quietTimer = setTimeout(() => {
      if (current.value === entry) dismiss()
    }, QUIET_MS)
  },
  { immediate: true },
)
onMounted(() => {
  syncDialog()
  window.addEventListener('resize', resize)
})

function dismiss() {
  if (current.value) emit('dismissed', current.value, face.value?.getBoundingClientRect())
  game.acceptCardEntry()
}
onBeforeUnmount(() => {
  clearTimeout(quietTimer)
  dialog.value?.close()
  window.removeEventListener('resize', resize)
})
</script>

<template>
  <button
    v-if="current && !modal"
    :key="`${current.code}-${queue.length}`"
    type="button"
    class="notice"
    role="status"
    :aria-label="`${t(current.reason === 'reveal' ? 'table.cardRevealed' : 'table.cardEntersPlay')}: ${localName(current.name)}`"
    @click="dismiss"
  >
    <span ref="face" class="notice-card">
      <GameCard
        :code="current.code"
        :name="current.name"
        :back="!!current.back"
        :landscape="!!current.landscape"
        :width="current.landscape ? 96 : 64"
        thumbnail
        no-zoom
      />
    </span>
    <span class="notice-text">
      <span class="who">{{
        t(current.reason === 'reveal' ? 'table.cardRevealed' : 'table.cardEntersPlay')
      }}</span>
      <span class="name">{{ localName(current.name) }}</span>
    </span>
  </button>
  <dialog
    v-else-if="current"
    ref="dialog"
    class="overlay"
    :aria-label="localName(current.name)"
    @cancel.prevent="dismiss"
    @click.self="dismiss"
    @keydown.stop
  >
    <div class="spotlight">
      <p class="who">
        {{
          current.reason === 'draw'
            ? t('table.drawnBy', { name: current.investigator })
            : t(current.reason === 'reveal' ? 'table.cardRevealed' : 'table.cardEntersPlay')
        }}
      </p>
      <div class="card-details">
        <div
          :key="`${current.code}-${queue.length}`"
          class="flipper"
          :style="{
            width: `${cardWidth}px`,
            height: `${Math.round(cardWidth * (current.landscape ? 0.715 : 1.4))}px`,
          }"
          :class="{ 'no-flip': !current.from }"
        >
          <div ref="face" class="face front">
            <GameCard
              :code="current.code"
              :name="current.name"
              :back="!!current.back"
              :landscape="!!current.landscape"
              :width="cardWidth"
              no-zoom
              @image-language="imageLanguage = $event"
            />
          </div>
          <div class="face back">
            <GameCard
              v-if="current.from === 'masked'"
              code="82017b"
              :name="t('table.maskedCarnevale')"
              :width="cardWidth"
              no-zoom
            />
            <img
              v-else-if="back"
              :src="current.from === 'player' ? (cardBackImage('player') ?? back) : back"
              alt=""
              draggable="false"
            />
            <div v-else class="drawn-back" />
          </div>
        </div>
        <CardTranslation
          :code="current.code"
          :back="!!current.back"
          :image-language="imageLanguage"
        />
      </div>
      <p class="name">{{ localName(current.name) }}</p>
      <p v-if="placed" class="placed">{{ label(placed.key, { location: placed.location }) }}</p>
      <button type="button" class="table-action" autofocus @click="dismiss">
        {{ t('table.ok') }}<template v-if="queue.length > 1"> ({{ queue.length - 1 }})</template>
      </button>
    </div>
  </dialog>
</template>

<style scoped>
.overlay {
  width: 100vw;
  height: 100dvh;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: 0;
  border: 0;
  color: var(--ink);
  position: fixed;
  inset: 0;
  z-index: 950;
  display: grid;
  place-items: center;
  background: rgb(0 0 0 / 60%);
  animation: fade-in 0.2s ease-out;
}
.spotlight {
  perspective: 1200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  max-height: calc(100dvh - 24px);
  overflow: auto;
  padding: 12px;
}
.overlay:not([open]) {
  display: none;
}
.flipper.no-flip {
  animation: none;
  transform: rotateY(180deg);
}
.card-details {
  display: flex;
  align-items: flex-start;
  /* La traducción ensancha el bloque hasta la pantalla: la pareja va al centro. */
  justify-content: center;
  gap: 16px;
}
@media (max-width: 650px) {
  .card-details {
    flex-direction: column;
    align-items: center;
  }
  .flipper {
    flex: none;
  }
}
.who,
.name {
  margin: 0;
  font-weight: 700;
  text-shadow: 0 2px 6px rgb(0 0 0 / 80%);
}
.name {
  font-size: 1.15rem;
}
.placed {
  margin: 0;
  color: var(--accent);
  font-weight: 600;
  text-shadow: 0 2px 6px rgb(0 0 0 / 80%);
}
.flipper {
  position: relative;
  width: 280px;
  height: 392px;
  transform-style: preserve-3d;
  animation: flip 0.55s ease-out 0.15s both;
}
.face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 16px 50px rgb(0 0 0 / 70%);
}
.front {
  transform: rotateY(180deg);
}
.back img,
.drawn-back {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.drawn-back {
  background: repeating-linear-gradient(45deg, #2a1f2e, #2a1f2e 10px, #33263a 10px, #33263a 20px);
  border: 3px solid #5b4466;
  border-radius: 12px;
}
@keyframes flip {
  from {
    transform: translateY(40px) scale(0.6) rotateY(0deg);
  }
  to {
    transform: translateY(0) scale(1) rotateY(180deg);
  }
}
@keyframes fade-in {
  from {
    opacity: 0;
  }
}
.notice {
  position: fixed;
  left: 50%;
  bottom: 16px;
  z-index: 950;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: calc(100vw - 32px);
  padding: 8px 14px 8px 8px;
  transform: translateX(-50%);
  border: 1px solid var(--accent);
  border-radius: 10px;
  background: var(--panel);
  color: var(--ink);
  box-shadow: 0 8px 24px rgb(0 0 0 / 50%);
  text-align: left;
  cursor: pointer;
  animation: notice-in 0.2s ease-out;
}
.notice-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.notice .who {
  font-size: 0.8rem;
  text-shadow: none;
}
.notice .name {
  font-size: 1rem;
  text-shadow: none;
}
@keyframes notice-in {
  from {
    opacity: 0;
    transform: translate(-50%, 12px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .notice {
    animation: none;
  }
  .flipper {
    animation: none;
    transform: rotateY(180deg);
  }
}
</style>
