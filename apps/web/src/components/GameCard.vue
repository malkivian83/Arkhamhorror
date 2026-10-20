<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue'
import { cardImages, cardThumbnail, localScan, scanLocale } from '../game/cards'
import { noHover, TABLE_CARD } from '../game/inspect'
import { localizedCards, localName } from '../game/localized'
import { zoomed } from '../game/zoom'
import RenderedCard from './RenderedCard.vue'
const emit = defineEmits<{ imageLanguage: [language: string] }>()

/**
 * Una carta en la mesa. Orden de preferencia:
 * 1. Escaneo propio en el idioma activo (si están activados).
 * 2. Imagen española almacenada con nuestra web, si existe.
 * 3. Imagen inglesa y carta dibujada con los datos traducidos si falla.
 * 4. Plantilla mínima con el nombre.
 */
const props = withDefaults(
  defineProps<{
    code: string
    name: string
    /** Mostrar el reverso (localización sin revelar). */
    back?: boolean
    width?: number
    exhausted?: boolean
    /** Color del marco de la plantilla si no hay imagen. */
    color?: string
    /** Orientación horizontal (plan, acto e investigador). */
    landscape?: boolean
    /** Sin ampliación al pasar el ratón (la propia ampliación). */
    noZoom?: boolean
    /** Miniatura local; la vista ampliada conserva el original. */
    thumbnail?: boolean
  }>(),
  { back: false, width: 110, exhausted: false, color: '#5a5f6b', landscape: false, noZoom: false },
)

const scanFailed = ref(false)
const imageIndex = ref(0)
const thumbnailFailed = ref(false)
watch(
  () => [props.code, props.back, scanLocale.value],
  () => {
    scanFailed.value = false
    imageIndex.value = 0
    thumbnailFailed.value = false
  },
)

const scan = computed(() => (scanFailed.value ? null : localScan(props.code, props.back)))
const localized = computed(() => localizedCards.value.get(props.code) ?? null)
const src = computed(() => cardImages(props.code, props.back)[imageIndex.value] ?? null)
const thumbnailSrc = computed(() =>
  props.thumbnail && !thumbnailFailed.value && src.value ? cardThumbnail(src.value) : null,
)
function imageFailed() {
  if (thumbnailSrc.value) thumbnailFailed.value = true
  else {
    imageIndex.value++
    thumbnailFailed.value = false
  }
}
const displayName = computed(() => localized.value?.name ?? localName(props.name))
// Follow the face actually displayed, including failed Spanish scans and English fallbacks.
const imageLanguage = computed(() => {
  if (scan.value) return scanLocale.value
  if (src.value) return /\/cards\/(es|en)\//.exec(src.value)?.[1] ?? 'unknown'
  return localized.value ? scanLocale.value : 'unknown'
})
watch(imageLanguage, (language) => emit('imageLanguage', language), { immediate: true })

const ratio = computed(() => (props.landscape ? 0.715 : 1.4))
const style = computed(() => ({
  width: `${props.width}px`,
  height: `${Math.round(props.width * ratio.value)}px`,
  '--frame': props.color,
}))

function hover(on: boolean) {
  // Sin ratón, el toque abre la carta ampliada (ver TableTarget) en vez de la ampliación lateral.
  if (props.noZoom || noHover.value) return
  zoomed.value = on
    ? { code: props.code, name: props.name, back: props.back, landscape: props.landscape }
    : null
}
// La carta queda registrada en su elemento de la mesa, que la abre al tocarlo.
const register = props.noZoom ? null : inject(TABLE_CARD, null)
const unregister = register?.(() => ({
  code: props.code,
  name: props.name,
  back: props.back,
  landscape: props.landscape,
}))
if (unregister) onBeforeUnmount(unregister)
</script>

<template>
  <div
    class="game-card"
    :class="{ exhausted }"
    :style="style"
    @mouseenter="hover(true)"
    @mouseleave="hover(false)"
  >
    <img v-if="scan" :src="scan" :alt="displayName" draggable="false" @error="scanFailed = true" />
    <img
      v-else-if="src"
      :src="thumbnailSrc ?? src"
      :alt="displayName"
      loading="lazy"
      draggable="false"
      @error="imageFailed"
    />
    <RenderedCard
      v-else-if="localized"
      :card="localized"
      :back="back"
      :width="width"
      :landscape="landscape"
    />
    <div v-else class="template">
      <span>{{ displayName }}</span>
    </div>
    <slot />
  </div>
</template>

<style scoped>
.game-card {
  position: relative;
  flex: none;
  border-radius: 6px;
  transition: transform 0.15s ease;
}
.game-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 6px;
  display: block;
  box-shadow: 0 2px 6px rgb(0 0 0 / 45%);
}
.game-card.exhausted {
  transform: rotate(90deg) scale(0.8);
}
.template {
  width: 100%;
  height: 100%;
  border-radius: 6px;
  border: 3px solid var(--frame);
  background: linear-gradient(160deg, #2c2f38, #1b1d23);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 6px;
  box-sizing: border-box;
  font-size: 0.75rem;
  color: var(--ink);
}
</style>
