<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, readonly, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  BOARD_VIEW_KEY,
  constrainView,
  fitView,
  MAX_SCALE,
  MIN_SCALE,
  zoomAt,
  type Point,
  type Size,
  type ViewTransform,
} from '../game/viewport'

const props = defineProps<{ resetKey: string }>()
const { t } = useI18n()
const helpId = useId()
const surface = ref<HTMLElement | null>(null)
const content = ref<HTMLElement | null>(null)
const view = ref<ViewTransform>({ x: 0, y: 0, scale: 1 })
provide(BOARD_VIEW_KEY, readonly(view))
const dragging = ref(false)
const percent = computed(() => `${Math.round(view.value.scale * 100)}%`)
const transform = computed(
  () => `translate(${view.value.x}px, ${view.value.y}px) scale(${view.value.scale})`,
)
let viewportSize: Size = { width: 0, height: 0 }
let contentSize: Size = { width: 1, height: 1 }
let autoFit = true
let observer: ResizeObserver | undefined
const pointers = new Map<number, Point>()
let gesture: { view: ViewTransform; anchor: Point; distance: number } | null = null
let suppressClick = false
let clickTimer: ReturnType<typeof setTimeout> | undefined

function apply(next: ViewTransform) {
  autoFit = false
  view.value = constrainView(next, contentSize, viewportSize)
}

function fit() {
  autoFit = true
  view.value = fitView(contentSize, viewportSize)
}

function measure() {
  if (!surface.value || !content.value) return
  const next = { width: surface.value.clientWidth, height: surface.value.clientHeight }
  if (!next.width || !next.height) return
  contentSize = { width: content.value.offsetWidth, height: content.value.offsetHeight }
  const previous = viewportSize
  viewportSize = next
  if (autoFit) fit()
  else {
    view.value = constrainView(
      {
        ...view.value,
        x: view.value.x + (next.width - previous.width) / 2,
        y: view.value.y + (next.height - previous.height) / 2,
      },
      contentSize,
      viewportSize,
    )
  }
  beginGesture()
}

function center(): Point {
  return { x: viewportSize.width / 2, y: viewportSize.height / 2 }
}

function zoom(factor: number, anchor = center()) {
  apply(zoomAt(view.value, view.value.scale * factor, anchor))
}

function actualSize() {
  const scale = 1
  apply({
    scale,
    x: (viewportSize.width - contentSize.width) / 2,
    y: (viewportSize.height - contentSize.height) / 2,
  })
}

function localPoint(event: { clientX: number; clientY: number }): Point {
  const rect = surface.value!.getBoundingClientRect()
  return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}

function geometry() {
  const [a, b] = [...pointers.values()]
  if (!a) return null
  return b
    ? {
        anchor: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        distance: Math.hypot(b.x - a.x, b.y - a.y),
      }
    : { anchor: a, distance: 0 }
}

function beginGesture() {
  const current = geometry()
  gesture = current ? { ...current, view: { ...view.value } } : null
}

function pointerDown(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  clearTimeout(clickTimer)
  if (!pointers.size) {
    suppressClick = false
    // Capturar solo al arrastrar conserva el destino original de un clic en una carta.
    surface.value?.focus({ preventScroll: true })
  }
  pointers.set(event.pointerId, localPoint(event))
  if (pointers.size > 1) {
    suppressClick = true
    dragging.value = true
    for (const id of pointers.keys()) surface.value?.setPointerCapture(id)
  }
  beginGesture()
}

function pointerMove(event: PointerEvent) {
  if (!pointers.has(event.pointerId) || !gesture) return
  pointers.set(event.pointerId, localPoint(event))
  const current = geometry()!
  if (
    !dragging.value &&
    Math.hypot(current.anchor.x - gesture.anchor.x, current.anchor.y - gesture.anchor.y) < 6
  )
    return
  dragging.value = true
  suppressClick = true
  surface.value?.setPointerCapture(event.pointerId)
  const ratio = gesture.distance > 0 ? current.distance / gesture.distance : 1
  apply(zoomAt(gesture.view, gesture.view.scale * ratio, gesture.anchor, current.anchor))
}

