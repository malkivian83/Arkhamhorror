<script setup lang="ts">
import type { GameState } from '@lcg/engine'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { cardBackImage } from '../game/assets'
import { localName } from '../game/localized'
import GameCard from './GameCard.vue'
import CardTranslation from './CardTranslation.vue'
import { useGameStore } from '../stores/game'
import { unreviewedEncounterDraws } from '../game/advanceReview'

/**
 * Carta de encuentro recién robada, en grande en el centro: se da la vuelta
 * desde el reverso y espera a que la cierres. Es solo de la mesa (el motor ya
 * la ha resuelto); si se roban varias, salen una detrás de otra.
 */
const props = defineProps<{ state: GameState }>()
const emit = defineEmits<{ dismissed: [code: string, source: DOMRect | undefined] }>()
const face = ref<HTMLElement | null>(null)
const imageLanguage = ref('unknown')
const { t } = useI18n()
const game = useGameStore()

interface Drawn {
  code: string
  card: string
  name: string
}
const queue = ref<Drawn[]>([])
const current = computed(() => queue.value[0] ?? null)
const back = computed(() => cardBackImage('encounter'))

// Solo las cartas robadas desde que se abre la mesa; deshacer (el registro
// encoge) o cargar una partida no vuelve a mostrar las anteriores.
watch(
  () => props.state.log.length,
  (length, before) => {
    if (before === undefined || length <= before) {
      if (before !== undefined && length < before) queue.value = []
      return
    }
    const drawn = unreviewedEncounterDraws(props.state.log.slice(before), game.advanceReview).map(
      (e) => ({
        code: String(e.params!.code),
        card: String(e.params!.card ?? ''),
        name: String(e.params!.name ?? ''),
      }),
    )
    queue.value = [...queue.value, ...drawn]
  },
  { immediate: true },
)

function dismiss() {
  if (current.value) emit('dismissed', current.value.code, face.value?.getBoundingClientRect())
  queue.value = queue.value.slice(1)
}
function key(event: KeyboardEvent) {
  if (!current.value) return
  if (document.querySelector('dialog[open]')) return
  if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    event.stopImmediatePropagation()
    dismiss()
  }
}
// En captura: la tecla cierra la carta antes de que la usen los atajos de la mesa.
window.addEventListener('keydown', key, true)
onBeforeUnmount(() => window.removeEventListener('keydown', key, true))
</script>

<template>
  <div v-if="current" class="overlay" @click.self="dismiss">
    <div class="spotlight">
      <p class="who">{{ t('table.drawnBy', { name: current.name }) }}</p>
      <div class="card-details">
        <div :key="`${current.code}-${queue.length}`" class="flipper">
          <div ref="face" class="face front">
            <GameCard
              :code="current.code"
              :name="current.card"
              :width="280"
              no-zoom
              @image-language="imageLanguage = $event"
            />
          </div>
          <div class="face back">
            <img v-if="back" :src="back" alt="" draggable="false" />
            <div v-else class="drawn-back" />
          </div>
        </div>
        <CardTranslation :code="current.code" :image-language="imageLanguage" />
      </div>
      <p class="name">{{ localName(current.card) }}</p>
      <button type="button" class="primary" @click="dismiss">
        {{ t('table.ok') }}<template v-if="queue.length > 1"> ({{ queue.length - 1 }})</template>
      </button>
    </div>
  </div>
</template>

<style scoped>
.overlay {
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
.card-details {
  display: flex;
  align-items: flex-start;
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
@media (prefers-reduced-motion: reduce) {
  .flipper {
    animation: none;
    transform: rotateY(180deg);
  }
}
</style>
