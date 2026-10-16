<script setup lang="ts">
import { computed, ref } from 'vue'
import { cardImage } from '../game/cards'
import { zoomed } from '../game/zoom'

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
    /** Orientación horizontal (plan y acto). */
    landscape?: boolean
  }>(),
  { back: false, width: 110, exhausted: false, color: '#5a5f6b', landscape: false },
)

const failed = ref(false)
const src = computed(() => (failed.value ? null : cardImage(props.code, props.back)))
const ratio = computed(() => (props.landscape ? 0.715 : 1.4))
const style = computed(() => ({
  width: `${props.width}px`,
  height: `${Math.round(props.width * ratio.value)}px`,
  '--frame': props.color,
}))

function hover(on: boolean) {
  zoomed.value = on && src.value ? { src: src.value, alt: props.name } : null
}
</script>

<template>
  <div
    class="game-card"
    :class="{ exhausted }"
    :style="style"
    @mouseenter="hover(true)"
    @mouseleave="hover(false)"
  >
    <img
      v-if="src"
      :src="src"
      :alt="name"
      loading="lazy"
      draggable="false"
      @error="failed = true"
    />
    <div v-else class="template">
      <span>{{ name }}</span>
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