function pointerEnd(event: PointerEvent) {
  // Al trasladar la captura táctil desde una carta al tapete, la carta pierde
  // su captura implícita; ese evento propagado no termina el gesto del tapete.
  if (event.type === 'lostpointercapture' && event.target !== surface.value) return
  if (!pointers.delete(event.pointerId)) return
  if (surface.value?.hasPointerCapture(event.pointerId)) {
    surface.value.releasePointerCapture(event.pointerId)
  }
  beginGesture()
  if (pointers.size) return
  dragging.value = false
  // El clic sintetizado tras soltar el puntero no debe ejecutar una acción de juego.
  clickTimer = setTimeout(() => (suppressClick = false), 400)
}

function cancelClick(event: MouseEvent) {
  if (!suppressClick || event.detail === 0) return
  event.preventDefault()
  event.stopPropagation()
}

function wheel(event: WheelEvent) {
  // Ctrl/⌘ + rueda sigue disponible para la ampliación de accesibilidad del navegador.
  if (event.ctrlKey || event.metaKey) return
  event.preventDefault()
  const delta =
    event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewportSize.height : 1)
  zoom(Math.exp(-Math.max(-100, Math.min(100, delta)) * 0.002), localPoint(event))
}

function keydown(event: KeyboardEvent) {
  if (event.target !== surface.value || event.ctrlKey || event.metaKey || event.altKey) return
  const step = event.shiftKey ? 120 : 48
  const moves: Record<string, Point> = {
    ArrowLeft: { x: step, y: 0 },
    ArrowRight: { x: -step, y: 0 },
    ArrowUp: { x: 0, y: step },
    ArrowDown: { x: 0, y: -step },
  }
  const move = moves[event.key]
  if (move) apply({ ...view.value, x: view.value.x + move.x, y: view.value.y + move.y })
  else if (event.key === '+' || event.key === '=') zoom(1.2)
  else if (event.key === '-' || event.key === '_') zoom(1 / 1.2)
  else if (event.key === 'Home' || event.key === '0') fit()
  else return
  event.preventDefault()
  event.stopPropagation()
}

/** Tabular hasta una carta fuera del encuadre la trae de vuelta a la vista. */
function revealFocused(event: FocusEvent) {
  const target = event.target as HTMLElement
  if (!content.value?.contains(target)) return
  const rect = target.getBoundingClientRect()
  const frame = surface.value!.getBoundingClientRect()
  const padding = 20
  const dx =
    rect.left < frame.left + padding
      ? frame.left + padding - rect.left
      : rect.right > frame.right - padding
        ? frame.right - padding - rect.right
        : 0
  const dy =
    rect.top < frame.top + padding
      ? frame.top + padding - rect.top
      : rect.bottom > frame.bottom - padding
        ? frame.bottom - padding - rect.bottom
        : 0
  if (dx || dy) apply({ ...view.value, x: view.value.x + dx, y: view.value.y + dy })
}

watch(
  () => props.resetKey,
  () => {
    autoFit = true
    measure()
  },
  { flush: 'post' },
)
onMounted(() => {
  observer = new ResizeObserver(measure)
  observer.observe(surface.value!)
  observer.observe(content.value!)
  surface.value!.addEventListener('wheel', wheel, { passive: false })
  measure()
})
onBeforeUnmount(() => {
  observer?.disconnect()
  surface.value?.removeEventListener('wheel', wheel)
  clearTimeout(clickTimer)
})
</script>

<template>
  <section class="board-viewport" :aria-label="t('table.board')">
    <div class="viewport-toolbar" role="group" :aria-label="t('table.navigation')">
      <span class="viewport-title">{{ t('table.board') }}</span>
      <div class="viewport-controls">
        <button
          type="button"
          :title="t('table.zoomOut')"
          :aria-label="t('table.zoomOut')"
          :disabled="view.scale <= MIN_SCALE"
          @click="zoom(1 / 1.2)"
        >
          −
        </button>
        <output role="status" aria-live="polite" :aria-label="t('table.zoomLevel')">{{
          percent
        }}</output>
        <button
          type="button"
          :title="t('table.zoomIn')"
          :aria-label="t('table.zoomIn')"
          :disabled="view.scale >= MAX_SCALE"
          @click="zoom(1.2)"
        >
          +
        </button>
        <button type="button" @click="fit">{{ t('table.fitMap') }}</button>
        <button
          type="button"
          :title="t('table.actualSize')"
          :aria-label="t('table.actualSize')"
          @click="actualSize"
        >
          100%
        </button>
      </div>
    </div>
    <p :id="helpId" class="viewport-help">
      <span class="mouse-help">{{ t('table.mouseNavigation') }}</span>
      <span class="touch-help">{{ t('table.touchNavigation') }}</span>
      <span class="keyboard-help"> {{ t('table.keyboardNavigation') }}</span>
    </p>
    <div
      ref="surface"
      class="viewport-surface"
      :class="{ dragging }"
      role="region"
      tabindex="0"
      :aria-label="t('table.board')"
      :aria-describedby="helpId"
      @pointerdown="pointerDown"
      @pointermove="pointerMove"
      @pointerup="pointerEnd"
      @pointercancel="pointerEnd"
      @lostpointercapture="pointerEnd"
      @pointerleave="
        (event) => {
          if (!dragging) pointerEnd(event)
        }
      "
      @click.capture="cancelClick"
      @dragstart.prevent
      @keydown="keydown"
      @focusin="revealFocused"
    >
      <div ref="content" class="viewport-content" :style="{ transform }">
        <slot />
      </div>
    </div>
    <div class="viewport-pan" role="group" :aria-label="t('table.panMap')">
      <button
        v-for="(offset, direction) in {
          left: [64, 0],
          up: [0, 64],
          down: [0, -64],
          right: [-64, 0],
        }"
        :key="direction"
        type="button"
        :aria-label="t(`table.pan.${direction}`)"
        :title="t(`table.pan.${direction}`)"
        @click="apply({ ...view, x: view.x + offset[0]!, y: view.y + offset[1]! })"
      >
        <span aria-hidden="true">{{
          { left: '←', up: '↑', down: '↓', right: '→' }[direction]
        }}</span>
      </button>
    </div>
    <slot name="overlay" />
  </section>
</template>

<style scoped>
.board-viewport {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: clip;
}
.viewport-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px 0;
  color: var(--parch);
}
.viewport-title {
  font-family: var(--fell);
  font-size: 0.95rem;
}
.viewport-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 4px;
  max-width: 100%;
}
.viewport-controls button {
  min-width: 44px;
  min-height: 44px;
  padding: 6px 10px;
  background: #14251f;
  border-color: #657e70;
}
.viewport-pan {
  display: flex;
  justify-content: center;
  gap: 4px;
  padding: 0 12px 10px;
}
.viewport-pan button {
  min-width: 44px;
  min-height: 44px;
  padding: 6px 10px;
  background: #14251f;
  border-color: #657e70;
}
.viewport-controls output {
  min-width: 52px;
  text-align: center;
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}
.viewport-help {
  margin: 6px 16px 0;
  color: #d3dfd6;
  font-size: 0.75rem;
}
.touch-help {
  display: none;
}
.keyboard-help {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
.board-viewport:has(.viewport-surface:focus-visible) .keyboard-help {
  position: static;
  display: block;
  width: auto;
  height: auto;
  margin-top: 4px;
  clip-path: none;
}
.viewport-surface {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: clip;
  touch-action: none;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
}
.viewport-surface:focus-visible {
  outline-offset: -6px;
  box-shadow: none;
}
.viewport-surface.dragging,
.viewport-surface.dragging :deep(*) {
  cursor: grabbing !important;
}
.viewport-content {
  width: max-content;
  padding: 40px;
  transform-origin: 0 0;
}
@media (max-width: 600px) {
  .viewport-toolbar {
    padding: 12px 12px 0;
    justify-content: center;
  }
  .viewport-title {
    display: none;
  }
  .viewport-help {
    margin: 8px 12px 0;
  }
}
@media (pointer: coarse) {
  .mouse-help {
    display: none;
  }
  .touch-help {
    display: inline;
  }
}
</style>
